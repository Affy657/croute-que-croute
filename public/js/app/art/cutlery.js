import { PALETTE, SPREADS } from "../../shared/palette.js";
import { own, rr } from "./kit.js";

/** @type {ShotDraw} */
function knife(ctx, o, C) {
  const L = o.len, hx = -L / 2, bx = hx + 22;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.void;
  ctx.fillStyle = C.handle;
  ctx.beginPath();
  rr(ctx, hx, -4.5, 23, 9, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.moveTo(bx, -5);
  ctx.lineTo(L / 2 - 9, -5);
  ctx.quadraticCurveTo(L / 2 + 2, -4, L / 2, 1.5);
  ctx.quadraticCurveTo(L / 2 - 16, 6, bx, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  spreadOn(ctx, L / 2 - 15, 1.5, o.spread);
  ctx.fillStyle = C["steel-dark"];
  for (const rx of [hx + 7, hx + 15]) {
    ctx.beginPath();
    ctx.arc(rx, 0, 1.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @type {Record<string, (ctx: Ctx, x: number, y: number) => void>} */
const SMEARS = {
  toothpaste(ctx, x, y) {
    ctx.fillStyle = "#e8303a";
    ctx.fillRect(x - 6, y - 1.6, 12, 0.9);
    ctx.fillStyle = "#2a8de0";
    ctx.fillRect(x - 6, y + 0.7, 12, 0.9);
  },
  egg(ctx, x, y) {
    ctx.fillStyle = "#ffb81c";
    ctx.beginPath();
    ctx.arc(x + 1, y, 1.8, 0, Math.PI * 2);
    ctx.fill();
  },
  sardine(ctx, x, y) {
    ctx.fillStyle = "#5f7590";
    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x + 10, y - 2.6);
    ctx.lineTo(x + 10, y + 2.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.void;
    ctx.beginPath();
    ctx.arc(x - 4.5, y - 0.6, 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
};

/** @param {Ctx} ctx @param {number} x @param {number} y @param {string | null} kind */
function spreadOn(ctx, x, y, kind) {
  const spread = SPREADS[kind || "butter"];
  ctx.fillStyle = spread.color;
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 2.6, 0.05, 0, Math.PI * 2);
  ctx.fill();
  if (!kind) return;
  if (own(SMEARS, kind)) {
    SMEARS[kind](ctx, x, y);
    return;
  }
  ctx.fillStyle = spread.shine;
  ctx.beginPath();
  ctx.ellipse(x - 2, y - 0.8, 3, 0.9, 0.05, 0, Math.PI * 2);
  ctx.fill();
  if (spread.bits) {
    for (const [dx, dy] of [[-4, 1], [1.5, 1.2], [4.5, 0.2]]) {
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (spread.drip) {
    ctx.fillStyle = spread.color;
    ctx.beginPath();
    ctx.ellipse(x + 2, y + 4, 1.5, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** @type {ShotDraw} */
function fork(ctx, o, C) {
  const L = o.len, hx = -L / 2, nx = hx + 30, tx = L / 2 - 20;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [width, color, end] of /** @type {[number, string, number][]} */ ([[4, C.void, L / 2], [2, C.steel, L / 2 - 1]])) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    for (let i = 0; i < 4; i++) {
      const y = -6 + i * 4;
      ctx.beginPath();
      ctx.moveTo(tx, y);
      ctx.lineTo(end, y);
      ctx.stroke();
    }
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.void;
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.moveTo(nx, -3);
  ctx.lineTo(tx, -7.5);
  ctx.lineTo(tx, 7.5);
  ctx.lineTo(nx, 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  rr(ctx, hx, -3.5, 31, 7, 3.5);
  ctx.fill();
  ctx.stroke();
}

/** @type {ShotDraw} */
function rolling(ctx, o, C) {
  const L = o.len, r = o.rad, body = L - 26;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.void;
  ctx.fillStyle = C["wood-dark"];
  for (const hx of [-L / 2, L / 2 - 14]) {
    ctx.beginPath();
    rr(ctx, hx, -4, 14, 8, 4);
    ctx.fill();
    ctx.stroke();
  }
  ctx.fillStyle = C.wood;
  ctx.beginPath();
  rr(ctx, -body / 2, -r, body, 2 * r, 6);
  ctx.fill();
  ctx.stroke();
  const roll = (((o.x + o.y) * 0.3) % 7 + 7) % 7;
  ctx.strokeStyle = C["wood-dark"];
  ctx.lineWidth = 1.2;
  for (let y = -r + roll; y < r - 1; y += 7) {
    ctx.beginPath();
    ctx.moveTo(-body / 2 + 5, y);
    ctx.lineTo(body / 2 - 5, y);
    ctx.stroke();
  }
}

/** @type {ShotDraw} */
function whisk(ctx, o, C) {
  const L = o.len, hx = -L / 2, head = L - 26, cx = hx + 26 + head / 2;
  ctx.lineJoin = "round";
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 2;
  ctx.fillStyle = C.handle;
  ctx.beginPath();
  rr(ctx, hx, -4, 22, 8, 4);
  ctx.fill();
  ctx.stroke();
  for (const [width, color] of /** @type {[number, string][]} */ ([[3.4, C.void], [1.6, C.steel]])) {
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, 0, head / 2, 2 + i * 2.3, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.fillStyle = C.steel;
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 2;
  ctx.beginPath();
  rr(ctx, hx + 20, -3.5, 7, 7, 2);
  ctx.fill();
  ctx.stroke();
}

/** @type {ShotDraw} */
function cleaver(ctx, o, C) {
  const L = o.len, hx = -L / 2, bx = hx + 18;
  ctx.lineJoin = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.void;
  ctx.fillStyle = C.handle;
  ctx.beginPath();
  rr(ctx, hx, -3.5, 21, 7, 3.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  rr(ctx, bx, -12, L / 2 - bx, 24, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#f4f6fb";
  ctx.fillRect(L / 2 - 5, -10.5, 3.5, 21);
  ctx.fillStyle = C.void;
  ctx.beginPath();
  ctx.arc(bx + 7, -6, 2.6, 0, Math.PI * 2);
  ctx.fill();
}

/** @type {ShotDraw} */
function bread(ctx, o, C) {
  const L = o.len, hx = -L / 2, bx = hx + 24, tip = L / 2;
  ctx.lineJoin = "round";
  ctx.lineWidth = 2;
  ctx.strokeStyle = C.void;
  ctx.fillStyle = C.handle;
  ctx.beginPath();
  rr(ctx, hx, -4.5, 25, 9, 4);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = C.steel;
  ctx.beginPath();
  ctx.moveTo(bx, -4.5);
  ctx.lineTo(tip - 5, -4.5);
  ctx.quadraticCurveTo(tip + 1, -4, tip, 2);
  let x = tip - 3;
  ctx.lineTo(x, 4.5);
  while (x - 4 > bx) {
    ctx.lineTo(x - 2, 2.6);
    ctx.lineTo(x - 4, 4.5);
    x -= 4;
  }
  ctx.lineTo(bx, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** @type {Record<string, ShotDraw>} */
export const PROJECTILE_SPRITES = { knife, fork, rolling, whisk, cleaver, bread };
