import { PALETTE, SKY } from "../shared/palette.js";
import { rr, toastPath, hat } from "./sprites.js";

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

function tone(ctx, r) {
  clipped(ctx, r, () => {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, SKY.lit);
    g.addColorStop(1, SKY.shade);
    ctx.fillStyle = g;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
  });
  outline(ctx, r);
}

function outline(ctx, r) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.stroke();
}

function halfRing(ctx, r, color, from) {
  const alpha = ctx.globalAlpha;
  ctx.save();
  ctx.strokeStyle = color;
  for (const [k, w, a] of [[1.62, 0.06, 0.6], [1.38, 0.11, 0.32]]) {
    ctx.lineWidth = Math.max(1.5, r * w);
    ctx.globalAlpha = alpha * a;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * k, r * k * 0.26, 0, from, from + Math.PI);
    ctx.stroke();
  }
  ctx.restore();
}

function ringed(ctx, r, light, dark, ring, tilt, band, storm) {
  ctx.rotate(tilt);
  halfRing(ctx, r, ring, Math.PI);
  ball(ctx, r, light, dark);
  clipped(ctx, r, () => {
    ctx.save();
    ctx.globalAlpha *= 0.35;
    ctx.fillStyle = band;
    for (const [y, h] of [[-0.45, 0.09], [0.1, 0.12], [0.5, 0.07]]) {
      ctx.beginPath();
      ctx.ellipse(0, y * r, r * 1.1, r * h, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    if (storm) onSphere(ctx, r, 0.32, 0.32, () => {
      ctx.fillStyle = storm;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.11, r * 0.17, 0, 0, TAU);
      ctx.fill();
    });
  });
  outline(ctx, r);
  halfRing(ctx, r, ring, 0);
}

function purple(ctx, r) {
  const V = SKY.violet;
  ringed(ctx, r, PALETTE.planet, PALETTE["planet-shade"], PALETTE.mustard, -0.35, V.band, V.storm);
}

function green(ctx, r) {
  const G = SKY.green;
  ringed(ctx, r, G.light, G.dark, G.ring, 0.3, G.band);
}

function speaker(ctx, s, light, S = SKY.speakers) {
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

function land(ctx, r, parts, S = SKY.speakers) {
  const edge = ink(r) * 1.2;
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
  tone(ctx, r);
}

const DUNES = [
  { x: -0.52, y: 0.32, parts: [[0, 0, 0.3], [0.25, 0.1, 0.2], [-0.15, -0.2, 0.18], [0.1, 0.3, 0.14]] },
  { x: 0.55, y: 0.05, parts: [[0, 0, 0.26], [0.1, -0.25, 0.2], [-0.2, 0.15, 0.15]] },
  { x: -0.2, y: -0.7, parts: [[0, 0, 0.2], [0.22, 0.04, 0.14], [-0.18, 0.06, 0.12]] },
  { x: 0.25, y: 0.72, parts: [[0, 0, 0.16], [-0.15, -0.05, 0.1]] }
];
const WOOFERS = [[-0.24, -0.2, 0.3], [0.5, -0.45, 0.17], [0.36, 0.4, 0.21], [-0.55, 0.45, 0.14], [0.66, 0.02, 0.1]];

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

function bass(ctx, r, clock) {
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

function crater(ctx, s, light, P = SKY.pancake) {
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
  const w = r * 0.36, e = w * 0.32, t = r * 0.085, sx = -r * 0.08, base = -r * 0.84;
  clipped(ctx, r, () => {
    for (const [x, y, s] of CRATERS) onSphere(ctx, r, x, y, (light) => crater(ctx, s * r, light));
    ctx.fillStyle = SKY.shade;
    ctx.beginPath();
    ctx.ellipse(sx + w * 0.35, base + t + e * 0.4, w * 1.3, e * 1.4, 0, 0, TAU);
    ctx.fill();
  });
  for (const [x, y, s] of [[-0.82, 0.1, 0.17], [-0.7, 0.5, 0.12]]) onSphere(ctx, r, x, y, (light) => speaker(ctx, s * r, light));
  tone(ctx, r);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r) * 0.75;
  const shifts = [0, 0.06, -0.04, 0.05];
  shifts.forEach((dx, i) => layer(ctx, sx + dx * w, base - i * t, w * (1 - (i % 2) * 0.05), e, t));
  const top = base - (shifts.length - 1) * t;
  glaze(ctx, sx, top, w, e, t);
  jar(ctx, sx + w * 0.08, top + e * 0.15, r * 0.26);
}

function pitted(ctx, r, C, pits) {
  ball(ctx, r, C.light, C.dark);
  clipped(ctx, r, () => {
    for (const [x, y, s] of pits) onSphere(ctx, r, x, y, (light) => crater(ctx, s * r, light, C));
  });
  outline(ctx, r);
}

function moons(ctx, r) {
  for (const [x, y, s] of [[0, 0, 1], [2.4, 1.3, 0.6], [-1.3, 2.3, 0.45]]) {
    ctx.save();
    ctx.translate(x * r, y * r);
    pitted(ctx, s * r, SKY.moons, [[0.3, 0.25, 0.22], [-0.35, -0.1, 0.15], [0.05, -0.5, 0.12], [-0.5, 0.5, 0.08]]);
    ctx.restore();
  }
}

function rock(ctx, r) {
  pitted(ctx, r, SKY.rock, [[0.3, 0.2, 0.25], [-0.35, 0.35, 0.18], [-0.1, -0.45, 0.14], [0.55, -0.4, 0.09], [-0.65, -0.15, 0.08], [0.1, 0.7, 0.07]]);
}

const BEAT = 0.42;
const GRAIN = [[-0.11, -0.05, -0.36, 0.025], [-0.03, -0.03, -0.18, -0.015], [0.09, -0.06, -0.33, -0.02]];

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

function knob(ctx, x, y, rx, ry, line) {
  ctx.fillStyle = SKY.tung.wood;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

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
  const shoulder = -h * 0.5, left = [-w / 2 - s * 0.16, shoulder - s * (0.08 + 0.12 * wave)];
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

function stage(ctx, r, clock) {
  rock(ctx, r);
  ctx.save();
  ctx.translate(0, -r * 0.95);
  tung(ctx, r * 2.5, clock);
  ctx.restore();
}

const POP_S = 6, POP_UP = 0.7, SLOTS = [[0.08, -0.74, 0.12, 1], [-0.08, -0.55, 0, -1]];

function popped(clock, delay) {
  const k = (((clock - delay) % POP_S) + POP_S) % POP_S;
  return k < POP_UP ? Math.sin((k / POP_UP) * Math.PI) : 0;
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

function bread(ctx, x, y, w, a) {
  const T = SKY.toaster, k = w / 40;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(k, k);
  ctx.lineWidth /= k;
  toastPath(ctx, 40, 42);
  ctx.fillStyle = T.crust;
  ctx.fill();
  ctx.stroke();
  ctx.translate(0, 2);
  ctx.scale(0.78, 0.78);
  toastPath(ctx, 40, 42);
  const g = ctx.createRadialGradient(-8, -10, 2, 0, 0, 30);
  g.addColorStop(0, T.crumb);
  g.addColorStop(1, T.toasted);
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

function toaster(ctx, r, clock) {
  const T = SKY.toaster, w = r * 0.56, hop = popped(clock, 0);
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
    const up = popped(clock, delay);
    slot(ctx, x * r, y * r, w * 0.64, r);
    ctx.strokeStyle = INK;
    ctx.lineWidth = ink(r);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-r * 2, -r * 4, 4 * r, r * (4 + y));
    ctx.clip();
    bread(ctx, x * r, (y - 0.04 - 0.55 * up) * r, w, turn * 0.22 * up);
    ctx.restore();
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

const NOTCHES = [
  { a: -2.15, d: 1.1, s: 0.38, teeth: 5 },
  { a: 0.3, d: 1.02, s: 0.17 },
  { a: 1.5, d: 1.04, s: 0.13 },
  { a: 2.7, d: 1.02, s: 0.15 }
];
const HOLES = [[-0.05, -0.28, 0.17], [0.42, -0.45, 0.11], [0.2, 0.25, 0.15], [-0.4, 0.42, 0.12], [-0.62, -0.08, 0.1], [-0.12, 0.72, 0.07], [0.58, 0.05, 0.07], [0.1, -0.02, 0.05]];
const PORES = [[0.3, -0.12, 0.025], [-0.25, 0.12, 0.02], [0.45, 0.48, 0.025], [-0.55, 0.62, 0.02], [0.12, -0.7, 0.02], [0.3, 0.62, 0.018], [-0.3, -0.05, 0.018]];

function notch(n, r) {
  const D = n.d * r, br = n.s * r;
  return {
    ...n, br, cx: Math.cos(n.a) * D, cy: Math.sin(n.a) * D,
    phi: Math.acos((r * r + D * D - br * br) / (2 * r * D)),
    psi: Math.acos((br * br + D * D - r * r) / (2 * br * D))
  };
}

function notchEdge(ctx, n) {
  const from = n.a + Math.PI + n.psi;
  if (!n.teeth) {
    ctx.arc(n.cx, n.cy, n.br, from, n.a + Math.PI - n.psi, true);
    return;
  }
  const bulge = n.br * 0.25, at = (t) => [n.cx + Math.cos(t) * n.br, n.cy + Math.sin(t) * n.br];
  for (let i = 0; i < n.teeth; i++) {
    const t1 = from - ((i + 1) / n.teeth) * 2 * n.psi, tm = t1 + n.psi / n.teeth;
    const [x1, y1] = at(t1), [mx, my] = at(tm);
    ctx.quadraticCurveTo(mx + Math.cos(tm) * bulge, my + Math.sin(tm) * bulge, x1, y1);
  }
}

function wheel(ctx, list, r) {
  ctx.beginPath();
  list.forEach((n, i) => {
    const next = list[(i + 1) % list.length], start = n.a + n.phi;
    let end = next.a - next.phi;
    if (end < start) end += TAU;
    ctx.arc(0, 0, r, start, end);
    notchEdge(ctx, next);
  });
  ctx.closePath();
}

function hole(ctx, s, light) {
  const C = SKY.cheese, lx = Math.cos(light) * s, ly = Math.sin(light) * s;
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, s, 0, TAU);
  ctx.clip();
  const g = ctx.createLinearGradient(lx, ly, -lx, -ly);
  g.addColorStop(0, C.holeDark);
  g.addColorStop(0.6, C.hole);
  g.addColorStop(1, C.holeLight);
  ctx.fillStyle = g;
  ctx.fillRect(-s, -s, 2 * s, 2 * s);
  ctx.restore();
}

function mouse(ctx, r) {
  const C = SKY.cheese, s = r * 0.34, at = NOTCHES[0].a + 0.66;
  ctx.save();
  ctx.translate(Math.cos(at) * r, Math.sin(at) * r);
  ctx.rotate(at + Math.PI / 2);
  ctx.scale(-1, 1);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r) * 2.4;
  const tail = () => {
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.12);
    ctx.bezierCurveTo(-s * 1.1, -s * 0.05, -s * 1.15, -s * 0.6, -s * 0.85, -s * 0.75);
    ctx.stroke();
  };
  tail();
  ctx.strokeStyle = C.ear;
  ctx.lineWidth = ink(r);
  tail();
  ctx.strokeStyle = INK;
  ctx.fillStyle = C.mouse;
  for (const x of [-0.3, 0.3]) {
    ctx.beginPath();
    ctx.ellipse(x * s, 0, s * 0.14, s * 0.08, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(s * 0.98, -s * 0.3);
  ctx.bezierCurveTo(s * 0.62, -s * 0.78, -s * 0.32, -s * 0.88, -s * 0.6, -s * 0.36);
  ctx.quadraticCurveTo(-s * 0.74, -s * 0.04, -s * 0.34, -s * 0.04);
  ctx.lineTo(s * 0.36, -s * 0.04);
  ctx.quadraticCurveTo(s * 0.72, -s * 0.08, s * 0.98, -s * 0.3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s * 0.28, -s * 0.74, s * 0.22, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.ear;
  disc(ctx, s * 0.3, -s * 0.74, s * 0.12);
  disc(ctx, s * 0.98, -s * 0.3, s * 0.08);
  ctx.fillStyle = INK;
  disc(ctx, s * 0.6, -s * 0.46, s * 0.07);
  ctx.restore();
}

function cheese(ctx, r) {
  const C = SKY.cheese, list = NOTCHES.map((n) => notch(n, r));
  ctx.save();
  wheel(ctx, list, r);
  ctx.clip();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.05, 0, 0, r * 1.05);
  g.addColorStop(0, C.light);
  g.addColorStop(0.5, C.mid);
  g.addColorStop(1, C.dark);
  ctx.fillStyle = g;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  for (const [x, y, s] of HOLES) onSphere(ctx, r, x, y, (light) => hole(ctx, s * r, light));
  for (const [x, y, s] of PORES) onSphere(ctx, r, x, y, (light) => hole(ctx, s * r, light));
  for (const n of list) {
    const from = n.a + Math.PI + n.psi;
    ctx.strokeStyle = n.teeth ? C.cut : C.holeDark;
    ctx.lineWidth = r * (n.teeth ? 0.07 : 0.1);
    ctx.beginPath();
    ctx.moveTo(n.cx + Math.cos(from) * n.br, n.cy + Math.sin(from) * n.br);
    notchEdge(ctx, n);
    ctx.stroke();
  }
  const shade = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.5, 0, 0, r * 1.05);
  shade.addColorStop(0, SKY.lit);
  shade.addColorStop(1, C.shade);
  ctx.fillStyle = shade;
  ctx.fillRect(-r, -r, 2 * r, 2 * r);
  ctx.restore();
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.lineJoin = "round";
  wheel(ctx, list, r);
  ctx.stroke();
  mouse(ctx, r);
}

function toastie(ctx, w, head) {
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

const RIBS = [[-0.58, 0.44], [0.58, 0.44], [-0.3, 0.5], [0.3, 0.5], [0, 0.52]];
const CUTS = [[[-0.56, -0.02], [-0.16, -0.06], [-0.4, -0.32]], [[0.56, -0.02], [0.16, -0.06], [0.4, -0.32]], [[-0.08, 0.14], [0.08, 0.14], [0, 0]]];

function ribs(ctx, r, list) {
  ctx.beginPath();
  for (const [x, w] of list) {
    ctx.moveTo((x + w) * r, 0);
    ctx.ellipse(x * r, 0, w * r, r * 0.82, 0, 0, TAU);
  }
}

function grin(ctx, r, open) {
  ctx.beginPath();
  for (const shape of CUTS) {
    shape.forEach(([x, y], i) => (i ? ctx.lineTo(x * r, y * r) : ctx.moveTo(x * r, y * r)));
    ctx.closePath();
  }
  ctx.moveTo(-r * 0.6, r * 0.2);
  ctx.quadraticCurveTo(0, r * 0.42, r * 0.6, r * 0.2);
  ctx.quadraticCurveTo(0, r * (0.42 + 0.5 * open), -r * 0.6, r * 0.2);
  ctx.closePath();
}

function witch(ctx, s, clock) {
  const P = SKY.pumpkin, line = Math.max(1, s * 0.07);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.fillStyle = P.straw;
  ctx.beginPath();
  ctx.moveTo(-s * 0.55, -s * 0.03);
  ctx.lineTo(-s * 1.1, -s * 0.22);
  ctx.lineTo(-s * 1.14, s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, 0);
  ctx.lineTo(s * 0.75, 0);
  ctx.lineWidth = line * 3.4;
  ctx.stroke();
  ctx.strokeStyle = P.stick;
  ctx.lineWidth = line * 1.6;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, -s * 0.48);
  ctx.rotate(0.15 + Math.sin(clock * 5) * 0.05);
  toastie(ctx, s, "witch");
  ctx.restore();
}

function pumpkin(ctx, r, clock) {
  const P = SKY.pumpkin, a = clock * 0.9, front = Math.sin(a) > 0, t = clock % 4, flicker = 0.82 + 0.18 * Math.sin(clock * 13) * Math.sin(clock * 7.3);
  const fly = () => {
    const depth = 0.85 + 0.15 * Math.sin(a);
    ctx.save();
    ctx.rotate(-0.2);
    ctx.translate(Math.cos(a) * r * 1.45, Math.sin(a) * r * 0.42 - r * 0.12);
    ctx.scale(front ? -depth : depth, depth);
    witch(ctx, r * 0.55, clock);
    ctx.restore();
  };
  if (!front) fly();
  ctx.fillStyle = P.stem;
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-r * 0.09, -r * 0.7);
  ctx.quadraticCurveTo(-r * 0.12, -r * 0.95, -r * 0.02, -r * 1.08);
  ctx.lineTo(r * 0.12, -r * 1.02);
  ctx.quadraticCurveTo(r * 0.04, -r * 0.92, r * 0.09, -r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  g.addColorStop(0, P.light);
  g.addColorStop(0.55, P.mid);
  g.addColorStop(1, P.dark);
  ctx.lineWidth = ink(r) * 2;
  ribs(ctx, r, RIBS);
  ctx.stroke();
  ctx.fillStyle = g;
  ctx.fill();
  ctx.save();
  ribs(ctx, r, RIBS);
  ctx.clip();
  ctx.strokeStyle = P.rib;
  ctx.lineWidth = ink(r);
  ribs(ctx, r, RIBS.slice(2));
  ctx.stroke();
  const shade = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.2, 0, 0, r * 1.1);
  shade.addColorStop(0, SKY.lit);
  shade.addColorStop(1, SKY.shade);
  ctx.fillStyle = shade;
  ctx.fillRect(-r * 1.1, -r, r * 2.2, r * 2);
  const spill = ctx.createRadialGradient(0, r * 0.12, 0, 0, r * 0.12, r * 0.85);
  spill.addColorStop(0, P.spill);
  spill.addColorStop(1, P.spillOut);
  ctx.globalAlpha *= flicker;
  ctx.fillStyle = spill;
  ctx.fillRect(-r * 1.1, -r, r * 2.2, r * 2);
  ctx.restore();
  const open = t < 1.2 ? 0.55 + 0.45 * Math.abs(Math.sin(t * 9)) : 0.4;
  const glow = ctx.createRadialGradient(0, r * 0.1, r * 0.05, 0, r * 0.1, r * 0.75);
  glow.addColorStop(0, P.glow);
  glow.addColorStop(1, P.deep);
  ctx.save();
  ctx.globalAlpha *= flicker;
  ctx.fillStyle = glow;
  grin(ctx, r, open);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = P.dark;
  ctx.lineWidth = ink(r);
  grin(ctx, r, open);
  ctx.stroke();
  ctx.fillStyle = P.mid;
  for (const x of [-0.22, 0.12]) ctx.fillRect(x * r, r * 0.27, r * 0.1, r * 0.09);
  ctx.strokeStyle = P.stem;
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(r * 0.06, -r * 0.8);
  ctx.bezierCurveTo(r * 0.28, -r * 1.0, r * 0.42, -r * 0.84, r * 0.32, -r * 0.78);
  ctx.bezierCurveTo(r * 0.24, -r * 0.74, r * 0.22, -r * 0.86, r * 0.3, -r * 0.86);
  ctx.stroke();
  if (front) fly();
}

const SPLAT = [[0, 0, 0.17], [-0.15, 0.05, 0.08], [0.15, 0.04, 0.07], [0.02, -0.16, 0.07], [-0.17, -0.1, 0.06], [0.13, -0.12, 0.05]];
const DRIPS = [[-0.08, 0.3, 0.07], [0.06, 0.4, 0.08], [-0.17, 0.18, 0.05]];
const PUFFS = [[-0.8, 0.72, 0.24], [-0.52, 0.9, 0.24], [-0.2, 1.0, 0.2], [0.18, 1.0, 0.18], [0.5, 0.88, 0.24], [0.82, 0.64, 0.2]];

function goo(ctx, r, clock) {
  const M = SKY.melies, grow = 0.04 * Math.sin(clock * 0.8);
  const shape = () => {
    ctx.beginPath();
    for (const [x, y, s] of SPLAT) {
      ctx.moveTo((x + s) * r, y * r);
      ctx.arc(x * r, y * r, s * r, 0, TAU);
    }
    for (const [x, len, w] of DRIPS) rr(ctx, (x - w / 2) * r, 0, w * r, (len + grow) * r, (w / 2) * r);
  };
  ctx.strokeStyle = M.gooEdge;
  ctx.lineWidth = ink(r) * 1.6;
  shape();
  ctx.stroke();
  ctx.fillStyle = M.goo;
  shape();
  ctx.fill();
}

function capsule(ctx, r) {
  const M = SKY.melies, len = r * 0.42, rad = r * 0.19, g = ctx.createLinearGradient(0, -rad, 0, rad);
  g.addColorStop(0, M.rocketLight);
  g.addColorStop(1, M.rocketDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -rad);
  ctx.lineTo(len, -rad);
  ctx.ellipse(len, 0, rad * 0.5, rad, 0, -Math.PI / 2, Math.PI / 2);
  ctx.lineTo(0, rad);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(len * 0.45, 0, rad * 0.5, rad, 0, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  ctx.fillStyle = M.window;
  ctx.beginPath();
  ctx.arc(len * 0.72, -rad * 0.3, rad * 0.24, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = M.rocketDark;
  ctx.beginPath();
  ctx.ellipse(len, 0, rad * 0.5, rad, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = M.rocketLight;
  ctx.beginPath();
  ctx.ellipse(len, 0, rad * 0.32, rad * 0.66, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = M.rocketDark;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * TAU;
    disc(ctx, len + Math.cos(a) * rad * 0.41, Math.sin(a) * rad * 0.83, rad * 0.06);
  }
}

function puffs(ctx, r) {
  const M = SKY.melies, shape = () => {
    ctx.beginPath();
    for (const [x, y, s] of PUFFS) {
      ctx.moveTo((x + s) * r, y * r);
      ctx.arc(x * r, y * r, s * r, 0, TAU);
    }
  };
  const g = ctx.createLinearGradient(0, r * 0.5, 0, r * 1.2);
  g.addColorStop(0, M.cloud);
  g.addColorStop(1, M.cloudDark);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r) * 2;
  shape();
  ctx.stroke();
  ctx.fillStyle = g;
  shape();
  ctx.fill();
}

function melies(ctx, r, clock) {
  const M = SKY.melies, line = Math.max(1.2, r * 0.045), t = clock % 5;
  ctx.save();
  if (t > 4.5) ctx.translate(Math.sin(clock * 70) * r * 0.015, 0);
  ball(ctx, r, M.light, M.dark);
  dots(ctx, r, M.spot, [[0.72, -0.42, 0.07], [0.84, 0.1, 0.06], [-0.8, -0.32, 0.05], [0.5, -0.74, 0.05], [-0.62, 0.42, 0.05]]);
  ctx.save();
  ctx.globalAlpha *= 0.3;
  ctx.fillStyle = M.shadow;
  for (const [x, y, w, h, a] of [[-0.3, -0.2, 0.22, 0.15, 0], [0.3, -0.18, 0.21, 0.14, 0], [-0.03, 0.02, 0.06, 0.17, 0.15], [0.05, 0.17, 0.15, 0.05, 0], [0.01, 0.44, 0.3, 0.11, 0]]) {
    ctx.beginPath();
    ctx.ellipse(x * r, y * r, w * r, h * r, a, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= 0.55;
  ctx.fillStyle = M.cheek;
  for (const x of [-0.5, 0.52]) {
    ctx.beginPath();
    ctx.ellipse(x * r, r * 0.2, r * 0.19, r * 0.15, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.strokeStyle = M.feature;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = line * 1.3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.56, -r * 0.34);
  ctx.quadraticCurveTo(-r * 0.38, -r * 0.46, -r * 0.13, -r * 0.43);
  ctx.moveTo(r * 0.13, -r * 0.43);
  ctx.quadraticCurveTo(r * 0.36, -r * 0.48, r * 0.55, -r * 0.34);
  ctx.stroke();
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(-r * 0.02, -r * 0.16);
  ctx.quadraticCurveTo(-r * 0.07, -r * 0.02, -r * 0.08, r * 0.1);
  ctx.quadraticCurveTo(r * 0.04, r * 0.21, r * 0.17, r * 0.1);
  ctx.quadraticCurveTo(r * 0.17, r * 0.0, r * 0.1, -r * 0.03);
  ctx.moveTo(-r * 0.14, r * 0.17);
  ctx.quadraticCurveTo(-r * 0.27, r * 0.3, -r * 0.25, r * 0.43);
  ctx.moveTo(r * 0.24, r * 0.15);
  ctx.quadraticCurveTo(r * 0.35, r * 0.28, r * 0.31, r * 0.41);
  ctx.stroke();
  ctx.fillStyle = M.mouth;
  ctx.beginPath();
  ctx.moveTo(-r * 0.22, r * 0.43);
  ctx.quadraticCurveTo(r * 0.01, r * 0.34, r * 0.24, r * 0.41);
  ctx.quadraticCurveTo(r * 0.02, r * 0.55, -r * 0.22, r * 0.43);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.13, r * 0.53);
  ctx.quadraticCurveTo(r * 0.02, r * 0.6, r * 0.16, r * 0.52);
  ctx.stroke();
  if (clock % 4.5 < 0.15) {
    ctx.lineWidth = line * 1.3;
    ctx.beginPath();
    ctx.moveTo(r * 0.18, -r * 0.17);
    ctx.quadraticCurveTo(r * 0.3, -r * 0.12, r * 0.42, -r * 0.17);
    ctx.stroke();
  } else {
    ctx.fillStyle = M.eye;
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.18, r * 0.12, r * 0.075, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = M.feature;
    disc(ctx, r * 0.25, -r * 0.17, r * 0.05);
    ctx.lineWidth = line * 1.3;
    ctx.beginPath();
    ctx.ellipse(r * 0.3, -r * 0.18, r * 0.12, r * 0.075, 0, Math.PI, TAU);
    ctx.stroke();
  }
  ctx.lineWidth = line * 0.8;
  ctx.beginPath();
  ctx.arc(r * 0.3, -r * 0.16, r * 0.13, 0.25 * Math.PI, 0.75 * Math.PI);
  ctx.stroke();
  tone(ctx, r);
  ctx.save();
  ctx.translate(-r * 0.3, -r * 0.2);
  goo(ctx, r, clock);
  ctx.rotate(-2.5);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.lineJoin = "round";
  capsule(ctx, r);
  ctx.fillStyle = SKY.melies.goo;
  disc(ctx, r * 0.02, -r * 0.1, r * 0.06);
  disc(ctx, r * 0.03, r * 0.11, r * 0.05);
  ctx.restore();
  puffs(ctx, r);
  ctx.restore();
}

const SWELL = [[-0.55, 0.32, 0.5], [-0.15, 0.3, -0.4], [0.25, 0.34, 0.45], [0.62, 0.28, -0.35]];

function swell(ctx, r, clock, P) {
  ctx.strokeStyle = P.foam;
  ctx.lineWidth = ink(r);
  ctx.lineCap = "round";
  ctx.globalAlpha *= 0.7;
  for (const [y, gap, speed] of SWELL) {
    const shift = (((clock * speed) % gap) + gap) % gap;
    ctx.beginPath();
    for (let x = -1.2 + shift; x < 1.2; x += gap) {
      ctx.moveTo((x - 0.08) * r, y * r);
      ctx.quadraticCurveTo(x * r, (y - 0.07) * r, (x + 0.08) * r, y * r);
    }
    ctx.stroke();
  }
  ctx.globalAlpha /= 0.7;
}

function island(ctx, r, clock, P) {
  ctx.save();
  ctx.translate(r * 0.3, r * 0.42);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.fillStyle = P.sand;
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.36, r * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.sandDark;
  ctx.beginPath();
  ctx.ellipse(0, r * 0.04, r * 0.3, r * 0.06, 0, 0, Math.PI);
  ctx.fill();
  ctx.strokeStyle = P.mark;
  ctx.lineWidth = Math.max(1, r * 0.03);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const s of [-1, 1]) {
    ctx.moveTo(r * 0.12 - r * 0.04, -s * r * 0.03);
    ctx.lineTo(r * 0.12 + r * 0.04, s * r * 0.03);
  }
  ctx.stroke();
  const sway = Math.sin(clock * 1.3) * 0.06;
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r) * 2.6;
  ctx.beginPath();
  ctx.moveTo(-r * 0.12, -r * 0.02);
  ctx.quadraticCurveTo(-r * 0.16, -r * 0.24, -r * 0.06 + sway * r, -r * 0.44);
  ctx.stroke();
  ctx.strokeStyle = P.trunk;
  ctx.lineWidth = ink(r) * 1.4;
  ctx.stroke();
  ctx.translate(-r * 0.06 + sway * r, -r * 0.44);
  ctx.fillStyle = P.palm;
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  for (const a of [-2.6, -1.9, -1.2, -0.5, 0.2]) {
    ctx.save();
    ctx.rotate(a + Math.PI / 2 + sway);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.1, -r * 0.12, r * 0.24, -r * 0.02);
    ctx.quadraticCurveTo(r * 0.1, -r * 0.03, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function jolly(ctx, r, x, y, s, P) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = r * s * 0.07;
  ctx.beginPath();
  for (const k of [-1, 1]) {
    ctx.moveTo(-r * s * 0.3, -k * r * s * 0.12 + r * s * 0.2);
    ctx.lineTo(r * s * 0.3, k * r * s * 0.12 + r * s * 0.2);
  }
  ctx.stroke();
  ctx.fillStyle = INK;
  disc(ctx, 0, -r * s * 0.05, r * s * 0.2);
  ctx.beginPath();
  rr(ctx, -r * s * 0.11, r * s * 0.05, r * s * 0.22, r * s * 0.13, r * s * 0.04);
  ctx.fill();
  ctx.fillStyle = P.sail;
  disc(ctx, -r * s * 0.08, -r * s * 0.06, r * s * 0.055);
  disc(ctx, r * s * 0.08, -r * s * 0.06, r * s * 0.055);
  ctx.restore();
}

function galleon(ctx, r, clock, P) {
  ctx.save();
  ctx.translate(0, -r * 0.9);
  ctx.rotate(Math.sin(clock * 1.6) * 0.07);
  ctx.translate(0, Math.sin(clock * 2.1) * r * 0.025);
  ctx.lineJoin = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.fillStyle = P.hullDark;
  ctx.beginPath();
  rr(ctx, -r * 0.03, -r * 0.82, r * 0.06, r * 0.74, r * 0.02);
  ctx.fill();
  ctx.stroke();
  const flap = Math.sin(clock * 6) * r * 0.025;
  ctx.fillStyle = P.flag;
  ctx.beginPath();
  ctx.moveTo(r * 0.03, -r * 0.8);
  ctx.quadraticCurveTo(r * 0.12, -r * 0.8 + flap, r * 0.22, -r * 0.75 + flap);
  ctx.lineTo(r * 0.03, -r * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const puff = Math.sin(clock * 1.1) * r * 0.03;
  ctx.fillStyle = P.sail;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.68);
  ctx.quadraticCurveTo(0, -r * 0.62, r * 0.3, -r * 0.68);
  ctx.quadraticCurveTo(r * 0.36 + puff, -r * 0.46, r * 0.3, -r * 0.24);
  ctx.quadraticCurveTo(0, -r * 0.18, -r * 0.3, -r * 0.24);
  ctx.quadraticCurveTo(-r * 0.24 + puff, -r * 0.46, -r * 0.3, -r * 0.68);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  jolly(ctx, r, puff * 0.5, -r * 0.45, 0.5, P);
  ctx.fillStyle = P.hull;
  ctx.beginPath();
  ctx.moveTo(-r * 0.52, -r * 0.2);
  ctx.lineTo(r * 0.46, -r * 0.13);
  ctx.lineTo(r * 0.62, -r * 0.24);
  ctx.quadraticCurveTo(r * 0.5, r * 0.12, -r * 0.28, r * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = P.trim;
  ctx.lineWidth = ink(r) * 1.3;
  ctx.beginPath();
  ctx.moveTo(-r * 0.46, -r * 0.1);
  ctx.lineTo(r * 0.5, -r * 0.05);
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const x of [-0.25, 0, 0.25]) disc(ctx, x * r, r * 0.02, r * 0.035);
  ctx.strokeStyle = P.foam;
  ctx.lineWidth = ink(r) * 1.4;
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const [x, y, k] of [[-0.42, 0.13, 1], [0.48, 0.06, -1]]) {
    ctx.moveTo((x - 0.12 * k) * r, (y + 0.02) * r);
    ctx.quadraticCurveTo(x * r, (y - 0.06) * r, (x + 0.1 * k) * r, (y + 0.03) * r);
  }
  ctx.stroke();
  ctx.restore();
}

function pirate(ctx, r, clock) {
  const P = SKY.pirate;
  ball(ctx, r, P.light, P.dark);
  clipped(ctx, r, () => {
    swell(ctx, r, clock, P);
    island(ctx, r, clock, P);
  });
  tone(ctx, r);
  galleon(ctx, r, clock, P);
}

export const BODIES = {
  normal: [{ draw: purple, r: 0.13, reach: 1.7 }, { draw: moons, r: 0.045, reach: 3.1 }, { draw: green, r: 0.1, reach: 1.7 }, { draw: rock, r: 0.05, reach: 1.1 }],
  wild: [
    { draw: pancake, name: "Planète pancake", r: 0.12, reach: 1.5 }, { draw: speakers, name: "Planète enceintes", r: 0.11, reach: 1.7 },
    { draw: bass, name: "Planète bleu canard", r: 0.11, reach: 1.8 }
  ],
  rare: [
    { draw: stage, name: "Tung Tung Tung Sahur", r: 0.05, reach: 3.9 }, { draw: cheese, name: "Lune en fromage", r: 0.1, reach: 1.5 },
    { draw: toaster, name: "Grille-pain", r: 0.1, reach: 1.9 },
    { draw: pumpkin, name: "Citrouille", r: 0.09, reach: 2.1 }, { draw: melies, name: "Lune de Méliès", r: 0.1, reach: 1.4 },
    { draw: pirate, name: "Planète pirate", r: 0.09, reach: 1.85 }
  ]
};

const SANS = "Arial, Helvetica, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";

const CANS = {
  "86": { name: "8.6 Original", edge: "#031722", mid: "#1f4458", lid: "#d8c48a", decor: eightSix },
  maxi: { name: "Maximator", edge: "#012b17", mid: "#0c7d52", lid: "#d3d7de", decor: maximator }
};

function label(ctx, text, y, size, color, max, font = "bold " + size + "px " + SANS) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.fillText(text, 0, y, max);
}

function arcText(ctx, text, y, r, font, max) {
  ctx.font = font;
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0), squeeze = Math.min(1, max / total);
  let a = -(total * squeeze) / (2 * r);
  [...text].forEach((ch, i) => {
    const mid = a + (widths[i] * squeeze) / (2 * r);
    ctx.save();
    ctx.translate(Math.sin(mid) * r, y + r - Math.cos(mid) * r);
    ctx.rotate(mid);
    ctx.scale(squeeze, 1);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    a += (widths[i] * squeeze) / r;
  });
}

function wolf(ctx, w, cy) {
  ctx.save();
  ctx.translate(0, cy);
  ctx.scale(w, w);
  const g = ctx.createLinearGradient(0, -0.3, 0, 0.3);
  g.addColorStop(0, "#05b8d6");
  g.addColorStop(1, "#0a5c9c");
  ctx.fillStyle = g;
  ctx.beginPath();
  for (const [x, y] of [[-0.3, -0.3], [-0.15, -0.1], [0, -0.13], [0.15, -0.1], [0.3, -0.3], [0.32, -0.02], [0.24, 0.12], [0.1, 0.2], [0, 0.31], [-0.1, 0.2], [-0.24, 0.12], [-0.32, -0.02]]) ctx.lineTo(x, y);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "rgba(1, 25, 50, 0.55)";
  ctx.lineWidth = 0.022;
  ctx.lineCap = "round";
  for (const pts of [[[0, -0.1], [0, 0.26]], [[-0.12, 0.03], [-0.05, 0.2]], [[0.12, 0.03], [0.05, 0.2]], [[-0.25, -0.2], [-0.2, -0.05]], [[0.25, -0.2], [0.2, -0.05]]]) {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.lineTo(pts[1][0], pts[1][1]);
    ctx.stroke();
  }
  ctx.fillStyle = "#eafcff";
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(s * 0.11, 0.02, 0.045, 0.016, s * 0.35, 0, TAU);
    ctx.fill();
  }
  ctx.fillStyle = "#021a2c";
  ctx.beginPath();
  ctx.moveTo(-0.04, 0.24);
  ctx.lineTo(0.04, 0.24);
  ctx.lineTo(0, 0.29);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function cracks(ctx, w, h) {
  ctx.strokeStyle = "rgba(0, 8, 14, 0.55)";
  ctx.lineWidth = Math.max(0.6, w * 0.012);
  for (const pts of [[[-0.5, 0.28], [-0.32, 0.3], [-0.25, 0.36], [-0.1, 0.35]], [[0.5, 0.22], [0.36, 0.26], [0.3, 0.33]], [[-0.5, -0.05], [-0.38, -0.02], [-0.42, 0.06]], [[0.5, -0.25], [0.4, -0.22], [0.43, -0.14]], [[0.05, 0.42], [0.16, 0.37], [0.28, 0.4]]]) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * w, y * h) : ctx.moveTo(x * w, y * h)));
    ctx.stroke();
  }
}

