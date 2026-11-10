import "./env.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";

const param = { value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {}, cancelScheduledValues() {} };
const node = () => ({ gain: param, threshold: param, knee: param, ratio: param, attack: param, release: param, frequency: param, Q: param, playbackRate: param, connect: (next) => next, disconnect() {}, start() {}, stop() {} });
const decoded = { sampleRate: 100, length: 30000, numberOfChannels: 1, getChannelData: () => new Float32Array(30000) };

class Ctx {
  state = "running";
  currentTime = 0;
  sampleRate = 44100;
  destination = {};
  addEventListener() {}
  createDynamicsCompressor = node;
  createGain = node;
  createBiquadFilter = node;
  createBufferSource = node;
  createBuffer = (channels, length) => ({ getChannelData: () => new Float32Array(length) });
  decodeAudioData = (data, ok) => ok(decoded);
  resume = () => Promise.resolve();
  suspend = () => Promise.resolve();
  close = () => Promise.resolve();
}
window.AudioContext = Ctx;
globalThis.setInterval = () => 0;

let asked = [], cases = 0, broken = false, /** @type {string[]} */ lost = [], /** @type {string[]} */ missing = [], /** @type {string[]} */ dropped = [];
globalThis.fetch = async (url) => {
  asked.push(url);
  if ((broken && url.startsWith("/music/")) || lost.includes(url)) throw new TypeError("Failed to fetch");
  if (missing.includes(url)) return { ok: false, status: 404, body: { cancel: async () => { dropped.push(url); } } };
  return { ok: true, arrayBuffer: async () => new ArrayBuffer(8) };
};

const songs = () => asked.filter((url) => url.startsWith("/music/"));
const settle = () => new Promise((ok) => setTimeout(ok, 5));

async function fresh(muted = false) {
  localStorage.clear();
  if (muted) localStorage.setItem("cv-muted", "1");
  asked = [];
  broken = false;
  lost = [];
  const audio = await import("../../public/js/app/audio.js?cas=" + ++cases);
  audio.initAudio();
  await settle();
  return audio;
}

test("chargement : les bruitages partent, jamais les 3,8 Mo de musique", async () => {
  await fresh();
  assert.deepEqual(songs(), []);
  assert.ok(asked.includes("/sfx/start.mp3"));
});

test("bruitage raté au chargement : seul celui-là est retéléchargé au début de la partie suivante, puis plus jamais", async () => {
  localStorage.clear();
  lost = ["/sfx/near.mp3"];
  asked = [];
  const audio = await import("../../public/js/app/audio.js?cas=" + ++cases);
  audio.initAudio();
  await settle();
  const sounds = () => asked.filter((url) => url.startsWith("/sfx/"));
  assert.equal(sounds().length, 5);
  lost = [];
  audio.musicRunStart();
  await settle();
  assert.deepEqual(sounds().slice(5), ["/sfx/near.mp3"]);
  audio.musicRunEnd();
  audio.musicRunStart();
  await settle();
  assert.equal(sounds().length, 6);
});

test("bruitage ou musique introuvable : la réponse est lâchée aussitôt, sinon elle garde une des 6 connexions du navigateur", async () => {
  localStorage.clear();
  asked = [];
  lost = [];
  dropped = [];
  missing = ["/sfx/near.mp3", "/music/theme.m4a"];
  const audio = await import("../../public/js/app/audio.js?cas=" + ++cases);
  audio.initAudio();
  await settle();
  assert.deepEqual(dropped, ["/sfx/near.mp3"]);
  audio.musicRunStart();
  await settle();
  assert.ok(dropped.includes("/music/theme.m4a"));
  assert.equal(dropped.filter((url) => url === "/sfx/near.mp3").length, 2);
  missing = [];
  audio.musicRunEnd();
});

test("chargement sans musique téléchargée : le bouton de musique s'affiche quand même", async () => {
  localStorage.clear();
  const audio = await import("../../public/js/app/audio.js?cas=" + ++cases);
  let told = 0;
  audio.onAudioChange(() => told++);
  assert.equal(audio.musicAvailable(), false);
  audio.initAudio();
  assert.equal(told, 1);
  assert.equal(audio.musicAvailable(), true);
});

test("premier appui sur Jouer : la musique part une seule fois et rattrape la partie en cours", async () => {
  const audio = await fresh();
  let told = 0;
  audio.onAudioChange(() => told++);
  audio.musicRunStart();
  assert.deepEqual(songs(), ["/music/theme.m4a"]);
  audio.musicRunSync(4);
  await settle();
  assert.ok(audio.audioParts().song);
  assert.ok(audio.audioParts().playing);
  assert.equal(audio.audioParts().preview, false);
  assert.ok(told > 0);
  audio.musicRunEnd();
  audio.musicRunStart();
  await settle();
  assert.deepEqual(songs(), ["/music/theme.m4a"]);
});

test("musique coupée : rien n'est téléchargé en jouant", async () => {
  const audio = await fresh(true);
  audio.musicRunStart();
  await settle();
  assert.deepEqual(songs(), []);
});

test("curseur de musique lâché avant toute partie : le morceau part, et l'aperçu joue dès qu'il arrive", async () => {
  const audio = await fresh();
  audio.previewMusic();
  assert.deepEqual(songs(), ["/music/theme.m4a"]);
  await settle();
  assert.ok(audio.audioParts().playing);
  assert.equal(audio.audioParts().preview, true);
});

test("curseur lâché deux fois pendant le téléchargement : un seul téléchargement", async () => {
  const audio = await fresh();
  audio.previewMusic();
  audio.previewMusic();
  await settle();
  assert.deepEqual(songs(), ["/music/theme.m4a"]);
});

test("aperçu demandé musique coupée ou volume à zéro : rien n'est téléchargé", async () => {
  const off = await fresh(true);
  off.previewMusic();
  const quiet = await fresh();
  quiet.setLevel("music", 0);
  quiet.previewMusic();
  await settle();
  assert.deepEqual(songs(), []);
});

test("musique rallumée à la main : téléchargée tout de suite, comme avant", async () => {
  const audio = await fresh(true);
  audio.toggleMusic();
  assert.deepEqual(songs(), ["/music/theme.m4a"]);
  await settle();
});

test("musique ratée sur un wifi saturé : la partie suivante retente", async () => {
  const audio = await fresh();
  broken = true;
  audio.musicRunStart();
  await settle();
  assert.deepEqual(songs(), ["/music/theme.m4a", "/music/theme.mp3"]);
  assert.equal(audio.audioParts().song, false);
  broken = false;
  audio.musicRunEnd();
  audio.musicRunStart();
  await settle();
  assert.equal(audio.audioParts().song, true);
  assert.ok(audio.audioParts().playing);
});
