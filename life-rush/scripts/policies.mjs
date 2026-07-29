// policies.mjs — one bot policy per microgame, for scripts/balance.mjs.
//
// WHAT A POLICY IS ALLOWED TO DO
// ------------------------------
// A policy may look at what is ON SCREEN and it may move a finger. It may not
// decide whether it succeeded — that is the shipped microgame's update(), every
// time, without exception. So a policy:
//
//   * senses through `sense(st, out)`, which copies a handful of drawn facts
//     (a position, an angle, a rate) into a pre-allocated record. The harness
//     hands the policy the record from `latency` seconds ago, so the bot is
//     literally looking at an old frame — that is where reaction cost comes
//     from, not from a fudge factor;
//   * schedules a GESTURE (press / move / release). The harness plays the
//     gesture back through the same input helpers the component uses, and
//     classifies the result with the kit's own thresholds. A swipe therefore
//     costs the time a swipe takes, and a drag costs the time a drag takes,
//     because the bot actually performs them;
//   * never touches st.done / st.cleared / st.reason / st.deadline, and never
//     reads a field that is not drawn on the screen.
//
// THE SKILL MODEL
// ---------------
// One parameter, `latencyMs`, drives everything, exactly as the brief asks:
//
//   reaction  = latency x (1 + 0.30 x N(0,1)), floored at 0.35 x latency
//               — how long after the cue the finger starts moving.
//   timing    = N(0, 0.30 x latency) added to any instant the bot aims for
//               — an anticipated tap is not a reacted tap; a human predicts the
//               crossing and is wrong by an amount that scales with how rushed
//               they are.
//   aim       = N(0, aimBase + aimPerMs x latency) logical units on any point
//               the bot touches — a hurried thumb is a sloppy thumb.
//   dragSpeed = 260 - 0.25 x latency units/sec — a hurried drag is not faster.
//   readCost  = 0.35 x latency extra before a CHOICE (PICK!, SPLIT!) — two of
//               the fourteen ask you to read something before you move.
//
// Everything else — every window, every tolerance, every deadline — lives in
// src/data.js and is enforced by the shipped modules.

import { STAGE_H, STAGE_W } from '../src/microgames/common.js';

const SWEEP = Math.PI * 1.5; // WAKE!'s hand travels 12 -> 9, three quarters.

/* ─── Bot profiles ───────────────────────────────────────── */
export function makeBot(name, latencyMs, band, note, opts) {
  const o = opts || {};
  return {
    name,
    latencyMs,
    band,
    note,
    latency: latencyMs / 1000,
    reactionJitter: o.reactionJitter ?? 0.30,
    timingSigma: (o.timingScale ?? 0.30) * (latencyMs / 1000),
    aimSigma: (o.aimBase ?? 1.4) + (o.aimPerMs ?? 0.0135) * latencyMs,
    dragSpeed: Math.max(70, (o.dragBase ?? 260) - 0.25 * latencyMs),
    swipeSpeed: Math.max(90, (o.swipeBase ?? 330) - 0.30 * latencyMs),
    readCost: (o.readScale ?? 0.35) * (latencyMs / 1000),
    /** Adversarial overrides used by the degenerate profiles. */
    idle: !!o.idle,
    spamHz: o.spamHz || 0,
  };
}

/* ─── Sense records ──────────────────────────────────────── */
export function makeSnap() {
  return { live: 0, x: 0, y: 0, ang: 0, k: 0, r: 0, aux: 0, aux2: 0 };
}

export function copySnap(a, b) {
  b.live = a.live; b.x = a.x; b.y = a.y; b.ang = a.ang;
  b.k = a.k; b.r = a.r; b.aux = a.aux; b.aux2 = a.aux2;
}

const isLive = (st) => (st.phase === 'live' ? 1 : 0);

/* ─── Shared helpers used by the policies ────────────────── */

