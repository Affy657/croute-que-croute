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
export const hasEvent = () => !!(net.board && net.board.event);
export const registered = () => !!(net.board && net.board.me);
export const isOpen = () => hasEvent() && serverNow() < net.board.event.closesAt;
export const canCompete = () => registered() && isOpen();
export const knownBest = () => (registered() ? net.board.me.best : localBest);

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
    if (net.token && b.event && !b.me) setToken(null);
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
      if (net.board && net.board.me) {
        net.board.me.best = r.best;
        net.board.me.rank = r.rank;
        net.board.count = r.count;
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
