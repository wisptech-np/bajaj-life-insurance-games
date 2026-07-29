// common.js — the microgame contract, the shared input model, and the vector
// art primitives every microgame draws with.
//
// PURE MODULE for everything the rules touch. `render` helpers take a 2D
// context, but nothing here reaches for `document`, `window` or React at import
// time, so scripts/balance.mjs can import any microgame and drive its shipped
// init / update / result without a DOM.
//
// ─── The contract ───────────────────────────────────────────────────────────
// Every module in this folder default-exports a descriptor:
//
//   {
//     id, command, verb, band, hint, sting,
//     init(seed, tier)          -> state
//     update(state, dt, input)  -> void
//     render(ctx, state, alpha) -> void
//     result(state)             -> { done, cleared, at, reason }
//   }
//
// The state is passed explicitly rather than hidden inside the module. The brief
// wrote the contract as init/update/render/result and that is exactly what these
// are; making the state a parameter instead of module-level mutable data is the
// one deviation, and it is deliberate — a module-level singleton could not be
// driven by a sim that runs thousands of instances, and two mounted copies of
// the game would corrupt each other. (Recorded in okf-brain/life-rush/log.md.)
//
// ─── Coordinates ────────────────────────────────────────────────────────────
// Microgames lay out props in a fixed logical box, STAGE_W x STAGE_H. The
// component maps that box onto the canvas (letterboxed, aspect preserved) and
// converts pointer positions back into it, so a microgame's geometry — and
// therefore its difficulty — is identical on every handset and in the sim.

import { mulberry32 } from '../rng.js';

export const STAGE_W = 100;
export const STAGE_H = 130;

/**
 * Each microgame draws its own layout from its own seed, handed down by the
 * scheduler from the run seed. Same PRNG as everything else, so one 32-bit run
 * seed still reproduces every prop position in every microgame.
 */
export const seedRand = mulberry32;

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/* ─── Input ───────────────────────────────────────────────
   One struct, mutated in place, shared by the component and the sim. LEVEL
   fields (down, x, y, holdT) describe the finger right now; EDGE fields
   (downEdge, upEdge, tap, swipe) describe something that happened in this tick
   and are cleared by the orchestrator afterwards.

   The component and the sim both go through the helpers below, so "what counts
   as a tap" is defined once. The component feeds them from the kit's pointer
   recogniser; the sim feeds them from a bot policy. Neither re-implements the
   other's idea of a gesture. */

export function createInput() {
  return {
    down: false,
    x: 0,
    y: 0,
    holdT: 0,
    downEdge: false,
    downX: 0,
    downY: 0,
    upEdge: false,
    upX: 0,
    upY: 0,
    tap: false,
    tapX: 0,
    tapY: 0,
    swipe: false,
    swX0: 0,
    swY0: 0,
    swX1: 0,
    swY1: 0,
  };
}

export function inputPress(input, x, y) {
  input.down = true;
  input.x = x;
  input.y = y;
  input.holdT = 0;
  input.downEdge = true;
  input.downX = x;
  input.downY = y;
}

export function inputMove(input, x, y) {
  input.x = x;
  input.y = y;
}

export function inputRelease(input, x, y) {
  input.down = false;
  input.x = x;
  input.y = y;
  input.upEdge = true;
  input.upX = x;
  input.upY = y;
  input.holdT = 0;
}

export function inputTap(input, x, y) {
  input.tap = true;
  input.tapX = x;
  input.tapY = y;
}

export function inputSwipe(input, x0, y0, x1, y1) {
  input.swipe = true;
  input.swX0 = x0;
  input.swY0 = y0;
  input.swX1 = x1;
  input.swY1 = y1;
}

/** Called by the orchestrator after every update step. */
export function clearEdges(input) {
  input.downEdge = false;
  input.upEdge = false;
  input.tap = false;
  input.swipe = false;
}

export function resetInput(input) {
  input.down = false;
  input.holdT = 0;
  clearEdges(input);
}

/** Any deliberate touch this tick — the thing the cue rule polices. */
export function touched(input) {
  return input.downEdge || input.tap || input.swipe;
}

/* ─── Geometry ────────────────────────────────────────── */

