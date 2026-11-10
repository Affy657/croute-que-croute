import { VERSION } from "../version.js";
import { store, session, KEYS } from "../shared/store.js";
import { guessDevice } from "./input.js";
import { LOCAL } from "../shared/local.js";
import { timeout } from "../shared/timeout.js";
import { openOf, recentOf, upcomingOf, lateFor } from "../shared/banner.js";

const RELOAD_GAP = 15000;
const UPDATED = "Partie pas comptée : le jeu a été mis à jour, il se recharge quand tu rejoues.";
export const WAITING = "Pas de réseau. Ton score partira dès qu'il revient.";
const SEND_TRIES = 3, SEND_GAP_MS = 1500, WAIT_GAP_MS = 5000, WAIT_MS = 120000, KEEP_MS = 12 * 3600 * 1000, SEND_TIMEOUT_MS = 8000, CALL_TIMEOUT_MS = 10000, RESUME_RETRY_MS = 3000;
const START_MS = 12000, START_TRY_MS = 3500, START_GAP_MS = 500, START_GAP_MAX_MS = 3000;

/** @param {unknown} e @param {string} [offline] */
export const reason = (e, offline = "Pas de réseau, réessaie.") => (/** @type {Err} */ (e).status ? /** @type {Err} */ (e).message : offline);
/** @param {unknown} e */
export const badInput = (e) => [400, 404, 409].includes(/** @type {Err} */ (e).status);

