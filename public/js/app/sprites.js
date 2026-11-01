import { PALETTE, SPREADS, GEAR } from "../shared/palette.js";
import { FW, FH, HIT_R, NEAR, clamp } from "../game/field.js";
import { PROJECTILES } from "../game/projectiles.js";

export function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
}

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

function spreadOn(ctx, x, y, kind) {
  const spread = SPREADS[kind || "butter"];
  ctx.fillStyle = spread.color;
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 2.6, 0.05, 0, Math.PI * 2);
  ctx.fill();
  if (!kind) return;
  if (SMEARS[kind]) {
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

function fork(ctx, o, C) {
  const L = o.len, hx = -L / 2, nx = hx + 30, tx = L / 2 - 20;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (const [width, color, end] of [[4, C.void, L / 2], [2, C.steel, L / 2 - 1]]) {
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
  for (const [width, color] of [[3.4, C.void], [1.6, C.steel]]) {
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

const PROJECTILE_SPRITES = { knife, fork, rolling, whisk, cleaver, bread };

const TRAIL_MIN = 380, TRAIL_K = 0.25, TRAIL_MAX = 90;

export function drawTrail(ctx, o, C = PALETTE) {
  const v = Math.hypot(o.vx, o.vy), len = Math.min(TRAIL_MAX, (v - TRAIL_MIN) * TRAIL_K);
  if (len < 4) return;
  const ux = o.vx / v, uy = o.vy / v;
  const across = PROJECTILES[o.kind].across;
  const back = o.spin ? 0 : across ? o.rad : o.len / 2 - 4;
  const lanes = across ? [-0.32 * o.len, 0, 0.32 * o.len] : o.spin ? [-0.8 * o.rad, 0.8 * o.rad] : [0];
  ctx.save();
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  const bx = o.x - ux * back, by = o.y - uy * back;
  const g = ctx.createLinearGradient(bx, by, bx - ux * len, by - uy * len);
  g.addColorStop(0, C.trail);
  g.addColorStop(1, C["trail-end"]);
  ctx.strokeStyle = g;
  for (const k of lanes) {
    const x = bx - uy * k, y = by + ux * k;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - ux * len, y - uy * len);
    ctx.stroke();
  }
  ctx.restore();
}

export function drawProjectile(ctx, o, C = PALETTE) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.a);
  PROJECTILE_SPRITES[o.kind](ctx, o, C);
  ctx.restore();
}

const BADGE_R = 15, ICON = 2 * BADGE_R - 6, ARROW = 9;

function badgeIcon(ctx, o, a, C) {
  const s = ICON / o.len;
  ctx.save();
  ctx.rotate(a);
  ctx.scale(s, s);
  PROJECTILE_SPRITES[o.kind](ctx, o, C);
  ctx.restore();
}

function fanIcon(ctx, w, C) {
  const picks = [w.obs[0], w.obs[w.obs.length >> 1], w.obs[w.obs.length - 1]];
  const back = -ICON / 2;
  for (const o of picks) {
    const d = o.a - w.a, half = ICON / 2;
    ctx.save();
    ctx.rotate(w.a);
    ctx.translate(back + Math.cos(d) * half, Math.sin(d) * half);
    badgeIcon(ctx, o, d, C);
    ctx.restore();
  }
}

export function drawWarn(ctx, w, clock, now, C = PALETTE, avoid = null) {
  if (now < w.born) return;
  const r = BADGE_R;
  const x = clamp(w.x, r + 3, FW - r - 3);
  let y = clamp(w.y, r + 3, FH - r - 3);
  if (avoid && x + r > avoid.x0 && x - r < avoid.x1 && y - r < avoid.y1) y = avoid.y1 + r;
  const done = clamp((now - w.born) / (w.at - w.born), 0, 1);
  const o = w.obs[0];
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = 0.82 + 0.18 * Math.sin(clock * 18);
  ctx.lineJoin = "round";
  ctx.save();
  ctx.rotate(w.a);
  ctx.fillStyle = C.flame;
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(r + ARROW, 0);
  ctx.lineTo(r - 1, -7);
  ctx.lineTo(r - 1, 7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  ctx.fillStyle = C.void;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "rgba(255, 122, 26, 0.35)";
  ctx.stroke();
  ctx.strokeStyle = C.flame;
  ctx.beginPath();
  ctx.arc(0, 0, r, -Math.PI / 2, -Math.PI / 2 + done * Math.PI * 2);
  ctx.stroke();
  if (w.obs.length > 2) fanIcon(ctx, w, C);
  else badgeIcon(ctx, o, o.spin ? o.a + clock * o.spin : o.a, C);
  ctx.restore();
}

export function toastPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(-w / 2 + 6, h / 2);
  ctx.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - 6);
  ctx.lineTo(-w / 2, -h * 0.12);
  ctx.bezierCurveTo(-w * 0.66, -h * 0.62, -w * 0.06, -h * 0.7, 0, -h * 0.46);
  ctx.bezierCurveTo(w * 0.06, -h * 0.7, w * 0.66, -h * 0.62, w / 2, -h * 0.12);
  ctx.lineTo(w / 2, h / 2 - 6);
  ctx.quadraticCurveTo(w / 2, h / 2, w / 2 - 6, h / 2);
  ctx.closePath();
}

