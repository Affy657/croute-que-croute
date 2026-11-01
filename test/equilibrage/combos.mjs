import { Worker, isMainThread, parentPort } from "node:worker_threads";
import { availableParallelism } from "node:os";
import { fileURLToPath } from "node:url";
import { DIR, ATTACKS, createSim, playHuman, profileOf, mulberry32, field, fmt } from "./jeu.mjs";

const TAIL = 4, SEED = 50000, TOP = 12, EXTEND = 4, COL = 9;
const REGIMES = [
  { label: "Moyen à 45 s", t0: 45, skill: 0.5 },
  { label: "Moyen à 65 s", t0: 65, skill: 0.5 }
];

function trial(seq, t0, skill, seed, still) {
  const ids = seq.map((id) => ATTACKS.find((a) => a.id === id));
  const pos = mulberry32(seed ^ 0x2545f491);
  let end = Infinity, refused = false;
  const setup = (sim) => {
    sim.state.toast.x = 40 + pos() * (field.FW - 80);
    sim.state.toast.y = field.FH * (0.35 + pos() * 0.5);
    sim.state.next = 0.3;
  };
  const tick = (sim) => {
    const s = sim.state, k = s.stats.spawned;
    if (s.stats.rejected) refused = true;
    if (k < ids.length && !refused) s.queued = s.queued || ids[k];
    else if (end === Infinity) {
      s.next = Infinity;
      end = s.t + TAIL;
    }
    return s.t > end || (end < Infinity && !s.obs.length && !s.warns.length);
  };
  if (!still) {
    const r = playHuman(seed, profileOf(skill), t0 + 30, { t0, setup, tick });
    return { refused, dead: r.dead };
  }
  const sim = createSim(mulberry32(seed), { t0 });
  setup(sim);
  while (!sim.state.dead && !tick(sim)) sim.step(field.STEP, 0, 0);
  return { refused, dead: sim.state.dead };
}

function runTask({ seq, t0, skill, trials }) {
  let n = 0, deaths = 0, refused = 0, still = 0;
  for (let i = 0; i < trials; i++) {
    const seed = SEED + i * 7919;
    const r = trial(seq, t0, skill, seed, false);
    if (r.refused) refused++;
    n++;
    if (r.dead) deaths++;
    const calm = trial(seq, t0, skill, seed, true);
    if (!calm.dead && !calm.refused) still++;
  }
  return { n, deaths, refused, still };
}

