import { store, KEYS } from "../shared/store.js";

const MUSIC_FILES = ["/music/theme.m4a", "/music/theme.mp3"];
const SOUNDS = {};
const VOLUME = 0.6, FADE_MS = 500, DRIFT = 0.35;

export const prefs = { music: store.get(KEYS.musicOff) !== "1", sfx: store.get(KEYS.sfxOff) !== "1" };
const listeners = [];
let el = null, live = false, primed = false, running = false, runTime = 0, fadeTimer = null;
let ctx = null;
const buffers = {};

export const musicAvailable = () => !!el;
export const onAudioChange = (fn) => listeners.push(fn);
const changed = () => listeners.forEach((fn) => fn());

export async function initAudio() {
  for (const url of MUSIC_FILES) {
    try {
      if ((await fetch(url, { method: "HEAD", cache: "no-store" })).ok) {
        el = new Audio(url);
        el.loop = true;
        el.preload = "auto";
        el.volume = VOLUME;
        el.addEventListener("playing", () => { live = true; });
        for (const name of ["pause", "waiting", "ended"]) el.addEventListener(name, () => { live = false; });
        break;
      }
    } catch (e) {}
  }
  changed();
}

function stopFade() {
  clearInterval(fadeTimer);
  fadeTimer = null;
}

function playAt(t) {
  stopFade();
  el.muted = false;
  el.volume = VOLUME;
  el.currentTime = el.duration ? t % el.duration : t;
  el.play().catch(() => {});
}

function fadeOut() {
  if (!el || el.paused) return;
  stopFade();
  const from = el.volume, t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = (performance.now() - t0) / FADE_MS;
    if (k < 1) {
      el.volume = from * (1 - k);
      return;
    }
    stopFade();
    el.pause();
    el.volume = VOLUME;
  }, 30);
}

function loadSounds() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (ctx || !Ctx || !Object.keys(SOUNDS).length) return;
  ctx = new Ctx();
  for (const [name, url] of Object.entries(SOUNDS)) {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => new Promise((ok, ko) => ctx.decodeAudioData(data, ok, ko)))
      .then((buffer) => { buffers[name] = buffer; })
      .catch(() => {});
  }
}

export function unlockAudio() {
  loadSounds();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  if (!el) return;
  if (running) {
    if (prefs.music && el.paused) playAt(runTime);
    return;
  }
  if (primed) return;
  primed = true;
  el.muted = true;
  el.play().then(
    () => {
      if (!running) el.pause();
      el.muted = false;
    },
    () => {
      primed = false;
      el.muted = false;
    }
  );
}

export function musicRunStart() {
  running = true;
  runTime = 0;
  if (el && prefs.music) playAt(0);
}

export function musicRunSync(t) {
  runTime = t;
  if (!el || !live || el.seeking || !el.duration) return;
  const want = t % el.duration;
  const d = Math.abs(el.currentTime - want);
  if (Math.min(d, el.duration - d) > DRIFT) el.currentTime = want;
}

export function musicRunEnd() {
  running = false;
  fadeOut();
}

export function pauseForBackground(hidden) {
  if (!el) return;
  if (hidden) {
    stopFade();
    el.pause();
  } else if (running && prefs.music) {
    playAt(runTime);
  }
}

export function toggleMusic() {
  prefs.music = !prefs.music;
  store.set(KEYS.musicOff, prefs.music ? null : "1");
  if (!prefs.music && el) {
    stopFade();
    el.pause();
  }
  changed();
}

export function toggleSfx() {
  prefs.sfx = !prefs.sfx;
  store.set(KEYS.sfxOff, prefs.sfx ? null : "1");
  changed();
}

export function playSfx(name) {
  const buffer = buffers[name];
  if (!prefs.sfx || !ctx || ctx.state !== "running" || !buffer) return;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.connect(ctx.destination);
  src.start();
}
