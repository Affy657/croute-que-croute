import { fakeCtx } from "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSim } from "../../public/js/game/sim.js";
import { STEP } from "../../public/js/game/field.js";

const { savedQuality, createScene } = await import("../../public/js/app/scene.js");

test("netteté baissée (téléphone lent, ou iPhone en économie d'énergie à 30 images par seconde) : gardée 12 h, puis le jeu remesure", () => {
  const now = Date.UTC(2026, 10, 7, 21);
  assert.equal(savedQuality("3:" + (now - 3600 * 1000), now), 3);
  assert.equal(savedQuality("3:" + (now - 13 * 3600 * 1000), now), 0);
  assert.equal(savedQuality("3", now), 0);
  assert.equal(savedQuality(null, now), 0);
  assert.equal(savedQuality("9:" + now, now), 3);
  assert.equal(savedQuality("1.5:" + now, now), 1);
  assert.equal(savedQuality("x:" + now, now), 0);
});

test("partie lancée avec une hauteur invalide (fenêtre de 0 px) : la tartine part d'une vraie place et peut mourir", () => {
  let seed = 7;
  const sim = createSim(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296), { y: NaN });
  assert.ok(Number.isFinite(sim.state.toast.y));
  for (let i = 0; i < 120 * 120 && !sim.state.dead; i++) sim.step(STEP, 0, 0);
  assert.ok(sim.state.dead);
});

test("fenêtre de 0 px de haut puis agrandie : les planètes reviennent, affichées et touchables", () => {
  const listen = window.addEventListener;
  let grow = null;
  Object.assign(window, { innerWidth: 390, innerHeight: 0, devicePixelRatio: 1, matchMedia: () => ({ matches: false }) });
  window.addEventListener = (type, fn) => (type === "resize" ? (grow = fn) : listen(type, fn));
  const canvas = () => ({ width: 0, height: 0, getContext: () => fakeCtx().ctx });
  const scene = createScene(canvas(), canvas());
  window.addEventListener = listen;
  for (let i = 0; i < 60; i++) scene.update(STEP, 1, false);
  window.innerHeight = 844;
  grow();
  for (let i = 0; i < 60; i++) scene.update(STEP, 1, false);
  const hits = [];
  for (const x of [0.22 * 390, 0.8 * 390]) for (let y = 0; y < 844; y += 4) if (scene.bodyAt(x, y)) hits.push(y);
  assert.ok(hits.length > 0);
});

function offlineWorker(cached) {
  const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
  const handlers = {};
  const self = { location: { href: "https://jeu.test/sw.js?v=1.0.0", origin: "https://jeu.test" }, addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting() {}, clients: { claim: async () => {} } };
  const caches = { open: async () => ({ put() {} }), match: async (req) => cached[typeof req === "string" ? req : new URL(req.url).pathname] };
  new Function("self", "caches", "fetch", source)(self, caches, async () => { throw new TypeError("Failed to fetch"); });
  return (path, mode = "navigate") => {
    let answer = null;
    handlers.fetch({ request: { method: "GET", url: "https://jeu.test" + path, mode }, respondWith: (p) => { answer = p; }, waitUntil() {} });
    return answer;
  };
}

test("cache hors ligne : l'écran géant ne retombe jamais sur la page du jeu", async () => {
  const game = new Response("jeu"), screen = new Response("écran");
  assert.equal(await offlineWorker({ "/": game, "/ecran": screen })("/ecran"), screen);
  assert.equal((await offlineWorker({ "/": game })("/ecran")).type, "error");
  assert.equal(await offlineWorker({ "/": game })("/lien"), game);
});

test("cache hors ligne : l'admin et ses scripts passent toujours par le réseau, jamais par une vieille copie", () => {
  const ask = offlineWorker({});
  assert.equal(ask("/js/admin/admin.js", "same-origin"), null);
  assert.equal(ask("/admin"), null);
  assert.notEqual(ask("/js/app/main.js", "same-origin"), null);
});

test("cache hors ligne : un fichier raté pendant l'installation n'empêche pas de garder les autres", async () => {
  const source = readFileSync(new URL("../../public/sw.js", import.meta.url), "utf8");
  const shell = JSON.parse(source.match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
  const stored = new Set(), tries = new Map(), handlers = {};
  const fails = (url) => url === "/js/app/main.js" || (url === "/style.css" && tries.get(url) === 1);
  const cache = {
    async add(url) {
      tries.set(url, (tries.get(url) || 0) + 1);
      if (fails(url)) throw new TypeError("Failed to fetch");
      stored.add(url);
    },
    async addAll(urls) {
      for (const url of urls) tries.set(url, (tries.get(url) || 0) + 1);
      if (urls.some(fails)) throw new TypeError("Failed to fetch");
      urls.forEach((url) => stored.add(url));
    },
  };
  const self = { location: { href: "https://jeu.test/sw.js?v=1.0.0" }, addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting() {}, clients: { claim: async () => {} } };
  new Function("self", "caches", source)(self, { open: async () => cache });
  let done = null;
  handlers.install({ waitUntil: (p) => { done = p; } });
  await done;
  assert.deepEqual(shell.filter((url) => !stored.has(url)), ["/js/app/main.js"]);
});
