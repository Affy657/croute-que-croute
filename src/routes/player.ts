import { json, fail, readJson, bearer, clientIp, outdated, updateRequired, tooFast, allowed, keyCookie, withKey } from "../http";
import { randomToken, sha256 } from "../security";
import { cleanPseudo, pseudoKey, cleanClientId, cleanLook, cleanProgress, mergeProgress, LOOK_SLOTS, type Progress } from "../validate";
import {
  events, openEventNow, eventById, findProfile, entryBest, entryMark, generalRanking, generalCount, generalRank, eventRanking, renameCached, rankIn, rivalIn,
  promoteGeneral, promoteEvent, cached,
  type EventRow, type Profile, type Ranked,
} from "../db";
import type { Ctx } from "../router";
import { tell } from "../live";

const LATE_MS = 15 * 1000;
const SLACK_MS = 15000;
const MAX_SCORE = 15 * 60 * 100;
const TOP = 50;
const FEED_MS = 15 * 60 * 1000, FEED_SIZE = 6, SCREEN_TOP = 10;
const CARD_MS = 10000, CARD_RECORDS = 10, EXPRESS_CS = 200, SIX_SEVEN_CS = 6700, EVENT_TOP = 10, WIN_MIN = 10, MAX_COMBO = 99;
const PROGRESS_TRIES = 3;
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
  e ? { name: e.name, opensAt: e.opens_at, closesAt: e.closes_at, finalAt: e.closes_at + LATE_MS, status } : null;

const topOf = (list: Ranked[], me: Profile | null) =>
  list.slice(0, TOP).map((row, i) => ({ rank: i + 1, id: row.id, pseudo: row.pseudo, best: row.best, at: row.at, me: me?.id === row.id }));

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
  const res = json({
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
          id: me.id,
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
          look: me.look ? JSON.parse(me.look) : null,
        }
      : null,
  });
  const token = bearer(req);
  return me && keyCookie(req) !== token ? withKey(res, token) : res;
}

