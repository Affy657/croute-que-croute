import { json, fail, readJson, bearer, clientIp, tooFast, allowed } from "../http";
import { randomToken, sha256, safeEqual } from "../security";
import { cleanName, cleanRole } from "../validate";
import { pendingEvent, lastEvent, forgetCaches, type EventRow } from "../db";
import type { Ctx } from "../router";

const INVITE_MS = 48 * 3600 * 1000;
const SEEN_MS = 5 * 60 * 1000;
const SUSPECT_MS = 15000, SUSPECT_RATIO = 1.15, SUSPECT_HIGH = 9000;

export interface AdminAuth {
  id: string | null;
  name: string;
  role: string;
}

interface AdminRow {
  id: string;
  name: string;
  role: string;
  last_seen: number;
  revoked: number;
}

interface PlayerAdminRow {
  id: string;
  pseudo: string;
  best: number;
  banned: number;
  run_count: number;
  best_elapsed: number | null;
}

const keyMatches = async (env: Env, key: unknown) =>
  !!env.ADMIN_KEY && typeof key === "string" && key.length > 0 && (await safeEqual(key, env.ADMIN_KEY));

async function createSession(env: Env, name: string, role: string) {
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare("INSERT INTO admins (id, name, role, token_hash, created_at, last_seen) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), name, role, await sha256(token), now, now)
    .run();
  return json({ token, admin: { name, role } }, 201);
}

export async function adminAuth(req: Request, env: Env): Promise<AdminAuth | null> {
  if (await keyMatches(env, req.headers.get("x-admin-key"))) return { id: null, name: "Clé admin", role: "owner" };
  const token = bearer(req);
  if (!token) return null;
  const row = await env.DB.prepare("SELECT id, name, role, last_seen, revoked FROM admins WHERE token_hash = ?")
    .bind(await sha256(token))
    .first<AdminRow>();
  if (!row || row.revoked) return null;
  const now = Date.now();
  if (now - row.last_seen > SEEN_MS) {
    await env.DB.prepare("UPDATE admins SET last_seen = ? WHERE id = ?").bind(now, row.id).run();
  }
  return { id: row.id, name: row.name, role: row.role };
}

export async function login({ req, env }: Ctx) {
  if (!(await allowed(env.ADMIN_LIMIT, "admin:" + clientIp(req)))) return tooFast();
  const body = await readJson(req);
  if (!(await keyMatches(env, body.key))) return fail(401, "Clé admin incorrecte.");
  const name = cleanName(body.name);
  if (!name) return fail(400, "Prénom de 1 à 30 caractères.");
  return createSession(env, name, "owner");
}

export async function accept({ req, env }: Ctx) {
  if (!(await allowed(env.ADMIN_LIMIT, "admin:" + clientIp(req)))) return tooFast();
  const invite = (await readJson(req)).invite;
  if (typeof invite !== "string" || !invite) return fail(400, "Invitation invalide.");
  const hash = await sha256(invite);
  const row = await env.DB.prepare("SELECT name, role, expires_at, used_at FROM admin_invites WHERE token_hash = ?")
    .bind(hash)
    .first<{ name: string; role: string; expires_at: number; used_at: number | null }>();
  if (!row) return fail(404, "Invitation inconnue.");
  if (row.used_at) return fail(410, "Invitation déjà utilisée.");
  if (Date.now() > row.expires_at) return fail(410, "Invitation expirée, demande un nouveau lien.");
  const res = await env.DB.prepare("UPDATE admin_invites SET used_at = ? WHERE token_hash = ? AND used_at IS NULL")
    .bind(Date.now(), hash)
    .run();
  if (!res.meta.changes) return fail(410, "Invitation déjà utilisée.");
  return createSession(env, row.name, row.role);
}

export const me = async ({ auth }: Ctx) => json({ admin: { name: auth!.name, role: auth!.role } });

export async function logout({ env, auth }: Ctx) {
  if (auth!.id) await env.DB.prepare("UPDATE admins SET revoked = 1 WHERE id = ?").bind(auth!.id).run();
  return json({ ok: true });
}

function suspect(p: PlayerAdminRow) {
  if (!p.best) return null;
  if (p.best >= SUSPECT_HIGH) return "high";
  if (p.best_elapsed !== null && p.best_elapsed > p.best * 10 * SUSPECT_RATIO + SUSPECT_MS) return "slow";
  return null;
}

const statusOf = (e: EventRow, now: number) => (now < e.opens_at ? "upcoming" : now < e.closes_at ? "open" : "closed");

const eventJson = (e: EventRow, now: number) => ({ name: e.name, opensAt: e.opens_at, closesAt: e.closes_at, status: statusOf(e, now) });

const time = (raw: unknown) => (typeof raw === "number" && Number.isFinite(raw) ? Math.round(raw) : null);

export async function players({ req, env }: Ctx) {
  const now = Date.now();
  const general = new URL(req.url).searchParams.get("scope") === "general";
  const event = (await pendingEvent(env, now)) ?? (await lastEvent(env));
  let rows: PlayerAdminRow[] = [];
  if (general) {
    rows = (await env.DB.prepare(
      `SELECT id, pseudo, best, banned, run_count, best_elapsed FROM profiles
       WHERE best > 0 OR banned = 1
       ORDER BY banned ASC, best DESC, best_at ASC LIMIT 300`,
    ).all<PlayerAdminRow>()).results;
  } else if (event) {
    rows = (await env.DB.prepare(
      `SELECT p.id, p.pseudo, e.best, p.banned, e.run_count, e.best_elapsed FROM entries e JOIN profiles p ON p.id = e.player_id
       WHERE e.event_id = ?
       ORDER BY p.banned ASC, e.best DESC, e.best_at ASC`,
    )
      .bind(event.id)
      .all<PlayerAdminRow>()).results;
  }
  return json({
    scope: general ? "general" : "event",
    event: event ? eventJson(event, now) : null,
    players: rows.map((p) => ({ id: p.id, pseudo: p.pseudo, best: p.best, banned: p.banned, runs: p.run_count, suspect: suspect(p) })),
    stats: { players: rows.length, runs: rows.reduce((n, p) => n + p.run_count, 0) },
  });
}

const NAME_ERROR = "Nom de soirée de 1 à 60 caractères.";

function eventName(value: unknown) {
  const name = typeof value === "string" ? value.trim() : "";
  return name && name.length <= 60 ? name : null;
}

export async function createEvent({ req, env }: Ctx) {
  const now = Date.now();
  const body = await readJson(req);
  const name = eventName(body.name);
  const opensAt = time(body.opensAt) ?? now;
  const closesAt = time(body.closesAt);
  if (!name) return fail(400, NAME_ERROR);
  if (closesAt === null || closesAt <= now) return fail(400, "L'heure de fin doit être dans le futur.");
  if (closesAt <= opensAt) return fail(400, "La fin doit être après le début.");
  if (await pendingEvent(env, now)) {
    return fail(409, "Une soirée est déjà en cours ou prévue. Modifie-la, ou avance sa fin à maintenant.");
  }
  await env.DB.prepare("INSERT INTO events (name, opens_at, closes_at, created_at) VALUES (?, ?, ?, ?)")
    .bind(name, opensAt, closesAt, now)
    .run();
  forgetCaches();
  return json({ ok: true }, 201);
}

export async function updateEvent({ req, env }: Ctx) {
  const event = await pendingEvent(env);
  if (!event) return fail(404, "Aucune soirée en cours ou prévue.");
  const body = await readJson(req);
  const name = body.name === undefined ? event.name : eventName(body.name);
  if (!name) return fail(400, NAME_ERROR);
  const opensAt = time(body.opensAt) ?? event.opens_at;
  const closesAt = time(body.closesAt) ?? event.closes_at;
  if (closesAt <= opensAt) return fail(400, "La fin doit être après le début.");
  await env.DB.prepare("UPDATE events SET name = ?, opens_at = ?, closes_at = ? WHERE id = ?")
    .bind(name, opensAt, closesAt, event.id)
    .run();
  forgetCaches();
  return json({ ok: true });
}

export async function ban({ req, env, params }: Ctx) {
  const banned = (await readJson(req)).banned === true ? 1 : 0;
  const res = await env.DB.prepare("UPDATE profiles SET banned = ? WHERE id = ?").bind(banned, params[0]).run();
  if (!res.meta.changes) return fail(404, "Joueur inconnu.");
  forgetCaches();
  return json({ ok: true });
}

export async function invite({ req, env, auth }: Ctx) {
  const body = await readJson(req);
  const name = cleanName(body.name);
  const role = cleanRole(body.role);
  if (!name) return fail(400, "Prénom de 1 à 30 caractères.");
  if (!role) return fail(400, "Rôle inconnu.");
  const token = randomToken();
  const now = Date.now();
  await env.DB.prepare(
    "INSERT INTO admin_invites (token_hash, name, role, created_by, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(await sha256(token), name, role, auth!.id, now, now + INVITE_MS)
    .run();
  return json({ url: `${new URL(req.url).origin}/admin#invite=${token}`, expiresAt: now + INVITE_MS }, 201);
}

export async function team({ env, auth }: Ctx) {
  const { results } = await env.DB.prepare(
    "SELECT id, name, role, created_at, last_seen FROM admins WHERE revoked = 0 ORDER BY role DESC, created_at ASC",
  ).all<{ id: string; name: string; role: string; created_at: number; last_seen: number }>();
  return json({ team: results.map((a) => ({ ...a, me: a.id === auth!.id })) });
}

export async function revoke({ env, params }: Ctx) {
  const res = await env.DB.prepare(
    `UPDATE admins SET revoked = 1
     WHERE id = ?1 AND revoked = 0
       AND (role <> 'owner' OR (SELECT COUNT(*) FROM admins WHERE role = 'owner' AND revoked = 0) > 1)`,
  )
    .bind(params[0])
    .run();
  if (res.meta.changes) return json({ ok: true });
  const target = await env.DB.prepare("SELECT 1 FROM admins WHERE id = ? AND revoked = 0").bind(params[0]).first();
  return target ? fail(409, "Impossible de retirer le dernier propriétaire.") : fail(404, "Admin inconnu.");
}
