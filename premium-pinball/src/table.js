// table.js — pure playfield geometry for Premium Pinball.
//
// Turns the geometry block in data.js into the flat collision primitives the
// physics step consumes: line segments (walls, slingshot faces, the one-way
// plunger gate), circles (goal bumpers) and flipper capsule definitions.
//
// NOTHING in this file may touch the DOM, React or the canvas: scripts/balance.mjs
// imports it directly under Node so the balance gate measures the table that
// actually ships.

import { GAME_CONFIG, GOALS, LANES } from './data.js';

/* ─── Segment kinds ──────────────────────────────────────────
   wall  — plain reflector, restitution physics.wallRestitution
   sling — kicker face, restitution physics.slingRestitution + a fixed impulse
   gate  — one-way: a rising ball passes through, a falling ball bounces
   post  — rollover lane divider; same physics as a wall, drawn differently   */

function seg(x1, y1, x2, y2, kind, index) {
  return { x1, y1, x2, y2, kind, index: index === undefined ? -1 : index };
}

/** Push an arc onto `out` as `steps` chords. Angles in radians, y grows down. */
function arc(out, cx, cy, r, a0, a1, steps, kind) {
  for (let i = 0; i < steps; i++) {
    const t0 = a0 + ((a1 - a0) * i) / steps;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / steps;
    out.push(seg(
      cx + r * Math.cos(t0), cy + r * Math.sin(t0),
      cx + r * Math.cos(t1), cy + r * Math.sin(t1),
      kind,
    ));
  }
}

/**
 * Build the whole table. Deterministic and side-effect free: the same cfg
 * always yields the same geometry, which is what lets the sim reproduce a run
 * from nothing but a seed.
 */
