// PowerUpSystem.js – power-up definitions and usage logic

export const POWER_UPS = [
    { id: 'shield', icon: '🛡', name: 'Shield', desc: 'Next block auto-insured', cost: 20, duration: 0 },
    { id: 'slowmo', icon: '⏳', name: 'Slow Motion', desc: 'Swing slows for 5s', cost: 25, duration: 300 },
    { id: 'perfect', icon: '🎯', name: 'Perfect Drop', desc: 'Next drop auto-aligns', cost: 35, duration: 0 },
    { id: 'wide', icon: '🏗', name: 'Wide Block', desc: 'Next block is extra wide', cost: 20, duration: 0 },
    { id: 'chance', icon: '🔁', name: 'Second Chance', desc: 'Survive one miss', cost: 30, duration: 0 },
];

export class PowerUpSystem {
    constructor() {
        this.activeEffects = new Map();  // id → framesRemaining (0 = instant/one-shot consumed)
    }

    reset() {
        this.activeEffects.clear();
    }

    activate(id) {
        const def = POWER_UPS.find(p => p.id === id);
        if (!def) return;
        this.activeEffects.set(id, def.duration || 1);
    }

    isActive(id) {
        return this.activeEffects.has(id) && this.activeEffects.get(id) > 0;
    }

    consume(id) {
        this.activeEffects.delete(id);
    }

    update() {
        for (const [id, frames] of this.activeEffects) {
            if (frames <= 0) { this.activeEffects.delete(id); continue; }
            this.activeEffects.set(id, frames - 1);
        }
    }

    get speedMultiplier() {
        return this.isActive('slowmo') ? 0.35 : 1;
    }
}
