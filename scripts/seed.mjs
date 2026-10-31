import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createHash, randomBytes } from "node:crypto";
import { GEAR, SPREADS } from "../public/js/shared/palette.js";

const DB = "croute-que-croute", FILE = ".wrangler/seed.sql", GAME = "http://localhost:8787";
const DAY = 86400000, HOUR = 3600000, NOW = Date.now(), CHUNK = 100, MIN_CS = 250;
const OPEN = process.argv.includes("--soiree");
const NAMES = [
  "Biscotte", "Croissant", "Pain Perdu", "Baguette", "Pistache", "Miette", "Tartinator", "Crouton", "Bretzel", "Ciabatta", "Focaccia",
  "Panini", "Bagel", "Muffin", "Gaufre", "Madeleine", "Chouquette", "Crumble", "Fougasse", "Beignet", "Kouign", "Canele"
];

if (process.argv.includes("--remote")) {
  console.error("Le seed ne touche que la base locale.");
  process.exit(1);
}

let state = 67;
const rng = () => {
  state = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(state ^ (state >>> 15), 1 | state);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = (list) => list[Math.floor(rng() * list.length)];
const between = (a, b) => a + rng() * (b - a);
const at20 = (daysAgo) => {
  const d = new Date(NOW - daysAgo * DAY);
  d.setHours(20, 0, 0, 0);
  return d.getTime();
};
const sha = (text) => createHash("sha256").update(text).digest("hex");
const keyOf = (pseudo) => pseudo.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const sql = (v) => (v === null || v === undefined ? "NULL" : typeof v === "number" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const local = (args) => execSync(`npx wrangler d1 ${args} ${DB} --local`, { stdio: ["ignore", "pipe", "pipe"] }).toString();

const events = [
  { id: 9001, name: "Space Tartinade test 1", opens: at20(15) },
  { id: 9002, name: "Space Tartinade test 2", opens: at20(8) },
  { id: 9003, name: "Space Tartinade test 3", opens: at20(2) }
].map((e) => ({ ...e, closes: e.opens + 6 * HOUR }));
if (OPEN) events.push({ id: 9004, name: "Soirée test en cours", opens: NOW - HOUR, closes: NOW + 3 * HOUR });
const SEED_EVENTS = "SELECT id FROM events WHERE id BETWEEN 9001 AND 9004";

const kinds = (slot) => Object.keys(GEAR).filter((k) => GEAR[k].slot === slot);
function look() {
  const worn = { head: rng() < 0.6 ? pick(kinds("head")) : null, side: rng() < 0.4 ? pick(kinds("side")) : null, bread: rng() < 0.3 ? pick(kinds("bread")) : null };
  const own = Object.fromEntries(Object.entries(worn).map(([slot, kind]) => [slot, Math.min(kinds(slot).length, (kind ? 1 : 0) + Math.floor(rng() * 3))]));
  return { ...worn, spread: pick(Object.keys(SPREADS)), ach: 3 + Math.floor(rng() * 20), own: { ...own, spread: 1 + Math.floor(rng() * 9) } };
}

function inEvent(at, pc) {
  return pc ? null : events.find((e) => at >= e.opens && at < e.closes) || null;
}

function timeFor(joined, regular, pc) {
  const open = events.filter((e) => e.opens >= joined);
  if (regular && !pc && open.length && rng() < 0.5) {
    const e = pick(open);
    return Math.min(NOW - 60000, between(e.opens, e.closes));
  }
  return between(joined, NOW - 60000);
}

const players = [];
function addPlayer(name, opts = {}) {
  const i = players.length + 1;
  const skill = opts.skill ?? between(0.15, 1), pc = opts.pc ?? rng() < 0.2, regular = opts.regular ?? rng() < 0.6;
  const joined = opts.joined ?? NOW - between(2, 21) * DAY;
  const n = opts.runs ?? Math.round(3 + rng() * (regular ? 110 : 30)), cap = (20 + skill * 125) * 100;
  const runs = Array.from({ length: n }, () => ({ at: timeFor(joined, regular, pc), score: Math.max(MIN_CS, Math.round(cap * rng() ** 1.8)), pc }));
  runs.push(...(opts.extra || []));
  players.push({ id: "seed-" + i, pseudo: name, joined, banned: opts.banned ? 1 : 0, token: opts.token || randomBytes(24).toString("hex"), look: opts.look === undefined ? look() : opts.look, runs });
}

const token = randomBytes(24).toString("hex");
for (const name of NAMES) addPlayer(name);
addPlayer("Testeur", {
  token, look: null, pc: false, regular: true, joined: NOW - 20 * DAY, runs: 64, skill: 0.25,
  extra: [
    { at: events[0].opens + 2 * HOUR, score: 5210 },
    { at: events[1].opens + 3 * HOUR, score: 9512 },
    { at: events[2].opens + HOUR, score: 4310 },
    { at: NOW - 3 * DAY, score: 180 },
    { at: NOW - 4 * DAY, score: 6742 },
    { at: NOW - 5 * DAY, score: 4000 }
  ]
});
addPlayer("Tricheur", { banned: true, look: null, runs: 2, skill: 0.3, extra: [{ at: NOW - DAY, score: 84000 }] });

const winner = players.find((p) => p.pseudo === "Testeur");
for (const p of players) {
  if (p === winner) continue;
  for (const r of p.runs) if (inEvent(r.at, r.pc)?.id === 9002) r.score = Math.min(r.score, 9000);
}

const taken = new Set();
try {
  const out = local(`execute --json --command "SELECT pseudo_key FROM profiles WHERE id NOT LIKE 'seed-%'"`);
  for (const row of JSON.parse(out.slice(out.indexOf("[")))[0].results) taken.add(row.pseudo_key);
} catch (e) {}
for (const p of players) {
  while (taken.has(keyOf(p.pseudo))) p.pseudo += "2";
  taken.add(keyOf(p.pseudo));
}

const rows = { profiles: [], runs: [], entries: [] };
for (const p of players) {
  const best = { mobile: null, pc: null }, entries = new Map();
  p.runs.sort((a, b) => a.at - b.at).forEach((r, k) => {
    const at = Math.round(r.at), elapsed = r.score * 10 + 400, event = inEvent(at, r.pc), device = r.pc ? "pc" : "mobile";
    rows.runs.push([`seed-run-${p.id}-${k}`, p.id, event ? event.id : null, at - elapsed, at, r.score, device]);
    const b = best[device];
    if (!b || r.score > b.score) best[device] = { score: r.score, at, elapsed };
    if (!event) return;
    const e = entries.get(event.id) || { best: 0, at: null, elapsed: null, runs: 0 };
    e.runs++;
    if (r.score > e.best) Object.assign(e, { best: r.score, at, elapsed });
    entries.set(event.id, e);
  });
  const m = best.mobile || { score: 0, at: null, elapsed: null }, c = best.pc || { score: 0, at: null, elapsed: null };
  rows.profiles.push([p.id, p.pseudo, keyOf(p.pseudo), sha(p.token), null, m.score, m.at, m.elapsed, p.runs.length, p.banned, Math.round(p.joined), c.score, c.at, c.elapsed, p.look ? JSON.stringify(p.look) : null]);
  for (const [eventId, e] of entries) rows.entries.push([eventId, p.id, e.best, e.at, e.elapsed, e.runs]);
}

function insert(table, cols, list) {
  const out = [];
  for (let i = 0; i < list.length; i += CHUNK) {
    const values = list.slice(i, i + CHUNK).map((row) => "(" + row.map(sql).join(", ") + ")").join(",\n");
    out.push(`INSERT INTO ${table} (${cols}) VALUES\n${values};`);
  }
  return out;
}

const script = [
  `DELETE FROM entries WHERE player_id LIKE 'seed-%' OR event_id IN (${SEED_EVENTS});`,
  `UPDATE runs SET event_id = NULL WHERE event_id IN (${SEED_EVENTS}) AND player_id NOT LIKE 'seed-%';`,
  "DELETE FROM runs WHERE player_id LIKE 'seed-%';",
  "DELETE FROM profiles WHERE id LIKE 'seed-%';",
  `DELETE FROM events WHERE id IN (${SEED_EVENTS});`,
  ...insert("events", "id, name, opens_at, closes_at, created_at", events.map((e) => [e.id, e.name, e.opens, e.closes, e.opens - DAY])),
  ...insert("profiles", "id, pseudo, pseudo_key, token, client_id, best, best_at, best_elapsed, run_count, banned, created_at, pc_best, pc_best_at, pc_best_elapsed, look", rows.profiles),
  ...insert("runs", "id, player_id, event_id, started_at, finished_at, score, device", rows.runs),
  ...insert("entries", "event_id, player_id, best, best_at, best_elapsed, run_count", rows.entries)
].join("\n");

local("migrations apply");
writeFileSync(FILE, script);
local(`execute --file ${FILE}`);
console.log(`Base locale remplie : ${players.length} joueurs, ${rows.runs.length} parties, ${events.length} soirées${OPEN ? " dont une en cours" : ""}.`);
console.log(`Jouer en Testeur : ${GAME}/?jeton=${token}`);
