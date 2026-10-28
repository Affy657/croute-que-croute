const COLOR_NAMES = ["void", "field", "frame", "planet", "planet-shade", "mustard", "flame", "jam", "crust", "crumb", "butter", "steel", "steel-dark", "handle", "ink"];

export function readColors() {
  const css = getComputedStyle(document.documentElement);
  const C = {};
  for (const k of COLOR_NAMES) C[k] = css.getPropertyValue("--" + k).trim();
  return C;
}

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
  ctx.fillStyle = C.butter;
  ctx.beginPath();
  ctx.ellipse(L / 2 - 15, 1.5, 7, 2.6, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C["steel-dark"];
  for (const rx of [hx + 7, hx + 15]) {
    ctx.beginPath();
    ctx.arc(rx, 0, 1.4, 0, Math.PI * 2);
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

const PROJECTILE_SPRITES = { knife, fork };

export function drawProjectile(ctx, o, C) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.a);
  PROJECTILE_SPRITES[o.kind](ctx, o, C);
  ctx.restore();
}

export function drawWarn(ctx, w, clock, C) {
  ctx.save();
  ctx.translate(w.x, w.y);
  ctx.rotate(w.a);
  ctx.globalAlpha = 0.45 + 0.55 * Math.abs(Math.sin(clock * 18));
  ctx.fillStyle = C.flame;
  ctx.beginPath();
  ctx.moveTo(9, 0);
  ctx.lineTo(-6, -7);
  ctx.lineTo(-2, 0);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
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

export function drawToast(ctx, t, splat, C) {
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
