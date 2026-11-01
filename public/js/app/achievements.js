import { store, KEYS } from "../shared/store.js";
import { ATTACKS } from "../game/attacks.js";
import { PROJECTILES } from "../game/projectiles.js";
import { SPREADS, GEAR } from "../shared/palette.js";
import { owned } from "./toppings.js";
import { LOCAL } from "../shared/local.js";

export const FAMILIES = [["time", "Survie"], ["play", "Adresse"], ["collect", "Collection"], ["loyal", "Habitué"], ["event", "Soirées"], ["sky", "Le ciel", "Touche ce qui passe dans le ciel de l'accueil."], ["secret", "Secrets"]];
const TIMES = [[10, "t10"], [30, "t30"], [60, "t60"], [90, "t90"], [120, "t120"], [150, "t150"]];
const NEARS = [[20, "near20"]];
const RUNS = [[10, "runs10"], [50, "runs50"], [100, "runs100"]];
const SIX_SEVEN_S = 67, STILL_S = 3, COMBO = 5, COMBO_MAX = 10, CAREFUL_S = 60, NIGHT_UNTIL_H = 3, EXPRESS_CS = 200, TOP = 10, FRIDGE = 4, WIN_MIN = 10;
const COMBOS = [[COMBO, "combo5"], [COMBO_MAX, "combo10"]];
const LIVE = ATTACKS.filter((a) => !a.lab);
const WEAPONS = Object.keys(PROJECTILES).filter((k) => !PROJECTILES[k].lab);
const EXTRAS = Object.values(SPREADS).filter((s) => !s.free).length;
const TOPPINGS = [[FRIDGE, "top4"], [EXTRAS, "topAll"]];
const SKY_TOUCH = { pumpkin: "pumpkin", pirate: "ahoy", santa: "hoho", egg: "eggHunt", toaster: "toaster", saucer: "ufo", tesla: "roadTrip" };
const SKY_IDS = Object.values(SKY_TOUCH);

