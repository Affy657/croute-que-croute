import { dots, FUR, line, oval, toastPath } from "./kit.js";

function crumbClip(ctx, w, h) {
  ctx.save();
  ctx.translate(0, 2);
  ctx.scale(0.78, 0.78);
  toastPath(ctx, w, h);
  ctx.restore();
  ctx.save();
  ctx.clip();
}

const CRUMB_PORES = [
  [-10, -7, 1.3], [9, -9, 1.3], [-9, 10, 1.3], [10, 9, 1.3], [1, -12, 1.3], [-15, -16, 1.1],
  [14, -18, 1.3], [-17, 3, 1.3], [17, -1, 1.1], [-13, 17, 1.1], [3, 18, 1.3], [16, 14, 1.1]
];
const CRUMB_SHADE = "rgba(196, 122, 48, 0.3)";

export const BREADS = {
  toasted(ctx, w, h) {
    crumbClip(ctx, w, h);
    ctx.strokeStyle = "rgba(110, 50, 15, 0.42)";
    ctx.lineWidth = 3.4;
    ctx.lineCap = "round";
    for (const y of [-8, 2, 12]) {
      line(ctx, [[-20, y + 5], [20, y - 5]]);
      ctx.stroke();
    }
    ctx.restore();
  },
  burnt(ctx, w, h, C) {
    crumbClip(ctx, w, h);
    ctx.fillStyle = "rgba(22, 13, 10, 0.55)";
    for (const [x, y, rx, ry] of [[-8, -9, 6, 4], [8, 6, 7, 5], [-6, 11, 5, 3.5], [10, -10, 4, 3]]) {
      oval(ctx, x, y, rx, ry, 0.4);
      ctx.fill();
    }
    ctx.restore();
    dots(ctx, C.flame, [[-15, -14, 1], [14, 12, 1.1], [17, -3, 0.8]]);
  },
  brioche(ctx, w, h) {
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.ellipse(-10, -16, 7, 5, -0.3, Math.PI * 1.05, Math.PI * 1.6);
    ctx.stroke();
    dots(ctx, FUR, [[6, -22, 1], [11, -23, 0.9], [15, -20, 1], [-14, -21, 0.9], [-5, -22.5, 0.8]]);
  },
  crustless(ctx, w, h, C) {
    ctx.save();
    toastPath(ctx, w, h);
    ctx.clip();
    ctx.strokeStyle = CRUMB_SHADE;
    for (const width of [8, 4]) {
      ctx.lineWidth = width;
      ctx.stroke();
    }
    ctx.restore();
    toastPath(ctx, w, h);
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = C.void;
    ctx.stroke();
    ctx.globalAlpha = 0.45;
    dots(ctx, C.crust, CRUMB_PORES);
    ctx.globalAlpha = 1;
  }
};
