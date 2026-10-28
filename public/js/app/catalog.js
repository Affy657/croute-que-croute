import { FW, FH, OUT, HIT_R, SPEED_MAX, SPEED_RAMP } from "../game/field.js";
import { PROJECTILES, moveProjectile } from "../game/projectiles.js";
import { ATTACKS } from "../game/attacks.js";
import { GAP_START, GAP_SLOPE, GAP_MIN } from "../game/sim.js";
import { PALETTE, SPREADS } from "../shared/palette.js";
import { drawProjectile, drawWarn, drawToast } from "./sprites.js";

const SAMPLE_T = 60, PREVIEW_SCALE = 0.5, PREVIEW_MAX_S = 6, PREVIEW_PAUSE_S = 0.6;
const TOAST = { x: FW / 2, y: FH * 0.62, tilt: 0, thrust: 0.35 };
const TOAST_W = 52, CARD_H = 72;
const gameScale = () => Math.min(window.innerWidth / FW, window.innerHeight / FH);
const num = (n) => String(Math.round(n * 10) / 10).replace(".", ",");
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const previews = [];
let running = false;

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function canvas(w, h) {
  const c = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.width = w + "px";
  c.style.height = h + "px";
  c.dpr = dpr;
  return c;
}

function capsule(ctx, half, r) {
  ctx.beginPath();
  ctx.arc(-half, 0, r, Math.PI / 2, Math.PI * 1.5);
  ctx.lineTo(half, -r);
  ctx.arc(half, 0, r, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
}

function realCanvas(width, scale) {
  const w = Math.max(120, Math.ceil(width * scale) + 24);
  const cv = canvas(w, CARD_H);
  const ctx = cv.getContext("2d");
  ctx.setTransform(cv.dpr * scale, 0, 0, cv.dpr * scale, (cv.dpr * w) / 2, (cv.dpr * CARD_H) / 2);
  return { cv, ctx };
}

function dashed(ctx, scale) {
  ctx.setLineDash([3 / scale, 3 / scale]);
  ctx.lineWidth = 1.2 / scale;
  ctx.strokeStyle = PALETTE.mustard;
}

function weaponCard(kind, spread, status, scale) {
  const { name, len, rad } = PROJECTILES[kind];
  const card = el("div", "weapon");
  const { cv, ctx } = realCanvas(len, scale);
  drawProjectile(ctx, { kind, len, rad, x: 0, y: 0, a: 0, spread });
  dashed(ctx, scale);
  capsule(ctx, len / 2 - rad, rad);
  ctx.stroke();
  const title = spread ? SPREADS[spread].name : name;
  card.append(cv, el("span", "name", title), el("span", "meta", `${len} × ${rad * 2} px, ${status}`));
  return card;
}

function toastCard(scale) {
  const card = el("div", "weapon");
  const { cv, ctx } = realCanvas(TOAST_W, scale);
  drawToast(ctx, { x: 0, y: 0, tilt: 0, thrust: 0.35 }, null);
  dashed(ctx, scale);
  ctx.beginPath();
  ctx.arc(0, 0, HIT_R, 0, Math.PI * 2);
  ctx.stroke();
  card.append(cv, el("span", "name", "Tartine"), el("span", "meta", `touchée dans un cercle de ${HIT_R * 2} px`));
  return card;
}

function weaponGroup(title, note, cards) {
  const section = el("section", "card");
  const grid = el("div", "gallery");
  grid.append(...cards);
  section.append(el("h2", null, title), el("p", "sub", note), grid);
  return section;
}

export function renderWeapons(root, { showLab = false } = {}) {
  const scale = gameScale();
  const kinds = Object.keys(PROJECTILES);
  const lab = kinds.filter((k) => PROJECTILES[k].lab);
  const groups = [
    weaponGroup("En jeu", `Taille réelle, comme dans le jeu sur cet écran (échelle × ${scale.toFixed(2).replace(".", ",")}). En pointillés jaunes : la zone de touche.`,
      [toastCard(scale), ...kinds.filter((k) => !PROJECTILES[k].lab).map((k) => weaponCard(k, null, "en jeu", scale))]),
    weaponGroup("Variantes rares", "Environ 1 attaque sur 40 : un seul de ses couteaux change de tartinade. Pur visuel, la zone de touche ne change pas.",
      Object.keys(SPREADS).filter((sp) => sp !== "butter").map((sp) => weaponCard("knife", sp, "rare", scale)))
  ];
  if (showLab && lab.length) {
    groups.push(weaponGroup("Prototypes", "Pas encore dans le jeu, visibles seulement sur les téléphones admin : à voir en mouvement dans l'onglet Attaques.",
      lab.map((k) => weaponCard(k, null, "prototype", scale))));
  }
  root.replaceChildren(...groups);
}

function progressionCard() {
  const speedEnd = (SPEED_MAX - 1) * SPEED_RAMP;
  const gapEnd = (GAP_START - GAP_MIN) / GAP_SLOPE;
  const steps = [];
  for (const a of ATTACKS.filter((x) => !x.lab)) steps.push([a.from, a.from ? "arrivée : " + a.name : a.name + " dès le début"]);
  for (const a of ATTACKS.filter((x) => !x.lab && x.growsUntil)) steps.push([a.growsUntil, a.growth]);
  steps.push([gapEnd, `rythme maximal : une attaque toutes les ${String(GAP_MIN).replace(".", ",")} s au plus vite`]);
  steps.push([speedEnd, `vitesse maximale : × ${num(SPEED_MAX)}`]);
  steps.sort((x, y) => x[0] - y[0]);
  const end = Math.max(...steps.map((x) => x[0]));
  const lastAttack = Math.max(...ATTACKS.filter((x) => !x.lab).map((x) => x.from));
  const section = el("section", "card");
  const list = el("ol", "timeline");
  for (const [t, text] of steps) {
    const li = el("li");
    li.append(el("span", "when", `${Math.round(t)} s`), el("span", null, text));
    list.append(li);
  }
  const verdict = el("p", "verdict", `Fin de la complexification : ${Math.round(end)} s. Dernière nouvelle attaque à ${lastAttack} s. Au-delà de ${Math.round(end)} s, plus rien ne change : même vitesse, même rythme, mêmes attaques.`);
  section.append(el("h2", null, "Progression"), verdict, list);
  return section;
}

function restart(p) {
  const t = Math.max(p.attack.from + 4, 20);
  const items = p.attack.make({ t, toast: { ...TOAST }, rng: Math.random, rnd, pick });
  p.pending = items.map((w) => ({ ...w, at: w.at - t }));
  p.obs = [];
  p.time = 0;
  p.idle = 0;
}

function step(p, dt) {
  p.time += dt;
  for (const o of p.obs) moveProjectile(o, dt);
  for (const w of p.pending) {
    if (p.time < w.at) continue;
    for (const o of w.obs) p.obs.push({ ...o });
  }
  p.pending = p.pending.filter((w) => p.time < w.at);
  p.obs = p.obs.filter((o) => o.x > -OUT && o.x < FW + OUT && o.y > -OUT && o.y < FH + OUT);
  if (!p.pending.length && !p.obs.length) p.idle += dt;
  if (p.idle > PREVIEW_PAUSE_S || p.time > PREVIEW_MAX_S) restart(p);
}

function draw(p, clock) {
  const { ctx, cv } = p;
  const k = cv.dpr * PREVIEW_SCALE;
  ctx.setTransform(cv.dpr, 0, 0, cv.dpr, 0, 0);
  ctx.fillStyle = PALETTE.void;
  ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(k, 0, 0, k, 0, 0);
  ctx.fillStyle = PALETTE.field;
  ctx.fillRect(0, 0, FW, FH);
  ctx.strokeStyle = PALETTE.frame;
  ctx.lineWidth = 3;
  ctx.strokeRect(0, 0, FW, FH);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, FW, FH);
  ctx.clip();
  for (const w of p.pending) drawWarn(ctx, w, clock);
  for (const o of p.obs) drawProjectile(ctx, o);
  drawToast(ctx, TOAST, null);
  ctx.restore();
}

