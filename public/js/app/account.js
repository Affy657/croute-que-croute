import { clock } from "../shared/format.js";
import { session, KEYS } from "../shared/store.js";
import { ui, show, setText, markInvalid, renderControls, setLinking } from "./screens.js";
import { net, on, hasPending, registered, joinReady, refreshBoard, serverNow, linkWith, newLinkCode, logoutOthers, openGoogle, unlinkGoogle, reason, badInput } from "./api.js";
import { renderSettings, copy } from "./settings.js";
import { resync } from "./profile.js";
import { inAppNote } from "./inapp.js";
import { googleBlocked, installMode } from "./install.js";
import { moved, moveUrl, reachable } from "./move.js";

const TICK_MS = 1000, RETRY_MS = 20000, QUIET = 4;
/** @type {Record<string, string>} */
const GOOGLE_NOTES = {
  lie: "Compte Google lié.",
  pris: "Ce compte Google est déjà lié à un autre joueur.",
  inconnu: "Aucun joueur n'est lié à ce compte Google. Utilise ton code, ou crée un pseudo.",
  erreur: "La connexion Google a échoué. Réessaie."
};
const MOVE_NOTE = "Le jeu change d'adresse. Copie le lien, ouvre-le dans ton navigateur, puis réinstalle le jeu : ton compte te suit.";
const MOVE_CODE_MS = 9 * 60 * 1000;
const OUT_ASK = "Tes autres appareils sortent du compte. Pour revenir, il leur faudra un nouveau code.";
const OUT_GOOGLE = " Ton compte Google sera aussi délié.";
let leaving = false, arriving = false;
/** @type {Timer} */
let timer = null, until = Infinity, live = false, asked = 0, shown = "", /** @type {string | null} */ merging = null, /** @type {string | null} */ mergeInto = null, flow = 0, /** @type {string | null} */ waiting = null, /** @type {string | null} */ googleResult = null, opener = () => {}, idle = () => true;

/** @param {string} name */
const quoted = (name) => "« " + name + " »";

/** @param {string} name */
const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
/** @param {string} code */
const spaced = (code) => code.slice(0, 4) + " " + code.slice(4);

/** @param {Qr | null} qr */
function drawQr(qr) {
  const canvas = ui.linkQr, ctx = canvas.getContext("2d");
  ctx.fillStyle = color("--ink");
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!qr) return;
  const n = qr.size + QUIET * 2, cell = Math.floor(canvas.width / n), pad = Math.floor((canvas.width - cell * n) / 2);
  ctx.fillStyle = color("--void");
  for (let y = 0; y < qr.size; y++) {
    for (let x = 0; x < qr.size; x++) if (qr.bits[y * qr.size + x] === "1") ctx.fillRect(pad + (x + QUIET) * cell, pad + (y + QUIET) * cell, cell, cell);
  }
}

async function fetchCode() {
  const mine = ++asked;
  until = Infinity;
  try {
    const r = await newLinkCode();
    if (mine !== asked) return;
    setText(ui.linkFail, "");
    drawQr(r.qr);
    shown = r.code;
    ui.linkCode.textContent = spaced(r.code);
    ui.linkCopy.hidden = false;
    until = r.expiresAt;
    live = true;
    tick();
  } catch (e) {
    if (mine !== asked) return;
    setText(ui.linkFail, reason(e));
    drawQr(null);
    ui.linkCode.textContent = "";
    ui.linkCopy.hidden = true;
    until = serverNow() + RETRY_MS;
    live = false;
    tick();
  }
}

function tick() {
  if (ui.link.hidden) return stop();
  const left = until - serverNow();
  if (left <= 0) return fetchCode();
  ui.linkTime.textContent = live && Number.isFinite(left) ? "Valable " + clock(left) : "";
}

function stop() {
  clearInterval(timer);
  timer = null;
  asked++;
}

function openLink() {
  show("link");
  renderControls(false);
  drawQr(null);
  ui.linkCode.textContent = "";
  ui.linkCopy.hidden = true;
  ui.linkTime.textContent = "";
  setText(ui.linkFail, "");
  live = false;
  clearInterval(timer);
  timer = setInterval(tick, TICK_MS);
  fetchCode();
}

function closeLink() {
  stop();
  show("settings");
  renderControls(false);
  resync();
}

/** @param {string} code */
async function connect(code) {
  const button = ui.linkForm.querySelector("button[type=submit]");
  setText(ui.linkError, "");
  markInvalid(ui.linkInput, false);
  button.disabled = true;
  try {
    await linkWith(code);
    ui.linkInput.value = "";
    ui.linkInput.blur();
    setLinking(false);
  } catch (e) {
    setText(ui.linkError, reason(e));
    markInvalid(ui.linkInput, badInput(e));
  } finally {
    button.disabled = false;
  }
}

/** @param {HTMLElement} node @param {string} text */
function say(node, text, error = false) {
  setText(node, text);
  node.classList.toggle("error", error);
}

