import { dots, drip, line, oval, own, rr, TAU, wavy } from "./kit.js";

const DOG_RIM = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * TAU, c = Math.cos(a), sn = Math.sin(a);
  const f = 1 + 0.035 * Math.sin(a * 9 + 1.3) + 0.02 * Math.sin(a * 17 + 0.5);
  return [Math.sign(c) * Math.abs(c) ** 0.65 * 12.4 * f, 2.6 + Math.sign(sn) * Math.abs(sn) ** 0.65 * 12.6 * f];
});
const DOG_BACK = DOG_RIM.map(([x, y]) => [x + 0.4, y + 0.9]), DOG_FRONT = DOG_RIM;
const CHOCO_SWIRL = Array.from({ length: 41 }, (_, i) => [Math.cos(i * 0.4) * (1 + i * 0.22), 2 + Math.sin(i * 0.4) * (1 + i * 0.22) * 0.85]);
const HONEY_CELLS = [[-4, -2], [2, -2], [-1, 3.2]].map(([hx, hy]) => Array.from({ length: 7 }, (_, i) => [hx + Math.cos((i * Math.PI) / 3) * 3, hy + Math.sin((i * Math.PI) / 3) * 3]));
const KETCHUP_LINE = Array.from({ length: 61 }, (_, i) => {
  const s = i / 30 - 1, o = Math.sin(s * Math.PI * 3.5) * 5.5;
  return [s * 11 + o * 0.67, 2 + s * 10 - o * 0.74];
});
const PASTE = (dy) => Array.from({ length: 51 }, (_, i) => [-12 + i * 0.48, 1 + dy + Math.sin(i * 0.36) * 4]);
const PASTE_UNDER = PASTE(0.5), PASTE_BODY = PASTE(0), PASTE_RED = PASTE(-1.7), PASTE_BLUE = PASTE(1.7);

