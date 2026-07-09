// audio.js — Web Audio synth SFX (no audio files).
// AudioContext is created lazily on the first user gesture and resumed on mobile.

let ctx = null;

function ac() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

export function unlockAudio() {
  try { ac(); } catch { /* ignore */ }
}

function tone({ type = 'sine', freq = 440, to = null, dur = 0.15, gain = 0.16, delay = 0, curve = 'exp' }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to != null) {
    if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/* Rising pentatonic ladder — every consecutive tap in a streak climbs the melody. */
const PENTA = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 784.0, 880.0, 1046.5, 1174.7, 1318.5, 1568.0, 1760.0, 2093.0];

export function playTapNote(streak) {
  const idx = Math.min(PENTA.length - 1, streak % PENTA.length);
  tone({ type: 'sine', freq: PENTA[idx], dur: 0.16, gain: 0.16 });
  tone({ type: 'triangle', freq: PENTA[idx] * 2, dur: 0.1, gain: 0.05 });
}

/* Gold coin burst: ascending sines 400 -> 600 -> 800 Hz + shimmer. */
export function playGold() {
  tone({ type: 'sine', freq: 400, dur: 0.09, gain: 0.15 });
  tone({ type: 'sine', freq: 600, dur: 0.09, gain: 0.15, delay: 0.07 });
  tone({ type: 'sine', freq: 800, dur: 0.12, gain: 0.16, delay: 0.14 });
  tone({ type: 'triangle', freq: 1568, dur: 0.2, gain: 0.06, delay: 0.16 });
}

/* Dull thud for an empty tap (combo break). */
export function playThud() {
  tone({ type: 'sine', freq: 150, to: 70, dur: 0.14, gain: 0.14 });
}

/* Hit / lapse: sawtooth 200 -> 100 Hz. */
export function playLapse() {
  tone({ type: 'sawtooth', freq: 200, to: 100, dur: 0.42, gain: 0.2 });
  tone({ type: 'square', freq: 90, to: 45, dur: 0.5, gain: 0.1, delay: 0.05 });
}

/* Power-up / fever: triangle chord 523 / 659 / 784 Hz. */
export function playFever() {
  tone({ type: 'triangle', freq: 523.25, dur: 0.45, gain: 0.12 });
  tone({ type: 'triangle', freq: 659.25, dur: 0.45, gain: 0.12, delay: 0.02 });
  tone({ type: 'triangle', freq: 783.99, dur: 0.5, gain: 0.12, delay: 0.04 });
  tone({ type: 'sine', freq: 1046.5, dur: 0.5, gain: 0.07, delay: 0.1 });
}

/* Year-up banner whoosh. */
export function playYearUp() {
  tone({ type: 'triangle', freq: 330, to: 990, dur: 0.28, gain: 0.12 });
  tone({ type: 'sine', freq: 660, dur: 0.16, gain: 0.08, delay: 0.22 });
}

/* Win: 5-note fanfare. */
export function playWin() {
  const seq = [523.25, 659.25, 783.99, 1046.5, 1318.5];
  seq.forEach((f, i) => {
    tone({ type: 'triangle', freq: f, dur: 0.22, gain: 0.15, delay: i * 0.13 });
    tone({ type: 'sine', freq: f / 2, dur: 0.22, gain: 0.07, delay: i * 0.13 });
  });
}

/* UI tap: 1000 Hz sine, 50 ms. */
export function playUiTap() {
  tone({ type: 'sine', freq: 1000, dur: 0.05, gain: 0.1 });
}