export function inRect(x, y, r) {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

export function inCircle(x, y, cx, cy, r) {
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

/** Distance from point (px,py) to segment (x0,y0)-(x1,y1). */
export function segDist(px, py, x0, y0, x1, y1) {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const len2 = vx * vx + vy * vy;
  let t = len2 > 0 ? ((px - x0) * vx + (py - y0) * vy) / len2 : 0;
  t = clamp(t, 0, 1);
  const dx = px - (x0 + vx * t);
  const dy = py - (y0 + vy * t);
  return Math.hypot(dx, dy);
}

/** Shortest signed difference between two angles, in (-PI, PI]. */
export function angleDelta(a, b) {
  let d = (a - b) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/* ─── Base state ──────────────────────────────────────── */

/** `[b0, shrink]` pairs shrink linearly with the slot's position on the ramp. */
export const ramp = (pair, speed) => pair[0] * (1 - pair[1] * speed);

const FX_SLOTS = 8;

/**
 * Common state every microgame starts from.
 *
 * `cueAt` is when the microgame becomes answerable and `deadline` is the last
 * instant an answer counts. Touching before the cue fails outright — see the
 * long note on the cue rule in data.js.
 */
export function makeBase(id, tier, rand) {
  const mc = tier.cfg;
  const cueAt = (mc.cue[0] + (mc.cue[1] - mc.cue[0]) * rand()) * tier.duration;
  const budget = ramp(mc.budget, tier.speed);
  return {
    id,
    band: tier.band,
    slot: tier.slot,
    speed: tier.speed,
    duration: tier.duration,
    mc,

    t: 0,
    cueAt,
    budget,
    deadline: Math.min(tier.duration, cueAt + budget),

    /**
     * The instant the COUNTDOWN BAR empties, which is the next thing that can
     * end this microgame. Defaults to `deadline`; GROW! and TOP-UP! move it as
     * play proceeds (to the overflow, and to the end of the double-tap gap)
     * because for those two the deadline stops being the real pressure the
     * moment you engage. Presentation only — no rule reads it.
     *
     * Drawing `1 - t/duration` instead, as the first build did, is a lie: the
     * real deadline is 41-65% of the window on every microgame at every slot,
     * so players timed out with the bar still a third full.
     */
    barAt: Math.min(tier.duration, cueAt + budget),

    /** 'wait' before the cue, 'live' after it, 'done' once resolved. */
    phase: 'wait',
    done: false,
    cleared: false,
    at: 0,
    reason: '',
    /**
     * How WELL it was answered, 0..1, and therefore what the speed bonus and
     * the PERFECT bonus pay on. Two modes, chosen per microgame:
     *
     *   null  — PROMPTNESS. Filled in by baseResult() from how much of the
     *           answerable window (cue -> deadline) was left on the table.
     *           Right for the reaction games.
     *   0..1  — ACCURACY, supplied by the microgame at succeed(). Right for the
     *           games judged at a fixed instant, where "faster" is meaningless:
     *           WAKE! resolves on the 9 whenever you tap, so what it should pay
     *           for is landing ON it. Without this, PERFECT was structurally
     *           unreachable on SHIELD!, WAKE! and GROW! and near-unreachable on
     *           LOCK! — the gold bonus was partly a shuffle lottery.
     */
    quality: null,

    /**
     * Irreducible cost of the ANSWER itself, in seconds, discounted before
     * promptness is measured. A tap is instant; a drag across the box is not,
     * and charging a player for the time their thumb spends travelling made
     * PERFECT unreachable on GIFT! (best 0.66), SIGN! (0.67) and SPLIT! (0.69).
     * Microgames with a gesture set it from their own geometry and the
     * reference gesture speeds in data.js.
     */
    scoreFloor: 0,

    /**
     * Which instant promptness is measured at (null = when the microgame
     * resolved) and which instant the promptness window closes at (null = the
     * deadline). TOP-UP! sets both: what it should pay for is answering the
     * card promptly, not how quickly the second tap followed the first, which
     * is a separate rule with its own gap clock.
     */
    scoreAt: null,
    scoreTo: null,

    /** Presentation-only clocks the renderer reads. Never gates a rule. */
    intro: 0,
    cueFlash: 0,
    shakeT: 0,

    /** Pre-allocated burst slots. The orchestrator drains them each tick and
        maps them into canvas space; nothing here allocates during play. */
    fxN: 0,
    fxX: new Float32Array(FX_SLOTS),
    fxY: new Float32Array(FX_SLOTS),
    fxK: new Int8Array(FX_SLOTS),
  };
}

/** kinds: 0 clear · 1 fail · 2 small interaction puff · 3 threat landing. */
export function emit(st, x, y, kind) {
  if (st.fxN >= FX_SLOTS) return;
  st.fxX[st.fxN] = x;
  st.fxY[st.fxN] = y;
  st.fxK[st.fxN] = kind;
  st.fxN += 1;
}

export function drainFx(st) {
  st.fxN = 0;
}

/**
 * Clear the microgame. `quality` is optional: pass 0..1 to score it on ACCURACY
 * (how centred the answer was) instead of promptness — see `quality` in
 * makeBase. Omit it and baseResult() scores promptness.
 */
export function succeed(st, x, y, quality) {
  if (st.done) return;
  st.done = true;
  st.cleared = true;
  st.at = st.t;
  st.reason = 'clear';
  st.phase = 'done';
  if (quality !== undefined) st.quality = clamp(quality, 0, 1);
  emit(st, x, y, 0);
}

export function failWith(st, reason, x, y) {
  if (st.done) return;
  st.done = true;
  st.cleared = false;
  st.at = st.t;
  st.reason = reason;
  st.phase = 'done';
  st.shakeT = 0.3;
  emit(st, x, y, 1);
}

/**
 * Advance the shared clock and enforce the two rules every microgame shares:
 * do not act before the cue, and do not run out of time.
 *
 * Returns true while the microgame is still running, false once it has
 * resolved. A microgame's own update() returns early on false.
 */
export function baseTick(st, dt, input) {
  if (st.done) return false;

  st.t += dt;
  st.intro = clamp(st.t / 0.22, 0, 1);
  if (st.cueFlash > 0) st.cueFlash = Math.max(0, st.cueFlash - dt);
  if (st.shakeT > 0) st.shakeT = Math.max(0, st.shakeT - dt);
  if (input.down) input.holdT += dt;

  if (st.phase === 'wait') {
    if (st.t >= st.cueAt) {
      st.phase = 'live';
      st.cueFlash = 0.34;
    } else if (touched(input)) {
      // Jumped the gun. Thematically the whole point: acting before you know
      // what is being asked is how people buy the wrong thing.
      failWith(st, 'early', input.downEdge ? input.downX : input.tap ? input.tapX : input.swX0,
        input.downEdge ? input.downY : input.tap ? input.tapY : input.swY0);
      return false;
    }
  }

  if (st.phase === 'live' && st.t > st.deadline) {
    failWith(st, 'late', STAGE_W / 2, STAGE_H / 2);
    return false;
  }

  return !st.done;
}

/**
 * The uniform result() every descriptor re-exports.
 *
 * `remaining` is what the speed bonus and the PERFECT bonus are paid on. It is
 * measured against the ANSWERABLE window (cue -> deadline), not against the
 * whole action window: the cue lands 8-32% of the way in, so scoring against
 * the whole window quietly handed everyone a slice of bonus for time they were
 * never allowed to act in — and made the ceiling a number no run could reach.
 */
export function baseResult(st) {
  let remaining = st.quality;
  if (remaining === null) {
    const from = st.cueAt + st.scoreFloor;
    const to = st.scoreTo === null ? st.deadline : st.scoreTo;
    const at = st.scoreAt === null ? st.at : st.scoreAt;
    const span = Math.max(1e-4, to - from);
    remaining = clamp(1 - (at - from) / span, 0, 1);
  }
  return { done: st.done, cleared: st.cleared, at: st.at, reason: st.reason, remaining };
}

/** Fraction of the answerable window still unspent. */
export const remainingFrac = (st) => clamp(1 - (st.t - st.cueAt) / Math.max(1e-4, st.deadline - st.cueAt), 0, 1);

/**
 * The countdown bar, 1 -> 0. SHARED between the renderer and the balance gate's
 * HUD-honesty assertion, so the bar cannot drift away from the rule it claims
 * to be showing. Returns 1 while the microgame is still locked (the bar draws
 * an "arming" state there rather than pretending to drain).
 */
export function countdownFrac(st) {
  if (st.phase === 'wait') return 1;
  const span = Math.max(1e-4, st.barAt - st.cueAt);
  return clamp(1 - (st.t - st.cueAt) / span, 0, 1);
}

/* ─── Cached gradients ────────────────────────────────────
   Gradient objects are expensive and they were being rebuilt on every frame, in
   all fourteen renderers — roughly 2.5 CanvasGradient allocations per frame in
   the steady state, which is exactly the quiet drip that makes a mid-range
   Android collect garbage mid-play.

   They are cached on the microgame's own state, keyed by a string LITERAL at
   the call site (literals are interned, so the key costs nothing). This is safe
   across a resize: gradient coordinates are interpreted in the user space of
   the transform in force when the gradient is PAINTED, and microgames always
   paint inside the same fixed 100 x 130 logical box. The cache dies with the
   microgame instance, so nothing leaks between rounds.

   Up to four stops, passed positionally — an array or a rest parameter would
   put the allocation straight back. */

function gradSlot(st, key) {
  const c = st.grads || (st.grads = {});
  return c[key];
}

function gradStore(st, key, g) {
  st.grads[key] = g;
  return g;
}

export function linGrad(ctx, st, key, x0, y0, x1, y1, o0, c0, o1, c1, o2, c2, o3, c3) {
  const hit = gradSlot(st, key);
  if (hit !== undefined) return hit;
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(o0, c0);
  g.addColorStop(o1, c1);
  if (c2 !== undefined) g.addColorStop(o2, c2);
  if (c3 !== undefined) g.addColorStop(o3, c3);
  return gradStore(st, key, g);
}

export function radGrad(ctx, st, key, x0, y0, r0, x1, y1, r1, o0, c0, o1, c1, o2, c2) {
  const hit = gradSlot(st, key);
  if (hit !== undefined) return hit;
  const g = ctx.createRadialGradient(x0, y0, r0, x1, y1, r1);
  g.addColorStop(o0, c0);
  g.addColorStop(o1, c1);
  if (c2 !== undefined) g.addColorStop(o2, c2);
  return gradStore(st, key, g);
}

/* ─── Vector art primitives ───────────────────────────────
   Shared so fourteen scenes look like one game: the same corner radius family,
   the same top-light gloss, the same paper. Everything is programmatic — there
   is not an image or an emoji anywhere in this folder. */

export function rr(ctx, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + k, y);
  ctx.lineTo(x + w - k, y);
  ctx.arcTo(x + w, y, x + w, y + k, k);
  ctx.lineTo(x + w, y + h - k);
  ctx.arcTo(x + w, y + h, x + w - k, y + h, k);
  ctx.lineTo(x + k, y + h);
  ctx.arcTo(x, y + h, x, y + h - k, k);
  ctx.lineTo(x, y + k);
  ctx.arcTo(x, y, x + k, y, k);
  ctx.closePath();
}

/** A raised card: drop shadow, vertical gradient body, top-edge highlight.
    `key` names the gradient in the state's cache — use a distinct literal per
    colour variant (e.g. 'card', 'card:won', 'card:wrong'). */
export function card(ctx, st, key, x, y, w, h, r, top, bottom, stroke) {
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.42)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 2.4;
  ctx.fillStyle = linGrad(ctx, st, key, 0, y, 0, y + h, 0, top, 1, bottom);
  rr(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 0.9;
    rr(ctx, x, y, w, h, r);
    ctx.stroke();
  }

  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(x + r, y + 0.7);
  ctx.lineTo(x + w - r, y + 0.7);
  ctx.stroke();
  ctx.restore();
}

/** A pill button with a gloss sweep — the thing the command word wants tapped. */
export function button(ctx, st, key, x, y, w, h, top, bottom, glow, press) {
  const p = press || 0;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.scale(1 - p * 0.05, 1 - p * 0.08);
  ctx.translate(-(x + w / 2), -(y + h / 2));
  if (glow) {
    ctx.shadowColor = glow;
    ctx.shadowBlur = 7;
  }
  ctx.fillStyle = linGrad(ctx, st, key, 0, y, 0, y + h, 0, top, 1, bottom);
  rr(ctx, x, y, w, h, h * 0.34);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.globalAlpha = 0.3;
  ctx.fillStyle = '#fff';
  rr(ctx, x + 1.4, y + 1.2, w - 2.8, h * 0.40, h * 0.22);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* Font strings are built once per (weight, size) pair and reused. Assembling a
   template string on every fillText is the classic quiet allocation in a canvas
   game: fourteen scenes x half a dozen labels x 60 fps is a steady drip of
   garbage for no reason. Call sites use fixed sizes, so this cache is warm
   after the first frame. */
const FONT_CACHE = new Map();
export function fontOf(size, weight) {
  const key = (weight || 900) * 10000 + Math.round(size * 100);
  let f = FONT_CACHE.get(key);
  if (f === undefined) {
    f = `${weight || 900} ${size}px 'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif`;
    FONT_CACHE.set(key, f);
  }
  return f;
}

/** Centred label. `size` is in logical units. */
export function text(ctx, str, x, y, size, color, weight) {
  ctx.font = fontOf(size, weight);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

/** Ruled paper lines — the filler text on every document prop. */
export function ruled(ctx, x, y, w, rows, gap, color, lastShort) {
  ctx.fillStyle = color;
  for (let i = 0; i < rows; i++) {
    const ww = lastShort && i === rows - 1 ? w * 0.52 : w;
    rr(ctx, x, y + i * gap, ww, 1.5, 0.7);
    ctx.fill();
  }
}

/** Soft ground shadow under a prop. */
export function shadowEllipse(ctx, x, y, rx, ry, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The pulse ring that marks the cue landing. Presentation only. */
export function cueRing(ctx, x, y, r0, k, color) {
  if (k <= 0) return;
  ctx.save();
  ctx.globalAlpha = k * 0.75;
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.6 * k + 0.4;
  ctx.beginPath();
  ctx.arc(x, y, r0 + (1 - k) * 18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

/** Screen-shake offset for a microgame that has just been failed. */
export function shakeOffset(st, i) {
  if (st.shakeT <= 0) return 0;
  const k = st.shakeT / 0.3;
  return Math.sin(st.t * (i ? 71 : 83)) * 2.2 * k;
}
