import { createSim } from "../game/sim.js";
import { FW, FH, STEP, clamp, speedMul, SPEED_MAX } from "../game/field.js";
import { fmtCs } from "../shared/format.js";
import { store, KEYS } from "../shared/store.js";
import { VERSION } from "../version.js";
import * as api from "./api.js";
import * as audio from "./audio.js";
import { createScene } from "./scene.js";
import { createInput } from "./input.js";
import { burst, rain, bounce } from "./party.js";
import * as ach from "./achievements.js";
import { chosen, unlockTopping, onTopping, renderToppings } from "./toppings.js";
import { SPREADS } from "../shared/palette.js";
import { renderWeapons, renderAttacks, renderCredits, animateAttacks } from "./catalog.js";
import { renderSettings, suggestInstall, leaveSettings } from "./settings.js";
import { onInstallChange } from "./install.js";
import {
  ui, show, setText, setDigits, tickCountdowns, renderMenu, renderBoard, renderOver, renderOverStats, renderRival, renderKiller,
  renderHud, renderControls, renderAll, setBoardScope, achLabel
} from "./screens.js";

const ACH_TOAST_MS = 2600, MENU_PLACE_S = 0.5, MENU_LIFT = 6;
const DIE_S = 0.75, FREEZE_S = 0.3, KILL_ZOOM = 0.22, ZOOM_BACK_S = 0.25, AGAIN_LOCK_MS = 450, CHEER_WAIT_MS = 1200;
const BOARD_POLL_MS = 10000, MENU_POLL_MS = 30000;
const ADMIN_TAPS = 5, ADMIN_TAP_MS = 3000;
const CHAIN_S = 1.5, CHAIN_STEPS = 6, LAP_CS = 1000;
const SCARS_MAX = 12, SCAR_JITTER = 0.3;
const HUD_WIDEST = "000,00", HUD_PAD = 6;

document.documentElement.dataset.version = VERSION;
const canvas = document.getElementById("cv");
const scene = createScene(canvas, document.getElementById("fx"));
let sim = createSim();
const S = {
  mode: "menu", clock: 0, dieT: 0, freeze: 0, splat: null, chain: 0, nearAt: -Infinity, train: null, t0: 0,
  newBest: false, score: 0, submit: null, run: null, prevRank: null, scope: "general",
  toast: { x: FW / 2, y: FH * 0.55, tilt: 0, thrust: 0.35, scars: [], spread: chosen() }, gotToppings: [], menuY: FH * 0.55, menuAt: 0
};
let boardOpen = false, boardFrom = "menu", boardTimer = null, wasOpen = null, lastShown = "";
let infoOpen = false, infoFrom = "menu", infoTab = "attacks";
let settingsOpen = false, settingsFrom = "menu";
let achOpen = false, achFrom = "menu", achTimer = null;

const playing = () => S.mode === "play" || S.mode === "dying";
const elapsed = () => sim.state.t - S.t0;
const replay = () => (S.mode === "over" ? S.train : null);
const input = createInput(canvas, { active: () => S.mode === "play", scale: () => scene.view.scale });

function scar(e) {
  const tt = S.toast;
  if (tt.scars.length >= SCARS_MAX) return;
  const a = Math.atan2(e.y - tt.y, e.x - tt.x) - tt.tilt + (Math.random() - 0.5) * SCAR_JITTER;
  tt.scars.push({ a, len: 7 + Math.random() * 3 });
}

function gainTopping(kind) {
  if (S.train || !kind || !unlockTopping(kind)) return;
  S.gotToppings.push(kind);
  if (S.mode === "play") toastAch({ name: "Garniture " + SPREADS[kind].name });
}

const ON_SIM = {
  near(e) {
    scar(e);
    gainTopping(e.spread);
    const t = sim.state.t;
    S.chain = t - S.nearAt < CHAIN_S ? S.chain + 1 : 1;
    S.nearAt = t;
    const step = Math.min(S.chain - 1, CHAIN_STEPS);
    scene.pop(S.toast.x, S.toast.y - 32, S.chain > 1 ? "Frôlé x" + S.chain : "Frôlé !", { key: "near", size: 14 + step * 1.5 });
    audio.playSfx("near", 2 ** ((step * 2) / 12));
  },
  death(e) {
    die(e);
    gainTopping(e.spread);
  }
};

