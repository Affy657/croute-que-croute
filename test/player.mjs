import { readFileSync } from "node:fs";

const BASE = process.argv[2] || "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error("Les tests d'API ne tournent qu'en local, sur une base à part : npm run test:api.");
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

const joinAs = async (name) => (await call("POST", "/api/join", { body: { pseudo: name, clientId: hex(32) } })).data.token;
const startRun = async (tok) => (await call("POST", "/api/runs", { token: tok })).data.runId;
const slowName = "Lent" + hex(5), highName = "Haut" + hex(5);
const [slowTok, highTok] = [await joinAs(slowName), await joinAs(highName)];
const [slowRun, highRun] = [await startRun(slowTok), await startRun(highTok)];
const slowSince = Date.now();

r = await call("POST", "/api/admin/events", { key: KEY, body: { name: "Écrasement", closesAt: Date.now() + 3600 * 1000 } });
check("nouvelle soirée refusée tant que la soirée en cours est ouverte", r.status === 409, r);
r = await call("POST", "/api/admin/events", { key: KEY, body: { name: "Passée", closesAt: Date.now() - 1000 } });
check("soirée qui finit dans le passé refusée", r.status === 400, r);
r = await call("POST", "/api/admin/events", { key: KEY, body: { name: "À l'envers", opensAt: Date.now() + 2 * 3600 * 1000, closesAt: Date.now() + 3600 * 1000 } });
check("soirée qui finit avant de commencer refusée", r.status === 400, r);
r = await call("PATCH", "/api/admin/events/current", { key: KEY, body: { opensAt: Date.now() + 2 * 3600 * 1000, closesAt: Date.now() + 3600 * 1000 } });
check("modification de la soirée : fin avant le début refusée", r.status === 400, r);

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

r = await call("POST", "/api/runs", { token, version: "precedente" });
check("partie lancée par la version d'avant acceptée (mise à jour pendant la partie)", r.status === 201 && !!r.data.runId, r);
r = await call("POST", "/api/runs", { token, version: "vieille" });
check("partie lancée par une plus vieille version refusée (426)", r.status === 426, r);
r = await call("PATCH", "/api/me", { token, version: "precedente", body: { pseudo } });
check("version d'avant refusée hors départ de partie (426)", r.status === 426, r);

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
{
  const tok = await joinAs("Double" + hex(4)), run = await startRun(tok);
  await wait(1200);
  const both = await Promise.all([1, 2].map(() => call("POST", `/api/runs/${run}`, { token: tok, body: { score: 110 } })));
  const id = (await call("GET", "/api/board", { token: tok })).data.me.id;
  const card = await call("GET", "/api/players/" + id);
  check("même score envoyé deux fois en même temps : « record » dans les deux réponses, partie comptée une fois",
    both.every((x) => x.status === 200 && x.data.improved && x.data.best === 110 && x.data.eventImproved && x.data.eventBest === 110) && card.data.runs === 1,
    [...both.map((x) => x.data), card.data.runs]);
}
{
  const theirs = await startRun(await joinAs("Autre" + hex(4)));
  r = await call("POST", `/api/runs/${theirs}`, { token, body: { score: 50 } });
  check("score envoyé sur la partie d'un autre joueur refusé", r.status === 404, r);
}

