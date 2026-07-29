// device.js — performance tier, motion preference, and haptics.
//
// Lets a game scale its effect budget to the phone it is actually running on
// instead of assuming a flagship. All reads are cheap and cached.

import { BALANCE, scaleEffects } from './config.js';

let _tier = null;
let _reducedMotionQuery = null;

/**
 * Classify the device into high / mid / low.
 *
 * Uses static hints first (core count, device memory, DPR). These are
 * imperfect but available before the first frame, so the game can pick a
 * starting budget instead of dropping frames while it measures.
 */
export function detectTier() {
  if (_tier) return _tier;
  if (typeof navigator === 'undefined') return (_tier = 'high');

  const cores = navigator.hardwareConcurrency || 4;
  // deviceMemory is Chromium-only; absence is not evidence of a weak device.
  const memory = navigator.deviceMemory || null;
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

  let score = 0;
  if (cores >= 8) score += 2;
  else if (cores >= 4) score += 1;

  if (memory !== null) {
    if (memory >= 8) score += 2;
    else if (memory >= 4) score += 1;
  } else {
    score += 1; // unknown: assume mid rather than punishing Safari/Firefox
  }

  // A high DPR on few cores means lots of pixels with little budget to fill them.
  if (dpr >= 3 && cores <= 4) score -= 1;

  _tier = score >= 4 ? 'high' : score >= 2 ? 'mid' : 'low';
  return _tier;
}

/**
 * Downgrade the tier after sustained poor frame times. Call from the loop's
 * performance callback. One-way: we never upgrade mid-session, because
 * oscillating between effect budgets is more distracting than a lower one.
 */
export function downgradeTier() {
  const current = detectTier();
  _tier = current === 'high' ? 'mid' : 'low';
  return _tier;
}

/** True when the user has asked the OS to reduce motion. Live, not cached. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  if (!_reducedMotionQuery) {
    _reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  return _reducedMotionQuery.matches;
}

/** Subscribe to reduced-motion changes. Returns an unsubscribe function. */
export function onReducedMotionChange(handler) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  if (!_reducedMotionQuery) {
    _reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  }
  const listener = (e) => handler(e.matches);
  _reducedMotionQuery.addEventListener('change', listener);
  return () => _reducedMotionQuery.removeEventListener('change', listener);
}

/** Current effect budget for this device + motion preference. */
export function effectBudget() {
  return scaleEffects(detectTier(), prefersReducedMotion());
}

/**
 * Fire a haptic pulse. Silently no-ops where the Vibration API is missing
 * (all of iOS Safari) and whenever reduced motion is requested.
 */
export function haptic(kind = 'light') {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return false;
  if (prefersReducedMotion()) return false;
  const pattern = BALANCE.haptics[kind];
  if (pattern === undefined) return false;
  try {
    navigator.vibrate(pattern);
    return true;
  } catch {
    return false;
  }
}

/**
 * Size a canvas for crisp rendering, capping DPR so a 3x phone does not pay
 * to fill 9x the pixels. Returns the scale factor applied to the context.
 */
export function fitCanvas(canvas, cssWidth, cssHeight, maxDpr = 2) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return dpr;
}
