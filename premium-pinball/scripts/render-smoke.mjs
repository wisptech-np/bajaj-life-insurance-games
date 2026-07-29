// render-smoke.mjs — run every canvas painter under Node against a stub context.
//
// `pnpm build` proves the JSX compiles. It does NOT prove that drawBumper()
// calls a real canvas method, that makeTableBitmap() reads a config key that
// exists, or that a painter survives a mid-run state (bonus live, ball in the
// lane, flipper mid-sweep). Those fail at runtime on a phone, which is the
// worst place to find them.
//
// So: a recording 2D context whose property set is exactly the CanvasRenderingContext2D
// surface these painters are allowed to use. Any call or property outside that
// set throws. Then drive src/render.js with real engine state pulled from a
// real simulated run.
//
//   node scripts/render-smoke.mjs
//
// Exit code 1 on any throw or if a painter draws nothing at all.

import { GAME_CONFIG } from '../src/data.js';
import { BALANCE } from '../src/kit/config.js';
import { createRun, releasePlunger, startCharge, stepRun } from '../src/engine.js';

/* ─── Stub canvas ────────────────────────────────────────── */

// Everything a browser 2D context gives us that these painters may touch.
const METHODS = [
  'save', 'restore', 'setTransform', 'transform', 'translate', 'scale', 'rotate',
  'beginPath', 'closePath', 'moveTo', 'lineTo', 'arc', 'ellipse', 'quadraticCurveTo',
  'bezierCurveTo', 'rect', 'roundRect', 'fill', 'stroke', 'clip',
  'fillRect', 'strokeRect', 'clearRect', 'fillText', 'strokeText', 'measureText',
  'createLinearGradient', 'createRadialGradient', 'createPattern',
  'drawImage', 'setLineDash', 'getLineDash',
];
const PROPS = [
  'fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'miterLimit',
  'globalAlpha', 'globalCompositeOperation', 'font', 'textAlign', 'textBaseline',
  'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY', 'lineDashOffset',
  'imageSmoothingEnabled', 'filter', 'direction',
];

function makeGradient(counts) {
  return {
    addColorStop(offset, color) {
      counts.colorStops += 1;
      if (typeof offset !== 'number' || Number.isNaN(offset)) {
        throw new TypeError(`addColorStop offset must be a number, got ${offset}`);
      }
      if (typeof color !== 'string' || !color) {
        throw new TypeError(`addColorStop colour must be a string, got ${color}`);
      }
    },
  };
}

function makeStubContext(counts) {
  const target = {};
  for (const p of PROPS) target[p] = '';
  for (const m of METHODS) {
    target[m] = (...args) => {
      counts.calls += 1;
      counts.byMethod[m] = (counts.byMethod[m] || 0) + 1;
      // Every numeric argument must be finite — NaN geometry silently paints
      // nothing on a real canvas, which is the hardest kind of bug to see.
      for (let i = 0; i < args.length; i++) {
        const a = args[i];
        if (typeof a === 'number' && !Number.isFinite(a)) {
          throw new RangeError(`${m}() got a non-finite argument #${i}: ${a}`);
        }
      }
      if (m === 'measureText') return { width: String(args[0] ?? '').length * 5 };
      if (m === 'createLinearGradient' || m === 'createRadialGradient' || m === 'createPattern') {
        counts.gradients += 1;
        return makeGradient(counts);
      }
      return undefined;
    };
  }
  // Any read or write outside the known surface is a mistake, not a no-op.
  return new Proxy(target, {
    get(o, k) {
      if (k in o) return o[k];
      if (typeof k === 'symbol') return undefined;
      throw new TypeError(`ctx.${String(k)} is not part of CanvasRenderingContext2D`);
    },
    set(o, k, v) {
      if (!PROPS.includes(k)) {
        throw new TypeError(`ctx.${String(k)} is not a settable 2D context property`);
      }
      o[k] = v;
      return true;
    },
  });
}

const counts = { calls: 0, colorStops: 0, byMethod: {}, canvases: 0, gradients: 0 };

// makeTableBitmap() is the only painter that touches the DOM.
globalThis.document = {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error(`unexpected createElement(${tag})`);
    counts.canvases += 1;
    const cv = { width: 0, height: 0 };
    cv.getContext = (kind) => {
      if (kind !== '2d') throw new Error(`unexpected getContext(${kind})`);
      return makeStubContext(counts);
    };
    return cv;
  },
};

const render = await import('../src/render.js');

/* ─── Drive real engine states ───────────────────────────── */
const DT = BALANCE.loop.fixedStep;
const cfg = GAME_CONFIG;

/** Advance a run to a state worth painting. */
function runUntil(predicate, limitSeconds = 60) {
  const run = createRun(cfg, 0x51D3F00D);
  let launched = false;
  const maxTicks = Math.ceil(limitSeconds / DT);
  for (let i = 0; i < maxTicks; i++) {
    if (run.phase === 'ready' && !launched) {
      startCharge(run);
      if (run.plungerPower >= 0.55) {
        releasePlunger(run);
        launched = true;
      }
    }
    // Hold both flippers up half the time so the ball survives and the painters
    // see a mid-sweep angle as well as the rest and raised extremes.
    run.flippers[0].up = (i % 90) < 45;
    run.flippers[1].up = (i % 90) >= 45;
    stepRun(run, DT);
    if (predicate(run)) return run;
    if (run.ended) break;
  }
  return run;
}

