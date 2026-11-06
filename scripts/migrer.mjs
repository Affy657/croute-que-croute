import { execSync } from "node:child_process";
import { blocked, gitProblem } from "./garde.mjs";

const PROD = "https://croute-que-croute.tartine-sauvage.workers.dev";
const DB = "croute-que-croute";

const run = (cmd) => execSync(cmd).toString();
const stop = (why) => {
  console.error(`Migration refusée : ${why}`);
  process.exit(1);
};

const dirty = gitProblem({ status: run("git status --porcelain"), branch: run("git rev-parse --abbrev-ref HEAD"), ahead: run("git rev-list --count origin/master..HEAD") });
if (dirty) stop(dirty);
const board = await fetch(PROD + "/api/board").then((r) => (r.ok ? r.json() : null)).catch(() => null);
if (!board) stop("impossible de savoir si une soirée est ouverte.");
const busy = blocked(board, process.argv, "npm run db:remote");
if (busy) stop(busy);

try {
  execSync(`npx wrangler d1 migrations apply ${DB} --remote`, { stdio: "inherit" });
} catch {
  stop("wrangler a échoué (voir au-dessus).");
}
