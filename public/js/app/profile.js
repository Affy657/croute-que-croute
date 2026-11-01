import { fmtCs, ord } from "../shared/format.js";
import { SLOTS, SPREADS, GEAR } from "../shared/palette.js";
import { store, KEYS } from "../shared/store.js";
import { call, canCompete, net, on, serverNow } from "./api.js";
import { drawToast } from "./sprites.js";
import { outfit, gearOwned, gearTotal, setOutfit } from "./gear.js";
import { chosen, owned, toppingList, addToppings, setTopping } from "./toppings.js";
import { progress, forSync, absorb } from "./achievements.js";

const SEND_MS = 1500, TOAST_SCALE = 1.8, TOAST_Y = 0.53, BAR_MIN = 6, PODIUM = 3, BLANK = " ", NONE = "-";
const SHELVES = [["head", "Chapeaux"], ["side", "Côtés"], ["bread", "Pains"], ["aura", "Auras"], ["spread", "Garnitures"]];
const $ = (id) => document.getElementById(id);
const wearable = (slot, kind) => (Object.hasOwn(GEAR, kind) && GEAR[kind].slot === slot ? kind : null);
const ui = { name: $("profileName"), since: $("profileSince"), last: $("profileLast"), canvas: $("profileToast"), ranks: $("profileRanks"), body: $("profileBody") };
const ctx = ui.canvas.getContext("2d");
const toast = { x: 0, y: 0, tilt: 0, thrust: 0.35, scars: [], spread: "butter", head: null, side: null, bread: null, aura: null };
let shown = null, sent = null, timer = null, ready = false;
const adopted = [];

const outfitAt = () => {
  const raw = store.get(KEYS.outfitAt);
  return raw === null ? -1 : Number(raw) || 0;
};

export const stampOutfit = () => store.set(KEYS.outfitAt, Math.round(serverNow()));
export const onAdopt = (fn) => adopted.push(fn);

export function adoptLook(look) {
  const at = look && Number.isInteger(look.at) ? look.at : 0;
  if (!look || at <= outfitAt()) return;
  setOutfit(look);
  setTopping(look.spread);
  store.set(KEYS.outfitAt, at);
  for (const fn of adopted) fn();
}

export function myLook() {
  const own = Object.fromEntries(Object.keys(SLOTS).map((slot) => [slot, gearOwned(slot).length]));
  return { ...outfit(), spread: chosen(), ach: progress().got, own: { ...own, spread: owned().length }, at: Math.max(0, outfitAt()) };
}

export function shareLook() {
  clearTimeout(timer);
  timer = setTimeout(() => {
    if (!canCompete()) return;
    const body = { look: myLook(), progress: { ...forSync(), toppings: toppingList() } }, key = net.board.me.id + JSON.stringify(body);
    if (key === sent) return;
    sent = key;
    call("PUT", "/api/me/look", body).then((r) => {
      if (!r || !r.progress) return;
      absorb(r.progress);
      addToppings(r.progress.toppings);
      adoptLook(r.look);
    }).catch(() => { if (sent === key) sent = null; });
  }, SEND_MS);
}

export function resync() {
  sent = null;
  shareLook();
}

