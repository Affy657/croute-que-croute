import { FW, FH, M, clamp, speedMul } from "./field.js";
import { projectile } from "./projectiles.js";

const MAX_STREAK = 3, REPEAT_FACTOR = 0.5;
const SLANT = 0.55, CLEAVER_GAP = 0.3, ROLLING_GAP = 0.55, SERIES_GAP = 0.7, SERIES_MOVE = 90, SERIES_SHIFT = 140, SERIES_NOTICE = 0.7;
export const WALL_HOLE = 144, WALL_AWAY = 90, WALL_LOW = 430;
const BREATHERS = ["rolling", "bread", "slant"];

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
  const spinning = t >= 25 && rng() < 0.35;
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

const rainSize = (t) => Math.min(8, 4 + Math.floor(t / 15));

const rain = (g) => rainOf(g, rainSize(g.t), 0.14);

function slant({ t, rnd, pick }) {
  const n = rainSize(t), dir = pick([1, -1]), v = 190 * speedMul(t);
  const vx = dir * v * Math.sin(SLANT), vy = v * Math.cos(SLANT);
  const items = [];
  for (let i = 0; i < n; i++) {
    const k = (i + rnd(0.2, 0.8)) / n;
    const x = dir > 0 ? 16 + k * (FW - 32) : FW - 16 - k * (FW - 32);
    items.push({ x, y: 10, a: Math.atan2(vy, vx), at: t + 0.45 + i * 0.14, obs: [projectile("fork", x, -M, vx, vy)] });
  }
  return items;
}

function downpour({ t, rng, rnd }) {
  const n = rainSize(t) + 1, v = 190 * speedMul(t);
  let left = rng() < 0.5;
  const items = [];
  for (let i = 0; i < n; i++) {
    const x = left ? rnd(16, FW / 2 - 10) : rnd(FW / 2 + 10, FW - 16);
    items.push({ x, y: 10, a: Math.PI / 2, at: t + 0.45 + i * 0.13, obs: [projectile("fork", x, -M, 0, v)] });
    left = !left;
  }
  return items;
}

function wallLine(gc, lo, hi, step, make) {
  const items = [];
  for (let p = gc - WALL_HOLE / 2; p > lo; p -= step) items.push(make(p));
  for (let p = gc + WALL_HOLE / 2; p < hi; p += step) items.push(make(p));
  return items;
}

function topWall({ rnd }, at, v, gc = rnd(70, FW - 70)) {
  return wallLine(gc, -18, FW + 18, 36, (x) => ({ x: clamp(x, 10, FW - 10), y: 10, a: Math.PI / 2, at, obs: [projectile("fork", x, -M, 0, v)] }));
}

function sideWall({ rnd }, side, at, v, gc = rnd(100, WALL_LOW)) {
  const dir = side === "left" ? 1 : -1;
  const x0 = side === "left" ? -M : FW + M;
  return wallLine(gc, -16, FH + 16, 34, (y) => ({ x: side === "left" ? 10 : FW - 10, y: clamp(y, 10, FH - 10), a: dir > 0 ? 0 : Math.PI, at, obs: [projectile("knife", x0, y, dir * v, 0)] }));
}

function holeAway(rnd, lo, hi, from) {
  const a = clamp(from - WALL_AWAY, lo, hi), b = clamp(from + WALL_AWAY, lo, hi);
  const u = rnd(0, a - lo + hi - b);
  return u < a - lo ? lo + u : b + u - (a - lo);
}

function wall(g) {
  const side = g.pick(["left", "right", "top"]);
  const v = 150 * speedMul(g.t), at = g.t + 0.7;
  return side === "top" ? topWall(g, at, v, holeAway(g.rnd, 70, FW - 70, g.toast.x)) : sideWall(g, side, at, v, holeAway(g.rnd, 100, WALL_LOW, g.toast.y));
}

const seriesSize = (t) => (t >= 60 ? 3 : 2);

function wallSeries(g) {
  const { t, toast, rng, rnd, pick } = g;
  const side = pick(["left", "right", "top"]);
  const v = 150 * speedMul(t);
  const [lo, hi] = side === "top" ? [70, FW - 70] : [100, WALL_LOW];
  const items = [];
  let gc = holeAway(rnd, lo, hi, side === "top" ? toast.x : toast.y);
  for (let i = 0; i < seriesSize(t); i++) {
    const at = t + 0.7 + i * SERIES_GAP;
    const wall = side === "top" ? topWall(g, at, v, gc) : sideWall(g, side, at, v, gc);
    if (i) for (const w of wall) w.notice = SERIES_NOTICE;
    items.push(...wall);
    const d = rnd(SERIES_MOVE, SERIES_SHIFT) * (rng() < 0.5 ? -1 : 1);
    gc = clamp(gc + d < lo || gc + d > hi ? gc - d : gc + d, lo, hi);
  }
  return items;
}

