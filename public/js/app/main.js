import { createSim } from "../game/sim.js";
import { STEP } from "../game/field.js";
import { session, KEYS } from "../shared/store.js";
import { VERSION } from "../version.js";
import * as api from "./api.js";
import * as audio from "./audio.js";
import { startDiag } from "./diag.js";
import { hasMouse } from "./input.js";
import * as ach from "./achievements.js";
import { chosen, onTopping, stepTopping } from "./toppings.js";
import { outfit, chooseGear, onGear, stepGear } from "./gear.js";
import { GEAR } from "../shared/palette.js";
import { setInvincible } from "./settings.js";
import { onInstallChange } from "./install.js";
import { shareLook, stampOutfit, onAdopt } from "./profile.js";
import { initAccount } from "./account.js";
import { finishLoading } from "./loader.js";
import {
  ui, show, screen, openPage, setText, markInvalid, tickCountdowns, renderMenu, renderPicker, openPicker, pickerIsOpen, renderBoard,
  renderControls, renderAll, setBoardScope
} from "./screens.js";
import { S, scene, input, playing, replay } from "./state.js";
import { toastAch, gearLabel, renderOverAch } from "./over.js";
import { start, frame, avoidHud } from "./run.js";
import {
  showMenu, maybeSuggest, openBoard, openBoardCard, closeBoardCard, closeBoard, openInfo, closeInfo, showInfoTab, openSettings, closeSettings,
  goHome, openAch, closeAch, goBack
} from "./pages.js";

const MENU_POLL_MS = 30000;
const ADMIN_TAPS = 5, ADMIN_TAP_MS = 3000;

let wasOpen = null, historyFor = null;

window.addEventListener("resize", () => {
  if (S.mode === "play") avoidHud();
  if (openPage() === "board") renderBoard();
});

const go = (e) => {
  if (start(replay())) {
    input.begin(e);
    e.preventDefault();
  }
};
ui.play.addEventListener("pointerdown", go);
ui.again.addEventListener("pointerdown", go);
ui.play.addEventListener("click", () => start());
ui.again.addEventListener("click", () => start(replay()));
ui.menuBoard.addEventListener("click", () => openBoard("menu"));
ui.overBoard.addEventListener("click", () => openBoard("over"));
ui.overAchBtn.addEventListener("click", openAch);
ui.overHome.addEventListener("click", goHome);
ui.boardBack.addEventListener("click", closeBoard);
for (const tab of ui.boardTabs.children) tab.addEventListener("click", () => setBoardScope(tab.dataset.scope));
ui.boardList.addEventListener("click", (e) => {
  const row = e.target.closest("li[data-id]");
  if (row) openBoardCard(row);
});
ui.boardList.addEventListener("keydown", (e) => {
  const row = e.target.closest("li[data-id]");
  if (!row || (e.key !== "Enter" && e.key !== " ")) return;
  e.preventDefault();
  openBoardCard(row);
});
ui.profileBack.addEventListener("click", closeBoardCard);
ui.infoBtn.addEventListener("click", openInfo);
ui.infoBack.addEventListener("click", closeInfo);
ui.closeBtn.addEventListener("click", () => (screen() === "settings" ? closeSettings() : screen() === "ach" ? closeAch() : closeInfo()));
ui.menuAch.addEventListener("click", openAch);
ui.menu.addEventListener("click", (e) => {
  if (e.target.closest("button, a, input, label, select, .picker")) return;
  const b = scene.bodyAt(e.clientX, e.clientY), hit = b && ach.touchSky(b.key);
  if (!hit) return;
  if (!hit.fresh) return toastAch({ name: hit.feat.name + " : déjà gagné" });
  toastAch(hit.feat);
  toastAch({ name: gearLabel(hit.feat) });
  if (hit.all) toastAch(hit.all);
});
ui.pickToast.addEventListener("click", () => openPicker(!pickerIsOpen()));
document.addEventListener("pointerdown", (e) => {
  if (pickerIsOpen() && !ui.picker.contains(e.target)) openPicker(false);
});
ui.pickPrev.addEventListener("click", () => stepTopping(-1));
ui.pickNext.addEventListener("click", () => stepTopping(1));
ui.pickSkins.addEventListener("click", () => openPicker(true));
ui.gearRows.addEventListener("click", (e) => {
  const b = e.target.closest("[data-step]");
  if (b) stepGear(b.parentElement.dataset.slot, Number(b.dataset.step));
});
ui.overAch.addEventListener("click", openAch);
ui.overTry.addEventListener("click", () => {
  goHome();
  openPicker(true);
});
ui.achBack.addEventListener("click", closeAch);
ui.settingsBtn.addEventListener("click", openSettings);
ui.settingsBack.addEventListener("click", closeSettings);
ui.qrBtn.addEventListener("click", () => {
  show("qr");
  renderControls(false);
});
ui.qrBack.addEventListener("click", () => {
  show("settings");
  renderControls(false);
});
for (const tab of ui.infoTabs.children) tab.addEventListener("click", () => showInfoTab(tab.dataset.tab));
ui.godPill.addEventListener("click", () => {
  setInvincible(false);
  ui.godPill.hidden = true;
  avoidHud();
});
ui.music.addEventListener("click", audio.toggleMusic);
ui.sfx.addEventListener("click", audio.toggleSfx);

