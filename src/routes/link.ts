import { create } from "qrcode/lib/core/qrcode.js";
import { json, fail, readJson, clientIp, outdated, updateRequired, tooFast, allowed } from "../http";
import { randomToken, randomCode, sha256 } from "../security";
import { cleanClientId, cleanLinkCode, LINK_CHARS, LINK_LENGTH } from "../validate";
import { findProfile } from "../db";
import type { Ctx } from "../router";

const LINK_MS = 10 * 60 * 1000;

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

export async function useLink({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  if (!(await allowed(env.JOIN_LIMIT, "link:" + clientIp(req)))) return tooFast();
  const body = await readJson(req);
  const code = cleanLinkCode(body.code);
  if (!code) return fail(400, "Le code fait " + LINK_LENGTH + " caractères.");
  const hash = await sha256(code), now = Date.now();
  const link = await env.DB.prepare(
    "SELECT l.player_id AS id, p.pseudo FROM links l JOIN profiles p ON p.id = l.player_id WHERE l.code_hash = ? AND l.expires_at > ?",
  )
    .bind(hash, now)
    .first<{ id: string; pseudo: string }>();
  if (!link || !(await env.DB.prepare("DELETE FROM links WHERE code_hash = ?").bind(hash).run()).meta.changes) {
    return fail(404, "Code inconnu ou expiré.");
  }
  const clientId = cleanClientId(body.clientId);
  const token = randomToken();
  const [tokenHash, clientHash] = await Promise.all([sha256(token), clientId ? sha256(clientId) : null]);
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE player_id = ?1 AND client_hash IN (?2, ?3)").bind(link.id, clientHash, clientId),
    env.DB.prepare("INSERT INTO sessions (token_hash, player_id, client_hash, created_at) VALUES (?, ?, ?, ?)").bind(tokenHash, link.id, clientHash, now),
  ]);
  return json({ token, pseudo: link.pseudo });
}