function corridor(g) {
  const first = g.pick(["left", "right"]);
  const v = 150 * speedMul(g.t), at = g.t + 0.7;
  return [...sideWall(g, first, at, v), ...sideWall(g, first === "left" ? "right" : "left", at + 0.7, v)];
}

function fan({ t, toast, pick }) {
  const p = pick([{ x: -M, y: -M }, { x: FW + M, y: -M }, { x: FW / 2, y: -M }, { x: -M, y: FH * 0.4 }, { x: FW + M, y: FH * 0.4 }]);
  const n = t >= 54 ? 5 : t >= 38 ? 4 : 3;
  const spread = 0.9;
  const v = 200 * speedMul(t);
  const base = Math.atan2(toast.y - p.y, toast.x - p.x) + (n % 2 ? 0 : (spread / (n - 1) / 2) * pick([1, -1]));
  const w = inside(p);
  const obs = [];
  for (let i = 0; i < n; i++) {
    const a = base - spread / 2 + (spread * i) / (n - 1);
    obs.push(projectile("knife", p.x, p.y, Math.cos(a) * v, Math.sin(a) * v));
  }
  return [{ x: w.x, y: w.y, a: base, at: t + 0.6, obs }];
}

function cross({ t, toast, rnd }) {
  const v = 190 * speedMul(t), at = t + 0.7;
  const starts = [{ x: -M, y: -M }, { x: FW + M, y: -M }, { x: -M, y: rnd(20, FH * 0.6) }, { x: FW + M, y: rnd(20, FH * 0.6) }];
  return starts.map((p) => aimedFrom(p, toast, at, v));
}

const rollingCount = (t) => (t >= 36 ? 2 : 1);

function rolling({ t, rnd, pick }) {
  const top = 80, range = FH - 80 - top, v = 110 * speedMul(t);
  const items = [];
  let y = rnd(top, top + range);
  for (let i = 0; i < rollingCount(t); i++) {
    const side = pick(["left", "right"]);
    const dir = side === "left" ? 1 : -1;
    items.push({ x: side === "left" ? 10 : FW - 10, y, a: dir > 0 ? 0 : Math.PI, at: t + 0.7 + i * ROLLING_GAP, obs: [projectile("rolling", side === "left" ? -M : FW + M, y, dir * v, 0, 0, { bounces: 1 })] });
    y = top + ((y - top + rnd(60, range - 60)) % range);
  }
  return items;
}

function whisk({ t, toast, rng, rnd }) {
  const p = { x: rnd(40, FW - 40), y: -M };
  return [aimedFrom(p, toast, t + 0.7, 100 * speedMul(t), "whisk", 5 * (rng() < 0.5 ? -1 : 1))];
}

const cleaverCount = (t) => (t >= 55 ? 3 : t >= 30 ? 2 : 1);

function cleaver({ t, toast, rng, rnd }) {
  const items = [];
  let x = clamp(toast.x + rnd(-10, 10), 30, FW - 30);
  for (let i = 0; i < cleaverCount(t); i++) {
    items.push({ x, y: 10, a: Math.PI / 2, at: t + 0.9 + i * CLEAVER_GAP, obs: [projectile("cleaver", x, -M, 0, 300 * speedMul(t))] });
    const step = rnd(70, 120) * (rng() < 0.5 ? -1 : 1);
    x = clamp(x + step < 30 || x + step > FW - 30 ? x - step : x + step, 30, FW - 30);
  }
  return items;
}

function bread({ t, toast, pick }) {
  const fromLeft = pick([true, false]);
  const p = { x: fromLeft ? -M : FW + M, y: -M };
  const target = { x: fromLeft ? 2 * FW - toast.x : -toast.x, y: toast.y };
  return [aimedFrom(p, target, t + 0.6, 240 * speedMul(t), "bread", 0, { bounces: 1 })];
}

