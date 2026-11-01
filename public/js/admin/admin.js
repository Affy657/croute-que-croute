import { store as storage, KEYS } from "../shared/store.js";
import { fmtCs, clock } from "../shared/format.js";
import { prepareSfx, previewSfx } from "../app/audio.js";
import { VERSION } from "../version.js";

const $ = (id) => document.getElementById(id);
const REFRESH_MS = 10000, ERRORS_MS = 60000, FRESH_MS = 3600 * 1000, COPIED_MS = 2000;
const SFX_LABELS = { start: "Départ", near: "Frôlé", death: "Mort", record: "Record", first: "1re place" };
const store = {
  get: () => storage.get(KEYS.adminToken),
  set: (v) => storage.set(KEYS.adminToken, v || null)
};

document.documentElement.dataset.version = VERSION;
if (window.top !== window) document.documentElement.classList.add("embedded");

let token = store.get();
let me = null;
let data = null;
let timer = null;
let retry = null;
let scope = "event";
const opened = new Set();
const STATUS = { open: "Soirée en cours", upcoming: "Prochaine soirée", closed: "Dernière soirée" };

const day = (ms) => new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" }) + " à " + hour(ms);
const hour = (ms) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
const toInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fromInput = (value) => (value ? new Date(value).getTime() : NaN);

function since(ms) {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return "il y a " + min + " min";
  if (min < 1440) return "il y a " + Math.floor(min / 60) + " h";
  return "il y a " + Math.floor(min / 1440) + " j";
}

const ago = (ms) => (Date.now() - ms < 5 * 60000 ? "actif à l'instant" : "vu " + since(ms));

const KINDS = {
  erreur: "Erreur",
  promesse: "Promesse rejetée",
  fichier: "Fichier pas chargé",
  csp: "Bloqué par la sécurité",
  blocage: "Jeu bloqué au chargement"
};
const BROWSERS = [
  [/Instagram/, "Instagram"], [/FBAN|FBAV|FB_IAB/, "Facebook"], [/Snapchat/, "Snapchat"], [/musical_ly|BytedanceWebview/, "TikTok"],
  [/SamsungBrowser/, "Samsung Internet"], [/EdgiOS|EdgA|Edg\//, "Edge"], [/OPR\//, "Opera"], [/CriOS|Chrome\//, "Chrome"],
  [/FxiOS|Firefox\//, "Firefox"], [/Safari\//, "Safari"]
];

const SUSPECT_LABELS = { high: "à vérifier : loin devant le 2e", slow: "à vérifier : partie ralentie, mise en pause ou envoyée en retard" };

function say(el, text, error) {
  el.textContent = text || "";
  el.hidden = !text;
  el.classList.toggle("error", !!error);
}

async function call(method, path, body) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const json = await res.json().catch(() => null);
  if (res.status === 401 && token) signOut();
  if (!res.ok) throw new Error((json && json.error) || "Pas de réseau, réessaie.");
  return json;
}

function show(view) {
  $("login").hidden = view !== "login";
  $("invite").hidden = view !== "invite";
  $("app").hidden = view !== "app";
  $("who").hidden = view !== "app";
}

function signOut() {
  token = null;
  me = null;
  store.set(null);
  $("errors").replaceChildren();
  opened.clear();
  clearInterval(timer);
  clearTimeout(retry);
  show("login");
}

function onSubmit(id, fn) {
  const form = $(id);
  let busy = false;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (busy) return;
    busy = true;
    const buttons = form.querySelectorAll("button");
    for (const b of buttons) b.disabled = true;
    try {
      await fn();
    } finally {
      busy = false;
      for (const b of buttons) b.disabled = false;
    }
  });
}

function cell(tag, cls, text) {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = text;
  return el;
}

