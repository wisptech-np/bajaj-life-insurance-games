// MovementController.js – oscillating movement for the active block

export class MovementController {
    /**
     * @param {number} range  Half-amplitude of oscillation in world units
     * @param {number} speed  Starting speed (units/frame at 60fps)
     */
    constructor(range = 8, speed = 0.04) {
        this._range = range;
        this._speed = speed;
        this._dir = 1;
        this._pos = -range; // start from edge
    }

    /**
     * Called each frame. Returns the next position value.
     * Uses a linear bounce so speed is perfectly constant.
     */
    update() {
        this._pos += this._speed * this._dir;

        if (this._pos >= this._range) {
            this._pos = this._range;
            this._dir = -1;
        } else if (this._pos <= -this._range) {
            this._pos = -this._range;
            this._dir = 1;
        }

        return this._pos;
    }

    get currentPosition() {
        return this._pos;
    }

    /**
     * Increase speed each level (caps at a max).
     */
    increaseSpeed(level) {
        const base = 0.04;
        const maxSpd = 0.14;
        this._speed = Math.min(base + level * 0.008, maxSpd);
    }

    reset(range = 8, speed = 0.04) {
        this._range = range;
        this._speed = speed;
        this._dir = 1;
        this._pos = -range;
    }
}
