import "./env.mjs";
import { test, mock } from "node:test";
import assert from "node:assert/strict";

const AHEAD = 5000, ME = { id: "a".repeat(32), pseudo: "Lou", best: 0, rank: 1, pcBest: 0, pcRank: null, runs: 1 };
let there = 0, back = 0;

AbortSignal.timeout = undefined;
localStorage.setItem("cv-token", "c".repeat(48));
mock.timers.enable({ apis: ["setTimeout", "Date"], now: Date.UTC(2026, 10, 7, 21) });

const later = (ms) => new Promise((ok) => setTimeout(ok, ms));
globalThis.fetch = async () => {
  await later(there);
  const now = Date.now() + AHEAD;
  await later(back);
  return { ok: true, status: 200, json: async () => ({ now, event: null, next: null, top: [], count: 1, pcTop: [], pcCount: 0, eventTop: [], eventCount: 0, me: { ...ME } }) };
};

const api = await import("../../public/js/app/api.js");

async function board() {
  let done = false;
  api.refreshBoard().then(() => { done = true; });
  for (let i = 0; i < 100 && !done; i++) {
    for (let j = 0; j < 6; j++) await new Promise(setImmediate);
    mock.timers.tick(100);
  }
  assert.ok(done);
}

test("heure du serveur : la latence ne compte pas dans le décalage, le compte à rebours ne recule pas après une réponse lente", async () => {
  there = back = 1500;
  await board();
  assert.equal(api.net.offset, AHEAD);
  there = back = 0;
  await board();
  assert.equal(api.net.offset, AHEAD);
});
