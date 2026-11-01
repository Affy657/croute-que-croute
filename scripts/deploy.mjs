import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PROD = "https://croute-que-croute.tartine-sauvage.workers.dev";
const DB = "croute-que-croute";
const URGENT = "--pendant-soiree";
const NUMBER = /^\d+\.\d+\.\d+$/;
const FULL = /^\d+\.\d+\.\d+\+[0-9a-f]+$/;

const run = (cmd) => execSync(cmd).toString();
const stop = (why) => {
  console.error(`Mise en ligne refusée : ${why}`);
  process.exit(1);
};
const parts = (v) => v.split(".").map(Number);
const newer = (a, b) => {
  const [x, y] = [parts(a), parts(b)];
  const i = x.findIndex((n, k) => n !== y[k]);
  return i >= 0 && x[i] > y[i];
};

const { version: number } = JSON.parse(readFileSync("package.json", "utf8"));
if (!NUMBER.test(number || "")) stop(`numéro de version illisible dans package.json : ${number}.`);

if (run("git status --porcelain").trim()) stop("des changements ne sont pas enregistrés dans git.");
if (run("git rev-parse --abbrev-ref HEAD").trim() !== "master") stop("on ne met en ligne que depuis master.");
if (run("git rev-list --count origin/master..HEAD").trim() !== "0") stop("master n'est pas envoyé sur GitHub : git push origin master.");
try {
  run("npx tsc --noEmit");
} catch (e) {
  console.error(String(e.stdout || ""));
  stop("le serveur ne compile pas (npm run check).");
}
if (!run(`npx wrangler d1 migrations list ${DB} --remote`).includes("No migrations to apply")) {
  stop("une migration n'est pas encore appliquée en ligne. Lancer d'abord npm run db:remote.");
}
const board = await fetch(PROD + "/api/board").then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (!board) stop("impossible de savoir si une soirée est ouverte.");
if (!FULL.test(board.version || "")) stop(`version en ligne illisible : ${String(board.version).slice(0, 40)}.`);
if (board.event?.status === "open" && !process.argv.includes(URGENT)) {
  stop(`la soirée « ${board.event.name} » est ouverte. En cas d'urgence seulement : npm run deploy -- ${URGENT}`);
}
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
  }
} finally {
  execSync(`git checkout -- ${file}`);
}
