// synth.js — Premium Tiles' musical voice. Web Audio synth only, no files.
//
// Why not the kit's createAudio? The kit voice library is fire-and-forget UI
// blips with fixed envelopes. This game's core loop IS the audio: every tap
// performs the next melody note, and HOLD tiles need a sustained note with a
// controlled release — an API the kit deliberately does not expose (and kit
// copies may not be edited). So the game owns one AudioContext here, created
// lazily-but-early with latencyHint 'interactive', unlocked and pre-warmed on
// the first real gesture so the first tap's note is not swallowed on iOS.
//
// Latency posture: notes are triggered synchronously inside the pointerdown
// handler (never deferred to the next animation frame), oscillators start at
// ctx.currentTime with a 2-3 ms attack, and the context is resumed + warmed
// before gameplay input is accepted (the GET READY count gives it time).

export function createSynth({ masterGain = 0.5 } = {}) {
  let ctx = null;
  let master = null;
  let comp = null;
  let unlocked = false;
  let muted = false;
  const activeHolds = new Set();

  const ensure = () => {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC({ latencyHint: 'interactive' });
    comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 24;
    comp.ratio.value = 6;
    comp.attack.value = 0.002;
    comp.release.value = 0.12;
    master = ctx.createGain();
    master.gain.value = muted ? 0 : masterGain;
    master.connect(comp);
    comp.connect(ctx.destination);
    return ctx;
  };

  /** Call from inside a real user gesture. Resumes + plays a silent warm blip. */
  const unlock = () => {
    const c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') {
      c.resume().catch(() => {});
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

  const ready = () => {
    const c = ensure();
    return c && c.state === 'running' && !muted ? c : null;
  };

  /** One-shot voice with an exponential release (no click). */
  const tone = ({ freq, type = 'sine', dur = 0.12, gain = 0.25, attack = 0.004, freqTo = null, delay = 0 }) => {
    const c = ready();
    if (!c) return;
    const t0 = c.currentTime + delay;
    const osc = c.createOscillator();
    const env = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqTo), t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t0 + attack);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  };

  return {
    unlock,
    get isUnlocked() {
      return unlocked;
    },

    /** The melody voice: a soft two-layer pluck (triangle + octave sine shimmer)
        with a near-instant attack and a quick natural decay. */
    pluck(freq, decay = 0.38) {
      tone({ freq, type: 'triangle', dur: decay, gain: 0.34, attack: 0.003 });
      tone({ freq: freq * 2, type: 'sine', dur: decay * 0.6, gain: 0.09, attack: 0.002 });
    },

    /** Sustained melody note for HOLD tiles. Returns a handle; call stop(). */
    holdStart(freq, releaseSeconds = 0.14) {
      const c = ready();
      if (!c) return { stop() {} };
      const t0 = c.currentTime;
      const osc = c.createOscillator();
      const osc2 = c.createOscillator();
      const env = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t0);
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 1.003, t0); // gentle detune for warmth
      env.gain.setValueAtTime(0.0001, t0);
      env.gain.exponentialRampToValueAtTime(0.26, t0 + 0.012);
      osc.connect(env);
      osc2.connect(env);
      env.connect(master);
      osc.start(t0);
      osc2.start(t0);
      const handle = {
        stopped: false,
        stop() {
          if (handle.stopped) return;
          handle.stopped = true;
          activeHolds.delete(handle);
          const t1 = c.currentTime;
          env.gain.cancelScheduledValues(t1);
          env.gain.setValueAtTime(Math.max(0.0001, env.gain.value), t1);
          env.gain.exponentialRampToValueAtTime(0.0001, t1 + releaseSeconds);
          osc.stop(t1 + releaseSeconds + 0.03);
          osc2.stop(t1 + releaseSeconds + 0.03);
        },
      };
      activeHolds.add(handle);
      return handle;
    },

    /** Small bright blip as each +1 banks during a hold. */
    holdTick(freq) {
      tone({ freq: freq * 2, type: 'sine', dur: 0.05, gain: 0.08, attack: 0.002 });
    },

    /** Wrong tap: the discordant thud that breaks the music. ~110 Hz square. */
    thud() {
      tone({ freq: 110, type: 'square', dur: 0.15, gain: 0.26, attack: 0.003 });
    },

    /** Red tile / life lost: a harsher discordant sting. */
    sting() {
      tone({ freq: 220, type: 'sawtooth', dur: 0.26, gain: 0.24, freqTo: 82 });
      tone({ freq: 116.5, type: 'square', dur: 0.2, gain: 0.18, delay: 0.02 }); // tritone-ish clash
    },

    /** SPEED UP flourish: quick rising triad. */
    speedUp() {
      [523.25, 659.25, 783.99].forEach((f, i) =>
        tone({ freq: f, type: 'triangle', dur: 0.12, gain: 0.2, delay: i * 0.05 }));
    },

    /** Combo milestone chord burst (depth 1..3 for ×2/×3/×4). */
    milestone(depth = 1) {
      const chord = [523.25, 659.25, 783.99, 1046.5].slice(0, 2 + depth);
      chord.forEach((f, i) => tone({ freq: f, type: 'triangle', dur: 0.18, gain: 0.2, delay: i * 0.04 }));
    },

    /** Countdown tick + GO for the re-acquire beat. */
    countTick() {
      tone({ freq: 1400, type: 'square', dur: 0.03, gain: 0.1 });
    },
    go() {
      tone({ freq: 880, type: 'triangle', dur: 0.12, gain: 0.2 });
    },

    victory() {
      [523.25, 587.33, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone({ freq: f, type: 'triangle', dur: 0.22, gain: 0.24, delay: i * 0.11 }));
    },

    failure() {
      [392, 330, 262].forEach((f, i) =>
        tone({ freq: f, type: 'sawtooth', dur: 0.26, gain: 0.2, delay: i * 0.13 }));
    },

    setMuted(v) {
      muted = v;
      if (master) master.gain.value = muted ? 0 : masterGain;
    },

    /** Suspend/resume with the game so sound never plays over another app. */
    setPaused(paused) {
      if (!ctx) return;
      if (paused && ctx.state === 'running') ctx.suspend();
      else if (!paused && ctx.state === 'suspended' && unlocked) ctx.resume();
    },

    destroy() {
      for (const h of [...activeHolds]) h.stop();
      activeHolds.clear();
      try {
        ctx?.close();
      } catch {
        /* already closed */
      }
      ctx = null;
      master = null;
      comp = null;
      unlocked = false;
    },
  };
}
