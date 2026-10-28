import { mkdirSync, writeFileSync } from "node:fs";
import { Mp3Encoder } from "@breezystack/lamejs";

const RATE = 44100, BPM = 200, BEATS = 64;
const beat = 60 / BPM;
const length = Math.round(BEATS * beat * RATE);
const out = new Float32Array(length);
let seed = 7;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

function add(start, duration, sample) {
  const s0 = Math.round(start * RATE), n = Math.round(duration * RATE);
  for (let i = 0; i < n && s0 + i < length; i++) out[s0 + i] += sample(i / RATE, i / n);
}

function kick(t0) {
  let phase = 0;
  add(t0, 0.28, (t, k) => {
    const f = 50 + 160 * Math.exp(-t * 28);
    phase += (2 * Math.PI * f) / RATE;
    return Math.tanh(Math.sin(phase) * 7) * Math.exp(-t * 9) * 0.55 * (1 - k * 0.2);
  });
}

function hat(t0, level) {
  let last = 0;
  add(t0, 0.045, (t) => {
    const n = noise();
    const high = n - last;
    last = n;
    return high * Math.exp(-t * 90) * level;
  });
}

function stab(t0, freq) {
  add(t0, 0.13, (t) => {
    const saw = ((t * freq) % 1) * 2 - 1;
    const saw2 = ((t * freq * 1.007) % 1) * 2 - 1;
    return Math.tanh((saw + saw2) * 1.5) * Math.exp(-t * 18) * 0.16;
  });
}

const roots = [220, 220, 174.61, 196];
for (let b = 0; b < BEATS; b++) {
  const t = b * beat;
  const bar = Math.floor(b / 4);
  const breakdown = bar % 8 === 7;
  if (!breakdown || b % 4 === 0) kick(t);
  hat(t + beat / 2, breakdown ? 0.12 : 0.22);
  if (b % 2 === 1) hat(t + beat * 0.75, 0.1);
  const root = roots[Math.floor(bar / 2) % roots.length];
  stab(t + beat / 2, root * (b % 4 === 3 ? 1.5 : 1));
}

let peak = 0;
for (const v of out) peak = Math.max(peak, Math.abs(v));
const pcm = new Int16Array(length);
for (let i = 0; i < length; i++) pcm[i] = Math.round((out[i] / peak) * 0.9 * 32767);

const encoder = new Mp3Encoder(1, RATE, 128);
const chunks = [];
for (let i = 0; i < length; i += 1152) chunks.push(encoder.encodeBuffer(pcm.subarray(i, i + 1152)));
chunks.push(encoder.flush());
mkdirSync("music-test", { recursive: true });
writeFileSync("music-test/theme.mp3", Buffer.concat(chunks.map((c) => Buffer.from(c.buffer, c.byteOffset, c.byteLength))));
console.log(`Boucle de test : ${(length / RATE).toFixed(1)} s à ${BPM} BPM -> music-test/theme.mp3`);
