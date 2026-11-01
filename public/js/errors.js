{
  const API = "/api/errors", FIRST_MS = 3000, LATER_MS = 10000, STUCK_MS = 15000;
  const TRAIL = 25, STACK = 20, DISTINCT = 20, BATCH = 5, SENDS = 3, TAB_SENDS = 10, BODY_MAX = 60000;
  const TAB_KEY = "cv-erreurs", SESSION_KEY = "cv-erreurs-session";
  const NOISE = /^(Script error\.?|ResizeObserver loop)/i;
  const FOREIGN = /(chrome|moz|safari|safari-web)-extension:|webkit-masked-url:/;
  const ELSEWHERE = /^[a-z-]+:/i;
  const SCREENS = ".screen, #hud";
  const CLICKABLE = "button, a, input, select, summary, label, [role=tab]";
  const ua = navigator.userAgent, origin = location.origin, t0 = Date.now(), root = document.documentElement;
  const platform = /iPhone|iPod/.test(ua) ? "iPhone"
    : /iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) ? "iPad"
    : /Android/.test(ua) ? "Android" : "PC";
  const trail = [], errors = new Map();
  let timer = null, sends = 0, fileVersion = "", session = "";

  const stamp = () => ((Date.now() - t0) / 1000).toFixed(2).padStart(7);
  const local = (text) => String(text || "").split(origin).join("").replace(/\?[^\s:()@]*(?=:\d+:\d+)/g, "");

  function tabStore(key, value) {
    try {
      if (value === undefined) return sessionStorage.getItem(key);
      sessionStorage.setItem(key, value);
    } catch (err) {}
    return null;
  }

  function sessionId() {
    if (session) return session;
    session = tabStore(SESSION_KEY) || "";
    if (!/^[a-f0-9]{16}$/.test(session)) {
      session = (Math.random().toString(16).slice(2) + Date.now().toString(16)).slice(0, 16);
      tabStore(SESSION_KEY, session);
    }
    return session;
  }

  function note(text) {
    trail.push(stamp() + "  " + String(text).slice(0, 160));
    if (trail.length > TRAIL) trail.shift();
  }

  function device() {
    const parts = [innerWidth + "x" + innerHeight + " x" + Math.round(devicePixelRatio * 100) / 100];
    if (!navigator.onLine) parts.push("hors ligne");
    if (document.hidden) parts.push("en arrière-plan");
    return parts.join(", ");
  }

  function learnVersion() {
    if (root.dataset.version) return;
    fetch("/js/version.js").then((r) => r.text()).then((text) => {
      const m = text.match(/"([^"]{1,40})"/);
      if (m) fileVersion = m[1];
    }).catch(() => {});
  }

  function describe(r) {
    if (r && typeof r === "object" && r.name) return r.name + (r.message ? ": " + r.message : "");
    if (typeof r === "string") return r;
    try {
      return JSON.stringify(r) || String(r);
    } catch (err) {
      return String(r);
    }
  }

  function capture(kind, message, source, stack) {
    message = String(message || "").replace(/^Uncaught\s+/, "").slice(0, 300);
    source = local(source).slice(0, 200);
    stack = local(stack);
    if (!message || NOISE.test(message) || ELSEWHERE.test(source) || FOREIGN.test(stack)) return;
    const key = kind + "|" + message + "|" + source;
    let e = errors.get(key);
    if (!e) {
      if (errors.size >= DISTINCT) return;
      if (!errors.size) learnVersion();
      note(kind + " : " + message);
      e = { kind, message, source, stack: stack.split("\n").slice(0, STACK).join("\n").slice(0, 4000), trail: trail.slice(), device: device(), count: 0, sent: 0 };
      errors.set(key, e);
      if (!timer) timer = setTimeout(() => flush(false), sends ? LATER_MS : FIRST_MS);
    }
    e.count++;
  }

  function item(e) {
    return e.sent
      ? { kind: e.kind, message: e.message, source: e.source, count: e.count - e.sent }
      : { kind: e.kind, message: e.message, source: e.source, stack: e.stack, trail: e.trail, device: e.device, count: e.count };
  }

  function allowed() {
    if (sends >= SENDS) return false;
    const n = Number(tabStore(TAB_KEY)) || 0;
    if (n >= TAB_SENDS) return false;
    tabStore(TAB_KEY, String(n + 1));
    sends++;
    return true;
  }

  function flush(leaving) {
    clearTimeout(timer);
    timer = null;
    const due = [];
    for (const e of errors.values()) {
      if (due.length < BATCH && e.count > e.sent && (!e.sent || leaving)) due.push(e);
    }
    if (!due.length || !allowed()) return;
    const head = {
      version: root.dataset.version || fileVersion, page: location.pathname, platform, ua, session: sessionId(),
      standalone: !!(navigator.standalone || (window.matchMedia && matchMedia("(display-mode: standalone)").matches))
    };
    let body = JSON.stringify(Object.assign({ errors: due.map(item) }, head));
    while (body.length > BODY_MAX && due.length > 1) {
      due.pop();
      body = JSON.stringify(Object.assign({ errors: due.map(item) }, head));
    }
    for (const e of due) e.sent = e.count;
    if (!(leaving && navigator.sendBeacon && navigator.sendBeacon(API, body))) {
      fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true }).catch(() => {});
    }
    for (const e of errors.values()) {
      if (!e.sent && !timer) timer = setTimeout(() => flush(false), LATER_MS);
    }
  }

  addEventListener("error", (e) => {
    try {
      if (e instanceof ErrorEvent) {
        const err = e.error;
        const source = e.filename ? e.filename + ":" + e.lineno + ":" + e.colno : "";
        capture("erreur", e.message || (err && String(err)), source, err && err.stack);
        return;
      }
      const el = e.target, url = el && (el.currentSrc || el.src || el.href);
      if (url && String(url).indexOf(origin + "/") === 0) {
        capture("fichier", el.tagName.toLowerCase() + " pas chargé", String(url).split(/[?#]/)[0], "");
      }
    } catch (err) {}
  }, true);

  addEventListener("unhandledrejection", (e) => {
    try {
      const r = e.reason;
      const stack = (r && r.stack) || "";
      const at = local(stack).match(/[^\s()@]+:\d+:\d+/);
      capture("promesse", describe(r), at ? at[0] : "", stack);
    } catch (err) {}
  });

  addEventListener("securitypolicyviolation", (e) => {
    try {
      const at = e.sourceFile ? e.sourceFile + ":" + (e.lineNumber || 0) + ":" + (e.columnNumber || 0) : "";
      capture("csp", (e.effectiveDirective || e.violatedDirective) + " a bloqué " + (local(e.blockedURI) || "un contenu"), at, "");
    } catch (err) {}
  });

  addEventListener("pointerup", (e) => {
    try {
      const el = e.target && e.target.closest && e.target.closest(CLICKABLE);
      if (el) note("clic " + (el.id ? "#" + el.id : el.tagName.toLowerCase() + (el.classList[0] ? "." + el.classList[0] : "")));
    } catch (err) {}
  }, { capture: true, passive: true });

  document.addEventListener("visibilitychange", () => {
    note(document.hidden ? "page cachée" : "page visible");
    if (document.hidden) flush(true);
  });
  addEventListener("pagehide", () => flush(true));
  addEventListener("online", () => note("réseau revenu"));
  addEventListener("offline", () => note("réseau perdu"));

  document.addEventListener("DOMContentLoaded", () => {
    try {
      const game = !!document.getElementById("loader");
      note(game ? (root.dataset.ready ? "jeu prêt" : "jeu pas encore prêt") : "page prête");
      const screens = document.querySelectorAll(SCREENS);
      for (const el of screens) if (!el.hidden) note("écran " + el.id);
      const watch = new MutationObserver((list) => {
        for (const m of list) if (!m.target.hidden) note("écran " + m.target.id);
      });
      for (const el of screens) watch.observe(el, { attributes: true, attributeFilter: ["hidden"] });
      if (game) {
        setTimeout(() => {
          if (!root.dataset.ready) capture("blocage", "Jeu pas démarré au bout de " + STUCK_MS / 1000 + " s", "", "");
        }, STUCK_MS);
      }
    } catch (err) {}
  });
}