/** @param {boolean} on */
function showMerge(on) {
  ui.mergeForm.hidden = ui.mergeHelp.hidden = !on;
  ui.mergeBtn.setAttribute("aria-expanded", String(on));
}

function resetMerge(note = "", error = false) {
  flow++;
  merging = null;
  ui.mergeAsk.hidden = true;
  say(ui.mergeNote, note, error);
  markInvalid(ui.mergeInput, false);
}

/** @param {string} code */
async function checkMerge(code) {
  const button = ui.mergeForm.querySelector("button[type=submit]");
  resetMerge();
  const mine = flow;
  showMerge(true);
  ui.mergeInput.value = code;
  button.disabled = true;
  try {
    const r = await linkWith(code);
    if (mine !== flow) return;
    showMerge(false);
    ui.mergeInput.value = "";
    renderSettings();
    resetMerge(`Cet appareil n'était plus connecté à son ancien compte : tu joues maintenant en ${quoted(r.pseudo)}.`);
  } catch (e) {
    if (mine !== flow) return;
    const m = /** @type {Err} */ (e).data && /** @type {Err} */ (e).data.merge;
    if (!m) {
      say(ui.mergeNote, reason(e), true);
      return markInvalid(ui.mergeInput, badInput(e));
    }
    merging = code;
    mergeInto = m.into;
    setText(ui.mergeNote, `Réunir ${quoted(m.from)} avec ${quoted(m.into)} ? Tes records, parties et succès passent sur ${quoted(m.into)}, et le pseudo ${quoted(m.from)} sera libéré.`);
    ui.mergeAsk.hidden = false;
  } finally {
    button.disabled = false;
  }
}

/** @param {string} pseudo */
function merged(pseudo) {
  showMerge(false);
  ui.mergeInput.value = "";
  renderSettings();
  resetMerge(`Comptes réunis : tu joues en ${quoted(pseudo)}.`);
}

async function confirmMerge() {
  if (!merging) return;
  ui.mergeYes.disabled = ui.mergeNo.disabled = true;
  try {
    const r = await linkWith(merging, true);
    merged(r.pseudo);
  } catch (e) {
    if (!/** @type {Err} */ (e).status) await refreshBoard();
    const me = net.board && net.board.me;
    if (!/** @type {Err} */ (e).status && me && me.pseudo === mergeInto) merged(me.pseudo);
    else resetMerge(reason(e), true);
  } finally {
    ui.mergeYes.disabled = ui.mergeNo.disabled = false;
  }
}

function renderGoogle() {
  const usable = !!(net.board && net.board.google) && !googleBlocked() && !moved();
  const me = net.board && net.board.me;
  ui.googleLogin.hidden = !usable;
  ui.googleBox.hidden = !usable || !me;
  if (me) ui.googleLabel.textContent = me.google ? "Délier mon compte Google" : "Lier mon compte Google";
}

/** @param {HTMLButtonElement} button @param {boolean} link */
async function goGoogle(button, link) {
  button.disabled = true;
  say(ui.googleNote, "");
  setText(ui.linkError, "");
  try {
    await openGoogle(link);
  } catch (e) {
    say(link ? ui.googleNote : ui.linkError, reason(e), true);
    button.disabled = false;
  }
}

async function toggleGoogle() {
  const me = net.board && net.board.me;
  if (!me || !me.google) return goGoogle(ui.googleBtn, true);
  ui.googleBtn.disabled = true;
  say(ui.googleNote, "");
  try {
    await unlinkGoogle();
    await refreshBoard();
    say(ui.googleNote, "Compte Google délié.");
  } catch (e) {
    say(ui.googleNote, reason(e), true);
  } finally {
    ui.googleBtn.disabled = false;
  }
}

function showGoogleResult() {
  if (!googleResult || !idle() || !net.board) return;
  if (!net.board.google) {
    googleResult = null;
    return;
  }
  const note = GOOGLE_NOTES[googleResult];
  if (registered()) {
    googleResult = null;
    if (!note) return;
    opener();
    say(ui.googleNote, note, !note.startsWith("Compte"));
  } else if (net.board && joinReady()) {
    googleResult = null;
    if (!note) return;
    setLinking(true);
    setText(ui.linkError, note);
  }
}

