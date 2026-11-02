import { storageListeners } from "./env.mjs";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { KEYS } from "../../public/js/shared/store.js";
import { GEAR, SPREADS } from "../../public/js/shared/palette.js";
import { PROJECTILES } from "../../public/js/game/projectiles.js";
import { ATTACKS } from "../../public/js/game/attacks.js";

mock.timers.enable({ apis: ["Date"], now: new Date(2026, 10, 1, 12, 0).getTime() });
const A = await import("../../public/js/app/achievements.js");
const { has } = A;

const heard = [];
A.onUnlock((a, synced) => heard.push({ id: a.id, synced }));
const heardOf = (id) => heard.filter((h) => h.id === id);

let ended = 0;
function play(score, killer = null, eventKey = null, device = "mobile") {
  A.runStart(eventKey);
  A.runEnd(score, killer, device);
  ended++;
}
const tick = (t, near = 0, moved = true, dt = 0.016, obs = []) => A.runTick({ t, near, obs }, moved, dt);
const stored = () => JSON.parse(localStorage.getItem(KEYS.achievements));

test("chaque succès a un identifiant unique et ses objets existent", () => {
  const ids = A.ACHIEVEMENTS.map((a) => a.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const a of A.ACHIEVEMENTS) if (a.gear) assert.ok(Object.hasOwn(GEAR, a.gear), a.id);
});

test("hors partie, rien ne se débloque", () => {
  tick(200, 50, false, 10);
  A.runCombo(20);
  A.runEnd(6700, { kind: "knife", spread: "dog" });
  for (const id of ["t10", "near20", "zen", "combo5", "sixSeven", "woof", "runs10"]) assert.ok(!has(id), id);
});

test("records rendus par le serveur : paliers de temps débloqués, signalés comme synchronisés", () => {
  A.onBoard({ me: { best: 3050, pcBest: 0, runs: 0 }, count: 1, eventCount: 0, pcCount: 0 });
  assert.ok(has("t10") && has("t30") && !has("t60"));
  assert.deepEqual(heardOf("t30"), [{ id: "t30", synced: true }]);
});

test("paliers de temps pendant la partie, au centième près", () => {
  A.runStart(null);
  tick(59.99, 1);
  assert.ok(!has("t60"));
  tick(60, 1);
  assert.ok(has("t60") && !has("t90"));
  assert.deepEqual(heardOf("t60"), [{ id: "t60", synced: false }]);
  tick(150, 1);
  assert.ok(has("t90") && has("t120") && has("t150"));
  assert.ok(!has("careful"), "un frôlé : pas Prudente");
  A.runEnd(15000, null);
  ended++;
});

test("Prudente : 60 s sans frôlé", () => {
  A.runStart(null);
  tick(59.9, 0);
  assert.ok(!has("careful"));
  tick(60, 0);
  assert.ok(has("careful"));
  A.runEnd(6000, null);
  ended++;
});

test("Ça passe crème : 20 frôlés dans la partie", () => {
  A.runStart(null);
  tick(5, 19);
  assert.ok(!has("near20"));
  tick(5, 20);
  assert.ok(has("near20"));
  A.runEnd(500, null);
  ended++;
});

test("En détente : 3 s sans bouger d'affilée, remis à zéro dès qu'on bouge", () => {
  A.runStart(null);
  tick(1, 0, false, 2);
  tick(2, 0, true, 0.1);
  tick(3, 0, false, 2);
  assert.ok(!has("zen"));
  tick(4, 0, false, 1);
  assert.ok(has("zen"));
  A.runEnd(500, null);
  ended++;
});

test("combos de 5 et de 10 frôlés", () => {
  A.runStart(null);
  A.runCombo(4);
  assert.ok(!has("combo5"));
  A.runCombo(5);
  assert.ok(has("combo5") && !has("combo10"));
  A.runCombo(10);
  assert.ok(has("combo10"));
  A.runEnd(500, null);
  ended++;
});

test("Dix tartines : à la 10e partie, pas avant", () => {
  while (ended < 9) play(5000);
  assert.ok(!has("runs10"));
  play(5000);
  assert.ok(has("runs10"));
});

test("Six Seven : seulement entre 67,00 s et 67,99 s", () => {
  play(6699);
  play(6800);
  assert.ok(!has("sixSeven"));
  play(6799);
  assert.ok(has("sixSeven"));
});

test("Tartinée express : moins de 2 s", () => {
  play(200);
  assert.ok(!has("express"));
  play(199);
  assert.ok(has("express"));
});

test("parties comptées par le serveur : Boulangerie à 50", () => {
  A.onBoard({ me: { best: 0, pcBest: 0, runs: 50 }, count: 1, eventCount: 0, pcCount: 0 });
  assert.ok(has("runs50") && !has("runs100"));
});

test("Ouaf : couteau à la pâtée pour chien", () => {
  play(5000, { kind: "knife", spread: "jam" });
  assert.ok(!has("woof"));
  play(5000, { kind: "knife", spread: "dog" });
  assert.ok(has("woof"));
});

test("Tout le tiroir : une fois tartiné par chaque arme, les armes de labo ne comptent pas", () => {
  const live = Object.keys(PROJECTILES).filter((k) => !PROJECTILES[k].lab).sort((a, b) => (b === "knife") - (a === "knife"));
  for (const kind of Object.keys(PROJECTILES).filter((k) => PROJECTILES[k].lab)) play(5000, { kind });
  for (const kind of live.slice(0, -1)) play(5000, { kind });
  assert.ok(!has("allWeapons"));
  play(5000, { kind: live.at(-1) });
  assert.ok(has("allWeapons"));
});

