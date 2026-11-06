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

const decls = (css, props) => [...css.matchAll(/(?:^|[\s;{])([a-z-]+)\s*:\s*([^;{}]+);/g)].filter((m) => props.test(m[1])).map((m) => `${m[1]}: ${m[2].trim()}`);

for (const file of ["style.css", "admin.css", "catalog.css"]) {
  test(`${file} : espacements et tailles de texte viennent des échelles`, () => {
    const css = read(file);
    const spacing = decls(css, /^(gap|row-gap|column-gap|padding(-[a-z]+)?|margin(-[a-z]+)?)$/).filter((d) => !/env\(|vh|: -1px$/.test(d) && /\d(px|rem)\b/.test(d.replace(/\(-1 \*/g, "")));
    assert.deepEqual(spacing, []);
    assert.deepEqual(decls(css, /^font-size$/).filter((d) => /: [\d.]+(px|rem)$/.test(d)), []);
  });
}

for (const file of ["style.css", "catalog.css", "admin.css", "ecran.css"]) {
  test(`${file} : interlettrage et interligne viennent des échelles`, () => {
    assert.deepEqual(decls(read(file), /^(letter-spacing|line-height)$/).filter((d) => !/: var\(--(track|leading)-/.test(d)), []);
  });
}

const steps = (css) => css.replace(/@keyframes[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
const raw = (d) => d.replace(/var\(--[\w-]+\)/g, "");

for (const file of ["style.css", "catalog.css", "admin.css", "ecran.css"]) {
  test(`${file} : ombres, durées, calques, opacités et bordures viennent de tokens.css`, () => {
    const css = steps(read(file));
    assert.deepEqual(decls(css, /^(box|text)-shadow$/).filter((d) => /\d(px|rem|em|vh|vw)\b/.test(raw(d))), []);
    assert.deepEqual(decls(css, /^(transition|animation)$/).filter((d) => !/infinite|: none$/.test(d) && /\d(m?s)\b|cubic-bezier/.test(raw(d))), []);
    assert.deepEqual(decls(css, /^z-index$/).filter((d) => !/: var\(--z-[\w-]+\)$/.test(d)), []);
    assert.deepEqual(decls(css, /^opacity$/).filter((d) => !/: (0|1|var\(--opacity-[\w-]+\))$/.test(d)), []);
    assert.deepEqual(decls(css, /^(border|outline)(-(top|right|bottom|left))?(-width)?$/).filter((d) => /\dpx\b/.test(raw(d))), []);
  });
}

for (const file of ["style.css", "catalog.css", "admin.css"]) {
  test(`${file} : taille tactile et marges intérieures en em viennent de tokens.css`, () => {
    const css = read(file);
    assert.doesNotMatch(css, /\b44px\b/);
    assert.deepEqual(decls(css, /^padding(-[a-z]+)?$/).filter((d) => /\dem\b/.test(raw(d))), []);
  });
}

test("ecran.css : tailles de texte, espacements et rayons viennent de l'échelle de l'écran géant", () => {
  const css = steps(read("ecran.css"));
  assert.deepEqual(decls(css, /^font-size$/).filter((d) => !/: var\(--screen-text-[\w-]+\)$/.test(d)), []);
  assert.deepEqual(decls(css, /^(gap|row-gap|column-gap|padding(-[a-z]+)?|margin(-[a-z]+)?|border-radius)$/).filter((d) => /\d(px|rem|em|vh|vw)\b/.test(raw(d))), []);
});

for (const page of ["index.html", "admin.html", "ecran.html", "confidentialite.html"]) {
  test(`${page} : charge tokens.css avant ses styles`, () => {
    const links = [...read(page).matchAll(/<link[^>]*rel="stylesheet"[^>]*href="(\/[^"]+)"/g)].map((m) => m[1]);
    assert.equal(links[0], "/tokens.css");
  });
}