export function buildTable(cfg = GAME_CONFIG) {
  const t = cfg.table;
  const cx = (t.pfL + t.pfR) / 2;
  const R = t.cornerR;

  const segments = [];

  /* ---- Outer shell ------------------------------------------------------
     Left wall, top-left corner arc, top wall, top-right corner arc, then the
     outer wall of the plunger lane all the way to the lane floor. The arcs are
     what turn a straight plunge into an orbit across the rollover lanes, so the
     plunge power is a real aiming input rather than a formality. */
  segments.push(seg(t.pfL, t.top + R, t.pfL, t.slantTopY, 'wall'));
  arc(segments, t.pfL + R, t.top + R, R, Math.PI, Math.PI * 1.5, 7, 'wall');
  segments.push(seg(t.pfL + R, t.top, t.laneR - R, t.top, 'wall'));
  arc(segments, t.laneR - R, t.top + R, R, Math.PI * 1.5, Math.PI * 2, 7, 'wall');
  segments.push(seg(t.laneR, t.top + R, t.laneR, t.laneFloorY, 'wall'));
  segments.push(seg(t.laneR, t.laneFloorY, t.laneL, t.laneFloorY, 'wall'));

  /* ---- Plunger lane inner wall + one-way gate --------------------------- */
  // The inner wall doubles as the playfield's right wall above the funnel.
  segments.push(seg(t.laneL, t.gateY, t.laneL, t.laneInnerBottomY, 'wall'));
  // Sloped one-way gate. A rising ball ignores it; a falling one rides it back
  // out into the playfield instead of parking on it.
  segments.push(seg(t.gateX0, t.gateY0, t.laneR, t.gateY1, 'gate'));

  /* ---- Lower funnel + slingshot bulge -----------------------------------
     One wall per side, from the side rail down to a point directly above the
     flipper, with the slingshot built into it as a bulge.

     There is deliberately NO shoulder reaching down to the pivot: any wall that
     comes within (ball radius + flipper radius) of the flipper AXIS lets a ball
     touch wall and flipper at the same instant, and if those two normals have
     opposing horizontal components they cancel and hold the ball until the
     watchdog kills it. minWallFlipperClearance() below measures exactly that,
     over the whole sweep, and the balance gate asserts it — so the property is
     checked rather than argued.

     The wall ending above the flipper leaves an outlane on each side: roll off
     too slowly, or meet a raised flipper, and the ball falls past into the
     drain. That is what stops a held flipper roofing the drain. */
  const f = cfg.flipper;
  const mirrorX = (x) => 2 * cx - x;
  const pivotLX = cx - f.pivotDX;
  const funnelDeg = (t.funnelEndDeg * Math.PI) / 180;
  const funnelEndX = pivotLX + t.funnelEndR * Math.cos(funnelDeg);
  const funnelEndY = f.pivotY - t.funnelEndR * Math.sin(funnelDeg);

  // Wall axis, start -> end, used to place the slingshot bulge along it.
  const wallDX = funnelEndX - t.pfL;
  const wallDY = funnelEndY - t.slantTopY;
  const wallLen = Math.hypot(wallDX, wallDY);
  const wux = wallDX / wallLen;
  const wuy = wallDY / wallLen;
  // Outward normal, i.e. into the playfield (up and to the right on the left side).
  const wnx = wuy;
  const wny = -wux;

  const at = (frac) => ({
    x: t.pfL + wallDX * frac,
    y: t.slantTopY + wallDY * frac,
  });

  const slings = [];
  const buildSide = (mirror) => {
    const mx = (p) => (mirror ? mirrorX(p.x) : p.x);
    const a = at(t.slingStartFrac);
    const b = at(t.slingEndFrac);
    const apex = {
      x: (a.x + b.x) / 2 + wnx * t.slingApexOut,
      y: (a.y + b.y) / 2 + wny * t.slingApexOut,
    };
    const index = slings.length;
    const startX = mirror ? mirrorX(t.pfL) : t.pfL;
    const endX = mirror ? mirrorX(funnelEndX) : funnelEndX;

    segments.push(seg(startX, t.slantTopY, mx(a), a.y, 'wall'));
    // Both faces of the bulge kick: whichever one the ball meets is the one a
    // real slingshot would fire.
    segments.push(seg(mx(a), a.y, mx(apex), apex.y, 'sling', index));
    segments.push(seg(mx(apex), apex.y, mx(b), b.y, 'sling', index));
    segments.push(seg(mx(b), b.y, endX, funnelEndY, 'wall'));

    slings.push({
      index,
      ax: mx(a), ay: a.y,
      apexX: mx(apex), apexY: apex.y,
      bx: mx(b), by: b.y,
      wallStartX: startX, wallStartY: t.slantTopY,
      wallEndX: endX, wallEndY: funnelEndY,
    });
  };
  buildSide(false);
  buildSide(true);

  /* ---- Rollover lane dividers ------------------------------------------- */
  const laneCount = LANES.length;
  const laneW = (t.rolloverX1 - t.rolloverX0) / laneCount;
  const lanes = [];
  for (let i = 0; i <= laneCount; i++) {
    const x = t.rolloverX0 + laneW * i;
    segments.push(seg(x, t.rolloverTopY, x, t.rolloverBotY, 'post'));
  }
  for (let i = 0; i < laneCount; i++) {
    const x0 = t.rolloverX0 + laneW * i;
    lanes.push({
      index: i,
      key: LANES[i].key,
      label: LANES[i].label,
      x0,
      x1: x0 + laneW,
      // Inset so the trigger needs the ball centre genuinely inside the lane.
      hitX0: x0 + 4,
      hitX1: x0 + laneW - 4,
      y: t.rolloverLineY,
      cx: x0 + laneW / 2,
    });
  }

  /* ---- Goal bumpers ------------------------------------------------------ */
  const bumpers = t.bumpers.map((b, i) => ({
    index: i,
    x: b.x,
    y: b.y,
    r: b.r,
    key: GOALS[i].key,
    short: GOALS[i].short,
    full: GOALS[i].full,
    color: GOALS[i].color,
    colorLt: GOALS[i].colorLt,
  }));

  /* ---- Flippers ---------------------------------------------------------- */
  const flippers = [
    { side: 'left', dir: 1, px: cx - f.pivotDX, py: f.pivotY },
    { side: 'right', dir: -1, px: cx + f.pivotDX, py: f.pivotY },
  ].map((v, i) => ({
    index: i,
    ...v,
    length: f.length,
    radius: f.radius,
    restAngle: f.restAngle,
    upAngle: f.upAngle,
  }));

  return {
    W: t.W,
    H: t.H,
    cx,
    segments,
    bumpers,
    slings,
    lanes,
    flippers,
    drainY: t.drainY,
    // Anything at or right of this x is inside the plunger lane, not the drain.
    drainXMax: t.laneL - 4,
    plungerX: cfg.plunger.restX,
    plungerY: cfg.plunger.restY,
  };
}