on("board", () => {
  const me = net.board && net.board.me;
  if (me) adoptLook(me.look);
});

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function tile(label, value, ...subs) {
  const node = el("div", "tile");
  node.append(el("span", "tile-label", label), el("span", "tile-value", value));
  for (const sub of subs) node.append(el("span", "tile-sub", sub));
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

function rankBadge(label, best, rank, count) {
  const node = el("div", "rank" + (!best ? " empty" : rank && rank <= PODIUM ? " p" + rank : ""));
  const place = el("span", "rank-place", best && rank ? ord(rank) : NONE);
  if (best && rank) place.append(el("small", null, "/ " + count));
  node.append(place, el("span", "rank-time", best ? fmtCs(best) + " s" : NONE), el("span", "rank-label", label));
  return node;
}

function spark(records) {
  const top = Math.max(...records.map((r) => r.score), 1);
  const node = el("div", "spark");
  node.append(...records.map((r, i) => {
    const col = el("div", i === records.length - 1 ? "spark-col last" : "spark-col"), lane = el("div", "spark-lane"), bar = el("i");
    bar.style.height = Math.max(BAR_MIN, (r.score / top) * 100) + "%";
    lane.append(bar);
    col.append(lane, el("span", null, String(Math.floor(r.score / 100))));
    return col;
  }));
  return node;
}

function progression(c) {
  if (!c.records.length) return null;
  const of = (pc) => c.records.filter((r) => r.pc === pc);
  let pc = c.records[c.records.length - 1].pc, records = of(pc);
  if (records.length < 2) records = of((pc = !pc));
  if (records.length < 2) return null;
  const node = card("Progression", spark(records));
  node.firstChild.append(el("span", "card-tag", pc ? "PC" : "Mobile"));
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

const shelfTotal = (slot) => (slot === "spread" ? Object.keys(SPREADS).length : gearTotal(slot));

function showToast(on) {
  ready = on;
  ui.canvas.classList.toggle("off", !on);
}

function render(c) {
  ui.name.textContent = c.pseudo;
  ui.since.textContent = since(c.joinedAt);
  ui.last.textContent = c.lastAt ? "Dernière partie " + ago(c.now - c.lastAt) : "";
  ui.last.hidden = !c.lastAt;
  Object.assign(toast, { spread: "butter", head: null, side: null, bread: null, aura: null }, c.look ? { spread: Object.hasOwn(SPREADS, c.look.spread) ? c.look.spread : "butter", head: wearable("head", c.look.head), side: wearable("side", c.look.side), bread: wearable("bread", c.look.bread), aura: wearable("aura", c.look.aura) } : {});
  showToast(true);
  ui.ranks.replaceChildren(rankBadge("Mobile", c.best, c.rank, c.count), rankBadge("PC", c.pcBest, c.pcRank, c.pcCount));
  const cards = [
    card("Parties", tiles(
      tile("Jouées", String(c.runs)),
      tile("Temps de jeu", duration(c.played)),
      tile("Soirées", String(c.events)),
      tile("Meilleure place", c.eventBest ? ord(c.eventBest.place) : NONE),
      tile("Meilleur frôlé", c.combo ? "x" + c.combo : NONE)
    )),
    progression(c)
  ];
  if (c.look) {
    const shelves = SHELVES.map(([slot, label]) => tile(label, Math.min(c.look.own[slot] || 0, shelfTotal(slot)) + "/" + shelfTotal(slot)));
    cards.push(card("Collection", tiles(tile("Succès", Math.min(c.look.ach, progress().total) + "/" + progress().total), ...shelves)));
  }
  ui.body.replaceChildren(...cards.filter(Boolean));
}

function loading() {
  ui.since.textContent = BLANK;
  ui.last.textContent = BLANK;
  ui.last.hidden = false;
  showToast(false);
  ui.ranks.replaceChildren(el("div", "rank skeleton"), el("div", "rank skeleton"));
  ui.body.replaceChildren(el("section", "card skeleton"), el("section", "card skeleton"));
}

function failed(missing, id, pseudo) {
  ui.since.textContent = "";
  ui.last.hidden = true;
  ui.ranks.replaceChildren();
  const box = el("div", "profile-empty");
  box.append(el("p", "note", missing ? "Joueur introuvable" : "Hors ligne"));
  if (!missing) {
    const retry = el("button", "ghost", "Réessayer");
    retry.type = "button";
    retry.addEventListener("click", () => openCard(id, pseudo));
    box.append(retry);
  }
  ui.body.replaceChildren(box);
}

export async function openCard(id, pseudo) {
  shown = id;
  ui.name.textContent = pseudo || "";
  loading();
  try {
    const c = await call("GET", "/api/players/" + encodeURIComponent(id));
    if (shown === id) render(c);
  } catch (e) {
    if (shown === id) failed(e.status === 404, id, pseudo);
  }
}

export const closeCard = () => { shown = null; };

export function drawCard(clock) {
  if (!ready) return;
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
