import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { blocked, CHECKS, checkFailed, drift, gitProblem, ignored, ignoredPaths, newer, NO_GITHUB, offGitProblem } from "./garde.mjs";

const PROD = "https://croute-que-croute.tartine-sauvage.workers.dev";
const DB = "croute-que-croute";
const NUMBER = /^\d+\.\d+\.\d+$/;
const FULL = /^\d+\.\d+\.\d+\+[0-9a-f]+$/;

const run = (cmd) => execSync(cmd).toString();
const stop = (why) => {
  console.error(`Mise en ligne refusée : ${why}`);
  process.exit(1);
};
const quiet = (cmd) => {
  try {
    execSync(cmd, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const { version: number } = JSON.parse(readFileSync("package.json", "utf8"));
if (!NUMBER.test(number || "")) stop(`numéro de version illisible dans package.json : ${number}.`);

const dirty = gitProblem({ status: run("git status --porcelain"), branch: run("git rev-parse --abbrev-ref HEAD"), ahead: run("git rev-list --count origin/master..HEAD") });
if (dirty) stop(dirty);
const offGit = offGitProblem(run("git ls-files --others --ignored --exclude-standard public"));
if (offGit) stop(offGit);
const installed = (name) => {
  const file = `node_modules/${name}/package.json`;
  return existsSync(file) ? JSON.parse(readFileSync(file, "utf8")).version : null;
};
const stale = drift(JSON.parse(readFileSync("package-lock.json", "utf8")), installed);
if (stale.length) stop(`node_modules ne suit pas package-lock.json (${stale.join(", ")}). Arrêter le serveur local, puis npm ci.`);
for (const [cmd, why] of [["npm run check", "la vérification des types échoue"], ["npm run test:unit", "des tests unitaires échouent"]]) {
  try {
    run(cmd);
  } catch (e) {
    console.error(String(e.stdout || ""));
    stop(`${why} (${cmd}).`);
  }
}
if (process.argv.includes(NO_GITHUB)) {
  console.error("Tests de GitHub et Safari pas vérifiés (" + NO_GITHUB + ").");
} else {
  const head = run("git rev-parse HEAD").trim();
  const skip = ignoredPaths(readFileSync(".github/workflows/tests.yml", "utf8"));
  const fits = (sha) => sha === head || (quiet(`git merge-base --is-ancestor ${sha} HEAD`) && run(`git diff --name-only ${sha} HEAD`).split(/\r?\n/).filter(Boolean).every((f) => ignored(f, skip)));
  for (const [file, name] of CHECKS) {
    let runs;
    try {
      runs = JSON.parse(run(`gh run list --workflow ${file} --branch master --limit 30 --json headSha,status,conclusion`));
    } catch {
      stop(`impossible de lire les tests de GitHub (gh). Si GitHub ne répond pas : npm run deploy -- ${NO_GITHUB}`);
    }
    const why = checkFailed(name, file, runs, fits);
    if (why) stop(why);
  }
}
if (!run(`npx wrangler d1 migrations list ${DB} --remote`).includes("No migrations to apply")) {
  stop("une migration n'est pas encore appliquée en ligne. Lancer d'abord npm run db:remote.");
}
const board = await fetch(PROD + "/api/board").then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (!board) stop("impossible de savoir si une soirée est ouverte.");
if (!FULL.test(board.version || "")) stop(`version en ligne illisible : ${String(board.version).slice(0, 40)}.`);
const busy = blocked(board, process.argv);
if (busy) stop(busy);
const online = board.version.split("+")[0];
if (!newer(number, online)) stop(`la version ${online} est en ligne et package.json dit ${number} : monter le numéro (voir Versions dans le README).`);

const hash = execSync("git rev-parse --short HEAD").toString().trim();
const version = `${number}+${hash}`;
const file = "public/js/version.js";

writeFileSync(file, `export const VERSION = "${version}";\n`);
try {
  execSync(`npx wrangler deploy --var APP_VERSION:${version} --var APP_PREVIOUS:${board.version}`, { stdio: "inherit" });
  console.log(`Version en ligne : ${version}`);
  try {
    execSync(`git tag v${number} && git push -q origin v${number}`, { stdio: "inherit" });
  } catch {
    console.error(`Tag v${number} pas créé ou pas envoyé : le faire à la main.`);
  }
  try {
    execSync(`node scripts/verif.mjs ${version}`, { stdio: "inherit" });
  } catch {
    console.error(`La version ${version} est en ligne, mais la vérification a trouvé un problème (voir au-dessus).`);
    process.exitCode = 1;
  }
} finally {
  execSync(`git checkout -- ${file}`);
}
