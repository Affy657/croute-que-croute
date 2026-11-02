import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const SOURCE = readFileSync(new URL("../../src/worker.ts", import.meta.url), "utf8");
const LINES = SOURCE.split(/\r?\n/).filter((l) => /\{ method: "/.test(l));
const ROUTES = LINES.map((l) => l.match(/\{ method: "(\w+)", path: (.+?), (?:access: "(\w+)", )?run: ([\w.]+) \}/)).filter(Boolean)
  .map(([, method, path, access, run]) => ({ method, path, access, run }));
const OPEN = new Set(["admin.login", "admin.accept"]);
const OWNER = /\/api\/admin\/(team|errors|invites)/;

test("chaque route de worker.ts est lue par ce test", () => {
  assert.ok(ROUTES.length > 20);
  assert.equal(ROUTES.length, LINES.length);
});

test("chaque route admin demande une connexion, sauf la connexion et l'invitation", () => {
  const admin = ROUTES.filter((r) => r.path.includes("/api/admin"));
  for (const r of admin) {
    if (OPEN.has(r.run)) assert.equal(r.access, undefined, r.path);
    else assert.ok(r.access === "admin" || r.access === "owner", `${r.method} ${r.path} est ouverte à tous`);
  }
  assert.equal(admin.filter((r) => OPEN.has(r.run)).length, OPEN.size);
});

test("équipe, invitations et erreurs des joueurs : réservées au propriétaire", () => {
  const owner = ROUTES.filter((r) => OWNER.test(r.path));
  assert.ok(owner.length >= 6);
  for (const r of owner) assert.equal(r.access, "owner", `${r.method} ${r.path}`);
});

test("les routes des joueurs ne passent jamais par une connexion admin", () => {
  for (const r of ROUTES.filter((r) => !r.path.includes("/api/admin"))) assert.equal(r.access, undefined, r.path);
});
