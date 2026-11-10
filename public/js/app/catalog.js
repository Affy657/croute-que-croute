import { FW, FH, OUT, HIT_R, SPEED_UNTIL } from "../game/field.js";
import { PROJECTILES, moveProjectile } from "../game/projectiles.js";
import { ATTACKS } from "../game/attacks.js";
import { GAP_START, GAP_SLOPE, GAP_MIN } from "../game/sim.js";
import { PALETTE, SPREADS } from "../shared/palette.js";
import { drawTrail, drawProjectile, drawWarn, drawToast } from "./sprites.js";
import { MUSIC_CREDIT, SFX_CREDIT, previewSfx } from "./audio.js";

const SAMPLE_T = 60, PREVIEW_SCALE = 0.5, PREVIEW_MAX_S = 6, PREVIEW_PAUSE_S = 0.6;
const TOAST = { x: FW / 2, y: FH * 0.62, tilt: 0, thrust: 0.35 };
const TOAST_W = 52, CARD_H = 72;
const CLOSE_W = 120, CLOSE_ZOOM = 2.5, CLOSE_AT = 11;
const SCROLL = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
const CREW_URL = "https://www.instagram.com/collectif_tartine_sauvage/";
const DEV = { name: "Adrien Morand", url: "https://www.linkedin.com/in/adrien-morand/" };
const gameScale = () => Math.min(window.innerWidth / FW, window.innerHeight / FH);
const GAP_END = (GAP_START - GAP_MIN) / GAP_SLOPE;
/** @type {Rnd} */
const rnd = (a, b) => a + Math.random() * (b - a);
/** @type {PickOne} */
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
/** @type {Preview[]} */
const previews = [];
let running = false;

/** @type {MakeEl} */
export function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** @param {number} w @param {number} h */
export function canvas(w, h) {
  const c = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  c.style.width = w + "px";
  c.style.height = h + "px";
  c.dpr = dpr;
  return c;
}

/** @param {Ctx} ctx @param {Capsule} b */
function capsule(ctx, [ax, ay, bx, by, r]) {
  const a = Math.atan2(by - ay, bx - ax);
  ctx.arc(bx, by, r, a - Math.PI / 2, a + Math.PI / 2);
  ctx.arc(ax, ay, r, a + Math.PI / 2, a + Math.PI * 1.5);
  ctx.closePath();
}

/** @param {number} width @param {number} scale */
function realCanvas(width, scale) {
  const w = Math.max(120, Math.ceil(width * scale) + 24);
  const cv = canvas(w, CARD_H);
  const ctx = /** @type {Ctx} */ (cv.getContext("2d"));
  ctx.setTransform(cv.dpr * scale, 0, 0, cv.dpr * scale, (cv.dpr * w) / 2, (cv.dpr * CARD_H) / 2);
  return { cv, ctx };
}

/** @param {Ctx} ctx @param {number} scale @param {((c: Ctx) => void)[]} shapes */
function hitbox(ctx, scale, shapes) {
  const off = document.createElement("canvas");
  off.width = ctx.canvas.width;
  off.height = ctx.canvas.height;
  const o = /** @type {Ctx} */ (off.getContext("2d"));
  o.setTransform(ctx.getTransform());
  /** @type {[number, string, number[]][]} */
  const strokes = [[6, PALETTE.void, []], [2.4, PALETTE.mustard, [3, 3]]];
  for (const [width, color, dash] of strokes) {
    o.setLineDash(dash.map((d) => d / scale));
    o.lineWidth = width / scale;
    o.strokeStyle = color;
    for (const shape of shapes) {
      o.beginPath();
      shape(o);
      o.stroke();
    }
  }
  o.globalCompositeOperation = "destination-out";
  for (const shape of shapes) {
    o.beginPath();
    shape(o);
    o.fill();
  }
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(off, 0, 0);
  ctx.restore();
}

