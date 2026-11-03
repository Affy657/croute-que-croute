import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

const ME = { id: "a".repeat(32), pseudo: "Lou", best: 3000, rank: 4, eventBest: 2000, eventRank: 3, pcBest: 0, pcRank: null, runs: 5 };
let online = true;

localStorage.setItem("cv-token", "c".repeat(48));
globalThis.fetch = async (path, opts) => {
  if (!online) throw new TypeError("Failed to fetch");
  if (path === "/api/me" && opts.method === "PATCH") return { ok: true, status: 200, json: async () => ({ pseudo: JSON.parse(opts.body).pseudo }) };
  const body = { now: Date.now(), event: null, next: null, top: [], count: 9, pcTop: [], pcCount: 0, eventTop: [], eventCount: 9, me: { ...ME } };
  return { ok: true, status: 200, json: async () => body };
};

const api = await import("../../public/js/app/api.js");
await api.refreshBoard();

test("hors ligne après un classement reçu : la partie suivante compare au record qu'on vient de faire, pas au vieux", () => {
  online = false;
  api.saveLocalBest(4500, "general");
  api.saveLocalBest(4000, "general");
  api.saveLocalBest(2500, "event");
  assert.equal(api.standing("general").best, 4500);
  assert.equal(api.standing("event").best, 2500);
  assert.equal(api.standing("pc").best, 0);
  online = true;
});

test("pseudo changé mais classement raté juste après : le nouveau pseudo est gardé, pas l'ancien", async () => {
  const rename = api.rename("Neuf");
  online = false;
  await rename;
  assert.equal(api.net.board.me.pseudo, "Neuf");
  online = true;
});
