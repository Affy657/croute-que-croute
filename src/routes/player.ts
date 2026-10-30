import { json, fail, readJson, clientIp, outdated, updateRequired, tooFast, allowed } from "../http";
import { randomToken, sha256, matchesSecret } from "../security";
import { cleanPseudo, pseudoKey, cleanClientId } from "../validate";
import {
  events, openEventNow, eventById, findProfile, entryBest, generalRanking, generalCount, generalRank, eventRanking, renameCached, rankIn, rivalIn,
  promoteGeneral, promoteEvent,
  type EventRow, type Profile, type Ranked,
} from "../db";
import type { Ctx } from "../router";

const GRACE_MS = 5 * 60 * 1000;
const SLACK_MS = 5000;
const MAX_SCORE = 15 * 60 * 100;
const TOP = 50;
const FEED_MS = 15 * 60 * 1000, FEED_SIZE = 6;
const BAD_PSEUDO = "Pseudo de 2 à 16 caractères : lettres, chiffres, espaces, tirets.";

interface RunRow {
  id: string;
  event_id: number | null;
  started_at: number;
  finished_at: number | null;
  score: number | null;
}

const eventInfo = (e: EventRow | null, status: string) =>
  e ? { name: e.name, opensAt: e.opens_at, closesAt: e.closes_at, finalAt: e.closes_at + GRACE_MS, status } : null;

const topOf = (list: Ranked[], me: Profile | null) =>
  list.slice(0, TOP).map((row, i) => ({ rank: i + 1, pseudo: row.pseudo, best: row.best, me: me?.id === row.id }));

export async function board({ req, env }: Ctx) {
  const now = Date.now();
  const [view, me] = await Promise.all([events(env, now), findProfile(req, env)]);
  const general = await generalRanking(env, !!view.open);
  const shown = view.open ?? view.recent;
  const [eventList, eventMine, count, rank] = await Promise.all([
    shown ? eventRanking(env, shown.id) : null,
    shown && me ? entryBest(env, shown.id, me.id) : 0,
    generalCount(env, general),
    me && !me.banned ? generalRank(env, general, me.id, me.best, me.best_at) : null,
  ]);
  return json({
    now,
    version: env.APP_VERSION,
    event: view.open ? eventInfo(view.open, "open") : eventInfo(view.recent, "closed"),
    next: eventInfo(view.next, "upcoming"),
    top: topOf(general, me),
    count,
    eventTop: eventList ? topOf(eventList, me) : [],
    eventCount: eventList ? eventList.length : 0,
    me: me
      ? {
          pseudo: me.pseudo,
          best: me.best,
          runs: me.run_count,
          rank,
          rival: me.banned ? null : rivalIn(general, me.id),
          eventBest: eventMine,
          eventRank: me.banned || !eventList ? null : rankIn(eventList, me.id),
          eventRival: me.banned || !eventList ? null : rivalIn(eventList, me.id),
          banned: !!me.banned,
        }
      : null,
  });
}

interface FeedRow {
  pseudo: string;
  score?: number;
  at: number;
}

export async function feed({ env }: Ctx) {
  const now = Date.now();
  const since = now - FEED_MS;
  const view = await events(env, now);
  const bests = view.open
    ? env.DB.prepare(
        `SELECT p.pseudo, e.best AS score, e.best_at AS at FROM entries e JOIN profiles p ON p.id = e.player_id
         WHERE e.event_id = ?1 AND e.best > 0 AND e.best_at > ?2 AND p.banned = 0 ORDER BY e.best_at DESC LIMIT ?3`,
      ).bind(view.open.id, since, FEED_SIZE)
    : env.DB.prepare(
        `SELECT pseudo, best AS score, best_at AS at FROM profiles INDEXED BY profiles_best_at
         WHERE best > 0 AND best_at > ?1 AND banned = 0 ORDER BY best_at DESC LIMIT ?2`,
      ).bind(since, FEED_SIZE);
  const joins = env.DB.prepare(
    `SELECT pseudo, created_at AS at FROM profiles INDEXED BY profiles_joined WHERE created_at > ?1 AND banned = 0 ORDER BY created_at DESC LIMIT ?2`,
  ).bind(since, FEED_SIZE);
  const [b, j] = await Promise.all([bests.all<FeedRow>(), joins.all<FeedRow>()]);
  const items = [
    ...b.results.map((r) => ({ kind: "best", pseudo: r.pseudo, score: r.score, at: r.at })),
    ...j.results.map((r) => ({ kind: "join", pseudo: r.pseudo, at: r.at })),
  ]
    .sort((x, y) => y.at - x.at)
    .slice(0, FEED_SIZE);
  return json({ now, items });
}

export async function join({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const body = await readJson(req);
  const pseudo = cleanPseudo(body.pseudo);
  if (!pseudo) return fail(400, BAD_PSEUDO);
  const clientId = cleanClientId(body.clientId);
  const ip = clientIp(req);
  if (!(await allowed(env.JOIN_LIMIT, "join:" + (clientId ?? ip))) || !(await allowed(env.JOIN_IP_LIMIT, "join:" + ip))) return tooFast();
  const key = pseudoKey(pseudo);
  const taken = await env.DB.prepare("SELECT id, pseudo, client_id FROM profiles WHERE pseudo_key = ?")
    .bind(key)
    .first<{ id: string; pseudo: string; client_id: string | null }>();
  const token = randomToken();
  const [tokenHash, clientHash] = await Promise.all([sha256(token), clientId ? sha256(clientId) : null]);
  if (taken) {
    if (clientId && taken.client_id && (await matchesSecret(clientId, taken.client_id))) {
      await env.DB.prepare("UPDATE profiles SET token = ?, client_id = ? WHERE id = ?").bind(tokenHash, clientHash, taken.id).run();
      return json({ token, pseudo: taken.pseudo });
    }
    return fail(409, "Ce pseudo est déjà pris.");
  }
  try {
    await env.DB.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, client_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), pseudo, key, tokenHash, clientHash, Date.now())
      .run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(409, "Ce pseudo est déjà pris.");
    throw e;
  }
  return json({ token, pseudo }, 201);
}

