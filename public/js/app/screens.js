import { fmtCs, ord, clock } from "../shared/format.js";
import { store, KEYS } from "../shared/store.js";
import { net, serverNow, hasEvent, registered, isOpen, knownBest } from "./api.js";
import { prefs, musicAvailable } from "./audio.js";

const $ = (id) => document.getElementById(id);

export const ui = {
  menu: $("menu"), over: $("over"), board: $("board"), hud: $("hud"), time: $("time"), hudBest: $("hudBest"),
  brand: $("brand"), menuStats: $("menuStats"), menuBestBox: $("menuBestBox"), menuBest: $("menuBest"),
  menuRankBox: $("menuRankBox"), menuRank: $("menuRank"), menuInfo: $("menuInfo"),
  joinForm: $("joinForm"), pseudo: $("pseudo"), joinError: $("joinError"),
  menuActions: $("menuActions"), play: $("play"), menuBoard: $("menuBoard"), menuCountdown: $("menuCountdown"), adminLink: $("adminLink"),
  final: $("final"), newBest: $("newBest"), overNote: $("overNote"),
  overStats: $("overStats"), overBestBox: $("overBestBox"), overBest: $("overBest"), overRankBox: $("overRankBox"), overRank: $("overRank"),
  again: $("again"), overBoard: $("overBoard"),
  boardEvent: $("boardEvent"), boardCountdown: $("boardCountdown"), boardList: $("boardList"), boardEmpty: $("boardEmpty"), boardBack: $("boardBack"),
  music: $("music"), sfx: $("sfx")
};

const SCREENS = { menu: ["menu"], play: ["hud"], over: ["over"], board: ["board"] };

export function show(name) {
  for (const id of ["menu", "over", "board", "hud"]) ui[id].hidden = !SCREENS[name].includes(id);
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

function setCountdown(el) {
  if (!hasEvent()) {
    el.hidden = true;
    return;
  }
  const left = net.board.event.closesAt - serverNow();
  el.hidden = false;
  if (left <= 0) {
    el.replaceChildren("Classement fermé");
    return;
  }
  if (!el.timer) {
    el.timer = document.createElement("span");
    el.timer.className = "digits";
  }
  if (el.lastChild !== el.timer) el.replaceChildren("Fin dans ", el.timer);
  setDigits(el.timer, clock(left));
}

export function tickCountdowns() {
  if (!ui.menu.hidden) setCountdown(ui.menuCountdown);
  if (!ui.board.hidden) setCountdown(ui.boardCountdown);
}

function fillStats(box, bestBox, bestEl, rankBox, rankEl, best, rank, count) {
  bestBox.hidden = !best;
  if (best) setDigits(bestEl, fmtCs(best));
  rankBox.hidden = !rank;
  if (rank) rankEl.textContent = ord(rank) + " / " + count;
  box.hidden = !best && !rank;
}

export const needJoin = () => isOpen() && !registered();

export function renderMenu() {
  const b = net.board;
  const me = b && b.me;
  ui.joinForm.hidden = !needJoin();
  ui.menuActions.hidden = needJoin();
  ui.menuBoard.hidden = !hasEvent();
  ui.adminLink.hidden = !store.get(KEYS.adminToken);
  fillStats(ui.menuStats, ui.menuBestBox, ui.menuBest, ui.menuRankBox, ui.menuRank,
    needJoin() ? 0 : knownBest(), me && isOpen() ? me.rank : null, b ? b.count : 0);
  let info = "";
  if (!b && !net.online) info = "Hors ligne";
  else if (b && !b.event) info = "Entraînement";
  else if (b && !isOpen()) info = b.top[0] ? "Bravo " + b.top[0].pseudo + " !" : "";
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

export function renderBoard() {
  const b = net.board;
  ui.boardEvent.textContent = b && b.event ? b.event.name : "";
  setCountdown(ui.boardCountdown);
  const top = b ? b.top : [];
  const rows = top.map((r) => boardRow(r.rank, r.pseudo, r.best, r.me));
  if (b && b.me && b.me.rank && !top.some((r) => r.me)) {
    const gap = document.createElement("li");
    gap.className = "gap";
    gap.textContent = "…";
    rows.push(gap, boardRow(b.me.rank, b.me.pseudo, b.me.best, true));
  }
  ui.boardList.replaceChildren(...rows);
  ui.boardList.hidden = rows.length === 0;
  setText(ui.boardEmpty, rows.length ? "" : b ? "Aucun score pour l'instant" : "Hors ligne");
}

export function renderOver(score, newBest) {
  setDigits(ui.final, fmtCs(score));
  ui.newBest.hidden = !newBest;
  ui.overBoard.hidden = !hasEvent();
  renderOverStats(newBest ? 0 : knownBest(), null, 0);
}

export function renderOverStats(best, rank, count) {
  fillStats(ui.overStats, ui.overBestBox, ui.overBest, ui.overRankBox, ui.overRank, best, rank, count);
}

export function renderHud() {
  setDigits(ui.time, "0,00");
  ui.hudBest.textContent = knownBest() ? "Record " + fmtCs(knownBest()) : "";
}

function renderToggle(button, on, available) {
  button.hidden = !available;
  button.classList.toggle("muted", !on);
  button.setAttribute("aria-pressed", String(on));
}

export function renderControls(playing) {
  renderToggle(ui.music, prefs.music, !playing && musicAvailable());
  renderToggle(ui.sfx, prefs.sfx, !playing);
}

export function renderAll() {
  if (!ui.menu.hidden) renderMenu();
  if (!ui.board.hidden) renderBoard();
  if (!ui.over.hidden) ui.overBoard.hidden = !hasEvent();
}
