import "./env.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sessionItems = new Map();
globalThis.sessionStorage = {
  getItem: (k) => (sessionItems.has(k) ? sessionItems.get(k) : null),
  setItem: (k, v) => sessionItems.set(k, String(v)),
  removeItem: (k) => sessionItems.delete(k)
};
let cleaned = 0;
globalThis.history = { replaceState: () => { cleaned++; } };

const { moveUrl, moved, OLD_HOST, HOME } = await import("../../public/js/app/move.js");
const arrive = new Function(readFileSync(new URL("../../public/js/arrive.js", import.meta.url), "utf8"));

function reset() {
  localStorage.clear();
  sessionItems.clear();
  cleaned = 0;
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

test("déménagement : un appareil déjà connecté ignore tout", () => {
  reset();
  localStorage.setItem("cv-sensibilite", "2.2");
  const url = moveUrl("ABCD2345");
  localStorage.clear();
  localStorage.setItem("cv-token", "deja");
  land(url);
  assert.equal(localStorage.getItem("cv-sensibilite"), null);
  assert.equal(sessionStorage.getItem("cv-arrivee"), null);
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