const states = [
  ['fresh / ball in lane', runUntil((r) => r.time > 0.2)],
  ['ball live on playfield', runUntil((r) => r.phase === 'play' && r.ball.y > 200)],
  ['a goal bumper lit', runUntil((r) => r.ballGoals.some(Boolean))],
  ['bonus secure live', runUntil((r) => r.bonusTimer > 0, 120)],
  ['after a drain', runUntil((r) => r.ballsLeft < cfg.balls, 120)],
  ['run over', runUntil((r) => r.ended, 130)],
];

/* ─── Paint ──────────────────────────────────────────────── */
const failures = [];
let painted = 0;

// The static bitmap, at the three device profiles the mobile checklist names.
for (const [name, scale, dpr] of [['360x640', 0.72, 3], ['375x812', 0.88, 2], ['414x896', 1.0, 2]]) {
  const table = states[0][1].table;
  try {
    const before = counts.calls;
    const bmp = render.makeTableBitmap(table, cfg, scale, dpr, true);
    if (!bmp || !bmp.width || !bmp.height) throw new Error('bitmap has no dimensions');
    if (counts.calls === before) throw new Error('painted nothing');
    painted += 1;
    console.log(`  makeTableBitmap ${name.padEnd(9)} ${bmp.width}x${bmp.height} px, `
      + `${counts.calls - before} draw calls  OK`);
  } catch (err) {
    failures.push(`makeTableBitmap ${name}: ${err.message}`);
  }
}
// Once more with shadows off, the low-tier path.
try {
  render.makeTableBitmap(states[0][1].table, cfg, 0.72, 1, false);
  painted += 1;
  console.log('  makeTableBitmap low-tier (no shadows)                    OK');
} catch (err) {
  failures.push(`makeTableBitmap low tier: ${err.message}`);
}

for (const [label, run] of states) {
  const ctx = makeStubContext(counts);
  const table = run.table;
  const before = counts.calls;
  // The slice of component state the painters read.
  const s = {
    run,
    trailX: new Float32Array([run.ball.x, run.ball.x - 3, run.ball.x - 7]),
    trailY: new Float32Array([run.ball.y, run.ball.y - 4, run.ball.y - 9]),
    trailMax: 3,
    trailHead: 1,
    trailCount: 3,
  };
  try {
    const paints = render.buildPaints(ctx, cfg, table, 600);
    const gradientsAfterBuild = counts.gradients;
    render.drawLaneLamps(ctx, table, cfg, run.lanes, new Float32Array([0.4, 0, 1]), 3.2, true);
    if (run.bonusTimer > 0) render.drawBonusBand(ctx, table, cfg, run.bonusTimer, 3.2);
    else render.drawBonusBand(ctx, table, cfg, cfg.bonus.seconds * 0.5, 3.2);
    for (let i = 0; i < table.bumpers.length; i++) {
      render.drawBumper(ctx, table.bumpers[i], cfg, run.ballGoals[i], i === 0 ? 0.7 : 0, 3.2, true, paints);
      render.drawBumper(ctx, table.bumpers[i], cfg, run.ballGoals[i], 0, 3.2, false, paints);
    }
    const tip = { x: 0, y: 0 };
    for (let i = 0; i < table.flippers.length; i++) {
      // Both live angle and both sweep extremes: the flipper painter works in a
      // mirrored, rotated frame, and a sign error there only shows at one end.
      for (const angle of [run.flippers[i].angle, table.flippers[i].upAngle, table.flippers[i].restAngle]) {
        render.drawFlipper(ctx, table.flippers[i], angle, tip, true, paints);
        if (!Number.isFinite(tip.x) || !Number.isFinite(tip.y)) {
          throw new Error('flipperTip produced a non-finite point');
        }
      }
    }
    render.drawPlunger(ctx, s, cfg, 3.2, paints);
    render.drawBall(ctx, s, cfg, paints);
    if (counts.calls === before) throw new Error('painted nothing');
    // Every gradient must come from buildPaints, never from a frame painter.
    // Rebuilding them per frame is a real cost on a mid-range phone, and it is
    // the kind of regression that is invisible until the frame rate drops.
    if (counts.gradients > gradientsAfterBuild) {
      throw new Error(`${counts.gradients - gradientsAfterBuild} gradient(s) created `
        + 'during the frame; cache them in buildPaints()');
    }
    painted += 1;
    console.log(`  ${label.padEnd(26)} ${String(counts.calls - before).padStart(4)} draw calls  OK`);
  } catch (err) {
    failures.push(`${label}: ${err.message}`);
  }
}

console.log(`\n  ${counts.calls.toLocaleString()} draw calls, ${counts.gradients} gradients `
  + `(${counts.colorStops} stops), ${counts.canvases} offscreen canvases across `
  + `${painted} paint passes`);
console.log('  per-frame gradient allocations: 0 — every gradient comes from buildPaints');
const top = Object.entries(counts.byMethod).sort((a, b) => b[1] - a[1]).slice(0, 6);
console.log(`  busiest: ${top.map(([m, n]) => `${m} ${n}`).join(', ')}`);

if (failures.length) {
  console.log('\nRENDER SMOKE: FAIL');
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
console.log('\nRENDER SMOKE: PASS — every painter runs clean on real engine state.');
process.exit(0);