function renderEvent() {
  const ev = data && data.event;
  $("eventStatus").textContent = ev ? STATUS[ev.status] : "Soirée";
  $("eventName").textContent = ev ? ev.name : "Aucune soirée";
  $("editEndBtn").hidden = !ev || ev.status === "closed";
  const best = data ? Math.max(0, ...data.players.filter((p) => !p.banned).map((p) => p.best)) : 0;
  $("statPlayers").textContent = data ? data.stats.players : 0;
  $("statRuns").textContent = data ? data.stats.runs : 0;
  $("statBest").textContent = best ? fmtCs(best) : "-";
  tick();
}

function tick() {
  const ev = data && data.event;
  if (!ev) {
    $("eventEnd").textContent = "Crée une soirée pour ouvrir son classement. En dehors, le classement général tourne tout le temps.";
    return;
  }
  const now = Date.now();
  if (now < ev.opensAt) $("eventEnd").textContent = "Début " + day(ev.opensAt) + ", dans " + clock(ev.opensAt - now) + ". Fin à " + hour(ev.closesAt) + ".";
  else if (now < ev.closesAt) $("eventEnd").textContent = "Fin à " + hour(ev.closesAt) + ", dans " + clock(ev.closesAt - now);
  else $("eventEnd").textContent = "Classement fermé depuis " + day(ev.closesAt) + ".";
}

function renderPlayers() {
  const players = data ? data.players : [];
  const doubt = players.filter((p) => p.suspect && !p.banned).length;
  say($("suspectAlert"), doubt ? (doubt > 1 ? doubt + " records à vérifier" : "1 record à vérifier") + " (trait rouge). Regarde le détail avant de retirer quelqu'un." : "", true);
  let rank = 0;
  $("players").replaceChildren(...players.map((p) => {
    const li = document.createElement("li");
    const ranked = !p.banned && p.best > 0;
    if (ranked) rank++;
    li.className = p.banned ? "out" : p.suspect ? "suspect" : "";
    const main = document.createElement("div");
    main.className = "main";
    main.append(
      cell("span", "name", p.pseudo),
      cell("span", "meta", (p.best ? fmtCs(p.best) + " s, " : "") + p.runs + (p.runs > 1 ? " parties" : " partie") + (p.banned ? ", retiré" : p.suspect ? ", " + SUSPECT_LABELS[p.suspect] : ""))
    );
    const btn = cell("button", "btn ghost small", p.banned ? "Réintégrer" : "Retirer");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      if (!p.banned && !confirm("Retirer " + p.pseudo + " du classement ?")) return;
      btn.disabled = true;
      try {
        await call("POST", "/api/admin/players/" + p.id + "/ban", { banned: !p.banned });
        await load();
      } catch (e) {
        say($("playersMsg"), e.message, true);
        btn.disabled = false;
      }
    });
    li.append(cell("span", "pos", ranked ? String(rank) : ""), main, btn);
    return li;
  }));
  $("playersEmpty").hidden = players.length > 0;
}

async function load() {
  const asked = scope;
  try {
    const next = await call("GET", "/api/admin/players" + (asked === "event" ? "" : "?scope=" + asked));
    if (asked !== scope) return;
    data = next;
    for (const b of document.querySelectorAll(".scope")) b.setAttribute("aria-selected", String(b.dataset.scope === scope));
    say($("playersMsg"), "");
    renderEvent();
    renderPlayers();
  } catch (e) {
    if (asked === scope) say($("playersMsg"), e.message, true);
  }
}

async function loadTeam() {
  try {
    const { team } = await call("GET", "/api/admin/team");
    $("team").replaceChildren(...team.map((a) => {
      const li = document.createElement("li");
      const main = document.createElement("div");
      main.className = "main";
      main.append(
        cell("span", "name", a.name + (a.me ? " (toi)" : "")),
        cell("span", "meta", (a.role === "owner" ? "Propriétaire" : "Admin") + ", " + ago(a.last_seen))
      );
      li.append(cell("span", "pos", a.role === "owner" ? "P" : "A"), main);
      if (!a.me) {
        const btn = cell("button", "btn ghost small", "Retirer");
        btn.type = "button";
        btn.addEventListener("click", async () => {
          if (!confirm("Retirer l'accès de " + a.name + " ? Son téléphone sera déconnecté.")) return;
          try {
            await call("POST", "/api/admin/team/" + a.id + "/revoke");
            await loadTeam();
          } catch (e) {
            say($("teamMsg"), e.message, true);
          }
        });
        li.append(btn);
      } else {
        li.append(document.createElement("span"));
      }
      return li;
    }));
  } catch (e) {
    say($("teamMsg"), e.message, true);
  }
}

