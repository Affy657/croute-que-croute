export const FW = 360, FH = 640, STEP = 1 / 120, HIT_R = 13, NEAR = 11;

const M = 50;
const X_MIN = 18, X_MAX = FW - 18, Y_MIN = 22, Y_MAX = FH - 22;
const CELL = 12, SDT = 1 / 30, SUB = 4, HORIZON = 3.5, MARGIN = 11, TRIES = 5;
const COLS = Math.floor(FW / CELL), ROWS = Math.floor(FH / CELL), CELLS = COLS * ROWS;
const I0 = Math.ceil(X_MIN / CELL - 0.5), I1 = Math.floor(X_MAX / CELL - 0.5);
const J0 = Math.ceil(Y_MIN / CELL - 0.5), J1 = Math.floor(Y_MAX / CELL - 0.5);

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export const speedMul = (t) => Math.min(2.6, 1 + t / 50);

export function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const u = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  const cx = ax + u * dx - px, cy = ay + u * dy - py;
  return cx * cx + cy * cy;
}

const cellOf = (x, y) =>
  clamp(Math.round(y / CELL - 0.5), J0, J1) * COLS + clamp(Math.round(x / CELL - 0.5), I0, I1);

const centerOf = (c) => ({ x: ((c % COLS) + 0.5) * CELL, y: (Math.floor(c / COLS) + 0.5) * CELL });

function mover(o, t0) {
  const spin = !!o.spin;
  const tx = o.vx > 0 ? (FW + 130 - o.x) / o.vx : o.vx < 0 ? (-130 - o.x) / o.vx : Infinity;
  const ty = o.vy > 0 ? (FH + 130 - o.y) / o.vy : o.vy < 0 ? (-130 - o.y) / o.vy : Infinity;
  return {
    x: o.x, y: o.y, vx: o.vx, vy: o.vy, a: o.a,
    h: spin ? 0 : o.len / 2 - o.rad,
    r: (spin ? o.len / 2 : o.rad) + HIT_R + MARGIN,
    t0, t1: t0 + Math.min(tx, ty)
  };
}

function mark(m, tau, blocked) {
  if (tau < m.t0 || tau > m.t1) return;
  const d = tau - m.t0;
  const cx = m.x + m.vx * d, cy = m.y + m.vy * d;
  const tx = Math.cos(m.a), ty = Math.sin(m.a), r = m.r, r2 = r * r, len = 2 * m.h;
  const ax = cx - tx * m.h, ay = cy - ty * m.h, bx = cx + tx * m.h, by = cy + ty * m.h;
  const j0 = Math.max(J0, Math.floor((Math.min(ay, by) - r) / CELL));
  const j1 = Math.min(J1, Math.floor((Math.max(ay, by) + r) / CELL));
  for (let j = j0; j <= j1; j++) {
    const py = (j + 0.5) * CELL;
    let xl = Infinity, xr = -Infinity;
    let q = r2 - (py - ay) * (py - ay);
    if (q > 0) {
      q = Math.sqrt(q);
      xl = ax - q;
      xr = ax + q;
    }
    if (len > 0) {
      q = r2 - (py - by) * (py - by);
      if (q > 0) {
        q = Math.sqrt(q);
        if (bx - q < xl) xl = bx - q;
        if (bx + q > xr) xr = bx + q;
      }
      const dy = py - ay;
      let lo = -Infinity, hi = Infinity;
      if (Math.abs(ty) > 1e-9) {
        const p1 = (tx * dy + r) / ty, p2 = (tx * dy - r) / ty;
        lo = Math.min(p1, p2);
        hi = Math.max(p1, p2);
      } else if (Math.abs(tx * dy) >= r) {
        hi = lo;
      }
      if (Math.abs(tx) > 1e-9) {
        const p1 = -ty * dy / tx, p2 = (len - ty * dy) / tx;
        lo = Math.max(lo, Math.min(p1, p2));
        hi = Math.min(hi, Math.max(p1, p2));
      } else if (!(ty * dy > 0 && ty * dy < len)) {
        hi = lo;
      }
      if (lo < hi) {
        if (ax + lo < xl) xl = ax + lo;
        if (ax + hi > xr) xr = ax + hi;
      }
    }
    if (xl >= xr) continue;
    const i0 = Math.max(I0, Math.ceil(xl / CELL - 0.5));
    const i1 = Math.min(I1, Math.floor(xr / CELL - 0.5));
    if (i0 <= i1) blocked.fill(1, j * COLS + i0, j * COLS + i1 + 1);
  }
}

