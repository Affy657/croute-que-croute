import "./env.mjs";
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

AbortSignal.timeout = undefined;
mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.UTC(2026, 10, 7, 21) });

const { HOME } = await import("../../public/js/app/move.js");
const answer = (status, body) => ({ ok: status < 400, status, json: async () => body });
const down = () => { throw new TypeError("Failed to fetch"); };
const stuck = (opts) => new Promise((_, ko) => opts.signal.addEventListener("abort", () => ko(new Error("trop long"))));
const flush = async () => {
  for (let i = 0; i < 6; i++) await new Promise(setImmediate);
};

let replies = {}, calls = [], went = [], cases = 0, firstAt = 0;
globalThis.fetch = async (path, opts) => {
  if (!calls.length) firstAt = Date.now();
  calls.push({ path, auth: opts.headers.authorization, at: Date.now() - firstAt });
  return replies[path](opts);
};
location.replace = (url) => went.push(url);

async function leave(key, given) {
  replies = given;
  calls = [];
  went = [];
  localStorage.clear();
  if (key) localStorage.setItem("cv-token", key);
  const done = import("../../public/js/depart.js?cas=" + ++cases);
  for (let i = 0; i < 2000 && !went.length; i++) {
    await flush();
    if (calls.length && !went.length) mock.timers.tick(100);
  }
  await done;
  assert.equal(went.length, 1);
  assert.ok(went[0].startsWith(HOME + "/#demenage="));
  return { ...JSON.parse(decodeURIComponent(went[0].split("#demenage=")[1])), took: Date.now() - firstAt };
}

const paths = () => calls.map((c) => c.path);

test("/depart : clé locale et code reçu au premier essai", async () => {
  const r = await leave("cle", { "/api/me/link": () => answer(201, { code: "ABCD2345" }) });
  assert.equal(r.code, "ABCD2345");
  assert.equal(r.retry, undefined);
  assert.deepEqual(paths(), ["/api/me/link"]);
  assert.equal(calls[0].auth, "Bearer cle");
});

test("/depart : code raté une fois, le 2e essai le rapporte", async () => {
  const replies = [down, () => answer(201, { code: "ABCD2345" })];
  const r = await leave("cle", { "/api/me/link": () => replies.shift()() });
  assert.equal(r.code, "ABCD2345");
  assert.equal(r.retry, undefined);
  assert.equal(calls.length, 2);
});

test("/depart : réponse illisible ou code absent : un 2e essai aussi", async () => {
  const replies = [() => answer(201, {}), () => answer(201, { code: "ABCD2345" })];
  const r = await leave("cle", { "/api/me/link": () => replies.shift()() });
  assert.equal(r.code, "ABCD2345");
  assert.equal(calls.length, 2);
});

test("/depart : 2 essais ratés, le lien signale l'échec pour effacer cv-sonde", async () => {
  const r = await leave("cle", { "/api/me/link": () => answer(500, { error: "Erreur serveur." }) });
  assert.equal(r.code, null);
  assert.equal(r.retry, true);
  assert.equal(calls.length, 2);
});

test("/depart : serveur muet, tout tient sous le meta refresh", async () => {
  const r = await leave("cle", { "/api/me/link": stuck });
  assert.equal(r.retry, true);
  assert.deepEqual(calls.map((c) => c.at), [0, 4000]);
  assert.ok(r.took <= 8000);
});

test("/depart : compte gardé par cookie, retrouvé avant de demander le code", async () => {
  const r = await leave(null, { "/api/resume": () => answer(200, { token: "cookie" }), "/api/me/link": () => answer(201, { code: "ABCD2345" }) });
  assert.deepEqual(paths(), ["/api/resume", "/api/me/link"]);
  assert.equal(calls[0].auth, undefined);
  assert.equal(calls[1].auth, "Bearer cookie");
  assert.equal(r.code, "ABCD2345");
  assert.equal(r.retry, undefined);
});

test("/depart : aucun compte, pas d'échec à signaler, le joueur est nouveau", async () => {
  const r = await leave(null, { "/api/resume": () => answer(200, { token: null }) });
  assert.deepEqual(paths(), ["/api/resume"]);
  assert.equal(r.code, null);
  assert.equal(r.retry, undefined);
});

for (const [name, reply] of [["réseau", down], ["serveur", () => answer(500, {})], ["limite", () => answer(429, {})]]) {
  test(`/depart : reprise ratée (${name}), on ne sait pas s'il a un compte : échec signalé`, async () => {
    const r = await leave(null, { "/api/resume": reply });
    assert.equal(r.code, null);
    assert.equal(r.retry, true);
  });
}

test("/depart : reprise lente puis code muet, toujours sous le meta refresh", async () => {
  const slow = (opts) => new Promise((ok) => setTimeout(() => ok(answer(200, { token: "cookie" })), 3400));
  const r = await leave(null, { "/api/resume": slow, "/api/me/link": stuck });
  assert.equal(r.retry, true);
  assert.ok(r.took <= 8000);
});

test("/depart : le meta refresh part après le budget du script, et signale l'échec", () => {
  const meta = readFileSync("public/depart.html", "utf8").match(/http-equiv="refresh" content="(\d+);url=([^"]+)"/);
  const budget = Number(readFileSync("public/js/depart.js", "utf8").match(/ALL_MS = (\d+)/)[1]);
  assert.ok(Number(meta[1]) * 1000 >= budget + 1500);
  assert.ok(meta[2].startsWith(HOME + "/#demenage="));
  assert.equal(JSON.parse(decodeURIComponent(meta[2].split("#demenage=")[1])).retry, true);
});
