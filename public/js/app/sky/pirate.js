import { SKY } from "../../shared/palette.js";
import { rr } from "../art/kit.js";
import { ball, clipped, disc, dots, INK, ink, TAU, tone } from "./kit.js";

const SWELL = [[-0.62, 0.3, 0.5], [0.66, 0.3, -0.4]];
const RING = { rx: 1.45, ry: 0.4, tilt: -0.2, w: 0.2, lap: 0.42 };
const SHIP_U = 0.4;
const SHORE = [[0.02, 0.06, 0.5], [-0.32, 0.18, 0.3], [0.36, 0.2, 0.3], [0.05, -0.24, 0.42], [-0.3, -0.17, 0.28], [0.34, -0.14, 0.3]];

function swell(ctx, r, clock, P) {
  ctx.strokeStyle = P.foam;
  ctx.lineWidth = ink(r);
  ctx.lineCap = "round";
  ctx.globalAlpha *= 0.6;
  for (const [y, gap, speed] of SWELL) {
    const shift = (((clock * speed) % gap) + gap) % gap;
    ctx.beginPath();
    for (let x = -1.2 + shift; x < 1.2; x += gap) {
      ctx.moveTo((x - 0.08) * r, y * r);
      ctx.quadraticCurveTo(x * r, (y - 0.07) * r, (x + 0.08) * r, y * r);
    }
    ctx.stroke();
  }
  ctx.globalAlpha /= 0.6;
}

function blob(ctx, r, parts) {
  ctx.beginPath();
  for (const [x, y, s] of parts) {
    ctx.moveTo((x + s) * r, y * r);
    ctx.arc(x * r, y * r, s * r, 0, TAU);
  }
}

