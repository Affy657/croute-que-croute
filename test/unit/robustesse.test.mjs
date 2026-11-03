import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSim } from "../../public/js/game/sim.js";
import { STEP } from "../../public/js/game/field.js";

const { savedQuality } = await import("../../public/js/app/scene.js");

test("netteté baissée (téléphone lent, ou iPhone en économie d'énergie à 30 images par seconde) : gardée 12 h, puis le jeu remesure", () => {
  const now = Date.UTC(2026, 10, 7, 21);
  assert.equal(savedQuality("3:" + (now - 3600 * 1000), now), 3);
  assert.equal(savedQuality("3:" + (now - 13 * 3600 * 1000), now), 0);
  assert.equal(savedQuality("3", now), 0);
  assert.equal(savedQuality(null, now), 0);
  assert.equal(savedQuality("9:" + now, now), 3);
});

test("partie lancée avec une hauteur invalide (fenêtre de 0 px) : la tartine part d'une vraie place et peut mourir", () => {
  let seed = 7;
  const sim = createSim(() => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296), { y: NaN });
  assert.ok(Number.isFinite(sim.state.toast.y));
  for (let i = 0; i < 120 * 120 && !sim.state.dead; i++) sim.step(STEP, 0, 0);
  assert.ok(sim.state.dead);
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
