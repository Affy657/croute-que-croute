import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const guide = readFileSync("public/js/app/guide.js", "utf8");

test("guide, soirées : la marge dite au joueur est celle du serveur", () => {
  const margin = Number(readFileSync("src/db.ts", "utf8").match(/LATE_MS = (\d+) \* 1000/)[1]);
  assert.match(guide, new RegExp(`finies avant la fin comptent, à ${margin} s près`));
  assert.doesNotMatch(guide, /5 min/);
});

test("guide, compte : la tenue suit le compte, seuls les réglages restent sur l'appareil", () => {
  assert.match(guide, /Succès, garnitures et tenue te suivent partout/);
  assert.match(guide, /Seuls les réglages restent sur chaque appareil/);
  assert.doesNotMatch(guide, /tenue portée/);
});
