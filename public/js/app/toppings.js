import { store, KEYS } from "../shared/store.js";
import { SPREADS } from "../shared/palette.js";
import { LOCAL } from "../shared/local.js";
import { own } from "./art/kit.js";

/** @type {SpreadListener[]} */
const listeners = [];

if (LOCAL && new URLSearchParams(location.search).get("garnitures") === "toutes") {
  store.set(KEYS.toppings, JSON.stringify(Object.keys(SPREADS).filter((k) => !SPREADS[k].free)));
}

function load() {
  try {
    const list = JSON.parse(store.get(KEYS.toppings) || "[]");
    return Array.isArray(list) ? list.filter((k) => SPREADS[k]) : [];
  } catch (e) {
    return [];
  }
}

/** @param {string} kind */
export const unlocked = (kind) => !!(SPREADS[kind] && SPREADS[kind].free) || load().includes(kind);
/** @param {SpreadListener} fn */
export const onTopping = (fn) => listeners.push(fn);
export const owned = () => Object.keys(SPREADS).filter(unlocked);

export function chosen() {
  const kind = store.get(KEYS.topping);
  return kind && SPREADS[kind] && unlocked(kind) ? kind : "butter";
}

/** @param {string} kind */
export function unlockTopping(kind) {
  if (!SPREADS[kind] || unlocked(kind)) return false;
  store.set(KEYS.toppings, JSON.stringify([...load(), kind]));
  return true;
}

export const toppingList = () => load();

/** @param {string[]} [list] */
export function addToppings(list) {
  const mine = load(), more = (Array.isArray(list) ? list : []).filter((k) => SPREADS[k] && !SPREADS[k].free && !mine.includes(k));
  if (!more.length) return;
  store.set(KEYS.toppings, JSON.stringify([...new Set([...mine, ...more])]));
  for (const fn of listeners) fn(chosen(), true);
}

/** @param {string} kind */
export const setTopping = (kind) => store.set(KEYS.topping, own(SPREADS, kind) ? kind : null);

/** @param {string} kind */
export function chooseTopping(kind) {
  if (!unlocked(kind)) return;
  store.set(KEYS.topping, kind);
  for (const fn of listeners) fn(kind);
}

/** @param {number} dir */
export function stepTopping(dir) {
  const list = owned(), i = list.indexOf(chosen());
  chooseTopping(list[(i + dir + list.length) % list.length]);
}

