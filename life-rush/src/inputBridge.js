// inputBridge.js — between the kit's pointer recogniser and a microgame's input.
//
// PURE MODULE. No DOM, no React: it is handed callbacks by whoever owns the
// element, so the balance gate can drive the SHIPPED recogniser against a fake
// element and prove the rule below rather than trusting it.
//
// ─── Why this exists: the stale-gesture bug ─────────────────────────────────
//
// `src/kit/input.js` keeps one `active` pointer for the lifetime of a gesture
// and resolves it in `finish()`: pointer-up fires onUp, and then EITHER onSwipe
// (when the travel is >= BALANCE.input.swipeMinPx) or onTap. `finish()` knows
// nothing about microgames, phases or windows — nor should it; it is shared,
// byte-identical kit code.
//
// The orchestrator, meanwhile, changes what a touch MEANS several times a
// second: banner (input ignored), action window (input judged, and touching
// before the cue fails the microgame outright). Flushing the event queue at
// those boundaries is not enough, because the recogniser's `active` pointer
// survives the flush. A finger that went down during the command banner and
// drifted 40 px — an ordinary thumb roll on a 320 px handset — synthesises an
// onSwipe when it lifts, with no duration bound and no phase check. If it lifts
// inside the live window and ahead of the cue, `touched()` sees a swipe and the
// microgame fails "early". A life, lost to a finger the player had already put
// down before the microgame existed.
//
// The fix is an EPOCH. Every time the meaning of a touch changes, the epoch is
// bumped. A press is stamped with the epoch that was current when it landed,
// and everything that press later produces — move, up, tap, swipe — is dropped
// unless its stamp still matches. A gesture is only ever delivered to the
// microgame that was on screen when the finger went down.
//
// Note the asymmetry the first build's log got wrong: the DOWN is safe (it is
// queued and the queue is flushed), the LIFT is not.

import {
  clearEdges, createInput, inputMove, inputPress, inputRelease, inputSwipe,
  inputTap, resetInput,
} from './microgames/common.js';

const KIND_DOWN = 1;
const KIND_MOVE = 2;
const KIND_UP = 3;
const KIND_TAP = 4;
const KIND_SWIPE = 5;

const QUEUE_SLOTS = 24;

/**
 * @param {object} [opts]
 * @param {() => boolean} [opts.isDead]   Return true to ignore input entirely.
 * @param {() => void}    [opts.onFirstTouch] Fired on every down (audio unlock).
 */
export function createInputBridge(opts = {}) {
  const isDead = opts.isDead || (() => false);
  const onFirstTouch = opts.onFirstTouch || (() => {});

  const items = [];
  for (let i = 0; i < QUEUE_SLOTS; i++) {
    items.push({ kind: 0, x: 0, y: 0, x1: 0, y1: 0 });
  }
  let head = 0;
  let n = 0;

  let epoch = 0;
  let downEpoch = -1;
  let downX = 0;
  let downY = 0;

  /** Events dropped because their press belonged to an earlier epoch. */
  let staleDropped = 0;

  const input = createInput();

  const push = (kind, x, y, x1, y1) => {
    if (n >= items.length) return;
    const e = items[(head + n) % items.length];
    e.kind = kind;
    e.x = x;
    e.y = y;
    e.x1 = x1 || 0;
    e.y1 = y1 || 0;
    n += 1;
  };

  const pop = () => {
    head = (head + 1) % items.length;
    n -= 1;
  };

  /** True when this event belongs to the gesture the current epoch owns. */
  const fresh = () => downEpoch === epoch;

  const handlers = {
    onDown: (p) => {
      onFirstTouch();
      if (isDead()) return;
      // A new press always belongs to the epoch it lands in.
      downEpoch = epoch;
      downX = p.x;
      downY = p.y;
      push(KIND_DOWN, p.x, p.y);
    },
    onMove: (p) => {
      if (isDead()) return;
      if (!fresh()) { staleDropped += 1; return; }
      push(KIND_MOVE, p.x, p.y);
    },
    onUp: (p) => {
      if (isDead()) return;
      if (!fresh()) { staleDropped += 1; return; }
      push(KIND_UP, p.x, p.y);
    },
    onTap: (p) => {
      if (isDead()) return;
      if (!fresh()) { staleDropped += 1; return; }
      push(KIND_TAP, p.x, p.y);
    },
    // The kit reports a swipe by direction and end point; the start is the down
    // point recorded above, which is what the microgames need.
    onSwipe: (dir, p) => {
      if (isDead()) return;
      if (!fresh()) { staleDropped += 1; return; }
      push(KIND_SWIPE, downX, downY, p.x, p.y);
    },
  };

  return {
    handlers,
    input,

    /**
     * The meaning of a touch has changed — a new microgame, or the action
     * window opening. Everything in flight is now stale.
     */
    bumpEpoch() {
      epoch += 1;
      head = 0;
      n = 0;
      resetInput(input);
    },

    /**
     * Deliver at most ONE edge event into `input`, plus any level-only moves
     * ahead of it. One edge per physics step means a tap can never be swallowed
     * by a step that also carried a release.
     */
    drain() {
      while (n > 0) {
        const e = items[head];
        if (e.kind === KIND_MOVE) {
          inputMove(input, e.x, e.y);
          pop();
          continue;
        }
        if (e.kind === KIND_DOWN) inputPress(input, e.x, e.y);
        else if (e.kind === KIND_UP) inputRelease(input, e.x, e.y);
        else if (e.kind === KIND_TAP) inputTap(input, e.x, e.y);
        else if (e.kind === KIND_SWIPE) inputSwipe(input, e.x, e.y, e.x1, e.y1);
        pop();
        return;
      }
    },

    /** Called after each update step. */
    settle() {
      clearEdges(input);
    },

    /* Introspection, for the balance gate's stale-finger probe. */
    get epoch() { return epoch; },
    get pending() { return n; },
    get staleDropped() { return staleDropped; },
  };
}
