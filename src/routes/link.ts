import { create } from "qrcode/lib/core/qrcode.js";
import { json, fail, readJson, clientIp, bearer, outdated, updateRequired, tooFast, allowed } from "../http";
import { randomToken, randomCode, sha256 } from "../security";
import { cleanClientId, cleanLinkCode, cleanProgress, mergeProgress, LINK_CHARS, LINK_LENGTH } from "../validate";
import { findProfile, forgetCaches } from "../db";
import type { Ctx } from "../router";
import { tell } from "../live";

const LINK_MS = 10 * 60 * 1000;
const RETRY_MS = 5 * 60 * 1000;
const MERGE_RUNS_MAX = 2000;
const UNKNOWN = "Code inconnu ou expiré.";
const wins = (b: string, a: string, best: string, at: string) => `${b}.${best} > ${a}.${best} OR (${b}.${best} = ${a}.${best} AND ${b}.${at} < ${a}.${at})`;
const better = (col: string, best: string, at: string) => `${col} = CASE WHEN ${wins("b", "a", best, at)} THEN b.${col} ELSE a.${col} END`;
const MERGE_PROFILE = `UPDATE profiles AS a SET
  ${["best", "best_at", "best_elapsed"].map((c) => better(c, "best", "best_at")).join(", ")},
  ${["pc_best", "pc_best_at", "pc_best_elapsed"].map((c) => better(c, "pc_best", "pc_best_at")).join(", ")},
  run_count = a.run_count + b.run_count, created_at = MIN(a.created_at, b.created_at), steps = NULL, progress = ?3,
  last_at = CASE WHEN a.last_at IS NULL OR b.last_at > a.last_at THEN b.last_at ELSE a.last_at END
  FROM profiles AS b WHERE a.id = ?1 AND b.id = ?2`;
const MERGE_ENTRIES = `INSERT INTO entries (event_id, player_id, best, best_at, best_elapsed, run_count, removed)
  SELECT event_id, ?1, best, best_at, best_elapsed, run_count, removed FROM entries WHERE player_id = ?2
  ON CONFLICT (event_id, player_id) DO UPDATE SET
  ${["best", "best_at", "best_elapsed"].map((c) => `${c} = CASE WHEN ${wins("excluded", "entries", "best", "best_at")} THEN excluded.${c} ELSE entries.${c} END`).join(", ")},
  run_count = entries.run_count + excluded.run_count, removed = MAX(entries.removed, excluded.removed)`;

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

export async function mergeInto(env: Env, into: string, from: string) {
  const { results } = await env.DB.prepare("SELECT id, progress, google_hash FROM profiles WHERE id IN (?1, ?2)").bind(into, from).all<{ id: string; progress: string | null; google_hash: string | null }>();
  const read = (id: string) => cleanProgress(JSON.parse(results.find((r) => r.id === id)?.progress ?? "{}"))!;
  await env.DB.batch([
    env.DB.prepare(MERGE_PROFILE).bind(into, from, JSON.stringify(mergeProgress(read(into), read(from)))),
    env.DB.prepare(MERGE_ENTRIES).bind(into, from),
    env.DB.prepare("DELETE FROM entries WHERE player_id = ?").bind(from),
    env.DB.prepare("UPDATE runs SET player_id = ?1 WHERE player_id = ?2").bind(into, from),
    env.DB.prepare("UPDATE sessions SET player_id = ?1 WHERE player_id = ?2").bind(into, from),
    env.DB.prepare("DELETE FROM links WHERE player_id = ?").bind(from),
    env.DB.prepare("DELETE FROM profiles WHERE id = ?").bind(from),
    env.DB.prepare("UPDATE profiles SET google_hash = COALESCE(google_hash, ?1) WHERE id = ?2").bind(results.find((r) => r.id === from)?.google_hash ?? null, into),
  ]);
  forgetCaches();
}

type LinkRow = { id: string; expires_at: number; pseudo: string; banned: number };

const findLink = (env: Env, hash: string, now: number) =>
  env.DB.prepare("SELECT l.player_id AS id, l.expires_at, p.pseudo, p.banned FROM links l JOIN profiles p ON p.id = l.player_id WHERE l.code_hash = ? AND l.expires_at > ?")
    .bind(hash, now)
    .first<LinkRow>();

