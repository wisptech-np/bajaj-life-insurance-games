// InsuranceSystem.js – insurance state + retry logic

const INSURANCE_COST = 10;

export class InsuranceSystem {
    constructor() {
        this.nextBlockInsured = false;
        this.retryAvailable = false;
        this._retrySnapshot = null;  // saved state for retry
    }

    reset() {
        this.nextBlockInsured = false;
        this.retryAvailable = false;
        this._retrySnapshot = null;
    }

    canAfford(coins) {
        return coins >= INSURANCE_COST;
    }

    /** Toggle insure flag. Returns new coin total or false if can't afford. */
    toggleInsure(coins) {
        if (this.nextBlockInsured) {
            this.nextBlockInsured = false;
            return coins + INSURANCE_COST;   // refund
        }
        if (coins < INSURANCE_COST) return false;
        this.nextBlockInsured = true;
        return coins - INSURANCE_COST;
    }

    /** Call when a block is placed/dropped. Returns the insured flag and resets. */
    consumeForBlock() {
        const was = this.nextBlockInsured;
        this.nextBlockInsured = false;
        return was;
    }

    /** Save state snapshot for retry. */
    saveSnapshot(towerSnapshot, score, coins, stability) {
        this._retrySnapshot = { towerSnapshot, score, coins, stability };
        this.retryAvailable = true;
    }

    consumeRetry() {
        if (!this.retryAvailable) return null;
        this.retryAvailable = false;
        const snap = this._retrySnapshot;
        this._retrySnapshot = null;
        return snap;
    }

    get cost() { return INSURANCE_COST; }
}
