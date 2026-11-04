import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { finishRun } = await import(new URL("../../src/routes/runs.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, TOKEN = "c".repeat(48), RUN = "partie";

async function setup(t) {
  t.mock.method(Date, "now", () => NOW);
  const DB = database();
  DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES ('lou', 'Lou', 'lou', 'jeton', 0)").run();
  DB.db.prepare("INSERT INTO sessions (token_hash, player_id, created_at) VALUES (?, 'lou', 0)").run(await sha256(TOKEN));
  DB.db.prepare("INSERT INTO events (id, name, opens_at, closes_at, created_at) VALUES (1, 'Soirée', ?, ?, 0)").run(NOW - 3600000, NOW + 3600000);
  DB.db.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES (?, 'lou', 1, ?)").run(RUN, NOW - 60000);
  return { DB, APP_VERSION: "dev", APP_PREVIOUS: "", LIVE: { idFromName: () => "ecrans", get: () => ({ tell: async () => {} }) } };
}

const send = (env, score) => finishRun({
  req: new Request("http://local/api/runs/" + RUN, { method: "POST", headers: { authorization: "Bearer " + TOKEN, "content-type": "application/json" }, body: JSON.stringify({ score }) }),
  env,
  params: [RUN],
});

const count = (env) => env.DB.db.prepare("SELECT p.run_count AS runs, p.played, e.run_count AS entered FROM profiles p JOIN entries e ON e.player_id = p.id").get();

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
