import { store, KEYS } from "../shared/store.js";
import { ATTACKS } from "../game/attacks.js";
import { PROJECTILES } from "../game/projectiles.js";
import { SPREADS, GEAR } from "../shared/palette.js";
import { owned } from "./toppings.js";
import { LOCAL } from "../shared/local.js";

export const FAMILIES = [["time", "Survie"], ["play", "Adresse"], ["collect", "Collection"], ["loyal", "Habitué"], ["event", "Soirées"], ["sky", "Le ciel"], ["secret", "Secrets"]];
const TIMES = [[10, "t10"], [30, "t30"], [60, "t60"], [90, "t90"], [120, "t120"], [150, "t150"]];
const NEARS = [[20, "near20"]];
const RUNS = [[10, "runs10"], [50, "runs50"], [100, "runs100"]];
const SIX_SEVEN_S = 67, STILL_S = 3, COMBO = 5, COMBO_MAX = 10, CAREFUL_S = 60, NIGHT_UNTIL_H = 3, EXPRESS_CS = 200, EVENTS = 3, TOP = 10, FRIDGE = 4;
const COMBOS = [[COMBO, "combo5"], [COMBO_MAX, "combo10"]];
const EVENT_STEPS = [[1, "event1"], [EVENTS, "events3"]];
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
  { id: "t120", family: "time", name: "Bien grillée", desc: "Tenir 120 s" },
  { id: "t150", family: "time", name: "Tartine de légende", desc: "Tenir 150 s", gear: "burnt" },
  { id: "combo5", family: "play", name: "Insaisissable", desc: "Faire un frôlé x" + COMBO, gear: "ninja" },
  { id: "combo10", family: "play", name: "Intouchable", desc: "Faire un frôlé x" + COMBO_MAX },
  { id: "near20", family: "play", name: "Ça passe crème", desc: "20 frôlés dans une partie", gear: "hitbox" },
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
  { id: "events3", family: "event", name: "Fidèle du Space", desc: "Jouer à 3 soirées" },
  { id: "top10", family: "event", name: "Dans le top", desc: "Entrer dans le top 10 d'une soirée" },
  { id: "eventWin", family: "event", name: "Tartine d'or", desc: "Finir 1er d'une soirée", gear: "crown" },
  { id: "pumpkin", family: "sky", name: "Des bonbons ou un sort", desc: "Toucher la planète citrouille sur l'accueil", hint: "une citrouille passe parfois dans le ciel de l'accueil.", gear: "witch" },
  { id: "ahoy", family: "sky", name: "À l'abordage", desc: "Toucher la planète pirate sur l'accueil", hint: "un navire croise parfois au large de l'accueil.", gear: "pirate" },
  { id: "hoho", family: "sky", name: "Ho ho ho", desc: "Toucher le père Noël sur l'accueil", hint: "un traîneau traverse parfois le ciel de l'accueil.", gear: "santa" },
  { id: "eggHunt", family: "sky", name: "Chasse aux œufs", desc: "Toucher l'œuf de Pâques sur l'accueil", hint: "un lapin sautille parfois dans le ciel de l'accueil.", gear: "bunny" },
  { id: "toaster", family: "sky", name: "Ding !", desc: "Toucher le grille-pain sur l'accueil", hint: "ça sent le pain grillé dans le ciel de l'accueil.", gear: "toasted" },
  { id: "ufo", family: "sky", name: "Rencontre du 3e type", desc: "Toucher la soucoupe volante sur l'accueil", hint: "quelqu'un fait parfois coucou depuis le ciel de l'accueil.", gear: "antennae" },
  { id: "roadTrip", family: "sky", name: "Road trip spatial", desc: "Toucher la voiture de l'espace sur l'accueil", hint: "une voiture rouge roule parfois dans le ciel de l'accueil.", gear: "astronaut" },
  { id: "allSky", family: "sky", name: "Tout le ciel", desc: "Toucher les " + SKY_IDS.length + " surprises du ciel de l'accueil" },
  { id: "express", family: "secret", name: "Tartinée express", desc: "Se faire tartiner en moins de 2 s", hint: "il y a des records qu'on ne cherche pas.", gear: "halo" },
  { id: "zen", family: "secret", name: "En détente", desc: "Rester " + STILL_S + " s sans bouger", hint: "le meilleur coup, c'est parfois de ne rien faire.", gear: "nightcap" },
  { id: "sixSeven", family: "secret", name: "Six Seven", desc: "Finir une partie à " + SIX_SEVEN_S + " s", hint: "un chiffre que tout le monde mime avec les mains.", gear: "sixseven" },
  { id: "woof", family: "secret", name: "Ouaf", desc: "Se faire tartiner par un couteau à la pâtée pour chien", hint: "ça sent un peu le chien.", gear: "dog" },
  { id: "night", family: "secret", name: "Tartine de minuit", desc: "Jouer entre minuit et " + NIGHT_UNTIL_H + " h", hint: "les chauves-souris sortent la nuit.", gear: "bat" }
];
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));

const blank = () => ({ got: {}, attacks: [], events: [], killers: [], runs: 0 });

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
  const n = owned().filter((k) => !SPREADS[k].free).length;
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
  for (const [n, id] of EVENT_STEPS) if (data.events.length >= n) unlock(id);
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
  for (const [s, id] of TIMES) if (top >= s * 100) unlock(id, true);
  const final = b && b.event && b.event.status === "closed" && b.now >= (b.event.finalAt || b.event.closesAt);
  if (final && b.me && !b.me.banned && b.me.eventRank === 1) unlock("eventWin");
  checkSky(true);
}

export function onHistory(c) {
  for (const [n, id] of EVENT_STEPS) if (c.events >= n) unlock(id, true);
  for (const [id, done] of Object.entries(c.feats || {})) if (done && BY_ID[id]) unlock(id, true);
}

function line(className, text) {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

function item(a, since) {
  const at = data.got[a.id], hidden = !!a.hint && !at;
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
