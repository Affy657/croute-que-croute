import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ token: null }) });

const BROKEN = ["null", "1", "\"texte\"", "[]", "{}", "[1]", "[null]", "{\"attacks\":1}", "{\"got\":1}", "{\"got\":null}", "{\"got\":[1]}", "{\"attacks\":{},\"events\":1,\"killers\":\"x\",\"runs\":\"x\",\"best\":null,\"seen\":\"x\"}", "pas du json", "{"];
let cases = 0;
const fresh = (file) => import(`../../public/js/app/${file}?cas=${++cases}`);
const BOARD = { me: { runs: 3, best: 100, pcBest: 0, rank: 1, pcRank: null, eventRank: null }, count: 1, pcCount: 0, eventCount: 0 };

for (const value of BROKEN) {
  test(`cv-succes abîmé (${value}) : le jeu démarre, joue et garde une forme saine`, async () => {
    localStorage.clear();
    localStorage.setItem("cv-succes", value);
    const ach = await fresh("achievements.js");
    assert.equal(ach.progress().got, 0);
    ach.absorb({ got: {}, attacks: ["fork"] });
    ach.runStart(null);
    ach.runEnd(100, null, "mobile");
    ach.onBoard(BOARD);
    const sync = ach.forSync();
    assert.ok(Array.isArray(sync.attacks));
    assert.equal(typeof sync.got, "object");
    const saved = JSON.parse(localStorage.getItem("cv-succes"));
    for (const key of ["attacks", "events", "killers"]) assert.ok(Array.isArray(saved[key]));
    assert.ok(Number.isFinite(saved.runs) && Number.isFinite(saved.best));
  });

  test(`cv-records abîmé (${value}) : des nombres, jamais de plantage`, async () => {
    localStorage.clear();
    localStorage.setItem("cv-token", "c".repeat(48));
    localStorage.setItem("cv-records", value);
    const api = await fresh("api.js");
    const { best } = api.standing("general");
    assert.equal(typeof best, "number");
    assert.ok(Number.isFinite(best));
    assert.ok(Number.isFinite(api.standing("pc").best));
    api.saveLocalBest(500, "general");
    assert.equal(api.standing("general").best, 500);
  });

  test(`cv-score-attente abîmé (${value}) : le démarrage ne plante pas, rien n'est envoyé`, async () => {
    localStorage.clear();
    localStorage.setItem("cv-token", "c".repeat(48));
    localStorage.setItem("cv-score-attente", value);
    const asked = [];
    const real = globalThis.fetch;
    globalThis.fetch = async (path) => {
      asked.push(path);
      return real(path);
    };
    try {
      const api = await fresh("api.js");
      await api.resumePending();
      assert.equal(api.hasPending(), false);
      assert.deepEqual(asked, []);
    } finally {
      globalThis.fetch = real;
    }
  });

  test(`cv-garnitures abîmé (${value}) : beurre par défaut`, async () => {
    localStorage.clear();
    localStorage.setItem("cv-garnitures", value);
    const { chosen, toppingList } = await fresh("toppings.js");
    assert.equal(chosen(), "butter");
    assert.deepEqual(toppingList(), []);
  });
}

test("score gardé à moitié abîmé : seuls les bons restent", async () => {
  localStorage.clear();
  localStorage.setItem("cv-token", "c".repeat(48));
  const good = { runId: "partie", score: 100, device: "mobile", combo: 0, at: Date.now() };
  const bad = [null, 1, {}, { ...good, runId: 12 }, { ...good, score: "100" }, { ...good, device: null }, { ...good, at: "hier" }];
  localStorage.setItem("cv-score-attente", JSON.stringify([...bad, good]));
  const asked = [];
  const real = globalThis.fetch;
  globalThis.fetch = async (path) => {
    asked.push(path);
    return { ok: true, status: 200, json: async () => ({ best: 0, rank: 1, count: 1, pcCount: 0, eventBest: null }) };
  };
  try {
    const api = await fresh("api.js");
    await api.resumePending();
    assert.deepEqual(asked.filter((p) => p.startsWith("/api/runs/")), ["/api/runs/partie"]);
  } finally {
    globalThis.fetch = real;
  }
});

test("garniture au nom piégé (constructor) : ignorée, sinon le dessin de la tartine plante", async () => {
  localStorage.clear();
  localStorage.setItem("cv-garnitures", '["constructor","__proto__","toString"]');
  localStorage.setItem("cv-garniture", "constructor");
  const { chosen, toppingList, owned } = await fresh("toppings.js");
  assert.equal(chosen(), "butter");
  assert.deepEqual(toppingList(), []);
  assert.ok(!owned().includes("constructor"));
});