function eightSix(ctx, w, h) {
  cracks(ctx, w, h);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  label(ctx, "IMPORTED FROM HOLLAND", -h * 0.345, h * 0.024, "#ffffff", w * 0.66);
  wolf(ctx, w, -h * 0.18);
  ctx.font = h * 0.22 + "px " + SERIF;
  ctx.fillStyle = "#ffffff";
  ctx.fillText("8", -w * 0.17, h * 0.07, w * 0.32);
  ctx.fillText("6", w * 0.17, h * 0.07, w * 0.32);
  ctx.fillStyle = "#d0202d";
  ctx.beginPath();
  ctx.arc(0, h * 0.02, w * 0.045, 0, TAU);
  ctx.fill();
  label(ctx, "ORIGINAL", h * 0.15, h * 0.07, "#ffffff", w * 0.7);
  label(ctx, "INTENSE BLOND BEER", h * 0.19, h * 0.032, "#ffffff", w * 0.7);
  ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
  ctx.fillRect(-w * 0.3, h * 0.2, w * 0.6, Math.max(0.6, h * 0.003));
  label(ctx, "ALC. 8,6% VOL.", h * 0.232, h * 0.024, "#ffffff", w * 0.5);
  label(ctx, "500 mL", h * 0.38, h * 0.022, "#ffffff", w * 0.3);
}

