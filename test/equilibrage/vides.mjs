import { DIR, createSim, ATTACKS, field, mulberry32, solverPilot, median, fmt } from "./jeu.mjs";

const GAMES = Number(process.argv[2]) || 12, LIMIT = Number(process.argv[3]) || 150;
const BANDS = [[28, 60], [60, 90], [90, 150]];
const { FW, FH, M, STEP } = field;

const calm = new Set(ATTACKS.filter((a) => a.calm).map((a) => a.id));
const leave = (items) => {
  let end = 0;
  for (const w of items) {
    for (const o of w.obs) {
      const tx = o.vx > 0 ? (FW + M - o.x) / o.vx : o.vx < 0 ? (o.x + M) / -o.vx : Infinity;
      const ty = o.vy > 0 ? (FH + M - o.y) / o.vy : o.vy < 0 ? (o.y + M) / -o.vy : Infinity;
      end = Math.max(end, w.at + Math.min(tx, ty));
    }
  }
  return end;
};

const rows = [];
for (let g = 0; g < GAMES; g++) {
  const sim = createSim(mulberry32(4242 + g * 31)), s = sim.state, pilot = solverPilot(sim), spawns = [];
  let count = 0;
  while (!s.dead && s.t < LIMIT) {
    const before = new Set(s.warns);
    const move = pilot();
    sim.step(STEP, move.x, move.y);
    if (s.stats.spawned === count) continue;
    count = s.stats.spawned;
    const items = s.warns.filter((w) => !before.has(w));
    spawns.push({ t: s.t, id: s.last, first: Math.min(...items.map((w) => w.at)), last: Math.max(...items.map((w) => w.at)), gone: leave(items) });
  }
  for (let i = 1; i + 1 < spawns.length; i++) {
    const p = spawns[i - 1], a = spawns[i], b = spawns[i + 1];
    rows.push({ t: a.t, calm: calm.has(a.id), before: a.first - p.last, quiet: b.first - a.last, stay: a.gone - a.last, spacing: b.first - a.first });
  }
}

console.log(`${DIR} : ${GAMES} parties du robot parfait. Après une attaque calme (murs en série) :`);
console.log("Tranche".padEnd(12) + "Séries".padStart(8) + "Vide avant".padStart(14) + "Vide après".padStart(14) + "Dernier mur à l'écran".padStart(24) + "Écart normal".padStart(15));
for (const [lo, hi] of BANDS) {
  const c = rows.filter((r) => r.calm && r.t >= lo && r.t < hi), n = rows.filter((r) => !r.calm && r.t >= lo && r.t < hi);
  console.log(`${lo}-${hi} s`.padEnd(12) + String(c.length).padStart(8) + `${fmt(median(c.map((r) => r.before)), 2)} s`.padStart(14) + `${fmt(median(c.map((r) => r.quiet)), 2)} s`.padStart(14) +
    `${fmt(median(c.map((r) => r.stay)), 2)} s`.padStart(24) + `${fmt(median(n.map((r) => r.spacing)), 2)} s`.padStart(15));
}
