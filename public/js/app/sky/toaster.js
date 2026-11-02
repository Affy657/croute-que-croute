import { SKY } from "../../shared/palette.js";
import { rr, toastPath } from "../art/kit.js";
import { clipped, disc, INK, ink, onSphere, TAU } from "./kit.js";

const POP_S = 6, DROP_S = 0.5, POP_AT = 5, SNAP_S = 0.12, EJECT = 0.6, SHOWN_AT = 3.5, WISPS = 3;
const SLOTS = [[0.08, -0.74, 0.12, 1], [-0.08, -0.55, 0, -1]];

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));

function mix(a, b, t) {
  const A = hex(a), B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
}

const cycle = (clock, delay) => (((clock + SHOWN_AT - delay) % POP_S) + POP_S) % POP_S;

function grill(clock, delay) {
  const k = cycle(clock, delay);
  if (k < DROP_S) {
    const e = k / DROP_S;
    return { done: 0, lift: -0.35 * (1 - e) * (1 - e), fade: e, turn: 0 };
  }
  if (k < POP_AT) return { done: (k - DROP_S) / (POP_AT - DROP_S), lift: 0, fade: 1, turn: 0 };
  const e = (k - POP_AT) / (POP_S - POP_AT);
  return { done: 1, lift: EJECT * Math.sin((e * Math.PI) / 2), fade: 1 - e * e, turn: e };
}

function lever(clock) {
  const k = cycle(clock, 0);
  return k < DROP_S ? 1 - k / DROP_S : k < POP_AT ? 0 : Math.min(1, (k - POP_AT) / SNAP_S);
}

function chrome(ctx, r) {
  const T = SKY.toaster;
  clipped(ctx, r, () => {
    const sky = ctx.createLinearGradient(0, -r, 0, r * 0.15);
    sky.addColorStop(0, T.sky);
    sky.addColorStop(0.7, T.skyLight);
    sky.addColorStop(1, T.horizon);
    ctx.fillStyle = sky;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    const ground = ctx.createLinearGradient(0, r * 0.08, 0, r);
    ground.addColorStop(0, T.ground);
    ground.addColorStop(1, T.groundLight);
    ctx.fillStyle = ground;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.98, r * 1.6, r * 0.9, 0, 0, TAU);
    ctx.fill();
    const edge = ctx.createRadialGradient(-r * 0.15, -r * 0.15, r * 0.55, 0, 0, r);
    edge.addColorStop(0, SKY.lit);
    edge.addColorStop(1, T.rim);
    ctx.fillStyle = edge;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = T.shine;
    ctx.save();
    ctx.translate(-r * 0.45, -r * 0.42);
    ctx.rotate(-0.7);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.2, r * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    disc(ctx, -r * 0.22, -r * 0.62, r * 0.035);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
}

function bread(ctx, x, y, w, a, done) {
  const T = SKY.toaster, k = w / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(k, k);
  ctx.lineWidth /= k;
  toastPath(ctx, 40, 42);
  ctx.fillStyle = mix(T.rawCrust, T.crust, done);
  ctx.fill();
  ctx.stroke();
  ctx.translate(0, 2);
  ctx.scale(0.78, 0.78);
  toastPath(ctx, 40, 42);
  const g = ctx.createRadialGradient(-8, -10, 2, 0, 0, 30);
  g.addColorStop(0, mix(T.raw, T.crumb, done));
  g.addColorStop(1, mix(T.raw, T.toasted, done));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
}

function slot(ctx, x, y, w, r) {
  const T = SKY.toaster, g = ctx.createRadialGradient(x, y, 0, x, y, w);
  g.addColorStop(0, T.glow);
  g.addColorStop(1, T.glowDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(x, y, w, r * 0.06, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = T.slot;
  ctx.lineWidth = ink(r);
  ctx.stroke();
}

function steam(ctx, x, y, r, clock, heat, seed) {
  const base = ctx.globalAlpha;
  ctx.fillStyle = SKY.toaster.smoke;
  for (let j = 0; j < WISPS; j++) {
    const p = (((clock * 0.5 + j / WISPS + seed) % 1) + 1) % 1;
    ctx.globalAlpha = base * heat * (1 - p) * 0.75;
    disc(ctx, x + Math.sin(p * 7 + j * 2) * r * 0.06, y - r * (0.3 + p * 0.55), r * (0.05 + p * 0.09));
  }
  ctx.globalAlpha = base;
}

export function toaster(ctx, r, clock) {
  const T = SKY.toaster, w = r * 0.56, hop = lever(clock);
  chrome(ctx, r);
  onSphere(ctx, r, 0.86, 0.12, () => {
    ctx.fillStyle = T.slot;
    ctx.beginPath();
    rr(ctx, -r * 0.05, -r * 0.26, r * 0.1, r * 0.52, r * 0.05);
    ctx.fill();
  });
  onSphere(ctx, r, 0.32, 0.5, (light) => {
    ctx.fillStyle = T.horizon;
    disc(ctx, 0, 0, r * 0.15);
    ctx.fillStyle = T.bakelite;
    disc(ctx, 0, 0, r * 0.11);
    ctx.strokeStyle = T.shine;
    ctx.lineCap = "round";
    ctx.lineWidth = r * 0.03;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(light + 2.2) * r * 0.08, Math.sin(light + 2.2) * r * 0.08);
    ctx.stroke();
  });
  for (const [x, y, delay, turn] of SLOTS) {
    const g = grill(clock, delay);
    slot(ctx, x * r, y * r, w * 0.64, r);
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink(r);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-r * 2, -r * 4, 4 * r, r * (4 + y));
    ctx.clip();
    ctx.globalAlpha *= g.fade;
    bread(ctx, x * r, (y - 0.04 - g.lift) * r, w, turn * 0.4 * g.turn, g.done);
    ctx.restore();
    if (g.lift === 0) steam(ctx, x * r, y * r, r, clock, g.done, delay);
  }
  ctx.fillStyle = T.bakelite;
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.beginPath();
  rr(ctx, r * 0.84, r * (0.24 - 0.32 * hop) - r * 0.07, r * 0.32, r * 0.14, r * 0.07);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = T.bakeliteLight;
  ctx.beginPath();
  rr(ctx, r * 0.92, r * (0.24 - 0.32 * hop) - r * 0.045, r * 0.18, r * 0.035, r * 0.02);
  ctx.fill();
}
