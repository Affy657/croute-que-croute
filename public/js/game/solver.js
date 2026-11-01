import { FW, FH, HIT_R, X_MIN, X_MAX, Y_MIN, Y_MAX, OUT, clamp } from "./field.js";
import { PROJECTILES } from "./projectiles.js";

const CELL = 12, SDT = 1 / 30, SUB = 4, HORIZON = 3.5, HORIZON_LONG = 4.5, MARGIN = 11;
const COLS = Math.floor(FW / CELL), ROWS = Math.floor(FH / CELL), CELLS = COLS * ROWS;
const I0 = Math.ceil(X_MIN / CELL - 0.5), I1 = Math.floor(X_MAX / CELL - 0.5);
const J0 = Math.ceil(Y_MIN / CELL - 0.5), J1 = Math.floor(Y_MAX / CELL - 0.5);
const LO = new Float64Array(ROWS), HI = new Float64Array(ROWS);

const cellOf = (x, y) =>
  clamp(Math.round(y / CELL - 0.5), J0, J1) * COLS + clamp(Math.round(x / CELL - 0.5), I0, I1);

const centerOf = (c) => ({ x: ((c % COLS) + 0.5) * CELL, y: (Math.floor(c / COLS) + 0.5) * CELL });

const span = (i0, i1) => ((0xffffffff >>> (31 - i1)) & (0xffffffff << i0)) >>> 0;

const lowBit = (v) => 31 - Math.clz32(v & -v);

const highBit = (v) => 31 - Math.clz32(v);

function mover(o, t0) {
  const spin = !!o.spin;
  const tx = o.vx > 0 ? (FW + OUT - o.x) / o.vx : o.vx < 0 ? (-OUT - o.x) / o.vx : Infinity;
  const ty = o.vy > 0 ? (FH + OUT - o.y) / o.vy : o.vy < 0 ? (-OUT - o.y) / o.vy : Infinity;
  const cos = Math.cos(o.a), sin = Math.sin(o.a);
  return {
    x: o.x, y: o.y, vx: o.vx, vy: o.vy, a: o.a, cos, sin,
    h: spin ? 0 : o.len / 2 - o.rad,
    r: (spin ? PROJECTILES[o.kind].spinReach : PROJECTILES[o.kind].reach) + HIT_R + MARGIN,
    along: Math.abs(cos * o.vy - sin * o.vx) < 1e-6 * (Math.abs(o.vx) + Math.abs(o.vy) + 1),
    ahead: cos * o.vx + sin * o.vy >= 0 ? 1 : -1,
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
  addMovers(list, { ...o, x: o.x + o.vx * tb, y: o.y + o.vy * tb, vx: -o.vx, a: Math.PI - o.a, bounces: o.bounces - 1 }, t0 + tb);
}

function capsule(ax, ay, bx, by, tx, ty, len, r, area) {
  const r2 = r * r;
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
    if (xl < LO[j]) LO[j] = xl;
    if (xr > HI[j]) HI[j] = xr;
  }
}

function segment(ax, ay, bx, by, r, area) {
  const len = Math.hypot(bx - ax, by - ay);
  if (len > 1e-9) capsule(ax, ay, bx, by, (bx - ax) / len, (by - ay) / len, len, r, area);
  else capsule(ax, ay, ax, ay, 1, 0, 0, r, area);
}

function cover(m, d0, d1, area, write) {
  const x0 = m.x + m.vx * d0, y0 = m.y + m.vy * d0, x1 = m.x + m.vx * d1, y1 = m.y + m.vy * d1;
  const reachOut = m.h + m.r;
  if (Math.max(x0, x1) + reachOut < (area.i0 - 0.5) * CELL || Math.min(x0, x1) - reachOut > (area.i1 + 1.5) * CELL) return;
  if (Math.max(y0, y1) + reachOut < (area.j0 - 0.5) * CELL || Math.min(y0, y1) - reachOut > (area.j1 + 1.5) * CELL) return;
  const j0 = Math.max(area.j0, Math.floor((Math.min(y0, y1) - reachOut) / CELL));
  const j1 = Math.min(area.j1, Math.floor((Math.max(y0, y1) + reachOut) / CELL));
  if (j0 > j1) return;
  LO.fill(Infinity, j0, j1 + 1);
  HI.fill(-Infinity, j0, j1 + 1);
  const hx = m.cos * m.h, hy = m.sin * m.h, r = m.r;
  if (d0 === d1) capsule(x0 - hx, y0 - hy, x0 + hx, y0 + hy, m.cos, m.sin, 2 * m.h, r, area);
  else if (!m.h) segment(x0, y0, x1, y1, r, area);
  else if (m.along) segment(x0 - m.ahead * hx, y0 - m.ahead * hy, x1 + m.ahead * hx, y1 + m.ahead * hy, r, area);
  else {
    segment(x0 - hx, y0 - hy, x0 + hx, y0 + hy, r, area);
    segment(x1 - hx, y1 - hy, x1 + hx, y1 + hy, r, area);
    segment(x0 - hx, y0 - hy, x1 - hx, y1 - hy, r, area);
    segment(x0 + hx, y0 + hy, x1 + hx, y1 + hy, r, area);
  }
  for (let j = j0; j <= j1; j++) {
    if (LO[j] >= HI[j]) continue;
    const i0 = Math.max(area.i0, Math.ceil(LO[j] / CELL - 0.5));
    const i1 = Math.min(area.i1, Math.floor(HI[j] / CELL - 0.5));
    if (i0 <= i1) write(j, i0, i1);
  }
}

