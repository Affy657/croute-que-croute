import { FW } from "./field.js";

const RARE_CHANCE = 1 / 25;
const RARE_SPREADS = ["jam", "choco", "honey", "ketchup"];

export const PROJECTILES = {
  knife: { name: "Couteau à beurre", len: 66, rad: 5 },
  fork: { name: "Fourchette", len: 58, rad: 6 },
  rolling: { name: "Rouleau à pâtisserie", len: 84, rad: 11, across: true, lab: true },
  whisk: { name: "Fouet", len: 62, rad: 9, lab: true },
  cleaver: { name: "Hachoir", len: 56, rad: 12, lab: true },
  bread: { name: "Couteau à pain", len: 84, rad: 5, lab: true }
};

const rareSpread = (kind) =>
  kind === "knife" && Math.random() < RARE_CHANCE ? RARE_SPREADS[Math.floor(Math.random() * RARE_SPREADS.length)] : null;

export function projectile(kind, x, y, vx, vy, spin = 0, extra = {}) {
  const { len, rad, across } = PROJECTILES[kind];
  const a = Math.atan2(vy, vx) + (across ? Math.PI / 2 : 0);
  return { kind, x, y, vx, vy, a, spin, len, rad, near: false, spread: rareSpread(kind), bounces: 0, ...extra };
}

export function moveProjectile(o, dt) {
  o.x += o.vx * dt;
  o.y += o.vy * dt;
  if (o.spin) o.a += o.spin * dt;
  if (o.bounces > 0 && ((o.x > FW && o.vx > 0) || (o.x < 0 && o.vx < 0))) {
    o.x = o.vx > 0 ? 2 * FW - o.x : -o.x;
    o.vx = -o.vx;
    o.a = Math.atan2(o.vy, o.vx);
    o.bounces--;
  }
}
