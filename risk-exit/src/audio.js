// Web Audio synth SFX — no audio files.
// AudioContext is created lazily on the first user gesture and resumed on demand.

let ctx = null;

function getCtx() {
  if (typeof window === 'undefined') return null;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

/** Ensure the context exists/resumes — call from the first pointer event. */
export function unlockAudio() {
  getCtx();
}

function tone({ type = 'sine', from = 440, to = null, dur = 0.12, gain = 0.16, delay = 0, curve = 'exp' }) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(from, t0);
  if (to != null) {
    if (curve === 'exp' && from > 0 && to > 0) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    else osc.frequency.linearRampToValueAtTime(to, t0 + dur);
  }
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g);
  g.connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** UI tap — short 1 kHz blip. */
export function sfxTap() {
  tone({ type: 'sine', from: 1000, dur: 0.05, gain: 0.08 });
}

/** Slide whoosh. */
export function sfxSlide() {
  tone({ type: 'triangle', from: 320, to: 620, dur: 0.1, gain: 0.07 });
}

/** Successful exit — ascending sines, pitched up with combo. */
export function sfxExit(combo = 1) {
  const lift = Math.min(combo - 1, 6) * 40;
  tone({ type: 'sine', from: 400 + lift, dur: 0.09, gain: 0.14 });
  tone({ type: 'sine', from: 600 + lift, dur: 0.09, gain: 0.14, delay: 0.07 });
  tone({ type: 'sine', from: 800 + lift, dur: 0.12, gain: 0.14, delay: 0.14 });
}

/** Bump — sawtooth drop. */
export function sfxBump() {
  tone({ type: 'sawtooth', from: 200, to: 100, dur: 0.16, gain: 0.12 });
}

/** Risk breach — low ugly buzz. */
export function sfxRiskBreach() {
  tone({ type: 'sawtooth', from: 160, to: 60, dur: 0.35, gain: 0.16 });
  tone({ type: 'square', from: 90, to: 45, dur: 0.35, gain: 0.08, delay: 0.02 });
}

/** Risk cleared safely — triangle chord. */
export function sfxRiskSafe() {
  tone({ type: 'triangle', from: 523, dur: 0.22, gain: 0.12 });
  tone({ type: 'triangle', from: 659, dur: 0.22, gain: 0.12, delay: 0.02 });
  tone({ type: 'triangle', from: 784, dur: 0.3, gain: 0.12, delay: 0.04 });
}

/** Locked block tapped. */
export function sfxLocked() {
  tone({ type: 'square', from: 140, dur: 0.08, gain: 0.09 });
  tone({ type: 'square', from: 110, dur: 0.08, gain: 0.09, delay: 0.09 });
}

/** Board cleared — quick rising arpeggio. */
export function sfxLevelUp() {
  [523, 659, 784, 1047].forEach((f, i) => {
    tone({ type: 'triangle', from: f, dur: 0.14, gain: 0.13, delay: i * 0.08 });
  });
}

/** Win — 5-note fanfare. */
export function sfxWin() {
  [523, 659, 784, 1047, 1319].forEach((f, i) => {
    tone({ type: 'triangle', from: f, dur: 0.22, gain: 0.15, delay: i * 0.12 });
  });
}

/** Lose — descending minor. */
export function sfxLose() {
  [392, 330, 262, 196].forEach((f, i) => {
    tone({ type: 'sine', from: f, dur: 0.28, gain: 0.13, delay: i * 0.16 });
  });
}
