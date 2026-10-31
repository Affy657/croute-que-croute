import { fmtCs, ord } from "../shared/format.js";
import { SLOTS, SPREADS } from "../shared/palette.js";
import { call, canCompete } from "./api.js";
import { drawToast } from "./sprites.js";
import { outfit, gearOwned, gearTotal } from "./gear.js";
import { chosen, owned } from "./toppings.js";
import { progress } from "./achievements.js";

const SEND_MS = 1500, TOAST_SCALE = 2.2, TOAST_Y = 0.58, BAR_MIN = 6;
const SHELVES = [["head", "Chapeaux"], ["side", "Côtés"], ["bread", "Pains"], ["spread", "Garnitures"]];
const $ = (id) => document.getElementById(id);
const ui = { name: $("profileName"), since: $("profileSince"), last: $("profileLast"), canvas: $("profileToast"), body: $("profileBody") };
const ctx = ui.canvas.getContext("2d");
const toast = { x: 0, y: 0, tilt: 0, thrust: 0.35, scars: [], spread: "butter", head: null, side: null, bread: null };
let shown = null, sent = null, timer = null;

export function myLook() {
  const own = Object.fromEntries(Object.keys(SLOTS).map((slot) => [slot, gearOwned(slot).length]));
  return { ...outfit(), spread: chosen(), ach: progress().got, own: { ...own, spread: owned().length } };
}

export function shareLook() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!canCompete()) return;
    const look = myLook(), key = JSON.stringify(look);
    if (key === sent) return;
    sent = key;
    call("PUT", "/api/me/look", { look }).catch(() => { if (sent === key) sent = null; });
  }, SEND_MS);
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function tile(label, value, sub) {
  const node = el("div", "tile");
  node.append(el("span", "tile-label", label), el("span", "tile-value", value));
  if (sub) node.append(el("span", "tile-sub", sub));
  return node;
}

function card(title, ...children) {
  const node = el("section", "card");
  node.append(el("h2", null, title), ...children);
  return node;
}

function tiles(...list) {
  const node = el("div", "tiles");
  node.append(...list.filter(Boolean));
  return node;
}

function spark(recent) {
  const top = Math.max(...recent.map((r) => r.score), 1);
  const node = el("div", "spark");
  node.append(...recent.map((r) => {
    const col = el("div", "spark-col"), lane = el("div", "spark-lane"), bar = el("i");
    bar.style.height = Math.max(BAR_MIN, (r.score / top) * 100) + "%";
    lane.append(bar);
    col.append(lane, el("span", null, String(Math.floor(r.score / 100))));
    return col;
  }));
  return node;
}

function duration(cs) {
  const s = Math.round(cs / 100), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h ? h + " h " + String(m).padStart(2, "0") : m ? m + " min" : s + " s";
}

function ago(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return "il y a " + m + " min";
  const h = Math.floor(m / 60);
  return h < 24 ? "il y a " + h + " h" : "il y a " + Math.floor(h / 24) + " j";
}

function since(ms) {
  const d = new Date(ms), year = d.getFullYear() !== new Date().getFullYear();
  return "Depuis le " + d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: year ? "numeric" : undefined });
}

const place = (rank, count) => (rank ? ord(rank) + " / " + count : "");
const shelfTotal = (slot) => (slot === "spread" ? Object.keys(SPREADS).length : gearTotal(slot));

function render(c) {
  ui.name.textContent = c.pseudo;
  ui.since.textContent = since(c.joinedAt);
  ui.last.textContent = c.lastAt ? "Dernière partie " + ago(c.now - c.lastAt) : "";
  ui.last.hidden = !c.lastAt;
  Object.assign(toast, { spread: "butter", head: null, side: null, bread: null }, c.look ? { spread: c.look.spread || "butter", head: c.look.head, side: c.look.side, bread: c.look.bread } : {});
  ui.canvas.hidden = false;
  const records = c.best || c.pcBest
    ? tiles(c.best ? tile("Mobile", fmtCs(c.best) + " s", place(c.rank, c.count)) : null, c.pcBest ? tile("PC", fmtCs(c.pcBest) + " s", place(c.pcRank, c.pcCount)) : null)
    : el("p", "sub", "Pas encore de record");
  const cards = [
    card("Records", records),
    card("Parties", tiles(tile("Parties", String(c.runs)), tile("Temps joué", duration(c.played)))),
    c.recent.length > 1 ? card("Progression", spark(c.recent)) : null,
    card("Soirées", tiles(tile("Soirées", String(c.events)), c.eventBest ? tile("Meilleure place", ord(c.eventBest.place), c.eventBest.name) : null))
  ];
  if (c.look) {
    const shelves = SHELVES.map(([slot, label]) => tile(label, Math.min(c.look.own[slot], shelfTotal(slot)) + "/" + shelfTotal(slot)));
    cards.push(card("Collection", tiles(tile("Succès", Math.min(c.look.ach, progress().total) + "/" + progress().total), ...shelves)));
  }
  ui.body.replaceChildren(...cards.filter(Boolean));
}

export async function openCard(id, pseudo) {
  shown = id;
  ui.name.textContent = pseudo || "";
  ui.since.textContent = "";
  ui.last.hidden = true;
  ui.canvas.hidden = true;
  ui.body.replaceChildren(el("p", "note", "Chargement…"));
  try {
    const c = await call("GET", "/api/players/" + encodeURIComponent(id));
    if (shown === id) render(c);
  } catch (e) {
    if (shown === id) ui.body.replaceChildren(el("p", "note", e.status === 404 ? "Joueur introuvable" : "Hors ligne"));
  }
}

export const closeCard = () => { shown = null; };

export function drawCard(clock) {
  if (ui.canvas.hidden) return;
  const { width, height } = ui.canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
  if (!width) return;
  const w = Math.round(width * dpr), h = Math.round(height * dpr);
  if (ui.canvas.width !== w || ui.canvas.height !== h) {
    ui.canvas.width = w;
    ui.canvas.height = h;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  ctx.setTransform(dpr * TOAST_SCALE, 0, 0, dpr * TOAST_SCALE, w / 2, h * TOAST_Y);
  Object.assign(toast, { y: Math.sin(clock * 2.2) * 3, tilt: Math.sin(clock * 1.3) * 0.08 });
  drawToast(ctx, toast, null);
}
