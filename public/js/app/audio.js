import { store, KEYS } from "../shared/store.js";

const MUSIC_FILES = ["/music/theme.m4a", "/music/theme.mp3"];
export const MUSIC_CREDIT = { title: "Roundabout", artist: "Blacklolita", url: "https://open.spotify.com/track/1GbuLhdSobTcKzQfOGliQX" };
export const SFX_CREDIT = { name: "Mixkit", url: "https://mixkit.co/free-sound-effects/game/" };
const MUSIC_PARTS = [[0, 83.086], [131.923, 208.668]];
const SOUNDS = {
  start: [{ url: "/sfx/start.mp3", gain: 0.85 }],
  near: [{ url: "/sfx/near.mp3", gain: 0.8 }],
  death: [{ url: "/sfx/death.mp3", gain: 0.4 }],
  record: [{ url: "/sfx/record.mp3", gain: 1 }],
  first: [{ url: "/sfx/first.mp3", gain: 1 }]
};
const SFX_GAP = { near: 0.08 };
const SESSION = "ambient";
const VOLUME = 0.6, SFX_VOLUME = 1, SFX_LATE_MS = 300, LEVEL_S = 0.02;
const JOIN_S = 0.015, FADE_IN_S = 0.05, STOP_S = 0.15, DRIFT = 1.5, RESYNC_S = 5;
const MUFFLE_HZ = 320, MUFFLE_Q = 6, MUFFLE_IN_S = 0.8, MUFFLE_FAR = 0.45, MUFFLE_S = 1.5, MUFFLE_FADE_S = 1;
const PREVIEW_AT = 30, PREVIEW_S = 2, PREVIEW_FADE_S = 0.5;
const WATCH_MS = 500, FROZEN_MS = 400, WAKE_MS = 1000;

function level(key) {
  const raw = store.get(key), v = Number(raw);
  return raw === null || !Number.isFinite(v) ? 1 : Math.min(1, Math.max(0, v / 100));
}

export const prefs = {
  music: store.get(KEYS.musicOff) !== "1", sfx: store.get(KEYS.sfxOff) !== "1",
  musicLevel: level(KEYS.musicVolume), sfxLevel: level(KEYS.sfxVolume)
};
const listeners = [], buffers = {}, lastPlayed = {};
let ctx = null, master = null, music = null, song = null, play = null, stale = false;
let running = false, hidden = false, runTime = 0, synced = -Infinity, previewTimer = null, watch = null, tracer = null, tailUntil = 0;

const note = (...parts) => tracer && tracer(parts.join(" "));
export const traceAudio = (fn) => { tracer = fn; };
export const audioParts = () => ({ ctx, musicGain: music, song: !!song, playing: !!play, preview: !!(play && play.preview), running, hidden, stale, tail: performance.now() < tailUntil, heard: play ? heard(play) : null });

export const musicAvailable = () => !!song;
export const onAudioChange = (fn) => listeners.push(fn);
const changed = () => listeners.forEach((fn) => fn());

if (navigator.audioSession) {
  try {
    navigator.audioSession.type = SESSION;
  } catch (e) {}
}

function build() {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return false;
  const made = new Ctx();
  ctx = made;
  stale = false;
  note("contexte créé", ctx.state, ctx.sampleRate + " Hz");
  made.addEventListener("statechange", () => {
    if (made !== ctx) return note("ancien contexte", made.state);
    note("contexte", made.state);
    reconcile();
  });
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 0;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.1;
  master = ctx.createGain();
  master.gain.value = SFX_VOLUME * prefs.sfxLevel;
  master.connect(limiter).connect(ctx.destination);
  music = ctx.createGain();
  music.gain.value = musicLevel();
  music.connect(ctx.destination);
  return true;
}

function ensureContext() {
  if (ctx) return;
  if (!build()) return;
  for (const { url } of Object.values(SOUNDS).flat()) {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then(decode)
      .then((buffer) => { buffers[url] = buffer; })
      .catch(() => {});
  }
  clearInterval(watch);
  watch = setInterval(watchContext, WATCH_MS);
}

function rebuild() {
  note("contexte recréé");
  const old = ctx;
  play = null;
  build();
  old.close().catch(() => {});
}

const decode = (data) => new Promise((ok, ko) => ctx.decodeAudioData(data, ok, ko));
const musicLevel = () => (prefs.music ? prefs.musicLevel * VOLUME : 0);

