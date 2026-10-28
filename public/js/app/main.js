import { createSim } from "../game/sim.js";
import { FW, FH, STEP, clamp, speedMul } from "../game/field.js";
import { fmtCs } from "../shared/format.js";
import { VERSION } from "../version.js";
import * as api from "./api.js";
import * as audio from "./audio.js";
import { createScene } from "./scene.js";
import { createInput } from "./input.js";
import { renderWeapons, renderAttacks, animateAttacks } from "./catalog.js";
import {
  ui, show, setText, setDigits, tickCountdowns, renderMenu, renderBoard, renderOver, renderOverStats,
  renderHud, renderControls, renderAll, setBoardScope
} from "./screens.js";

const DIE_S = 0.75, FREEZE_S = 0.12, AGAIN_LOCK_MS = 450, CHEER_WAIT_MS = 1200;
const BOARD_POLL_MS = 10000, MENU_POLL_MS = 30000;
const ADMIN_TAPS = 5, ADMIN_TAP_MS = 3000;

document.documentElement.dataset.version = VERSION;
const canvas = document.getElementById("cv");
const scene = createScene(canvas);
let sim = createSim();
const S = {
  mode: "menu", clock: 0, dieT: 0, freeze: 0, splat: null,
  newBest: false, score: 0, submit: null, run: null, prevRank: null, scope: "general",
  toast: { x: FW / 2, y: FH * 0.55, tilt: 0, thrust: 0.35 }
};
let boardOpen = false, boardFrom = "menu", boardTimer = null, wasOpen = null, lastShown = "";
let infoOpen = false, infoFrom = "menu", infoTab = "attacks";

const playing = () => S.mode === "play" || S.mode === "dying";
const input = createInput(canvas, { active: () => S.mode === "play", scale: () => scene.view.scale });

const ON_SIM = {
  near() {
    scene.pop(S.toast.x, S.toast.y - 32, "Frôlé !");
    audio.playSfx("near");
  },
  death() {
    die();
  }
};

function die() {
  S.mode = "dying";
  S.dieT = 0;
  S.freeze = FREEZE_S;
  S.toast.thrust = 0;
  input.reset();
  S.splat = scene.splash(S.toast.x, S.toast.y);
  S.score = Math.floor(sim.state.t * 100);
  const before = api.standing(S.scope);
  S.newBest = S.score > before.best;
  S.prevRank = before.rank;
  api.saveLocalBest(S.score);
  S.submit = S.run ? api.submitScore(S.score, S.run) : null;
  S.run = null;
  audio.musicRunEnd();
  audio.playSfx("death");
  try { if (navigator.vibrate) navigator.vibrate(140); } catch (e) {}
}

function showMenu() {
  S.mode = "menu";
  show("menu");
  renderMenu();
  renderControls(false);
  if (api.net.updatePending) api.applyUpdate();
}

function start() {
  if (boardOpen || infoOpen || !ui.joinForm.hidden) return false;
  if (S.mode !== "menu" && S.mode !== "over") return false;
  if (S.mode === "over" && ui.again.disabled) return false;
  if (api.net.updatePending && api.applyUpdate()) return false;
  sim = createSim();
  Object.assign(S, { mode: "play", dieT: 0, freeze: 0, splat: null, newBest: false, score: 0, submit: null, scope: api.isOpen() ? "event" : "general" });
  Object.assign(S.toast, { x: sim.state.toast.x, y: sim.state.toast.y, tilt: 0, thrust: 0 });
  scene.clear();
  S.run = api.startRun();
  if (S.run) S.run.then((r) => { if (r.status === 426 && S.mode === "play") api.applyUpdate(); });
  input.reset();
  lastShown = "";
  show("play");
  renderControls(true);
  renderHud();
  if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  audio.musicRunStart();
  audio.playSfx("start");
  return true;
}

function cheer() {
  const mine = S.submit, prev = S.prevRank;
  const timeout = new Promise((ok) => setTimeout(() => ok(null), CHEER_WAIT_MS));
  Promise.race([mine || Promise.resolve(null), timeout]).then((r) => {
    if (S.submit !== mine || S.mode !== "over") return;
    const event = S.scope === "event";
    const first = r && !r.error && (event ? r.eventImproved && r.eventRank === 1 : r.improved && r.rank === 1) && prev !== 1;
    audio.playSfx(first ? "first" : "record");
  });
}

