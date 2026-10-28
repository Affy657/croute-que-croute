import { store, KEYS } from "../shared/store.js";

let deferred = null;
const listeners = [];

const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const ios = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function changed() {
  for (const fn of listeners) fn();
}

export function installMode() {
  if (standalone()) return "installed";
  if (deferred) return "prompt";
  return ios() ? "ios" : "menu";
}

export async function promptInstall() {
  if (!deferred) return false;
  const e = deferred;
  deferred = null;
  e.prompt();
  const choice = await e.userChoice.catch(() => null);
  changed();
  return !!choice && choice.outcome === "accepted";
}

export function shouldSuggest() {
  const mode = installMode();
  return !store.get(KEYS.installAsked) && (mode === "prompt" || mode === "ios");
}

export const markSuggested = () => store.set(KEYS.installAsked, 1);

export function onInstallChange(fn) {
  listeners.push(fn);
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferred = e;
  changed();
});

window.addEventListener("appinstalled", () => {
  deferred = null;
  changed();
});
