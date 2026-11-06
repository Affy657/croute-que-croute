import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { board } = await import(new URL("../../src/routes/board.ts", import.meta.url).href);
const { finishRun } = await import(new URL("../../src/routes/runs.ts", import.meta.url).href);
const { eventRanking, forgetCaches } = await import(new URL("../../src/db.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, LOU = "c".repeat(48);

function setup(t) {
  forgetCaches();
  const clock = { now: NOW };
  t.mock.method(Date, "now", () => clock.now);
  const DB = database();
  DB.db.prepare("INSERT INTO events (id, name, opens_at, closes_at, created_at) VALUES (1, 'Soirée', ?, ?, 0)").run(NOW - 3600000, NOW + 3600000);
  return { DB, clock, APP_VERSION: "dev", APP_PREVIOUS: "", LIVE: { idFromName: () => "ecrans", get: () => ({ tell: async () => {} }) } };
}

const add = (env, id, best = 0, at = null, pc = 0) =>
  env.DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at, best, best_at, pc_best, pc_best_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)").run(id, id, id, "jeton-" + id, best, at, pc, pc ? at : null);

const enter = (env, id, best, at) =>
  env.DB.db.prepare("INSERT INTO entries (event_id, player_id, best, best_at, run_count) VALUES (1, ?, ?, ?, 1)").run(id, best, at);

const sign = async (env, id, token) => env.DB.db.prepare("INSERT INTO sessions (token_hash, player_id, created_at) VALUES (?, ?, 0)").run(await sha256(token), id);

const ask = (token) => new Request("http://local/api/board", { headers: token ? { authorization: "Bearer " + token } : {} });
const read = async (env, token) => (await board({ req: ask(token), env })).json();

test("soirée de plus de 1 000 joueurs : liste coupée à 1 000, nombre de joueurs exact, y compris après une partie", async (t) => {
  const env = setup(t);
  for (let i = 1; i <= 1001; i++) {
    add(env, "j" + i);
    enter(env, "j" + i, i + 1000, NOW - 1000);
  }
  add(env, "lou");
  await sign(env, "lou", LOU);
  env.DB.db.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES ('partie', 'lou', 1, ?)").run(NOW - 60000);
  assert.equal((await eventRanking(env, 1)).length, 1000);
  const before = await read(env);
  assert.equal(before.eventCount, 1001);
  assert.equal(before.eventTop.length, 50);
  const done = await finishRun({
    req: new Request("http://local/api/runs/partie", { method: "POST", headers: { authorization: "Bearer " + LOU, "content-type": "application/json" }, body: JSON.stringify({ score: 5000 }) }),
    env,
    params: ["partie"],
  });
  const body = await done.json();
  assert.equal(body.eventRank, 1);
  assert.equal(body.eventCount >= 1001, true);
});
