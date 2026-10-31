import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8787";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error("Les tests d'API ne tournent qu'en local.");
  process.exit(1);
}
const KEY = readFileSync(".dev.vars", "utf8").match(/ADMIN_KEY=(\w+)/)[1];
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const results = [];

async function call(method, path, { body, token, key } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  if (key) headers["x-admin-key"] = key;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const check = (name, ok, detail) => results.push(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : " -> " + JSON.stringify(detail)}`);

for (let i = 0; i < 60; i++) {
  try { await fetch(BASE + "/api/board"); break; } catch { await wait(500); }
}

let r = await call("POST", "/api/admin/login", { body: { name: "Adrien", key: "mauvaise" } });
check("connexion avec une mauvaise clé = 401", r.status === 401, r);

r = await call("POST", "/api/admin/login", { body: { name: "Adrien", key: KEY } });
check("connexion propriétaire avec la clé", r.status === 201 && r.data.token && r.data.admin.role === "owner", r);
const owner = r.data.token;

r = await call("GET", "/api/admin/me", { token: owner });
check("propriétaire reconnu", r.status === 200 && r.data.admin.name === "Adrien", r);

r = await call("POST", "/api/admin/invites", { body: { name: "Esteban", role: "admin" }, token: owner });
check("lien d'invitation créé", r.status === 201 && r.data.url.includes("/admin#invite="), r);
const invite = new URL(r.data.url).hash.split("=")[1];

r = await call("POST", "/api/admin/accept", { body: { invite } });
check("invitation acceptée", r.status === 201 && r.data.admin.role === "admin" && r.data.admin.name === "Esteban", r);
const admin = r.data.token;

r = await call("POST", "/api/admin/accept", { body: { invite } });
check("invitation réutilisée = refusée", r.status === 410, r);

r = await call("POST", "/api/admin/accept", { body: { invite: "inventee" } });
check("invitation inventée = refusée", r.status === 404, r);

r = await call("GET", "/api/admin/players", { token: admin });
check("admin voit le classement et les stats", r.status === 200 && r.data.stats && "runs" in r.data.stats, r);

r = await call("GET", "/api/admin/team", { token: admin });
check("admin ne voit pas l'équipe", r.status === 403, r);

r = await call("POST", "/api/admin/invites", { body: { name: "Intrus", role: "owner" }, token: admin });
check("admin ne peut pas inviter", r.status === 403, r);

r = await call("GET", "/api/admin/team", { token: owner });
check("propriétaire voit l'équipe (2 personnes, lui marqué)", r.status === 200 && r.data.team.length >= 2 && r.data.team.some((a) => a.me && a.name === "Adrien"), r);
const esteban = r.data.team.filter((a) => a.name === "Esteban" && a.role === "admin").pop();
const adrien = r.data.team.find((a) => a.me);
for (const other of r.data.team.filter((a) => a.role === "owner" && !a.me)) {
  await call("POST", `/api/admin/team/${other.id}/revoke`, { token: owner });
}

r = await call("POST", `/api/admin/team/${adrien.id}/revoke`, { token: owner });
check("impossible de retirer le dernier propriétaire", r.status === 409, r);

r = await call("POST", `/api/admin/team/${esteban.id}/revoke`, { token: owner });
check("propriétaire retire Esteban", r.status === 200, r);

r = await call("GET", "/api/admin/me", { token: admin });
check("le téléphone d'Esteban est déconnecté", r.status === 401, r);

r = await call("GET", "/api/admin/players", { key: KEY });
check("la clé admin marche toujours pour les scripts", r.status === 200, r);

r = await call("GET", "/api/admin/players", { token: "jeton-de-joueur-ou-invente" });
check("jeton inconnu = 401", r.status === 401, r);

r = await call("POST", "/api/admin/logout", { token: owner });
r = await call("GET", "/api/admin/me", { token: owner });
check("déconnexion du propriétaire", r.status === 401, r);

console.log(results.join("\n"));
console.log(results.filter((l) => l.startsWith("FAIL")).length + " échec(s) sur " + results.length);
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
