import { json, fail, readJson, clientIp, outdated, updateRequired, tooFast, allowed } from "../http";
import { randomToken, safeEqual } from "../security";
import { cleanPseudo, pseudoKey, cleanClientId } from "../validate";
import { currentEvent, findPlayer, ranking, forgetRanking, rankIn, type PlayerRow } from "../db";
import type { Ctx } from "../router";

const GRACE_MS = 5 * 60 * 1000;
const SLACK_MS = 5000;
const MAX_SCORE = 15 * 60 * 100;
const TOP = 50;

interface RunRow {
  id: string;
  started_at: number;
  finished_at: number | null;
  score: number | null;
}

async function standing(env: Env, eventId: number, me: PlayerRow, best: number, improved: boolean) {
  if (improved) forgetRanking();
  const list = await ranking(env, eventId, improved);
  return { best, improved, rank: me.banned ? null : rankIn(list, me.id), count: list.length };
}

export async function board({ req, env }: Ctx) {
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return json({ event: null, now, version: env.APP_VERSION, top: [], me: null, count: 0 });
  const [me, list] = await Promise.all([findPlayer(req, env, event.id), ranking(env, event.id)]);
  const top = list.slice(0, TOP).map((row, i) => ({ rank: i + 1, pseudo: row.pseudo, best: row.best, me: me?.id === row.id }));
  return json({
    event: { name: event.name, closesAt: event.closes_at },
    now,
    version: env.APP_VERSION,
    top,
    count: list.length,
    me: me ? { pseudo: me.pseudo, best: me.best, rank: me.banned ? null : rankIn(list, me.id) } : null,
  });
}

export async function join({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  if (!(await allowed(env.JOIN_LIMIT, "join:" + clientIp(req)))) return tooFast();
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return fail(404, "Pas de soirée en cours.");
  if (now >= event.closes_at) return fail(403, "Le classement est fermé.");
  const body = await readJson(req);
  const pseudo = cleanPseudo(body.pseudo);
  if (!pseudo) return fail(400, "Pseudo de 2 à 16 caractères : lettres, chiffres, espaces, tirets.");
  const clientId = cleanClientId(body.clientId);
  const key = pseudoKey(pseudo);
  const taken = await env.DB.prepare("SELECT pseudo, token, client_id FROM players WHERE event_id = ? AND pseudo_key = ?")
    .bind(event.id, key)
    .first<{ pseudo: string; token: string; client_id: string | null }>();
  if (taken) {
    if (clientId && taken.client_id && (await safeEqual(clientId, taken.client_id))) {
      return json({ token: taken.token, pseudo: taken.pseudo });
    }
    return fail(409, "Ce pseudo est déjà pris.");
  }
  const token = randomToken();
  try {
    await env.DB.prepare(
      "INSERT INTO players (id, event_id, pseudo, pseudo_key, token, client_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
      .bind(crypto.randomUUID(), event.id, pseudo, key, token, clientId, now)
      .run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(409, "Ce pseudo est déjà pris.");
    throw e;
  }
  return json({ token, pseudo }, 201);
}

export async function startRun({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return fail(404, "Pas de soirée en cours.");
  if (now >= event.closes_at) return fail(403, "Le classement est fermé.");
  const me = await findPlayer(req, env, event.id);
  if (!me) return fail(401, "Joueur inconnu.");
  if (me.banned) return fail(403, "Tu as été retiré du classement.");
  if (!(await allowed(env.RUN_LIMIT, me.id))) return tooFast();
  const runId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO runs (id, player_id, started_at) VALUES (?, ?, ?)").bind(runId, me.id, now).run();
  return json({ runId }, 201);
}

export async function finishRun({ req, env, params }: Ctx) {
  const now = Date.now();
  const event = await currentEvent(env);
  if (!event) return fail(404, "Pas de soirée en cours.");
  const me = await findPlayer(req, env, event.id);
  if (!me) return fail(401, "Joueur inconnu.");
  const run = await env.DB.prepare("SELECT id, started_at, finished_at, score FROM runs WHERE id = ? AND player_id = ?")
    .bind(params[0], me.id)
    .first<RunRow>();
  if (!run) return fail(404, "Partie inconnue.");
  const score = (await readJson(req)).score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) return fail(400, "Score invalide.");
  if (run.finished_at) {
    if (run.score === score) return json(await standing(env, event.id, me, me.best, false));
    return fail(409, "Partie déjà enregistrée.");
  }
  if (now > event.closes_at + GRACE_MS) return fail(403, "Le classement est fermé.");
  const elapsed = now - run.started_at;
  if (score * 10 > elapsed + SLACK_MS) return fail(422, "Score refusé.");
  const saved = await env.DB.prepare("UPDATE runs SET finished_at = ?, score = ? WHERE id = ? AND finished_at IS NULL")
    .bind(now, score, run.id)
    .run();
  if (!saved.meta.changes) return json(await standing(env, event.id, me, me.best, false));
  const [, record] = await env.DB.batch([
    env.DB.prepare("UPDATE players SET run_count = run_count + 1 WHERE id = ?").bind(me.id),
    env.DB.prepare("UPDATE players SET best = ?1, best_at = ?2, best_elapsed = ?3 WHERE id = ?4 AND best < ?1 AND banned = 0")
      .bind(score, now, elapsed, me.id),
  ]);
  const improved = record.meta.changes > 0;
  return json(await standing(env, event.id, me, improved ? score : me.best, improved));
}
