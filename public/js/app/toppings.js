import { store, KEYS } from "../shared/store.js";
import { SPREADS } from "../shared/palette.js";

const listeners = [];
const LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname);

if (LOCAL && new URLSearchParams(location.search).get("garnitures") === "toutes") {
  store.set(KEYS.toppings, JSON.stringify(Object.keys(SPREADS).filter((k) => k !== "butter")));
}

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
export const owned = () => Object.keys(SPREADS).filter(unlocked);

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

export function stepTopping(dir) {
  const list = owned(), i = list.indexOf(chosen());
  chooseTopping(list[(i + dir + list.length) % list.length]);
}

