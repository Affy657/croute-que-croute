export const own = (map, key) => (Object.hasOwn(map, key) ? map[key] : null);

export function rr(ctx, x, y, w, h, r) {
  if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
  else ctx.rect(x, y, w, h);
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

export const TAU = Math.PI * 2;

export function wavy(ctx, cx, cy, rx, ry, wob, k) {
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    const a = (i / 48) * TAU, f = 1 + wob * Math.sin(a * k + 0.7);
    const x = cx + Math.cos(a) * rx * f, y = cy + Math.sin(a) * ry * f;
    if (i) ctx.lineTo(x, y);
    else ctx.moveTo(x, y);
  }
  ctx.closePath();
}

export function dots(ctx, color, list) {
  ctx.fillStyle = color;
  for (const [x, y, r] of list) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
}

export function drip(ctx, x, y, len, w) {
  ctx.beginPath();
  ctx.moveTo(x - w, y);
  ctx.lineTo(x - w, y + len);
  ctx.arc(x, y + len, w, Math.PI, 0, true);
  ctx.lineTo(x + w, y);
  ctx.closePath();
  ctx.fill();
}

export function oval(ctx, x, y, rx, ry, a = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, a, 0, TAU);
}

export function line(ctx, points) {
  ctx.beginPath();
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

export const FUR = "#fbf4ea";