export const ACHIEVEMENTS = [
  { id: "t10", family: "time", name: "Premiers pas", desc: "Tenir 10 s" },
  { id: "t30", family: "time", name: "Croustillante", desc: "Tenir 30 s" },
  { id: "t60", family: "time", name: "Une minute de gloire", desc: "Tenir 60 s" },
  { id: "t90", family: "time", name: "Dorée à point", desc: "Tenir 90 s", gear: "boosters" },
  { id: "t120", family: "time", name: "Bien grillée", desc: "Tenir 120 s", gear: "heat" },
  { id: "t150", family: "time", name: "Tartine de légende", desc: "Tenir 150 s", gear: "burnt" },
  { id: "combo5", family: "play", name: "Insaisissable", desc: "Enchaîner " + COMBO + " frôlés", gear: "ninja" },
  { id: "combo10", family: "play", name: "Intouchable", desc: "Enchaîner " + COMBO_MAX + " frôlés", gear: "volt" },
  { id: "near20", family: "play", name: "Ça passe crème", desc: "Faire 20 frôlés dans une partie", gear: "hitbox" },
  { id: "careful", family: "play", name: "Prudente", desc: "Tenir " + CAREFUL_S + " s sans un seul frôlé" },
  { id: "top4", family: "collect", name: "Le frigo est plein", desc: "Gagner " + FRIDGE + " garnitures" },
  { id: "topAll", family: "collect", name: "Tout le frigo", desc: "Gagner les " + EXTRAS + " garnitures", gear: "chef" },
  { id: "allAttacks", family: "collect", name: "Tout vu", desc: "Voir les " + LIVE.length + " attaques", gear: "cutlery" },
  { id: "allWeapons", family: "collect", name: "Tout le tiroir", desc: "Se faire tartiner par chacune des " + WEAPONS.length + " armes" },
  { id: "dressed", family: "collect", name: "Sur son 31", desc: "Porter un chapeau, des côtés et un pain en même temps" },
  { id: "runs10", family: "loyal", name: "Dix tartines", desc: "Jouer 10 parties" },
  { id: "runs50", family: "loyal", name: "Boulangerie", desc: "Jouer 50 parties", gear: "brioche" },
  { id: "runs100", family: "loyal", name: "Accro à la croûte", desc: "Jouer 100 parties", gear: "crustless" },
  { id: "event1", family: "event", name: "Première soirée", desc: "Jouer pendant une soirée Space Tartinade" },
  { id: "top10", family: "event", name: "Dans le top", desc: "Entrer dans le top 10 d'une soirée", gear: "neon" },
  { id: "eventWin", family: "event", name: "Tartine d'or", desc: "Être 1er d'un classement d'au moins " + WIN_MIN + " joueurs (soirée, Mobile ou PC)", gear: "crown" },
  { id: "pumpkin", family: "sky", name: "Des bonbons ou un sort", desc: "Toucher la planète citrouille sur l'accueil", hint: "une citrouille passe parfois.", gear: "witch" },
  { id: "ahoy", family: "sky", name: "À l'abordage", desc: "Toucher la planète pirate sur l'accueil", hint: "un navire croise parfois au large.", gear: "pirate" },
  { id: "hoho", family: "sky", name: "Ho ho ho", desc: "Toucher le père Noël sur l'accueil", hint: "un traîneau traverse parfois.", gear: "santa" },
  { id: "eggHunt", family: "sky", name: "Chasse aux œufs", desc: "Toucher l'œuf de Pâques sur l'accueil", hint: "un lapin sautille parfois.", gear: "bunny" },
  { id: "toaster", family: "sky", name: "Ding !", desc: "Toucher le grille-pain sur l'accueil", hint: "ça sent le pain grillé là-haut.", gear: "toasted" },
  { id: "ufo", family: "sky", name: "Rencontre du 3e type", desc: "Toucher la soucoupe volante sur l'accueil", hint: "quelqu'un fait parfois coucou de là-haut.", gear: "antennae" },
  { id: "roadTrip", family: "sky", name: "Road trip spatial", desc: "Toucher la voiture de l'espace sur l'accueil", hint: "une voiture rouge roule parfois là-haut.", gear: "astronaut" },
  { id: "allSky", family: "sky", name: "Tout le ciel", desc: "Toucher les " + SKY_IDS.length + " surprises du ciel de l'accueil", gear: "ring" },
  { id: "express", family: "secret", name: "Tartinée express", desc: "Se faire tartiner en moins de 2 s", hint: "il y a des records qu'on ne cherche pas.", gear: "halo" },
  { id: "zen", family: "secret", name: "En détente", desc: "Rester " + STILL_S + " s sans bouger", hint: "le meilleur coup, c'est parfois de ne rien faire.", gear: "nightcap" },
  { id: "sixSeven", family: "secret", name: "Six Seven", desc: "Finir une partie à " + SIX_SEVEN_S + " s", hint: "un chiffre que tout le monde mime avec les mains.", gear: "sixseven" },
  { id: "woof", family: "secret", name: "Ouaf", desc: "Se faire tartiner par un couteau à la pâtée pour chien", hint: "ça sent un peu le chien.", gear: "dog" },
  { id: "night", family: "secret", name: "Tartine de minuit", desc: "Jouer entre minuit et " + NIGHT_UNTIL_H + " h", hint: "les chauves-souris sortent la nuit.", gear: "bat" }
];
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const extras = () => owned().filter((k) => !SPREADS[k].free).length;
const reached = (steps) => Math.max(0, ...steps.filter(([, id]) => data.got[id]).map(([n]) => n));
const bestCs = () => Math.max(data.best, parseInt(store.get(KEYS.localBest) || "0", 10) || 0);
const GOALS = {
  ...Object.fromEntries(TIMES.map(([s, id]) => [id, () => [Math.max(Math.floor(bestCs() / 100), reached(TIMES)), s, " s"]])),
  ...Object.fromEntries(RUNS.map(([n, id]) => [id, () => [Math.max(data.runs, reached(RUNS)), n]])),
  ...Object.fromEntries(TOPPINGS.map(([n, id]) => [id, () => [extras(), n]])),
  allAttacks: () => [LIVE.filter((a) => data.attacks.includes(a.id)).length, LIVE.length],
  allWeapons: () => [WEAPONS.filter((k) => data.killers.includes(k)).length, WEAPONS.length],
  allSky: () => [SKY_IDS.filter((id) => data.got[id]).length, SKY_IDS.length]
};

