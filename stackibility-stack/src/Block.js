// Block.js – Three.js block factory

import * as THREE from 'three';

// Curated gradient palette (financial-themed colors)
const BLOCK_COLORS = [
    0x6366f1, // indigo
    0x8b5cf6, // violet
    0xa855f7, // purple
    0xec4899, // pink
    0xf43f5e, // rose
    0xf97316, // orange
    0xeab308, // yellow
    0x22c55e, // green
    0x10b981, // emerald
    0x06b6d4, // cyan
    0x3b82f6, // blue
];

let colorIndex = 0;

export function nextColor() {
    const color = BLOCK_COLORS[colorIndex % BLOCK_COLORS.length];
    colorIndex++;
    return color;
}

export function resetColorIndex() {
    colorIndex = 0;
}

/**
 * Create a single block mesh.
 * @param {number} sx  width (x)
 * @param {number} sy  height (fixed at 0.4)
 * @param {number} sz  depth (z)
 * @param {number} color  hex color
 * @returns {THREE.Mesh}
 */
export function createBlock(sx, sy, sz, color) {
    const geometry = new THREE.BoxGeometry(sx, sy, sz);
    const material = new THREE.MeshLambertMaterial({ color });

    // Top-face highlight via vertex colors for a slight sheen
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    // Store logical dimensions on mesh for easy access
    mesh.userData.sx = sx;
    mesh.userData.sy = sy;
    mesh.userData.sz = sz;

    return mesh;
}

/**
 * Create a falling "cut" piece.
 */
export function createFallingPiece(sx, sy, sz, color, x, y, z) {
    const mesh = createBlock(sx, sy, sz, color);
    mesh.position.set(x, y, z);

    // Random slight rotation velocity
    mesh.userData.vx = (Math.random() - 0.5) * 0.05;
    mesh.userData.vz = (Math.random() - 0.5) * 0.05;
    mesh.userData.vy = -0.12;    // initial fall speed
    mesh.userData.gravity = -0.012;
    mesh.userData.isFalling = true;

    return mesh;
}

export const BLOCK_HEIGHT = 0.4;
export const INITIAL_BLOCK_SIZE = 4.0;
