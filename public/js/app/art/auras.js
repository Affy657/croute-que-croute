import { TAU } from "./kit.js";

const FIRE_TONGUES = 9, FIRE_LAYERS = [["jam", 1, 0], ["flame", 0.7, 1.7], ["mustard", 0.42, 3.1]], EMBERS = 5, EMBER_RISE = 20;
const BOLTS = 3, BOLT_STEPS = 6, BOLT_MS = 90, BOLT_JAG = 3, BOLT_FORK = 0.3, SPARKS = 7, NEON_R = 35, FIRE_HOLE = 22;
const NEON = ["#ff3fa4", "#8a5cff", "#ffcf33"], NEON_SEAM = 0.02;
const RING_RX = 43, RING_RY = 12, RING_TILT = -0.28, RING_SPIN = 0.9, MOON_R = 3.8;
const RING_SPARKLES = [[-36, -26, 2.2], [34, 24, 1.8], [-28, 30, 1.4]];
function glow(ctx, y, inner, outer, from, to) {
  const g = ctx.createRadialGradient(0, y, inner, 0, y, outer);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, y, outer, 0, TAU);
  ctx.fill();
}

function sparkle(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6);
  ctx.lineTo(x + s * 0.4, y - s * 0.4);
  ctx.lineTo(x + s * 1.6, y);
  ctx.lineTo(x + s * 0.4, y + s * 0.4);
  ctx.lineTo(x, y + s * 1.6);
  ctx.lineTo(x - s * 0.4, y + s * 0.4);
  ctx.lineTo(x - s * 1.6, y);
  ctx.lineTo(x - s * 0.4, y - s * 0.4);
  ctx.closePath();
  ctx.fill();
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function fireBase(a, round) {
  const c = Math.cos(a), sn = Math.sin(a);
  return round ? [c * 22, sn * 22] : [Math.sign(c) * Math.abs(c) ** 0.5 * 18, Math.sign(sn) * Math.abs(sn) ** 0.5 * 20 - 1];
}

function fireLayer(ctx, now, round, k, phase) {
  ctx.beginPath();
  for (let i = 0; i < FIRE_TONGUES; i++) {
    const a0 = (i / FIRE_TONGUES) * TAU, a1 = ((i + 1) / FIRE_TONGUES) * TAU, am = (a0 + a1) / 2;
    const [x0, y0] = fireBase(a0, round), [x1, y1] = fireBase(a1, round), [xm, ym] = fireBase(am, round);
    const ox = Math.cos(am), oy = Math.sin(am), top = Math.max(0, -oy);
    const len = (10 + 12 * top + Math.sin(now * 8 + i * 2.1 + phase) * 2.5) * k * (round ? 0.85 : 1);
    const tx = xm + ox * len * 0.7 + Math.sin(now * 5 + i * 1.3 + phase) * len * 0.25, ty = ym + oy * len * 0.7 - len * 0.6;
    if (!i) ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + ox * len * 0.7, y0 + oy * len * 0.7, xm + ox * len * 0.5 - (x1 - x0) * 0.15, ym + oy * len * 0.5 - len * 0.35, tx, ty);
    ctx.bezierCurveTo(xm + ox * len * 0.5 + (x1 - x0) * 0.15, ym + oy * len * 0.5 - len * 0.35, x1 + ox * len * 0.7, y1 + oy * len * 0.7, x1, y1);
  }
  ctx.closePath();
  if (round) {
    ctx.moveTo(FIRE_HOLE, 0);
    ctx.arc(0, 0, FIRE_HOLE, 0, TAU);
  }
  ctx.fill("evenodd");
}

