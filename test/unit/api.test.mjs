import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

const calls = [];
let resumeFails = true;
const EMPTY = { now: 0, event: null, next: null, top: [], count: 0, pcTop: [], pcCount: 0, eventTop: [], eventCount: 0, me: null };

globalThis.fetch = async (path, opts) => {
  calls.push({ path, opts });
  if (path === "/api/resume" && resumeFails) throw new TypeError("Failed to fetch");
  const body = path === "/api/resume" ? { token: null } : { ...EMPTY, now: Date.now() };
  return { ok: true, status: 200, json: async () => body };
};

const api = await import("../../public/js/app/api.js");

test("chaque appel au serveur a une limite d'attente, même sans délai demandé", async () => {
  await api.call("GET", "/api/board");
  assert.ok(calls.at(-1).opts.signal instanceof AbortSignal);
});

test("reprise du compte ratée faute de réseau : retentée au classement suivant, puis plus", async () => {
  calls.length = 0;
  await api.refreshBoard();
  resumeFails = false;
  await api.refreshBoard();
  await api.refreshBoard();
  assert.equal(calls.filter((c) => c.path === "/api/resume").length, 2);
});
