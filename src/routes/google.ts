import { json, fail, readJson, clientIp, outdated, updateRequired, tooFast, allowed, cookie, withKey } from "../http";
import { randomToken, sha256 } from "../security";
import { cleanClientId } from "../validate";
import { findProfile } from "../db";
import { addSession } from "./link";
import type { Ctx } from "../router";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];
const STATE_MS = 10 * 60 * 1000;
const STATE_COOKIE = "cv_google";

interface StateRow {
  player_id: string | null;
  client_hash: string | null;
}

interface Claims {
  sub?: string;
  aud?: string;
  iss?: string;
  exp?: number;
}

const ready = (env: Env) => !!env.GOOGLE_CLIENT_ID && !!env.GOOGLE_CLIENT_SECRET;
const returnUrl = (req: Request) => new URL(req.url).origin + "/api/google/retour";

const stateCookie = (value: string, seconds: number) => `${STATE_COOKIE}=${value}; Max-Age=${seconds}; Path=/api/google; Secure; HttpOnly; SameSite=Lax`;

function home(result: string, token?: string) {
  const res = new Response(null, { status: 302, headers: { location: "/#google=" + result, "cache-control": "no-store" } });
  res.headers.append("set-cookie", stateCookie("", 0));
  return token ? withKey(res, token) : res;
}

export async function start({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  if (!ready(env)) return fail(404, "Connexion Google indisponible.");
  if (!(await allowed(env.JOIN_LIMIT, "google:" + clientIp(req)))) return tooFast();
  const body = await readJson(req);
  const linking = body.link === true;
  const me = linking ? await findProfile(req, env) : null;
  if (linking && !me) return fail(401, "Joueur inconnu.");
  const clientId = cleanClientId(body.clientId);
  const state = randomToken(), now = Date.now();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM google_states WHERE expires_at <= ?").bind(now),
    env.DB.prepare("INSERT INTO google_states (state_hash, player_id, client_hash, expires_at) VALUES (?, ?, ?, ?)")
      .bind(await sha256(state), me?.id ?? null, clientId ? await sha256(clientId) : null, now + STATE_MS),
  ]);
  const query = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!,
    redirect_uri: returnUrl(req),
    response_type: "code",
    scope: "openid email",
    prompt: "select_account",
    state,
  });
  const res = json({ url: `${AUTH_URL}?${query}` });
  res.headers.append("set-cookie", stateCookie(state, STATE_MS / 1000));
  return res;
}

function readClaims(idToken: unknown): Claims | null {
  if (typeof idToken !== "string") return null;
  try {
    return JSON.parse(atob(idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

async function googleId(req: Request, env: Env, code: string) {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: returnUrl(req),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) return null;
  const claims = readClaims(((await res.json()) as { id_token?: unknown }).id_token);
  if (!claims || !claims.sub || claims.aud !== env.GOOGLE_CLIENT_ID || !ISSUERS.includes(claims.iss ?? "")) return null;
  return (claims.exp ?? 0) * 1000 > Date.now() ? claims.sub : null;
}

async function linkAccount(env: Env, playerId: string, hash: string) {
  try {
    const { meta } = await env.DB.prepare("UPDATE profiles SET google_hash = ? WHERE id = ?").bind(hash, playerId).run();
    return home(meta.changes ? "lie" : "erreur");
  } catch (e) {
    if (String(e).includes("UNIQUE")) return home("pris");
    throw e;
  }
}

export async function back({ req, env }: Ctx) {
  if (!ready(env)) return home("erreur");
  const params = new URL(req.url).searchParams;
  const state = params.get("state") ?? "", code = params.get("code") ?? "";
  if (!state || state !== cookie(req, STATE_COOKIE)) return home("erreur");
  const row = await env.DB.prepare("DELETE FROM google_states WHERE state_hash = ?1 AND expires_at > ?2 RETURNING player_id, client_hash")
    .bind(await sha256(state), Date.now())
    .first<StateRow>();
  if (!row) return home("erreur");
  if (!code) return home("annule");
  const id = await googleId(req, env, code);
  if (!id) return home("erreur");
  const hash = await sha256("google:" + id);
  if (row.player_id) return linkAccount(env, row.player_id, hash);
  const player = await env.DB.prepare("SELECT id FROM profiles WHERE google_hash = ?").bind(hash).first<{ id: string }>();
  if (!player) return home("inconnu");
  return home("ok", await addSession(env, player.id, row.client_hash, row.client_hash, Date.now()));
}

export async function unlink({ req, env }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  await env.DB.prepare("UPDATE profiles SET google_hash = NULL WHERE id = ?").bind(me.id).run();
  return json({ ok: true });
}