function solve(state, extra, wantPath) {
  const t = state.t;
  const movers = [];
  for (const o of state.obs) movers.push(mover(o, t));
  for (const w of state.warns) for (const o of w.obs) movers.push(mover(o, w.at));
  if (extra) for (const w of extra) for (const o of w.obs) movers.push(mover(o, w.at));
  let end = t;
  for (const m of movers) end = Math.max(end, m.t1);
  const steps = Math.ceil((Math.min(end, t + HORIZON) - t) / SDT);
  const start = cellOf(state.toast.x, state.toast.y);
  let reach = new Uint8Array(CELLS), next = new Uint8Array(CELLS);
  const blocked = new Uint8Array(CELLS);
  const prev = wantPath ? [] : null;
  reach[start] = 1;
  const wide = new Uint8Array(CELLS);
  for (let k = 1; k <= steps; k++) {
    blocked.fill(0);
    const tA = t + (k - 1) * SDT;
    for (let s = 0; s <= SUB; s++) {
      const tau = tA + (s * SDT) / SUB;
      for (const m of movers) mark(m, tau, blocked);
    }
    next.fill(0);
    let any = false;
    if (prev) {
      const from = new Int16Array(CELLS).fill(-1);
      for (let j = J0; j <= J1; j++) {
        for (let i = I0; i <= I1; i++) {
          const c = j * COLS + i;
          if (blocked[c]) continue;
          let src = reach[c] ? c : -1;
          for (let dj = -1; dj <= 1 && src < 0; dj++) {
            const jj = j + dj;
            if (jj < J0 || jj > J1) continue;
            for (let di = -1; di <= 1; di++) {
              const ii = i + di;
              if (ii < I0 || ii > I1) continue;
              const n = jj * COLS + ii;
              if (reach[n] && !blocked[n]) { src = n; break; }
            }
          }
          if (src < 0) continue;
          next[c] = 1;
          any = true;
          from[c] = src;
        }
      }
      prev.push(from);
    } else {
      for (let j = J0; j <= J1; j++) {
        const row = j * COLS;
        for (let i = I0; i <= I1; i++) {
          const c = row + i;
          wide[c] = (reach[c] & ~blocked[c]) | (i > I0 ? reach[c - 1] & ~blocked[c - 1] : 0) | (i < I1 ? reach[c + 1] & ~blocked[c + 1] : 0);
        }
      }
      for (let j = J0; j <= J1; j++) {
        const row = j * COLS;
        for (let i = I0; i <= I1; i++) {
          const c = row + i;
          if (blocked[c]) continue;
          if (wide[c] | (j > J0 ? wide[c - COLS] : 0) | (j < J1 ? wide[c + COLS] : 0)) {
            next[c] = 1;
            any = true;
          }
        }
      }
    }
    if (!any) return null;
    [reach, next] = [next, reach];
  }
  if (!prev) return true;
  let last = start, bestD = Infinity;
  for (let c = 0; c < CELLS; c++) {
    if (!reach[c]) continue;
    const p = centerOf(c);
    const d = (p.x - FW / 2) ** 2 + (p.y - FH * 0.6) ** 2;
    if (d < bestD) { bestD = d; last = c; }
  }
  const path = [last];
  for (let k = prev.length - 1; k >= 0; k--) path.push(prev[k][path[path.length - 1]]);
  return path.reverse().map(centerOf);
}

