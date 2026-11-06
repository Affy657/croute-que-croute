import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { join } = await import(new URL("../../src/routes/player.ts", import.meta.url).href);
const { forgetCaches } = await import(new URL("../../src/db.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, HOUR = 3600000, PHONE = "a".repeat(32), OTHER = "b".repeat(32);

function setup(t, joined, age = 1000) {
  forgetCaches();
  t.mock.method(Date, "now", () => NOW);
  const DB = database();
  const add = DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES (?, ?, ?, ?, ?)");
  for (let i = 0; i < joined; i++) add.run("p" + i, "Joueur" + i, "joueur" + i, "jeton" + i, NOW - age);
  return { DB, APP_VERSION: "dev", APP_PREVIOUS: "", LIVE: { idFromName: () => "ecrans", get: () => ({ tell: async () => {} }) } };
}

const ask = (env, pseudo, clientId = OTHER) => join({
  req: new Request("http://local/api/join", { method: "POST", headers: { "content-type": "application/json", "x-app-version": "dev" }, body: JSON.stringify({ pseudo, clientId }) }),
  env,
});

const created = (env) => env.DB.db.prepare("SELECT COUNT(*) AS n FROM profiles").get().n;

test("nouveaux comptes : au 500e de l'heure, le suivant est freiné avec le message habituel", async (t) => {
  const env = setup(t, 500);
  const r = await ask(env, "Neuf");
  assert.equal(r.status, 429);
  assert.match((await r.json()).error, /Doucement/);
  assert.equal(created(env), 500);
});

test("nouveaux comptes : juste sous le plafond, l'inscription passe", async (t) => {
  const env = setup(t, 499);
  assert.equal((await ask(env, "Neuf")).status, 201);
  assert.equal(created(env), 500);
});

test("nouveaux comptes : ceux de plus d'une heure ne comptent plus", async (t) => {
  const env = setup(t, 500, HOUR + 1);
  assert.equal((await ask(env, "Neuf")).status, 201);
});

test("nouveaux comptes : plafond atteint, un joueur qui retrouve son pseudo sur son téléphone passe", async (t) => {
  const env = setup(t, 500);
  env.DB.db.prepare("INSERT INTO sessions (token_hash, player_id, client_hash, created_at) VALUES ('ancienne', 'p0', ?, 0)").run(await sha256(PHONE));
  const r = await ask(env, "Joueur0", PHONE);
  assert.equal(r.status, 200);
  assert.equal((await r.json()).pseudo, "Joueur0");
});

test("nouveaux comptes : le plafond n'est relu en base qu'une fois par 10 s", async (t) => {
  const env = setup(t, 500);
  const real = env.DB.prepare;
  let reads = 0;
  env.DB.prepare = (sql) => {
    if (sql.includes("profiles_joined")) reads++;
    return real(sql);
  };
  assert.equal((await ask(env, "Neuf")).status, 429);
  assert.equal((await ask(env, "Neuve")).status, 429);
  assert.equal(reads, 1);
});
