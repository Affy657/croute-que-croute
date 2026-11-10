import { test } from "node:test";
import assert from "node:assert/strict";
import { database } from "./d1.mjs";

const { start, back, unlink } = await import(new URL("../../src/routes/google.ts", import.meta.url).href);
const { mergeInto, logoutOthers } = await import(new URL("../../src/routes/link.ts", import.meta.url).href);
const { sha256 } = await import(new URL("../../src/security.ts", import.meta.url).href);

const NOW = 1_800_000_000_000, TOKEN = "d".repeat(48), PHONE = "a".repeat(32), CLIENT = "client.apps";
const SUB = "1234567890", MAIL = "lou@gmail.test";

async function setup(t) {
  t.mock.method(Date, "now", () => NOW);
  const DB = database();
  for (const id of ["lou", "max"]) DB.db.prepare("INSERT INTO profiles (id, pseudo, pseudo_key, token, created_at) VALUES (?, ?, ?, ?, 0)").run(id, id, id, "jeton-" + id);
  DB.db.prepare("INSERT INTO sessions (token_hash, player_id, created_at) VALUES (?, 'lou', 0)").run(await sha256(TOKEN));
  return { DB, APP_VERSION: "dev", APP_PREVIOUS: "", GOOGLE_CLIENT_ID: CLIENT, GOOGLE_CLIENT_SECRET: "secret" };
}

const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
const idToken = (claims = {}) => `${encode({ alg: "RS256" })}.${encode({ sub: SUB, aud: CLIENT, iss: "https://accounts.google.com", exp: NOW / 1000 + 3600, email: MAIL, ...claims })}.signature`;

function google(t, claims) {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, init) => {
    calls.push({ url: String(url), body: String(init.body) });
    return Response.json({ id_token: idToken(claims) });
  });
  return calls;
}

const post = (body, token) => new Request("http://jeu.test/api/google/start", {
  method: "POST",
  headers: { "content-type": "application/json", "x-app-version": "dev", ...(token ? { authorization: "Bearer " + token } : {}) },
  body: JSON.stringify(body),
});

async function begin(env, link = false) {
  const res = await start({ req: post({ link, clientId: PHONE }, link ? TOKEN : null), env });
  assert.equal(res.status, 200);
  const url = new URL((await res.json()).url);
  assert.equal(url.searchParams.get("scope"), "openid email");
  assert.equal(url.searchParams.get("redirect_uri"), "http://jeu.test/api/google/retour");
  return { state: url.searchParams.get("state"), cookie: res.headers.get("set-cookie").split(";")[0] };
}

const land = (env, { state, cookie }, query = { code: "code" }) => back({
  req: new Request("http://jeu.test/api/google/retour?" + new URLSearchParams({ state, ...query }), { headers: { cookie } }),
  env,
});

const result = (res) => res.headers.get("location").replace("/#google=", "");
const linkedTo = (env) => env.DB.db.prepare("SELECT id FROM profiles WHERE google_hash IS NOT NULL").all().map((r) => r.id);

test("Google : lier le compte garde une empreinte, jamais l'e-mail", async (t) => {
  const env = await setup(t), calls = google(t);
  const res = await land(env, await begin(env, true));
  assert.equal(res.status, 302);
  assert.equal(result(res), "lie");
  assert.deepEqual(linkedTo(env), ["lou"]);
  assert.match(calls[0].body, /client_secret=secret/);
  const dump = JSON.stringify(env.DB.db.prepare("SELECT * FROM profiles").all());
  assert.ok(!dump.includes(MAIL) && !dump.includes(SUB));
});

