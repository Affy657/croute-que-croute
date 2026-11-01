import { DIR, createSim, ATTACKS, CALM_PASS, gapTo, field, mulberry32, solverPilot } from "./jeu.mjs";

const GAMES = Number(process.argv[2]) || 120, LIMIT = Number(process.argv[3]) || 150;
const SOLVER_GAMES = 20, SOLVER_LIMIT = 300, TRAIN_LIMIT = 90, LINGER_S = 12, MISS_PX = 3;
const { STEP, FW, FH, M, OUT, HIT_R, X_MIN, X_MAX, Y_MIN, Y_MAX } = field;

const byId = Object.fromEntries(ATTACKS.map((a) => [a.id, a]));
const fin = (v) => typeof v === "number" && Number.isFinite(v);
const issues = new Map();
const report = (key, info) => {
  const e = issues.get(key) || { n: 0, first: info };
  e.n++;
  issues.set(key, e);
};
let games = 0, steps = 0, maxObs = 0, deepest = 0;

function passAt(items) {
  let end = 0;
  for (const w of items) {
    for (const o of w.obs) {
      const tx = o.vx > 0 ? (FW + M - o.x) / o.vx : o.vx < 0 ? (o.x + M) / -o.vx : Infinity;
      const ty = o.vy > 0 ? (FH + M - o.y) / o.vy : o.vy < 0 ? (o.y + M) / -o.vy : Infinity;
      end = Math.max(end, w.at + CALM_PASS * Math.min(tx, ty));
    }
  }
  return end;
}

function jitter(prng) {
  let hold = { n: 0 };
  return () => {
    if (hold.n <= 0) {
      const r = prng();
      hold = r < 0.3 ? { x: 0, y: 0, n: 1 + prng() * 30 }
        : r < 0.6 ? { x: (prng() - 0.5) * 20, y: (prng() - 0.5) * 20, n: 1 + prng() * 60 }
        : r < 0.9 ? { x: (prng() - 0.5) * 300, y: (prng() - 0.5) * 300, n: 1 + prng() * 5 }
        : { x: (prng() - 0.5) * 2e4, y: (prng() - 0.5) * 2e4, n: 1 };
    }
    hold.n--;
    return { x: hold.x, y: hold.y };
  };
}

