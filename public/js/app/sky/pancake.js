import { SKY } from "../../shared/palette.js";
import { rr } from "../art/kit.js";
import { crater } from "./classic.js";
import { clipped, disc, INK, ink, onSphere, TAU, tone } from "./kit.js";
import { speaker } from "./music.js";

const CRATERS = [[-0.45, -0.5, 0.14], [-0.6, -0.05, 0.1], [0.55, -0.55, 0.12], [0.78, 0.2, 0.1], [-0.3, 0.78, 0.09], [0.15, -0.82, 0.08]];
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

export function pancake(ctx, r) {
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
