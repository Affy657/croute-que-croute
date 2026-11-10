import { readFileSync } from "node:fs";
import { chromium, devices, webkit } from "playwright";
import { SETTLE_MS } from "../public/js/shared/banner.js";

const BASE = process.argv[2] || "";
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(BASE)) {
  console.error("Le test du navigateur ne tourne qu'en local, sur une base à part : npm run test:navigateur.");
  process.exit(1);
}
const RUN_MS = 90000, WAIT_MS = 15000, AUDIO = /\/(music|sfx)\//;
const SAFARI = process.env.NAVIGATEUR === "webkit";
const WEBKIT_NOISE = [/^Refused to apply a stylesheet because/, /\/api\/\w+ due to access control checks\.$/];
const noise = (text) => SAFARI && WEBKIT_NOISE.some((known) => known.test(text));
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
  page.on("pageerror", (e) => {
    if (!noise(e.message)) problems.push(`[${current}] ${page.url()} : ${e.message}`);
  });
  page.on("console", (m) => {
    const { url, lineNumber } = m.location();
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource") && !noise(m.text())) problems.push(`[${current}] ${page.url()} : ${m.text()}${url ? ` (${url}:${lineNumber})` : ""}`);
  });
  page.on("response", (r) => {
    if ((r.status() === 404 || r.status() >= 500) && !AUDIO.test(r.url())) problems.push(`${r.status()} ${r.url()}`);
  });
}

for (let i = 0; i < 60; i++) {
  try { await fetch(BASE + "/api/board"); break; } catch { await wait(500); }
}

