import { FW, FH, HIT_R, NEAR, OUT, X_MIN, X_MAX, Y_MIN, Y_MAX, clamp } from "./field.js";
import { ATTACKS, pickAttack } from "./attacks.js";
import { moveProjectile, sprinkleRare, gapTo } from "./projectiles.js";
import { solve } from "./solver.js";

const TRIES = 5, REACT = 0.1;
export const GAP_START = 1.25, GAP_SLOPE = 0.016, GAP_MIN = 0.42;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export function createSim(rng = Math.random, { fair = true, react = REACT, only = null, t0 = 0 } = {}) {
  const rnd = (a, b) => a + rng() * (b - a);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const forced = only && ATTACKS.find((a) => a.id === only);
  const state = {
    t: t0, next: 0.9, tries: 0, near: 0, dead: false, last: null, streak: 0,
    toast: { x: FW / 2, y: FH * 0.7 },
    obs: [], warns: [],
    stats: { spawned: 0, rejected: 0, impossible: 0, solves: 0, solveMs: 0, solveMax: 0 }
  };

  function solveTimed(extra) {
    const t0 = now();
    const ok = solve(state, extra, false, react);
    const ms = now() - t0;
    state.stats.solves++;
    state.stats.solveMs += ms;
    state.stats.solveMax = Math.max(state.stats.solveMax, ms);
    return ok;
  }

  function spawn() {
    const t = state.t;
    const attack = forced || pickAttack(t, rng, state.last, state.streak);
    const items = attack.make({ t, toast: state.toast, rng, rnd, pick });
    const ok = solveTimed(items);
    if (ok || !fair) {
      if (!ok) state.stats.impossible++;
      for (const w of items) {
        w.born = t;
        for (const o of w.obs) o.from = attack.id;
      }
      sprinkleRare(items);
      state.warns.push(...items);
      state.stats.spawned++;
      state.tries = 0;
      state.streak = attack.id === state.last ? state.streak + 1 : 1;
      state.last = attack.id;
      state.next = Math.max(GAP_MIN, GAP_START - t * GAP_SLOPE) * attack.cost * rnd(0.85, 1.15);
      return;
    }
    state.stats.rejected++;
    state.tries++;
    state.next = state.tries < TRIES ? 1 / 60 : 0.25;
    if (state.tries >= TRIES) state.tries = 0;
  }

  function moveObs(dt) {
    for (const o of state.obs) moveProjectile(o, dt);
    state.obs = state.obs.filter((o) => o.x > -OUT && o.x < FW + OUT && o.y > -OUT && o.y < FH + OUT);
  }

  function launch() {
    for (const w of state.warns) {
      if (state.t < w.at) continue;
      const d = state.t - w.at;
      for (const o of w.obs) state.obs.push({ ...o, x: o.x + o.vx * d, y: o.y + o.vy * d, a: o.a + o.spin * d });
    }
    state.warns = state.warns.filter((w) => state.t < w.at);
  }

  function collide(events) {
    const tt = state.toast;
    for (const o of state.obs) {
      const gap = gapTo(o, tt.x, tt.y);
      if (gap < HIT_R) {
        state.dead = true;
        events.push({ type: "death", by: o.from });
        return;
      }
      if (!o.near && gap < HIT_R + NEAR) {
        o.near = true;
        state.near++;
        events.push({ type: "near" });
      }
    }
  }

  function step(dt, mx, my) {
    const events = [];
    if (state.dead) return events;
    state.t += dt;
    const tt = state.toast;
    tt.x = clamp(tt.x + mx, X_MIN, X_MAX);
    tt.y = clamp(tt.y + my, Y_MIN, Y_MAX);
    moveObs(dt);
    launch();
    state.next -= dt;
    if (state.next <= 0) spawn();
    collide(events);
    return events;
  }

  return {
    state,
    step,
    drift: moveObs,
    plan: () => solve(state, null, true)
  };
}
