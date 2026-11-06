import { test } from "node:test";
import assert from "node:assert/strict";
import "./d1.mjs";

const { connect } = await import(new URL("../../src/live.ts", import.meta.url).href);

function setup() {
  const env = { reached: 0, limited: 0 };
  env.LIVE_LIMIT = { limit: async () => (env.limited++, { success: true }) };
  env.LIVE = { idFromName: () => "ecran", get: () => ({ fetch: async () => (env.reached++, new Response("ouvert")) }) };
  return env;
}

const ask = (origin) => new Request("https://jeu.test/api/live", { headers: { upgrade: "websocket", ...(origin ? { origin } : {}) } });

test("direct : la page du jeu se connecte", async () => {
  const env = setup();
  assert.equal((await connect({ req: ask("https://jeu.test"), env })).status, 200);
  assert.equal(env.reached, 1);
});

test("direct : un script sans Origin passe", async () => {
  const env = setup();
  assert.equal((await connect({ req: ask(null), env })).status, 200);
  assert.equal(env.reached, 1);
});

for (const origin of ["https://pirate.test", "https://jeu.test.pirate.test", "https://jeu.test:8443", "null", "pas une adresse"]) {
  test(`direct : Origin « ${origin} » refusé, sans toucher à la limite du lieu`, async () => {
    const env = setup();
    assert.equal((await connect({ req: ask(origin), env })).status, 403);
    assert.equal(env.reached, 0);
    assert.equal(env.limited, 0);
  });
}
