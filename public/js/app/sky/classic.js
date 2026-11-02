import { PALETTE, SKY } from "../../shared/palette.js";
import { ball, clipped, disc, onSphere, outline, TAU } from "./kit.js";

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

export function purple(ctx, r) {
  const V = SKY.violet;
  ringed(ctx, r, PALETTE.planet, PALETTE["planet-shade"], PALETTE.mustard, -0.35, V.band, V.storm);
}

export function green(ctx, r) {
  const G = SKY.green;
  ringed(ctx, r, G.light, G.dark, G.ring, 0.3, G.band);
}

export function crater(ctx, s, light, P = SKY.pancake) {
  ctx.fillStyle = P.crater;
  disc(ctx, 0, 0, s);
  ctx.fillStyle = P.floor;
  disc(ctx, -Math.cos(light) * s * 0.25, -Math.sin(light) * s * 0.25, s * 0.75);
}

function pitted(ctx, r, C, pits) {
  ball(ctx, r, C.light, C.dark);
  clipped(ctx, r, () => {
    for (const [x, y, s] of pits) onSphere(ctx, r, x, y, (light) => crater(ctx, s * r, light, C));
  });
  outline(ctx, r);
}

export function moons(ctx, r) {
  for (const [x, y, s] of [[0, 0, 1], [2.4, 1.3, 0.6], [-1.3, 2.3, 0.45]]) {
    ctx.save();
    ctx.translate(x * r, y * r);
    pitted(ctx, s * r, SKY.moons, [[0.3, 0.25, 0.22], [-0.35, -0.1, 0.15], [0.05, -0.5, 0.12], [-0.5, 0.5, 0.08]]);
    ctx.restore();
  }
}

export function rock(ctx, r) {
  pitted(ctx, r, SKY.rock, [[0.3, 0.2, 0.25], [-0.35, 0.35, 0.18], [-0.1, -0.45, 0.14], [0.55, -0.4, 0.09], [-0.65, -0.15, 0.08], [0.1, 0.7, 0.07]]);
}