r = await call("GET", "/api/board", { token });
check("classements général et soirée : le joueur y est", r.status === 200 && r.data.me.best === 100 && r.data.me.eventBest === 100 && r.data.me.rank >= 1 && r.data.me.eventRank >= 1 && r.data.top.some((x) => x.me) && r.data.eventTop.some((x) => x.me), r.data.me);
{
  const { me, top } = r.data, above = top[me.rank - 2];
  check("rival : le joueur juste au-dessus", me.rank === 1 ? me.rival === null : !!above && me.rival.pseudo === above.pseudo && me.rival.best === above.best, { rank: me.rank, rival: me.rival });
  const card = await call("GET", `/api/players/${me.id}`);
  check("fiche : record, progression et meilleur frôlé", card.status === 200 && card.data.best === 100 && card.data.combo === 7 && card.data.records.some((x) => !x.pc && x.score === 100), card.data);
  const none = await call("GET", "/api/players/inconnu-" + hex(8));
  check("fiche d'un joueur inconnu = 404", none.status === 404, none);
  const solo = await joinAs("Fiche" + hex(4)), soloId = (await call("GET", "/api/board", { token: solo })).data.me.id;
  const before = (await call("GET", `/api/players/${soloId}`, { token: solo })).data;
  await call("POST", `/api/runs/${await startRun(solo)}`, { token: solo, body: { score: 10, combo: 3 } });
  const after = (await call("GET", `/api/players/${soloId}`, { token: solo })).data;
  check("sa propre fiche suit la partie qui vient de finir", before.runs === 0 && after.runs === 1 && after.played === 10 && after.combo === 3 && after.feats.express && after.records.length === 1, { before, after });
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
  const fresh = (await call("POST", "/api/join", { body: { pseudo: "Aura" + hex(4), clientId: hex(32) } })).data.token;
  r = await call("PUT", "/api/me/look", { token: fresh, body: { look: { ...look, aura: "ring", own: { aura: 2 } } } });
  const id = (await call("GET", "/api/board", { token: fresh })).data.me.id, shown = (await call("GET", `/api/players/${id}`)).data.look;
  check("aura gardée dans la tenue et montrée sur la fiche", r.status === 200 && !!shown && shown.aura === "ring" && shown.own.aura === 2, shown);
  const odd = (await call("POST", "/api/join", { body: { pseudo: "Odd" + hex(4), clientId: hex(32) } })).data.token;
  r = await call("PUT", "/api/me/look", { token: odd, body: { look: { spread: "constructor", head: "ring", side: "bat", bread: "hitbox", aura: "constructor", ach: 0, own: {} } } });
  const oddId = (await call("GET", "/api/board", { token: odd })).data.me.id, worn = (await call("GET", `/api/players/${oddId}`)).data.look;
  check("tenue : seuls les objets qui existent, dans le bon emplacement", r.status === 200 && worn.spread === null && worn.head === null && worn.aura === null && worn.side === "bat" && worn.bread === "hitbox", worn);
  const synced = await joinAs("Synchro" + hex(4)), mine = async () => (await call("GET", "/api/board", { token: synced })).data.me.look;
  const outfit = { head: "crown", side: "bat", bread: "toasted", aura: "ring", spread: "choco", ach: 20, own: { head: 5, side: 2, bread: 3, aura: 1, spread: 6 } };
  await call("PUT", "/api/me/look", { token: synced, body: { look: outfit } });
  r = await call("PUT", "/api/me/look", { token: synced, body: { look: { spread: "butter", ach: 0, own: {}, at: 0 } } });
  let seen = await mine();
  check("appareil neuf (tenue vide, sans date) : la tenue du compte est gardée et renvoyée", r.status === 200 && r.data.look.head === "crown" && seen.head === "crown" && seen.spread === "choco" && seen.ach === 20 && seen.own.head === 5, { sent: r.data.look, seen });
  await call("PUT", "/api/me/look", { token: synced, body: { look: { ...outfit, head: "witch", spread: "jam", ach: 25, own: { head: 6 }, at: 5000 } } });
  seen = await mine();
  check("tenue changée sur un appareil : elle remplace celle du compte, compteurs au plus haut", seen.head === "witch" && seen.spread === "jam" && seen.at === 5000 && seen.ach === 25 && seen.own.head === 6 && seen.own.spread === 6, seen);
  r = await call("PUT", "/api/me/look", { token: synced, body: { look: { ...outfit, head: "pirate", at: 4000 } } });
  check("tenue plus ancienne d'un autre appareil : ignorée", r.data.look.head === "witch" && r.data.look.at === 5000, r.data.look);
  await call("POST", "/api/runs", { token: synced, body: { look: { ...outfit, head: null, at: 0 } } });
  seen = await mine();
  check("départ de partie avec une tenue plus ancienne : celle du compte gardée", seen.head === "witch", seen);
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
  const pending = (await call("POST", "/api/me/link", { token: second })).data.code;
  r = await call("DELETE", "/api/me/devices", {});
  check("déconnexion des autres appareils sans compte refusée", r.status === 401, r);
  r = await call("DELETE", "/api/me/devices", { token });
  check("autres appareils déconnectés", r.status === 200 && r.data.removed === 1, r.data);
  const [kept, out] = await Promise.all([call("GET", "/api/board", { token }), call("GET", "/api/board", { token: second })]);
  check("cet appareil reste connecté, l'autre est sorti", !!kept.data.me && out.data.me === null, [kept.data.me, out.data.me]);
  r = await call("POST", "/api/link", { body: { code: pending, clientId: hex(32) } });
  check("code de l'appareil sorti refusé", r.status === 404, r);
  r = await call("DELETE", "/api/me/devices", { token });
  check("plus aucun autre appareil", r.status === 200 && r.data.removed === 0, r.data);
}

