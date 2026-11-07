import { json, fail, readJson, clientIp, outdated, updateRequired, tooFast, allowed } from "../http";
import { cleanLook } from "../validate";
import {
  events, openEventNow, eventById, findProfile, entryMark, generalRanking, generalCount, generalRank, eventRanking, eventCount, rankIn, rivalIn,
  promoteGeneral, promoteEvent, seated, LATE_MS,
  type Profile, type Ranked,
} from "../db";
import type { Ctx } from "../router";
import { tell } from "../live";
import { lookUpdate } from "./look";
import { SIX_SEVEN_CS } from "./card";

const SLACK_MS = 15000;
const MAX_SCORE = 15 * 60 * 100;
const MAX_COMBO = 99;
const MAX_WAITED = 12 * 3600 * 1000;

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
const NO_ENTRY = { best: 0, at: null };

export async function startRun({ req, env }: Ctx) {
  if (outdated(req, env, true)) return updateRequired();
  const now = Date.now();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (me.banned) return fail(403, "Tu as été retiré du classement.");
  if (!(await allowed(env.START_LIMIT, me.id)) || !(await allowed(env.START_IP_LIMIT, clientIp(req)))) return tooFast();
  const event = await openEventNow(env, now);
  const runId = crypto.randomUUID();
  const look = cleanLook((await readJson(req)).look);
  const insert = env.DB.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES (?, ?, ?, ?)").bind(runId, me.id, event?.id ?? null, now);
  await env.DB.batch(look ? [insert, lookUpdate(env, me.id, look)] : [insert]);
  return json({ runId, event: !!event }, 201);
}

