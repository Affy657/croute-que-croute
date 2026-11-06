import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { useLink } = await import(new URL("../../src/routes/link.ts", import.meta.url).href);
const { merge } = await import(new URL("../../src/routes/admin.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);

const CODE = "ABCDEFGH", PHONE = "a".repeat(32), OTHER = "b".repeat(32), MAX = "e".repeat(48);

async function setup() {
  const DB = database();
  DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES ('lou', 'Lou', 'lou', 'jeton', 0)").run();
  DB.db.prepare("INSERT INTO links (code_hash, player_id, expires_at) VALUES (?, 'lou', ?)").run(await sha256(CODE), Date.now() + 600000);
  const env = { DB, APP_VERSION: "dev", APP_PREVIOUS: "", told: 0 };
  env.LIVE = { idFromName: () => "ecrans", get: () => ({ tell: async () => void env.told++ }) };
  return env;
}

async function withMax(env, runs) {
  env.DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES ('max', 'Max', 'max', 'jeton-max', 0)").run();
  env.DB.db.prepare("INSERT INTO sessions (token_hash, player_id, created_at) VALUES (?, 'max', 0)").run(await sha256(MAX));
  const add = env.DB.db.prepare("INSERT INTO runs (id, player_id, started_at) VALUES (?, 'max', 0)");
  for (let i = 0; i < runs; i++) add.run("partie" + i);
}

const merging = () => new Request("http://local/api/link", {
  method: "POST",
  headers: { "content-type": "application/json", "x-app-version": "dev", authorization: "Bearer " + MAX },
  body: JSON.stringify({ code: CODE, merge: true }),
});
const runsOf = (env, id) => env.DB.db.prepare("SELECT COUNT(*) AS n FROM runs WHERE player_id = ?").get(id).n;

const ask = (code, clientId) => new Request("http://local/api/link", {
  method: "POST",
  headers: { "content-type": "application/json", "x-app-version": "dev" },
  body: JSON.stringify({ code, clientId }),
});
const opens = (list) => list.some((s) => s.sql.includes("INSERT INTO sessions"));
const known = async (env, token) => !!env.DB.db.prepare("SELECT 1 FROM sessions WHERE token_hash = ?").get(await sha256(token));

test("code de liaison : après une erreur de la base pendant « Connecter », le même appareil peut réessayer", async () => {
  const env = await setup();
  let broken = true;
  env.DB.before = (list) => {
    if (broken && opens(list)) {
      broken = false;
      throw new Error("base indisponible");
    }
  };
  await assert.rejects(useLink({ req: ask(CODE, PHONE), env }));
  const r = await useLink({ req: ask(CODE, PHONE), env });
  assert.equal(r.status, 200);
  assert.ok(await known(env, (await r.json()).token));
});

test("code de liaison : après une erreur de la base, le code redevient utilisable par un autre appareil", async () => {
  const env = await setup();
  let broken = true;
  env.DB.before = (list) => {
    if (broken && opens(list)) {
      broken = false;
      throw new Error("base indisponible");
    }
  };
  await assert.rejects(useLink({ req: ask(CODE, PHONE), env }));
  assert.equal((await useLink({ req: ask(CODE, OTHER), env })).status, 200);
});

test("code de liaison : un réessai qui croise une première demande lente garde la clé reçue par l'appareil", async () => {
  const env = await setup();
  let open, arrived, first = true;
  const gate = new Promise((ok) => (open = ok)), atGate = new Promise((ok) => (arrived = ok));
  env.DB.before = async (list) => {
    if (first && opens(list)) {
      first = false;
      arrived();
      await gate;
    }
  };
  const clock = Date.now;
  let t = clock();
  Date.now = () => t;
  try {
    const slow = useLink({ req: ask(CODE, PHONE), env });
    await atGate;
    t += 5000;
    const kept = await (await useLink({ req: ask(CODE, PHONE), env })).json();
    open();
    await slow;
    assert.ok(await known(env, kept.token));
  } finally {
    Date.now = clock;
  }
});

test("fusion côté joueur : au-delà de 2 000 parties, refusée vers un admin, code gardé, rien de déplacé", async () => {
  const env = await setup();
  await withMax(env, 2001);
  const r = await useLink({ req: merging(), env });
  assert.equal(r.status, 403);
  assert.match((await r.json()).error, /admin/);
  assert.equal(runsOf(env, "max"), 2001);
  assert.ok(env.DB.db.prepare("SELECT 1 FROM links WHERE code_hash = ?").get(await sha256(CODE)));
});

test("fusion côté joueur : à 2 000 parties, elle passe", async () => {
  const env = await setup();
  await withMax(env, 2000);
  assert.equal((await useLink({ req: merging(), env })).status, 200);
  assert.equal(runsOf(env, "lou"), 2000);
});

test("fusion du propriétaire : pas de plafond de parties", async () => {
  const env = await setup();
  await withMax(env, 2001);
  const req = new Request("http://local/api/admin/merge", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keep: "Lou", from: "Max", confirm: true }) });
  assert.equal((await merge({ req, env })).status, 200);
  assert.equal(runsOf(env, "lou"), 2001);
});
