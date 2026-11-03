import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

const held = [];
let serverBest = 1000, hold = false;
const answer = (body) => ({ ok: true, status: 200, json: async () => body });
const board = () => ({ now: Date.now(), event: null, next: null, top: [], count: 1, pcTop: [], pcCount: 0, eventTop: [], eventCount: 0, me: { pseudo: "Lou", best: serverBest, rank: 1, pcBest: 0, pcRank: null } });
const saved = () => ({ best: serverBest, rank: 1, rival: null, pcBest: 0, pcRank: null, pcRival: null, count: 1, pcCount: 0, eventBest: null });

globalThis.fetch = (path) => {
  if (path === "/api/join") return Promise.resolve(answer({ token: "jeton" }));
  if (path === "/api/board") {
    const snapshot = board();
    return hold ? new Promise((ok) => held.push({ path, release: () => ok(answer(snapshot)) })) : Promise.resolve(answer(snapshot));
  }
  if (path.startsWith("/api/runs/")) return new Promise((ok) => held.push({ path, release: () => ok(answer(saved(serverBest = 1500))) }));
  return Promise.resolve(answer({}));
};

const api = await import("../../public/js/app/api.js");
const settle = () => new Promise((ok) => setTimeout(ok, 10));
const release = (path) => held.splice(held.findIndex((h) => h.path.startsWith(path)), 1)[0].release();

test("record : un classement demandé avant que le score soit enregistré n'affiche pas l'ancien record en arrivant après", async () => {
  await api.join("Lou");
  assert.equal(api.standing("general").best, 1000);
  api.saveLocalBest(1500, "general");
  hold = true;
  const sent = api.submitScore(1500, "mobile", 0, Promise.resolve({ runId: "partie" }));
  await settle();
  const early = api.refreshBoard();
  await settle();
  release("/api/runs/");
  await sent;
  await settle();
  release("/api/board");
  await early;
  assert.equal(api.standing("general").best, 1500);
  release("/api/board");
  await settle();
  assert.equal(api.standing("general").best, 1500);
});