function sweep(m, ta, tb, area, write) {
  ta = Math.max(ta, m.t0);
  tb = Math.min(tb, m.t1);
  if (ta <= tb) cover(m, ta - m.t0, tb - m.t0, area, write);
}

function mark(m, tau, area, write) {
  if (tau >= m.t0 && tau <= m.t1) cover(m, tau - m.t0, tau - m.t0, area, write);
}

function survives(movers, t, steps, still, start) {
  let reach = new Uint32Array(ROWS), next = new Uint32Array(ROWS);
  const blocked = new Uint32Array(ROWS), wide = new Uint32Array(ROWS);
  const write = (j, i0, i1) => { blocked[j] |= span(i0, i1); };
  reach[Math.floor(start / COLS)] = 2 ** (start % COLS);
  const box = { i0: start % COLS, i1: start % COLS, j0: Math.floor(start / COLS), j1: Math.floor(start / COLS) };
  for (let k = 1; k <= steps; k++) {
    const tA = t + (k - 1) * SDT, tB = tA + SDT;
    const frozen = k <= still;
    const grow = frozen ? 0 : 1;
    const area = {
      i0: Math.max(I0, box.i0 - grow), i1: Math.min(I1, box.i1 + grow),
      j0: Math.max(J0, box.j0 - grow), j1: Math.min(J1, box.j1 + grow)
    };
    blocked.fill(0);
    for (const m of movers) if (m.t1 >= tA && m.t0 <= tB) sweep(m, tA, tB, area, write);
    const cols = span(area.i0, area.i1);
    for (let j = box.j0; j <= box.j1; j++) {
      const src = reach[j] & ~blocked[j];
      wide[j] = (frozen ? src : src | (src << 1) | (src >>> 1)) & cols;
    }
    const at = (j) => (j >= box.j0 && j <= box.j1 ? wide[j] : 0);
    next.fill(0);
    let any = false;
    const nb = { i0: I1, i1: I0, j0: J1, j1: J0 };
    for (let j = area.j0; j <= area.j1; j++) {
      const v = ((frozen ? at(j) : at(j) | at(j - 1) | at(j + 1)) & ~blocked[j] & cols) >>> 0;
      if (!v) continue;
      next[j] = v;
      any = true;
      if (lowBit(v) < nb.i0) nb.i0 = lowBit(v);
      if (highBit(v) > nb.i1) nb.i1 = highBit(v);
      if (j < nb.j0) nb.j0 = j;
      if (j > nb.j1) nb.j1 = j;
    }
    Object.assign(box, nb);
    if (!any) return null;
    [reach, next] = [next, reach];
  }
  return true;
}

function pathOf(movers, t, steps, still, start) {
  let reach = new Uint8Array(CELLS), next = new Uint8Array(CELLS);
  const blocked = new Uint8Array(CELLS);
  const write = (j, i0, i1) => blocked.fill(1, j * COLS + i0, j * COLS + i1 + 1);
  const prev = [];
  reach[start] = 1;
  for (let k = 1; k <= steps; k++) {
    blocked.fill(0);
    const tA = t + (k - 1) * SDT;
    const frozen = k <= still;
    for (let s = 0; s <= SUB; s++) {
      const tau = tA + (s * SDT) / SUB;
      for (const m of movers) mark(m, tau, FULL, write);
    }
    next.fill(0);
    let any = false;
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
    if (!any) return null;
    [reach, next] = [next, reach];
  }
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

export function solve(state, extra, wantPath, react = 0) {
  const still = Math.round(react / SDT);
  const t = state.t;
  const movers = [];
  for (const o of state.obs) addMovers(movers, o, t);
  for (const w of state.warns) for (const o of w.obs) addMovers(movers, o, w.at);
  const first = movers.length;
  if (extra) for (const w of extra) for (const o of w.obs) addMovers(movers, o, w.at);
  let end = t, own = t;
  for (const m of movers) end = Math.max(end, m.t1);
  for (let i = first; i < movers.length; i++) own = Math.max(own, movers[i].t1);
  const steps = Math.ceil((Math.min(end, t + Math.min(HORIZON_LONG, Math.max(HORIZON, own - t))) - t) / SDT);
  const start = cellOf(state.toast.x, state.toast.y);
  return wantPath ? pathOf(movers, t, steps, still, start) : survives(movers, t, steps, still, start);
}
