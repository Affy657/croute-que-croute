import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { blocked, checkFailed, drift, ignored, ignoredPaths, URGENT } from "../../scripts/garde.mjs";

const MIN = 60000, END = Date.UTC(2026, 10, 7, 22, 30), FINAL = END + 15000;
const board = (now, status) => ({ now, event: status ? { name: "Space Tartinade #3", status, closesAt: END, finalAt: FINAL } : null });

test("mise en ligne refusée pendant la soirée", () => {
  assert.match(blocked(board(END - MIN, "open")), /Space Tartinade #3 » est ouverte/);
});

test("mise en ligne refusée pendant les 15 s où les dernières parties arrivent encore", () => {
  assert.match(blocked(board(END + 1000, "closed")), /15 s après la fin/);
  assert.match(blocked(board(FINAL - 1, "closed")), /15 s après la fin/);
});

test("mise en ligne permise après les 15 s, ou sans soirée", () => {
  assert.equal(blocked(board(FINAL, "closed")), null);
  assert.equal(blocked(board(END, null)), null);
});

test("en urgence, permise même pendant la soirée", () => {
  assert.equal(blocked(board(END - MIN, "open"), [URGENT]), null);
  assert.equal(blocked(board(END + MIN, "closed"), ["deploy", URGENT]), null);
});

const SKIP = ignoredPaths(readFileSync(".github/workflows/tests.yml", "utf8"));
const HEAD = "c3", DOCS = "b2", OLD = "a1";
const fits = (sha) => sha === HEAD || sha === DOCS;
const done = (headSha, conclusion) => ({ headSha, status: "completed", conclusion });

test("mise en ligne : un commit qui ne touche que le README ou les images garde le résultat des tests d'avant", () => {
  assert.ok(SKIP.includes("README.md") && SKIP.includes("affiches/**"));
  assert.equal(ignored("README.md", SKIP), true);
  assert.equal(ignored("affiches/space-tartinade-3.webp", SKIP), true);
  assert.equal(ignored("public/style.css", SKIP), false);
  assert.equal(ignored("public/js/app/main.js", SKIP), false);
});

test("mise en ligne refusée tant que Tests ou Safari n'a pas tourné, tourne encore ou n'est pas vert sur ce commit", () => {
  assert.match(checkFailed("Safari", "safari.yml", [done(OLD, "success")], fits), /Safari n'a pas tourné sur ce commit.*gh workflow run safari\.yml --ref master/);
  assert.match(checkFailed("Tests", "tests.yml", [{ headSha: HEAD, status: "in_progress", conclusion: "" }], fits), /Tests tourne encore/);
  assert.match(checkFailed("Tests", "tests.yml", [done(HEAD, "failure")], fits), /Tests n'est pas vert sur ce commit \(failure\)/);
  assert.match(checkFailed("Safari", "safari.yml", [done(HEAD, "cancelled"), done(DOCS, "success")], fits), /pas vert/);
});

test("mise en ligne permise quand le dernier passage sur ce commit, ou avant un changement de README, est vert", () => {
  assert.equal(checkFailed("Tests", "tests.yml", [done(HEAD, "success"), done(OLD, "failure")], fits), null);
  assert.equal(checkFailed("Tests", "tests.yml", [done(DOCS, "success")], fits), null);
  assert.equal(checkFailed("Tests", "tests.yml", [done("autre", "failure"), done(DOCS, "success")], fits), null);
});

test("mise en ligne refusée si node_modules ne suit pas package-lock.json (le PC met en ligne avec ses propres outils)", () => {
  const lock = { packages: { "": { dependencies: { qrcode: "^1" }, devDependencies: { wrangler: "^4" } }, "node_modules/qrcode": { version: "1.5.4" }, "node_modules/wrangler": { version: "4.156.0" } } };
  assert.deepEqual(drift(lock, (n) => ({ qrcode: "1.5.4", wrangler: "4.154.0" })[n]), ["wrangler 4.154.0 au lieu de 4.156.0"]);
  assert.deepEqual(drift(lock, (n) => ({ wrangler: "4.156.0" })[n]), ["qrcode absent au lieu de 1.5.4"]);
  assert.deepEqual(drift(lock, (n) => ({ qrcode: "1.5.4", wrangler: "4.156.0" })[n]), []);
});

test("npm run deploy vérifie node_modules, Tests et Safari avant de mettre en ligne, et Safari ne tourne plus après", () => {
  const deploy = readFileSync("scripts/deploy.mjs", "utf8");
  const at = (s) => deploy.indexOf(s);
  for (const step of ["if (stale.length) stop(", "const why = checkFailed(", "if (why) stop(why)", "of CHECKS"]) assert.ok(at(step) > 0 && at(step) < at("wrangler deploy"), step);
  assert.match(deploy, /const stale = drift\(/);
  assert.doesNotMatch(readFileSync(".github/workflows/safari.yml", "utf8"), /tags:/);
});
