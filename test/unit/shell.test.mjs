import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { posix } from "node:path";

const read = (path) => readFileSync("public" + path, "utf8");
const SHELL = JSON.parse(read("/sw.js").match(/const SHELL = (\[[\s\S]*?\]);/)[1]);
const IMPORT = /(?:import|export)\s[^;]*?from\s*"([^"]+)"|import\s*\(?\s*"([^"]+)"/g;

function modules(entries) {
  const seen = new Set(), todo = [...entries];
  while (todo.length) {
    const file = todo.pop();
    if (seen.has(file)) continue;
    seen.add(file);
    for (const m of read(file).matchAll(IMPORT)) todo.push(posix.resolve(posix.dirname(file), m[1] || m[2]));
  }
  return [...seen];
}

const page = read("/index.html");
const scripts = [...page.matchAll(/<script[^>]*src="(\/[^"]+)"/g)].map((m) => m[1]);
const styles = [...page.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"/g)].map((m) => m[1]);

test("le jeu hors ligne : chaque fichier chargé par la page est dans le cache de sw.js", () => {
  const needed = [...modules(scripts), ...styles];
  assert.ok(needed.length > 30);
  assert.deepEqual(needed.filter((f) => !SHELL.includes(f)), []);
});

test("chaque module du jeu est préchargé par la page, sans fichier en trop, pour ne pas attendre les imports un étage après l'autre", () => {
  const preloaded = [...page.matchAll(/<link rel="modulepreload" href="(\/[^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(preloaded.sort(), modules(["/js/app/main.js"]).sort());
});

test("chaque fichier du cache de sw.js existe", () => {
  assert.deepEqual(SHELL.filter((f) => f !== "/" && !existsSync("public" + f)), []);
});

test("chaque élément attendu par screens.js existe dans la page, sinon le jeu se recharge à chaque ouverture", () => {
  const block = read("/js/app/screens.js").match(/export const ui = \{([\s\S]*?)\n\};/)[1];
  const ids = [...block.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(ids.length > 100);
  assert.deepEqual(ids.filter((id) => !page.includes(`id="${id}"`)), []);
});
