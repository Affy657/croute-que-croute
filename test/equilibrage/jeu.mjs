import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

export const DIR = resolve(process.env.GAME || "public/js/game");
const load = (file) => import(pathToFileURL(resolve(DIR, file)).href);
export const { createSim, CALM_PASS } = await load("sim.js");
export const { solve } = await load("solver.js");
export const { ATTACKS, WALL_HOLE } = await load("attacks.js");
export const { gapTo } = await load("projectiles.js");
export const field = await load("field.js");

const SDT = 1 / 30, REPLAN_S = 0.5, OFF_PX = 30, LAPSE_S = 0.4, PER_CELL = 4;

export function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const profileOf = (skill) => ({ skill, rt: 0.33 - 0.15 * skill, spd: 240 + 240 * skill, lapse: 6 + 14 * skill });

const sideOf = (id, kind) => (id === "walls" ? (kind === "fork" ? "walls-haut" : "walls-cote") : id);

export const NAMES = {
  ...Object.fromEntries(ATTACKS.map((a) => [a.id, a.name])),
  "walls-haut": "Murs en série (haut)",
  "walls-cote": "Murs en série (côtés)"
};

export function solverPilot(sim) {
  const s = sim.state;
  let path = null, idx = 0, left = 0, seen = -1, from = null, to = null;
  return () => {
    if (left === 0) {
      if (!path || s.stats.spawned !== seen || idx >= path.length - 1) {
        seen = s.stats.spawned;
        path = sim.plan();
        idx = 0;
      }
      from = { x: s.toast.x, y: s.toast.y };
      to = path ? path[Math.min(++idx, path.length - 1)] : from;
      left = PER_CELL;
    }
    const k = (PER_CELL - left + 1) / PER_CELL;
    left--;
    return { x: from.x + (to.x - from.x) * k - s.toast.x, y: from.y + (to.y - from.y) * k - s.toast.y };
  };
}

export function playHuman(seed, { rt, spd, lapse }, limit, { t0 = 0, setup, tick } = {}) {
  const sim = createSim(mulberry32(seed), { t0 });
  const luck = mulberry32(seed ^ 0x5bd1e995);
  const s = sim.state, seen = new WeakSet(), spawns = [];
  let path = null, tPlan = 0, lastPlan = -1, killer = null, frozen = 0, count = 0;
  const step = (mx, my) => {
    for (const e of sim.step(field.STEP, mx, my)) if (e.type === "death") killer = sideOf(e.by, e.kind);
    if (s.stats.spawned !== count) {
      count = s.stats.spawned;
      spawns.push({ id: sideOf(s.last, s.warns[s.warns.length - 1]?.obs[0]?.kind), t: s.t });
    }
  };
  if (setup) setup(sim);
  while (!s.dead && s.t < limit && !(tick && tick(sim))) {
    if (frozen <= 0 && lapse && luck() < field.STEP / lapse) frozen = LAPSE_S;
    if (frozen > 0) {
      frozen -= field.STEP;
      path = null;
      step(0, 0);
      continue;
    }
    const vis = s.warns.filter((w) => (w.born ?? 0) + rt <= s.t);
    let fresh = false;
    for (const w of vis) {
      if (seen.has(w)) continue;
      seen.add(w);
      fresh = true;
    }
    let target = path && path[Math.min(Math.floor((s.t - tPlan) / SDT) + 1, path.length - 1)];
    const off = target ? Math.hypot(target.x - s.toast.x, target.y - s.toast.y) : Infinity;
    if (fresh || !path || s.t - lastPlan > REPLAN_S || off > OFF_PX) {
      const p = solve({ t: s.t, toast: s.toast, obs: s.obs, warns: vis }, null, true);
      if (p) {
        path = p;
        tPlan = s.t;
        target = path[Math.min(1, path.length - 1)];
      }
      lastPlan = s.t;
    }
    let mx = 0, my = 0;
    if (target) {
      const dx = target.x - s.toast.x, dy = target.y - s.toast.y, d = Math.hypot(dx, dy), cap = spd * field.STEP;
      const k = d > cap ? cap / d : 1;
      mx = dx * k;
      my = dy * k;
    }
    step(mx, my);
  }
  return { t: s.t, dead: s.dead, killer, spawns };
}

export const median = (v) => {
  const s = [...v].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : NaN;
};

export const fmt = (n, d = 1) => (Number.isFinite(n) ? n.toFixed(d).replace(".", ",") : "-");
