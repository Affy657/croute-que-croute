import { SKY } from "../../shared/palette.js";
import { disc, INK, ink, onSphere, TAU } from "./kit.js";

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

export function cheese(ctx, r) {
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
