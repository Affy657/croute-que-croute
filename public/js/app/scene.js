import { FW, FH, clamp } from "../game/field.js";
import { PALETTE, HEAT } from "../shared/palette.js";
import { drawTrail, drawProjectile, drawWarn, drawToast } from "./sprites.js";
import { BODIES, PASSERS } from "./planets.js";
import { store, KEYS } from "../shared/store.js";
import { LOCAL } from "../shared/local.js";

const rnd = (a, b) => a + Math.random() * (b - a);
const POP_LIFE = 0.7, PUCK_R = 30, PUCK_LIFT = 110, GRAB_S = 0.6, FIELD_FADE = 5;
const TOUR = ["rare", "normal", "wild", "normal", "normal", "normal", "wild", "normal"], SIDES = [0.8, 0.22], TOUCH_REACH = 1.8, PASSER_REACH = 0.6;
const SKY_SPEED = 20, SKY_GAP = 0.5, SKY_TOP = 0.3, SKY_LOOP = SKY_GAP * TOUR.length;
const HEAT_EASE = 0.7, HEAT_LOW = 0.45, HEAT_FIELD = 0.85;
const HINT = "Pose ton doigt où tu veux";
const COMET_S = 9, COMET_TAIL = 0.35, COMET_ALPHA = 0.7;
const OFTEN = LOCAL && new URLSearchParams(location.search).get("etoiles") === "souvent";
const COMET_FIRST = OFTEN ? [1, 2] : [30, 180], COMET_GAP = OFTEN ? [4, 6] : [120, 240];
const ODD = LOCAL && new URLSearchParams(location.search).get("planetes") === "souvent";
const QUALITY = [2, 1.5, 1.25, 1], REDRAW_S = [1 / 30, 1 / 20, 1 / 20, 1 / 15], SLOW_MS = 20, SAMPLE = 90, SETTLE = 60, GAP_MS = 250;
const HEAT_RGB = HEAT.map((c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)));

function dealer(list, gap = 1) {
  const recent = [];
  let pile = [];
  return () => {
    if (!pile.length) pile = [...list];
    const fresh = pile.filter((b) => !recent.includes(b)), pool = fresh.length ? fresh : pile;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    pile.splice(pile.indexOf(pick), 1);
    recent.push(pick);
    if (recent.length > gap) recent.shift();
    return pick;
  };
}

function heatColor(k, low = 1) {
  const [a, b, c] = HEAT_RGB;
  const rgb = a.map((v, j) => v + ((1 - k) * (1 - k) * v + 2 * k * (1 - k) * b[j] + k * k * c[j] - v) * low);
  return `rgb(${rgb.map(Math.round).join(",")})`;
}

