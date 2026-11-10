import { createSim } from "../game/sim.js";
import { FW, FH, STEP, clamp, speedMul, SPEED_START, SPEED_HOT } from "../game/field.js";
import { fmtCs } from "../shared/format.js";
import { SPREADS } from "../shared/palette.js";
import * as api from "./api.js";
import * as audio from "./audio.js";
import * as ach from "./achievements.js";
import { unlockTopping, chooseTopping } from "./toppings.js";
import { testing } from "./settings.js";
import { drawCard, myLook } from "./profile.js";
import { ui, show, screen, openPage, setText, setDigits, renderControls, renderHud } from "./screens.js";
import { S, scene, game, input, playing, elapsed } from "./state.js";
import { showOver, toastAch, cheerRun, lap } from "./over.js";

const MENU_PLACE_S = 0.5, MENU_LIFT = 6, PICK_REACH = 46, PICK_DROP = 54;
const DIE_S = 0.75, FREEZE_S = 0.3;
const CHAIN_S = 1.5, CHAIN_STEPS = 6, DIGITS_MS = 30;
const SCARS_MAX = 12, SCAR_JITTER = 0.3;
const HUD_WIDEST = "000,00", HUD_PAD = 6;

let lastShown = "", shownAt = 0, startedAt = 0;

/** @param {Pt} e */
function scar(e) {
  const tt = S.toast;
  if (tt.scars.length >= SCARS_MAX) return;
  const a = Math.atan2(e.y - tt.y, e.x - tt.x) - tt.tilt + (Math.random() - 0.5) * SCAR_JITTER;
  tt.scars.push({ a, len: 7 + Math.random() * 3 });
}

/** @param {string | null} kind */
function gainTopping(kind) {
  if (S.train || !kind || !unlockTopping(kind)) return;
  S.gotToppings.push(kind);
  chooseTopping(kind);
  if (S.mode === "play") toastAch({ name: "Garniture " + SPREADS[kind].name });
  ach.countToppings();
}

const ON_SIM = {
  /** @param {Graze} e */
  near(e) {
    scar(e);
    gainTopping(e.spread);
    const t = game.sim.state.t;
    S.chain = t - S.nearAt < CHAIN_S ? S.chain + 1 : 1;
    S.nearAt = t;
    S.combo = Math.max(S.combo, S.chain);
    ach.runCombo(S.chain);
    const step = Math.min(S.chain - 1, CHAIN_STEPS);
    scene.pop(S.toast.x, S.toast.y - 32, S.chain > 1 ? "Frôlé x" + S.chain : "Frôlé !", { key: "near", size: 14 + step * 1.5 });
    audio.playSfx("near", 2 ** ((step * 2) / 12));
  },
  /** @param {Killer} e */
  death(e) {
    die(e);
    gainTopping(e.spread);
  }
};

/** @param {Killer} killer */
function die(killer) {
  S.mode = "dying";
  S.killer = killer;
  S.dieT = 0;
  S.freeze = FREEZE_S;
  S.toast.thrust = 0;
  const device = input.device();
  api.setDevice(device);
  if (device === "pc") S.scope = "pc";
  else if (S.scope === "pc" || S.guess) S.scope = api.isOpen() ? "event" : "general";
  S.late = S.scope === "event" && api.pastEvent(startedAt);
  if (S.late) S.scope = "general";
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
  ach.runEnd(S.score, S.killer, device);
  const before = api.standing(S.scope);
  S.newBest = S.score > before.best;
  S.prevRank = before.rank;
  api.saveLocalBest(S.score, S.scope);
  const sub = S.run ? api.submitScore(S.score, device, S.combo, S.run, () => {
    if (S.submit === sub && S.mode === "over") setText(ui.overNote, "Envoi en attente…");
  }) : null;
  S.submit = sub;
  S.run = null;
}

/** @param {Attack | null} [train] */
export function start(train = null) {
  const page = openPage();
  if ((page && !(train && page === "info")) || (!train && (!ui.joinForm.hidden || !ui.linkForm.hidden)) || !ui.installPop.hidden) return false;
  if (S.mode !== "menu" && S.mode !== "over") return false;
  if (S.mode === "over" && ui.again.disabled) return false;
  if (api.reloading() || (api.net.updatePending && api.applyUpdate())) return false;
  const t0 = train ? train.from : 0, y = S.mode === "menu" ? S.toast.y : S.menuY;
  const immortal = () => testing.invincible;
  game.sim = createSim(Math.random, train ? { only: train.id, t0, y, immortal } : { y, immortal });
  Object.assign(S, { mode: "play", dieT: 0, freeze: 0, splat: null, chain: 0, combo: 0, nearAt: -Infinity, lap: 0, train, t0, newBest: false, score: 0, submit: null, gotToppings: [], scope: api.myScope(), guess: !api.net.board, late: false, held: false });
  Object.assign(S.toast, { x: game.sim.state.toast.x, y: game.sim.state.toast.y, tilt: 0, thrust: 0, scars: [] });
  scene.clear();
  ui.menuToast.hidden = true;
  S.run = train ? null : api.startRun({ look: myLook() });
  startedAt = api.serverNow();
  const open = api.openEvent();
  if (!train) ach.runStart(open ? String(open.opensAt) : null);
  const lead = api.leader(S.scope);
  S.goal = train ? { best: 0, lead: 0, reached: 0 } : { best: api.standing(S.scope).best, lead: S.run && lead && !lead.me ? lead.best : 0, reached: 0 };
  input.reset();
  input.fresh();
  lastShown = "";
  show("play");
  renderControls(true);
  renderHud();
  ui.godPill.hidden = !testing.invincible;
  if (train) ui.hudBest.textContent = "Entraînement : " + train.name;
  avoidHud();
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  audio.musicRunStart();
  audio.playSfx("start");
  return true;
}

