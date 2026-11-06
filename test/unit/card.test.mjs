import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { card } = await import(new URL("../../src/routes/card.ts", import.meta.url).href);
const { forgetCaches } = await import(new URL("../../src/db.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, SECOND = 1000, MINUTE = 60 * SECOND;

function setup(t, closedFor) {
  forgetCaches();
  const clock = { now: NOW };
  t.mock.method(Date, "now", () => clock.now);
  const DB = database();
  DB.db.prepare("INSERT INTO events (id, name, opens_at, closes_at, created_at) VALUES (1, 'Soirée', ?, ?, 0)").run(NOW - 3600000, NOW - closedFor);
  DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at, best, best_at) VALUES ('lou', 'Lou', 'lou', 'jeton', 0, 500, 1)").run();
  DB.db.prepare("INSERT INTO entries (event_id, player_id, best, best_at, run_count) VALUES (1, 'lou', 500, 1, 1)").run();
  const env = { DB, clock, reads: 0 };
  const real = DB.prepare;
  DB.prepare = (sql) => {
    if (sql.includes("ORDER BY e.best DESC")) env.reads++;
    return real(sql);
  };
  return env;
}

const open = async (env) => {
  const r = await card({ req: new Request("http://local/api/players/lou"), env, params: ["lou"] });
  assert.equal(r.status, 200);
  return r.json();
};

test("fiche : classement d'une soirée fermée depuis plus de 1 min gardé 10 min en mémoire", async (t) => {
  const env = setup(t, 5 * MINUTE);
  assert.equal((await open(env)).eventBest.place, 1);
  env.clock.now += 11 * SECOND;
  await open(env);
  env.clock.now += 9 * MINUTE;
  await open(env);
  assert.equal(env.reads, 1);
  env.clock.now += 2 * MINUTE;
  await open(env);
  assert.equal(env.reads, 2);
});

test("fiche : soirée fermée depuis moins de 1 min, classement relu toutes les 10 s", async (t) => {
  const env = setup(t, 30 * SECOND);
  await open(env);
  env.clock.now += 11 * SECOND;
  await open(env);
  assert.equal(env.reads, 2);
});

test("fiche : un changement admin vide aussi le classement gardé 10 min", async (t) => {
  const env = setup(t, 5 * MINUTE);
  await open(env);
  forgetCaches();
  await open(env);
  assert.equal(env.reads, 2);
});
