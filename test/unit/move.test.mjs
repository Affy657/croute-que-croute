import "./env.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test, mock } from "node:test";

const sessionItems = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (sessionItems.has(k) ? sessionItems.get(k) : null),
  setItem: (k, v) => sessionItems.set(k, String(v)),
  removeItem: (k) => sessionItems.delete(k)
};
let cleaned = 0;
globalThis.history = { replaceState: () => { cleaned++; } };
mock.timers.enable({ apis: ["setTimeout"] });

const { moveUrl, moved, OLD_HOST, HOME } = await import("../../public/js/app/move.js");
const arrive = new Function(readFileSync(new URL("../../public/js/arrive.js", import.meta.url), "utf8"));
const OLD = "https://" + OLD_HOST;
const flush = async () => {
  for (let i = 0; i < 6; i++) await new Promise(setImmediate);
};

let asked = [], reply = async () => ({ type: "opaque" }), went = [], page = {};
globalThis.fetch = (url, opts) => {
  asked.push({ url, opts });
  return reply(opts);
};
location.replace = (url) => went.push(url);
document.getElementById = (id) => page[id] || {};

function reset() {
  localStorage.clear();
  sessionItems.clear();
  cleaned = 0;
}

function newcomer() {
  reset();
  asked = [];
  went = [];
  page = {};
  reply = async () => ({ type: "opaque" });
  location.hash = "";
  location.hostname = new URL(HOME).hostname;
  document.activeElement = null;
  delete navigator.standalone;
  delete window.matchMedia;
}

function land(url) {
  location.hash = url.slice(url.indexOf("#"));
  location.pathname = "/";
  arrive();
}

test("déménagement : seule l'ancienne adresse renvoie vers la nouvelle", () => {
  location.hostname = OLD_HOST;
  assert.equal(moved(), true);
  location.hostname = new URL(HOME).hostname;
  assert.equal(moved(), false);
  location.hostname = "test.invalid";
});

test("déménagement : le lien garde succès et réglages, jamais la clé", () => {
  reset();
  localStorage.setItem("cv-token", "secret");
  localStorage.setItem("cv-client", "appareil");
  localStorage.setItem("cv-succes", '{"got":{"zen":1}}');
  localStorage.setItem("cv-sensibilite", "2.2");
  const url = moveUrl("ABCD2345");
  assert.ok(url.startsWith(HOME + "/#demenage="));
  assert.ok(!url.includes("secret") && !url.includes("appareil"));
  localStorage.clear();
  land(url);
  assert.equal(localStorage.getItem("cv-succes"), '{"got":{"zen":1}}');
  assert.equal(localStorage.getItem("cv-sensibilite"), "2.2");
  assert.equal(localStorage.getItem("cv-token"), null);
  assert.equal(sessionStorage.getItem("cv-arrivee"), "ABCD2345");
  assert.equal(cleaned, 1);
});

test("nouvelle adresse : ancienne joignable, un visiteur sans compte y passe une seule fois", async () => {
  newcomer();
  arrive();
  await flush();
  arrive();
  await flush();
  assert.deepEqual(went, [OLD + "/depart"]);
  assert.equal(asked.length, 1);
  assert.equal(asked[0].url, OLD + "/manifest.webmanifest");
  assert.equal(asked[0].opts.mode, "no-cors");
  assert.equal(asked[0].opts.cache, "no-store");
  assert.equal(localStorage.getItem("cv-sonde"), "1");
});

test("politique de sécurité : la sonde peut joindre l'ancienne adresse, sinon aucun ancien joueur ne serait reconnu", () => {
  const allowed = readFileSync("public/_headers", "utf8").match(/connect-src ([^;]+);/)[1].split(" ");
  assert.ok(allowed.includes(OLD));
  assert.ok(allowed.includes(HOME));
});

test("nouvelle adresse : pas de sonde avec une clé, un lien de liaison, ou sur une autre adresse", async () => {
  newcomer();
  localStorage.setItem("cv-token", "deja");
  arrive();
  newcomer();
  location.hash = "#lier=ABCD2345";
  arrive();
  newcomer();
  location.hostname = "test.invalid";
  arrive();
  await flush();
  assert.deepEqual(asked, []);
  assert.deepEqual(went, []);
});

test("nouvelle adresse : ancienne injoignable, le joueur reste, sans cv-sonde, et le chargement suivant retente", async () => {
  newcomer();
  reply = async () => { throw new TypeError("Failed to fetch"); };
  arrive();
  await flush();
  assert.deepEqual(went, []);
  assert.equal(localStorage.getItem("cv-sonde"), null);
  assert.equal(localStorage.getItem("cv-sonde-essais"), null);
  reply = async () => ({ type: "opaque" });
  arrive();
  await flush();
  assert.equal(asked.length, 2);
  assert.deepEqual(went, [OLD + "/depart"]);
});

