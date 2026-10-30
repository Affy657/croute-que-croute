import { FW, FH, clamp } from "../game/field.js";
import { PALETTE, HEAT } from "../shared/palette.js";
import { drawTrail, drawProjectile, drawWarn, drawToast } from "./sprites.js";
import { BODIES, RARE, CAN_KINDS, drawCan } from "./planets.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const POP_LIFE = 0.7, PUCK_R = 30, PUCK_LIFT = 110, GRAB_S = 0.6, FIELD_FADE = 5;
const SKY_SPEED = 20, SKY_GAP = 0.5, SKY_TOP = 0.3, SKY_LOOP = SKY_GAP * BODIES.length;
const HEAT_EASE = 0.7, HEAT_LOW = 0.45, HEAT_FIELD = 0.85;
const HINT = "Pose ton doigt où tu veux";
const COMET_S = 9, COMET_SIZE = 0.13, COMET_TAIL = 0.35, COMET_ALPHA = 0.7;
const OFTEN = ["127.0.0.1", "localhost"].includes(location.hostname) && new URLSearchParams(location.search).get("etoiles") === "souvent";
const COMET_FIRST = OFTEN ? [1, 2] : [30, 180], COMET_GAP = OFTEN ? [4, 6] : [120, 240];
const ODD = ["127.0.0.1", "localhost"].includes(location.hostname) && new URLSearchParams(location.search).get("planetes") === "souvent";
const RARE_FIRST = ODD ? [1, 2] : [30, 180], RARE_GAP = ODD ? [1, 2] : [120, 240], RARE_OUT = 1.4;
const HEAT_RGB = HEAT.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));

function heatColor(k, low = 1) {
  const [a, b, c] = HEAT_RGB;
  const rgb = a.map((v, j) => v + ((1 - k) * (1 - k) * v + 2 * k * (1 - k) * b[j] + k * k * c[j] - v) * low);
  return `rgb(${rgb.map(Math.round).join(",")})`;
}

