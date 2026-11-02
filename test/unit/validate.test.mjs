import { test } from "node:test";
import assert from "node:assert/strict";
import { GEAR, SPREADS } from "../../public/js/shared/palette.js";

const { pseudoKey, cleanPseudo, cleanLook, cleanProgress, mergeProgress } = await import(new URL("../../src/validate.ts", import.meta.url).href);

const kindFor = (slot) => Object.entries(GEAR).find(([, g]) => g.slot === slot)[0];
const HAT = kindFor("head"), SIDE = kindFor("side"), SPREAD = Object.keys(SPREADS).find((k) => k !== "butter");

test("pseudo : accents, ligatures et signes ne comptent pas pour reconnaître un sosie", () => {
  assert.equal(pseudoKey("Léa-Lou"), "lealou");
  assert.equal(pseudoKey("Œdipe"), "oedipe");
  assert.equal(pseudoKey("LEA LOU"), pseudoKey("léa.lou"));
});

test("pseudo : espaces remis d'aplomb, longueur de 2 à 16", () => {
  assert.equal(cleanPseudo("  Lou   Ann "), "Lou Ann");
  assert.equal(cleanPseudo("Ly"), "Ly");
  assert.equal(cleanPseudo("L"), null);
  assert.equal(cleanPseudo("a".repeat(16)), "a".repeat(16));
  assert.equal(cleanPseudo("a".repeat(17)), null);
});

test("pseudo : lettres d'autres alphabets, emoji et signes seuls refusés", () => {
  assert.equal(cleanPseudo("Lоu"), null);
  assert.equal(cleanPseudo("Lou🍞"), null);
  assert.equal(cleanPseudo("Lo⃝u"), null);
  assert.equal(cleanPseudo("__"), null);
  assert.equal(cleanPseudo("a."), null);
  for (const raw of [null, undefined, 42, {}, ["Lou"]]) assert.equal(cleanPseudo(raw), null);
});

test("tenue : chaque objet seulement à son emplacement, les noms inventés retirés", () => {
  const look = JSON.parse(cleanLook({ head: HAT, side: HAT, spread: SPREAD, bread: "__proto__", aura: "constructor" }));
  assert.equal(look.head, HAT);
  assert.equal(look.side, null);
  assert.equal(look.spread, SPREAD);
  assert.equal(look.bread, null);
  assert.equal(look.aura, null);
  assert.equal(JSON.parse(cleanLook({ spread: "toString" })).spread, null);
  assert.equal(JSON.parse(cleanLook({ side: SIDE })).side, SIDE);
});

test("tenue : compteurs et date hors limites remis à 0", () => {
  const look = JSON.parse(cleanLook({ ach: 100, own: { head: -1, side: 2.5, bread: 99, aura: "3" }, at: 1e15 }));
  assert.equal(look.ach, 0);
  assert.deepEqual(look.own, { head: 0, side: 0, bread: 99, aura: 0, spread: 0 });
  assert.equal(look.at, 0);
  assert.equal(cleanLook(null), null);
  assert.equal(cleanLook("tenue"), null);
});

test("progression : seuls les succès bien nommés et datés, 100 au plus", () => {
  const p = cleanProgress({ got: { t10: 1000, "mauvais-id": 5, neg: -1, zero: 0, demi: 1.5, loin: 1e14, texte: "5" }, attacks: ["rain", "rain", 3, "a b"], toppings: "jam" });
  assert.deepEqual(p, { got: { t10: 1000 }, attacks: ["rain"], toppings: [] });
  const many = Object.fromEntries(Array.from({ length: 150 }, (_, i) => ["s" + i, i + 1]));
  assert.equal(Object.keys(cleanProgress({ got: many }).got).length, 100);
  assert.equal(cleanProgress({ attacks: Array.from({ length: 150 }, (_, i) => "a" + i) }).attacks.length, 100);
  assert.equal(cleanProgress(null), null);
});

test("fusion de deux comptes : chaque succès garde sa date la plus ancienne, attaques et garnitures réunies sans doublon", () => {
  const a = { got: { t10: 5000, t30: 7000 }, attacks: ["rain"], toppings: ["jam"] };
  const b = { got: { t10: 2000, six: 9000 }, attacks: ["rain", "wall"], toppings: ["honey"] };
  const merged = { got: { t10: 2000, t30: 7000, six: 9000 }, attacks: ["rain", "wall"], toppings: ["jam", "honey"] };
  assert.deepEqual(mergeProgress(a, b), merged);
  assert.deepEqual(mergeProgress(b, a).got, merged.got);
});

test("fusion : jamais plus de 100 succès", () => {
  const side = (from) => ({ got: Object.fromEntries(Array.from({ length: 80 }, (_, i) => ["s" + (from + i), 1])), attacks: [], toppings: [] });
  assert.equal(Object.keys(mergeProgress(side(0), side(50)).got).length, 100);
});
