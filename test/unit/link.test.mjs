import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { useLink } = await import(new URL("../../src/routes/link.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);

const CODE = "ABCDEFGH", PHONE = "a".repeat(32), OTHER = "b".repeat(32);

async function setup() {
  const DB = database();
  DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES ('lou', 'Lou', 'lou', 'jeton', 0)").run();
  DB.db.prepare("INSERT INTO links (code_hash, player_id, expires_at) VALUES (?, 'lou', ?)").run(await sha256(CODE), Date.now() + 600000);
  return { DB, APP_VERSION: "dev", APP_PREVIOUS: "" };
}

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