export function createScene(canvas, overlay) {
  const ctx = canvas.getContext("2d");
  const fx = overlay.getContext("2d");
  const C = PALETTE;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const view = { W: 0, H: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  let hudBox = null;
  let stars = [], sky = 0, shake = 0, parts = [], pops = [], fieldA = 0, heat = 0;
  let comet = null, cometIn = rnd(...COMET_FIRST);
  let rare = null, rareIn = rnd(...RARE_FIRST), rareLast = null;

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    view.W = window.innerWidth;
    view.H = window.innerHeight;
    for (const c of [canvas, overlay]) {
      c.width = Math.round(view.W * view.dpr);
      c.height = Math.round(view.H * view.dpr);
    }
    view.scale = Math.min(view.W / FW, view.H / FH);
    view.ox = (view.W - FW * view.scale) / 2;
    view.oy = (view.H - FH * view.scale) / 2;
    const n = Math.round((view.W * view.H) / 2600);
    stars = Array.from({ length: n }, () => ({ x: Math.random() * view.W, y: Math.random() * view.H, z: rnd(0.1, 1), tw: rnd(0, 6.28) }));
  }

  function update(dt, warp, field, hot = 0) {
    fieldA = clamp(fieldA + (field ? dt : -dt) * FIELD_FADE, 0, 1);
    heat += (hot - heat) * Math.min(1, dt * HEAT_EASE);
    for (const s of stars) {
      s.y += (18 + 150 * s.z) * warp * dt;
      if (s.y > view.H + 2) { s.y = -2; s.x = Math.random() * view.W; }
    }
    const step = (SKY_SPEED * warp * dt) / view.H;
    sky = (sky + step) % SKY_LOOP;
    if (rare && (rare.y += step) > RARE_OUT) rare = null;
    if ((rareIn -= dt) <= 0 && !rare) {
      rare = newRare();
      rareIn = rnd(...RARE_GAP);
    }
    if (comet) {
      comet.k += dt / COMET_S;
      if (comet.k >= 1) comet = null;
    } else if (!reduceMotion && (cometIn -= dt) <= 0) {
      comet = newComet();
      cometIn = rnd(...COMET_GAP);
    }
    if (shake > 0) shake = Math.max(0, shake - 60 * dt);
    for (const p of parts) {
      p.vy += 420 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
    }
    parts = parts.filter((p) => p.life > 0);
    for (const p of pops) {
      p.y -= 34 * dt;
      p.life -= dt;
    }
    pops = pops.filter((p) => p.life > 0);
  }

  function splash(x, y) {
    shake = reduceMotion ? 0 : 12;
    pops = [];
    for (let i = 0; i < 30; i++) {
      const a = rnd(0, Math.PI * 2), s = rnd(60, 280);
      parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 80, r: rnd(2.5, 7), life: rnd(0.6, 1.1), c: Math.random() < 0.7 ? C.jam : C.crumb });
    }
    return Array.from({ length: 7 }, () => ({ dx: rnd(-13, 13), dy: rnd(-11, 13), r: rnd(4.5, 10) }));
  }

  function pop(x, y, text, { key = null, size = 14 } = {}) {
    if (key) pops = pops.filter((p) => p.key !== key);
    pops.push({ x, y, text, key, size, life: POP_LIFE });
  }

  function clear() {
    shake = 0;
    parts = [];
    pops = [];
  }

  const skyY = (i) => ((((sky - i * SKY_GAP) % SKY_LOOP) + SKY_LOOP) % SKY_LOOP) - SKY_TOP;

  function newRare() {
    const pool = RARE.filter((b) => b !== rareLast), b = pool[Math.floor(Math.random() * pool.length)];
    const u = Math.min(view.W, view.H), y = -(b.r * u * 1.2) / view.H;
    const room = (left) => Math.min(...BODIES.flatMap((o, i) => (o.x < 0.5 === left ? [Math.abs(skyY(i) - y), Math.abs(skyY(i) - SKY_LOOP - y)] : [])));
    const left = room(true) >= room(false);
    rareLast = b;
    return { b, y, x: left ? Math.min(b.x, 1 - b.x) : Math.max(b.x, 1 - b.x) };
  }

  function drawSky(clock) {
    const { W, H } = view, u = Math.min(W, H);
    const draw = (b, x, y) => {
      if (y < -u * 0.3 || y > H + u * 0.3) return;
      ctx.save();
      ctx.translate(W * x, y);
      b.draw(ctx, b.r * u, reduceMotion ? 0 : clock);
      ctx.restore();
    };
    BODIES.forEach((b, i) => draw(b, b.x, skyY(i) * H));
    if (rare) draw(rare.b, rare.x, rare.y * H);
  }

  function newComet() {
    const left = Math.random() < 0.5, y0 = rnd(0.06, 0.3);
    return {
      k: 0, kind: CAN_KINDS[Math.floor(Math.random() * CAN_KINDS.length)],
      x0: left ? -0.2 : 1.2, x1: left ? 1.2 : -0.2, y0, y1: y0 + rnd(0.15, 0.35),
      a0: rnd(-0.6, 0.6), spin: rnd(0.25, 0.5) * (Math.random() < 0.5 ? -1 : 1)
    };
  }

  function drawComet() {
    const { W, H } = view, u = Math.min(W, H), c = comet;
    const dx = (c.x1 - c.x0) * W, dy = (c.y1 - c.y0) * H, d = Math.hypot(dx, dy);
    const x = c.x0 * W + dx * c.k, y = c.y0 * H + dy * c.k, tx = x - (dx / d) * u * COMET_TAIL, ty = y - (dy / d) * u * COMET_TAIL;
    ctx.save();
    ctx.globalAlpha = COMET_ALPHA;
    ctx.lineCap = "round";
    for (const [w, a] of [[0.032, 0.35], [0.012, 0.8]]) {
      const g = ctx.createLinearGradient(x, y, tx, ty);
      g.addColorStop(0, "rgba(255, 207, 51, " + a + ")");
      g.addColorStop(1, "rgba(255, 207, 51, 0)");
      ctx.strokeStyle = g;
      ctx.lineWidth = u * w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(tx, ty);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.translate(x, y);
    ctx.rotate(c.a0 + c.spin * c.k * COMET_S);
    drawCan(ctx, c.kind, u * COMET_SIZE);
    ctx.restore();
  }

  function drawBackground(clock) {
    const { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (heat > 0.005) {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, heatColor(heat));
      g.addColorStop(1, heatColor(heat, HEAT_LOW));
      ctx.fillStyle = g;
    } else {
      ctx.fillStyle = C.void;
    }
    ctx.fillRect(0, 0, W, H);
    if (comet) drawComet();
    drawSky(clock);
    ctx.fillStyle = C.ink;
    for (const s of stars) {
      ctx.globalAlpha = (0.3 + 0.7 * s.z) * (0.7 + 0.3 * Math.sin(s.tw + clock * 3));
      const sz = 0.6 + s.z * 1.8;
      ctx.fillRect(s.x, s.y, sz, sz);
    }
    ctx.globalAlpha = 1;
  }

  function drawEffects() {
    for (const p of parts) {
      ctx.globalAlpha = clamp(p.life, 0, 1);
      ctx.fillStyle = p.c;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.5;
    for (const p of pops) {
      ctx.font = `${p.size}px Bungee, "Arial Black", sans-serif`;
      ctx.globalAlpha = clamp(p.life / POP_LIFE, 0, 1);
      ctx.strokeStyle = C.void;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.fillStyle = C.mustard;
      ctx.fillText(p.text, p.x, p.y);
    }
    ctx.globalAlpha = 1;
  }

  function drawPuck(x, y, dot, ring) {
    fx.beginPath();
    fx.arc(x, y, PUCK_R, 0, Math.PI * 2);
    fx.fillStyle = C.ink;
    fx.globalAlpha = 0.07;
    fx.fill();
    fx.globalAlpha = ring;
    fx.strokeStyle = C.ink;
    fx.lineWidth = 2;
    fx.stroke();
    fx.fillStyle = C.ink;
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2, r = PUCK_R + 9;
      fx.save();
      fx.translate(x + Math.cos(a) * r, y + Math.sin(a) * r);
      fx.rotate(a);
      fx.beginPath();
      fx.moveTo(4, 0);
      fx.lineTo(-3, -5);
      fx.lineTo(-3, 5);
      fx.closePath();
      fx.fill();
      fx.restore();
    }
    fx.globalAlpha = 0.75;
    fx.fillStyle = C.mustard;
    fx.beginPath();
    fx.arc(x + dot, y, 9, 0, Math.PI * 2);
    fx.fill();
  }

  function drawFinger(finger, clock) {
    if (!finger || (!finger.held && !finger.touch)) return;
    const { W, H, dpr } = view;
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (finger.held) {
      drawPuck(finger.x, finger.y, 0, 0.4);
      const age = (performance.now() - finger.at) / 1000;
      if (!reduceMotion && age < GRAB_S) {
        const k = age / GRAB_S;
        fx.globalAlpha = 0.6 * (1 - k);
        fx.strokeStyle = C.mustard;
        fx.lineWidth = 3;
        fx.beginPath();
        fx.arc(finger.x, finger.y, PUCK_R + 34 * k, 0, Math.PI * 2);
        fx.stroke();
      }
    } else {
      const x = W / 2, y = H - PUCK_R - PUCK_LIFT;
      drawPuck(x, y, reduceMotion ? 0 : Math.sin(clock * 3) * 12, 0.3 + 0.15 * Math.sin(clock * 4));
      fx.globalAlpha = 0.85;
      fx.font = '13px Bungee, "Arial Black", sans-serif';
      fx.textAlign = "center";
      fx.lineJoin = "round";
      fx.lineWidth = 3.5;
      fx.strokeStyle = C.void;
      fx.strokeText(HINT, x, y + PUCK_R + 30);
      fx.fillStyle = C.ink;
      fx.fillText(HINT, x, y + PUCK_R + 30);
    }
    fx.globalAlpha = 1;
  }

  function drawWarns(world, clock, sx, sy) {
    const { dpr, scale, ox, oy } = view;
    if (!world.warns.length) return;
    fx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy));
    fx.save();
    fx.beginPath();
    fx.rect(0, 0, FW, FH);
    fx.clip();
    const zone = hudBox && { x0: (hudBox.left - ox) / scale, x1: (hudBox.right - ox) / scale, y1: (hudBox.bottom - oy) / scale };
    for (const w of world.warns) drawWarn(fx, w, clock, world.t, C, zone);
    fx.restore();
  }

  function render({ clock, world, toast, splat, finger, dying }) {
    const { dpr, scale, ox, oy } = view;
    drawBackground(clock);
    const sx = shake ? rnd(-shake, shake) : 0;
    const sy = shake ? rnd(-shake, shake) : 0;
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.clearRect(0, 0, overlay.width, overlay.height);
    drawFinger(finger, clock);
    if (fieldA > 0 && !dying) drawWarns(world, clock, sx, sy);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy));
    if (fieldA > 0) {
      ctx.globalAlpha = fieldA * (1 - HEAT_FIELD * heat);
      ctx.fillStyle = C.field;
      ctx.fillRect(0, 0, FW, FH);
      ctx.strokeStyle = C.frame;
      ctx.lineWidth = 2 / scale;
      ctx.strokeRect(0, 0, FW, FH);
      ctx.globalAlpha = 1;
    }
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FW, FH);
    ctx.clip();
    for (const o of world.obs) drawTrail(ctx, o, C);
    for (const o of world.obs) drawProjectile(ctx, o, C);
    if (toast) drawToast(ctx, toast, splat, C);
    drawEffects();
    ctx.restore();
  }

  resize();
  sky = 0.22 + SKY_TOP;
  window.addEventListener("resize", resize);

  const avoid = (box) => { hudBox = box; };

  return { view, update, render, splash, pop, clear, avoid };
}
