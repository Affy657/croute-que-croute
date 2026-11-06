import { SPREADS, GEAR } from "../shared/palette.js";
import * as api from "./api.js";
import * as audio from "./audio.js";
import { burst, rain, bounce } from "./party.js";
import * as ach from "./achievements.js";
import { ui, show, setText, renderOver, renderOverStats, renderRival, renderKiller, renderControls, achLabel } from "./screens.js";
import { S } from "./state.js";

const ACH_TOAST_MS = 2600, AGAIN_LOCK_MS = 450, CHEER_WAIT_MS = 1200, LAP_CS = 1000;

api.on("result", () => {
  if (S.mode === "over" && ui.overNote.textContent === api.WAITING) setText(ui.overNote, "");
});

function cheer() {
  const mine = S.submit, prev = S.prevRank;
  /** @type {Promise<null>} */
  const timeout = new Promise((ok) => setTimeout(() => ok(null), CHEER_WAIT_MS));
  Promise.race([mine || Promise.resolve(null), timeout]).then((r) => {
    if (S.submit !== mine || S.mode !== "over" || !S.newBest) return;
    const first = r && !r.error && prev !== 1 && (S.scope === "event" ? r.eventImproved && r.eventRank === 1 : S.scope === "pc" ? r.pcImproved && r.pcRank === 1 : r.improved && r.rank === 1);
    audio.playSfx(first ? "first" : "record");
    if (!first) return;
    ui.newBest.textContent = "N°1 !";
    ui.newBest.classList.add("gold");
    bounce(ui.newBest);
    burst(ui.final, { count: 70, power: 1.2, gold: true });
    rain();
  });
}

/** @param {string} text @param {number} count @param {boolean} gold */
function cheerHud(text, count, gold) {
  ui.hudBest.textContent = text;
  ui.hudBest.classList.add("hot");
  ui.time.classList.add("hot");
  bounce(ui.time);
  burst(ui.time, { count, power: 0.55, gold });
}

/** @param {number} cs */
export function cheerRun(cs) {
  const g = S.goal;
  if (g.reached < 2 && g.lead && cs > g.lead) {
    g.reached = 2;
    cheerHud("N°1 !", 30, true);
  } else if (g.reached < 1 && g.best && cs > g.best) {
    g.reached = 1;
    cheerHud("Nouveau record", 18, false);
  }
}

/** @param {number} cs */
export function lap(cs) {
  const n = Math.floor(cs / LAP_CS);
  if (n <= S.lap) return;
  S.lap = n;
  ui.time.classList.remove("lap");
  void ui.time.offsetWidth;
  ui.time.classList.add("lap");
}

function celebrate() {
  bounce(ui.final.parentElement);
  burst(ui.final, { count: 44 });
  cheer();
}

export function showOver() {
  S.mode = "over";
  show("over");
  renderControls(false);
  renderOver(S.score, S.newBest);
  renderKiller(S.killer);
  renderOverAch();
  if (S.train) renderOverStats(0, null, 0);
  if (S.newBest) celebrate();
  const mine = S.submit;
  if (mine) {
    setText(ui.overNote, "Envoi…");
    mine.then((r) => {
      if (S.submit !== mine || S.mode !== "over") return;
      if (!r.error && S.scope === "event" && r.eventBest === null) {
        S.scope = "general";
        S.late = true;
      }
      setText(ui.overNote, r.error || (S.late ? "Soirée finie : partie comptée au général" : ""));
      const now = api.standing(S.scope);
      if (r.error) return;
      const won = !!(S.scope === "event" ? r.eventImproved : S.scope === "pc" ? r.pcImproved : r.improved);
      if (won !== S.newBest) {
        S.newBest = won;
        ui.newBest.hidden = !won;
        if (won) celebrate();
      }
      renderOverStats(S.newBest ? 0 : now.best, now.rank, now.count);
      renderRival(S.score, now.rival);
    });
  } else {
    setText(ui.overNote, S.train ? "Entraînement : " + S.train.name : api.registered() ? "" : "Entraînement");
  }
  ui.again.disabled = true;
  setTimeout(() => { ui.again.disabled = false; }, AGAIN_LOCK_MS);
}

export function renderOverAch() {
  const got = S.train ? [] : [...ach.runUnlocked().map((a) => a.name), ...S.gotToppings.map((k) => "Garniture " + SPREADS[k].name), ...ach.runUnlocked().filter((a) => a.gear).map(gearLabel)];
  ui.overAch.hidden = !got.length;
  ui.overAch.textContent = "★ " + got.join(", ");
  ui.overTry.hidden = !!S.train || (!S.gotToppings.length && !ach.runUnlocked().some((a) => a.gear));
  ui.overAchBtn.textContent = achLabel();
}

/** @param {Feat} a */
export const gearLabel = (a) => (GEAR[/** @type {string} */ (a.gear)].slot === "bread" ? "" : "Accessoire ") + GEAR[/** @type {string} */ (a.gear)].name;

/** @param {{ name: string }} a */
export function toastAch(a) {
  const t = S.mode === "menu" ? ui.menuToast : ui.achToast;
  if (t.hidden || !t.timer) {
    t.textContent = "★ " + a.name;
    t.hidden = false;
    bounce(t);
  } else if (!t.textContent.includes(a.name)) t.textContent += ", " + a.name;
  clearTimeout(t.timer);
  t.timer = setTimeout(() => {
    t.hidden = true;
    t.timer = null;
  }, ACH_TOAST_MS);
}
