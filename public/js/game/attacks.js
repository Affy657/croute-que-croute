import { FW, FH, M, clamp, speedMul } from "./field.js";
import { projectile } from "./projectiles.js";

const MAX_STREAK = 3, REPEAT_FACTOR = 0.5;

const inside = (p) => ({ x: clamp(p.x, 10, FW - 10), y: clamp(p.y, 10, FH - 10) });

function edgePoint({ rnd, pick }) {
  const side = pick(["top", "top", "left", "right"]);
  if (side === "top") return { x: rnd(20, FW - 20), y: -M };
  if (side === "left") return { x: -M, y: rnd(20, FH * 0.6) };
  return { x: FW + M, y: rnd(20, FH * 0.6) };
}

function aimedFrom(p, target, at, v, kind = "knife", spin = 0, extra) {
  const a = Math.atan2(target.y - p.y, target.x - p.x);
  const w = inside(p);
  return { x: w.x, y: w.y, a, at, obs: [projectile(kind, p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, spin, extra)] };
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

function rainOf({ t, rnd }, n, gap) {
  const v = 190 * speedMul(t);
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = rnd(16, FW - 16);
    items.push({ x, y: 10, a: Math.PI / 2, at: t + 0.45 + i * gap, obs: [projectile("fork", x, -M, rnd(-25, 25), v)] });
  }
  return items;
}

const rainSize = (t) => 4 + Math.min(4, Math.floor(t / 15));

const rain = (g) => rainOf(g, rainSize(g.t), 0.14);

const downpour = (g) => rainOf(g, rainSize(g.t) * 2, 0.09);

function topWall({ rnd }, at, v) {
  const gap = 50, gc = rnd(70, FW - 70);
  const items = [];
  for (let x = 18; x < FW; x += 36) {
    if (Math.abs(x - gc) >= gap) items.push({ x, y: 10, a: Math.PI / 2, at, obs: [projectile("fork", x, -M, 0, v)] });
  }
  return items;
}

function sideWall({ rnd }, side, at, v) {
  const gap = 50, gc = rnd(100, FH * 0.62);
  const dir = side === "left" ? 1 : -1;
  const x0 = side === "left" ? -M : FW + M;
  const items = [];
  for (let y = 18; y < FH; y += 34) {
    if (Math.abs(y - gc) >= gap) items.push({ x: side === "left" ? 10 : FW - 10, y, a: dir > 0 ? 0 : Math.PI, at, obs: [projectile("knife", x0, y, dir * v, 0)] });
  }
  return items;
}

function wall(g) {
  const side = g.pick(["left", "right", "top"]);
  const v = 150 * speedMul(g.t), at = g.t + 0.7;
  return side === "top" ? topWall(g, at, v) : sideWall(g, side, at, v);
}

