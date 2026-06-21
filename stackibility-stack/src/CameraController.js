// CameraController.js – smoothly follows the growing tower

import * as THREE from 'three';

export class CameraController {
    /**
     * @param {THREE.PerspectiveCamera} camera
     * @param {THREE.Vector3} initialPos
     * @param {THREE.Vector3} lookAt
     */
    constructor(camera, initialPos, lookAt) {
        this._camera = camera;
        this._targetY = initialPos.y;
        this._lookAtBase = lookAt.clone();
        this._lerpFactor = 0.08;

        camera.position.copy(initialPos);
        camera.lookAt(lookAt);
    }

    /**
     * Called each frame. stackHeight is the Y position of the top of the tower.
     */
    update(stackHeight) {
        // Keep a fixed vertical offset above the tower
        this._targetY = stackHeight + 12;

        // Smooth lerp
        this._camera.position.y += (this._targetY - this._camera.position.y) * this._lerpFactor;

        // Keep look-at synced
        const lookAtY = stackHeight - 1;
        this._lookAtBase.y += (lookAtY - this._lookAtBase.y) * this._lerpFactor;
        this._camera.lookAt(this._lookAtBase);
    }

    reset() {
        this._targetY = 10;
        this._camera.position.set(10, 14, 10);
        this._lookAtBase.set(0, 0, 0);
        this._camera.lookAt(this._lookAtBase);
    }
}
