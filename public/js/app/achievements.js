import { store, KEYS } from "../shared/store.js";
import { ATTACKS } from "../game/attacks.js";

const FAMILIES = [["time", "Temps"], ["play", "Frôlés et découvertes"], ["loyal", "Assiduité et soirées"], ["secret", "Secrets"]];
const TIMES = [[10, "t10"], [20, "t20"], [30, "t30"], [45, "t45"], [60, "t60"], [80, "t80"]];
const NEARS = [[5, "near5"], [20, "near20"]];
const RUNS = [[10, "runs10"], [50, "runs50"], [100, "runs100"]];
const STILL_S = 5, EXPRESS_CS = 200, EVENTS = 3, TOP = 10;

export const ACHIEVEMENTS = [
  { id: "t10", family: "time", name: "Premiers pas", desc: "Tenir 10 s" },
  { id: "t20", family: "time", name: "Bien beurrée", desc: "Tenir 20 s" },
  { id: "t30", family: "time", name: "Croustillante", desc: "Tenir 30 s" },
  { id: "t45", family: "time", name: "Dorée à point", desc: "Tenir 45 s" },
  { id: "t60", family: "time", name: "Une minute de gloire", desc: "Tenir 60 s" },
  { id: "t80", family: "time", name: "Tartine de légende", desc: "Tenir 80 s, jusqu'au bout de la montée" },
  { id: "near5", family: "play", name: "Ça passe", desc: "5 frôlés dans une partie" },
  { id: "near20", family: "play", name: "Ça passe crème", desc: "20 frôlés dans une partie" },
  { id: "jam", family: "play", name: "Confiture !", desc: "Voir un couteau à la confiture" },
  { id: "choco", family: "play", name: "Pâte à tartiner !", desc: "Voir un couteau à la pâte à tartiner" },
  { id: "honey", family: "play", name: "Miel !", desc: "Voir un couteau au miel" },
  { id: "ketchup", family: "play", name: "Ketchup ?!", desc: "Voir un couteau au ketchup" },
  { id: "allAttacks", family: "play", name: "Tout vu", desc: "Voir les " + ATTACKS.length + " attaques" },
  { id: "runs10", family: "loyal", name: "Dix tartines", desc: "Jouer 10 parties" },
  { id: "runs50", family: "loyal", name: "Boulangerie", desc: "Jouer 50 parties" },
  { id: "runs100", family: "loyal", name: "Accro à la croûte", desc: "Jouer 100 parties" },
  { id: "events3", family: "loyal", name: "Fidèle du Space", desc: "Jouer à 3 soirées" },
  { id: "top10", family: "loyal", name: "Dans le top", desc: "Entrer dans le top 10 d'une soirée" },
  { id: "eventWin", family: "loyal", name: "Tartine d'or", desc: "Finir 1er d'une soirée" },
  { id: "express", family: "secret", name: "Tartinée express", desc: "Se faire tartiner en moins de 2 s" },
  { id: "zen", family: "secret", name: "Zen", desc: "Rester 5 s sans bouger" },
  { id: "round", family: "secret", name: "Chiffre rond", desc: "Finir pile sur une seconde ronde" }
];
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

const blank = () => ({ got: {}, attacks: [], events: [], runs: 0 });

function load() {
  try {
    return { ...blank(), ...JSON.parse(store.get(KEYS.achievements) || "{}") };
  } catch (e) {
    return blank();
  }
}

let data = load(), fresh = [], run = null;
const listeners = [];

function change(fn) {
  data = load();
  const changed = fn(data);
  if (changed !== false) store.set(KEYS.achievements, JSON.stringify(data));
  return changed !== false;
}

window.addEventListener("storage", (e) => {
  if (e.key === KEYS.achievements) data = load();
});

function unlock(id) {
  if (data.got[id]) return;
  const done = change((d) => {
    if (d.got[id]) return false;
    d.got[id] = Date.now();
  });
  if (!done) return;
  const a = BY_ID[id];
  fresh.push(a);
  for (const fn of listeners) fn(a);
}

export const onUnlock = (fn) => listeners.push(fn);
export const runUnlocked = () => fresh.slice();
export const progress = () => ({ got: ACHIEVEMENTS.filter((a) => data.got[a.id]).length, total: ACHIEVEMENTS.length });

export function runStart(eventKey) {
  run = { still: 0 };
  fresh = [];
  if (eventKey && !data.events.includes(eventKey)) {
    change((d) => {
      if (d.events.includes(eventKey)) return false;
      d.events.push(eventKey);
    });
  }
  if (data.events.length >= EVENTS) unlock("events3");
}

export function runTick(state, moved, dt) {
  if (!run) return;
  for (const [s, id] of TIMES) if (state.t >= s) unlock(id);
  for (const [n, id] of NEARS) if (state.near >= n) unlock(id);
  run.still = moved ? 0 : run.still + dt;
  if (run.still >= STILL_S) unlock("zen");
  for (const o of state.obs) {
    if (o.seen) continue;
    o.seen = true;
    if (o.spread) unlock(o.spread);
    if (o.from && !data.attacks.includes(o.from)) {
      change((d) => {
        if (d.attacks.includes(o.from)) return false;
        d.attacks.push(o.from);
      });
      if (data.attacks.length >= ATTACKS.length) unlock("allAttacks");
    }
  }
}

export function runEnd(score) {
  if (!run) return;
  run = null;
  change((d) => {
    d.runs++;
  });
  for (const [n, id] of RUNS) if (data.runs >= n) unlock(id);
  if (score < EXPRESS_CS) unlock("express");
  if (score > 0 && score % 100 === 0) unlock("round");
}

export function afterSubmit(r, scope) {
  if (r && !r.error && scope === "event" && r.eventRank && r.eventRank <= TOP) unlock("top10");
}

export function onBoard(b) {
  if (b && b.event && b.event.status === "closed" && b.me && !b.me.banned && b.me.eventRank === 1) unlock("eventWin");
}

function item(a) {
  const got = !!data.got[a.id], hidden = a.family === "secret" && !got;
  const row = document.createElement("div");
  row.className = "ach-item" + (got ? "" : " locked");
  const star = document.createElement("span");
  star.className = "ach-star";
  star.textContent = "★";
  const text = document.createElement("div");
  const name = document.createElement("p");
  name.className = "ach-name";
  name.textContent = hidden ? "???" : a.name;
  const desc = document.createElement("p");
  desc.className = "sub";
  desc.textContent = hidden ? "Succès secret" : a.desc;
  text.append(name, desc);
  row.append(star, text);
  return row;
}

export function renderAchievements(list, count) {
  const p = progress();
  count.textContent = p.got + " / " + p.total;
  list.replaceChildren(...FAMILIES.map(([family, title]) => {
    const card = document.createElement("section");
    card.className = "card";
    const h = document.createElement("h2");
    h.textContent = title;
    card.append(h, ...ACHIEVEMENTS.filter((a) => a.family === family).map(item));
    return card;
  }));
}
