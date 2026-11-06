import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { board, screen } = await import(new URL("../../src/routes/board.ts", import.meta.url).href);
const { finishRun } = await import(new URL("../../src/routes/runs.ts", import.meta.url).href);
const { eventRanking, generalRanking, forgetCaches } = await import(new URL("../../src/db.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, LOU = "c".repeat(48), MAX = "d".repeat(48);

function setup(t, withEvent = true) {
  forgetCaches();
  const clock = { now: NOW };
  t.mock.method(Date, "now", () => clock.now);
  const DB = database();
  if (withEvent) DB.db.prepare("INSERT INTO events (id, name, opens_at, closes_at, created_at) VALUES (1, 'Soirée', ?, ?, 0)").run(NOW - 3600000, NOW + 3600000);
  return { DB, clock, APP_VERSION: "dev", APP_PREVIOUS: "", LIVE: { idFromName: () => "ecrans", get: () => ({ tell: async () => {} }) } };
}

const add = (env, id, best = 0, at = null, pc = 0) =>
  env.DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at, best, best_at, pc_best, pc_best_at) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)").run(id, id, id, "jeton-" + id, best, at, pc, pc ? at : null);

const enter = (env, id, best, at) =>
  env.DB.db.prepare("INSERT INTO entries (event_id, player_id, best, best_at, run_count) VALUES (1, ?, ?, ?, 1)").run(id, best, at);

const sign = async (env, id, token) => env.DB.db.prepare("INSERT INTO sessions (token_hash, player_id, created_at) VALUES (?, ?, 0)").run(await sha256(token), id);

const run = (env, id, player) => env.DB.db.prepare("INSERT INTO runs (id, player_id, event_id, started_at) VALUES (?, ?, 1, ?)").run(id, player, NOW - 60000);

const ask = (token) => new Request("http://local/api/board", { headers: token ? { authorization: "Bearer " + token } : {} });
const read = async (env, token) => (await board({ req: ask(token), env })).json();

const finish = (env, id, token, score) => finishRun({
  req: new Request("http://local/api/runs/" + id, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify({ score }) }),
  env,
  params: [id],
});

const ids = (list) => list.map((r) => r.id);

test("soirée de plus de 1 000 joueurs : liste coupée à 1 000, nombre de joueurs exact, y compris après une partie", async (t) => {
  const env = setup(t);
  for (let i = 1; i <= 1001; i++) {
    add(env, "j" + i);
    enter(env, "j" + i, i + 1000, NOW - 1000);
  }
  add(env, "lou");
  await sign(env, "lou", LOU);
  run(env, "partie", "lou");
  assert.equal((await eventRanking(env, 1)).length, 1000);
  const before = await read(env);
  assert.equal(before.eventCount, 1001);
  assert.equal(before.eventTop.length, 50);
  const body = await (await finish(env, "partie", LOU, 5000)).json();
  assert.equal(body.eventRank, 1);
  assert.equal(body.eventCount >= 1001, true);
});

const showing = async (env, query = "") => (await screen({ req: new Request("http://local/api/ecran" + query), env })).json();

function counting(env) {
  const real = env.DB.prepare;
  const seen = { counts: 0, tops: 0 };
  env.DB.prepare = (sql) => {
    if (sql.includes("COUNT(*)")) seen.counts++;
    if (sql.includes("e.best DESC") && sql.includes("LIMIT ?2")) seen.tops++;
    return real(sql);
  };
  return seen;
}

test("écran géant : le nombre de joueurs vient de la liste en mémoire, le top 10 est relu à chaque fois", async (t) => {
  const env = setup(t);
  for (const id of ["lou", "max"]) {
    add(env, id);
    enter(env, id, 500, NOW - 1000);
  }
  const seen = counting(env);
  assert.equal((await showing(env)).count, 2);
  assert.equal((await showing(env)).count, 2);
  assert.equal(seen.counts, 0);
  assert.equal(seen.tops, 2);
});

test("écran géant : nombre de joueurs relu après 10 s", async (t) => {
  const env = setup(t);
  add(env, "lou");
  enter(env, "lou", 500, NOW - 1000);
  assert.equal((await showing(env)).count, 1);
  add(env, "max");
  enter(env, "max", 400, NOW - 500);
  assert.equal((await showing(env)).count, 1);
  env.clock.now += 10001;
  assert.equal((await showing(env)).count, 2);
});

test("classements : chaque ligne porte l'heure de son record", async (t) => {
  const env = setup(t);
  add(env, "lou", 500, 111, 400);
  enter(env, "lou", 300, 222);
  const b = await read(env);
  assert.equal(b.top[0].at, 111);
  assert.equal(b.pcTop[0].at, 111);
  assert.equal(b.eventTop[0].at, 222);
});

test("écran géant hors soirée : le 1er porte l'heure de son record, pour la garde « Nouveau n°1 »", async (t) => {
  const env = setup(t, false);
  add(env, "lou", 500, 111);
  assert.equal((await showing(env)).top[0].at, 111);
});

test("record monté en mémoire : la ligne garde son heure", async (t) => {
  const env = setup(t);
  add(env, "lou");
  await sign(env, "lou", LOU);
  run(env, "partie", "lou");
  add(env, "max", 100, 1);
  enter(env, "max", 100, 1);
  await read(env);
  await finish(env, "partie", LOU, 500);
  const b = await read(env);
  assert.equal(b.top[0].at, NOW);
  assert.equal(b.eventTop[0].at, NOW);
});

