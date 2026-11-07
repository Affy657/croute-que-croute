import { fmtCs, ord, clock, when } from "../shared/format.js";
import { countdown, champion, closing } from "../shared/banner.js";
import { net, serverNow, registered, joinReady, isOpen, recentEvent, upcomingEvent, standing, knownBest, onPc } from "./api.js";
import { prefs, musicAvailable } from "./audio.js";
import { progress } from "./achievements.js";
import { PROJECTILES } from "../game/projectiles.js";
import { GEAR, SLOTS, SPREADS } from "../shared/palette.js";
import { owned, chosen } from "./toppings.js";
import { store, KEYS } from "../shared/store.js";
import { gearOwned, gearTotal, chosenGear } from "./gear.js";

/** @param {string} id */
const $ = (id) => document.getElementById(id);
const BOARD_TOP = 30, PODIUM = 3;

export const ui = {
  menu: $("menu"), over: $("over"), board: $("board"), hud: $("hud"), time: $("time"), hudBest: $("hudBest"),
  brand: $("brand"), menuStats: $("menuStats"), menuBestBox: $("menuBestBox"), menuBest: $("menuBest"),
  menuRankBox: $("menuRankBox"), menuRank: $("menuRank"), menuInfo: $("menuInfo"), menuPitch: $("menuPitch"),
  joinForm: $("joinForm"), pseudo: $("pseudo"), joinError: $("joinError"), haveAccount: $("haveAccount"),
  linkForm: $("linkForm"), linkInput: $("linkInput"), linkError: $("linkError"), newAccount: $("newAccount"),
  inApp: $("inApp"), inAppText: $("inAppText"), inAppCopy: $("inAppCopy"),
  linkCard: $("linkCard"), linkBtn: $("linkBtn"), link: $("link"), linkQr: $("linkQr"), linkCode: $("linkCode"), linkTime: $("linkTime"), linkCopy: $("linkCopy"), linkFail: $("linkFail"), linkBack: $("linkBack"),
  mergeBtn: $("mergeBtn"), mergeHelp: $("mergeHelp"), mergeForm: $("mergeForm"), mergeInput: $("mergeInput"), mergeNote: $("mergeNote"), mergeAsk: $("mergeAsk"), mergeYes: $("mergeYes"), mergeNo: $("mergeNo"),
  googleLogin: $("googleLogin"), googleBox: $("googleBox"), googleBtn: $("googleBtn"), googleLabel: $("googleLabel"), googleNote: $("googleNote"),
  outRow: $("outRow"), outBtn: $("outBtn"), outNote: $("outNote"), outAsk: $("outAsk"), outYes: $("outYes"), outNo: $("outNo"),
  menuActions: $("menuActions"), play: $("play"), menuBoard: $("menuBoard"), menuAch: $("menuAch"), menuCountdown: $("menuCountdown"), settingsBtn: $("settingsBtn"),
  final: $("final"), overBy: $("overBy"), newBest: $("newBest"), overNote: $("overNote"), overRival: $("overRival"),
  overStats: $("overStats"), overBestBox: $("overBestBox"), overBest: $("overBest"), overRankBox: $("overRankBox"), overRank: $("overRank"),
  again: $("again"), overBoard: $("overBoard"), overAchBtn: $("overAchBtn"), overHome: $("overHome"), overCountdown: $("overCountdown"),
  boardTabs: $("boardTabs"), boardEvent: $("boardEvent"), boardCountdown: $("boardCountdown"), boardList: $("boardList"), boardEmpty: $("boardEmpty"), boardBack: $("boardBack"),
  music: $("music"), sfx: $("sfx"),
  info: $("info"), infoBtn: $("infoBtn"), closeBtn: $("closeBtn"), infoTabs: $("infoTabs"), infoBody: $("infoBody"), infoBack: $("infoBack"),
  settings: $("settings"), settingsBar: $("settingsBar"), settingsTabs: $("settingsTabs"), settingsApp: $("settingsApp"), settingsAdmin: $("settingsAdmin"),
  settingsBack: $("settingsBack"), installCard: $("installCard"), installHint: $("installHint"), installBtn: $("installBtn"), shareBtn: $("shareBtn"), qrBtn: $("qrBtn"),
  qr: $("qr"), qrHost: $("qrHost"), qrCopy: $("qrCopy"), qrBack: $("qrBack"),
  ach: $("ach"), achCount: $("achCount"), achList: $("achList"), achBack: $("achBack"), achToast: $("achToast"), menuToast: $("menuToast"), holdHint: $("holdHint"), overAch: $("overAch"), overTry: $("overTry"), musicVol: $("musicVol"), sfxVol: $("sfxVol"), sensVol: $("sensVol"), mouseRow: $("mouseRow"), mouseTabs: $("mouseTabs"), mouseHint: $("mouseHint"), touchRow: $("touchRow"), touchTabs: $("touchTabs"), touchHint: $("touchHint"),
  renameCard: $("renameCard"), renameForm: $("renameForm"), newPseudo: $("newPseudo"), renameNote: $("renameNote"),
  picker: $("picker"), pickToast: $("pickToast"), pickLabel: $("pickLabel"), pickPrev: $("pickPrev"), pickNext: $("pickNext"), pickName: $("pickName"), pickCount: $("pickCount"), pickSkins: $("pickSkins"), pickDot: $("pickDot"),
  gearRows: $("gearRows"), profile: $("profile"), profileName: $("profileName"), profileBack: $("profileBack"), testCard: $("testCard"), godTabs: $("godTabs"), godPill: $("godPill"),
  installPop: $("installPop"), installPopText: $("installPopText"), installYes: $("installYes"), installLater: $("installLater"),
  versionNote: $("versionNote")
};

