import { SKY } from "../../shared/palette.js";
import { rr } from "../art/kit.js";
import { rock } from "./classic.js";
import { BEAT, INK, TAU } from "./kit.js";

const GRAIN = [[-0.11, -0.05, -0.36, 0.025], [-0.03, -0.03, -0.18, -0.015], [0.09, -0.06, -0.33, -0.02]];

/** @param {Ctx} ctx @param {Pair} from @param {Pair} to @param {number} s @param {number} line */
function limb(ctx, from, to, s, line) {
  ctx.beginPath();
  ctx.moveTo(...from);
  ctx.lineTo(...to);
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.05 + line * 2;
  ctx.stroke();
  ctx.strokeStyle = SKY.tung.wood;
  ctx.lineWidth = s * 0.05;
  ctx.stroke();
}

/** @param {Ctx} ctx @param {number} x @param {number} y @param {number} rx @param {number} ry @param {number} line */
function knob(ctx, x, y, rx, ry, line) {
  ctx.fillStyle = SKY.tung.wood;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

/** @type {Art} */
function bat(ctx, s) {
  const B = SKY.tung, g = ctx.createLinearGradient(-s * 0.06, 0, s * 0.06, 0);
  g.addColorStop(0, B.bat);
  g.addColorStop(1, B.batDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * 0.022, s * 0.04);
  ctx.lineTo(-s * 0.06, -s * 0.48);
  ctx.arc(0, -s * 0.48, s * 0.06, Math.PI, 0);
  ctx.lineTo(s * 0.022, s * 0.04);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** @type {Move} */
function tung(ctx, s, clock) {
  const B = SKY.tung, k = clock / BEAT, beat = Math.floor(k), f = k - beat, hit = ((beat % 4) + 4) % 4 < 3;
  const hop = hit ? Math.sin(f * Math.PI) : 0, line = Math.max(1.2, s * 0.025);
  const swing = hit ? 0.3 + 1.9 * (1 - f) * (1 - f) : 0.3 + 0.25 * Math.sin(f * Math.PI);
  const sway = Math.sin((clock / BEAT) * (Math.PI / 2)) * 0.1, wave = Math.sin((clock / BEAT) * Math.PI);
  const w = s * 0.36, h = s * 0.78, lift = beat % 2 ? 1 : -1, rise = s * 0.22 + hop * s * 0.06;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const side of [-1, 1]) {
    const up = side === lift ? hop * s * 0.08 : 0;
    limb(ctx, [side * s * 0.08, -rise - s * 0.02], [side * s * 0.12, -up - s * 0.02], s, line);
    knob(ctx, side * s * 0.15, -up - s * 0.015, s * 0.055, s * 0.028, line);
  }
  ctx.translate(0, -rise);
  ctx.rotate(sway);
  const shoulder = -h * 0.5, /** @type {Pair} */ left = [-w / 2 - s * 0.16, shoulder - s * (0.08 + 0.12 * wave)];
  limb(ctx, [-w / 2 + s * 0.03, shoulder], left, s, line);
  knob(ctx, ...left, s * 0.038, s * 0.038, line);
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, B.light);
  g.addColorStop(0.45, B.wood);
  g.addColorStop(1, B.dark);
  ctx.fillStyle = g;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  rr(ctx, -w / 2, -h, w, h, w * 0.28);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = B.grain;
  for (const [x, y0, y1, bend] of GRAIN) {
    ctx.beginPath();
    ctx.moveTo(x * s, y0 * s);
    ctx.quadraticCurveTo((x + bend) * s, ((y0 + y1) / 2) * s, x * s, y1 * s);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(s * 0.06, -h * 0.16, s * 0.03, s * 0.045, 0, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = INK;
  for (const side of [-1, 1]) {
    ctx.fillStyle = B.eye;
    ctx.beginPath();
    ctx.arc(side * s * 0.075, -h * 0.74, s * 0.065, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(side * s * 0.075 + s * 0.01, -h * 0.74, s * 0.032, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(side * s * 0.035, -h * 0.74 - s * 0.09);
    ctx.lineTo(side * s * 0.12, -h * 0.74 - s * 0.1 - hop * s * 0.02);
    ctx.stroke();
  }
  ctx.fillStyle = B.nose;
  ctx.beginPath();
  ctx.ellipse(0, -h * 0.62, s * 0.025, s * 0.035, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, -h * 0.57, s * 0.06, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  /** @type {Pair} */
  const hand = [w / 2 + s * 0.13, shoulder + s * 0.1];
  limb(ctx, [w / 2 - s * 0.03, shoulder], hand, s, line);
  ctx.save();
  ctx.translate(...hand);
  ctx.rotate(swing);
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  bat(ctx, s);
  ctx.restore();
  knob(ctx, ...hand, s * 0.038, s * 0.038, line);
  ctx.restore();
}

/** @type {Move} */
export function stage(ctx, r, clock) {
  rock(ctx, r);
  ctx.save();
  ctx.translate(0, -r * 0.95);
  tung(ctx, r * 2.5, clock);
  ctx.restore();
}