function googleFromUrl() {
  const m = location.hash.match(/^#google=([a-z]+)$/);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  googleResult = m[1];
  showGoogleResult();
}

/** @param {boolean} on */
function askOut(on, note = "") {
  ui.outRow.hidden = on;
  ui.outAsk.hidden = !on;
  const me = net.board && net.board.me;
  say(ui.outNote, on ? OUT_ASK + (me && me.google ? OUT_GOOGLE : "") : note);
}

async function confirmOut() {
  ui.outYes.disabled = ui.outNo.disabled = true;
  try {
    const { removed } = await logoutOthers();
    const s = removed > 1 ? "s" : "";
    askOut(false, removed ? `C'est fait : ${removed} appareil${s} déconnecté${s}.` : "Aucun autre appareil n'était connecté.");
    await refreshBoard();
  } catch (e) {
    say(ui.outNote, reason(e), true);
  } finally {
    ui.outYes.disabled = ui.outNo.disabled = false;
  }
}

export function resetAccount() {
  say(ui.googleNote, "");
  renderGoogle();
  resetMerge();
  showMerge(false);
  ui.mergeInput.value = "";
  askOut(false);
}

/** @param {string} code */
function offerLink(code) {
  ui.linkInput.value = code;
  setText(ui.linkError, "");
  markInvalid(ui.linkInput, false);
  setLinking(true);
}

function pickUp() {
  if (!waiting || !idle()) return;
  const code = waiting;
  if (registered()) {
    waiting = null;
    opener();
    checkMerge(code);
  } else if (net.board && joinReady()) {
    waiting = null;
    offerLink(code);
  }
}

async function arrive() {
  const code = session.get(KEYS.arrival);
  if (arriving || !code || !net.board || (!registered() && !joinReady())) return;
  arriving = true;
  try {
    await linkWith(code);
    session.set(KEYS.arrival, null);
  } catch (e) {
    const err = /** @type {Err} */ (e);
    if (!badInput(err)) return;
    session.set(KEYS.arrival, null);
    if (registered() && !(err.data && err.data.merge)) return;
    waiting = code;
    pickUp();
  } finally {
    arriving = false;
  }
}

async function leave() {
  if (leaving || !moved() || installMode() === "installed" || !net.board || !idle() || hasPending()) return;
  if (!net.token && !joinReady()) return;
  leaving = true;
  const open = await reachable();
  const code = open && net.token ? await newLinkCode().then((r) => r.code, () => null) : null;
  if (!open || (net.token && !code) || !idle() || hasPending()) {
    leaving = false;
    return;
  }
  location.replace(moveUrl(code));
}

function linkFromUrl() {
  const m = location.hash.match(/^#lier=([A-Za-z0-9-]{1,12})$/);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  waiting = m[1];
  pickUp();
}

/** @param {Fn} openSettings @param {() => boolean} isIdle */
export function initAccount(openSettings, isIdle) {
  opener = openSettings;
  idle = isIdle;
  linkFromUrl();
  googleFromUrl();
}

ui.linkBtn.addEventListener("click", openLink);
ui.linkCopy.addEventListener("click", () => copy(ui.linkCopy, shown, "Code copié"));
ui.mergeBtn.addEventListener("click", () => {
  resetMerge();
  askOut(false);
  showMerge(ui.mergeForm.hidden);
  if (!ui.mergeForm.hidden) ui.mergeInput.focus();
});
ui.mergeForm.addEventListener("submit", /** @param {Event} e */ (e) => {
  e.preventDefault();
  checkMerge(ui.mergeInput.value);
});
ui.mergeYes.addEventListener("click", confirmMerge);
ui.mergeNo.addEventListener("click", () => resetMerge());
ui.outBtn.addEventListener("click", () => {
  resetMerge();
  showMerge(false);
  askOut(true);
});
ui.outNo.addEventListener("click", () => askOut(false));
ui.outYes.addEventListener("click", confirmOut);
on("board", pickUp);
on("board", arrive);
on("board", leave);
on("board", renderGoogle);
on("board", showGoogleResult);
ui.googleLogin.addEventListener("click", () => goGoogle(ui.googleLogin, false));
ui.googleBtn.addEventListener("click", toggleGoogle);
ui.linkBack.addEventListener("click", closeLink);
ui.haveAccount.addEventListener("click", () => {
  setText(ui.linkError, "");
  markInvalid(ui.linkInput, false);
  setLinking(true);
  ui.linkInput.focus();
});
ui.newAccount.addEventListener("click", () => setLinking(false));
const stuck = inAppNote();
if (stuck) {
  ui.inAppText.textContent = stuck;
  ui.inApp.hidden = false;
  ui.inAppCopy.addEventListener("click", () => copy(ui.inAppCopy, location.origin + "/", "Lien copié"));
}
ui.linkForm.addEventListener("submit", /** @param {Event} e */ (e) => {
  e.preventDefault();
  connect(ui.linkInput.value);
});
if (moved() && installMode() === "installed") {
  let link = moveUrl(null), asked = false;
  const prepare = () => {
    if (net.token) newLinkCode().then((r) => { link = moveUrl(r.code); }, () => { asked = false; });
    else asked = false;
  };
  on("board", () => {
    if (asked) return;
    asked = true;
    prepare();
  });
  setInterval(prepare, MOVE_CODE_MS);
  ui.inAppText.textContent = MOVE_NOTE;
  ui.inApp.hidden = false;
  ui.inAppCopy.addEventListener("click", () => copy(ui.inAppCopy, link, "Lien copié"));
}

window.addEventListener("hashchange", linkFromUrl);