function thrusters(ctx, t, w, h, C) {
  for (const side of [-1, 1]) {
    const bx = side * w * 0.3, by = h / 2;
    const fl = 9 + t.thrust * 12 + Math.random() * 6;
    const g = ctx.createLinearGradient(0, by + 5, 0, by + 5 + fl);
    g.addColorStop(0, C.mustard);
    g.addColorStop(1, C.flame);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx - 4.5, by + 5);
    ctx.lineTo(bx + 4.5, by + 5);
    ctx.lineTo(bx, by + 5 + fl);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = C.steel;
    ctx.strokeStyle = C.void;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    rr(ctx, bx - 5, by - 8, 10, 14, 3);
    ctx.fill();
    ctx.stroke();
  }
}

function scars(ctx, list, w, h, C, round) {
  ctx.save();
  if (round) roundPath(ctx);
  else toastPath(ctx, w, h);
  ctx.clip();
  ctx.fillStyle = C.handle;
  for (const s of list) {
    const c = Math.cos(s.a), n = Math.sin(s.a);
    const edge = round ? ROUND_R : 1 / Math.max(Math.abs(c) / (w / 2), Math.abs(n) / (n < 0 ? h * 0.55 : h / 2));
    const out = edge + 3, tip = edge - s.len;
    ctx.beginPath();
    ctx.moveTo(c * out - n * 2.6, n * out + c * 2.6);
    ctx.lineTo(c * out + n * 2.6, n * out - c * 2.6);
    ctx.lineTo(c * tip, n * tip);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

const TAU = Math.PI * 2;

function wavy(ctx, cx, cy, rx, ry, wob, k) {
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU, f = 1 + wob * Math.sin(a * k + 0.7);
    const x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

function dots(ctx, color, list) {
  ctx.fillStyle = color;
  for (const [x, y, r] of list) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

function drip(ctx, x, y, len, w) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w, y + len);
  ctx.arc(x, y + len, w, Math.PI, 0, true);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
}

function oval(ctx, x, y, rx, ry, a = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, a, 0, TAU);
}

function line(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

const DOG_RIM = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * TAU, c = Math.cos(a), sn = Math.sin(a);
  const f = 1 + 0.035 * Math.sin(a * 9 + 1.3) + 0.02 * Math.sin(a * 17 + 0.5);
  return [Math.sign(c) * Math.abs(c) ** 0.65 * 12.4 * f, 2.6 + Math.sign(sn) * Math.abs(sn) ** 0.65 * 12.6 * f];
});
const DOG_BACK = DOG_RIM.map(([x, y]) => [x + 0.4, y + 0.9]), DOG_FRONT = DOG_RIM;

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
    line(ctx, Array.from({ length: 41 }, (_, i) => [Math.cos(i * 0.4) * (1 + i * 0.22), 2 + Math.sin(i * 0.4) * (1 + i * 0.22) * 0.85]));
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
    for (const [hx, hy] of [[-4, -2], [2, -2], [-1, 3.2]]) {
      line(ctx, Array.from({ length: 7 }, (_, i) => [hx + Math.cos((i * Math.PI) / 3) * 3, hy + Math.sin((i * Math.PI) / 3) * 3]));
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
    const squiggle = () => line(ctx, Array.from({ length: 61 }, (_, i) => {
      const s = i / 30 - 1, o = Math.sin(s * Math.PI * 3.5) * 5.5;
      return [s * 11 + o * 0.67, 2 + s * 10 - o * 0.74];
    }));
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
    const wave = (dy) => line(ctx, Array.from({ length: 51 }, (_, i) => [-12 + i * 0.48, 1 + dy + Math.sin(i * 0.36) * 4]));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#b9cde2";
    ctx.lineWidth = 7.6;
    wave(0.5);
    ctx.stroke();
    ctx.strokeStyle = "#f7fbff";
    ctx.lineWidth = 6.4;
    wave(0);
    ctx.stroke();
    ctx.lineWidth = 1.3;
    ctx.strokeStyle = "#e8303a";
    wave(-1.7);
    ctx.stroke();
    ctx.strokeStyle = "#2a8de0";
    wave(1.7);
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

function topping(ctx, kind, C) {
  ctx.save();
  (TOPPINGS[kind] || TOPPINGS.butter)(ctx, C);
  ctx.restore();
}

const FUR = "#fbf4ea";

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

function sideCutlery(ctx, t, C) {
  for (const [kind, side] of [["fork", -1], ["knife", 1]]) {
    ctx.save();
    ctx.translate(side * 25, -2);
    ctx.rotate(-Math.PI / 2 + side * 0.2);
    ctx.scale(0.5, 0.5);
    PROJECTILE_SPRITES[kind](ctx, { len: PROJECTILES[kind].len }, C);
    ctx.restore();
  }
}

const SIX_SEVEN_HZ = 2.2, BAT_HZ = 2.6;

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

function palm(ctx, side, C) {
  const p = (dx, dy) => [side * dx, dy];
  ctx.fillStyle = C.ink;
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(...p(-8, 1));
  ctx.quadraticCurveTo(...p(-8.4, -3.6), ...p(-6.4, -4.4));
  ctx.quadraticCurveTo(...p(-4.2, -4.8), ...p(-4.4, -1.6));
  ctx.quadraticCurveTo(...p(-4.2, 0.4), ...p(-2, 0.4));
  ctx.lineTo(...p(4.6, 0.4));
  ctx.quadraticCurveTo(...p(5.6, 0.2), ...p(5.6, -1.6));
  ctx.quadraticCurveTo(...p(5.4, -6.6), ...p(8.8, -6.6));
  ctx.quadraticCurveTo(...p(12, -6.4), ...p(11.8, -2.2));
  ctx.quadraticCurveTo(...p(11.6, 5.8), ...p(2.4, 5.8));
  ctx.quadraticCurveTo(...p(-4, 5.8), ...p(-8, 4.6));
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(192, 113, 47, 0.6)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  for (const fx of [7.4, 9.2]) {
    ctx.moveTo(...p(fx, -6.2));
    ctx.lineTo(...p(fx + 0.3, -3.6));
  }
  ctx.moveTo(...p(-7, 2.6));
  ctx.quadraticCurveTo(...p(-5.6, 1.4), ...p(-4.6, 1.6));
  ctx.stroke();
}

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

const SIDES = { boosters: sideBoosters, cutlery: sideCutlery, sixseven: sideSixSeven, bat: sideBat };

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

const BREADS = {
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

export function hat(ctx, kind, C) {
  if (!HATS[kind]) return;
  ctx.save();
  HATS[kind](ctx, C);
  ctx.restore();
}

const ROUND_R = 21, ROUND_SPREAD = 0.82, NEAR_CRUMBS = 14, NEAR_SPIN_MS = 9000, NEAR_GLOW = 0.34;

function roundPath(ctx) {
  ctx.beginPath();
  ctx.arc(0, 0, ROUND_R, 0, TAU);
}

function nearZone(ctx, C) {
  const outer = HIT_R + NEAR, spin = (performance.now() / NEAR_SPIN_MS) * TAU;
  ctx.save();
  const glow = ctx.createRadialGradient(0, 0, HIT_R, 0, 0, outer);
  glow.addColorStop(0, C.mustard);
  glow.addColorStop(1, "rgba(255, 207, 51, 0)");
  ctx.fillStyle = glow;
  ctx.globalAlpha = NEAR_GLOW;
  ctx.beginPath();
  ctx.arc(0, 0, outer, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = C.crumb;
  ctx.strokeStyle = C.crust;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < NEAR_CRUMBS; i++) {
    const a = spin + (i / NEAR_CRUMBS) * TAU, size = 1.5 + (i % 3) * 0.4;
    ctx.save();
    ctx.translate(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.rotate(a * 2 + i);
    ctx.beginPath();
    rr(ctx, -size, -size * 0.8, size * 2, size * 1.6, size * 0.6);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

const FIRE_TONGUES = 9, FIRE_LAYERS = [["jam", 1, 0], ["flame", 0.7, 1.7], ["mustard", 0.42, 3.1]], EMBERS = 5, EMBER_RISE = 20;
const BOLTS = 3, BOLT_STEPS = 6, BOLT_MS = 90, BOLT_JAG = 3, BOLT_FORK = 0.3, SPARKS = 7, NEON_R = 35, FIRE_HOLE = 22;
const NEON = ["#ff3fa4", "#8a5cff", "#ffcf33"], NEON_SEAM = 0.02;
const RING_RX = 43, RING_RY = 12, RING_TILT = -0.28, RING_SPIN = 0.9, MOON_R = 3.8;
const RING_SPARKLES = [[-36, -26, 2.2], [34, 24, 1.8], [-28, 30, 1.4]];
const SIDE_REACH = { boosters: 31, cutlery: 32, sixseven: 44, bat: 50 }, SIDE_BAND = 20, OUTLINE = 2;

function glow(ctx, y, inner, outer, from, to) {
  const g = ctx.createRadialGradient(0, y, inner, 0, y, outer);
  g.addColorStop(0, from);
  g.addColorStop(1, to);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, y, outer, 0, TAU);
  ctx.fill();
}

function sparkle(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y - s * 1.6);
  ctx.lineTo(x + s * 0.4, y - s * 0.4);
  ctx.lineTo(x + s * 1.6, y);
  ctx.lineTo(x + s * 0.4, y + s * 0.4);
  ctx.lineTo(x, y + s * 1.6);
  ctx.lineTo(x - s * 0.4, y + s * 0.4);
  ctx.lineTo(x - s * 1.6, y);
  ctx.lineTo(x - s * 0.4, y - s * 0.4);
  ctx.closePath();
  ctx.fill();
}

function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function fireBase(a, round) {
  const c = Math.cos(a), sn = Math.sin(a);
  return round ? [c * 22, sn * 22] : [Math.sign(c) * Math.abs(c) ** 0.5 * 18, Math.sign(sn) * Math.abs(sn) ** 0.5 * 20 - 1];
}

function fireLayer(ctx, now, round, k, phase) {
  ctx.beginPath();
  for (let i = 0; i < FIRE_TONGUES; i++) {
    const a0 = (i / FIRE_TONGUES) * TAU, a1 = ((i + 1) / FIRE_TONGUES) * TAU, am = (a0 + a1) / 2;
    const [x0, y0] = fireBase(a0, round), [x1, y1] = fireBase(a1, round), [xm, ym] = fireBase(am, round);
    const ox = Math.cos(am), oy = Math.sin(am), top = Math.max(0, -oy);
    const len = (10 + 12 * top + Math.sin(now * 8 + i * 2.1 + phase) * 2.5) * k * (round ? 0.85 : 1);
    const tx = xm + ox * len * 0.7 + Math.sin(now * 5 + i * 1.3 + phase) * len * 0.25, ty = ym + oy * len * 0.7 - len * 0.6;
    if (!i) ctx.moveTo(x0, y0);
    ctx.bezierCurveTo(x0 + ox * len * 0.7, y0 + oy * len * 0.7, xm + ox * len * 0.5 - (x1 - x0) * 0.15, ym + oy * len * 0.5 - len * 0.35, tx, ty);
    ctx.bezierCurveTo(xm + ox * len * 0.5 + (x1 - x0) * 0.15, ym + oy * len * 0.5 - len * 0.35, x1 + ox * len * 0.7, y1 + oy * len * 0.7, x1, y1);
  }
  ctx.closePath();
  if (round) {
    ctx.moveTo(FIRE_HOLE, 0);
    ctx.arc(0, 0, FIRE_HOLE, 0, TAU);
  }
  ctx.fill("evenodd");
}

function auraHeat(ctx, now, C, round) {
  if (round) {
    const g = ctx.createRadialGradient(0, 0, FIRE_HOLE, 0, 0, 44);
    g.addColorStop(0, "rgba(255, 122, 26, 0)");
    g.addColorStop(0.2, "rgba(255, 122, 26, 0.45)");
    g.addColorStop(1, "rgba(224, 36, 74, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 44, 0, TAU);
    ctx.fill();
  } else glow(ctx, -4, 14, 42, "rgba(255, 122, 26, 0.45)", "rgba(224, 36, 74, 0)");
  for (const [color, k, phase] of FIRE_LAYERS) {
    ctx.fillStyle = C[color];
    fireLayer(ctx, now, round, k, phase);
  }
  ctx.fillStyle = C.mustard;
  for (let i = 0; i < EMBERS; i++) {
    const rise = (now * 0.6 + i / EMBERS) % 1;
    ctx.globalAlpha = 1 - rise;
    ctx.beginPath();
    ctx.arc(-18 + i * 9 + Math.sin(now * 3 + i) * 2, (round ? -36 : -40) - rise * EMBER_RISE, 1.3 - rise * 0.6, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function bolt(ctx, seed, a, r0, r1) {
  let fx = 0, fy = 0;
  ctx.beginPath();
  for (let k = 0; k <= BOLT_STEPS; k++) {
    const r = r0 + ((r1 - r0) * k) / BOLT_STEPS, j = k && k < BOLT_STEPS ? ((hash(seed + k) - 0.5) * 2 * BOLT_JAG) / r : 0;
    const x = Math.cos(a + j) * r, y = Math.sin(a + j) * r;
    if (k) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
    if (k === 3) [fx, fy] = [x, y];
  }
  const fork = a + (hash(seed + 9) > 0.5 ? BOLT_FORK : -BOLT_FORK);
  ctx.moveTo(fx, fy);
  ctx.lineTo(Math.cos(fork) * (r1 - 3), Math.sin(fork) * (r1 - 3));
}

function auraVolt(ctx, now, C, round) {
  const ms = now * 1000, tick = Math.floor(ms / BOLT_MS), flash = 1 - (ms % BOLT_MS) / BOLT_MS;
  const r0 = round ? 22 : 19, r1 = round ? 40 : 38;
  glow(ctx, 0, 14, r1 + 2, `rgba(110, 210, 255, ${0.22 + 0.16 * flash})`, "rgba(110, 210, 255, 0)");
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  for (let b = 0; b < BOLTS; b++) {
    const seed = tick * 13 + b * 71;
    bolt(ctx, seed, ((b + hash(seed) * 0.6) / BOLTS) * TAU + tick * 0.9, r0, r1);
    ctx.strokeStyle = "rgba(79, 200, 255, 0.5)";
    ctx.lineWidth = 3.4;
    ctx.stroke();
    ctx.strokeStyle = "#f2fbff";
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }
  ctx.fillStyle = "#e8f8ff";
  for (let i = 0; i < SPARKS; i++) {
    const seed = tick * 7 + i * 31;
    if (hash(seed) > 0.55) continue;
    const a = hash(seed + 1) * TAU, r = r1 - 6 + hash(seed + 2) * 8;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.9, 0, TAU);
    ctx.fill();
  }
}

function auraNeon(ctx, now) {
  const pulse = 0.75 + 0.25 * Math.sin(now * 4), turn = now * 1.5, arc = TAU / (NEON.length * 2);
  glow(ctx, 0, 22, 40, `rgba(255, 63, 164, ${0.28 * pulse})`, "rgba(138, 92, 255, 0)");
  ctx.lineCap = "butt";
  for (let i = 0; i < NEON.length * 2; i++) {
    ctx.strokeStyle = NEON[i % NEON.length];
    ctx.beginPath();
    ctx.arc(0, 0, NEON_R, turn + i * arc, turn + (i + 1) * arc + NEON_SEAM);
    ctx.globalAlpha = 0.35 * pulse;
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2.6;
    ctx.stroke();
  }
}

function ringBand(ctx, from, to) {
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.ellipse(0, 0, RING_RX, RING_RY, 0, from, to);
  ctx.strokeStyle = "rgba(255, 207, 51, 0.85)";
  ctx.lineWidth = 5;
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 241, 168, 0.9)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
}

function moon(ctx, a, C) {
  ctx.fillStyle = C.steel;
  ctx.strokeStyle = C.void;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(Math.cos(a) * RING_RX, Math.sin(a) * RING_RY, MOON_R, 0, TAU);
  ctx.fill();
  ctx.stroke();
}

function ringBack(ctx, now, C) {
  ctx.save();
  ctx.rotate(RING_TILT);
  ringBand(ctx, 0, TAU);
  moon(ctx, now * RING_SPIN, C);
  ctx.restore();
  ctx.fillStyle = C.ink;
  RING_SPARKLES.forEach(([x, y, size], i) => {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(now * 3 + i * 2.1);
    sparkle(ctx, x, y, size);
  });
  ctx.globalAlpha = 1;
}

function ringFront(ctx, now, C) {
  const a = now * RING_SPIN;
  ctx.save();
  ctx.rotate(RING_TILT);
  ringBand(ctx, 0, Math.PI);
  if (Math.sin(a) > 0) moon(ctx, a, C);
  ctx.restore();
}

const AURAS = { heat: { back: auraHeat }, volt: { back: auraVolt }, neon: { back: auraNeon }, ring: { back: ringBack, front: ringFront } };

export function drawAura(ctx, t, C = PALETTE) {
  const aura = AURAS[t.aura];
  if (!aura) return;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.tilt);
  aura.back(ctx, performance.now() / 1000, C, t.bread === "hitbox");
  ctx.restore();
}

export function drawToast(ctx, t, splat, C = PALETTE, aura = true) {
  const w = 40, h = 42, bread = GEAR[t.bread], round = t.bread === "hitbox", s = round ? HIT_R / ROUND_R : 1;
  const body = round ? roundPath : (c) => toastPath(c, w, h), front = !splat && AURAS[t.aura] && AURAS[t.aura].front;
  if (aura && !splat) drawAura(ctx, t, C);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(splat ? 0.5 : t.tilt);
  ctx.lineJoin = "round";
  if (round && !splat) nearZone(ctx, C);
  ctx.scale(s, s);
  if (!splat) thrusters(ctx, t, w, h, C);
  if (!splat && SIDES[t.side]) SIDES[t.side](ctx, t, C);
  body(ctx);
  ctx.fillStyle = bread ? bread.crust : C.crust;
  ctx.fill();
  ctx.lineWidth = 2.2 / s;
  ctx.strokeStyle = C.void;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, 2);
  ctx.scale(0.78, 0.78);
  body(ctx);
  ctx.fillStyle = bread ? bread.crumb : C.crumb;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = bread ? bread.crust : C.crust;
  ctx.globalAlpha = 0.45;
  for (const [px, py] of [[-10, -7], [9, -9], [-9, 10], [10, 9], [1, -12]]) {
    ctx.beginPath();
    ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (BREADS[t.bread]) BREADS[t.bread](ctx, w, h, C);
  ctx.save();
  ctx.scale(round ? ROUND_SPREAD : 1, round ? ROUND_SPREAD : 1);
  topping(ctx, t.spread, C);
  ctx.restore();
  if (front) {
    const reach = SIDE_REACH[t.side] || (round ? 0 : w / 2 + OUTLINE), near = (HIT_R + NEAR) / s;
    ctx.save();
    body(ctx);
    if (reach) ctx.rect(-reach, -SIDE_BAND, reach * 2, SIDE_BAND * 2);
    if (round) {
      ctx.moveTo(near, 0);
      ctx.arc(0, 0, near, 0, TAU);
    }
    ctx.clip();
    ctx.scale(1 / s, 1 / s);
    front(ctx, performance.now() / 1000, C);
    ctx.restore();
  }
  if (t.scars && t.scars.length) scars(ctx, t.scars, w, h, C, round);
  hat(ctx, t.head, C);
  if (splat) {
    ctx.fillStyle = C.jam;
    for (const b of splat) {
      ctx.beginPath();
      ctx.arc(b.dx, b.dy, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}