function auraHeat(ctx, now, C, round) {
  if (round) {
    const g = ctx.createRadialGradient(0, 0, FIRE_HOLE, 0, 0, 44);
    g.addColorStop(0, "rgba(255, 122, 26, 0)");
    g.addColorStop(0.2, "rgba(255, 122, 26, 0.45)");
    g.addColorStop(1, "rgba(224, 36, 74, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, TAU);
    ctx.fill();
  } else glow(ctx, -4, 14, 42, "rgba(255, 122, 26, 0.45)", "rgba(224, 36, 74, 0)");
  for (const [color, k, phase] of FIRE_LAYERS) {
    ctx.fillStyle = C[color];
    fireLayer(ctx, now, round, k, phase);
  }
  ctx.fillStyle = C.mustard;
  for (let i = 0; i < EMBERS; i++) {
    const rise = (now * 0.6 + i / EMBERS) % 1;
    ctx.globalAlpha = 1 - rise;
    ctx.beginPath();
    ctx.arc(-18 + i * 9 + Math.sin(now * 3 + i) * 2, (round ? -36 : -40) - rise * EMBER_RISE, 1.3 - rise * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function bolt(ctx, seed, a, r0, r1) {
  let fx = 0, fy = 0;
  ctx.beginPath();
  for (let k = 0; k <= BOLT_STEPS; k++) {
    const r = r0 + ((r1 - r0) * k) / BOLT_STEPS, j = k && k < BOLT_STEPS ? ((hash(seed + k) - 0.5) * 2 * BOLT_JAG) / r : 0;
    const x = Math.cos(a + j) * r, y = Math.sin(a + j) * r;
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    if (k === 3) [fx, fy] = [x, y];
  }
  const fork = a + (hash(seed + 9) > 0.5 ? BOLT_FORK : -BOLT_FORK);
  ctx.moveTo(fx, fy);
  ctx.lineTo(Math.cos(fork) * (r1 - 3), Math.sin(fork) * (r1 - 3));
}

function auraVolt(ctx, now, C, round) {
  const ms = now * 1000, tick = Math.floor(ms / BOLT_MS), flash = 1 - (ms % BOLT_MS) / BOLT_MS;
  const r0 = round ? 22 : 19, r1 = round ? 40 : 38;
  glow(ctx, 0, 14, r1 + 2, `rgba(110, 210, 255, ${0.22 + 0.16 * flash})`, "rgba(110, 210, 255, 0)");
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let b = 0; b < BOLTS; b++) {
    const seed = tick * 13 + b * 71;
    bolt(ctx, seed, ((b + hash(seed) * 0.6) / BOLTS) * TAU + tick * 0.9, r0, r1);
    ctx.strokeStyle = "rgba(79, 200, 255, 0.5)";
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = "#f2fbff";
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.fillStyle = "#e8f8ff";
  for (let i = 0; i < SPARKS; i++) {
    const seed = tick * 7 + i * 31;
    if (hash(seed) > 0.55) continue;
    const a = hash(seed + 1) * TAU, r = r1 - 6 + hash(seed + 2) * 8;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.9, 0, TAU);
    ctx.fill();
  }
}

function auraNeon(ctx, now) {
  const pulse = 0.75 + 0.25 * Math.sin(now * 4), turn = now * 1.5, arc = TAU / (NEON.length * 2);
  glow(ctx, 0, 22, 40, `rgba(255, 63, 164, ${0.28 * pulse})`, "rgba(138, 92, 255, 0)");
  ctx.lineCap = "butt";
  for (let i = 0; i < NEON.length * 2; i++) {
    ctx.strokeStyle = NEON[i % NEON.length];
    ctx.beginPath();
    ctx.arc(0, 0, NEON_R, turn + i * arc, turn + (i + 1) * arc + NEON_SEAM);
    ctx.globalAlpha = 0.35 * pulse;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
}

function ringBand(ctx, from, to) {
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(0, 0, RING_RX, RING_RY, 0, from, to);
  ctx.strokeStyle = "rgba(255, 207, 51, 0.85)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 241, 168, 0.9)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function moon(ctx, a, C) {
  ctx.fillStyle = C.steel;
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(Math.cos(a) * RING_RX, Math.sin(a) * RING_RY, MOON_R, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

function ringBack(ctx, now, C) {
  ctx.save();
  ctx.rotate(RING_TILT);
  ringBand(ctx, 0, TAU);
  moon(ctx, now * RING_SPIN, C);
  ctx.restore();
  ctx.fillStyle = C.ink;
  RING_SPARKLES.forEach(([x, y, size], i) => {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now * 3 + i * 2.1);
    sparkle(ctx, x, y, size);
  });
  ctx.globalAlpha = 1;
}

function ringFront(ctx, now, C) {
  const a = now * RING_SPIN;
  ctx.save();
  ctx.rotate(RING_TILT);
  ringBand(ctx, 0, Math.PI);
  if (Math.sin(a) > 0) moon(ctx, a, C);
  ctx.restore();
}

export const AURAS = { heat: { back: auraHeat }, volt: { back: auraVolt }, neon: { back: auraNeon }, ring: { back: ringBack, front: ringFront } };
