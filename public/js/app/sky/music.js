import { SKY } from "../../shared/palette.js";
import { BEAT, clipped, disc, INK, ink, onSphere, TAU, tone } from "./kit.js";

const LANDS = [
  { x: -0.45, y: -0.2, parts: [[0, 0, 0.32], [0.22, -0.15, 0.22], [-0.1, 0.25, 0.2], [0.3, 0.15, 0.15]] },
  { x: 0.45, y: 0.6, parts: [[0, 0, 0.3], [-0.25, 0.05, 0.2], [0.15, -0.2, 0.18]] },
  { x: 0.3, y: -0.8, parts: [[0, 0, 0.22], [0.2, 0.05, 0.15]] }
];

/** @param {Ctx} ctx @param {number} s @param {number} light */
export function speaker(ctx, s, light, S = SKY.speakers) {
  const lx = Math.cos(light) * s, ly = Math.sin(light) * s;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1, s * 0.12);
  ctx.fillStyle = S.box;
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  ctx.fill();
  ctx.stroke();
  const rim = ctx.createLinearGradient(lx, ly, -lx, -ly);
  rim.addColorStop(0, S.rimLight);
  rim.addColorStop(1, S.rim);
  ctx.fillStyle = rim;
  disc(ctx, 0, 0, s * 0.8);
  const cone = ctx.createRadialGradient(-lx * 0.25, -ly * 0.25, s * 0.05, 0, 0, s * 0.62);
  cone.addColorStop(0, S.cone);
  cone.addColorStop(1, S.box);
  ctx.fillStyle = cone;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.62, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = S.rim;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.2, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SKY.gleam;
  disc(ctx, lx * 0.08, ly * 0.08, s * 0.08);
}

/** @type {Move} */
function waves(ctx, r, clock) {
  ctx.save();
  ctx.strokeStyle = SKY.speakers.wave;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, r * 0.045);
  const alpha = ctx.globalAlpha;
  for (let i = 0; i < 3; i++) {
    const k = (clock * 0.6 + i / 3) % 1;
    ctx.globalAlpha = alpha * 0.65 * (1 - k);
    for (const [mid, span] of [[-0.25, 0.75], [2.4, 0.55]]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.1 + 0.5 * k), mid - span, mid + span);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** @param {Ctx} ctx @param {number} r @param {Pts} parts */
function land(ctx, r, parts, S = SKY.speakers) {
  const edge = ink(r) * 1.2;
  ctx.fillStyle = S.landEdge;
  for (const [x, y, s] of parts) disc(ctx, x * r, y * r, s * r + edge);
  ctx.fillStyle = S.land;
  for (const [x, y, s] of parts) disc(ctx, x * r, y * r, s * r);
}

/** @type {Move} */
export function speakers(ctx, r, clock) {
  waves(ctx, r, clock);
  ctx.fillStyle = SKY.speakers.base;
  disc(ctx, 0, 0, r);
  clipped(ctx, r, () => {
    for (const l of LANDS) onSphere(ctx, r, l.x, l.y, () => land(ctx, r, l.parts));
  });
  for (const [x, y, s] of [[0.32, -0.05, 0.36], [-0.5, 0.45, 0.22], [-0.25, -0.58, 0.14]]) {
    onSphere(ctx, r, x, y, (light) => speaker(ctx, s * r, light));
  }
  tone(ctx, r);
}

const DUNES = [
  { x: -0.52, y: 0.32, parts: [[0, 0, 0.3], [0.25, 0.1, 0.2], [-0.15, -0.2, 0.18], [0.1, 0.3, 0.14]] },
  { x: 0.55, y: 0.05, parts: [[0, 0, 0.26], [0.1, -0.25, 0.2], [-0.2, 0.15, 0.15]] },
  { x: -0.2, y: -0.7, parts: [[0, 0, 0.2], [0.22, 0.04, 0.14], [-0.18, 0.06, 0.12]] },
  { x: 0.25, y: 0.72, parts: [[0, 0, 0.16], [-0.15, -0.05, 0.1]] }
];
const WOOFERS = [[-0.24, -0.2, 0.3], [0.5, -0.45, 0.17], [0.36, 0.4, 0.21], [-0.55, 0.45, 0.14], [0.66, 0.02, 0.1]];

/** @type {Move} */
function boom(ctx, r, clock) {
  const alpha = ctx.globalAlpha, beat = (clock / BEAT) % 1;
  ctx.save();
  ctx.strokeStyle = SKY.bass.wave;
  ctx.lineCap = "round";
  for (let i = 0; i < 3; i++) {
    const k = (beat + i) / 3;
    ctx.globalAlpha = alpha * 0.75 * Math.sin(k * Math.PI);
    for (const [mid, span, w] of [[-2.45, 0.85, 1.25], [0.05, 0.42, 0.8]]) {
      ctx.lineWidth = Math.max(1.5, r * 0.055 * w * (1 - 0.4 * k));
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.1 + 0.6 * k), mid - span * (1 - 0.3 * k), mid + span * (1 - 0.3 * k));
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** @type {Move} */
export function bass(ctx, r, clock) {
  const S = SKY.bass, pump = (1 - ((clock / BEAT) % 1)) ** 3, k = 1 + 0.025 * pump;
  boom(ctx, r, clock);
  ctx.save();
  ctx.scale(k, k);
  ctx.fillStyle = S.base;
  disc(ctx, 0, 0, r);
  clipped(ctx, r, () => {
    for (const l of DUNES) onSphere(ctx, r, l.x, l.y, () => land(ctx, r, l.parts, S));
  });
  for (const [x, y, s] of WOOFERS) onSphere(ctx, r, x, y, (light) => speaker(ctx, s * r * (1 + 0.08 * pump), light, S));
  tone(ctx, r);
  ctx.restore();
}
