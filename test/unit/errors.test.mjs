import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
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

const CLIENT = readFileSync("public/js/errors.js", "utf8");

function phone(failures = 0) {
  const on = {}, timers = [], posts = [], tab = new Map();
  class ErrorEvent {
    constructor(type, init) { Object.assign(this, init); }
  }
  const win = {
    navigator: { userAgent: "Test", platform: "", maxTouchPoints: 0, onLine: true },
    location: { origin: "https://jeu.test", href: "https://jeu.test/", pathname: "/" },
    document: { documentElement: { dataset: { version: "test" } }, hidden: false, addEventListener() {} },
    sessionStorage: { getItem: (k) => tab.get(k) ?? null, setItem: (k, v) => tab.set(k, String(v)) },
    addEventListener: (type, fn) => (on[type] ||= []).push(fn),
    setTimeout: (fn) => timers.push({ fn }),
    clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].fn = null; },
    fetch: (url, opts) => {
      posts.push(JSON.parse(opts.body));
      return failures-- > 0 ? Promise.reject(new TypeError("Failed to fetch")) : Promise.resolve({ ok: true, status: 200 });
    },
    matchMedia: () => ({ matches: false }), innerWidth: 390, innerHeight: 844, devicePixelRatio: 3, ErrorEvent
  };
  win.window = win;
  createContext(win);
  runInContext(CLIENT, win);
  const fire = (type, event) => { for (const fn of on[type] || []) fn(event); };
  return {
    posts, win, fire,
    crash: (message) => fire("error", new ErrorEvent("error", { message, filename: "https://jeu.test/js/app/main.js", lineno: 3, colno: 7, error: null })),
    async wait() {
      const t = timers.find((t) => t.fn);
      if (!t) return false;
      const fn = t.fn;
      t.fn = null;
      fn();
      for (let i = 0; i < 5; i++) await new Promise(setImmediate);
      return true;
    }
  };
}

test("rapport du téléphone : un envoi raté pendant une coupure repart au suivant, en entier", async () => {
  const p = phone(1);
  p.crash("TypeError: boum");
  while (p.posts.length < 2 && await p.wait());
  assert.equal(p.posts.length, 2);
  const [again] = p.posts[1].errors;
  assert.equal(again.message, "TypeError: boum");
  assert.equal(again.count, 1);
  assert.ok(again.trail && again.device);
});

test("rapport du téléphone : envois toujours ratés, pas plus de 3 par page", async () => {
  const p = phone(Infinity);
  p.crash("TypeError: boum");
  for (let i = 0; i < 20 && await p.wait(); i++);
  assert.equal(p.posts.length, 3);
});

test("rapport du téléphone : hors ligne, rien n'est tenté ; au retour du réseau, il part", async () => {
  const p = phone();
  p.win.navigator.onLine = false;
  p.crash("TypeError: boum");
  while (await p.wait());
  assert.equal(p.posts.length, 0);
  p.win.navigator.onLine = true;
  p.fire("online", {});
  await new Promise(setImmediate);
  assert.equal(p.posts.length, 1);
});

test("rapport du téléphone : le script d'analyse que Cloudflare ajoute, bloqué par la politique de sécurité, est ignoré ; un autre blocage remonte", async () => {
  const p = phone();
  const blocked = (blockedURI) => p.fire("securitypolicyviolation", { effectiveDirective: "script-src-elem", blockedURI, sourceFile: "" });
  blocked("https://static.cloudflareinsights.com/beacon.min.js/vcd15cbe7772f49c399c6a5babf22c1241717689176015");
  while (await p.wait());
  assert.equal(p.posts.length, 0);
  blocked("https://static.cloudflareinsights.com.evil.test/beacon.min.js");
  while (await p.wait());
  assert.deepEqual(p.posts.flatMap((r) => r.errors.map((e) => e.message)), ["script-src-elem a bloqué https://static.cloudflareinsights.com.evil.test/beacon.min.js"]);
});
