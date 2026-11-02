import { when } from "./format.js";

export const SOON_MS = 24 * 3600 * 1000;

export const openOf = (b, now) => (b && [b.event, b.next].find((e) => e && now >= e.opensAt && now < e.closesAt)) || null;

export function recentOf(b, now) {
  const e = b && b.event;
  return e && !openOf(b, now) && now >= e.closesAt ? e : null;
}

export function upcomingOf(b, now) {
  const e = b && b.next;
  return e && now < e.opensAt ? e : null;
}

export function countdown(b, now) {
  const open = openOf(b, now), next = upcomingOf(b, now);
  if (open) return { label: "Fin dans ", target: open.closesAt };
  if (next && next.opensAt - now < SOON_MS) return { label: "Début dans ", target: next.opensAt };
  return null;
}

export function champion(b, now) {
  const e = recentOf(b, now);
  return e && now >= e.finalAt && b.eventTop[0] ? b.eventTop[0].pseudo : null;
}

export function screenBanner(b, now) {
  const ev = b.event, next = b.next, top = ev ? b.eventTop : b.top;
  if (ev && now < ev.closesAt) return { label: "Fin dans ", target: ev.closesAt };
  if (ev && now < ev.finalAt) return { label: "Résultats dans ", target: ev.finalAt };
  if (next && next.opensAt - now < SOON_MS) return { label: ev ? "Prochaine soirée dans " : "Début dans ", target: next.opensAt };
  if (next) return { text: "Prochaine soirée " + when(next.opensAt) };
  if (ev && top[0]) return { text: "Bravo " + top[0].pseudo + " !" };
  return null;
}
