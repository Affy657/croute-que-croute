import { store, KEYS } from "../shared/store.js";
import { ATTACKS } from "../game/attacks.js";
import { SPREADS, GEAR } from "../shared/palette.js";
import { owned } from "./toppings.js";

const FAMILIES = [["time", "Temps de cuisson"], ["play", "Frôlés et découvertes"], ["topping", "Garnitures"], ["loyal", "Assiduité et soirées"], ["secret", "Secrets"]];
const TIMES = [[10, "t10"], [30, "t30"], [60, "t60"], [90, "t90"], [120, "t120"], [150, "t150"]];
const NEARS = [[5, "near5"], [20, "near20"]];
const RUNS = [[10, "runs10"], [50, "runs50"], [100, "runs100"]];
const STILL_S = 3, EXPRESS_CS = 200, EVENTS = 3, TOP = 10, FRIDGE = 4;
const LIVE = ATTACKS.filter((a) => !a.lab);
const EXTRAS = Object.keys(SPREADS).length - 1;
const TOPPINGS = [[1, "top1"], [FRIDGE, "top4"], [EXTRAS, "topAll"]];

export const ACHIEVEMENTS = [
  { id: "t10", family: "time", name: "Premiers pas", desc: "Tenir 10 s" },
  { id: "t30", family: "time", name: "Croustillante", desc: "Tenir 30 s", gear: "witch" },
  { id: "t60", family: "time", name: "Une minute de gloire", desc: "Tenir 60 s", gear: "boosters" },
  { id: "t90", family: "time", name: "Dorée à point", desc: "Tenir 90 s" },
  { id: "t120", family: "time", name: "Bien grillée", desc: "Tenir 120 s" },
  { id: "t150", family: "time", name: "Tartine de légende", desc: "Tenir 150 s" },
  { id: "near5", family: "play", name: "Ça passe", desc: "5 frôlés dans une partie" },
  { id: "near20", family: "play", name: "Ça passe crème", desc: "20 frôlés dans une partie" },
  { id: "allAttacks", family: "play", name: "Tout vu", desc: "Voir les " + LIVE.length + " attaques" },
  { id: "top1", family: "topping", name: "Ça change du beurre", desc: "Gagner une garniture" },
  { id: "top4", family: "topping", name: "Le frigo est plein", desc: "Gagner " + FRIDGE + " garnitures" },
  { id: "topAll", family: "topping", name: "Tout le frigo", desc: "Gagner les " + EXTRAS + " garnitures" },
  { id: "runs10", family: "loyal", name: "Dix tartines", desc: "Jouer 10 parties", gear: "santa" },
  { id: "runs50", family: "loyal", name: "Boulangerie", desc: "Jouer 50 parties" },
  { id: "runs100", family: "loyal", name: "Accro à la croûte", desc: "Jouer 100 parties" },
  { id: "events3", family: "loyal", name: "Fidèle du Space", desc: "Jouer à 3 soirées" },
  { id: "top10", family: "loyal", name: "Dans le top", desc: "Entrer dans le top 10 d'une soirée", gear: "pirate" },
  { id: "eventWin", family: "loyal", name: "Tartine d'or", desc: "Finir 1er d'une soirée" },
  { id: "express", family: "secret", name: "Tartinée express", desc: "Se faire tartiner en moins de 2 s", hint: "il y a des records qu'on ne cherche pas." },
  { id: "zen", family: "secret", name: "En détente", desc: "Rester " + STILL_S + " s sans bouger", hint: "le meilleur coup, c'est parfois de ne rien faire." },
  { id: "round", family: "secret", name: "Chiffre rond", desc: "Finir pile sur une seconde ronde", hint: "les comptes ronds font les bons amis." },
  { id: "woof", family: "secret", name: "Ouaf", desc: "Se faire tartiner par un couteau à la pâtée pour chien", hint: "ça sent un peu le chien." }
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

const union = (a, b) => [...new Set([...a, ...b])];

function merge(mine, stored) {
  return {
    ...mine,
    ...stored,
    got: { ...mine.got, ...stored.got },
    attacks: union(mine.attacks, stored.attacks),
    events: union(mine.events, stored.events),
    runs: Math.max(mine.runs, stored.runs),
    seen: Math.max(mine.seen || 0, stored.seen || 0)
  };
}

function change(fn) {
  data = merge(data, load());
  const changed = fn(data);
  if (changed !== false) store.set(KEYS.achievements, JSON.stringify(data));
  return changed !== false;
}

if (!data.seen) {
  change((d) => {
    if (d.seen) return false;
    d.seen = Date.now();
  });
}

window.addEventListener("storage", (e) => {
  if (e.key === KEYS.achievements) data = merge(data, load());
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
export const has = (id) => !!data.got[id];
export const runUnlocked = () => fresh.slice();
export const progress = () => ({ got: ACHIEVEMENTS.filter((a) => data.got[a.id]).length, total: ACHIEVEMENTS.length });

function countRuns(n) {
  for (const [k, id] of RUNS) if (n >= k) unlock(id);
}

export function countToppings() {
  const n = owned().length - 1;
  for (const [k, id] of TOPPINGS) if (n >= k) unlock(id);
}

export function runStart(eventKey) {
  run = { still: 0 };
  fresh = [];
  countToppings();
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
    if (o.from && !data.attacks.includes(o.from)) {
      change((d) => {
        if (d.attacks.includes(o.from)) return false;
        d.attacks.push(o.from);
      });
      if (LIVE.every((a) => data.attacks.includes(a.id))) unlock("allAttacks");
    }
  }
}

export function runEnd(score, killer) {
  if (!run) return;
  run = null;
  change((d) => {
    d.runs++;
  });
  countRuns(data.runs);
  if (score < EXPRESS_CS) unlock("express");
  if (score > 0 && score % 100 === 0) unlock("round");
  if (killer && killer.spread === "dog") unlock("woof");
}

export function afterSubmit(r) {
  if (r && !r.error && r.eventRank && r.eventRank <= TOP) unlock("top10");
}

export function onBoard(b) {
  if (b && b.me) countRuns(Math.max(data.runs, b.me.runs || 0));
  const final = b && b.event && b.event.status === "closed" && b.now >= (b.event.finalAt || b.event.closesAt);
  if (final && b.me && !b.me.banned && b.me.eventRank === 1) unlock("eventWin");
}

function line(className, text) {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

function item(a, since) {
  const at = data.got[a.id], hidden = a.family === "secret" && !at;
  const row = document.createElement("div");
  row.className = "ach-item" + (at ? "" : " locked");
  const star = document.createElement("span");
  star.className = "ach-star";
  star.textContent = at ? "★" : "☆";
  const text = document.createElement("div");
  const name = line("ach-name", hidden ? "???" : a.name);
  if (at > since) {
    const tag = document.createElement("span");
    tag.className = "ach-new";
    tag.textContent = "Nouveau";
    name.append(" ", tag);
  }
  text.append(name, line("sub", hidden ? "Indice : " + a.hint : a.desc));
  if (a.gear) text.append(line("ach-gear", "Débloque : " + GEAR[a.gear].name));
  row.append(star, text);
  return row;
}

export function renderAchievements(list, count) {
  const p = progress(), since = data.seen || 0;
  count.textContent = p.got + " / " + p.total;
  list.replaceChildren(...FAMILIES.map(([family, title]) => {
    const card = document.createElement("section");
    card.className = "card";
    const h = document.createElement("h2");
    h.textContent = title;
    card.append(h, ...ACHIEVEMENTS.filter((a) => a.family === family).map((a) => item(a, since)));
    return card;
  }));
  change((d) => {
    d.seen = Date.now();
  });
}
