import { PROJECTILES } from "../../game/projectiles.js";
import { PROJECTILE_SPRITES } from "./cutlery.js";
import { dots, rr } from "./kit.js";

/** @type {Toaster} */
function sideBoosters(ctx, t, C) {
  ctx.lineJoin = "round";
  for (const side of [-1, 1]) {
    const x = side * 25, fl = 6 + t.thrust * 9 + Math.random() * 4;
    const g = ctx.createLinearGradient(0, 18, 0, 18 + fl);
    g.addColorStop(0, C.mustard);
    g.addColorStop(1, C.flame);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x - 3.2, 18);
    ctx.lineTo(x + 3.2, 18);
    ctx.lineTo(x, 18 + fl);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = C["steel-dark"];
    ctx.beginPath();
    rr(ctx, side > 0 ? 18 : -22, 1, 4, 5, 1);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.steel;
    ctx.lineWidth = 1.7;
    ctx.beginPath();
    ctx.moveTo(x - 4.5, -2);
    ctx.quadraticCurveTo(x - 4.5, -10, x, -14);
    ctx.quadraticCurveTo(x + 4.5, -10, x + 4.5, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    rr(ctx, x - 4.5, -3, 9, 15, 2.5);
    ctx.fill();
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = "#e0a640";
    ctx.beginPath();
    rr(ctx, x - 3.6, 12, 7.2, 3, 1.2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#8a5a1e";
    ctx.beginPath();
    rr(ctx, x - 3, 15, 6, 2.8, 1.2);
    ctx.fill();
    ctx.stroke();
    dots(ctx, C["steel-dark"], [[x, 2, 0.9], [x, 6.5, 0.9]]);
  }
}

/** @type {[string, number][]} */
const SIDE_CUTLERY = [["fork", -1], ["knife", 1]];

/** @type {Toaster} */
function sideCutlery(ctx, t, C) {
  for (const [kind, side] of SIDE_CUTLERY) {
    ctx.save();
    ctx.translate(side * 25, -2);
    ctx.rotate(-Math.PI / 2 + side * 0.2);
    ctx.scale(0.5, 0.5);
    PROJECTILE_SPRITES[kind](ctx, /** @type {ShotArt} */ ({ len: PROJECTILES[kind].len }), C);
    ctx.restore();
  }
}

const SIX_SEVEN_HZ = 2.2, BAT_HZ = 2.6;

/** @type {Record<string, (ctx: Ctx) => void>} */
const DIGITS = {
  6(ctx) {
    ctx.moveTo(3, -13.2);
    ctx.quadraticCurveTo(-3.8, -11.4, -3.8, -4.2);
    ctx.arc(0, -4.2, 3.8, Math.PI, Math.PI * 3);
  },
  7(ctx) {
    ctx.moveTo(-3.8, -12.8);
    ctx.lineTo(4, -12.8);
    ctx.lineTo(-0.6, -0.6);
  }
};

/** @param {Ctx} ctx @param {number} n @param {number} x @param {Pal} C */
function digit(ctx, n, x, C) {
  ctx.save();
  ctx.translate(x, -1.2);
  ctx.beginPath();
  DIGITS[n](ctx);
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 6.4;
  ctx.stroke();
  ctx.strokeStyle = C.mustard;
  ctx.lineWidth = 3.4;
  ctx.stroke();
  ctx.restore();
}

/** @param {Ctx} ctx @param {number} side @param {Pal} C */
function palm(ctx, side, C) {
  ctx.scale(side, 1);
  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-8, 1);
  ctx.quadraticCurveTo(-8.4, -3.6, -6.4, -4.4);
  ctx.quadraticCurveTo(-4.2, -4.8, -4.4, -1.6);
  ctx.quadraticCurveTo(-4.2, 0.4, -2, 0.4);
  ctx.lineTo(4.6, 0.4);
  ctx.quadraticCurveTo(5.6, 0.2, 5.6, -1.6);
  ctx.quadraticCurveTo(5.4, -6.6, 8.8, -6.6);
  ctx.quadraticCurveTo(12, -6.4, 11.8, -2.2);
  ctx.quadraticCurveTo(11.6, 5.8, 2.4, 5.8);
  ctx.quadraticCurveTo(-4, 5.8, -8, 4.6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(192, 113, 47, 0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(7.4, -6.2);
  ctx.lineTo(7.7, -3.6);
  ctx.moveTo(9.2, -6.2);
  ctx.lineTo(9.5, -3.6);
  ctx.moveTo(-7, 2.6);
  ctx.quadraticCurveTo(-5.6, 1.4, -4.6, 1.6);
  ctx.stroke();
  ctx.scale(side, 1);
}

/** @type {Toaster} */
function sideSixSeven(ctx, t, C) {
  const k = Math.sin((performance.now() / 1000) * Math.PI * 2 * SIX_SEVEN_HZ);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const side of [-1, 1]) {
    const x = side * 31, y = 5 - side * k * 6;
    const wx = x - side * 7.6, wy = y + 3;
    ctx.beginPath();
    ctx.moveTo(side * 17, 7);
    ctx.quadraticCurveTo(side * 21, Math.max(wy, 7) + 7, wx, wy);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 5.4;
    ctx.stroke();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-k * 0.16);
    palm(ctx, side, C);
    digit(ctx, side < 0 ? 6 : 7, side * 0.6, C);
    ctx.restore();
  }
}

/** @type {Toaster} */
function sideBat(ctx, t, C) {
  const k = Math.sin((performance.now() / 1000) * Math.PI * 2 * BAT_HZ);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    ctx.save();
    ctx.translate(side * 12, -3);
    ctx.scale(side, 1);
    ctx.rotate(k * 0.28);
    const g = ctx.createLinearGradient(0, 0, 36, 0);
    g.addColorStop(0, "#2e1846");
    g.addColorStop(1, "#5c3486");
    ctx.beginPath();
    ctx.moveTo(0, -1);
    ctx.quadraticCurveTo(6, -14, 14, -15);
    ctx.quadraticCurveTo(26, -16, 36, -7);
    ctx.quadraticCurveTo(28, -1, 31, 8);
    ctx.quadraticCurveTo(23, 4, 21, 15);
    ctx.quadraticCurveTo(13, 7, 3, 12);
    ctx.closePath();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.8;
    ctx.stroke();
    ctx.strokeStyle = "#9b78c8";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    for (const [x, y] of [[36, -7], [31, 8], [21, 15]]) {
      ctx.moveTo(14, -15);
      ctx.lineTo(x, y);
    }
    ctx.moveTo(2, -2);
    ctx.quadraticCurveTo(6, -13, 14, -15);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(14, -15);
    ctx.quadraticCurveTo(13, -19, 10, -19);
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.restore();
  }
}

/** @type {Record<string, Toaster>} */
export const SIDES = { boosters: sideBoosters, cutlery: sideCutlery, sixseven: sideSixSeven, bat: sideBat };
