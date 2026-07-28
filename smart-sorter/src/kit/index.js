// game-kit — shared game-feel systems for every Bajaj Life Insurance game.
//
// Canonical source lives in shared/game-kit/. Each game gets its own copy at
// <game>/src/kit/ so the isolated Vite builds keep working without a workspace.
// Edit the canonical copy, then run:  node scripts/sync-game-kit.mjs

export { BALANCE, TIER_SCALE, scaleEffects, withOverrides } from './config.js';
export { detectTier, downgradeTier, prefersReducedMotion, onReducedMotionChange, effectBudget, haptic, fitCanvas } from './device.js';
export { createGameLoop } from './loop.js';
export { createInput } from './input.js';
export { createEffects, Easing, damp } from './effects.js';
export { createAudio } from './audio.js';
