import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PALETTE } from "../../public/js/shared/palette.js";

const SHARED = ["void", "mustard", "jam", "ink"];

for (const file of ["style.css", "admin.css", "ecran.css"]) {
  test(`${file} : les couleurs aussi définies dans palette.js ont la même valeur`, () => {
    const root = readFileSync("public/" + file, "utf8").match(/:root \{([\s\S]*?)\n\}/)[1];
    const vars = Object.fromEntries([...root.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim().toLowerCase()]));
    assert.deepEqual(SHARED.filter((name) => !vars[name]), []);
    const wrong = Object.keys(vars).filter((name) => Object.hasOwn(PALETTE, name) && vars[name] !== PALETTE[name].toLowerCase());
    assert.deepEqual(wrong.map((name) => `--${name}: ${vars[name]} au lieu de ${PALETTE[name]}`), []);
  });
}