function corridor(g) {
  const first = g.pick(["left", "right"]);
  const v = 150 * speedMul(g.t), at = g.t + 0.7;
  return [...sideWall(g, first, at, v), ...sideWall(g, first === "left" ? "right" : "left", at + 0.55, v)];
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

function cross({ t, toast, rnd }) {
  const v = 210 * speedMul(t), at = t + 0.6;
  const starts = [{ x: -M, y: -M }, { x: FW + M, y: -M }, { x: -M, y: rnd(20, FH * 0.6) }, { x: FW + M, y: rnd(20, FH * 0.6) }];
  return starts.map((p) => aimedFrom(p, toast, at, v));
}

function rolling({ t, rnd, pick }) {
  const side = pick(["left", "right"]);
  const dir = side === "left" ? 1 : -1;
  const y = rnd(80, FH * 0.6), v = 110 * speedMul(t);
  return [{ x: side === "left" ? 10 : FW - 10, y, a: dir > 0 ? 0 : Math.PI, at: t + 0.7, obs: [projectile("rolling", side === "left" ? -M : FW + M, y, dir * v, 0)] }];
}

function whisk({ t, toast, rng, rnd }) {
  const p = { x: rnd(40, FW - 40), y: -M };
  return [aimedFrom(p, toast, t + 0.6, 120 * speedMul(t), "whisk", 6 * (rng() < 0.5 ? -1 : 1))];
}

function cleaver({ t, toast, rnd }) {
  const x = clamp(toast.x + rnd(-10, 10), 30, FW - 30);
  return [{ x, y: 10, a: Math.PI / 2, at: t + 0.9, obs: [projectile("cleaver", x, -M, 0, 380 * speedMul(t))] }];
}

function bread({ t, toast, pick }) {
  const fromLeft = pick([true, false]);
  const p = { x: fromLeft ? -M : FW + M, y: -M };
  const target = { x: fromLeft ? 2 * FW - toast.x : -toast.x, y: toast.y };
  return [aimedFrom(p, target, t + 0.6, 260 * speedMul(t), "bread", 0, { bounces: 1 })];
}

export const ATTACKS = [
  { id: "aimed", name: "Couteau visé", from: 0, weight: 3, cost: 1, speed: 230, make: aimed,
    info: "Un couteau lancé du haut ou d'un côté vers la tartine. Bouger pendant l'annonce suffit. Dès 35 s, une fois sur trois il tourne sur lui-même." },
  { id: "rain", name: "Pluie de fourchettes", from: 6, weight: 1.4, cost: 1.5, speed: 190, make: rain,
    info: "4 fourchettes (jusqu'à 8) tombent du haut l'une après l'autre, un peu en biais." },
  { id: "wall", name: "Mur", from: 14, weight: 1.1, cost: 1.7, speed: 150, make: wall,
    info: "Une rangée serrée avec un seul trou, par le haut ou par un côté. Les flèches montrent déjà le trou." },
  { id: "fan", name: "Éventail", from: 24, weight: 1.1, cost: 1.5, speed: 200, make: fan,
    info: "5 à 7 couteaux ouverts en cône depuis un même point, centrés sur la tartine. Il faut sortir du cône par le côté." },
  { id: "cross", name: "Croix", from: 30, weight: 0.7, cost: 1.6, speed: 210, make: cross,
    info: "4 couteaux en même temps depuis les deux coins du haut et les deux côtés, tous vers la tartine. S'écarter du point visé." },
  { id: "corridor", name: "Couloir", from: 40, weight: 0.6, cost: 2.2, speed: 150, make: corridor,
    info: "Un mur par un côté, puis un mur par l'autre côté 0,55 s plus tard, chacun avec son trou. Passer d'un trou à l'autre." },
  { id: "downpour", name: "Double pluie", from: 45, weight: 0.6, cost: 2, speed: 190, make: downpour,
    info: "Deux fois plus de fourchettes que la pluie, et plus serrées (une toutes les 0,09 s)." },
  { id: "rolling", name: "Rouleau à pâtisserie", lab: true, from: 0, weight: 1, cost: 1.3, speed: 110, make: rolling,
    info: "Prototype. Un gros rouleau debout traverse lentement l'écran par un côté : passer au-dessus ou en dessous." },
  { id: "whisk", name: "Fouet", lab: true, from: 0, weight: 1, cost: 1.2, speed: 120, make: whisk,
    info: "Prototype. Un fouet qui tourne sur lui-même descend lentement vers la tartine et occupe une grosse zone." },
  { id: "cleaver", name: "Hachoir", lab: true, from: 0, weight: 1, cost: 1.1, speed: 380, make: cleaver,
    info: "Prototype. Un hachoir tombe tout droit et très vite au-dessus de la tartine, annoncé 0,9 s avant." },
  { id: "bread", name: "Couteau à pain", lab: true, from: 0, weight: 1, cost: 1.2, speed: 260, make: bread,
    info: "Prototype. Lancé d'un coin du haut, il rebondit sur le bord opposé puis file vers la tartine." }
];

export function pickAttack(t, rng, last = null, streak = 0) {
  const open = ATTACKS.filter((a) => !a.lab && t > a.from);
  const allowed = open.filter((a) => !(a.id === last && streak >= MAX_STREAK));
  const pool = allowed.length ? allowed : open;
  const weight = (a) => a.weight * (a.id === last ? REPEAT_FACTOR ** streak : 1);
  let r = rng() * pool.reduce((s, a) => s + weight(a), 0);
  for (const a of pool) {
    r -= weight(a);
    if (r < 0) return a;
  }
  return pool[0];
}
