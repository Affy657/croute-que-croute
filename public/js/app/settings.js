import { store, KEYS } from "../shared/store.js";
import { installMode, promptInstall, shouldSuggest, markSuggested, onInstallChange } from "./install.js";
import { ui } from "./screens.js";

const FLASH_MS = 2000;
const HINTS = {
  installed: "C'est fait : le jeu est sur ton écran d'accueil.",
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
  const mode = installMode();
  ui.installHint.textContent = HINTS[mode];
  ui.installBtn.hidden = mode !== "prompt";
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
ui.installBtn.addEventListener("click", promptInstall);
ui.shareBtn.addEventListener("click", shareGame);
ui.installYes.addEventListener("click", () => {
  closePop();
  promptInstall();
});
ui.installLater.addEventListener("click", closePop);
ui.qrHost.textContent = location.host;
onInstallChange(() => {
  if (!ui.settings.hidden) renderSettings();
});
