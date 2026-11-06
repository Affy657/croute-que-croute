import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, champion, closing, lateFor, liveScreen, screenBanner, settleDue, openOf, SOON_MS } from "../../public/js/shared/banner.js";
import { when } from "../../public/js/shared/format.js";

const MIN = 60e3, HOUR = 60 * MIN, START = new Date(2026, 10, 7, 21, 0).getTime(), END = START + 4 * HOUR, FINAL = END + 15e3, SURE = FINAL + 12e3;
const event = (opensAt = START, closesAt = END, status = "closed") => ({ name: "Space Tartinade #3", opensAt, closesAt, finalAt: closesAt + 15e3, status });
const board = ({ ev = event(), next = null, top = [{ pseudo: "Lou" }], now = SURE } = {}) => ({ now, event: ev, next, eventTop: ev ? top : [], top: [{ pseudo: "Adrien" }] });
const screen = ({ ev = event(), next = null, top = [{ pseudo: "Lou" }], now = SURE } = {}) => ({ now, event: ev, next, top: ev ? top : [{ pseudo: "Adrien" }] });

test("date d'une soirée en toutes lettres", () => {
  assert.equal(when(START), "samedi 07/11 à 21h00");
});

test("téléphone : rien sans classement", () => {
  assert.equal(countdown(null, START), null);
  assert.equal(champion(null, START), null);
  assert.equal(openOf(undefined, START), null);
});

test("téléphone pendant la soirée : « Fin dans », pas de gagnant", () => {
  const b = board({ ev: event(START, END, "open") });
  assert.deepEqual(countdown(b, START + HOUR), { label: "Fin dans ", target: END });
  assert.equal(champion(b, START + HOUR), null);
});

test("téléphone : la soirée ouvre à l'heure pile et ferme à l'heure pile", () => {
  const b = board({ ev: null, next: event(START, END, "upcoming") });
  assert.equal(openOf(b, START - 1), null);
  assert.equal(openOf(b, START), b.next);
  assert.equal(openOf(b, END), null);
});

test("téléphone : soirée commencée avant que le classement suive, déjà comptée comme ouverte", () => {
  const b = board({ ev: null, next: event(START, END, "upcoming") });
  assert.deepEqual(countdown(b, START + MIN), { label: "Fin dans ", target: END });
});

test("téléphone : « Soirée finie ! » dès zéro, « Bravo » seulement avec un classement relu après les derniers scores", () => {
  const old = board({ ev: event(START, END, "open"), now: END - 5e3 });
  assert.equal(closing(old, END - 1), false);
  assert.equal(closing(old, END), true);
  assert.equal(champion(old, END + HOUR), null);
  const early = board({ now: SURE - 1 });
  assert.equal(champion(early, END + HOUR), null);
  assert.equal(closing(early, END + HOUR), true);
  const sure = board({ now: SURE });
  assert.equal(champion(sure, SURE), "Lou");
  assert.equal(closing(sure, SURE), false);
});

test("téléphone : partie finie après les 15 s de marge, hors soirée", () => {
  const b = board({ ev: event(START, END, "open"), now: END - 5e3 });
  assert.equal(lateFor(b, FINAL), false);
  assert.equal(lateFor(b, FINAL + 1), true);
  assert.equal(lateFor(board({ ev: null }), FINAL + 1), false);
  assert.equal(lateFor(null, FINAL + 1), false);
});

test("téléphone : pas de « Bravo » sans personne au classement", () => {
  assert.equal(champion(board({ top: [] }), END + HOUR), null);
});

test("téléphone : « Début dans » seulement moins de 24 h avant", () => {
  const next = event(END + 2 * HOUR, END + 6 * HOUR, "upcoming");
  assert.deepEqual(countdown(board({ next }), END), { label: "Début dans ", target: next.opensAt });
  assert.equal(countdown(board({ next }), next.opensAt - SOON_MS), null);
});

test("écran pendant la soirée : « Fin dans », en petit", () => {
  assert.deepEqual(screenBanner(screen({ ev: event(START, END, "open") }), START + HOUR), { label: "Fin dans ", target: END, final: false });
});

test("écran : les 15 dernières minutes, chrono en grand", () => {
  const s = screen({ ev: event(START, END, "open") });
  assert.equal(screenBanner(s, END - 15 * MIN - 1).final, false);
  assert.equal(screenBanner(s, END - 15 * MIN).final, true);
  assert.equal(screenBanner(s, END - 1).final, true);
});

test("écran : « Soirée finie ! » dès zéro, « Bravo » seulement avec un classement relu après les derniers scores", () => {
  const over = { text: "Soirée finie !", done: true };
  const old = screen({ ev: event(START, END, "open"), now: END - 5e3 });
  assert.equal(screenBanner(old, END - 1).label, "Fin dans ");
  assert.deepEqual(screenBanner(old, END), over);
  assert.deepEqual(screenBanner(old, SURE), over);
  assert.deepEqual(screenBanner(screen({ now: SURE - 1 }), END + HOUR), over);
  assert.deepEqual(screenBanner(screen({ now: SURE }), SURE), { text: "Bravo Lou !", win: true });
});

test("écran : relecture due au moment où les derniers scores sont sûrs, plus après", () => {
  const old = screen({ ev: event(START, END, "open"), now: END - 5e3 });
  assert.equal(settleDue(old, SURE - 1), false);
  assert.equal(settleDue(old, SURE), true);
  assert.equal(settleDue(screen({ now: SURE - 1 }), SURE + HOUR), true);
  assert.equal(settleDue(screen({ now: SURE }), SURE), false);
  assert.equal(settleDue(screen({ ev: null }), SURE), false);
});

test("écran : la soirée suivante sous le top de l'ancienne s'annonce « Prochaine soirée dans »", () => {
  const next = event(END + 2 * HOUR, END + 6 * HOUR, "upcoming");
  assert.deepEqual(screenBanner(screen({ next }), END), { label: "Prochaine soirée dans ", target: next.opensAt });
  assert.deepEqual(screenBanner(screen({ ev: null, next }), END), { label: "Début dans ", target: next.opensAt });
});

test("écran : soirée suivante dans plus de 24 h, sa date en toutes lettres", () => {
  const next = event(END + 2 * SOON_MS, END + 2 * SOON_MS + HOUR, "upcoming");
  assert.deepEqual(screenBanner(screen({ next }), END), { text: "Prochaine soirée " + when(next.opensAt) });
});

test("écran : rien à annoncer", () => {
  assert.equal(screenBanner(screen({ ev: null }), END), null);
  assert.equal(screenBanner(screen({ top: [] }), END), null);
  assert.deepEqual(screenBanner(screen({ top: [], now: END }), END), { text: "Soirée finie !", done: true });
});

test("écran : direct pendant la soirée et jusqu'à 1 min après les derniers scores, ou dans les 24 h avant", () => {
  const open = screen({ ev: event(START, END, "open") });
  assert.equal(liveScreen(open, START + HOUR), true);
  assert.equal(liveScreen(open, FINAL + MIN - 1), true);
  assert.equal(liveScreen(open, FINAL + MIN), false);
  const next = event(END + 2 * HOUR, END + 6 * HOUR, "upcoming");
  assert.equal(liveScreen(screen({ ev: null, next }), next.opensAt - SOON_MS + 1), true);
  assert.equal(liveScreen(screen({ ev: null, next }), next.opensAt - SOON_MS), false);
});