test("Google : sur un nouvel appareil, se connecter ouvre le compte lié", async (t) => {
  const env = await setup(t);
  google(t);
  await land(env, await begin(env, true));
  const res = await land(env, await begin(env));
  assert.equal(result(res), "ok");
  const keyCookie = res.headers.getSetCookie().find((c) => c.startsWith("cv_cle="));
  const token = keyCookie.split(";")[0].slice("cv_cle=".length);
  const session = env.DB.db.prepare("SELECT player_id, client_hash FROM sessions WHERE token_hash = ?").get(await sha256(token));
  assert.equal(session.player_id, "lou");
  assert.equal(session.client_hash, await sha256(PHONE));
});

test("Google : se connecter sans compte lié n'ouvre rien", async (t) => {
  const env = await setup(t);
  google(t);
  const res = await land(env, await begin(env));
  assert.equal(result(res), "inconnu");
  assert.ok(!res.headers.getSetCookie().some((c) => c.startsWith("cv_cle=")));
});

test("Google : un même compte Google ne se lie pas à deux joueurs", async (t) => {
  const env = await setup(t);
  google(t);
  env.DB.db.prepare("UPDATE profiles SET google_hash = ? WHERE id = 'max'").run(await sha256("google:" + SUB));
  assert.equal(result(await land(env, await begin(env, true))), "pris");
  assert.deepEqual(linkedTo(env), ["max"]);
});

test("Google : un retour sans le cookie de ce navigateur est refusé, sans appeler Google", async (t) => {
  const env = await setup(t), calls = google(t);
  const { state } = await begin(env, true);
  assert.equal(result(await land(env, { state, cookie: "cv_google=autre" })), "erreur");
  assert.equal(calls.length, 0);
  assert.deepEqual(linkedTo(env), []);
});

test("Google : un retour ne sert qu'une fois", async (t) => {
  const env = await setup(t), calls = google(t);
  const started = await begin(env, true);
  assert.equal(result(await land(env, started)), "lie");
  assert.equal(result(await land(env, started)), "erreur");
  assert.equal(calls.length, 1);
});

test("Google : un retour de plus de 10 min est refusé", async (t) => {
  const env = await setup(t);
  google(t);
  const started = await begin(env, true);
  env.DB.db.prepare("UPDATE google_states SET expires_at = ?").run(NOW);
  assert.equal(result(await land(env, started)), "erreur");
});

test("Google : abandon sur la page de Google", async (t) => {
  const env = await setup(t), calls = google(t);
  assert.equal(result(await land(env, await begin(env, true), { error: "access_denied" })), "annule");
  assert.equal(calls.length, 0);
});

for (const [name, answer] of [
  ["injoignable", async () => { throw new TypeError("fetch failed"); }],
  ["qui répond autre chose que du JSON", async () => new Response("<html>panne</html>", { status: 200 })],
  ["qui répond null", async () => Response.json(null)],
]) {
  test(`Google : échange ${name}, retour au jeu avec « erreur » et cookie effacé`, async (t) => {
    const env = await setup(t), landing = await begin(env, true);
    t.mock.method(globalThis, "fetch", answer);
    const res = await land(env, landing);
    assert.equal(res.status, 302);
    assert.equal(result(res), "erreur");
    assert.match(res.headers.get("set-cookie"), /Max-Age=0/i);
    assert.deepEqual(linkedTo(env), []);
  });
}

for (const [name, claims] of [
  ["pour une autre appli", { aud: "autre.apps" }],
  ["venu d'ailleurs", { iss: "https://pirate.test" }],
  ["expiré", { exp: NOW / 1000 - 1 }],
  ["sans identifiant", { sub: "" }],
]) {
  test(`Google : jeton ${name} refusé`, async (t) => {
    const env = await setup(t);
    google(t, claims);
    assert.equal(result(await land(env, await begin(env, true))), "erreur");
    assert.deepEqual(linkedTo(env), []);
  });
}

test("Google : délier efface l'empreinte", async (t) => {
  const env = await setup(t);
  google(t);
  await land(env, await begin(env, true));
  const res = await unlink({ req: new Request("http://jeu.test/api/me/google", { method: "DELETE", headers: { authorization: "Bearer " + TOKEN, "x-app-version": "dev" } }), env });
  assert.equal(res.status, 200);
  assert.deepEqual(linkedTo(env), []);
});