const TOPPINGS = {
  plain() {},
  butter(ctx, C) {
    ctx.fillStyle = "rgba(255, 200, 60, 0.45)";
    wavy(ctx, 0, 4, 10, 7, 0.12, 5);
    ctx.fill();
    ctx.translate(-1, 2);
    ctx.rotate(0.18);
    ctx.fillStyle = "#f2c94c";
    ctx.beginPath();
    rr(ctx, -7, -4.5, 14, 11, 3);
    ctx.fill();
    ctx.fillStyle = "#ffe27a";
    ctx.beginPath();
    rr(ctx, -7, -5.5, 14, 9.5, 3);
    ctx.fill();
    ctx.fillStyle = "#fff6c8";
    ctx.beginPath();
    rr(ctx, -5, -4, 6, 2, 1);
    ctx.fill();
  },
  jam(ctx) {
    ctx.fillStyle = "#b01d40";
    wavy(ctx, 0, 2, 12.5, 11, 0.1, 6);
    ctx.fill();
    drip(ctx, 9, 8, 7, 2.2);
    dots(ctx, "#6e0f27", [[-6, 5, 1.6], [4, 8, 1.3], [6, -3, 1.5], [-2, -6, 1.1], [-8, -2, 1]]);
    ctx.fillStyle = "#e0577a";
    oval(ctx, -4, -4, 4.5, 1.6, -0.4);
    ctx.fill();
    dots(ctx, "#ffd0dc", [[1, -7, 0.6], [-7, 1, 0.5]]);
  },
  choco(ctx) {
    ctx.fillStyle = "#5b331d";
    wavy(ctx, 0, 2, 12.5, 11.5, 0.07, 7);
    ctx.fill();
    ctx.strokeStyle = "#8a5636";
    ctx.lineWidth = 1.6;
    ctx.lineCap = "round";
    line(ctx, CHOCO_SWIRL);
    ctx.stroke();
    ctx.fillStyle = "#c98b5a";
    oval(ctx, -5, -5, 3.5, 1.2, -0.5);
    ctx.fill();
    ctx.fillStyle = "#a8642e";
    oval(ctx, 8, 9, 3, 2.4, 0.3);
    ctx.fill();
    ctx.strokeStyle = "#6b3a17";
    ctx.lineWidth = 0.8;
    line(ctx, [[6, 9.5], [10, 8.5]]);
    ctx.stroke();
  },
  honey(ctx, C) {
    ctx.fillStyle = "#f0a81c";
    wavy(ctx, 0, 1, 12.5, 10.5, 0.08, 5);
    ctx.fill();
    for (const [x, len] of [[-8, 9], [-1, 13], [7, 7]]) drip(ctx, x, 8, len, 1.9);
    ctx.strokeStyle = "#ffd36b";
    ctx.lineWidth = 0.8;
    for (const cell of HONEY_CELLS) {
      line(ctx, cell);
      ctx.stroke();
    }
    ctx.fillStyle = "#fff2c4";
    oval(ctx, -5, -6, 4, 1.3, -0.4);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
    oval(ctx, 7.6, -11.6, 2.2, 1.4, -0.6);
    ctx.fill();
    oval(ctx, 10.6, -11.6, 2.2, 1.4, 0.6);
    ctx.fill();
    ctx.fillStyle = "#ffcf33";
    oval(ctx, 9, -9, 3.2, 2.3);
    ctx.fill();
    ctx.fillStyle = C.void;
    ctx.fillRect(8.2, -11.1, 0.9, 4.2);
    ctx.fillRect(10, -10.8, 0.9, 3.6);
    dots(ctx, C.void, [[6.4, -9.3, 0.6]]);
  },
  ketchup(ctx) {
    const squiggle = () => line(ctx, KETCHUP_LINE);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#d8231b";
    ctx.lineWidth = 4.2;
    squiggle();
    ctx.stroke();
    ctx.translate(-0.7, -0.8);
    ctx.strokeStyle = "#ff8a7a";
    ctx.lineWidth = 1.1;
    squiggle();
    ctx.stroke();
    ctx.translate(0.7, 0.8);
    dots(ctx, "#d8231b", [[12.5, 13.5, 1.6], [-12, -10, 1.1]]);
  },
  toothpaste(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#b9cde2";
    ctx.lineWidth = 7.6;
    line(ctx, PASTE_UNDER);
    ctx.stroke();
    ctx.strokeStyle = "#f7fbff";
    ctx.lineWidth = 6.4;
    line(ctx, PASTE_BODY);
    ctx.stroke();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = "#e8303a";
    line(ctx, PASTE_RED);
    ctx.stroke();
    ctx.strokeStyle = "#2a8de0";
    line(ctx, PASTE_BLUE);
    ctx.stroke();
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = "#9fd3ff";
    for (const [x, y, r] of [[-9, -7, 1.6], [-5, -10, 1], [7, -8, 1.3], [10, 9, 1.8], [3, 11, 1]]) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      oval(ctx, x, y, r, r);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = "#ffffff";
    line(ctx, [[-1, -9], [-0.3, -7.3], [1.4, -6.6], [-0.3, -5.9], [-1, -4.2], [-1.7, -5.9], [-3.4, -6.6], [-1.7, -7.3]]);
    ctx.fill();
  },
  egg(ctx, C) {
    ctx.fillStyle = "#e6dfcb";
    wavy(ctx, 0.6, 2.8, 13, 11.5, 0.13, 5);
    ctx.fill();
    ctx.fillStyle = "#fffdf6";
    wavy(ctx, 0, 2, 12.5, 11, 0.13, 5);
    ctx.fill();
    dots(ctx, "#e8a10e", [[1.5, 1.6, 5.8]]);
    dots(ctx, "#ffbf24", [[1, 1, 5.3]]);
    ctx.fillStyle = "#fff1b0";
    oval(ctx, -0.8, -1, 2, 1.1, -0.5);
    ctx.fill();
    dots(ctx, C.void, [[-7, 6, 0.45], [-5, 8.5, 0.35], [6, 8, 0.4], [8.5, -4, 0.35], [-8, -3, 0.4]]);
  },
  sardine(ctx, C) {
    ctx.translate(0, 2);
    ctx.rotate(-0.55);
    ctx.fillStyle = "#5f7590";
    line(ctx, [[12, 0], [19, -5.5], [17.2, 0], [19, 5.5]]);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#dfe8ef";
    oval(ctx, 0, 0, 14, 5);
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = "#7f97b0";
    ctx.fillRect(-15, -6, 30, 4.8);
    ctx.fillStyle = "#c3d2df";
    ctx.fillRect(-12, -1.5, 22, 0.9);
    ctx.restore();
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 0.9;
    oval(ctx, 0, 0, 14, 5);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-6.5, 0, 3.6, -1, 1);
    ctx.stroke();
    line(ctx, [[-14, 1], [-11.5, 1.3]]);
    ctx.stroke();
    dots(ctx, "#ffffff", [[-10.3, -1.2, 1.7]]);
    dots(ctx, C.void, [[-10.6, -1.1, 0.85]]);
  },
  slime(ctx, C) {
    ctx.fillStyle = "#5ed13a";
    wavy(ctx, 0, 1, 12.5, 10.5, 0.18, 7);
    ctx.fill();
    for (const [x, len] of [[-6, 10], [5, 6]]) drip(ctx, x, 7, len, 2.3);
    ctx.strokeStyle = "#b8f59a";
    ctx.lineWidth = 0.8;
    for (const [x, y, r] of [[-7, -3, 2], [6, 5, 1.5], [3, -7, 1.1], [-2, 6, 1]]) {
      oval(ctx, x, y, r, r);
      ctx.stroke();
    }
    ctx.fillStyle = "#c9ff9e";
    oval(ctx, -4, -6.5, 3.5, 1.2, -0.4);
    ctx.fill();
    dots(ctx, "#ffffff", [[4, -1, 3.2]]);
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 0.7;
    oval(ctx, 4, -1, 3.2, 3.2);
    ctx.stroke();
    dots(ctx, C.void, [[4.9, -0.2, 1.5]]);
  },
  sauce(ctx) {
    ctx.fillStyle = "#d9d3c4";
    wavy(ctx, 0.6, 2.4, 12.8, 10.8, 0.14, 6);
    ctx.fill();
    ctx.fillStyle = "#f7f4ec";
    wavy(ctx, 0, 1.6, 12.4, 10.4, 0.14, 6);
    ctx.fill();
    for (const [x, len] of [[-7, 10], [2, 14], [8, 7]]) drip(ctx, x, 8, len, 2);
    ctx.fillStyle = "#ffffff";
    oval(ctx, -4.5, -4.5, 4.5, 1.5, -0.4);
    ctx.fill();
    dots(ctx, "#ffffff", [[5, -2, 1.2], [-1, 5, 0.9], [9, 3, 0.7]]);
    dots(ctx, "#f7f4ec", [[-11, -9, 1.3], [12, -10, 0.9]]);
  },
  dog(ctx, C) {
    ctx.fillStyle = "#4a2611";
    line(ctx, DOG_BACK);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#74421f";
    line(ctx, DOG_FRONT);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.lineCap = "round";
    for (const r of [17, 23, 29]) {
      ctx.strokeStyle = "#7f4925";
      ctx.lineWidth = 3.4;
      ctx.beginPath();
      ctx.arc(-17, 21, r, -1.75, 0.15);
      ctx.stroke();
      ctx.strokeStyle = "#a8703f";
      ctx.lineWidth = 0.7;
      ctx.beginPath();
      ctx.arc(-17, 21, r - 1.6, -1.7, 0.1);
      ctx.stroke();
      ctx.strokeStyle = "#552d14";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.arc(-17, 21, r + 1.8, -1.72, 0.12);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 236, 200, 0.55)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(-17, 21, 25.5, -1.3, -0.95);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(-17, 21, 19.5, -0.75, -0.45);
    ctx.stroke();
    ctx.fillStyle = "rgba(236, 178, 104, 0.45)";
    for (const [x, y, rx, ry, a] of [[-4, -5, 3, 1.4, -0.3], [7, 1, 2.4, 1.2, 0.5], [-1, 9, 2.6, 1.1, -0.1]]) {
      oval(ctx, x, y, rx, ry, a);
      ctx.fill();
    }
    for (const [x, y, r, dark] of [[-6, 3, 1.5, 1], [3, -3, 1.2, 0], [8, 8, 1.3, 1], [-8, -6, 1, 0], [1, 12, 1.1, 1], [9, -7, 0.9, 1], [-3, 7, 0.9, 0]]) {
      ctx.fillStyle = dark ? "#4a2410" : "#9a6238";
      wavy(ctx, x, y, r * 1.2, r * 0.9, 0.22, 3);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "#4a2611";
    wavy(ctx, 11.3, 13.3, 3, 2.1, 0.18, 5);
    ctx.fill();
    ctx.fillStyle = "#74421f";
    wavy(ctx, 11, 12.7, 3, 2.1, 0.18, 5);
    ctx.fill();
    ctx.fillStyle = "#a8703f";
    oval(ctx, 10.3, 12, 1.4, 0.6, -0.3);
    ctx.fill();
    ctx.strokeStyle = "#9bd35a";
    ctx.lineWidth = 1.1;
    ctx.lineCap = "round";
    for (const x of [-1.5, 4.5]) {
      line(ctx, Array.from({ length: 11 }, (_, i) => [x + Math.sin(i * 0.8) * 1.3, -8 - i * 0.65]));
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([0.9, 1]);
    ctx.beginPath();
    ctx.arc(-7.4, -7.4, 3.2, 0.4, 2.6);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(205, 232, 255, 0.85)";
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 0.35;
    for (const [x, a] of [[-10.2, 0.9], [-8.2, -0.9]]) {
      oval(ctx, x, -11.6, 1.9, 0.95, a);
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = C.void;
    oval(ctx, -9.2, -10.2, 0.95, 1.4);
    ctx.fill();
    dots(ctx, "#d8231b", [[-9.7, -11.3, 0.4], [-8.7, -11.3, 0.4]]);
  }
};

export function topping(ctx, kind, C) {
  ctx.save();
  (own(TOPPINGS, kind) || TOPPINGS.butter)(ctx, C);
  ctx.restore();
}
