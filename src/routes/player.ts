import { json, fail, readJson, clientIp, outdated, updateRequired, tooFast, allowed } from "../http";
import { randomToken, sha256, matchesSecret } from "../security";
import { cleanPseudo, pseudoKey, cleanClientId } from "../validate";
import {
  events, openEventNow, eventById, findProfile, entryBest, generalRanking, generalCount, generalRank, eventRanking, renameCached, rankIn, rivalIn,
  promoteGeneral, promoteEvent, forgetCaches,
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
  device: string | null;
}

interface Mark {
  best: number;
  at: number | null;
  improved: boolean;
}

const keptMobile = (me: Profile): Mark => ({ best: me.best, at: me.best_at, improved: false });
const keptPc = (me: Profile): Mark => ({ best: me.pc_best, at: me.pc_best_at, improved: false });

const eventInfo = (e: EventRow | null, status: string) =>
  e ? { name: e.name, opensAt: e.opens_at, closesAt: e.closes_at, finalAt: e.closes_at + GRACE_MS, status } : null;

const topOf = (list: Ranked[], me: Profile | null) =>
  list.slice(0, TOP).map((row, i) => ({ rank: i + 1, pseudo: row.pseudo, best: row.best, me: me?.id === row.id }));

export async function board({ req, env }: Ctx) {
  const now = Date.now();
  const [view, me] = await Promise.all([events(env, now), findProfile(req, env)]);
  const [general, pc] = await Promise.all([generalRanking(env, !!view.open), generalRanking(env, !!view.open, "pc")]);
  const shown = view.open ?? view.recent;
  const [eventList, eventMine, count, rank, pcCount, pcRank] = await Promise.all([
    shown ? eventRanking(env, shown.id) : null,
    shown && me ? entryBest(env, shown.id, me.id) : 0,
    generalCount(env, general),
    me && !me.banned ? generalRank(env, general, me.id, me.best, me.best_at) : null,
    generalCount(env, pc, false, "pc"),
    me && !me.banned ? generalRank(env, pc, me.id, me.pc_best, me.pc_best_at, "pc") : null,
  ]);
  return json({
    now,
    version: env.APP_VERSION,
    event: view.open ? eventInfo(view.open, "open") : eventInfo(view.recent, "closed"),
    next: eventInfo(view.next, "upcoming"),
    top: topOf(general, me),
    count,
    pcTop: topOf(pc, me),
    pcCount,
    eventTop: eventList ? topOf(eventList, me) : [],
    eventCount: eventList ? eventList.length : 0,
    me: me
      ? {
          pseudo: me.pseudo,
          best: me.best,
          runs: me.run_count,
          rank,
          rival: me.banned ? null : rivalIn(general, me.id),
          pcBest: me.pc_best,
          pcRank,
          pcRival: me.banned ? null : rivalIn(pc, me.id),
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

async function standing(env: Env, me: Profile, eventId: number | null, mobile: Mark, pc: Mark, eventBest: number, eventImproved: boolean) {
  if (mobile.improved) promoteGeneral({ id: me.id, pseudo: me.pseudo, best: mobile.best });
  if (pc.improved) promoteGeneral({ id: me.id, pseudo: me.pseudo, best: pc.best }, "pc");
  if (eventId && eventImproved) promoteEvent(eventId, { id: me.id, pseudo: me.pseudo, best: eventBest });
  const [general, pcList, eventList] = await Promise.all([
    generalRanking(env, !!eventId),
    generalRanking(env, !!eventId, "pc"),
    eventId ? eventRanking(env, eventId) : Promise.resolve(null),
  ]);
  const [rank, count, pcRank, pcCount] = await Promise.all([
    me.banned ? null : generalRank(env, general, me.id, mobile.best, mobile.at),
    generalCount(env, general, mobile.improved && !me.best),
    me.banned ? null : generalRank(env, pcList, me.id, pc.best, pc.at, "pc"),
    generalCount(env, pcList, pc.improved && !me.pc_best, "pc"),
  ]);
  return {
    best: mobile.best,
    improved: mobile.improved,
    rank,
    rival: me.banned ? null : rivalIn(general, me.id),
    count,
    pcBest: pc.best,
    pcImproved: pc.improved,
    pcRank,
    pcRival: me.banned ? null : rivalIn(pcList, me.id),
    pcCount,
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
  const run = await env.DB.prepare("SELECT id, event_id, started_at, finished_at, score, device FROM runs WHERE id = ? AND player_id = ?")
    .bind(params[0], me.id)
    .first<RunRow>();
  if (!run) return fail(404, "Partie inconnue.");
  const body = await readJson(req);
  const score = body.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) return fail(400, "Score invalide.");
  const device = (run.finished_at ? run.device : body.device) === "pc" ? "pc" : "mobile";
  const event = run.event_id && device === "mobile" ? await eventById(env, run.event_id) : null;
  const eventId = event && now <= event.closes_at + GRACE_MS ? event.id : null;
  const mine = () => (eventId ? entryBest(env, eventId, me.id) : Promise.resolve(0));
  if (run.finished_at) {
    if (run.score !== score) return fail(409, "Partie déjà enregistrée.");
    return json(await standing(env, me, eventId, keptMobile(me), keptPc(me), await mine(), false));
  }
  const elapsed = now - run.started_at;
  if (score * 10 > elapsed + SLACK_MS) return fail(422, "Score refusé.");
  const saved = await env.DB.prepare("UPDATE runs SET finished_at = ?, score = ?, device = ? WHERE id = ? AND finished_at IS NULL")
    .bind(now, score, device, run.id)
    .run();
  if (!saved.meta.changes) return json(await standing(env, me, eventId, keptMobile(me), keptPc(me), await mine(), false));
  if (device === "pc" && me.best > 0 && !(await env.DB.prepare("SELECT 1 FROM runs WHERE player_id = ? AND device = 'mobile' LIMIT 1").bind(me.id).first())) {
    await env.DB.batch([
      env.DB.prepare("UPDATE profiles SET pc_best = best, pc_best_at = best_at, pc_best_elapsed = best_elapsed WHERE id = ? AND best > pc_best").bind(me.id),
      env.DB.prepare("UPDATE profiles SET best = 0, best_at = NULL, best_elapsed = NULL WHERE id = ?").bind(me.id),
      env.DB.prepare("UPDATE runs SET device = 'pc' WHERE player_id = ? AND device IS NULL").bind(me.id),
    ]);
    if (me.best > me.pc_best) Object.assign(me, { pc_best: me.best, pc_best_at: me.best_at });
    Object.assign(me, { best: 0, best_at: null });
    forgetCaches();
  }
  const statements = [
    env.DB.prepare("UPDATE profiles SET run_count = run_count + 1 WHERE id = ?").bind(me.id),
    device === "pc"
      ? env.DB.prepare("UPDATE profiles SET pc_best = ?1, pc_best_at = ?2, pc_best_elapsed = ?3 WHERE id = ?4 AND pc_best < ?1 AND banned = 0")
          .bind(score, now, elapsed, me.id)
      : env.DB.prepare("UPDATE profiles SET best = ?1, best_at = ?2, best_elapsed = ?3 WHERE id = ?4 AND best < ?1 AND banned = 0")
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
  const mark = { best: score, at: now, improved: true };
  const mobile = improved && device === "mobile" ? mark : keptMobile(me), pc = improved && device === "pc" ? mark : keptPc(me);
  return json(await standing(env, me, eventId, mobile, pc, eventBest, eventImproved));
}
