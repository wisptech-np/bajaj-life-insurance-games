// audio.js — Web Audio API synth SFX (no audio files).
// AudioContext is created lazily on the first user gesture and resumed on mobile.

let ctx = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
}

/** Call once on the first user gesture (e.g. Play button) to unlock audio on mobile. */
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  // Play a silent blip to fully unlock iOS audio.
  const osc = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0.0001;
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.02);
}

function tone({ type = 'sine', from = 440, to = null, dur = 0.15, vol = 0.2, delay = 0, curve = 'exp' }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to != null) {
    if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.2, vol = 0.18, delay = 0, lpFrom = 4000, lpTo = 400 }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(lpFrom, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, lpTo), t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(t0);
  src.stop(t0 + dur + 0.05);
}

/** UI button tap — 1000 Hz sine, 50 ms. */
export function sfxTap() {
  tone({ type: 'sine', from: 1000, dur: 0.05, vol: 0.12 });
}

/** Rope snip — bright ping + short fizz of severed strands. */
export function sfxSnip() {
  noise({ dur: 0.08, vol: 0.22, lpFrom: 9000, lpTo: 2500 });
  tone({ type: 'triangle', from: 1800, to: 900, dur: 0.09, vol: 0.16 });
}

/** Star coin collect — ascending sines 400→600→800 Hz. */
export function sfxCollect() {
  tone({ type: 'sine', from: 400, dur: 0.09, vol: 0.16 });
  tone({ type: 'sine', from: 600, dur: 0.09, vol: 0.16, delay: 0.07 });
  tone({ type: 'sine', from: 800, dur: 0.12, vol: 0.18, delay: 0.14 });
}

/** Shield destroyed — sawtooth 200→100 Hz + crunch. */
export function sfxHit() {
  tone({ type: 'sawtooth', from: 200, to: 100, dur: 0.32, vol: 0.24 });
  noise({ dur: 0.3, vol: 0.2, lpFrom: 2600, lpTo: 120 });
}

/** Bubble capture — soft power-up triangle chord 523/659/784 Hz. */
export function sfxBubble() {
  tone({ type: 'triangle', from: 523, dur: 0.22, vol: 0.1 });
  tone({ type: 'triangle', from: 659, dur: 0.22, vol: 0.1, delay: 0.02 });
  tone({ type: 'triangle', from: 784, dur: 0.26, vol: 0.1, delay: 0.04 });
}

/** Bubble pop. */
export function sfxPop() {
  noise({ dur: 0.06, vol: 0.24, lpFrom: 6000, lpTo: 1400 });
  tone({ type: 'sine', from: 700, to: 220, dur: 0.08, vol: 0.14 });
}

/** Air puffer whoosh. */
export function sfxPuff() {
  noise({ dur: 0.28, vol: 0.2, lpFrom: 1800, lpTo: 300 });
}

/** Level cleared — rising chord. */
export function sfxLevelClear() {
  tone({ type: 'triangle', from: 523, dur: 0.14, vol: 0.16 });
  tone({ type: 'triangle', from: 659, dur: 0.14, vol: 0.16, delay: 0.1 });
  tone({ type: 'triangle', from: 784, dur: 0.2, vol: 0.18, delay: 0.2 });
  tone({ type: 'sine', from: 1046, dur: 0.3, vol: 0.14, delay: 0.3 });
}

/** Game won — 5-note fanfare. */
export function sfxFanfare() {
  const notes = [523, 659, 784, 1046, 1318];
  notes.forEach((f, i) => {
    tone({ type: 'triangle', from: f, dur: 0.22, vol: 0.18, delay: i * 0.12 });
    tone({ type: 'sine', from: f / 2, dur: 0.22, vol: 0.1, delay: i * 0.12 });
  });
}

/** Time up / lose — descending. */
export function sfxLose() {
  tone({ type: 'sawtooth', from: 440, to: 160, dur: 0.5, vol: 0.16 });
  tone({ type: 'sawtooth', from: 330, to: 110, dur: 0.6, vol: 0.14, delay: 0.18 });
}

/** Low-time warning tick. */
export function sfxTick() {
  tone({ type: 'square', from: 880, dur: 0.05, vol: 0.07 });
}