test("Tout vu : chaque attaque vue une fois, un objet déjà vu ne compte pas deux fois", () => {
  const live = ATTACKS.filter((a) => !a.lab).map((a) => a.id), last = live.at(-1);
  A.runStart(null);
  tick(1, 0, true, 0.016, [{ from: last, seen: true }, ...live.slice(0, -1).map((from) => ({ from }))]);
  assert.ok(!has("allAttacks"));
  tick(1, 0, true, 0.016, [{ from: last }]);
  assert.ok(has("allAttacks"));
  A.runEnd(500, null);
  ended++;
});

test("Tartine d'or : 1er d'au moins 10 joueurs, jamais si retiré", () => {
  const board = (me, eventCount) => ({ me: { best: 0, pcBest: 0, runs: 0, ...me }, count: 3, eventCount, pcCount: 0 });
  A.onBoard(board({ eventRank: 1, banned: true }, 50));
  A.onBoard(board({ eventRank: 1 }, 9));
  A.onBoard(board({ eventRank: 2 }, 50));
  assert.ok(!has("eventWin"));
  A.onBoard(board({ eventRank: 1 }, 10));
  assert.ok(has("eventWin"));
});

test("Dans le top : top 10 de la soirée, pas sur une erreur", () => {
  A.afterSubmit({ eventRank: 11 });
  A.afterSubmit({ error: "Hors ligne", eventRank: 1 });
  A.afterSubmit(null);
  assert.ok(!has("top10"));
  A.afterSubmit({ eventRank: 10 });
  assert.ok(has("top10"));
});

test("Première soirée : pas pour une partie jouée sur PC pendant la soirée", () => {
  play(5000, null, "soiree-1", "pc");
  assert.ok(!has("event1"));
  A.runStart("soiree-1");
  assert.ok(!has("event1"), "pas avant de savoir si la partie se joue au doigt ou à la souris");
  A.runEnd(5000, null, "pc");
  ended++;
  assert.ok(!has("event1"));
  assert.deepEqual(stored().events, []);
});

test("Première soirée : partie jouée sur téléphone pendant une soirée", () => {
  play(5000, null, "soiree-1");
  assert.ok(has("event1"));
  assert.deepEqual(stored().events, ["soiree-1"]);
});

test("Le frigo est plein : 4 garnitures gagnées", () => {
  const extras = Object.keys(SPREADS).filter((k) => !SPREADS[k].free);
  localStorage.setItem(KEYS.toppings, JSON.stringify(extras.slice(0, 3)));
  A.countToppings();
  assert.ok(!has("top4"));
  localStorage.setItem(KEYS.toppings, JSON.stringify(extras.slice(0, 4)));
  A.countToppings();
  assert.ok(has("top4"));
});

test("Tartine de minuit : seulement entre minuit et 3 h", () => {
  assert.ok(!has("night"), "parties jouées à midi");
  mock.timers.setTime(new Date(2026, 10, 2, 3, 0).getTime());
  play(5000);
  assert.ok(!has("night"));
  mock.timers.setTime(new Date(2026, 10, 2, 1, 30).getTime());
  play(5000);
  assert.ok(has("night"));
});

test("succès reçus du serveur : seuls les vrais, la date locale gardée", () => {
  const t10 = A.forSync().got.t10;
  A.absorb({ got: { hoho: 123, bidon: 5, ahoy: "hier", eggHunt: NaN, t10: 1 }, attacks: ["rain", 5] });
  assert.ok(has("hoho") && !has("ahoy") && !has("eggHunt") && !has("bidon"));
  const sync = A.forSync();
  assert.equal(sync.got.hoho, 123);
  assert.equal(sync.got.t10, t10);
  assert.ok(sync.attacks.includes("rain") && !sync.attacks.includes(5));
  A.absorb({ got: {} });
  A.absorb(null);
  assert.ok(has("hoho"));
});

test("succès gagné dans un autre onglet : ni perdu ni effacé", () => {
  localStorage.setItem(KEYS.achievements, JSON.stringify({ ...stored(), got: { ...stored().got, runs100: 5 } }));
  A.checkOutfit({ head: "witch", side: "bat", bread: null });
  assert.ok(!has("dressed"));
  A.checkOutfit({ head: "witch", side: "bat", bread: "brioche" });
  assert.ok(has("dressed") && has("runs100"));
  assert.ok(stored().got.runs100 && stored().got.dressed);
  localStorage.setItem(KEYS.achievements, JSON.stringify({ ...stored(), got: { ...stored().got, pumpkin: 6 } }));
  for (const fn of storageListeners) fn({ key: KEYS.achievements });
  assert.ok(has("pumpkin"));
});

test("Tout le ciel : à la dernière surprise touchée", () => {
  assert.equal(A.touchSky("inconnu"), null);
  const keys = ["pumpkin", "pirate", "santa", "egg", "toaster", "saucer", "tesla"];
  const results = keys.map((k) => A.touchSky(k));
  assert.equal(results.at(-1).all.id, "allSky");
  assert.ok(results.slice(0, -1).every((r) => !r.all));
  assert.equal(A.touchSky("pumpkin").fresh, false);
});

test("chaque succès n'est annoncé qu'une fois", () => {
  const counts = {};
  for (const h of heard) counts[h.id] = (counts[h.id] || 0) + 1;
  assert.deepEqual(Object.entries(counts).filter(([, n]) => n > 1), []);
});
