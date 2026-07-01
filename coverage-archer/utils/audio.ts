let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = 1;
      masterGain.connect(audioCtx.destination);
    }
    // Resume context if suspended (browser security autoplays)
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch (e) {
    console.warn('[Audio] Failed to initialize Web Audio API', e);
    return null;
  }
}

export function playSynthSFX(type: 'shoot' | 'hit' | 'shield' | 'levelup' | 'lose' | 'gameover') {
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

  if (type === 'shoot') {
    // Upward slide representation of firing
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(masterGain);
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.15);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
    o.start(t);
    o.stop(t + 0.15);
  } else if (type === 'hit') {
    // Low frequency crash buzz for virus explode
    note(180, 0, 0.15, 'sawtooth', 0.22);
    note(100, 0.04, 0.2, 'sawtooth', 0.2);
  } else if (type === 'shield') {
    // Sci-fi arpeggio for powerups
    note(440, 0, 0.08, 'sine', 0.15);
    note(554.37, 0.04, 0.08, 'sine', 0.15);
    note(659.25, 0.08, 0.08, 'sine', 0.15);
    note(880, 0.12, 0.15, 'sine', 0.15);
  } else if (type === 'levelup') {
    // Rising triumphant notes
    note(523.25, 0, 0.1, 'sine', 0.18);
    note(659.25, 0.08, 0.1, 'sine', 0.18);
    note(783.99, 0.16, 0.1, 'sine', 0.18);
    note(1046.50, 0.24, 0.25, 'sine', 0.2);
  } else if (type === 'lose') {
    // Flat noise/buzz when base hit
    note(110, 0, 0.25, 'sawtooth', 0.25);
  } else if (type === 'gameover') {
    // Melodic sad arpeggio downward
    [523.25, 440.00, 349.23, 261.63].forEach((f, i) => {
      note(f, i * 0.14, 0.25, 'sine', 0.22);
    });
  }
}
