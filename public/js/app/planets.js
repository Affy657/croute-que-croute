import { PALETTE, SKY } from "../shared/palette.js";
import { rr, toastPath } from "./sprites.js";

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
    ctx.globalAlpha = alpha * 0.45 * (1 - k);
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
  tone(ctx, r);
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

export const BODIES = [
  { draw: purple, x: 0.8, r: 0.13 },
  { draw: moons, x: 0.2, r: 0.045 },
  { draw: pancake, x: 0.78, r: 0.12 },
  { draw: green, x: 0.22, r: 0.1 },
  { draw: speakers, x: 0.8, r: 0.11 },
  { draw: rock, x: 0.24, r: 0.05 },
  { draw: cheese, x: 0.78, r: 0.1 },
  { draw: toaster, x: 0.22, r: 0.1 }
];

const SANS = "Arial, Helvetica, sans-serif", SERIF = "Georgia, 'Times New Roman', serif";

const CANS = {
  "86": { edge: "#031722", mid: "#1f4458", lid: "#d8c48a", decor: eightSix },
  maxi: { edge: "#012b17", mid: "#0c7d52", lid: "#d3d7de", decor: maximator }
};

export const CAN_KINDS = Object.keys(CANS);

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

export function drawCan(ctx, kind, s) {
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
