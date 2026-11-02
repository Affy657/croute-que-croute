import { test } from "node:test";
import assert from "node:assert/strict";
import { countdown, champion, screenBanner, openOf, SOON_MS } from "../../public/js/shared/banner.js";
import { when } from "../../public/js/shared/format.js";

const MIN = 60e3, HOUR = 60 * MIN, START = new Date(2026, 10, 7, 21, 0).getTime(), END = START + 4 * HOUR, FINAL = END + 5 * MIN;
const event = (opensAt = START, closesAt = END, status = "closed") => ({ name: "Space Tartinade #3", opensAt, closesAt, finalAt: closesAt + 5 * MIN, status });
const board = ({ ev = event(), next = null, top = [{ pseudo: "Lou" }] } = {}) => ({ event: ev, next, eventTop: ev ? top : [], top: [{ pseudo: "Adrien" }] });

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

test("téléphone : pas de « Bravo » pendant les 5 min où les dernières parties comptent", () => {
  const b = board();
  assert.equal(champion(b, END + 2 * MIN), null);
  assert.equal(champion(b, FINAL - 1), null);
  assert.equal(champion(b, FINAL), "Lou");
});

test("téléphone : pas de « Bravo » sans personne au classement", () => {
  assert.equal(champion(board({ top: [] }), FINAL + HOUR), null);
});

test("téléphone : « Début dans » seulement moins de 24 h avant", () => {
  const next = event(FINAL + 2 * HOUR, FINAL + 6 * HOUR, "upcoming");
  assert.deepEqual(countdown(board({ next }), FINAL), { label: "Début dans ", target: next.opensAt });
  assert.equal(countdown(board({ next }), next.opensAt - SOON_MS), null);
});

test("écran pendant la soirée : « Fin dans »", () => {
  assert.deepEqual(screenBanner(board({ ev: event(START, END, "open") }), START + HOUR), { label: "Fin dans ", target: END });
});

test("écran juste après la fin : « Résultats dans » jusqu'au résultat", () => {
  assert.deepEqual(screenBanner(board(), END + MIN), { label: "Résultats dans ", target: FINAL });
  assert.deepEqual(screenBanner(board(), FINAL), { text: "Bravo Lou !" });
});

test("écran : la soirée suivante sous le top de l'ancienne s'annonce « Prochaine soirée dans »", () => {
  const next = event(FINAL + 2 * HOUR, FINAL + 6 * HOUR, "upcoming");
  assert.deepEqual(screenBanner(board({ next }), FINAL), { label: "Prochaine soirée dans ", target: next.opensAt });
  assert.deepEqual(screenBanner(board({ ev: null, next }), FINAL), { label: "Début dans ", target: next.opensAt });
});

test("écran : soirée suivante dans plus de 24 h, sa date en toutes lettres", () => {
  const next = event(FINAL + 2 * SOON_MS, FINAL + 2 * SOON_MS + HOUR, "upcoming");
  assert.deepEqual(screenBanner(board({ next }), FINAL), { text: "Prochaine soirée " + when(next.opensAt) });
});

test("écran resté hors ligne pendant la fin : « Résultats dans » à l'heure, puis le gagnant", () => {
  const b = board({ ev: event(START, END, "open") });
  assert.deepEqual(screenBanner(b, END + MIN), { label: "Résultats dans ", target: FINAL });
  assert.deepEqual(screenBanner(b, FINAL), { text: "Bravo Lou !" });
});

test("écran : rien à annoncer", () => {
  assert.equal(screenBanner(board({ ev: null }), FINAL), null);
  assert.equal(screenBanner(board({ top: [] }), FINAL), null);
});

test("téléphone et écran annoncent le gagnant au même moment", () => {
  for (const at of [END, END + MIN, FINAL - 1, FINAL, FINAL + 1, FINAL + HOUR]) {
    const b = board(), phone = champion(b, at), screen = screenBanner(b, at);
    assert.equal(!!phone, !!(screen && screen.text && screen.text.startsWith("Bravo")), new Date(at).toISOString());
  }
});