/** @param {string} kind @param {string | null} spread @param {string | null} status @param {number} scale */
function weaponCard(kind, spread, status, scale) {
  const { name, len, rad, parts } = PROJECTILES[kind];
  const card = el("div", "weapon");
  const { cv, ctx } = realCanvas(len, scale);
  drawProjectile(ctx, { kind, len, rad, x: 0, y: 0, a: 0, spread });
  hitbox(ctx, scale, parts.map((p) => (c) => capsule(c, p)));
  const title = spread ? SPREADS[spread].name : name;
  const size = `${len} × ${rad * 2} px`;
  card.append(cv, el("span", "name", title), el("span", "meta", status ? `${size}, ${status}` : size));
  return card;
}

/** @param {string} spread */
function spreadCard(spread) {
  const { len, rad } = PROJECTILES.knife;
  const card = el("div", "weapon");
  const cv = canvas(CLOSE_W, CARD_H);
  cv.className = "close-up";
  const ctx = /** @type {Ctx} */ (cv.getContext("2d"));
  const k = cv.dpr * CLOSE_ZOOM;
  ctx.setTransform(k, 0, 0, k, (cv.dpr * CLOSE_W) / 2, (cv.dpr * CARD_H) / 2);
  drawProjectile(ctx, { kind: "knife", len, rad, x: -CLOSE_AT, y: 0, a: 0, spread });
  card.append(cv, el("span", "name", SPREADS[spread].name));
  return card;
}

/** @param {number} scale */
function toastCard(scale) {
  const card = el("div", "weapon");
  const { cv, ctx } = realCanvas(TOAST_W, scale);
  drawToast(ctx, { x: 0, y: 0, tilt: 0, thrust: 0.35 }, null);
  hitbox(ctx, scale, [(c) => c.arc(0, 0, HIT_R, 0, Math.PI * 2)]);
  card.append(cv, el("span", "name", "Tartine"), el("span", "meta", `hitbox ronde de ${HIT_R * 2} px`));
  return card;
}

/** @param {string} title @param {string} note @param {Node[]} cards */
function weaponGroup(title, note, cards) {
  const section = el("section", "card");
  const grid = el("div", "gallery");
  grid.append(...cards);
  section.append(el("h2", null, title), el("p", "sub", note), grid);
  return section;
}

/** @param {Element} root @param {{ showLab?: boolean }} b */
export function renderWeapons(root, { showLab = false } = {}) {
  const scale = gameScale();
  const kinds = Object.keys(PROJECTILES);
  const lab = kinds.filter((k) => PROJECTILES[k].lab);
  const groups = [
    weaponGroup("Taille réelle", `À l'échelle de ton écran (× ${scale.toFixed(2).replace(".", ",")}). En pointillés jaunes : la hitbox.`,
      [toastCard(scale), ...kinds.filter((k) => !PROJECTILES[k].lab).map((k) => weaponCard(k, null, null, scale))]),
    weaponGroup("Variantes rares", "Une attaque à couteaux sur 10 cache un couteau avec une tartinade rare. Juste un skin : même hitbox.",
      Object.keys(SPREADS).filter((sp) => !SPREADS[sp].free).map(spreadCard))
  ];
  if (showLab && lab.length) {
    groups.push(weaponGroup("Prototypes", "Pas encore en jeu, visibles seulement par les admins. Tu peux les voir bouger dans l'onglet Attaques.",
      lab.map((k) => weaponCard(k, null, "prototype", scale))));
  }
  root.replaceChildren(...groups);
}

function progressionCard() {
  /** @type {Steps} */
  const steps = [];
  for (const a of ATTACKS.filter((x) => !x.lab && x.growsUntil)) steps.push(/** @type {Step} */ ([a.growsUntil, a.growth]));
  steps.push([GAP_END, "cadence max des attaques"]);
  steps.push([SPEED_UNTIL, "vitesse max des couverts"]);
  steps.sort((x, y) => x[0] - y[0]);
  const section = el("section", "card");
  const list = el("ol", "timeline");
  for (const [t, text] of steps) {
    const li = el("li");
    li.append(el("span", "when", `${Math.round(t)} s`), el("span", null, text));
    list.append(li);
  }
  section.append(el("h2", null, "Progression"), list);
  return section;
}

