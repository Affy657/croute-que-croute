import { FW, FH, clamp } from "../game/field.js";
import { PALETTE } from "../shared/palette.js";
import { drawProjectile, drawWarn, drawToast } from "./sprites.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const POP_LIFE = 0.7, PUCK_R = 30, GRAB_S = 0.6, FIELD_FADE = 5;
const HINT = "Pose ton doigt où tu veux";

export function createScene(canvas, overlay) {
  const ctx = canvas.getContext("2d");
  const fx = overlay.getContext("2d");
  const C = PALETTE;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const view = { W: 0, H: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  let stars = [], planetY = 0, shake = 0, parts = [], pops = [], fieldA = 0;

  const planetR = () => Math.min(view.W, view.H) * 0.13;

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

  function update(dt, warp, field) {
    fieldA = clamp(fieldA + (field ? dt : -dt) * FIELD_FADE, 0, 1);
    for (const s of stars) {
      s.y += (18 + 150 * s.z) * warp * dt;
      if (s.y > view.H + 2) { s.y = -2; s.x = Math.random() * view.W; }
    }
    planetY += 7 * warp * dt;
    if (planetY - planetR() * 1.7 > view.H) planetY = -planetR() * 1.7;
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

  function pop(x, y, text) {
    pops.push({ x, y, text, life: POP_LIFE });
  }

  function clear() {
    shake = 0;
    parts = [];
    pops = [];
  }

  function drawPlanet() {
    const r = planetR();
    ctx.save();
    ctx.translate(view.W * 0.8, planetY);
    ctx.rotate(-0.35);
    ctx.strokeStyle = C.mustard;
    ctx.lineWidth = Math.max(2, r * 0.07);
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.6, r * 0.42, 0, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, C.planet);
    g.addColorStop(1, C["planet-shade"]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.6, r * 0.42, 0, 0, Math.PI);
    ctx.stroke();
    ctx.restore();
  }

  function drawBackground(clock) {
    const { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = C.void;
    ctx.fillRect(0, 0, W, H);
    drawPlanet();
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
    ctx.font = '14px Bungee, "Arial Black", sans-serif';
    ctx.textAlign = "center";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3.5;
    for (const p of pops) {
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
      const x = W / 2, y = H - PUCK_R - 70;
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
    for (const w of world.warns) drawWarn(fx, w, clock, world.t, C);
    fx.restore();
  }

  function render({ clock, world, toast, splat, finger }) {
    const { dpr, scale, ox, oy } = view;
    drawBackground(clock);
    const sx = shake ? rnd(-shake, shake) : 0;
    const sy = shake ? rnd(-shake, shake) : 0;
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.clearRect(0, 0, overlay.width, overlay.height);
    drawFinger(finger, clock);
    if (fieldA > 0) drawWarns(world, clock, sx, sy);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy));
    if (fieldA > 0) {
      ctx.globalAlpha = fieldA;
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
    for (const o of world.obs) drawProjectile(ctx, o, C);
    if (toast) drawToast(ctx, toast, splat, C);
    drawEffects();
    ctx.restore();
  }

  resize();
  planetY = view.H * 0.22;
  window.addEventListener("resize", resize);

  return { view, update, render, splash, pop, clear };
}
