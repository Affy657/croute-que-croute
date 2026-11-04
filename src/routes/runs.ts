import { json, fail, readJson, outdated, updateRequired, tooFast, allowed } from "../http";
import { cleanLook } from "../validate";
import {
  openEventNow, eventById, findProfile, entryBest, entryMark, generalRanking, generalCount, generalRank, eventRanking, rankIn, rivalIn,
  promoteGeneral, promoteEvent, LATE_MS,
  type Profile,
} from "../db";
import type { Ctx } from "../router";
import { tell } from "../live";
import { lookUpdate } from "./look";
import { SIX_SEVEN_CS } from "./card";

const SLACK_MS = 15000;
const MAX_SCORE = 15 * 60 * 100;
const MAX_COMBO = 99;

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

async function standing(env: Env, me: Profile, eventId: number | null, mobile: Mark, pc: Mark, eventBest: number, eventImproved: boolean) {
  if (!me.banned && mobile.improved) promoteGeneral({ id: me.id, pseudo: me.pseudo, best: mobile.best });
  if (!me.banned && pc.improved) promoteGeneral({ id: me.id, pseudo: me.pseudo, best: pc.best }, "pc");
  if (!me.banned && eventId && eventImproved) promoteEvent(eventId, { id: me.id, pseudo: me.pseudo, best: eventBest });
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

const unfinished = (run: string) => `EXISTS (SELECT 1 FROM runs WHERE id = ${run} AND finished_at IS NULL)`;

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
    env.DB.prepare(
      `UPDATE profiles SET run_count = run_count + 1, played = played + ?2, last_at = ?3, lowest = MIN(COALESCE(lowest, ?2), ?2),
         six_seven = MAX(six_seven, ?2 >= ?4 AND ?2 < ?4 + 100), best_combo = MAX(best_combo, COALESCE(?5, 0)) WHERE id = ?1 AND ${unfinished("?6")}`,
    ).bind(me.id, score, now, SIX_SEVEN_CS, combo, run.id),
    device === "pc"
      ? env.DB.prepare(
          `UPDATE profiles SET pc_best = ?1, pc_best_at = ?2, pc_best_elapsed = ?3, steps = json_insert(steps, '$.pc[#]', json_array(?1, ?2))
           WHERE id = ?4 AND pc_best < ?1 AND banned = 0 AND ${unfinished("?5")}`,
        ).bind(score, now, elapsed, me.id, run.id)
      : env.DB.prepare(
          `UPDATE profiles SET best = ?1, best_at = ?2, best_elapsed = ?3, steps = json_insert(steps, '$.mobile[#]', json_array(?1, ?2))
           WHERE id = ?4 AND best < ?1 AND banned = 0 AND ${unfinished("?5")}`,
        ).bind(score, now, elapsed, me.id, run.id),
  ];
  if (eventId) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO entries (event_id, player_id, run_count) SELECT ?1, ?2, 1 WHERE ${unfinished("?3")}
         ON CONFLICT (event_id, player_id) DO UPDATE SET run_count = run_count + 1`,
      ).bind(eventId, me.id, run.id),
    );
    if (!me.banned) {
      statements.push(
        env.DB.prepare(`UPDATE entries SET best = ?1, best_at = ?2, best_elapsed = ?3 WHERE event_id = ?4 AND player_id = ?5 AND best < ?1 AND ${unfinished("?6")}`)
          .bind(score, now, elapsed, eventId, me.id, run.id),
      );
    }
  }
  statements.push(
    env.DB.prepare("UPDATE runs SET finished_at = ?, score = ?, device = ?, combo = ? WHERE id = ? AND finished_at IS NULL").bind(now, score, device, combo, run.id),
  );
  const results = await env.DB.batch(statements);
  if (!results[statements.length - 1].meta.changes) {
    const [done, fresh] = await Promise.all([readRun(env, run.id, me.id), findProfile(req, env)]);
    if (!done || !fresh) return fail(404, "Partie inconnue.");
    return recorded(env, fresh, done, score);
  }
  const improved = !me.banned && results[1].meta.changes > 0;
  const eventImproved = !!eventId && !me.banned && results[3].meta.changes > 0;
  if (eventImproved || (!eventId && improved && device === "mobile")) tell(env, exec);
  const eventBest = eventImproved ? score : await mine();
  const mark = { best: score, at: now, improved: true };
  const mobile = improved && device === "mobile" ? mark : keptMobile(me), pc = improved && device === "pc" ? mark : keptPc(me);
  return json(await standing(env, me, eventId, mobile, pc, eventBest, eventImproved));
}
