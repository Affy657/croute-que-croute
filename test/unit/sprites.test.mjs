import { fakeCtx } from "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { drawToast, drawProjectile, drawTrail } from "../../public/js/app/sprites.js";
import { GEAR, SPREADS } from "../../public/js/shared/palette.js";
import { PROJECTILES, projectile } from "../../public/js/game/projectiles.js";

const BARE = { x: 100, y: 100, tilt: 0.1, thrust: 0.4, spread: "butter", head: null, side: null, bread: null, aura: null };
const JUNK = ["constructor", "toString", "__proto__", "hasOwnProperty", "valueOf", "inconnu", "", 42, null, undefined];

function draw(look, splat = null) {
  const { ctx, log, bad } = fakeCtx();
  drawToast(ctx, { ...BARE, ...look }, splat);
  return { log: log.join("|"), bad };
}

const bare = draw({}).log;

for (const [kind, g] of Object.entries(GEAR)) {
  test(`objet « ${kind} » (${g.slot}) : se dessine, sans valeur invalide`, () => {
    const r = draw({ [g.slot]: kind });
    assert.notEqual(r.log, bare);
    assert.deepEqual(r.bad, []);
  });
}

for (const kind of Object.keys(SPREADS).filter((k) => k !== "butter")) {
  test(`garniture « ${kind} » : différente du beurre`, () => {
    const r = draw({ spread: kind });
    assert.notEqual(r.log, bare);
    assert.deepEqual(r.bad, []);
  });
}

for (const slot of ["head", "side", "bread", "aura", "spread"]) {
  test(`emplacement ${slot} : une valeur inventée ne plante pas et ne dessine rien`, () => {
    for (const junk of JUNK) assert.equal(draw({ [slot]: junk }).log, bare, `${slot} = ${String(junk)}`);
  });
}

test("tartine écrasée avec toute la tenue : pas d'erreur", () => {
  const look = Object.fromEntries(Object.entries(GEAR).map(([kind, g]) => [g.slot, kind]));
  const r = draw(look, [{ dx: 3, dy: 4, r: 5 }]);
  assert.deepEqual(r.bad, []);
});

for (const kind of Object.keys(PROJECTILES)) {
  test(`arme « ${kind} » : se dessine avec sa traînée`, () => {
    const { ctx, log, bad } = fakeCtx();
    const o = projectile(kind, 120, 80, 300, 600, kind === "whisk" ? 4 : 0);
    drawTrail(ctx, o);
    drawProjectile(ctx, o);
    assert.ok(log.length > 10);
    assert.deepEqual(bad, []);
  });
}

test("couteau tartiné de chaque garniture : pas d'erreur", () => {
  for (const spread of Object.keys(SPREADS)) {
    const { ctx, bad } = fakeCtx();
    drawProjectile(ctx, projectile("knife", 120, 80, 0, 600, 0, { spread }));
    assert.deepEqual(bad, [], spread);
  }
});