test("nouvelle adresse : sonde coupée à 2,5 s, sans AbortSignal.timeout, absent des vieux iPhone", async () => {
  newcomer();
  const real = AbortSignal.timeout;
  AbortSignal.timeout = undefined;
  let aborted = false;
  reply = (opts) => new Promise((_, ko) => opts.signal.addEventListener("abort", () => {
    aborted = true;
    ko(new Error("trop long"));
  }));
  try {
    arrive();
    await flush();
    assert.equal(asked.length, 1);
    mock.timers.tick(2499);
    await flush();
    assert.equal(aborted, false);
    mock.timers.tick(1);
    await flush();
    assert.equal(aborted, true);
    assert.deepEqual(went, []);
    assert.equal(localStorage.getItem("cv-sonde"), null);
  } finally {
    AbortSignal.timeout = real;
  }
});

const lateCases = {
  "en pleine partie": () => { page.menu = { hidden: true }; },
  "le pseudo tapé": () => { page.pseudo = { value: "Lou" }; },
  "le code tapé": () => { page.linkInput = { value: "ABCD" }; },
  "le champ ouvert": () => { document.activeElement = { tagName: "INPUT" }; },
  "le compte revenu par le cookie": () => { localStorage.setItem("cv-token", "cookie"); }
};
for (const [name, set] of Object.entries(lateCases)) {
  test(`nouvelle adresse : réponse trop tardive, ${name} : le joueur reste, nouvel essai au chargement suivant`, async () => {
    newcomer();
    let answer;
    reply = () => new Promise((ok) => { answer = ok; });
    arrive();
    await flush();
    set();
    answer({ type: "opaque" });
    await flush();
    assert.deepEqual(went, []);
    assert.equal(localStorage.getItem("cv-sonde"), null);
    assert.equal(localStorage.getItem("cv-sonde-essais"), null);
  });
}

test("appli installée : pas de sonde, /depart s'ouvrirait dans un autre stockage", async () => {
  newcomer();
  window.matchMedia = (query) => ({ matches: query === "(display-mode: standalone)" });
  arrive();
  await flush();
  assert.deepEqual(asked, []);
  assert.deepEqual(went, []);
  assert.equal(localStorage.getItem("cv-sonde"), null);
  newcomer();
  navigator.standalone = true;
  arrive();
  await flush();
  assert.deepEqual(asked, []);
  assert.deepEqual(went, []);
  assert.equal(localStorage.getItem("cv-sonde"), null);
  newcomer();
  window.matchMedia = () => ({ matches: false });
  navigator.standalone = false;
  arrive();
  await flush();
  assert.deepEqual(went, [OLD + "/depart"]);
  newcomer();
});

test("code pas arrivé : le lien le signale, cv-sonde est effacé, et le chargement suivant retente", async () => {
  newcomer();
  localStorage.setItem("cv-sensibilite", "2.2");
  const url = moveUrl(null, true);
  assert.equal(JSON.parse(decodeURIComponent(url.split("#demenage=")[1])).retry, true);
  assert.equal("retry" in JSON.parse(decodeURIComponent(moveUrl(null).split("#demenage=")[1])), false);
  localStorage.setItem("cv-sonde", "1");
  land(url);
  assert.equal(localStorage.getItem("cv-sonde"), null);
  assert.equal(localStorage.getItem("cv-sensibilite"), "2.2");
  location.hash = "";
  arrive();
  await flush();
  assert.deepEqual(went, [OLD + "/depart"]);
});

test("retour sans échec, nouveau joueur compris : cv-sonde reste, pas d'autre aller-retour", async () => {
  newcomer();
  land(moveUrl(null));
  assert.equal(localStorage.getItem("cv-sonde"), "1");
  location.hash = "";
  arrive();
  await flush();
  assert.deepEqual(asked, []);
});

test("3 allers-retours au plus, même si le code n'arrive jamais", async () => {
  newcomer();
  for (let i = 0; i < 5; i++) {
    location.hash = "";
    arrive();
    await flush();
    land(moveUrl(null, true));
  }
  assert.equal(went.length, 3);
  assert.equal(localStorage.getItem("cv-sonde-essais"), "3");
  location.hash = "";
});

test("déménagement : un appareil déjà connecté garde ses réglages et retient le code pour proposer de réunir", () => {
  reset();
  localStorage.setItem("cv-sensibilite", "2.2");
  const url = moveUrl("ABCD2345");
  localStorage.clear();
  localStorage.setItem("cv-token", "deja");
  land(url);
  assert.equal(localStorage.getItem("cv-sensibilite"), null);
  assert.equal(sessionStorage.getItem("cv-arrivee"), "ABCD2345");
  assert.equal(cleaned, 1);
});

test("déménagement : un lien fabriqué ne pose ni clé ni identifiant", () => {
  reset();
  const data = { "cv-token": "pirate", "cv-client": "pirate", autre: "x", "cv-sensibilite": "1" };
  land(HOME + "/#demenage=" + encodeURIComponent(JSON.stringify({ code: "<script>", data })));
  assert.equal(localStorage.getItem("cv-token"), null);
  assert.equal(localStorage.getItem("cv-client"), null);
  assert.equal(localStorage.getItem("autre"), null);
  assert.equal(localStorage.getItem("cv-sensibilite"), "1");
  assert.equal(sessionStorage.getItem("cv-arrivee"), null);
});

test("déménagement : une adresse illisible ne plante pas et s'efface", () => {
  reset();
  land(HOME + "/#demenage=%E0%A4%A");
  assert.equal(cleaned, 1);
  location.hash = "";
});
