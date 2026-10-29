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

function spreadOn(ctx, x, y, kind) {
  const spread = SPREADS[kind || "butter"];
  ctx.fillStyle = spread.color;
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 2.6, 0.05, 0, Math.PI * 2);
  ctx.fill();
  if (!kind) return;
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

const TRAIL_MIN = 210, TRAIL_K = 0.14, TRAIL_MAX = 64;

export function drawTrail(ctx, o, C = PALETTE) {
  const v = Math.hypot(o.vx, o.vy), len = Math.min(TRAIL_MAX, (v - TRAIL_MIN) * TRAIL_K);
  if (len < 4) return;
  const ux = o.vx / v, uy = o.vy / v;
  const across = PROJECTILES[o.kind].across;
  const back = o.spin ? 0 : across ? o.rad : o.len / 2 - 4;
  const lanes = across ? [-0.32 * o.len, 0, 0.32 * o.len] : o.spin ? [-0.8 * o.rad, 0.8 * o.rad] : [0];
  ctx.save();
  ctx.lineWidth = 2.5;
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

const BADGE_R = 15, ICON = 2 * BADGE_R - 6;

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

export function drawWarn(ctx, w, clock, now, C = PALETTE) {
  const r = BADGE_R;
  const x = clamp(w.x, r + 3, FW - r - 3), y = clamp(w.y, r + 3, FH - r - 3);
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
  ctx.moveTo(r + 9, 0);
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
  ctx.save();
  ctx.translate(-1, 3);
  ctx.rotate(0.18);
  ctx.fillStyle = C.butter;
  ctx.beginPath();
  rr(ctx, -7, -5.5, 14, 11, 3);
  ctx.fill();
  ctx.restore();
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
