import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "http://127.0.0.1:8787";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error("Les tests d'API ne tournent qu'en local.");
  process.exit(1);
}
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
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 100, combo: 7 } });
check("score enregistré au général et à la soirée", r.status === 200 && r.data.best === 100 && r.data.improved && r.data.rank >= 1 && r.data.eventBest === 100 && r.data.eventImproved && r.data.eventRank >= 1, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 100, combo: 7 } });
check("renvoi du même score = même réponse, sans doublon", r.status === 200 && r.data.improved && r.data.eventImproved && r.data.best === 100, r);
r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 120 } });
check("autre score sur la même partie refusé", r.status === 409, r);

r = await call("GET", "/api/board", { token });
check("classements général et soirée : le joueur y est", r.status === 200 && r.data.me.best === 100 && r.data.me.eventBest === 100 && r.data.me.rank >= 1 && r.data.me.eventRank >= 1 && r.data.top.some((x) => x.me) && r.data.eventTop.some((x) => x.me), r.data.me);
{
  const { me, top } = r.data, above = top[me.rank - 2];
  check("rival : le joueur juste au-dessus", me.rank === 1 ? me.rival === null : !!above && me.rival.pseudo === above.pseudo && me.rival.best === above.best, { rank: me.rank, rival: me.rival });
  const card = await call("GET", `/api/players/${me.id}`);
  check("fiche : record, progression et meilleur frôlé", card.status === 200 && card.data.best === 100 && card.data.combo === 7 && card.data.records.some((x) => !x.pc && x.score === 100), card.data);
  const none = await call("GET", "/api/players/inconnu-" + hex(8));
  check("fiche d'un joueur inconnu = 404", none.status === 404, none);
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

{
  const look = { spread: "butter", ach: 1, own: {} };
  await call("PUT", "/api/me/look", { token, body: { look, progress: { got: { t10: 2000, "mauvais-id": 5 }, attacks: ["rain"], toppings: ["jam"] } } });
  r = await call("PUT", "/api/me/look", { token, body: { look, progress: { got: { t10: 1000, t30: 3000 }, attacks: ["wall", 5, "rain"], toppings: [] } } });
  const p = r.data && r.data.progress;
  check("progression gardée sur le serveur et réunie", r.status === 200 && p && p.got.t10 === 1000 && p.got.t30 === 3000 && !("mauvais-id" in p.got) && p.attacks.join() === "rain,wall" && p.toppings.join() === "jam", r.data);
  r = await call("PUT", "/api/me/look", { token, body: { look } });
  check("tenue seule toujours acceptée", r.status === 200 && r.data.ok && r.data.progress === undefined, r.data);
}

{
  r = await call("POST", "/api/me/link", {});
  check("code de liaison sans compte refusé", r.status === 401, r);
  r = await call("POST", "/api/me/link", { token });
  const code = r.data && r.data.code;
  check("code de liaison : 8 caractères, QR et expiration", r.status === 201 && /^[2-9A-HJKMNP-Z]{8}$/.test(code) && r.data.qr.bits.length === r.data.qr.size ** 2 && r.data.expiresAt > Date.now(), r.data);
  r = await call("POST", "/api/link", { body: { code: code.slice(0, 4).toLowerCase() + " " + code.slice(4), clientId: hex(32) } });
  const second = r.data && r.data.token;
  check("autre appareil connecté avec le code (minuscules et espace acceptés)", r.status === 200 && !!second && r.data.pseudo === pseudo, r.data);
  const [a, b] = await Promise.all([call("GET", "/api/board", { token }), call("GET", "/api/board", { token: second })]);
  check("les deux appareils restent connectés au même compte", !!a.data.me && !!b.data.me && a.data.me.id === b.data.me.id, [a.data.me, b.data.me]);
  r = await call("POST", "/api/link", { body: { code, clientId: hex(32) } });
  check("code déjà utilisé refusé", r.status === 404, r);
  r = await call("POST", "/api/link", { body: { code: "ABCDEFGH", clientId: hex(32) } });
  check("code inconnu refusé", r.status === 404, r);
  r = await call("POST", "/api/link", { body: { code: "ABC", clientId: hex(32) } });
  check("code mal formé refusé", r.status === 400, r);
  const fresh = (await call("POST", "/api/me/link", { token: second })).data.code;
  await call("POST", "/api/me/link", { token });
  r = await call("POST", "/api/link", { body: { code: fresh, clientId: hex(32) } });
  check("nouveau code : l'ancien ne marche plus", r.status === 404, r);
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
r = await call("GET", `/api/players/${row.id}`);
check("joueur retiré sans fiche", r.status === 404, r);

r = await call("GET", "/api/admin/players?scope=general", { key: KEY });
check("admin : classement général disponible", r.status === 200 && r.data.scope === "general" && r.data.players.some((p) => p.pseudo === pseudo), r.data.scope);

const pcPseudo = "PC" + hex(6);
r = await call("POST", "/api/join", { body: { pseudo: pcPseudo, clientId: hex(32) } });
const pcToken = r.data.token;
r = await call("POST", "/api/runs", { token: pcToken });
const pcRun = r.data.runId;
await wait(1500);
r = await call("POST", `/api/runs/${pcRun}`, { token: pcToken, body: { score: 100, device: "pc", combo: 500 } });
check("partie sur PC : record PC, hors soirée", r.status === 200 && r.data.pcBest === 100 && r.data.pcImproved && r.data.best === 0 && r.data.eventBest === null, r.data);
r = await call("GET", "/api/board", { token: pcToken });
check("partie sur PC : seulement au classement PC", r.data.pcTop.some((x) => x.me) && !r.data.top.some((x) => x.me) && !r.data.eventTop.some((x) => x.me) && r.data.me.pcRank > 0, r.data.me);
r = await call("GET", `/api/players/${r.data.me.id}`);
check("fiche : frôlé hors limites ignoré, record PC dans la progression", r.status === 200 && r.data.combo === 0 && r.data.pcBest === 100 && r.data.records.some((x) => x.pc && x.score === 100), r.data);
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