const browser = SAFARI ? await webkit.launch() : await chromium.launch({ ...(process.platform === "win32" ? { channel: "msedge" } : {}), args: ["--disable-features=LocalNetworkAccessChecks"] });
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
  await step("accueil : les planètes avancent à chaque image, sans à-coups", async () => {
    const seen = await page.evaluate(() => new Promise((done) => {
      const draw = CanvasRenderingContext2D.prototype.drawImage, heights = new Map();
      CanvasRenderingContext2D.prototype.drawImage = function (img, x, y, ...rest) {
        if (this.canvas.id === "cv" && img instanceof HTMLCanvasElement && this.getTransform().isIdentity) {
          if (!heights.has(img)) heights.set(img, []);
          heights.get(img).push(y);
        }
        return draw.call(this, img, x, y, ...rest);
      };
      setTimeout(() => {
        CanvasRenderingContext2D.prototype.drawImage = draw;
        const ys = [...heights.values()].sort((a, b) => b.length - a.length)[0] || [];
        done({ frames: ys.length, still: ys.slice(1).filter((y, i) => y === ys[i]).length });
      }, 1500);
    }));
    if (seen.frames < 10 || seen.still > seen.frames / 10) throw new Error(`${seen.still} images sans bouger sur ${seen.frames}`);
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
  await step("Échap fait « Retour » : classement, écran du QR code, Paramètres", async () => {
    await click("menuBoard");
    await shown("board");
    await page.keyboard.press("Escape");
    await shown("menu");
    await click("settingsBtn");
    await shown("settings");
    await click("qrBtn");
    await shown("qr");
    await page.keyboard.press("Escape");
    await shown("settings");
    await page.keyboard.press("Escape");
    await shown("menu");
  });
  await step("Échap fait « Retour » même après avoir touché un curseur", async () => {
    await click("settingsBtn");
    await shown("settings");
    await $("#sensVol").click();
    await page.keyboard.press("Escape");
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
  await step("Infos, Crédits : les 5 bruitages à écouter", async () => {
    await click("infoBtn");
    await shown("info");
    await page.locator('#infoTabs [data-tab="credits"]').click();
    const sounds = page.locator("#infoBody .sfx-list button");
    if ((await sounds.count()) !== 5) throw new Error((await sounds.count()) + " boutons de bruitages");
    await sounds.first().click();
    await click("infoBack");
    await shown("menu");
  });
  await step("Infos ouvert, puis Paramètres ouverts par un code scanné : l'animation des attaques s'arrête", async () => {
    await click("infoBtn");
    await shown("info");
    await page.locator('#infoTabs [data-tab="attacks"]').click();
    await $("#infoBody details summary").click();
    await page.waitForFunction(() => document.querySelector("#infoBody details[open] canvas"), null, { timeout: WAIT_MS });
    await page.evaluate(() => { location.hash = "#lier=ABCD"; });
    await shown("settings");
    const draws = await page.evaluate(() => new Promise((done) => {
      const ctx = document.querySelector("#infoBody details[open] canvas").getContext("2d"), fill = ctx.fillRect;
      let n = 0;
      ctx.fillRect = function (...args) {
        n++;
        return fill.apply(this, args);
      };
      setTimeout(() => {
        delete ctx.fillRect;
        done(n);
      }, 500);
    }));
    if (draws) throw new Error(draws + " dessins des attaques sous les Paramètres");
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
      if ((await $("#outNote").textContent()).includes("Google")) throw new Error("la confirmation parle de Google sans compte Google lié");
      await $("#outYes").click({ timeout: WAIT_MS });
      await page.waitForFunction(() => document.getElementById("outAsk").hidden && document.getElementById("outNote").textContent.includes("appareil"), null, { timeout: WAIT_MS });
    }
    await click("closeBtn");
    await shown("menu");
  });
  await step("Paramètres, Autre appareil : un seul parcours ouvert à la fois, erreur du code en rouge", async () => {
    await click("settingsBtn");
    await shown("settings");
    const open = () => page.evaluate(() => {
      const b = document.getElementById("mergeBtn");
      return [b.getAttribute("aria-expanded"), getComputedStyle(b).backgroundColor !== "rgba(0, 0, 0, 0)"];
    });
    await click("mergeBtn");
    await shown("mergeHelp");
    if (String(await open()) !== "true,true") throw new Error(`« J'ai un code » ouvert sans le montrer : ${await open()}`);
    await click("outBtn");
    await shown("outAsk");
    if (await $("#mergeForm").isVisible()) throw new Error("le code de fusion reste ouvert sous la confirmation");
    if (String(await open()) !== "false,false") throw new Error(`« J'ai un code » fermé mais montré ouvert : ${await open()}`);
    await click("mergeBtn");
    await shown("mergeForm");
    if (await $("#outAsk").isVisible()) throw new Error("la confirmation reste ouverte sous le code de fusion");
    await page.fill("#mergeInput", "ABCD");
    await $("#mergeForm button").click({ timeout: WAIT_MS });
    await page.waitForFunction(() => {
      const note = document.getElementById("mergeNote");
      return note.textContent && note.classList.contains("error");
    }, null, { timeout: WAIT_MS });
    await click("closeBtn");
    await shown("menu");
  });
  await step("Paramètres, Pseudo : « Changer » grisé tant que le pseudo ne change pas", async () => {
    await click("settingsBtn");
    await shown("renameCard");
    const button = $("#renameForm button");
    const pseudo = await $("#newPseudo").inputValue();
    if (!(await button.isDisabled())) throw new Error("« Changer » actif sans nouveau pseudo");
    await page.fill("#newPseudo", pseudo.slice(0, 14) + "Zq");
    if (await button.isDisabled()) throw new Error("« Changer » grisé avec un nouveau pseudo");
    await page.fill("#newPseudo", " " + pseudo + " ");
    if (!(await button.isDisabled())) throw new Error("« Changer » actif avec le même pseudo");
    await click("closeBtn");
    await shown("menu");
  });
  const apiHeaders = { "content-type": "application/json", "x-app-version": "dev" };
  const joinApi = async (name) => (await (await fetch(BASE + "/api/join", { method: "POST", headers: apiHeaders, body: JSON.stringify({ pseudo: name, clientId: hex(32) }) })).json()).token;
  const codeOf = async (tok) => (await (await fetch(BASE + "/api/me/link", { method: "POST", headers: { ...apiHeaders, authorization: "Bearer " + tok } })).json()).code;
  const freshPage = async (token, viewport, options = {}) => {
    const base = SAFARI ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 } };
    const context = await browser.newContext({ ...(viewport ? { ...base, viewport } : base), ...options });
    await context.addInitScript((t) => {
      localStorage.setItem("cv-install-asked", "1");
      if (t) localStorage.setItem("cv-token", t);
    }, token);
    const p = await context.newPage();
    watch(p);
    return { context, p };
  };
  const moveTo = BASE.includes("127.0.0.1") ? BASE.replace("127.0.0.1", "localhost") : BASE.replace("localhost", "127.0.0.1");
  const movingPage = async (token) => {
    const context = await browser.newContext({ ...(SAFARI ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 } }), serviceWorkers: "block" });
    await context.route("**/js/app/move.js", async (route) => {
      const res = await route.fetch();
      const text = (await res.text()).replace(/OLD_HOST = "[^"]+"/, `OLD_HOST = "${new URL(BASE).hostname}"`).replace(/HOME = "[^"]+"/, `HOME = "${moveTo}"`);
      await route.fulfill({ response: res, body: text });
    });
    await context.route("**/js/arrive.js", async (route) => {
      const res = await route.fetch();
      const text = (await res.text()).replace(/OLD = "[^"]+"/, `OLD = "${BASE}"`).replace(/HOST = "[^"]+"/, `HOST = "${new URL(moveTo).hostname}"`);
      await route.fulfill({ response: res, body: text });
    });
    await context.route((u) => u.pathname === "/", async (route) => {
      const res = await route.fetch();
      const headers = res.headers();
      if (headers["content-security-policy"]) headers["content-security-policy"] = headers["content-security-policy"].replace("connect-src 'self'", `connect-src 'self' ${moveTo} ${BASE}`);
      await route.fulfill({ response: res, headers });
    });
    await context.addInitScript(({ host, t }) => {
      if (location.hostname !== host || localStorage.getItem("cv-sensibilite")) return;
      localStorage.setItem("cv-install-asked", "1");
      localStorage.setItem("cv-sensibilite", "2.2");
      if (t) localStorage.setItem("cv-token", t);
    }, { host: new URL(BASE).hostname, t: token });
    const p = await context.newPage();
    watch(p);
    return { context, p };
  };
  const withGoogle = (p) => p.route((url) => url.pathname === "/api/board", async (route) => {
    const res = await route.fetch();
    await route.fulfill({ response: res, json: { ...(await res.json()), google: true } });
  });
  await step("Paramètres ouverts avant le classement : « Pseudo » et « Autre appareil » s'affichent à son arrivée, sans effacer un pseudo en cours de saisie", async () => {
    const name = "Avant" + hex(4);
    const { context, p } = await freshPage(await joinApi(name), null, { serviceWorkers: "block" });
    try {
      let open;
      const gate = new Promise((ok) => { open = ok; });
      await p.route("**/api/board", async (route) => {
        await gate;
        await route.continue();
      });
      await p.goto(BASE + "/");
      await p.locator("#settingsBtn").click({ timeout: WAIT_MS });
      await p.locator("#settings").waitFor({ state: "visible", timeout: WAIT_MS });
      if (await p.locator("#renameCard").isVisible()) throw new Error("« Pseudo » affiché avant le classement");
      open();
      await p.locator("#renameCard").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.locator("#linkCard").waitFor({ state: "visible", timeout: WAIT_MS });
      if ((await p.inputValue("#newPseudo")) !== name) throw new Error("pseudo pas rempli : " + (await p.inputValue("#newPseudo")));
      await p.fill("#newPseudo", name + "z");
      await p.locator("#newPseudo").blur();
      const again = p.waitForResponse((r) => new URL(r.url()).pathname === "/api/board", { timeout: WAIT_MS });
      await p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
      await again;
      await wait(300);
      if ((await p.inputValue("#newPseudo")) !== name + "z") throw new Error("saisie effacée par le classement");
    } finally {
      await context.close();
    }
  });
  await step("adresse « #google=constructor » : ni plantage ni texte bizarre, avec ou sans compte", async () => {
    for (const token of [await joinApi("Goo" + hex(4)), null]) {
      const { context, p } = await freshPage(token, null, { serviceWorkers: "block" });
      const crashes = [];
      p.on("pageerror", (e) => crashes.push(e.message));
      await withGoogle(p);
      try {
        await p.goto(BASE + "/#google=constructor");
        await p.locator(token ? "#play" : "#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
        await wait(1000);
        const state = await p.evaluate(() => ({ settings: !document.getElementById("settings").hidden, note: document.getElementById("googleNote").textContent, error: document.getElementById("linkError").textContent }));
        if (crashes.length || state.settings || state.note || state.error) throw new Error(JSON.stringify({ crashes, ...state }));
      } finally {
        await context.close();
      }
    }
  });
  await step("retour depuis la page de Google par le bouton retour : « Continuer avec Google » remarche", async () => {
    const { context, p } = await freshPage(null, null, { serviceWorkers: "block" });
    await withGoogle(p);
    await p.route("**/api/google/start", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ url: "/#chez-google" }) }));
    try {
      await p.goto(BASE + "/");
      await p.locator("#haveAccount").click({ timeout: WAIT_MS });
      await p.locator("#googleLogin").click({ timeout: WAIT_MS });
      await p.waitForFunction(() => document.getElementById("googleLogin").disabled, null, { timeout: WAIT_MS });
      await p.evaluate(() => dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true })));
      if (await p.locator("#googleLogin").isDisabled()) throw new Error("« Continuer avec Google » reste grisé");
    } finally {
      await context.close();
    }
  });
  await step("appareil sorti du compte : il oublie les succès et les skins, un jeton inconnu non", async () => {
    const owner = await joinApi("Sort" + hex(4));
    const link = await (await fetch(BASE + "/api/link", { method: "POST", headers: apiHeaders, body: JSON.stringify({ code: await codeOf(owner), clientId: hex(32) }) })).json();
    await fetch(BASE + "/api/me/devices", { method: "DELETE", headers: { ...apiHeaders, authorization: "Bearer " + owner } });
    const opened = async (token) => {
      const context = await browser.newContext({ ...(SAFARI ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 } }), serviceWorkers: "block" });
      await context.addInitScript((t) => {
        if (sessionStorage.getItem("essai")) return;
        sessionStorage.setItem("essai", "1");
        localStorage.setItem("cv-install-asked", "1");
        localStorage.setItem("cv-token", t);
        localStorage.setItem("cv-garnitures", '["jam"]');
      }, token);
      const p = await context.newPage();
      await p.goto(BASE + "/");
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(1500);
      const kept = await p.evaluate(() => localStorage.getItem("cv-garnitures"));
      await context.close();
      return kept;
    };
    const [out, unknown] = [await opened(link.token), await opened("a".repeat(48))];
    if (out !== null || unknown === null) throw new Error(JSON.stringify([out, unknown]));
  });
  await step("appareil sorti du compte en pleine partie : à sa mort puis au rechargement, plus rien de l'ancien compte", async () => {
    const owner = await joinApi("Sort" + hex(4));
    const link = await (await fetch(BASE + "/api/link", { method: "POST", headers: apiHeaders, body: JSON.stringify({ code: await codeOf(owner), clientId: hex(32) }) })).json();
    const context = await browser.newContext({ ...(SAFARI ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 } }), serviceWorkers: "block" });
    await context.addInitScript((t) => {
      if (sessionStorage.getItem("essai")) return;
      sessionStorage.setItem("essai", "1");
      sessionStorage.setItem("cv-invincible", "1");
      localStorage.setItem("cv-install-asked", "1");
      localStorage.setItem("cv-token", t);
      localStorage.setItem("cv-succes", JSON.stringify({ got: { pumpkin: 1, t90: 1, runs10: 1 }, attacks: ["knife"], events: [], killers: [], runs: 12, best: 9000, seen: 1 }));
      localStorage.setItem("cv-garnitures", '["jam","choco","sauce"]');
      localStorage.setItem("cv-garniture", "choco");
      localStorage.setItem("cv-accessoire", "witch");
      localStorage.setItem("cv-cotes", "boosters");
    }, link.token);
    await context.route("**/js/app/run.js", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()) + "\nwindow.__jeu = { S, die };\n" });
    });
    const p = await context.newPage();
    watch(p);
    const left = () => p.evaluate(() => {
      const got = (JSON.parse(localStorage.getItem("cv-succes") || "{}") || {}).got || {}, spreads = localStorage.getItem("cv-garnitures") || "";
      return [
        ...["pumpkin", "t90", "runs10"].filter((id) => got[id]),
        ...(["jam", "choco", "sauce"].every((s) => spreads.includes(s)) ? ["garnitures"] : []),
        ...["cv-garniture", "cv-accessoire", "cv-cotes"].filter((k) => localStorage.getItem(k))
      ];
    });
    try {
      await p.goto(BASE + "/");
      await p.locator("#play").waitFor({ state: "visible", timeout: WAIT_MS });
      await fetch(BASE + "/api/me/devices", { method: "DELETE", headers: { ...apiHeaders, authorization: "Bearer " + owner } });
      await p.locator("#play").click();
      await p.waitForFunction(() => window.__jeu.S.mode === "play" && !localStorage.getItem("cv-token"), null, { timeout: WAIT_MS });
      await p.evaluate(() => window.__jeu.die(null));
      await p.locator("#over").waitFor({ state: "visible", timeout: WAIT_MS });
      const dead = await left();
      await p.locator("#again").click({ timeout: WAIT_MS });
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      const reloaded = await left();
      if (dead.length || reloaded.length) throw new Error(JSON.stringify({ dead, reloaded }));
    } finally {
      await context.close();
    }
  });
  await step("démarrage qui plante deux fois de suite (fichiers de deux versions) : le jeu repart seul", async () => {
    const context = await browser.newContext({ ...(SAFARI ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 } }), serviceWorkers: "block" });
    let renewed = false;
    await context.route("**/js/app/state.js", (route) => {
      renewed ||= route.request().resourceType() === "fetch";
      if (renewed) return route.continue();
      return route.fulfill({ status: 200, contentType: "text/javascript", headers: { "cache-control": "no-store" }, body: "import { absent } from '/js/shared/format.js';\n" });
    });
    const p = await context.newPage();
    try {
      await p.goto(BASE + "/");
      await p.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
      if (!renewed) throw new Error("fichiers pas renouvelés");
    } finally {
      await context.close();
    }
  });
  const slowStart = async (prepare) => {
    const context = await browser.newContext({ ...(SAFARI ? devices["iPhone 13"] : { viewport: { width: 390, height: 844 } }), serviceWorkers: "block" });
    const reports = [];
    await context.addInitScript(prepare);
    await context.route("**/js/app/scene.js", async (route) => {
      await wait(1500);
      await route.continue();
    });
    await context.route("**/api/errors", (route) => {
      reports.push(route.request().postData() || "");
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    });
    return { context, reports, p: await context.newPage() };
  };
  const bootTries = (p) => p.evaluate(() => sessionStorage.getItem("cv-boot-tries"));
  await step("script ajouté par le navigateur (portefeuille de Brave) ou par Cloudflare (analyse) pendant un chargement lent : pas de rechargement, rien dans les erreurs des joueurs", async () => {
    const { context, reports, p } = await slowStart(() => {
      localStorage.setItem("cv-install-asked", "1");
      document.addEventListener("readystatechange", () => {
        if (document.readyState !== "interactive") return;
        dispatchEvent(new ErrorEvent("error", { message: "TypeError: undefined is not an object (evaluating 'window.ethereum.selectedAddress = undefined')", filename: location.href, lineno: 1, colno: 16 }));
        dispatchEvent(new SecurityPolicyViolationEvent("securitypolicyviolation", { documentURI: location.href, blockedURI: "inline", violatedDirective: "style-src-attr", effectiveDirective: "style-src-attr", originalPolicy: "style-src 'self'", disposition: "enforce", statusCode: 200, sourceFile: "" }));
        const beacon = document.createElement("script");
        beacon.src = "https://static.cloudflareinsights.com/beacon.min.js";
        document.head.append(beacon);
      });
    });
    try {
      await p.goto(BASE + "/");
      await p.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
      const tries = await bootTries(p);
      await p.evaluate(() => dispatchEvent(new ErrorEvent("error", { message: "Témoin", filename: location.origin + "/js/app/main.js", lineno: 1, colno: 1 })));
      await wait(4500);
      const sent = reports.join(" ");
      if (tries !== null || !sent.includes("Témoin") || sent.includes("ethereum") || sent.includes("style-src-attr") || sent.includes("cloudflareinsights")) throw new Error(JSON.stringify({ tries, sent: sent.slice(0, 400) }));
    } finally {
      await context.close();
    }
  });
  await step("téléphone trop ancien (avant iOS 14.5) : un message par-dessus tout, pas de rechargement quand le code plante", async () => {
    const { context, p } = await slowStart(() => {
      localStorage.setItem("cv-install-asked", "1");
      CSS.supports = () => false;
      document.addEventListener("readystatechange", () => {
        if (document.readyState === "interactive") dispatchEvent(new ErrorEvent("error", { message: "SyntaxError: Unexpected token '?'", filename: location.origin + "/js/app/state.js", lineno: 1, colno: 1 }));
      });
    });
    try {
      await p.goto(BASE + "/");
      await p.locator("#tooOld").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
      const state = await p.evaluate(() => ({ top: !!document.elementFromPoint(innerWidth / 2, innerHeight / 2)?.closest("#tooOld"), text: document.getElementById("tooOld").textContent }));
      const tries = await bootTries(p);
      if (!state.top || !state.text.includes("Mise à jour logicielle") || tries !== null) throw new Error(JSON.stringify({ ...state, tries }));
    } finally {
      await context.close();
    }
  });
  await step("nouvelle adresse : le compte et les réglages suivent, l'ancienne clé reste valable", async () => {
    const name = "Part" + hex(4), token = await joinApi(name);
    const { context, p } = await movingPage(token);
    try {
      await p.goto(BASE + "/");
      await p.waitForURL((u) => u.origin === moveTo, { timeout: WAIT_MS });
      await p.waitForFunction(() => localStorage.getItem("cv-token"), null, { timeout: WAIT_MS });
      const after = await p.evaluate(() => ({ token: localStorage.getItem("cv-token"), speed: localStorage.getItem("cv-sensibilite"), hash: location.hash }));
      const pseudoOf = async (t) => (await (await fetch(BASE + "/api/board", { headers: { ...apiHeaders, authorization: "Bearer " + t } })).json()).me?.pseudo;
      if (after.token === token || after.speed !== "2.2" || after.hash || await pseudoOf(after.token) !== name || await pseudoOf(token) !== name) throw new Error(JSON.stringify(after));
    } finally {
      await context.close();
    }
  });
  await step("nouveau QR scanné par un ancien joueur : il retrouve son compte sans rien faire", async () => {
    const name = "Scan" + hex(4), token = await joinApi(name);
    const { context, p } = await movingPage(token);
    try {
      await p.goto(moveTo + "/");
      await p.waitForFunction((home) => location.origin === home && localStorage.getItem("cv-token"), moveTo, { timeout: WAIT_MS });
      const mine = await p.evaluate(async () => (await (await fetch("/api/board", { headers: { authorization: "Bearer " + localStorage.getItem("cv-token") } })).json()).me?.pseudo);
      if (mine !== name) throw new Error(String(mine));
    } finally {
      await context.close();
    }
  });
  await step("nouveau QR scanné par un nouveau joueur : choix du pseudo, sans boucle", async () => {
    const { context, p } = await movingPage(null);
    try {
      await p.goto(moveTo + "/");
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(1000);
      if (p.url() !== moveTo + "/") throw new Error(p.url());
    } finally {
      await context.close();
    }
  });
  await step("nouvelle adresse injoignable : le joueur reste sur l'ancienne et peut jouer", async () => {
    const { context, p } = await movingPage(await joinApi("Reste" + hex(4)));
    try {
      await context.route((u) => u.origin === moveTo, (route) => route.abort());
      await p.goto(BASE + "/");
      await p.locator("#play").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(3000);
      if (new URL(p.url()).origin !== BASE) throw new Error(p.url());
      await p.locator("#play").waitFor({ state: "visible", timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("nouvelle adresse : un joueur sans compte y est renvoyé aussi", async () => {
    const { context, p } = await movingPage(null);
    try {
      await p.goto(BASE + "/");
      await p.waitForURL((u) => u.origin === moveTo, { timeout: WAIT_MS });
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("Paramètres sur un écran de 320 px : chaque bouton lisible et sur une ligne", async () => {
    const { context, p } = await freshPage(await joinApi("Petit" + hex(4)), { width: 320, height: 568 });
    try {
      await p.goto(BASE + "/");
      await p.locator("#settingsBtn").click({ timeout: WAIT_MS });
      await p.locator("#linkCard").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.evaluate(() => document.fonts.ready);
      const tight = await p.evaluate(() => [...document.querySelectorAll("#settingsApp .ghost")]
        .filter((b) => b.offsetParent && (b.scrollWidth > b.clientWidth || b.offsetHeight > 48 || parseFloat(getComputedStyle(b).fontSize) < 13))
        .map((b) => b.textContent));
      if (tight.length) throw new Error("boutons serrés : " + tight.join(", "));
    } finally {
      await context.close();
    }
  });
  const testPage = async (token, viewport) => {
    const fresh = await freshPage(token, viewport, { serviceWorkers: "block" });
    await fresh.context.addInitScript(() => sessionStorage.setItem("cv-invincible", "1"));
    await fresh.p.route("**/js/app/run.js", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, body: (await res.text()) + "\nwindow.__jeu = { S, die, get sim() { return game.sim; } };\n" });
    });
    return fresh;
  };
  const runFor = async (p, button, ms) => {
    await p.locator(button).click({ timeout: WAIT_MS });
    await p.waitForFunction(() => window.__jeu.S.mode === "play", null, { timeout: WAIT_MS });
    await wait(ms);
    await p.evaluate(() => window.__jeu.die(null));
    await p.locator("#over").waitFor({ state: "visible", timeout: WAIT_MS });
  };
  const sent = (p) => p.waitForFunction(() => {
    const note = document.getElementById("overNote");
    return note.hidden || !note.textContent.startsWith("Envoi");
  }, null, { timeout: WAIT_MS });
  await step("inscription quand le classement ne répond pas : la partie est quand même comptée", async () => {
    const { context, p } = await freshPage(null);
    try {
      await p.goto(BASE + "/");
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.route("**/api/board", (route) => route.abort());
      await p.fill("#pseudo", "Sature" + hex(4));
      const started = p.waitForRequest((req) => req.method() === "POST" && new URL(req.url()).pathname === "/api/runs", { timeout: WAIT_MS });
      await p.locator("#joinForm button").first().click();
      await p.locator("#play").click({ timeout: WAIT_MS });
      await started;
    } finally {
      await context.close();
    }
  });
  await step("partie non comptée puis vrai record : « Nouveau record » affiché, et l'accueil montre le record du serveur", async () => {
    const { context, p } = await testPage(await joinApi("Hors" + hex(4)));
    try {
      let down = true;
      await p.route("**/api/runs", (route) => (down && route.request().method() === "POST" ? route.abort() : route.continue()));
      await p.goto(BASE + "/");
      await runFor(p, "#play", 3000);
      await p.waitForFunction(() => document.getElementById("overNote").textContent.includes("non compté"), null, { timeout: WAIT_MS });
      down = false;
      await runFor(p, "#again", 1500);
      await sent(p);
      await p.waitForFunction(() => !document.getElementById("newBest").hidden, null, { timeout: WAIT_MS });
      const score = (await p.locator("#final").textContent()).replace(/\s/g, "");
      await p.locator("#overHome").click();
      await p.waitForFunction((s) => document.getElementById("menuBest").textContent.replace(/\s/g, "") === s, score, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("écran de fin : « Nouveau record » retiré quand le serveur ne le compte pas comme record", async () => {
    const { context, p } = await testPage(await joinApi("Verdict" + hex(4)));
    try {
      await p.route(/\/api\/runs\/[^/]+$/, async (route) => {
        const res = await route.fetch();
        await route.fulfill({ response: res, json: { ...(await res.json()), improved: false, eventImproved: false, pcImproved: false } });
      });
      await p.goto(BASE + "/");
      await runFor(p, "#play", 1000);
      await sent(p);
      await p.waitForFunction(() => document.getElementById("newBest").hidden, null, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("score parti après les 2 min d'essais : l'écran de fin suit la réponse, record retiré et place affichée", async () => {
    const { context, p } = await testPage(await joinApi("Tardif" + hex(4)));
    try {
      await p.route("**/js/app/api.js", async (route) => {
        const res = await route.fetch();
        await route.fulfill({ response: res, body: (await res.text()).replace("WAIT_MS = 120000", "WAIT_MS = 500") });
      });
      let down = true;
      await p.route(/\/api\/runs\/[^/]+$/, async (route) => {
        if (down) return route.abort();
        const res = await route.fetch();
        await route.fulfill({ response: res, json: { ...(await res.json()), improved: false, eventImproved: false, pcImproved: false } });
      });
      await p.goto(BASE + "/");
      await runFor(p, "#play", 500);
      await p.waitForFunction(() => document.getElementById("overNote").textContent.includes("partira"), null, { timeout: WAIT_MS });
      if (await p.locator("#newBest").isHidden()) throw new Error("pas de « Nouveau record » en attendant le serveur");
      down = false;
      await p.evaluate(() => window.dispatchEvent(new Event("online")));
      await p.waitForFunction(() => document.getElementById("newBest").hidden && document.getElementById("overNote").hidden && !document.getElementById("overRankBox").hidden, null, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("mise à jour en attente : « Rejouer » recharge le jeu sans lancer de partie, puis « Jouer » marche sans recharger encore", async () => {
    const { context, p } = await testPage(await joinApi("Recharge" + hex(4)));
    try {
      let newer = false, starts = 0;
      await p.route("**/api/board", async (route) => {
        try {
          const res = await route.fetch();
          const body = await res.json();
          await route.fulfill({ response: res, json: newer ? { ...body, version: "9.9.9" } : body });
        } catch {}
      });
      const loaded = p.waitForResponse("**/api/board", { timeout: WAIT_MS });
      await p.goto(BASE + "/");
      await loaded;
      newer = true;
      const told = p.waitForResponse("**/api/board", { timeout: WAIT_MS });
      await runFor(p, "#play", 300);
      await sent(p);
      await told;
      await wait(300);
      await p.route(BASE + "/", async (route) => {
        await wait(1500);
        await route.continue().catch(() => {});
      });
      p.on("request", (r) => {
        if (r.method() === "POST" && new URL(r.url()).pathname === "/api/runs") starts++;
      });
      await p.waitForFunction(() => !document.getElementById("again").disabled, null, { timeout: WAIT_MS });
      const reloaded = p.waitForEvent("load", { timeout: WAIT_MS });
      await p.locator("#again").click();
      await reloaded;
      if (starts) throw new Error(starts + " partie(s) lancée(s) pendant le rechargement");
      await p.locator("#play").click({ timeout: WAIT_MS });
      await p.waitForFunction(() => window.__jeu.S.mode === "play", null, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  if (!SAFARI) {
    await step("souris en mode « Glisser » : sortir de la fenêtre et revenir ailleurs ne fait pas sauter la tartine", async () => {
      const { context, p } = await testPage(await joinApi("Souris" + hex(4)), { width: 1280, height: 720 });
      try {
        await p.goto(BASE + "/");
        await p.locator("#play").waitFor({ state: "visible", timeout: WAIT_MS });
        await p.mouse.move(640, 600);
        await p.keyboard.press("Space");
        await p.waitForFunction(() => window.__jeu.S.mode === "play", null, { timeout: WAIT_MS });
        const x = () => p.evaluate(() => window.__jeu.sim.state.toast.x);
        for (let i = 0; i <= 10; i++) await p.mouse.move(640 - i * 20, 600);
        await wait(100);
        const before = await x();
        await p.mouse.move(-100, 600, { steps: 5 });
        await p.mouse.move(-100, 300, { steps: 5 });
        await p.mouse.move(1279, 300);
        await wait(100);
        const after = await x();
        if (Math.abs(after - before) > 40) throw new Error(`la tartine a sauté de ${Math.round(before)} à ${Math.round(after)}`);
      } finally {
        await context.close();
      }
    });
  }
  await step("Paramètres sur téléphone : « Doigt » propose Joystick ou Tenir, le choix est gardé", async () => {
    const { context, p } = await freshPage(await joinApi("Doigt" + hex(4)), null, { hasTouch: true });
    try {
      await p.goto(BASE + "/");
      await p.locator("#settingsBtn").click({ timeout: WAIT_MS });
      await p.locator("#touchRow").waitFor({ timeout: WAIT_MS });
      if ((await p.locator("#touchHint").textContent()) !== "Glisse n'importe où : la tartine suit ton mouvement.") throw new Error("Joystick pas choisi au départ");
      await p.locator('#touchTabs [data-hold="1"]').click();
      await p.waitForFunction(() => document.getElementById("touchHint").textContent === "La tartine va sous ton doigt." && localStorage.getItem("cv-doigt") === "1", null, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("Autre appareil : « Déconnecter les autres » pendant la vérification d'un code, une seule confirmation ouverte", async () => {
    const code = await codeOf(await joinApi("Course" + hex(4)));
    const { context, p } = await freshPage(await joinApi("Coureur" + hex(4)));
    try {
      await p.goto(BASE + "/");
      await p.locator("#settingsBtn").click({ timeout: WAIT_MS });
      await p.locator("#mergeBtn").click({ timeout: WAIT_MS });
      await p.fill("#mergeInput", code);
      await p.route("**/api/link", async (route) => {
        await wait(1500);
        await route.continue();
      });
      const answered = p.waitForResponse((res) => new URL(res.url()).pathname === "/api/link", { timeout: WAIT_MS });
      await p.locator("#mergeForm button").click();
      await p.locator("#outBtn").click();
      await answered;
      await wait(300);
      if (await p.locator("#mergeAsk").isVisible()) throw new Error("« Réunir » et « Déconnecter » ouverts ensemble");
      if (!(await p.locator("#outAsk").isVisible())) throw new Error("la confirmation de « Déconnecter les autres » a disparu");
    } finally {
      await context.close();
    }
  });
  await step("clavier : Espace joue après un clic de souris sur la tartine", async () => {
    const { context, p } = await freshPage(await joinApi("Clavier" + hex(4)));
    try {
      await p.goto(BASE + "/?garnitures=toutes");
      await p.locator("#pickToast").click({ timeout: WAIT_MS });
      await p.locator("#pickToast").click();
      await p.keyboard.press("Space");
      await p.locator("#hud").waitFor({ state: "visible", timeout: 3000 });
    } finally {
      await context.close();
    }
  });
  await step("clavier : choix de garniture ouvert puis Paramètres au clavier, le premier Échap revient", async () => {
    const { context, p } = await freshPage(await joinApi("Echap" + hex(4)));
    try {
      await p.goto(BASE + "/?garnitures=toutes");
      await p.locator("#pickToast").click({ timeout: WAIT_MS });
      await p.keyboard.press("Tab");
      await p.focus("#settingsBtn");
      await p.keyboard.press("Enter");
      await p.locator("#settings").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.keyboard.press("Escape");
      await p.locator("#menu").waitFor({ state: "visible", timeout: 3000 });
    } finally {
      await context.close();
    }
  });
  await step("code de liaison scanné sur un appareil dont le compte revient par le cookie : « Réunir » proposé", async () => {
    const kept = await joinApi("Cookie" + hex(4)), code = await codeOf(await joinApi("Lien" + hex(4)));
    const { context, p } = await freshPage(null);
    try {
      await p.route("**/api/resume", async (route) => {
        await wait(300);
        await route.fulfill({ json: { token: kept } });
      });
      await p.goto(BASE + "/#lier=" + code);
      await p.locator("#mergeAsk").waitFor({ state: "visible", timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("fusion faite mais réponse perdue : « Comptes réunis », pas « Pas de réseau »", async () => {
    const code = await codeOf(await joinApi("Garde" + hex(4)));
    const { context, p } = await freshPage(await joinApi("Part" + hex(4)));
    try {
      await p.goto(BASE + "/");
      await p.locator("#settingsBtn").click({ timeout: WAIT_MS });
      await p.locator("#mergeBtn").click({ timeout: WAIT_MS });
      await p.fill("#mergeInput", code);
      await p.locator("#mergeForm button").click();
      await p.locator("#mergeAsk").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.route("**/api/link", async (route) => {
        await route.fetch();
        await route.abort();
      });
      await p.locator("#mergeYes").click();
      await p.waitForFunction(() => document.getElementById("mergeNote").textContent.startsWith("Comptes réunis"), null, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  const boardOf = async (tok) => (await (await fetch(BASE + "/api/board", { headers: { ...apiHeaders, authorization: "Bearer " + tok } })).json()).me;
  await step("pseudo déjà pris : l'erreur propose « J'ai déjà un compte », et l'écran du code dit où le trouver", async () => {
    const taken = "Pris" + hex(4);
    await joinApi(taken);
    const { context, p } = await freshPage(null);
    try {
      await p.goto(BASE + "/");
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.fill("#pseudo", taken);
      await p.locator("#joinForm button").first().click();
      await p.waitForFunction(() => document.getElementById("joinError").textContent.includes("J'ai déjà un compte"), null, { timeout: WAIT_MS });
      await p.locator("#haveAccount").click();
      await p.locator("#linkHelp").waitFor({ state: "visible", timeout: WAIT_MS });
      if (!/Mon\s+code/.test(await p.locator("#linkHelp").textContent())) throw new Error("l'aide ne dit pas où trouver le code");
      if (await p.locator("#inApp").isVisible()) throw new Error("message des applis affiché dans un vrai navigateur");
    } finally {
      await context.close();
    }
  });
  await step("dans Snapchat : un message renvoie vers Safari, « Copier le lien » copie l'adresse du jeu", async () => {
    const userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/27.2 Mobile/15E148 Snapchat/14.30.0.33";
    const { context, p } = await freshPage(null, null, { userAgent });
    try {
      await p.addInitScript(() => Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async (text) => { window.__copied = text; } } }));
      await p.goto(BASE + "/");
      await p.locator("#inApp").waitFor({ state: "visible", timeout: WAIT_MS });
      const text = await p.locator("#inAppText").textContent();
      if (!text.includes("Snapchat") || !text.includes("Safari")) throw new Error(text);
      await p.locator("#inAppCopy").click();
      await p.waitForFunction((url) => window.__copied === url, BASE + "/", { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
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
  await step("Infos ouvert après un entraînement : Espace ne relance pas l'entraînement", async () => {
    await shown("over", RUN_MS);
    await wait(600);
    await click("infoBtn");
    await shown("info");
    await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
    await page.keyboard.press("Space");
    await wait(500);
    if (!(await $("#info").isVisible()) || (await $("#hud").isVisible())) throw new Error("Infos fermé par Espace, entraînement relancé");
    await click("infoBack");
    await shown("over");
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
    if (await other.locator("#prizes").isVisible()) throw new Error("consos du bar affichées hors soirée");
    asks = 0;
    for (let i = 0; i < 12; i++) {
      await other.clock.runFor(10000);
      await wait(200);
    }
    await context.close();
    if (asks < 1 || asks > 3) throw new Error(asks + " demande(s) du classement en 2 min");
  });
  if (!SAFARI) await step("écran géant ouvert seul dans un navigateur neuf : il se met en cache et se recharge sans réseau", async () => {
    const context = await browser.newContext();
    const other = await context.newPage();
    try {
      await other.goto(BASE + "/ecran", { waitUntil: "networkidle" });
      const cached = await other.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((ok) => setTimeout(() => ok(false), 10000))]));
      if (!cached) throw new Error("l'écran géant n'installe pas le cache hors ligne");
      await context.setOffline(true);
      await other.reload();
      await other.locator(".wall").waitFor({ state: "visible", timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  if (!SAFARI) await step("jeu ouvert dans un navigateur neuf : bruitages et logo Google en cache, et sans réseau une autre page ne retombe pas sur l'accueil du jeu", async () => {
    const context = await browser.newContext();
    const other = await context.newPage();
    try {
      await other.goto(BASE + "/", { waitUntil: "networkidle" });
      const cached = await other.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(() => true), new Promise((ok) => setTimeout(() => ok(false), 10000))]));
      if (!cached) throw new Error("le jeu n'installe pas le cache hors ligne");
      const served = [];
      for (const name of ["start", "near", "death", "record", "first"]) {
        const res = await fetch(`${BASE}/sfx/${name}.mp3`);
        await res.arrayBuffer();
        if (res.ok) served.push(`/sfx/${name}.mp3`);
      }
      const missing = await other.evaluate(async (files) => (await Promise.all(files.map(async (f) => ((await caches.match(f)) ? null : f)))).filter(Boolean), ["/icons/google.svg", ...served]);
      if (missing.length) throw new Error("pas en cache : " + missing.join(", "));
      await context.setOffline(true);
      for (const path of ["/confidentialite", "/depart"]) {
        await other.goto(BASE + path).catch(() => null);
        if (await other.evaluate(() => !!document.getElementById("menu")).catch(() => false)) throw new Error(path + " sans réseau affiche l'accueil du jeu");
      }
    } finally {
      await context.close();
    }
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
  await step("écran géant : réponse lente, le compte à rebours ne recule pas, consos et grand titre cachés dans le dernier quart d'heure", async () => {
    const other = await browser.newPage({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
    watch(other);
    await other.routeWebSocket(/\/api\/live$/, (ws) => ws.close());
    const LAG = 3000, closesAt = Date.now() + 600000;
    await other.route((url) => url.pathname === "/api/ecran", async (route) => {
      await wait(LAG);
      const now = Date.now();
      await wait(LAG);
      const event = { name: "Soirée lente", opensAt: closesAt - 3600000, closesAt, finalAt: closesAt + 15000, status: "open" };
      await route.fulfill({ json: { now, version: "dev", stamp: "1", next: null, event, last: 1, count: 0, feed: [], top: [] } }).catch(() => {});
    });
    try {
      await other.goto(BASE + "/ecran");
      await other.waitForFunction(() => document.getElementById("countdown").textContent.startsWith("Fin dans"), null, { timeout: WAIT_MS });
      const ahead = await other.evaluate((end) => new Promise((ok) => {
        const el = document.getElementById("countdown");
        new MutationObserver((_, seen) => {
          seen.disconnect();
          const [m, s] = el.querySelector(".digits").textContent.split(":").map(Number);
          ok(m * 60 + s - (end - Date.now()) / 1000);
        }).observe(el, { childList: true });
      }), closesAt);
      if (ahead < -0.5 || ahead > 2) throw new Error(`compte à rebours décalé de ${ahead.toFixed(1)} s`);
      const shown = await other.evaluate(() => ["#prizes", ".head h1"].filter((css) => getComputedStyle(document.querySelector(css)).display !== "none"));
      if (shown.length) throw new Error("affichés dans le dernier quart d'heure : " + shown.join(", "));
    } finally {
      await other.close();
    }
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
  await step("admin : retirer et réintégrer demandent confirmation avec le pseudo, « Annuler » ne change rien", async () => {
    const row = admin.locator("#players li", { hasText: pseudo });
    await admin.fill("#playerSearch", pseudo);
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
    asked = dialog(admin, false);
    await row.locator("button", { hasText: "Réintégrer" }).click();
    if (!(await asked).includes(pseudo)) throw new Error("mauvaise question");
    await wait(500);
    if (!(await out())) throw new Error("réintégré sans confirmation");
    asked = dialog(admin, true);
    await row.locator("button", { hasText: "Réintégrer" }).click();
    await asked;
    await admin.waitForFunction((p) => [...document.querySelectorAll("#players li:not(.out)")].some((li) => li.textContent.includes(p)), pseudo, { timeout: WAIT_MS });
  });
  await step("admin : réunir deux comptes demande confirmation avec les deux pseudos, « Annuler » ne réunit rien, puis réunis", async () => {
    const keepName = "Garde" + hex(4), fromName = "Fond" + hex(4), fromTok = await joinApi(fromName);
    await joinApi(keepName);
    await admin.locator("#mergeCard").waitFor({ state: "visible", timeout: WAIT_MS });
    await admin.fill("#mergeKeep", keepName);
    await admin.fill("#mergeFrom", fromName);
    let asked = dialog(admin, false);
    await admin.locator("#mergeForm button").click();
    const question = await asked;
    if (!question.includes(keepName) || !question.includes(fromName)) throw new Error(question);
    await wait(500);
    if ((await boardOf(fromTok)).pseudo !== fromName) throw new Error("réunis sans confirmation");
    asked = dialog(admin, true);
    await admin.locator("#mergeForm button").click();
    await asked;
    await admin.waitForFunction((t) => document.getElementById("mergeMsg").textContent === t, fromName + " est réuni dans " + keepName + ".", { timeout: WAIT_MS });
    if ((await boardOf(fromTok)).pseudo !== keepName) throw new Error("l'appareil du compte réuni n'est pas sur le compte gardé");
  });
  await step("écran géant : à l'heure du début, la soirée s'affiche tout de suite, pas « Début dans 0:00 »", async () => {
    const headers = { "content-type": "application/json", "x-app-version": "dev", "x-admin-key": KEY };
    const opensAt = Date.now() + 4000;
    const made = await fetch(BASE + "/api/admin/events", { method: "POST", headers, body: JSON.stringify({ name: "Soirée qui commence", opensAt, closesAt: opensAt + 3600000 }) });
    if (!made.ok) throw new Error("soirée pas créée : " + made.status);
    const other = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    watch(other);
    try {
      await other.goto(BASE + "/ecran");
      await other.waitForFunction(() => document.getElementById("countdown").textContent.startsWith("Début dans"), null, { timeout: WAIT_MS });
      await wait(Math.max(0, opensAt - Date.now()));
      await other.waitForFunction(() => document.getElementById("title").textContent === "Soirée qui commence", null, { timeout: 4000 });
    } finally {
      await other.close();
      await fetch(BASE + "/api/admin/events/current", { method: "PATCH", headers, body: JSON.stringify({ opensAt: Date.now() - 3600000, closesAt: Date.now() - 60000 }) });
    }
  });
  await step("admin : créer une soirée", async () => {
    await admin.locator("#newEventBtn").click();
    await admin.fill("#eventNameInput", "Soirée du navigateur");
    await admin.fill("#eventStartInput", await at(Date.now() - 3600000));
    await admin.fill("#eventEndInput", await at(Date.now() + 3600000));
    await admin.locator("#eventForm button[type=submit]").click();
    await admin.waitForFunction(() => document.getElementById("eventName").textContent === "Soirée du navigateur", null, { timeout: WAIT_MS });
    if ((await status()) !== "Soirée en cours") throw new Error(await status());
  });
  await step("admin, onglet Soirée : « Retirer » ne retire que de la soirée, le joueur reste au général", async () => {
    const name = "Fete" + hex(4), tok = await joinApi(name);
    const auth = { ...apiHeaders, authorization: "Bearer " + tok };
    const { runId } = await (await fetch(BASE + "/api/runs", { method: "POST", headers: auth, body: "{}" })).json();
    await fetch(BASE + "/api/runs/" + runId, { method: "POST", headers: auth, body: JSON.stringify({ score: 400 }) });
    await admin.locator('.scope[data-scope="event"]').click();
    await admin.fill("#playerSearch", name);
    const row = admin.locator("#players li", { hasText: name });
    await row.waitFor({ timeout: WAIT_MS });
    let asked = dialog(admin, true);
    await row.locator("button").click();
    const question = await asked;
    if (!question.includes("de la soirée") || !question.includes("reste au classement général")) throw new Error(question);
    await admin.waitForFunction((n) => [...document.querySelectorAll("#players li.out")].some((li) => li.textContent.includes(n) && li.textContent.includes("retiré de la soirée")), name, { timeout: WAIT_MS });
    const me = await boardOf(tok);
    if (me.eventRank !== null || !me.rank) throw new Error(`place en soirée ${me.eventRank}, au général ${me.rank}`);
    asked = dialog(admin, true);
    await row.locator("button", { hasText: "Réintégrer" }).click();
    if (!(await asked).includes("au classement de la soirée")) throw new Error("mauvaise question");
    await admin.waitForFunction((n) => [...document.querySelectorAll("#players li:not(.out)")].some((li) => li.textContent.includes(n)), name, { timeout: WAIT_MS });
    if (!(await boardOf(tok)).eventRank) throw new Error("pas revenu dans la soirée");
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
    if (!(await other.locator("#prizes").isVisible()) || !(await other.locator("#prizes").textContent()).includes("3 consos au 1er, 2 au 2e, 1 au 3e")) throw new Error("consos du bar absentes pendant la soirée");
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
    if (took > 2500) throw new Error(`record affiché en ${took} ms`);
    if (asks > 5) throw new Error(`${asks} relectures pour 8 inscriptions en 1 s`);
  });
  await step("connexion Google : bouton visible une fois configurée, retour sans compte lié expliqué, adresse nettoyée", async () => {
    const other = await browser.newPage({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
    watch(other);
    await other.route((url) => url.pathname === "/api/board", async (route) => {
      const res = await route.fetch();
      await route.fulfill({ response: res, json: { ...(await res.json()), google: true } });
    });
    try {
      await other.goto(BASE + "/#google=inconnu");
      await other.locator("#googleLogin").waitFor({ state: "visible", timeout: WAIT_MS });
      const text = await other.locator("#linkError").textContent();
      if (!text.includes("Aucun joueur")) throw new Error("message : " + text);
      if (new URL(other.url()).hash) throw new Error("résultat resté dans l'adresse");
    } finally {
      await other.close();
    }
  });
  await step("écran géant : « Nouveau n°1 » pour un vrai record, même enregistré pendant la lecture du classement d'avant, pas pour un n°1 retiré puis réintégré", async () => {
    const other = await browser.newPage({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
    watch(other);
    await other.route((url) => url.pathname === "/api/ecran", async (route) => {
      const res = await route.fetch();
      const body = await res.json();
      await route.fulfill({ response: res, json: { ...body, now: body.now + 60000 } });
    });
    try {
      await other.goto(BASE + "/ecran");
      await other.waitForFunction(() => document.getElementById("title").textContent === "Soirée du navigateur", null, { timeout: WAIT_MS });
      await wait(1000);
      const headers = { "content-type": "application/json", "x-app-version": "dev" };
      const admin = { ...headers, "x-admin-key": KEY };
      const name = "Roi" + hex(5);
      const { token } = await (await fetch(BASE + "/api/join", { method: "POST", headers, body: JSON.stringify({ pseudo: name, clientId: hex(32) }) })).json();
      const auth = { ...headers, authorization: "Bearer " + token };
      const { runId } = await (await fetch(BASE + "/api/runs", { method: "POST", headers: auth, body: "{}" })).json();
      await fetch(BASE + "/api/runs/" + runId, { method: "POST", headers: auth, body: JSON.stringify({ score: 900 }) });
      await other.locator("#crownName", { hasText: name }).waitFor({ timeout: WAIT_MS });
      await other.waitForFunction(() => document.getElementById("crown").hidden, null, { timeout: 10000 });
      const row = other.locator("#list li", { hasText: name }).first();
      const id = await row.getAttribute("data-id");
      await fetch(BASE + `/api/admin/players/${id}/ban`, { method: "POST", headers: admin, body: JSON.stringify({ banned: true }) });
      await row.waitFor({ state: "detached", timeout: WAIT_MS });
      await fetch(BASE + `/api/admin/players/${id}/ban`, { method: "POST", headers: admin, body: JSON.stringify({ banned: false }) });
      await other.locator("#list li", { hasText: name }).first().waitFor({ timeout: WAIT_MS });
      await wait(500);
      if (!(await other.locator("#crown").isHidden())) throw new Error("« Nouveau n°1 » fêté pour un joueur réintégré");
    } finally {
      await other.close();
    }
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
    await admin.locator("#endForm button[type=submit]").click();
    if (!(await asked).includes("déjà passée")) throw new Error("mauvaise question");
    await wait(500);
    if (patched || (await admin.locator("#endForm").isHidden()) || (await status()) !== "Soirée en cours") throw new Error("soirée modifiée sans confirmation");
    asked = dialog(admin, true);
    await admin.locator("#endForm button[type=submit]").click();
    await asked;
    await admin.waitForFunction(() => document.getElementById("eventStatus").textContent === "Dernière soirée", null, { timeout: WAIT_MS });
  });
  await step("admin dans Paramètres : la page défile d'un seul tenant, « Retour » tout en bas", async () => {
    await admin.goto(BASE + "/");
    await admin.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
    if (await admin.locator("#joinForm").isVisible()) {
      await admin.fill("#pseudo", "Adm" + hex(6));
      await admin.locator("#joinForm button").first().click();
    }
    await admin.locator("#settingsBtn").click();
    await admin.locator('#settingsTabs [data-tab="admin"]').click();
    await admin.frameLocator("#settingsAdmin iframe").locator("#app").waitFor({ state: "visible", timeout: WAIT_MS });
    await admin.waitForFunction(() => {
      const frame = document.querySelector("#settingsAdmin iframe"), root = frame.contentDocument.documentElement;
      return root.scrollHeight <= root.clientHeight && frame.getBoundingClientRect().bottom <= document.getElementById("settingsBack").getBoundingClientRect().top;
    }, null, { timeout: WAIT_MS });
  });
  await step("admin dans Paramètres : Échap après un clic dans le tableau de bord revient à l'accueil", async () => {
    await admin.frameLocator("#settingsAdmin iframe").locator("h2:visible").first().click();
    await admin.keyboard.press("Escape");
    await admin.locator("#menu").waitFor({ state: "visible", timeout: WAIT_MS });
  });
  await step("admin dans Paramètres sans réseau : l'onglet Admin ne fait pas d'erreur", async () => {
    const before = problems.length;
    await admin.context().setOffline(true);
    try {
      await admin.locator("#settingsBtn").click();
      await admin.locator('#settingsTabs [data-tab="admin"]').click();
      await wait(1500);
      if (problems.length > before) throw new Error(problems.slice(before).join(" ; "));
    } finally {
      await admin.context().setOffline(false);
      await admin.close();
    }
  });
  const back = (p) => p.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
  for (const direct of [true, false]) {
    await step(`écran géant ${direct ? "en direct" : "sans WebSocket, réseau coupé à la fin"} : « Soirée finie ! » sans confettis à zéro, « Bravo » et confettis sur un classement relu après les derniers scores`, async () => {
      const other = await browser.newPage({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
      watch(other);
      let sockets = 0;
      other.on("websocket", () => sockets++);
      if (!direct) await other.routeWebSocket(/\/api\/live$/, (ws) => ws.close());
      const row = (rank, pseudo, best) => ({ rank, id: pseudo, pseudo, best, at: 1, me: false });
      let closesAt = Date.now() + 3600000, sure = closesAt, down = false;
      await other.route((url) => url.pathname === "/api/ecran", (route) => {
        if (down) return route.abort();
        const now = Date.now(), late = now >= sure, stamp = late ? "2" : "1";
        const head = { now, version: "dev", stamp, next: null, event: { name: "Soirée finale", opensAt: closesAt - 3600000, closesAt, finalAt: sure - SETTLE_MS, status: now < closesAt ? "open" : "closed" } };
        if (new URL(route.request().url()).searchParams.get("v") === stamp) return route.fulfill({ json: { ...head, same: true } });
        return route.fulfill({ json: { ...head, last: 1, count: 2, feed: [], top: late ? [row(1, "Max", 900), row(2, "Lou", 800)] : [row(1, "Lou", 800), row(2, "Max", 700)] } });
      });
      const party = () => other.evaluate(() => [document.getElementById("party").hasAttribute("width"), !!document.querySelector("#list li.cheer"), document.getElementById("list").classList.contains("over")]);
      const banner = (text) => other.locator("#countdown", { hasText: text });
      try {
        await other.goto(BASE + "/ecran");
        await other.waitForFunction(() => document.getElementById("title").textContent === "Soirée finale", null, { timeout: WAIT_MS });
        for (let i = 0; i < 50 && direct && !sockets; i++) await wait(100);
        await wait(500);
        closesAt = Date.now() + 1500;
        sure = closesAt + 5000;
        await back(other);
        await banner("Soirée finie !").waitFor({ timeout: WAIT_MS });
        if ((await party()).some(Boolean)) throw new Error("fête avant les derniers scores");
        if (!direct) {
          down = true;
          await other.locator("#offline").waitFor({ state: "visible", timeout: WAIT_MS });
          await wait(Math.max(0, sure - Date.now()) + 2500);
          if (!(await banner("Soirée finie !").count())) throw new Error("gagnant annoncé sans classement relu");
          down = false;
        }
        await banner("Bravo Max !").waitFor({ timeout: WAIT_MS });
        const after = await party();
        if (!after.every(Boolean)) throw new Error("fête incomplète : " + after);
      } finally {
        await other.close();
      }
    });
  }
  await step("écran géant sans WebSocket : « Bravo » attend une relecture complète du top, pas une demande légère qui dépasse la marge", async () => {
    const other = await browser.newPage({ viewport: { width: 1280, height: 720 }, serviceWorkers: "block" });
    watch(other);
    await other.routeWebSocket(/\/api\/live$/, (ws) => ws.close());
    const row = (rank, pseudo, best) => ({ rank, id: pseudo, pseudo, best, at: 1, me: false });
    let closesAt = Date.now() + 3600000, sure = closesAt + 9000, gone = false, crossed = false;
    await other.route((url) => url.pathname === "/api/ecran", (route) => {
      const real = Date.now(), light = new URL(route.request().url()).searchParams.get("v") === "1";
      if (light && real >= sure) crossed = true;
      const now = crossed ? real : Math.min(real, sure - 5000);
      const head = { now, version: "dev", stamp: "1", next: null, event: { name: "Soirée tranchée", opensAt: closesAt - 3600000, closesAt, finalAt: sure - SETTLE_MS, status: now < closesAt ? "open" : "closed" } };
      if (light) return route.fulfill({ json: { ...head, same: true } });
      return route.fulfill({ json: { ...head, last: 1, count: 2, feed: [], top: gone ? [row(1, "Max", 700)] : [row(1, "Lou", 800), row(2, "Max", 700)] } });
    });
    const banner = (text) => other.locator("#countdown", { hasText: text });
    try {
      await other.goto(BASE + "/ecran");
      await other.waitForFunction(() => document.getElementById("title").textContent === "Soirée tranchée", null, { timeout: WAIT_MS });
      await wait(500);
      closesAt = Date.now() + 1500;
      sure = closesAt + 9000;
      await back(other);
      await banner("Soirée finie !").waitFor({ timeout: WAIT_MS });
      gone = true;
      await banner("Bravo").waitFor({ timeout: WAIT_MS });
      const text = await other.locator("#countdown").textContent();
      if (text !== "Bravo Max !") throw new Error(text + " : le 1er retiré pendant la marge est fêté");
    } finally {
      await other.close();
    }
  });
  const playersRead = (url) => url.pathname === "/api/admin/players";
  const signIn = async (p) => {
    await p.goto(BASE + "/admin");
    await p.fill("#loginName", "Navigateur");
    await p.fill("#loginKey", KEY);
    await p.locator("#loginForm button").first().click();
    await p.locator("#app").waitFor({ state: "visible", timeout: WAIT_MS });
    await p.waitForLoadState("networkidle");
  };
  await step("admin : relecture toutes les 30 s, tout de suite au retour sur l'onglet, nouvel essai 10 s après un démarrage raté", async () => {
    const other = await browser.newPage({ serviceWorkers: "block" });
    watch(other);
    await other.clock.install();
    let reads = 0;
    other.on("request", (r) => {
      if (playersRead(new URL(r.url()))) reads++;
    });
    try {
      await signIn(other);
      reads = 0;
      for (let i = 0; i < 9; i++) {
        await other.clock.runFor(10000);
        await wait(200);
      }
      if (reads < 2 || reads > 4) throw new Error(reads + " relecture(s) en 90 s");
      reads = 0;
      await back(other);
      await wait(500);
      if (reads !== 1) throw new Error(reads + " relecture(s) au retour sur l'onglet");
      const who = (url) => url.pathname === "/api/admin/me";
      await other.route(who, (route) => route.abort());
      await other.reload();
      await other.locator("#playersMsg", { hasText: "réessaie" }).waitFor({ timeout: WAIT_MS });
      await other.unroute(who);
      await other.clock.runFor(11000);
      await other.locator("#mergeCard").waitFor({ state: "visible", timeout: 3000 });
    } finally {
      await other.close();
    }
  });
  await step("admin : relecture ratée, message au-dessus de la liste avec l'heure des données, effacé à la relecture suivante", async () => {
    const other = await browser.newPage({ serviceWorkers: "block" });
    watch(other);
    await other.clock.install({ time: new Date(2026, 10, 7, 21, 4) });
    try {
      await signIn(other);
      await other.route(playersRead, (route) => route.abort());
      await other.clock.runFor(300000);
      await other.locator("#playersMsg", { hasText: "Données de 21h04." }).waitFor({ timeout: WAIT_MS });
      const above = await other.evaluate(() => document.getElementById("playersMsg").getBoundingClientRect().bottom <= document.getElementById("players").getBoundingClientRect().top);
      if (!above) throw new Error("message sous la liste");
      await other.unroute(playersRead);
      await back(other);
      await other.locator("#playersMsg").waitFor({ state: "hidden", timeout: WAIT_MS });
    } finally {
      await other.close();
    }
  });
  await step("admin : premier chargement raté, pas de « Aucune soirée » inventé, le texte vient du serveur", async () => {
    const other = await browser.newPage({ serviceWorkers: "block" });
    watch(other);
    let answer = (route) => route.abort();
    await other.route(playersRead, (route) => answer(route));
    try {
      await signIn(other);
      await other.locator("#playersMsg").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(1200);
      const name = await other.locator("#eventName").textContent(), end = await other.locator("#eventEnd").textContent(), count = await other.locator("#statPlayers").textContent();
      if (name.includes("Aucune soirée") || end.includes("Crée une soirée") || count !== "-") throw new Error([name, end, count].join(" / "));
      answer = (route) => route.fulfill({ json: { scope: "event", event: null, players: [], stats: { players: 0, runs: 0 } } });
      await back(other);
      await other.locator("#eventName", { hasText: "Aucune soirée" }).waitFor({ timeout: WAIT_MS });
    } finally {
      await other.close();
    }
  });
  await step("admin : réponse 200 illisible (portail wifi), « Pas de réseau » au lieu de « Aucune soirée » ou d'une erreur de code", async () => {
    const other = await browser.newPage({ serviceWorkers: "block" });
    watch(other);
    const portal = (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<html>Portail du wifi</html>" });
    const unread = () => other.locator("#playersMsg", { hasText: "Pas de réseau, réessaie." }).waitFor({ timeout: WAIT_MS });
    try {
      await signIn(other);
      const name = await other.locator("#eventName").textContent(), count = await other.locator("#statPlayers").textContent();
      await other.route(playersRead, portal);
      await back(other);
      await unread();
      const after = [await other.locator("#eventName").textContent(), await other.locator("#statPlayers").textContent()];
      if (after[0] !== name || after[1] !== count) throw new Error("données effacées : " + after.join(" / "));
      await other.route((url) => url.pathname === "/api/admin/me", portal);
      await other.reload();
      await unread();
    } finally {
      await other.close();
    }
  });
  await step("admin : début déplacé dans le futur sur une soirée ouverte, confirmation demandée, « Annuler » la laisse ouverte", async () => {
    const headers = { "content-type": "application/json", "x-app-version": "dev", "x-admin-key": KEY };
    const made = await fetch(BASE + "/api/admin/events", { method: "POST", headers, body: JSON.stringify({ name: "Soirée à déplacer", opensAt: Date.now() - 3600000, closesAt: Date.now() + 3600000 }) });
    if (!made.ok) throw new Error("soirée pas créée : " + made.status);
    const other = await browser.newPage();
    watch(other);
    let patched = 0;
    other.on("request", (r) => {
      if (r.method() === "PATCH") patched++;
    });
    const later = new Date(Date.now() + 1800000);
    later.setMinutes(later.getMinutes() - later.getTimezoneOffset());
    const state = () => other.locator("#eventStatus").textContent();
    const save = async () => {
      await other.locator("#endForm button[type=submit]").click();
      await other.locator("#endForm").waitFor({ state: "hidden", timeout: WAIT_MS });
    };
    try {
      await signIn(other);
      await other.locator("#editEndBtn").click();
      await other.fill("#editName", "Soirée renommée");
      await save();
      patched = 0;
      await other.locator("#editEndBtn").click();
      await other.fill("#startAt", later.toISOString().slice(0, 16));
      let asked = dialog(other, false);
      await other.locator("#endForm button[type=submit]").click();
      if (!(await asked).includes("futur")) throw new Error("mauvaise question");
      await wait(500);
      if (patched || (await state()) !== "Soirée en cours") throw new Error("soirée modifiée sans confirmation");
      asked = dialog(other, true);
      await other.locator("#endForm button[type=submit]").click();
      await asked;
      await other.waitForFunction(() => document.getElementById("eventStatus").textContent === "Prochaine soirée", null, { timeout: WAIT_MS });
      await other.locator("#editEndBtn").click();
      await save();
    } finally {
      await other.close();
      await fetch(BASE + "/api/admin/events/current", { method: "PATCH", headers, body: JSON.stringify({ opensAt: Date.now() - 3600000, closesAt: Date.now() - 60000 }) });
    }
  });
  await step("admin : soirée à venir supprimée depuis « Modifier », avec confirmation, « Annuler » la garde", async () => {
    const headers = { "content-type": "application/json", "x-app-version": "dev", "x-admin-key": KEY };
    const opensAt = Date.now() + 2 * 3600000;
    const made = await fetch(BASE + "/api/admin/events", { method: "POST", headers, body: JSON.stringify({ name: "Soirée à supprimer", opensAt, closesAt: opensAt + 3600000 }) });
    if (!made.ok) throw new Error("soirée pas créée : " + made.status);
    const current = async () => (await (await fetch(BASE + "/api/admin/players", { headers })).json()).event;
    const other = await browser.newPage();
    watch(other);
    try {
      await signIn(other);
      await other.locator("#editEndBtn").click();
      const remove = other.locator("#deleteEventBtn");
      await remove.waitFor({ state: "visible", timeout: WAIT_MS });
      let asked = dialog(other, false);
      await remove.click();
      if (!(await asked).includes("Soirée à supprimer")) throw new Error("mauvaise question");
      await wait(500);
      if ((await current()).name !== "Soirée à supprimer") throw new Error("supprimée sans confirmation");
      asked = dialog(other, true);
      await remove.click();
      await asked;
      await other.locator("#eventMsg", { hasText: "Soirée supprimée." }).waitFor({ timeout: WAIT_MS });
      const left = await current();
      if ((left && left.name === "Soirée à supprimer") || (await other.locator("#eventName").textContent()) === "Soirée à supprimer") throw new Error("soirée toujours là");
      if (await other.locator("#endForm").isVisible()) throw new Error("formulaire resté ouvert");
    } finally {
      await other.close();
      await fetch(BASE + "/api/admin/events/current", { method: "PATCH", headers, body: JSON.stringify({ opensAt: Date.now() - 3600000, closesAt: Date.now() - 60000 }) });
    }
  });
  await step("admin : Joueurs, Parties et Record sont sous les onglets du classement qu'ils comptent", async () => {
    const other = await browser.newPage();
    watch(other);
    try {
      await other.goto(BASE + "/admin");
      if (!(await other.locator("section:has(.scope) #statPlayers").count())) throw new Error("chiffres hors de la carte des onglets");
    } finally {
      await other.close();
    }
  });
  const mockedAdmin = async (viewport, { event: shown, shift, timezoneId } = {}) => {
    const HOUR = 3600000, now = Date.now();
    const fake = (i, extra = {}) => ({ id: "f" + i, pseudo: "Joueur" + String(i).padStart(2, "0"), best: 100000 - i * 100, banned: 0, removed: 0, runs: 3, suspect: null, active: false, ...extra });
    const players = Array.from({ length: 24 }, (_, i) => fake(i + 1)).concat(fake(25, { pseudo: "Élodie", best: 50 }));
    const event = shown || { id: 7, name: "Space Tartinade #3", opensAt: now - HOUR, closesAt: now + 3.5 * HOUR, status: "open" };
    const last = { version: "1.0.0", page: "/", platform: "iPhone", ua: "iPhone", standalone: false, device: "390x844", trail: "", stack: "" };
    const group = (id, onCurrent) => ({ id, kind: "erreur", message: "TypeError " + id, source: "/js/app/main.js:1:1", count: 1, sessions: 1, platforms: { iPhone: 1 }, firstAt: now - HOUR, lastAt: now - 2 * HOUR, versions: 1, onCurrent, last });
    const other = await browser.newPage({ serviceWorkers: "block", ...(viewport ? { viewport } : {}), ...(timezoneId ? { timezoneId } : {}) });
    watch(other);
    await other.route(playersRead, (route) => route.fulfill({ json: { ...(shift === undefined ? {} : { now: Date.now() + shift }), scope: "event", event, players, stats: { players: 25, runs: 75 } } }));
    await other.route((url) => url.pathname === "/api/admin/errors", (route) => route.fulfill({ json: { groups: [group("a", true), group("b", false)] } }));
    await signIn(other);
    await other.locator("#players li").first().waitFor({ timeout: WAIT_MS });
    return other;
  };
  await step("admin sur 320 px : 20 joueurs puis « Voir les 5 autres », recherche sans accents avec le vrai rang, onglets sur une ligne, soirée en cours en jaune", async () => {
    const other = await mockedAdmin({ width: 320, height: 568 });
    try {
      const first = await other.evaluate(() => ({
        rows: document.querySelectorAll("#players li").length,
        more: document.getElementById("moreBtn").textContent,
        tabs: [...document.querySelectorAll(".scope")].map((b) => Math.round(b.getBoundingClientRect().top)),
        status: document.getElementById("eventStatus").textContent,
        color: getComputedStyle(document.getElementById("eventStatus")).color
      }));
      if (first.rows !== 20 || first.more !== "Voir les 5 autres" || new Set(first.tabs).size !== 1 || first.status !== "Soirée en cours" || first.color !== "rgb(255, 207, 51)") throw new Error(JSON.stringify(first));
      await other.fill("#playerSearch", "ELO");
      const found = await other.evaluate(() => [...document.querySelectorAll("#players li")].map((li) => li.querySelector(".pos").textContent + " " + li.querySelector(".name").textContent));
      if (found.join() !== "25 Élodie" || await other.locator("#moreBtn").isVisible()) throw new Error(JSON.stringify(found));
      await other.fill("#playerSearch", "");
      await other.locator("#moreBtn").click();
      const all = await other.locator("#players li").count();
      if (all !== 25 || await other.locator("#moreBtn").isVisible()) throw new Error(all + " lignes");
    } finally {
      await other.close();
    }
  });
  await step("admin : « Nouvelle soirée » en jaune une fois ouvert, nom et fin pré-remplis, « Annuler » referme", async () => {
    const other = await mockedAdmin();
    const form = () => other.evaluate(() => {
      const ms = (id) => new Date(document.getElementById(id).value).getTime();
      const btn = document.getElementById("newEventBtn");
      return { open: !document.getElementById("eventForm").hidden, expanded: btn.getAttribute("aria-expanded"), color: getComputedStyle(btn).backgroundColor, name: document.getElementById("eventNameInput").value, hours: (ms("eventEndInput") - ms("eventStartInput")) / 3600000 };
    });
    try {
      await other.locator("#newEventBtn").click();
      const opened = await form();
      if (!opened.open || opened.expanded !== "true" || opened.color !== "rgb(255, 207, 51)" || opened.name !== "Space Tartinade #4" || opened.hours !== 4.5) throw new Error(JSON.stringify(opened));
      await other.fill("#eventStartInput", "2026-12-05T19:00");
      if ((await other.inputValue("#eventEndInput")) !== "2026-12-05T23:30") throw new Error("fin pas recalée : " + await other.inputValue("#eventEndInput"));
      await other.fill("#eventEndInput", "2026-12-06T01:00");
      await other.fill("#eventStartInput", "2026-12-05T20:00");
      if ((await other.inputValue("#eventEndInput")) !== "2026-12-06T01:00") throw new Error("fin choisie écrasée");
      await other.locator("#editEndBtn").click();
      if (await other.locator("#eventForm").isVisible() || (await other.getAttribute("#newEventBtn", "aria-expanded")) !== "false" || (await other.getAttribute("#editEndBtn", "aria-expanded")) !== "true") throw new Error("deux formulaires ouverts");
      await other.locator("#endForm [data-close]").click();
      const closed = await other.evaluate(() => ({ edit: !document.getElementById("endForm").hidden, expanded: document.getElementById("editEndBtn").getAttribute("aria-expanded") }));
      if (closed.edit || closed.expanded !== "false") throw new Error(JSON.stringify(closed));
    } finally {
      await other.close();
    }
  });
  const edited = async (p) => {
    const sent = [];
    await p.route((url) => url.pathname === "/api/admin/events/current", (route) => {
      sent.push(route.request().postDataJSON());
      return route.fulfill({ json: { ok: true } });
    });
    return sent;
  };
  await step("admin : onglet qui ne charge pas, « Retirer » suit le classement affiché, pas l'onglet demandé", async () => {
    const other = await mockedAdmin();
    try {
      await other.route((url) => playersRead(url) && url.searchParams.has("scope"), (route) => route.abort());
      await other.locator('.scope[data-scope="general"]').click();
      await other.locator("#playersMsg").waitFor({ state: "visible", timeout: WAIT_MS });
      await other.fill("#playerSearch", "Joueur01");
      const asked = dialog(other, false);
      await other.locator("#players li", { hasText: "Joueur01" }).locator("button").click();
      const question = await asked;
      if (!question.includes("du classement de la soirée")) throw new Error(question);
      if ((await other.getAttribute('.scope[data-scope="event"]', "aria-selected")) !== "true") throw new Error("onglet Soirée plus marqué");
    } finally {
      await other.close();
    }
  });
  await step("admin : état de la soirée et confirmations à l'heure du serveur, pas à celle de l'appareil", async () => {
    const HOUR = 3600000, now = Date.now();
    const other = await mockedAdmin(undefined, { shift: -2 * HOUR, event: { id: 7, name: "Space Tartinade #3", opensAt: now - 3 * HOUR, closesAt: now - HOUR, status: "open" } });
    const asked = [];
    other.on("dialog", (d) => {
      asked.push(d.message());
      d.dismiss();
    });
    try {
      const sent = await edited(other);
      const state = await other.evaluate(() => [document.getElementById("eventStatus").textContent, !document.getElementById("editEndBtn").hidden]);
      if (state[0] !== "Soirée en cours" || !state[1]) throw new Error(JSON.stringify(state));
      await other.locator("#editEndBtn").click();
      if (await other.locator("#deleteEventBtn").isVisible()) throw new Error("« Supprimer » proposé pour une soirée ouverte");
      await other.locator("#endForm button[type=submit]").click();
      await other.locator("#endForm").waitFor({ state: "hidden", timeout: WAIT_MS });
      if (asked.length || sent.length !== 1) throw new Error("confirmation demandée : " + asked.join(" / "));
    } finally {
      await other.close();
    }
  });
  await step("admin : « Modifier » pour renommer garde l'heure exacte, même dans l'heure répétée du passage à l'heure d'hiver", async () => {
    const opensAt = Date.UTC(2027, 9, 30, 18), closesAt = Date.UTC(2027, 9, 31, 1, 30);
    const other = await mockedAdmin(undefined, { timezoneId: "Europe/Paris", event: { id: 7, name: "Space Tartinade #3", opensAt, closesAt, status: "upcoming" } });
    try {
      const sent = await edited(other);
      await other.locator("#editEndBtn").click();
      if ((await other.inputValue("#endAt")) !== "2027-10-31T02:30") throw new Error("fin affichée : " + await other.inputValue("#endAt"));
      await other.fill("#editName", "Space Tartinade #4");
      await other.locator("#endForm button[type=submit]").click();
      await other.locator("#endForm").waitFor({ state: "hidden", timeout: WAIT_MS });
      const [body] = sent;
      if (!body || body.name !== "Space Tartinade #4" || (body.opensAt !== undefined && body.opensAt !== opensAt) || (body.closesAt !== undefined && body.closesAt !== closesAt)) throw new Error(JSON.stringify(body));
    } finally {
      await other.close();
    }
  });
  await step("admin : erreur « pas revue depuis la dernière mise en ligne » seulement quand c'est vrai, équipe sans lettre de rôle", async () => {
    const other = await mockedAdmin();
    try {
      await other.locator("#errorsBtn").click();
      await other.locator("#errors li").nth(1).waitFor({ timeout: WAIT_MS });
      const metas = await other.evaluate(() => [...document.querySelectorAll("#errors summary")].map((s) => s.textContent));
      if (metas[0].includes("version en ligne") || metas[0].includes("pas revue") || !metas[1].includes("pas revue depuis la dernière mise en ligne")) throw new Error(JSON.stringify(metas));
      await other.locator("#team li").first().waitFor({ timeout: WAIT_MS });
      if (await other.locator("#team .pos").count()) throw new Error("lettre de rôle encore là");
    } finally {
      await other.close();
    }
  });
  for (const path of ["/", "/ecran", "/admin", "/confidentialite"]) {
    await step(`police hébergée, rien demandé ailleurs : ${path}`, async () => {
      const context = await browser.newContext(SAFARI ? devices["iPhone 13"] : {});
      const other = await context.newPage();
      watch(other);
      const away = [];
      other.on("request", (r) => {
        if (/^http/.test(r.url()) && new URL(r.url()).origin !== BASE) away.push(r.url());
      });
      try {
        await other.goto(BASE + path);
        await other.evaluate(() => document.fonts.load('16px Bungee'));
        const ready = await other.evaluate(() => [...document.fonts].some((f) => f.family.includes("Bungee") && f.status === "loaded"));
        if (!ready) throw new Error("Bungee pas chargée");
        if (away.length) throw new Error(away.join(", "));
      } finally {
        await context.close();
      }
    });
  }
  await step("texte dessiné sur le canvas : en Bungee, pas dans la police de secours, et seule la police latine est chargée", async () => {
    const { context, p } = await freshPage(null);
    try {
      const fonts = [];
      p.on("request", (r) => {
        if (new URL(r.url()).pathname.startsWith("/fonts/")) fonts.push(new URL(r.url()).pathname);
      });
      await p.goto(BASE + "/");
      await p.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
      await p.evaluate(() => document.fonts.ready);
      if (fonts.join() !== "/fonts/bungee-latin-400-normal.woff2") throw new Error("polices chargées : " + fonts.join());
      const widths = await p.evaluate(async () => {
        await document.fonts.load('13px Bungee');
        const ctx = document.createElement("canvas").getContext("2d"), width = (font) => {
          ctx.font = font;
          return ctx.measureText("Frôlé x3").width;
        };
        return [width('13px Bungee, "Arial Black", sans-serif'), width('13px "Arial Black", sans-serif')];
      });
      if (widths[0] === widths[1]) throw new Error(JSON.stringify(widths));
    } finally {
      await context.close();
    }
  });
  await step("nouveau QR, ancienne adresse injoignable : le joueur reste, sans cv-sonde, et l'essai suivant passe", async () => {
    const { context, p } = await movingPage(null);
    try {
      const manifest = (u) => u.origin === BASE && u.pathname === "/manifest.webmanifest";
      await context.route(manifest, (route) => route.abort());
      await p.goto(moveTo + "/");
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(500);
      const kept = await p.evaluate(() => [location.href, localStorage.getItem("cv-sonde")]);
      if (kept[0] !== moveTo + "/" || kept[1] !== null) throw new Error(JSON.stringify(kept));
      await context.unroute(manifest);
      await p.reload();
      await p.waitForFunction(() => localStorage.getItem("cv-sonde") === "1" && !location.hash, null, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("nouveau QR, ancienne adresse trop lente : pas de renvoi pendant que le joueur tape", async () => {
    const { context, p } = await movingPage(await joinApi("Lente" + hex(4)));
    try {
      await context.route((u) => u.pathname === "/js/arrive.js", async (route) => {
        const res = await route.fetch();
        await route.fulfill({ response: res, body: (await res.text()).replace(/OLD = "[^"]+"/, `OLD = "${BASE}"`).replace(/HOST = "[^"]+"/, `HOST = "${new URL(moveTo).hostname}"`).replace(/\.then\(\(\) => \{(\s+if \(busy\(\)\))/, ".then(() => new Promise((ok) => { window.__sonde = ok; })).then(() => {$1") });
      });
      await p.goto(moveTo + "/");
      await p.waitForFunction(() => window.__sonde && document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await p.fill("#pseudo", "Tape" + hex(4));
      await p.evaluate(() => window.__sonde());
      await wait(500);
      const seen = await p.evaluate(() => [location.origin, localStorage.getItem("cv-sonde")]);
      if (seen[0] !== moveTo || seen[1] !== null) throw new Error(JSON.stringify(seen));
    } finally {
      await context.unrouteAll({ behavior: "ignoreErrors" });
      await context.close();
    }
  });
  await step("ancien joueur dont le code n'arrive pas : nouvel essai au chargement suivant, 3 allers-retours au plus", async () => {
    const { context, p } = await movingPage(await joinApi("Rate" + hex(4)));
    try {
      let trips = 0;
      p.on("framenavigated", (f) => {
        if (f === p.mainFrame() && new URL(f.url()).pathname === "/depart") trips++;
      });
      await context.route((u) => u.origin === BASE && u.pathname === "/api/me/link", (route) => route.abort());
      for (let i = 1; i <= 3; i++) {
        await p.goto(moveTo + "/");
        await p.waitForFunction((n) => location.origin === new URL(document.baseURI).origin && localStorage.getItem("cv-sonde-essais") === String(n) && !localStorage.getItem("cv-sonde") && !location.hash && document.documentElement.dataset.ready === "1", i, { timeout: WAIT_MS });
      }
      await p.goto(moveTo + "/");
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(1000);
      if (trips !== 3 || p.url() !== moveTo + "/") throw new Error(trips + " allers-retours, " + p.url());
    } finally {
      await context.close();
    }
  });
  await step("ancien joueur gardé par le cookie, sans clé locale : /depart retrouve son compte", async () => {
    const name = "Biscuit" + hex(4), token = await joinApi(name);
    const { context, p } = await movingPage(null);
    try {
      await context.route((u) => u.origin === BASE && u.pathname === "/api/resume", (route) => route.fulfill({ json: { token } }));
      await p.goto(moveTo + "/");
      await p.waitForFunction((home) => location.origin === home && localStorage.getItem("cv-token"), moveTo, { timeout: WAIT_MS });
      const mine = await p.evaluate(async () => (await (await fetch("/api/board", { headers: { authorization: "Bearer " + localStorage.getItem("cv-token") } })).json()).me?.pseudo);
      if (mine !== name) throw new Error(String(mine));
    } finally {
      await context.close();
    }
  });
  await step("lien fabriqué ou valeurs abîmées : le jeu démarre quand même, sans plantage", async () => {
    const bad = { "cv-score-attente": "null", "cv-succes": '{"attacks":1}', "cv-records": "[1]", "cv-garnitures": "{}", "cv-qualite": "1.5:9999999999999" };
    const { context, p } = await freshPage(null, null, { serviceWorkers: "block" });
    try {
      await p.goto(BASE + "/#demenage=" + encodeURIComponent(JSON.stringify({ code: null, data: bad })));
      await p.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      if (await p.evaluate(() => localStorage.getItem("cv-score-attente"))) throw new Error("clé hors de KEPT écrite");
      await p.evaluate((values) => Object.entries(values).forEach(([key, value]) => localStorage.setItem(key, value)), bad);
      await p.reload();
      await p.waitForFunction(() => document.documentElement.dataset.ready === "1", null, { timeout: WAIT_MS });
      await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(500);
      if (await p.evaluate(() => sessionStorage.getItem("cv-boot-reload"))) throw new Error("le démarrage a planté");
    } finally {
      await context.close();
    }
  });
  await step("lien reçu avec un code de déménagement : rempli, il reste à toucher « Connecter »", async () => {
    const name = "Recu" + hex(4), code = await codeOf(await joinApi(name));
    const { context, p } = await freshPage(null, null, { serviceWorkers: "block" });
    try {
      await p.goto(BASE + "/#demenage=" + encodeURIComponent(JSON.stringify({ code, data: {} })), { referer: "https://piege.example/" });
      await p.locator("#linkForm").waitFor({ state: "visible", timeout: WAIT_MS });
      await wait(500);
      const seen = await p.evaluate(() => [document.getElementById("linkInput").value, localStorage.getItem("cv-token"), sessionStorage.getItem("cv-arrivee"), location.hash]);
      if (seen[0] !== code || seen[1] || seen[2] || seen[3]) throw new Error(JSON.stringify(seen));
      await p.locator("#linkForm button[type=submit]").click();
      await p.locator("#play").waitFor({ state: "visible", timeout: WAIT_MS });
      if ((await boardOf(await p.evaluate(() => localStorage.getItem("cv-token")))).pseudo !== name) throw new Error("mauvais compte");
    } finally {
      await context.close();
    }
  });
  for (const size of [{ width: 375, height: 553 }, { width: 320, height: 454 }]) {
    await step(`petit écran ${size.width}×${size.height} : « Connecter » et « Nouveau joueur » s'atteignent en faisant défiler l'accueil`, async () => {
      const { context, p } = await testPage(null, size);
      try {
        await p.goto(BASE + "/");
        await p.locator("#haveAccount").click({ timeout: WAIT_MS });
        await p.locator("#linkForm").waitFor({ state: "visible", timeout: WAIT_MS });
        const before = await p.evaluate(() => {
          const menu = document.getElementById("menu");
          return { scrolls: menu.scrollHeight > menu.clientHeight, bottom: document.getElementById("newAccount").getBoundingClientRect().bottom, height: innerHeight };
        });
        if (!before.scrolls || before.bottom <= before.height) throw new Error("rien à faire défiler : " + JSON.stringify(before));
        for (const button of ["#linkForm button[type=submit]", "#newAccount"]) {
          const box = await p.evaluate((css) => {
            document.querySelector(css).scrollIntoView({ block: "center", behavior: "instant" });
            const b = document.querySelector(css).getBoundingClientRect(), top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            return { fits: b.top >= 0 && b.bottom <= innerHeight, mine: top === document.querySelector(css), top: b.top, bottom: b.bottom, height: innerHeight };
          }, button);
          if (!box.fits || !box.mine) throw new Error(button + " : " + JSON.stringify(box));
        }
        await p.locator("#newAccount").click();
        await p.locator("#joinForm").waitFor({ state: "visible", timeout: WAIT_MS });
      } finally {
        await context.close();
      }
    });
  }
  if (!SAFARI) {
    await step("doigt sur petit écran : l'accueil qui dépasse défile, le jeu jamais", async () => {
      const { context, p } = await testPage(await joinApi("Doigt" + hex(4)), { width: 320, height: 300 });
      const swipe = async (cdp) => {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 8, y: 250 }] });
        for (let y = 230; y >= 50; y -= 20) await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 8, y }] });
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await wait(300);
      };
      try {
        const cdp = await context.newCDPSession(p);
        await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true });
        await p.goto(BASE + "/");
        await p.locator("#play").waitFor({ state: "visible", timeout: WAIT_MS });
        await wait(600);
        await swipe(cdp);
        const moved = await p.evaluate(() => [document.getElementById("menu").scrollTop, scrollY]);
        if (moved[0] <= 0 || moved[1] !== 0) throw new Error("accueil : " + JSON.stringify(moved));
        await p.keyboard.press("Space");
        await p.waitForFunction(() => window.__jeu.S.mode === "play", null, { timeout: WAIT_MS });
        await swipe(cdp);
        const still = await p.evaluate(() => [scrollY, document.documentElement.scrollTop, document.body.scrollTop, document.getElementById("cv").getBoundingClientRect().top]);
        if (still.some((n) => n !== 0)) throw new Error("jeu : " + JSON.stringify(still));
      } finally {
        await context.close();
      }
    });
  }
  await step("grand écran : l'accueil tient dans la page, rien à faire défiler", async () => {
    const { context, p } = await testPage(await joinApi("Grand" + hex(4)));
    try {
      await p.goto(BASE + "/");
      await p.locator("#play").waitFor({ state: "visible", timeout: WAIT_MS });
      const sizes = await p.evaluate(() => {
        const menu = document.getElementById("menu");
        return [menu.scrollHeight, menu.clientHeight];
      });
      if (sizes[0] > sizes[1]) throw new Error(JSON.stringify(sizes));
    } finally {
      await context.close();
    }
  });
  await step("« Déconnecter les autres » : le classement est relu, l'état Google affiché suit", async () => {
    const { context, p } = await freshPage(await joinApi("Lie" + hex(4)), null, { serviceWorkers: "block" });
    try {
      let linked = true;
      await p.route((url) => url.pathname === "/api/board", async (route) => {
        const res = await route.fetch();
        const body = await res.json();
        await route.fulfill({ response: res, json: { ...body, google: true, me: body.me && { ...body.me, google: linked } } });
      });
      await p.route("**/api/me/devices", async (route) => {
        linked = false;
        await route.continue();
      });
      await p.goto(BASE + "/");
      await p.locator("#settingsBtn").click({ timeout: WAIT_MS });
      await p.waitForFunction(() => document.getElementById("googleLabel").textContent === "Délier mon compte Google", null, { timeout: WAIT_MS });
      const widths = await p.evaluate(() => ["googleBtn", "outBtn"].map((id) => document.getElementById(id).getBoundingClientRect().width));
      if (!widths[0] || Math.abs(widths[0] - widths[1]) > 1) throw new Error(`bouton Google large de ${widths[0]} px, « Déconnecter les autres » de ${widths[1]} px`);
      await p.locator("#outBtn").click();
      await p.waitForFunction(() => document.getElementById("outNote").textContent.endsWith("Ton compte Google sera aussi délié."), null, { timeout: WAIT_MS });
      await p.locator("#outYes").click({ timeout: WAIT_MS });
      await p.waitForFunction(() => document.getElementById("googleLabel").textContent === "Lier mon compte Google", null, { timeout: WAIT_MS });
    } finally {
      await context.close();
    }
  });
  await step("score sans réseau : la boucle s'arrête sans l'effacer, le dit, et il part au retour du réseau", async () => {
    const { context, p } = await testPage(await joinApi("Attente" + hex(4)));
    try {
      await p.route("**/js/app/api.js", async (route) => {
        const res = await route.fetch();
        await route.fulfill({ response: res, body: (await res.text()).replace("WAIT_MS = 120000", "WAIT_MS = 500") });
      });
      let down = true, sent = 0;
      await p.route(/\/api\/runs\/[^/]+$/, (route) => {
        if (down) return route.abort();
        sent++;
        return route.continue();
      });
      await p.goto(BASE + "/");
      await runFor(p, "#play", 500);
      await p.waitForFunction(() => document.getElementById("overNote").textContent.includes("partira"), null, { timeout: WAIT_MS });
      if (!(await p.evaluate(() => JSON.parse(localStorage.getItem("cv-score-attente")).length))) throw new Error("score effacé");
      down = false;
      await p.evaluate(() => window.dispatchEvent(new Event("online")));
      await p.waitForFunction(() => !localStorage.getItem("cv-score-attente") && document.getElementById("overNote").hidden, null, { timeout: WAIT_MS });
      if (sent !== 1) throw new Error(sent + " envois");
    } finally {
      await context.close();
    }
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