/** Reaction delay for this bot, drawn once per decision. */
function reactionOf(ctx) {
  const b = ctx.bot;
  const r = b.latency * (1 + b.reactionJitter * ctx.gauss());
  return Math.max(b.latency * 0.35, r);
}

const jitterT = (ctx) => ctx.gauss() * ctx.bot.timingSigma;
const aimX = (ctx, x) => x + ctx.gauss() * ctx.bot.aimSigma;
const aimY = (ctx, y) => y + ctx.gauss() * ctx.bot.aimSigma;

/** Rate of change of a sensed scalar, from the two delayed frames. */
const rateOf = (ctx, field) => (ctx.snap[field] - ctx.prev[field]) / ctx.step;

/**
 * A "wait for the cue, then fire once" skeleton. `plan(ctx)` is called at the
 * moment the bot is ready to act and returns nothing (it schedules a gesture).
 */
/**
 * Wait for the cue, act, and — unless the microgame is single-shot — GO AGAIN.
 *
 * The retry matters more than it looks. A player who swipes at the scam call
 * and misses swipes again; a bot that fired once and then sat there made SWAT!
 * look like a 27% microgame when its real failure is aim, not the clock, and
 * every timeout in the table was really "the bot gave up". Each retry costs a
 * fresh reaction on top of the gesture that just finished, so trying twice is
 * only worth it if the window is generous — which is exactly the trade a player
 * makes.
 */
function actOnCue(ctx, plan, once) {
  const m = ctx.mem;
  if (once && m.fired) return;
  // `ctx.live` is the cue as it happens; `ctx.snap` is the delayed picture used
  // for AIM. Keeping them separate matters: detecting the cue off the delayed
  // frame too would charge the latency twice, once for noticing and again for
  // moving, and every window in data.js would then be tuned against a bot that
  // is half as good as the human it is meant to stand in for.
  if (!ctx.live) return;
  if (m.readyAt === undefined) m.readyAt = ctx.t + reactionOf(ctx) + (ctx.extraRead || 0);
  if (ctx.t < m.readyAt) return;
  m.fired = true;
  ctx.lastEnd = ctx.t;
  plan(ctx);
  m.readyAt = Math.max(ctx.t + 0.02, ctx.lastEnd) + reactionOf(ctx);
}

const onceOnCue = (ctx, plan) => actOnCue(ctx, plan, true);

/**
 * Timing skeleton: every step, predict when the on-screen thing will be in its
 * window (from the delayed frame's value and rate — the same extrapolation a
 * player does), and commit a press to land then. Commits once.
 */
function timedPress(ctx, predict, pointAt) {
  const m = ctx.mem;
  if (m.fired) return;
  if (!ctx.live) return;
  // You cannot judge the speed of something from a single glimpse. Three live
  // frames before any prediction is allowed — without this the bot commits off
  // a rate measured across the instant the prop started moving, which is
  // meaningless, and the microgame looks impossible when it is not.
  m.seen = (m.seen || 0) + 1;
  if (m.seen < 3) return;
  if (m.readyAt === undefined) m.readyAt = ctx.t + reactionOf(ctx);

  const ahead = predict(ctx);            // seconds from the SNAPSHOT's instant
  if (ahead === null || !Number.isFinite(ahead)) return;
  // The snapshot is `latency` old, so the crossing is at (t - latency) + ahead.
  const target = ctx.t - ctx.bot.latency + ahead + jitterT(ctx);
  if (target < m.readyAt) return;        // cannot move that fast; wait for the next one
  if (target > ctx.t + 0.9) return;      // too far out to commit to yet

  m.fired = true;
  const p = pointAt(ctx);
  ctx.tapAt(target, aimX(ctx, p.x), aimY(ctx, p.y));
}

/* ─── The fourteen policies ──────────────────────────────── */

