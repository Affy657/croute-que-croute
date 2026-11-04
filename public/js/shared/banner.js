import { when } from "./format.js";

export const SOON_MS = 24 * 3600 * 1000;
export const FINAL_MS = 15 * 60 * 1000;
export const SETTLE_MS = 10000;
export const AFTER_MS = 60000;

/** @param {Slate | null} b @param {number} now */
export const openOf = (b, now) => (b && [b.event, b.next].find((e) => e && now >= e.opensAt && now < e.closesAt)) || null;

/** @param {Slate | null} b @param {number} now */
export function recentOf(b, now) {
  const e = b && b.event;
  return e && !openOf(b, now) && now >= e.closesAt ? e : null;
}

/** @param {Slate | null} b @param {number} now */
export function upcomingOf(b, now) {
  const e = b && b.next;
  return e && now < e.opensAt ? e : null;
}

/** @param {Slate | null} b @param {number} now */
export function countdown(b, now) {
  const open = openOf(b, now), next = upcomingOf(b, now);
  if (open) return { label: "Fin dans ", target: open.closesAt };
  if (next && next.opensAt - now < SOON_MS) return { label: "Début dans ", target: next.opensAt };
  return null;
}

/** @param {Slate} b @param {EventInfo} e */
const settled = (b, e) => b.now >= e.finalAt + SETTLE_MS;

/** @param {Board} b @param {number} now */
export function champion(b, now) {
  const e = recentOf(b, now);
  return e && settled(b, e) && b.eventTop[0] ? b.eventTop[0].pseudo : null;
}

/** @param {Board} b @param {number} now */
export function closing(b, now) {
  const e = recentOf(b, now);
  return !!e && !settled(b, e);
}

/** @param {Slate | null} b @param {number} now */
export const lateFor = (b, now) => !!(b && b.event && now > b.event.finalAt);

/** @param {ScreenBoard} b @param {number} now */
export function liveScreen(b, now) {
  const ev = b.event, next = b.next;
  return !!(ev && now < ev.finalAt + AFTER_MS) || !!(next && next.opensAt - now < SOON_MS);
}

/** @param {ScreenBoard} b @param {number} now */
export function screenBanner(b, now) {
  const ev = b.event, next = b.next;
  if (ev && now < ev.closesAt) return { label: "Fin dans ", target: ev.closesAt, final: ev.closesAt - now <= FINAL_MS };
  if (next && next.opensAt - now < SOON_MS) return { label: ev ? "Prochaine soirée dans " : "Début dans ", target: next.opensAt };
  if (next) return { text: "Prochaine soirée " + when(next.opensAt) };
  if (ev && b.top[0]) return { text: "Bravo " + b.top[0].pseudo + " !", win: true };
  return null;
}
