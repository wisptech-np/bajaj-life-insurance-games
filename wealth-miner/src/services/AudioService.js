class AudioService {
    constructor() {
        this.ctx = null;
    }

    initCtx() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    playTone(freq, type, duration, gainStart = 0.1, startTime = 0) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime + startTime);

        gain.gain.setValueAtTime(gainStart, this.ctx.currentTime + startTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + startTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(this.ctx.currentTime + startTime);
        osc.stop(this.ctx.currentTime + startTime + duration);
    }

    playGrab() {
        this.initCtx();
        // A short mechanical latch sound
        this.playTone(180, 'triangle', 0.08, 0.15);
        this.playTone(240, 'triangle', 0.06, 0.1, 0.04);
    }

    playCoin() {
        this.initCtx();
        // Sweet coin collection sound (arpeggio)
        const now = 0;
        this.playTone(987.77, 'sine', 0.1, 0.08, now); // B5
        this.playTone(1318.51, 'sine', 0.25, 0.08, now + 0.08); // E6
    }

    playScoreAdd() {
        this.initCtx();
        // General good reward sound
        this.playTone(523.25, 'sine', 0.1, 0.1); // C5
        this.playTone(659.25, 'sine', 0.1, 0.08, 0.06); // E5
        this.playTone(783.99, 'sine', 0.2, 0.06, 0.12); // G5
    }

    playScoreSub() {
        this.initCtx();
        // Descending warning sound for minor hits
        this.playTone(220, 'sawtooth', 0.25, 0.08); // A3
        this.playTone(147, 'sawtooth', 0.35, 0.08, 0.12); // D3
    }

    playExplosion() {
        this.initCtx();
        // Deeper explosion sound using a low-frequency sweep
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(10, this.ctx.currentTime + 0.6);

        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start();
        osc.stop(this.ctx.currentTime + 0.6);
    }

    playPurchase() {
        this.initCtx();
        // Classic cash register 'cha-ching'
        this.playTone(1500, 'sine', 0.05, 0.1);
        this.playTone(1800, 'sine', 0.08, 0.08, 0.05);
        this.playTone(2200, 'sine', 0.2, 0.06, 0.1);
    }

    playCombo(streak) {
        this.initCtx();
        // Ascending pitches reflecting combo count
        const baseFreq = 440 + streak * 60;
        this.playTone(baseFreq, 'sine', 0.1, 0.1);
        this.playTone(baseFreq * 1.25, 'sine', 0.15, 0.08, 0.05);
        this.playTone(baseFreq * 1.5, 'sine', 0.2, 0.06, 0.1);
    }

    playLevelComplete() {
        this.initCtx();
        const chords = [523.25, 659.25, 783.99, 1046.50]; // C major arpeggio
        chords.forEach((f, i) => {
            this.playTone(f, 'sine', 0.3, 0.08, i * 0.1);
        });
    }

    playGameOver() {
        this.initCtx();
        const chords = [392.00, 349.23, 311.13, 261.63]; // C minor descending
        chords.forEach((f, i) => {
            this.playTone(f, 'triangle', 0.4, 0.1, i * 0.15);
        });
    }
}

export const audioService = new AudioService();
export default audioService;
