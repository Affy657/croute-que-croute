import { store, KEYS } from "../shared/store.js";

export const OLD_HOST = "croute-que-croute.tartine-sauvage.workers.dev";
export const HOME = "https://croute-que-croute.tartinesauvage.fr";

/** @type {(keyof typeof KEYS)[]} */
const KEPT = ["localBest", "myBests", "musicOff", "sfxOff", "musicVolume", "sfxVolume", "installAsked", "achievements", "toppings", "topping", "outfitSeen", "outfitAt", "gear", "side", "bread", "aura", "quality", "sensitivity", "mouseAim"];

export const moved = () => location.hostname === OLD_HOST;

/** @param {string | null} code */
export function moveUrl(code) {
  /** @type {Record<string, string>} */
  const data = {};
  for (const name of KEPT) {
    const value = store.get(KEYS[name]);
    if (value !== null) data[KEYS[name]] = value;
  }
  return `${HOME}/#demenage=${encodeURIComponent(JSON.stringify({ code, data }))}`;
}
