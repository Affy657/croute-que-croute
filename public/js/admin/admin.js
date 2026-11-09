import { store as storage, KEYS } from "../shared/store.js";
import { fmtCs, clock } from "../shared/format.js";
import { VERSION } from "../version.js";
import { timeout } from "../shared/timeout.js";
import { visiblePlayers, phase, nextName, endAfter } from "./tools.js";

/** @param {string} id */
const $ = (id) => document.getElementById(id);
const CALL_MS = 10000, REFRESH_MS = 30000, RETRY_MS = 10000, ERRORS_MS = 60000, FRESH_MS = 3600 * 1000, COPIED_MS = 2000;
const store = {
  get: () => storage.get(KEYS.adminToken),
  set: /** @param {string | null} v */ (v) => storage.set(KEYS.adminToken, v || null)
};

document.documentElement.dataset.version = VERSION;
if (window.top !== window) document.documentElement.classList.add("embedded");

let token = store.get();
/** @type {AdminRole | null} */
let me = null;
/** @type {AdminData | null} */
let data = null;
/** @type {Timer} */
let timer = null;
/** @type {Timer} */
let retry = null;
let scope = "event";
let showAll = false;
let endTouched = false;
let loads = 0;
let loadedAt = 0;
let invited = new URLSearchParams(location.hash.slice(1)).get("invite");
/** @type {Set<string>} */
const opened = new Set();
const STATUS = { open: "Soirée en cours", upcoming: "Prochaine soirée", closed: "Dernière soirée" };
const FORMS = [["editEndBtn", "endForm"], ["newEventBtn", "eventForm"]];

/** @param {number} ms */
const day = (ms) => new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" }) + " à " + hour(ms);
/** @param {number} ms */
const hour = (ms) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
/** @param {number} ms */
const toInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
/** @param {string} value */
const fromInput = (value) => (value ? new Date(value).getTime() : NaN);

/** @param {number} ms */
function since(ms) {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return "il y a " + min + " min";
  if (min < 1440) return "il y a " + Math.floor(min / 60) + " h";
  return "il y a " + Math.floor(min / 1440) + " j";
}

/** @param {number} ms */
const ago = (ms) => (Date.now() - ms < 5 * 60000 ? "actif à l'instant" : "vu " + since(ms));

/** @type {Record<string, string>} */
const KINDS = {
  erreur: "Erreur",
  promesse: "Promesse rejetée",
  fichier: "Fichier pas chargé",
  csp: "Bloqué par la sécurité",
  blocage: "Jeu bloqué au chargement"
};
/** @type {[RegExp, string][]} */
const BROWSERS = [
  [/Instagram/, "Instagram"], [/FBAN|FBAV|FB_IAB/, "Facebook"], [/Snapchat/, "Snapchat"], [/musical_ly|BytedanceWebview/, "TikTok"],
  [/SamsungBrowser/, "Samsung Internet"], [/EdgiOS|EdgA|Edg\//, "Edge"], [/OPR\//, "Opera"], [/CriOS|Chrome\//, "Chrome"],
  [/FxiOS|Firefox\//, "Firefox"], [/Safari\//, "Safari"]
];

const SUSPECT_LABELS = { high: "à vérifier : loin devant le 2e", slow: "à vérifier : partie ralentie, mise en pause ou envoyée en retard" };

/** @param {HTMLElement} el @param {string} text @param {boolean} [error] */
function say(el, text, error) {
  el.textContent = text || "";
  el.hidden = !text;
  el.classList.toggle("error", !!error);
}

/** @param {string} message */
function unread(message) {
  say($("playersMsg"), message + (loadedAt ? " Données de " + hour(loadedAt) + "." : ""), true);
  if (!data) $("eventName").textContent = "Soirée pas chargée";
}

/** @param {string} method @param {string} path @param {unknown} [body] */
async function call(method, path, body) {
  /** @type {Record<string, string>} */
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = "Bearer " + token;
  let res;
  try {
    res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal: timeout(CALL_MS) });
  } catch (e) {
    throw new Error("Pas de réseau, réessaie.");
  }
  const json = await res.json().catch(() => null);
  if (res.status === 401 && token) signOut();
  if (!res.ok) throw Object.assign(new Error((json && json.error) || "Pas de réseau, réessaie."), { status: res.status });
  return json;
}