if (!isMainThread) {
  parentPort.on("message", (task) => parentPort.postMessage({ key: task.key, ...runTask(task) }));
} else {
  const TRIALS = Number(process.argv[2]) || 300;
  const byId = Object.fromEntries(ATTACKS.map((a) => [a.id, a]));
  const name = (id) => byId[id].name;
  const fits = (seq, a) => {
    const prev = byId[seq[seq.length - 1]];
    if (!prev) return true;
    if (a.id === prev.id && a.solo) return false;
    if (prev.kin && a.kin === prev.kin && a.id !== prev.id) return false;
    if ((a.avoids || []).includes(prev.id)) return false;
    return !seq.slice(-2).some((id) => (a.shuns || []).includes(id) || (byId[id].shuns || []).includes(a.id));
  };

  const workers = Array.from({ length: Math.max(1, availableParallelism() - 1) }, () => new Worker(fileURLToPath(import.meta.url)));
  async function measure(tasks) {
    const out = {}, queue = [...tasks];
    await Promise.all(workers.map((w) => new Promise((done) => {
      const next = () => {
        const task = queue.shift();
        if (!task) return done();
        w.once("message", (r) => {
          out[r.key] = r;
          next();
        });
        w.postMessage(task);
      };
      next();
    })));
    return out;
  }

  const started = Date.now();
  const rate = (r) => (r.n ? r.deaths / r.n : NaN);
  const se = (p, n) => Math.sqrt(Math.max(p * (1 - p), 0.25 / n) / Math.max(n, 1));
  const pct = (p) => fmt(p * 100);
  console.log(`${DIR} : ${TRIALS} essais par enchaînement, départ à une place tirée au hasard, rien d'autre à l'écran.`);
  console.log("Refusés = attaque suivante refusée par le jeu (impossible à esquiver) : l'essai continue sans elle.");
  console.log("Morts = morts pour 100 essais. En trop = morts en plus de ce que donneraient les attaques jouées chacune de leur côté.");
  console.log("Sans bouger = essais réussis par une tartine immobile. ! = écart plus grand que 2 fois le bruit de mesure.");

  for (const { label, t0, skill } of REGIMES) {
    const open = ATTACKS.filter((a) => !a.lab && a.from < t0);
    const focus = process.env.ATTAQUE;
    const job = (seq) => ({ key: seq.join(">"), seq, t0, skill, trials: TRIALS });
    const singles = await measure(open.map((a) => job([a.id])));
    const pairs = open.flatMap((a) => open.filter((b) => fits([a.id], b)).map((b) => [a.id, b.id])).filter((p) => !focus || p.includes(focus));
    const pairRes = await measure(pairs.map(job));

    const scored = (seqs, res, base) => seqs.map((seq) => {
      const r = res[seq.join(">")], p = rate(r);
      const pre = base[seq.slice(0, -1).join(">")], last = singles[seq[seq.length - 1]];
      const expect = 1 - (1 - rate(pre)) * (1 - rate(last));
      const noise = Math.hypot(se(p, r.n), se(rate(pre), pre.n), se(rate(last), last.n));
      return { seq, r, p, excess: p - expect, noise };
    }).filter((x) => x.r.n >= TRIALS / 4);

    const show = (title, rows) => {
      console.log(`\n${title}`);
      console.log("".padEnd(60) + ["Morts", "En trop", "Sans bouger", "Refusés"].map((h) => h.padStart(COL + 3)).join(""));
      for (const x of rows) {
        const flag = Math.abs(x.excess) > 2 * x.noise ? " !" : "  ";
        const cells = [pct(x.p), (x.excess > 0 ? "+" : "") + pct(x.excess) + flag, pct(x.r.still / x.r.n), String(x.r.refused)];
        console.log(x.seq.map(name).join(" > ").padEnd(60) + cells.map((c) => c.padStart(COL + 3)).join(""));
      }
    };

    console.log(`\n=== ${label} ===`);
    show("Attaques seules", open.map((a) => ({ seq: [a.id], r: singles[a.id], p: rate(singles[a.id]), excess: 0, noise: 1 })).sort((a, b) => b.p - a.p));
    const ps = scored(pairs, pairRes, singles).sort((a, b) => b.excess - a.excess);
    show(`Paires les plus dures (sur ${ps.length})`, ps.slice(0, TOP));
    show("Paires les plus faciles", ps.slice(-TOP).reverse());

    console.log("\nMorts en trop pour 100, ligne = première attaque, colonne = celle qui suit");
    const short = (id) => name(id).slice(0, 6);
    console.log("".padEnd(24) + open.map((b) => short(b.id).padStart(7)).join(""));
    for (const a of open) {
      const cells = open.map((b) => {
        const x = ps.find((y) => y.seq[0] === a.id && y.seq[1] === b.id);
        return (x ? (x.excess > 0 ? "+" : "") + fmt(x.excess * 100, 0) + (Math.abs(x.excess) > 2 * x.noise ? "!" : " ") : "-").padStart(7);
      });
      console.log(name(a.id).padEnd(24) + cells.join(""));
    }

    const roots = focus ? [] : ps.slice(0, EXTEND).map((x) => x.seq);
    const triples = roots.flatMap((seq) => open.filter((c) => fits(seq, c)).map((c) => [...seq, c.id]));
    const tripleRes = await measure(triples.map(job));
    const ts = scored(triples, tripleRes, pairRes).sort((a, b) => b.excess - a.excess);
    show(`Suites de 3 les plus dures (sur ${ts.length}, en partant des ${EXTEND} paires les plus dures)`, ts.slice(0, TOP));
    show("Suites de 3 les plus faciles", ts.slice(-TOP).reverse());
  }
  console.log(`\nDurée : ${((Date.now() - started) / 1000).toFixed(0)} s`);
  for (const w of workers) w.terminate();
}