export async function resume({ req, env }: Ctx) {
  const token = keyCookie(req);
  if (!/^[a-f0-9]{48}$/.test(token)) return json({ token: null });
  if (!(await allowed(env.JOIN_IP_LIMIT, "resume:" + clientIp(req)))) return tooFast();
  const known = await env.DB.prepare("SELECT 1 FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first();
  return known ? json({ token }) : withKey(json({ token: null }), null);
}

interface FeedRow {
  pseudo: string;
  score?: number;
  at: number;
}

async function feedItems(env: Env, open: EventRow | null, now: number) {
  const since = now - FEED_MS;
  const bests = open
    ? env.DB.prepare(
        `SELECT p.pseudo, e.best AS score, e.best_at AS at FROM entries e JOIN profiles p ON p.id = e.player_id
         WHERE e.event_id = ?1 AND e.best > 0 AND e.best_at > ?2 AND p.banned = 0 ORDER BY e.best_at DESC LIMIT ?3`,
      ).bind(open.id, since, FEED_SIZE)
    : env.DB.prepare(
        `SELECT pseudo, best AS score, best_at AS at FROM profiles INDEXED BY profiles_best_at
         WHERE best > 0 AND best_at > ?1 AND banned = 0 ORDER BY best_at DESC LIMIT ?2`,
      ).bind(since, FEED_SIZE);
  const joins = env.DB.prepare(
    `SELECT pseudo, created_at AS at FROM profiles INDEXED BY profiles_joined WHERE created_at > ?1 AND banned = 0 ORDER BY created_at DESC LIMIT ?2`,
  ).bind(since, FEED_SIZE);
  const [b, j] = await Promise.all([bests.all<FeedRow>(), joins.all<FeedRow>()]);
  return [
    ...b.results.map((r) => ({ kind: "best", pseudo: r.pseudo, score: r.score, at: r.at })),
    ...j.results.map((r) => ({ kind: "join", pseudo: r.pseudo, at: r.at })),
  ]
    .sort((x, y) => y.at - x.at)
    .slice(0, FEED_SIZE);
}

export async function feed({ env }: Ctx) {
  const now = Date.now();
  const view = await events(env, now);
  return json({ now, items: await feedItems(env, view.open, now) });
}

async function screenTop(env: Env, shown: EventRow | null, during: boolean) {
  if (!shown) {
    const general = await generalRanking(env, during);
    return { list: general.slice(0, SCREEN_TOP), count: await generalCount(env, general) };
  }
  const from = "FROM entries e JOIN profiles p ON p.id = e.player_id WHERE e.event_id = ?1 AND e.best > 0 AND p.banned = 0";
  const [rows, n] = await env.DB.batch([
    env.DB.prepare(`SELECT p.id, p.pseudo, e.best, e.best_at AS at ${from} ORDER BY e.best DESC, e.best_at ASC LIMIT ?2`).bind(shown.id, SCREEN_TOP),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(shown.id),
  ]);
  return { list: rows.results as Ranked[], count: (n.results[0] as { n: number }).n };
}

export async function screen({ req, env }: Ctx) {
  const now = Date.now();
  const view = await events(env, now);
  const shown = view.open ?? view.recent;
  const head = {
    now,
    version: env.APP_VERSION,
    event: view.open ? eventInfo(view.open, "open") : eventInfo(view.recent, "closed"),
    next: eventInfo(view.next, "upcoming"),
  };
  const marks = await (shown
    ? env.DB.prepare("SELECT (SELECT MAX(best_at) FROM entries WHERE event_id = ?1) AS a, (SELECT MAX(created_at) FROM profiles) AS b").bind(shown.id)
    : env.DB.prepare("SELECT (SELECT MAX(best_at) FROM profiles) AS a, (SELECT MAX(created_at) FROM profiles) AS b")
  ).first<{ a: number | null; b: number | null }>();
  const stamp = `${shown?.id ?? 0}.${marks?.a ?? 0}.${marks?.b ?? 0}`;
  if (new URL(req.url).searchParams.get("v") === stamp) return json({ ...head, stamp, same: true });
  const [{ list, count }, items] = await Promise.all([screenTop(env, shown, !!view.open), feedItems(env, view.open, now)]);
  return json({ ...head, stamp, last: marks?.a ?? 0, top: topOf(list, null), count, feed: items });
}

export async function join({ req, env, exec }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const body = await readJson(req);
  const pseudo = cleanPseudo(body.pseudo);
  if (!pseudo) return fail(400, BAD_PSEUDO);
  const clientId = cleanClientId(body.clientId);
  const ip = clientIp(req);
  if (!(await allowed(env.JOIN_LIMIT, "join:" + (clientId ?? ip))) || !(await allowed(env.JOIN_IP_LIMIT, "join:" + ip))) return tooFast();
  const key = pseudoKey(pseudo);
  const taken = await env.DB.prepare("SELECT id, pseudo FROM profiles WHERE pseudo_key = ?").bind(key).first<{ id: string; pseudo: string }>();
  const token = randomToken();
  const [tokenHash, clientHash] = await Promise.all([sha256(token), clientId ? sha256(clientId) : null]);
  const session = (id: string) =>
    env.DB.prepare("INSERT INTO sessions (token_hash, player_id, client_hash, created_at) VALUES (?, ?, ?, ?)").bind(tokenHash, id, clientHash, Date.now());
  if (taken) {
    const device = (sql: string) => env.DB.prepare(sql).bind(taken.id, clientHash, clientId);
    if (clientId && (await device("SELECT 1 FROM sessions WHERE player_id = ?1 AND client_hash IN (?2, ?3)").first())) {
      await env.DB.batch([device("DELETE FROM sessions WHERE player_id = ?1 AND client_hash IN (?2, ?3)"), session(taken.id)]);
      return json({ token, pseudo: taken.pseudo });
    }
    return fail(409, "Ce pseudo est déjà pris.");
  }
  const id = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, pseudo, key, tokenHash, Date.now()),
      session(id),
    ]);
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(409, "Ce pseudo est déjà pris.");
    throw e;
  }
  tell(env, exec);
  return json({ token, pseudo }, 201);
}

export async function rename({ req, env, exec }: Ctx) {
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
  tell(env, exec);
  return json({ pseudo });
}

export async function startRun({ req, env }: Ctx) {
  if (outdated(req, env, true)) return updateRequired();
  const now = Date.now();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (me.banned) return fail(403, "Tu as été retiré du classement.");
  if (!(await allowed(env.RUN_LIMIT, me.id))) return tooFast();
  const event = await openEventNow(env, now);
  const runId = crypto.randomUUID();
  const look = cleanLook((await readJson(req)).look);
  const insert = env.DB.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES (?, ?, ?, ?)").bind(runId, me.id, event?.id ?? null, now);
  await env.DB.batch(look ? [insert, lookUpdate(env, me.id, look)] : [insert]);
  return json({ runId, event: !!event }, 201);
}