test("record pas encore dans la liste en mémoire : place, rival et nombre de joueurs sont justes, le cache n'est pas touché", async (t) => {
  const env = setup(t);
  add(env, "max", 400, 10, 400);
  enter(env, "max", 400, 10);
  add(env, "lou");
  await sign(env, "lou", LOU);
  await read(env);
  env.DB.db.prepare("UPDATE profiles SET best = 300, best_at = 20, pc_best = 500, pc_best_at = 20 WHERE id = 'lou'").run();
  enter(env, "lou", 300, 20);
  const { me, count, pcCount, eventCount } = await read(env, LOU);
  assert.deepEqual([me.rank, me.pcRank, me.eventRank], [2, 1, 2]);
  assert.deepEqual([count, pcCount, eventCount], [2, 2, 2]);
  assert.equal(me.rival.pseudo, "max");
  assert.equal(me.pcRival, null);
  assert.equal(me.eventRival.best, 400);
  const other = await read(env);
  assert.deepEqual(ids(other.top), ["max"]);
  assert.deepEqual(ids(other.eventTop), ["max"]);
});

for (const [at, place] of [[10, 1], [30, 2]]) {
  test(`record frais à égalité : le premier à avoir fait le temps passe devant (fait à ${at}, ${place}e)`, async (t) => {
    const env = setup(t);
    add(env, "max", 500, 20);
    enter(env, "max", 500, 20);
    add(env, "lou");
    await sign(env, "lou", LOU);
    await read(env);
    env.DB.db.prepare("UPDATE profiles SET best = 500, best_at = ? WHERE id = 'lou'").run(at);
    enter(env, "lou", 500, at);
    const { me } = await read(env, LOU);
    assert.deepEqual([me.rank, me.eventRank], [place, place]);
    assert.equal(me.rival?.pseudo, place === 1 ? undefined : "max");
  });
}

test("joueur retiré ou sans record : jamais inséré dans sa copie du classement", async (t) => {
  const env = setup(t);
  add(env, "lou", 500, 10);
  add(env, "max");
  await sign(env, "lou", LOU);
  await sign(env, "max", MAX);
  env.DB.db.prepare("UPDATE profiles SET banned = 1 WHERE id = 'lou'").run();
  const banned = await read(env, LOU);
  assert.equal(banned.me.rank, null);
  assert.equal(banned.count, 0);
  const empty = await read(env, MAX);
  assert.equal(empty.me.rank, null);
  assert.equal(empty.count, 0);
});

test("classement plein : un record frais après le 1 000e garde sa place comptée en base", async (t) => {
  const env = setup(t);
  for (let i = 1; i <= 1001; i++) add(env, "j" + i, 1000 + i, 5);
  add(env, "lou");
  await sign(env, "lou", LOU);
  await read(env);
  env.DB.db.prepare("UPDATE profiles SET best = 5, best_at = 20 WHERE id = 'lou'").run();
  const { me, top } = await read(env, LOU);
  assert.equal(me.rank, 1002);
  assert.ok(!top.some((r) => r.me));
});

function holdRead(env, marker) {
  let open;
  const gate = new Promise((ok) => (open = ok));
  const real = env.DB.prepare;
  env.DB.prepare = (sql) => {
    const statement = real(sql);
    if (!sql.includes(marker)) return statement;
    env.DB.prepare = real;
    return {
      bind: (...args) => {
        const bound = statement.bind(...args);
        return {
          all: async () => {
            const out = await bound.all();
            await gate;
            return out;
          },
        };
      },
    };
  };
  return open;
}

const shortly = () => new Promise((ok) => setTimeout(ok, 5));

test("lecture de la soirée en vol pendant un record : la réponse garde le record et sa place", async (t) => {
  const env = setup(t);
  add(env, "max", 100, 1);
  enter(env, "max", 200, 1);
  add(env, "lou");
  await sign(env, "lou", LOU);
  run(env, "partie", "lou");
  const release = holdRead(env, "e.player_id AS id");
  void eventRanking(env, 1);
  const done = finish(env, "partie", LOU, 500);
  await shortly();
  release();
  const body = await (await done).json();
  assert.equal(body.eventImproved, true);
  assert.equal(body.eventRank, 1);
  assert.equal(body.eventCount, 2);
});

test("lecture du général en vol pendant un record : la réponse garde le record et sa place", async (t) => {
  const env = setup(t);
  add(env, "max", 200, 1);
  add(env, "lou");
  await sign(env, "lou", LOU);
  run(env, "partie", "lou");
  const release = holdRead(env, "FROM profiles WHERE banned = 0 AND best > 0");
  void generalRanking(env);
  const done = finish(env, "partie", LOU, 100);
  await shortly();
  release();
  const body = await (await done).json();
  assert.equal(body.improved, true);
  assert.equal(body.rank, 2);
  assert.equal(body.rival.pseudo, "max");
});

test("renvoi d'un score : l'ordre des égalités en mémoire ne change pas", async (t) => {
  const env = setup(t);
  for (const [id, token] of [["lou", LOU], ["max", MAX]]) {
    add(env, id);
    await sign(env, id, token);
    run(env, "partie-" + id, id);
  }
  await read(env);
  await finish(env, "partie-lou", LOU, 500);
  env.clock.now += 1000;
  await finish(env, "partie-max", MAX, 500);
  await finish(env, "partie-lou", LOU, 500);
  const b = await read(env);
  assert.deepEqual(ids(b.top), ["lou", "max"]);
  assert.deepEqual(ids(b.eventTop), ["lou", "max"]);
});
