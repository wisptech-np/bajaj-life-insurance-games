// physics.js — the lane-plane simulation and the bowling scorer for Risk Strike.
//
// Everything in here is pure: no React, no DOM, no canvas. The whole throw is
// solved in 2D lane coordinates and the renderer projects that plane into the
// pseudo-3D view, so the physics never has to know what the lane looks like.
//
//   x  across the lane, 0 = centre line, +x = the player's right
//   y  down the lane,   0 = foul line,   y = lane.length is the head pin
//
// Keeping this file free of React is what lets `scripts/balance-sim.mjs` (see
// README "Balance notes") drive the *shipped* physics rather than a copy of it —
// the balance numbers in data.js come from running this exact code headless.

/* ─── Math ───────────────────────────────────────────────── */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** Small deterministic PRNG so a simulated session can be reproduced. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ─── The rack ───────────────────────────────────────────────
   Standard 10-pin triangle, apex towards the bowler. Rows are spaced by
   spacing * sin(60°) so the triangle is equilateral, exactly like a real deck.

   Pin numbering is the real one, which is what makes the leave patterns read
   correctly: 1 head pin, 2/3 the pocket pair, 4/5/6, 7/8/9/10 the back row. */
export const PIN_LAYOUT = [
  { id: 1, row: 0, col: 0 },
  { id: 2, row: 1, col: -0.5 }, { id: 3, row: 1, col: 0.5 },
  { id: 4, row: 2, col: -1 }, { id: 5, row: 2, col: 0 }, { id: 6, row: 2, col: 1 },
  { id: 7, row: 3, col: -1.5 }, { id: 8, row: 3, col: -0.5 },
  { id: 9, row: 3, col: 0.5 }, { id: 10, row: 3, col: 1.5 },
];

/** Row depth of the rack triangle, in lane units. */
export const rowDepth = (cfg) => cfg.pins.spacing * 0.8660254;

/**
 * Fresh rack of 10 standing pins.
 * `rackJitter` is a fraction of a pin radius of placement noise: without it an
 * identical flick always produces an identical leave, which reads as a lookup
 * table rather than a physical deck.
 */
export function createRack(cfg, rand) {
  const depth = rowDepth(cfg);
  return PIN_LAYOUT.map((p) => {
    const jx = (rand() * 2 - 1) * cfg.pins.rackJitter;
    const jy = (rand() * 2 - 1) * cfg.pins.rackJitter;
    const hx = p.col * cfg.pins.spacing + jx;
    const hy = cfg.lane.length + p.row * depth + jy;
    return {
      id: p.id,
      row: p.row,
      label: cfg.pins.labels[p.id] || null,
      x: hx,
      y: hy,
      hx,
      hy,
      vx: 0,
      vy: 0,
      r: cfg.pins.radius,
      im: 1 / cfg.pins.mass,
      standing: true,
      gone: false,
      fallT: 0,
      fallAngle: 0,
      spin: 0,
      wobble: 0,
      // Rendering-only: the scale/bounce the rack drops in with.
      dropT: 0,
    };
  });
}

export function createBall(cfg) {
  return {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    r: cfg.ball.radius,
    im: 1 / cfg.ball.mass,
    curve: 0,
    active: false,
    gutter: 0, // 0 none, -1 left, +1 right
    // Where the ball left the lane. A ball that gutters level with the deck has
    // already done its work; only one that gutters short of the pins is a shame.
    gutterY: 0,
    rolled: 0,
  };
}

export function createThrowState(cfg, rand) {
  return {
    ball: createBall(cfg),
    pins: createRack(cfg, rand),
    t: 0,
    settleT: 0,
    rand,
  };
}

export function standingCount(pins) {
  let n = 0;
  for (const p of pins) if (p.standing) n += 1;
  return n;
}

/* ─── Flick → shot ───────────────────────────────────────────
   The one place the player's gesture becomes physics. Kept here (not in the
   component) so the balance sim launches balls the same way a thumb does. */

/**
 * @param {object} cfg   GAME_CONFIG
 * @param {object} flick  speedPx: pointer speed in CSS px/s at release,
 *                        angleRad: signed swipe angle off straight-up (+ = right),
 *                        curl: signed swipe curvature in -1..1 (+ = curls right)
 * @param {function} rand
 */
