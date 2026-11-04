import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = fileURLToPath(new URL("../..", import.meta.url));

test("variante : la copie du coeur du jeu se charge et démarre", async () => {
  const dir = mkdtempSync(join(tmpdir(), "variante-"));
  try {
    cpSync(join(ROOT, "public/js"), join(dir, "public/js"), { recursive: true });
    writeFileSync(join(dir, "package.json"), '{"type":"module"}');
    execFileSync(process.execPath, [join(ROOT, "test/equilibrage/variante.mjs"), "essai"], { cwd: dir });
    const { createSim } = await import(pathToFileURL(join(dir, ".equilibrage/essai/sim.js")).href);
    assert.equal(createSim().state.dead, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
