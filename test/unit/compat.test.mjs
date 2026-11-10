import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { Script } from "node:vm";

const RECENT = /\d(svh|dvh|lvh|svw|dvw|lvw|cqi|cqw|cqh|cqb|cqmin|cqmax)\b|color-mix\(|oklch\(|oklab\(|light-dark\(/;

function unbacked(css) {
  const found = [];
  for (const block of css.replace(/\/\*[\s\S]*?\*\//g, "").split(/[{}]/)) {
    const declarations = block.split(";").map((d) => d.trim()).filter((d) => /^[a-z-]+\s*:/.test(d));
    declarations.forEach((d, i) => {
      if (!RECENT.test(d)) return;
      const prop = d.split(":")[0].trim();
      const before = declarations[i - 1];
      if (!before || before.split(":")[0].trim() !== prop || RECENT.test(before)) found.push(d);
    });
  }
  return found;
}

test("iPhone d'avant iOS 16 : chaque unité ou couleur trop récente a une valeur de secours juste avant, sinon la ligne entière est ignorée", () => {
  const sheets = readdirSync("public").filter((f) => f.endsWith(".css"));
  assert.ok(sheets.includes("style.css"));
  const missing = sheets.flatMap((f) => unbacked(readFileSync("public/" + f, "utf8")).map((d) => f + " : " + d));
  assert.deepEqual(missing, []);
});

test("valeur de secours : repérée seulement si elle précède, pour la même propriété, sans unité récente", () => {
  assert.deepEqual(unbacked("a { gap: 1vh; gap: 1svh; }"), []);
  assert.deepEqual(unbacked("a { gap: 1svh; }"), ["gap: 1svh"]);
  assert.deepEqual(unbacked("a { margin: 1vh; gap: 1svh; }"), ["gap: 1svh"]);
  assert.deepEqual(unbacked("a { gap: 2dvh; gap: 1svh; }"), ["gap: 2dvh", "gap: 1svh"]);
  assert.deepEqual(unbacked("a { font-size: min(1rem, calc(6cqi - 1px)); }"), ["font-size: min(1rem, calc(6cqi - 1px))"]);
});

/** @param {string} code */
function moduleOnly(code) {
  const body = code.replace(/^\s*import\s[\s\S]*?from\s*"[^"]+";?|^\s*import\s*"[^"]+";?/gm, "").replace(/^export\s+/gm, "");
  try {
    new Script('"use strict";\n' + body);
    return null;
  } catch (e) {
    return e.message;
  }
}

test("iPhone d'avant iOS 15 : pas d'await en dehors d'une fonction dans le code du navigateur, sinon tout le fichier est refusé", () => {
  const files = readdirSync("public/js", { recursive: true }).filter((f) => f.endsWith(".js"));
  assert.ok(files.length > 50);
  const refused = files.map((f) => [f, moduleOnly(readFileSync("public/js/" + f, "utf8"))]).filter(([, why]) => why);
  assert.deepEqual(refused, []);
});

test("await en dehors d'une fonction : repéré, même après des imports sur plusieurs lignes ; dans une fonction async : accepté", () => {
  assert.equal(moduleOnly('import { a,\n  b } from "./x.js";\nexport async function f() {\n  await a();\n}\n(async () => {\n  await b();\n})();\n'), null);
  assert.match(moduleOnly('import { a } from "./x.js";\nconst b = await a();\n'), /await/);
  assert.match(moduleOnly("for await (const x of []) {}\n"), /await|reserved/);
});
