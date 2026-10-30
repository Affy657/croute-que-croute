import { store, KEYS } from "../shared/store.js";
import { GEAR } from "../shared/palette.js";
import { ACHIEVEMENTS, has } from "./achievements.js";

const listeners = [];
const SOURCE = Object.fromEntries(ACHIEVEMENTS.filter((a) => a.gear).map((a) => [a.gear, a.id]));
const LOCAL = ["127.0.0.1", "localhost"].includes(location.hostname);
const ALL = LOCAL && new URLSearchParams(location.search).get("accessoires") === "tous";

export const gearUnlocked = (kind) => !!GEAR[kind] && (ALL || has(SOURCE[kind]));
export const gearOwned = () => Object.keys(GEAR).filter(gearUnlocked);
export const onGear = (fn) => listeners.push(fn);

export function chosenGear() {
  const kind = store.get(KEYS.gear);
  return gearUnlocked(kind) ? kind : null;
}

export function chooseGear(kind) {
  if (kind && !gearUnlocked(kind)) return;
  store.set(KEYS.gear, kind);
  for (const fn of listeners) fn(kind);
}

export function stepGear(dir) {
  const list = [null, ...gearOwned()], i = list.indexOf(chosenGear());
  chooseGear(list[(i + dir + list.length) % list.length]);
}
