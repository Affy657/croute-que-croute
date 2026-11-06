import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { finishRun, startRun } = await import(new URL("../../src/routes/runs.ts", import.meta.url).href);
const { mergeInto } = await import(new URL("../../src/routes/link.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);
const { forgetCaches } = await import(new URL("../../src/db.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, TOKEN = "c".repeat(48), RUN = "partie", IP = "203.0.113.7";
const clock = { now: NOW };

async function setup(t) {
  forgetCaches();
  clock.now = NOW;
  t.mock.method(Date, "now", () => clock.now);
  const DB = database();
  DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES ('lou', 'Lou', 'lou', 'jeton', 0)").run();
  DB.db.prepare("INSERT INTO sessions (token_hash, player_id, created_at) VALUES (?, 'lou', 0)").run(await sha256(TOKEN));
  DB.db.prepare("INSERT INTO events (id, name, opens_at, closes_at, created_at) VALUES (1, 'Soirée', ?, ?, 0)").run(NOW - 3600000, NOW + 3600000);
  DB.db.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES (?, 'lou', 1, ?)").run(RUN, NOW - 60000);
  return { DB, APP_VERSION: "dev", APP_PREVIOUS: "", LIVE: { idFromName: () => "ecrans", get: () => ({ tell: async () => {} }) } };
}

const send = (env, score, extra = {}, run = RUN) => finishRun({
  req: new Request("http://local/api/runs/" + run, { method: "POST", headers: { authorization: "Bearer " + TOKEN, "content-type": "application/json" }, body: JSON.stringify({ score, ...extra }) }),
  env,
  params: [run],
});

const count = (env) => env.DB.db.prepare("SELECT p.run_count AS runs, p.played, e.run_count AS entered FROM profiles p JOIN entries e ON e.player_id = p.id").get();

const start = (env) => startRun({
  req: new Request("http://local/api/runs", { method: "POST", headers: { authorization: "Bearer " + TOKEN, "content-type": "application/json", "x-app-version": "dev", "cf-connecting-ip": IP }, body: "{}" }),
  env,
  params: [],
});

function limiter(ok = true) {
  const keys = [];
  return { keys, limit: async ({ key }) => (keys.push(key), { success: ok }) };
}

test("départ de partie : compté par joueur et par IP, sans toucher à la limite de la tenue", async (t) => {
  const env = await setup(t);
  Object.assign(env, { START_LIMIT: limiter(), START_IP_LIMIT: limiter(), RUN_LIMIT: limiter(false) });
  assert.equal((await start(env)).status, 201);
  assert.deepEqual(env.START_LIMIT.keys, ["lou"]);
  assert.deepEqual(env.START_IP_LIMIT.keys, [IP]);
  assert.deepEqual(env.RUN_LIMIT.keys, []);
});

test("départ de partie : freiné par joueur, l'IP du lieu n'est pas consommée", async (t) => {
  const env = await setup(t);
  Object.assign(env, { START_LIMIT: limiter(false), START_IP_LIMIT: limiter() });
  assert.equal((await start(env)).status, 429);
  assert.deepEqual(env.START_IP_LIMIT.keys, []);
});

test("départ de partie : freiné par IP", async (t) => {
  const env = await setup(t);
  Object.assign(env, { START_LIMIT: limiter(), START_IP_LIMIT: limiter(false) });
  assert.equal((await start(env)).status, 429);
});

test("score : envoyé deux fois à la même milliseconde, la partie compte une seule fois", async (t) => {
  const env = await setup(t);
  let release, arrived = 0;
  const second = new Promise((ok) => (release = ok));
  env.DB.before = async () => {
    if (++arrived === 2) release();
    await second;
  };
  const both = await Promise.all([send(env, 110), send(env, 110)]);
  assert.deepEqual(both.map((r) => r.status), [200, 200]);
  for (const r of both) {
    const body = await r.json();
    assert.equal(body.best, 110);
    assert.equal(body.improved, true);
    assert.equal(body.eventImproved, true);
  }
  assert.deepEqual({ ...count(env) }, { runs: 1, played: 110, entered: 1 });
});

test("score : un envoi normal compte la partie, le renvoi ne change rien", async (t) => {
  const env = await setup(t);
  assert.equal((await send(env, 110)).status, 200);
  assert.equal((await send(env, 110)).status, 200);
  assert.deepEqual({ ...count(env) }, { runs: 1, played: 110, entered: 1 });
  assert.equal(env.DB.db.prepare("SELECT finished_at FROM runs").get().finished_at, NOW);
});

test("partie PC pendant une soirée : les généraux gardent leurs 60 s en mémoire", async (t) => {
  const env = await setup(t);
  env.DB.db.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES ('deux', 'lou', 1, ?)").run(NOW - 60000);
  const real = env.DB.prepare;
  let reads = 0;
  env.DB.prepare = (sql) => {
    if (sql.includes("best > 0 ORDER BY")) reads++;
    return real(sql);
  };
  assert.equal((await send(env, 100, { device: "pc" })).status, 200);
  const first = reads;
  clock.now += 30000;
  assert.equal((await send(env, 90, { device: "pc" }, "deux")).status, 200);
  assert.equal(reads, first);
});

function mergedDuring(env) {
  env.DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES ('max', 'Max', 'max', 'jeton-max', 0)").run();
  let done = false;
  env.DB.before = async (list) => {
    if (done || !list.some((s) => s.sql.startsWith("UPDATE runs SET finished_at"))) return;
    done = true;
    await mergeInto(env, "max", "lou");
  };
}

const theRun = (env) => env.DB.db.prepare("SELECT player_id, finished_at, score FROM runs WHERE id = ?").get(RUN);

for (const [name, extra, field] of [["téléphone en soirée", {}, "best"], ["PC", { device: "pc" }, "pcBest"]]) {
  test(`compte fusionné pendant l'envoi (${name}) : 503, partie pas finie, le renvoi compte sur le compte gardé`, async (t) => {
    const env = await setup(t);
    mergedDuring(env);
    const lost = await send(env, 110, extra);
    assert.equal(lost.status, 503);
    assert.equal(theRun(env).finished_at, null);
    assert.equal(env.DB.db.prepare("SELECT COUNT(*) AS n FROM entries").get().n, 0);
    const again = await send(env, 110, extra);
    assert.equal(again.status, 200);
    assert.equal((await again.json())[field], 110);
    assert.deepEqual({ ...theRun(env) }, { player_id: "max", finished_at: NOW, score: 110 });
    assert.equal(env.DB.db.prepare("SELECT run_count FROM profiles WHERE id = 'max'").get().run_count, 1);
  });
}

test("double envoi de la même partie : le perdant retrouve la partie finie, sans 503", async (t) => {
  const env = await setup(t);
  let first = true;
  env.DB.before = async (list) => {
    if (!first || !list.some((s) => s.sql.startsWith("UPDATE runs SET finished_at"))) return;
    first = false;
    assert.equal((await send(env, 110)).status, 200);
  };
  const r = await send(env, 110);
  assert.equal(r.status, 200);
  assert.deepEqual({ ...count(env) }, { runs: 1, played: 110, entered: 1 });
});

for (const [ago, counted, name] of [[60000, false, "1 min après la fin : hors soirée"], [16000, false, "16 s après la fin : hors soirée"], [5000, true, "5 s après la fin : compte, c'est la marge réseau"]]) {
  test(`score reçu ${name}`, async (t) => {
    const env = await setup(t);
    env.DB.db.prepare("UPDATE events SET closes_at = ?").run(NOW - ago);
    const body = await (await send(env, 110)).json();
    assert.equal(body.eventBest, counted ? 110 : null);
    assert.equal(body.eventImproved, counted);
    assert.equal(body.best, 110);
  });
}

const kept = (env) => env.DB.db.prepare("SELECT p.best_elapsed AS best, p.pc_best_elapsed AS pc, e.best_elapsed AS entry FROM profiles p LEFT JOIN entries e ON e.player_id = p.id").get();

test("score envoyé tard : l'attente ne compte pas dans le temps gardé, partout", async (t) => {
  const env = await setup(t);
  assert.equal((await send(env, 1000, { waited: 40000 })).status, 200);
  assert.deepEqual({ ...kept(env) }, { best: 20000, pc: null, entry: 20000 });
});

test("score envoyé tard sur PC : l'attente ne compte pas non plus", async (t) => {
  const env = await setup(t);
  assert.equal((await send(env, 1000, { waited: 40000, device: "pc" })).status, 200);
  assert.equal(kept(env).pc, 20000);
});

test("score envoyé tard : le temps gardé ne descend pas sous le score", async (t) => {
  const env = await setup(t);
  assert.equal((await send(env, 1000, { waited: 12 * 3600 * 1000 })).status, 200);
  assert.equal(kept(env).best, 10000);
});

for (const waited of [-1, 1.5, "40000", 12 * 3600 * 1000 + 1, null]) {
  test(`score envoyé tard : attente invalide (${waited}) comptée pour 0`, async (t) => {
    const env = await setup(t);
    assert.equal((await send(env, 1000, { waited })).status, 200);
    assert.equal(kept(env).best, 60000);
  });
}

test("score envoyé tard : le contrôle du score reste sur le temps réel", async (t) => {
  const env = await setup(t);
  assert.equal((await send(env, 8000, { waited: 1000 })).status, 422);
  assert.equal((await send(env, 2000, { waited: 59000 })).status, 200);
});
