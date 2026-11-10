import { json, bearer, keyCookie, withKey } from "../http";
import { sha256 } from "../security";
import { events, findProfile, entryMark, generalRanking, generalCount, generalRank, eventRanking, eventCount, rankIn, rivalIn, seated, LATE_MS, type EventRow, type Profile, type Ranked } from "../db";
import type { Ctx } from "../router";

const TOP = 50;
const FEED_MS = 15 * 60 * 1000, FEED_SIZE = 6, SCREEN_TOP = 10;

const eventInfo = (e: EventRow | null, status: string) =>
  e ? { name: e.name, opensAt: e.opens_at, closesAt: e.closes_at, finalAt: e.closes_at + LATE_MS, status } : null;

const topOf = (list: Ranked[], me: Profile | null) =>
  list.slice(0, TOP).map((row, i) => ({ rank: i + 1, id: row.id, pseudo: row.pseudo, best: row.best, at: row.at, me: me?.id === row.id }));

export async function board({ req, env }: Ctx) {
  const now = Date.now();
  const [view, me] = await Promise.all([events(env, now), findProfile(req, env)]);
  const token = bearer(req);
  const out = !me && !!token && !!(await env.DB.prepare("SELECT 1 FROM signed_out WHERE token_hash = ?").bind(await sha256(token)).first());
  const shown = view.open ?? view.recent;
  const [readGeneral, readPc, readEvent, eventMine] = await Promise.all([
    generalRanking(env, !!view.open),
    generalRanking(env, !!view.open, "pc"),
    shown ? eventRanking(env, shown.id) : null,
    shown && me ? entryMark(env, shown.id, me.id) : { best: 0, at: null },
  ]);
  const general = seated(readGeneral, me, me?.best ?? 0, me?.best_at ?? null);
  const pc = seated(readPc, me, me?.pc_best ?? 0, me?.pc_best_at ?? null);
  const eventList = readEvent && seated(readEvent, me, eventMine.best, eventMine.at);
  const [players, count, rank, pcCount, pcRank] = await Promise.all([
    shown && eventList ? eventCount(env, shown.id, eventList) : 0,
    generalCount(env, general),
    me && !me.banned ? generalRank(env, general, me.id, me.best, me.best_at) : null,
    generalCount(env, pc, false, "pc"),
    me && !me.banned ? generalRank(env, pc, me.id, me.pc_best, me.pc_best_at, "pc") : null,
  ]);
  const res = json({
    now,
    version: env.APP_VERSION,
    google: !!env.GOOGLE_CLIENT_ID,
    event: view.open ? eventInfo(view.open, "open") : eventInfo(view.recent, "closed"),
    next: eventInfo(view.next, "upcoming"),
    top: topOf(general, me),
    count,
    pcTop: topOf(pc, me),
    pcCount,
    eventTop: eventList ? topOf(eventList, me) : [],
    eventCount: players,
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
          eventBest: eventMine.best,
          eventRank: me.banned || !eventList ? null : rankIn(eventList, me.id),
          eventRival: me.banned || !eventList ? null : rivalIn(eventList, me.id),
          banned: !!me.banned,
          look: me.look ? JSON.parse(me.look) : null,
          google: !!me.google_hash,
        }
      : null,
    ...(out ? { out: true } : {}),
  });
  return me && keyCookie(req) !== token ? withKey(res, token) : res;
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
         WHERE e.event_id = ?1 AND e.best > 0 AND e.best_at > ?2 AND p.banned = 0 AND e.removed = 0 ORDER BY e.best_at DESC LIMIT ?3`,
      ).bind(open.id, since, FEED_SIZE)
    : env.DB.prepare(
        `SELECT pseudo, best AS score, best_at AS at FROM profiles INDEXED BY profiles_best_at
         WHERE best > 0 AND best_at > ?1 AND banned = 0 ORDER BY best_at DESC LIMIT ?2`,
      ).bind(since, FEED_SIZE);
  const kept = open ? " AND NOT EXISTS (SELECT 1 FROM entries WHERE event_id = ?3 AND player_id = profiles.id AND removed = 1)" : "";
  const joins = env.DB.prepare(
    `SELECT pseudo, created_at AS at FROM profiles INDEXED BY profiles_joined WHERE created_at > ?1 AND banned = 0${kept} ORDER BY created_at DESC LIMIT ?2`,
  ).bind(since, FEED_SIZE, ...(open ? [open.id] : []));
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
  const [rows, ranking] = await Promise.all([
    env.DB.prepare(
      `SELECT p.id, p.pseudo, e.best, e.best_at AS at FROM entries e JOIN profiles p ON p.id = e.player_id
       WHERE e.event_id = ?1 AND e.best > 0 AND p.banned = 0 AND e.removed = 0 ORDER BY e.best DESC, e.best_at ASC LIMIT ?2`,
    )
      .bind(shown.id, SCREEN_TOP)
      .all<Ranked>(),
    eventRanking(env, shown.id),
  ]);
  return { list: rows.results, count: await eventCount(env, shown.id, ranking) };
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