{
  const owner = await joinAs("Lien" + hex(5)), device = hex(32);
  const code = (await call("POST", "/api/me/link", { token: owner })).data.code;
  const first = await call("POST", "/api/link", { body: { code, clientId: device } });
  r = await call("POST", "/api/link", { body: { code, clientId: device } });
  check("code de liaison : réponse perdue, le même appareil réessaie et se connecte", first.status === 200 && r.status === 200 && !!r.data.token && r.data.token !== first.data.token && r.data.pseudo === first.data.pseudo, r.data);
  const [lost, kept] = await Promise.all([call("GET", "/api/board", { token: first.data.token }), call("GET", "/api/board", { token: r.data.token })]);
  check("code de liaison : une seule clé gardée pour l'appareil qui a réessayé", lost.data.me === null && !!kept.data.me, [lost.data.me, kept.data.me]);
  r = await call("POST", "/api/link", { body: { code, clientId: hex(32) } });
  check("code de liaison déjà utilisé : refusé à un autre appareil", r.status === 404, r);
  await call("DELETE", "/api/me/devices", { token: owner });
  r = await call("POST", "/api/link", { body: { code, clientId: device } });
  check("code de liaison utilisé puis « Déconnecter les autres » : plus de nouvel essai", r.status === 404, r);
}

{
  const raw = (method, path, headers) => fetch(BASE + path, { method, headers: { "x-app-version": VERSION, ...headers } });
  let res = await raw("GET", "/api/board", { authorization: "Bearer " + token });
  const set = res.headers.get("set-cookie") || "";
  check("clé du joueur gardée dans un cookie protégé", (set.match(/cv_cle=([a-f0-9]{48})/) || [])[1] === token && /HttpOnly/i.test(set) && /SameSite=Strict/i.test(set) && /Path=\/api/i.test(set), set);
  res = await raw("GET", "/api/board", { authorization: "Bearer " + token, cookie: "cv_cle=" + token });
  check("cookie déjà à jour : pas renvoyé", !res.headers.get("set-cookie"), res.headers.get("set-cookie"));
  res = await raw("POST", "/api/resume", { cookie: "autre=1; cv_cle=" + token });
  let body = await res.json();
  check("appli installée sans clé : compte repris grâce au cookie", res.status === 200 && body.token === token, body);
  res = await raw("POST", "/api/resume", { cookie: "cv_cle=" + first });
  body = await res.json();
  check("cookie d'un appareil sorti : rien repris, cookie effacé", res.status === 200 && body.token === null && /Max-Age=0/i.test(res.headers.get("set-cookie") || ""), body);
  res = await raw("POST", "/api/resume", {});
  body = await res.json();
  check("sans cookie : rien repris", res.status === 200 && body.token === null, body);
}

r = await call("GET", "/api/admin/players", { key: KEY });
const row = r.data.players.find((p) => p.pseudo === pseudo);
check("admin : nombre de parties terminées", row && row.runs === 1 && row.suspect === null, row);
check("admin : joueur qui vient de finir une partie marqué actif", row && row.active === true, row);
{
  const idle = "Rien" + hex(5);
  await joinAs(idle);
  const list = (await call("GET", "/api/admin/players", { key: KEY })).data.players;
  const found = list.find((p) => p.pseudo === idle);
  check("admin : nouveau joueur sans partie pas marqué actif", found && found.active === false, found);
}

