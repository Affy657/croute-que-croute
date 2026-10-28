import { FW, FH, clamp } from "../game/field.js";
import { PALETTE } from "../shared/palette.js";
import { drawProjectile, drawWarn, drawToast } from "./sprites.js";
import { STICK_R } from "./input.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const POP_LIFE = 0.7;

export function createScene(canvas, overlay) {
  const ctx = canvas.getContext("2d");
  const fx = overlay.getContext("2d");
  const C = PALETTE;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const view = { W: 0, H: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  let stars = [], planetY = 0, shake = 0, parts = [], pops = [];

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

  function update(dt, warp) {
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

  function drawControls(ctl) {
    if (!ctl || ctl.mode === "drag") return;
    const { W, H, dpr } = view;
    fx.setTransform(dpr, 0, 0, dpr, 0, 0);
    fx.lineWidth = 2;
    fx.strokeStyle = C.ink;
    if (ctl.mode === "pad") {
      const h = clamp(H * 0.24, 130, 220), m = 14;
      fx.beginPath();
      fx.roundRect(m, H - h - m, W - 2 * m, h, 22);
      fx.fillStyle = C.ink;
      fx.globalAlpha = 0.05;
      fx.fill();
      fx.globalAlpha = 0.28;
      fx.stroke();
      if (ctl.held) {
        fx.globalAlpha = 0.55;
        fx.fillStyle = C.mustard;
        fx.beginPath();
        fx.arc(ctl.kx, ctl.ky, 16, 0, Math.PI * 2);
        fx.fill();
      }
    } else {
      const bx = ctl.held ? ctl.bx : W / 2, by = ctl.held ? ctl.by : H - STICK_R - 64;
      const kx = ctl.held ? ctl.kx : bx, ky = ctl.held ? ctl.ky : by;
      fx.beginPath();
      fx.arc(bx, by, STICK_R, 0, Math.PI * 2);
      fx.fillStyle = C.ink;
      fx.globalAlpha = 0.05;
      fx.fill();
      fx.globalAlpha = ctl.held ? 0.45 : 0.25;
      fx.stroke();
      fx.globalAlpha = ctl.held ? 0.6 : 0.25;
      fx.fillStyle = ctl.held ? C.mustard : C.ink;
      fx.beginPath();
      fx.arc(kx, ky, 22, 0, Math.PI * 2);
      fx.fill();
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

  function render({ clock, world, toast, splat, controls }) {
    const { dpr, scale, ox, oy } = view;
    drawBackground(clock);
    const sx = shake ? rnd(-shake, shake) : 0;
    const sy = shake ? rnd(-shake, shake) : 0;
    fx.setTransform(1, 0, 0, 1, 0, 0);
    fx.clearRect(0, 0, overlay.width, overlay.height);
    drawControls(controls);
    drawWarns(world, clock, sx, sy);
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * (ox + sx), dpr * (oy + sy));
    ctx.fillStyle = C.field;
    ctx.fillRect(0, 0, FW, FH);
    ctx.strokeStyle = C.frame;
    ctx.lineWidth = 2 / scale;
    ctx.strokeRect(0, 0, FW, FH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, FW, FH);
    ctx.clip();
    for (const o of world.obs) drawProjectile(ctx, o, C);
    drawToast(ctx, toast, splat, C);
    drawEffects();
    ctx.restore();
  }

  resize();
  planetY = view.H * 0.22;
  window.addEventListener("resize", resize);

  return { view, update, render, splash, pop, clear };
}
