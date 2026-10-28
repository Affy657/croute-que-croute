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
if (!r.data.event || r.data.event.closesAt <= Date.now()) {
  await call("POST", "/api/admin/events", { key: KEY, body: { name: "Soirée de test", closesAt: Date.now() + 2 * 3600 * 1000 } });
}

r = await call("POST", "/api/admin/events", { key: KEY, body: { name: "Écrasement", closesAt: Date.now() + 3600 * 1000 } });
check("nouvelle soirée refusée tant que la soirée en cours est ouverte", r.status === 409, r);

const pseudo = "Test-" + hex(4);
const device = hex(32);

r = await call("POST", "/api/join", { body: { pseudo: "Аdrien", clientId: hex(32) } });
check("pseudo sosie avec une lettre cyrillique refusé", r.status === 400, r);

r = await call("POST", "/api/join", { body: { pseudo, clientId: device }, version: "vieille" });
check("ancienne version refusée (426)", r.status === 426, r);

r = await call("POST", "/api/join", { body: { pseudo, clientId: device } });
check("inscription", r.status === 201 && r.data.token, r);
const token = r.data.token;

r = await call("POST", "/api/join", { body: { pseudo, clientId: device } });
check("réinscription du même téléphone = même jeton", r.status === 200 && r.data.token === token, r);

r = await call("POST", "/api/join", { body: { pseudo: pseudo.toLowerCase(), clientId: hex(32) } });
check("même pseudo depuis un autre téléphone refusé", r.status === 409, r);

r = await call("POST", "/api/runs", { token });
check("début de partie", r.status === 201 && r.data.runId, r);
const tooHigh = r.data.runId;
r = await call("POST", `/api/runs/${tooHigh}`, { token, body: { score: 9000 } });
check("score plus long que la partie refusé", r.status === 422, r);

r = await call("POST", "/api/runs", { token });
const runId = r.data.runId;
await wait(1200);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 99999999 } });
check("score absurde refusé", r.status === 400, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 100 } });
check("score enregistré avec rang", r.status === 200 && r.data.best === 100 && r.data.improved && r.data.rank >= 1, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 100 } });
check("renvoi du même score = succès sans doublon", r.status === 200 && !r.data.improved && r.data.best === 100, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 120 } });
check("autre score sur la même partie refusé", r.status === 409, r);

r = await call("GET", "/api/board", { token });
check("classement : le joueur y est avec son record", r.status === 200 && r.data.me.best === 100 && r.data.me.rank >= 1 && r.data.top.some((x) => x.me), r);

r = await call("GET", "/api/admin/players", { key: KEY });
const row = r.data.players.find((p) => p.pseudo === pseudo);
check("admin : nombre de parties terminées", row && row.runs === 1 && typeof row.suspect === "boolean", row);

let limited = 0;
for (let i = 0; i < 25; i++) if ((await call("POST", "/api/runs", { token })).status === 429) limited++;
check("trop de parties d'affilée freinées (429)", limited > 0, { limited });

r = await call("POST", `/api/admin/players/${row.id}/ban`, { key: KEY, body: { banned: true } });
r = await call("GET", "/api/board", { token });
check("joueur retiré absent du classement", r.data.me.rank === null && !r.data.top.some((x) => x.me), r.data.me);

console.log(results.join("\n"));
console.log(results.filter((l) => l.startsWith("FAIL")).length + " échec(s) sur " + results.length);
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
