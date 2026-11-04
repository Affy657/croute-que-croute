import { json, bearer, keyCookie, withKey } from "../http";
import { events, findProfile, entryBest, generalRanking, generalCount, generalRank, eventRanking, rankIn, rivalIn, LATE_MS, type EventRow, type Profile, type Ranked } from "../db";
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
    google: !!env.GOOGLE_CLIENT_ID,
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
          google: !!me.google_hash,
        }
      : null,
  });
  const token = bearer(req);
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
