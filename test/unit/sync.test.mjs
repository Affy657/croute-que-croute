import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { KEYS } from "../../public/js/shared/store.js";

const P = await import("../../public/js/app/profile.js");
const { outfit } = await import("../../public/js/app/gear.js");
const { onTopping, addToppings } = await import("../../public/js/app/toppings.js");
const { absorb } = await import("../../public/js/app/achievements.js");

const ACCOUNT = { head: "crown", side: "sixseven", bread: "toasted", aura: "ring", spread: "choco", ach: 30, own: {}, at: 0 };
const KEY = { head: KEYS.gear, side: KEYS.side, bread: KEYS.bread, aura: KEYS.aura, spread: KEYS.topping };
const worn = () => Object.fromEntries(Object.entries(KEY).map(([slot, k]) => [slot, localStorage.getItem(k)]));
let adopted = 0;
P.onAdopt(() => adopted++);

test("appareil neuf : envoie une tenue datée de 0, jamais plus récente que celle du compte", () => {
  assert.equal(P.myLook().at, 0);
});

test("appareil neuf : prend la tenue du compte, même sans date", () => {
  P.adoptLook(ACCOUNT);
  assert.deepEqual(worn(), { head: "crown", side: "sixseven", bread: "toasted", aura: "ring", spread: "choco" });
  assert.equal(localStorage.getItem(KEYS.outfitAt), "0");
  assert.equal(adopted, 1);
});

test("objet pas encore gagné sur cet appareil : porté dès que les succès arrivent", () => {
  assert.equal(outfit().head, null);
  absorb({ got: { eventWin: 5, sixSeven: 5, toaster: 5, allSky: 5 } });
  assert.deepEqual(outfit(), { head: "crown", side: "sixseven", bread: "toasted", aura: "ring" });
});

test("même tenue renvoyée : rien ne change", () => {
  P.adoptLook({ ...ACCOUNT });
  assert.equal(adopted, 1);
});

test("tenue plus récente d'un autre appareil : prise ; plus ancienne : ignorée", () => {
  P.adoptLook({ ...ACCOUNT, head: "witch", at: 5000 });
  assert.equal(worn().head, "witch");
  P.adoptLook({ ...ACCOUNT, head: "pirate", at: 4000 });
  assert.equal(worn().head, "witch");
  assert.equal(adopted, 2);
});

test("changement fait sur cet appareil : daté, il gagne contre la tenue du compte plus ancienne", () => {
  P.stampOutfit();
  const at = Number(localStorage.getItem(KEYS.outfitAt));
  assert.ok(Math.abs(at - Date.now()) < 5000);
  assert.equal(P.myLook().at, at);
  P.adoptLook({ ...ACCOUNT, head: "pirate", at: at - 1 });
  assert.equal(worn().head, "witch");
});

test("objets inventés ou au mauvais emplacement : retirés", () => {
  P.adoptLook({ head: "constructor", side: "crown", bread: "__proto__", aura: "ring", spread: "toString", at: Date.now() + 1e6 });
  assert.deepEqual(worn(), { head: null, side: null, bread: null, aura: "ring", spread: null });
});

test("rien à prendre sans tenue", () => {
  const before = adopted;
  P.adoptLook(null);
  P.adoptLook(undefined);
  assert.equal(adopted, before);
});

test("garnitures reçues du serveur : signalées comme synchronisées, pour ne pas dater la tenue", () => {
  const heard = [];
  onTopping((kind, synced) => heard.push(synced));
  addToppings(["jam"]);
  assert.deepEqual(heard, [true]);
});