const blank = () => ({ got: {}, attacks: [], events: [], killers: [], runs: 0, best: 0 });

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
    killers: union(mine.killers, stored.killers),
    runs: Math.max(mine.runs, stored.runs),
    best: Math.max(mine.best, stored.best),
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

if (LOCAL && new URLSearchParams(location.search).get("succes") === "tous") {
  change((d) => {
    for (const a of ACHIEVEMENTS) d.got[a.id] = d.got[a.id] || Date.now();
  });
}

window.addEventListener("storage", (e) => {
  if (e.key === KEYS.achievements) data = merge(data, load());
});

function unlock(id, synced = false) {
  if (data.got[id]) return;
  const done = change((d) => {
    if (d.got[id]) return false;
    d.got[id] = Date.now();
  });
  if (!done) return;
  const a = BY_ID[id];
  fresh.push(a);
  for (const fn of listeners) fn(a, synced);
}

export function absorb(remote) {
  const got = remote && remote.got && typeof remote.got === "object" ? remote.got : {};
  const attacks = remote && Array.isArray(remote.attacks) ? remote.attacks.filter((id) => typeof id === "string") : [];
  const news = Object.keys(got).filter((id) => BY_ID[id] && !data.got[id] && Number.isFinite(got[id]));
  if (!news.length && attacks.every((id) => data.attacks.includes(id))) return;
  change((d) => {
    for (const id of news) d.got[id] = d.got[id] || got[id];
    d.attacks = union(d.attacks, attacks);
  });
  for (const id of news) for (const fn of listeners) fn(BY_ID[id], true);
  checkSky(true);
}

function checkSky(synced = false) {
  if (SKY_IDS.every((id) => data.got[id])) unlock("allSky", synced);
}

export const forSync = () => ({ got: { ...data.got }, attacks: data.attacks.slice() });
export const onUnlock = (fn) => listeners.push(fn);

export function touchSky(key) {
  const id = SKY_TOUCH[key];
  if (!id) return null;
  const fresh = !data.got[id], before = !!data.got.allSky;
  unlock(id);
  checkSky();
  return { feat: BY_ID[id], fresh, all: !before && data.got.allSky ? BY_ID.allSky : null };
}

export function checkOutfit(look) {
  if (look.head && look.side && look.bread) unlock("dressed");
}
export const has = (id) => !!data.got[id];
export const runUnlocked = () => fresh.slice();
export const progress = () => ({ got: ACHIEVEMENTS.filter((a) => data.got[a.id]).length, total: ACHIEVEMENTS.length });

function countRuns(n) {
  for (const [k, id] of RUNS) if (n >= k) unlock(id);
}

export function countToppings() {
  const n = extras();
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
  if (data.events.length) unlock("event1");
  if (new Date().getHours() < NIGHT_UNTIL_H) unlock("night");
}

export function runCombo(chain) {
  if (run) for (const [n, id] of COMBOS) if (chain >= n) unlock(id);
}

export function runTick(state, moved, dt) {
  if (!run) return;
  for (const [s, id] of TIMES) if (state.t >= s) unlock(id);
  for (const [n, id] of NEARS) if (state.near >= n) unlock(id);
  if (state.t >= CAREFUL_S && !state.near) unlock("careful");
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
    d.best = Math.max(d.best, score);
  });
  countRuns(data.runs);
  if (score < EXPRESS_CS) unlock("express");
  if (Math.floor(score / 100) === SIX_SEVEN_S) unlock("sixSeven");
  if (killer && killer.spread === "dog") unlock("woof");
  if (killer && WEAPONS.includes(killer.kind) && !data.killers.includes(killer.kind)) {
    change((d) => {
      if (d.killers.includes(killer.kind)) return false;
      d.killers.push(killer.kind);
    });
  }
  if (WEAPONS.every((k) => data.killers.includes(k))) unlock("allWeapons");
}

