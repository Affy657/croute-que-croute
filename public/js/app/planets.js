import { PALETTE, SKY } from "../shared/palette.js";
import { rr } from "./sprites.js";

const TAU = Math.PI * 2;
const LIGHT = -0.75 * Math.PI;
const INK = PALETTE.void;

const CRATERS = [[-0.45, -0.5, 0.14], [-0.6, -0.05, 0.1], [0.55, -0.55, 0.12], [0.78, 0.2, 0.1], [-0.3, 0.78, 0.09], [0.15, -0.82, 0.08]];
const LANDS = [
  { x: -0.45, y: -0.2, parts: [[0, 0, 0.32], [0.22, -0.15, 0.22], [-0.1, 0.25, 0.2], [0.3, 0.15, 0.15]] },
  { x: 0.45, y: 0.6, parts: [[0, 0, 0.3], [-0.25, 0.05, 0.2], [0.15, -0.2, 0.18]] },
  { x: 0.3, y: -0.8, parts: [[0, 0, 0.22], [0.2, 0.05, 0.15]] }
];

const ink = (r) => Math.max(1.2, r * 0.035);

function disc(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function ball(ctx, r, light, dark) {
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
  g.addColorStop(0, light);
  g.addColorStop(1, dark);
  ctx.fillStyle = g;
  disc(ctx, 0, 0, r);
}

function dots(ctx, r, color, list) {
  ctx.fillStyle = color;
  for (const [x, y, s] of list) disc(ctx, x * r, y * r, s * r);
}

function clipped(ctx, r, draw) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.clip();
  draw();
  ctx.restore();
}

function onSphere(ctx, r, x, y, draw) {
  const d = Math.min(0.95, Math.hypot(x, y)), a = Math.atan2(y, x);
  ctx.save();
  ctx.translate(x * r, y * r);
  ctx.rotate(a);
  ctx.scale(Math.sqrt(1 - d * d), 1);
  draw(LIGHT - a);
  ctx.restore();
}

function sphereShade(ctx, r) {
  clipped(ctx, r, () => {
    ctx.fillStyle = SKY.shade;
    ctx.beginPath();
    ctx.rect(-r, -r, 2 * r, 2 * r);
    ctx.arc(-r * 0.3, -r * 0.3, r * 1.1, 0, TAU);
    ctx.fill("evenodd");
    ctx.fillStyle = SKY.gleam;
    ctx.beginPath();
    ctx.ellipse(-r * 0.42, -r * 0.48, r * 0.26, r * 0.12, -0.7, 0, TAU);
    ctx.fill();
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
}

function halfRing(ctx, r, color, from) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.07);
  ctx.globalAlpha *= 0.45;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 1.6, r * 0.42, 0, from, from + Math.PI);
  ctx.stroke();
  ctx.restore();
}

function ringed(ctx, r, light, dark, ring, tilt, band) {
  ctx.rotate(tilt);
  halfRing(ctx, r, ring, Math.PI);
  ball(ctx, r, light, dark);
  if (band) {
    clipped(ctx, r, () => {
      ctx.globalAlpha *= 0.35;
      ctx.fillStyle = band;
      for (const y of [-0.45, 0.1, 0.5]) {
        ctx.beginPath();
        ctx.ellipse(0, y * r, r * 1.1, r * 0.09, 0, 0, TAU);
        ctx.fill();
      }
    });
  }
  halfRing(ctx, r, ring, 0);
}

function purple(ctx, r) {
  ringed(ctx, r, PALETTE.planet, PALETTE["planet-shade"], PALETTE.mustard, -0.35);
}

function green(ctx, r) {
  const G = SKY.green;
  ringed(ctx, r, G.light, G.dark, G.ring, 0.3, G.band);
}

