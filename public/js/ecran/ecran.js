import { fmtCs, clock } from "../shared/format.js";
import { rain, bounce } from "../app/party.js";

const POLL_MS = 10000, ROWS = 10, FEED_ROWS = 4, IDLE_MS = 3000, SOON_MS = 24 * 3600 * 1000, CROWN_MS = 6000;
const $ = (id) => document.getElementById(id);
let board = null, offset = 0, shown = null, idleTimer = null, lock = null, seen = null, crownTimer = null;

const now = () => Date.now() + offset;

function when(ms) {
  const d = new Date(ms);
  const day = d.toLocaleDateString("fr-FR", { weekday: "long", day: "2-digit", month: "2-digit" });
  return day + " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

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
    if (first && shown.first && first.pseudo !== shown.first.pseudo && first.best !== shown.first.best) {
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
  if (!board) return;
  const el = $("countdown"), v = view(), t = now(), next = board.next;
  if (v.ev && v.ev.status === "open") setCountdown("Fin dans ", v.ev.closesAt - t);
  else if (next && next.opensAt - t < SOON_MS) setCountdown("Début dans ", next.opensAt - t);
  else if (next) {
    el.textContent = "Prochaine soirée " + when(next.opensAt);
    el.hidden = false;
  } else if (v.ev && v.top[0]) {
    el.textContent = "Bravo " + v.top[0].pseudo + " !";
    el.hidden = false;
  } else {
    el.hidden = true;
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

async function refresh() {
  try {
    const [res, live] = await Promise.all([fetch("/api/board", { cache: "no-store" }), fetch("/api/feed", { cache: "no-store" })]);
    if (!res.ok) return;
    const next = await res.json();
    if (board && next.version !== board.version) location.reload();
    board = next;
    offset = board.now - Date.now();
    render();
    if (live.ok) renderFeed((await live.json()).items);
  } catch (e) {}
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
document.addEventListener("fullscreenchange", () => { $("fullBtn").hidden = !!document.fullscreenElement; });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && lock === null && document.fullscreenElement) keepAwake();
});
document.addEventListener("pointermove", wake);
wake();
refresh();
setInterval(refresh, POLL_MS);
setInterval(tick, 1000);