function stitch(full) {
  const rate = full.sampleRate, join = Math.round(JOIN_S * rate);
  const spans = MUSIC_PARTS.map(([a, b]) => [Math.round(a * rate), Math.min(full.length, Math.round(b * rate))]);
  const length = spans.reduce((n, [a, b]) => n + b - a, 0), loopFrom = spans[spans.length - 1][0];
  const out = ctx.createBuffer(full.numberOfChannels, length, rate);
  for (let c = 0; c < full.numberOfChannels; c++) {
    const src = full.getChannelData(c), dst = out.getChannelData(c);
    let at = 0;
    spans.forEach(([a, b], i) => {
      dst.set(src.subarray(a, b), at);
      at += b - a;
      const next = i < spans.length - 1 ? spans[i + 1][0] : loopFrom;
      for (let k = 0; k < join && next - join + k >= 0; k++) {
        const x = ((k + 0.5) / join) * (Math.PI / 2);
        dst[at - join + k] = src[b - join + k] * Math.cos(x) + src[next - join + k] * Math.sin(x);
      }
    });
  }
  const last = spans[spans.length - 1];
  return { buffer: out, loopStart: (length - (last[1] - last[0])) / rate, loopEnd: length / rate };
}

export async function initAudio() {
  ensureContext();
  if (!ctx) return;
  for (const url of MUSIC_FILES) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      song = stitch(await decode(await res.arrayBuffer()));
      note("musique prête", url, song.loopEnd.toFixed(1) + " s");
      break;
    } catch (e) {
      note("musique échec", url, e.message);
    }
  }
  changed();
  reconcile();
}

const songAt = (t) => (t < song.loopStart ? t : song.loopStart + ((t - song.loopStart) % (song.loopEnd - song.loopStart)));
const heard = (p) => p.t + (ctx.currentTime - p.at);

function startSong(t, preview = false) {
  const now = ctx.currentTime, src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), fade = ctx.createGain();
  src.buffer = song.buffer;
  src.loop = true;
  src.loopStart = song.loopStart;
  src.loopEnd = song.loopEnd;
  filter.type = "lowpass";
  filter.frequency.value = ctx.sampleRate / 2;
  fade.gain.setValueAtTime(0, now);
  fade.gain.linearRampToValueAtTime(1, now + FADE_IN_S);
  src.connect(filter).connect(fade).connect(music);
  src.onended = () => fade.disconnect();
  src.start(now, songAt(t));
  note(preview ? "aperçu à" : "musique à", t.toFixed(2));
  return { src, filter, fade, at: now, t, preview };
}

function stopSong(p, after = STOP_S) {
  const now = ctx.currentTime;
  tailUntil = Math.max(tailUntil, performance.now() + after * 1000);
  p.fade.gain.cancelScheduledValues(now);
  p.fade.gain.setTargetAtTime(0, now, after / 4);
  p.src.stop(now + after);
}

function muffle(p) {
  const t = ctx.currentTime, end = t + MUFFLE_S + MUFFLE_FADE_S, { frequency, Q } = p.filter, { gain } = p.fade;
  frequency.setValueAtTime(ctx.sampleRate / 2, t);
  frequency.exponentialRampToValueAtTime(MUFFLE_HZ, t + MUFFLE_IN_S);
  Q.setValueAtTime(1, t);
  Q.linearRampToValueAtTime(MUFFLE_Q, t + MUFFLE_IN_S);
  gain.cancelScheduledValues(t);
  gain.setValueAtTime(1, t);
  gain.linearRampToValueAtTime(MUFFLE_FAR, t + MUFFLE_IN_S);
  gain.setValueAtTime(MUFFLE_FAR, t + MUFFLE_S);
  gain.linearRampToValueAtTime(0, end);
  p.src.stop(end);
  tailUntil = performance.now() + (end - t) * 1000;
}

function halt(after) {
  if (!play) return;
  stopSong(play, after);
  play = null;
}

function reconcile() {
  if (!ctx || !song || ctx.state !== "running" || stale) return;
  const want = prefs.music && !hidden && (running || !!previewTimer);
  if (!want) return halt();
  if (play && play.preview === running) halt();
  if (!play) play = running ? startSong(runTime) : startSong(PREVIEW_AT, true);
}

