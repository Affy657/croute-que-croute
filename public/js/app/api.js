import { VERSION } from "../version.js";
import { store, session, KEYS } from "../shared/store.js";
import { guessDevice } from "./input.js";
import { LOCAL } from "../shared/local.js";
import { timeout } from "../shared/timeout.js";
import { openOf, recentOf, upcomingOf } from "../shared/banner.js";

const RELOAD_GAP = 15000;
const UPDATED = "Partie pas comptée : le jeu a été mis à jour, il se recharge quand tu rejoues.";
const SEND_TRIES = 3, SEND_GAP_MS = 1500, WAIT_GAP_MS = 5000, WAIT_MS = 120000, SEND_TIMEOUT_MS = 8000;

export const reason = (e, offline = "Pas de réseau, réessaie.") => (e.status ? e.message : offline);

if (LOCAL) {
  const params = new URLSearchParams(location.search), seeded = params.get("jeton");
  if (seeded && /^[a-f0-9]{48}$/.test(seeded)) {
    store.set(KEYS.playerToken, seeded);
    params.delete("jeton");
    const rest = params.toString();
    history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
  }
}

export const net = { token: store.get(KEYS.playerToken), board: null, offset: 0, online: true, updatePending: false };
let localBest = parseInt(store.get(KEYS.localBest) || "0", 10) || 0, saved = readBests();
let boardAsked = 0, boardShown = 0, lastDevice = null, resumed = false;
const listeners = { board: [], update: [], result: [] };

function readBests() {
  try {
    const b = JSON.parse(store.get(KEYS.myBests) || "null");
    return b && typeof b === "object" ? b : null;
  } catch (e) {
    return null;
  }
}

function keepBests(me) {
  saved = { best: me.best || 0, pcBest: me.pcBest || 0 };
  store.set(KEYS.myBests, JSON.stringify(saved));
}

export const on = (name, fn) => listeners[name].push(fn);
const emit = (name, value) => listeners[name].forEach((fn) => fn(value));
const settled = (status) => status && status < 500 && status !== 408 && status !== 429;

export async function call(method, path, body, timeoutMs) {
  const headers = { "content-type": "application/json", "x-app-version": VERSION };
  if (net.token) headers.authorization = "Bearer " + net.token;
  const signal = timeoutMs ? timeout(timeoutMs) : undefined;
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = Object.assign(new Error((data && data.error) || "Erreur réseau."), { status: res.status, data });
    if (res.status === 426) requestUpdate();
    throw err;
  }
  return data;
}

export const serverNow = () => Date.now() + net.offset;
export const registered = () => !!(net.board && net.board.me);

export const openEvent = () => openOf(net.board, serverNow());
export const isOpen = () => !!openEvent();
export const recentEvent = () => recentOf(net.board, serverNow());
export const upcomingEvent = () => upcomingOf(net.board, serverNow());

export const canCompete = () => registered() && !net.board.me.banned;

export const setDevice = (device) => { lastDevice = device; };
export const onPc = () => (lastDevice || guessDevice()) === "pc";
export const myScope = () => (onPc() ? "pc" : isOpen() ? "event" : "general");

export function standing(scope = myScope()) {
  if (!registered()) return { best: net.token && saved ? (scope === "pc" ? saved.pcBest : saved.best) : localBest, rank: null, count: 0 };
  const { me } = net.board;
  if (scope === "event") return { best: me.eventBest || 0, rank: me.eventRank, count: net.board.eventCount, rival: me.eventRival };
  if (scope === "pc") return { best: me.pcBest || 0, rank: me.pcRank, count: net.board.pcCount, rival: me.pcRival };
  return { best: me.best, rank: me.rank, count: net.board.count, rival: me.rival };
}

export const knownBest = () => standing().best;

export function leader(scope = myScope()) {
  const b = net.board;
  return (b && (scope === "event" ? b.eventTop || [] : scope === "pc" ? b.pcTop || [] : b.top)[0]) || null;
}

