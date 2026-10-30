import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const DIRS = process.argv.slice(2).length ? process.argv.slice(2) : ["public/js/game"];
const SEEDS = [70000, 170000];
const PLAYERS = 80, GAMES = 5, LIMIT = 300, BANDS = 4, COL = 18;

const run = (dir, seed) =>
  new Promise((ok, ko) =>
    execFile(process.execPath, [join(HERE, "population.mjs"), PLAYERS, GAMES, LIMIT, "--json"], { env: { ...process.env, GAME: dir, SEED: seed }, maxBuffer: 1 << 24 },
      (err, out) => (err ? ko(err) : ok(JSON.parse(out)))));

const started = Date.now();
console.log(`${DIRS.length} version(s), ${SEEDS.length} séries de ${PLAYERS} joueurs x ${GAMES} parties chacune, en parallèle…`);
const results = await Promise.all(DIRS.map((dir) => Promise.all(SEEDS.map((seed) => run(dir, seed)))));

const mean = (rs, get) => rs.reduce((s, r) => s + get(r), 0) / rs.length;
const pct = (n) => (n * 100).toFixed(1).replace(".", ",") + " %";
const sec = (n) => n.toFixed(0) + " s";
const rows = [
  ["Part du niveau dans le score", (rs) => pct(mean(rs, (r) => r.share))],
  ["Plus faible bat plus fort", (rs) => pct(mean(rs, (r) => r.upsets))],
  ["Parties à la limite", (rs) => pct(mean(rs, (r) => r.capped))],
  ...[0, 1, 2, 3, 4].map((q) => [`Médiane niveau ${q + 1}`, (rs) => sec(mean(rs, (r) => r.levels[q].median))]),
  ...Array.from({ length: BANDS }, (_, b) => [`Risque moyen ${b * 20}-${b * 20 + 20} s`, (rs) => pct(mean(rs, (r) => r.risk[b]?.share ?? NaN))])
];

const label = (d) => d.replace(/\\/g, "/").replace(/\/$/, "").split("/").pop();
console.log("".padEnd(32) + DIRS.map((d) => label(d).padStart(COL)).join(""));
for (const [name, get] of rows) console.log(name.padEnd(32) + results.map((rs) => get(rs).padStart(COL)).join(""));
console.log(`Durée : ${((Date.now() - started) / 1000).toFixed(0)} s`);