export function flickToShot(cfg, flick, rand) {
  const f = cfg.flick;
  const t = clamp((flick.speedPx - f.minSpeedPx) / (f.maxSpeedPx - f.minSpeedPx), 0, 1);
  const power = lerp(f.minPower, f.maxPower, Math.pow(t, f.powerCurve))
    * (1 + (rand() * 2 - 1) * f.powerJitter);
  const angle = clamp(flick.angleRad * f.angleGain, -f.maxAngle, f.maxAngle)
    + (rand() * 2 - 1) * f.angleJitter;
  const curve = clamp(flick.curl, -1, 1) * f.curveGain;
  return { power, angle, curve, t };
}

export function launch(state, cfg, shot) {
  const b = state.ball;
  b.x = cfg.ball.startX;
  b.y = cfg.ball.startY;
  b.vx = Math.sin(shot.angle) * shot.power;
  b.vy = Math.cos(shot.angle) * shot.power;
  b.curve = shot.curve;
  b.active = true;
  b.gutter = 0;
  b.rolled = 0;
}

/**
 * How hard the ball is hooking at this point down the lane. A real ball skids
 * first and bites at the back end; ramping the lateral acceleration with the
 * square of the distance travelled reproduces that late break, which is what
 * makes curl feel like spin rather than like steering.
 */
function curveRamp(cfg, y) {
  const p = clamp(y / cfg.lane.length, 0, 1);
  return cfg.flick.curveSkid + (1 - cfg.flick.curveSkid) * p * p;
}

/* ─── Collision ──────────────────────────────────────────── */

/**
 * Impulse-resolve two overlapping circles. Returns the impulse magnitude, which
 * the caller uses as the strength of the impact for particles and audio.
 * Allocation-free — this runs up to 55 times per 120 Hz tick.
 */
function collide(a, b, restitution, tangential) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const rr = a.r + b.r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 <= 1e-9) return 0;

  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  const imSum = a.im + b.im;
  if (imSum <= 0) return 0;

  // Push the pair apart before solving so stacked contacts do not sink into
  // each other over successive ticks.
  const overlap = rr - d;
  const push = overlap / imSum;
  a.x -= nx * push * a.im;
  a.y -= ny * push * a.im;
  b.x += nx * push * b.im;
  b.y += ny * push * b.im;

  const rvx = b.vx - a.vx;
  const rvy = b.vy - a.vy;
  const rel = rvx * nx + rvy * ny;
  if (rel >= 0) return 0;

  const j = (-(1 + restitution) * rel) / imSum;
  a.vx -= j * nx * a.im;
  a.vy -= j * ny * a.im;
  b.vx += j * nx * b.im;
  b.vy += j * ny * b.im;

  // A little tangential friction. Without it a dead-centre contact transfers
  // nothing sideways and the rack behaves like billiard balls on rails.
  if (tangential > 0) {
    const tx = -ny;
    const ty = nx;
    const relT = rvx * tx + rvy * ty;
    const jt = (-relT * tangential) / imSum;
    a.vx -= jt * tx * a.im;
    a.vy -= jt * ty * a.im;
    b.vx += jt * tx * b.im;
    b.vy += jt * ty * b.im;
  }

  return j;
}

/**
 * Advance one throw by `dt`. `emit(type, x, y, strength)` reports impacts to the
 * presentation layer: 'ballpin', 'pinpin', 'topple', 'gutter'. It is optional —
 * the headless sim passes nothing.
 */