function system(ua, platform) {
  const ios = ua.match(/OS (\d+)_(\d+)/) || ua.match(/Version\/(\d+)\.(\d+)/);
  if ((platform === "iPhone" || platform === "iPad") && ios) return "iOS " + ios[1] + "." + ios[2];
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return "Android " + android[1];
  return /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
}

function deviceLabel(d) {
  const browser = BROWSERS.find(([re]) => re.test(d.ua));
  return [d.platform, system(d.ua, d.platform), browser ? browser[1] : "", d.standalone ? "appli installée" : ""].filter(Boolean).join(", ");
}

function spread(g) {
  const where = Object.entries(g.platforms).sort((a, b) => b[1] - a[1]).map(([p, n]) => p + " " + n).join(", ");
  return g.count + " fois, " + g.sessions + (g.sessions > 1 ? " sessions" : " session") + (where ? " (" + where + ")" : "");
}

function versionLabel(g) {
  return (g.last.version || "inconnue") + (g.versions > 1 ? ", vue sur " + g.versions + " versions" : "");
}

function reportText(g) {
  const l = g.last;
  return [
    KINDS[g.kind] + " : " + g.message,
    "Où : " + (g.source || "inconnu"),
    spread(g),
    "Première fois : " + day(g.firstAt) + ", dernière : " + day(g.lastAt),
    "Version : " + versionLabel(g) + (g.onCurrent ? ", encore là sur la version en ligne" : ", pas revue depuis la dernière mise en ligne"),
    "Page : " + l.page,
    "Appareil : " + deviceLabel(l) + ", écran " + l.device,
    "Navigateur : " + l.ua,
    "",
    "Avant l'erreur :",
    l.trail || "Rien de noté.",
    "",
    "Pile d'appels :",
    l.stack || "Pas de pile pour ce type d'erreur."
  ].join("\n");
}

function copyText(text) {
  const fallback = () => {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.append(area);
    area.select();
    const done = document.execCommand("copy");
    area.remove();
    return done;
  };
  if (!navigator.clipboard) return Promise.resolve(fallback());
  return navigator.clipboard.writeText(text).then(() => true, fallback);
}

function errorItem(g) {
  const li = document.createElement("li");
  li.className = Date.now() - g.lastAt < FRESH_MS ? "fresh" : "";
  const box = document.createElement("details");
  box.open = opened.has(g.id);
  box.addEventListener("toggle", () => {
    if (box.open) opened.add(g.id);
    else opened.delete(g.id);
  });
  const head = document.createElement("summary");
  head.append(
    cell("span", "kind", KINDS[g.kind] + ", " + since(g.lastAt)),
    cell("span", "name", g.message),
    cell("span", "meta", spread(g)),
    cell("span", "meta", (g.source || "fichier inconnu") + ", " + (g.onCurrent ? "encore là sur la version en ligne" : "pas revue depuis la dernière mise en ligne"))
  );
  const l = g.last, facts = document.createElement("dl");
  for (const [label, value] of [
    ["Première fois", day(g.firstAt)], ["Dernière fois", day(g.lastAt)], ["Version", versionLabel(g)],
    ["Page", l.page], ["Appareil", deviceLabel(l)], ["Écran", l.device]
  ]) facts.append(cell("dt", "", label), cell("dd", "", value || "inconnu"));
  const copyBtn = cell("button", "btn ghost small", "Copier le rapport");
  copyBtn.type = "button";
  copyBtn.addEventListener("click", async () => {
    copyBtn.textContent = (await copyText(reportText(g))) ? "Copié" : "Copie refusée";
    setTimeout(() => { copyBtn.textContent = "Copier le rapport"; }, COPIED_MS);
  });
  const fixBtn = cell("button", "btn ghost small", "Marquer corrigé");
  fixBtn.type = "button";
  fixBtn.addEventListener("click", async () => {
    if (!confirm("Retirer cette erreur de la liste ? Elle reviendra si elle se reproduit.")) return;
    fixBtn.disabled = true;
    try {
      await call("DELETE", "/api/admin/errors/" + g.id);
      opened.delete(g.id);
      await loadErrors();
    } catch (e) {
      say($("errorsMsg"), e.message, true);
      fixBtn.disabled = false;
    }
  });
  const actions = document.createElement("div");
  actions.className = "row";
  actions.append(copyBtn, fixBtn);
  const body = document.createElement("div");
  body.className = "body";
  body.append(
    facts,
    cell("p", "eyebrow", "Avant l'erreur"), cell("pre", "", l.trail || "Rien de noté."),
    cell("p", "eyebrow", "Pile d'appels"), cell("pre", "", l.stack || "Pas de pile pour ce type d'erreur."),
    actions
  );
  box.append(head, body);
  li.append(box);
  return li;
}