export function createScene(canvas, overlay) {
  const ctx = canvas.getContext("2d", { alpha: false });
  const fx = overlay.getContext("2d");
  const C = PALETTE;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const view = { W: 0, H: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };
  let hudBox = null;
  let stars = [], sky = 0, shake = 0, parts = [], pops = [], fieldA = 0, heat = 0, heatKey = "", heatFill = null;
  let comet = null, cometIn = rnd(...COMET_FIRST);
  const deal = Object.fromEntries(Object.entries(BODIES).map(([kind, list]) => [kind, dealer(list, kind === "normal" ? 2 : 1)]));
  const nextPasser = dealer(Object.keys(PASSERS)), slots = [], slotY = [], arts = [], pick = (i) => deal[ODD ? "rare" : TOUR[i]]();
  let quality = Math.min(QUALITY.length - 1, Number(store.get(KEYS.quality)) || 0), frames = [], settle = SETTLE, fxDirty = true;

  function resize() {
    view.dpr = Math.min(window.devicePixelRatio || 1, QUALITY[quality]);
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

  function pace(ms) {
    if (ms > GAP_MS || document.hidden || quality === QUALITY.length - 1) return;
    if (settle > 0) {
      settle--;
      return;
    }
    frames.push(ms);
    if (frames.length < SAMPLE) return;
    const slow = frames.sort((a, b) => a - b)[SAMPLE >> 1] > SLOW_MS;
    frames = [];
    const lower = QUALITY.findIndex((d, i) => i > quality && d < view.dpr);
    if (!slow || lower < 0) return;
    quality = lower;
    store.set(KEYS.quality, quality);
    settle = SETTLE;
    resize();
  }

  function update(dt, warp, field, hot = 0) {
    fieldA = clamp(fieldA + (field ? dt : -dt) * FIELD_FADE, 0, 1);
    heat += (hot - heat) * Math.min(1, dt * HEAT_EASE);
    for (const s of stars) {
      s.y += (18 + 150 * s.z) * warp * dt;
      if (s.y > view.H + 2) { s.y = -2; s.x = Math.random() * view.W; }
    }
    sky = (sky + (SKY_SPEED * warp * dt) / view.H) % SKY_LOOP;
    TOUR.forEach((_, i) => {
      if (skyY(i) < slotY[i]) slots[i] = pick(i);
      slotY[i] = skyY(i);
    });
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

  function skyY(i) {
    return ((((sky - i * SKY_GAP) % SKY_LOOP) + SKY_LOOP) % SKY_LOOP) - SKY_TOP;
  }

  function art(i, b, r, clock) {
    const { dpr } = view, size = Math.ceil(2 * r * b.reach * dpr);
    let a = arts[i];
    if (!a || a.size !== size) {
      const cv = document.createElement("canvas");
      cv.width = cv.height = size;
      a = arts[i] = { cv, g: cv.getContext("2d"), size, body: null, r: 0, at: 0 };
    }
    const moving = !reduceMotion && b.draw.length > 2;
    if (a.body !== b || a.r !== r || (moving && Math.abs(clock - a.at) >= REDRAW_S[quality])) {
      Object.assign(a, { body: b, r, at: clock });
      a.g.setTransform(1, 0, 0, 1, 0, 0);
      a.g.clearRect(0, 0, size, size);
      a.g.setTransform(dpr, 0, 0, dpr, size / 2, size / 2);
      b.draw(a.g, r, moving ? clock : 0);
    }
    return a.cv;
  }

  function drawSky(clock) {
    const { W, H, dpr } = view, u = Math.min(W, H);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    slots.forEach((b, i) => {
      const y = skyY(i) * H;
      if (y < -u * 0.3 || y > H + u * 0.3) return;
      const img = art(i, b, b.r * u, clock);
      ctx.drawImage(img, Math.round(W * SIDES[i % 2] * dpr - img.width / 2), Math.round(y * dpr - img.height / 2));
    });
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function passerAt(x, y) {
    if (!comet) return null;
    const { W, H } = view, u = Math.min(W, H), c = comet, P = PASSERS[c.kind];
    const cx = (c.x0 + (c.x1 - c.x0) * c.k) * W, cy = (c.y0 + (c.y1 - c.y0) * c.k) * H;
    return Math.hypot(x - cx, y - cy) < u * P.size * (P.span || 1) * PASSER_REACH ? { key: c.kind } : null;
  }

  function bodyAt(x, y) {
    const { W, H } = view, u = Math.min(W, H);
    return slots.find((b, i) => b && Math.hypot(x - W * SIDES[i % 2], y - skyY(i) * H) < b.r * u * Math.min(b.reach, TOUCH_REACH)) || passerAt(x, y);
  }

  function newComet() {
    const kind = nextPasser(), left = Math.random() < 0.5, y0 = rnd(0.06, 0.3);
    return {
      k: 0, kind,
      x0: left ? -0.2 : 1.2, x1: left ? 1.2 : -0.2, y0, y1: PASSERS[kind].flat ? y0 : y0 + rnd(0.15, 0.35),
      a0: rnd(-0.6, 0.6), spin: rnd(0.25, 0.5) * (Math.random() < 0.5 ? -1 : 1)
    };
  }

  function drawComet(clock) {
    const { W, H } = view, u = Math.min(W, H), c = comet, P = PASSERS[c.kind], s = u * P.size;
    const dx = (c.x1 - c.x0) * W, dy = (c.y1 - c.y0) * H;
    ctx.save();
    ctx.translate(c.x0 * W + dx * c.k, c.y0 * H + dy * c.k);
    if (dx < 0) ctx.scale(-1, 1);
    ctx.rotate(Math.atan2(dy, Math.abs(dx)));
    if (P.trail) {
      ctx.globalAlpha = COMET_ALPHA;
      P.trail(ctx, u * COMET_TAIL, s);
      ctx.globalAlpha = 1;
    }
    if (P.spin) {
      if (dx < 0) ctx.scale(-1, 1);
      ctx.rotate(c.a0 + c.spin * P.spin * c.k * COMET_S);
    }
    P.draw(ctx, s, clock);
    ctx.restore();
  }

  function drawBackground(clock) {
    const { W, H, dpr } = view;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (heat > 0.005) {
      const key = H + ":" + Math.round(heat * 200);
      if (key !== heatKey) {
        heatKey = key;
        heatFill = ctx.createLinearGradient(0, 0, 0, H);
        heatFill.addColorStop(0, heatColor(heat));
        heatFill.addColorStop(1, heatColor(heat, HEAT_LOW));
      }
      ctx.fillStyle = heatFill;
    } else {
      ctx.fillStyle = C.void;
    }
    ctx.fillRect(0, 0, W, H);
    if (comet) drawComet(clock);
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
    fxDirty = true;
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
    fxDirty = true;
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
    if (fxDirty) {
      fx.setTransform(1, 0, 0, 1, 0, 0);
      fx.clearRect(0, 0, overlay.width, overlay.height);
      fxDirty = false;
    }
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
  sky = 0.22 + SKY_TOP + SKY_LOOP / 2;
  TOUR.forEach((_, i) => {
    slots[i] = pick(i);
    slotY[i] = skyY(i);
  });
  window.addEventListener("resize", resize);

  const avoid = (box) => { hudBox = box; };

  return { view, update, render, splash, pop, clear, avoid, pace, bodyAt };
}
