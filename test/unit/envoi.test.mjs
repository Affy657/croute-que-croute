import "./env.mjs";
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const ME = { id: "a".repeat(32), pseudo: "Lou", best: 0, rank: 1, pcBest: 0, pcRank: null, runs: 1 };
const RESULT = { best: 0, rank: 1, rival: null, pcBest: 0, pcRank: null, pcRival: null, count: 1, pcCount: 0, eventBest: null };
const WAITING_KEY = "cv-score-attente";
const heard = {};
const answer = (status, body) => ({ ok: status < 400, status, json: async () => body });
const unreadable = () => ({ ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token <"); } });
const down = () => { throw new TypeError("Failed to fetch"); };
const stuck = (opts) => new Promise((_, ko) => opts.signal.addEventListener("abort", () => ko(new Error("trop long"))));

let start = () => answer(201, { runId: "partie" }), finish = () => answer(200, RESULT), board = () => answer(200, { now: Date.now(), event: null, next: null, top: [], count: 1, pcTop: [], pcCount: 0, eventTop: [], eventCount: 0, me: { ...ME } });
let starts = [], finishes = [], boards = 0, began = 0;

AbortSignal.timeout = undefined;
window.addEventListener = (type, fn) => { heard[type] = fn; };
document.addEventListener = (type, fn) => { heard[type] = fn; };
localStorage.setItem("cv-token", "c".repeat(48));
mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.UTC(2026, 10, 7, 21) });

globalThis.fetch = async (path, opts) => {
  if (path === "/api/board") {
    boards++;
    return board();
  }
  if (path === "/api/runs") {
    starts.push(Date.now() - began);
    return start(opts);
  }
  if (path.startsWith("/api/runs/")) {
    finishes.push({ at: Date.now() - began, path, body: JSON.parse(opts.body) });
    return finish(opts);
  }
  return answer(200, {});
};

const api = await import("../../public/js/app/api.js");

const flush = async () => {
  for (let i = 0; i < 6; i++) await new Promise(setImmediate);
};
const pass = async (ms) => {
  await flush();
  for (let left = ms; left > 0; left -= 100) {
    mock.timers.tick(100);
    await flush();
  }
};
const stored = () => JSON.parse(localStorage.getItem(WAITING_KEY) || "[]");
const pending = (ago, runId = "partie") => ({ runId, score: 1234, device: "mobile", combo: 2, at: Date.now() - ago });

function fresh() {
  starts = [];
  finishes = [];
  boards = 0;
  began = Date.now();
  start = () => answer(201, { runId: "partie" });
  finish = () => answer(200, RESULT);
  localStorage.removeItem(WAITING_KEY);
}

test("départ raté (réseau, 5xx, 408, 429) : relancé, et la même promesse donne la partie au score", async () => {
  fresh();
  const replies = [down, () => answer(500, { error: "Erreur serveur." }), () => answer(408, {}), () => answer(429, { error: "Trop vite." }), start];
  start = () => replies.shift()();
  const run = api.startRun({ look: null }), sent = api.submitScore(800, "mobile", 1, run, () => {});
  await pass(7000);
  assert.deepEqual(starts, [0, 500, 1500, 3500, 6500]);
  assert.deepEqual(await run, { runId: "partie" });
  assert.deepEqual(await sent, RESULT);
  assert.equal(finishes[0].path, "/api/runs/partie");
});

for (const status of [401, 403, 426]) {
  test(`départ refusé pour de bon (${status}) : aucune relance`, async () => {
    fresh();
    start = () => answer(status, { error: "Non." });
    const r = await api.startRun({ look: null });
    await pass(1000);
    assert.equal(starts.length, 1);
    assert.equal(r.status, status);
    assert.ok(r.error);
    api.net.updatePending = false;
  });
}

test("départ sans réponse : chaque essai a son délai, et rien ne part ni n'arrive après 12 s", async () => {
  fresh();
  start = stuck;
  const run = api.startRun({ look: null });
  await pass(12000);
  assert.deepEqual(starts, [0, 4000, 8500]);
  assert.deepEqual(await run, { error: "Hors ligne : score non compté", status: undefined });
});

test("dernier essai du départ coupé à 12 s pile, pour rester sous les 15 s tolérées par le serveur", async () => {
  fresh();
  const replies = [down, down, down, down, down];
  start = (opts) => (replies.length ? replies.shift()() : stuck(opts));
  const run = api.startRun({ look: null });
  await pass(12000);
  assert.deepEqual(starts, [0, 500, 1500, 3500, 6500, 9500]);
  const r = await Promise.race([run, flush().then(() => "pas fini")]);
  assert.equal(r.error, "Hors ligne : score non compté");
});

test("départ revenu après la fin de la partie : le score dit depuis combien de temps elle est finie", async () => {
  fresh();
  const replies = [down, down, start];
  start = () => replies.shift()();
  const run = api.startRun({ look: null });
  await pass(400);
  api.submitScore(40, "mobile", 0, run, () => {});
  await pass(1100);
  assert.equal(finishes.length, 1);
  assert.equal(finishes[0].body.waited, 1100);
});

test("score envoyé tout de suite : waited vaut 0", async () => {
  fresh();
  await api.submitScore(800, "mobile", 3, Promise.resolve({ runId: "partie" }), () => {});
  assert.deepEqual(finishes[0].body, { score: 800, device: "mobile", combo: 3, waited: 0 });
});

