import { store, KEYS } from "../shared/store.js";
import { ATTACKS } from "../game/attacks.js";
import { PROJECTILES } from "../game/projectiles.js";
import { SPREADS, GEAR } from "../shared/palette.js";
import { owned, unlocked } from "./toppings.js";
import { LOCAL } from "../shared/local.js";

/** @type {[string, string, string?][]} */
export const FAMILIES = [["time", "Survie"], ["play", "Adresse"], ["collect", "Collection"], ["loyal", "Habitué"], ["event", "Soirées"], ["sky", "Le ciel", "Touche ce qui passe dans le ciel de l'accueil."], ["secret", "Secrets"]];
/** @type {Steps} */
const TIMES = [[10, "t10"], [30, "t30"], [60, "t60"], [90, "t90"], [120, "t120"], [150, "t150"]];
/** @type {Steps} */
const NEARS = [[20, "near20"]];
/** @type {Steps} */
const RUNS = [[10, "runs10"], [50, "runs50"], [100, "runs100"]];
const SIX_SEVEN_S = 67, STILL_S = 3, COMBO = 5, COMBO_MAX = 10, CAREFUL_S = 60, NIGHT_UNTIL_H = 3, EXPRESS_CS = 200, TOP = 10, FRIDGE = 4, WIN_MIN = 10;
/** @type {Steps} */
const COMBOS = [[COMBO, "combo5"], [COMBO_MAX, "combo10"]];
const LIVE = ATTACKS.filter((a) => !a.lab);
const WEAPONS = Object.keys(PROJECTILES).filter((k) => !PROJECTILES[k].lab);
const EXTRAS = Object.values(SPREADS).filter((s) => !s.free).length;
/** @type {Steps} */
const TOPPINGS = [[FRIDGE, "top4"], [EXTRAS, "topAll"]];
/** @type {Record<string, string>} */
const SKY_TOUCH = { pumpkin: "pumpkin", pirate: "ahoy", santa: "hoho", egg: "eggHunt", toaster: "toaster", saucer: "ufo", tesla: "roadTrip" };
const SKY_IDS = Object.values(SKY_TOUCH);

/** @type {Feat[]} */
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
  { id: "locker", family: "secret", name: "Le jeu de la tartine", desc: "Récupérer la sauce du chef sur un couteau", hint: "une vieille tradition de vestiaire." },
  { id: "woof", family: "secret", name: "Ouaf", desc: "Se faire tartiner par un couteau à la pâtée pour chien", hint: "ça sent un peu le chien.", gear: "dog" },
  { id: "night", family: "secret", name: "Tartine de minuit", desc: "Jouer entre minuit et " + NIGHT_UNTIL_H + " h", hint: "les chauves-souris sortent la nuit.", gear: "bat" }
];
/** @type {Record<string, Feat>} */
const BY_ID = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
const extras = () => owned().filter((k) => !SPREADS[k].free).length;
/** @param {Steps} steps */
const reached = (steps) => Math.max(0, ...steps.filter(([, id]) => data.got[id]).map(([n]) => n));
const bestCs = () => Math.max(data.best, parseInt(store.get(KEYS.localBest) || "0", 10) || 0);
/** @type {Record<string, () => Goal>} */
const GOALS = {
  ...Object.fromEntries(TIMES.map(([s, id]) => [id, () => [Math.max(Math.floor(bestCs() / 100), reached(TIMES)), s, " s"]])),
  ...Object.fromEntries(RUNS.map(([n, id]) => [id, () => [Math.max(data.runs, reached(RUNS)), n]])),
  ...Object.fromEntries(TOPPINGS.map(([n, id]) => [id, () => [extras(), n]])),
  allAttacks: () => [LIVE.filter((a) => data.attacks.includes(a.id)).length, LIVE.length],
  allWeapons: () => [WEAPONS.filter((k) => data.killers.includes(k)).length, WEAPONS.length],
  allSky: () => [SKY_IDS.filter((id) => data.got[id]).length, SKY_IDS.length]
};

/** @returns {FeatData} */
const blank = () => ({ got: {}, attacks: [], events: [], killers: [], runs: 0, best: 0 });

/** @param {unknown} value @returns {string[]} */
const names = (value) => (Array.isArray(value) ? value.filter((id) => typeof id === "string") : []);
/** @param {unknown} value */
const total = (value) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/** @returns {FeatData} */
function load() {
  try {
    const d = JSON.parse(store.get(KEYS.achievements) || "{}");
    if (!d || typeof d !== "object" || Array.isArray(d)) return blank();
    const got = d.got && typeof d.got === "object" && !Array.isArray(d.got) ? d.got : {};
    return { ...d, got, attacks: names(d.attacks), events: names(d.events), killers: names(d.killers), runs: total(d.runs), best: total(d.best), seen: total(d.seen) };
  } catch (e) {
    return blank();
  }
}

let data = load(), /** @type {Feat[]} */ fresh = [], /** @type {{ still: number, eventKey: string | null } | null} */ run = null, forgotten = false;
/** @type {FeatListener[]} */
const listeners = [];

/** @param {string[]} a @param {string[]} b */
const union = (a, b) => [...new Set([...a, ...b])];

/** @param {FeatData} mine @param {FeatData} stored */
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

