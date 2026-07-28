// audio.js — synthesised Web Audio with correct mobile unlock and mute handling.
//
// All sound is generated at runtime; there are no audio files to download, which
// keeps startup fast and avoids shipping placeholder recordings. See
// docs/ASSET_GENERATION_PROMPTS.md for the spec if real audio is ever produced.
//
// Mobile browsers start the AudioContext suspended until a real user gesture.
// The games previously created a context on mount and assumed it worked, so the
// first several sounds were silently dropped on iOS. unlock() fixes that, and
// the context is also suspended while the game is backgrounded so audio does not
// keep playing over another app.

const DEFAULT_VOLUME = 0.35;

export function createAudio() {
  let ctx = null;
  let master = null;
  let muted = false;
  let unlocked = false;
  let volume = DEFAULT_VOLUME;

  const ensureContext = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : volume;
    master.connect(ctx.destination);
    return ctx;
  };

  /**
   * Must be called from inside a real user-gesture handler (pointerup/click).
   * Resumes the context and plays a silent blip, which is what actually
   * satisfies iOS Safari's autoplay policy.
   */
  const unlock = async () => {
    const c = ensureContext();
    if (!c) return false;
    if (c.state === 'suspended') {
      try {
        await c.resume();
      } catch {
        return false;
      }
    }
    if (!unlocked) {
      const osc = c.createOscillator();
      const g = c.createGain();
      g.gain.value = 0;
      osc.connect(g);
      g.connect(master);
      osc.start();
      osc.stop(c.currentTime + 0.01);
      unlocked = true;
    }
    return true;
  };

  /** Core voice: one oscillator with an envelope. */
  const tone = ({ freq, type = 'sine', duration = 0.12, gain = 1, attack = 0.005, freqTo = null, delay = 0 }) => {
    if (muted || !unlocked) return;
    const c = ensureContext();
    if (!c || c.state !== 'running') return;

    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + duration);

    // Exponential release avoids the click a linear ramp to zero produces.
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  };

  return {
    unlock,
    get isUnlocked() {
      return unlocked;
    },

    setMuted(value) {
      muted = value;
      if (master) master.gain.value = muted ? 0 : volume;
    },
    isMuted: () => muted,
    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },

    setVolume(v) {
      volume = Math.max(0, Math.min(1, v));
      if (master && !muted) master.gain.value = volume;
    },

    /** Suspend/resume with game pause so sound never plays over another app. */
    setPaused(paused) {
      if (!ctx) return;
      if (paused && ctx.state === 'running') ctx.suspend();
      else if (!paused && ctx.state === 'suspended' && unlocked) ctx.resume();
    },

    // ---- Voice library (matches okf-brain/GAME_STANDARD.md §audio) ----------
    click: () => tone({ freq: 1000, type: 'sine', duration: 0.05, gain: 0.25 }),

    coin: () => {
      tone({ freq: 400, type: 'sine', duration: 0.07, gain: 0.3 });
      tone({ freq: 600, type: 'sine', duration: 0.07, gain: 0.28, delay: 0.05 });
      tone({ freq: 800, type: 'sine', duration: 0.1, gain: 0.26, delay: 0.1 });
    },

    hit: () => tone({ freq: 200, type: 'sawtooth', duration: 0.18, gain: 0.3, freqTo: 100 }),

    powerUp: () => {
      [523, 659, 784].forEach((f, i) => tone({ freq: f, type: 'triangle', duration: 0.16, gain: 0.24, delay: i * 0.06 }));
    },

    victory: () => {
      [523, 587, 659, 784, 1046].forEach((f, i) =>
        tone({ freq: f, type: 'triangle', duration: 0.22, gain: 0.26, delay: i * 0.11 }));
    },

    failure: () => {
      [392, 330, 262].forEach((f, i) =>
        tone({ freq: f, type: 'sawtooth', duration: 0.26, gain: 0.22, delay: i * 0.13 }));
    },

    /** Rising pitch with combo depth — reads as "getting better". */
    combo: (depth = 1) => {
      const f = 440 * Math.pow(1.122, Math.min(depth, 12));
      tone({ freq: f, type: 'square', duration: 0.09, gain: 0.18 });
    },

    tick: () => tone({ freq: 1400, type: 'square', duration: 0.03, gain: 0.12 }),

    destroy() {
      try {
        ctx?.close();
      } catch {
        /* context may already be closed */
      }
      ctx = null;
      master = null;
      unlocked = false;
    },
  };
}
