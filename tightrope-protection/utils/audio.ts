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

export function playSynthSFX(type: 'coin' | 'jump' | 'switch' | 'shield' | 'hit' | 'gameover') {
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

  if (type === 'coin') {
    // Happy high-pitched double chime
    note(987.77, 0, 0.08, 'sine', 0.22);
    note(1318.51, 0.06, 0.14, 'sine', 0.22);
  } else if (type === 'jump') {
    // Upward pitch bend/impulse
    note(293.66, 0, 0.12, 'triangle', 0.18);
  } else if (type === 'switch') {
    // Quick soft click / slide
    note(196.00, 0, 0.05, 'sine', 0.16);
  } else if (type === 'shield') {
    // Sci-fi bubble arpeggio
    note(523.25, 0, 0.08, 'sine', 0.2);
    note(659.25, 0.04, 0.08, 'sine', 0.2);
    note(783.99, 0.08, 0.12, 'sine', 0.2);
  } else if (type === 'hit') {
    // Low frequency crash buzz
    note(130.81, 0, 0.16, 'sawtooth', 0.28);
    note(85.00, 0.04, 0.22, 'sawtooth', 0.25);
  } else if (type === 'gameover') {
    // Melodic sad arpeggio downward
    [523.25, 440.00, 349.23, 261.63].forEach((f, i) => {
      note(f, i * 0.14, 0.22, 'sine', 0.26);
    });
  }
}