export const POLICIES = {

  /* PAY! — one button, one deadline. */
  pay: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.btn.x + st.btn.w / 2;
      o.y = st.btn.y + st.btn.h / 2;
    },
    step(ctx) {
      actOnCue(ctx, (c) => c.tapAt(c.t, aimX(c, c.snap.x), aimY(c, c.snap.y)));
    },
  },

  /* PICK! — read the demand, then commit. Pays the read cost. */
  pick: {
    sense(st, o) {
      o.live = isLive(st);
      const r = st.cards[st.wantIdx];
      o.x = r.x + r.w / 2;
      o.y = r.y + r.h / 2;
    },
    step(ctx) {
      ctx.extraRead = ctx.bot.readCost;
      actOnCue(ctx, (c) => c.tapAt(c.t, aimX(c, c.snap.x), aimY(c, c.snap.y)));
    },
  },

  /* CATCH! — track the fall and lead it. The delayed frame plus the sensed
     speed is exactly the predictive tracking a player does. */
  catch: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.x;
      o.y = st.y;
      o.r = st.r;
    },
    step(ctx) {
      actOnCue(ctx, (c) => {
        const vy = rateOf(c, 'y');
        // Lead by the sensing lag plus the fraction of a step until the press.
        const y = c.snap.y + vy * c.bot.latency;
        c.tapAt(c.t, aimX(c, c.snap.x), aimY(c, y));
      });
    },
  },

  /* GIFT! — grab and carry. */
  gift: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.x;
      o.y = st.y;
      o.aux = st.box.x + st.box.w / 2;
      o.aux2 = st.box.y + st.box.h / 2;
    },
    step(ctx) {
      actOnCue(ctx, (c) => {
        const gx = aimX(c, c.snap.x);
        const gy = aimY(c, c.snap.y);
        const tx = aimX(c, c.snap.aux);
        const ty = aimY(c, c.snap.aux2);
        c.dragAt(c.t, gx, gy, tx, ty);
      });
    },
  },

  /* SIGN! — a stroke along the line. Costs what a stroke costs. */
  sign: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.line.x0;
      o.y = st.line.y;
      o.aux = st.line.x1;
    },
    step(ctx) {
      actOnCue(ctx, (c) => {
        const y = aimY(c, c.snap.y);
        // Overshoot both ends slightly, as a real signature does.
        c.swipeAt(c.t, aimX(c, c.snap.x - 1.5), y, aimX(c, c.snap.aux + 1.5), aimY(c, c.snap.y));
      });
    },
  },

  /* SWAT! — swipe through where the handset WILL be mid-stroke. */
  swat: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.x;
      o.y = st.y;
    },
    step(ctx) {
      actOnCue(ctx, (c) => {
        const vx = rateOf(c, 'x');
        const vy = rateOf(c, 'y');
        const half = 20 / c.bot.swipeSpeed;             // half the stroke's duration
        const lead = c.bot.latency + half;
        const px = c.snap.x + vx * lead;
        const py = c.snap.y + vy * lead;
        c.swipeAt(c.t, aimX(c, px - 20), aimY(c, py), aimX(c, px + 20), aimY(c, py));
      });
    },
  },

  /* SHIELD! — get on the family and stay there. The judgement instant is the
     rain landing, which the bot reads off the band's position and speed. */
  shield: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.famX;
      o.y = st.umbX;
      o.k = st.rainY;
    },
    step(ctx) {
      onceOnCue(ctx, (c) => {
        const tx = aimX(c, c.snap.x);
        // Press wherever the umbrella already is, then slide onto the family.
        c.dragAt(c.t, c.snap.y, c.stageH - 6, tx, c.stageH - 6, { hold: true });
      });
    },
  },

  /* GROW! — hold, watch the level rise, and let go on the band. Closed-loop
     prediction: the release is scheduled from the sensed level and rate. */
  grow: {
    sense(st, o) {
      o.live = isLive(st);
      o.k = st.level;
      o.aux = st.bandCentre;
      o.x = st.jar.x + st.jar.w / 2;
      o.y = st.jar.y + st.jar.h / 2;
    },
    step(ctx) {
      const m = ctx.mem;
      onceOnCue(ctx, (c) => {
        c.holdAt(c.t, aimX(c, c.snap.x), aimY(c, c.snap.y));
        m.holding = true;
      });
      if (!m.holding || m.released) return;
      const rate = rateOf(ctx, 'k');
      if (rate <= 1e-6) return;
      const ahead = (ctx.snap.aux - ctx.snap.k) / rate;      // seconds to the band centre
      const target = ctx.t - ctx.bot.latency + ahead + jitterT(ctx);
      if (target > ctx.t + 0.6) return;
      m.released = true;
      ctx.releaseAt(Math.max(ctx.t, target));
    },
  },

  /* TOP-UP! — two taps, at a natural double-tap cadence. */
  topup: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.card.x + st.card.w / 2;
      o.y = st.card.y + st.card.h / 2;
    },
    step(ctx) {
      onceOnCue(ctx, (c) => {
        const x = aimX(c, c.snap.x);
        const y = aimY(c, c.snap.y);
        const gap = Math.max(0.075, 0.17 + jitterT(c));
        c.tapAt(c.t, x, y);
        c.tapAt(c.t + gap, aimX(c, c.snap.x), aimY(c, c.snap.y));
      });
    },
  },

  /* SNOOZE! — aim small, and go again if the ad eats the first one. */
  snooze: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.cx;
      o.y = st.cy;
      o.r = st.r;
      o.aux = st.fumbles;
    },
    step(ctx) {
      const m = ctx.mem;
      if (!ctx.live) return;
      if (m.readyAt === undefined) m.readyAt = ctx.t + reactionOf(ctx);
      if (ctx.t < m.readyAt) return;
      // Re-aim after a fumble; the X is bigger now, so the second try is better.
      if (m.shots === undefined) m.shots = 0;
      if (m.shots > ctx.snap.aux) return;      // already fired for this state
      m.shots = ctx.snap.aux + 1;
      m.readyAt = ctx.t + reactionOf(ctx);
      ctx.tapAt(ctx.t, aimX(ctx, ctx.snap.x), aimY(ctx, ctx.snap.y));
    },
  },

  /* STAMP! — the swing passes through square twice a cycle. Extrapolate the
     next crossing from the angle and its rate. */
  stamp: {
    sense(st, o) {
      o.live = isLive(st);
      o.ang = st.angle;
      o.x = st.seal.x;
      o.y = st.seal.y;
      o.aux = st.amp;               // the extent of the swing is on screen
    },
    step(ctx) {
      timedPress(
        ctx,
        (c) => {
          // Proper simple-harmonic inversion rather than a straight-line
          // guess: the swing's extent is visible, so its rhythm is knowable,
          // and a player who has watched two swings knows when it comes square
          // next. A linear extrapolation from a big angle is wrong by enough to
          // make the microgame look impossible when it is not.
          const A = c.snap.aux;
          const a = c.snap.ang;
          const r = rateOf(c, 'ang');
          if (A <= 1e-6 || Math.abs(r) < 1e-5) return null;
          // Near the turning points the stamp is barely moving and its rhythm
          // cannot be read off it — the inversion below is ill-conditioned
          // there, and so is a person's eye. Wait for the middle of a swing.
          if (Math.abs(a) > 0.85 * A) return null;
          const denom = Math.max(1e-6, A * A - a * a);
          const w = Math.abs(r) / Math.sqrt(denom);
          if (!Number.isFinite(w) || w < 1e-4) return null;
          const th = Math.atan2(a / A, r / (A * w));   // phase now
          const k = Math.ceil(th / Math.PI + 1e-6);    // next zero of sin()
          return (k * Math.PI - th) / w;
        },
        (c) => ({ x: c.snap.x, y: c.snap.y }),
      );
    },
  },

  /* SPLIT! — read which jar, then carry. Pays the read cost. */
  split: {
    sense(st, o) {
      o.live = isLive(st);
      o.x = st.x;
      o.y = st.y;
      const j = st.jars[st.wantIdx];
      o.aux = j.x + j.w / 2;
      o.aux2 = j.y + j.h / 2;
    },
    step(ctx) {
      ctx.extraRead = ctx.bot.readCost;
      actOnCue(ctx, (c) => {
        c.dragAt(c.t, aimX(c, c.snap.x), aimY(c, c.snap.y),
          aimX(c, c.snap.aux), aimY(c, c.snap.aux2));
      });
    },
  },

  /* LOCK! — the needle sweeps one way; work out when it reaches the notch. */
  lock: {
    sense(st, o) {
      o.live = isLive(st);
      o.ang = st.angle;
      o.k = st.notchA;
      o.x = st.dial.x;
      o.y = st.dial.y;
    },
    step(ctx) {
      timedPress(
        ctx,
        (c) => {
          const rate = rateOf(c, 'ang');
          if (Math.abs(rate) < 1e-4) return null;
          // Shortest angular distance in the direction the needle is going.
          let d = (c.snap.k - c.snap.ang) % (Math.PI * 2);
          if (rate > 0) { while (d <= 0) d += Math.PI * 2; }
          else { while (d >= 0) d -= Math.PI * 2; }
          return d / rate;
        },
        (c) => ({ x: c.snap.x, y: c.snap.y }),
      );
    },
  },

  /* WAKE! — one pass at the 9. Time it off the hand's angle and rate. */
  wake: {
    sense(st, o) {
      o.live = isLive(st);
      o.ang = st.hand;
      o.x = st.clock.x;
      o.y = st.clock.y;
    },
    step(ctx) {
      timedPress(
        ctx,
        (c) => {
          const rate = rateOf(c, 'ang');
          if (rate < 1e-4) return null;
          const ahead = (SWEEP - c.snap.ang) / rate;
          return ahead >= 0 ? ahead : null;
        },
        (c) => ({ x: c.snap.x, y: c.snap.y }),
      );
    },
  },
};

