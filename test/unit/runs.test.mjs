import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { finishRun, startRun } = await import(new URL("../../src/routes/runs.ts", import.meta.url).href);
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
