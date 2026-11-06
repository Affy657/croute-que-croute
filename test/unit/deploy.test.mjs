import { test } from "node:test";
import assert from "node:assert/strict";
import { execSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { blocked, CHECKS, checkFailed, drift, gitProblem, ignored, ignoredPaths, newer, offGitProblem, OFF_GIT, stillValid, URGENT, watchedPaths } from "../../scripts/garde.mjs";

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

const HOUR = 60 * MIN, OPENS = Date.UTC(2026, 10, 7, 19, 0);
const coming = (now, event = null) => ({ now, event, next: { name: "Space Tartinade #4", opensAt: OPENS, closesAt: OPENS + 3 * HOUR, status: "upcoming" } });

test("mise en ligne refusée moins de 2 h avant l'ouverture d'une soirée", () => {
  assert.match(blocked(coming(OPENS - MIN)), /Space Tartinade #4 » ouvre dans 1 min/);
  assert.match(blocked(coming(OPENS - 2 * HOUR + 1)), /ouvre dans 120 min/);
  assert.match(blocked({ ...coming(OPENS - MIN), event: { name: "Space Tartinade #3", status: "closed", finalAt: OPENS - HOUR } }), /Space Tartinade #4/);
});

test("mise en ligne permise 2 h ou plus avant l'ouverture", () => {
  assert.equal(blocked(coming(OPENS - 2 * HOUR)), null);
  assert.equal(blocked(coming(OPENS - 24 * HOUR)), null);
});

test("en urgence, permise même juste avant l'ouverture", () => {
  assert.equal(blocked(coming(OPENS - MIN), ["deploy", URGENT]), null);
});

test("le refus donne la commande d'urgence de ce qu'on vient de lancer", () => {
  assert.match(blocked(coming(OPENS - MIN)), /npm run deploy -- --pendant-soiree/);
  assert.match(blocked(board(END - MIN, "open")), /npm run deploy -- --pendant-soiree/);
  assert.match(blocked(coming(OPENS - MIN), [], "npm run db:remote"), /npm run db:remote -- --pendant-soiree/);
  assert.match(blocked(board(END - MIN, "open"), [], "npm run db:remote"), /npm run db:remote -- --pendant-soiree/);
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

const WATCHED = watchedPaths(readFileSync(".github/workflows/equite.yml", "utf8"));

test("le garde-fou lit les fichiers suivis par Équité, sans les confondre avec ceux ignorés par Tests", () => {
  assert.ok(CHECKS.some(([file, name]) => file === "equite.yml" && name === "Équité"));
  assert.ok(WATCHED.includes("public/js/game/**") && WATCHED.includes("test/fairness.mjs"));
  assert.deepEqual(watchedPaths(readFileSync(".github/workflows/tests.yml", "utf8")), []);
  assert.deepEqual(ignoredPaths(readFileSync(".github/workflows/equite.yml", "utf8")), []);
  assert.deepEqual(watchedPaths(readFileSync(".github/workflows/safari.yml", "utf8")), []);
});

test("mise en ligne : un passage d'Équité reste valable tant qu'aucun de ses fichiers n'a changé", () => {
  assert.equal(stillValid(["src/worker.ts", "public/style.css", "README.md"], WATCHED, SKIP), true);
  assert.equal(stillValid([], WATCHED, SKIP), true);
  assert.equal(stillValid(["src/worker.ts", "public/js/game/sim.js"], WATCHED, SKIP), false);
  assert.equal(stillValid(["public/js/shared/palette.js"], WATCHED, SKIP), false);
  assert.equal(stillValid(["test/fairness.mjs"], WATCHED, SKIP), false);
});

test("mise en ligne : Tests et Safari, sans fichiers suivis, gardent la règle des fichiers ignorés", () => {
  assert.equal(stillValid(["README.md", "affiches/a.webp"], [], SKIP), true);
  assert.equal(stillValid(["README.md", "src/worker.ts"], [], SKIP), false);
});

test("Équité jamais lancée sur ce code : refus avec la commande pour la lancer", () => {
  assert.match(checkFailed("Équité", "equite.yml", [], () => false), /Équité n'a pas tourné sur ce commit.*gh workflow run equite\.yml --ref master/);
  const keeps = (sha) => stillValid(sha === OLD ? ["src/worker.ts"] : ["public/js/game/sim.js"], WATCHED, SKIP);
  assert.equal(checkFailed("Équité", "equite.yml", [done("autre", "failure"), done(OLD, "success")], keeps), null);
  assert.match(checkFailed("Équité", "equite.yml", [done(OLD, "failure")], keeps), /pas vert/);
});

test("Équité suit tout ce que son robot et le jeu importent, palette.js comprise", () => {
  const todo = ["test/fairness.mjs", "test/equilibrage/invariants.mjs", ...readdirSync("public/js/game", { recursive: true }).filter((f) => f.endsWith(".js")).map((f) => "public/js/game/" + f.replaceAll("\\", "/"))];
  for (const file of todo) {
    for (const [, path] of readFileSync(file, "utf8").matchAll(/from "(\.[^"]+)"/g)) {
      const dep = posix.join(posix.dirname(file), path);
      if (!todo.includes(dep)) todo.push(dep);
    }
  }
  assert.ok(todo.includes("public/js/shared/palette.js") && todo.includes("test/chemin.mjs"));
  assert.deepEqual(todo.filter((f) => !ignored(f, WATCHED)), []);
});

test("le robot d'équité échoue sur une mort, une partie sans chemin ou un refus à cause de l'attaque elle-même", () => {
  const exit = readFileSync("test/fairness.mjs", "utf8").split(/\r?\n/).find((line) => line.startsWith("process.exit("));
  for (const part of ["sane", "!fair.deaths", "!fair.stuck", "!Object.keys(fair.own).length"]) assert.ok(exit.includes(part), part);
});

test("mise en ligne refusée si node_modules ne suit pas package-lock.json (le PC met en ligne avec ses propres outils)", () => {
  const lock = { packages: { "": { dependencies: { qrcode: "^1" }, devDependencies: { wrangler: "^4" } }, "node_modules/qrcode": { version: "1.5.4" }, "node_modules/wrangler": { version: "4.156.0" } } };
  assert.deepEqual(drift(lock, (n) => ({ qrcode: "1.5.4", wrangler: "4.154.0" })[n]), ["wrangler 4.154.0 au lieu de 4.156.0"]);
  assert.deepEqual(drift(lock, (n) => ({ wrangler: "4.156.0" })[n]), ["qrcode absent au lieu de 1.5.4"]);
  assert.deepEqual(drift(lock, (n) => ({ qrcode: "1.5.4", wrangler: "4.156.0" })[n]), []);
});

test("mise en ligne : le numéro doit monter, chiffre par chiffre et pas comme du texte", () => {
  assert.equal(newer("1.10.0", "1.9.0"), true);
  assert.equal(newer("1.9.0", "1.10.0"), false);
  assert.equal(newer("2.0.0", "1.99.99"), true);
  assert.equal(newer("1.2.1", "1.2.0"), true);
  assert.equal(newer("1.2.0", "1.2.1"), false);
  assert.equal(newer("1.2.0", "1.2.0"), false);
});

test("npm run deploy sort en échec si la vérification en ligne échoue, sans toucher au tag ni au retour de version.js", () => {
  const deploy = readFileSync("scripts/deploy.mjs", "utf8");
  const after = deploy.slice(deploy.indexOf("node scripts/verif.mjs"));
  assert.match(after, /catch \{\s+console\.error\([^\n]*\);\s+process\.exitCode = 1;\s+\}\s+\} finally \{\s+execSync\(`git checkout -- /);
  assert.equal(deploy.match(/process\.exitCode/g).length, 1);
});

const CLEAN = { status: "\n", branch: "master\n", ahead: "0\n" };

test("mise en ligne et migration exigent git propre, master et tout envoyé", () => {
  assert.equal(gitProblem(CLEAN), null);
  assert.match(gitProblem({ ...CLEAN, status: " M README.md\n" }), /pas enregistrés/);
  assert.match(gitProblem({ ...CLEAN, branch: "essais\n" }), /master/);
  assert.match(gitProblem({ ...CLEAN, ahead: "2\n" }), /git push origin master/);
});

test("npm run db:remote passe par le garde-fou avant de lancer la migration en ligne", () => {
  const scripts = JSON.parse(readFileSync("package.json", "utf8")).scripts;
  assert.equal(scripts["db:remote"], "node scripts/migrer.mjs");
  assert.ok(Object.entries(scripts).every(([name, cmd]) => name === "db:local" || !/migrations apply/.test(cmd)));
  const migrer = readFileSync("scripts/migrer.mjs", "utf8");
  const at = (s) => migrer.indexOf(s);
  assert.ok(migrer.includes("/api/board"));
  for (const step of ["if (dirty) stop(dirty)", "if (!board) stop(", "if (busy) stop(busy)"]) assert.ok(at(step) > 0 && at(step) < at("migrations apply"), step);
  assert.match(migrer, /blocked\(board, process\.argv, "npm run db:remote"\)/);
});

const SOUNDS = ["public/music/theme.m4a", "public/sfx/death.mp3", "public/sfx/first.mp3", "public/sfx/near.mp3", "public/sfx/record.mp3", "public/sfx/start.mp3"];

test("mise en ligne permise avec les 6 fichiers hors git attendus, ni plus ni moins", () => {
  assert.deepEqual(OFF_GIT, SOUNDS);
  assert.equal(offGitProblem(SOUNDS.join("\n") + "\n"), null);
  assert.equal(offGitProblem(SOUNDS.join("\r\n") + "\r\n"), null);
});

test("mise en ligne refusée depuis un clone neuf : le jeu partirait muet, avec le nom des fichiers absents", () => {
  const why = offGitProblem("");
  for (const file of SOUNDS) assert.ok(why.includes(file), file);
  const one = offGitProblem(SOUNDS.filter((f) => f !== "public/sfx/near.mp3").join("\n"));
  assert.match(one, /public\/sfx\/near\.mp3/);
  assert.doesNotMatch(one, /public\/sfx\/death\.mp3/);
});

test("mise en ligne refusée si un fichier ignoré par git serait servi, par exemple une clé posée dans public/", () => {
  const why = offGitProblem([...SOUNDS, "public/cle-admin.txt"].join("\n"));
  assert.match(why, /public\/cle-admin\.txt/);
  assert.doesNotMatch(why, /theme\.m4a/);
});

const hidden = (name) => spawnSync("git", ["check-ignore", "-q", "--no-index", name]).status === 0;

test("git ignore les clés, les exports de base et tout public/sfx et public/music", () => {
  for (const name of [".env", ".env.local", ".dev.vars", ".dev.vars.production", "copie.sql", "scripts/copie.sql", "public/sfx/nouveau.wav", "public/music/morceau.flac"]) assert.ok(hidden(name), name);
});

test("git garde les migrations et les .gitkeep, et aucun fichier suivi n'est ignoré", () => {
  for (const name of ["migrations/0016_suite.sql", "public/music/.gitkeep", "public/sfx/.gitkeep"]) assert.ok(!hidden(name), name);
  assert.equal(execSync("git ls-files -ci --exclude-standard").toString(), "");
});

test("npm run deploy vérifie node_modules, Tests et Safari avant de mettre en ligne, et Safari ne tourne plus après", () => {
  const deploy = readFileSync("scripts/deploy.mjs", "utf8");
  const at = (s) => deploy.indexOf(s);
  for (const step of ["if (offGit) stop(offGit)", "if (stale.length) stop(", "const why = checkFailed(", "if (why) stop(why)", "of CHECKS"]) assert.ok(at(step) > 0 && at(step) < at("wrangler deploy"), step);
  assert.match(deploy, /const stale = drift\(/);
  assert.match(deploy, /const watched = watchedPaths\(workflow\(file\)\);\s+const fits = [^\n]*stillValid\(since\(sha\), watched, skip\)/);
  assert.doesNotMatch(readFileSync(".github/workflows/safari.yml", "utf8"), /tags:/);
});
