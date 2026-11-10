import { store, KEYS } from "../shared/store.js";
import { GEAR, SLOTS } from "../shared/palette.js";
import { ACHIEVEMENTS, has } from "./achievements.js";
import { LOCAL } from "../shared/local.js";
import { own } from "./art/kit.js";

/** @type {GearListener[]} */
const listeners = [];
const SOURCE = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.gear).map((a) => [a.gear, a.id]));
const ALL = LOCAL && new URLSearchParams(location.search).get("accessoires") === "tous";
/** @type {Record<string, string>} */
const KEY = { head: KEYS.gear, side: KEYS.side, bread: KEYS.bread, aura: KEYS.aura };

if (store.get(KEYS.gear) === "boosters") {
  store.set(KEYS.side, "boosters");
  store.set(KEYS.gear, null);
}

/** @param {string} kind */
export const gearUnlocked = (kind) => !!GEAR[kind] && (ALL || has(SOURCE[kind]));
/** @param {string} slot */
export const gearOwned = (slot) => Object.keys(GEAR).filter((k) => GEAR[k].slot === slot && gearUnlocked(k));
/** @param {string} slot */
export const gearTotal = (slot) => Object.values(GEAR).filter((g) => g.slot === slot).length;
/** @param {GearListener} fn */
export const onGear = (fn) => listeners.push(fn);

/** @param {string} slot */
export function chosenGear(slot) {
  const kind = /** @type {string} */ (store.get(KEY[slot]));
  return gearUnlocked(kind) && GEAR[kind].slot === slot ? kind : null;
}

export const outfit = () => Object.fromEntries(Object.keys(SLOTS).map((slot) => [slot, chosenGear(slot)]));

/** @param {string} slot */
function keptGear(slot) {
  const kind = store.get(KEY[slot]);
  return own(GEAR, kind)?.slot === slot ? kind : null;
}

export const keptOutfit = () => Object.fromEntries(Object.keys(SLOTS).map((slot) => [slot, keptGear(slot)]));

/** @param {string} slot @param {string | null} kind */
export function chooseGear(slot, kind) {
  if (kind && (!gearUnlocked(kind) || GEAR[kind].slot !== slot)) return;
  store.set(KEY[slot], kind);
  for (const fn of listeners) fn(slot, kind);
}

/** @param {Worn} look */
export function setOutfit(look) {
  for (const slot of /** @type {(keyof Worn)[]} */ (Object.keys(KEY))) store.set(KEY[slot], own(GEAR, look[slot])?.slot === slot ? look[slot] : null);
}

/** @param {string} slot @param {number} dir */
export function stepGear(slot, dir) {
  const list = [null, ...gearOwned(slot)], i = list.indexOf(chosenGear(slot));
  chooseGear(slot, list[(i + dir + list.length) % list.length]);
}