/** @param {Preview} p */
function restart(p) {
  const t = Math.max(p.attack.from + 4, 20);
  const items = p.attack.make({ t, toast: { ...TOAST }, rng: Math.random, rnd, pick });
  p.pending = items.map((w) => ({ ...w, at: w.at - t, born: w.notice ? Math.max(0, w.at - t - w.notice) : 0 }));
  p.obs = [];
  p.time = 0;
  p.idle = 0;
}

/** @param {Preview} p @param {number} dt */
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

/** @param {Preview} p @param {number} clock */
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
  for (const w of p.pending) drawWarn(ctx, w, clock, p.time);
  for (const o of p.obs) drawTrail(ctx, o);
  for (const o of p.obs) drawProjectile(ctx, o);
  drawToast(ctx, TOAST, null);
  ctx.restore();
}

/** @type {Steps} */
const OFTEN = [[0.2, "très souvent"], [0.1, "souvent"], [0.06, "parfois"], [0, "rarement"]];
/** @type {Steps} */
const SPEED = [[260, "très rapide"], [200, "rapide"], [140, "moyenne"], [0, "lente"]];
/** @type {Steps} */
const BREAK = [[1.75, "long"], [1.25, "moyen"], [0, "court"]];
/** @param {number} value @param {Steps} steps */
const level = (value, steps) => /** @type {Step} */ (steps.find(([min]) => value >= min))[1];

/** @param {string} label @param {string} value */
export function stat(label, value) {
  const row = el("div", "fact");
  row.append(el("span", "fact-label", label), el("span", "fact-value", value));
  return row;
}

function rulesCard() {
  const rules = el("section", "card");
  const list = el("ul", "rules");
  for (const text of [
    "Toujours esquivable : chaque attaque est testée avant de partir, même si tu réagis un dixième de seconde après l'alerte.",
    "Jamais plus de 3 fois la même attaque d'affilée, et celle qui vient de sortir revient moins souvent.",
    "Jamais deux murs à la suite : un mur ou des murs en série attendent que le mur d'avant ait quitté l'écran.",
    "Hachoir, croix et double pluie ne sortent jamais deux fois de suite.",
    "Jamais de hachoir juste après une pluie de fourchettes, une croix ou un mur, ni de croix juste après un hachoir ou un mur, ni de double pluie juste après une pluie.",
    "Après une double pluie ou un hachoir, pas de pluie de fourchettes ni de double pluie tant qu'ils ne sont pas à mi-chemin.",
    "Pluie en biais, couteau à pain et rouleau ne se suivent jamais.",
    "Juste après une pluie, un mur arrive toujours par un côté, jamais par le haut.",
    "Jamais plus de 2 rouleaux à l'écran, et jamais collés l'un à l'autre."
  ]) list.append(el("li", null, text));
  rules.append(el("h2", null, "Règles"), list);
  return rules;
}

/** @param {HTMLDetailsElement} card */
function openOnly(card) {
  if (card.open) return;
  const scroller = card.closest(".info-screen");
  const top = card.getBoundingClientRect().top;
  for (const other of /** @type {HTMLCollectionOf<HTMLDetailsElement>} */ (/** @type {HTMLElement} */ (card.parentElement).children)) if (other !== card && other.open) other.open = false;
  if (scroller) scroller.scrollTop += card.getBoundingClientRect().top - top;
}

/** @param {string} title @param {Element | null} tag @param {Node | (() => Node)} content */
export function fold(title, tag, content) {
  const card = el("details", "card fold");
  const head = el("summary", "fold-head");
  head.append(el("h2", null, title));
  if (tag) head.append(tag);
  card.append(head);
  let build = typeof content === "function" ? content : null;
  if (!build) card.append(/** @type {Node} */ (content));
  head.addEventListener("click", () => openOnly(card));
  card.addEventListener("toggle", () => {
    if (!card.open) return;
    if (build) {
      card.append(build());
      build = null;
    }
    card.scrollIntoView({ block: "nearest", behavior: SCROLL });
  });
  return card;
}