function die(killer) {
  S.mode = "dying";
  S.killer = killer;
  S.dieT = 0;
  S.freeze = FREEZE_S;
  S.toast.thrust = 0;
  input.reset();
  S.score = Math.floor(elapsed() * 100);
  audio.musicRunEnd();
  audio.playSfx("death");
  try { if (navigator.vibrate) navigator.vibrate(140); } catch (e) {}
  if (S.train) {
    S.newBest = false;
    S.submit = null;
    return;
  }
  ach.runEnd(S.score);
  const before = api.standing(S.scope);
  S.newBest = S.score > before.best;
  S.prevRank = before.rank;
  api.saveLocalBest(S.score);
  const sub = S.run ? api.submitScore(S.score, S.run, () => {
    if (S.submit === sub && S.mode === "over") setText(ui.overNote, "Envoi en attente…");
  }) : null;
  S.submit = sub;
  S.run = null;
}

function showMenu() {
  S.mode = "menu";
  S.toast.scars = [];
  show("menu");
  renderMenu();
  renderControls(false);
  if (api.net.updatePending) api.applyUpdate();
  maybeSuggest();
}

function maybeSuggest() {
  if (S.mode === "menu" && !ui.menu.hidden && api.registered()) suggestInstall();
}

function backTo(from) {
  if (from === "over") {
    show("over");
    renderControls(false);
    renderAll();
  } else {
    showMenu();
  }
}

function start(train = null) {
  if (boardOpen || infoOpen || settingsOpen || achOpen || (!train && !ui.joinForm.hidden) || !ui.installPop.hidden) return false;
  if (S.mode !== "menu" && S.mode !== "over") return false;
  if (S.mode === "over" && ui.again.disabled) return false;
  if (api.net.updatePending && api.applyUpdate()) return false;
  const t0 = train ? train.from : 0;
  sim = createSim(Math.random, train ? { only: train.id, t0 } : undefined);
  Object.assign(S, { mode: "play", dieT: 0, freeze: 0, splat: null, chain: 0, nearAt: -Infinity, lap: 0, train, t0, newBest: false, score: 0, submit: null, gotToppings: [], scope: api.isOpen() ? "event" : "general" });
  Object.assign(S.toast, { x: sim.state.toast.x, y: sim.state.toast.y, tilt: 0, thrust: 0, scars: [] });
  scene.clear();
  S.run = train ? null : api.startRun();
  if (!train) ach.runStart(api.isOpen() && api.net.board && api.net.board.event ? String(api.net.board.event.opensAt) : null);
  if (S.run) S.run.then((r) => { if (r.status === 426 && S.mode === "play") api.applyUpdate(); });
  const lead = api.leader(S.scope);
  S.goal = train ? { best: 0, lead: 0, reached: 0 } : { best: api.standing(S.scope).best, lead: S.run && lead && !lead.me ? lead.best : 0, reached: 0 };
  input.reset();
  lastShown = "";
  show("play");
  renderControls(true);
  renderHud();
  if (train) ui.hudBest.textContent = "Entraînement : " + train.name;
  avoidHud();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  audio.musicRunStart();
  audio.playSfx("start");
  return true;
}

const probe = document.createElement("canvas").getContext("2d");

function textWidth(el, text) {
  const cs = getComputedStyle(el);
  probe.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return probe.measureText(text).width + (parseFloat(cs.letterSpacing) || 0) * text.length;
}

function avoidHud() {
  const t = ui.time.getBoundingClientRect(), b = ui.hudBest.getBoundingClientRect();
  const half = Math.max(textWidth(ui.time, HUD_WIDEST), textWidth(ui.hudBest, ui.hudBest.textContent)) / 2 + HUD_PAD;
  const mid = (t.left + t.right) / 2;
  scene.avoid({ left: mid - half, right: mid + half, bottom: Math.max(t.bottom, b.bottom) + HUD_PAD });
}