function play(seed, style, { only = null, t0 = 0, limit = LIMIT, dt = STEP } = {}) {
  const sim = createSim(mulberry32(seed), only ? { only, t0 } : {});
  const s = sim.state, born = new WeakMap(), run = [];
  const move = style === "robot" ? solverPilot(sim) : style === "nerveux" ? jitter(mulberry32(seed ^ 0x9e3779b9))
    : style === "bords" ? () => { const c = Math.floor(s.t / 3) % 4; return { x: [1e4, -1e4, 0, 0][c], y: [0, 0, 1e4, -1e4][c] }; }
    : () => ({ x: 0, y: 0 });
  const where = (extra) => ({ seed, style, only, t: +s.t.toFixed(3), ...extra });
  let seriesEnd = -Infinity, guard = 0;
  games++;
  while (!s.dead && s.t < t0 + limit && guard++ < 2000 + (limit / STEP) * 2) {
    const { x: mx, y: my } = move();
    const px = s.toast.x, py = s.toast.y, spawned = s.stats.spawned;
    const before = s.obs.map((o) => ({ o, x: o.x, y: o.y, a: o.a, vx: o.vx }));
    try {
      sim.step(dt, mx, my);
    } catch (e) {
      report("exception : " + e.message, where({}));
      return s;
    }
    steps++;
    if (![s.t, s.next, s.toast.x, s.toast.y].every(fin)) report("valeur NaN ou infinie dans l'état", where({ next: s.next }));
    if (!s.dead && (s.toast.x < X_MIN || s.toast.x > X_MAX || s.toast.y < Y_MIN || s.toast.y > Y_MAX)) report("tartine hors du terrain", where({}));
    if (!s.dead && !(s.next > 0)) report("prochaine attaque à 0 ou moins", where({ next: s.next }));
    for (const o of s.obs) {
      if (![o.x, o.y, o.vx, o.vy, o.a].every(fin)) report("valeur NaN dans un couvert", where({ kind: o.kind }));
      if (!born.has(o)) born.set(o, s.t);
      if (s.t - born.get(o) > LINGER_S) report(`couvert à l'écran plus de ${LINGER_S} s`, where({ kind: o.kind, from: o.from }));
      if (o.x < -OUT - 20 || o.x > FW + OUT + 20 || o.y < -OUT - 20 || o.y > FH + OUT + 20) report("couvert sorti mais gardé", where({ kind: o.kind }));
    }
    for (const w of s.warns) if (!s.dead && w.at < s.t) report("annonce jamais lancée", where({ at: w.at }));
    maxObs = Math.max(maxObs, s.obs.length);
    if (s.stats.spawned !== spawned) {
      const id = s.last, a = byId[id];
      if (!only) {
        if (a.lab) report("prototype lancé en partie", where({ id }));
        if (!(s.t > a.from)) report("attaque avant son heure", where({ id, from: a.from }));
        if (s.t < seriesEnd - STEP * 1.5) report("attaque lancée trop tôt après des murs en série", where({ id, seriesEnd }));
        run.push(id);
        let k = 1;
        for (let i = run.length - 2; i >= 0 && run[i] === id; i--) k++;
        const alone = !ATTACKS.some((b) => !b.lab && b.id !== id && s.t > b.from);
        if (k > (a.solo ? 1 : 3) && !alone) report("trop de fois la même attaque d'affilée", where({ id, k }));
        const prev = run[run.length - 2];
        if (prev && prev !== id && byId[prev].kin && byId[prev].kin === a.kin) report("deux attaques de la même famille d'affilée", where({ id, prev }));
        if (prev && (a.avoids || []).includes(prev)) report("attaque juste après une attaque qu'elle évite", where({ id, prev }));
      }
      if (a.calm) seriesEnd = passAt(s.warns.filter((w) => w.obs[0].from === id));
    }
    if (!only) {
      const froms = new Set([...s.obs.map((o) => o.from), ...s.warns.flatMap((w) => w.obs.map((o) => o.from))]);
      if (froms.has("rolling") && (froms.has("wall") || froms.has("walls"))) report("rouleau en même temps qu'un mur", where({}));
    }
    if (s.dead || dt !== STEP) continue;
    const parts = Math.max(1, Math.ceil(Math.hypot(mx, my) / 6)), pts = [];
    let x = px, y = py;
    for (let i = 1; i <= parts; i++) {
      x = Math.min(X_MAX, Math.max(X_MIN, x + mx / parts));
      y = Math.min(Y_MAX, Math.max(Y_MIN, y + my / parts));
      pts.push([x, y, i / parts]);
    }
    for (const b of before) {
      if (!s.obs.includes(b.o) || Math.abs(b.o.vx - b.vx) > 1e-9) continue;
      for (const [qx, qy, k] of pts) {
        const g = gapTo({ ...b.o, x: b.x + (b.o.x - b.x) * k, y: b.y + (b.o.y - b.y) * k, a: b.a + (b.o.a - b.a) * k }, qx, qy);
        if (g >= HIT_R) continue;
        deepest = Math.max(deepest, HIT_R - g);
        if (HIT_R - g > MISS_PX) report("couvert traversé sans toucher", where({ kind: b.o.kind, depth: +(HIT_R - g).toFixed(2) }));
      }
    }
  }
  return s;
}

const started = Date.now();
for (const style of ["immobile", "nerveux", "bords"]) for (let g = 0; g < GAMES; g++) play(1000 + g * 7919, style, { limit: style === "immobile" ? 30 : LIMIT });
let solverDeaths = 0;
for (let g = 0; g < SOLVER_GAMES; g++) if (play(50000 + g * 104729, "robot", { limit: SOLVER_LIMIT }).dead) solverDeaths++;
for (const a of ATTACKS) {
  for (let g = 0; g < 4; g++) if (play(7000 + g * 31, "robot", { only: a.id, t0: a.from, limit: TRAIN_LIMIT }).dead) report("robot mort à l'entraînement", { id: a.id });
  for (let g = 0; g < 20; g++) play(9000 + g * 13, "nerveux", { only: a.id, t0: a.from, limit: 60 });
}
for (const dt of [0, 0.1, 1e-6]) for (let g = 0; g < 20; g++) play(3000 + g, "nerveux", { dt, limit: dt === 0 ? 0.01 : 60 });
if (solverDeaths) report("robot parfait mort en partie", { morts: solverDeaths });

console.log(`${DIR} : ${games} parties, ${steps} pas, ${maxObs} couverts au plus en même temps, traversée la plus profonde ${deepest.toFixed(2)} px, robot parfait ${solverDeaths} mort(s) sur ${SOLVER_GAMES} parties de ${SOLVER_LIMIT} s, ${((Date.now() - started) / 1000).toFixed(0)} s`);
for (const [k, v] of issues) console.log(`PROBLÈME x${v.n} : ${k} ->`, JSON.stringify(v.first));
if (issues.size) process.exit(1);
console.log("Aucun problème.");
