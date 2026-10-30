import { DIR, playHuman, profileOf, median, fmt, NAMES } from "./jeu.mjs";

const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const JSON_OUT = process.argv.includes("--json");
const PLAYERS = Number(args[0]) || 80, GAMES = Number(args[1]) || 5, LIMIT = Number(args[2]) || 300;
const SEED = Number(process.env.SEED) || 70000;
const LEVELS = 5, UPSET_GAP = 0.2, BAND_S = 20, MID = [0.3, 0.7];

function ranks(v) {
  const idx = v.map((x, i) => [x, i]).sort((a, b) => a[0] - b[0]);
  const r = new Array(v.length);
  for (let i = 0; i < idx.length;) {
    let j = i;
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    for (let k = i; k <= j; k++) r[idx[k][1]] = (i + j) / 2;
    i = j + 1;
  }
  return r;
}

function spearman(a, b) {
  const ra = ranks(a), rb = ranks(b), n = a.length;
  const ma = ra.reduce((s, x) => s + x, 0) / n, mb = rb.reduce((s, x) => s + x, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i] - ma) * (rb[i] - mb);
    da += (ra[i] - ma) ** 2;
    db += (rb[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

function icc(players) {
  const ys = players.map((p) => p.games.map((g) => Math.log(g.t)));
  const n = ys.length, k = GAMES;
  const grand = ys.flat().reduce((s, x) => s + x, 0) / (n * k);
  const means = ys.map((y) => y.reduce((s, x) => s + x, 0) / k);
  const msb = (k * means.reduce((s, m) => s + (m - grand) ** 2, 0)) / (n - 1);
  const msw = ys.reduce((s, y, i) => s + y.reduce((a, x) => a + (x - means[i]) ** 2, 0), 0) / (n * (k - 1));
  return (msb - msw) / (msb + (k - 1) * msw);
}

const players = [];
for (let i = 0; i < PLAYERS; i++) {
  const skill = i / (PLAYERS - 1), prof = profileOf(skill), games = [];
  for (let k = 0; k < GAMES; k++) games.push(playHuman(SEED + i * 1009 + k * 37, prof, LIMIT));
  players.push({ skill, games, best: Math.max(...games.map((g) => g.t)) });
}
const all = players.flatMap((p) => p.games.map((g) => ({ skill: p.skill, ...g })));

let pairs = 0, upsets = 0;
for (let i = 0; i < PLAYERS; i++) {
  for (let j = i + 1; j < PLAYERS; j++) {
    if (players[j].skill - players[i].skill < UPSET_GAP) continue;
    pairs++;
    if (players[i].best > players[j].best) upsets++;
  }
}

const mid = all.filter((g) => g.skill >= MID[0] && g.skill <= MID[1]);
const risk = [];
for (let b = 0; b < LIMIT; b += BAND_S) {
  const alive = mid.filter((g) => g.t >= b).length;
  if (alive < 5) break;
  risk.push({ from: b, share: mid.filter((g) => g.dead && g.t >= b && g.t < b + BAND_S).length / alive });
}

const kills = {};
for (const g of all) if (g.dead) kills[g.killer] = (kills[g.killer] || 0) + 1;

const result = {
  game: DIR,
  seed: SEED,
  share: icc(players),
  rho: spearman(players.map((p) => p.skill), players.map((p) => p.best)),
  upsets: upsets / pairs,
  capped: all.filter((g) => !g.dead).length / all.length,
  levels: Array.from({ length: LEVELS }, (_, q) => {
    const ps = players.filter((p) => Math.min(LEVELS - 1, Math.floor(p.skill * LEVELS)) === q);
    return { median: median(ps.flatMap((p) => p.games.map((g) => g.t))), best: Math.max(...ps.map((p) => p.best)) };
  }),
  risk,
  kills
};

if (JSON_OUT) {
  console.log(JSON.stringify(result));
} else {
  console.log(`${DIR} : ${PLAYERS} joueurs, ${GAMES} parties chacun, limite ${LIMIT} s, graine ${SEED}`);
  console.log(`Part du niveau dans les écarts de score : ${fmt(result.share * 100, 0)} %`);
  console.log(`Un joueur nettement moins fort bat un plus fort : ${fmt(result.upsets * 100)} %`);
  console.log(`Parties qui atteignent la limite : ${fmt(result.capped * 100)} %`);
  result.levels.forEach((l, q) => console.log(`Niveau ${q + 1} : médiane ${fmt(l.median)} s, meilleur ${fmt(l.best)} s`));
  console.log("Risque de mort d'un joueur moyen par tranche de 20 s : " + risk.map((r) => `${r.from}-${r.from + BAND_S} s ${fmt(r.share * 100, 0)} %`).join(", "));
  console.log("Ce qui tue : " + Object.entries(kills).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${NAMES[id] || id} ${n}`).join(", "));
}