export function stepThrow(state, dt, cfg, emit) {
  const b = state.ball;
  const pins = state.pins;
  state.t += dt;

  /* -- ball ------------------------------------------------------------- */
  if (b.active) {
    if (!b.gutter) b.vx += b.curve * curveRamp(cfg, b.y) * dt;
    const damp = Math.exp(-cfg.ball.friction * dt);
    b.vx *= damp;
    b.vy *= damp;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.rolled += Math.abs(b.vy) * dt;

    const edge = cfg.lane.halfWidth - b.r;
    if (!b.gutter && Math.abs(b.x) > edge) {
      // In the gutter. The ball is out of the game from here: it rides the
      // channel to the pit and cannot touch a pin, which is the whole point of
      // a gutter ball.
      b.gutter = b.x > 0 ? 1 : -1;
      b.gutterY = b.y;
      b.x = b.gutter * (cfg.lane.halfWidth + cfg.lane.gutterWidth * 0.5);
      b.vx = 0;
      b.curve = 0;
      emit?.('gutter', b.x, b.y, 0);
    }
    if (b.gutter) b.x = b.gutter * (cfg.lane.halfWidth + cfg.lane.gutterWidth * 0.5);

    if (b.y > cfg.lane.length + cfg.lane.deckDepth || b.vy < cfg.ball.stallSpeed) {
      b.active = false;
    }
  }

  /* -- ball vs pins ------------------------------------------------------ */
  if (b.active && !b.gutter) {
    for (let i = 0; i < pins.length; i++) {
      const p = pins[i];
      if (p.gone) continue;
      const j = collide(b, p, cfg.pins.ballRestitution, cfg.pins.tangential);
      if (j > 0) emit?.('ballpin', p.x, p.y, j);
    }
  }

  /* -- pin vs pin -------------------------------------------------------- */
  for (let i = 0; i < pins.length; i++) {
    const a = pins[i];
    if (a.gone) continue;
    for (let k = i + 1; k < pins.length; k++) {
      const c = pins[k];
      if (c.gone) continue;
      const j = collide(a, c, cfg.pins.restitution, cfg.pins.tangential);
      if (j > cfg.pins.pinHitAudioImpulse) emit?.('pinpin', c.x, c.y, j);
    }
  }

  /* -- pins -------------------------------------------------------------- */
  const deckHalf = cfg.lane.halfWidth + cfg.lane.gutterWidth;
  const deckEnd = cfg.lane.length + cfg.lane.deckDepth;
  for (let i = 0; i < pins.length; i++) {
    const p = pins[i];
    if (p.gone) continue;

    if (p.standing) {
      // A pin that has only been brushed rocks on its base and settles: the
      // spring is what turns a glancing touch into a wobble instead of a
      // silent teleport back to its spot.
      p.vx += (p.hx - p.x) * cfg.pins.wobbleSpring * dt;
      p.vy += (p.hy - p.y) * cfg.pins.wobbleSpring * dt;
      const wd = Math.exp(-cfg.pins.wobbleDamp * dt);
      p.vx *= wd;
      p.vy *= wd;
    } else {
      const fd = Math.exp(-cfg.pins.fallDamp * dt);
      p.vx *= fd;
      p.vy *= fd;
      p.fallT += dt;
      p.spin += p.wobble * dt;
    }

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    // Kickback plates. A real deck is flanked by them, and a pin thrown into
    // one comes back across the deck — which is where a good share of strikes
    // actually come from. Without walls the corner pins are unreachable and
    // every good hit leaves a 7 or a 10.
    const wall = cfg.lane.halfWidth - p.r;
    if (p.x < -wall) {
      p.x = -wall;
      if (p.vx < 0) p.vx = -p.vx * cfg.pins.kickback;
    } else if (p.x > wall) {
      p.x = wall;
      if (p.vx > 0) p.vx = -p.vx * cfg.pins.kickback;
    }

    if (p.standing) {
      const speed = Math.hypot(p.vx, p.vy);
      const shift = Math.hypot(p.x - p.hx, p.y - p.hy);
      if (speed > cfg.pins.toppleSpeed || shift > cfg.pins.toppleShift) {
        p.standing = false;
        p.fallT = 0;
        p.fallAngle = Math.atan2(p.vy, p.vx);
        p.wobble = (state.rand() * 2 - 1) * 9;
        emit?.('topple', p.x, p.y, speed);
      } else {
        p.wobble = shift;
      }
    }

    // Off the deck entirely: into the pit or over the side. Either way it is
    // down and it stops interacting.
    if (Math.abs(p.x) > deckHalf + 30 || p.y > deckEnd + 40) {
      p.standing = false;
      p.gone = true;
    } else if (!p.standing && p.fallT > cfg.pins.fallSeconds) {
      p.gone = true;
    }
  }
}

/** True once nothing is moving and the throw can be tallied. */
export function isSettled(state, cfg) {
  if (state.ball.active) return false;
  for (const p of state.pins) {
    if (p.gone) continue;
    if (!p.standing) return false; // still tumbling
    if (Math.hypot(p.vx, p.vy) > cfg.pins.restSpeed) return false;
  }
  return state.settleT >= cfg.throwSettleSeconds;
}

