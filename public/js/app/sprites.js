import { GEAR, PALETTE } from "../shared/palette.js";
import { clamp, FH, FW, HIT_R, NEAR } from "../game/field.js";
import { PROJECTILES } from "../game/projectiles.js";
import { AURAS } from "./art/auras.js";
import { BREADS } from "./art/breads.js";
import { PROJECTILE_SPRITES } from "./art/cutlery.js";
import { hat } from "./art/hats.js";
import { own, rr, TAU, toastPath } from "./art/kit.js";
import { SIDES } from "./art/sides.js";
import { topping } from "./art/spreads.js";

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

const SIDE_REACH = { boosters: 31, cutlery: 32, sixseven: 44, bat: 50 }, SIDE_BAND = 20, OUTLINE = 2;

export function drawAura(ctx, t, C = PALETTE) {
  const aura = own(AURAS, t.aura);
  if (!aura) return;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.tilt);
  aura.back(ctx, performance.now() / 1000, C, t.bread === "hitbox");
  ctx.restore();
}

export function drawToast(ctx, t, splat, C = PALETTE, aura = true) {
  const w = 40, h = 42, bread = own(GEAR, t.bread), round = t.bread === "hitbox", s = round ? HIT_R / ROUND_R : 1;
  const body = round ? roundPath : (c) => toastPath(c, w, h), front = !splat && own(AURAS, t.aura)?.front;
  if (aura && !splat) drawAura(ctx, t, C);
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(splat ? 0.5 : t.tilt);
  ctx.lineJoin = "round";
  if (round && !splat) nearZone(ctx, C);
  ctx.scale(s, s);
  if (!splat) thrusters(ctx, t, w, h, C);
  if (!splat && own(SIDES, t.side)) SIDES[t.side](ctx, t, C);
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
  if (own(BREADS, t.bread)) BREADS[t.bread](ctx, w, h, C);
  ctx.save();
  ctx.scale(round ? ROUND_SPREAD : 1, round ? ROUND_SPREAD : 1);
  topping(ctx, t.spread, C);
  ctx.restore();
  if (front) {
    const reach = own(SIDE_REACH, t.side) || (round ? 0 : w / 2 + OUTLINE), near = (HIT_R + NEAR) / s;
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