export async function addSession(env: Env, playerId: string, clientId: string | null, clientHash: string | null, now: number) {
  const token = randomToken();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE player_id = ?1 AND client_hash IN (?2, ?3) AND created_at < ?4").bind(playerId, clientHash, clientId, now),
    env.DB.prepare("INSERT INTO sessions (token_hash, player_id, client_hash, created_at) VALUES (?, ?, ?, ?)").bind(await sha256(token), playerId, clientHash, now),
  ]);
  return token;
}

async function openSession(env: Env, link: LinkRow, clientId: string | null, clientHash: string | null, now: number) {
  return json({ token: await addSession(env, link.id, clientId, clientHash, now), pseudo: link.pseudo });
}

const tooManyRuns = async (env: Env, id: string) =>
  (await env.DB.prepare("SELECT COUNT(*) AS n FROM (SELECT 1 FROM runs WHERE player_id = ? LIMIT ?)").bind(id, MERGE_RUNS_MAX + 1).first<{ n: number }>())!.n > MERGE_RUNS_MAX;

export async function useLink({ req, env, exec }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const body = await readJson(req);
  const code = cleanLinkCode(body.code);
  if (!code) return fail(400, "Le code fait " + LINK_LENGTH + " caractères.");
  const clientId = cleanClientId(body.clientId);
  const [hash, clientHash] = await Promise.all([sha256(code), clientId ? sha256(clientId) : null]);
  const retryHash = clientHash ? await sha256(code + ":" + clientHash) : null, now = Date.now();
  const [link, me] = await Promise.all([findLink(env, hash, now), findProfile(req, env)]);
  if (!link) {
    const again = !me && retryHash ? await findLink(env, retryHash, now) : null;
    if (again) return openSession(env, again, clientId, clientHash, now);
    return (await allowed(env.JOIN_IP_LIMIT, "link:" + clientIp(req))) ? fail(404, UNKNOWN) : tooFast();
  }
  if (me && me.id === link.id) return fail(409, "Cet appareil est déjà sur ce compte.");
  if (me && (me.banned || link.banned)) return fail(403, "Impossible de réunir un compte retiré du classement.");
  if (me && body.merge !== true) return json({ error: "Cet appareil a déjà un compte.", merge: { from: me.pseudo, into: link.pseudo } }, 409);
  if (me && (await tooManyRuns(env, me.id))) return fail(403, "Trop de parties pour réunir ces comptes ici : demande à un admin.");
  const retry = !me && !!retryHash;
  const claim = retry
    ? env.DB.prepare("UPDATE links SET code_hash = ?1, expires_at = ?2 WHERE code_hash = ?3").bind(retryHash, now + RETRY_MS, hash)
    : env.DB.prepare("DELETE FROM links WHERE code_hash = ?").bind(hash);
  if (!(await claim.run()).meta.changes) return fail(404, UNKNOWN);
  try {
    if (me) {
      await mergeInto(env, link.id, me.id);
      tell(env, exec);
      return json({ pseudo: link.pseudo, merged: true });
    }
    return await openSession(env, link, clientId, clientHash, now);
  } catch (e) {
    const undo = retry
      ? env.DB.prepare("UPDATE links SET code_hash = ?1, expires_at = ?2 WHERE code_hash = ?3").bind(hash, link.expires_at, retryHash)
      : env.DB.prepare("INSERT OR IGNORE INTO links (code_hash, player_id, expires_at) VALUES (?, ?, ?)").bind(hash, link.id, link.expires_at);
    await undo.run().catch(() => null);
    throw e;
  }
}

export async function logoutOthers({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (!(await allowed(env.RENAME_LIMIT, "out:" + me.id))) return tooFast();
  const mine = await sha256(bearer(req));
  const [, out] = await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO signed_out (token_hash, signed_at) SELECT token_hash, ?1 FROM sessions WHERE player_id = ?2 AND token_hash <> ?3").bind(Date.now(), me.id, mine),
    env.DB.prepare("DELETE FROM sessions WHERE player_id = ?1 AND token_hash <> ?2").bind(me.id, mine),
    env.DB.prepare("DELETE FROM links WHERE player_id = ?").bind(me.id),
    env.DB.prepare("UPDATE profiles SET google_hash = NULL WHERE id = ?").bind(me.id),
    env.DB.prepare("DELETE FROM google_states WHERE player_id = ?").bind(me.id),
  ]);
  return json({ removed: out.meta.changes });
}