function wake() {
  if (!ctx || ctx.state === "running" || ctx.state === "closed") return;
  note("réveil contexte", ctx.state);
  const asked = ctx;
  ctx.resume().catch((e) => note("réveil refusé", e.name));
  setTimeout(() => {
    if (asked === ctx && ctx.state !== "running" && !document.hidden) {
      note("contexte bloqué", ctx.state);
      stale = true;
    }
  }, WAKE_MS);
}

let lastClock = -1, frozenSince = 0;

function watchContext() {
  if (!ctx || ctx.state !== "running" || document.hidden) {
    frozenSince = 0;
    return;
  }
  const now = performance.now();
  if (ctx.currentTime !== lastClock) {
    lastClock = ctx.currentTime;
    frozenSince = 0;
  } else if (!frozenSince) frozenSince = now;
  else if (now - frozenSince > FROZEN_MS && !stale) {
    note("contexte figé");
    stale = true;
    halt();
  }
}

export function unlockAudio() {
  ensureContext();
  if (!ctx) return;
  if (stale || ctx.state === "closed") rebuild();
  wake();
  reconcile();
}

export function musicRunStart() {
  note("partie commence");
  running = true;
  runTime = 0;
  synced = 0;
  clearTimeout(previewTimer);
  previewTimer = null;
  halt();
  reconcile();
}

export function musicRunSync(t) {
  runTime = t;
  if (!play || play.preview || ctx.state !== "running" || t - synced < RESYNC_S) return;
  if (Math.abs(heard(play) - t) <= DRIFT) return;
  note("recalage", heard(play).toFixed(2), "vers", t.toFixed(2));
  synced = t;
  const old = play;
  play = startSong(t);
  stopSong(old, FADE_IN_S);
}

export function musicRunEnd() {
  note("partie finie");
  running = false;
  if (!play) return;
  muffle(play);
  play = null;
}

export function pauseForBackground(away) {
  if (hidden === away) return;
  hidden = away;
  note(away ? "son en pause" : "son repris");
  if (!ctx) return;
  if (away) {
    halt(0.02);
    if (ctx.state === "running") ctx.suspend().catch(() => {});
  } else if (!document.hidden) wake();
  reconcile();
}

function applyLevels() {
  if (!ctx) return;
  master.gain.setTargetAtTime(SFX_VOLUME * prefs.sfxLevel, ctx.currentTime, LEVEL_S);
  music.gain.setTargetAtTime(musicLevel(), ctx.currentTime, LEVEL_S);
}

export function toggleMusic() {
  prefs.music = !prefs.music;
  note("bouton musique", prefs.music ? "allumé" : "coupé");
  store.set(KEYS.musicOff, prefs.music ? null : "1");
  applyLevels();
  reconcile();
  changed();
}

export function toggleSfx() {
  prefs.sfx = !prefs.sfx;
  store.set(KEYS.sfxOff, prefs.sfx ? null : "1");
  changed();
}

export function setLevel(kind, value) {
  const v = Math.min(1, Math.max(0, value));
  note("curseur", kind, Math.round(v * 100));
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
  if (!song || running || !prefs.music || !prefs.musicLevel) return;
  ensureContext();
  wake();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    previewTimer = null;
    if (play && play.preview) halt(PREVIEW_FADE_S);
  }, PREVIEW_S * 1000);
  reconcile();
}

function fire(name, rate) {
  const variants = SOUNDS[name], t = ctx.currentTime, now = performance.now() / 1000;
  if (now - (lastPlayed[name] ?? -Infinity) < (SFX_GAP[name] || 0)) return;
  const pick = variants[Math.floor(Math.random() * variants.length)];
  if (!buffers[pick.url]) return;
  lastPlayed[name] = now;
  const src = ctx.createBufferSource();
  const gain = ctx.createGain();
  src.buffer = buffers[pick.url];
  src.playbackRate.value = rate;
  gain.gain.value = pick.gain;
  src.connect(gain).connect(master);
  src.start(t);
}

function trigger(name, patience, rate = 1) {
  if (!ctx || !SOUNDS[name] || stale) return;
  if (ctx.state === "running") {
    fire(name, rate);
    return;
  }
  const asked = performance.now();
  ctx.resume().then(() => {
    if (performance.now() - asked <= patience) fire(name, rate);
  }, () => {});
}

export function playSfx(name, rate) {
  if (prefs.sfx) trigger(name, SFX_LATE_MS, rate);
}

export function previewSfx(name) {
  ensureContext();
  trigger(name, Infinity);
}