window.addEventListener("resize", () => { if (S.mode === "play") avoidHud(); });

function cheer() {
  const mine = S.submit, prev = S.prevRank;
  const timeout = new Promise((ok) => setTimeout(() => ok(null), CHEER_WAIT_MS));
  Promise.race([mine || Promise.resolve(null), timeout]).then((r) => {
    if (S.submit !== mine || S.mode !== "over") return;
    const event = S.scope === "event";
    const first = r && !r.error && (event ? r.eventImproved && r.eventRank === 1 : r.improved && r.rank === 1) && prev !== 1;
    audio.playSfx(first ? "first" : "record");
    if (!first) return;
    ui.newBest.textContent = "N°1 !";
    ui.newBest.classList.add("gold");
    bounce(ui.newBest);
    burst(ui.final, { count: 70, power: 1.2, gold: true });
    rain();
  });
}

function cheerRun(cs) {
  const g = S.goal;
  if (g.reached < 2 && g.lead && cs > g.lead) {
    g.reached = 2;
    cheerHud("N°1 !", 30, true);
  } else if (g.reached < 1 && g.best && cs > g.best) {
    g.reached = 1;
    cheerHud("Nouveau record", 18, false);
  }
}

function lap(cs) {
  const n = Math.floor(cs / LAP_CS);
  if (n <= S.lap) return;
  S.lap = n;
  ui.time.classList.remove("lap");
  void ui.time.offsetWidth;
  ui.time.classList.add("lap");
}

function cheerHud(text, count, gold) {
  ui.hudBest.textContent = text;
  ui.hudBest.classList.add("hot");
  ui.time.classList.add("hot");
  bounce(ui.time);
  burst(ui.time, { count, power: 0.55, gold });
}

function showOver() {
  S.mode = "over";
  show("over");
  renderControls(false);
  renderOver(S.score, S.newBest);
  renderKiller(S.killer);
  renderOverAch();
  if (S.train) renderOverStats(0, null, 0);
  if (S.newBest) {
    bounce(ui.final.parentElement);
    burst(ui.final, { count: 44 });
    cheer();
  }
  const mine = S.submit;
  if (mine) {
    setText(ui.overNote, "Envoi…");
    mine.then((r) => {
      if (S.submit !== mine || S.mode !== "over") return;
      setText(ui.overNote, r.error || "");
      ach.afterSubmit(r, S.scope);
      const now = api.standing(S.scope);
      if (r.error) return;
      renderOverStats(S.newBest ? 0 : now.best, now.rank, now.count);
      renderRival(S.score, now.rival);
    });
  } else {
    setText(ui.overNote, S.train ? "Entraînement : " + S.train.name : api.registered() ? "" : "Entraînement");
  }
  ui.again.disabled = true;
  setTimeout(() => { ui.again.disabled = false; }, AGAIN_LOCK_MS);
}

function openBoard(from) {
  boardOpen = true;
  boardFrom = from;
  setBoardScope(null);
  show("board");
  renderBoard();
  api.refreshBoard();
  clearInterval(boardTimer);
  boardTimer = setInterval(() => { if (!document.hidden) api.refreshBoard(); }, BOARD_POLL_MS);
}

function closeBoard() {
  clearInterval(boardTimer);
  boardOpen = false;
  if (boardFrom === "over") {
    show("over");
    renderAll();
  } else {
    showMenu();
  }
}

function renderInfo() {
  for (const tab of ui.infoTabs.children) tab.setAttribute("aria-selected", String(tab.dataset.tab === infoTab));
  const showLab = !!store.get(KEYS.adminToken);
  if (infoTab === "attacks") renderAttacks(ui.infoBody, { showLab, onTrain: train });
  else if (infoTab === "weapons") renderWeapons(ui.infoBody, { showLab });
  else renderCredits(ui.infoBody);
  animateAttacks(infoTab === "attacks");
  ui.info.scrollTop = 0;
}

