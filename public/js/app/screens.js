import { fmtCs, ord, clock } from "../shared/format.js";
import { net, serverNow, registered, isOpen, openEvent, recentEvent, upcomingEvent, standing, knownBest, onPc } from "./api.js";
import { prefs, musicAvailable } from "./audio.js";
import { progress } from "./achievements.js";
import { PROJECTILES } from "../game/projectiles.js";
import { GEAR, SLOTS, SPREADS } from "../shared/palette.js";
import { owned, chosen } from "./toppings.js";
import { store, KEYS } from "../shared/store.js";
import { gearOwned, gearTotal, chosenGear } from "./gear.js";

const $ = (id) => document.getElementById(id);
const BOARD_TOP = 30, PODIUM = 3;

export const ui = {
  menu: $("menu"), over: $("over"), board: $("board"), hud: $("hud"), time: $("time"), hudBest: $("hudBest"),
  brand: $("brand"), menuStats: $("menuStats"), menuBestBox: $("menuBestBox"), menuBest: $("menuBest"),
  menuRankBox: $("menuRankBox"), menuRank: $("menuRank"), menuInfo: $("menuInfo"), menuPitch: $("menuPitch"),
  joinForm: $("joinForm"), pseudo: $("pseudo"), joinError: $("joinError"), haveAccount: $("haveAccount"),
  linkForm: $("linkForm"), linkInput: $("linkInput"), linkError: $("linkError"), newAccount: $("newAccount"),
  linkCard: $("linkCard"), linkBtn: $("linkBtn"), link: $("link"), linkQr: $("linkQr"), linkCode: $("linkCode"), linkTime: $("linkTime"), linkCopy: $("linkCopy"), linkFail: $("linkFail"), linkBack: $("linkBack"),
  mergeBtn: $("mergeBtn"), mergeForm: $("mergeForm"), mergeInput: $("mergeInput"), mergeNote: $("mergeNote"), mergeAsk: $("mergeAsk"), mergeYes: $("mergeYes"), mergeNo: $("mergeNo"),
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
  ach: $("ach"), achCount: $("achCount"), achList: $("achList"), achBack: $("achBack"), achToast: $("achToast"), menuToast: $("menuToast"), holdHint: $("holdHint"), overAch: $("overAch"), overTry: $("overTry"), musicVol: $("musicVol"), sfxVol: $("sfxVol"), sensVol: $("sensVol"), mouseRow: $("mouseRow"), mouseTabs: $("mouseTabs"), mouseHint: $("mouseHint"),
  renameCard: $("renameCard"), renameForm: $("renameForm"), newPseudo: $("newPseudo"), renameNote: $("renameNote"),
  picker: $("picker"), pickToast: $("pickToast"), pickLabel: $("pickLabel"), pickPrev: $("pickPrev"), pickNext: $("pickNext"), pickName: $("pickName"), pickCount: $("pickCount"), pickSkins: $("pickSkins"), pickDot: $("pickDot"),
  gearRows: $("gearRows"), profile: $("profile"), profileName: $("profileName"), profileBack: $("profileBack"), testCard: $("testCard"), godTabs: $("godTabs"), godPill: $("godPill"),
  installPop: $("installPop"), installPopText: $("installPopText"), installYes: $("installYes"), installLater: $("installLater"),
  versionNote: $("versionNote")
};

const PAGES = ["menu", "over", "board", "hud", "info", "settings", "qr", "link", "ach", "profile"];
const SCREENS = { menu: ["menu"], play: ["hud"], over: ["over"], board: ["board"], info: ["info"], settings: ["settings"], qr: ["qr"], link: ["link"], ach: ["ach"], profile: ["profile"] };

export function show(name) {
  for (const id of PAGES) ui[id].hidden = !SCREENS[name].includes(id);
  ui.infoBtn.hidden = name !== "menu" && name !== "over";
  ui.settingsBtn.hidden = ui.infoBtn.hidden;
  ui.closeBtn.hidden = name !== "info" && name !== "settings" && name !== "ach";
}

