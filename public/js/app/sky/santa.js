import { rr } from "../art/kit.js";
import { disc, GOLD, INK, TAU } from "./kit.js";

const SANTA = { red: "#d7263d", redDark: "#9c1528", fur: "#fff6e0", skin: "#f3c39b", gold: "#f2b13a", deer: "#9a6436", deerDark: "#6b4022", antler: "#e6c48a", sack: "#8a5a2e", gift: "#3fae4a" };
const SPARKS = [[0.5, -0.06, 0.035], [0.75, 0.05, 0.025], [1.0, -0.02, 0.03], [1.3, 0.07, 0.02], [1.6, -0.05, 0.022], [1.95, 0.03, 0.016], [2.3, -0.03, 0.013]];

export function stardust(ctx, len, s) {
  const base = ctx.globalAlpha;
  for (const [k, y, r] of SPARKS) {
    const x = -s * 0.55 - k * s * 0.6;
    if (-x > len + s * 0.55) break;
    ctx.globalAlpha = base * Math.max(0, 1 - k / 2.6) * 0.9;
    ctx.fillStyle = "rgb(" + GOLD + ")";
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4, d = i % 2 ? r * 0.35 : r;
      ctx.lineTo(x + Math.cos(a) * d * s, y * s + Math.sin(a) * d * s);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.globalAlpha = base;
}

function leg(ctx, s, x, y, a, line) {
  const fx = x + Math.sin(a) * s * 0.09, fy = y + Math.cos(a) * s * 0.09;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(fx, fy);
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.03 + line * 2;
  ctx.stroke();
  ctx.strokeStyle = SANTA.deerDark;
  ctx.lineWidth = s * 0.03;
  ctx.stroke();
}

function reindeer(ctx, s, x, y, clock, line) {
  const run = Math.sin(clock * 11 + x * 9);
  ctx.save();
  ctx.translate(x * s, (y + run * 0.012) * s);
  for (const [lx, phase] of [[-0.08, 1], [-0.05, -1], [0.07, -1], [0.1, 1]]) leg(ctx, s, lx * s, s * 0.03, phase * run * 0.7 + (lx < 0 ? 0.5 : -0.5), line);
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.fillStyle = SANTA.fur;
  disc(ctx, -s * 0.13, -s * 0.03, s * 0.025);
  ctx.fillStyle = SANTA.deer;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.13, s * 0.055, -0.05, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(s * 0.07, -s * 0.03);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.1, s * 0.15, -s * 0.13);
  ctx.lineTo(s * 0.19, -s * 0.1);
  ctx.quadraticCurveTo(s * 0.15, -s * 0.04, s * 0.12, s * 0.02);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = s * 0.022 + line * 2;
  ctx.beginPath();
  for (const [bx, by, ex, ey] of [[0.15, -0.16, 0.1, -0.27], [0.12, -0.22, 0.05, -0.25], [0.12, -0.22, 0.16, -0.29], [0.18, -0.16, 0.2, -0.27]]) {
    ctx.moveTo(bx * s, by * s);
    ctx.lineTo(ex * s, ey * s);
  }
  ctx.stroke();
  ctx.strokeStyle = SANTA.antler;
  ctx.lineWidth = s * 0.022;
  ctx.stroke();
  ctx.fillStyle = SANTA.deer;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.ellipse(s * 0.19, -s * 0.15, s * 0.055, s * 0.038, 0.35, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SANTA.deerDark;
  ctx.beginPath();
  ctx.ellipse(s * 0.13, -s * 0.18, s * 0.025, s * 0.012, -0.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = INK;
  disc(ctx, s * 0.24, -s * 0.13, s * 0.014);
  disc(ctx, s * 0.195, -s * 0.165, s * 0.01);
  ctx.fillStyle = SANTA.red;
  ctx.beginPath();
  ctx.ellipse(s * 0.11, -s * 0.05, s * 0.025, s * 0.05, 0.5, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SANTA.gold;
  disc(ctx, s * 0.135, -s * 0.02, s * 0.018);
  ctx.restore();
}

function sleigh(ctx, s, clock, line) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.fillStyle = SANTA.sack;
  ctx.beginPath();
  ctx.moveTo(-s * 0.44, -s * 0.12);
  ctx.quadraticCurveTo(-s * 0.5, -s * 0.3, -s * 0.38, -s * 0.36);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.33, -s * 0.24, -s * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SANTA.gift;
  ctx.beginPath();
  rr(ctx, -s * 0.43, -s * 0.45, s * 0.1, s * 0.1, s * 0.015);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = SANTA.red;
  ctx.lineWidth = s * 0.02;
  ctx.beginPath();
  ctx.moveTo(-s * 0.38, -s * 0.45);
  ctx.lineTo(-s * 0.38, -s * 0.35);
  ctx.stroke();
  const wave = Math.sin(clock * 6) * 0.25;
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.fillStyle = SANTA.red;
  ctx.beginPath();
  rr(ctx, -s * 0.25, -s * 0.33, s * 0.17, s * 0.24, s * 0.07);
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.translate(-s * 0.2, -s * 0.28);
  ctx.rotate(-2.3 + wave);
  ctx.beginPath();
  rr(ctx, -s * 0.025, 0, s * 0.05, s * 0.13, s * 0.025);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SANTA.fur;
  disc(ctx, 0, s * 0.14, s * 0.03);
  ctx.restore();
  ctx.fillStyle = SANTA.skin;
  ctx.beginPath();
  ctx.arc(-s * 0.15, -s * 0.4, s * 0.06, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SANTA.fur;
  ctx.beginPath();
  ctx.moveTo(-s * 0.21, -s * 0.4);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.28, -s * 0.13, -s * 0.27);
  ctx.quadraticCurveTo(-s * 0.08, -s * 0.31, -s * 0.09, -s * 0.39);
  ctx.quadraticCurveTo(-s * 0.15, -s * 0.36, -s * 0.21, -s * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  disc(ctx, -s * 0.12, -s * 0.42, s * 0.01);
  ctx.fillStyle = SANTA.red;
  ctx.beginPath();
  ctx.moveTo(-s * 0.21, -s * 0.44);
  ctx.quadraticCurveTo(-s * 0.18, -s * 0.56, -s * 0.3, -s * 0.55);
  ctx.quadraticCurveTo(-s * 0.13, -s * 0.6, -s * 0.09, -s * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = SANTA.fur;
  ctx.beginPath();
  rr(ctx, -s * 0.225, -s * 0.47, s * 0.145, s * 0.04, s * 0.02);
  ctx.fill();
  ctx.stroke();
  disc(ctx, -s * 0.31, -s * 0.55, s * 0.028);
  ctx.beginPath();
  ctx.arc(-s * 0.31, -s * 0.55, s * 0.028, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = SANTA.gold;
  ctx.lineWidth = line * 1.6;
  ctx.beginPath();
  ctx.moveTo(-s * 0.46, s * 0.12);
  ctx.lineTo(s * 0.1, s * 0.12);
  ctx.quadraticCurveTo(s * 0.2, s * 0.12, s * 0.2, s * 0.04);
  ctx.quadraticCurveTo(s * 0.2, -s * 0.01, s * 0.15, 0);
  for (const x of [-0.36, -0.06]) {
    ctx.moveTo(x * s, s * 0.12);
    ctx.lineTo(x * s, s * 0.05);
  }
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  const g = ctx.createLinearGradient(0, -s * 0.2, 0, s * 0.06);
  g.addColorStop(0, SANTA.red);
  g.addColorStop(1, SANTA.redDark);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-s * 0.48, -s * 0.2);
  ctx.quadraticCurveTo(-s * 0.46, s * 0.06, -s * 0.3, s * 0.06);
  ctx.lineTo(s * 0.02, s * 0.06);
  ctx.quadraticCurveTo(s * 0.12, s * 0.05, s * 0.12, -s * 0.06);
  ctx.quadraticCurveTo(s * 0.12, -s * 0.13, s * 0.05, -s * 0.12);
  ctx.lineTo(-s * 0.36, -s * 0.12);
  ctx.quadraticCurveTo(-s * 0.4, -s * 0.2, -s * 0.48, -s * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = SANTA.gold;
  ctx.lineWidth = line * 1.3;
  ctx.beginPath();
  ctx.moveTo(-s * 0.44, -s * 0.08);
  ctx.quadraticCurveTo(-s * 0.2, -s * 0.02, s * 0.08, -s * 0.06);
  ctx.stroke();
}

export function santa(ctx, s, clock) {
  const line = Math.max(1, s * 0.02);
  ctx.save();
  ctx.translate(-s * 0.15, Math.sin(clock * 3.5) * s * 0.03);
  ctx.rotate(Math.sin(clock * 2.2) * 0.05);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "#5a3a1e";
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(-s * 0.1, -s * 0.2);
  ctx.quadraticCurveTo(s * 0.2, -s * 0.12, s * 0.36, -s * 0.06);
  ctx.lineTo(s * 0.7, -s * 0.07);
  ctx.stroke();
  sleigh(ctx, s, clock, line);
  reindeer(ctx, s, 0.36, -0.02, clock, line);
  reindeer(ctx, s, 0.68, -0.04, clock, line);
  ctx.restore();
}
