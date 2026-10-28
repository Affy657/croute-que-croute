import { execSync } from "node:child_process";
import { copyFileSync, existsSync, readdirSync, rmSync, writeFileSync } from "node:fs";

const hash = execSync("git rev-parse --short HEAD").toString().trim();
const version = `${Date.now().toString(36)}-${hash}-test`;
const source = "music-test";
const copied = existsSync(source) ? readdirSync(source).filter((f) => /^theme\.(m4a|mp3)$/.test(f)) : [];

writeFileSync("public/version.js", `export const VERSION = "${version}";\n`);
for (const f of copied) copyFileSync(`${source}/${f}`, `public/music/${f}`);
try {
  execSync(`npx wrangler versions upload --preview-alias test --var APP_VERSION:${version}`, { stdio: "inherit" });
  console.log(`Version de test : ${version}, musique : ${copied.join(", ") || "aucune"} (la prod ne change pas)`);
} finally {
  execSync("git checkout -- public/version.js");
  for (const f of copied) rmSync(`public/music/${f}`, { force: true });
}
