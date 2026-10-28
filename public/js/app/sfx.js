const SILENT = 0.0001;
const NOTE = { C5: 523.25, E5: 659.25, G5: 783.99, C6: 1046.5, E6: 1318.51, G6: 1567.98 };
let noiseBuffer = null;

function noise(ctx) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function envelope(ctx, out, t, vol, attack, dur) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(SILENT, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(SILENT, t + dur);
  g.connect(out);
  return g;
}

function tone(ctx, out, { type = "square", freq, to = freq, t, dur, vol, attack = 0.005, vibrato = 0 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to !== freq) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  if (vibrato) {
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 7;
    depth.gain.value = freq * vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t);
    lfo.stop(t + dur);
  }
  osc.connect(envelope(ctx, out, t, vol, attack, dur));
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

function hiss(ctx, out, { t, dur, vol, filter = "bandpass", from, to = from, q = 1, attack = 0.01 }) {
  const src = ctx.createBufferSource();
  src.buffer = noise(ctx);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  if (to !== from) f.frequency.exponentialRampToValueAtTime(to, t + dur);
  src.connect(f).connect(envelope(ctx, out, t, vol, attack, dur));
  src.start(t, Math.random() * 0.5);
  src.stop(t + dur + 0.02);
}

function arpeggio(ctx, out, t, notes, step, hold) {
  notes.forEach((freq, i) => {
    const last = i === notes.length - 1;
    const at = t + i * step;
    const dur = last ? hold : step * 1.1;
    tone(ctx, out, { type: "square", freq, t: at, dur, vol: 0.28, vibrato: last ? 0.012 : 0 });
    tone(ctx, out, { type: "triangle", freq: freq / 2, t: at, dur, vol: 0.4 });
  });
}

export const SYNTHS = {
  start(ctx, out, t) {
    hiss(ctx, out, { t, dur: 0.42, vol: 0.8, from: 300, to: 2600, q: 0.8, attack: 0.04 });
    tone(ctx, out, { type: "sine", freq: 80, to: 150, t, dur: 0.3, vol: 0.45, attack: 0.02 });
  },
  near(ctx, out, t) {
    hiss(ctx, out, { t, dur: 0.13, vol: 0.9, from: 7500, to: 2600, q: 1.4, attack: 0.008 });
  },
  death(ctx, out, t) {
    for (let i = 0; i < 4; i++) {
      hiss(ctx, out, { t: t + i * 0.042 + Math.random() * 0.012, dur: 0.055, vol: 1.2, filter: "lowpass", from: 3400 - i * 450, to: 1100, q: 2.5, attack: 0.002 });
    }
    tone(ctx, out, { type: "sine", freq: 170, to: 45, t, dur: 0.24, vol: 0.7, attack: 0.003 });
  },
  record(ctx, out, t) {
    arpeggio(ctx, out, t, [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0.085, 0.42);
  },
  first(ctx, out, t) {
    arpeggio(ctx, out, t, [NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6], 0.075, 0.12);
    const at = t + 0.42;
    for (const freq of [NOTE.C6, NOTE.E6, NOTE.G6]) {
      tone(ctx, out, { type: "square", freq, t: at, dur: 0.75, vol: 0.17, attack: 0.01, vibrato: 0.01 });
    }
    tone(ctx, out, { type: "triangle", freq: NOTE.C5, t: at, dur: 0.75, vol: 0.4, attack: 0.01 });
    hiss(ctx, out, { t: at, dur: 0.6, vol: 0.15, filter: "highpass", from: 6000, q: 0.7, attack: 0.01 });
  }
};
