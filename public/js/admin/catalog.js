import { FW, FH, OUT } from "../game/field.js";
import { PROJECTILES, moveProjectile } from "../game/projectiles.js";
import { ATTACKS } from "../game/attacks.js";
import { PALETTE, SPREADS } from "../shared/palette.js";
import { drawProjectile, drawWarn, drawToast } from "../app/sprites.js";

const SAMPLE_T = 60, PREVIEW_SCALE = 0.5, PREVIEW_MAX_S = 6, PREVIEW_PAUSE_S = 0.6;
const TOAST = { x: FW / 2, y: FH * 0.62, tilt: 0, thrust: 0.35 };
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

function weaponCard(kind, spread, status) {
  const { name, len, rad } = PROJECTILES[kind];
  const card = el("div", "weapon");
  const cv = canvas(150, 76);
  const ctx = cv.getContext("2d");
  const scale = Math.min(1.8, 128 / len);
  ctx.setTransform(cv.dpr * scale, 0, 0, cv.dpr * scale, (cv.dpr * 150) / 2, (cv.dpr * 76) / 2);
  drawProjectile(ctx, { kind, len, rad, x: 0, y: 0, a: 0, spread });
  ctx.setLineDash([3 / scale, 3 / scale]);
  ctx.lineWidth = 1.2 / scale;
  ctx.strokeStyle = PALETTE.mustard;
  capsule(ctx, len / 2 - rad, rad);
  ctx.stroke();
  const title = spread ? SPREADS[spread].name : name;
  card.append(cv, el("span", "name", title), el("span", "meta", `${len} × ${rad * 2} px, ${status}`));
  return card;
}

function weaponGroup(title, note, cards) {
  const section = el("section", "card");
  const grid = el("div", "gallery");
  grid.append(...cards);
  section.append(el("h2", null, title), el("p", "sub", note), grid);
  return section;
}

export function renderWeapons(root) {
  const kinds = Object.keys(PROJECTILES);
  root.replaceChildren(
    weaponGroup("En jeu", "En pointillés jaunes : la zone de touche réelle.",
      kinds.filter((k) => !PROJECTILES[k].lab).map((k) => weaponCard(k, null, "en jeu"))),
    weaponGroup("Variantes rares", "Environ 1 couteau sur 25 change de tartinade. Pur visuel, la zone de touche ne change pas.",
      Object.keys(SPREADS).filter((s) => s !== "butter").map((s) => weaponCard("knife", s, "rare"))),
    weaponGroup("Prototypes", "Pas encore dans le jeu : à voir en mouvement dans l'onglet Attaques.",
      kinds.filter((k) => PROJECTILES[k].lab).map((k) => weaponCard(k, null, "prototype")))
  );
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

export function renderAttacks(root) {
  const live = ATTACKS.filter((a) => !a.lab && SAMPLE_T > a.from);
  const total = live.reduce((s, a) => s + a.weight, 0);
  previews.length = 0;
  const rules = el("section", "card");
  const list = el("ul", "rules");
  for (const text of [
    "Chaque attaque est vérifiée par le solveur avant d'être lancée : on peut toujours s'en sortir, même en ne bougeant que 0,1 s après l'annonce.",
    "Vitesse de tous les couverts : × (1 + temps / 50), au maximum × 2,6 à partir de 80 s.",
    "Jamais plus de 3 fois la même attaque d'affilée, et une attaque qui vient de sortir a deux fois moins de chances de ressortir.",
    "Dans les aperçus, la tartine reste immobile."
  ]) list.append(el("li", null, text));
  rules.append(el("h2", null, "Règles"), list);
  const cards = ATTACKS.map((attack) => {
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
  root.replaceChildren(rules, ...cards);
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