function skullRock(ctx, r, P) {
  ctx.save();
  ctx.translate(0, -r * 0.18);
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  const g = ctx.createRadialGradient(-r * 0.1, -r * 0.18, r * 0.03, 0, 0, r * 0.36);
  g.addColorStop(0, P.rockLight);
  g.addColorStop(1, P.rock);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, r * 0.1);
  ctx.bezierCurveTo(-r * 0.36, -r * 0.18, -r * 0.2, -r * 0.36, 0, -r * 0.36);
  ctx.bezierCurveTo(r * 0.2, -r * 0.36, r * 0.36, -r * 0.18, r * 0.3, r * 0.1);
  ctx.lineTo(r * 0.18, r * 0.16);
  ctx.lineTo(r * 0.16, r * 0.27);
  ctx.lineTo(-r * 0.16, r * 0.27);
  ctx.lineTo(-r * 0.18, r * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.cave;
  for (const k of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(k * r * 0.12, -r * 0.06, r * 0.085, r * 0.1, k * 0.25, 0, TAU);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(0, r * 0.04);
  ctx.lineTo(-r * 0.04, r * 0.11);
  ctx.lineTo(r * 0.04, r * 0.11);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = P.cave;
  ctx.lineWidth = Math.max(1, r * 0.022);
  ctx.beginPath();
  for (const x of [-0.08, 0, 0.08]) {
    ctx.moveTo(x * r, r * 0.17);
    ctx.lineTo(x * r, r * 0.25);
  }
  ctx.moveTo(-r * 0.15, r * 0.2);
  ctx.lineTo(r * 0.15, r * 0.2);
  ctx.stroke();
  ctx.restore();
}

function palmTree(ctx, r, x, y, size, lean, clock, P) {
  const sway = Math.sin(clock * 1.3 + x * 5) * 0.06, top = [lean * r * 0.12 + sway * r, -r * 0.36];
  ctx.save();
  ctx.translate(x * r, y * r);
  ctx.scale(size, size);
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = (ink(r) * 2.4) / size;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(lean * r * 0.02, -r * 0.2, top[0], top[1]);
  ctx.stroke();
  ctx.strokeStyle = P.trunk;
  ctx.lineWidth = (ink(r) * 1.3) / size;
  ctx.stroke();
  ctx.translate(top[0], top[1]);
  ctx.fillStyle = P.palm;
  ctx.strokeStyle = INK;
  ctx.lineWidth = (ink(r) * 0.8) / size;
  for (const a of [-2.7, -2, -1.3, -0.6, 0.1]) {
    ctx.save();
    ctx.rotate(a + Math.PI / 2 + sway);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(r * 0.12, -r * 0.14, r * 0.29, -r * 0.01);
    ctx.quadraticCurveTo(r * 0.12, -r * 0.02, 0, 0);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

function skullIsland(ctx, r, clock, P) {
  ctx.fillStyle = P.shallow;
  ctx.globalAlpha *= 0.7;
  blob(ctx, r, SHORE.map(([x, y, s]) => [x, y, s + 0.08]));
  ctx.fill();
  ctx.globalAlpha /= 0.7;
  ctx.strokeStyle = INK;
  ctx.lineWidth = ink(r);
  ctx.fillStyle = P.sand;
  blob(ctx, r, SHORE);
  ctx.fill();
  ctx.fillStyle = P.jungle;
  blob(ctx, r, SHORE.map(([x, y, s]) => [x, y - 0.03, s - 0.08]));
  ctx.fill();
  dots(ctx, r, P.jungleDark, [[-0.36, 0.1, 0.1], [0.4, 0.14, 0.11], [-0.2, 0.3, 0.08], [0.22, 0.32, 0.09], [0.42, -0.18, 0.08], [-0.4, -0.2, 0.08]]);
  skullRock(ctx, r, P);
  palmTree(ctx, r, -0.5, 0.26, 0.85, -1, clock, P);
  palmTree(ctx, r, 0.54, 0.28, 0.95, 1, clock, P);
  ctx.strokeStyle = P.mark;
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.lineCap = "round";
  ctx.beginPath();
  for (const k of [-1, 1]) {
    ctx.moveTo(r * 0.3 - r * 0.045, r * 0.12 - k * r * 0.035);
    ctx.lineTo(r * 0.3 + r * 0.045, r * 0.12 + k * r * 0.035);
  }
  ctx.stroke();
}

function ringHalf(ctx, r, clock, P, front) {
  const { rx, ry, tilt, w } = RING, from = front ? 0 : Math.PI, to = front ? Math.PI : TAU;
  ctx.save();
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.ellipse(0, 0, rx * r, ry * r, tilt, from, to);
  ctx.strokeStyle = INK;
  ctx.lineWidth = w * r + ink(r) * 2;
  ctx.stroke();
  ctx.strokeStyle = front ? P.ring : P.ringBack;
  ctx.lineWidth = w * r;
  ctx.stroke();
  ctx.strokeStyle = P.ringLight;
  ctx.lineWidth = w * r * 0.3;
  ctx.globalAlpha *= 0.55;
  ctx.stroke();
  ctx.globalAlpha /= 0.55;
  ctx.setLineDash([r * 0.1, r * 0.22]);
  ctx.lineDashOffset = -clock * r * 0.25;
  ctx.strokeStyle = P.foam;
  ctx.lineWidth = Math.max(1, r * 0.035);
  ctx.lineCap = "round";
  for (const k of [-0.28, 0.28]) {
    ctx.beginPath();
    ctx.ellipse(0, 0, (rx + k * w) * r, (ry + k * w * 0.4) * r, tilt, from, to);
    ctx.stroke();
  }
  ctx.restore();
}

function mainSail(ctx, u, x, top, bottom, half, puff, P) {
  ctx.beginPath();
  ctx.moveTo(x - half, top);
  ctx.quadraticCurveTo(x, top + u * 0.06, x + half, top);
  ctx.quadraticCurveTo(x + half + puff, (top + bottom) / 2, x + half, bottom);
  ctx.quadraticCurveTo(x, bottom + u * 0.08, x - half, bottom);
  ctx.quadraticCurveTo(x - half + puff, (top + bottom) / 2, x - half, top);
  ctx.closePath();
  ctx.fillStyle = P.sail;
  ctx.fill();
  ctx.stroke();
}

function jolly(ctx, u, x, y, P) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.lineWidth = u * 0.07;
  ctx.beginPath();
  for (const k of [-1, 1]) {
    ctx.moveTo(-u * 0.24, -k * u * 0.1 + u * 0.16);
    ctx.lineTo(u * 0.24, k * u * 0.1 + u * 0.16);
  }
  ctx.stroke();
  ctx.fillStyle = INK;
  disc(ctx, 0, -u * 0.04, u * 0.16);
  ctx.beginPath();
  rr(ctx, -u * 0.09, u * 0.04, u * 0.18, u * 0.1, u * 0.03);
  ctx.fill();
  ctx.fillStyle = P.sail;
  disc(ctx, -u * 0.065, -u * 0.05, u * 0.045);
  disc(ctx, u * 0.065, -u * 0.05, u * 0.045);
  ctx.restore();
}

function galleon(ctx, u, clock, P, line) {
  const puff = Math.sin(clock * 1.1) * u * 0.05, flap = Math.sin(clock * 7) * u * 0.05;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(u * 0.95, -u * 0.46);
  ctx.lineTo(u * 1.45, -u * 0.72);
  ctx.stroke();
  ctx.fillStyle = P.hullDark;
  for (const [x, top] of [[0.02, -1.78], [0.62, -1.36]]) {
    ctx.beginPath();
    rr(ctx, x * u - u * 0.045, top * u, u * 0.09, (-0.3 - top) * u, u * 0.03);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = P.flag;
  ctx.beginPath();
  ctx.moveTo(u * 0.06, -u * 1.76);
  ctx.quadraticCurveTo(u * 0.22, -u * 1.76 + flap, u * 0.4, -u * 1.68 + flap);
  ctx.lineTo(u * 0.06, -u * 1.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = P.sail;
  ctx.beginPath();
  ctx.moveTo(u * 0.66, -u * 1.3);
  ctx.lineTo(u * 1.4, -u * 0.74);
  ctx.lineTo(u * 0.68, -u * 0.66);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  mainSail(ctx, u, u * 0.02, -u * 1.56, -u * 0.62, u * 0.46, puff, P);
  jolly(ctx, u, u * 0.02 + puff * 0.5, -u * 1.12, P);
  ctx.fillStyle = P.hullDark;
  ctx.beginPath();
  rr(ctx, -u * 0.1, -u * 1.62, u * 0.24, u * 0.1, u * 0.03);
  ctx.fill();
  ctx.stroke();
  const g = ctx.createLinearGradient(0, -u * 0.5, 0, u * 0.2);
  g.addColorStop(0, P.hull);
  g.addColorStop(1, P.hullDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-u * 1.02, -u * 0.78);
  ctx.lineTo(-u * 0.58, -u * 0.78);
  ctx.lineTo(-u * 0.55, -u * 0.42);
  ctx.lineTo(u * 0.7, -u * 0.32);
  ctx.lineTo(u * 1.05, -u * 0.52);
  ctx.quadraticCurveTo(u * 0.85, u * 0.2, 0, u * 0.18);
  ctx.quadraticCurveTo(-u * 0.78, u * 0.16, -u * 0.98, -u * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = P.trim;
  ctx.lineWidth = line * 1.3;
  ctx.beginPath();
  ctx.moveTo(-u * 0.96, -u * 0.3);
  ctx.quadraticCurveTo(0, -u * 0.12, u * 0.9, -u * 0.3);
  ctx.stroke();
  ctx.fillStyle = P.window;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  rr(ctx, -u * 0.92, -u * 0.7, u * 0.26, u * 0.16, u * 0.04);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  for (const x of [-0.42, -0.08, 0.26, 0.58]) disc(ctx, x * u, -u * 0.02 + Math.abs(x) * u * 0.04, u * 0.06);
}

function smoke(ctx, u, clock, P) {
  const k = (clock % 4.2) / 1.1;
  if (k >= 1) return;
  ctx.save();
  ctx.fillStyle = P.smoke;
  ctx.globalAlpha *= 1 - k;
  for (const [x, y, s] of [[0, 0, 0.16], [0.14, -0.1, 0.12], [-0.12, -0.08, 0.11]]) disc(ctx, (0.3 + x + k * 0.2) * u, (0.05 + y + k * 0.35) * u, (s + k * 0.12) * u);
  ctx.restore();
  if (k < 0.15) {
    ctx.fillStyle = P.flash;
    disc(ctx, u * 0.3, u * 0.05, u * 0.09);
  }
}

function shipOnRing(ctx, r, clock, P) {
  const { rx, ry, tilt, lap } = RING, t = clock * lap, depth = (Math.sin(t) + 1) / 2;
  const c = Math.cos(tilt), s = Math.sin(tilt), ex = rx * Math.cos(t) * r, ey = ry * Math.sin(t) * r;
  const u = r * SHIP_U * (0.72 + 0.3 * depth), dir = Math.sin(t) > 0 ? -1 : 1;
  ctx.save();
  ctx.translate(ex * c - ey * s, ex * s + ey * c);
  ctx.rotate(tilt + Math.sin(clock * 1.7) * 0.05);
  ctx.scale(dir, 1);
  ctx.globalAlpha *= 0.75 + 0.25 * depth;
  galleon(ctx, u, clock, P, Math.max(1, ink(r) * (0.7 + 0.3 * depth)));
  if (depth > 0.5) smoke(ctx, u, clock, P);
  ctx.restore();
}

export function pirate(ctx, r, clock) {
  const P = SKY.pirate, front = Math.sin(clock * RING.lap) > 0;
  ringHalf(ctx, r, clock, P, false);
  if (!front) shipOnRing(ctx, r, clock, P);
  ball(ctx, r, P.light, P.dark);
  clipped(ctx, r, () => {
    swell(ctx, r, clock, P);
    skullIsland(ctx, r, clock, P);
  });
  tone(ctx, r);
  ringHalf(ctx, r, clock, P, true);
  if (front) shipOnRing(ctx, r, clock, P);
}
