// RopeSwingController.js – pendulum-based block swing

export class RopeSwingController {
    constructor() {
        this.t = 0;
        this.baseSpeed = 1.6;
        this.maxAngle = Math.PI / 4;
        this.ropeLength = 150;
        this.released = false;
    }

    reset(level = 1) {
        this.t = 0;
        this.released = false;
        this.baseSpeed = Math.min(1.6 + (level - 1) * 0.12, 2.6);
    }


    /**
     * Update the swing position.
     * @param {number} dt           delta time in frames (1 = 60fps frame)
     * @param {number} speedMult    power-up speed multiplier
     * @param {number} anchorX      screen-space anchor x
     * @param {number} anchorY      screen-space anchor y
     * @returns {{ x, y, angle, vx, vy }}
     */
    update(dt, speedMult, anchorX, anchorY) {
        this.t += dt * this.baseSpeed * speedMult * 0.016;

        const angle = Math.sin(this.t) * this.maxAngle;
        const x = anchorX + this.ropeLength * Math.sin(angle);
        const y = anchorY + this.ropeLength * Math.cos(angle);

        // Angular velocity for release impulse
        const angleVel = Math.cos(this.t) * this.maxAngle * this.baseSpeed * speedMult * 0.016;
        const vx = this.ropeLength * Math.cos(angle) * angleVel;
        const vy = 0;  // negligible vertical component at release

        return { x, y, angle, vx, vy };
    }

    /**
     * Compute position without advancing time (for query).
     */
    currentPos(anchorX, anchorY) {
        const angle = Math.sin(this.t) * this.maxAngle;
        const x = anchorX + this.ropeLength * Math.sin(angle);
        const y = anchorY + this.ropeLength * Math.cos(angle);
        return { x, y, angle };
    }
}