/** Tip of a flipper at a given angle. Shared by physics and the renderer. */
export function flipperTip(fl, angle, out) {
  out.x = fl.px + fl.dir * fl.length * Math.cos(angle);
  out.y = fl.py + fl.length * Math.sin(angle);
  return out;
}

/* ─── Trap-freedom invariant ─────────────────────────────── */

function pointSegDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - x1) * dx + (py - y1) * dy) / len2 : 0;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

const cross = (ax, ay, bx, by, cx2, cy2) => (bx - ax) * (cy2 - ay) - (by - ay) * (cx2 - ax);

function segmentsIntersect(ax, ay, bx, by, cx2, cy2, dx2, dy2) {
  const d1 = cross(cx2, cy2, dx2, dy2, ax, ay);
  const d2 = cross(cx2, cy2, dx2, dy2, bx, by);
  const d3 = cross(ax, ay, bx, by, cx2, cy2);
  const d4 = cross(ax, ay, bx, by, dx2, dy2);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0))
    && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Closest approach between two segments. 0 when they cross. */
function segSegDistance(ax, ay, bx, by, cx2, cy2, dx2, dy2) {
  if (segmentsIntersect(ax, ay, bx, by, cx2, cy2, dx2, dy2)) return 0;
  return Math.min(
    pointSegDistance(ax, ay, cx2, cy2, dx2, dy2),
    pointSegDistance(bx, by, cx2, cy2, dx2, dy2),
    pointSegDistance(cx2, cy2, ax, ay, bx, by),
    pointSegDistance(dx2, dy2, ax, ay, bx, by),
  );
}

/**
 * The invariant that keeps the lower playfield trap-free.
 *
 * A ball wedges when two contacts push it in directions whose horizontal
 * components cancel. The dangerous pair on this table is "wall + flipper": the
 * wall's outward normal points up-and-inward, a flipper's can point
 * up-and-outward, and together they hold the ball against gravity indefinitely.
 *
 * The pair is impossible if the ball can never touch both at once. Touching the
 * wall puts the ball centre exactly one ball radius from it; touching the
 * flipper puts it (ball radius + flipper radius) from the axis. By the triangle
 * inequality both can hold at once only when
 *
 *     dist(wall, flipperAxis) <= ballRadius + (ballRadius + flipperRadius)
 *
 * so the requirement is TWO ball radii plus the flipper radius — 26 px here,
 * not 17. The 17 px version of this check passed while a ball still wedged once
 * every ~200 runs, because a ball sitting against the wall leans a further 9 px
 * toward the flipper and closes the gap the check thought it had.
 *
 * Sampling the whole sweep rather than the resting pose is the other half:
 * two earlier layouts were clear at rest and sealed shut the moment a flipper
 * was held up.
 *
 * @returns {{clearance:number, required:number, ok:boolean, worst:object|null}}
 */
export function minWallFlipperClearance(table, cfg, samples = 96) {
  const required = 2 * cfg.ball.radius + cfg.flipper.radius;
  let clearance = Infinity;
  let worst = null;
  const tip = { x: 0, y: 0 };

  for (const fl of table.flippers) {
    // Inclusive sweep from the raised pose to the resting pose.
    for (let i = 0; i <= samples; i++) {
      const angle = fl.upAngle + ((fl.restAngle - fl.upAngle) * i) / samples;
      flipperTip(fl, angle, tip);
      for (let k = 0; k < table.segments.length; k++) {
        const s = table.segments[k];
        // The gate is a one-way membrane at the top of the plunger lane, nowhere
        // near a flipper; everything else is solid and must clear.
        if (s.kind === 'gate') continue;
        const d = segSegDistance(s.x1, s.y1, s.x2, s.y2, fl.px, fl.py, tip.x, tip.y);
        if (d < clearance) {
          clearance = d;
          worst = { flipper: fl.side, angle, segment: k, kind: s.kind, distance: d };
        }
      }
    }
  }
  return { clearance, required, ok: clearance > required, worst };
}
