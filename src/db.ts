import { bearer } from "./http";

export interface EventRow {
  id: number;
  name: string;
  opens_at: number;
  closes_at: number;
}

export interface Profile {
  id: string;
  pseudo: string;
  best: number;
  banned: number;
}

export interface Ranked {
  id: string;
  pseudo: string;
  best: number;
}

export interface EventView {
  open: EventRow | null;
  recent: EventRow | null;
  next: EventRow | null;
}

const CACHE_MS = 5000;
export const RECENT_MS = 12 * 3600 * 1000;
const GENERAL_LIMIT = 1000;
const EVENT_COLS = "id, name, opens_at, closes_at";

let eventsCache: { at: number; rows: EventRow[] } | null = null;
const rankingCache = new Map<string, { at: number; list: Ranked[] }>();

export async function events(env: Env, now = Date.now()): Promise<EventView> {
  if (!eventsCache || now - eventsCache.at > CACHE_MS) {
    const { results } = await env.DB.prepare(`SELECT ${EVENT_COLS} FROM events WHERE closes_at > ? ORDER BY opens_at ASC`)
      .bind(now - RECENT_MS)
      .all<EventRow>();
    eventsCache = { at: now, rows: results };
  }
  const rows = eventsCache.rows;
  return {
    open: rows.find((e) => e.opens_at <= now && now < e.closes_at) ?? null,
    recent: rows.filter((e) => e.closes_at <= now).pop() ?? null,
    next: rows.find((e) => e.opens_at > now) ?? null,
  };
}

export const openEventNow = (env: Env, now = Date.now()) =>
  env.DB.prepare(`SELECT ${EVENT_COLS} FROM events WHERE closes_at > ?1 AND opens_at <= ?1 ORDER BY id DESC LIMIT 1`)
    .bind(now)
    .first<EventRow>();

export const pendingEvent = (env: Env, now = Date.now()) =>
  env.DB.prepare(`SELECT ${EVENT_COLS} FROM events WHERE closes_at > ? ORDER BY opens_at ASC LIMIT 1`).bind(now).first<EventRow>();

export const lastEvent = (env: Env) =>
  env.DB.prepare(`SELECT ${EVENT_COLS} FROM events ORDER BY opens_at DESC LIMIT 1`).first<EventRow>();

export const eventById = (env: Env, id: number) =>
  env.DB.prepare(`SELECT ${EVENT_COLS} FROM events WHERE id = ?`).bind(id).first<EventRow>();

export async function findProfile(req: Request, env: Env) {
  const token = bearer(req);
  if (!token) return null;
  return env.DB.prepare("SELECT id, pseudo, best, banned FROM profiles WHERE token = ?").bind(token).first<Profile>();
}

export async function entryBest(env: Env, eventId: number, playerId: string) {
  const row = await env.DB.prepare("SELECT best FROM entries WHERE event_id = ? AND player_id = ?")
    .bind(eventId, playerId)
    .first<{ best: number }>();
  return row?.best ?? 0;
}

function cached(key: string, fresh: boolean, load: () => Promise<Ranked[]>) {
  const now = Date.now();
  const hit = rankingCache.get(key);
  if (!fresh && hit && now - hit.at < CACHE_MS) return Promise.resolve(hit.list);
  return load().then((list) => {
    rankingCache.set(key, { at: now, list });
    return list;
  });
}

export const generalRanking = (env: Env, fresh = false) =>
  cached("general", fresh, async () =>
    (await env.DB.prepare(
      "SELECT id, pseudo, best FROM profiles WHERE banned = 0 AND best > 0 ORDER BY best DESC, best_at ASC LIMIT ?",
    )
      .bind(GENERAL_LIMIT)
      .all<Ranked>()).results);

export const eventRanking = (env: Env, eventId: number, fresh = false) =>
  cached("event:" + eventId, fresh, async () =>
    (await env.DB.prepare(
      `SELECT e.player_id AS id, p.pseudo, e.best FROM entries e JOIN profiles p ON p.id = e.player_id
       WHERE e.event_id = ? AND e.best > 0 AND p.banned = 0
       ORDER BY e.best DESC, e.best_at ASC`,
    )
      .bind(eventId)
      .all<Ranked>()).results);

export function forgetCaches() {
  eventsCache = null;
  rankingCache.clear();
}

export function rankIn(list: Ranked[], playerId: string) {
  const i = list.findIndex((r) => r.id === playerId);
  return i < 0 ? null : i + 1;
}
