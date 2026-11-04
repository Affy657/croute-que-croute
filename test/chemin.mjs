import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DIR = resolve(process.env.GAME || "public/js/game");
const { prepare, cover, GRID } = await import(pathToFileURL(resolve(DIR, "solver.js")).href);
const { FW, FH } = await import(pathToFileURL(resolve(DIR, "field.js")).href);

const { CELL, COLS, CELLS, I0, I1, J0, J1, SDT } = GRID;
const SUB = 4, GOAL_Y = Number(process.env.ROBOT_Y) || 0.6;
const FULL = { i0: I0, i1: I1, j0: J0, j1: J1 };

const centerOf = (c) => ({ x: ((c % COLS) + 0.5) * CELL, y: (Math.floor(c / COLS) + 0.5) * CELL });

function mark(m, tau, write) {
  if (tau >= m.t0 && tau <= m.t1) cover(m, tau - m.t0, tau - m.t0, FULL, write);
}

export function planPath(state) {
  const { movers, t, steps, start } = prepare(state, null);
  let reach = new Uint8Array(CELLS), next = new Uint8Array(CELLS);
  const blocked = new Uint8Array(CELLS);
  const write = (j, i0, i1) => blocked.fill(1, j * COLS + i0, j * COLS + i1 + 1);
  const prev = [];
  reach[start] = 1;
  for (let k = 1; k <= steps; k++) {
    blocked.fill(0);
    const tA = t + (k - 1) * SDT;
    for (let s = 0; s <= SUB; s++) {
      const tau = tA + (s * SDT) / SUB;
      for (const m of movers) mark(m, tau, write);
    }
    next.fill(0);
    let any = false;
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
    if (!any) return null;
    [reach, next] = [next, reach];
  }
  let last = start, bestD = Infinity;
  for (let c = 0; c < CELLS; c++) {
    if (!reach[c]) continue;
    const p = centerOf(c);
    const d = (p.x - FW / 2) ** 2 + (p.y - FH * GOAL_Y) ** 2;
    if (d < bestD) { bestD = d; last = c; }
  }
  const path = [last];
  for (let k = prev.length - 1; k >= 0; k--) path.push(prev[k][path[path.length - 1]]);
  return path.reverse().map(centerOf);
}
