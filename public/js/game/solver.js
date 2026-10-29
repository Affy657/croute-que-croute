import { FW, FH, HIT_R, X_MIN, X_MAX, Y_MIN, Y_MAX, OUT, clamp } from "./field.js";
import { PROJECTILES } from "./projectiles.js";

const CELL = 12, SDT = 1 / 30, SUB = 4, HORIZON = 3.5, MARGIN = 11;
const COLS = Math.floor(FW / CELL), ROWS = Math.floor(FH / CELL), CELLS = COLS * ROWS;
const I0 = Math.ceil(X_MIN / CELL - 0.5), I1 = Math.floor(X_MAX / CELL - 0.5);
const J0 = Math.ceil(Y_MIN / CELL - 0.5), J1 = Math.floor(Y_MAX / CELL - 0.5);

const cellOf = (x, y) =>
  clamp(Math.round(y / CELL - 0.5), J0, J1) * COLS + clamp(Math.round(x / CELL - 0.5), I0, I1);

const centerOf = (c) => ({ x: ((c % COLS) + 0.5) * CELL, y: (Math.floor(c / COLS) + 0.5) * CELL });

function mover(o, t0) {
  const spin = !!o.spin;
  const tx = o.vx > 0 ? (FW + OUT - o.x) / o.vx : o.vx < 0 ? (-OUT - o.x) / o.vx : Infinity;
  const ty = o.vy > 0 ? (FH + OUT - o.y) / o.vy : o.vy < 0 ? (-OUT - o.y) / o.vy : Infinity;
  return {
    x: o.x, y: o.y, vx: o.vx, vy: o.vy, a: o.a,
    h: spin ? 0 : o.len / 2 - o.rad,
    r: (spin ? PROJECTILES[o.kind].spinReach : PROJECTILES[o.kind].reach) + HIT_R + MARGIN,
    t0, t1: t0 + Math.min(tx, ty)
  };
}

const FULL = { i0: I0, i1: I1, j0: J0, j1: J1 };

function addMovers(list, o, t0) {
  const m = mover(o, t0);
  list.push(m);
  if (!(o.bounces > 0) || !o.vx) return;
  const tb = o.vx > 0 ? (FW - o.x) / o.vx : -o.x / o.vx;
  if (tb <= 0 || t0 + tb >= m.t1) return;
  m.t1 = t0 + tb;
  addMovers(list, { ...o, x: o.x + o.vx * tb, y: o.y + o.vy * tb, vx: -o.vx, a: Math.atan2(o.vy, -o.vx), bounces: o.bounces - 1 }, t0 + tb);
}

function mark(m, tau, blocked, area = FULL) {
  if (tau < m.t0 || tau > m.t1) return;
  const d = tau - m.t0;
  const cx = m.x + m.vx * d, cy = m.y + m.vy * d;
  const reachOut = m.h + m.r;
  if (cx + reachOut < (area.i0 - 0.5) * CELL || cx - reachOut > (area.i1 + 1.5) * CELL) return;
  if (cy + reachOut < (area.j0 - 0.5) * CELL || cy - reachOut > (area.j1 + 1.5) * CELL) return;
  const tx = Math.cos(m.a), ty = Math.sin(m.a), r = m.r, r2 = r * r, len = 2 * m.h;
  const ax = cx - tx * m.h, ay = cy - ty * m.h, bx = cx + tx * m.h, by = cy + ty * m.h;
  const j0 = Math.max(area.j0, Math.floor((Math.min(ay, by) - r) / CELL));
  const j1 = Math.min(area.j1, Math.floor((Math.max(ay, by) + r) / CELL));
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
    const i0 = Math.max(area.i0, Math.ceil(xl / CELL - 0.5));
    const i1 = Math.min(area.i1, Math.floor(xr / CELL - 0.5));
    if (i0 <= i1) blocked.fill(1, j * COLS + i0, j * COLS + i1 + 1);
  }
}

export function solve(state, extra, wantPath, react = 0) {
  const still = Math.round(react / SDT);
  const t = state.t;
  const movers = [];
  for (const o of state.obs) addMovers(movers, o, t);
  for (const w of state.warns) for (const o of w.obs) addMovers(movers, o, w.at);
  if (extra) for (const w of extra) for (const o of w.obs) addMovers(movers, o, w.at);
  let end = t;
  for (const m of movers) end = Math.max(end, m.t1);
  const steps = Math.ceil((Math.min(end, t + HORIZON) - t) / SDT);
  const start = cellOf(state.toast.x, state.toast.y);
  let reach = new Uint8Array(CELLS), next = new Uint8Array(CELLS);
  const blocked = new Uint8Array(CELLS);
  const prev = wantPath ? [] : null;
  reach[start] = 1;
  const wide = new Uint8Array(CELLS);
  const box = { i0: start % COLS, i1: start % COLS, j0: Math.floor(start / COLS), j1: Math.floor(start / COLS) };
  for (let k = 1; k <= steps; k++) {
    blocked.fill(0);
    const tA = t + (k - 1) * SDT;
    const frozen = k <= still;
    const grow = prev || frozen ? 0 : 1;
    const area = prev ? FULL : {
      i0: Math.max(I0, box.i0 - grow), i1: Math.min(I1, box.i1 + grow),
      j0: Math.max(J0, box.j0 - grow), j1: Math.min(J1, box.j1 + grow)
    };
    for (let s = 0; s <= SUB; s++) {
      const tau = tA + (s * SDT) / SUB;
      for (const m of movers) mark(m, tau, blocked, area);
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
          for (let dj = -1; dj <= 1 && src < 0 && !frozen; dj++) {
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
      const { i0, i1, j0, j1 } = area;
      const at = (c, j) => (j >= box.j0 && j <= box.j1 ? wide[c] : 0);
      for (let j = box.j0; j <= box.j1; j++) {
        const row = j * COLS;
        for (let i = i0; i <= i1; i++) {
          const c = row + i;
          wide[c] = frozen
            ? reach[c] & ~blocked[c]
            : (reach[c] & ~blocked[c]) | (i > I0 ? reach[c - 1] & ~blocked[c - 1] : 0) | (i < I1 ? reach[c + 1] & ~blocked[c + 1] : 0);
        }
      }
      const nb = { i0: I1, i1: I0, j0: J1, j1: J0 };
      for (let j = j0; j <= j1; j++) {
        const row = j * COLS;
        for (let i = i0; i <= i1; i++) {
          const c = row + i;
          if (blocked[c]) continue;
          if (frozen ? at(c, j) : at(c, j) | at(c - COLS, j - 1) | at(c + COLS, j + 1)) {
            next[c] = 1;
            any = true;
            if (i < nb.i0) nb.i0 = i;
            if (i > nb.i1) nb.i1 = i;
            if (j < nb.j0) nb.j0 = j;
            if (j > nb.j1) nb.j1 = j;
          }
        }
      }
      Object.assign(box, nb);
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
