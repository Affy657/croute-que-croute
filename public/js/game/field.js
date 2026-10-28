export const FW = 360, FH = 640, STEP = 1 / 120, HIT_R = 13, NEAR = 11;
export const M = 50, OUT = 130;
export const X_MIN = 18, X_MAX = FW - 18, Y_MIN = 22, Y_MAX = FH - 22;

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const SPEED_MAX = 2.6, SPEED_RAMP = 50;
export const speedMul = (t) => Math.min(SPEED_MAX, 1 + t / SPEED_RAMP);

export function segDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  const u = l2 ? clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1) : 0;
  const cx = ax + u * dx - px, cy = ay + u * dy - py;
  return cx * cx + cy * cy;
}