function showOver() {
  S.mode = "over";
  show("over");
  renderControls(false);
  renderOver(S.score, S.newBest);
  if (S.newBest) cheer();
  const mine = S.submit;
  if (mine) {
    setText(ui.overNote, "Envoi…");
    mine.then((r) => {
      if (S.submit !== mine || S.mode !== "over") return;
      setText(ui.overNote, r.error || "");
      const now = api.standing(S.scope);
      if (!r.error) renderOverStats(S.newBest ? 0 : now.best, now.rank, now.count);
    });
  } else {
    setText(ui.overNote, api.registered() ? "" : "Entraînement");
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
  boardTimer = setInterval(api.refreshBoard, BOARD_POLL_MS);
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
  if (infoTab === "attacks") renderAttacks(ui.infoBody, { showLab: false });
  else renderWeapons(ui.infoBody, { showLab: false });
  animateAttacks(infoTab === "attacks");
  ui.infoBody.scrollTop = 0;
}

function openInfo() {
  infoOpen = true;
  infoFrom = S.mode === "over" ? "over" : "menu";
  show("info");
  renderInfo();
}

function closeInfo() {
  infoOpen = false;
  animateAttacks(false);
  if (infoFrom === "over") {
    show("over");
    renderControls(false);
    renderAll();
  } else {
    showMenu();
  }
}

function update(dt) {
  S.clock += dt;
  scene.update(dt, S.mode === "play" ? 1 + (speedMul(sim.state.t) - 1) * 1.6 : 0.5);
  const tt = S.toast;
  if (S.mode === "menu") {
    tt.x = FW / 2;
    tt.y = FH * 0.55 + Math.sin(S.clock * 2.2) * 7;
    tt.tilt = Math.sin(S.clock * 1.3) * 0.08;
    tt.thrust = 0.35;
    return;
  }
  if (S.mode !== "play") {
    if (S.freeze > 0) { S.freeze -= dt; return; }
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
  const st = sim.state.toast;
  const vx = (st.x - px) / dt, vy = (st.y - py) / dt;
  tt.x = st.x;
  tt.y = st.y;
  tt.tilt += (clamp(vx / 900, -0.45, 0.45) - tt.tilt) * Math.min(1, dt * 14);
  tt.thrust += (clamp(Math.hypot(vx, vy) / 600, 0, 1) - tt.thrust) * Math.min(1, dt * 10);
  for (const e of events) ON_SIM[e.type]();
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
  scene.render({ clock: S.clock, world: sim.state, toast: S.toast, splat: S.splat });
  if (playing()) {
    const s = fmtCs(Math.floor(sim.state.t * 100));
    if (s !== lastShown) {
      setDigits(ui.time, s);
      lastShown = s;
    }
  }
  if (S.mode === "play") audio.musicRunSync(sim.state.t);
  requestAnimationFrame(frame);
}

const go = (e) => {
  if (start()) {
    input.begin(e);
    e.preventDefault();
  }
};
ui.play.addEventListener("pointerdown", go);
ui.again.addEventListener("pointerdown", go);
ui.play.addEventListener("click", () => start());
ui.again.addEventListener("click", () => start());
ui.menuBoard.addEventListener("click", () => openBoard("menu"));
ui.overBoard.addEventListener("click", () => openBoard("over"));
ui.boardBack.addEventListener("click", closeBoard);
for (const tab of ui.boardTabs.children) tab.addEventListener("click", () => setBoardScope(tab.dataset.scope));
ui.infoBtn.addEventListener("click", openInfo);
ui.infoBack.addEventListener("click", closeInfo);
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
    start();
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
api.on("update", () => {
  if (S.mode === "menu" && !boardOpen && !infoOpen) api.applyUpdate();
});
audio.onAudioChange(() => renderControls(playing()));

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
  if (S.mode === "menu" && !boardOpen) api.refreshBoard();
}, MENU_POLL_MS);

{
  const warm = createSim();
  for (let i = 0; i < 720; i++) warm.step(STEP, 0, 0);
}

showMenu();
api.refreshBoard();
audio.initAudio();
requestAnimationFrame(frame);