function sail(ctx, x, y0, y1, half) {
  const b = (y1 - y0) * 0.25;
  ctx.beginPath();
  ctx.moveTo(x - half, y0);
  ctx.lineTo(x + half, y0);
  ctx.quadraticCurveTo(x + half + b, (y0 + y1) / 2, x + half, y1);
  ctx.lineTo(x - half, y1);
  ctx.quadraticCurveTo(x - half + b, (y0 + y1) / 2, x - half, y0);
  ctx.closePath();
  ctx.fill();
}

function ship(ctx, w, cy) {
  ctx.save();
  ctx.translate(0, cy);
  ctx.scale(w, w);
  ctx.strokeStyle = "#0a4a31";
  ctx.lineWidth = 0.025;
  for (const [x, top] of [[-0.18, -0.5], [0.02, -0.6], [0.2, -0.42]]) {
    ctx.beginPath();
    ctx.moveTo(x, 0.1);
    ctx.lineTo(x, top);
    ctx.stroke();
  }
  const MASTS = [[-0.18, 0.09, [[-0.44, -0.31], [-0.26, -0.11], [-0.06, 0.05]]], [0.02, 0.11, [[-0.54, -0.39], [-0.34, -0.15], [-0.1, 0.05]]], [0.2, 0.08, [[-0.36, -0.23], [-0.18, -0.03]]]];
  ctx.fillStyle = "#c9cccb";
  for (const [x, half, rows] of MASTS) for (const [y0, y1] of rows) sail(ctx, x, y0, y1, half);
  ctx.fillStyle = "#ffffff";
  for (const [x, half, rows] of MASTS) for (const [y0, y1] of rows) sail(ctx, x + half * 0.25, y0, y1, half * 0.75);
  ctx.beginPath();
  ctx.moveTo(0.31, 0.02);
  ctx.lineTo(0.47, -0.12);
  ctx.lineTo(0.31, -0.28);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#dcb163";
  ctx.beginPath();
  ctx.moveTo(-0.32, 0.07);
  ctx.lineTo(0.34, 0.03);
  ctx.quadraticCurveTo(0.27, 0.2, 0.16, 0.24);
  ctx.lineTo(-0.2, 0.24);
  ctx.quadraticCurveTo(-0.3, 0.19, -0.32, 0.07);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#a9813b";
  ctx.fillRect(-0.27, 0.12, 0.56, 0.025);
  ctx.restore();
}

