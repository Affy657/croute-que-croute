/** @template T @param {Record<string, T>} map @param {string | null | undefined} key @returns {T | null} */
export const own = (map, key) => (Object.prototype.hasOwnProperty.call(map, /** @type {string} */ (key)) ? map[/** @type {string} */ (key)] : null);

/** @param {Ctx} ctx @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r */
export function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

/** @type {Box} */
export function toastPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 6, h / 2);
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 6);
  ctx.lineTo(-w / 2, -h * 0.12);
  ctx.bezierCurveTo(-w * 0.66, -h * 0.62, -w * 0.06, -h * 0.7, 0, -h * 0.46);
  ctx.bezierCurveTo(w * 0.06, -h * 0.7, w * 0.66, -h * 0.62, w / 2, -h * 0.12);
  ctx.lineTo(w / 2, h / 2 - 6);
  ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - 6, h / 2);
  ctx.closePath();
}

export const TAU = Math.PI * 2;

/** @type {Map<string, number[][]>} */
const WAVES = new Map();

/** @param {number} wob @param {number} k */
function wave(wob, k) {
  const key = wob + ":" + k;
  let w = WAVES.get(key);
  if (!w) {
    w = Array.from({ length: 49 }, (_, i) => {
      const a = (i / 48) * TAU;
      return [Math.cos(a), Math.sin(a), 1 + wob * Math.sin(a * k + 0.7)];
    });
    WAVES.set(key, w);
  }
  return w;
}

/** @param {Ctx} ctx @param {number} cx @param {number} cy @param {number} rx @param {number} ry @param {number} wob @param {number} k */
export function wavy(ctx, cx, cy, rx, ry, wob, k) {
  ctx.beginPath();
  wave(wob, k).forEach(([c, sn, f], i) => {
    const x = cx + c * rx * f, y = cy + sn * ry * f;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  });
  ctx.closePath();
}

/** @param {Ctx} ctx @param {string} color @param {Pts} list */
export function dots(ctx, color, list) {
  ctx.fillStyle = color;
  for (const [x, y, r] of list) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

/** @param {Ctx} ctx @param {number} x @param {number} y @param {number} len @param {number} w */
export function drip(ctx, x, y, len, w) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w, y + len);
  ctx.arc(x, y + len, w, Math.PI, 0, true);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
}

/** @param {Ctx} ctx @param {number} x @param {number} y @param {number} rx @param {number} ry */
export function oval(ctx, x, y, rx, ry, a = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, a, 0, TAU);
}

/** @param {Ctx} ctx @param {Pts} points */
export function line(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

export const FUR = "#fbf4ea";
