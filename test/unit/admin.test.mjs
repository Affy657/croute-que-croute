import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { updateEvent, createEvent, deleteEvent, players, ban, removeFromEvent } = await import(new URL("../../src/routes/admin.ts", import.meta.url).href);

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

function planned(t, opensAt = NOW + HOUR, closesAt = NOW + 2 * HOUR) {
  t.mock.method(Date, "now", () => NOW);
  const DB = database();
  DB.db.prepare("INSERT INTO events (id, name, opens_at, closes_at, created_at) VALUES (1, 'Soirée', ?, ?, 0)").run(opensAt, closesAt);
  const env = { DB, told: 0 };
  env.LIVE = { idFromName: () => "ecrans", get: () => ({ tell: async () => void env.told++ }) };
  return env;
}

const drop = (env, id = "1") => deleteEvent({ req: new Request("http://local/api/admin/events/" + id, { method: "DELETE" }), env, params: [id] });
const left = (env) => env.DB.db.prepare("SELECT COUNT(*) AS n FROM events").get().n;
const profile = (env, id, extra = {}) => {
  const row = { best: 0, best_at: null, pc_best: 0, pc_best_at: null, run_count: 0, banned: 0, ...extra };
  env.DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at, best, best_at, pc_best, pc_best_at, run_count, banned) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)")
    .run(id, id, id.toLowerCase(), "jeton-" + id, row.best, row.best_at, row.pc_best, row.pc_best_at, row.run_count, row.banned);
};

test("soirée prévue : supprimée, l'écran géant est prévenu", async (t) => {
  const env = planned(t);
  assert.equal((await drop(env)).status, 200);
  assert.equal(left(env), 0);
  assert.equal(env.told, 1);
});

test("soirée ouverte ou finie : jamais supprimée, le message dit quoi faire", async (t) => {
  for (const [opensAt, closesAt, said] of [[NOW - HOUR, NOW + HOUR, /fin à maintenant/], [NOW, NOW + HOUR, /fin à maintenant/], [NOW - 2 * HOUR, NOW - HOUR, /finie/]]) {
    const env = planned(t, opensAt, closesAt);
    const res = await drop(env);
    assert.equal(res.status, 409);
    assert.match((await res.json()).error, said);
    assert.equal(left(env), 1);
    assert.equal(env.told, 0);
  }
});

test("soirée prévue qui a déjà des parties ou des joueurs (début repoussé) : pas supprimée", async (t) => {
  let env = planned(t);
  profile(env, "Lou");
  env.DB.db.prepare("INSERT INTO entries (event_id, player_id, removed) VALUES (1, 'Lou', 1)").run();
  assert.equal((await drop(env)).status, 409);
  assert.equal(left(env), 1);
  env = planned(t);
  profile(env, "Max");
  env.DB.db.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES ('partie', 'Max', 1, ?)").run(NOW - HOUR);
  assert.equal((await drop(env)).status, 409);
  assert.equal(left(env), 1);
});

test("soirée inconnue : 404, rien n'est supprimé", async (t) => {
  const env = planned(t);
  assert.equal((await drop(env, "9")).status, 404);
  assert.equal((await drop(env, "current")).status, 404);
  assert.equal(left(env), 1);
});

test("nouvelle soirée refusée : le message dit quoi faire de celle qui bloque", async (t) => {
  const create = (env) => createEvent({
    req: new Request("http://local/api/admin/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: "Autre", closesAt: NOW + 5 * HOUR }) }),
    env,
  });
  let res = await create(planned(t));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /supprime-la/);
  res = await create(planned(t, NOW - HOUR, NOW + HOUR));
  assert.equal(res.status, 409);
  assert.match((await res.json()).error, /fin à maintenant/);
});

const listed = async (env, scope) => (await players({ req: new Request("http://local/api/admin/players" + (scope ? "?scope=" + scope : "")), env })).json();

test("admin, onglets Mobile et PC : tout le classement au-delà de 300, compteurs de l'onglet, heure du serveur", async (t) => {
  const env = planned(t, NOW - 3 * HOUR, NOW - 2 * HOUR);
  for (let i = 0; i < 305; i++) profile(env, "Mobile" + i, { best: 10000 - i, best_at: NOW - 1000, run_count: 2 });
  profile(env, "Bureau", { best: 500, best_at: NOW - 1000, pc_best: 9000, pc_best_at: NOW - 1000, run_count: 3 });
  profile(env, "Retire", { best: 800, best_at: NOW - 1000, run_count: 1, banned: 1 });
  const run = env.DB.db.prepare("INSERT INTO runs (id, player_id, started_at, finished_at, score, device) VALUES (?, 'Bureau', 0, ?, 100, ?)");
  run.run("pc1", 1, "pc");
  run.run("pc2", 2, "pc");
  run.run("tel", 3, "mobile");
  run.run("pc-en-cours", null, "pc");
  const mobile = await listed(env, "general");
  assert.equal(mobile.now, NOW);
  assert.equal(mobile.players.filter((p) => !p.banned).length, 306);
  assert.ok(mobile.players.some((p) => p.pseudo === "Mobile304"));
  assert.deepEqual(mobile.stats, { players: 307, runs: 305 * 2 + 3 + 1 - 2 });
  const pc = await listed(env, "pc");
  assert.deepEqual(pc.players.map((p) => p.pseudo), ["Bureau", "Retire"]);
  assert.deepEqual(pc.stats, { players: 1, runs: 2 });
});

test("admin, onglet Soirée : joueurs qui y ont joué et leurs parties, retirés compris", async (t) => {
  const env = planned(t, NOW - HOUR, NOW + HOUR);
  for (const id of ["Lou", "Max", "Zoe"]) profile(env, id);
  const enter = env.DB.db.prepare("INSERT INTO entries (event_id, player_id, best, best_at, run_count, removed) VALUES (1, ?, ?, ?, ?, ?)");
  enter.run("Lou", 900, NOW - 1000, 4, 0);
  enter.run("Max", 700, NOW - 1000, 2, 1);
  enter.run("Zoe", 0, null, 0, 1);
  const data = await listed(env);
  assert.equal(data.scope, "event");
  assert.equal(data.now, NOW);
  assert.deepEqual(data.stats, { players: 2, runs: 6 });
});

test("retirer ou réintégrer sans dire lequel : 400, rien ne change", async (t) => {
  const env = planned(t, NOW - HOUR, NOW + HOUR);
  profile(env, "Lou", { banned: 1 });
  const banned = () => env.DB.db.prepare("SELECT banned FROM profiles WHERE id = 'Lou'").get().banned;
  const send = (body) => ban({ req: new Request("http://local/api/admin/players/Lou/ban", { method: "POST", headers: { "content-type": "application/json" }, body }), env, params: ["Lou"] });
  for (const body of ["", "{}", '{"banned":"false"}', '{"banned":0}']) {
    assert.equal((await send(body)).status, 400, body);
    assert.equal(banned(), 1, body);
  }
  assert.equal((await send('{"banned":false}')).status, 200);
  assert.equal(banned(), 0);
  env.DB.db.prepare("INSERT INTO entries (event_id, player_id, removed) VALUES (1, 'Lou', 1)").run();
  const out = (body) => removeFromEvent({ req: new Request("http://local/api/admin/players/Lou/soiree", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), env, params: ["Lou"] });
  assert.equal((await out({ event: 1 })).status, 400);
  assert.equal((await out({ event: 1, removed: "non" })).status, 400);
  assert.equal(env.DB.db.prepare("SELECT removed FROM entries WHERE player_id = 'Lou'").get().removed, 1);
});
