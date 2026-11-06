import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { collect } = await import(new URL("../../src/routes/errors.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, HOUR = 3600000, IP = "203.0.113.7", SESSION = "a".repeat(16);

function setup(t, rows = 0, age = 1000) {
  t.mock.method(Date, "now", () => NOW);
  const DB = database();
  const add = DB.db.prepare(
    `INSERT INTO client_errors (created_at, fingerprint, kind, message, source, stack, trail, device, count, session, page, version, platform, standalone, ua)
     VALUES (?, 'f', 'erreur', 'm', '', '', '', '', 1, ?, '', '', 'PC', 0, '')`,
  );
  for (let i = 0; i < rows; i++) add.run(NOW - age, "s" + i);
  return { DB, APP_VERSION: "test" };
}

const report = (env, count = 1) => collect({
  req: new Request("http://local/api/errors", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": IP },
    body: JSON.stringify({ session: SESSION, errors: Array.from({ length: count }, (_, i) => ({ kind: "erreur", message: "TypeError " + i })) }),
  }),
  env,
  params: [],
});

const rows = (env) => env.DB.db.prepare("SELECT COUNT(*) AS n FROM client_errors").get().n;

function limiter(ok = true) {
  const keys = [];
  return { keys, limit: async ({ key }) => (keys.push(key), { success: ok }) };
}

test("erreurs : 60 lignes dans l'heure, plafond atteint, rien d'écrit", async (t) => {
  const env = setup(t, 60);
  assert.equal((await report(env)).status, 429);
  assert.equal(rows(env), 60);
});

test("erreurs : proche du plafond, seules les lignes qui tiennent sont écrites", async (t) => {
  const env = setup(t, 58);
  assert.equal((await report(env, 5)).status, 200);
  assert.equal(rows(env), 60);
});

test("erreurs : les lignes de plus d'une heure ne comptent plus", async (t) => {
  const env = setup(t, 60, HOUR + 1);
  assert.equal((await report(env, 2)).status, 200);
  assert.equal(rows(env), 62);
});

test("erreurs : compté par IP avant la limite commune", async (t) => {
  const env = { ...setup(t), ERROR_IP_LIMIT: limiter(), ERROR_LIMIT: limiter() };
  assert.equal((await report(env)).status, 200);
  assert.deepEqual(env.ERROR_IP_LIMIT.keys, [IP]);
  assert.deepEqual(env.ERROR_LIMIT.keys, ["toutes"]);
});

test("erreurs : une IP trop bavarde est freinée sans entamer la limite de tout le monde", async (t) => {
  const env = { ...setup(t), ERROR_IP_LIMIT: limiter(false), ERROR_LIMIT: limiter() };
  assert.equal((await report(env)).status, 429);
  assert.deepEqual(env.ERROR_LIMIT.keys, []);
  assert.equal(rows(env), 0);
});

test("rapport trop gros sans content-length : refusé pendant la lecture, rien de gardé", async (t) => {
  const env = setup(t);
  const size = 70 * 1024, body = new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode("x".repeat(size)));
      c.close();
    },
  });
  const req = new Request("http://local/api/errors", { method: "POST", headers: { "cf-connecting-ip": IP }, body, duplex: "half" });
  const res = await collect({ req, env, params: [] });
  assert.equal(res.status, 413);
  assert.equal(rows(env), 0);
});
