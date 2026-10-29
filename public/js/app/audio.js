import { store, KEYS } from "../shared/store.js";

const MUSIC_FILES = ["/music/theme.m4a", "/music/theme.mp3"];
export const MUSIC_CREDIT = { title: "Roundabout", artist: "Blacklolita", url: "https://open.spotify.com/track/1GbuLhdSobTcKzQfOGliQX" };
export const SFX_CREDIT = { name: "Mixkit", url: "https://mixkit.co/free-sound-effects/game/" };
const SOUNDS = {
  start: [{ url: "/sfx/start.mp3", gain: 0.85 }],
  near: [{ url: "/sfx/near.mp3", gain: 0.8 }],
  death: [{ url: "/sfx/death.mp3", gain: 0.4 }],
  record: [{ url: "/sfx/record.mp3", gain: 1 }],
  first: [{ url: "/sfx/first.mp3", gain: 1 }]
};
const SFX_GAP = { near: 0.08 };
const VOLUME = 0.6, FADE_MS = 500, DRIFT = 0.35, SFX_VOLUME = 1, SFX_LATE_MS = 300;
const MUFFLE_HZ = 380, MUFFLE_Q = 6, MUFFLE_IN_S = 0.12, MUFFLE_S = 0.5;
const PREVIEW_AT = 30, PREVIEW_MS = 2000;

function level(key) {
  const raw = store.get(key), v = Number(raw);
  return raw === null || !Number.isFinite(v) ? 1 : Math.min(1, Math.max(0, v / 100));
}

export const prefs = {
  music: store.get(KEYS.musicOff) !== "1", sfx: store.get(KEYS.sfxOff) !== "1",
  musicLevel: level(KEYS.musicVolume), sfxLevel: level(KEYS.sfxVolume)
};
const listeners = [];
let el = null, live = false, primed = false, running = false, runTime = 0, fadeTimer = null, previewTimer = null;
let ctx = null, master = null, musicGain = null, musicFilter = null, musicBoost = 1;
const buffers = {}, lastPlayed = {};

export const musicAvailable = () => !!el;
export const onAudioChange = (fn) => listeners.push(fn);
const changed = () => listeners.forEach((fn) => fn());

export async function initAudio() {
  ensureContext();
  for (const url of MUSIC_FILES) {
    try {
      if ((await fetch(url, { method: "HEAD", cache: "no-store" })).ok) {
        el = new Audio(url);
        el.loop = true;
        el.preload = "auto";
        el.addEventListener("playing", () => { live = true; });
        for (const name of ["pause", "waiting", "ended"]) el.addEventListener(name, () => { live = false; });
        if (ctx) routeMusic(volumeWorks() ? VOLUME : 1);
        el.volume = musicVolume();
        break;
      }
    } catch (e) {}
  }
  changed();
}

function volumeWorks() {
  const probe = new Audio();
  probe.volume = 0.5;
  return Math.abs(probe.volume - 0.5) < 0.01;
}

function routeMusic(boost) {
  try {
    musicBoost = boost;
    musicFilter = ctx.createBiquadFilter();
    musicFilter.type = "lowpass";
    musicFilter.frequency.value = ctx.sampleRate / 2;
    musicGain = ctx.createGain();
    musicGain.gain.value = gainLevel();
    ctx.createMediaElementSource(el).connect(musicFilter).connect(musicGain).connect(ctx.destination);
  } catch (e) {
    musicGain = null;
    musicFilter = null;
  }
}

const gainLevel = () => prefs.musicLevel * musicBoost;
const musicVolume = () => (musicGain ? 1 : VOLUME * prefs.musicLevel);

function applyLevels() {
  if (master) master.gain.value = SFX_VOLUME * prefs.sfxLevel;
  if (fadeTimer) return;
  if (musicGain) musicGain.gain.value = gainLevel();
  if (el) el.volume = musicVolume();
}

function stopFade() {
  clearTimeout(fadeTimer);
  fadeTimer = null;
}

function openMusic() {
  if (!musicGain) return;
  const t = ctx.currentTime, { gain } = musicGain, { frequency, Q } = musicFilter;
  for (const p of [gain, frequency, Q]) p.cancelScheduledValues(t);
  gain.setValueAtTime(gainLevel(), t);
  frequency.setValueAtTime(ctx.sampleRate / 2, t);
  Q.setValueAtTime(1, t);
}

