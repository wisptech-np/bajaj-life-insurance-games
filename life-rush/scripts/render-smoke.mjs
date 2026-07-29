// render-smoke.mjs — drive every microgame's SHIPPED render() headless.
//
// WHY THIS EXISTS
// ---------------
// The balance gate exercises init / update / result exhaustively and proved the
// rules correct — while six of the fourteen renderers were throwing
// ReferenceError on their first frame, because a refactor added calls to
// `linGrad` / `radGrad` without adding the imports. Nothing caught it: the gate
// never called render(), and `pnpm build` cannot either, since an unresolved
// free variable inside a function body is legal JavaScript until the line runs.
//
// The failure mode was ugly. The kit's loop schedules the next rAF BEFORE
// calling render, so a throwing renderer does not stop the game: update keeps
// running, the run keeps advancing, lives drain against a frozen canvas, and
// the context save stack grows without bound. The hard roster serves four of
// the five broken games, so every single run hit it.
//
// So the presentation layer is now verified like everything else. This runs
// every microgame's real render() against a canvas-2d stub, at every slot it can
// be served in, in every state it can be drawn in (locked, live-and-idle,
// live-and-being-played, resolved-cleared, resolved-failed), and fails on any
// throw. It also counts gradient construction to keep the steady state
// allocation-free, matching the pattern the premium-pinball gate uses.
//
//   node scripts/render-smoke.mjs            # standalone
//   node scripts/balance.mjs                 # runs this first, as a gate step

import { GAME_CONFIG } from '../src/data.js';
import { mulberry32 } from '../src/rng.js';
import { tierOf } from '../src/scheduler.js';
import { MICROGAME_LIST, MICROGAMES } from '../src/microgames/index.js';
import {
  clearEdges, createInput, drainFx, inputMove, inputPress, inputRelease,
} from '../src/microgames/common.js';

const cfg = GAME_CONFIG;
const STEP = 1 / 120;

/* ─── Canvas 2D stub ──────────────────────────────────────
   Records what was asked for rather than rasterising it. Gradients are counted
   because building one per frame is the classic quiet allocation in a canvas
   game, and because the whole point of the m5 refactor was to stop doing it. */
function makeGradient(counter, kind) {
  counter.n += 1;
  counter.byKind[kind] = (counter.byKind[kind] || 0) + 1;
  return { addColorStop() {} };
}

function makeCtx(counter) {
  let depth = 0;
  const ctx = {
    canvas: { width: 400, height: 520 },
    globalAlpha: 1,
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    font: '',
    textAlign: 'left',
    textBaseline: 'alphabetic',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,

    save() { depth += 1; },
    restore() { depth -= 1; },
    get depth() { return depth; },

    createLinearGradient: () => makeGradient(counter, 'linear'),
    createRadialGradient: () => makeGradient(counter, 'radial'),
    createPattern: () => ({}),
    measureText: (s) => ({ width: String(s).length * 4 }),

    beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, arc() {},
    arcTo() {}, ellipse() {}, rect() {}, roundRect() {}, quadraticCurveTo() {},
    bezierCurveTo() {}, fill() {}, stroke() {}, clip() {}, fillRect() {},
    strokeRect() {}, clearRect() {}, fillText() {}, strokeText() {},
    translate() {}, scale() {}, rotate() {}, setTransform() {}, transform() {},
    resetTransform() {}, setLineDash() {}, getLineDash: () => [],
    drawImage() {}, putImageData() {}, createImageData: () => ({}),
  };
  return ctx;
}

/* ─── One render pass ─────────────────────────────────────
   `label` names the state so a throw points straight at the case. */
function tryRender(mg, st, label, counter, out) {
  const ctx = makeCtx(counter);
  const before = counter.n;
  try {
    mg.render(ctx, st, 0);
  } catch (err) {
    out.failures.push(`${mg.id} [${label}]: ${err && err.name === 'ReferenceError'
      ? `ReferenceError: ${err.message}` : String(err && err.message || err)}`);
    return null;
  }
  if (ctx.depth !== 0) {
    out.failures.push(`${mg.id} [${label}]: unbalanced canvas save/restore, depth ${ctx.depth} after one frame`);
  }
  return counter.n - before;
}

function slotsOfBand(band) {
  const i = cfg.bands.indexOf(band);
  const out = [];
  for (let k = 0; k < cfg.bandSlots; k++) out.push(i * cfg.bandSlots + k + 1);
  return out;
}

function entryFor(id, slot, seed) {
  const speed = cfg.gamesPerRun > 1 ? (slot - 1) / (cfg.gamesPerRun - 1) : 0;
  return {
    slot,
    index: slot - 1,
    id,
    band: MICROGAMES[id].band,
    speed,
    duration: cfg.duration.startSeconds
      + (cfg.duration.endSeconds - cfg.duration.startSeconds) * speed,
    seed,
    speedUpAfter: false,
  };
}

/** Advance a microgame to a time, optionally with a finger on the glass. */
function advanceTo(mg, st, targetT, input, touching, x, y) {
  let guard = 0;
  while (!st.done && st.t < targetT && guard < 2000) {
    if (touching) {
      if (guard === 0) inputPress(input, x, y);
      else inputMove(input, x, y);
    }
    mg.update(st, STEP, input);
    clearEdges(input);
    drainFx(st);
    guard += 1;
  }
}