export function saveLocalBest(score, scope) {
  if (registered()) return;
  if (net.token && saved) {
    const key = scope === "pc" ? "pcBest" : "best";
    if (score > saved[key]) keepBests({ ...saved, [key]: score });
    return;
  }
  if (score <= localBest) return;
  localBest = score;
  store.set(KEYS.localBest, localBest);
}

async function resume() {
  resumed = true;
  try {
    const r = await call("POST", "/api/resume", null, SEND_TIMEOUT_MS);
    if (r.token && !net.token) setToken(r.token);
  } catch (e) {}
}

export async function refreshBoard() {
  if (!net.token && !resumed) await resume();
  const asked = ++boardAsked, token = net.token;
  try {
    const b = await call("GET", "/api/board");
    if (asked < boardShown || token !== net.token) return;
    boardShown = asked;
    net.offset = b.now - Date.now();
    net.online = true;
    if (net.token && !b.me) setToken(null);
    net.board = b;
    if (b.me) keepBests(b.me);
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

export async function linkWith(code, merge = false) {
  const r = await call("POST", "/api/link", { code, clientId: clientId(), merge });
  if (r.token) setToken(r.token);
  await refreshBoard();
  return r;
}

export const newLinkCode = () => call("POST", "/api/me/link");
export const logoutOthers = () => call("DELETE", "/api/me/devices");

export async function rename(pseudo) {
  await call("PATCH", "/api/me", { pseudo });
  await refreshBoard();
}

export function startRun(body) {
  if (!net.token || (net.board && !canCompete())) return null;
  return call("POST", "/api/runs", body, SEND_TIMEOUT_MS).catch((e) => ({
    error: e.status === 426 ? UPDATED : reason(e, "Hors ligne : score non compté"),
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

function markPending(runId, score, device, combo, at) {
  const list = pendingScores();
  if (!list.some((p) => p.runId === runId)) keepPending([...list, { runId, score, device, combo, at }]);
}

function applyResult(r) {
  const me = net.board && net.board.me;
  if (me) {
    Object.assign(me, { best: r.best, rank: r.rank, rival: r.rival, pcBest: r.pcBest, pcRank: r.pcRank, pcRival: r.pcRival });
    Object.assign(net.board, { count: r.count, pcCount: r.pcCount });
    keepBests(me);
    if (r.eventBest !== null) {
      Object.assign(me, { eventBest: r.eventBest, eventRank: r.eventRank, eventRival: r.eventRival });
      net.board.eventCount = r.eventCount;
    }
  }
  refreshBoard();
}

async function send(runId, score, device, combo, onWait, since = Date.now()) {
  markPending(runId, score, device, combo, since);
  for (let i = 0; ; i++) {
    try {
      const r = await call("POST", "/api/runs/" + runId, { score, device, combo }, SEND_TIMEOUT_MS);
      clearPending(runId);
      applyResult(r);
      emit("result", r);
      return r;
    } catch (e) {
      if (settled(e.status)) {
        clearPending(runId);
        return { error: e.message };
      }
      if (i === SEND_TRIES - 1 && onWait) onWait();
      if (i >= SEND_TRIES - 1 && Date.now() - since > WAIT_MS) {
        clearPending(runId);
        return { error: reason(e, "Hors ligne : score non envoyé") };
      }
      await new Promise((ok) => setTimeout(ok, i < SEND_TRIES - 1 ? SEND_GAP_MS : WAIT_GAP_MS));
    }
  }
}

export async function submitScore(score, device, combo, pending, onWait) {
  const run = await pending;
  if (run.error) return run;
  return send(run.runId, score, device, combo, onWait);
}

export function resumePending() {
  const now = Date.now();
  const list = pendingScores().filter((p) => now - p.at < WAIT_MS);
  keepPending(list);
  for (const p of list) send(p.runId, p.score, p.device, p.combo, null, p.at);
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
