import { bearer } from "./http";

export interface EventRow {
  id: number;
  name: string;
  closes_at: number;
}

export interface PlayerRow {
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

const RANKING_TTL_MS = 5000;
let rankingCache: { eventId: number; at: number; list: Ranked[] } | null = null;

export const currentEvent = (env: Env) =>
  env.DB.prepare("SELECT id, name, closes_at FROM events ORDER BY id DESC LIMIT 1").first<EventRow>();

export async function findPlayer(req: Request, env: Env, eventId: number) {
  const token = bearer(req);
  if (!token) return null;
  return env.DB.prepare("SELECT id, pseudo, best, banned FROM players WHERE token = ? AND event_id = ?")
    .bind(token, eventId)
    .first<PlayerRow>();
}

export async function ranking(env: Env, eventId: number, fresh = false) {
  const now = Date.now();
  const hit = rankingCache;
  if (!fresh && hit && hit.eventId === eventId && now - hit.at < RANKING_TTL_MS) return hit.list;
  const { results } = await env.DB.prepare(
    "SELECT id, pseudo, best FROM players WHERE event_id = ? AND banned = 0 AND best > 0 ORDER BY best DESC, best_at ASC",
  )
    .bind(eventId)
    .all<Ranked>();
  rankingCache = { eventId, at: now, list: results };
  return results;
}

export const forgetRanking = () => {
  rankingCache = null;
};

export function rankIn(list: Ranked[], playerId: string) {
  const i = list.findIndex((r) => r.id === playerId);
  return i < 0 ? null : i + 1;
}
