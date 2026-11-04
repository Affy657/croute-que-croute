import { createSim } from "../game/sim.js";
import { store, KEYS } from "../shared/store.js";
import * as api from "./api.js";
import * as ach from "./achievements.js";
import { renderWeapons, renderAttacks, renderCredits, animateAttacks } from "./catalog.js";
import { renderGuide } from "./guide.js";
import { renderSettings, suggestInstall, leaveSettings } from "./settings.js";
import { openCard, closeCard } from "./profile.js";
import { resetAccount } from "./account.js";
import { ui, show, screen, openPage, renderMenu, openPicker, pickerIsOpen, renderBoard, renderControls, renderAll, setBoardScope } from "./screens.js";
import { S, scene, game } from "./state.js";
import { start } from "./run.js";

const BOARD_POLL_MS = 10000;

/** @type {Timer} */
let boardTimer = null, pageFrom = "menu", infoTab = "attacks", /** @type {string | null} */ cardId = null;

export function showMenu() {
  S.mode = "menu";
  S.toast.scars = [];
  show("menu");
  renderMenu();
  renderControls(false);
  if (api.net.updatePending) api.applyUpdate();
  maybeSuggest();
}

export function maybeSuggest() {
  if (S.mode === "menu" && !ui.menu.hidden && api.registered()) suggestInstall();
}

/** @param {string} from */
function backTo(from) {
  if (from === "over") {
    show("over");
    renderControls(false);
    renderAll();
  } else {
    showMenu();
  }
}

/** @param {string} from */
export function openBoard(from) {
  pageFrom = from;
  setBoardScope(null);
  show("board");
  renderBoard();
  api.refreshBoard();
  clearInterval(boardTimer);
  boardTimer = setInterval(() => { if (!document.hidden && openPage() === "board") api.refreshBoard(); }, BOARD_POLL_MS);
}

/** @param {Row} row */
export function openBoardCard(row) {
  cardId = row.dataset.id;
  show("profile");
  renderControls(false);
  ui.profile.scrollTop = 0;
  openCard(row.dataset.id, row.dataset.pseudo);
  ui.profileName.focus({ preventScroll: true });
}

export function closeBoardCard() {
  const id = cardId;
  cardId = null;
  closeCard();
  show("board");
  renderControls(false);
  renderBoard();
  const row = ui.boardList.querySelector(`li[data-id="${CSS.escape(/** @type {string} */ (id))}"]`);
  if (!row) return;
  row.focus({ preventScroll: true });
  row.scrollIntoView({ block: "nearest" });
}

export function closeBoard() {
  clearInterval(boardTimer);
  backTo(pageFrom);
}

function renderInfo() {
  for (const tab of ui.infoTabs.children) tab.setAttribute("aria-selected", String(tab.dataset.tab === infoTab));
  const showLab = !!store.get(KEYS.adminToken);
  if (infoTab === "attacks") renderAttacks(ui.infoBody, { showLab, onTrain: train });
  else if (infoTab === "weapons") renderWeapons(ui.infoBody, { showLab });
  else if (infoTab === "guide") renderGuide(ui.infoBody);
  else renderCredits(ui.infoBody);
  animateAttacks(infoTab === "attacks");
  ui.info.scrollTop = 0;
}

/** @param {string} tab */
export function showInfoTab(tab) {
  infoTab = tab;
  renderInfo();
}

export function openInfo() {
  pageFrom = S.mode === "over" ? "over" : "menu";
  show("info");
  renderControls(false);
  renderInfo();
}

export function closeInfo() {
  animateAttacks(false);
  backTo(pageFrom);
}

/** @param {Attack} attack */
function train(attack) {
  if (start(attack)) animateAttacks(false);
}

export function openSettings() {
  pageFrom = S.mode === "over" ? "over" : "menu";
  show("settings");
  renderControls(false);
  resetAccount();
  renderSettings();
  ui.settings.scrollTop = 0;
}

export function goHome() {
  if (S.mode !== "over") return;
  S.splat = null;
  S.train = null;
  S.t0 = 0;
  game.sim = createSim();
  scene.clear();
  showMenu();
}

export function openAch() {
  pageFrom = S.mode === "over" ? "over" : "menu";
  show("ach");
  renderControls(false);
  ach.renderAchievements(ui.achList, ui.achCount);
  ui.ach.scrollTop = 0;
}

export function closeAch() {
  backTo(pageFrom);
}

export function closeSettings() {
  leaveSettings();
  backTo(pageFrom);
}

/** @type {Record<string, HTMLElement>} */
const BACK = { board: ui.boardBack, profile: ui.profileBack, info: ui.infoBack, settings: ui.settingsBack, qr: ui.qrBack, link: ui.linkBack, ach: ui.achBack };

export function goBack() {
  if (!ui.installPop.hidden) ui.installLater.click();
  else if (pickerIsOpen()) openPicker(false);
  else if (BACK[screen()]) BACK[screen()].click();
  else return false;
  return true;
}