async function standing(env: Env, me: Profile, eventId: number | null, mobile: Mark, pc: Mark, entry: Mark) {
  const row = (m: Mark): Ranked => ({ id: me.id, pseudo: me.pseudo, best: m.best, at: m.at });
  if (!me.banned && mobile.improved) promoteGeneral(row(mobile));
  if (!me.banned && pc.improved) promoteGeneral(row(pc), "pc");
  if (!me.banned && eventId && entry.improved) promoteEvent(eventId, row(entry));
  const during = !!(await events(env)).open;
  const [readGeneral, readPc, readEvent] = await Promise.all([
    generalRanking(env, during),
    generalRanking(env, during, "pc"),
    eventId ? eventRanking(env, eventId) : Promise.resolve(null),
  ]);
  const general = seated(readGeneral, me, mobile.best, mobile.at);
  const pcList = seated(readPc, me, pc.best, pc.at);
  const eventList = readEvent && seated(readEvent, me, entry.best, entry.at);
  const [rank, count, pcRank, pcCount, players] = await Promise.all([
    me.banned ? null : generalRank(env, general, me.id, mobile.best, mobile.at),
    generalCount(env, general, mobile.improved && !me.best),
    me.banned ? null : generalRank(env, pcList, me.id, pc.best, pc.at, "pc"),
    generalCount(env, pcList, pc.improved && !me.pc_best, "pc"),
    eventId && eventList ? eventCount(env, eventId, eventList) : 0,
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
    eventBest: eventId ? entry.best : null,
    eventImproved: entry.improved,
    eventRank: me.banned || !eventList ? null : rankIn(eventList, me.id),
    eventRival: me.banned || !eventList ? null : rivalIn(eventList, me.id),
    eventCount: players,
  };
}

const readRun = (env: Env, id: string, playerId: string) =>
  env.DB.prepare("SELECT id, event_id, started_at, finished_at, score, device FROM runs WHERE id = ? AND player_id = ?").bind(id, playerId).first<RunRow>();

const unfinished = (run: string) => `EXISTS (SELECT 1 FROM runs WHERE id = ${run} AND finished_at IS NULL)`;

const exists = (player: string) => `EXISTS (SELECT 1 FROM profiles WHERE id = ${player})`;

async function recorded(env: Env, me: Profile, run: RunRow, score: number) {
  if (run.score !== score) return fail(409, "Partie déjà enregistrée.");
  const event = run.event_id && run.device === "mobile" ? await eventById(env, run.event_id) : null;
  const eventId = event && run.finished_at! <= event.closes_at + LATE_MS ? event.id : null;
  const set = (best: number, at: number | null): Mark => ({ best, at, improved: at === run.finished_at });
  const entry = eventId ? await entryMark(env, eventId, me.id) : NO_ENTRY;
  return json(await standing(env, me, eventId, set(me.best, me.best_at), set(me.pc_best, me.pc_best_at), set(entry.best, entry.at)));
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
  const waited = typeof body.waited === "number" && Number.isInteger(body.waited) && body.waited >= 0 && body.waited <= MAX_WAITED ? body.waited : 0;
  const event = run.event_id && device === "mobile" ? await eventById(env, run.event_id) : null;
  const eventId = event && now <= event.closes_at + LATE_MS ? event.id : null;
  const elapsed = now - run.started_at;
  if (score * 10 > elapsed + SLACK_MS) return fail(422, "Score refusé.");
  const played = Math.max(score * 10, elapsed - waited);
  const statements = [
    env.DB.prepare(
      `UPDATE profiles SET run_count = run_count + 1, played = played + ?2, last_at = ?3, lowest = MIN(COALESCE(lowest, ?2), ?2),
         six_seven = MAX(six_seven, ?2 >= ?4 AND ?2 < ?4 + 100), best_combo = MAX(best_combo, COALESCE(?5, 0)) WHERE id = ?1 AND ${unfinished("?6")}`,
    ).bind(me.id, score, now, SIX_SEVEN_CS, combo, run.id),
    device === "pc"
      ? env.DB.prepare(
          `UPDATE profiles SET pc_best = ?1, pc_best_at = ?2, pc_best_elapsed = ?3, steps = json_insert(steps, '$.pc[#]', json_array(?1, ?2))
           WHERE id = ?4 AND pc_best < ?1 AND banned = 0 AND ${unfinished("?5")}`,
        ).bind(score, now, played, me.id, run.id)
      : env.DB.prepare(
          `UPDATE profiles SET best = ?1, best_at = ?2, best_elapsed = ?3, steps = json_insert(steps, '$.mobile[#]', json_array(?1, ?2))
           WHERE id = ?4 AND best < ?1 AND banned = 0 AND ${unfinished("?5")}`,
        ).bind(score, now, played, me.id, run.id),
  ];
  if (eventId) {
    statements.push(
      env.DB.prepare(
        `INSERT INTO entries (event_id, player_id, run_count) SELECT ?1, ?2, 1 WHERE ${exists("?2")} AND ${unfinished("?3")}
         ON CONFLICT (event_id, player_id) DO UPDATE SET run_count = run_count + 1`,
      ).bind(eventId, me.id, run.id),
    );
    if (!me.banned) {
      statements.push(
        env.DB.prepare(`UPDATE entries SET best = ?1, best_at = ?2, best_elapsed = ?3 WHERE event_id = ?4 AND player_id = ?5 AND best < ?1 AND removed = 0 AND ${unfinished("?6")}`)
          .bind(score, now, played, eventId, me.id, run.id),
      );
    }
  }
  statements.push(
    env.DB.prepare(`UPDATE runs SET finished_at = ?1, score = ?2, device = ?3, combo = ?4 WHERE id = ?5 AND finished_at IS NULL AND ${exists("?6")}`)
      .bind(now, score, device, combo, run.id, me.id),
  );
  const results = await env.DB.batch(statements);
  if (!results[statements.length - 1].meta.changes) {
    const [done, fresh] = await Promise.all([readRun(env, run.id, me.id), findProfile(req, env)]);
    if (!done || !fresh) return fail(503, "Réessaie dans un instant.");
    return recorded(env, fresh, done, score);
  }
  const improved = !me.banned && results[1].meta.changes > 0;
  const eventImproved = !!eventId && !me.banned && results[3].meta.changes > 0;
  if (eventImproved || (!eventId && improved && device === "mobile")) tell(env, exec);
  const mark = { best: score, at: now, improved: true };
  const mobile = improved && device === "mobile" ? mark : keptMobile(me), pc = improved && device === "pc" ? mark : keptPc(me);
  const entry = eventImproved ? mark : { ...(eventId ? await entryMark(env, eventId, me.id) : NO_ENTRY), improved: false };
  return json(await standing(env, me, eventId, mobile, pc, entry));
}
