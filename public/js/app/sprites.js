import { PALETTE, SPREADS } from "../shared/palette.js";
import { FW, FH, clamp } from "../game/field.js";
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
  for (const k of lanes) {
    const x = o.x - ux * back - uy * k, y = o.y - uy * back + ux * k;
    const g = ctx.createLinearGradient(x, y, x - ux * len, y - uy * len);
    g.addColorStop(0, C.trail);
    g.addColorStop(1, C["trail-end"]);
    ctx.strokeStyle = g;
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
  if (avoid && x + r > avoid.x0 && x - r < avoid.x1 && y - r < avoid.y1) y = avoid.y1 + r + ARROW;
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

function toastPath(ctx, w, h) {
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

function scars(ctx, list, w, h, C) {
  ctx.save();
  toastPath(ctx, w, h);
  ctx.clip();
  ctx.fillStyle = C.handle;
  for (const s of list) {
    const c = Math.cos(s.a), n = Math.sin(s.a);
    const edge = 1 / Math.max(Math.abs(c) / (w / 2), Math.abs(n) / (n < 0 ? h * 0.55 : h / 2));
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

const TOPPINGS = {
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
  }
};

function topping(ctx, kind, C) {
  ctx.save();
  (TOPPINGS[kind] || TOPPINGS.butter)(ctx, C);
  ctx.restore();
}

export function drawToast(ctx, t, splat, C = PALETTE) {
  const w = 40, h = 42;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(splat ? 0.5 : t.tilt);
  ctx.lineJoin = "round";
  if (!splat) thrusters(ctx, t, w, h, C);
  toastPath(ctx, w, h);
  ctx.fillStyle = C.crust;
  ctx.fill();
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = C.void;
  ctx.stroke();
  ctx.save();
  ctx.translate(0, 2);
  ctx.scale(0.78, 0.78);
  toastPath(ctx, w, h);
  ctx.fillStyle = C.crumb;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = C.crust;
  ctx.globalAlpha = 0.45;
  for (const [px, py] of [[-10, -7], [9, -9], [-9, 10], [10, 9], [1, -12]]) {
    ctx.beginPath();
    ctx.arc(px, py, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  topping(ctx, t.spread, C);
  if (t.scars && t.scars.length) scars(ctx, t.scars, w, h, C);
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