test("Google : lier demande d'être connecté", async (t) => {
  const env = await setup(t);
  assert.equal((await start({ req: post({ link: true }), env })).status, 401);
});

test("Google : sans clés configurées, les trois routes répondent 404", async (t) => {
  const env = { ...(await setup(t)), GOOGLE_CLIENT_ID: undefined };
  const leave = new Request("http://jeu.test/api/me/google", { method: "DELETE", headers: { authorization: "Bearer " + TOKEN, "x-app-version": "dev" } });
  assert.equal((await start({ req: post({}), env })).status, 404);
  assert.equal((await back({ req: new Request("http://jeu.test/api/google/retour?state=x&code=y"), env })).status, 404);
  assert.equal((await unlink({ req: leave, env })).status, 404);
});

function limiter(ok) {
  const keys = [];
  return { keys, limit: async ({ key }) => (keys.push(key), { success: ok }) };
}

test("Google : la limite est calée sur un lieu qui partage une IP, pas sur la limite d'un téléphone", async (t) => {
  const env = { ...(await setup(t)), JOIN_LIMIT: limiter(false), JOIN_IP_LIMIT: limiter(true) };
  assert.equal((await start({ req: post({ clientId: PHONE }), env })).status, 200);
  assert.deepEqual(env.JOIN_LIMIT.keys, []);
  assert.deepEqual(env.JOIN_IP_LIMIT.keys, ["google:local"]);
});

test("Google : limite du lieu atteinte, freiné", async (t) => {
  const env = { ...(await setup(t)), JOIN_IP_LIMIT: limiter(false) };
  assert.equal((await start({ req: post({}), env })).status, 429);
});

const others = (env) => logoutOthers({ req: new Request("http://jeu.test/api/me/devices", { method: "DELETE", headers: { authorization: "Bearer " + TOKEN, "x-app-version": "dev" } }), env });

test("Google : « Déconnecter les autres » retire le lien, l'intrus ne revient pas par Google", async (t) => {
  const env = await setup(t);
  google(t);
  await land(env, await begin(env, true));
  assert.deepEqual(linkedTo(env), ["lou"]);
  assert.equal((await others(env)).status, 200);
  assert.deepEqual(linkedTo(env), []);
  assert.equal(result(await land(env, await begin(env))), "inconnu");
});

test("Google : « Déconnecter les autres » annule une liaison en cours", async (t) => {
  const env = await setup(t);
  google(t);
  const started = await begin(env, true);
  assert.equal((await others(env)).status, 200);
  assert.equal(result(await land(env, started)), "erreur");
  assert.deepEqual(linkedTo(env), []);
});

test("Google : « Déconnecter les autres » ne touche pas aux demandes des autres joueurs", async (t) => {
  const env = await setup(t);
  env.DB.db.prepare("INSERT INTO google_states (state_hash, player_id, client_hash, expires_at) VALUES ('autre', 'max', NULL, ?)").run(NOW + 60000);
  env.DB.db.prepare("UPDATE profiles SET google_hash = 'empreinte' WHERE id = 'max'").run();
  assert.equal((await others(env)).status, 200);
  assert.deepEqual(linkedTo(env), ["max"]);
  assert.equal(env.DB.db.prepare("SELECT COUNT(*) AS n FROM google_states").get().n, 1);
});

test("Google : réunir deux comptes garde le lien du compte retiré", async (t) => {
  const env = await setup(t);
  const hash = await sha256("google:" + SUB);
  env.DB.db.prepare("UPDATE profiles SET google_hash = ? WHERE id = 'max'").run(hash);
  await mergeInto(env, "lou", "max");
  assert.deepEqual(linkedTo(env), ["lou"]);
});
