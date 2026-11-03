import { fmtCs, clock, hourOf } from "../shared/format.js";
import { screenBanner, liveScreen } from "../shared/banner.js";
import { rain, bounce } from "../app/party.js";
import { timeout } from "../shared/timeout.js";
import { VERSION } from "../version.js";

const TICK_MS = 1000, FAST_POLL_MS = 2000, FALLBACK_FULL_MS = 15000, SAFE_POLL_MS = 60000, QUIET_POLL_MS = 60000, PUSH_GAP_MS = 1000, OFFLINE_MISSES = 2, FETCH_MS = 8000, ROWS = 10, FEED_ROWS = 6, IDLE_MS = 3000, CROWN_MS = 6000;
const LAST_MS = 60000, LONG_WIN = 16, MOVE_MS = 700, PING_MS = 25000, PONG_MS = 10000, RETRY_MS = [1000, 2000, 5000, 10000, 30000], RECHECK_MS = 11000;
const $ = (id) => document.getElementById(id);
const calm = matchMedia("(prefers-reduced-motion: reduce)");
let board = null, offset = 0, shown = null, idleTimer = null, lock = null, seen = null, crownTimer = null, busy = false, again = false, stale = false;
let lastOk = 0, lastAsk = 0, lastFull = 0, misses = 0, ended = null;
let socket = null, live = false, tries = 0, retryTimer = null, pingTimer = null, pongTimer = null, pushTimer = null, lastPush = 0, recheckTimer = null, opened = null;

document.documentElement.dataset.version = VERSION;
const now = () => Date.now() + offset;
const title = () => (board.event ? board.event.name : "Classement général");

function row(r) {
  const li = document.createElement("li");
  li.dataset.id = r.id;
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

function slide(rows, before) {
  for (const li of rows) {
    const was = before.get(li.dataset.id);
    if (was === undefined) continue;
    const dy = was - li.getBoundingClientRect().top;
    if (Math.abs(dy) > 1) li.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], { duration: MOVE_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
  }
}

function render() {
  const top = board.top.slice(0, ROWS), name = title();
  const before = new Map([...$("list").children].map((li) => [li.dataset.id, li.getBoundingClientRect().top]));
  const rows = top.map(row);
  if (shown && shown.title === name) {
    top.forEach((r, i) => {
      if (!shown.bests.has(r.best)) rows[i].classList.add("up");
    });
    const first = top[0];
    if (first && shown.first && first.pseudo !== shown.first.pseudo && first.best > shown.first.best && !(first.at <= shown.last)) {
      bounce(rows[0]);
      crown(first);
      rain();
    }
  }
  shown = { title: name, first: top[0] || null, bests: new Set(top.map((r) => r.best)), last: board.last };
  $("list").replaceChildren(...rows);
  if (!calm.matches) slide(rows, before);
  $("empty").hidden = rows.length > 0;
  $("players").textContent = board.count ? board.count + (board.count > 1 ? " joueurs" : " joueur") : "";
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

function celebrate(t) {
  const ev = board.event, over = !!(ev && t >= ev.closesAt);
  $("list").classList.toggle("over", over);
  if (over && ended === false) {
    const first = $("list").firstElementChild;
    if (first) bounce(first);
    rain();
  }
  ended = over;
}

function tick() {
  const off = $("offline");
  off.hidden = misses < OFFLINE_MISSES;
  off.textContent = board ? "Pas de réseau : classement de " + hourOf(lastOk) : "Pas de réseau";
  if (!board) return;
  const el = $("countdown"), t = now(), s = screenBanner(board, t);
  if (board.next && t >= board.next.opensAt && opened !== board.next.opensAt) {
    opened = board.next.opensAt;
    refresh(true);
  }
  const hot = !!(s && s.final), win = !!(s && s.win);
  $("title").textContent = title();
  el.classList.toggle("final", hot);
  el.classList.toggle("last", hot && s.target - t <= LAST_MS);
  el.classList.toggle("win", win);
  el.classList.toggle("long", win && s.text.length > LONG_WIN);
  document.body.classList.toggle("hot", hot || win);
  if (!s) el.hidden = true;
  else if (s.label) setCountdown(s.label, s.target - t);
  else {
    el.textContent = s.text;
    el.hidden = false;
  }
  celebrate(t);
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
  $("live").hidden = rows.length === 0;
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

async function refresh(full) {
  if (busy) {
    if (full) again = true;
    return;
  }
  busy = true;
  lastAsk = Date.now();
  if (full || !board) lastFull = lastAsk;
  const next = await grab("/api/ecran" + (!full && board ? "?v=" + encodeURIComponent(board.stamp) : "")).catch(() => null);
  busy = false;
  if (next) {
    lastOk = Date.now();
    misses = 0;
  } else misses++;
  if (next && (!board || next.now >= board.now)) {
    if (board && next.version !== board.version) reloadSoon();
    offset = next.now - Date.now();
    if (next.same) board = { ...board, now: next.now, event: next.event, next: next.next };
    else {
      board = next;
      render();
      renderFeed(next.feed);
    }
  }
  tick();
  if (again) {
    again = false;
    refresh(true);
  }
}

const lively = () => !board || liveScreen(board, now());

function push() {
  clearTimeout(recheckTimer);
  recheckTimer = setTimeout(() => {
    recheckTimer = null;
    if (!document.hidden) refresh(true);
  }, RECHECK_MS);
  if (pushTimer) return;
  pushTimer = setTimeout(() => {
    pushTimer = null;
    lastPush = Date.now();
    refresh(true);
  }, Math.max(0, lastPush + PUSH_GAP_MS - Date.now()));
}

function quiet() {
  clearInterval(pingTimer);
  clearTimeout(pongTimer);
}

function drop(ws) {
  if (socket !== ws) return;
  socket = null;
  live = false;
  quiet();
  if (document.hidden || !lively()) return;
  retryTimer = setTimeout(() => {
    retryTimer = null;
    if (!document.hidden && lively()) connect();
  }, RETRY_MS[Math.min(tries++, RETRY_MS.length - 1)]);
}

function connect() {
  if (socket || retryTimer || !window.WebSocket) return;
  const ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/api/live");
  socket = ws;
  ws.onopen = () => {
    live = true;
    tries = 0;
    refresh(true);
    quiet();
    pingTimer = setInterval(() => {
      ws.send("ping");
      clearTimeout(pongTimer);
      pongTimer = setTimeout(() => {
        drop(ws);
        ws.close();
      }, PONG_MS);
    }, PING_MS);
  };
  ws.onmessage = (e) => {
    if (e.data === "pong") clearTimeout(pongTimer);
    else if (!document.hidden) push();
  };
  ws.onclose = () => drop(ws);
  ws.onerror = () => ws.close();
}

function disconnect() {
  clearTimeout(retryTimer);
  retryTimer = null;
  const ws = socket;
  if (!ws) return;
  drop(ws);
  ws.close();
}

function poll() {
  if (document.hidden) return;
  const since = Date.now() - lastAsk;
  if (!lively()) {
    disconnect();
    if (since >= QUIET_POLL_MS) refresh(true);
    return;
  }
  connect();
  if (live ? since >= SAFE_POLL_MS : since >= FAST_POLL_MS) refresh(live || Date.now() - lastFull >= FALLBACK_FULL_MS);
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
  if (document.hidden) {
    disconnect();
    return;
  }
  if (lock === null) keepAwake();
  refresh(true);
});
document.addEventListener("pointermove", wake);
wake();
keepAwake();
refresh(true);
setInterval(poll, TICK_MS);
setInterval(tick, TICK_MS);