if (LOCAL) {
  const params = new URLSearchParams(location.search), seeded = params.get("jeton");
  if (seeded && /^[a-f0-9]{48}$/.test(seeded)) {
    store.set(KEYS.playerToken, seeded);
    params.delete("jeton");
    const rest = params.toString();
    history.replaceState(null, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
  }
}

const ACCOUNT_KEYS = [KEYS.localBest, KEYS.myBests, KEYS.achievements, KEYS.toppings, KEYS.topping, KEYS.outfitSeen, KEYS.outfitAt, KEYS.gear, KEYS.side, KEYS.bread, KEYS.aura];

/** @type {Net} */
export const net = { token: store.get(KEYS.playerToken), board: null, offset: 0, online: true, updatePending: false };
let localBest = parseInt(store.get(KEYS.localBest) || "0", 10) || 0, saved = readBests();
let boardAsked = 0, boardShown = 0, /** @type {string | null} */ lastDevice = null, resumed = false, /** @type {Promise<void> | null} */ resuming = null, /** @type {Timer} */ retryTimer = null, /** @type {Record<string, number>} */ runBests = {}, bestsAsked = 0, draining = false;
/** @type {Map<string, Promise<RunAnswer>>} */
const sending = new Map();
let reloadAsked = false, hiddenFor = 0, hiddenAt = document.hidden ? Date.now() : 0, /** @type {((value?: unknown) => void)[]} */ wakers = [];
/** @type {Record<string, Listener[]>} */
const listeners = { board: [], update: [], result: [] };

/** @param {unknown} value */
const finite = (value) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

/** @returns {Bests | null} */
function readBests() {
  try {
    const b = JSON.parse(store.get(KEYS.myBests) || "null");
    return b && typeof b === "object" ? { best: finite(b.best), pcBest: finite(b.pcBest) } : null;
  } catch (e) {
    return null;
  }
}

/** @param {Bests} me */
function keepBests(me) {
  saved = { best: me.best || 0, pcBest: me.pcBest || 0 };
  store.set(KEYS.myBests, JSON.stringify(saved));
}

/** @param {string} name @param {Listener} fn */
export const on = (name, fn) => listeners[name].push(fn);
/** @param {string} name @param {RunAnswer} [value] @param {string} [runId] */
const emit = (name, value, runId) => listeners[name].forEach((fn) => fn(value, runId));
/** @param {number | undefined} status */
const settled = (status) => status && status < 500 && status !== 408 && status !== 429;
/** @param {number} ms */
const pause = (ms) => new Promise((ok) => setTimeout(ok, ms));
const awake = () => Date.now() - hiddenFor - (hiddenAt ? Date.now() - hiddenAt : 0);

/** @param {string} method @param {string} path @param {unknown} [body] @param {number} [timeoutMs] */
export async function call(method, path, body, timeoutMs) {
  /** @type {Record<string, string>} */
  const headers = { "content-type": "application/json", "x-app-version": VERSION };
  if (net.token) headers.authorization = "Bearer " + net.token;
  const signal = timeout(timeoutMs || CALL_TIMEOUT_MS);
  const res = await fetch(path, { method, headers, body: body ? JSON.stringify(body) : undefined, signal });
  let data = null;
  try { data = await res.json(); } catch (e) {}
  if (!res.ok) {
    const err = Object.assign(new Error((data && data.error) || "Erreur réseau."), { status: res.status, data });
    if (res.status === 426) requestUpdate();
    throw err;
  }
  if (data === null) throw new Error("Erreur réseau.");
  return data;
}

export const serverNow = () => Date.now() + net.offset;
export const registered = () => !!(net.board && net.board.me);

export const openEvent = () => openOf(net.board, serverNow());
export const isOpen = () => !!openEvent();
/** @param {number} startedAt */
export const pastEvent = (startedAt) => lateFor(net.board, startedAt, serverNow());
export const recentEvent = () => recentOf(net.board, serverNow());
export const upcomingEvent = () => upcomingOf(net.board, serverNow());

export const canCompete = () => registered() && !/** @type {Joined} */ (net.board).me.banned;

/** @param {string} device */
export const setDevice = (device) => { lastDevice = device; };
export const onPc = () => (lastDevice || guessDevice()) === "pc";
export const myScope = () => (onPc() ? "pc" : isOpen() ? "event" : "general");

/** @returns {Standing} */
export function standing(scope = myScope()) {
  if (!registered()) return { best: net.token && saved ? (scope === "pc" ? saved.pcBest : saved.best) : localBest, rank: null, count: 0 };
  const { me } = /** @type {Joined} */ (net.board), mine = runBests[scope] || 0;
  if (scope === "event") return { best: Math.max(me.eventBest || 0, mine), rank: me.eventRank, count: /** @type {Board} */ (net.board).eventCount, rival: me.eventRival };
  if (scope === "pc") return { best: Math.max(me.pcBest || 0, mine), rank: me.pcRank, count: /** @type {Board} */ (net.board).pcCount, rival: me.pcRival };
  return { best: Math.max(me.best, mine), rank: me.rank, count: /** @type {Board} */ (net.board).count, rival: me.rival };
}

export const knownBest = () => standing().best;

export function leader(scope = myScope()) {
  const b = net.board;
  return (b && (scope === "event" ? b.eventTop || [] : scope === "pc" ? b.pcTop || [] : b.top)[0]) || null;
}

/** @param {number} score @param {string} scope */
export function saveLocalBest(score, scope) {
  if (registered()) {
    runBests[scope] = Math.max(runBests[scope] || 0, score);
    bestsAsked = boardAsked;
    return;
  }
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
  try {
    const r = await call("POST", "/api/resume", null, SEND_TIMEOUT_MS);
    resumed = true;
    if (r.token && !net.token) setToken(r.token);
  } catch (e) {
    if (/** @type {Err} */ (e).status && /** @type {number} */ (/** @type {Err} */ (e).status) < 500 && /** @type {Err} */ (e).status !== 408 && /** @type {Err} */ (e).status !== 429) resumed = true;
  }
}

const resumeOnce = () => resuming || (resuming = resume().finally(() => { resuming = null; }));

export const joinReady = () => resumed && !net.token;

export async function refreshBoard() {
  if (!net.token && !resumed) await resumeOnce();
  const asked = ++boardAsked, token = net.token, sent = Date.now();
  try {
    const b = await call("GET", "/api/board");
    if (asked < boardShown || token !== net.token) return;
    boardShown = asked;
    net.offset = b.now - (sent + Date.now()) / 2;
    net.online = true;
    if (net.token && !b.me) {
      setToken(null);
      if (b.out) forgetAccount();
    }
    if (asked > bestsAsked && !pendingScores().length) runBests = {};
    net.board = b;
    if (b.me) keepBests(b.me);
    if (b.version && b.version !== VERSION) requestUpdate();
    resumePending();
  } catch (e) {
    net.online = false;
  }
  if (!net.token && !resumed && !retryTimer) {
    retryTimer = setTimeout(() => {
      retryTimer = null;
      refreshBoard();
    }, RESUME_RETRY_MS);
  }
  emit("board");
}

function forgetAccount() {
  for (const key of ACCOUNT_KEYS) store.set(key, null);
  requestUpdate();
}

/** @param {string | null} token */
function setToken(token) {
  net.token = token;
  runBests = {};
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

/** @param {string} pseudo */
export async function join(pseudo) {
  const r = await call("POST", "/api/join", { pseudo, clientId: clientId() });
  setToken(r.token);
  await refreshBoard();
}

/** @param {string} code */
export async function linkWith(code, merge = false) {
  const r = await call("POST", "/api/link", { code, clientId: clientId(), merge });
  if (r.token) setToken(r.token);
  await refreshBoard();
  return r;
}

export const newLinkCode = () => call("POST", "/api/me/link");
export const logoutOthers = () => call("DELETE", "/api/me/devices");
export const unlinkGoogle = () => call("DELETE", "/api/me/google");

/** @param {boolean} link */
export async function openGoogle(link) {
  const { url } = await call("POST", "/api/google/start", { link, clientId: clientId() });
  location.href = url;
}

/** @param {string} pseudo */
export async function rename(pseudo) {
  const r = await call("PATCH", "/api/me", { pseudo });
  if (net.board && net.board.me && r && r.pseudo) net.board.me.pseudo = r.pseudo;
  await refreshBoard();
}

/** @param {unknown} body @returns {Promise<RunTicket | RunFail>} */
async function launch(body) {
  const until = awake() + START_MS;
  for (let gap = START_GAP_MS; ; gap = Math.min(gap * 2, START_GAP_MAX_MS)) {
    if (document.hidden) await new Promise((ok) => wakers.push(ok));
    try {
      return await call("POST", "/api/runs", body, Math.max(1, Math.min(START_TRY_MS, until - awake())));
    } catch (e) {
      const err = /** @type {Err} */ (e);
      if (settled(err.status) || awake() + gap >= until) {
        if (err.status === 401) refreshBoard();
        return { error: err.status === 426 ? UPDATED : reason(err, "Hors ligne : score non compté"), status: err.status };
      }
      await pause(gap);
    }
  }
}

/** @param {unknown} body */
export function startRun(body) {
  if (!net.token || (registered() && /** @type {Joined} */ (net.board).me.banned)) return null;
  return launch(body);
}

export const hasPending = () => pendingScores().length > 0;

/** @param {Pending} p */
const fresh = (p) => !!p && typeof p.runId === "string" && Number.isInteger(p.score) && typeof p.device === "string" && Number.isFinite(p.at) && Date.now() - p.at < KEEP_MS;

/** @returns {Pending[]} */
function pendingScores() {
  try {
    const list = JSON.parse(store.get(KEYS.pendingScores) || "[]");
    return Array.isArray(list) ? list.filter(fresh) : [];
  } catch (e) {
    return [];
  }
}

/** @param {Pending[]} list */
const keepPending = (list) => store.set(KEYS.pendingScores, list.length ? JSON.stringify(list) : null);
/** @param {string} runId */
const clearPending = (runId) => keepPending(pendingScores().filter((p) => p.runId !== runId));

/** @param {Pending} score */
function markPending(score) {
  const list = pendingScores();
  if (!list.some((p) => p.runId === score.runId)) keepPending([...list, score]);
}

/** @param {RunResult} r */
function applyResult(r) {
  const me = net.board && net.board.me;
  if (me) {
    Object.assign(me, { best: r.best, rank: r.rank, rival: r.rival, pcBest: r.pcBest, pcRank: r.pcRank, pcRival: r.pcRival });
    Object.assign(/** @type {Board} */ (net.board), { count: r.count, pcCount: r.pcCount });
    keepBests(me);
    if (r.eventBest !== null) {
      Object.assign(me, { eventBest: r.eventBest, eventRank: r.eventRank, eventRival: r.eventRival });
      /** @type {Board} */ (net.board).eventCount = r.eventCount;
    }
  }
  refreshBoard();
}

/** @param {Pending} pending @param {(() => void) | null} onWait @returns {Promise<RunAnswer>} */
async function deliver(pending, onWait) {
  const { runId, score, device, combo, at } = pending, since = Date.now();
  markPending(pending);
  for (let i = 0; ; i++) {
    /** @type {RunResult} */
    let r;
    try {
      r = await call("POST", "/api/runs/" + runId, { score, device, combo, waited: Math.max(0, Date.now() - at) }, SEND_TIMEOUT_MS);
    } catch (e) {
      if (settled(/** @type {Err} */ (e).status)) {
        clearPending(runId);
        return { error: /** @type {Err} */ (e).message };
      }
      if (i === SEND_TRIES - 1 && onWait) onWait();
      if (i >= SEND_TRIES - 1 && Date.now() - since > WAIT_MS) return { error: WAITING, runId };
      await pause(i < SEND_TRIES - 1 ? SEND_GAP_MS : WAIT_GAP_MS);
      continue;
    }
    clearPending(runId);
    bestsAsked = boardAsked;
    applyResult(r);
    emit("result", r, runId);
    return r;
  }
}

/** @param {Pending} pending @param {(() => void) | null} onWait */
function send(pending, onWait) {
  const going = sending.get(pending.runId);
  if (going) return going;
  const sent = deliver(pending, onWait).finally(() => sending.delete(pending.runId));
  sending.set(pending.runId, sent);
  return sent;
}

/** @param {number} score @param {string} device @param {number} combo @param {Promise<RunTicket | RunFail>} pending @param {() => void} onWait */
export async function submitScore(score, device, combo, pending, onWait) {
  const at = Date.now();
  const run = await pending;
  if (run.error) return run;
  return send({ runId: /** @type {RunTicket} */ (run).runId, score, device, combo, at }, onWait);
}

export async function resumePending() {
  if (draining || !net.token) return;
  draining = true;
  keepPending(pendingScores());
  try {
    for (const p of pendingScores()) {
      const r = await send(p, null);
      if (r.error === WAITING) break;
    }
  } finally {
    draining = false;
  }
}

window.addEventListener("online", resumePending);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    if (!hiddenAt) hiddenAt = Date.now();
    return;
  }
  if (hiddenAt) hiddenFor += Date.now() - hiddenAt;
  hiddenAt = 0;
  for (const wake of wakers.splice(0)) wake();
  resumePending();
});

export function requestUpdate() {
  net.updatePending = true;
  emit("update");
}

export const reloading = () => reloadAsked;

export function applyUpdate() {
  const last = Number(session.get(KEYS.lastReload)) || 0;
  if (Date.now() - last < RELOAD_GAP) return false;
  session.set(KEYS.lastReload, Date.now());
  reloadAsked = true;
  location.reload();
  return true;
}
