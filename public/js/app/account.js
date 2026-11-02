import { clock } from "../shared/format.js";
import { ui, show, setText, renderControls, setLinking } from "./screens.js";
import { net, on, registered, serverNow, linkWith, newLinkCode, logoutOthers, reason } from "./api.js";
import { renderSettings, copy } from "./settings.js";
import { resync } from "./profile.js";

const TICK_MS = 1000, RETRY_MS = 20000, QUIET = 4;
const OUT_ASK = "Tes autres appareils sortent du compte. Pour revenir, il leur faudra un nouveau code.";
let timer = null, until = Infinity, live = false, asked = 0, shown = "", merging = null, waiting = null, opener = () => {};

const quoted = (name) => "« " + name + " »";

const color = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const spaced = (code) => code.slice(0, 4) + " " + code.slice(4);

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

async function connect(code) {
  const button = ui.linkForm.querySelector("button[type=submit]");
  setText(ui.linkError, "");
  button.disabled = true;
  try {
    await linkWith(code);
    ui.linkInput.value = "";
    ui.linkInput.blur();
    setLinking(false);
  } catch (e) {
    setText(ui.linkError, reason(e));
  } finally {
    button.disabled = false;
  }
}

function resetMerge(note = "") {
  merging = null;
  ui.mergeAsk.hidden = true;
  setText(ui.mergeNote, note);
}

async function checkMerge(code) {
  resetMerge();
  ui.mergeForm.hidden = false;
  ui.mergeInput.value = code;
  try {
    const r = await linkWith(code);
    ui.mergeForm.hidden = true;
    ui.mergeInput.value = "";
    renderSettings();
    resetMerge(`Cet appareil n'était plus connecté à son ancien compte : tu joues maintenant en ${quoted(r.pseudo)}.`);
  } catch (e) {
    const m = e.data && e.data.merge;
    if (!m) return setText(ui.mergeNote, reason(e));
    merging = code;
    setText(ui.mergeNote, `Réunir ${quoted(m.from)} avec ${quoted(m.into)} ? Tes records, parties et succès passent sur ${quoted(m.into)}, et le pseudo ${quoted(m.from)} sera libéré.`);
    ui.mergeAsk.hidden = false;
  }
}

async function confirmMerge() {
  if (!merging) return;
  ui.mergeYes.disabled = ui.mergeNo.disabled = true;
  try {
    const r = await linkWith(merging, true);
    ui.mergeForm.hidden = true;
    ui.mergeInput.value = "";
    renderSettings();
    resetMerge(`Comptes réunis : tu joues en ${quoted(r.pseudo)}.`);
  } catch (e) {
    resetMerge(reason(e));
  } finally {
    ui.mergeYes.disabled = ui.mergeNo.disabled = false;
  }
}

function askOut(on, note = "") {
  ui.outRow.hidden = on;
  ui.outAsk.hidden = !on;
  setText(ui.outNote, on ? OUT_ASK : note);
}

async function confirmOut() {
  ui.outYes.disabled = ui.outNo.disabled = true;
  try {
    const { removed } = await logoutOthers();
    const s = removed > 1 ? "s" : "";
    askOut(false, removed ? `C'est fait : ${removed} appareil${s} déconnecté${s}.` : "Aucun autre appareil n'était connecté.");
  } catch (e) {
    askOut(false, reason(e));
  } finally {
    ui.outYes.disabled = ui.outNo.disabled = false;
  }
}

export function resetAccount() {
  resetMerge();
  ui.mergeForm.hidden = true;
  ui.mergeInput.value = "";
  askOut(false);
}

function pickUp() {
  if (!waiting || !registered()) return;
  const code = waiting;
  waiting = null;
  opener();
  checkMerge(code);
}

function linkFromUrl() {
  const m = location.hash.match(/^#lier=([A-Za-z0-9-]{1,12})$/);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  if (net.token) {
    waiting = m[1];
    return pickUp();
  }
  ui.linkInput.value = m[1];
  setText(ui.linkError, "");
  setLinking(true);
}

export function initAccount(openSettings) {
  opener = openSettings;
  linkFromUrl();
}

ui.linkBtn.addEventListener("click", openLink);
ui.linkCopy.addEventListener("click", () => copy(ui.linkCopy, shown, "Code copié"));
ui.mergeBtn.addEventListener("click", () => {
  resetMerge();
  ui.mergeForm.hidden = !ui.mergeForm.hidden;
  if (!ui.mergeForm.hidden) ui.mergeInput.focus();
});
ui.mergeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  checkMerge(ui.mergeInput.value);
});
ui.mergeYes.addEventListener("click", confirmMerge);
ui.mergeNo.addEventListener("click", () => resetMerge());
ui.outBtn.addEventListener("click", () => askOut(true));
ui.outNo.addEventListener("click", () => askOut(false));
ui.outYes.addEventListener("click", confirmOut);
on("board", pickUp);
ui.linkBack.addEventListener("click", closeLink);
ui.haveAccount.addEventListener("click", () => {
  setText(ui.linkError, "");
  setLinking(true);
  ui.linkInput.focus();
});
ui.newAccount.addEventListener("click", () => setLinking(false));
ui.linkForm.addEventListener("submit", (e) => {
  e.preventDefault();
  connect(ui.linkInput.value);
});
window.addEventListener("hashchange", linkFromUrl);