const beforeBan = await startRun(token);
let limited = 0;
for (let i = 0; i < 25; i++) if ((await call("POST", "/api/runs", { token })).status === 429) limited++;
check("trop de parties d'affilée freinées (429)", limited > 0, { limited });

r = await call("POST", `/api/admin/players/${row.id}/ban`, { key: KEY, body: { banned: true } });
r = await call("GET", "/api/board", { token });
check("joueur retiré absent des deux classements", r.data.me.rank === null && r.data.me.eventRank === null && r.data.me.banned && !r.data.top.some((x) => x.me) && !r.data.eventTop.some((x) => x.me), r.data.me);
r = await call("GET", `/api/players/${row.id}`);
check("joueur retiré sans fiche", r.status === 404, r);
r = await call("GET", "/api/feed");
check("joueur retiré absent du fil de l'écran géant", r.status === 200 && Array.isArray(r.data.items) && !r.data.items.some((i) => i.pseudo === pseudo), r.data);
r = await call("POST", "/api/runs", { token });
check("joueur retiré : nouvelle partie refusée (403)", r.status === 403, r);
r = await call("POST", `/api/runs/${beforeBan}`, { token, body: { score: 500 } });
check("joueur retiré : partie lancée avant le retrait, finie après, sans effet", r.status === 200 && r.data.best === 100 && !r.data.improved && !r.data.eventImproved && r.data.rank === null && r.data.eventRank === null, r.data);
{
  const before = (await call("GET", "/api/board")).data;
  r = await call("POST", `/api/runs/${runId}`, { token, body: { score: 100 } });
  const after = (await call("GET", "/api/board")).data;
  const back = (b) => b.top.some((x) => x.pseudo === row.pseudo) || b.eventTop.some((x) => x.pseudo === row.pseudo);
  check("joueur retiré : renvoyer le score de son record ne le remet pas dans les classements", r.status === 200 && !back(after) && after.count === before.count && after.eventCount === before.eventCount, [after.count, before.count, after.eventCount, before.eventCount]);
}

r = await call("GET", "/api/admin/players?scope=general", { key: KEY });
check("admin : classement général disponible", r.status === 200 && r.data.scope === "general" && r.data.players.some((p) => p.pseudo === pseudo), r.data.scope);
await call("POST", `/api/admin/players/${row.id}/ban`, { key: KEY, body: { banned: false } });
r = await call("GET", "/api/board", { token });
check("joueur remis : de retour dans les classements avec son record", !r.data.me.banned && r.data.me.best === 100 && r.data.me.rank >= 1 && r.data.me.eventRank >= 1 && r.data.top.some((x) => x.me), r.data.me);

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
r = await call("GET", "/api/admin/players", { key: KEY });
check("admin, onglet Soirée : nouveau pseudo qui a joué sur PC listé une fois (l'écran géant l'affiche)", r.status === 200 && r.data.players.filter((p) => p.pseudo === pcPseudo).length === 1, r.data.players.map((p) => p.pseudo));
r = await call("POST", "/api/runs", { token: pcToken });
const phoneRun = r.data.runId;
await wait(1000);
r = await call("POST", `/api/runs/${phoneRun}`, { token: pcToken, body: { score: 50, device: "mobile" } });
check("partie sur téléphone : mobile et soirée, record PC gardé", r.data.best === 50 && r.data.eventBest === 50 && r.data.pcBest === 100, r.data);
r = await call("GET", "/api/admin/players?scope=pc", { key: KEY });
check("admin : classement PC disponible", r.status === 200 && r.data.scope === "pc" && r.data.players.some((p) => p.pseudo === pcPseudo && p.best === 100), r.data.scope);