function maximator(ctx, w, h) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
  ctx.fillRect(-w / 2, h * 0.08, w, h * 0.5);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  label(ctx, "BRASSÉE EN HOLLANDE", -h * 0.345, h * 0.022, "#ffffff", w * 0.62);
  ctx.fillStyle = "#dcb163";
  ctx.beginPath();
  ctx.moveTo(-w * 0.05, -h * 0.318);
  ctx.lineTo(-w * 0.03, -h * 0.33);
  ctx.lineTo(0, -h * 0.322);
  ctx.lineTo(w * 0.03, -h * 0.33);
  ctx.lineTo(w * 0.05, -h * 0.318);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c8202c";
  ctx.beginPath();
  rr(ctx, -w * 0.05, -h * 0.316, w * 0.1, h * 0.045, w * 0.03);
  ctx.fill();
  ctx.strokeStyle = "#dcb163";
  ctx.lineWidth = Math.max(0.8, w * 0.015);
  for (const [y, r] of [[-h * 0.27, w * 1.1], [-h * 0.18, w * 1.1]]) {
    ctx.beginPath();
    ctx.arc(0, y + r, r, -Math.PI / 2 - 0.36, -Math.PI / 2 + 0.36);
    ctx.stroke();
  }
  ctx.fillStyle = "#ffffff";
  arcText(ctx, "AMSTERDAM", -h * 0.2, w * 1.1, "bold " + h * 0.08 + "px " + SERIF, w * 0.88);
  ship(ctx, w * 0.75, -h * 0.03);
  label(ctx, "MAXIMATOR", h * 0.14, h * 0.058, "#ffffff", w * 0.72);
  label(ctx, "MAXI INTENSE", h * 0.18, h * 0.034, "#dcb163", w * 0.6);
  label(ctx, "11.6%", h * 0.23, h * 0.045, "#ffffff", w * 0.4);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = Math.max(0.6, w * 0.012);
  ctx.beginPath();
  ctx.arc(-w * 0.42, h * 0.26, w * 0.13, 0, TAU);
  ctx.stroke();
  label(ctx, "BIÈRE BLONDE", h * 0.31, h * 0.02, "#ffffff", w * 0.5);
  label(ctx, "AU GOÛT PUISSANT", h * 0.335, h * 0.02, "#ffffff", w * 0.56);
}