/** @param {FeatChange} fn */
function change(fn) {
  if (forgotten) return false;
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

export function forgetFeats() {
  data = blank();
  fresh = [];
  run = null;
  forgotten = true;
}

window.addEventListener("storage", (e) => {
  if (e.key !== KEYS.achievements || forgotten) return;
  if (e.newValue === null) return forgetFeats();
  data = merge(data, load());
  checkAttacks(true);
});

/** @param {string} id */
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

/** @param {SyncData} remote */
export function absorb(remote) {
  /** @type {Record<string, number>} */
  const got = remote && remote.got && typeof remote.got === "object" ? remote.got : {};
  const attacks = remote && Array.isArray(remote.attacks) ? remote.attacks.filter((id) => typeof id === "string") : [];
  const news = Object.keys(got).filter((id) => BY_ID[id] && !data.got[id] && Number.isFinite(got[id]));
  if (!news.length && attacks.every((id) => data.attacks.includes(id))) return;
  const done = change((d) => {
    for (const id of news) d.got[id] = d.got[id] || got[id];
    d.attacks = union(d.attacks, attacks);
  });
  if (!done) return;
  for (const id of news) for (const fn of listeners) fn(BY_ID[id], true);
  checkSky(true);
  checkAttacks(true);
}

function checkSky(synced = false) {
  if (SKY_IDS.every((id) => data.got[id])) unlock("allSky", synced);
}

function checkAttacks(synced = false) {
  if (LIVE.every((a) => data.attacks.includes(a.id))) unlock("allAttacks", synced);
}

checkAttacks(true);

export const forSync = () => ({ got: { ...data.got }, attacks: data.attacks.slice() });
/** @param {FeatListener} fn */
export const onUnlock = (fn) => listeners.push(fn);

/** @param {string | undefined} key */
export function touchSky(key) {
  const id = SKY_TOUCH[/** @type {string} */ (key)];
  if (!id) return null;
  const fresh = !data.got[id], before = !!data.got.allSky;
  unlock(id);
  checkSky();
  return { feat: BY_ID[id], fresh, all: !before && data.got.allSky ? BY_ID.allSky : null };
}

/** @param {Worn} look */
export function checkOutfit(look) {
  if (look.head && look.side && look.bread) unlock("dressed");
}
/** @param {string} id */
export const has = (id) => !!data.got[id];
export const runUnlocked = () => fresh.slice();
export const progress = () => ({ got: ACHIEVEMENTS.filter((a) => data.got[a.id]).length, total: ACHIEVEMENTS.length });

/** @param {number} n */
function countRuns(n, synced = false) {
  for (const [k, id] of RUNS) if (n >= k) unlock(id, synced);
}

/** @param {number | null | undefined} rank @param {number} [count] */
const first = (rank, count) => rank === 1 && /** @type {number} */ (count) >= WIN_MIN;

export function countToppings() {
  const n = extras();
  for (const [k, id] of TOPPINGS) if (n >= k) unlock(id);
  if (unlocked("sauce")) unlock("locker");
}

/** @param {string | null} eventKey */
export function runStart(eventKey) {
  run = { still: 0, eventKey };
  fresh = [];
  countToppings();
  if (new Date().getHours() < NIGHT_UNTIL_H) unlock("night");
}

/** @param {number} chain */
export function runCombo(chain) {
  if (run) for (const [n, id] of COMBOS) if (chain >= n) unlock(id);
}

/** @param {SimState} state @param {boolean} moved @param {number} dt */
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
        d.attacks.push(/** @type {string} */ (o.from));
      });
      checkAttacks();
    }
  }
}

/** @param {number} score @param {Killer | null} killer @param {string} device */
export function runEnd(score, killer, device) {
  if (!run) return;
  const { eventKey } = run;
  run = null;
  change((d) => {
    d.runs++;
    d.best = Math.max(d.best, score);
    if (eventKey && device !== "pc" && !d.events.includes(eventKey)) d.events.push(eventKey);
  });
  if (data.events.length) unlock("event1");
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

/** @param {RunAnswer} [r] */
export function afterSubmit(r) {
  if (!r || r.error) return;
  if (r.eventRank && r.eventRank <= TOP) unlock("top10");
  if (first(r.eventRank, r.eventCount) || first(r.rank, r.count) || first(r.pcRank, r.pcCount)) unlock("eventWin");
}

/** @param {Board | null} b */
export function onBoard(b) {
  if (b && b.me) countRuns(Math.max(data.runs, b.me.runs || 0), true);
  const top = b && b.me ? Math.max(b.me.best || 0, b.me.pcBest || 0) : 0;
  if (b && b.me && (b.me.runs > data.runs || top > data.best)) {
    change((d) => {
      d.runs = Math.max(d.runs, /** @type {Joined} */ (b).me.runs || 0);
      d.best = Math.max(d.best, top);
    });
  }
  for (const [s, id] of TIMES) if (top >= s * 100) unlock(id, true);
  if (b && b.me && !b.me.banned && (first(b.me.eventRank, b.eventCount) || first(b.me.rank, b.count) || first(b.me.pcRank, b.pcCount))) unlock("eventWin", true);
  checkSky(true);
}

/** @param {PlayerCard} c */
export function onHistory(c) {
  if (c.events) unlock("event1", true);
  for (const [id, done] of Object.entries(c.feats || {})) if (done && BY_ID[id]) unlock(id, true);
}

/** @param {string} className @param {string} text */
function line(className, text) {
  const p = document.createElement("p");
  p.className = className;
  p.textContent = text;
  return p;
}

/** @param {string} className @param {string} text */
function span(className, text) {
  const s = document.createElement("span");
  s.className = className;
  s.textContent = text;
  return s;
}

/** @param {number} have @param {number} need */
function meter(have, need, unit = "") {
  const row = document.createElement("div"), bar = span("ach-bar", ""), fill = span("ach-fill", "");
  row.className = "ach-meter";
  bar.setAttribute("aria-hidden", "true");
  fill.style.width = Math.min(100, (have / need) * 100) + "%";
  bar.append(fill);
  row.append(bar, span("ach-of", Math.min(have, need) + " / " + need + unit));
  return row;
}

/** @param {Feat} a @param {number} since */
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

/** @param {Element} list @param {Element} count */
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