const probe = /** @type {Ctx} */ (document.createElement("canvas").getContext("2d"));

/** @param {Element} el @param {string} text */
function textWidth(el, text) {
  const cs = getComputedStyle(el);
  probe.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  return probe.measureText(text).width + (parseFloat(cs.letterSpacing) || 0) * text.length;
}

export function avoidHud() {
  const t = ui.time.getBoundingClientRect(), b = ui.hudBest.getBoundingClientRect(), g = ui.godPill.hidden ? null : ui.godPill.getBoundingClientRect();
  const half = Math.max(textWidth(ui.time, HUD_WIDEST), textWidth(ui.hudBest, ui.hudBest.textContent), g ? g.width : 0) / 2 + HUD_PAD;
  const mid = (t.left + t.right) / 2;
  scene.avoid({ left: mid - half, right: mid + half, bottom: Math.max(t.bottom, b.bottom, g ? g.bottom : 0) + HUD_PAD });
}

function menuToastY() {
  const [head, body] = ui.menu.children;
  const mid = (head.getBoundingClientRect().bottom + body.getBoundingClientRect().top) / 2;
  const { scale, oy } = scene.view;
  return clamp((mid - oy) / scale - MENU_LIFT, FH * 0.25, FH * 0.55);
}

function placePicker() {
  const { scale, oy } = scene.view;
  ui.picker.style.top = oy + scale * S.menuY + "px";
  ui.picker.style.setProperty("--reach", scale * PICK_REACH + "px");
  ui.picker.style.setProperty("--drop", scale * PICK_DROP + "px");
}

/** @param {number} dt */
function update(dt) {
  S.clock += dt;
  const pace = Math.min(speedMul(game.sim.state.t), SPEED_HOT);
  const hot = S.mode === "menu" ? 0 : clamp((pace - SPEED_START) / (SPEED_HOT - SPEED_START), 0, 1);
  scene.update(dt, S.mode === "play" ? 1 + (pace - 1) * 1.6 : 0.5, playing(), hot);
  const tt = S.toast;
  if (S.mode === "menu") {
    tt.x = FW / 2;
    if (S.clock >= S.menuAt && !ui.menu.hidden) {
      S.menuAt = S.clock + MENU_PLACE_S;
      S.menuY = menuToastY();
      placePicker();
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
    game.sim.drift(dt);
    if (S.mode === "dying") {
      S.dieT += dt;
      if (S.dieT > DIE_S) showOver();
    }
    return;
  }
  if (S.held) {
    if (!input.poked() && !input.pending()) return;
    S.held = false;
    input.take();
    ui.holdHint.hidden = true;
    audio.pauseForBackground(false);
  }
  const px = game.sim.state.toast.x, py = game.sim.state.toast.y;
  const move = input.take();
  const events = game.sim.step(dt, move.x, move.y);
  if (!S.train) ach.runTick(game.sim.state, move.x !== 0 || move.y !== 0, dt);
  const st = game.sim.state.toast;
  const vx = (st.x - px) / dt, vy = (st.y - py) / dt;
  tt.x = st.x;
  tt.y = st.y;
  tt.tilt += (clamp(vx / 900, -0.45, 0.45) - tt.tilt) * Math.min(1, dt * 14);
  tt.thrust += (clamp(Math.hypot(vx, vy) / 600, 0, 1) - tt.thrust) * Math.min(1, dt * 10);
  for (const e of events) ON_SIM[e.type](/** @type {never} */ (e));
}

let last = performance.now(), acc = 0;
/** @param {number} now */
export function frame(now) {
  requestAnimationFrame(frame);
  scene.pace(now - last);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  acc += dt;
  while (acc >= STEP) {
    update(STEP);
    acc -= STEP;
  }
  const page = openPage();
  if (screen() === "profile") drawCard(S.clock);
  else if (!page || page === "board") scene.render({ clock: S.clock, world: game.sim.state, toast: S.mode === "over" ? null : S.toast, splat: S.splat, finger: S.mode === "play" ? input.finger : null, dying: S.mode === "dying" });
  if (playing() && (S.mode !== "play" || now - shownAt >= DIGITS_MS)) {
    const cs = Math.floor(elapsed() * 100), s = fmtCs(cs);
    if (s !== lastShown) {
      setDigits(ui.time, s);
      lastShown = s;
      shownAt = now;
      if (S.mode === "play") {
        cheerRun(cs);
        lap(cs);
      }
    }
  }
  if (S.mode === "play") audio.musicRunSync(elapsed());
}
