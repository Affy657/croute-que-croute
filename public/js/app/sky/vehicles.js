import { PALETTE } from "../../shared/palette.js";
import { rr } from "../art/kit.js";
import { disc, INK, TAU } from "./kit.js";

/** @type {Art} */
export function roadster(ctx, s) {
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

/** @type {Move} */
export function saucer(ctx, s, clock) {
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