{
  const play = async (tok, score, device) => {
    const id = (await call("POST", "/api/runs", { token: tok })).data.runId;
    return call("POST", `/api/runs/${id}`, { token: tok, body: { score, device } });
  };
  const nameA = "Fus" + hex(5), nameB = "Ion" + hex(5), look = { spread: "butter", ach: 0, own: {} };
  const [tokA, tokB] = [await joinAs(nameA), await joinAs(nameB)];
  await play(tokA, 100, "mobile");
  await play(tokB, 200, "mobile");
  await play(tokB, 150, "pc");
  await call("PUT", "/api/me/look", { token: tokA, body: { look, progress: { got: { t10: 5 }, attacks: [], toppings: [] } } });
  await call("PUT", "/api/me/look", { token: tokB, body: { look, progress: { got: { t30: 7 }, attacks: ["rain"], toppings: ["jam"] } } });
  const code = (await call("POST", "/api/me/link", { token: tokA })).data.code;
  r = await call("POST", "/api/link", { token: tokA, body: { code } });
  check("fusion : code de son propre compte refusé", r.status === 409 && !r.data.merge, r.data);
  r = await call("POST", "/api/link", { token: tokB, body: { code } });
  check("fusion : confirmation demandée avec les deux pseudos", r.status === 409 && !!r.data.merge && r.data.merge.from === nameB && r.data.merge.into === nameA, r.data);
  r = await call("POST", "/api/link", { token: tokB, body: { code, merge: true } });
  check("fusion : comptes réunis", r.status === 200 && r.data.merged && r.data.pseudo === nameA, r.data);
  const [a, b] = await Promise.all([call("GET", "/api/board", { token: tokA }), call("GET", "/api/board", { token: tokB })]);
  const me = b.data.me || {};
  check("fusion : les deux appareils sur le même compte", !!a.data.me && a.data.me.id === me.id && me.pseudo === nameA, [a.data.me, me]);
  check("fusion : meilleurs records, parties additionnées, soirée réunie", me.best === 200 && me.pcBest === 150 && me.runs === 3 && me.eventBest === 200, me);
  r = await call("PUT", "/api/me/look", { token: tokA, body: { look, progress: { got: {}, attacks: [], toppings: [] } } });
  const p = r.data.progress || { got: {}, attacks: [], toppings: [] };
  check("fusion : succès, attaques et garnitures réunis", p.got.t10 === 5 && p.got.t30 === 7 && p.attacks.join() === "rain" && p.toppings.join() === "jam", p);
  r = await call("POST", "/api/join", { body: { pseudo: nameB, clientId: hex(32) } });
  check("fusion : l'ancien pseudo est libre", r.status === 201, r);
  const tokC = await joinAs("Ban" + hex(5));
  await call("POST", `/api/admin/players/${(await call("GET", "/api/board", { token: tokC })).data.me.id}/ban`, { key: KEY, body: { banned: true } });
  r = await call("POST", "/api/link", { token: tokA, body: { code: (await call("POST", "/api/me/link", { token: tokC })).data.code, merge: true } });
  check("fusion avec un compte retiré refusée", r.status === 403, r);
  const nameQ = "Qq" + hex(5), [tokP, tokQ] = [await joinAs("Pp" + hex(5)), await joinAs(nameQ)];
  await play(tokP, 120, "mobile");
  await call("POST", "/api/link", { token: tokP, body: { code: (await call("POST", "/api/me/link", { token: tokQ })).data.code, merge: true } });
  const keptQ = (await call("GET", "/api/admin/players", { key: KEY })).data.players.find((x) => x.pseudo === nameQ);
  check("fusion : le compte gardé est marqué actif dans l'admin quand l'autre vient de jouer", !!keptQ && keptQ.active === true, keptQ);
  const [tokD, tokG, tokE] = [await joinAs("Dd" + hex(5)), await joinAs("Gg" + hex(5)), await joinAs("Ee" + hex(5))];
  for (const tok of [tokD, tokG, tokE]) {
    await play(tok, 300, "mobile");
    await wait(20);
  }
  await call("POST", "/api/link", { token: tokD, body: { code: (await call("POST", "/api/me/link", { token: tokE })).data.code, merge: true } });
  const [merged, other] = await Promise.all([call("GET", "/api/board", { token: tokE }), call("GET", "/api/board", { token: tokG })]);
  check("fusion à égalité : le record le plus ancien garde sa place", merged.data.me.rank < other.data.me.rank && merged.data.me.eventRank < other.data.me.eventRank, [merged.data.me, other.data.me]);

  const keepName = "Gar" + hex(5), fromName = "Ref" + hex(5), [tokK, tokF] = [await joinAs(keepName), await joinAs(fromName)];
  await play(tokK, 100, "mobile");
  await play(tokF, 200, "mobile");
  const merge = (body) => call("POST", "/api/admin/merge", { key: KEY, body });
  r = await merge({ keep: keepName.toLowerCase(), from: fromName });
  const left = (await call("GET", "/api/board", { token: tokF })).data.me || {};
  check("admin, réunir : d'abord un aperçu des deux comptes, sans rien changer", r.status === 200 && r.data.keep.pseudo === keepName && r.data.keep.runs === 1 && r.data.from.pseudo === fromName && r.data.from.best === 200 && left.pseudo === fromName, [r.data, left]);
  r = await merge({ keep: keepName, from: fromName, confirm: true });
  check("admin, réunir : comptes réunis après confirmation", r.status === 200 && r.data.pseudo === keepName && r.data.merged === fromName, r.data);
  const [kept, moved] = await Promise.all([call("GET", "/api/board", { token: tokK }), call("GET", "/api/board", { token: tokF })]);
  const km = moved.data.me || {};
  check("admin, réunir : les appareils du compte réuni passent sur le compte gardé, record et parties réunis", !!kept.data.me && km.id === kept.data.me.id && km.pseudo === keepName && km.best === 200 && km.runs === 2, [kept.data.me, km]);
  r = await call("POST", "/api/join", { body: { pseudo: fromName, clientId: hex(32) } });
  check("admin, réunir : le pseudo réuni est libre", r.status === 201, r);
  r = await merge({ keep: keepName, from: "Inconnu" + hex(5), confirm: true });
  check("admin, réunir : pseudo inconnu = 404", r.status === 404, r);
  r = await merge({ keep: keepName, from: keepName.toUpperCase(), confirm: true });
  check("admin, réunir : deux fois le même compte = 400", r.status === 400, r);
  r = await merge({ keep: keepName });
  check("admin, réunir : un pseudo manquant = 400", r.status === 400, r);
  const outName = "Out" + hex(5), tokO = await joinAs(outName);
  await call("POST", `/api/admin/players/${(await call("GET", "/api/board", { token: tokO })).data.me.id}/ban`, { key: KEY, body: { banned: true } });
  r = await merge({ keep: keepName, from: outName, confirm: true });
  check("admin, réunir : compte retiré du classement refusé", r.status === 403, r);
}

