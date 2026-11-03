import { readFileSync } from "node:fs";
import { chromium, devices, webkit } from "playwright";

const BASE = process.argv[2] || "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error("Le test du navigateur ne tourne qu'en local, sur une base à part : npm run test:navigateur.");
  process.exit(1);
}
const RUN_MS = 90000, WAIT_MS = 15000, MUSIC = /\/music\//;
const SAFARI = process.env.NAVIGATEUR === "webkit";
const WEBKIT_SELECT = /^Refused to apply a stylesheet because/;
const KEY = readFileSync(".dev.vars", "utf8").match(/ADMIN_KEY=(\w+)/)[1];
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
const hex = (n) => Array.from({ length: n }, () => Math.floor(Math.random() * 16).toString(16)).join("");
const results = [], problems = [];
let current = "";
const check = (name, ok, detail) => results.push(`${ok ? "OK  " : "FAIL"} ${name}${ok ? "" : " -> " + JSON.stringify(detail)}`);

async function step(name, run) {
  current = name;
  try {
    await run();
    check(name, true);
  } catch (e) {
    check(name, false, String(e.message || e).split("\n")[0]);
    throw e;
  }
}

function watch(page) {
  page.on("pageerror", (e) => problems.push(`[${current}] ${page.url()} : ${e.message}`));
  page.on("console", (m) => {
    const { url, lineNumber } = m.location();
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource") && !(SAFARI && WEBKIT_SELECT.test(m.text()))) problems.push(`[${current}] ${page.url()} : ${m.text()}${url ? ` (${url}:${lineNumber})` : ""}`);
  });
  page.on("response", (r) => {
    if ((r.status() === 404 || r.status() >= 500) && !MUSIC.test(r.url())) problems.push(`${r.status()} ${r.url()}`);
  });
}

for (let i = 0; i < 60; i++) {
  try { await fetch(BASE + "/api/board"); break; } catch { await wait(500); }
}

const browser = SAFARI ? await webkit.launch() : await chromium.launch(process.platform === "win32" ? { channel: "msedge" } : {});
const page = await browser.newPage(SAFARI ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 } });
watch(page);
const $ = (css) => page.locator(css).first();
const shown = (id, timeout = WAIT_MS) => $("#" + id).waitFor({ state: "visible", timeout });
const click = (id) => $("#" + id).click();
const filled = (css) => page.waitForFunction((s) => document.querySelector(s)?.textContent.trim(), css, { timeout: WAIT_MS });
const pseudo = "Nav" + hex(6);

function dialog(p, accept) {
  return Promise.race([
    new Promise((ok) => p.once("dialog", (d) => {
      ok(d.message());
      return accept ? d.accept() : d.dismiss();
    })),
    wait(WAIT_MS).then(() => { throw new Error("aucune demande de confirmation"); })
  ]);
}

