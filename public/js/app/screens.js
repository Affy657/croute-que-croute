import { fmtCs, ord, clock } from "../shared/format.js";
import { net, serverNow, registered, isOpen, openEvent, recentEvent, upcomingEvent, standing, knownBest } from "./api.js";
import { prefs, musicAvailable } from "./audio.js";

const $ = (id) => document.getElementById(id);

export const ui = {
  menu: $("menu"), over: $("over"), board: $("board"), hud: $("hud"), time: $("time"), hudBest: $("hudBest"),
  brand: $("brand"), menuStats: $("menuStats"), menuBestBox: $("menuBestBox"), menuBest: $("menuBest"),
  menuRankBox: $("menuRankBox"), menuRank: $("menuRank"), menuInfo: $("menuInfo"),
  joinForm: $("joinForm"), pseudo: $("pseudo"), joinError: $("joinError"),
  menuActions: $("menuActions"), play: $("play"), menuBoard: $("menuBoard"), menuCountdown: $("menuCountdown"), settingsBtn: $("settingsBtn"),
  final: $("final"), newBest: $("newBest"), overNote: $("overNote"),
  overStats: $("overStats"), overBestBox: $("overBestBox"), overBest: $("overBest"), overRankBox: $("overRankBox"), overRank: $("overRank"),
  again: $("again"), overBoard: $("overBoard"),
  boardTabs: $("boardTabs"), boardEvent: $("boardEvent"), boardCountdown: $("boardCountdown"), boardList: $("boardList"), boardEmpty: $("boardEmpty"), boardBack: $("boardBack"),
  music: $("music"), sfx: $("sfx"),
  info: $("info"), infoBtn: $("infoBtn"), closeBtn: $("closeBtn"), infoTabs: $("infoTabs"), infoBody: $("infoBody"), infoBack: $("infoBack"),
  settings: $("settings"), settingsBar: $("settingsBar"), settingsTabs: $("settingsTabs"), settingsApp: $("settingsApp"), settingsAdmin: $("settingsAdmin"),
  settingsBack: $("settingsBack"), installCard: $("installCard"), installHint: $("installHint"), installBtn: $("installBtn"), shareBtn: $("shareBtn"), qrBtn: $("qrBtn"),
  qr: $("qr"), qrHost: $("qrHost"), qrBack: $("qrBack"),
  installPop: $("installPop"), installPopText: $("installPopText"), installYes: $("installYes"), installLater: $("installLater")
};

const PAGES = ["menu", "over", "board", "hud", "info", "settings", "qr"];
const SCREENS = { menu: ["menu"], play: ["hud"], over: ["over"], board: ["board"], info: ["info"], settings: ["settings"], qr: ["qr"] };

export function show(name) {
  for (const id of PAGES) ui[id].hidden = !SCREENS[name].includes(id);
  ui.infoBtn.hidden = name !== "menu" && name !== "over";
  ui.settingsBtn.hidden = ui.infoBtn.hidden;
  ui.closeBtn.hidden = name !== "info" && name !== "settings";
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

export function renderMenu() {
  const b = net.board;
  const me = b && b.me;
  ui.joinForm.hidden = !needJoin();
  ui.menuActions.hidden = needJoin();
  ui.menuBoard.hidden = !b;
  const mine = standing();
  fillStats(ui.menuStats, ui.menuBestBox, ui.menuBest, ui.menuRankBox, ui.menuRank, needJoin() ? 0 : mine.best, mine.rank, mine.count);
  let info = "";
  const recent = recentEvent(), next = upcomingEvent();
  if (!b && !net.online) info = "Hors ligne";
  else if (me && me.banned) info = "Retiré du classement";
  else if (b && !isOpen() && recent && b.eventTop[0]) info = "Bravo " + b.eventTop[0].pseudo + " !";
  else if (b && !isOpen() && next) info = "Prochaine soirée " + when(next.opensAt);
  setText(ui.menuInfo, info);
  setCountdown(ui.menuCountdown);
}

function boardRow(rank, pseudo, best, me) {
  const li = document.createElement("li");
  if (me) li.className = "me";
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
  renderBoard();
}

export function renderBoard() {
  const b = net.board;
  const eventBoard = !!(b && b.event && (isOpen() || recentEvent()));
  const scope = eventBoard ? boardScope || (isOpen() ? "event" : "general") : "general";
  ui.boardTabs.hidden = !eventBoard;
  for (const tab of ui.boardTabs.children) tab.setAttribute("aria-selected", String(tab.dataset.scope === scope));
  shownScope = scope;
  ui.boardEvent.textContent = scope === "event" ? b.event.name : "Tous les temps";
  boardCountdown();
  const top = b ? (scope === "event" ? b.eventTop : b.top) : [];
  const rows = top.map((r) => boardRow(r.rank, r.pseudo, r.best, r.me));
  const mine = standing(scope);
  if (b && b.me && mine.rank && !top.some((r) => r.me)) {
    const gap = document.createElement("li");
    gap.className = "gap";
    gap.textContent = "…";
    rows.push(gap, boardRow(mine.rank, b.me.pseudo, mine.best, true));
  }
  ui.boardList.replaceChildren(...rows);
  ui.boardList.hidden = rows.length === 0;
  setText(ui.boardEmpty, rows.length ? "" : b ? "Aucun score pour l'instant" : "Hors ligne");
}

export function renderOver(score, newBest) {
  setDigits(ui.final, fmtCs(score));
  ui.newBest.textContent = "Nouveau record";
  ui.newBest.classList.remove("gold");
  ui.newBest.hidden = !newBest;
  ui.overBoard.hidden = !net.board;
  renderOverStats(newBest ? 0 : knownBest(), null, 0);
}

export function renderOverStats(best, rank, count) {
  fillStats(ui.overStats, ui.overBestBox, ui.overBest, ui.overRankBox, ui.overRank, best, rank, count);
}

export function renderHud() {
  setDigits(ui.time, "0,00");
  ui.time.classList.remove("hot", "cheer");
  ui.hudBest.classList.remove("hot");
  ui.hudBest.textContent = knownBest() ? "Record " + fmtCs(knownBest()) : "";
}

function renderToggle(button, on, available) {
  button.hidden = !available;
  button.classList.toggle("muted", !on);
  button.setAttribute("aria-pressed", String(on));
}

export function renderControls(playing) {
  const page = !ui.info.hidden || !ui.settings.hidden || !ui.qr.hidden;
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
