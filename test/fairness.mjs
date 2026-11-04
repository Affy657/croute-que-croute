import { createSim } from "../public/js/game/sim.js";
import { STEP, FW, FH } from "../public/js/game/field.js";
import { planPath } from "./chemin.mjs";

const GAMES = Number(process.argv[2]) || 100;
const LIMIT = Number(process.argv[3]) || 120;
const PER_CELL = 4;

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function playSolver(seed, fair) {
  const sim = createSim(mulberry32(seed), { fair, audit: true });
  const s = sim.state;
  let path = null, idx = 0, left = 0, seen = -1, from = null, to = null, stuck = 0;
  while (!s.dead && s.t < LIMIT) {
    if (left === 0) {
      if (!path || s.stats.spawned !== seen || idx >= path.length - 1) {
        seen = s.stats.spawned;
        path = planPath(s);
        idx = 0;
        if (!path) stuck++;
      }
      from = { x: s.toast.x, y: s.toast.y };
      to = path ? path[Math.min(++idx, path.length - 1)] : from;
      left = PER_CELL;
    }
    const k = (PER_CELL - left + 1) / PER_CELL;
    sim.step(STEP, from.x + (to.x - from.x) * k - s.toast.x, from.y + (to.y - from.y) * k - s.toast.y);
    left--;
  }
  return { dead: s.dead, t: s.t, stuck, stats: s.stats };
}

function playStill(seed) {
  const sim = createSim(mulberry32(seed));
  while (!sim.state.dead && sim.state.t < LIMIT) sim.step(STEP, 0, 0);
  return sim.state.t;
}

function sanity() {
  const sim = createSim(mulberry32(7));
  const s = sim.state;
  s.t = 10;
  s.next = 99;
  for (let x = 18; x < FW; x += 30) {
    s.warns.push({ x, y: 10, a: Math.PI / 2, at: 10.5, obs: [{ kind: "fork", x, y: -50, vx: 0, vy: 300, a: Math.PI / 2, spin: 0, len: 58, rad: 6, near: false }] });
  }
  const closed = planPath(s) === null;
  s.warns = s.warns.filter((w) => Math.abs(w.x - FW / 2) > 50);
  const open = planPath(s) !== null;
  return closed && open;
}

function run(fair) {
  let deaths = 0, stuck = 0, spawned = 0, rejected = 0, impossible = 0, solves = 0, solveMs = 0, solveMax = 0;
  const deathTimes = [], own = {};
  for (let g = 1; g <= GAMES; g++) {
    const r = playSolver(g, fair);
    if (r.dead) { deaths++; deathTimes.push(r.t); }
    stuck += r.stuck;
    spawned += r.stats.spawned;
    rejected += r.stats.rejected;
    impossible += r.stats.impossible;
    for (const [id, n] of Object.entries(r.stats.own)) own[id] = (own[id] || 0) + n;
    solves += r.stats.solves;
    solveMs += r.stats.solveMs;
    solveMax = Math.max(solveMax, r.stats.solveMax);
  }
  return { deaths, stuck, spawned, rejected, impossible, own, solveAvg: solveMs / solves, solveMax, deathTimes: deathTimes.sort((a, b) => a - b) };
}

const started = performance.now();
const sane = sanity();
const fair = run(true);
const unfair = run(false);
const still = Array.from({ length: 30 }, (_, i) => playStill(1000 + i)).sort((a, b) => a - b);
const pct = (a, b) => ((100 * a) / b).toFixed(1) + " %";
const blamed = (own) => {
  const list = Object.entries(own);
  const total = list.reduce((sum, [, n]) => sum + n, 0);
  return `${total} à cause de l'attaque elle-même${total ? ` (${list.map(([id, n]) => `${id} ${n}`).join(", ")})` : ""}`;
};

console.log(`Contrôle du solveur (mur sans trou = impossible, mur avec trou = possible) : ${sane ? "OK" : "ÉCHEC"}`);
console.log(`AVEC le solveur : ${GAMES} parties de ${LIMIT} s jouées par le robot, ${fair.deaths} mort(s), ${fair.stuck} fois sans chemin`);
console.log(`  attaques lancées ${fair.spawned}, remplacées ${fair.rejected} (${pct(fair.rejected, fair.spawned + fair.rejected)}), dont ${blamed(fair.own)} (le reste : tartine déjà trop près d'un couvert)`);
console.log(`  vérification d'une attaque : ${fair.solveAvg.toFixed(2)} ms en moyenne, ${fair.solveMax.toFixed(1)} ms au pire`);
console.log(`SANS le solveur : ${unfair.deaths} mort(s) du robot sur ${GAMES}, ${unfair.impossible} attaques impossibles lancées (${pct(unfair.impossible, unfair.spawned)}), dont ${blamed(unfair.own)}`);
if (unfair.deathTimes.length) console.log(`  premières morts à ${unfair.deathTimes.slice(0, 5).map((t) => t.toFixed(1) + " s").join(", ")}`);
console.log(`Joueur immobile : meurt en ${still[15].toFixed(2)} s (médiane)`);
console.log(`Durée du test : ${((performance.now() - started) / 1000).toFixed(1)} s`);
process.exit(sane && !fair.deaths && !fair.stuck ? 0 : 1);