export function renderSmoke({ verbose = false } = {}) {
  const out = { failures: [], cases: 0, steadyWorst: 0, worstId: '', rows: [] };

  for (const mg of MICROGAME_LIST) {
    let modGrads = 0;
    let modSteady = 0;

    for (const slot of slotsOfBand(mg.band)) {
      for (let variant = 0; variant < 3; variant++) {
        const seed = (mulberry32(slot * 7919 + variant * 104729 + mg.id.length)() * 0xffffffff) >>> 0;
        const counter = { n: 0, byKind: {} };

        /* -- locked (before the cue) ------------------------------------- */
        let st = mg.init(seed, tierOf(entryFor(mg.id, slot, seed), cfg));
        let input = createInput();
        tryRender(mg, st, `slot ${slot} locked`, counter, out);
        out.cases += 1;

        /* -- live, nobody touching -------------------------------------- */
        advanceTo(mg, st, st.cueAt + (st.deadline - st.cueAt) * 0.5, input, false, 0, 0);
        tryRender(mg, st, `slot ${slot} live/idle`, counter, out);
        out.cases += 1;

        /* -- STEADY STATE: the same live frame drawn again and again. The
              gradient cache must be warm, so this must allocate nothing. --- */
        const warm = { n: 0, byKind: {} };
        tryRender(mg, st, `slot ${slot} warm`, warm, out);
        const steady = { n: 0, byKind: {} };
        for (let f = 0; f < 8; f++) tryRender(mg, st, `slot ${slot} steady`, steady, out);
        out.cases += 9;
        const perFrame = steady.n / 8;
        if (perFrame > modSteady) modSteady = perFrame;

        /* -- live, finger down on the middle of the stage ---------------- */
        const st2 = mg.init(seed, tierOf(entryFor(mg.id, slot, seed), cfg));
        const in2 = createInput();
        advanceTo(mg, st2, st2.cueAt + 0.02, in2, false, 0, 0);
        advanceTo(mg, st2, st2.cueAt + (st2.deadline - st2.cueAt) * 0.6, in2, true, 50, 65);
        tryRender(mg, st2, `slot ${slot} live/touching`, counter, out);
        out.cases += 1;

        /* -- resolved: run it to the end, both ways --------------------- */
        const st3 = mg.init(seed, tierOf(entryFor(mg.id, slot, seed), cfg));
        const in3 = createInput();
        advanceTo(mg, st3, cfg.duration.startSeconds + 1, in3, false, 0, 0);
        tryRender(mg, st3, `slot ${slot} resolved/${st3.reason || 'none'}`, counter, out);
        out.cases += 1;

        // And a few frames PAST resolution — the orchestrator keeps drawing the
        // scene through the verdict beat and the breather.
        for (let f = 0; f < 30; f++) {
          mg.update(st3, STEP, in3);
          clearEdges(in3);
          drainFx(st3);
        }
        tryRender(mg, st3, `slot ${slot} post-resolve`, counter, out);
        out.cases += 1;

        /* -- a touch-resolved run (cleared or failed by input) ----------- */
        const st4 = mg.init(seed, tierOf(entryFor(mg.id, slot, seed), cfg));
        const in4 = createInput();
        advanceTo(mg, st4, st4.cueAt + 0.05, in4, false, 0, 0);
        inputPress(in4, 50, 100);
        mg.update(st4, STEP, in4);
        clearEdges(in4);
        inputRelease(in4, 50, 100);
        mg.update(st4, STEP, in4);
        clearEdges(in4);
        drainFx(st4);
        tryRender(mg, st4, `slot ${slot} after-touch`, counter, out);
        out.cases += 1;

        modGrads += counter.n;
        void input;
        void st;
      }
    }

    out.rows.push({ id: mg.id, band: mg.band, grads: modGrads, steady: modSteady });
    if (modSteady > out.steadyWorst) {
      out.steadyWorst = modSteady;
      out.worstId = mg.id;
    }
    if (modSteady > 0.001) {
      out.failures.push(`${mg.id}: ${modSteady.toFixed(2)} gradients built per frame in the steady state `
        + '— the per-instance cache is not being hit');
    }
  }

  if (verbose) {
    for (const r of out.rows) {
      console.log(`   ${r.id.padEnd(9)} ${r.band.padEnd(7)} first-frame gradients ${String(r.grads).padStart(4)} `
        + `· steady-state per frame ${r.steady.toFixed(2)}`);
    }
  }
  return out;
}

/* ─── Standalone entry point ─────────────────────────────── */
const invokedDirectly = process.argv[1] && process.argv[1].endsWith('render-smoke.mjs');
if (invokedDirectly) {
  console.log('Life Rush — render smoke');
  console.log(`  every microgame's shipped render(), all ${cfg.bandSlots} slots x 3 seeds x 7 states\n`);
  const r = renderSmoke({ verbose: true });
  console.log(`\n   ${r.cases} render calls, worst steady-state gradient rate `
    + `${r.steadyWorst.toFixed(2)}/frame (${r.worstId || 'n/a'})`);
  if (r.failures.length) {
    console.log('\nRENDER SMOKE: FAIL');
    for (const f of r.failures.slice(0, 40)) console.log(`  - ${f}`);
    if (r.failures.length > 40) console.log(`  ... and ${r.failures.length - 40} more`);
    process.exit(1);
  }
  console.log('\nRENDER SMOKE: PASS — every renderer runs in every state, '
    + 'save/restore balances, and the steady state allocates no gradients.');
  process.exit(0);
}
