import { readFileSync } from "node:fs";
import { chromium, devices, webkit } from "playwright";

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
  await step("Paramètres, Autre appareil : un seul parcours ouvert à la fois, erreur du code en rouge", async () => {
    await click("settingsBtn");
    await shown("settings");
    await click("mergeBtn");
    await shown("mergeHelp");
    await click("outBtn");
    await shown("outAsk");
    if (await $("#mergeForm").isVisible()) throw new Error("le code de fusion reste ouvert sous la confirmation");
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
    await admin.locator("#endForm button").click();
    if (!(await asked).includes("déjà passée")) throw new Error("mauvaise question");
    await wait(500);
    if (patched || (await admin.locator("#endForm").isHidden()) || (await status()) !== "Soirée en cours") throw new Error("soirée modifiée sans confirmation");
    asked = dialog(admin, true);
    await admin.locator("#endForm button").click();
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
          await p.locator(button).scrollIntoViewIfNeeded();
          const box = await p.evaluate((css) => {
            const b = document.querySelector(css).getBoundingClientRect(), top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
            return { fits: b.top >= 0 && b.bottom <= innerHeight, mine: top === document.querySelector(css) };
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
      await p.locator("#outBtn").click();
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
