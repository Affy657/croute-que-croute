import { bearer } from "./http";
import { sha256 } from "./security";

export const LATE_MS = 15 * 1000;

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
  pc_best: number;
  pc_best_at: number | null;
  banned: number;
  run_count: number;
  look: string | null;
  google_hash: string | null;
}

export type Board = "general" | "pc";

export interface Ranked {
  id: string;
  pseudo: string;
  best: number;
  at?: number;
}

export interface EventView {
  open: EventRow | null;
  recent: EventRow | null;
  next: EventRow | null;
}

const CACHE_MS = 10000;
const EVENT_GENERAL_MS = 60000;
const LOAD_MS = 5000;
export const RECENT_MS = 12 * 3600 * 1000;
const GENERAL_LIMIT = 1000;
const EVENT_LIMIT = 1000;
const CACHE_KEEP = 300;
const EVENT_COLS = "id, name, opens_at, closes_at";
const EVENT_ROWS = "FROM entries e JOIN profiles p ON p.id = e.player_id WHERE e.event_id = ? AND e.best > 0 AND p.banned = 0";
const COLS: Record<Board, { best: string; at: string }> = { general: { best: "best", at: "best_at" }, pc: { best: "pc_best", at: "pc_best_at" } };
const above = ({ best, at }: { best: string; at: string }) => `banned = 0 AND ${best} > 0 AND (${best} > ?1 OR (${best} = ?1 AND ${at} < ?2))`;

let eventsCache: { at: number; rows: EventRow[] } | null = null;
const rankingCache = new Map<string, { at: number; value: unknown }>();
const loading = new Map<string, { at: number; promise: Promise<unknown> }>();
let generation = 0;

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
  return env.DB.prepare(
    `SELECT p.id, p.pseudo, p.best, p.best_at, p.pc_best, p.pc_best_at, p.banned, p.run_count, p.look, p.google_hash
     FROM sessions s JOIN profiles p ON p.id = s.player_id WHERE s.token_hash = ?`,
  )
    .bind(await sha256(token))
    .first<Profile>();
}

export async function entryMark(env: Env, eventId: number, playerId: string) {
  const row = await env.DB.prepare("SELECT best, best_at AS at FROM entries WHERE event_id = ? AND player_id = ?")
    .bind(eventId, playerId)
    .first<{ best: number; at: number | null }>();
  return row ?? { best: 0, at: null };
}

export const entryBest = async (env: Env, eventId: number, playerId: string) => (await entryMark(env, eventId, playerId)).best;

export function cached<T>(key: string, maxAge: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = rankingCache.get(key);
  if (hit && now - hit.at < maxAge) return Promise.resolve(hit.value as T);
  const pending = maxAge > 0 ? loading.get(key) : undefined;
  if (pending && now - pending.at < LOAD_MS) return pending.promise as Promise<T>;
  const gen = generation;
  const loaded = load()
    .then((value) => {
      if (gen !== generation) return value;
      if (value === null) {
        rankingCache.delete(key);
        return value;
      }
      if (rankingCache.size >= CACHE_KEEP) for (const [k, v] of rankingCache) if (now - v.at > EVENT_GENERAL_MS) rankingCache.delete(k);
      rankingCache.set(key, { at: now, value });
      return value;
    })
    .finally(() => {
      if (loading.get(key)?.promise === loaded) loading.delete(key);
    });
  if (maxAge > 0) loading.set(key, { at: now, promise: loaded });
  return loaded;
}

export const generalRanking = (env: Env, during = false, board: Board = "general") => {
  const { best, at } = COLS[board];
  return cached(board, during ? EVENT_GENERAL_MS : CACHE_MS, async () =>
    (await env.DB.prepare(
      `SELECT id, pseudo, ${best} AS best FROM profiles WHERE banned = 0 AND ${best} > 0 ORDER BY ${best} DESC, ${at} ASC LIMIT ?`,
    )
      .bind(GENERAL_LIMIT)
      .all<Ranked>()).results);
};

export const generalCount = (env: Env, list: Ranked[], fresh = false, board: Board = "general") =>
  list.length < GENERAL_LIMIT
    ? Promise.resolve(list.length)
    : cached("count:" + board, fresh ? 0 : CACHE_MS, async () =>
        (await env.DB.prepare(`SELECT COUNT(*) AS n FROM profiles WHERE banned = 0 AND ${COLS[board].best} > 0`).first<{ n: number }>())!.n);

export async function generalRank(env: Env, list: Ranked[], playerId: string, best: number, bestAt: number | null, board: Board = "general") {
  const rank = rankIn(list, playerId);
  if (rank || best <= 0 || list.length < GENERAL_LIMIT) return rank;
  const n = await env.DB.prepare(`SELECT COUNT(*) AS n FROM profiles WHERE ${above(COLS[board])}`).bind(best, bestAt ?? 0).first<{ n: number }>();
  return n!.n + 1;
}

export const eventRanking = (env: Env, eventId: number) =>
  cached("event:" + eventId, CACHE_MS, async () =>
    (await env.DB.prepare(
      `SELECT e.player_id AS id, p.pseudo, e.best ${EVENT_ROWS}
       ORDER BY e.best DESC, e.best_at ASC LIMIT ?`,
    )
      .bind(eventId, EVENT_LIMIT)
      .all<Ranked>()).results);

export const eventCount = (env: Env, eventId: number, list: Ranked[]) =>
  list.length < EVENT_LIMIT
    ? Promise.resolve(list.length)
    : cached("event-count:" + eventId, CACHE_MS, async () =>
        (await env.DB.prepare(`SELECT COUNT(*) AS n ${EVENT_ROWS}`).bind(eventId).first<{ n: number }>())!.n);

function promote(key: string, row: Ranked, limit: number) {
  const hit = rankingCache.get(key);
  if (!hit) return;
  const list = (hit.value as Ranked[]).filter((r) => r.id !== row.id);
  const below = list.findIndex((r) => r.best < row.best);
  list.splice(below < 0 ? list.length : below, 0, row);
  hit.value = list.slice(0, limit);
}

export const promoteGeneral = (row: Ranked, board: Board = "general") => promote(board, row, GENERAL_LIMIT);

export const promoteEvent = (eventId: number, row: Ranked) => promote("event:" + eventId, row, EVENT_LIMIT);

export function forgetCaches() {
  eventsCache = null;
  rankingCache.clear();
  loading.clear();
  generation++;
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
