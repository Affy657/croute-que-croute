import { test } from "node:test";
import assert from "node:assert/strict";

const { PER_IP, STALE_MS, stalest } = await import(new URL("../../src/slots.ts", import.meta.url).href);

const NOW = 10 * 60 * 1000;
const seen = (s) => s.seen;

test("écrans en direct : tant que les 4 écrans d'une adresse répondent, aucun n'est chassé", () => {
  const live = Array.from({ length: PER_IP }, (_, i) => ({ seen: NOW - i * 15000 }));
  assert.equal(stalest(live, seen, NOW), null);
});

test("écrans en direct : un écran qui ne répond plus depuis une minute laisse sa place, le plus ancien d'abord", () => {
  const dead = { seen: NOW - STALE_MS - 5000 }, older = { seen: NOW - STALE_MS * 3 };
  assert.equal(stalest([{ seen: NOW }, dead, { seen: NOW - 1000 }], seen, NOW), dead);
  assert.equal(stalest([dead, { seen: NOW }, older], seen, NOW), older);
  assert.equal(stalest([], seen, NOW), null);
});
