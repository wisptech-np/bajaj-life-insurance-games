// sound.js — Legacy Echo's extra synth voices, on top of the kit's standard set.
//
// The kit's audio module (src/kit/audio.js) ships the repo-standard voices
// (coin, hit, power-up, victory, UI tap) and is used for those. The three
// sounds that belong to THIS game's fantasy — the inter-loop tape whir, the
// plate latch, the vault door slide — do not fit its fixed voice list and the
// kit copies must never be edited, so they live here in a tiny sibling synth.
// Same rules as the kit: Web Audio only, no files, context created lazily and
// unlocked from a real user gesture, suspended while the game is paused.

export function createEchoSynth() {
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
    master.gain.value = muted ? 0 : 0.32;
    master.connect(ctx.destination);
    return ctx;
  };

  const unlock = async () => {
    const c = ensure();
    if (!c) return false;
    if (c.state === 'suspended') {
      try {
        await c.resume();
      } catch {
        return false;
      }
    }
    unlocked = true;
    return true;
  };

  const env = (t0, attack, duration, peak) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    g.connect(master);
    return g;
  };

  return {
    unlock,
    setMuted(v) {
      muted = v;
      if (master) master.gain.value = muted ? 0 : 0.32;
    },
    setPaused(paused) {
      if (!ctx) return;
      if (paused && ctx.state === 'running') ctx.suspend();
      else if (!paused && ctx.state === 'suspended' && unlocked) ctx.resume();
    },

    /** Inter-loop rewind: a falling detuned two-saw whir with a wow-flutter LFO —
        reads as a tape scrubbing backwards. */
    whir(duration = 0.8) {
      if (muted || !unlocked || !ctx || ctx.state !== 'running') return;
      const t0 = ctx.currentTime;
      const g = env(t0, 0.03, duration, 0.5);
      for (let i = 0; i < 2; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        const f0 = 640 * (i === 0 ? 1 : 1.011);
        osc.frequency.setValueAtTime(f0, t0);
        osc.frequency.exponentialRampToValueAtTime(70, t0 + duration);
        osc.connect(g);
        osc.start(t0);
        osc.stop(t0 + duration + 0.02);
      }
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 11;
      lfoG.gain.setValueAtTime(0.16, t0);
      lfo.connect(lfoG);
      lfoG.connect(g.gain);
      lfo.start(t0);
      lfo.stop(t0 + duration);
    },

    /** Plate latch: a short mechanical thock. */
    latch() {
      if (muted || !unlocked || !ctx || ctx.state !== 'running') return;
      const t0 = ctx.currentTime;
      const g = env(t0, 0.004, 0.09, 0.5);
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(190, t0);
      osc.frequency.exponentialRampToValueAtTime(120, t0 + 0.08);
      osc.connect(g);
      osc.start(t0);
      osc.stop(t0 + 0.11);
      const g2 = env(t0, 0.002, 0.03, 0.22);
      const click = ctx.createOscillator();
      click.type = 'triangle';
      click.frequency.setValueAtTime(2400, t0);
      click.connect(g2);
      click.start(t0);
      click.stop(t0 + 0.05);
    },

    /** Vault door counterweight slide: a low rising triangle with grit. */
    doorSlide(open = true) {
      if (muted || !unlocked || !ctx || ctx.state !== 'running') return;
      const t0 = ctx.currentTime;
      const g = env(t0, 0.02, 0.34, 0.42);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      if (open) {
        osc.frequency.setValueAtTime(90, t0);
        osc.frequency.exponentialRampToValueAtTime(240, t0 + 0.3);
      } else {
        osc.frequency.setValueAtTime(240, t0);
        osc.frequency.exponentialRampToValueAtTime(80, t0 + 0.3);
      }
      osc.connect(g);
      osc.start(t0);
      osc.stop(t0 + 0.38);
    },

    /** Re-acquire countdown beep (3-2-1 then GO). */
    countBeep(go = false) {
      if (muted || !unlocked || !ctx || ctx.state !== 'running') return;
      const t0 = ctx.currentTime;
      const g = env(t0, 0.006, go ? 0.22 : 0.1, 0.3);
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(go ? 1180 : 760, t0);
      osc.connect(g);
      osc.start(t0);
      osc.stop(t0 + (go ? 0.26 : 0.13));
    },

    destroy() {
      try {
        ctx?.close();
      } catch {
        /* already closed */
      }
      ctx = null;
      master = null;
      unlocked = false;
    },
  };
}
