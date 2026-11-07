import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error("Les tests d'API ne tournent qu'en local, sur une base à part : npm run test:api.");
  process.exit(1);
}
const KEY = readFileSync(".dev.vars", "utf8").match(/ADMIN_KEY=(\w+)/)[1];
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const results = [];

async function call(method, path, { body, token, key, ip } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  if (key) headers["x-admin-key"] = key;
  if (ip) headers["cf-connecting-ip"] = ip;
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

const party = (body, token) => call("POST", "/api/admin/players/joueur-inconnu/soiree", { body, token });
r = await party({ event: 999999, removed: true }, admin);
check("retirer de la soirée : soirée ou joueur inconnus = 404", r.status === 404, r);
r = await party({ event: "1", removed: true }, admin);
check("retirer de la soirée : soirée manquante = 400", r.status === 400, r);
r = await party({ event: 1, removed: true }, "jeton-de-joueur-ou-invente");
check("retirer de la soirée sans être admin = 401", r.status === 401, r);

r = await call("GET", "/api/admin/team", { token: admin });
check("admin ne voit pas l'équipe", r.status === 403, r);

r = await call("POST", "/api/admin/invites", { body: { name: "Intrus", role: "owner" }, token: admin });
check("admin ne peut pas inviter", r.status === 403, r);

r = await call("POST", "/api/admin/merge", { body: { keep: "Aaaa", from: "Bbbb", confirm: true }, token: admin });
check("admin ne peut pas réunir deux comptes (propriétaire seulement)", r.status === 403, r);

const oops = { kind: "erreur", message: "TypeError: test admin 12", source: "/js/app/main.js:12:3", stack: "frame@/js/app/main.js:12:3", trail: ["   1.00  clic #play"], device: "390x844 x3", count: 2 };
let reporters = 0;
const report = (session, errors) => call("POST", "/api/errors", { ip: "10.66.0." + ++reporters, body: { version: "dev", page: "/", platform: "iPhone", standalone: true, ua: "test", session, errors } });
await report("a1a1a1a1a1a1a1a1", [oops]);
await report("b2b2b2b2b2b2b2b2", [{ ...oops, message: "TypeError: test admin 99", source: "/js/app/main.js:40:1", count: 1 }]);
await report("b2b2b2b2b2b2b2b2", [{ kind: oops.kind, message: oops.message, source: oops.source, count: 5 }]);
r = await call("GET", "/api/admin/errors", { token: admin });
check("admin ne voit pas les erreurs des joueurs", r.status === 403, r);
r = await call("GET", "/api/admin/errors", { token: owner });
const oopsGroup = r.status === 200 ? r.data.groups.find((g) => g.message.startsWith("TypeError: test admin")) : null;
check("erreurs regroupées au chiffre près dans le même fichier", !!oopsGroup && oopsGroup.count === 8 && oopsGroup.sessions === 2 && oopsGroup.platforms.iPhone === 2, r.data);
check("détail de l'erreur avec ce qui s'est passé avant", !!oopsGroup && oopsGroup.last.trail.includes("clic #play") && oopsGroup.last.stack.startsWith("frame@"), oopsGroup);
r = await call("GET", "/api/admin/errors/recent", { token: owner });
check("erreurs de la dernière heure comptées", r.status === 200 && r.data.hour >= 1 && r.data.day >= r.data.hour, r);
r = await call("DELETE", `/api/admin/errors/${oopsGroup && oopsGroup.id}`, { token: owner });
check("erreur marquée corrigée", r.status === 200, r);
r = await call("GET", "/api/admin/errors", { token: owner });
check("erreur corrigée retirée de la liste", r.status === 200 && !r.data.groups.some((g) => g.id === (oopsGroup && oopsGroup.id)), r.data);
r = await call("DELETE", `/api/admin/errors/${oopsGroup && oopsGroup.id}`, { token: owner });
check("erreur déjà corrigée = 404", r.status === 404, r);
let limited = false;
for (let i = 0; i < 12 && !limited; i++) limited = (await report("c3c3c3c3c3c3c3c3", [{ ...oops, count: 1 }])).status === 429;
check("envois d'erreurs limités par minute pour tout le monde", limited);

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

r = await call("POST", "/api/admin/invites", { body: { name: "Lou", role: "owner" }, token: owner });
const lou = (await call("POST", "/api/admin/accept", { body: { invite: new URL(r.data.url).hash.split("=")[1] } })).data.token;
r = await call("POST", "/api/admin/invites", { body: { name: "Zoé", role: "admin" }, token: lou });
const fromLou = new URL(r.data.url).hash.split("=")[1];
const louId = (await call("GET", "/api/admin/team", { token: owner })).data.team.filter((a) => a.name === "Lou").pop().id;
await call("POST", `/api/admin/team/${louId}/revoke`, { token: owner });
r = await call("POST", "/api/admin/accept", { body: { invite: fromLou } });
check("propriétaire retiré : son invitation pas encore utilisée a expiré (410)", r.status === 410, r);

r = await call("GET", "/api/admin/players", { key: KEY });
check("la clé admin marche toujours pour les scripts", r.status === 200, r);

r = await call("GET", "/api/admin/players", { token: "jeton-de-joueur-ou-invente" });
check("jeton inconnu = 401", r.status === 401, r);

r = await call("POST", "/api/admin/logout", { token: owner });
r = await call("GET", "/api/admin/me", { token: owner });
check("déconnexion du propriétaire", r.status === 401, r);

r = await call("GET", "/api/admin/me", { key: "mauvaise-cle" });
check("mauvaise clé admin = 401", r.status === 401, r);
let slowed = false;
for (let i = 0; i < 40 && !slowed; i++) slowed = (await call("GET", "/api/admin/me", { key: "mauvaise-cle" })).status === 429;
check("essais de clé admin en rafale freinés (429)", slowed);
r = await call("GET", "/api/admin/players", { key: KEY });
check("la bonne clé passe toujours, même freinée", r.status === 200, r);

console.log(results.join("\n"));
console.log(results.filter((l) => l.startsWith("FAIL")).length + " échec(s) sur " + results.length);
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