/** @type {(keyof typeof ui)[]} */
const PAGES = ["menu", "over", "board", "hud", "info", "settings", "qr", "link", "ach", "profile"];
/** @type {Record<string, string[]>} */
const SCREENS = { menu: ["menu"], play: ["hud"], over: ["over"], board: ["board"], info: ["info"], settings: ["settings"], qr: ["qr"], link: ["link"], ach: ["ach"], profile: ["profile"] };
/** @type {Record<string, string>} */
const PAGE_OF = { board: "board", profile: "board", info: "info", settings: "settings", qr: "settings", link: "settings", ach: "ach" };
let current = "menu";

export const screen = () => current;
export const openPage = () => PAGE_OF[current] || null;

/** @param {string} name */
export function show(name) {
  current = name;
  if (name !== "menu" && pickerOpen) openPicker(false);
  for (const id of PAGES) ui[id].hidden = !SCREENS[name].includes(id);
  ui.infoBtn.hidden = name !== "menu" && name !== "over";
  ui.settingsBtn.hidden = ui.infoBtn.hidden;
  ui.closeBtn.hidden = name !== "info" && name !== "settings" && name !== "ach";
}

/** @param {HTMLElement} el @param {string} text */
export function setText(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

/** @param {Element} input @param {boolean} on */
export function markInvalid(input, on) {
  if (on) input.setAttribute("aria-invalid", "true");
  else input.removeAttribute("aria-invalid");
}

/** @param {HTMLElement} el @param {string} text */
export function setDigits(el, text) {
  const chars = [...text];
  if (el.children.length !== chars.length) el.replaceChildren(...chars.map(() => document.createElement("span")));
  chars.forEach((ch, i) => {
    const span = el.children[i];
    const cls = ch >= "0" && ch <= "9" ? "d" : "p";
    if (span.className !== cls) span.className = cls;
    if (span.textContent !== ch) span.textContent = ch;
  });
}

/** @type {string | null} */
let boardScope = null, shownScope = "general";

/** @param {Ticker} el */
function setCountdown(el) {
  const now = serverNow(), c = countdown(net.board, now);
  el.hidden = !c;
  if (!c) return;
  const { label, target } = c;
  if (!el.timer) {
    el.timer = document.createElement("span");
    el.timer.className = "digits";
  }
  if (el.firstChild?.textContent !== label || el.lastChild !== el.timer) el.replaceChildren(label, el.timer);
  setDigits(el.timer, clock(Math.max(0, target - now)));
}

export function tickCountdowns() {
  if (!ui.menu.hidden) setCountdown(ui.menuCountdown);
  if (!ui.over.hidden) setCountdown(ui.overCountdown);
  if (!ui.board.hidden) boardCountdown();
}

function boardCountdown() {
  if (shownScope === "event") setCountdown(ui.boardCountdown);
  else ui.boardCountdown.hidden = true;
}

/** @param {HTMLElement} box @param {HTMLElement} bestBox @param {HTMLElement} bestEl @param {HTMLElement} rankBox @param {HTMLElement} rankEl @param {number} best @param {number | null} rank @param {number} count */
function fillStats(box, bestBox, bestEl, rankBox, rankEl, best, rank, count) {
  bestBox.hidden = !best;
  if (best) setDigits(bestEl, fmtCs(best));
  rankBox.hidden = !rank;
  if (rank) rankEl.textContent = ord(rank) + " / " + count;
  box.hidden = !best && !rank;
}

export const needJoin = () => !!net.board && !registered() && joinReady();

let linking = false;

/** @param {boolean} on */
export function setLinking(on) {
  linking = on;
  renderMenu();
}

export function renderMenu() {
  const b = net.board;
  const me = b && b.me;
  ui.menuPitch.hidden = !!net.token || registered();
  ui.joinForm.hidden = !needJoin() || linking;
  ui.linkForm.hidden = !needJoin() || !linking;
  ui.menuActions.hidden = needJoin();
  ui.menuBoard.hidden = !b;
  const mine = standing();
  fillStats(ui.menuStats, ui.menuBestBox, ui.menuBest, ui.menuRankBox, ui.menuRank, needJoin() ? 0 : mine.best, mine.rank, mine.count);
  let info = "";
  const champ = champion(/** @type {Board} */ (b), serverNow());
  if (!b && !net.online) info = "Hors ligne";
  else if (me && me.banned) info = "Retiré du classement";
  else if (b && isOpen() && onPc()) info = "Sur PC : hors classement de la soirée";
  else if (champ) info = "Bravo " + champ + " !";
  else if (b && closing(b, serverNow())) info = "Soirée finie !";
  setText(ui.menuInfo, info);
  ui.menuAch.textContent = achLabel();
  setCountdown(ui.menuCountdown);
  renderPicker();
}

let pickerOpen = false;

export const pickerIsOpen = () => pickerOpen;

const outfitCount = () => owned().length + Object.keys(SLOTS).reduce((n, s) => n + gearOwned(s).length, 0);
const seenCount = () => Number(store.get(KEYS.outfitSeen)) || 0;

/** @param {boolean} open */
export function openPicker(open) {
  pickerOpen = open;
  if (open) store.set(KEYS.outfitSeen, outfitCount());
  renderPicker();
}

export function renderPicker() {
  const list = owned(), gears = Object.keys(SLOTS).some((s) => gearOwned(s).length), spreads = list.length > 1;
  if (store.get(KEYS.outfitSeen) === null) store.set(KEYS.outfitSeen, outfitCount());
  const fresh = !pickerOpen && outfitCount() > seenCount();
  ui.picker.hidden = needJoin() || (!spreads && !gears);
  ui.pickToast.setAttribute("aria-expanded", String(pickerOpen));
  ui.pickSkins.hidden = pickerOpen;
  ui.pickDot.hidden = !fresh;
  ui.pickSkins.setAttribute("aria-label", fresh ? "Skins, nouveau skin gagné" : "Skins");
  ui.pickPrev.hidden = ui.pickNext.hidden = !pickerOpen || !spreads;
  ui.pickLabel.hidden = !pickerOpen || !spreads;
  ui.pickName.textContent = SPREADS[chosen()].name;
  ui.pickCount.textContent = list.length + "/" + Object.keys(SPREADS).length;
  ui.gearRows.hidden = !pickerOpen;
  ui.menu.classList.toggle("dressing", pickerOpen && gears);
  for (const row of ui.gearRows.children) {
    const slot = row.dataset.slot, kind = chosenGear(slot), n = gearOwned(slot).length, [name, count] = row.querySelectorAll("span");
    row.hidden = !n;
    name.textContent = kind ? GEAR[kind].name : SLOTS[slot];
    count.textContent = n + "/" + gearTotal(slot);
  }
}

/** @param {number} rank @param {string} pseudo @param {number} best @param {boolean} me @param {string} id */
function boardRow(rank, pseudo, best, me, id) {
  const li = document.createElement("li");
  li.className = [me ? "me" : "", rank <= PODIUM ? "podium p" + rank : ""].join(" ").trim();
  if (id) {
    Object.assign(li.dataset, { id, pseudo });
    li.tabIndex = 0;
    li.setAttribute("role", "button");
  }
  for (const [cls, text] of [["pos", String(rank)], ["name", pseudo], ["val", fmtCs(best)]]) {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    li.append(span);
  }
  return li;
}

/** @param {string | null} scope */
export function setBoardScope(scope) {
  boardScope = scope;
  ui.boardList.scrollTop = 0;
  renderBoard();
}

export function renderBoard() {
  const b = net.board;
  const live = !!(b && b.event && (isOpen() || recentEvent())), next = !live && upcomingEvent();
  const eventBoard = live || !!next;
  let scope = boardScope || (onPc() ? "pc" : isOpen() ? "event" : "general");
  if (scope === "event" && !eventBoard) scope = "general";
  const soon = scope === "event" && !live;
  for (const tab of ui.boardTabs.children) {
    tab.hidden = tab.dataset.scope === "event" && !eventBoard;
    tab.setAttribute("aria-selected", String(tab.dataset.scope === scope));
  }
  shownScope = scope;
  ui.boardEvent.textContent = scope === "event" ? /** @type {EventInfo} */ (live ? b.event : next).name : "Tous les temps";
  boardCountdown();
  const top = b && !soon ? (scope === "event" ? b.eventTop : scope === "pc" ? b.pcTop || [] : b.top) : [];
  const mine = /** @type {Standing} */ (soon ? { rank: null } : standing(scope)), me = b && b.me;
  const count = fillBoard(top.slice(0, BOARD_TOP), mine, me);
  ui.boardList.hidden = count === 0;
  setText(ui.boardEmpty, count ? "" : soon ? "Prochaine soirée " + when(/** @type {EventInfo} */ (next).opensAt) : b ? "Aucun score pour l'instant" : "Hors ligne");
}

/** @param {Ranked[]} top @param {Standing} mine @param {Me | null} me */
function fillBoard(top, mine, me) {
  const rows = top.map((r) => boardRow(r.rank, r.pseudo, r.best, r.me, r.id));
  if (me && mine.rank && !top.some((r) => r.me)) {
    if (mine.rank > top.length + 1) {
      const gap = document.createElement("li");
      gap.className = "gap";
      gap.textContent = "…";
      rows.push(gap);
    }
    rows.push(boardRow(mine.rank, me.pseudo, mine.best, true, me.id));
  }
  ui.boardList.replaceChildren(...rows);
  return rows.length;
}

export function achLabel() {
  const p = progress();
  return "Succès " + p.got + "/" + p.total;
}

/** @param {number} score @param {boolean} newBest */
export function renderOver(score, newBest) {
  setDigits(ui.final, fmtCs(score));
  setCountdown(ui.overCountdown);
  ui.newBest.textContent = "Nouveau record";
  ui.newBest.classList.remove("gold");
  ui.newBest.hidden = !newBest;
  ui.overBoard.hidden = !net.board;
  ui.overRival.hidden = true;
  renderOverStats(newBest ? 0 : knownBest(), null, 0);
}

/** @param {Killer} killer */
export function renderKiller(killer) {
  const weapon = killer && PROJECTILES[killer.kind];
  ui.overBy.hidden = !weapon;
  if (weapon) ui.overBy.textContent = "par " + (killer.spread ? "un couteau " + SPREADS[killer.spread].with : weapon.by);
}

/** @param {number} best @param {number | null} rank @param {number} count */
export function renderOverStats(best, rank, count) {
  fillStats(ui.overStats, ui.overBestBox, ui.overBest, ui.overRankBox, ui.overRank, best, rank, count);
}

/** @param {number} score @param {Rival | null} [rival] */
export function renderRival(score, rival) {
  ui.overRival.hidden = !rival;
  if (!rival) return;
  /** @param {string} text */
  const b = (text) => {
    const el = document.createElement("b");
    el.textContent = text;
    return el;
  };
  ui.overRival.replaceChildren("Encore ", b(fmtCs(rival.best + 1 - score) + " s"), " pour passer ", b(rival.pseudo));
}

export function renderHud() {
  setDigits(ui.time, "0,00");
  ui.achToast.hidden = true;
  ui.holdHint.hidden = true;
  ui.time.classList.remove("hot", "cheer", "lap");
  ui.hudBest.classList.remove("hot");
  ui.hudBest.textContent = knownBest() ? "Record " + fmtCs(knownBest()) : "";
}

/** @param {HTMLElement} button @param {boolean} on @param {boolean} available */
function renderToggle(button, on, available) {
  button.hidden = !available;
  button.classList.toggle("muted", !on);
  button.setAttribute("aria-pressed", String(on));
}

/** @param {boolean} playing */
export function renderControls(playing) {
  const page = openPage();
  ui.infoBtn.hidden = playing || !!page;
  ui.settingsBtn.hidden = ui.infoBtn.hidden;
  const quiet = playing || (!!page && current !== "board");
  renderToggle(ui.music, prefs.music, !quiet && musicAvailable());
  renderToggle(ui.sfx, prefs.sfx, !quiet);
}

export function renderAll() {
  if (!ui.menu.hidden) renderMenu();
  if (!ui.board.hidden) renderBoard();
  if (!ui.over.hidden) ui.overBoard.hidden = !net.board;
}
