import { PALETTE, SKY } from "../../shared/palette.js";
import { hat } from "../art/hats.js";
import { toastPath } from "../art/kit.js";

export const TAU = Math.PI * 2;
const LIGHT = -0.75 * Math.PI;
export const INK = PALETTE.void;

/** @param {number} r */
export const ink = (r) => Math.max(1.2, r * 0.035);

/** @param {Ctx} ctx @param {number} x @param {number} y @param {number} r */
export function disc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

/** @param {Ctx} ctx @param {number} r @param {string} light @param {string} dark */
export function ball(ctx, r, light, dark) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  disc(ctx, 0, 0, r);
}

/** @param {Ctx} ctx @param {number} r @param {string} color @param {Pts} list */
export function dots(ctx, r, color, list) {
  ctx.fillStyle = color;
  for (const [x, y, s] of list) disc(ctx, x * r, y * r, s * r);
}

/** @param {Ctx} ctx @param {number} r @param {Fn} draw */
export function clipped(ctx, r, draw) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  draw();
  ctx.restore();
}

/** @param {Ctx} ctx @param {number} r @param {number} x @param {number} y @param {(a: number) => void} draw */
export function onSphere(ctx, r, x, y, draw) {
  const d = Math.min(0.95, Math.hypot(x, y)), a = Math.atan2(y, x);
  ctx.save();
  ctx.translate(x * r, y * r);
  ctx.rotate(a);
  ctx.scale(Math.sqrt(1 - d * d), 1);
  draw(LIGHT - a);
  ctx.restore();
}

/** @type {Art} */
export function tone(ctx, r) {
  clipped(ctx, r, () => {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, SKY.lit);
    g.addColorStop(1, SKY.shade);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
  });
  outline(ctx, r);
}

/** @type {Art} */
export function outline(ctx, r) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
}

export const BEAT = 0.42;
/** @param {Ctx} ctx @param {number} w @param {string} head */
export function toastie(ctx, w, head) {
  const k = w / 40;
  ctx.save();
  ctx.scale(k, k);
  ctx.lineJoin = "round";
  toastPath(ctx, 40, 42);
  ctx.fillStyle = PALETTE.crust;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = INK;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, 2);
  ctx.scale(0.78, 0.78);
  toastPath(ctx, 40, 42);
  ctx.fillStyle = PALETTE.crumb;
  ctx.fill();
  ctx.restore();
  ctx.save();
  toastPath(ctx, 40, 42);
  ctx.clip();
  const g = ctx.createRadialGradient(-8, -10, 4, 0, 0, 32);
  g.addColorStop(0, SKY.lit);
  g.addColorStop(1, SKY.shade);
  ctx.fillStyle = g;
  ctx.globalAlpha *= 0.6;
  ctx.fillRect(-24, -32, 48, 56);
  ctx.restore();
  hat(ctx, head, PALETTE);
  ctx.restore();
}

export const GOLD = "255, 207, 51";
