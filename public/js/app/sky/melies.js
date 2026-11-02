import { SKY } from "../../shared/palette.js";
import { rr } from "../art/kit.js";
import { ball, disc, dots, INK, ink, TAU, tone } from "./kit.js";

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

export function melies(ctx, r, clock) {
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
