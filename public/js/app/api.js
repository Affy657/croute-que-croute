import { VERSION } from "../version.js";
import { store, session, KEYS } from "../shared/store.js";

const RELOAD_GAP = 15000;
const SEND_TRIES = 3, SEND_GAP_MS = 1500, WAIT_GAP_MS = 5000, WAIT_MS = 120000, SEND_TIMEOUT_MS = 8000;

export const net = { token: store.get(KEYS.playerToken), board: null, offset: 0, online: true, updatePending: false };
let localBest = parseInt(store.get(KEYS.localBest) || "0", 10) || 0;
const listeners = { board: [], update: [] };

export const on = (name, fn) => listeners[name].push(fn);
const emit = (name) => listeners[name].forEach((fn) => fn());

export async function call(method, path, body, timeoutMs) {
  const headers = { "content-type": "application/json", "x-app-version": VERSION };
  if (net.token) headers.authorization = "Bearer " + net.token;
  const signal = timeoutMs && AbortSignal.timeout ? AbortSignal.timeout(timeoutMs) : undefined;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = new Error((data && data.error) || "Erreur réseau.");
    err.status = res.status;
    if (res.status === 426) requestUpdate();
    throw err;
  }
  return data;
}

export const serverNow = () => Date.now() + net.offset;
export const registered = () => !!(net.board && net.board.me);

export function openEvent() {
  const b = net.board;
  if (!b) return null;
  const now = serverNow();
  return [b.event, b.next].find((e) => e && now >= e.opensAt && now < e.closesAt) || null;
}

export const isOpen = () => !!openEvent();

export function recentEvent() {
  const e = net.board && net.board.event;
  return e && !isOpen() && serverNow() >= e.closesAt ? e : null;
}

export function upcomingEvent() {
  const e = net.board && net.board.next;
  return e && serverNow() < e.opensAt ? e : null;
}

export const canCompete = () => registered() && !net.board.me.banned;

export function standing(scope = isOpen() ? "event" : "general") {
  if (!registered()) return { best: localBest, rank: null, count: 0 };
  const { me } = net.board;
  return scope === "event"
    ? { best: me.eventBest || 0, rank: me.eventRank, count: net.board.eventCount, rival: me.eventRival }
    : { best: me.best, rank: me.rank, count: net.board.count, rival: me.rival };
}

export const knownBest = () => standing().best;

export function leader(scope = isOpen() ? "event" : "general") {
  const b = net.board;
  return (b && (scope === "event" ? b.eventTop || [] : b.top)[0]) || null;
}

export function saveLocalBest(score) {
  if (registered() || score <= localBest) return;
  localBest = score;
  store.set(KEYS.localBest, localBest);
}

export async function refreshBoard() {
  try {
    const b = await call("GET", "/api/board");
    net.offset = b.now - Date.now();
    net.online = true;
    if (net.token && !b.me) setToken(null);
    net.board = b;
    if (b.version && b.version !== VERSION) requestUpdate();
  } catch (e) {
    net.online = false;
  }
  emit("board");
}

function setToken(token) {
  net.token = token;
  store.set(KEYS.playerToken, token);
}

function clientId() {
  let id = store.get(KEYS.clientId);
  if (!id || !/^[a-f0-9]{32}$/.test(id)) {
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    store.set(KEYS.clientId, id);
  }
  return id;
}

export async function join(pseudo) {
  const r = await call("POST", "/api/join", { pseudo, clientId: clientId() });
  setToken(r.token);
  await refreshBoard();
}

export function startRun() {
  if (!canCompete()) return null;
  return call("POST", "/api/runs").catch((e) => ({
    error: e.status ? e.message : "Hors ligne : score non compté",
    status: e.status
  }));
}

function pendingScores() {
  try {
    return JSON.parse(store.get(KEYS.pendingScores) || "[]");
  } catch (e) {
    return [];
  }
}

const keepPending = (list) => store.set(KEYS.pendingScores, list.length ? JSON.stringify(list) : null);
const clearPending = (runId) => keepPending(pendingScores().filter((p) => p.runId !== runId));

function markPending(runId, score, at) {
  const list = pendingScores();
  if (!list.some((p) => p.runId === runId)) keepPending([...list, { runId, score, at }]);
}

function applyResult(r) {
  const me = net.board && net.board.me;
  if (me) {
    Object.assign(me, { best: r.best, rank: r.rank, rival: r.rival });
    net.board.count = r.count;
    if (r.eventBest !== null) {
      Object.assign(me, { eventBest: r.eventBest, eventRank: r.eventRank, eventRival: r.eventRival });
      net.board.eventCount = r.eventCount;
    }
  }
  refreshBoard();
}

async function send(runId, score, onWait, since = Date.now()) {
  markPending(runId, score, since);
  for (let i = 0; ; i++) {
    try {
      const r = await call("POST", "/api/runs/" + runId, { score }, SEND_TIMEOUT_MS);
      clearPending(runId);
      applyResult(r);
      return r;
    } catch (e) {
      if (e.status) {
        clearPending(runId);
        return { error: e.message };
      }
      if (i === SEND_TRIES - 1 && onWait) onWait();
      if (i >= SEND_TRIES - 1 && Date.now() - since > WAIT_MS) {
        clearPending(runId);
        return { error: "Hors ligne : score non envoyé" };
      }
      await new Promise((ok) => setTimeout(ok, i < SEND_TRIES - 1 ? SEND_GAP_MS : WAIT_GAP_MS));
    }
  }
}

export async function submitScore(score, pending, onWait) {
  const run = await pending;
  if (run.error) return run;
  return send(run.runId, score, onWait);
}

export function resumePending() {
  const now = Date.now();
  const list = pendingScores().filter((p) => now - p.at < WAIT_MS);
  keepPending(list);
  for (const p of list) send(p.runId, p.score, null, p.at);
}

export function requestUpdate() {
  net.updatePending = true;
  emit("update");
}

export function applyUpdate() {
  const last = Number(session.get(KEYS.lastReload)) || 0;
  if (Date.now() - last < RELOAD_GAP) return false;
  session.set(KEYS.lastReload, Date.now());
  location.reload();
  return true;
}