function playAt(t) {
  stopFade();
  openMusic();
  el.muted = false;
  el.volume = musicVolume();
  el.currentTime = el.duration ? t % el.duration : t;
  el.play().catch(() => {});
}

function fadeOut(muffle = false) {
  if (!el || el.paused) return;
  stopFade();
  if (musicGain) {
    const t = ctx.currentTime, hold = muffle ? MUFFLE_S : 0, { gain } = musicGain, { frequency, Q } = musicFilter;
    for (const p of [gain, frequency, Q]) {
      p.cancelScheduledValues(t);
      p.setValueAtTime(p.value, t);
    }
    if (muffle) {
      frequency.exponentialRampToValueAtTime(MUFFLE_HZ, t + MUFFLE_IN_S);
      Q.linearRampToValueAtTime(MUFFLE_Q, t + MUFFLE_IN_S);
    }
    gain.setValueAtTime(gain.value, t + hold);
    gain.linearRampToValueAtTime(0, t + hold + FADE_MS / 1000);
    fadeTimer = setTimeout(() => {
      fadeTimer = null;
      el.pause();
      openMusic();
    }, hold * 1000 + FADE_MS);
    return;
  }
  const from = el.volume, t0 = performance.now();
  fadeTimer = setInterval(() => {
    const k = (performance.now() - t0) / FADE_MS;
    if (k < 1) {
      el.volume = from * (1 - k);
      return;
    }
    stopFade();
    el.pause();
    el.volume = musicVolume();
  }, 30);
}

function ensureContext() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (ctx || !Ctx) return;
  ctx = new Ctx();
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.1;
  master = ctx.createGain();
  master.gain.value = SFX_VOLUME * prefs.sfxLevel;
  master.connect(limiter).connect(ctx.destination);
  for (const { url } of Object.values(SOUNDS).flat()) {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((data) => new Promise((ok, ko) => ctx.decodeAudioData(data, ok, ko)))
      .then((buffer) => { buffers[url] = buffer; })
      .catch(() => {});
  }
}

export function unlockAudio() {
  ensureContext();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  if (!el) return;
  if (running) {
    if (prefs.music && el.paused) playAt(runTime);
    return;
  }
  if (primed) return;
  primed = true;
  el.muted = true;
  if (musicGain) musicGain.gain.value = 0;
  el.play().then(
    () => {
      if (el.muted) {
        el.pause();
        openMusic();
      }
      el.muted = false;
    },
    () => {
      primed = false;
      el.muted = false;
      openMusic();
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
  fadeOut(true);
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

export function setLevel(kind, value) {
  const v = Math.min(1, Math.max(0, value));
  if (kind === "music") {
    prefs.musicLevel = v;
    store.set(KEYS.musicVolume, Math.round(v * 100));
    if (v > 0 && !prefs.music) toggleMusic();
  } else {
    prefs.sfxLevel = v;
    store.set(KEYS.sfxVolume, Math.round(v * 100));
    if (v > 0 && !prefs.sfx) toggleSfx();
  }
  applyLevels();
}

export function previewMusic() {
  if (!el || running || !prefs.music) return;
  ensureContext();
  if (ctx && ctx.state === "suspended") ctx.resume().catch(() => {});
  playAt(PREVIEW_AT);
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => { if (!running) fadeOut(); }, PREVIEW_MS);
}

function fire(name, rate) {
  const variants = SOUNDS[name], t = ctx.currentTime;
  if (t - (lastPlayed[name] ?? -Infinity) < (SFX_GAP[name] || 0)) return;
  const pick = variants[Math.floor(Math.random() * variants.length)];
  if (!buffers[pick.url]) return;
  lastPlayed[name] = t;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffers[pick.url];
  src.playbackRate.value = rate;
  gain.gain.value = pick.gain;
  src.connect(gain).connect(master);
  src.start(t);
}

function trigger(name, patience, rate = 1) {
  if (!ctx || !SOUNDS[name]) return;
  if (ctx.state === "running") {
    fire(name, rate);
    return;
  }
  const asked = performance.now();
  ctx.resume().then(() => {
    if (performance.now() - asked <= patience) fire(name, rate);
  }, () => {});
}

export const SFX_NAMES = Object.keys(SOUNDS);

export function playSfx(name, rate) {
  if (prefs.sfx) trigger(name, SFX_LATE_MS, rate);
}

export const prepareSfx = ensureContext;

export function previewSfx(name) {
  ensureContext();
  trigger(name, Infinity);
}
