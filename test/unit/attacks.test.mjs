import { test } from "node:test";
import assert from "node:assert/strict";
import { pickAttack } from "../../public/js/game/attacks.js";

const RAINS = ["rain", "slant", "downpour"], WALLS = ["wall", "walls"];

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

function picks(fresh, seed) {
  const rng = seeded(seed), seen = new Set();
  for (let i = 0; i < 2000; i++) seen.add(pickAttack(70, rng, "aimed", 1, new Set(), new Set(fresh)).id);
  return seen;
}

test("pas de mur ni de murs en série tant que la dernière fourchette d'une pluie n'est pas à mi-chemin", () => {
  for (const rain of RAINS) {
    const seen = picks([rain], 1);
    for (const id of WALLS) assert.ok(!seen.has(id), rain + " puis " + id);
  }
  const free = picks([], 2);
  for (const id of WALLS) assert.ok(free.has(id), id + " sort quand aucune pluie ne tombe");
});