/* ─── Bowling scoring ────────────────────────────────────────
   Real rules over a 5-frame game. `rolls` is the flat list of pinfalls in the
   order they were thrown, exactly as a paper scorecard records them. The last
   frame carries the real 10th-frame rule: a strike earns two fill balls, a
   spare earns one, and those fill balls score inside the frame. */

export function scoreGame(rolls, framesCount) {
  let total = 0;
  let i = 0;
  for (let f = 0; f < framesCount; f++) {
    const a = rolls[i];
    if (a === undefined) break;
    const last = f === framesCount - 1;
    if (last) {
      total += (rolls[i] || 0) + (rolls[i + 1] || 0) + (rolls[i + 2] || 0);
      break;
    }
    if (a === 10) {
      total += 10 + (rolls[i + 1] || 0) + (rolls[i + 2] || 0);
      i += 1;
    } else {
      const b = rolls[i + 1] || 0;
      total += a + b + (a + b === 10 ? (rolls[i + 2] || 0) : 0);
      i += 2;
    }
  }
  return total;
}

/** How many rolls the last frame is entitled to, given what has been thrown. */
export function lastFrameRolls(a, b) {
  if (a === 10) return 3;
  if (a !== undefined && b !== undefined && a + b === 10) return 3;
  return 2;
}

/**
 * Frame-by-frame marks and running totals for the on-screen scorecard.
 * A frame's running total is withheld until its bonus balls are known, which is
 * how a real scorecard behaves and why a strike's box stays blank for a frame.
 */
export function buildScorecard(rolls, framesCount) {
  const out = [];
  let i = 0;
  let running = 0;
  let stopped = false;

  for (let f = 0; f < framesCount; f++) {
    const last = f === framesCount - 1;
    const a = rolls[i];
    const b = rolls[i + 1];
    const c = rolls[i + 2];
    const marks = ['', '', ''];
    let frameScore = null;

    if (a === undefined) {
      out.push({ marks, total: null });
      stopped = true;
      continue;
    }

    if (!last) {
      if (a === 10) {
        marks[1] = 'X';
        if (b !== undefined && c !== undefined) frameScore = 10 + b + c;
        i += 1;
      } else {
        marks[0] = String(a);
        if (b !== undefined) {
          if (a + b === 10) {
            marks[1] = '/';
            if (c !== undefined) frameScore = 10 + c;
          } else {
            marks[1] = String(b);
            frameScore = a + b;
          }
        }
        i += 2;
      }
    } else {
      marks[0] = a === 10 ? 'X' : String(a);
      if (b !== undefined) {
        marks[1] = a === 10 ? (b === 10 ? 'X' : String(b)) : (a + b === 10 ? '/' : String(b));
      }
      if (c !== undefined) {
        marks[2] = c === 10 ? 'X' : (b !== undefined && b !== 10 && b + c === 10 ? '/' : String(c));
      }
      const needed = lastFrameRolls(a, b);
      const have = rolls.length - i;
      if (have >= needed) frameScore = (a || 0) + (b || 0) + (c || 0);
      i += needed;
    }

    if (frameScore === null || stopped) {
      stopped = true;
      out.push({ marks, total: null });
    } else {
      running += frameScore;
      out.push({ marks, total: running });
    }
  }
  return out;
}

/* ─── Aim preview ────────────────────────────────────────────
   The dotted line the player aims with. Same integration as the real throw,
   minus collisions, written into a caller-owned array so the render loop does
   not allocate. Deliberately truncated at `aim.previewFrac` of the lane — you
   aim at the arrows, not at the pins. */
export function predictPath(cfg, shot, out) {
  const n = out.length / 2;
  const dt = cfg.aim.previewStep;
  let x = cfg.ball.startX;
  let y = cfg.ball.startY;
  let vx = Math.sin(shot.angle) * shot.power;
  let vy = Math.cos(shot.angle) * shot.power;
  const stopY = cfg.lane.length * cfg.aim.previewFrac;
  let count = 0;
  for (let i = 0; i < n; i++) {
    vx += shot.curve * curveRamp(cfg, y) * dt;
    const damp = Math.exp(-cfg.ball.friction * dt);
    vx *= damp;
    vy *= damp;
    x += vx * dt;
    y += vy * dt;
    out[i * 2] = x;
    out[i * 2 + 1] = y;
    count = i + 1;
    if (y > stopY) break;
  }
  return count;
}