test("corps illisible à la fin de la partie (portail wifi, coupure) : compté comme une erreur réseau, score gardé et renvoyé", async () => {
  fresh();
  const replies = [unreadable, () => answer(200, null), () => answer(200, RESULT)];
  finish = () => replies.shift()();
  const sent = api.submitScore(800, "mobile", 0, Promise.resolve({ runId: "partie" }), () => {});
  await flush();
  assert.equal(stored().length, 1);
  await pass(3000);
  assert.deepEqual(await sent, RESULT);
  assert.equal(finishes.length, 3);
  assert.deepEqual(stored(), []);
});

test("corps illisible au départ : pas de plantage sur la note « Envoi… », le départ est relancé", async () => {
  fresh();
  const replies = [unreadable, start];
  start = () => replies.shift()();
  const sent = api.submitScore(800, "mobile", 0, api.startRun({ look: null }), () => {});
  await pass(500);
  assert.deepEqual(starts, [0, 500]);
  assert.deepEqual(await sent, RESULT);
});

test("2 min sans réseau : la boucle s'arrête, le score reste et un message le dit", async () => {
  fresh();
  finish = down;
  let waited = 0;
  const sent = api.submitScore(800, "mobile", 0, Promise.resolve({ runId: "partie" }), () => { waited++; });
  await pass(125000);
  const r = await sent, tries = finishes.length;
  assert.deepEqual(r, { error: api.WAITING });
  assert.equal(waited, 1);
  assert.equal(stored().length, 1);
  await pass(30000);
  assert.equal(finishes.length, tries);
  assert.ok(api.hasPending());
});

test("réseau revenu (évènement online) : le score gardé repart seul, avec son temps d'attente", async () => {
  finish = () => answer(200, RESULT);
  const before = finishes.length, at = stored()[0].at;
  heard.online();
  await flush();
  assert.equal(finishes.length, before + 1);
  assert.equal(finishes.at(-1).body.waited, Date.now() - at);
  assert.deepEqual(stored(), []);
});

test("score gardé : renvoyé 11 h après, oublié après 12 h", async () => {
  fresh();
  localStorage.setItem(WAITING_KEY, JSON.stringify([pending(11 * 3600 * 1000)]));
  await api.resumePending();
  assert.equal(finishes.length, 1);
  assert.equal(finishes[0].body.waited, 11 * 3600 * 1000);
  assert.deepEqual(stored(), []);
  fresh();
  localStorage.setItem(WAITING_KEY, JSON.stringify([pending(12 * 3600 * 1000 + 1)]));
  await api.resumePending();
  assert.equal(finishes.length, 0);
  assert.equal(localStorage.getItem(WAITING_KEY), null);
  assert.equal(api.hasPending(), false);
});

test("score gardé : renvoyé à chaque classement reçu, pas sur un classement raté", async () => {
  fresh();
  localStorage.setItem(WAITING_KEY, JSON.stringify([pending(600000)]));
  const real = board;
  board = down;
  await api.refreshBoard();
  await flush();
  assert.equal(finishes.length, 0);
  board = real;
  await api.refreshBoard();
  await flush();
  assert.equal(finishes.length, 1);
  assert.deepEqual(stored(), []);
});

test("score gardé : renvoyé au retour à l'écran, pas écran éteint", async () => {
  fresh();
  localStorage.setItem(WAITING_KEY, JSON.stringify([pending(600000)]));
  document.hidden = true;
  heard.visibilitychange();
  await flush();
  assert.equal(finishes.length, 0);
  document.hidden = false;
  heard.visibilitychange();
  await flush();
  assert.equal(finishes.length, 1);
});

test("score en cours d'envoi : pas de 2e envoi simultané, ni au retour réseau, ni au classement", async () => {
  fresh();
  let release;
  finish = () => new Promise((ok) => { release = () => ok(answer(200, RESULT)); });
  const sent = api.submitScore(800, "mobile", 0, Promise.resolve({ runId: "partie" }), () => {});
  await flush();
  heard.online();
  heard.visibilitychange();
  api.resumePending();
  await api.refreshBoard();
  await flush();
  assert.equal(finishes.length, 1);
  release();
  await sent;
  await flush();
  assert.equal(finishes.length, 1);
  assert.deepEqual(stored(), []);
});

test("plusieurs scores gardés : un seul à la fois, et on arrête dès que le réseau manque", async () => {
  fresh();
  localStorage.setItem(WAITING_KEY, JSON.stringify([pending(600000, "un"), pending(600000, "deux")]));
  finish = down;
  api.resumePending();
  await pass(125000);
  assert.deepEqual([...new Set(finishes.map((f) => f.path))], ["/api/runs/un"]);
  assert.equal(stored().length, 2);
  finish = () => answer(200, RESULT);
  heard.online();
  await flush();
  await flush();
  assert.deepEqual(finishes.slice(-2).map((f) => f.path), ["/api/runs/un", "/api/runs/deux"]);
  assert.deepEqual(stored(), []);
});

for (const status of [404, 409, 422]) {
  test(`réponse définitive du serveur (${status}) sur un score gardé : il est effacé`, async () => {
    fresh();
    localStorage.setItem(WAITING_KEY, JSON.stringify([pending(600000)]));
    finish = () => answer(status, { error: "Non." });
    await api.resumePending();
    assert.equal(finishes.length, 1);
    assert.deepEqual(stored(), []);
  });
}

test("score gardé sans clé en mémoire : on attend, un 401 l'effacerait", async () => {
  fresh();
  localStorage.setItem(WAITING_KEY, JSON.stringify([pending(600000)]));
  const token = api.net.token;
  api.net.token = null;
  await api.resumePending();
  assert.equal(finishes.length, 0);
  assert.equal(stored().length, 1);
  api.net.token = token;
  localStorage.removeItem(WAITING_KEY);
});
