import { test } from "node:test";
import assert from "node:assert/strict";
import { createSim } from "../../public/js/game/sim.js";
import { ATTACKS } from "../../public/js/game/attacks.js";
import { projectile } from "../../public/js/game/projectiles.js";
import { FW, STEP } from "../../public/js/game/field.js";

const fork = (x, at) => ({ x, y: 10, a: Math.PI / 2, at, obs: [projectile("fork", x, -50, 0, 300)] });

const fullWall = ({ t }) => {
  const items = [];
  for (let x = 18; x < FW; x += 30) items.push(fork(x, t + 0.5));
  return items;
};

const harmless = ({ t }) => [fork(FW - 20, t + 0.5)];

function trial(make, options, ready = () => {}) {
  ATTACKS.push({ id: "essai", cost: 1, make });
  try {
    const sim = createSim(() => 0.5, { only: "essai", t0: 10, immortal: () => true, ...options });
    ready(sim.state);
    sim.state.next = 0;
    sim.step(STEP, 0, 0);
    return sim.state.stats;
  } finally {
    ATTACKS.pop();
  }
}

test("refus : une attaque impossible à elle seule est comptée contre elle", () => {
  const stats = trial(fullWall, { audit: true });
  assert.equal(stats.rejected, 1);
  assert.deepEqual(stats.own, { essai: 1 });
});

test("refus : une attaque impossible mais lancée sans solveur est aussi comptée contre elle", () => {
  const stats = trial(fullWall, { audit: true, fair: false });
  assert.equal(stats.impossible, 1);
  assert.deepEqual(stats.own, { essai: 1 });
});

test("refus : tartine déjà trop près d'un couvert, l'attaque n'y est pour rien", () => {
  const near = (s) => s.obs.push({ ...projectile("fork", s.toast.x, s.toast.y - 60, 0, 300), from: "aimed" });
  const stats = trial(harmless, { audit: true }, near);
  assert.equal(stats.rejected, 1);
  assert.deepEqual(stats.own, {});
});

test("refus : attaque sans danger acceptée, rien à compter", () => {
  const stats = trial(harmless, { audit: true });
  assert.equal(stats.spawned, 1);
  assert.equal(stats.rejected, 0);
  assert.deepEqual(stats.own, {});
});

test("refus : pas de second calcul pendant une vraie partie", () => {
  const stats = trial(fullWall, {});
  assert.equal(stats.rejected, 1);
  assert.deepEqual(stats.own, {});
});
