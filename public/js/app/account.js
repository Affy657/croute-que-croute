import { clock } from "../shared/format.js";
import { ui, show, setText, renderControls, setLinking } from "./screens.js";
import { net, serverNow, linkWith, newLinkCode } from "./api.js";

const TICK_MS = 1000, QUIET = 4, OFFLINE = "Pas de réseau, réessaie.";
let timer = null, until = Infinity, asked = 0;

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
  setText(ui.linkFail, "");
  try {
    const r = await newLinkCode();
    if (mine !== asked) return;
    drawQr(r.qr);
    ui.linkCode.textContent = spaced(r.code);
    until = r.expiresAt;
    tick();
  } catch (e) {
    if (mine === asked) setText(ui.linkFail, e.status ? e.message : OFFLINE);
  }
}

function tick() {
  if (ui.link.hidden) return stop();
  const left = until - serverNow();
  if (left <= 0) return fetchCode();
  ui.linkTime.textContent = Number.isFinite(left) ? "Valable " + clock(left) : "";
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
  ui.linkTime.textContent = "";
  clearInterval(timer);
  timer = setInterval(tick, TICK_MS);
  fetchCode();
}

function closeLink() {
  stop();
  show("settings");
  renderControls(false);
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
    setText(ui.linkError, e.status ? e.message : OFFLINE);
  } finally {
    button.disabled = false;
  }
}

export function linkFromUrl() {
  const m = location.hash.match(/^#lier=([A-Za-z0-9-]{1,12})$/);
  if (!m) return;
  history.replaceState(null, "", location.pathname + location.search);
  if (net.token) return;
  ui.linkInput.value = m[1];
  setLinking(true);
  connect(m[1]);
}

ui.linkBtn.addEventListener("click", openLink);
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
