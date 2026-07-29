// sfx.js — Guardian Arena's synthesised voices with ±10% random pitch.
//
// The shared kit's audio.js is copied byte-identical into src/kit/ and must not
// be edited, and its voice library is fixed-pitch. Arena combat plays the same
// few sounds dozens of times in 90 seconds, so every voice here jitters its
// base frequency by ±10% — repetition reads as texture instead of a loop.
//
// Same contract as the kit: no audio files, AudioContext created lazily and
// unlocked inside a real user gesture, suspended while the game is paused.

const DEFAULT_VOLUME = 0.35;

export function createSfx() {
  let ctx = null;
  let master = null;
  let muted = false;
  let unlocked = false;

  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : DEFAULT_VOLUME;
    master.connect(ctx.destination);
    return ctx;
  };

  const unlock = async () => {
    const c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') {
      try { await c.resume(); } catch { return false; }
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

  /** ±10% random pitch on every voice. */
  const jitter = (f) => f * (0.9 + Math.random() * 0.2);

  const tone = ({ freq, type = 'sine', duration = 0.12, gain = 1, attack = 0.005, freqTo = null, delay = 0 }) => {
    if (muted || !unlocked || !ctx || ctx.state !== 'running') return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + duration);
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
    get isUnlocked() { return unlocked; },

    setMuted(v) {
      muted = v;
      if (master) master.gain.value = muted ? 0 : DEFAULT_VOLUME;
    },
    isMuted: () => muted,
    toggleMute() {
      this.setMuted(!muted);
      return muted;
    },

    setPaused(paused) {
      if (!ctx) return;
      if (paused && ctx.state === 'running') ctx.suspend();
      else if (!paused && ctx.state === 'suspended' && unlocked) ctx.resume();
    },

    // ---- Voices (every base frequency jittered ±10%) -----------------------
    /** Guardian bolt leaving the barrel — short bright zap. */
    shoot: () => tone({ freq: jitter(880), type: 'square', duration: 0.06, gain: 0.14, freqTo: 520 }),

    /** Bolt lands on a blob. */
    hitEnemy: () => tone({ freq: jitter(300), type: 'triangle', duration: 0.07, gain: 0.2, freqTo: 200 }),

    /** Blob pops. */
    kill: () => {
      const f = jitter(420);
      tone({ freq: f, type: 'sawtooth', duration: 0.1, gain: 0.24, freqTo: f * 0.4 });
      tone({ freq: f * 1.6, type: 'sine', duration: 0.12, gain: 0.16, delay: 0.02 });
    },

    /** Ricochet leap — quick upward chirp. */
    ricochet: () => tone({ freq: jitter(700), type: 'square', duration: 0.05, gain: 0.12, freqTo: 1100 }),

    /** Guardian takes a hit. */
    hurt: () => tone({ freq: jitter(200), type: 'sawtooth', duration: 0.2, gain: 0.3, freqTo: 90 }),

    /** Shooter / boss wind-up telegraph ping. */
    windup: () => tone({ freq: jitter(1250), type: 'sine', duration: 0.09, gain: 0.12 }),

    /** Rider card picked — rising triad. */
    upgrade: () => {
      const b = jitter(523);
      [1, 1.26, 1.5].forEach((m, i) =>
        tone({ freq: b * m, type: 'triangle', duration: 0.16, gain: 0.22, delay: i * 0.06 }));
    },

    /** Wave banner. */
    wave: () => {
      const b = jitter(392);
      tone({ freq: b, type: 'triangle', duration: 0.12, gain: 0.2 });
      tone({ freq: b * 1.5, type: 'triangle', duration: 0.16, gain: 0.2, delay: 0.09 });
    },

    /** Boss arrival — low double thump. */
    boss: () => {
      const b = jitter(110);
      tone({ freq: b, type: 'sawtooth', duration: 0.3, gain: 0.3, freqTo: 60 });
      tone({ freq: b * 1.5, type: 'sawtooth', duration: 0.3, gain: 0.24, freqTo: 70, delay: 0.16 });
    },

    victory: () => {
      const b = jitter(523);
      [1, 1.122, 1.26, 1.5, 2].forEach((m, i) =>
        tone({ freq: b * m, type: 'triangle', duration: 0.22, gain: 0.26, delay: i * 0.11 }));
    },

    failure: () => {
      const b = jitter(392);
      [1, 0.84, 0.667].forEach((m, i) =>
        tone({ freq: b * m, type: 'sawtooth', duration: 0.26, gain: 0.22, delay: i * 0.13 }));
    },

    click: () => tone({ freq: jitter(1000), type: 'sine', duration: 0.05, gain: 0.25 }),
    tick: () => tone({ freq: jitter(1400), type: 'square', duration: 0.03, gain: 0.12 }),

    destroy() {
      try { ctx?.close(); } catch { /* already closed */ }
      ctx = null;
      master = null;
      unlocked = false;
    },
  };
}