ui.joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = ui.joinForm.querySelector("button");
  setText(ui.joinError, "");
  markInvalid(ui.pseudo, false);
  button.disabled = true;
  try {
    await api.join(ui.pseudo.value);
    ui.pseudo.blur();
    maybeSuggest();
  } catch (err) {
    setText(ui.joinError, api.reason(err) + (err.status === 409 ? " C'est toi ? Touche « J'ai déjà un compte »." : ""));
    markInvalid(ui.pseudo, api.badInput(err));
  } finally {
    button.disabled = false;
  }
});

document.addEventListener("click", (e) => {
  const button = e.detail && (S.mode === "menu" || S.mode === "over") && e.target instanceof Element && e.target.closest("button");
  if (button) button.blur();
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof Element && e.target.closest("input:not([type=range]), select, textarea")) return;
  if (e.key === "Escape") {
    if (!e.repeat && goBack()) e.preventDefault();
    return;
  }
  if (e.target instanceof Element && e.target.closest("button, a")) return;
  if ((e.code !== "Space" && e.code !== "Enter") || openPage()) return;
  if ((S.mode === "menu" || S.mode === "over") && start(replay())) e.preventDefault();
});

let brandTaps = [];
ui.brand.addEventListener("click", () => {
  const now = Date.now();
  brandTaps = brandTaps.filter((t) => now - t < ADMIN_TAP_MS).concat(now);
  if (brandTaps.length >= ADMIN_TAPS) location.href = "/admin";
});

for (const name of ["pointerup", "touchend", "click", "keydown"]) {
  document.addEventListener(name, audio.unlockAudio, { passive: true });
}
document.addEventListener("visibilitychange", () => {
  if (document.hidden && S.mode === "play") {
    S.held = true;
    input.reset();
    ui.holdHint.hidden = false;
  }
  audio.pauseForBackground(document.hidden || S.held);
  if (!document.hidden && S.mode !== "play") api.refreshBoard();
});

api.on("board", renderAll);
api.on("board", shareLook);
api.on("board", () => {
  const me = api.net.board && api.net.board.me;
  if (!me || !me.id || me.banned || historyFor === me.id) return;
  historyFor = me.id;
  api.call("GET", "/api/players/" + encodeURIComponent(me.id)).then(ach.onHistory).catch((e) => { if (!e.status && historyFor === me.id) historyFor = null; });
});
api.on("result", ach.afterSubmit);
api.on("board", () => ach.onBoard(api.net.board));
onTopping((kind, synced) => {
  S.toast.spread = kind;
  renderPicker();
  if (!synced) stampOutfit();
  shareLook();
});
onGear((slot, kind) => {
  S.toast[slot] = kind;
  ach.checkOutfit(S.toast);
  renderPicker();
  stampOutfit();
  shareLook();
});
onAdopt(() => {
  Object.assign(S.toast, outfit(), { spread: chosen() });
  ach.checkOutfit(S.toast);
  renderPicker();
});
ach.onUnlock((a, synced) => {
  shareLook();
  if (a.gear && !synced) chooseGear(GEAR[a.gear].slot, a.gear);
  else Object.assign(S.toast, outfit());
  if (S.mode === "play") {
    toastAch(a);
    if (a.gear) toastAch({ name: gearLabel(a) });
  } else if (S.mode === "over") renderOverAch();
  else if (!ui.menu.hidden) renderMenu();
});
ach.checkOutfit(S.toast);
const typing = () => (!ui.joinForm.hidden && !!ui.pseudo.value.trim()) || (!ui.linkForm.hidden && !!ui.linkInput.value.trim());
api.on("update", () => {
  if (screen() === "menu" && !typing()) api.applyUpdate();
});
audio.onAudioChange(() => renderControls(playing()));
onInstallChange(maybeSuggest);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=" + encodeURIComponent(VERSION)).catch(() => {});

setInterval(() => {
  const open = api.isOpen();
  if (wasOpen !== null && open !== wasOpen) {
    renderAll();
    api.refreshBoard();
  }
  wasOpen = open;
  tickCountdowns();
}, 1000);

setInterval(() => {
  if (S.mode === "menu" && openPage() !== "board" && !document.hidden) api.refreshBoard();
}, MENU_POLL_MS);

{
  const warm = createSim();
  for (let i = 0; i < 720; i++) warm.step(STEP, 0, 0);
}

for (const el of document.querySelectorAll(".keys")) el.hidden = !hasMouse();
showMenu();
finishLoading(new Promise((ok) => api.on("board", ok)));
api.refreshBoard();
initAccount(openSettings, () => !playing());
api.resumePending();
if (new URLSearchParams(location.search).get("diag") === "son") session.set(KEYS.diag, "1");
startDiag(session.get(KEYS.diag) === "1");
audio.initAudio();
requestAnimationFrame(frame);
document.documentElement.dataset.ready = "1";