function drawCan(ctx, kind, s) {
  const K = CANS[kind], h = s, w = s * 0.4, e = w * 0.14, neck = w * 0.08, top = -h / 2 + e + neck;
  ctx.save();
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, K.edge);
  g.addColorStop(0.38, K.mid);
  g.addColorStop(0.55, K.mid);
  g.addColorStop(1, K.edge);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-w / 2, top);
  ctx.lineTo(-w / 2, h / 2 - e);
  ctx.ellipse(0, h / 2 - e, w / 2, e, 0, Math.PI, 0, true);
  ctx.lineTo(w / 2, top);
  ctx.lineTo(w * 0.42, -h / 2 + e);
  ctx.lineTo(-w * 0.42, -h / 2 + e);
  ctx.closePath();
  ctx.fill();
  ctx.save();
  ctx.clip();
  K.decor(ctx, w, h);
  ctx.fillStyle = "rgba(255, 255, 255, 0.22)";
  ctx.fillRect(-w * 0.3, top, w * 0.08, h - e * 2 - neck);
  ctx.restore();
  ctx.fillStyle = "#b9bec8";
  ctx.beginPath();
  ctx.ellipse(0, h / 2 - e, w * 0.46, e * 0.8, 0, 0, Math.PI);
  ctx.fill();
  ctx.fillStyle = K.lid;
  ctx.beginPath();
  ctx.ellipse(0, -h / 2 + e, w * 0.42, e, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(0, 0, 0, 0.25)";
  ctx.beginPath();
  ctx.ellipse(0, -h / 2 + e, w * 0.32, e * 0.62, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#e6e9ee";
  ctx.beginPath();
  ctx.ellipse(w * 0.08, -h / 2 + e * 0.92, w * 0.1, e * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

const GOLD = "255, 207, 51";

function streak(ctx, len, s) {
  ctx.lineCap = "round";
  for (const [w, a] of [[0.25, 0.35], [0.09, 0.8]]) {
    const g = ctx.createLinearGradient(0, 0, -len, 0);
    g.addColorStop(0, "rgba(" + GOLD + ", " + a + ")");
    g.addColorStop(1, "rgba(" + GOLD + ", 0)");
    ctx.strokeStyle = g;
    ctx.lineWidth = s * w;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-len, 0);
    ctx.stroke();
  }
}

function roadster(ctx, s) {
  const line = Math.max(1, s * 0.022), suit = "#f1f3f7";
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.fillStyle = suit;
  ctx.beginPath();
  rr(ctx, -s * 0.13, -s * 0.3, s * 0.15, s * 0.22, s * 0.05);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(-s * 0.06, -s * 0.36, s * 0.075, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#1f2340";
  ctx.beginPath();
  ctx.ellipse(-s * 0.025, -s * 0.36, s * 0.042, s * 0.04, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 220, 140, 0.8)";
  disc(ctx, -s * 0.012, -s * 0.375, s * 0.012);
  ctx.beginPath();
  ctx.moveTo(-s * 0.04, -s * 0.25);
  ctx.lineTo(s * 0.09, -s * 0.15);
  ctx.lineWidth = s * 0.055 + line * 2;
  ctx.stroke();
  ctx.strokeStyle = suit;
  ctx.lineWidth = s * 0.055;
  ctx.stroke();
  ctx.fillStyle = "rgba(190, 230, 255, 0.45)";
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(s * 0.13, -s * 0.11);
  ctx.lineTo(s * 0.05, -s * 0.25);
  ctx.lineTo(s * 0.03, -s * 0.11);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -s * 0.12, 0, s * 0.08);
  g.addColorStop(0, "#ff4a4f");
  g.addColorStop(1, "#a8141e");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * 0.5, 0);
  ctx.quadraticCurveTo(-s * 0.5, -s * 0.1, -s * 0.4, -s * 0.11);
  ctx.lineTo(-s * 0.1, -s * 0.12);
  ctx.lineTo(s * 0.1, -s * 0.1);
  ctx.quadraticCurveTo(s * 0.35, -s * 0.08, s * 0.5, -s * 0.02);
  ctx.quadraticCurveTo(s * 0.54, s * 0.05, s * 0.46, s * 0.08);
  ctx.lineTo(-s * 0.46, s * 0.08);
  ctx.quadraticCurveTo(-s * 0.52, s * 0.06, -s * 0.5, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
  ctx.beginPath();
  ctx.moveTo(-s * 0.4, -s * 0.07);
  ctx.lineTo(s * 0.3, -s * 0.055);
  ctx.stroke();
  ctx.strokeStyle = INK;
  for (const x of [-0.32, 0.32]) {
    ctx.fillStyle = "#17131f";
    ctx.beginPath();
    ctx.arc(x * s, s * 0.08, s * 0.1, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#b9bec8";
    disc(ctx, x * s, s * 0.08, s * 0.045);
  }
}

const LIGHTS = ["#ffd84a", "#ff6bb5", "#6be8ff"];

function saucer(ctx, s, clock) {
  const skin = "#7bd85a", line = Math.max(1, s * 0.022), a = -1.2 + Math.sin(clock * 8) * 0.5;
  const hx = s * 0.08 + Math.cos(a) * s * 0.14, hy = -s * 0.14 + Math.sin(a) * s * 0.14;
  ctx.save();
  ctx.translate(0, Math.sin(clock * 3) * s * 0.05);
  ctx.rotate(Math.sin(clock * 2) * 0.1);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.fillStyle = "#5a6070";
  ctx.beginPath();
  ctx.ellipse(0, s * 0.1, s * 0.2, s * 0.05, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.08, -s * 0.14);
  ctx.lineTo(hx, hy);
  ctx.lineWidth = s * 0.05 + line * 2;
  ctx.stroke();
  ctx.strokeStyle = skin;
  ctx.lineWidth = s * 0.05;
  ctx.stroke();
  ctx.fillStyle = skin;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.arc(hx, hy, s * 0.03, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  rr(ctx, -s * 0.1, -s * 0.2, s * 0.2, s * 0.12, s * 0.05);
  ctx.fill();
  ctx.stroke();
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * s * 0.04, -s * 0.35);
    ctx.lineTo(side * s * 0.07, -s * 0.45);
    ctx.lineWidth = s * 0.018 + line * 2;
    ctx.stroke();
    ctx.strokeStyle = skin;
    ctx.lineWidth = s * 0.018;
    ctx.stroke();
    ctx.strokeStyle = INK;
    ctx.lineWidth = line;
  }
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.29, s * 0.1, s * 0.09, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = LIGHTS[0];
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(side * s * 0.07, -s * 0.45, s * 0.022, 0, TAU);
    ctx.fill();
    ctx.stroke();
  }
  for (const side of [-1, 1]) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(side * s * 0.042, -s * 0.29, s * 0.03, s * 0.042, side * 0.35, 0, TAU);
    ctx.fill();
    ctx.fillStyle = PALETTE.ink;
    disc(ctx, side * s * 0.042 - s * 0.008, -s * 0.305, s * 0.009);
  }
  ctx.fillStyle = "rgba(190, 235, 255, 0.35)";
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.22, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.17, -2.6, -2.0);
  ctx.stroke();
  const hull = ctx.createLinearGradient(0, -s * 0.13, 0, s * 0.13);
  hull.addColorStop(0, "#e3e6ec");
  hull.addColorStop(1, "#7d8392");
  ctx.fillStyle = hull;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.5, s * 0.13, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  [-0.36, -0.18, 0, 0.18, 0.36].forEach((x, i) => {
    ctx.fillStyle = LIGHTS[(i + Math.floor(clock * 4)) % LIGHTS.length];
    disc(ctx, x * s, s * 0.055 * Math.sqrt(1 - (x / 0.5) ** 2), s * 0.025);
  });
  ctx.restore();
}

export const PASSERS = {
  ...Object.fromEntries(Object.keys(CANS).map((kind) => [kind, { name: CANS[kind].name, draw: (ctx, s) => drawCan(ctx, kind, s), size: 0.13, trail: streak, spin: 1 }])),
  tesla: { name: "Tesla dans l'espace", draw: roadster, size: 0.17, spin: 0.35 },
  saucer: { name: "Soucoupe volante", draw: saucer, size: 0.15, flat: true }
};
