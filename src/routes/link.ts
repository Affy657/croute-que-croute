import { create } from "qrcode/lib/core/qrcode.js";
import { json, fail, readJson, clientIp, bearer, outdated, updateRequired, tooFast, allowed } from "../http";
import { randomToken, randomCode, sha256 } from "../security";
import { cleanClientId, cleanLinkCode, cleanProgress, mergeProgress, LINK_CHARS, LINK_LENGTH } from "../validate";
import { findProfile, forgetCaches } from "../db";
import type { Ctx } from "../router";

const LINK_MS = 10 * 60 * 1000;
const UNKNOWN = "Code inconnu ou expiré.";
const wins = (b: string, a: string, best: string, at: string) => `${b}.${best} > ${a}.${best} OR (${b}.${best} = ${a}.${best} AND ${b}.${at} < ${a}.${at})`;
const better = (col: string, best: string, at: string) => `${col} = CASE WHEN ${wins("b", "a", best, at)} THEN b.${col} ELSE a.${col} END`;
const MERGE_PROFILE = `UPDATE profiles AS a SET
  ${["best", "best_at", "best_elapsed"].map((c) => better(c, "best", "best_at")).join(", ")},
  ${["pc_best", "pc_best_at", "pc_best_elapsed"].map((c) => better(c, "pc_best", "pc_best_at")).join(", ")},
  run_count = a.run_count + b.run_count, created_at = MIN(a.created_at, b.created_at), steps = NULL, progress = ?3
  FROM profiles AS b WHERE a.id = ?1 AND b.id = ?2`;
const MERGE_ENTRIES = `INSERT INTO entries (event_id, player_id, best, best_at, best_elapsed, run_count)
  SELECT event_id, ?1, best, best_at, best_elapsed, run_count FROM entries WHERE player_id = ?2
  ON CONFLICT (event_id, player_id) DO UPDATE SET
  ${["best", "best_at", "best_elapsed"].map((c) => `${c} = CASE WHEN ${wins("excluded", "entries", "best", "best_at")} THEN excluded.${c} ELSE entries.${c} END`).join(", ")},
  run_count = entries.run_count + excluded.run_count`;

function qrOf(text: string) {
  const { size, data } = create(text, { errorCorrectionLevel: "M" }).modules;
  return { size, bits: Array.from(data, (b) => (b ? "1" : "0")).join("") };
}

export async function createLink({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (!(await allowed(env.RENAME_LIMIT, "code:" + me.id))) return tooFast();
  const now = Date.now(), code = randomCode(LINK_CHARS, LINK_LENGTH), expiresAt = now + LINK_MS;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM links WHERE player_id = ?1 OR expires_at <= ?2").bind(me.id, now),
    env.DB.prepare("INSERT INTO links (code_hash, player_id, expires_at) VALUES (?, ?, ?)").bind(await sha256(code), me.id, expiresAt),
  ]);
  return json({ code, expiresAt, qr: qrOf(`${new URL(req.url).origin}/#lier=${code}`) }, 201);
}

async function mergeInto(env: Env, into: string, from: string) {
  const { results } = await env.DB.prepare("SELECT id, progress FROM profiles WHERE id IN (?1, ?2)").bind(into, from).all<{ id: string; progress: string | null }>();
  const read = (id: string) => cleanProgress(JSON.parse(results.find((r) => r.id === id)?.progress ?? "{}"))!;
  await env.DB.batch([
    env.DB.prepare(MERGE_PROFILE).bind(into, from, JSON.stringify(mergeProgress(read(into), read(from)))),
    env.DB.prepare(MERGE_ENTRIES).bind(into, from),
    env.DB.prepare("DELETE FROM entries WHERE player_id = ?").bind(from),
    env.DB.prepare("UPDATE runs SET player_id = ?1 WHERE player_id = ?2").bind(into, from),
    env.DB.prepare("UPDATE sessions SET player_id = ?1 WHERE player_id = ?2").bind(into, from),
    env.DB.prepare("DELETE FROM links WHERE player_id = ?").bind(from),
    env.DB.prepare("DELETE FROM profiles WHERE id = ?").bind(from),
  ]);
  forgetCaches();
}

export async function useLink({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  if (!(await allowed(env.JOIN_LIMIT, "link:" + clientIp(req)))) return tooFast();
  const body = await readJson(req);
  const code = cleanLinkCode(body.code);
  if (!code) return fail(400, "Le code fait " + LINK_LENGTH + " caractères.");
  const hash = await sha256(code), now = Date.now();
  const [link, me] = await Promise.all([
    env.DB.prepare(
      "SELECT l.player_id AS id, l.expires_at, p.pseudo, p.banned FROM links l JOIN profiles p ON p.id = l.player_id WHERE l.code_hash = ? AND l.expires_at > ?",
    )
      .bind(hash, now)
      .first<{ id: string; expires_at: number; pseudo: string; banned: number }>(),
    findProfile(req, env),
  ]);
  if (!link) return fail(404, UNKNOWN);
  if (me && me.id === link.id) return fail(409, "Cet appareil est déjà sur ce compte.");
  if (me && (me.banned || link.banned)) return fail(403, "Impossible de réunir un compte retiré du classement.");
  if (me && body.merge !== true) return json({ error: "Cet appareil a déjà un compte.", merge: { from: me.pseudo, into: link.pseudo } }, 409);
  if (!(await env.DB.prepare("DELETE FROM links WHERE code_hash = ?").bind(hash).run()).meta.changes) return fail(404, UNKNOWN);
  try {
    if (me) {
      await mergeInto(env, link.id, me.id);
      return json({ pseudo: link.pseudo, merged: true });
    }
    const clientId = cleanClientId(body.clientId);
    const token = randomToken();
    const [tokenHash, clientHash] = await Promise.all([sha256(token), clientId ? sha256(clientId) : null]);
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions WHERE player_id = ?1 AND client_hash IN (?2, ?3)").bind(link.id, clientHash, clientId),
      env.DB.prepare("INSERT INTO sessions (token_hash, player_id, client_hash, created_at) VALUES (?, ?, ?, ?)").bind(tokenHash, link.id, clientHash, now),
    ]);
    return json({ token, pseudo: link.pseudo });
  } catch (e) {
    await env.DB.prepare("INSERT OR IGNORE INTO links (code_hash, player_id, expires_at) VALUES (?, ?, ?)").bind(hash, link.id, link.expires_at).run().catch(() => null);
    throw e;
  }
}

export async function logoutOthers({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (!(await allowed(env.RENAME_LIMIT, "out:" + me.id))) return tooFast();
  const [out] = await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE player_id = ?1 AND token_hash <> ?2").bind(me.id, await sha256(bearer(req))),
    env.DB.prepare("DELETE FROM links WHERE player_id = ?").bind(me.id),
  ]);
  return json({ removed: out.meta.changes });
}
