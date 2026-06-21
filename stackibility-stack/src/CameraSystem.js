// CameraSystem.js – smooth camera that follows the growing tower

export class CameraSystem {
    constructor() {
        this.scrollY = 0;      // current offset (px)
        this._targetY = 0;
        this._lerpSpeed = 0.07;
    }

    reset() {
        this.scrollY = 0;
        this._targetY = 0;
    }

    /**
     * Called each frame.
     * @param {number} towerTopWorldY  The world-Y of the top of the tower
     * @param {number} canvasH
     * @param {number} groundWorldY    The world-Y of the ground (constant)
     */
    update(towerTopWorldY, canvasH, groundWorldY) {
        // Focal point (stack top) stays 85% down — avoid UI overlay overlap
        const desiredScreenY = canvasH * 0.85;
        // towerTopWorldY - scrollY = desiredScreenY
        // scrollY = towerTopWorldY - desiredScreenY
        const raw = towerTopWorldY - desiredScreenY;
        this._targetY = Math.min(0, raw);  // scroll down (negative scrollY) when tower goes higher

        this.scrollY += (this._targetY - this.scrollY) * this._lerpSpeed;
    }

    /** Apply camera transform before drawing world objects. */
    applyTransform(ctx) {
        ctx.translate(0, -this.scrollY);
    }
}
