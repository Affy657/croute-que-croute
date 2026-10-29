import { store, KEYS } from "../shared/store.js";
import { installMode, promptInstall, shouldSuggest, markSuggested, onInstallChange } from "./install.js";
import { prefs, setLevel, previewMusic, previewSfx } from "./audio.js";
import { ui, setText } from "./screens.js";
import { net, rename } from "./api.js";

const FLASH_MS = 2000;
const HINTS = {
  prompt: "Lance-le depuis ton écran d'accueil, en plein écran.",
  ios: "Touche Partager, puis « Sur l'écran d'accueil ».",
  menu: "Ouvre le menu du navigateur, puis « Installer l'appli » ou « Ajouter à l'écran d'accueil »."
};
let tab = "app";

export function renderSettings() {
  const admin = !!store.get(KEYS.adminToken);
  if (!admin) tab = "app";
  ui.settingsBar.hidden = !admin;
  for (const b of ui.settingsTabs.children) b.setAttribute("aria-selected", String(b.dataset.tab === tab));
  ui.settingsApp.hidden = tab !== "app";
  ui.settingsAdmin.hidden = tab !== "admin";
  ui.settings.classList.toggle("admin-mode", tab === "admin");
  if (tab === "admin") mountAdmin();
  else leaveSettings();
  const me = net.board && net.board.me;
  ui.renameCard.hidden = !me;
  if (me && document.activeElement !== ui.newPseudo) ui.newPseudo.value = me.pseudo;
  setText(ui.renameNote, "");
  const mode = installMode();
  ui.installCard.hidden = mode === "installed";
  ui.installHint.textContent = HINTS[mode] || "";
  ui.installBtn.hidden = mode !== "prompt";
  ui.musicVol.value = Math.round(prefs.musicLevel * 100);
  ui.sfxVol.value = Math.round(prefs.sfxLevel * 100);
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

async function shareGame() {
  const url = location.origin + "/";
  if (navigator.share) {
    try {
      await navigator.share({ title: "Croûte que Croûte", text: "Viens jouer à Croûte que Croûte !", url });
    } catch (e) {}
    return;
  }
  try {
    await navigator.clipboard.writeText(url);
    flash(ui.shareBtn, "Lien copié");
  } catch (e) {
    flash(ui.shareBtn, "Copie impossible");
  }
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
ui.installBtn.addEventListener("click", promptInstall);
ui.shareBtn.addEventListener("click", shareGame);
ui.renameForm.addEventListener("submit", renamePlayer);
ui.installYes.addEventListener("click", () => {
  closePop();
  promptInstall();
});
ui.installLater.addEventListener("click", closePop);
ui.qrHost.textContent = location.host;
onInstallChange(() => {
  if (!ui.settings.hidden) renderSettings();
});
window.addEventListener("storage", (e) => {
  if (e.key === KEYS.adminToken && !ui.settings.hidden) renderSettings();
});
