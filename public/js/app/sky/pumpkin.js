import { SKY } from "../../shared/palette.js";
import { INK, ink, TAU, toastie } from "./kit.js";

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

export function pumpkin(ctx, r, clock) {
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
