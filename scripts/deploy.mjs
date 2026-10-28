import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const hash = execSync("git rev-parse --short HEAD").toString().trim();
const version = `${Date.now().toString(36)}-${hash}`;
const file = "public/version.js";

writeFileSync(file, `export const VERSION = "${version}";\n`);
try {
  execSync(`npx wrangler deploy --var APP_VERSION:${version}`, { stdio: "inherit" });
  console.log(`Version en ligne : ${version}`);
} finally {
  execSync(`git checkout -- ${file}`);
}