export function afterSubmit(r) {
  if (r && !r.error && r.eventRank && r.eventRank <= TOP) unlock("top10");
}

export function onBoard(b) {
  if (b && b.me) countRuns(Math.max(data.runs, b.me.runs || 0));
  const top = b && b.me ? Math.max(b.me.best || 0, b.me.pcBest || 0) : 0;
  if (b && b.me && (b.me.runs > data.runs || top > data.best)) {
    change((d) => {
      d.runs = Math.max(d.runs, b.me.runs || 0);
      d.best = Math.max(d.best, top);
    });
  }
  for (const [s, id] of TIMES) if (top >= s * 100) unlock(id, true);
  const first = (rank, count) => rank === 1 && count >= WIN_MIN;
  if (b && b.me && !b.me.banned && (first(b.me.eventRank, b.eventCount) || first(b.me.rank, b.count) || first(b.me.pcRank, b.pcCount))) unlock("eventWin");
  checkSky(true);
}

export function onHistory(c) {
  if (c.events) unlock("event1", true);
  for (const [id, done] of Object.entries(c.feats || {})) if (done && BY_ID[id]) unlock(id, true);
}

function line(className, text) {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

function span(className, text) {
  const s = document.createElement("span");
  s.className = className;
  s.textContent = text;
  return s;
}

function meter(have, need, unit = "") {
  const row = document.createElement("div"), bar = span("ach-bar", ""), fill = span("ach-fill", "");
  row.className = "ach-meter";
  bar.setAttribute("aria-hidden", "true");
  fill.style.width = Math.min(100, (have / need) * 100) + "%";
  bar.append(fill);
  row.append(bar, span("ach-of", Math.min(have, need) + " / " + need + unit));
  return row;
}

function item(a, since) {
  const at = data.got[a.id], hidden = !!a.hint && !at, goal = !at && GOALS[a.id];
  const row = document.createElement("div");
  row.className = "ach-item" + (at ? "" : " locked");
  const star = span("ach-star", at ? "★" : "☆");
  star.setAttribute("aria-hidden", "true");
  const text = document.createElement("div");
  const name = line("ach-name", ""), title = span("", hidden ? "???" : a.name);
  if (hidden) title.setAttribute("aria-hidden", "true");
  name.append(span("sr-only", at ? "Obtenu : " : hidden ? "Secret à trouver" : "À débloquer : "), title);
  if (at > since) name.append(" ", span("ach-new", "Nouveau"));
  text.append(name, line("sub", hidden ? "Indice : " + a.hint : a.desc));
  if (goal) text.append(meter(...goal()));
  if (a.gear) {
    const gear = line("ach-gear", "Débloque : ");
    gear.append(span("ach-reward", GEAR[a.gear].name));
    text.append(gear);
  }
  row.append(star, text);
  return row;
}

export function renderAchievements(list, count) {
  const p = progress(), since = data.seen || 0;
  count.replaceChildren(meter(p.got, p.total));
  list.replaceChildren(...FAMILIES.map(([family, title, note]) => {
    const card = document.createElement("section");
    card.className = "card";
    const items = ACHIEVEMENTS.filter((a) => a.family === family), got = items.filter((a) => data.got[a.id]).length;
    const head = document.createElement("div");
    head.className = "ach-head";
    const h = document.createElement("h3");
    h.textContent = title;
    head.append(h, span("fold-tag" + (got === items.length ? " done" : ""), got + " / " + items.length));
    card.append(head);
    if (note) card.append(line("sub", note));
    card.append(...items.map((a) => item(a, since)));
    return card;
  }));
  change((d) => {
    d.seen = Date.now();
  });
}
