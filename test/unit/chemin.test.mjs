import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { planPath } from "../chemin.mjs";
import { projectile } from "../../public/js/game/projectiles.js";
import { FW } from "../../public/js/game/field.js";

const fork = (x) => ({ x, y: 10, a: Math.PI / 2, at: 10.5, obs: [projectile("fork", x, -50, 0, 300)] });
const scene = (warns) => ({ t: 10, toast: { x: FW / 2, y: 448 }, obs: [], warns });
const wall = () => Array.from({ length: 12 }, (_, i) => fork(18 + i * 30));

test("chemin du robot : aucun si le mur n'a pas de trou", () => {
  assert.equal(planPath(scene(wall())), null);
});

test("chemin du robot : passe par le trou du mur", () => {
  const path = planPath(scene(wall().filter((w) => Math.abs(w.x - FW / 2) > 50)));
  assert.ok(path.length > 1);
  assert.ok(Math.abs(path.at(-1).x - FW / 2) < 50);
});

test("chemin du robot : gardé hors du code envoyé aux téléphones", () => {
  const sent = readFileSync("public/js/game/solver.js", "utf8") + readFileSync("public/js/game/sim.js", "utf8");
  assert.doesNotMatch(sent, /pathOf|plan:/);
});
