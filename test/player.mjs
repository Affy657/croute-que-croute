import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8787";
const KEY = readFileSync(".dev.vars", "utf8").match(/ADMIN_KEY=(\w+)/)[1];
const VERSION = process.argv[3] || "dev";
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
const results = [];

async function call(method, path, { body, token, key, version = VERSION } = {}) {
  const headers = { "content-type": "application/json" };
  if (version) headers["x-app-version"] = version;
  if (token) headers.authorization = "Bearer " + token;
  if (key) headers["x-admin-key"] = key;
  const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  return { status: res.status, data: await res.json().catch(() => null) };
}

const check = (name, ok, detail) => results.push(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : " -> " + JSON.stringify(detail)}`);

for (let i = 0; i < 60; i++) {
  try { await fetch(BASE + "/api/board"); break; } catch { await wait(500); }
}

let r = await call("GET", "/api/admin/players", { key: KEY });
if (!r.data.event || r.data.event.status !== "open") {
  await call("PATCH", "/api/admin/events/current", { key: KEY, body: { opensAt: Date.now() - 1000 } });
  await call("POST", "/api/admin/events", { key: KEY, body: { name: "Soirée de test", opensAt: Date.now() - 1000, closesAt: Date.now() + 2 * 3600 * 1000 } });
}
r = await call("GET", "/api/admin/players", { key: KEY });
check("une soirée est ouverte pour le test", r.data.event && r.data.event.status === "open", r.data.event);

r = await call("POST", "/api/admin/events", { key: KEY, body: { name: "Écrasement", closesAt: Date.now() + 3600 * 1000 } });
check("nouvelle soirée refusée tant que la soirée en cours est ouverte", r.status === 409, r);

const eventName = (await call("GET", "/api/board")).data.event.name;
r = await call("PATCH", "/api/admin/events/current", { key: KEY, body: { name: "  Soirée renommée  " } });
const renamed = (await call("GET", "/api/admin/players", { key: KEY })).data.event;
check("nom de la soirée modifiable, horaires gardés", r.status === 200 && renamed.name === "Soirée renommée" && renamed.status === "open", renamed);
r = await call("PATCH", "/api/admin/events/current", { key: KEY, body: { name: "   " } });
check("nom de soirée vide refusé", r.status === 400, r);
await call("PATCH", "/api/admin/events/current", { key: KEY, body: { name: eventName } });

const pseudo = "Test-" + hex(4);
const device = hex(32);

r = await call("POST", "/api/join", { body: { pseudo: "Аdrien", clientId: hex(32) } });
check("pseudo sosie avec une lettre cyrillique refusé", r.status === 400, r);

r = await call("POST", "/api/join", { body: { pseudo, clientId: device }, version: "vieille" });
check("ancienne version refusée (426)", r.status === 426, r);

r = await call("POST", "/api/join", { body: { pseudo, clientId: device } });
check("inscription", r.status === 201 && r.data.token, r);
const first = r.data.token;

r = await call("POST", "/api/join", { body: { pseudo, clientId: device } });
check("réinscription du même téléphone = même compte, nouveau jeton", r.status === 200 && r.data.token && r.data.token !== first && r.data.pseudo === pseudo, r);
const token = r.data.token;
r = await call("GET", "/api/board", { token: first });
check("ancien jeton refusé après réinscription", r.status === 200 && r.data.me === null, r.data.me);

r = await call("POST", "/api/join", { body: { pseudo: pseudo.toLowerCase(), clientId: hex(32) } });
check("même pseudo depuis un autre téléphone refusé", r.status === 409, r);

r = await call("POST", "/api/runs", { token });
check("début de partie, comptée pour la soirée", r.status === 201 && r.data.runId && r.data.event === true, r);
const tooHigh = r.data.runId;
r = await call("POST", `/api/runs/${tooHigh}`, { token, body: { score: 9000 } });
check("score plus long que la partie refusé", r.status === 422, r);

r = await call("POST", "/api/runs", { token });
const runId = r.data.runId;
await wait(1200);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 99999999 } });
check("score absurde refusé", r.status === 400, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 100 } });
check("score enregistré au général et à la soirée", r.status === 200 && r.data.best === 100 && r.data.improved && r.data.rank >= 1 && r.data.eventBest === 100 && r.data.eventImproved && r.data.eventRank >= 1, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 100 } });
check("renvoi du même score = succès sans doublon", r.status === 200 && !r.data.improved && r.data.best === 100, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 120 } });
check("autre score sur la même partie refusé", r.status === 409, r);

r = await call("GET", "/api/board", { token });
check("classements général et soirée : le joueur y est", r.status === 200 && r.data.me.best === 100 && r.data.me.eventBest === 100 && r.data.me.rank >= 1 && r.data.me.eventRank >= 1 && r.data.top.some((x) => x.me) && r.data.eventTop.some((x) => x.me), r.data.me);
{
  const { me, top } = r.data, above = top[me.rank - 2];
  check("rival : le joueur juste au-dessus", me.rank === 1 ? me.rival === null : !!above && me.rival.pseudo === above.pseudo && me.rival.best === above.best, { rank: me.rank, rival: me.rival });
}

{
  const other = "Test-" + hex(4), fresh = "Neuf-" + hex(4);
  await call("POST", "/api/join", { body: { pseudo: other, clientId: hex(32) } });
  r = await call("PATCH", "/api/me", { body: { pseudo: fresh } });
  check("changer de pseudo sans jeton refusé", r.status === 401, r);
  r = await call("PATCH", "/api/me", { token, body: { pseudo: other.toLowerCase() } });
  check("changer pour un pseudo déjà pris refusé", r.status === 409, r);
  r = await call("PATCH", "/api/me", { token, body: { pseudo: "x" } });
  check("changer pour un pseudo invalide refusé", r.status === 400, r);
  r = await call("PATCH", "/api/me", { token, body: { pseudo: fresh } });
  const after = await call("GET", "/api/board", { token });
  check("pseudo changé, record et place gardés", r.status === 200 && after.data.me.pseudo === fresh && after.data.me.best === 100 && after.data.top.some((x) => x.me && x.pseudo === fresh), after.data.me);
  r = await call("PATCH", "/api/me", { token, body: { pseudo } });
  check("retour à l'ancien pseudo, libre à nouveau", r.status === 200 && r.data.pseudo === pseudo, r);
}

r = await call("GET", "/api/admin/players", { key: KEY });
const row = r.data.players.find((p) => p.pseudo === pseudo);
check("admin : nombre de parties terminées", row && row.runs === 1 && row.suspect === null, row);

let limited = 0;
for (let i = 0; i < 25; i++) if ((await call("POST", "/api/runs", { token })).status === 429) limited++;
check("trop de parties d'affilée freinées (429)", limited > 0, { limited });

r = await call("POST", `/api/admin/players/${row.id}/ban`, { key: KEY, body: { banned: true } });
r = await call("GET", "/api/board", { token });
check("joueur retiré absent des deux classements", r.data.me.rank === null && r.data.me.eventRank === null && r.data.me.banned && !r.data.top.some((x) => x.me) && !r.data.eventTop.some((x) => x.me), r.data.me);

r = await call("GET", "/api/admin/players?scope=general", { key: KEY });
check("admin : classement général disponible", r.status === 200 && r.data.scope === "general" && r.data.players.some((p) => p.pseudo === pseudo), r.data.scope);

const pcPseudo = "PC" + hex(6);
r = await call("POST", "/api/join", { body: { pseudo: pcPseudo, clientId: hex(32) } });
const pcToken = r.data.token;
r = await call("POST", "/api/runs", { token: pcToken });
const pcRun = r.data.runId;
await wait(1500);
r = await call("POST", `/api/runs/${pcRun}`, { token: pcToken, body: { score: 100, device: "pc" } });
check("partie sur PC : record PC, hors soirée", r.status === 200 && r.data.pcBest === 100 && r.data.pcImproved && r.data.best === 0 && r.data.eventBest === null, r.data);
r = await call("GET", "/api/board", { token: pcToken });
check("partie sur PC : seulement au classement PC", r.data.pcTop.some((x) => x.me) && !r.data.top.some((x) => x.me) && !r.data.eventTop.some((x) => x.me) && r.data.me.pcRank > 0, r.data.me);
r = await call("POST", "/api/runs", { token: pcToken });
const phoneRun = r.data.runId;
await wait(1000);
r = await call("POST", `/api/runs/${phoneRun}`, { token: pcToken, body: { score: 50, device: "mobile" } });
check("partie sur téléphone : mobile et soirée, record PC gardé", r.data.best === 50 && r.data.eventBest === 50 && r.data.pcBest === 100, r.data);
r = await call("GET", "/api/admin/players?scope=pc", { key: KEY });
check("admin : classement PC disponible", r.status === 200 && r.data.scope === "pc" && r.data.players.some((p) => p.pseudo === pcPseudo && p.best === 100), r.data.scope);

console.log(results.join("\n"));
console.log(results.filter((l) => l.startsWith("FAIL")).length + " échec(s) sur " + results.length);
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
