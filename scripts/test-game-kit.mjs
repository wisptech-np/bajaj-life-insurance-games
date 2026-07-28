// Behaviour tests for shared/game-kit/loop.js — no framework required.
//
//   node scripts/test-game-kit.mjs
//
// Covers the regressions that broke guardian-shelter:
//   - pausing must not suppress rendering (a stale canvas looks like a crash)
//   - window blur must NOT pause (only visibilitychange corresponds to rAF halting)
//   - 'variable' step mode must call update once per frame with the frame delta
//   - the session clock must hold while a round-complete panel is open
//   - the session clock must not drain while the tab is hidden

import assert from 'node:assert/strict';

// ---- Minimal DOM harness ----------------------------------------------------
let now = 0;
let rafQueue = [];
const listeners = { document: {}, window: {} };

globalThis.performance = { now: () => now };
globalThis.requestAnimationFrame = (fn) => {
  rafQueue.push(fn);
  return rafQueue.length;
};
globalThis.cancelAnimationFrame = () => {};
globalThis.document = {
  visibilityState: 'visible',
  addEventListener: (t, fn) => ((listeners.document[t] ||= []).push(fn)),
  removeEventListener: (t, fn) => {
    listeners.document[t] = (listeners.document[t] || []).filter((f) => f !== fn);
  },
};
globalThis.window = {
  addEventListener: (t, fn) => ((listeners.window[t] ||= []).push(fn)),
  removeEventListener: (t, fn) => {
    listeners.window[t] = (listeners.window[t] || []).filter((f) => f !== fn);
  },
};

const fire = (target, type) => (listeners[target][type] || []).slice().forEach((fn) => fn());

/** Advance the fake clock by ms and run exactly one frame. */
function tick(ms) {
  now += ms;
  const queued = rafQueue;
  rafQueue = [];
  queued.forEach((fn) => fn(now));
}

const { createGameLoop } = await import('../shared/game-kit/loop.js');

let failures = 0;
function test(name, fn) {
  // Reset harness between tests.
  now = 0;
  rafQueue = [];
  listeners.document = {};
  listeners.window = {};
  document.visibilityState = 'visible';
  try {
    fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL  ${name}`);
    console.error(`        ${err.message}`);
  }
}

console.log('game-kit loop behaviour\n');

test('variable mode calls update once per frame with the frame delta', () => {
  const deltas = [];
  const loop = createGameLoop({
    stepMode: 'variable',
    update: (dt) => deltas.push(dt),
    render: () => {},
  });
  loop.start();
  tick(16); // first frame consumes the start timestamp
  tick(16);
  tick(16);
  loop.stop();
  assert.equal(deltas.length, 3, `expected 3 update calls, got ${deltas.length}`);
  // 16ms frames => ~0.016s each, never the fixed 1/120 step.
  assert.ok(Math.abs(deltas[1] - 0.016) < 1e-9, `expected ~0.016s delta, got ${deltas[1]}`);
});

test('fixed mode sub-steps a 16ms frame into 1/120s ticks', () => {
  const deltas = [];
  const loop = createGameLoop({
    stepMode: 'fixed',
    update: (dt) => deltas.push(dt),
    render: () => {},
  });
  loop.start();
  tick(16);
  tick(16);
  loop.stop();
  assert.ok(deltas.length >= 2, `expected sub-stepping, got ${deltas.length} calls`);
  assert.ok(deltas.every((d) => Math.abs(d - 1 / 120) < 1e-9), 'every fixed step must equal 1/120');
});

test('render still runs while paused (stale canvas looks like a crash)', () => {
  let renders = 0;
  let updates = 0;
  const loop = createGameLoop({
    stepMode: 'variable',
    update: () => (updates += 1),
    render: () => (renders += 1),
  });
  loop.start();
  tick(16);
  const rendersBefore = renders;
  const updatesBefore = updates;

  loop.setPaused(true);
  tick(16);
  tick(16);

  assert.ok(renders > rendersBefore, 'render must keep being called while paused');
  assert.equal(updates, updatesBefore, 'update must NOT be called while paused');
  loop.stop();
});

test('window blur does NOT pause the loop', () => {
  let paused = null;
  let updates = 0;
  const loop = createGameLoop({
    stepMode: 'variable',
    update: () => (updates += 1),
    render: () => {},
    onPause: (p) => (paused = p),
  });
  loop.start();
  tick(16);

  fire('window', 'blur'); // must be ignored — devtools/second monitor/address bar
  const before = updates;
  tick(16);

  assert.equal(paused, null, 'blur must not trigger onPause');
  assert.ok(updates > before, 'loop must keep updating after a blur');
  loop.stop();
});

test('visibilitychange to hidden pauses, and the session clock holds', () => {
  const ticks = [];
  const loop = createGameLoop({
    stepMode: 'variable',
    sessionSeconds: 10,
    update: () => {},
    render: () => {},
    onTick: (r) => ticks.push(r),
  });
  loop.start();
  tick(16);
  tick(1000); // ~1s of real play
  const afterPlay = loop.getRemaining();
  assert.ok(afterPlay < 10, 'clock should advance during play');

  document.visibilityState = 'hidden';
  fire('document', 'visibilitychange');
  tick(5000); // 5s away
  assert.equal(loop.getRemaining(), afterPlay, 'clock must not drain while hidden');

  document.visibilityState = 'visible';
  fire('document', 'visibilitychange');
  tick(16);
  assert.ok(loop.getRemaining() < afterPlay, 'clock resumes after returning');
  loop.stop();
});

test('shouldTickClock=false holds the countdown (round-complete panel)', () => {
  let panelOpen = false;
  const loop = createGameLoop({
    stepMode: 'variable',
    sessionSeconds: 10,
    update: () => {},
    render: () => {},
    shouldTickClock: () => !panelOpen,
  });
  loop.start();
  tick(16);
  tick(500);
  const held = loop.getRemaining();

  panelOpen = true;
  tick(3000);
  assert.equal(loop.getRemaining(), held, 'clock must hold while the panel is open');

  panelOpen = false;
  tick(500);
  assert.ok(loop.getRemaining() < held, 'clock resumes when the panel closes');
  loop.stop();
});

test('onExpire fires exactly once', () => {
  let expires = 0;
  const loop = createGameLoop({
    stepMode: 'variable',
    sessionSeconds: 0.05,
    update: () => {},
    render: () => {},
    onExpire: () => (expires += 1),
  });
  loop.start();
  tick(16);
  for (let i = 0; i < 20; i++) tick(16);
  assert.equal(expires, 1, `onExpire should fire once, fired ${expires}`);
  loop.stop();
});

console.log(`\n${failures === 0 ? 'All tests passed.' : `${failures} test(s) failed.`}`);
process.exit(failures === 0 ? 0 : 1);
