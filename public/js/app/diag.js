import { traceAudio, audioParts, prefs } from "./audio.js";
import { LOCAL } from "../shared/local.js";
import { copy } from "./settings.js";

const SEND_MS = 1500, SAMPLE_MS = 250, KEEP = 3000, LOUD = 0.004, SLIP = 0.15;
const MEDIA = ["play", "playing", "pause", "waiting", "stalled", "seeking", "seeked", "ended", "error", "emptied", "ratechange", "volumechange", "canplaythrough"];
const lines = [], queue = [], t0 = performance.now();
let panel = null, state = null, watched = null, analyser = null, samples = null, loud = null, last = null;

const stamp = () => ((performance.now() - t0) / 1000).toFixed(2).padStart(7);
const fix = (n) => (Number.isFinite(n) ? n.toFixed(2) : String(n));

function log(text) {
  const line = stamp() + "  " + text;
  lines.push(line);
  if (lines.length > KEEP) lines.shift();
  queue.push(line);
}

function send() {
  if (!LOCAL || !queue.length) return;
  fetch("/api/diag", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ lines: queue.splice(0) }), keepalive: true }).catch(() => {});
}

function watch(el) {
  watched = el;
  for (const name of MEDIA) {
    el.addEventListener(name, () => log(`élément ${name} t=${fix(el.currentTime)} muet=${el.muted} vol=${fix(el.volume)}${name === "error" && el.error ? " code=" + el.error.code : ""}`));
  }
}

function level(parts) {
  if (!parts.musicGain) return null;
  if (!analyser) {
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
  const parts = audioParts(), { el, ctx } = parts, now = performance.now();
  if (el && el !== watched) watch(el);
  const rms = level(parts);
  const on = rms !== null && rms > LOUD;
  if (rms !== null && on !== loud) {
    loud = on;
    log(on ? `SON AUDIBLE (niveau ${rms.toFixed(3)})` : "silence dans le circuit");
  }
  if (el && last && !el.paused && !el.seeking && last.playing) {
    const moved = el.currentTime - last.t, wall = (now - last.at) / 1000;
    if (Math.abs(moved - wall) > SLIP) log(`à-coup : musique ${fix(moved)} s pour ${fix(wall)} s réelles`);
  }
  if (ctx && last && ctx.state === "running" && last.ctxT === ctx.currentTime) log("contexte figé alors qu'il dit running");
  last = el ? { t: el.currentTime, at: now, playing: !el.paused, ctxT: ctx && ctx.currentTime } : null;
  state.textContent = [
    `ctx ${ctx ? ctx.state : "-"}  élément ${el ? (el.paused ? "pause" : "lecture") : "-"}${el && el.muted ? " muet" : ""}  t ${el ? fix(el.currentTime) : "-"}`,
    `niveau ${rms === null ? "?" : rms.toFixed(3)}  musique ${prefs.music ? "on" : "off"} ${Math.round(prefs.musicLevel * 100)}%  partie ${parts.running ? "oui" : "non"}${parts.fading ? "  fondu" : ""}`
  ].join("\n");
}

function header() {
  const standalone = navigator.standalone || matchMedia("(display-mode: standalone)").matches;
  log(`appareil ${navigator.userAgent}`);
  log(`appli installée ${standalone ? "oui" : "non"}  audioSession ${navigator.audioSession ? navigator.audioSession.type : "absent"}  musique ${prefs.music ? "on" : "off"} ${Math.round(prefs.musicLevel * 100)}%`);
}

function button(text, run) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", run);
  return b;
}

function mount() {
  panel = document.createElement("div");
  panel.className = "diag";
  state = document.createElement("pre");
  const actions = document.createElement("div");
  const copyBtn = button("Copier", () => copy(copyBtn, lines.join("\n")));
  actions.append(copyBtn, button("Masquer", () => panel.classList.toggle("small")));
  panel.append(state, actions);
  document.body.append(panel);
}

export function startDiag() {
  traceAudio(log);
  header();
  mount();
  for (const name of ["visibilitychange", "pagehide", "pageshow"]) {
    window.addEventListener(name, () => {
      log(`page ${name}${name === "visibilitychange" ? " cachée=" + document.hidden : ""}`);
      if (name !== "pageshow") send();
    });
  }
  document.addEventListener("pointerup", (e) => log(`toucher ${e.target.id || e.target.className || e.target.tagName}`), { passive: true, capture: true });
  setInterval(sample, SAMPLE_MS);
  setInterval(send, SEND_MS);
}
