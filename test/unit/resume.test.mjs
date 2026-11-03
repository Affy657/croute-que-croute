import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

const EMPTY = { now: 0, event: null, next: null, top: [], count: 0, pcTop: [], pcCount: 0, eventTop: [], eventCount: 0, me: null };
const LINKED = "b".repeat(48);
let resume = "panne", board = "ok", resumeCalls = 0, release = null;

globalThis.fetch = async (path) => {
  if (path === "/api/resume") {
    resumeCalls++;
    if (resume === "panne") throw new TypeError("Failed to fetch");
    if (resume === "500") return { ok: false, status: 500, json: async () => ({ error: "Erreur serveur." }) };
    if (resume === "lente") await new Promise((ok) => (release = ok));
    return { ok: true, status: 200, json: async () => ({ token: null }) };
  }
  if (path === "/api/link") return { ok: true, status: 200, json: async () => ({ token: LINKED, pseudo: "Lou" }) };
  if (board === "panne") throw new TypeError("Failed to fetch");
  return { ok: true, status: 200, json: async () => ({ ...EMPTY, now: Date.now() }) };
};

const api = await import("../../public/js/app/api.js");

test("reprise du compte ratée (réseau ou serveur) : pas de choix de pseudo, sinon le joueur se crée un 2e compte", async () => {
  await api.refreshBoard();
  assert.ok(api.net.board && !api.joinReady());
  resume = "500";
  await api.refreshBoard();
  assert.equal(resumeCalls, 2);
  assert.ok(!api.joinReady());
});

test("reprise en cours : un 2e classement attend la même reprise au lieu de proposer un pseudo", async () => {
  resume = "lente";
  const a = api.refreshBoard(), b = api.refreshBoard();
  await new Promise((ok) => setTimeout(ok, 20));
  assert.equal(resumeCalls, 3);
  release();
  await Promise.all([a, b]);
  assert.ok(api.joinReady());
});

test("connexion avec un code réussie mais classement raté : pas de choix de pseudo, la clé reçue est gardée", async () => {
  board = "panne";
  await api.linkWith("ABCD2345");
  assert.equal(api.net.token, LINKED);
  assert.ok(!api.joinReady());
  board = "ok";
});
