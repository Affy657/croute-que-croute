import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PALETTE } from "../../public/js/shared/palette.js";

const read = (file) => readFileSync("public/" + file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const tokens = read("tokens.css");
const vars = Object.fromEntries([...tokens.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().toLowerCase()]));
const SET_BY_JS = ["load", "reach", "drop"];

test("tokens.css : les couleurs aussi définies dans palette.js ont la même valeur", () => {
  assert.deepEqual(["void", "mustard", "jam", "ink", "flame", "steel", "planet-shade"].filter((name) => !vars[name]), []);
  const wrong = Object.keys(vars).filter((name) => Object.hasOwn(PALETTE, name) && vars[name] !== PALETTE[name].toLowerCase());
  assert.deepEqual(wrong.map((name) => `--${name}: ${vars[name]} au lieu de ${PALETTE[name]}`), []);
});

for (const file of ["style.css", "catalog.css", "admin.css", "ecran.css"]) {
  test(`${file} : couleurs et variables viennent toutes de tokens.css`, () => {
    const css = read(file);
    assert.doesNotMatch(css, /:root|--[\w-]+\s*:/);
    assert.deepEqual([...css.matchAll(/#[0-9a-f]{3,8}\b|rgba?\(/gi)].map((m) => m[0]).filter((c) => c !== "#000"), []);
    const unknown = [...css.matchAll(/var\(--([\w-]+)/g)].map((m) => m[1]).filter((name) => !vars[name] && !SET_BY_JS.includes(name));
    assert.deepEqual([...new Set(unknown)], []);
  });
}

for (const page of ["index.html", "admin.html", "ecran.html"]) {
  test(`${page} : charge tokens.css avant ses styles`, () => {
    const links = [...read(page).matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"/g)].map((m) => m[1]);
    assert.equal(links[0], "/tokens.css");
  });
}