/** @param {Element} root @param {{ showLab?: boolean, onTrain?: ((a: Attack) => void) | null }} b */
export function renderAttacks(root, { showLab = false, onTrain = null } = {}) {
  const live = ATTACKS.filter((a) => !a.lab && SAMPLE_T > a.from);
  const total = live.reduce((s, a) => s + a.weight, 0);
  previews.length = 0;
  const cards = ATTACKS.filter((a) => showLab || !a.lab).map((attack) => {
    const body = el("div", "attack-body");
    const cv = canvas(FW * PREVIEW_SCALE, FH * PREVIEW_SCALE);
    const facts = el("div", "facts");
    facts.append(
      stat("Arrive", attack.lab ? "-" : attack.from ? `à ${attack.from} s` : "dès le début"),
      stat("Fréquence", attack.lab ? "-" : level(attack.weight / total, OFTEN)),
      stat("Vitesse", level(attack.speed, SPEED)),
      stat("Répit après", level(attack.cost, BREAK))
    );
    const text = el("div", "attack-text");
    text.append(el("p", null, attack.info), facts);
    if (onTrain) {
      const go = el("button", "ghost train", "S'entraîner");
      go.type = "button";
      go.addEventListener("click", () => onTrain(attack));
      text.append(go);
    }
    body.append(cv, text);
    const card = fold(attack.name, attack.lab ? el("span", "fold-tag lab", "Prototype") : el("span", "fold-tag", `${attack.from} s`), body);
    const p = /** @type {Preview} */ ({ attack, card, cv, ctx: cv.getContext("2d") });
    restart(p);
    card.addEventListener("toggle", () => {
      if (card.open) restart(p);
    });
    previews.push(p);
    return card;
  });
  root.replaceChildren(...cards, progressionCard(), rulesCard());
}

/** @param {string} title @param {string} text @param {string} href @param {string} label */
function credit(title, text, href, label) {
  const card = el("section", "card");
  const actions = el("div", "card-actions");
  const a = el("a", "ghost", label);
  a.href = href;
  a.target = "_blank";
  a.rel = "noopener";
  actions.append(a);
  card.append(el("h2", null, title), el("p", "sub", text), actions);
  return card;
}

const SFX_LABELS = { start: "Départ", near: "Frôlé", death: "Mort", record: "Record", first: "1re place" };

function sounds() {
  const card = credit("Bruitages", `Sons de ${SFX_CREDIT.name}. Touche un son pour l'écouter.`, SFX_CREDIT.url, `Voir ${SFX_CREDIT.name}`);
  const list = el("div", "card-actions pair sfx-list");
  list.append(...Object.entries(SFX_LABELS).map(([name, label]) => {
    const btn = el("button", "ghost", label);
    btn.type = "button";
    btn.addEventListener("click", () => previewSfx(name));
    return btn;
  }));
  /** @type {ChildNode} */ (card.lastChild).before(list);
  return card;
}

/** @param {Element} root */
export function renderCredits(root) {
  root.replaceChildren(
    credit("Collectif", "Tartine Sauvage, l'équipe derrière les soirées Space Tartinade", CREW_URL, "Suivre sur Instagram"),
    credit("Développeur", DEV.name, DEV.url, "Voir sur LinkedIn"),
    credit("Musique", `${MUSIC_CREDIT.title}, de ${MUSIC_CREDIT.artist}`, MUSIC_CREDIT.url, "Écouter sur Spotify"),
    sounds(),
    credit("Confidentialité", "Ce que le jeu garde sur toi, et comment le faire effacer.", "/confidentialite", "Lire")
  );
}

/** @param {boolean} on */
export function animateAttacks(on) {
  if (on === running) return;
  running = on;
  if (!on) return;
  let last = performance.now(), clock = 0;
  /** @param {number} now */
  const frame = (now) => {
    if (!running) return;
    if (!previews.some((p) => p.card.getClientRects().length)) {
      running = false;
      return;
    }
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    clock += dt;
    for (const p of previews) {
      if (!p.card.open) continue;
      step(p, dt);
      draw(p, clock);
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
