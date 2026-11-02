import { fmtCs, clock, hourOf } from "../shared/format.js";
import { screenBanner, SOON_MS } from "../shared/banner.js";
import { rain, bounce } from "../app/party.js";
import { timeout } from "../shared/timeout.js";
import { VERSION } from "../version.js";

const POLL_MS = 10000, QUIET_POLL_MS = 60000, OFFLINE_MISSES = 2, FETCH_MS = 8000, ROWS = 10, FEED_ROWS = 4, IDLE_MS = 3000, CROWN_MS = 6000;
const $ = (id) => document.getElementById(id);
let board = null, offset = 0, shown = null, idleTimer = null, lock = null, seen = null, crownTimer = null, busy = false, stale = false;
let lastOk = 0, lastAsk = 0, misses = 0;

document.documentElement.dataset.version = VERSION;
const now = () => Date.now() + offset;

function view() {
  const ev = board.event;
  return ev
    ? { title: ev.name, top: board.eventTop, count: board.eventCount, ev }
    : { title: "Classement général", top: board.top, count: board.count, ev: null };
}

function row(r) {
  const li = document.createElement("li");
  for (const [cls, text] of [["pos", String(r.rank)], ["name", r.pseudo], ["val", fmtCs(r.best)]]) {
    const span = document.createElement("span");
    span.className = cls;
    span.textContent = text;
    li.append(span);
  }
  return li;
}

function crown(r) {
  const el = $("crown");
  $("crownName").textContent = r.pseudo;
  $("crownTime").textContent = fmtCs(r.best) + " s";
  el.hidden = true;
  void el.offsetWidth;
  el.hidden = false;
  clearTimeout(crownTimer);
  crownTimer = setTimeout(() => { el.hidden = true; }, CROWN_MS);
}

function render() {
  const v = view();
  const top = v.top.slice(0, ROWS);
  $("title").textContent = v.title;
  const rows = top.map(row);
  if (shown && shown.title === v.title) {
    top.forEach((r, i) => {
      if (!shown.bests.has(r.best)) rows[i].classList.add("up");
    });
    const first = top[0];
    if (first && shown.first && first.pseudo !== shown.first.pseudo && first.best > shown.first.best) {
      bounce(rows[0]);
      crown(first);
      rain();
    }
  }
  shown = { title: v.title, first: top[0] || null, bests: new Set(top.map((r) => r.best)) };
  $("list").replaceChildren(...rows);
  $("empty").hidden = rows.length > 0;
  $("players").textContent = v.count ? v.count + (v.count > 1 ? " joueurs" : " joueur") : "";
  tick();
}

function setCountdown(label, ms) {
  const el = $("countdown");
  const digits = document.createElement("span");
  digits.className = "digits";
  digits.textContent = clock(Math.max(0, ms));
  el.replaceChildren(label, digits);
  el.hidden = false;
}

function tick() {
  const off = $("offline");
  off.hidden = misses < OFFLINE_MISSES;
  off.textContent = board ? "Pas de réseau : classement de " + hourOf(lastOk) : "Pas de réseau";
  if (!board) return;
  const el = $("countdown"), t = now(), s = screenBanner(board, t);
  if (!s) el.hidden = true;
  else if (s.label) setCountdown(s.label, s.target - t);
  else {
    el.textContent = s.text;
    el.hidden = false;
  }
}

function feedLine(item) {
  const li = document.createElement("li");
  const name = document.createElement("b");
  name.textContent = item.pseudo;
  if (item.kind === "best") li.append(name, " vient de faire " + fmtCs(item.score) + " s");
  else li.append("Bienvenue ", name, " !");
  return li;
}

function renderFeed(items) {
  const keys = items.map((i) => i.kind + i.pseudo + i.at);
  const rows = items.slice(0, FEED_ROWS).map((item, i) => {
    const li = feedLine(item);
    if (seen && !seen.has(keys[i])) li.classList.add("new");
    return li;
  });
  seen = new Set(keys);
  $("feed").replaceChildren(...rows);
}

async function grab(path) {
  const res = await fetch(path, { cache: "no-store", signal: timeout(FETCH_MS) });
  if (!res.ok) throw new Error(path);
  return res.json();
}

function reloadSoon() {
  stale = true;
  if (!document.fullscreenElement) location.reload();
}

async function refresh() {
  if (busy) return;
  busy = true;
  lastAsk = Date.now();
  const [next, live] = await Promise.allSettled([grab("/api/board"), grab("/api/feed")]);
  busy = false;
  if (next.status === "fulfilled") {
    lastOk = Date.now();
    misses = 0;
  } else misses++;
  tick();
  if (next.status === "fulfilled" && (!board || next.value.now >= board.now)) {
    if (board && next.value.version !== board.version) reloadSoon();
    board = next.value;
    offset = board.now - Date.now();
    render();
  }
  if (live.status === "fulfilled") renderFeed(live.value.items);
}

function lively() {
  if (!board) return true;
  const t = now(), ev = board.event, next = board.next;
  return !!(ev && t < ev.finalAt) || !!(next && next.opensAt - t < SOON_MS);
}

function poll() {
  if (document.hidden || (!lively() && Date.now() - lastAsk < QUIET_POLL_MS)) return;
  refresh();
}

async function keepAwake() {
  try {
    if (navigator.wakeLock && !lock) {
      lock = await navigator.wakeLock.request("screen");
      lock.addEventListener("release", () => { lock = null; });
    }
  } catch (e) {}
}

function wake() {
  document.body.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => document.body.classList.add("idle"), IDLE_MS);
}

$("host").textContent = location.host;
$("fullBtn").addEventListener("click", () => {
  keepAwake();
  if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
});
document.addEventListener("fullscreenchange", () => {
  $("fullBtn").hidden = !!document.fullscreenElement;
  if (stale && !document.fullscreenElement) location.reload();
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) return;
  if (lock === null) keepAwake();
  refresh();
});
document.addEventListener("pointermove", wake);
wake();
keepAwake();
refresh();
setInterval(poll, POLL_MS);
setInterval(tick, 1000);
