import { bearer } from "./http";
import { sha256, HASH_LENGTH } from "./security";

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
  best_at: number | null;
  banned: number;
  run_count: number;
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

const CACHE_MS = 10000;
const EVENT_GENERAL_MS = 60000;
export const RECENT_MS = 12 * 3600 * 1000;
const GENERAL_LIMIT = 1000;
const OLD_TOKEN_LENGTH = 48;
const EVENT_COLS = "id, name, opens_at, closes_at";
const ABOVE = "banned = 0 AND best > 0 AND (best > ?1 OR (best = ?1 AND best_at < ?2))";

let eventsCache: { at: number; rows: EventRow[] } | null = null;
const rankingCache = new Map<string, { at: number; value: unknown }>();

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
  const hash = await sha256(token);
  const me = await env.DB.prepare("SELECT id, pseudo, best, best_at, banned, run_count, token FROM profiles WHERE token IN (?1, ?2)")
    .bind(hash, token.length === OLD_TOKEN_LENGTH ? token : hash)
    .first<Profile & { token: string }>();
  if (me && me.token.length !== HASH_LENGTH) await env.DB.prepare("UPDATE profiles SET token = ? WHERE id = ?").bind(hash, me.id).run();
  return me;
}

export async function entryBest(env: Env, eventId: number, playerId: string) {
  const row = await env.DB.prepare("SELECT best FROM entries WHERE event_id = ? AND player_id = ?")
    .bind(eventId, playerId)
    .first<{ best: number }>();
  return row?.best ?? 0;
}

function cached<T>(key: string, maxAge: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = rankingCache.get(key);
  if (hit && now - hit.at < maxAge) return Promise.resolve(hit.value as T);
  return load().then((value) => {
    rankingCache.set(key, { at: now, value });
    return value;
  });
}

export const generalRanking = (env: Env, during = false) =>
  cached("general", during ? EVENT_GENERAL_MS : CACHE_MS, async () =>
    (await env.DB.prepare(
      "SELECT id, pseudo, best FROM profiles WHERE banned = 0 AND best > 0 ORDER BY best DESC, best_at ASC LIMIT ?",
    )
      .bind(GENERAL_LIMIT)
      .all<Ranked>()).results);

export const generalCount = (env: Env, list: Ranked[], fresh = false) =>
  list.length < GENERAL_LIMIT
    ? Promise.resolve(list.length)
    : cached("count", fresh ? 0 : CACHE_MS, async () =>
        (await env.DB.prepare("SELECT COUNT(*) AS n FROM profiles WHERE banned = 0 AND best > 0").first<{ n: number }>())!.n);

export async function generalRank(env: Env, list: Ranked[], playerId: string, best: number, bestAt: number | null) {
  const rank = rankIn(list, playerId);
  if (rank || best <= 0 || list.length < GENERAL_LIMIT) return rank;
  const above = await env.DB.prepare(`SELECT COUNT(*) AS n FROM profiles WHERE ${ABOVE}`).bind(best, bestAt ?? 0).first<{ n: number }>();
  return above!.n + 1;
}

export const eventRanking = (env: Env, eventId: number) =>
  cached("event:" + eventId, CACHE_MS, async () =>
    (await env.DB.prepare(
      `SELECT e.player_id AS id, p.pseudo, e.best FROM entries e JOIN profiles p ON p.id = e.player_id
       WHERE e.event_id = ? AND e.best > 0 AND p.banned = 0
       ORDER BY e.best DESC, e.best_at ASC`,
    )
      .bind(eventId)
      .all<Ranked>()).results);

function promote(key: string, row: Ranked, limit: number) {
  const hit = rankingCache.get(key);
  if (!hit) return;
  const list = (hit.value as Ranked[]).filter((r) => r.id !== row.id);
  const below = list.findIndex((r) => r.best < row.best);
  list.splice(below < 0 ? list.length : below, 0, row);
  hit.value = list.slice(0, limit);
}

export const promoteGeneral = (row: Ranked) => promote("general", row, GENERAL_LIMIT);

export const promoteEvent = (eventId: number, row: Ranked) => promote("event:" + eventId, row, Infinity);

export function forgetCaches() {
  eventsCache = null;
  rankingCache.clear();
}

export function renameCached(id: string, pseudo: string) {
  for (const hit of rankingCache.values()) {
    if (!Array.isArray(hit.value)) continue;
    for (const row of hit.value as Ranked[]) if (row.id === id) row.pseudo = pseudo;
  }
}

export function rankIn(list: Ranked[], playerId: string) {
  const i = list.findIndex((r) => r.id === playerId);
  return i < 0 ? null : i + 1;
}

export function rivalIn(list: Ranked[], playerId: string) {
  const i = list.findIndex((r) => r.id === playerId);
  return i > 0 ? { pseudo: list[i - 1].pseudo, best: list[i - 1].best } : null;
}