async function loadErrorCount() {
  try {
    const r = await call("GET", "/api/admin/errors/recent");
    $("errorsSummary").textContent = r.day
      ? (r.day > 1 ? r.day + " erreurs différentes" : "1 erreur") + " ces dernières 24 h."
      : "Aucune erreur ces dernières 24 h.";
    say($("errorsAlert"), r.hour ? (r.hour > 1 ? r.hour + " erreurs différentes" : "1 erreur") + " dans la dernière heure (trait rouge)." : "", true);
  } catch (e) {
    say($("errorsMsg"), e.message, true);
  }
}

async function loadErrors() {
  const btn = $("errorsBtn");
  btn.disabled = true;
  try {
    const r = await call("GET", "/api/admin/errors");
    $("errors").replaceChildren(...r.groups.map(errorItem));
    $("errorsEmpty").hidden = r.groups.length > 0;
    btn.textContent = "Actualiser la liste";
    say($("errorsMsg"), "");
  } catch (e) {
    say($("errorsMsg"), e.message, true);
  } finally {
    btn.disabled = false;
  }
  await loadErrorCount();
}

async function boot() {
  try {
    me = (await call("GET", "/api/admin/me")).admin;
  } catch (e) {
    if (!token) return;
    show("app");
    say($("playersMsg"), e.message, true);
    clearTimeout(retry);
    retry = setTimeout(boot, REFRESH_MS);
    return;
  }
  $("who").textContent = me.name + ", " + (me.role === "owner" ? "propriétaire" : "admin");
  $("teamCard").hidden = me.role !== "owner";
  $("errorsCard").hidden = me.role !== "owner";
  show("app");
  await load();
  if (me.role === "owner") await Promise.all([loadTeam(), loadErrorCount()]);
  clearInterval(timer);
  timer = setInterval(() => {
    if (!document.hidden) load();
  }, REFRESH_MS);
}

onSubmit("loginForm", async () => {
  try {
    const r = await call("POST", "/api/admin/login", { name: $("loginName").value, key: $("loginKey").value });
    token = r.token;
    store.set(token);
    $("loginKey").value = "";
    say($("loginMsg"), "");
    await boot();
  } catch (err) {
    say($("loginMsg"), err.message, true);
  }
});

async function acceptInvite(invite) {
  const r = await call("POST", "/api/admin/accept", { invite });
  token = r.token;
  store.set(token);
  history.replaceState(null, "", "/admin");
  await boot();
}

function showInvite(invite) {
  show("invite");
  $("acceptBtn").onclick = async () => {
    $("acceptBtn").disabled = true;
    try {
      await acceptInvite(invite);
    } catch (e) {
      say($("inviteMsg"), e.message, true);
      $("acceptBtn").disabled = false;
    }
  };
}

