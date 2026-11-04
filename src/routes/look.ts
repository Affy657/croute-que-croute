import { json, fail, readJson, outdated, updateRequired, tooFast, allowed } from "../http";
import { cleanLook, cleanProgress, mergeProgress, LOOK_SLOTS, type Progress } from "../validate";
import { findProfile } from "../db";
import type { Ctx } from "../router";

const PROGRESS_TRIES = 3;

const most = (path: string) => `'${path}', MAX(json_extract(?1, '${path}'), COALESCE(json_extract(look, '${path}'), 0))`;
const KEPT_LOOK = `json_set(CASE WHEN look IS NULL OR json_extract(?1, '$.at') > COALESCE(json_extract(look, '$.at'), 0) THEN ?1 ELSE look END, ${[
  "$.ach",
  ...LOOK_SLOTS.map((s) => "$.own." + s),
].map(most).join(", ")})`;
export const lookUpdate = (env: Env, id: string, look: string) =>
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
