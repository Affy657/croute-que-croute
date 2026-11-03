import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, champion, screenBanner, openOf, SOON_MS } from "../../public/js/shared/banner.js";
import { when } from "../../public/js/shared/format.js";

const MIN = 60e3, HOUR = 60 * MIN, START = new Date(2026, 10, 7, 21, 0).getTime(), END = START + 4 * HOUR;
const event = (opensAt = START, closesAt = END, status = "closed") => ({ name: "Space Tartinade #3", opensAt, closesAt, finalAt: closesAt + 15e3, status });
const board = ({ ev = event(), next = null, top = [{ pseudo: "Lou" }] } = {}) => ({ event: ev, next, eventTop: ev ? top : [], top: [{ pseudo: "Adrien" }] });
const screen = ({ ev = event(), next = null, top = [{ pseudo: "Lou" }] } = {}) => ({ event: ev, next, top: ev ? top : [{ pseudo: "Adrien" }] });

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

test("téléphone : « Bravo » dès que le chrono est fini", () => {
  const b = board();
  assert.equal(champion(b, END - 1), null);
  assert.equal(champion(b, END), "Lou");
  assert.equal(champion(b, END + HOUR), "Lou");
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

test("écran : plus de « Résultats dans », le gagnant dès que le chrono est fini", () => {
  assert.deepEqual(screenBanner(screen(), END), { text: "Bravo Lou !", win: true });
  assert.deepEqual(screenBanner(screen(), END + 10e3), { text: "Bravo Lou !", win: true });
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

test("écran resté hors ligne pendant la fin : le gagnant à l'heure", () => {
  const s = screen({ ev: event(START, END, "open") });
  assert.equal(screenBanner(s, END - 1).label, "Fin dans ");
  assert.deepEqual(screenBanner(s, END), { text: "Bravo Lou !", win: true });
});

test("écran : rien à annoncer", () => {
  assert.equal(screenBanner(screen({ ev: null }), END), null);
  assert.equal(screenBanner(screen({ top: [] }), END), null);
});

test("téléphone et écran annoncent le gagnant au même moment", () => {
  for (const at of [END - 1, END, END + 1, END + 15e3, END + HOUR]) {
    const phone = champion(board(), at), shown = screenBanner(screen(), at);
    assert.equal(!!phone, !!(shown && shown.win), new Date(at).toISOString());
  }
});