function openInfo() {
  infoOpen = true;
  infoFrom = S.mode === "over" ? "over" : "menu";
  show("info");
  renderControls(false);
  renderInfo();
}

function closeInfo() {
  infoOpen = false;
  animateAttacks(false);
  backTo(infoFrom);
}

function train(attack) {
  infoOpen = false;
  animateAttacks(false);
  if (start(attack)) return;
  infoOpen = true;
  animateAttacks(true);
}

function openSettings() {
  settingsOpen = true;
  settingsFrom = S.mode === "over" ? "over" : "menu";
  show("settings");
  renderControls(false);
  renderSettings();
  ui.settings.scrollTop = 0;
}

function renderOverAch() {
  const got = S.train ? [] : [...ach.runUnlocked().map((a) => a.name), ...S.gotToppings.map((k) => "Garniture " + SPREADS[k].name)];
  ui.overAch.hidden = !got.length;
  ui.overAch.textContent = "★ " + got.join(", ");
  ui.overAchBtn.textContent = achLabel();
}

function goHome() {
  if (S.mode !== "over") return;
  S.splat = null;
  S.train = null;
  S.t0 = 0;
  sim = createSim();
  scene.clear();
  showMenu();
}

function toastAch(a) {
  const t = ui.achToast;
  t.textContent = !t.hidden && achTimer ? t.textContent + ", " + a.name : "★ " + a.name;
  if (t.hidden || !achTimer) {
    t.hidden = false;
    bounce(t);
  }
  clearTimeout(achTimer);
  achTimer = setTimeout(() => {
    t.hidden = true;
    achTimer = null;
  }, ACH_TOAST_MS);
}

function openAch() {
  achOpen = true;
  achFrom = S.mode === "over" ? "over" : "menu";
  show("ach");
  renderControls(false);
  ach.renderAchievements(ui.achList, ui.achCount);
  ui.achList.prepend(renderToppings());
  ui.ach.scrollTop = 0;
}

function closeAch() {
  achOpen = false;
  backTo(achFrom);
}

function closeSettings() {
  settingsOpen = false;
  leaveSettings();
  backTo(settingsFrom);
}

function menuToastY() {
  const [head, body] = ui.menu.children;
  const mid = (head.getBoundingClientRect().bottom + body.getBoundingClientRect().top) / 2;
  const { scale, oy } = scene.view;
  return clamp((mid - oy) / scale - MENU_LIFT, FH * 0.25, FH * 0.55);
}

function update(dt) {
  S.clock += dt;
  const hot = S.mode === "menu" ? 0 : (speedMul(sim.state.t) - 1) / (SPEED_MAX - 1);
  scene.update(dt, S.mode === "play" ? 1 + (speedMul(sim.state.t) - 1) * 1.6 : 0.5, playing(), hot);
  const tt = S.toast;
  if (S.mode === "menu") {
    tt.x = FW / 2;
    if (S.clock >= S.menuAt && !ui.menu.hidden) {
      S.menuAt = S.clock + MENU_PLACE_S;
      S.menuY = menuToastY();
    }
    tt.y = S.menuY + Math.sin(S.clock * 2.2) * 7;
    tt.tilt = Math.sin(S.clock * 1.3) * 0.08;
    tt.thrust = 0.35;
    return;
  }
  if (S.mode !== "play") {
    if (S.freeze > 0) {
      S.freeze -= dt;
      if (S.freeze <= 0) S.splat = scene.splash(S.toast.x, S.toast.y);
      return;
    }
    sim.drift(dt);
    if (S.mode === "dying") {
      S.dieT += dt;
      if (S.dieT > DIE_S) showOver();
    }
    return;
  }
  const px = sim.state.toast.x, py = sim.state.toast.y;
  const move = input.take();
  const events = sim.step(dt, move.x, move.y);
  if (!S.train) ach.runTick(sim.state, move.x !== 0 || move.y !== 0, dt);
  const st = sim.state.toast;
  const vx = (st.x - px) / dt, vy = (st.y - py) / dt;
  tt.x = st.x;
  tt.y = st.y;
  tt.tilt += (clamp(vx / 900, -0.45, 0.45) - tt.tilt) * Math.min(1, dt * 14);
  tt.thrust += (clamp(Math.hypot(vx, vy) / 600, 0, 1) - tt.thrust) * Math.min(1, dt * 10);
  for (const e of events) ON_SIM[e.type](e);
}

