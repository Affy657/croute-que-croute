import { traceAudio, audioParts, prefs } from "./audio.js";
import { LOCAL } from "../shared/local.js";
import { VERSION } from "../version.js";
import { copy } from "./settings.js";

const SEND_MS = 1500, SAMPLE_MS = 250, KEEP = 3000, LOUD = 0.004;
const STRAY_MS = 1000, MUTE_MS = 3000, REPORTS = 4, REPORT_LINES = 150, RUN_REPORTS = 2;
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
/** @type {string[]} */
const lines = [], /** @type {string[]} */ queue = [], t0 = performance.now();
/** @type {string | null} */
let mode = null, /** @type {HTMLElement | null} */ state = null, /** @type {AnalyserNode} */ analyser = /** @type {never} */ (null), /** @type {GainNode | null} */ tapped = null, /** @type {Float32Array<ArrayBuffer>} */ samples = /** @type {never} */ (null), /** @type {boolean | null} */ loud = null, strayAt = 0, muteAt = 0, runAt = 0, sent = 0, runs = 0, resyncs = 0;

const stamp = () => ((performance.now() - t0) / 1000).toFixed(2).padStart(7);

/** @param {string} text */
function log(text) {
  const line = stamp() + "  " + text;
  lines.push(line);
  if (lines.length > KEEP) lines.shift();
  if (mode === "live") queue.push(line);
  if (text.startsWith("recalage")) resyncs++;
  if (text.startsWith("partie commence")) {
    runAt = performance.now();
    resyncs = 0;
  }
  if (text.startsWith("partie finie")) runEnded();
  if (/^contexte (figé|bloqué)|refusé/.test(text)) report(text);
}

function send() {
  if (mode !== "live" || !LOCAL || !queue.length) return;
  fetch("/api/diag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: queue.splice(0) }), keepalive: true }).catch(() => {});
}

/** @param {string} kind */
function report(kind) {
  if (mode !== "report" || sent >= REPORTS) return;
  sent++;
  const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  const body = { kind, version: VERSION, standalone: !!standalone, ua: navigator.userAgent, lines: lines.slice(-REPORT_LINES) };
  fetch("/api/diag", { method: "POST", headers: { "content-type": "application/json", "x-app-version": VERSION }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
}

function runEnded() {
  const secs = ((performance.now() - runAt) / 1000).toFixed(1);
  if (runs++ < RUN_REPORTS) report(`partie de ${secs} s, ${resyncs} recalage(s)`);
}

/** @param {AudioParts} parts */
function level(parts) {
  if (!parts.musicGain || parts.ctx.state === "closed") return null;
  if (tapped !== parts.musicGain) {
    tapped = parts.musicGain;
    analyser = parts.ctx.createAnalyser();
    analyser.fftSize = 1024;
    samples = new Float32Array(analyser.fftSize);
    const sink = parts.ctx.createGain();
    sink.gain.value = 0;
    parts.musicGain.connect(analyser).connect(sink).connect(parts.ctx.destination);
  }
  analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (const v of samples) sum += v * v;
  return Math.sqrt(sum / samples.length);
}

function sample() {
  const parts = audioParts(), now = performance.now(), rms = level(parts), on = rms !== null && rms > LOUD;
  if (rms !== null && on !== loud) {
    loud = on;
    log(on ? `son audible (niveau ${rms.toFixed(3)})` : "silence");
  }
  const stray = on && !parts.running && !parts.preview && !parts.tail;
  strayAt = stray ? strayAt || now : 0;
  if (stray && now - strayAt > STRAY_MS && strayAt > 0) {
    strayAt = -Infinity;
    log("ANOMALIE : musique hors partie");
    report("musique hors partie");
  }
  const wanted = parts.running && parts.song && !parts.hidden && prefs.music && prefs.musicLevel > 0 && now - runAt > MUTE_MS;
  muteAt = wanted && !on ? muteAt || now : 0;
  if (wanted && !on && now - muteAt > MUTE_MS && muteAt > 0) {
    muteAt = -Infinity;
    log(`ANOMALIE : silence en partie (contexte ${parts.ctx ? parts.ctx.state : "-"})`);
    report("silence en partie");
  }
  if (!state) return;
  state.textContent = [
    `contexte ${parts.ctx ? parts.ctx.state : "-"}${parts.stale ? " à refaire" : ""}  musique ${parts.song ? (parts.playing ? (parts.preview ? "aperçu" : "joue") : "arrêtée") : "pas prête"}  t ${parts.heard === null ? "-" : parts.heard.toFixed(2)}`,
    `niveau ${rms === null ? "?" : rms.toFixed(3)}  réglage ${prefs.music ? "on" : "off"} ${Math.round(prefs.musicLevel * 100)}%  partie ${parts.running ? "oui" : "non"}${parts.hidden ? "  en pause" : ""}`
  ].join("\n");
}

function header() {
  const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  log(`appareil ${navigator.userAgent}`);
  log(`version ${VERSION}  appli installée ${standalone ? "oui" : "non"}  audioSession ${navigator.audioSession ? navigator.audioSession.type : "absent"}  musique ${prefs.music ? "on" : "off"} ${Math.round(prefs.musicLevel * 100)}%`);
}

/** @param {string} text @param {Fn} run */
function button(text, run) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", run);
  return b;
}

function mount() {
  const panel = document.createElement("div");
  panel.className = "diag";
  state = document.createElement("pre");
  const actions = document.createElement("div");
  const copyBtn = button("Copier", () => copy(copyBtn, lines.join("\n")));
  actions.append(copyBtn, button("Masquer", () => panel.classList.toggle("small")));
  panel.append(state, actions);
  document.body.append(panel);
}

/** @param {boolean} asked */
export function startDiag(asked) {
  if (!asked && !IOS) return;
  mode = asked ? "live" : "report";
  traceAudio(log);
  header();
  if (asked) mount();
  for (const name of ["visibilitychange", "pagehide", "pageshow"]) {
    window.addEventListener(name, () => {
      log(`page ${name}${name === "visibilitychange" ? " cachée=" + document.hidden : ""}`);
      if (name !== "pageshow") send();
    });
  }
  document.addEventListener("pointerup", (e) => {
    if (e.target instanceof Element) log(`toucher ${e.target.id || e.target.className || e.target.tagName}`);
  }, { passive: true, capture: true });
  setInterval(sample, SAMPLE_MS);
  if (asked) setInterval(send, SEND_MS);
}
