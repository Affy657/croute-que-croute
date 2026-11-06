import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

const LAST_FREE = 15;
const ALLOWED = [];
const BREAKS = /\bDROP\s+TABLE\b|\bDROP\s+COLUMN\b|\bALTER\s+TABLE\s+\S+\s+DROP\b|\bRENAME\b/i;

const breaks = (sql) => BREAKS.test(sql.replace(/--.*$/gm, ""));
const number = (file) => Number(file.split("_")[0]);
const checked = (files) => files.filter((f) => f.endsWith(".sql") && number(f) > LAST_FREE && !ALLOWED.includes(f));

test("une migration laisse marcher la version d'avant : ni DROP TABLE, ni DROP COLUMN, ni RENAME après la 0015", () => {
  const files = checked(readdirSync("migrations"));
  assert.deepEqual(files.filter((f) => breaks(readFileSync(`migrations/${f}`, "utf8"))), []);
});

test("le contrôle ne regarde que les migrations au-dessus de la 0015", () => {
  assert.deepEqual(checked(["0015_sortis.sql", "0016_suite.sql", "0100_loin.sql", "lisezmoi.txt"]), ["0016_suite.sql", "0100_loin.sql"]);
});

test("le contrôle reconnaît chaque écriture qui casse la version d'avant", () => {
  for (const sql of ["DROP TABLE links;", "drop  table links;", "ALTER TABLE profiles DROP COLUMN client_id;", "alter table profiles\r\n  drop column client_id;", "ALTER TABLE profiles DROP client_id;", "ALTER TABLE profiles RENAME TO joueurs;", "ALTER TABLE profiles RENAME COLUMN pseudo TO nom;"]) assert.ok(breaks(sql), sql);
});

test("le contrôle laisse passer ce qui garde la version d'avant en marche", () => {
  for (const sql of ["ALTER TABLE profiles ADD COLUMN steps TEXT;", "CREATE INDEX runs_player ON runs (player_id);", "DROP INDEX runs_player;", "-- pas de DROP COLUMN ici\nCREATE TABLE sortis (token_hash TEXT PRIMARY KEY);"]) assert.ok(!breaks(sql), sql);
});
