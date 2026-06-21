// StabilitySystem.js – tracks instability and triggers collapse

export class StabilitySystem {
    constructor() {
        this.instability = 0;      // 0-100
        this.maxInstability = 100;
        this.shakeOffset = 0;
        this._shakeTimer = 0;
    }

    reset() {
        this.instability = 0;
        this.shakeOffset = 0;
        this._shakeTimer = 0;
    }

    /**
     * Record a placement. overhangRatio = 0 (perfect) → 1 (completely off).
     */
    onPlace(overhangRatio) {
        if (overhangRatio < 0.05) {
            // Perfect – slightly reduce instability
            this.instability = Math.max(0, this.instability - 8);
        } else {
            this.instability = Math.min(this.maxInstability, this.instability + overhangRatio * 35);
        }
    }

    /**
     * Passive instability that ramps with tower height — applied on every drop
     * so the game grows harder as the tower climbs. Even perfect drops bleed
     * a small amount, just less than the gain. Caps the per-drop floor effect.
     */
    onDrop(floor) {
        const base = 0.8;
        const growth = Math.min(floor * 0.18, 5);
        this.instability = Math.min(this.maxInstability, this.instability + base + growth);
    }

    /** Risk event damage (no insurance) */
    onRiskDamage() {
        this.instability = Math.min(this.maxInstability, this.instability + 25);
        this._shakeTimer = 40;
    }

    update() {
        if (this._shakeTimer > 0) {
            this._shakeTimer--;
            this.shakeOffset = (Math.random() - 0.5) * (this._shakeTimer / 5);
        } else {
            this.shakeOffset = 0;
        }
    }

    get isCollapsed() {
        return this.instability >= this.maxInstability;
    }

    /** 0-1 fraction for the UI bar (1 = full instability) */
    get fraction() {
        return this.instability / this.maxInstability;
    }
}
