import { FW, FH, M, HIT_R, NEAR, OUT, X_MIN, X_MAX, Y_MIN, Y_MAX, clamp } from "./field.js";
import { ATTACKS, pickAttack } from "./attacks.js";
import { moveProjectile, sprinkleRare, gapTo } from "./projectiles.js";
import { solve } from "./solver.js";

const TRIES = 5, REACT = 0.1, SWEEP = 6, MOVE_MAX = 10 * (FW + FH);
export const CALM_PASS = 0.2, WAIT_PASS = 0.5;
export const GAP_START = 0.95, GAP_SLOPE = 0.005625, GAP_MIN = 0.5;
const mortal = () => false;
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

function passAt(items, part = CALM_PASS) {
  let end = 0;
  for (const w of items) {
    for (const o of w.obs) {
      const tx = o.vx > 0 ? (FW + M - o.x) / o.vx : o.vx < 0 ? (o.x + M) / -o.vx : Infinity;
      const ty = o.vy > 0 ? (FH + M - o.y) / o.vy : o.vy < 0 ? (o.y + M) / -o.vy : Infinity;
      end = Math.max(end, w.at + part * Math.min(tx, ty));
    }
  }
  return end;
}

export function createSim(rng = Math.random, { fair = true, react = REACT, only = null, t0 = 0, y = FH * 0.7, immortal = mortal } = {}) {
  const rnd = (a, b) => a + rng() * (b - a);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const forced = only && ATTACKS.find((a) => a.id === only);
  const state = {
    t: t0, next: 0.9, tries: 0, near: 0, dead: false, last: null, streak: 0, queued: null, held: null, until: {},
    toast: { x: FW / 2, y: Number.isFinite(y) ? y : FH * 0.7 },
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
    const active = new Set([...state.obs.map((o) => o.from), ...state.warns.flatMap((w) => w.obs.map((o) => o.from))]);
    const fresh = new Set(Object.keys(state.until).filter((id) => state.until[id] > t));
    const blocked = (a) => [...(a.holds || []), ...(a.shuns || [])].some((id) => active.has(id));
    let attack = forced || state.queued;
    if (!attack && state.held && !blocked(state.held)) {
      attack = state.held;
      state.held = null;
    }
    if (!attack) attack = pickAttack(t, rng, state.last, state.streak, state.held ? new Set([...active, state.held.id]) : active, fresh);
    state.queued = null;
    if (!forced && attack.holds && attack.holds.some((id) => active.has(id))) {
      state.held = attack;
      attack = pickAttack(t, rng, state.last, state.streak, new Set([...active, attack.id]), fresh);
    }
    if (forced && forced.shuns && forced.shuns.some((id) => active.has(id))) {
      state.next = 0.1;
      return;
    }
    if (attack.waits && attack.waits.some((id) => fresh.has(id))) {
      if (!forced) state.queued = attack;
      state.next = Math.max(...attack.waits.map((id) => state.until[id] || 0)) - t;
      return;
    }
    if (attack.calm && state.warns.length) {
      state.queued = attack;
      state.next = Math.max(...state.warns.map((w) => w.at)) - t;
      return;
    }
    const items = attack.make({ t, toast: state.toast, rng, rnd, pick, last: state.last });
    const ok = solveTimed(items);
    if (ok || !fair) {
      if (!ok) state.stats.impossible++;
      for (const w of items) {
        w.born = w.notice ? Math.max(t, w.at - w.notice) : t;
        for (const o of w.obs) o.from = attack.id;
      }
      sprinkleRare(items);
      state.warns.push(...items);
      state.stats.spawned++;
      state.tries = 0;
      state.streak = attack.id === state.last ? state.streak + 1 : 1;
      state.last = attack.id;
      state.until[attack.id] = Math.max(state.until[attack.id] || 0, passAt(items, WAIT_PASS));
      const gap = Math.max(GAP_MIN, GAP_START - t * GAP_SLOPE);
      state.next = gap * attack.cost * rnd(0.85, 1.15);
      if (attack.calm) state.next = Math.max(state.next, passAt(items) - t);
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
      if (gap < HIT_R && !immortal()) {
        state.dead = true;
        events.push({ type: "death", by: o.from, kind: o.kind, spread: o.spread });
        return;
      }
      if (!o.near && gap < HIT_R + NEAR) {
        o.near = true;
        state.near++;
        events.push({ type: "near", x: o.x, y: o.y, spread: o.spread });
      }
    }
  }

  function slide(mx, my, events) {
    mx = clamp(mx || 0, -MOVE_MAX, MOVE_MAX);
    my = clamp(my || 0, -MOVE_MAX, MOVE_MAX);
    const tt = state.toast, parts = Math.max(1, Math.ceil(Math.hypot(mx, my) / SWEEP));
    for (let i = 1; i <= parts; i++) {
      tt.x = clamp(tt.x + mx / parts, X_MIN, X_MAX);
      tt.y = clamp(tt.y + my / parts, Y_MIN, Y_MAX);
      if (i < parts) collide(events);
      if (state.dead) return;
    }
  }

  function step(dt, mx, my) {
    const events = [];
    if (state.dead) return events;
    state.t += dt;
    slide(mx, my, events);
    if (state.dead) return events;
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