try {
  await step("la page se charge et propose de choisir un pseudo", async () => {
    await page.goto(BASE + "/");
    await page.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
    await shown("joinForm");
  });
  await step("inscription : le bouton Jouer apparaît", async () => {
    await page.fill("#pseudo", pseudo);
    await $("#joinForm button").click();
    await shown("play");
  });
  await step("accueil : les calques des annonces et des confettis sont retirés tant qu'ils sont vides", async () => {
    const shownLayers = await page.evaluate(() => ["fx", "party"].filter((id) => !document.getElementById(id).hidden));
    if (shownLayers.length) throw new Error("calques affichés : " + shownLayers.join(", "));
  });
  if (SAFARI) {
    await step("iPhone : « Installe le jeu » proposé une fois, « Plus tard » le ferme", async () => {
      await shown("installPop");
      await click("installLater");
      await $("#installPop").waitFor({ state: "hidden", timeout: WAIT_MS });
    });
  }
  await step("une partie se lance et finit sur l'écran de fin", async () => {
    await click("play");
    await shown("hud");
    await shown("fx");
    await shown("over", RUN_MS);
  });
  await step("le score est envoyé au serveur", async () => {
    await page.waitForFunction(() => {
      const note = document.getElementById("overNote");
      return note.hidden || !note.textContent.startsWith("Envoi");
    }, null, { timeout: WAIT_MS });
    const note = await page.evaluate(() => {
      const el = document.getElementById("overNote");
      return el.hidden ? "" : el.textContent;
    });
    if (note) throw new Error(note);
  });
  await step("le classement montre le joueur, sa fiche s'ouvre, puis retour à l'écran de fin", async () => {
    await click("overBoard");
    await shown("board");
    await page.locator("#boardList li.me", { hasText: pseudo }).first().click();
    await shown("profile");
    await click("profileBack");
    await shown("board");
    await click("boardBack");
    await shown("over");
  });
  await step("retour à l'accueil", async () => {
    await click("overHome");
    await shown("menu");
    await shown("play");
  });
  await step("Classement depuis l'accueil, puis retour", async () => {
    await click("menuBoard");
    await shown("board");
    await click("boardBack");
    await shown("menu");
  });
  await step("Infos : les 4 onglets s'affichent, puis retour", async () => {
    await click("infoBtn");
    await shown("info");
    for (const tab of await page.locator("#infoTabs button").all()) {
      await tab.click();
      await page.waitForFunction(() => document.getElementById("infoBody").children.length > 0, null, { timeout: WAIT_MS });
    }
    await click("closeBtn");
    await shown("menu");
  });
  await step("Paramètres : QR code et code pour un autre appareil, puis retour", async () => {
    await click("settingsBtn");
    await shown("settings");
    await click("qrBtn");
    await shown("qr");
    await click("qrBack");
    await shown("settings");
    await click("linkBtn");
    await shown("link");
    await filled("#linkCode");
    await click("linkBack");
    await shown("settings");
    await click("closeBtn");
    await shown("menu");
  });
  await step("Paramètres : « Déconnecter les autres » répond deux fois de suite", async () => {
    await click("settingsBtn");
    await shown("settings");
    for (let i = 0; i < 2; i++) {
      await click("outBtn");
      await shown("outAsk");
      await $("#outYes").click({ timeout: WAIT_MS });
      await page.waitForFunction(() => document.getElementById("outAsk").hidden && document.getElementById("outNote").textContent.includes("appareil"), null, { timeout: WAIT_MS });
    }
    await click("closeBtn");
    await shown("menu");
  });
  await step("Succès : la liste s'affiche, puis retour", async () => {
    await click("menuAch");
    await shown("ach");
    await filled("#achList");
    await click("achBack");
    await shown("menu");
  });
  await step("un entraînement se lance depuis Infos", async () => {
    await click("infoBtn");
    await shown("info");
    await $('#infoTabs [data-tab="attacks"]').click();
    await $("#infoBody details summary").click();
    await $("#infoBody button.train").click();
    await shown("hud");
    if (!(await $("#hudBest").textContent()).startsWith("Entraînement")) throw new Error("pas en entraînement");
  });
  await step("écran géant sans soirée proche : une demande par minute, pas toutes les 2 s", async () => {
    const context = await browser.newContext();
    const other = await context.newPage();
    await other.clock.install();
    let asks = 0;
    other.on("request", (r) => {
      if (new URL(r.url()).pathname === "/api/ecran") asks++;
    });
    await other.goto(BASE + "/ecran", { waitUntil: "networkidle" });
    asks = 0;
    for (let i = 0; i < 12; i++) {
      await other.clock.runFor(10000);
      await wait(200);
    }
    await context.close();
    if (asks < 1 || asks > 3) throw new Error(asks + " demande(s) du classement en 2 min");
  });
  await step("écran géant : « Pas de réseau » quand le réseau tombe", async () => {
    const context = await browser.newContext();
    const other = await context.newPage();
    await other.goto(BASE + "/ecran", { waitUntil: "networkidle" });
    await context.setOffline(true);
    for (let i = 0; i < 2; i++) {
      await other.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await wait(500);
    }
    await other.locator("#offline").waitFor({ state: "visible", timeout: WAIT_MS });
    await context.close();
  });
  let admin;
  const at = (ms) => admin.evaluate((t) => {
    const d = new Date(t);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().slice(0, 16);
  }, ms);
  const status = () => admin.locator("#eventStatus").textContent();
  await step("admin : connexion avec la clé", async () => {
    admin = await browser.newPage();
    watch(admin);
    await admin.goto(BASE + "/admin");
    await admin.fill("#loginName", "Navigateur");
    await admin.fill("#loginKey", KEY);
    await admin.locator("#loginForm button").first().click();
    await admin.locator("#app").waitFor({ state: "visible", timeout: WAIT_MS });
  });
  await step("admin : retirer un joueur demande confirmation, « Annuler » ne retire rien, puis réintégré", async () => {
    const row = admin.locator("#players li", { hasText: pseudo });
    for (const scope of ["general", "pc"]) {
      await admin.locator(`.scope[data-scope="${scope}"]`).click();
      if (await row.waitFor({ timeout: 4000 }).then(() => true, () => false)) break;
    }
    const out = () => row.evaluate((li) => li.classList.contains("out"));
    let asked = dialog(admin, false);
    await row.locator("button").click();
    if (!(await asked).includes(pseudo)) throw new Error("mauvaise question");
    await wait(500);
    if (await out()) throw new Error("retiré sans confirmation");
    asked = dialog(admin, true);
    await row.locator("button").click();
    await asked;
    await admin.waitForFunction((p) => [...document.querySelectorAll("#players li.out")].some((li) => li.textContent.includes(p)), pseudo, { timeout: WAIT_MS });
    await row.locator("button", { hasText: "Réintégrer" }).click();
    await admin.waitForFunction((p) => [...document.querySelectorAll("#players li:not(.out)")].some((li) => li.textContent.includes(p)), pseudo, { timeout: WAIT_MS });
  });
  await step("admin : créer une soirée", async () => {
    await admin.locator("#newEventBtn").click();
    await admin.fill("#eventNameInput", "Soirée du navigateur");
    await admin.fill("#eventStartInput", await at(Date.now() - 3600000));
    await admin.fill("#eventEndInput", await at(Date.now() + 3600000));
    await admin.locator("#eventForm button").click();
    await admin.waitForFunction(() => document.getElementById("eventName").textContent === "Soirée du navigateur", null, { timeout: WAIT_MS });
    if ((await status()) !== "Soirée en cours") throw new Error(await status());
  });
  await step("écran géant pendant la soirée : en direct par WebSocket, un record s'affiche tout de suite", async () => {
    const other = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    watch(other);
    let sockets = 0;
    other.on("websocket", (ws) => {
      if (ws.url().endsWith("/api/live")) sockets++;
    });
    await other.goto(BASE + "/ecran");
    await other.waitForFunction(() => document.getElementById("title").textContent === "Soirée du navigateur", null, { timeout: WAIT_MS });
    for (let i = 0; i < 50 && !sockets; i++) await wait(100);
    await wait(500);
    const headers = { "content-type": "application/json", "x-app-version": "dev" };
    const name = "Live" + hex(5);
    const { token } = await (await fetch(BASE + "/api/join", { method: "POST", headers, body: JSON.stringify({ pseudo: name, clientId: hex(32) }) })).json();
    const auth = { ...headers, authorization: "Bearer " + token };
    const { runId } = await (await fetch(BASE + "/api/runs", { method: "POST", headers: auth, body: "{}" })).json();
    const since = Date.now();
    await fetch(BASE + "/api/runs/" + runId, { method: "POST", headers: auth, body: JSON.stringify({ score: 300 }) });
    await other.locator("#list li", { hasText: name }).first().waitFor({ timeout: WAIT_MS });
    const took = Date.now() - since;
    await wait(1500);
    let asks = 0;
    other.on("request", (r) => {
      if (new URL(r.url()).pathname === "/api/ecran") asks++;
    });
    for (let i = 0; i < 8; i++) {
      await fetch(BASE + "/api/join", { method: "POST", headers, body: JSON.stringify({ pseudo: "Foule" + hex(5), clientId: hex(32) }) });
      await wait(150);
    }
    await wait(1500);
    await other.close();
    if (!sockets) throw new Error("pas de WebSocket ouvert");
    if (took > 1500) throw new Error(`record affiché en ${took} ms`);
    if (asks > 3) throw new Error(`${asks} relectures pour 8 inscriptions en 1 s`);
  });
  await step("écran géant sans WebSocket : le secours affiche un record, puis enlève un joueur retiré", async () => {
    const other = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    watch(other);
    await other.routeWebSocket(/\/api\/live$/, (ws) => ws.close());
    await other.goto(BASE + "/ecran");
    await other.waitForFunction(() => document.getElementById("title").textContent === "Soirée du navigateur", null, { timeout: WAIT_MS });
    const headers = { "content-type": "application/json", "x-app-version": "dev" };
    const name = "Secours" + hex(4);
    const { token } = await (await fetch(BASE + "/api/join", { method: "POST", headers, body: JSON.stringify({ pseudo: name, clientId: hex(32) }) })).json();
    const auth = { ...headers, authorization: "Bearer " + token };
    const { runId } = await (await fetch(BASE + "/api/runs", { method: "POST", headers: auth, body: "{}" })).json();
    await fetch(BASE + "/api/runs/" + runId, { method: "POST", headers: auth, body: JSON.stringify({ score: 400 }) });
    const row = other.locator("#list li", { hasText: name });
    await row.first().waitFor({ timeout: 5000 });
    const id = await row.first().getAttribute("data-id");
    await fetch(BASE + `/api/admin/players/${id}/ban`, { method: "POST", headers: { ...headers, "x-admin-key": KEY }, body: JSON.stringify({ banned: true }) });
    await row.first().waitFor({ state: "detached", timeout: 20000 });
    await other.close();
  });
  await step("admin : fin déjà passée, confirmation demandée, « Annuler » laisse la soirée ouverte", async () => {
    let patched = 0;
    admin.on("request", (r) => {
      if (r.method() === "PATCH") patched++;
    });
    await admin.locator("#editEndBtn").click();
    await admin.fill("#endAt", await at(Date.now() - 120000));
    let asked = dialog(admin, false);
    await admin.locator("#endForm button").click();
    if (!(await asked).includes("déjà passée")) throw new Error("mauvaise question");
    await wait(500);
    if (patched || (await admin.locator("#endForm").isHidden()) || (await status()) !== "Soirée en cours") throw new Error("soirée modifiée sans confirmation");
    asked = dialog(admin, true);
    await admin.locator("#endForm button").click();
    await asked;
    await admin.waitForFunction(() => document.getElementById("eventStatus").textContent === "Dernière soirée", null, { timeout: WAIT_MS });
    await admin.close();
  });
  for (const path of ["/ecran", "/admin"]) {
    await step(`la page ${path} s'ouvre`, async () => {
      const other = await browser.newPage();
      watch(other);
      await other.goto(BASE + path, { waitUntil: "networkidle" });
      await other.close();
    });
  }
} catch {}
check("aucune erreur dans la console, aucun fichier manquant", !problems.length, problems.slice(0, 5));
await browser.close();

console.log((SAFARI ? "WebKit, profil iPhone" : "Chromium") + "\n" + results.join("\n"));
console.log(results.filter((l) => l.startsWith("FAIL")).length + " échec(s) sur " + results.length);
process.exit(results.some((l) => l.startsWith("FAIL")) ? 1 : 0);
