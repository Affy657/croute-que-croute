import { json, fail } from "../http";
import { events, findProfile, generalRanking, generalCount, generalRank, eventRanking, rankIn, cached } from "../db";
import type { Ctx } from "../router";

export const SIX_SEVEN_CS = 6700;
const CARD_MS = 10000, CARD_RECORDS = 10, EXPRESS_CS = 200, EVENT_TOP = 10, WIN_MIN = 10;
const SETTLED_MS = 60 * 1000, SETTLED_KEEP_MS = 10 * 60 * 1000;

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
  closes_at: number;
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
      "SELECT e.event_id AS id, ev.name, CASE WHEN e.removed = 0 THEN e.best ELSE 0 END AS best, e.run_count AS runs, ev.closes_at FROM entries e JOIN events ev ON ev.id = e.event_id WHERE e.player_id = ? ORDER BY ev.opens_at DESC",
    )
      .bind(p.id)
      .all<EntryRow>(),
  ]);
  const places = (
    await Promise.all(
      entries.results
        .filter((e) => e.best > 0)
        .map(async (e) => {
          const list = await eventRanking(env, e.id, Date.now() - e.closes_at > SETTLED_MS ? SETTLED_KEEP_MS : undefined);
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