r = await call("POST", "/api/diag", { body: { kind: "test", version: "dev", standalone: false, ua: "test", lines: ["un", "deux"] } });
check("rapport son enregistré", r.status === 200, r);
r = await call("POST", "/api/diag", { body: { kind: "test" } });
check("rapport son sans journal refusé", r.status === 400, r);

const boom = { kind: "erreur", message: "TypeError: test joueur", source: "/js/app/main.js:1:1", count: 1 };
const errorReport = (errors) => ({ version: "dev", page: "/", platform: "iPhone", standalone: false, ua: "test", session: hex(16), errors });
r = await call("POST", "/api/errors", { body: errorReport([boom]) });
check("erreur de joueur enregistrée", r.status === 200, r);
r = await call("POST", "/api/errors", { body: errorReport([]) });
check("rapport d'erreurs vide refusé", r.status === 400, r);
r = await call("POST", "/api/errors", { body: errorReport([{ ...boom, kind: "inventé" }]) });
check("type d'erreur inconnu refusé", r.status === 400, r);
r = await call("POST", "/api/errors", { body: errorReport([{ ...boom, stack: "x".repeat(70000) }]) });
check("rapport d'erreurs trop gros refusé", r.status === 413, r);
{
  const noisy = hex(16), five = (tag) => ["a", "b", "c", "d", "e"].map((x) => ({ ...boom, message: `TypeError: ${tag} ${x}` }));
  for (const tag of ["bavard un", "bavard deux"]) await call("POST", "/api/errors", { body: { ...errorReport(five(tag)), session: noisy } });
  r = await call("POST", "/api/errors", { body: { ...errorReport(five("bavard trois")), session: noisy } });
  check("un téléphone qui envoie trop d'erreurs est freiné", r.status === 429, r);
  r = await call("POST", "/api/errors", { body: errorReport([{ ...boom, message: "TypeError: autre téléphone" }]) });
  check("les autres téléphones envoient encore leurs erreurs", r.status === 200, r);
}

