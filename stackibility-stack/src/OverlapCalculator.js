// OverlapCalculator.js – pure math, no Three.js dependencies

/**
 * Calculate overlap between the active block and the previous block on a given axis.
 *
 * @param {object} active  - { position, size } where position/size are on the relevant axis
 * @param {object} previous - { position, size }
 * @param {string} axis    - 'x' | 'z'
 * @returns {{ overlap, delta, overlapPos, cutPos, cutSize } | null}
 *   Returns null if no overlap (miss).
 */
export function calculateOverlap(active, previous, axis) {
    const activeMin = active.position - active.size / 2;
    const activeMax = active.position + active.size / 2;
    const prevMin = previous.position - previous.size / 2;
    const prevMax = previous.position + previous.size / 2;

    const overlapMin = Math.max(activeMin, prevMin);
    const overlapMax = Math.min(activeMax, prevMax);
    const overlap = overlapMax - overlapMin;

    if (overlap <= 0) return null; // miss

    const overlapPos = overlapMin + overlap / 2;
    const delta = active.position - previous.position;

    // The "cut" piece info (the part that falls off)
    const cutSize = active.size - overlap;
    let cutPos;
    if (delta > 0) {
        cutPos = activeMax - cutSize / 2;
    } else {
        cutPos = activeMin + cutSize / 2;
    }

    return { overlap, delta, overlapPos, cutPos, cutSize };
}

/**
 * Snap tolerance in world units. If |delta| < this, treat as perfect.
 */
export const PERFECT_TOLERANCE = 0.15;