/* ─── Adversarial policies (applied to every microgame) ──── */

/** Never touches the glass. Must lose every microgame. */
export const IDLE_POLICY = {
  sense(st, o) { o.live = isLive(st); },
  step() {},
};

/**
 * Hammers the middle of the screen at `spamHz`, from the first frame. The cue
 * rule should end every microgame it plays with "jumped in early".
 */
export const SPAM_POLICY = {
  sense(st, o) { o.live = isLive(st); },
  step(ctx) {
    const period = 1 / (ctx.bot.spamHz || 8);
    const m = ctx.mem;
    if (m.next === undefined) m.next = 0;
    if (ctx.t < m.next) return;
    m.next = ctx.t + period;
    ctx.tapAt(ctx.t, STAGE_W / 2 + ctx.gauss() * 12, STAGE_H / 2 + ctx.gauss() * 16);
  },
};

/**
 * Waits for the cue like an honest player and then hammers, hoping volume beats
 * precision. The single-shot microgames (STAMP!, LOCK!, WAKE!, PICK!, SPLIT!)
 * should punish it, and the aim games should not reward it much either.
 */
export const MASH_POLICY = {
  sense(st, o) {
    o.live = isLive(st);
    o.x = STAGE_W / 2;
    o.y = STAGE_H / 2;
  },
  step(ctx) {
    if (!ctx.live) return;
    const m = ctx.mem;
    const period = 1 / (ctx.bot.spamHz || 9);
    if (m.next === undefined) m.next = ctx.t + reactionOf(ctx);
    if (ctx.t < m.next) return;
    m.next = ctx.t + period;
    ctx.tapAt(ctx.t, STAGE_W / 2 + ctx.gauss() * 22, STAGE_H / 2 + ctx.gauss() * 26);
  },
};