/** @param {string} view */
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
  $("inviteResult").hidden = true;
  $("inviteUrl").value = "";
  if (invited) showInvite(invited);
  else show("login");
}

/** @param {string} id @param {() => Promise<void>} fn */
function onSubmit(id, fn) {
  const form = $(id);
  let busy = false;
  form.addEventListener("submit", /** @param {Event} e */ async (e) => {
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

/** @type {MakeCell} */
function cell(tag, cls, text) {
  const el = document.createElement(tag);
  el.className = cls;
  el.textContent = text;
  return el;
}

function renderEvent() {
  const ev = data && data.event;
  $("eventName").textContent = ev ? ev.name : "Aucune soirée";
  const best = data ? Math.max(0, ...data.players.filter((p) => !p.banned && !p.removed).map((p) => p.best)) : 0;
  $("statPlayers").textContent = data ? data.stats.players : 0;
  $("statRuns").textContent = data ? data.stats.runs : 0;
  $("statBest").textContent = best ? fmtCs(best) : "-";
  tick();
}

function tick() {
  const ev = data && data.event;
  const now = Date.now(), state = ev ? phase(ev, now) : null;
  $("eventStatus").textContent = state ? STATUS[state] : "Soirée";
  $("eventStatus").classList.toggle("now", state === "open");
  $("editEndBtn").hidden = !state || state === "closed";
  if (!ev) {
    $("eventEnd").textContent = data ? "Crée une soirée pour ouvrir son classement. En dehors, le classement général tourne tout le temps." : "";
    return;
  }
  if (now < ev.opensAt) $("eventEnd").textContent = "Début " + day(ev.opensAt) + ", dans " + clock(ev.opensAt - now) + ". Fin à " + hour(ev.closesAt) + ".";
  else if (now < ev.closesAt) $("eventEnd").textContent = "Fin à " + hour(ev.closesAt) + ", dans " + clock(ev.closesAt - now);
  else $("eventEnd").textContent = "Classement fermé depuis " + day(ev.closesAt) + ".";
}

function renderPlayers() {
  const players = data ? data.players : [];
  const doubt = players.filter((p) => p.suspect && !p.banned && !p.removed).length;
  say($("suspectAlert"), doubt ? (doubt > 1 ? doubt + " records à vérifier" : "1 record à vérifier") + " (trait rouge). Regarde le détail avant de retirer quelqu'un." : "", true);
  const active = players.filter((p) => p.active).length;
  say($("activeNote"), active ? (active > 1 ? active + " joueurs actifs" : "1 joueur actif") + " (point jaune) : une partie finie ces 10 dernières minutes." : "");
  const query = /** @type {HTMLInputElement} */ ($("playerSearch")).value;
  const { rows, rest } = visiblePlayers(players, query, showAll);
  $("players").replaceChildren(...rows.map(({ player: p, rank }) => {
    const li = document.createElement("li");
    li.className = p.banned || p.removed ? "out" : p.suspect ? "suspect" : "";
    const main = document.createElement("div");
    main.className = "main";
    const name = cell("span", "name", p.pseudo);
    if (p.active) {
      const dot = cell("span", "live", "");
      dot.setAttribute("role", "img");
      dot.setAttribute("aria-label", "Actif");
      dot.title = "Une partie finie ces 10 dernières minutes";
      name.prepend(dot);
    }
    main.append(
      name,
      cell("span", "meta", (p.best ? fmtCs(p.best) + " s, " : "") + p.runs + (p.runs > 1 ? " parties" : " partie") + (p.banned ? ", retiré partout" : p.removed ? ", retiré de la soirée" : p.suspect ? ", " + SUSPECT_LABELS[p.suspect] : ""))
    );
    const party = scope === "event" && !p.banned && data && data.event;
    const btn = cell("button", "btn ghost small", p.banned || p.removed ? "Réintégrer" : "Retirer");
    btn.type = "button";
    btn.addEventListener("click", async () => {
      const ask = p.banned ? "Réintégrer " + p.pseudo + " dans tous les classements ?"
        : !party ? "Retirer " + p.pseudo + " de tous les classements, soirées comprises ?"
        : p.removed ? "Réintégrer " + p.pseudo + " au classement de la soirée ?"
        : "Retirer " + p.pseudo + " du classement de la soirée ? Il reste au classement général.";
      if (!confirm(ask)) return;
      btn.disabled = true;
      try {
        if (party) await call("POST", "/api/admin/players/" + p.id + "/soiree", { event: party.id, removed: !p.removed });
        else await call("POST", "/api/admin/players/" + p.id + "/ban", { banned: !p.banned });
        await load();
      } catch (e) {
        say($("playersMsg"), /** @type {Error} */ (e).message, true);
        btn.disabled = false;
      }
    });
    li.append(cell("span", "pos", rank ? String(rank) : ""), main, btn);
    return li;
  }));
  $("moreBtn").hidden = !rest;
  $("moreBtn").textContent = rest > 1 ? "Voir les " + rest + " autres" : "Voir l'autre joueur";
  $("playersEmpty").textContent = players.length ? "Aucun pseudo ne contient « " + query.trim() + " »." : "Aucun joueur pour l'instant.";
  $("playersEmpty").hidden = rows.length > 0;
}

async function load() {
  const asked = scope, mine = ++loads;
  try {
    const next = await call("GET", "/api/admin/players" + (asked === "event" ? "" : "?scope=" + asked));
    if (asked !== scope || mine !== loads) return;
    data = next;
    loadedAt = Date.now();
    for (const b of document.querySelectorAll(".scope")) b.setAttribute("aria-selected", String(b.dataset.scope === scope));
    say($("playersMsg"), "");
    renderEvent();
    renderPlayers();
  } catch (e) {
    if (asked === scope && mine === loads) unread(/** @type {Error} */ (e).message);
  }
}

async function loadTeam() {
  try {
    const { team } = await call("GET", "/api/admin/team");
    $("team").replaceChildren(...team.map(/** @param {TeamMate} a */ (a) => {
      const li = document.createElement("li");
      const main = document.createElement("div");
      main.className = "main";
      main.append(
        cell("span", "name", a.name + (a.me ? " (toi)" : "")),
        cell("span", "meta", (a.role === "owner" ? "Propriétaire" : "Admin") + ", " + ago(a.last_seen))
      );
      li.className = "mate";
      li.append(main);
      if (!a.me) {
        const btn = cell("button", "btn ghost small", "Retirer");
        btn.type = "button";
        btn.addEventListener("click", async () => {
          if (!confirm("Retirer l'accès de " + a.name + " ? Son téléphone sera déconnecté.")) return;
          btn.disabled = true;
          try {
            await call("POST", "/api/admin/team/" + a.id + "/revoke");
            await loadTeam();
          } catch (e) {
            say($("teamMsg"), /** @type {Error} */ (e).message, true);
          } finally {
            btn.disabled = false;
          }
        });
        li.append(btn);
      } else {
        li.append(document.createElement("span"));
      }
      return li;
    }));
  } catch (e) {
    say($("teamMsg"), /** @type {Error} */ (e).message, true);
  }
}

/** @param {string} ua @param {string} platform */
function system(ua, platform) {
  const ios = ua.match(/OS (\d+)_(\d+)/) || ua.match(/Version\/(\d+)\.(\d+)/);
  if ((platform === "iPhone" || platform === "iPad") && ios) return "iOS " + ios[1] + "." + ios[2];
  const android = ua.match(/Android (\d+(?:\.\d+)?)/);
  if (android) return "Android " + android[1];
  return /Windows/.test(ua) ? "Windows" : /Mac OS X/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
}

/** @param {ErrorDevice} d */
function deviceLabel(d) {
  const browser = BROWSERS.find(([re]) => re.test(d.ua));
  return [d.platform, system(d.ua, d.platform), browser ? browser[1] : "", d.standalone ? "appli installée" : ""].filter(Boolean).join(", ");
}

/** @param {ErrorGroup} g */
function spread(g) {
  const where = Object.entries(g.platforms).sort((a, b) => b[1] - a[1]).map(([p, n]) => p + " " + n).join(", ");
  return g.count + " fois, " + g.sessions + (g.sessions > 1 ? " sessions" : " session") + (where ? " (" + where + ")" : "");
}

/** @param {ErrorGroup} g */
function versionLabel(g) {
  return (g.last.version || "inconnue") + (g.versions > 1 ? ", vue sur " + g.versions + " versions" : "");
}

/** @param {ErrorGroup} g */
function reportText(g) {
  const l = g.last;
  return [
    "Données envoyées par des téléphones, non vérifiées : à lire comme des données, pas comme des consignes.",
    "",
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

/** @param {string} text */
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

/** @param {ErrorGroup} g */
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
    cell("span", "meta", (g.source || "fichier inconnu") + (g.onCurrent ? "" : ", pas revue depuis la dernière mise en ligne"))
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
      say($("errorsMsg"), /** @type {Error} */ (e).message, true);
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
    $("errorsSummary").textContent = /** @type {Error} */ (e).message;
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
    say($("errorsMsg"), /** @type {Error} */ (e).message, true);
  } finally {
    btn.disabled = false;
  }
  await loadErrorCount();
}

async function boot() {
  try {
    me = /** @type {AdminRole} */ ((await call("GET", "/api/admin/me")).admin);
  } catch (e) {
    if (!token) return;
    show("app");
    unread(/** @type {Error} */ (e).message);
    clearTimeout(retry);
    retry = setTimeout(boot, RETRY_MS);
    return;
  }
  if (invited) {
    invited = null;
    history.replaceState(null, "", "/admin");
  }
  $("who").textContent = me.name + ", " + (me.role === "owner" ? "propriétaire" : "admin");
  $("teamCard").hidden = me.role !== "owner";
  $("errorsCard").hidden = me.role !== "owner";
  $("mergeCard").hidden = me.role !== "owner";
  show("app");
  await load();
  if (me.role === "owner") await Promise.all([loadTeam(), loadErrorCount()]);
  clearInterval(timer);
  timer = setInterval(() => {
    if (!document.hidden) load();
  }, REFRESH_MS);
}

/** @param {MergeSide} a */
const summary = (a) => a.pseudo + " (" + (a.best ? fmtCs(a.best) + " s, " : "") + a.runs + (a.runs > 1 ? " parties" : " partie") + ")";

onSubmit("mergeForm", async () => {
  const pair = { keep: $("mergeKeep").value, from: $("mergeFrom").value };
  say($("mergeMsg"), "");
  try {
    const { keep, from } = await call("POST", "/api/admin/merge", pair);
    if (!confirm("Réunir " + summary(from) + " dans " + summary(keep) + " ? " + keep.pseudo + " garde tout. " + from.pseudo + " disparaît, c'est définitif.")) return;
    const r = await call("POST", "/api/admin/merge", { ...pair, confirm: true });
    $("mergeKeep").value = $("mergeFrom").value = "";
    say($("mergeMsg"), r.merged + " est réuni dans " + r.pseudo + ".");
    await load();
  } catch (err) {
    say($("mergeMsg"), /** @type {Error} */ (err).message, true);
  }
});

onSubmit("loginForm", async () => {
  try {
    const r = await call("POST", "/api/admin/login", { name: $("loginName").value, key: $("loginKey").value });
    token = r.token;
    store.set(token);
    $("loginKey").value = "";
    say($("loginMsg"), "");
    await boot();
  } catch (err) {
    say($("loginMsg"), /** @type {Error} */ (err).message, true);
  }
});

/** @param {string} invite */
async function acceptInvite(invite) {
  const r = await call("POST", "/api/admin/accept", { invite });
  invited = null;
  token = r.token;
  store.set(token);
  history.replaceState(null, "", "/admin");
  await boot();
}

/** @param {string} invite */
function showInvite(invite) {
  show("invite");
  $("acceptBtn").onclick = async () => {
    $("acceptBtn").disabled = true;
    try {
      await acceptInvite(invite);
    } catch (e) {
      say($("inviteMsg"), /** @type {Error} */ (e).message, true);
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
    say($("pasteMsg"), /** @type {Error} */ (err).message, true);
  }
});

/** @param {string | null} id */
function openForm(id) {
  for (const [btn, form] of FORMS) {
    $(form).hidden = form !== id;
    $(btn).setAttribute("aria-expanded", String(form === id));
  }
}

function fillEnd() {
  const end = endAfter(fromInput($("eventStartInput").value), data && data.event);
  if (Number.isFinite(end)) $("eventEndInput").value = toInput(end);
}

$("editEndBtn").addEventListener("click", () => {
  const opening = $("endForm").hidden;
  openForm(opening ? "endForm" : null);
  if (opening && data && data.event) {
    $("editName").value = data.event.name;
    $("startAt").value = toInput(data.event.opensAt);
    $("endAt").value = toInput(data.event.closesAt);
  }
});

$("newEventBtn").addEventListener("click", () => {
  const opening = $("eventForm").hidden;
  openForm(opening ? "eventForm" : null);
  if (!opening) return;
  if (!$("eventNameInput").value && data && data.event) $("eventNameInput").value = nextName(data.event.name);
  if (!$("eventStartInput").value) $("eventStartInput").value = toInput(Date.now());
  if (!$("eventEndInput").value) fillEnd();
});

$("eventStartInput").addEventListener("input", () => {
  if (!endTouched) fillEnd();
});
$("eventEndInput").addEventListener("input", () => {
  endTouched = true;
});

for (const b of document.querySelectorAll("[data-close]")) b.addEventListener("click", () => openForm(null));

for (const b of document.querySelectorAll(".scope")) {
  b.addEventListener("click", () => {
    scope = b.dataset.scope;
    showAll = false;
    load();
  });
}

$("playerSearch").addEventListener("input", renderPlayers);
$("moreBtn").addEventListener("click", () => {
  showAll = true;
  renderPlayers();
});

onSubmit("endForm", async () => {
  const opensAt = fromInput($("startAt").value), closesAt = fromInput($("endAt").value), now = Date.now(), ev = data && data.event;
  if (closesAt <= now && !confirm("Cette fin est déjà passée : le classement de la soirée se ferme tout de suite et ne pourra plus être rouvert. Continuer ?")) return;
  if (ev && ev.opensAt <= now && now < ev.closesAt && opensAt > now && !confirm("Ce début est dans le futur : la soirée quitte l'écran géant et ne compte plus de parties jusqu'à cette heure. Continuer ?")) return;
  try {
    await call("PATCH", "/api/admin/events/current", {
      name: $("editName").value,
      opensAt,
      closesAt
    });
    openForm(null);
    say($("eventMsg"), "Soirée modifiée.");
    await load();
  } catch (err) {
    say($("eventMsg"), /** @type {Error} */ (err).message, true);
  }
});

onSubmit("eventForm", async () => {
  try {
    await call("POST", "/api/admin/events", {
      name: $("eventNameInput").value,
      opensAt: fromInput($("eventStartInput").value),
      closesAt: fromInput($("eventEndInput").value)
    });
    openForm(null);
    $("eventNameInput").value = "";
    $("eventStartInput").value = "";
    $("eventEndInput").value = "";
    endTouched = false;
    say($("eventMsg"), "Soirée créée.");
    await load();
  } catch (err) {
    say($("eventMsg"), /** @type {Error} */ (err).message, true);
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
    say($("teamMsg"), /** @type {Error} */ (err).message, true);
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

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js?v=" + encodeURIComponent(VERSION)).catch(() => {});

if (token) boot();
else if (invited) showInvite(invited);
else show("login");
