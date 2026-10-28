import { execSync } from "node:child_process";
import { copyFileSync, existsSync, rmSync, writeFileSync } from "node:fs";

const hash = execSync("git rev-parse --short HEAD").toString().trim();
const version = `${Date.now().toString(36)}-${hash}-test`;
const music = "music-test/theme.mp3";
const target = "public/music/theme.mp3";

writeFileSync("public/version.js", `export const VERSION = "${version}";\n`);
if (existsSync(music)) copyFileSync(music, target);
try {
  execSync(`npx wrangler versions upload --preview-alias test --var APP_VERSION:${version}`, { stdio: "inherit" });
  console.log(`Version de test : ${version} (la prod ne change pas)`);
} finally {
  execSync("git checkout -- public/version.js");
  rmSync(target, { force: true });
}
