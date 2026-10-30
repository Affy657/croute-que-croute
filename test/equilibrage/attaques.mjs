import { DIR, playHuman, profileOf, NAMES, fmt } from "./jeu.mjs";

const GAMES = Number(process.argv[2]) || 300, LIMIT = Number(process.argv[3]) || 300;
const PROFILES = [["Débutant", 0.1], ["Moyen", 0.5], ["Fort", 0.9]];
const COL = 16;

const stats = PROFILES.map(([name, skill]) => {
  const kills = {}, spawns = {};
  for (let g = 0; g < GAMES; g++) {
    const r = playHuman(30000 + g * 17, profileOf(skill), LIMIT);
    if (r.dead) kills[r.killer] = (kills[r.killer] || 0) + 1;
    for (const s of r.spawns) spawns[s.id] = (spawns[s.id] || 0) + 1;
  }
  return { name, kills, spawns };
});

console.log(`${DIR} : ${GAMES} parties par profil. Morts pour 100 lancées (et nombre de morts).`);
console.log("Attaque".padEnd(26) + stats.map((s) => s.name.padStart(COL)).join(""));
const ids = Object.keys(NAMES).filter((id) => id !== "walls" && stats.some((s) => s.spawns[id]));
for (const id of ids) {
  const cells = stats.map((s) => {
    const n = s.spawns[id] || 0, k = s.kills[id] || 0;
    return (n ? `${fmt((k / n) * 100)} (${k})` : "-").padStart(COL);
  });
  console.log(NAMES[id].padEnd(26) + cells.join(""));
}
