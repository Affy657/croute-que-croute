import { FW, FH, M, clamp, speedMul } from "./field.js";
import { projectile } from "./projectiles.js";

const inside = (p) => ({ x: clamp(p.x, 10, FW - 10), y: clamp(p.y, 10, FH - 10) });

function edgePoint({ rnd, pick }) {
  const side = pick(["top", "top", "left", "right"]);
  if (side === "top") return { x: rnd(20, FW - 20), y: -M };
  if (side === "left") return { x: -M, y: rnd(20, FH * 0.6) };
  return { x: FW + M, y: rnd(20, FH * 0.6) };
}

function aimed(g) {
  const { t, toast, rng, rnd } = g;
  const spinning = t > 35 && rng() < 0.35;
  const p = edgePoint(g);
  const v = 230 * speedMul(t) * rnd(0.95, 1.1);
  const a = Math.atan2(toast.y + rnd(-18, 18) - p.y, toast.x + rnd(-18, 18) - p.x);
  const w = inside(p);
  const spin = spinning ? rnd(7, 10) * (rng() < 0.5 ? -1 : 1) : 0;
  return [{ x: w.x, y: w.y, a, at: t + 0.5, obs: [projectile("knife", p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, spin)] }];
}

function rain({ t, rnd }) {
  const n = 4 + Math.min(4, Math.floor(t / 15));
  const v = 190 * speedMul(t);
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = rnd(16, FW - 16);
    items.push({ x, y: 10, a: Math.PI / 2, at: t + 0.45 + i * 0.14, obs: [projectile("fork", x, -M, rnd(-25, 25), v)] });
  }
  return items;
}

function wall({ t, rnd, pick }) {
  const side = pick(["left", "right", "top"]);
  const v = 150 * speedMul(t);
  const gap = 50, at = t + 0.7;
  const items = [];
  if (side === "top") {
    const gc = rnd(70, FW - 70);
    for (let x = 18; x < FW; x += 36) {
      if (Math.abs(x - gc) >= gap) items.push({ x, y: 10, a: Math.PI / 2, at, obs: [projectile("fork", x, -M, 0, v)] });
    }
  } else {
    const gc = rnd(100, FH * 0.62);
    const dir = side === "left" ? 1 : -1;
    const x0 = side === "left" ? -M : FW + M;
    for (let y = 18; y < FH; y += 34) {
      if (Math.abs(y - gc) >= gap) items.push({ x: side === "left" ? 10 : FW - 10, y, a: dir > 0 ? 0 : Math.PI, at, obs: [projectile("knife", x0, y, dir * v, 0)] });
    }
  }
  return items;
}

function fan({ t, toast, pick }) {
  const p = pick([{ x: -M, y: -M }, { x: FW + M, y: -M }, { x: FW / 2, y: -M }, { x: -M, y: FH * 0.4 }, { x: FW + M, y: FH * 0.4 }]);
  const n = 5 + Math.min(2, Math.floor((t - 24) / 20));
  const spread = 0.9;
  const v = 200 * speedMul(t);
  const base = Math.atan2(toast.y - p.y, toast.x - p.x);
  const w = inside(p);
  const obs = [];
  for (let i = 0; i < n; i++) {
    const a = base - spread / 2 + (spread * i) / (n - 1);
    obs.push(projectile("knife", p.x, p.y, Math.cos(a) * v, Math.sin(a) * v));
  }
  return [{ x: w.x, y: w.y, a: base, at: t + 0.6, obs }];
}

export const ATTACKS = [
  { id: "aimed", from: 0, weight: 3, cost: 1, make: aimed },
  { id: "rain", from: 6, weight: 1.4, cost: 1.5, make: rain },
  { id: "wall", from: 14, weight: 1.1, cost: 1.7, make: wall },
  { id: "fan", from: 24, weight: 1.1, cost: 1.5, make: fan }
];

export function pickAttack(t, rng) {
  const pool = ATTACKS.filter((a) => t > a.from);
  let r = rng() * pool.reduce((s, a) => s + a.weight, 0);
  for (const a of pool) {
    r -= a.weight;
    if (r < 0) return a;
  }
  return pool[0];
}
