import { test } from "node:test";
import assert from "node:assert/strict";
import { createSim } from "../../public/js/game/sim.js";
import { STEP } from "../../public/js/game/field.js";
import { sprinkleRare } from "../../public/js/game/projectiles.js";
import { SPREADS } from "../../public/js/shared/palette.js";

const WALLS = ["wall", "walls"];

function seeded(seed) {
  let s = seed;
  return () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
}

const pouring = (s) => s.obs.some((o) => o.from === "downpour") || s.warns.some((w) => w.obs[0].from === "downpour");

test("mur tiré pendant une double pluie : mis de côté, puis lancé quand ses fourchettes ont quitté l'écran", () => {
  let held = 0, later = 0;
  for (let seed = 1; seed <= 4; seed++) {
    const sim = createSim(seeded(seed), { t0: 60, immortal: () => true }), s = sim.state;
    let spawned = 0, waiting = null;
    while (s.t < 180) {
      sim.step(STEP, 0, 0);
      if (s.held && !waiting) {
        waiting = s.held;
        held++;
      }
      if (s.stats.spawned === spawned) continue;
      spawned = s.stats.spawned;
      if (!WALLS.includes(s.last)) continue;
      assert.ok(!pouring(s), `${s.last} lancé pendant une double pluie, à ${s.t.toFixed(2)} s`);
      if (waiting && s.last === waiting.id) later++;
      waiting = s.held;
    }
  }
  assert.ok(held > 0, "aucun mur mis de côté : le test ne vérifie rien");
  assert.ok(later > held / 2, `${later} murs lancés sur ${held} mis de côté`);
});

test("couteau garni : chaque garniture à gagner peut tomber sur un couteau, la sauce du chef comprise", () => {
  const extras = Object.keys(SPREADS).filter((k) => !SPREADS[k].free), seen = new Set(), random = Math.random;
  try {
    for (let i = 0; i < 1000; i++) {
      const knife = { kind: "knife" }, rolls = [0, 0, i / 1000];
      Math.random = () => rolls.shift();
      sprinkleRare([{ obs: [knife] }]);
      seen.add(knife.spread);
    }
  } finally {
    Math.random = random;
  }
  assert.deepEqual([...seen].sort(), extras.sort());
});
