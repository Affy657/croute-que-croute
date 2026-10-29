import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const PROD = "https://croute-que-croute.tartine-sauvage.workers.dev";
const DB = "croute-que-croute";
const URGENT = "--pendant-soiree";

const run = (cmd) => execSync(cmd).toString();
const stop = (why) => {
  console.error(`Mise en ligne refusée : ${why}`);
  process.exit(1);
};

if (run("git status --porcelain").trim()) stop("des changements ne sont pas enregistrés dans git.");
if (!run(`npx wrangler d1 migrations list ${DB} --remote`).includes("No migrations to apply")) {
  stop("une migration n'est pas encore appliquée en ligne. Lancer d'abord npm run db:remote.");
}
const board = await fetch(PROD + "/api/board").then((r) => r.json()).catch(() => null);
if (!board) stop("impossible de savoir si une soirée est ouverte.");
if (board.event?.status === "open" && !process.argv.includes(URGENT)) {
  stop(`la soirée « ${board.event.name} » est ouverte. En cas d'urgence seulement : npm run deploy -- ${URGENT}`);
}

const hash = execSync("git rev-parse --short HEAD").toString().trim();
const version = `${Date.now().toString(36)}-${hash}`;
const file = "public/js/version.js";

writeFileSync(file, `export const VERSION = "${version}";\n`);
try {
  execSync(`npx wrangler deploy --var APP_VERSION:${version}`, { stdio: "inherit" });
  console.log(`Version en ligne : ${version}`);
} finally {
  execSync(`git checkout -- ${file}`);
}
