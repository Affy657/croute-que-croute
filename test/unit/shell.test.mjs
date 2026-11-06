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

test("iPhone d'avant iOS 15.4 : pas de Object.hasOwn dans le code du navigateur, sinon la tartine et les couverts ne se dessinent plus", () => {
  const files = modules(["/js/app/main.js", "/js/ecran/ecran.js", "/js/admin/admin.js"]).concat(scripts);
  assert.deepEqual(files.filter((f) => read(f).includes("Object.hasOwn")), []);
});

test("chaque fichier du cache de sw.js existe", () => {
  assert.deepEqual(SHELL.filter((f) => f !== "/" && !existsSync("public" + f) && !existsSync("public" + f + ".html")), []);
});

test("l'écran géant hors ligne : sa page et chaque fichier qu'elle charge sont dans le cache de sw.js", () => {
  const screen = read("/ecran.html");
  const needed = ["/ecran", ...modules([...screen.matchAll(/<script[^>]*src="(\/[^"]+)"/g)].map((m) => m[1])), ...[...screen.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"/g)].map((m) => m[1])];
  assert.ok(needed.includes("/js/ecran/ecran.js"));
  assert.deepEqual(needed.filter((f) => !SHELL.includes(f)), []);
});

test("police hébergée dans le jeu : de vrais woff2, déclarés dans tokens.css avec swap et unicode-range, la latine dans le cache", () => {
  const faces = [...read("/tokens.css").matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
  const files = faces.map((face) => face.match(/url\("([^"]+)"\)/)[1]);
  assert.deepEqual(files.sort(), ["/fonts/bungee-latin-400-normal.woff2", "/fonts/bungee-latin-ext-400-normal.woff2"]);
  for (const face of faces) {
    assert.match(face, /font-family: "Bungee"/);
    assert.match(face, /font-display: swap/);
    assert.match(face, /unicode-range: U\+/);
  }
  for (const file of files) assert.equal(readFileSync("public" + file).subarray(0, 4).toString("latin1"), "wOF2");
  assert.ok(SHELL.includes("/fonts/bungee-latin-400-normal.woff2"));
  assert.ok(existsSync("public/fonts/OFL.txt"));
});

test("aucune page ne dépend de Google Fonts : ni dans les pages, ni dans le service worker, ni dans la politique de sécurité", () => {
  const files = ["/index.html", "/admin.html", "/ecran.html", "/depart.html", "/confidentialite.html", "/sw.js", "/_headers", "/tokens.css"];
  assert.deepEqual(files.filter((f) => /fonts\.(googleapis|gstatic)\.com|Google Fonts/.test(read(f))), []);
  const policy = read("/_headers").match(/Content-Security-Policy: (.+)/)[1];
  assert.match(policy, /style-src 'self';/);
  assert.match(policy, /font-src 'self';/);
});

test("chaque élément attendu par screens.js existe dans la page, sinon le jeu se recharge à chaque ouverture", () => {
  const block = read("/js/app/screens.js").match(/export const ui = \{([\s\S]*?)\n\};/)[1];
  const ids = [...block.matchAll(/\$\("([^"]+)"\)/g)].map((m) => m[1]);
  assert.ok(ids.length > 100);
  assert.deepEqual(ids.filter((id) => !page.includes(`id="${id}"`)), []);
});
