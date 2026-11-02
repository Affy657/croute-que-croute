import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, next) {
    if (context.parentURL?.endsWith(".ts") && /^\.\.?\/[^.]+$/.test(specifier)) return next(specifier + ".ts", context);
    return next(specifier, context);
  },
});

const { cached, forgetCaches } = await import(new URL("../../src/db.ts", import.meta.url).href);

function slow() {
  const waiting = [];
  const load = () => {
    load.reads++;
    return new Promise((ok) => waiting.push(ok));
  };
  load.reads = 0;
  return { load, release: (value) => waiting.splice(0).forEach((ok) => ok(value)) };
}

test("classement demandé par plusieurs téléphones en même temps : une seule lecture de la base", async () => {
  const { load, release } = slow();
  const a = cached("ensemble", 10000, load), b = cached("ensemble", 10000, load);
  release(["Lou"]);
  assert.deepEqual(await a, ["Lou"]);
  assert.equal(await b, await a);
  assert.deepEqual(await cached("ensemble", 10000, load), ["Lou"]);
  assert.equal(load.reads, 1);
});

test("lecture commencée avant un changement (joueur retiré, soirée modifiée) : son résultat n'est pas gardé", async () => {
  const old = slow();
  const before = cached("change", 10000, old.load);
  forgetCaches();
  const fresh = slow();
  const after = cached("change", 10000, fresh.load);
  assert.equal(fresh.load.reads, 1);
  old.release(["avant"]);
  fresh.release(["après"]);
  assert.deepEqual(await before, ["avant"]);
  assert.deepEqual(await after, ["après"]);
  assert.deepEqual(await cached("change", 10000, async () => ["relu"]), ["après"]);
});

test("ancienne lecture qui finit après la nouvelle : n'écrase pas le cache", async () => {
  const old = slow();
  const before = cached("ordre", 10000, old.load);
  forgetCaches();
  assert.deepEqual(await cached("ordre", 10000, async () => ["après"]), ["après"]);
  old.release(["avant"]);
  await before;
  assert.deepEqual(await cached("ordre", 10000, async () => ["relu"]), ["après"]);
});

test("sans cache demandé (0) : chaque appel relit la base", async () => {
  let reads = 0;
  const load = async () => ++reads;
  assert.deepEqual(await Promise.all([cached("frais", 0, load), cached("frais", 0, load)]), [1, 2]);
  assert.equal(await cached("frais", 0, load), 3);
});

test("résultat vide (null) : pas gardé", async () => {
  let reads = 0;
  const load = async () => { reads++; return null; };
  await cached("vide", 10000, load);
  await cached("vide", 10000, load);
  assert.equal(reads, 2);
});
