import { dots, FUR, line, oval, own, rr, TAU } from "./kit.js";

/** @type {Record<string, Tint>} */
const HATS = {
  ninja(ctx, C) {
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.6;
    ctx.fillStyle = "#d8283c";
    ctx.beginPath();
    ctx.moveTo(19, -12);
    ctx.quadraticCurveTo(27, -16, 34, -11);
    ctx.quadraticCurveTo(30, -9.5, 28, -6.5);
    ctx.quadraticCurveTo(25, -10, 19, -9);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(19, -10);
    ctx.quadraticCurveTo(27, -6, 30, 2);
    ctx.quadraticCurveTo(26, 0.5, 23.5, 2.5);
    ctx.quadraticCurveTo(23, -3, 18, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-22, -14.5);
    ctx.quadraticCurveTo(0, -20.5, 22, -14.5);
    ctx.lineTo(22, -7.5);
    ctx.quadraticCurveTo(0, -13.5, -22, -7.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#9e1426";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-21, -11.2);
    ctx.quadraticCurveTo(0, -17.2, 21, -11.2);
    ctx.stroke();
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.5;
    ctx.fillStyle = "#d8283c";
    ctx.beginPath();
    rr(ctx, 17.5, -14.5, 6.5, 7.5, 2.2);
    ctx.fill();
    ctx.stroke();
  },
  crown(ctx, C) {
    ctx.translate(0, -21);
    ctx.rotate(-0.06);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.7;
    ctx.fillStyle = C.mustard;
    ctx.beginPath();
    ctx.moveTo(-13, 2);
    ctx.lineTo(-15.5, -12);
    ctx.lineTo(-7.5, -5);
    ctx.lineTo(0, -16);
    ctx.lineTo(7.5, -5);
    ctx.lineTo(15.5, -12);
    ctx.lineTo(13, 2);
    ctx.quadraticCurveTo(0, 0, -13, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e0a640";
    ctx.beginPath();
    ctx.moveTo(-13.5, -1.5);
    ctx.quadraticCurveTo(0, -3.5, 13.5, -1.5);
    ctx.lineTo(13, 2);
    ctx.quadraticCurveTo(0, 0, -13, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.mustard;
    for (const [x, y] of [[-15.5, -12], [0, -16], [15.5, -12]]) {
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, TAU);
      ctx.fill();
      ctx.stroke();
    }
    dots(ctx, C.jam, [[0, -6.5, 2]]);
    dots(ctx, "#3fa7d6", [[-8, -0.4, 1.3], [8, -0.4, 1.3]]);
  },
  chef(ctx, C) {
    ctx.translate(0, -20);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.7;
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.moveTo(-10, -4);
    ctx.bezierCurveTo(-20, -6, -18, -20, -9, -18);
    ctx.bezierCurveTo(-8, -28, 8, -28, 9, -18);
    ctx.bezierCurveTo(18, -20, 20, -6, 10, -4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    rr(ctx, -11.5, -6, 23, 8, 2);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#d3c8b8";
    ctx.lineWidth = 1.2;
    ctx.lineCap = "round";
    for (const pts of [[[-4, -4.5], [-4, 0.5]], [[4, -4.5], [4, 0.5]], [[-4, -9], [-3, -16]], [[4, -9], [3, -16]]]) {
      line(ctx, pts);
      ctx.stroke();
    }
  },
  astronaut(ctx, C) {
    ctx.fillStyle = "rgba(190, 225, 255, 0.16)";
    oval(ctx, 0, -3, 27, 29);
    ctx.fill();
    ctx.lineWidth = 3.8;
    ctx.strokeStyle = C.void;
    ctx.stroke();
    ctx.lineWidth = 1.9;
    ctx.strokeStyle = C.steel;
    ctx.stroke();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(0, -3, 22, 24, 0, Math.PI * 1.12, Math.PI * 1.36);
    ctx.stroke();
    dots(ctx, "rgba(255, 255, 255, 0.75)", [[-6, -24, 1.3]]);
    ctx.fillStyle = C.steel;
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    rr(ctx, -17, 21, 34, 5, 2.5);
    ctx.fill();
    ctx.stroke();
  },
  halo(ctx, C) {
    oval(ctx, 0, -33, 11, 3.6);
    ctx.lineWidth = 4.8;
    ctx.strokeStyle = C.void;
    ctx.stroke();
    ctx.lineWidth = 2.6;
    ctx.strokeStyle = "#ffe27a";
    ctx.stroke();
  },
  nightcap(ctx, C) {
    ctx.translate(0, -20);
    ctx.rotate(-0.08);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.8;
    ctx.fillStyle = "#5b7fd6";
    ctx.beginPath();
    ctx.moveTo(-15, -1);
    ctx.bezierCurveTo(-14, -17, 4, -23, 14, -17);
    ctx.quadraticCurveTo(24, -10, 27, 11);
    ctx.quadraticCurveTo(20, -3, 12, -8);
    ctx.quadraticCurveTo(14, -4, 15, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    dots(ctx, C.mustard, [[-8, -9, 1.1], [0, -15, 1], [6, -8, 0.9], [15, -12, 0.9], [21, -3, 0.8]]);
    ctx.fillStyle = FUR;
    ctx.beginPath();
    rr(ctx, -16.5, -4.5, 33, 7, 3.4);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(27, 12, 3.8, 0, TAU);
    ctx.fill();
    ctx.stroke();
  },
  dog(ctx, C) {
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.7;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.fillStyle = "#6e4426";
      ctx.beginPath();
      ctx.moveTo(7, -21);
      ctx.bezierCurveTo(15, -26, 26, -22, 27, -12);
      ctx.bezierCurveTo(28, -4, 27, 4, 22, 5);
      ctx.bezierCurveTo(17, 6, 17, -2, 15, -8);
      ctx.quadraticCurveTo(12, -15, 7, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#9a6440";
      ctx.beginPath();
      ctx.moveTo(14, -19);
      ctx.bezierCurveTo(20, -21, 23, -15, 23.5, -9);
      ctx.bezierCurveTo(24, -3, 23, 1, 21, 1);
      ctx.bezierCurveTo(19, 1, 19, -5, 17.5, -10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },
  bunny(ctx, C) {
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.7;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * 8, -16);
      ctx.rotate(side * 0.2);
      ctx.fillStyle = FUR;
      ctx.beginPath();
      ctx.moveTo(-4.6, 0);
      ctx.bezierCurveTo(-7.5, -12, -5.5, -28, 0, -28.5);
      ctx.bezierCurveTo(5.5, -28, 7.5, -12, 4.6, 0);
      ctx.quadraticCurveTo(0, 3, -4.6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f4a3c0";
      ctx.beginPath();
      ctx.moveTo(-2.1, -3);
      ctx.bezierCurveTo(-3.8, -12, -2.8, -23, 0, -24);
      ctx.bezierCurveTo(2.8, -23, 3.8, -12, 2.1, -3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  },
  antennae(ctx, C) {
    ctx.lineCap = "round";
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 8, -17);
      ctx.quadraticCurveTo(side * 9, -30, side * 14, -37);
      ctx.strokeStyle = C.void;
      ctx.lineWidth = 4.6;
      ctx.stroke();
      ctx.strokeStyle = "#7bd85a";
      ctx.lineWidth = 2.6;
      ctx.stroke();
    }
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.fillStyle = "#ffd84a";
      ctx.beginPath();
      ctx.arc(side * 14, -38, 4, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#fff6c8";
      ctx.beginPath();
      ctx.arc(side * 14 - 1.3, -39.3, 1.3, 0, TAU);
      ctx.fill();
    }
  },
  witch(ctx, C) {
    ctx.translate(0, -20);
    ctx.rotate(-0.14);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.8;
    oval(ctx, 0, 0, 18, 4.2);
    ctx.fillStyle = "#3a2163";
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-9, -1);
    ctx.quadraticCurveTo(-6, -14, -1, -22);
    ctx.quadraticCurveTo(3, -28, 11, -26);
    ctx.quadraticCurveTo(5, -23, 4, -16);
    ctx.quadraticCurveTo(6, -7, 9, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = C.flame;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-8.7, -2);
    ctx.lineTo(8.7, -2);
    ctx.lineTo(7.6, -6.2);
    ctx.lineTo(-7.7, -6.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C.mustard;
    ctx.lineWidth = 1.3;
    ctx.strokeRect(-2.1, -5.6, 4.2, 3.1);
    dots(ctx, C.mustard, [[-2.5, -12, 0.9], [1.5, -17, 0.7], [4, -10, 0.6]]);
  },
  santa(ctx, C) {
    ctx.translate(0, -21);
    ctx.rotate(0.08);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.8;
    ctx.fillStyle = "#d8283c";
    ctx.beginPath();
    ctx.moveTo(-14, -1);
    ctx.bezierCurveTo(-12, -17, 3, -25, 12, -20);
    ctx.quadraticCurveTo(17, -16, 18, -9);
    ctx.quadraticCurveTo(13, -13, 8, -12);
    ctx.quadraticCurveTo(12, -6, 14, -1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#9e1426";
    ctx.lineWidth = 1.2;
    line(ctx, [[-6, -4], [-3, -13], [4, -18]]);
    ctx.stroke();
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.6;
    ctx.fillStyle = FUR;
    ctx.beginPath();
    rr(ctx, -16, -4.5, 32, 7.5, 3.7);
    ctx.fill();
    ctx.stroke();
    dots(ctx, "#ded5c6", [[-11, -1, 1.1], [-4, 0, 1], [3, -1.5, 1.1], [10, 0, 1]]);
    ctx.beginPath();
    ctx.arc(18, -8, 4.2, 0, TAU);
    ctx.fillStyle = FUR;
    ctx.fill();
    ctx.stroke();
  },
  pirate(ctx, C) {
    ctx.translate(0, -19);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.8;
    ctx.fillStyle = "#1f1b2b";
    ctx.beginPath();
    ctx.moveTo(-21, 1);
    ctx.quadraticCurveTo(-18, -6, -13, -8);
    ctx.quadraticCurveTo(-9, -21, 0, -21);
    ctx.quadraticCurveTo(9, -21, 13, -8);
    ctx.quadraticCurveTo(18, -6, 21, 1);
    ctx.quadraticCurveTo(0, -6, -21, 1);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = C.mustard;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-19, -0.4);
    ctx.quadraticCurveTo(0, -6.8, 19, -0.4);
    ctx.stroke();
    ctx.strokeStyle = FUR;
    ctx.lineWidth = 1.8;
    ctx.lineCap = "round";
    line(ctx, [[-5, -7.5], [5, -16]]);
    ctx.stroke();
    line(ctx, [[5, -7.5], [-5, -16]]);
    ctx.stroke();
    ctx.fillStyle = FUR;
    ctx.beginPath();
    ctx.arc(0, -13, 3.7, 0, TAU);
    ctx.fill();
    ctx.beginPath();
    rr(ctx, -2.2, -11, 4.4, 2.8, 1);
    ctx.fill();
    dots(ctx, "#1f1b2b", [[-1.4, -13.4, 0.95], [1.4, -13.4, 0.95]]);
  }
};

/** @param {Ctx} ctx @param {string | null | undefined} kind @param {Pal} C */
export function hat(ctx, kind, C) {
  if (!own(HATS, kind)) return;
  ctx.save();
  HATS[/** @type {string} */ (kind)](ctx, C);
  ctx.restore();
}
