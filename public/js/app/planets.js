import { PALETTE, SKY } from "../shared/palette.js";
import { rr } from "./sprites.js";

const TAU = Math.PI * 2;

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

function pancake(ctx, r) {
  const P = SKY.pancake;
  ball(ctx, r, P.light, P.dark);
  dots(ctx, r, P.spot, [[0.4, 0.3, 0.15], [-0.45, 0.4, 0.11], [0.05, 0.62, 0.09], [-0.15, 0.15, 0.06]]);
  const w = r * 0.65, h = r * 0.15;
  let y = -r * 0.2;
  for (let i = 0; i < 4; i++, y -= h) {
    ctx.fillStyle = P.side;
    ctx.beginPath();
    ctx.ellipse(0, y, w, h * 0.75, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = P.cake;
    ctx.beginPath();
    ctx.ellipse(0, y - h * 0.3, w * 0.97, h * 0.5, 0, 0, TAU);
    ctx.fill();
  }
  const top = y + h * 0.7;
  ctx.fillStyle = P.glaze;
  ctx.beginPath();
  ctx.ellipse(0, top, w * 0.8, h * 0.4, 0, 0, TAU);
  ctx.fill();
  for (const [x, len] of [[-0.5, 1.6], [0.25, 2.3], [0.6, 1.2]]) {
    ctx.beginPath();
    rr(ctx, x * w - h * 0.2, top, h * 0.4, h * len, h * 0.2);
    ctx.fill();
  }
  const jw = r * 0.4, jh = r * 0.42, jy = top - jh;
  ctx.fillStyle = P.jar;
  ctx.beginPath();
  rr(ctx, -jw / 2, jy, jw, jh, jw * 0.25);
  ctx.fill();
  ctx.fillStyle = P.lid;
  ctx.beginPath();
  rr(ctx, -jw * 0.55, jy - jh * 0.22, jw * 1.1, jh * 0.26, jw * 0.1);
  ctx.fill();
  ctx.fillStyle = P.shine;
  ctx.beginPath();
  rr(ctx, -jw * 0.32, jy + jh * 0.2, jw * 0.14, jh * 0.55, jw * 0.07);
  ctx.fill();
}

function speaker(ctx, x, y, s, S) {
  ctx.fillStyle = S.box;
  disc(ctx, x, y, s);
  ctx.fillStyle = S.rim;
  disc(ctx, x, y, s * 0.72);
  ctx.fillStyle = S.box;
  disc(ctx, x, y, s * 0.5);
  ctx.fillStyle = S.rim;
  disc(ctx, x, y, s * 0.15);
}

function speakers(ctx, r, clock) {
  const S = SKY.speakers;
  ctx.save();
  ctx.strokeStyle = S.wave;
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.lineCap = "round";
  const alpha = ctx.globalAlpha;
  for (let i = 0; i < 3; i++) {
    ctx.globalAlpha = alpha * (0.3 + 0.15 * Math.sin(clock * 4 - i * 0.9));
    for (const side of [0, Math.PI]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (1.18 + i * 0.18), side - 0.5, side + 0.5);
      ctx.stroke();
    }
  }
  ctx.restore();
  ball(ctx, r, S.light, S.dark);
  clipped(ctx, r, () => {
    ctx.fillStyle = S.land;
    for (const [x, y, w, h, a] of [[-0.55, -0.35, 0.45, 0.28, 0.4], [0.5, 0.45, 0.5, 0.25, -0.3], [0.2, -0.75, 0.35, 0.18, 0]]) {
      ctx.beginPath();
      ctx.ellipse(x * r, y * r, w * r, h * r, a, 0, TAU);
      ctx.fill();
    }
  });
  for (const [x, y, s] of [[0.15, 0.05, 0.3], [-0.45, 0.5, 0.18], [0.55, -0.3, 0.16]]) speaker(ctx, x * r, y * r, s * r, S);
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
