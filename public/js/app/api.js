import { VERSION } from "../version.js";
import { store, session, KEYS } from "../shared/store.js";

const RELOAD_GAP = 15000;

export const net = { token: store.get(KEYS.playerToken), board: null, offset: 0, online: true, updatePending: false };
let localBest = parseInt(store.get(KEYS.localBest) || "0", 10) || 0;
const listeners = { board: [], update: [] };

export const on = (name, fn) => listeners[name].push(fn);
const emit = (name) => listeners[name].forEach((fn) => fn());

export async function call(method, path, body) {
  const headers = { "content-type": "application/json", "x-app-version": VERSION };
  if (net.token) headers.authorization = "Bearer " + net.token;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined });
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
    ? { best: me.eventBest || 0, rank: me.eventRank, count: net.board.eventCount }
    : { best: me.best, rank: me.rank, count: net.board.count };
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

export async function submitScore(score, pending) {
  const run = await pending;
  if (run.error) return run;
  for (let i = 0; i < 3; i++) {
    try {
      const r = await call("POST", "/api/runs/" + run.runId, { score });
      const me = net.board && net.board.me;
      if (me) {
        Object.assign(me, { best: r.best, rank: r.rank });
        net.board.count = r.count;
        if (r.eventBest !== null) {
          Object.assign(me, { eventBest: r.eventBest, eventRank: r.eventRank });
          net.board.eventCount = r.eventCount;
        }
      }
      refreshBoard();
      return r;
    } catch (e) {
      if (e.status) return { error: e.message };
      await new Promise((ok) => setTimeout(ok, 1500));
    }
  }
  return { error: "Hors ligne : score non envoyé" };
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