function speaker(ctx, s, light) {
  const S = SKY.speakers, lx = Math.cos(light) * s, ly = Math.sin(light) * s;
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

function waves(ctx, r, clock) {
  ctx.save();
  ctx.strokeStyle = SKY.speakers.wave;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(1.5, r * 0.045);
  const alpha = ctx.globalAlpha;
  for (let i = 0; i < 3; i++) {
    const k = (clock * 0.6 + i / 3) % 1;
    ctx.globalAlpha = alpha * 0.6 * (1 - k);
    for (const [mid, span] of [[-0.25, 0.75], [2.4, 0.55]]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.1 + 0.5 * k), mid - span, mid + span);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function land(ctx, r, parts) {
  const S = SKY.speakers, edge = ink(r) * 1.2;
  ctx.fillStyle = S.landEdge;
  for (const [x, y, s] of parts) disc(ctx, x * r, y * r, s * r + edge);
  ctx.fillStyle = S.land;
  for (const [x, y, s] of parts) disc(ctx, x * r, y * r, s * r);
}

function speakers(ctx, r, clock) {
  waves(ctx, r, clock);
  ctx.fillStyle = SKY.speakers.base;
  disc(ctx, 0, 0, r);
  clipped(ctx, r, () => {
    for (const l of LANDS) onSphere(ctx, r, l.x, l.y, () => land(ctx, r, l.parts));
  });
  for (const [x, y, s] of [[0.32, -0.05, 0.36], [-0.5, 0.45, 0.22], [-0.25, -0.58, 0.14]]) {
    onSphere(ctx, r, x, y, (light) => speaker(ctx, s * r, light));
  }
  sphereShade(ctx, r);
}

function crater(ctx, s, light) {
  const P = SKY.pancake;
  ctx.fillStyle = P.crater;
  disc(ctx, 0, 0, s);
  ctx.fillStyle = P.floor;
  disc(ctx, -Math.cos(light) * s * 0.25, -Math.sin(light) * s * 0.25, s * 0.75);
}

function layer(ctx, x, y, w, e, t) {
  const P = SKY.pancake;
  const side = ctx.createLinearGradient(x - w, 0, x + w, 0);
  side.addColorStop(0, P.sideLight);
  side.addColorStop(1, P.side);
  ctx.fillStyle = side;
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w, y + t);
  ctx.ellipse(x, y + t, w, e, 0, Math.PI, 0, true);
  ctx.lineTo(x + w, y);
  ctx.ellipse(x, y, w, e, 0, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const top = ctx.createRadialGradient(x - w * 0.35, y - e * 0.4, w * 0.05, x, y, w);
  top.addColorStop(0, P.topLight);
  top.addColorStop(1, P.top);
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.ellipse(x, y, w, e, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

function glaze(ctx, x, y, w, e, t) {
  const P = SKY.pancake, g = ctx.createLinearGradient(x - w, 0, x + w, 0);
  g.addColorStop(0, P.glazeLight);
  g.addColorStop(1, P.glaze);
  const gw = w * 0.82, ge = e * 0.75;
  const shapes = [[-0.6, 0.8, 0.15], [-0.12, 1.5, 0.22], [0.42, 1.05, 0.17]].map(([dx, len, dw]) => {
    const px = x + dx * gw, py = y + ge * Math.sqrt(1 - dx * dx), d = dw * w;
    return () => rr(ctx, px - d / 2, py - d, d, d + t * len, d / 2);
  });
  shapes.push(() => ctx.ellipse(x, y, gw, ge, 0, 0, TAU));
  const line = ctx.lineWidth;
  ctx.lineWidth = line * 2;
  for (const shape of shapes) {
    ctx.beginPath();
    shape();
    ctx.stroke();
  }
  ctx.lineWidth = line;
  ctx.fillStyle = g;
  for (const shape of shapes) {
    ctx.beginPath();
    shape();
    ctx.fill();
  }
  ctx.fillStyle = SKY.gleam;
  ctx.beginPath();
  ctx.ellipse(x - gw * 0.35, y - ge * 0.25, gw * 0.25, ge * 0.25, 0, 0, TAU);
  ctx.fill();
}

function jar(ctx, x, y, s) {
  const P = SKY.pancake, h = s * 0.95;
  const body = ctx.createLinearGradient(x - s / 2, 0, x + s / 2, 0);
  body.addColorStop(0, P.jarLight);
  body.addColorStop(1, P.jar);
  ctx.fillStyle = body;
  ctx.beginPath();
  rr(ctx, x - s / 2, y - h, s, h, s * 0.32);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.jam;
  ctx.beginPath();
  ctx.ellipse(x, y - h, s * 0.4, s * 0.12, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  rr(ctx, x + s * 0.12, y - h, s * 0.14, s * 0.38, s * 0.07);
  ctx.fill();
  ctx.fillStyle = SKY.gleam;
  ctx.beginPath();
  rr(ctx, x - s * 0.32, y - h * 0.72, s * 0.1, h * 0.45, s * 0.05);
  ctx.fill();
}

function pancake(ctx, r) {
  ctx.fillStyle = SKY.pancake.base;
  disc(ctx, 0, 0, r);
  const w = r * 0.62, e = w * 0.3, t = w * 0.22, cx = r * 0.12, base = r * 0.42;
  clipped(ctx, r, () => {
    for (const [x, y, s] of CRATERS) onSphere(ctx, r, x, y, (light) => crater(ctx, s * r, light));
    ctx.fillStyle = SKY.shade;
    ctx.beginPath();
    ctx.ellipse(cx + w * 0.25, base + t + e * 0.6, w * 1.1, e * 1.1, 0, 0, TAU);
    ctx.fill();
  });
  for (const [x, y, s] of [[-0.82, 0.1, 0.17], [-0.7, 0.5, 0.12]]) onSphere(ctx, r, x, y, (light) => speaker(ctx, s * r, light));
  sphereShade(ctx, r);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  const shifts = [0, 0.05, -0.04, 0.06, 0];
  shifts.forEach((dx, i) => layer(ctx, cx + dx * w, base - i * t, w * (1 - (i % 2) * 0.04), e, t));
  const top = base - (shifts.length - 1) * t;
  glaze(ctx, cx, top, w, e, t);
  jar(ctx, cx + w * 0.08, top + e * 0.15, r * 0.4);
}

function moons(ctx, r) {
  const M = SKY.moons;
  for (const [x, y, s] of [[0, 0, 1], [2.4, 1.3, 0.6], [-1.3, 2.3, 0.45]]) {
    ctx.save();
    ctx.translate(x * r, y * r);
    ball(ctx, s * r, M.light, M.dark);
    dots(ctx, s * r, M.spot, [[0.3, 0.25, 0.22], [-0.35, -0.1, 0.15], [0.05, -0.5, 0.12]]);
    ctx.restore();
  }
}

function rock(ctx, r) {
  const R = SKY.rock;
  ball(ctx, r, R.light, R.dark);
  dots(ctx, r, R.spot, [[0.3, 0.2, 0.25], [-0.35, 0.35, 0.18], [-0.1, -0.45, 0.14]]);
}

export const BODIES = [
  { draw: purple, x: 0.8, r: 0.13 },
  { draw: moons, x: 0.2, r: 0.045 },
  { draw: pancake, x: 0.78, r: 0.12 },
  { draw: green, x: 0.22, r: 0.1 },
  { draw: speakers, x: 0.8, r: 0.11 },
  { draw: rock, x: 0.24, r: 0.05 }
];
