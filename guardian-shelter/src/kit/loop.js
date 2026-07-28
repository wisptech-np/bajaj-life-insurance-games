// loop.js — visibility-aware fixed-timestep game loop with an owned session clock.
//
// Why this exists
// ---------------
// Every game in this repo ran gameplay on requestAnimationFrame but counted the
// session down with setInterval(1000). Those two clocks disagree: when a phone
// locks or the player switches apps, rAF halts while the interval keeps firing.
// The player returns to a frozen game that has silently burned 20 seconds, and
// can lose without ever seeing it happen.
//
// The loop below owns both clocks, so gameplay time and session time are the
// same time. Backgrounding pauses everything; returning resumes cleanly without
// a catch-up spike.

import { BALANCE } from './config.js';

/**
 * @param {object} opts
 * @param {(dt:number)=>void}    opts.update       Fixed-step physics tick. dt is always fixedStep.
 * @param {(alpha:number)=>void} opts.render       Draw. alpha = 0..1 interpolation into the next step.
 * @param {number}  [opts.sessionSeconds]          Session length. Omit for an untimed loop.
 * @param {(remaining:number)=>void} [opts.onTick] Called when the whole-second countdown changes.
 * @param {()=>void} [opts.onExpire]               Called once when the session clock hits zero.
 * @param {(paused:boolean)=>void} [opts.onPause]  Called when auto-pause engages or releases.
 * @param {(tier:string)=>void} [opts.onSlow]      Called if sustained frame times suggest a downgrade.
 */
export function createGameLoop({
  update,
  render,
  sessionSeconds = null,
  onTick = null,
  onExpire = null,
  onPause = null,
  onSlow = null,
}) {
  const step = BALANCE.loop.fixedStep;
  const maxCatchUp = BALANCE.loop.maxCatchUpSeconds;

  let rafId = null;
  let lastTime = 0;
  let accumulator = 0;
  let running = false;
  let manuallyPaused = false;
  let hidden = false;

  let remaining = sessionSeconds;
  let lastWholeSecond = sessionSeconds === null ? null : Math.ceil(sessionSeconds);
  let expired = false;

  // Rolling frame-time sample for the one-way performance downgrade.
  let slowFrames = 0;
  let sampled = 0;
  let downgraded = false;

  const isPaused = () => manuallyPaused || hidden;

  const frame = (timestamp) => {
    if (!running) return;
    rafId = requestAnimationFrame(frame);

    if (isPaused()) {
      // Keep the timestamp fresh so the first frame after resume has a normal
      // delta instead of a multi-second jump.
      lastTime = timestamp;
      return;
    }

    let elapsed = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    // Guard against negative/absurd deltas from clock changes or long stalls.
    if (!Number.isFinite(elapsed) || elapsed < 0) elapsed = 0;
    if (elapsed > maxCatchUp) elapsed = maxCatchUp;

    // Sustained long frames mean this device cannot afford the current budget.
    if (onSlow && !downgraded) {
      sampled += 1;
      if (elapsed > 0.032) slowFrames += 1;
      if (sampled >= 120) {
        if (slowFrames / sampled > 0.5) {
          downgraded = true;
          onSlow();
        }
        sampled = 0;
        slowFrames = 0;
      }
    }

    // Session clock advances with real gameplay time only.
    if (remaining !== null && !expired) {
      remaining = Math.max(0, remaining - elapsed);
      const whole = Math.ceil(remaining);
      if (whole !== lastWholeSecond) {
        lastWholeSecond = whole;
        onTick?.(whole);
      }
      if (remaining <= 0) {
        expired = true;
        onExpire?.();
      }
    }

    accumulator += elapsed;
    let steps = 0;
    const maxSteps = Math.ceil(maxCatchUp / step);
    while (accumulator >= step && steps < maxSteps) {
      update(step);
      accumulator -= step;
      steps += 1;
    }
    // Drop any unpayable debt rather than spiralling.
    if (steps >= maxSteps) accumulator = 0;

    render(accumulator / step);
  };

  const handleVisibility = () => {
    const nowHidden = document.visibilityState === 'hidden';
    if (nowHidden === hidden) return;
    hidden = nowHidden;
    if (!hidden) accumulator = 0; // discard debt accrued while away
    onPause?.(isPaused());
  };

  // blur/pagehide catch cases visibilitychange misses (iOS app switcher, some
  // Android launchers) where the page stays "visible" but stops compositing.
  const handleBlur = () => {
    if (hidden) return;
    hidden = true;
    onPause?.(true);
  };
  const handleFocus = () => {
    if (document.visibilityState === 'hidden') return;
    if (!hidden) return;
    hidden = false;
    accumulator = 0;
    onPause?.(isPaused());
  };

  return {
    start() {
      if (running) return;
      running = true;
      lastTime = performance.now();
      accumulator = 0;
      document.addEventListener('visibilitychange', handleVisibility);
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('pagehide', handleBlur);
      rafId = requestAnimationFrame(frame);
    },

    stop() {
      running = false;
      if (rafId !== null) cancelAnimationFrame(rafId);
      rafId = null;
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('pagehide', handleBlur);
    },

    /** Player-facing pause (pause button, modal open). */
    setPaused(value) {
      if (manuallyPaused === value) return;
      manuallyPaused = value;
      if (!manuallyPaused) accumulator = 0;
      onPause?.(isPaused());
    },

    isPaused,
    getRemaining: () => remaining,

    /** Add or remove session time (bonus pickups, penalties). */
    adjustRemaining(delta) {
      if (remaining === null) return;
      remaining = Math.max(0, remaining + delta);
    },

    /** Reset for a replay without tearing down listeners. */
    reset(newSessionSeconds = sessionSeconds) {
      remaining = newSessionSeconds;
      lastWholeSecond = newSessionSeconds === null ? null : Math.ceil(newSessionSeconds);
      expired = false;
      accumulator = 0;
      lastTime = performance.now();
    },
  };
}