{
  const until = async (ok, ms = 5000) => {
    for (const end = Date.now() + ms; Date.now() < end && !ok(); ) await wait(50);
    return ok();
  };
  r = await call("GET", "/api/live");
  check("direct : sans WebSocket, refusé (426)", r.status === 426, r);
  const ws = new WebSocket(BASE.replace("http", "ws") + "/api/live"), heard = [];
  ws.onmessage = (e) => heard.push(String(e.data));
  await until(() => ws.readyState === 1);
  check("direct : l'écran se connecte en WebSocket", ws.readyState === 1, ws.readyState);
  ws.send("ping");
  check("direct : ping, pong", await until(() => heard.includes("pong")), heard);
  {
    const socket = (ip) => new Promise((ok) => {
      const s = new WebSocket(BASE.replace("http", "ws") + "/api/live", { headers: { "cf-connecting-ip": ip } });
      s.onopen = () => ok(s);
      s.onerror = () => ok(null);
    });
    const ip = "10.77." + Math.floor(Math.random() * 250) + ".1", four = [];
    for (let i = 0; i < 4; i++) {
      four.push(await socket(ip));
      await wait(60);
    }
    const fifth = await socket(ip), other = await socket(ip.replace(/1$/, "2"));
    await wait(300);
    check("direct : une même adresse garde 4 écrans au plus, un 5e est refusé tant qu'ils répondent, sans en chasser un", four.every((s) => s && s.readyState === 1) && !fifth && !!other, { four: four.map((s) => s && s.readyState), fifth: !!fifth, other: !!other });
    for (const s of [...four, fifth, other]) if (s) s.close();
  }

  r = await call("GET", "/api/ecran");
  const before = r.data;
  check("écran : soirée ouverte, 10 premiers au plus, joueurs, fil et repère", r.status === 200 && before.event.status === "open" && before.event.finalAt === before.event.closesAt + 15000 && Array.isArray(before.top) && before.top.length <= 10 && typeof before.count === "number" && Array.isArray(before.feed) && typeof before.stamp === "string", before);
  r = await call("GET", "/api/ecran?v=" + encodeURIComponent(before.stamp));
  check("écran : rien de nouveau, réponse courte", r.status === 200 && r.data.same === true && r.data.stamp === before.stamp && !r.data.top && r.data.event.status === "open", r.data);

  heard.length = 0;
  const name = "Direct" + hex(4), tok = await joinAs(name);
  check("direct : nouveau joueur annoncé à l'écran", await until(() => heard.includes("change")), heard);
  heard.length = 0;
  r = await call("POST", `/api/runs/${await startRun(tok)}`, { token: tok, body: { score: 1400 } });
  check("direct : record de soirée annoncé à l'écran", r.data.eventImproved && (await until(() => heard.includes("change"))), [r.data.eventImproved, heard]);
  r = await call("GET", "/api/ecran?v=" + encodeURIComponent(before.stamp));
  check("écran : record visible tout de suite, avec le nombre de joueurs et le fil", !r.data.same && r.data.stamp !== before.stamp && r.data.top.some((x) => x.pseudo === name && x.best === 1400) && r.data.count === before.count + 1 && r.data.feed.some((i) => i.kind === "best" && i.pseudo === name), r.data);
  heard.length = 0;
  r = await call("POST", `/api/runs/${await startRun(tok)}`, { token: tok, body: { score: 50 } });
  await wait(800);
  check("direct : partie sans record, écran pas dérangé", r.status === 200 && !heard.includes("change"), heard);
  const shownId = (await call("GET", "/api/ecran")).data.top.find((x) => x.pseudo === name).id;
  await call("POST", `/api/admin/players/${shownId}/ban`, { key: KEY, body: { banned: true } });
  check("direct : joueur retiré annoncé à l'écran", await until(() => heard.includes("change")), heard);
  r = await call("GET", "/api/ecran");
  check("écran : joueur retiré absent du top et du fil", !r.data.top.some((x) => x.pseudo === name) && !r.data.feed.some((i) => i.pseudo === name), r.data);
  await call("POST", `/api/admin/players/${shownId}/ban`, { key: KEY, body: { banned: false } });
  ws.close();
}