export function createSim(rng = Math.random, { fair = true } = {}) {
  const rnd = (a, b) => a + rng() * (b - a);
  const pick = (arr) => arr[Math.floor(rng() * arr.length)];
  const state = {
    t: 0, next: 0.9, tries: 0, near: 0, dead: false,
    toast: { x: FW / 2, y: FH * 0.7 },
    obs: [], warns: [],
    stats: { spawned: 0, rejected: 0, impossible: 0, solves: 0, solveMs: 0, solveMax: 0 }
  };

  function blade(kind, x, y, vx, vy, spin) {
    const knife = kind === "knife";
    return { kind, x, y, vx, vy, a: Math.atan2(vy, vx), spin: spin || 0, len: knife ? 66 : 58, rad: knife ? 5 : 6, near: false };
  }

  function edgePoint() {
    const side = pick(["top", "top", "left", "right"]);
    if (side === "top") return { x: rnd(20, FW - 20), y: -M };
    if (side === "left") return { x: -M, y: rnd(20, FH * 0.6) };
    return { x: FW + M, y: rnd(20, FH * 0.6) };
  }

  const inside = (p) => ({ x: clamp(p.x, 10, FW - 10), y: clamp(p.y, 10, FH - 10) });

  function aimed(spinning) {
    const p = edgePoint();
    const v = 230 * speedMul(state.t) * rnd(0.95, 1.1);
    const a = Math.atan2(state.toast.y + rnd(-18, 18) - p.y, state.toast.x + rnd(-18, 18) - p.x);
    const w = inside(p);
    const spin = spinning ? rnd(7, 10) * (rng() < 0.5 ? -1 : 1) : 0;
    return { cost: 1, items: [{ x: w.x, y: w.y, a, at: state.t + 0.5, obs: [blade("knife", p.x, p.y, Math.cos(a) * v, Math.sin(a) * v, spin)] }] };
  }

  function rain() {
    const n = 4 + Math.min(4, Math.floor(state.t / 15));
    const v = 190 * speedMul(state.t);
    const items = [];
    for (let i = 0; i < n; i++) {
      const x = rnd(16, FW - 16);
      items.push({ x, y: 10, a: Math.PI / 2, at: state.t + 0.45 + i * 0.14, obs: [blade("fork", x, -M, rnd(-25, 25), v)] });
    }
    return { cost: 1.5, items };
  }

  function wall() {
    const side = pick(["left", "right", "top"]);
    const v = 150 * speedMul(state.t);
    const gap = 50, at = state.t + 0.7;
    const items = [];
    if (side === "top") {
      const gc = rnd(70, FW - 70);
      for (let x = 18; x < FW; x += 36) {
        if (Math.abs(x - gc) >= gap) items.push({ x, y: 10, a: Math.PI / 2, at, obs: [blade("fork", x, -M, 0, v)] });
      }
    } else {
      const gc = rnd(100, FH * 0.62);
      const dir = side === "left" ? 1 : -1;
      const x0 = side === "left" ? -M : FW + M;
      for (let y = 18; y < FH; y += 34) {
        if (Math.abs(y - gc) >= gap) items.push({ x: side === "left" ? 10 : FW - 10, y, a: dir > 0 ? 0 : Math.PI, at, obs: [blade("knife", x0, y, dir * v, 0)] });
      }
    }
    return { cost: 1.7, items };
  }

  function fan() {
    const p = pick([{ x: -M, y: -M }, { x: FW + M, y: -M }, { x: FW / 2, y: -M }, { x: -M, y: FH * 0.4 }, { x: FW + M, y: FH * 0.4 }]);
    const n = 5 + Math.min(2, Math.floor((state.t - 24) / 20));
    const spread = 0.9;
    const v = 200 * speedMul(state.t);
    const base = Math.atan2(state.toast.y - p.y, state.toast.x - p.x);
    const w = inside(p);
    const obs = [];
    for (let i = 0; i < n; i++) {
      const a = base - spread / 2 + (spread * i) / (n - 1);
      obs.push(blade("knife", p.x, p.y, Math.cos(a) * v, Math.sin(a) * v));
    }
    return { cost: 1.5, items: [{ x: w.x, y: w.y, a: base, at: state.t + 0.6, obs }] };
  }

  function solveTimed(extra) {
    const t0 = now();
    const ok = solve(state, extra, false);
    const ms = now() - t0;
    state.stats.solves++;
    state.stats.solveMs += ms;
    state.stats.solveMax = Math.max(state.stats.solveMax, ms);
    return ok;
  }

  function spawn() {
    const t = state.t;
    const pool = [[aimed, 3]];
    if (t > 6) pool.push([rain, 1.4]);
    if (t > 14) pool.push([wall, 1.1]);
    if (t > 24) pool.push([fan, 1.1]);
    let r = rng() * pool.reduce((s, p) => s + p[1], 0);
    let make = aimed;
    for (const [fn, weight] of pool) {
      r -= weight;
      if (r < 0) { make = fn; break; }
    }
    const pattern = make === aimed ? aimed(t > 35 && rng() < 0.35) : make();
    const ok = solveTimed(pattern.items);
    if (ok || !fair) {
      if (!ok) state.stats.impossible++;
      state.warns.push(...pattern.items);
      state.stats.spawned++;
      state.tries = 0;
      state.next = Math.max(0.42, 1.25 - t * 0.016) * pattern.cost * rnd(0.85, 1.15);
      return;
    }
    state.stats.rejected++;
    state.tries++;
    state.next = state.tries < TRIES ? 1 / 60 : 0.25;
    if (state.tries >= TRIES) state.tries = 0;
  }

  function moveObs(dt) {
    for (const o of state.obs) {
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      if (o.spin) o.a += o.spin * dt;
    }
    state.obs = state.obs.filter((o) => o.x > -130 && o.x < FW + 130 && o.y > -130 && o.y < FH + 130);
  }

  function step(dt, mx, my) {
    const events = [];
    if (state.dead) return events;
    state.t += dt;
    const tt = state.toast;
    tt.x = clamp(tt.x + mx, X_MIN, X_MAX);
    tt.y = clamp(tt.y + my, Y_MIN, Y_MAX);
    moveObs(dt);
    for (const w of state.warns) {
      if (state.t < w.at) continue;
      const d = state.t - w.at;
      for (const o of w.obs) state.obs.push({ ...o, x: o.x + o.vx * d, y: o.y + o.vy * d, a: o.a + o.spin * d });
    }
    state.warns = state.warns.filter((w) => state.t < w.at);
    state.next -= dt;
    if (state.next <= 0) spawn();
    for (const o of state.obs) {
      const h = o.len / 2 - o.rad;
      const cx = Math.cos(o.a) * h, cy = Math.sin(o.a) * h;
      const d2 = segDist2(tt.x, tt.y, o.x - cx, o.y - cy, o.x + cx, o.y + cy);
      const hr = HIT_R + o.rad;
      if (d2 < hr * hr) {
        state.dead = true;
        events.push({ type: "death" });
        return events;
      }
      if (!o.near && d2 < (hr + NEAR) * (hr + NEAR)) {
        o.near = true;
        state.near++;
        events.push({ type: "near" });
      }
    }
    return events;
  }

  return {
    state,
    step,
    drift: moveObs,
    plan: () => solve(state, null, true)
  };
}