function killZoom() {
  if (S.mode !== "dying") return null;
  const k = S.freeze > 0 ? 1 - (S.freeze / FREEZE_S) ** 2 : Math.max(0, 1 - S.dieT / ZOOM_BACK_S);
  return { x: S.toast.x, y: S.toast.y, k: 1 + KILL_ZOOM * k };
}

let last = performance.now(), acc = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  scene.render({ clock: S.clock, world: sim.state, toast: S.mode === "over" ? null : S.toast, splat: S.splat, finger: S.mode === "play" ? input.finger : null, zoom: killZoom() });
  if (playing()) {
    const cs = Math.floor(elapsed() * 100), s = fmtCs(cs);
    if (s !== lastShown) {
      setDigits(ui.time, s);
      lastShown = s;
      if (S.mode === "play") {
        cheerRun(cs);
        lap(cs);
      }
    }
  }
  if (S.mode === "play") audio.musicRunSync(elapsed());
  requestAnimationFrame(frame);
}

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
ui.infoBtn.addEventListener("click", openInfo);
ui.infoBack.addEventListener("click", closeInfo);
ui.closeBtn.addEventListener("click", () => (settingsOpen ? closeSettings() : achOpen ? closeAch() : closeInfo()));
ui.menuAch.addEventListener("click", openAch);
ui.overAch.addEventListener("click", openAch);
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
for (const tab of ui.infoTabs.children) {
  tab.addEventListener("click", () => {
    infoTab = tab.dataset.tab;
    renderInfo();
  });
}
ui.music.addEventListener("click", audio.toggleMusic);
ui.sfx.addEventListener("click", audio.toggleSfx);

ui.joinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = ui.joinForm.querySelector("button");
  setText(ui.joinError, "");
  button.disabled = true;
  try {
    await api.join(ui.pseudo.value);
    ui.pseudo.blur();
    maybeSuggest();
  } catch (err) {
    setText(ui.joinError, err.status ? err.message : "Pas de réseau, réessaie.");
  } finally {
    button.disabled = false;
  }
});

window.addEventListener("keydown", (e) => {
  if (e.target instanceof Element && e.target.closest("input")) return;
  if (e.code !== "Space" && e.code !== "Enter") return;
  if (S.mode === "menu" || S.mode === "over") {
    e.preventDefault();
    start(replay());
  }
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
  audio.pauseForBackground(document.hidden);
  if (!document.hidden && S.mode !== "play") api.refreshBoard();
});

api.on("board", renderAll);
api.on("board", () => ach.onBoard(api.net.board));
onTopping((kind) => { S.toast.spread = kind; });
ach.onUnlock((a) => {
  if (S.mode === "play") toastAch(a);
  else if (S.mode === "over") renderOverAch();
  else if (!ui.menu.hidden) renderMenu();
});
api.on("update", () => {
  if (S.mode === "menu" && !boardOpen && !infoOpen && !settingsOpen && !achOpen) api.applyUpdate();
});
audio.onAudioChange(() => renderControls(playing()));
onInstallChange(maybeSuggest);

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

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
  if (S.mode === "menu" && !boardOpen && !document.hidden) api.refreshBoard();
}, MENU_POLL_MS);

{
  const warm = createSim();
  for (let i = 0; i < 720; i++) warm.step(STEP, 0, 0);
}

showMenu();
api.refreshBoard();
api.resumePending();
audio.initAudio();
requestAnimationFrame(frame);