function stat(label, value) {
  const row = el("div", "fact");
  row.append(el("span", "label", label), el("span", "value", value));
  return row;
}

export function renderAttacks(root, { showLab = false } = {}) {
  const live = ATTACKS.filter((a) => !a.lab && SAMPLE_T > a.from);
  const total = live.reduce((s, a) => s + a.weight, 0);
  previews.length = 0;
  const rules = el("section", "card");
  const list = el("ul", "rules");
  for (const text of [
    "Chaque attaque est vérifiée par le solveur avant d'être lancée : on peut toujours s'en sortir, même en ne bougeant que 0,1 s après l'annonce.",
    "Vitesse de tous les couverts : × (1 + temps / 50), au maximum × 2,6 à partir de 80 s.",
    "Jamais plus de 3 fois la même attaque d'affilée, et une attaque qui vient de sortir a deux fois moins de chances de ressortir. Les grosses figures (croix, couloir, double pluie) ne sortent jamais deux fois de suite.",
    "Dans les aperçus, la tartine reste immobile."
  ]) list.append(el("li", null, text));
  rules.append(el("h2", null, "Règles"), list);
  const cards = ATTACKS.filter((a) => showLab || !a.lab).map((attack) => {
    const card = el("section", "card attack");
    const head = el("div", "attack-head");
    head.append(el("h2", null, attack.name), el("span", attack.lab ? "badge lab" : "badge", attack.lab ? "Prototype" : "En jeu"));
    const body = el("div", "attack-body");
    const cv = canvas(FW * PREVIEW_SCALE, FH * PREVIEW_SCALE);
    const facts = el("div", "facts");
    facts.append(
      stat("Dès", attack.lab ? "pas en jeu" : `${attack.from} s`),
      stat(`Chance à ${SAMPLE_T} s`, attack.lab ? "-" : `${Math.round((100 * attack.weight) / total)} %`),
      stat("Vitesse de base", `${attack.speed} px/s`),
      stat("Pause après", `× ${num(attack.cost)}`)
    );
    const text = el("div", "attack-text");
    text.append(el("p", null, attack.info), facts);
    body.append(cv, text);
    card.append(head, body);
    const p = { attack, cv, ctx: cv.getContext("2d") };
    restart(p);
    previews.push(p);
    return card;
  });
  root.replaceChildren(progressionCard(), rules, ...cards);
}

export function animateAttacks(on) {
  if (on === running) return;
  running = on;
  if (!on) return;
  let last = performance.now(), clock = 0;
  const frame = (now) => {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    for (const p of previews) {
      step(p, dt);
      draw(p, clock);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