export function setText(el, text) {
  el.textContent = text;
  el.hidden = !text;
}

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

const SOON_MS = 24 * 3600 * 1000;
let boardScope = null, shownScope = "general";

function when(ms) {
  const d = new Date(ms);
  const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return day + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

function setCountdown(el) {
  const open = openEvent(), next = upcomingEvent(), now = serverNow();
  const [label, target] = open ? ["Fin dans ", open.closesAt] : next && next.opensAt - now < SOON_MS ? ["Début dans ", next.opensAt] : [null, 0];
  el.hidden = !label;
  if (!label) return;
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

function fillStats(box, bestBox, bestEl, rankBox, rankEl, best, rank, count) {
  bestBox.hidden = !best;
  if (best) setDigits(bestEl, fmtCs(best));
  rankBox.hidden = !rank;
  if (rank) rankEl.textContent = ord(rank) + " / " + count;
  box.hidden = !best && !rank;
}

export const needJoin = () => !!net.board && !registered();

let linking = false;

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
  const recent = recentEvent();
  if (!b && !net.online) info = "Hors ligne";
  else if (me && me.banned) info = "Retiré du classement";
  else if (b && isOpen() && onPc()) info = "Sur PC : hors classement de la soirée";
  else if (b && !isOpen() && recent && serverNow() >= recent.finalAt && b.eventTop[0]) info = "Bravo " + b.eventTop[0].pseudo + " !";
  setText(ui.menuInfo, info);
  ui.menuAch.textContent = achLabel();
  setCountdown(ui.menuCountdown);
  renderPicker();
}

let pickerOpen = false;

export const pickerIsOpen = () => pickerOpen;

const outfitCount = () => owned().length + Object.keys(SLOTS).reduce((n, s) => n + gearOwned(s).length, 0);
const seenCount = () => Number(store.get(KEYS.outfitSeen)) || 0;

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
  ui.boardEvent.textContent = scope === "event" ? (live ? b.event : next).name : "Tous les temps";
  boardCountdown();
  const top = b && !soon ? (scope === "event" ? b.eventTop : scope === "pc" ? b.pcTop || [] : b.top) : [];
  const mine = soon ? { rank: null } : standing(scope), me = b && b.me;
  const count = fillBoard(top.slice(0, BOARD_TOP), mine, me);
  ui.boardList.hidden = count === 0;
  setText(ui.boardEmpty, count ? "" : soon ? "Prochaine soirée " + when(next.opensAt) : b ? "Aucun score pour l'instant" : "Hors ligne");
}

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

export function renderKiller(killer) {
  const weapon = killer && PROJECTILES[killer.kind];
  ui.overBy.hidden = !weapon;
  if (weapon) ui.overBy.textContent = "par " + (killer.spread ? "un couteau " + SPREADS[killer.spread].with : weapon.by);
}

export function renderOverStats(best, rank, count) {
  fillStats(ui.overStats, ui.overBestBox, ui.overBest, ui.overRankBox, ui.overRank, best, rank, count);
}

export function renderRival(score, rival) {
  ui.overRival.hidden = !rival;
  if (!rival) return;
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

function renderToggle(button, on, available) {
  button.hidden = !available;
  button.classList.toggle("muted", !on);
  button.setAttribute("aria-pressed", String(on));
}

export function renderControls(playing) {
  const page = !ui.info.hidden || !ui.settings.hidden || !ui.qr.hidden || !ui.link.hidden || !ui.ach.hidden || !ui.profile.hidden;
  ui.infoBtn.hidden = playing || page || !ui.board.hidden;
  ui.settingsBtn.hidden = ui.infoBtn.hidden;
  const quiet = playing || page;
  renderToggle(ui.music, prefs.music, !quiet && musicAvailable());
  renderToggle(ui.sfx, prefs.sfx, !quiet);
}

export function renderAll() {
  if (!ui.menu.hidden) renderMenu();
  if (!ui.board.hidden) renderBoard();
  if (!ui.over.hidden) ui.overBoard.hidden = !net.board;
}
