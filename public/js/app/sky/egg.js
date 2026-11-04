import { SKY } from "../../shared/palette.js";
import { dots, INK, ink, TAU, toastie } from "./kit.js";

const RIBBON = { rx: 1.38, ry: 0.34, tilt: 0.22, w: 0.13, lap: 0.55 };
const BULGE = 0.12, ZIG = 8;
const SPOTS = [[-0.2, -0.78, 0.06], [0.22, -0.72, 0.05], [0.02, -0.9, 0.04], [-0.48, -0.66, 0.04], [0.5, -0.6, 0.035]];
const SPECKS = [-0.6, -0.3, 0, 0.3, 0.6].map((x) => [x, 0.37 + BULGE * (1 - x * x), 0.045]);

/** @type {Art} */
function eggPath(ctx, r) {
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.bezierCurveTo(r * 0.5, -r, r * 0.8, -r * 0.45, r * 0.8, r * 0.12);
  ctx.bezierCurveTo(r * 0.8, r * 0.6, r * 0.45, r * 0.88, 0, r * 0.88);
  ctx.bezierCurveTo(-r * 0.45, r * 0.88, -r * 0.8, r * 0.6, -r * 0.8, r * 0.12);
  ctx.bezierCurveTo(-r * 0.8, -r * 0.45, -r * 0.5, -r, 0, -r);
  ctx.closePath();
}

/** @param {Ctx} ctx @param {number} r @param {number} y @param {number} h */
function stripe(ctx, r, y, h) {
  ctx.beginPath();
  ctx.moveTo(-r, y * r);
  ctx.quadraticCurveTo(0, (y + 2 * BULGE) * r, r, y * r);
  ctx.lineTo(r, (y + h) * r);
  ctx.quadraticCurveTo(0, (y + h + 2 * BULGE) * r, -r, (y + h) * r);
  ctx.closePath();
  ctx.fill();
}

/** @param {Ctx} ctx @param {number} r @param {number} y @param {number} h @param {number} amp */
function zigzag(ctx, r, y, h, amp) {
  /** @param {number} i @param {boolean} top @returns {Pair} */
  const at = (i, top) => {
    const x = -1 + (2 * i) / ZIG;
    return [x * r, (y + (top ? 0 : h) + BULGE * (1 - x * x) + (i % 2 ? amp : -amp)) * r];
  };
  ctx.beginPath();
  for (let i = 0; i <= ZIG; i++) ctx.lineTo(...at(i, true));
  for (let i = ZIG; i >= 0; i--) ctx.lineTo(...at(i, false));
  ctx.closePath();
  ctx.fill();
}

/** @param {Ctx} ctx @param {number} r @param {Sky["egg"]} P */
function shell(ctx, r, P) {
  ctx.save();
  eggPath(ctx, r);
  ctx.clip();
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.08, 0, 0, r * 1.05);
  g.addColorStop(0, P.light);
  g.addColorStop(0.6, P.mid);
  g.addColorStop(1, P.dark);
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  dots(ctx, r, P.spot, SPOTS);
  ctx.fillStyle = P.stripe;
  stripe(ctx, r, -0.6, 0.08);
  ctx.fillStyle = P.zig;
  zigzag(ctx, r, -0.28, 0.18, 0.06);
  ctx.fillStyle = P.stripe;
  stripe(ctx, r, 0.28, 0.17);
  dots(ctx, r, P.speck, SPECKS);
  const shade = ctx.createRadialGradient(-r * 0.3, -r * 0.45, r * 0.15, 0, 0, r * 1.05);
  shade.addColorStop(0, SKY.lit);
  shade.addColorStop(1, SKY.shade);
  ctx.fillStyle = shade;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.fillStyle = SKY.gleam;
  ctx.beginPath();
  ctx.ellipse(-r * 0.36, -r * 0.5, r * 0.12, r * 0.24, 0.5, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  eggPath(ctx, r);
  ctx.stroke();
}

/** @param {Ctx} ctx @param {number} r @param {Sky["egg"]} P @param {boolean} front */
function ribbon(ctx, r, P, front) {
  const { rx, ry, tilt, w } = RIBBON, from = front ? 0 : Math.PI;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * r, ry * r, tilt, from, from + Math.PI);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * r + ink(r) * 2;
  ctx.stroke();
  ctx.strokeStyle = front ? P.ribbon : P.ribbonBack;
  ctx.lineWidth = w * r;
  ctx.stroke();
  ctx.strokeStyle = P.ribbonLight;
  ctx.lineWidth = w * r * 0.25;
  ctx.globalAlpha *= 0.6;
  ctx.stroke();
  ctx.restore();
}

/** @param {Ctx} ctx @param {number} r @param {Sky["egg"]} P */
function knot(ctx, r, P) {
  const { ry, tilt } = RIBBON, s = r * 0.2;
  ctx.save();
  ctx.translate(-Math.sin(tilt) * ry * r, Math.cos(tilt) * ry * r);
  ctx.rotate(tilt);
  ctx.fillStyle = P.ribbon;
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.lineJoin = "round";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(side * s * 0.55, s * 1.15);
    ctx.lineTo(side * s * 0.2, s * 1.0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(side * s * 0.5, -s * 0.85, side * s * 1.3, -s * 0.6, side * s * 1.15, 0);
    ctx.bezierCurveTo(side * s * 1.3, s * 0.6, side * s * 0.5, s * 0.85, 0, 0);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.3, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** @type {Move} */
function hopper(ctx, r, clock) {
  const { rx, ry, tilt, lap } = RIBBON, t = clock * lap, depth = (Math.sin(t) + 1) / 2;
  const c = Math.cos(tilt), s = Math.sin(tilt), ex = rx * Math.cos(t) * r, ey = ry * Math.sin(t) * r;
  const w = r * 0.42 * (0.75 + 0.25 * depth), hop = Math.abs(Math.sin(clock * 5)) * r * 0.2;
  ctx.save();
  ctx.translate(ex * c - ey * s, ex * s + ey * c - w * 0.52 - hop);
  ctx.rotate(Math.cos(clock * 10) * 0.06);
  toastie(ctx, w, "bunny");
  ctx.restore();
}

/** @type {Move} */
export function egg(ctx, r, clock) {
  const P = SKY.egg, front = Math.sin(clock * RIBBON.lap) > 0;
  ribbon(ctx, r, P, false);
  if (!front) hopper(ctx, r, clock);
  shell(ctx, r, P);
  ribbon(ctx, r, P, true);
  knot(ctx, r, P);
  if (front) hopper(ctx, r, clock);
}
