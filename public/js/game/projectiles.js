import { FW, segDist2 } from "./field.js";
import { SPREADS } from "../shared/palette.js";

const RARE_CHANCE = 1 / 10;
const RARE_SPREADS = Object.keys(SPREADS).filter((k) => !SPREADS[k].free);

/** @type {Record<string, Weapon>} */
export const PROJECTILES = /** @type {never} */ ({
  knife: { name: "Couteau à beurre", by: "un couteau à beurre", len: 66, rad: 5 },
  fork: { name: "Fourchette", by: "une fourchette", len: 58, rad: 6, parts: [[-25, 0, 0, 0, 4], [7, 0, 23, 0, 6]] },
  rolling: { name: "Rouleau à pâtisserie", by: "un rouleau à pâtisserie", len: 84, rad: 11, across: true, parts: [[-20, 0, 20, 0, 10.5], [-37.5, 0, 37.5, 0, 4.5]] },
  whisk: { name: "Fouet", by: "un fouet", lab: true, len: 54, rad: 8, parts: [[-22.5, 0, -2, 0, 4.5], [8, 0, 19, 0, 8]] },
  cleaver: { name: "Hachoir", by: "un hachoir", len: 56, rad: 12, parts: [[-4, -6, 22, -6, 6], [-4, 6, 22, 6, 6], [-24, 0, -8, 0, 4]] },
  bread: { name: "Couteau à pain", by: "un couteau à pain", len: 84, rad: 5 }
});

for (const p of Object.values(PROJECTILES)) {
  const h = p.len / 2 - p.rad;
  p.parts = p.parts || [[-h, 0, h, 0, p.rad]];
  const ends = p.parts.flatMap(([ax, ay, bx, by, r]) => [[ax, ay, r], [bx, by, r]]);
  p.reach = Math.max(...ends.map(([x, y, r]) => Math.hypot(Math.max(0, Math.abs(x) - h), y) + r));
  p.spinReach = Math.max(...ends.map(([x, y, r]) => Math.hypot(x, y) + r));
}

/** @param {Shot} o @param {number} px @param {number} py */
export function gapTo(o, px, py) {
  const c = Math.cos(o.a), s = Math.sin(o.a);
  let gap = Infinity;
  for (const [ax, ay, bx, by, r] of PROJECTILES[o.kind].parts) {
    const d = Math.sqrt(segDist2(px, py, o.x + c * ax - s * ay, o.y + s * ax + c * ay, o.x + c * bx - s * by, o.y + s * bx + c * by)) - r;
    if (d < gap) gap = d;
  }
  return gap;
}

/** @param {string} kind @param {number} x @param {number} y @param {number} vx @param {number} vy @param {number} [spin] @param {Partial<Shot>} [extra] @returns {Shot} */
export function projectile(kind, x, y, vx, vy, spin = 0, extra = {}) {
  const { len, rad, across } = PROJECTILES[kind];
  const a = Math.atan2(vy, vx) + (across ? Math.PI / 2 : 0);
  return { kind, x, y, vx, vy, a, spin, len, rad, near: false, spread: null, bounces: 0, ...extra };
}

/** @param {Warn[]} items */
export function sprinkleRare(items) {
  const knives = items.flatMap((w) => w.obs.filter((o) => o.kind === "knife"));
  if (!knives.length || Math.random() >= RARE_CHANCE) return;
  knives[Math.floor(Math.random() * knives.length)].spread = RARE_SPREADS[Math.floor(Math.random() * RARE_SPREADS.length)];
}

/** @param {Shot} o @param {number} dt */
export function moveProjectile(o, dt) {
  o.x += o.vx * dt;
  o.y += o.vy * dt;
  if (o.spin) o.a += o.spin * dt;
  if (o.bounces > 0 && ((o.x > FW && o.vx > 0) || (o.x < 0 && o.vx < 0))) {
    o.x = o.vx > 0 ? 2 * FW - o.x : -o.x;
    o.vx = -o.vx;
    o.a = Math.PI - o.a;
    o.bounces--;
  }
}