const most = (path: string) => `'${path}', MAX(json_extract(?1, '${path}'), COALESCE(json_extract(look, '${path}'), 0))`;
const KEPT_LOOK = `json_set(CASE WHEN look IS NULL OR json_extract(?1, '$.at') > COALESCE(json_extract(look, '$.at'), 0) THEN ?1 ELSE look END, ${[
  "$.ach",
  ...LOOK_SLOTS.map((s) => "$.own." + s),
].map(most).join(", ")})`;
const lookUpdate = (env: Env, id: string, look: string) =>
  env.DB.prepare(`UPDATE profiles SET look = ${KEPT_LOOK} WHERE id = ?2 AND look IS NOT ${KEPT_LOOK}`).bind(look, id);

export async function saveLook({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (!(await allowed(env.RUN_LIMIT, "look:" + me.id))) return tooFast();
  const body = await readJson(req);
  const look = cleanLook(body.look);
  if (!look) return fail(400, "Tenue invalide.");
  const [, kept] = await env.DB.batch([lookUpdate(env, me.id, look), env.DB.prepare("SELECT look FROM profiles WHERE id = ?").bind(me.id)]);
  const stored = (kept.results[0] as { look: string | null } | undefined)?.look;
  const sent = cleanProgress(body.progress);
  return json({ ok: true, progress: sent ? await saveProgress(env, me.id, sent) : undefined, look: stored ? JSON.parse(stored) : null });
}

async function saveProgress(env: Env, id: string, sent: Progress) {
  let merged = sent;
  for (let i = 0; i < PROGRESS_TRIES; i++) {
    const stored = (await env.DB.prepare("SELECT progress FROM profiles WHERE id = ?").bind(id).first<{ progress: string | null }>())?.progress ?? null;
    merged = mergeProgress(cleanProgress(stored ? JSON.parse(stored) : {})!, sent);
    const text = JSON.stringify(merged);
    if (text === stored) break;
    if ((await env.DB.prepare("UPDATE profiles SET progress = ?1 WHERE id = ?2 AND progress IS ?3").bind(text, id, stored).run()).meta.changes) break;
  }
  return merged;
}

interface Totals {
  played: number;
  last_at: number | null;
  lowest: number | null;
  six_seven: number;
  best_combo: number;
}

interface CardRow extends Totals {
  id: string;
  pseudo: string;
  best: number;
  best_at: number | null;
  pc_best: number;
  pc_best_at: number | null;
  run_count: number;
  banned: number;
  created_at: number;
  look: string | null;
  steps: string | null;
}

type Steps = Record<"mobile" | "pc", [number, number][]>;

interface EntryRow {
  id: number;
  name: string;
  best: number;
  runs: number;
}

async function fromRuns(env: Env, p: CardRow): Promise<CardRow> {
  if (p.steps) return p;
  const [totals, { results }] = await Promise.all([
    env.DB.prepare(
      `SELECT COALESCE(SUM(score), 0) AS played, MAX(finished_at) AS last_at, MIN(score) AS lowest,
         COALESCE(MAX(score >= ?2 AND score < ?2 + 100), 0) AS six_seven, COALESCE(MAX(combo), 0) AS best_combo
       FROM runs WHERE player_id = ?1 AND finished_at IS NOT NULL`,
    )
      .bind(p.id, SIX_SEVEN_CS)
      .first<Totals>(),
    env.DB.prepare(
      `SELECT score, pc, at FROM (
         SELECT score, device IS 'pc' AS pc, finished_at AS at,
           MAX(score) OVER (PARTITION BY device IS 'pc' ORDER BY finished_at ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING) AS before
         FROM runs WHERE player_id = ? AND finished_at IS NOT NULL AND invalid = 0 AND score > 0
       ) WHERE before IS NULL OR score > before ORDER BY at ASC`,
    )
      .bind(p.id)
      .all<{ score: number; pc: number; at: number }>(),
  ]);
  const steps: Steps = { mobile: [], pc: [] };
  for (const r of results) steps[r.pc ? "pc" : "mobile"].push([r.score, r.at]);
  const row = { ...p, ...totals!, steps: JSON.stringify(steps) };
  await env.DB.prepare(
    `UPDATE profiles SET played = ?1, last_at = ?2, lowest = ?3, six_seven = ?4, best_combo = ?5, steps = ?6
     WHERE id = ?7 AND steps IS NULL AND run_count = ?8`,
  )
    .bind(row.played, row.last_at, row.lowest, row.six_seven, row.best_combo, row.steps, p.id, p.run_count)
    .run();
  return row;
}

async function loadCard(env: Env, id: string) {
  const row = await env.DB.prepare(
    `SELECT id, pseudo, best, best_at, pc_best, pc_best_at, run_count, banned, created_at, look, played, last_at, lowest, six_seven, best_combo, steps
     FROM profiles WHERE id = ?`,
  )
    .bind(id)
    .first<CardRow>();
  if (!row || row.banned) return null;
  const p = await fromRuns(env, row);
  const steps: Steps = JSON.parse(p.steps!);
  const view = await events(env);
  const [general, pc] = await Promise.all([generalRanking(env, !!view.open), generalRanking(env, !!view.open, "pc")]);
  const [rank, count, pcRank, pcCount, entries] = await Promise.all([
    p.best > 0 ? generalRank(env, general, p.id, p.best, p.best_at) : null,
    generalCount(env, general),
    p.pc_best > 0 ? generalRank(env, pc, p.id, p.pc_best, p.pc_best_at, "pc") : null,
    generalCount(env, pc, false, "pc"),
    env.DB.prepare(
      "SELECT e.event_id AS id, ev.name, e.best, e.run_count AS runs FROM entries e JOIN events ev ON ev.id = e.event_id WHERE e.player_id = ? ORDER BY ev.opens_at DESC",
    )
      .bind(p.id)
      .all<EntryRow>(),
  ]);
  const places = (
    await Promise.all(
      entries.results
        .filter((e) => e.best > 0)
        .map(async (e) => {
          const list = await eventRanking(env, e.id);
          const place = rankIn(list, p.id);
          return { name: e.name, place: place ?? list.filter((r) => r.best >= e.best).length + 1, players: list.length + (place ? 0 : 1) };
        }),
    )
  ).sort((a, b) => a.place - b.place);
  const records = (pc: boolean) =>
    steps[pc ? "pc" : "mobile"]
      .filter(([score]) => score <= (pc ? p.pc_best : p.best))
      .slice(-CARD_RECORDS)
      .map(([score, at]) => ({ score, pc, at }));
  return {
    pseudo: p.pseudo,
    joinedAt: p.created_at,
    lastAt: p.last_at,
    best: p.best,
    rank,
    count,
    pcBest: p.pc_best,
    pcRank,
    pcCount,
    runs: p.run_count,
    played: p.played,
    records: [...records(false), ...records(true)].sort((a, b) => a.at - b.at),
    combo: p.best_combo,
    events: entries.results.filter((e) => e.runs > 0).length,
    eventBest: places[0] ? { name: places[0].name, place: places[0].place } : null,
    look: p.look ? JSON.parse(p.look) : null,
    feats: {
      express: p.lowest !== null && p.lowest < EXPRESS_CS,
      sixSeven: !!p.six_seven,
      top10: places.some((e) => e.place <= EVENT_TOP),
      eventWin: [...places.map((e) => [e.place, e.players]), [rank, count], [pcRank, pcCount]].some(([place, n]) => place === 1 && (n ?? 0) >= WIN_MIN),
    },
  };
}

export async function card({ req, env, params }: Ctx) {
  const own = (await findProfile(req, env))?.id === params[0];
  const value = own ? await loadCard(env, params[0]) : await cached("card:" + params[0], CARD_MS, () => loadCard(env, params[0]));
  return value ? json({ now: Date.now(), ...value }) : fail(404, "Joueur introuvable.");
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

const readRun = (env: Env, id: string, playerId: string) =>
  env.DB.prepare("SELECT id, event_id, started_at, finished_at, score, device FROM runs WHERE id = ? AND player_id = ?").bind(id, playerId).first<RunRow>();

const ours = (run: string, at: string) => `EXISTS (SELECT 1 FROM runs WHERE id = ${run} AND finished_at = ${at})`;

async function recorded(env: Env, me: Profile, run: RunRow, score: number) {
  if (run.score !== score) return fail(409, "Partie déjà enregistrée.");
  const event = run.event_id && run.device === "mobile" ? await eventById(env, run.event_id) : null;
  const eventId = event && run.finished_at! <= event.closes_at + LATE_MS ? event.id : null;
  const set = (best: number, at: number | null): Mark => ({ best, at, improved: at === run.finished_at });
  const entry = eventId ? await entryMark(env, eventId, me.id) : { best: 0, at: null };
  return json(await standing(env, me, eventId, set(me.best, me.best_at), set(me.pc_best, me.pc_best_at), entry.best, entry.at === run.finished_at));
}

export async function finishRun({ req, env, params, exec }: Ctx) {
  const now = Date.now();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  const run = await readRun(env, params[0], me.id);
  if (!run) return fail(404, "Partie inconnue.");
  const body = await readJson(req);
  const score = body.score;
  if (typeof score !== "number" || !Number.isInteger(score) || score < 0 || score > MAX_SCORE) return fail(400, "Score invalide.");
  if (run.finished_at) return recorded(env, me, run, score);
  const device = body.device === "pc" ? "pc" : "mobile";
  const combo = typeof body.combo === "number" && Number.isInteger(body.combo) && body.combo >= 0 && body.combo <= MAX_COMBO ? body.combo : null;
  const event = run.event_id && device === "mobile" ? await eventById(env, run.event_id) : null;
  const eventId = event && now <= event.closes_at + LATE_MS ? event.id : null;
  const mine = () => (eventId ? entryBest(env, eventId, me.id) : Promise.resolve(0));
  const elapsed = now - run.started_at;
  if (score * 10 > elapsed + SLACK_MS) return fail(422, "Score refusé.");
  const statements = [
    env.DB.prepare("UPDATE runs SET finished_at = ?, score = ?, device = ?, combo = ? WHERE id = ? AND finished_at IS NULL")
      .bind(now, score, device, combo, run.id),
    env.DB.prepare(
      `UPDATE profiles SET run_count = run_count + 1, played = played + ?2, last_at = ?3, lowest = MIN(COALESCE(lowest, ?2), ?2),
         six_seven = MAX(six_seven, ?2 >= ?4 AND ?2 < ?4 + 100), best_combo = MAX(best_combo, COALESCE(?5, 0)) WHERE id = ?1 AND ${ours("?6", "?3")}`,
    ).bind(me.id, score, now, SIX_SEVEN_CS, combo, run.id),
    device === "pc"
      ? env.DB.prepare(
          `UPDATE profiles SET pc_best = ?1, pc_best_at = ?2, pc_best_elapsed = ?3, steps = json_insert(steps, '$.pc[#]', json_array(?1, ?2))
           WHERE id = ?4 AND pc_best < ?1 AND banned = 0 AND ${ours("?5", "?2")}`,
        ).bind(score, now, elapsed, me.id, run.id)
      : env.DB.prepare(
          `UPDATE profiles SET best = ?1, best_at = ?2, best_elapsed = ?3, steps = json_insert(steps, '$.mobile[#]', json_array(?1, ?2))
           WHERE id = ?4 AND best < ?1 AND banned = 0 AND ${ours("?5", "?2")}`,
        ).bind(score, now, elapsed, me.id, run.id),
  ];
  if (eventId) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO entries (event_id, player_id, run_count) SELECT ?1, ?2, 1 WHERE ${ours("?3", "?4")}
         ON CONFLICT (event_id, player_id) DO UPDATE SET run_count = run_count + 1`,
      ).bind(eventId, me.id, run.id, now),
    );
    if (!me.banned) {
      statements.push(
        env.DB.prepare(`UPDATE entries SET best = ?1, best_at = ?2, best_elapsed = ?3 WHERE event_id = ?4 AND player_id = ?5 AND best < ?1 AND ${ours("?6", "?2")}`)
          .bind(score, now, elapsed, eventId, me.id, run.id),
      );
    }
  }
  const results = await env.DB.batch(statements);
  if (!results[0].meta.changes) {
    const [done, fresh] = await Promise.all([readRun(env, run.id, me.id), findProfile(req, env)]);
    if (!done || !fresh) return fail(404, "Partie inconnue.");
    return recorded(env, fresh, done, score);
  }
  const improved = !me.banned && results[2].meta.changes > 0;
  const eventImproved = !!eventId && !me.banned && results[4].meta.changes > 0;
  if (eventImproved || (!eventId && improved && device === "mobile")) tell(env, exec);
  const eventBest = eventImproved ? score : await mine();
  const mark = { best: score, at: now, improved: true };
  const mobile = improved && device === "mobile" ? mark : keptMobile(me), pc = improved && device === "pc" ? mark : keptPc(me);
  return json(await standing(env, me, eventId, mobile, pc, eventBest, eventImproved));
}
