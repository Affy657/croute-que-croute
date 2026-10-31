import { spawn, execSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const PORT = 8790, BASE = `http://127.0.0.1:${PORT}`, FILES = ["test/player.mjs", "test/admin.mjs"];
const WINDOWS = process.platform === "win32";
const dir = mkdtempSync(join(tmpdir(), "croute-api-"));

execSync(`npx wrangler d1 migrations apply croute-que-croute --local --persist-to "${dir}"`, { stdio: "ignore" });
const server = spawn(`npx wrangler dev --ip 127.0.0.1 --port ${PORT} --persist-to "${dir}" --show-interactive-dev-session=false`, { shell: true, stdio: "ignore", detached: !WINDOWS });

function stop() {
  try {
    if (WINDOWS) execSync(`taskkill /pid ${server.pid} /T /F`, { stdio: "ignore" });
    else process.kill(-server.pid);
  } catch {}
  try {
    rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {}
}

let failed = false;
try {
  for (const file of FILES) {
    try {
      execSync(`node ${file} ${BASE}`, { stdio: "inherit" });
    } catch {
      failed = true;
    }
  }
} finally {
  stop();
}
process.exit(failed ? 1 : 0);
