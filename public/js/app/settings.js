import { store, KEYS } from "../shared/store.js";
import { installMode, promptInstall, shouldSuggest, markSuggested, onInstallChange } from "./install.js";
import { controlsMode } from "./input.js";
import { ui } from "./screens.js";

const FLASH_MS = 2000;
const HINTS = {
  prompt: "Lance-le depuis ton écran d'accueil, en plein écran.",
  ios: "Touche Partager, puis « Sur l'écran d'accueil ».",
  menu: "Ouvre le menu du navigateur, puis « Installer l'appli » ou « Ajouter à l'écran d'accueil »."
};
const CONTROL_HINTS = {
  drag: "Glisse le doigt n'importe où : la tartine suit le mouvement.",
  stick: "Pose le pouce où tu veux et incline : la tartine avance tant que tu tiens.",
  pad: "Glisse le doigt dans la zone en bas de l'écran."
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
  ui.installCard.hidden = mode === "installed";
  ui.installHint.textContent = HINTS[mode] || "";
  ui.installBtn.hidden = mode !== "prompt";
  const ctl = controlsMode();
  for (const b of ui.controlTabs.children) b.setAttribute("aria-selected", String(b.dataset.mode === ctl));
  ui.controlHint.textContent = CONTROL_HINTS[ctl];
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
for (const b of ui.controlTabs.children) {
  b.addEventListener("click", () => {
    store.set(KEYS.controls, b.dataset.mode);
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
