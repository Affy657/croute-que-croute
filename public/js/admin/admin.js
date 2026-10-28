import { store as storage, KEYS } from "../shared/store.js";
import { fmtCs, clock } from "../shared/format.js";
import { prepareSfx, previewSfx } from "../app/audio.js";
import { renderWeapons, renderAttacks, animateAttacks } from "../app/catalog.js";

const $ = (id) => document.getElementById(id);
const REFRESH_MS = 10000;
const SFX_LABELS = { start: "Départ", near: "Frôlé", death: "Mort", record: "Record", first: "1re place" };
const store = {
  get: () => storage.get(KEYS.adminToken),
  set: (v) => storage.set(KEYS.adminToken, v || null)
};

let token = store.get();
let me = null;
let data = null;
let timer = null;
let scope = "event";
const STATUS = { open: "Soirée en cours", upcoming: "Prochaine soirée", closed: "Dernière soirée" };

const day = (ms) => new Date(ms).toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" }) + " à " + hour(ms);
const hour = (ms) => new Date(ms).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
const toInput = (ms) => new Date(ms - new Date(ms).getTimezoneOffset() * 60000).toISOString().slice(0, 16);
const fromInput = (value) => (value ? new Date(value).getTime() : NaN);

function ago(ms) {
  const min = Math.floor((Date.now() - ms) / 60000);
  if (min < 5) return "actif à l'instant";
  if (min < 60) return "vu il y a " + min + " min";
  if (min < 1440) return "vu il y a " + Math.floor(min / 60) + " h";
  return "vu il y a " + Math.floor(min / 1440) + " j";
}

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
  clearInterval(timer);
  show("login");
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
      cell("span", "meta", (p.best ? fmtCs(p.best) + " s, " : "") + p.runs + (p.runs > 1 ? " parties" : " partie") + (p.banned ? ", retiré" : p.suspect ? ", record à vérifier" : ""))
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
  try {
    data = await call("GET", "/api/admin/players" + (scope === "general" ? "?scope=general" : ""));
    for (const b of document.querySelectorAll(".scope")) b.setAttribute("aria-selected", String(b.dataset.scope === scope));
    say($("playersMsg"), "");
    renderEvent();
    renderPlayers();
  } catch (e) {
    say($("playersMsg"), e.message, true);
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

async function boot() {
  try {
    me = (await call("GET", "/api/admin/me")).admin;
  } catch (e) {
    if (!token) return;
    show("app");
    say($("playersMsg"), e.message, true);
    return;
  }
  $("who").textContent = me.name + ", " + (me.role === "owner" ? "propriétaire" : "admin");
  $("teamCard").hidden = me.role !== "owner";
  show("app");
  await load();
  if (me.role === "owner") await loadTeam();
  clearInterval(timer);
  timer = setInterval(() => {
    if (!document.hidden) load();
  }, REFRESH_MS);
}

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
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

$("pasteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
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

$("endForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  try {
    await call("PATCH", "/api/admin/events/current", { opensAt: fromInput($("startAt").value), closesAt: fromInput($("endAt").value) });
    $("endForm").hidden = true;
    say($("eventMsg"), "Horaires enregistrés.");
    await load();
  } catch (err) {
    say($("eventMsg"), err.message, true);
  }
});

$("eventForm").addEventListener("submit", async (e) => {
  e.preventDefault();
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

$("inviteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
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

document.addEventListener("visibilitychange", () => {
  if (!document.hidden && me) load();
});

setInterval(() => {
  if (me) tick();
}, 1000);

const TABS = ["party", "weapons", "attacks"];
const built = {};

function openTab(name) {
  for (const tab of TABS) {
    $("tab-" + tab).hidden = tab !== name;
    document.querySelector(`[data-tab="${tab}"]`).setAttribute("aria-selected", String(tab === name));
  }
  if (name === "weapons" && !built.weapons) renderWeapons($("tab-weapons"));
  if (name === "attacks" && !built.attacks) renderAttacks($("tab-attacks"));
  built[name] = true;
  animateAttacks(name === "attacks" && !document.hidden);
  window.scrollTo(0, 0);
}

for (const button of document.querySelectorAll("[data-tab]")) {
  button.addEventListener("click", () => openTab(button.dataset.tab));
}

document.addEventListener("visibilitychange", () => {
  animateAttacks(!$("tab-attacks").hidden && !document.hidden);
});

prepareSfx();
$("sfxList").replaceChildren(...Object.entries(SFX_LABELS).map(([name, label]) => {
  const btn = cell("button", "btn ghost small", label);
  btn.type = "button";
  btn.addEventListener("click", () => previewSfx(name));
  return btn;
}));

if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});

const invite = new URLSearchParams(location.hash.slice(1)).get("invite");
if (invite) showInvite(invite);
else if (token) boot();
else show("login");