{
  const finName = "Fin" + hex(5), tokF = await joinAs(finName), late = await startRun(tokF);
  await call("PATCH", "/api/admin/events/current", { key: KEY, body: { opensAt: Date.now() - 3 * 3600 * 1000, closesAt: Date.now() - 6 * 60 * 1000 } });
  r = await call("POST", `/api/runs/${late}`, { token: tokF, body: { score: 40 } });
  check("partie finie 6 min après la fin de la soirée : hors soirée", r.status === 200 && r.data.best === 40 && r.data.eventBest === null && !r.data.eventImproved, r.data);
  r = await call("GET", "/api/admin/players", { key: KEY });
  check("admin, onglet Soirée : nouveau pseudo avec un record hors soirée listé sans score (ni rang, ni meilleur score de la soirée)", r.status === 200 && r.data.players.some((p) => p.pseudo === finName && p.best === 0), r.data.players.filter((p) => p.pseudo === finName));
  r = await call("POST", "/api/admin/events", { key: KEY, body: { name: "Soirée rattrapage", opensAt: Date.now() - 1000, closesAt: Date.now() + 3600 * 1000 } });
  const tooLate = await startRun(tokF);
  await call("PATCH", "/api/admin/events/current", { key: KEY, body: { opensAt: Date.now() - 3600 * 1000, closesAt: Date.now() - 60 * 1000 } });
  r = await call("POST", `/api/runs/${tooLate}`, { token: tokF, body: { score: 30 } });
  check("partie finie 1 min après la fin : hors soirée, la fin est la fin", r.status === 200 && r.data.eventBest === null && !r.data.eventImproved, r.data);
  r = await call("POST", "/api/admin/events", { key: KEY, body: { name: "Soirée marge", opensAt: Date.now() - 1000, closesAt: Date.now() + 3600 * 1000 } });
  const inTime = await startRun(tokF);
  await call("PATCH", "/api/admin/events/current", { key: KEY, body: { opensAt: Date.now() - 3600 * 1000, closesAt: Date.now() - 5000 } });
  r = await call("POST", `/api/runs/${inTime}`, { token: tokF, body: { score: 20 } });
  check("score arrivé 5 s après la fin (réseau) : compte pour la soirée", r.status === 200 && r.data.eventBest === 20 && r.data.eventImproved, r.data);
  await wait(11000);
  r = await call("POST", `/api/runs/${inTime}`, { token: tokF, body: { score: 20 } });
  check("même score renvoyé 16 s après la fin (réponse perdue) : toujours compté pour la soirée", r.status === 200 && r.data.eventBest === 20 && r.data.eventImproved, r.data);
}

{
  await wait(Math.max(0, 47000 - (Date.now() - slowSince)));
  await call("POST", `/api/runs/${slowRun}`, { token: slowTok, body: { score: 10 } });
  r = await call("POST", `/api/runs/${highRun}`, { token: highTok, body: { score: 6000 } });
  const flags = Object.fromEntries((await call("GET", "/api/admin/players?scope=general", { key: KEY })).data.players.map((p) => [p.pseudo, p.suspect]));
  check("admin : partie mise en pause signalée", flags[slowName] === "slow", flags[slowName]);
  check("admin : 1er très loin devant le 2e signalé", r.status === 200 && flags[highName] === "high", [r.status, flags[highName]]);
}

console.log(results.join("\n"));
console.log(results.filter((l) => l.startsWith("FAIL")).length + " échec(s) sur " + results.length);
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
