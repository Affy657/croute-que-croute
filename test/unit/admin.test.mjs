import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { updateEvent } = await import(new URL("../../src/routes/admin.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, HOUR = 3600000;

function setup(t, closesAt = NOW + HOUR) {
  t.mock.method(Date, "now", () => NOW);
  const DB = database();
  DB.db.prepare("INSERT INTO events (id, name, opens_at, closes_at, created_at) VALUES (1, 'Soirée', ?, ?, 0)").run(NOW - HOUR, closesAt);
  return { DB, LIVE: { idFromName: () => "ecrans", get: () => ({ tell: async () => {} }) } };
}

const change = (env, body) => updateEvent({
  req: new Request("http://local/api/admin/events/current", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }),
  env,
  params: [],
});

const closes = (env) => env.DB.db.prepare("SELECT closes_at FROM events").get().closes_at;

test("soirée : une fin déjà passée est ramenée à maintenant, la marge de 15 s tient", async (t) => {
  const env = setup(t);
  assert.equal((await change(env, { closesAt: NOW - 59000 })).status, 200);
  assert.equal(closes(env), NOW);
});

test("soirée : une fin dans le futur reste telle quelle", async (t) => {
  const env = setup(t);
  assert.equal((await change(env, { closesAt: NOW + 5000 })).status, 200);
  assert.equal(closes(env), NOW + 5000);
});

test("soirée : une fin passée avant le début reste refusée", async (t) => {
  const env = setup(t);
  assert.equal((await change(env, { opensAt: NOW - 1000, closesAt: NOW - 2000 })).status, 400);
  assert.equal(closes(env), NOW + HOUR);
});

test("soirée fermée : la modifier répond 404, rien ne change", async (t) => {
  const env = setup(t, NOW - 1000);
  assert.equal((await change(env, { name: "Trop tard", closesAt: NOW + HOUR })).status, 404);
  assert.equal(closes(env), NOW - 1000);
  assert.equal(env.DB.db.prepare("SELECT name FROM events").get().name, "Soirée");
});