export async function rename({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (!(await allowed(env.RENAME_LIMIT, me.id))) return tooFast();
  const pseudo = cleanPseudo((await readJson(req)).pseudo);
  if (!pseudo) return fail(400, BAD_PSEUDO);
  try {
    await env.DB.prepare("UPDATE profiles SET pseudo = ?, pseudo_key = ? WHERE id = ?").bind(pseudo, pseudoKey(pseudo), me.id).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(409, "Ce pseudo est déjà pris.");
    throw e;
  }
  renameCached(me.id, pseudo);
  return json({ pseudo });
}

export async function startRun({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const now = Date.now();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (me.banned) return fail(403, "Tu as été retiré du classement.");
  if (!(await allowed(env.RUN_LIMIT, me.id))) return tooFast();
  const event = await openEventNow(env, now);
  const runId = crypto.randomUUID();
  await env.DB.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES (?, ?, ?, ?)")
    .bind(runId, me.id, event?.id ?? null, now)
    .run();
  return json({ runId, event: !!event }, 201);
}

async function standing(
  env: Env, me: Profile, eventId: number | null, best: number, bestAt: number | null, improved: boolean, eventBest: number, eventImproved: boolean,
) {
  if (improved) promoteGeneral({ id: me.id, pseudo: me.pseudo, best });
  if (eventId && eventImproved) promoteEvent(eventId, { id: me.id, pseudo: me.pseudo, best: eventBest });
  const [general, eventList] = await Promise.all([
    generalRanking(env, !!eventId),
    eventId ? eventRanking(env, eventId) : Promise.resolve(null),
  ]);
  const [rank, count] = await Promise.all([
    me.banned ? null : generalRank(env, general, me.id, best, bestAt),
    generalCount(env, general, improved && !me.best),
  ]);
  return {
    best,
    improved,
    rank,
    rival: me.banned ? null : rivalIn(general, me.id),
    count,
    eventBest: eventId ? eventBest : null,
    eventImproved,
    eventRank: me.banned || !eventList ? null : rankIn(eventList, me.id),
    eventRival: me.banned || !eventList ? null : rivalIn(eventList, me.id),
    eventCount: eventList ? eventList.length : 0,
  };
}

export async function finishRun({ req, env, params }: Ctx) {
  const now = Date.now();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  const run = await env.DB.prepare("SELECT id, event_id, started_at, finished_at, score FROM runs WHERE id = ? AND player_id = ?")
    .bind(params[0], me.id)
    .first<RunRow>();
  if (!run) return fail(404, "Partie inconnue.");
  const score = (await readJson(req)).score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) return fail(400, "Score invalide.");
  const event = run.event_id ? await eventById(env, run.event_id) : null;
  const eventId = event && now <= event.closes_at + GRACE_MS ? event.id : null;
  const mine = () => (eventId ? entryBest(env, eventId, me.id) : Promise.resolve(0));
  if (run.finished_at) {
    if (run.score !== score) return fail(409, "Partie déjà enregistrée.");
    return json(await standing(env, me, eventId, me.best, me.best_at, false, await mine(), false));
  }
  const elapsed = now - run.started_at;
  if (score * 10 > elapsed + SLACK_MS) return fail(422, "Score refusé.");
  const saved = await env.DB.prepare("UPDATE runs SET finished_at = ?, score = ? WHERE id = ? AND finished_at IS NULL")
    .bind(now, score, run.id)
    .run();
  if (!saved.meta.changes) return json(await standing(env, me, eventId, me.best, me.best_at, false, await mine(), false));
  const statements = [
    env.DB.prepare("UPDATE profiles SET run_count = run_count + 1 WHERE id = ?").bind(me.id),
    env.DB.prepare("UPDATE profiles SET best = ?1, best_at = ?2, best_elapsed = ?3 WHERE id = ?4 AND best < ?1 AND banned = 0")
      .bind(score, now, elapsed, me.id),
  ];
  if (eventId) {
    statements.push(
      env.DB.prepare(
        "INSERT INTO entries (event_id, player_id, run_count) VALUES (?, ?, 1) ON CONFLICT (event_id, player_id) DO UPDATE SET run_count = run_count + 1",
      ).bind(eventId, me.id),
    );
    if (!me.banned) {
      statements.push(
        env.DB.prepare("UPDATE entries SET best = ?1, best_at = ?2, best_elapsed = ?3 WHERE event_id = ?4 AND player_id = ?5 AND best < ?1")
          .bind(score, now, elapsed, eventId, me.id),
      );
    }
  }
  const results = await env.DB.batch(statements);
  const improved = !me.banned && results[1].meta.changes > 0;
  const eventImproved = !!eventId && !me.banned && results[3].meta.changes > 0;
  const eventBest = eventImproved ? score : await mine();
  return json(await standing(env, me, eventId, improved ? score : me.best, improved ? now : me.best_at, improved, eventBest, eventImproved));
}
