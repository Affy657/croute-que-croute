import { store, KEYS } from "../shared/store.js";
import { SPREADS } from "../shared/palette.js";
import { drawToast } from "./sprites.js";

const THUMB = 64, THUMB_SCALE = 0.95, THUMB_MID = 7.5, LOCKED = "#4a4385";

const listeners = [];

function load() {
  try {
    const list = JSON.parse(store.get(KEYS.toppings) || "[]");
    return Array.isArray(list) ? list.filter((k) => SPREADS[k]) : [];
  } catch (e) {
    return [];
  }
}

export const unlocked = (kind) => kind === "butter" || load().includes(kind);
export const onTopping = (fn) => listeners.push(fn);

export function chosen() {
  const kind = store.get(KEYS.topping);
  return kind && SPREADS[kind] && unlocked(kind) ? kind : "butter";
}

export function unlockTopping(kind) {
  if (!SPREADS[kind] || unlocked(kind)) return false;
  store.set(KEYS.toppings, JSON.stringify([...load(), kind]));
  return true;
}

export function chooseTopping(kind) {
  if (!unlocked(kind)) return;
  store.set(KEYS.topping, kind);
  for (const fn of listeners) fn(kind);
}

function thumb(kind, got) {
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5), size = Math.round(THUMB * dpr);
  canvas.width = canvas.height = size;
  canvas.className = "thumb";
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr * THUMB_SCALE, 0, 0, dpr * THUMB_SCALE, size / 2, size / 2 - THUMB_MID * THUMB_SCALE * dpr);
  drawToast(ctx, { x: 0, y: 0, tilt: 0, thrust: 0, scars: [], spread: kind }, null);
  if (!got) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = "source-atop";
    ctx.fillStyle = LOCKED;
    ctx.fillRect(0, 0, size, size);
  }
  return canvas;
}

export function renderToppings() {
  const card = document.createElement("section");
  card.className = "card";
  const title = document.createElement("h2");
  title.textContent = "Garnitures";
  const hint = document.createElement("p");
  hint.className = "sub";
  hint.textContent = "Frôle un couteau garni ou fais-toi tartiner par lui pour gagner sa garniture.";
  const grid = document.createElement("div");
  grid.className = "toppings";
  const pick = chosen();
  for (const [kind, spread] of Object.entries(SPREADS)) {
    const got = unlocked(kind);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "topping" + (got ? "" : " locked") + (kind === pick ? " picked" : "");
    button.disabled = !got;
    button.setAttribute("aria-pressed", String(kind === pick));
    const name = document.createElement("span");
    name.textContent = got ? spread.name : "???";
    button.append(thumb(kind, got), name);
    button.addEventListener("click", () => {
      chooseTopping(kind);
      card.replaceWith(renderToppings());
    });
    grid.append(button);
  }
  card.append(title, hint, grid);
  return card;
}
