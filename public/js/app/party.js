import { PALETTE as C } from "../shared/palette.js";

const GRAVITY = 700, FADE_S = 0.4;
const FIESTA = [C.mustard, C.flame, C.jam, C.ink, C.crumb];
const GOLD = [C.mustard, C.butter, C.ink, C.flame];
const canvas = document.getElementById("party");
const ctx = canvas.getContext("2d");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
/** @type {Rnd} */
const rnd = (a, b) => a + Math.random() * (b - a);
/** @type {PickOne} */
const pick = (list) => list[Math.floor(Math.random() * list.length)];
/** @type {Spark[]} */
let parts = [], last = 0, dpr = 1;

function fit() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(window.innerWidth * dpr);
  canvas.height = Math.round(window.innerHeight * dpr);
  canvas.hidden = false;
}

/** @param {number} x @param {number} y @param {number} vx @param {number} vy @param {SparkOptions} e */
function spawn(x, y, vx, vy, { colors, g = GRAVITY, drag = 1.4, life }) {
  if (!parts.length) {
    fit();
    last = performance.now();
    requestAnimationFrame(frame);
  }
  parts.push({
    x, y, vx, vy, g, drag, life, c: pick(colors), star: Math.random() < 0.3,
    w: rnd(6, 12), h: rnd(4, 7), a: rnd(0, Math.PI * 2), va: rnd(-12, 12)
  });
}

/** @param {number} r */
function star(r) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4, k = i % 2 ? r * 0.35 : r;
    ctx.lineTo(Math.cos(a) * k, Math.sin(a) * k);
  }
  ctx.closePath();
  ctx.fill();
}

/** @param {number} now */
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  for (const p of parts) {
    p.vy += p.g * dt;
    p.vx -= p.vx * p.drag * dt;
    p.vy -= p.vy * p.drag * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.a += p.va * dt;
    p.life -= dt;
    ctx.globalAlpha = Math.max(0, Math.min(1, p.life / FADE_S)) * (p.star ? 0.6 + 0.4 * Math.sin(p.life * 20) : 1);
    ctx.fillStyle = p.c;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.a);
    if (p.star) {
      star(p.w * 0.8);
    } else {
      ctx.scale(1, Math.cos(p.a * 1.7));
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  parts = parts.filter((p) => p.life > 0);
  if (parts.length) {
    requestAnimationFrame(frame);
    return;
  }
  canvas.hidden = true;
  canvas.width = canvas.height = 0;
}

/** @param {HTMLElement} el @param {BurstOptions} b */
export function burst(el, { count = 40, power = 1, gold = false } = {}) {
  if (reduceMotion) return;
  const r = el.getBoundingClientRect();
  const x = r.left + r.width / 2, y = r.top + r.height / 2;
  for (let i = 0; i < count; i++) {
    const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05), s = rnd(220, 560) * power;
    spawn(x + rnd(-r.width, r.width) / 4, y, Math.cos(a) * s, Math.sin(a) * s, { colors: gold ? GOLD : FIESTA, life: rnd(0.9, 1.5) });
  }
}

export function rain(count = 90) {
  if (reduceMotion) return;
  for (let i = 0; i < count; i++) {
    spawn(rnd(0, window.innerWidth), rnd(-260, -10), rnd(-40, 40), rnd(80, 200), { colors: GOLD, g: 90, drag: 0.3, life: rnd(2.4, 3.4) });
  }
}

/** @param {HTMLElement} el */
export function bounce(el) {
  el.classList.remove("cheer");
  void el.offsetWidth;
  el.classList.add("cheer");
}