export const ATTACKS = [
  { id: "aimed", name: "Couteau visé", from: 0, weight: 2.5, cost: 1, speed: 230, make: aimed, growsUntil: 25, growth: "le couteau visé se met à tourner",
    info: "Un couteau lancé droit sur toi, du haut ou d'un côté. Bouge pendant l'alerte et c'est esquivé. Dès 25 s, il tourne sur lui-même une fois sur trois." },
  { id: "rain", name: "Pluie de fourchettes", from: 3, weight: 1.4, cost: 1.5, speed: 190, make: rain, growsUntil: 60, growth: "pluie max : 8 fourchettes",
    info: "4 fourchettes tombent du haut à la suite, un peu en biais. Une de plus toutes les 15 s, jusqu'à 8." },
  { id: "cleaver", name: "Hachoir", avoids: ["rain", "slant", "downpour", "cross", "wall", "walls"], from: 8, weight: 0.9, cost: 1.3, speed: 300, make: cleaver, growsUntil: 55, growth: "hachoirs par 3",
    info: "Tombe tout droit et très vite dans ta colonne, avec 0,9 s d'alerte. Change de colonne. Un 2e suit juste à côté dès 30 s, un 3e dès 55 s." },
  { id: "wall", name: "Mur", kin: "wall", solo: true, shuns: ["rolling", "wall", "walls"], from: 12, weight: 1.1, cost: 1.7, speed: 150, make: wall,
    info: "Une rangée serrée avec un seul trou, par le haut ou par un côté, jamais pile sur toi. L'alerte te montre déjà où est le trou." },
  { id: "rolling", name: "Rouleau à pâtisserie", shuns: ["wall", "walls"], avoids: BREATHERS, from: 16, weight: 0.8, cost: 1.6, speed: 110, make: rolling, growsUntil: 36, growth: "rouleaux par 2",
    info: "Un gros rouleau debout traverse lentement l'écran par un côté, rebondit sur l'autre bord et revient. Passe au-dessus ou en dessous. 2 d'affilée dès 36 s." },
  { id: "fan", name: "Éventail", from: 22, weight: 1.1, cost: 1.5, speed: 200, make: fan, growsUntil: 54, growth: "éventail max : 5 couteaux",
    info: "3 à 5 couteaux en cône depuis le même point, dont un toujours sur toi. Sors du cône par le côté." },
  { id: "whisk", name: "Fouet", lab: true, from: 4, weight: 0.7, cost: 1.3, speed: 100, make: whisk,
    info: "Un fouet qui tourne descend lentement vers toi et prend beaucoup de place." },
  { id: "walls", name: "Murs en série", kin: "wall", shuns: ["rolling", "wall", "walls"], solo: true, calm: true, from: 28, weight: 0.6, cost: 1, speed: 150, make: wallSeries, growsUntil: 60, growth: "murs en série par 3",
    info: "2 murs d'affilée (3 dès 60 s), toujours du même côté ou du haut, chacun avec son trou et son alerte juste avant. Rien d'autre ne tombe pendant la série." },
  { id: "cross", name: "Croix", solo: true, avoids: ["cleaver", "wall", "walls"], from: 32, weight: 0.7, cost: 1.6, speed: 190, make: cross,
    info: "4 couteaux d'un coup, depuis les deux coins du haut et les deux côtés, tous sur toi. Écarte-toi du point visé." },
  { id: "bread", name: "Couteau à pain", avoids: BREATHERS, from: 38, weight: 0.7, cost: 1.2, speed: 240, make: bread,
    info: "Lancé d'un coin du haut, il rebondit sur le bord d'en face puis fonce sur toi. Suis la pointe de l'alerte et anticipe le rebond." },
  { id: "slant", name: "Pluie en biais", avoids: BREATHERS, from: 45, weight: 0.8, cost: 1.5, speed: 190, make: slant, growsUntil: 60, growth: "pluie en biais max : 8 fourchettes",
    info: "7 à 8 fourchettes tombent en biais à la suite et balaient l'écran d'un bord à l'autre." },
  { id: "corridor", name: "Couloir", lab: true, solo: true, from: 46, weight: 0.6, cost: 2.2, speed: 150, make: corridor,
    info: "Un mur d'un côté, puis un autre de l'autre côté juste derrière, chacun avec son trou. Enchaîne d'un trou à l'autre." },
  { id: "downpour", name: "Double pluie", solo: true, avoids: ["rain", "slant"], from: 54, weight: 0.6, cost: 1.8, speed: 190, make: downpour,
    info: "Une rafale de 8 fourchettes (9 dès 60 s) qui tombent tout droit, une fois à gauche, une fois à droite." }
];

export function pickAttack(t, rng, last = null, streak = 0, active = new Set()) {
  const open = ATTACKS.filter((a) => !a.lab && t > a.from && !(a.shuns && a.shuns.some((id) => active.has(id))));
  const prev = ATTACKS.find((a) => a.id === last), kin = prev && prev.kin;
  const allowed = open.filter((a) => (a.id !== last || (!a.solo && streak < MAX_STREAK)) && !(kin && a.kin === kin && a.id !== last) && !(a.avoids && a.avoids.includes(last)));
  const pool = allowed.length ? allowed : open;
  const weight = (a) => a.weight * (a.id === last ? REPEAT_FACTOR ** streak : 1);
  let r = rng() * pool.reduce((s, a) => s + weight(a), 0);
  for (const a of pool) {
    r -= weight(a);
    if (r < 0) return a;
  }
  return pool[0];
}
