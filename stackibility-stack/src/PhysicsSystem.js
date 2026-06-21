// PhysicsSystem.js – falling block gravity + landing detection

const GRAVITY = 0.55;

/**
 * A simple falling block object.
 * All positions in WORLD coordinates (px, py = world Y where larger = lower).
 */
export class FallingBlock {
    constructor(block, worldX, worldY, vx = 0) {
        this.block = block;
        this.px = worldX;
        this.py = worldY;
        this.vx = vx;
        this.vy = 0;
        this.rotation = 0;
        this.rotVel = 0;
        this.active = true;   // false = off-screen, remove
    }

    /** Returns true when block has landed on the tower. */
    update(towerTopWorldY, canvasH, cameraScrollY) {
        this.vy += GRAVITY;
        this.px += this.vx;
        this.py += this.vy;
        this.rotation += this.rotVel;

        // Off screen below = missed
        if (this.py - cameraScrollY > canvasH + 200) {
            this.active = false;
        }

        return false;
    }

    /** True if bottom of block is at or below the tower top. */
    hasLanded(towerTopWorldY) {
        return this.py + this.block.height / 2 >= towerTopWorldY;
    }
}

/**
 * Calculate the placement result when a block lands.
 * @param {number} blockCenterX   center x of falling block
 * @param {number} blockWidth     width of falling block
 * @param {number} towerCenterX   center x of tower top block
 * @param {number} towerWidth     width of tower top block
 * @returns {{ result: 'perfect'|'partial'|'miss', overhangRatio, offsetX }}
 */
export function calculateLanding(blockCenterX, blockWidth, towerCenterX, towerWidth) {
    const blockLeft = blockCenterX - blockWidth / 2;
    const blockRight = blockCenterX + blockWidth / 2;
    const towerLeft = towerCenterX - towerWidth / 2;
    const towerRight = towerCenterX + towerWidth / 2;

    const overlapLeft = Math.max(blockLeft, towerLeft);
    const overlapRight = Math.min(blockRight, towerRight);
    const overlap = overlapRight - overlapLeft;

    if (overlap <= 0) return { result: 'miss', overhangRatio: 1, offsetX: blockCenterX - towerCenterX };

    const offsetX = blockCenterX - towerCenterX;
    const overhangRatio = 1 - overlap / blockWidth;

    if (Math.abs(offsetX) < 12) {
        return { result: 'perfect', overhangRatio: 0, offsetX: 0, overlapWidth: towerWidth };
    }

    return { result: 'partial', overhangRatio, offsetX, overlapWidth: overlap, overlapCenter: (overlapLeft + overlapRight) / 2 };
}
