import { json, fail, readJson, clientIp, outdated, updateRequired, tooFast, allowed, keyCookie, withKey } from "../http";
import { randomToken, sha256 } from "../security";
import { cleanPseudo, pseudoKey, cleanClientId } from "../validate";
import { findProfile, renameCached } from "../db";
import type { Ctx } from "../router";
import { tell } from "../live";

const BAD_PSEUDO = "Pseudo de 2 à 16 caractères : lettres, chiffres, espaces, tirets.";

export async function resume({ req, env }: Ctx) {
  const token = keyCookie(req);
  if (!/^[a-f0-9]{48}$/.test(token)) return json({ token: null });
  if (!(await allowed(env.JOIN_IP_LIMIT, "resume:" + clientIp(req)))) return tooFast();
  const known = await env.DB.prepare("SELECT 1 FROM sessions WHERE token_hash = ?").bind(await sha256(token)).first();
  return known ? json({ token }) : withKey(json({ token: null }), null);
}

export async function join({ req, env, exec }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const body = await readJson(req);
  const pseudo = cleanPseudo(body.pseudo);
  if (!pseudo) return fail(400, BAD_PSEUDO);
  const clientId = cleanClientId(body.clientId);
  const ip = clientIp(req);
  if (!(await allowed(env.JOIN_LIMIT, "join:" + (clientId ?? ip))) || !(await allowed(env.JOIN_IP_LIMIT, "join:" + ip))) return tooFast();
  const key = pseudoKey(pseudo);
  const taken = await env.DB.prepare("SELECT id, pseudo FROM profiles WHERE pseudo_key = ?").bind(key).first<{ id: string; pseudo: string }>();
  const token = randomToken();
  const [tokenHash, clientHash] = await Promise.all([sha256(token), clientId ? sha256(clientId) : null]);
  const session = (id: string) =>
    env.DB.prepare("INSERT INTO sessions (token_hash, player_id, client_hash, created_at) VALUES (?, ?, ?, ?)").bind(tokenHash, id, clientHash, Date.now());
  if (taken) {
    const device = (sql: string) => env.DB.prepare(sql).bind(taken.id, clientHash, clientId);
    if (clientId && (await device("SELECT 1 FROM sessions WHERE player_id = ?1 AND client_hash IN (?2, ?3)").first())) {
      await env.DB.batch([device("DELETE FROM sessions WHERE player_id = ?1 AND client_hash IN (?2, ?3)"), session(taken.id)]);
      return json({ token, pseudo: taken.pseudo });
    }
    return fail(409, "Ce pseudo est déjà pris.");
  }
  const id = crypto.randomUUID();
  try {
    await env.DB.batch([
      env.DB.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES (?, ?, ?, ?, ?)").bind(id, pseudo, key, tokenHash, Date.now()),
      session(id),
    ]);
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(409, "Ce pseudo est déjà pris.");
    throw e;
  }
  tell(env, exec);
  return json({ token, pseudo }, 201);
}

export async function rename({ req, env, exec }: Ctx) {
  if (outdated(req, env)) return updateRequired();
  const me = await findProfile(req, env);
  if (!me) return fail(401, "Joueur inconnu.");
  if (!(await allowed(env.RENAME_LIMIT, me.id))) return tooFast();
  const pseudo = cleanPseudo((await readJson(req)).pseudo);
  if (!pseudo) return fail(400, BAD_PSEUDO);
  try {
    await env.DB.prepare("UPDATE profiles SET pseudo = ?, pseudo_key = ? WHERE id = ?").bind(pseudo, pseudoKey(pseudo), me.id).run();
  } catch (e) {
    if (String(e).includes("UNIQUE")) return fail(409, "Ce pseudo est déjà pris.");
    throw e;
  }
  renameCached(me.id, pseudo);
  tell(env, exec);
  return json({ pseudo });
}
