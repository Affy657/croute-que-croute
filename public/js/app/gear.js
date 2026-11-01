import { store, KEYS } from "../shared/store.js";
import { GEAR, SLOTS } from "../shared/palette.js";
import { ACHIEVEMENTS, has } from "./achievements.js";
import { LOCAL } from "../shared/local.js";

const listeners = [];
const SOURCE = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.gear).map((a) => [a.gear, a.id]));
const ALL = LOCAL && new URLSearchParams(location.search).get("accessoires") === "tous";
const KEY = { head: KEYS.gear, side: KEYS.side, bread: KEYS.bread, aura: KEYS.aura };

if (store.get(KEYS.gear) === "boosters") {
  store.set(KEYS.side, "boosters");
  store.set(KEYS.gear, null);
}

export const gearUnlocked = (kind) => !!GEAR[kind] && (ALL || has(SOURCE[kind]));
export const gearOwned = (slot) => Object.keys(GEAR).filter((k) => GEAR[k].slot === slot && gearUnlocked(k));
export const gearTotal = (slot) => Object.values(GEAR).filter((g) => g.slot === slot).length;
export const onGear = (fn) => listeners.push(fn);

export function chosenGear(slot) {
  const kind = store.get(KEY[slot]);
  return gearUnlocked(kind) && GEAR[kind].slot === slot ? kind : null;
}

export const outfit = () => Object.fromEntries(Object.keys(SLOTS).map((slot) => [slot, chosenGear(slot)]));

export function chooseGear(slot, kind) {
  if (kind && (!gearUnlocked(kind) || GEAR[kind].slot !== slot)) return;
  store.set(KEY[slot], kind);
  for (const fn of listeners) fn(slot, kind);
}

export function stepGear(slot, dir) {
  const list = [null, ...gearOwned(slot)], i = list.indexOf(chosenGear(slot));
  chooseGear(slot, list[(i + dir + list.length) % list.length]);
}
