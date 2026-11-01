import { store, session, KEYS } from "../shared/store.js";
import { LOCAL } from "../shared/local.js";
import { VERSION } from "../version.js";
import { installMode, promptInstall, shouldSuggest, markSuggested, onInstallChange } from "./install.js";
import { prefs, setLevel, previewMusic, previewSfx } from "./audio.js";
import { ui, setText } from "./screens.js";
import { net, rename } from "./api.js";
import { controls, setSens, setAim, hasMouse } from "./input.js";

const FLASH_MS = 2000;
const HINTS = {
  prompt: "Lance-le depuis ton écran d'accueil, en plein écran.",
  ios: "Touche Partager, puis « Sur l'écran d'accueil ».",
  menu: "Ouvre le menu du navigateur, puis « Installer l'appli » ou « Ajouter à l'écran d'accueil »."
};
const NUMBER = VERSION.split("+")[0];
const VERSION_LABEL = `Version ${NUMBER}${NUMBER.startsWith("0.") ? " bêta" : ""}`;
let tab = "app";

export const testing = { invincible: LOCAL && session.get(KEYS.invincible) === "1" };

export function setInvincible(on) {
  testing.invincible = LOCAL && on;
  session.set(KEYS.invincible, testing.invincible ? "1" : null);
}

export function renderSettings() {
  const admin = !!store.get(KEYS.adminToken);
  if (!admin) tab = "app";
  ui.settingsBar.hidden = !admin;
  for (const b of ui.settingsTabs.children) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  ui.settingsApp.hidden = tab !== "app";
  ui.versionNote.textContent = VERSION_LABEL;
  ui.settingsAdmin.hidden = tab !== "admin";
  ui.settings.classList.toggle("admin-mode", tab === "admin");
  if (tab === "admin") mountAdmin();
  else leaveSettings();
  const me = net.board && net.board.me;
  ui.renameCard.hidden = !me;
  ui.linkCard.hidden = !me;
  if (me && document.activeElement !== ui.newPseudo) ui.newPseudo.value = me.pseudo;
  setText(ui.renameNote, "");
  const mode = installMode();
  ui.installCard.hidden = mode === "installed";
  ui.installHint.textContent = HINTS[mode] || "";
  ui.installBtn.hidden = mode !== "prompt";
  ui.musicVol.value = Math.round(prefs.musicLevel * 100);
  ui.sfxVol.value = Math.round(prefs.sfxLevel * 100);
  renderControlsCard();
  renderTestCard();
}

function renderTestCard() {
  ui.testCard.hidden = !LOCAL;
  for (const b of ui.godTabs.children) b.setAttribute("aria-selected", String((b.dataset.god === "1") === testing.invincible));
}

const MOUSE_HINTS = ["La tartine bouge comme avec le doigt.", "La tartine va là où tu pointes."];

function renderControlsCard() {
  ui.sensVol.value = Math.round(controls.sens * 10);
  const mouse = hasMouse();
  ui.mouseRow.hidden = !mouse;
  ui.mouseHint.hidden = !mouse;
  ui.mouseHint.textContent = MOUSE_HINTS[controls.aim ? 1 : 0];
  for (const b of ui.mouseTabs.children) b.setAttribute("aria-selected", String((b.dataset.aim === "1") === controls.aim));
}

function mountAdmin() {
  if (ui.settingsAdmin.firstChild) return;
  const frame = document.createElement("iframe");
  frame.src = "/admin";
  frame.title = "Tableau de bord admin";
  ui.settingsAdmin.replaceChildren(frame);
}

export function leaveSettings() {
  ui.settingsAdmin.replaceChildren();
}

function renameNote(text, error) {
  setText(ui.renameNote, text);
  ui.renameNote.classList.toggle("error", error);
}

async function renamePlayer(e) {
  e.preventDefault();
  const me = net.board && net.board.me, pseudo = ui.newPseudo.value.trim();
  if (!me || !pseudo || pseudo === me.pseudo) return;
  const button = ui.renameForm.querySelector("button");
  button.disabled = true;
  renameNote("", false);
  try {
    await rename(pseudo);
    ui.newPseudo.value = net.board.me ? net.board.me.pseudo : pseudo;
    ui.newPseudo.blur();
    renameNote("C'est changé.", false);
  } catch (err) {
    renameNote(err.status ? err.message : "Pas de réseau, réessaie.", true);
  } finally {
    button.disabled = false;
  }
}

function flash(button, text) {
  clearTimeout(button.flash);
  button.label = button.label || button.textContent;
  button.textContent = text;
  button.flash = setTimeout(() => { button.textContent = button.label; }, FLASH_MS);
}

function copyByHand(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.readOnly = true;
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.append(area);
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {}
  area.remove();
  return ok;
}

export async function copy(button, text, done = "Copié !") {
  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    ok = copyByHand(text);
  }
  flash(button, ok ? done : "Copie impossible");
}

async function shareGame() {
  const url = location.origin + "/";
  if (!navigator.share) return copy(ui.shareBtn, url, "Lien copié");
  try {
    await navigator.share({ title: "Croûte que Croûte", text: "Viens jouer à Croûte que Croûte !", url });
  } catch (e) {}
}

export function suggestInstall() {
  if (!shouldSuggest()) return;
  markSuggested();
  const ios = installMode() === "ios";
  ui.installPopText.textContent = ios ? HINTS.ios : "Il sera sur ton écran d'accueil, en plein écran.";
  ui.installYes.hidden = ios;
  ui.installLater.textContent = ios ? "OK" : "Plus tard";
  ui.installPop.hidden = false;
}

const closePop = () => { ui.installPop.hidden = true; };

for (const b of ui.settingsTabs.children) {
  b.addEventListener("click", () => {
    tab = b.dataset.tab;
    renderSettings();
  });
}
ui.musicVol.addEventListener("input", () => setLevel("music", ui.musicVol.value / 100));
ui.musicVol.addEventListener("change", previewMusic);
ui.sfxVol.addEventListener("input", () => setLevel("sfx", ui.sfxVol.value / 100));
ui.sfxVol.addEventListener("change", () => previewSfx("record"));
ui.sensVol.addEventListener("input", () => setSens(ui.sensVol.value / 10));
for (const b of ui.mouseTabs.children) {
  b.addEventListener("click", () => {
    setAim(b.dataset.aim === "1");
    renderControlsCard();
  });
}
for (const b of ui.godTabs.children) {
  b.addEventListener("click", () => {
    setInvincible(b.dataset.god === "1");
    renderTestCard();
  });
}
ui.installBtn.addEventListener("click", promptInstall);
ui.shareBtn.addEventListener("click", shareGame);
ui.renameForm.addEventListener("submit", renamePlayer);
ui.installYes.addEventListener("click", () => {
  closePop();
  promptInstall();
});
ui.installLater.addEventListener("click", closePop);
ui.qrHost.textContent = location.host;
ui.qrCopy.addEventListener("click", () => copy(ui.qrCopy, location.origin + "/", "Lien copié"));
onInstallChange(() => {
  if (!ui.settings.hidden) renderSettings();
});
window.addEventListener("storage", (e) => {
  if (e.key === KEYS.adminToken && !ui.settings.hidden) renderSettings();
});
