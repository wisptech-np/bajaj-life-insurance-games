// SoundManager.js - Synthetic Web Audio Engine

class AudiEngine {
    constructor() {
        this.ctx = null; // initialized on first user interaction
        this.enabled = true;
    }

    _init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playOscillator({ type = 'sine', freq = 440, sweepFreq = null, duration = 0.1, vol = 0.1 }) {
        if (!this.enabled) return;
        this._init();

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        if (sweepFreq) {
            osc.frequency.exponentialRampToValueAtTime(sweepFreq, this.ctx.currentTime + duration);
        }

        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        // Prevent clicking by quickly ramping to 0
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime);
        osc.stop(this.ctx.currentTime + duration);
    }

    playNoise(duration = 0.1, vol = 0.1) {
        if (!this.enabled) return;
        this._init();

        const bufferSize = this.ctx.sampleRate * duration;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        noise.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(this.ctx.currentTime);
    }

    // High level sound events
    playThud() {
        this.playOscillator({ type: 'triangle', freq: 150, sweepFreq: 50, duration: 0.15, vol: 0.3 });
    }

    playPerfect() {
        this.playOscillator({ type: 'sine', freq: 880, duration: 0.4, vol: 0.15 });
        setTimeout(() => this.playOscillator({ type: 'sine', freq: 1100, duration: 0.5, vol: 0.1 }), 100);
    }

    playCrash() {
        this.playNoise(0.6, 0.4);
        this.playOscillator({ type: 'sawtooth', freq: 100, sweepFreq: 20, duration: 0.5, vol: 0.3 });
    }
}

export const SoundManager = new AudiEngine();