onSubmit("pasteForm", async () => {
  const text = $("pasteInvite").value.trim();
  const match = text.match(/invite=([a-f0-9]+)/i) || text.match(/^([a-f0-9]{32,})$/i);
  if (!match) {
    say($("pasteMsg"), "Ce n'est pas un lien d'invitation.", true);
    return;
  }
  try {
    await acceptInvite(match[1]);
    $("pasteInvite").value = "";
  } catch (err) {
    say($("pasteMsg"), err.message, true);
  }
});

$("editEndBtn").addEventListener("click", () => {
  $("eventForm").hidden = true;
  $("endForm").hidden = !$("endForm").hidden;
  if (data && data.event) {
    $("editName").value = data.event.name;
    $("startAt").value = toInput(data.event.opensAt);
    $("endAt").value = toInput(data.event.closesAt);
  }
});

$("newEventBtn").addEventListener("click", () => {
  $("endForm").hidden = true;
  $("eventForm").hidden = !$("eventForm").hidden;
  if (!$("eventStartInput").value) $("eventStartInput").value = toInput(Date.now());
});

for (const b of document.querySelectorAll(".scope")) {
  b.addEventListener("click", () => {
    scope = b.dataset.scope;
    load();
  });
}

onSubmit("endForm", async () => {
  try {
    await call("PATCH", "/api/admin/events/current", {
      name: $("editName").value,
      opensAt: fromInput($("startAt").value),
      closesAt: fromInput($("endAt").value)
    });
    $("endForm").hidden = true;
    say($("eventMsg"), "Soirée modifiée.");
    await load();
  } catch (err) {
    say($("eventMsg"), err.message, true);
  }
});

onSubmit("eventForm", async () => {
  try {
    await call("POST", "/api/admin/events", {
      name: $("eventNameInput").value,
      opensAt: fromInput($("eventStartInput").value),
      closesAt: fromInput($("eventEndInput").value)
    });
    $("eventForm").hidden = true;
    $("eventNameInput").value = "";
    $("eventStartInput").value = "";
    $("eventEndInput").value = "";
    say($("eventMsg"), "Soirée créée.");
    await load();
  } catch (err) {
    say($("eventMsg"), err.message, true);
  }
});

onSubmit("inviteForm", async () => {
  try {
    const r = await call("POST", "/api/admin/invites", { name: $("inviteName").value, role: $("inviteRole").value });
    $("inviteUrl").value = r.url;
    $("inviteResult").hidden = false;
    $("shareBtn").hidden = !navigator.share;
    $("inviteName").value = "";
    say($("teamMsg"), "");
  } catch (err) {
    say($("teamMsg"), err.message, true);
  }
});

$("copyBtn").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText($("inviteUrl").value);
    say($("teamMsg"), "Lien copié.");
  } catch (e) {
    $("inviteUrl").select();
    say($("teamMsg"), "Sélectionne le lien et copie-le.");
  }
});

$("shareBtn").addEventListener("click", () => {
  navigator.share({ title: "Croûte Admin", text: "Ton accès admin à Croûte que Croûte", url: $("inviteUrl").value }).catch(() => {});
});

$("logoutBtn").addEventListener("click", async () => {
  if (!confirm("Se déconnecter de ce téléphone ?")) return;
  try { await call("POST", "/api/admin/logout"); } catch (e) {}
  signOut();
});

$("errorsBtn").addEventListener("click", loadErrors);

document.addEventListener("visibilitychange", () => {
  if (document.hidden || !me) return;
  load();
  if (me.role === "owner") loadErrorCount();
});

setInterval(() => {
  if (me) tick();
}, 1000);

setInterval(() => {
  if (me && me.role === "owner" && !document.hidden) loadErrorCount();
}, ERRORS_MS);

prepareSfx();
$("sfxList").replaceChildren(...Object.entries(SFX_LABELS).map(([name, label]) => {
  const btn = cell("button", "btn ghost small", label);
  btn.type = "button";
  btn.addEventListener("click", () => previewSfx(name));
  return btn;
}));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=" + encodeURIComponent(VERSION)).catch(() => {});

const invite = new URLSearchParams(location.hash.slice(1)).get("invite");
if (invite) showInvite(invite);
else if (token) boot();
else show("login");
