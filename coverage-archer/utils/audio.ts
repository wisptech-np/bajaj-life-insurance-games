// Synth SFX via Web Audio API — no audio files (GAME_STANDARD §5).
// AudioContext is created lazily on the first user gesture and resumed on mobile.

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 1;
      masterGain.connect(audioCtx.destination);
    }
    // Resume context if suspended (mobile autoplay policy)
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('[Audio] Failed to initialize Web Audio API', e);
    return null;
  }
}

export function setMuted(next: boolean) {
  muted = next;
  if (masterGain) masterGain.gain.value = muted ? 0 : 1;
}

export function isMuted() {
  return muted;
}

export type SfxType =
  | 'ui'
  | 'shoot'
  | 'hit'
  | 'critical'
  | 'miss'
  | 'wave'
  | 'win'
  | 'gameover';

export function playSynthSFX(type: SfxType) {
  const ctx = getCtx();
  if (!ctx || !masterGain) return;

  const t = ctx.currentTime;

  const note = (freq: number, delay: number, dur: number, wave: OscillatorType, vol: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(masterGain!);
    o.type = wave;
    o.frequency.setValueAtTime(freq, t + delay);

    g.gain.setValueAtTime(0, t + delay);
    g.gain.linearRampToValueAtTime(vol, t + delay + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

    o.start(t + delay);
    o.stop(t + delay + dur);
  };

  const slide = (from: number, to: number, dur: number, wave: OscillatorType, vol: number) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(masterGain!);
    o.type = wave;
    o.frequency.setValueAtTime(from, t);
    o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t);
    o.stop(t + dur);
  };

  switch (type) {
    case 'ui':
      // UI tap: 1000 Hz sine 50 ms
      note(1000, 0, 0.05, 'sine', 0.12);
      break;
    case 'shoot':
      // Bow release: quick upward slide
      slide(220, 880, 0.15, 'triangle', 0.18);
      break;
    case 'hit':
      // Virus pop: ascending sines 400 -> 600 -> 800
      note(400, 0, 0.07, 'sine', 0.2);
      note(600, 0.06, 0.07, 'sine', 0.2);
      note(800, 0.12, 0.1, 'sine', 0.2);
      break;
    case 'critical':
      // Core hit: bright triangle chord 523/659/784
      note(523.25, 0, 0.12, 'triangle', 0.2);
      note(659.25, 0.02, 0.12, 'triangle', 0.2);
      note(783.99, 0.04, 0.2, 'triangle', 0.22);
      note(1046.5, 0.12, 0.2, 'sine', 0.16);
      break;
    case 'miss':
      // Arrow thud: sawtooth 200 -> 100
      slide(200, 100, 0.16, 'sawtooth', 0.16);
      break;
    case 'wave':
      // Wave secured: rising trio
      note(523.25, 0, 0.1, 'sine', 0.18);
      note(659.25, 0.08, 0.1, 'sine', 0.18);
      note(783.99, 0.16, 0.22, 'sine', 0.2);
      break;
    case 'win':
      // 5-note victory fanfare
      [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((f, i) => {
        note(f, i * 0.11, i === 4 ? 0.4 : 0.14, 'triangle', 0.2);
      });
      break;
    case 'gameover':
      // Sad descending arpeggio
      [523.25, 440.0, 349.23, 261.63].forEach((f, i) => {
        note(f, i * 0.14, 0.25, 'sine', 0.2);
      });
      break;
  }
}
