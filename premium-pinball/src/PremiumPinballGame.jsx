// PremiumPinballGame.jsx — the canvas shell around the pure pinball engine.
//
// This file owns pixels, input and juice. It owns NO rules: the table geometry
// lives in table.js, the solver in physics.js and the run state machine in
// engine.js, all three free of React and the DOM so scripts/balance.mjs can
// drive the shipped game headlessly.
//
// Structure follows the house pattern used by the other games in this repo:
// every mutable value lives in a ref — a 120 Hz physics tick must never
// re-render React — module-level pure draw helpers, offscreen pre-rendered
// static art, and HUD numbers written straight to the DOM with textContent.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { COLORS, GAME_CONFIG } from './data.js';
import { BALANCE } from './kit/config.js';
import { createGameLoop } from './kit/loop.js';
import { createEffects, damp } from './kit/effects.js';
import { createAudio } from './kit/audio.js';
import { detectTier, effectBudget, fitCanvas, haptic } from './kit/device.js';
import { clamp } from './physics.js';
import {
  buildPaints,
  drawBall,
  drawBonusBand,
  drawBumper,
  drawFlipper,
  drawLaneLamps,
  drawPlunger,
  makeTableBitmap,
  TAU,
} from './render.js';
import {
  cancelCharge,
  createRun,
  releasePlunger,
  runStats,
  setFlipper,
  startCharge,
  stepRun,
} from './engine.js';

/* ─── Component ──────────────────────────────────────────── */
export default function PremiumPinballGame({ config, onWin, onLose }) {
  const cfg = config || GAME_CONFIG;

  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const scoreElRef = useRef(null);
  const timeElRef = useRef(null);
  const barElRef = useRef(null);
  const endTimerRef = useRef(null);
  const bannerTimerRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(Math.ceil(cfg.sessionSeconds));
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [ballsLeft, setBallsLeft] = useState(cfg.balls);
  const [bonusOn, setBonusOn] = useState(false);
  const [banner, setBanner] = useState(null);
  const [hint, setHint] = useState(true);

  // Latest callbacks without re-running the setup effect, which would restart
  // the run whenever App re-renders.
  const winRef = useRef(onWin);
  const loseRef = useRef(onLose);
  winRef.current = onWin;
  loseRef.current = onLose;

  const stateRef = useRef(null);
  if (stateRef.current === null) {
    stateRef.current = {
      run: null,
      time: 0,
      W: 400,
      H: 620,
      dpr: 1,
      scale: 1,
      offX: 0,
      offY: 0,
      tableBmp: null,
      paints: null,
      shadows: true,
      effects: null,
      audio: null,

      scoreShown: 0,
      shownScore: -1,
      shownTime: -1,
      shownBalls: -1,
      shownBonus: false,

      bumperFlash: null,
      laneFlash: null,

      trailX: null,
      trailY: null,
      trailMax: 0,
      trailHead: 0,
      trailCount: 0,
      trailClock: 0,

      tip: { x: 0, y: 0 },
      ended: false,
    };
  }

  const toggleMute = useCallback(() => {
    const s = stateRef.current;
    if (!s.audio) return;
    s.audio.unlock();
    const next = s.audio.toggleMute();
    setMuted(next);
    if (!next) s.audio.click();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return undefined;

    const s = stateRef.current;
    const ctx = canvas.getContext('2d');
    const tier = detectTier();
    const budget = effectBudget();
    const fx = createEffects();
    const audio = createAudio();

    s.effects = fx;
    s.audio = audio;
    s.shadows = budget.shadows;
    s.run = createRun(cfg, (Date.now() ^ 0x9e3779b9) >>> 0);
    s.bumperFlash = new Float32Array(s.run.table.bumpers.length);
    s.laneFlash = new Float32Array(s.run.table.lanes.length);
    s.trailMax = Math.max(3, budget.trailPoints || 3);
    s.trailX = new Float32Array(s.trailMax);
    s.trailY = new Float32Array(s.trailMax);

    const table = s.run.table;
    s.paints = buildPaints(ctx, cfg, table, s.H);

    /* --- canvas sizing ---------------------------------------------------
       The table is authored at a fixed 400x640 and letterboxed, so the
       playfield is geometrically identical on every handset. A pinball table
       whose flipper gap scaled with the viewport would be a different game on
       a different phone, and the balance numbers would mean nothing. */
    const fit = () => {
      const w = Math.max(260, wrap.clientWidth || 380);
      const h = Math.max(380, wrap.clientHeight || 600);
      if (w === s.W && h === s.H && s.tableBmp) return;
      s.dpr = fitCanvas(canvas, w, h, 2);
      s.W = w;
      s.H = h;
      s.scale = Math.min(w / cfg.table.W, h / cfg.table.H);
      s.offX = (w - cfg.table.W * s.scale) / 2;
      s.offY = (h - cfg.table.H * s.scale) / 2;
      // Rebuilt here, not once at mount: the backdrop gradient is sized in
      // canvas pixels and the canvas height changes with the viewport.
      s.paints = buildPaints(ctx, cfg, table, h);
      s.tableBmp = makeTableBitmap(table, cfg, s.scale, s.dpr, s.shadows && tier !== 'low');
    };
    fit();

    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fit) : null;
    ro?.observe(wrap);
    window.addEventListener('orientationchange', fit);

    /* --- run end ---------------------------------------------------------- */
    const finish = (won) => {
      if (s.ended) return;
      s.ended = true;
      const stats = runStats(s.run);
      const bx = table.cx;
      const by = 300;

      if (won) {
        audio.victory();
        haptic('success');
        fx.burst({
          x: bx, y: by, count: cfg.fx.winParticles, color: COLORS.gold,
          speed: 330, spread: TAU, size: 5, life: 1.1, gravity: 460, drag: 0.93,
        });
        fx.burst({
          x: bx, y: by - 20, count: cfg.fx.winParticles, color: COLORS.greenLt,
          speed: 240, spread: TAU, size: 4, life: 1.2, gravity: 400, drag: 0.94,
        });
        fx.floatText(bx, by - 54, 'COVER SECURED', COLORS.goldLt, 18);
      } else {
        audio.failure();
        haptic('failure');
        fx.addShake(cfg.fx.drainShake);
        fx.burst({
          x: bx, y: by, count: cfg.fx.loseParticles, color: COLORS.danger,
          speed: 250, spread: TAU, size: 4, life: 0.9, gravity: 580, drag: 0.9,
        });
        // A run that ended on a watchdog is not a lapse and must not say so.
        const cause = s.run.endCause;
        fx.floatText(bx, by - 46,
          cause === 'timeout' ? 'TIME UP'
            : (cause === 'stuck' || cause === 'timeoutBall') ? 'BALL HELD — RUN ENDED'
              : 'COVER LAPSED',
          COLORS.dangerLt, 17);
      }

      endTimerRef.current = setTimeout(() => {
        (won ? winRef.current : loseRef.current)?.(stats);
      }, cfg.hud.endBeatMs);
    };

    const showBanner = (kind, label) => {
      setBanner({ id: s.time, kind, label });
      clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => setBanner(null), cfg.fx.bannerSeconds * 1000);
    };

    /* --- engine events -> juice ------------------------------------------- */
    const drainEvents = () => {
      const ring = s.run.events;
      for (let i = 0; i < ring.count; i++) {
        const e = ring.items[i];
        switch (e.type) {
          case 'bumper': {
            s.bumperFlash[e.index] = cfg.fx.bumperFlashSeconds;
            audio.coin();
            haptic('light');
            fx.addShake(cfg.fx.bumperShake);
            fx.burst({
              x: e.x, y: e.y, count: cfg.fx.bumperParticles,
              color: table.bumpers[e.index].colorLt, speed: 170, spread: TAU,
              size: 2.8, life: 0.5, gravity: 260, drag: 0.9,
            });
            fx.floatText(e.x, e.y - 12, `+${e.points}`,
              e.value > 1 ? COLORS.greenLt : COLORS.goldLt, e.value > 1 ? 15 : 13);
            break;
          }
          case 'sling':
            audio.tick();
            fx.burst({
              x: e.x, y: e.y, count: cfg.fx.slingParticles, color: COLORS.orangeLt,
              speed: 150, spread: Math.PI, angle: -Math.PI / 2, size: 2.4, life: 0.35,
              gravity: 300, drag: 0.9,
            });
            fx.floatText(e.x, e.y - 10, `+${e.points}`, COLORS.orangeLt, 12);
            break;
          case 'rollover':
            s.laneFlash[e.index] = cfg.fx.laneFlashSeconds;
            audio.powerUp();
            haptic('light');
            fx.burst({
              x: e.x, y: e.y, count: cfg.fx.laneParticles, color: COLORS.goldLt,
              speed: 160, spread: TAU, size: 2.6, life: 0.55, gravity: 200, drag: 0.91,
            });
            fx.floatText(e.x, e.y - 16, `+${e.points}`, COLORS.goldLt, 14);
            break;
          case 'allGoals':
            audio.victory();
            haptic('success');
            fx.addShake(cfg.fx.bumperShake * 2);
            fx.burst({
              x: e.x, y: e.y, count: cfg.fx.bonusParticles, color: COLORS.gold,
              speed: 260, spread: TAU, size: 4, life: 0.9, gravity: 340, drag: 0.93,
            });
            fx.floatText(e.x, e.y - 26, `ALL GOALS +${e.points}`, COLORS.goldLt, 16);
            showBanner('goals', 'All three goals funded');
            break;
          case 'bonus':
            audio.powerUp();
            haptic('success');
            fx.addShake(cfg.fx.bumperShake * 1.6);
            fx.burst({
              x: e.x, y: e.y, count: cfg.fx.bonusParticles, color: COLORS.greenLt,
              speed: 230, spread: TAU, size: 3.4, life: 0.85, gravity: 240, drag: 0.92,
            });
            fx.floatText(e.x, e.y + 34, 'BONUS SECURE x2', COLORS.greenLt, 16);
            showBanner('bonus', `Bonus Secure — x${cfg.bonus.multiplier} for ${cfg.bonus.seconds}s`);
            setBonusOn(true);
            break;
          case 'bonusEnd':
            setBonusOn(false);
            break;
          case 'flipper':
            if (e.value > 260) {
              audio.hit();
              haptic('light');
              fx.burst({
                x: e.x, y: e.y, count: cfg.fx.flipParticles, color: COLORS.orangeLt,
                speed: 120, spread: Math.PI, angle: -Math.PI / 2, size: 2, life: 0.28,
                gravity: 320, drag: 0.9,
              });
            }
            break;
          case 'ballSave':
            // Cover Note. Deliberately not styled as a loss — no shake, no
            // failure sting — because nothing was lost.
            audio.powerUp();
            haptic('success');
            fx.burst({
              x: e.x, y: clamp(e.y, 40, cfg.table.H - 40), count: cfg.fx.bonusParticles,
              color: COLORS.greenLt, speed: 210, spread: Math.PI, angle: -Math.PI / 2,
              size: 3.2, life: 0.8, gravity: 320, drag: 0.92,
            });
            fx.floatText(e.x, cfg.table.drainY - 30, 'COVER NOTE — BALL SAVED', COLORS.greenLt, 15);
            showBanner('save', 'Cover Note — that one is on us');
            setBonusOn(false);
            break;

          case 'drain': {
            // A watchdog retirement is not a drain: it costs no ball (engine),
            // so it must not read as one either. The HUD ball dots and this
            // copy are both driven from e.value, which the engine leaves
            // untouched for a watchdog.
            const held = e.cause !== 'drain';
            if (held) audio.click();
            else audio.failure();
            haptic(held ? 'light' : 'failure');
            fx.addShake(held ? cfg.fx.drainShake * 0.4 : cfg.fx.drainShake);
            if (!held) fx.addHitStop(budget.hitStopSeconds > 0 ? cfg.fx.hitStopSeconds : 0);
            fx.burst({
              x: e.x, y: clamp(e.y, 40, cfg.table.H - 40), count: cfg.fx.drainParticles,
              color: held ? COLORS.gold : COLORS.danger,
              speed: 220, spread: Math.PI, angle: -Math.PI / 2,
              size: 3.2, life: 0.7, gravity: 520, drag: 0.9,
            });
            fx.floatText(
              e.x, cfg.table.drainY - 30,
              held ? 'BALL HELD — SERVED FRESH (NO BALL LOST)' : 'BALL LOST',
              held ? COLORS.goldLt : COLORS.dangerLt, held ? 13 : 15,
            );
            setBallsLeft(Math.max(0, e.value));
            setBonusOn(false);
            break;
          }
          case 'serve':
            audio.click();
            setHint(true);
            break;
          case 'launch':
            audio.tick();
            fx.burst({
              x: e.x, y: e.y, count: cfg.fx.flipParticles, color: COLORS.goldLt,
              speed: 130, spread: Math.PI * 0.7, angle: Math.PI / 2, size: 2.2, life: 0.3,
              gravity: 300, drag: 0.9,
            });
            break;
          case 'end':
            finish(e.value === 1);
            break;
          default:
            break;
        }
      }
    };

    /* --- physics ---------------------------------------------------------- */
    const update = (dt) => {
      fx.update(dt);
      if (fx.isFrozen()) return;

      s.time += dt;
      s.scoreShown = damp(s.scoreShown, s.run.score, BALANCE.scoring.counterLerpPerSecond, dt);

      for (let i = 0; i < s.bumperFlash.length; i++) {
        if (s.bumperFlash[i] > 0) s.bumperFlash[i] = Math.max(0, s.bumperFlash[i] - dt);
      }
      for (let i = 0; i < s.laneFlash.length; i++) {
        if (s.laneFlash[i] > 0) s.laneFlash[i] = Math.max(0, s.laneFlash[i] - dt);
      }

      if (s.ended) return;
      stepRun(s.run, dt);
      drainEvents();

      // Trail sampled after the step so the newest point is where the ball is.
      if (s.run.phase === 'play') {
        s.trailClock += dt;
        if (s.trailClock >= cfg.ball.trailSeconds) {
          s.trailClock = 0;
          s.trailX[s.trailHead] = s.run.ball.x;
          s.trailY[s.trailHead] = s.run.ball.y;
          s.trailHead = (s.trailHead + 1) % s.trailMax;
          if (s.trailCount < s.trailMax) s.trailCount += 1;
        }
      } else {
        s.trailCount = 0;
        s.trailHead = 0;
      }
    };

    /* --- rendering -------------------------------------------------------- */
    const render = () => {
      if (!s.tableBmp) return;
      const run = s.run;
      const { W, H } = s;
      ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
      ctx.fillStyle = s.paints.backdrop;
      ctx.fillRect(0, 0, W, H);

      ctx.save();
      ctx.translate(s.offX, s.offY);
      ctx.scale(s.scale, s.scale);

      fx.beginCamera(ctx);
      ctx.drawImage(s.tableBmp, 0, 0, cfg.table.W, cfg.table.H);

      const time = s.time;
      drawLaneLamps(ctx, table, cfg, run.lanes, s.laneFlash, time, s.shadows);
      if (run.bonusTimer > 0) drawBonusBand(ctx, table, cfg, run.bonusTimer, time);

      for (let i = 0; i < table.bumpers.length; i++) {
        drawBumper(
          ctx, table.bumpers[i], cfg, run.ballGoals[i],
          s.bumperFlash[i] / cfg.fx.bumperFlashSeconds, time, s.shadows, s.paints,
        );
      }

      for (let i = 0; i < table.flippers.length; i++) {
        drawFlipper(ctx, table.flippers[i], run.flippers[i].angle, s.tip, s.shadows, s.paints);
      }

      drawPlunger(ctx, s, cfg, time, s.paints);
      if (run.phase === 'play' || run.phase === 'ready') drawBall(ctx, s, cfg, s.paints);

      fx.draw(ctx);
      fx.endCamera(ctx);
      ctx.restore();

      /* --- HUD written straight to the DOM ---------------------------------
         The score counter changes many times a second; routing it through React
         state would re-render the tree every frame. textContent costs nothing. */
      const shown = Math.round(s.scoreShown);
      if (shown !== s.shownScore) {
        s.shownScore = shown;
        if (scoreElRef.current) scoreElRef.current.textContent = shown.toLocaleString();
        if (barElRef.current) {
          barElRef.current.style.width = `${clamp((shown / cfg.scoring.targetScore) * 100, 0, 100)}%`;
        }
      }
      const whole = Math.ceil(run.clock);
      if (whole !== s.shownTime) {
        s.shownTime = whole;
        if (timeElRef.current) timeElRef.current.textContent = `${whole}s`;
        setTimeLeft(whole);
      }
      if (run.ballsLeft !== s.shownBalls) {
        s.shownBalls = run.ballsLeft;
        setBallsLeft(run.ballsLeft);
      }
      const bonus = run.bonusTimer > 0;
      if (bonus !== s.shownBonus) {
        s.shownBonus = bonus;
        setBonusOn(bonus);
      }
    };

    /* --- input -----------------------------------------------------------
       Deliberately NOT kit/input.js: createInput is single-pointer by design
       ("Ignore secondary touches; these are single-pointer games"), and pinball
       needs both flippers at once. Everything else — loop, effects, audio,
       device profiling — still comes from the kit. */
    const pointers = new Map(); // pointerId -> 'left' | 'right' | 'plunger'

    const toLogicalX = (clientX) => {
      const rect = canvas.getBoundingClientRect();
      const cssX = ((clientX - rect.left) / rect.width) * s.W;
      return (cssX - s.offX) / s.scale;
    };

    // A role is still held if ANY live pointer or key owns it, so releasing one
    // of two fingers on the same flipper does not drop it.
    const stillHeld = (role) => {
      for (const v of pointers.values()) if (v === role) return true;
      for (const v of keysHeld.values()) if (v === role) return true;
      return false;
    };

    const press = (role) => {
      if (role === 'plunger') startCharge(s.run);
      else {
        setFlipper(s.run, role, true);
        s.audio?.click();
      }
    };

    const lift = (role) => {
      if (role === 'plunger') {
        if (releasePlunger(s.run) >= 0) setHint(false);
      } else if (!stillHeld(role)) {
        setFlipper(s.run, role, false);
      }
    };

    const onPointerDown = (e) => {
      if (s.ended) return;
      canvas.setPointerCapture?.(e.pointerId);
      audio.unlock();
      const role = s.run.phase === 'ready'
        ? 'plunger'
        : (toLogicalX(e.clientX) < s.run.table.cx ? 'left' : 'right');
      pointers.set(e.pointerId, role);
      press(role);
      e.preventDefault();
    };

    const onPointerUp = (e) => {
      const role = pointers.get(e.pointerId);
      if (role === undefined) return;
      pointers.delete(e.pointerId);
      lift(role);
      canvas.releasePointerCapture?.(e.pointerId);
      e.preventDefault();
    };

    // pointercancel and lostpointercapture both mean "this pointer is gone and
    // you will get no pointerup for it". Without the second one, anything that
    // steals capture mid-press — a browser gesture, the element being reflowed
    // — leaves the flipper stuck up for the rest of the ball.
    const onPointerLost = (e) => {
      const role = pointers.get(e.pointerId);
      if (role === undefined) return;
      pointers.delete(e.pointerId);
      if (role !== 'plunger' && !stillHeld(role)) setFlipper(s.run, role, false);
    };

    const blockGesture = (e) => e.preventDefault();
    const listenerOpts = { passive: false };
    canvas.addEventListener('pointerdown', onPointerDown, listenerOpts);
    canvas.addEventListener('pointerup', onPointerUp, listenerOpts);
    canvas.addEventListener('pointercancel', onPointerLost, listenerOpts);
    canvas.addEventListener('lostpointercapture', onPointerLost, listenerOpts);
    canvas.addEventListener('contextmenu', blockGesture);
    canvas.addEventListener('dragstart', blockGesture);

    // Desktop parity so the game is playable (and reviewable) without a touch
    // screen. Repeat events are ignored so a held key does not re-trigger.
    const keyRole = (code) => {
      if (code === 'ArrowLeft' || code === 'KeyA') return 'left';
      if (code === 'ArrowRight' || code === 'KeyD') return 'right';
      if (code === 'Space' || code === 'ArrowDown' || code === 'KeyS') return 'plunger';
      return null;
    };

    // code -> role LATCHED AT KEYDOWN, mirroring the pointer map.
    //
    // Deriving the role again at keyup reads the phase as it is THEN, which is
    // not necessarily the phase the key was pressed in. Hold ArrowLeft during
    // play, drain, and the engine serves the next ball into 'ready'; the keyup
    // would resolve to 'plunger', firing the new ball at zero power and leaving
    // the left flipper raised for the rest of the session with no way to lower
    // it. Latching makes press and release agree by construction.
    const keysHeld = new Map();
    const onKeyDown = (e) => {
      const key = keyRole(e.code);
      if (!key || s.ended) return;
      e.preventDefault();
      if (keysHeld.has(e.code)) return;
      const role = s.run.phase === 'ready' ? 'plunger' : key;
      keysHeld.set(e.code, role);
      audio.unlock();
      press(role);
    };
    const onKeyUp = (e) => {
      const role = keysHeld.get(e.code);
      if (role === undefined) return;
      e.preventDefault();
      keysHeld.delete(e.code);
      lift(role);
    };
    /** Drop every held control. Used by pause and by losing window focus. */
    const releaseAllInputs = () => {
      pointers.clear();
      keysHeld.clear();
      setFlipper(s.run, 'left', false);
      setFlipper(s.run, 'right', false);
      // Also abandon a plunger charge. Without this, blurring mid-charge leaves
      // the meter filling with nobody touching it, and the 6 s auto-launch then
      // fires at its own 0.5 power under a meter painted full.
      cancelCharge(s.run);
    };
    // blur, not just visibilitychange: alt-tabbing or focusing the address bar
    // never delivers the keyup, so without this the flipper stays up.
    const onBlur = () => releaseAllInputs();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    /* --- loop -------------------------------------------------------------
       No sessionSeconds: engine.js owns the clock so the browser and the
       balance sim count the same time. The loop still pauses on visibility
       change, and a paused loop never calls update(), so the engine clock stops
       with it. */
    const loop = createGameLoop({
      update,
      render,
      stepMode: 'fixed',
      onPause: (isPaused) => {
        setPaused(isPaused);
        audio.setPaused(isPaused);
        // Drop pointer AND keyboard holds: the events that would have released
        // them are exactly the ones a backgrounded tab never delivers.
        if (isPaused) releaseAllInputs();
      },
    });
    loop.start();

    return () => {
      loop.stop();
      ro?.disconnect();
      window.removeEventListener('orientationchange', fit);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      canvas.removeEventListener('pointerdown', onPointerDown, listenerOpts);
      canvas.removeEventListener('pointerup', onPointerUp, listenerOpts);
      canvas.removeEventListener('pointercancel', onPointerLost, listenerOpts);
      canvas.removeEventListener('lostpointercapture', onPointerLost, listenerOpts);
      canvas.removeEventListener('contextmenu', blockGesture);
      canvas.removeEventListener('dragstart', blockGesture);
      clearTimeout(endTimerRef.current);
      clearTimeout(bannerTimerRef.current);
      pointers.clear();
      keysHeld.clear();
      fx.reset();
      audio.destroy();
      s.effects = null;
      s.audio = null;
    };
    // Runs once per mount. App remounts the component (key={gameKey}) to replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lowTime = timeLeft <= cfg.hud.lowTimeSeconds;

  return (
    <div style={styles.root}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={wrapRef} style={styles.stage} className="pp-stage">
        <canvas ref={canvasRef} style={styles.canvas} />

        {/* HUD ------------------------------------------------------- */}
        <div style={styles.hudTop}>
          <div style={styles.pill}>
            <span style={styles.pillLabel}>Score</span>
            <span ref={scoreElRef} style={styles.pillValue}>0</span>
          </div>

          <div style={styles.ballRow}>
            {Array.from({ length: cfg.balls }).map((_, i) => (
              <span
                key={i}
                style={{
                  ...styles.ballDot,
                  background: i < ballsLeft
                    ? 'radial-gradient(circle at 32% 30%, #fff, #7FA8D8)'
                    : 'rgba(255,255,255,0.12)',
                  boxShadow: i < ballsLeft ? '0 0 6px rgba(191,216,245,0.7)' : 'none',
                }}
              />
            ))}
          </div>

          <div style={{ ...styles.pill, alignItems: 'flex-end' }}>
            <span style={styles.pillLabel}>Time</span>
            <span
              ref={timeElRef}
              style={{
                ...styles.pillValue,
                color: lowTime ? COLORS.orangeLt : '#fff',
                animation: lowTime ? 'ppPulse 0.9s ease-in-out infinite' : 'none',
              }}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        <div style={styles.barTrack}>
          <div ref={barElRef} style={styles.barFill} />
          <span style={styles.barTarget}>{cfg.scoring.targetScore.toLocaleString()}</span>
        </div>

        {bonusOn && (
          <div style={styles.bonusChip} className="pp-bonus">
            BONUS SECURE &times;{cfg.bonus.multiplier}
          </div>
        )}

        {banner && (
          <div key={banner.id} style={styles.banner} className="pp-banner">
            {banner.label}
          </div>
        )}

        {hint && (
          <div style={styles.hint} className="pp-hint">
            Hold anywhere to charge &middot; release to launch
            <span style={styles.hintSub}>Then tap LEFT / RIGHT to flip</span>
          </div>
        )}

        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? 'Unmute' : 'Mute'}
          style={styles.muteBtn}
        >
          {muted ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H3v6h3l5 4z" />
              <path d="m17 9 4 6M21 9l-4 6" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H3v6h3l5 4z" />
              <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
            </svg>
          )}
        </button>

        {paused && (
          <div style={styles.pauseVeil}>
            <span style={styles.pauseText}>PAUSED</span>
            <span style={styles.pauseSub}>Return to the tab to resume</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes ppPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
@keyframes ppBannerIn {
  0%   { opacity: 0; transform: translate(-50%, 12px) scale(0.9); }
  16%  { opacity: 1; transform: translate(-50%, 0) scale(1.04); }
  26%  { transform: translate(-50%, 0) scale(1); }
  82%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -8px) scale(0.98); }
}
@keyframes ppChip { 0%,100% { box-shadow: 0 0 0 0 rgba(40,167,69,0.5); } 50% { box-shadow: 0 0 0 7px rgba(40,167,69,0); } }
@keyframes ppHint { 0%,100% { opacity: 0.62; } 50% { opacity: 1; } }
@keyframes ppStageIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: none; } }
.pp-stage  { animation: ppStageIn 380ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-banner { animation: ppBannerIn 1500ms ease-out both; }
.pp-bonus  { animation: ppChip 1.4s ease-out infinite; }
.pp-hint   { animation: ppHint 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-stage, .pp-banner, .pp-bonus, .pp-hint { animation: none !important; }
}
`;

const glass = {
  background: 'rgba(11,18,33,0.55)',
  border: '1px solid rgba(255,255,255,0.14)',
  WebkitBackdropFilter: 'blur(10px)',
  backdropFilter: 'blur(10px)',
};

const styles = {
  root: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'center',
    padding: '10px 10px 12px',
  },
  stage: {
    position: 'relative',
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    border: '1.5px solid rgba(255,255,255,0.12)',
    boxShadow: '0 18px 46px rgba(0,0,0,0.5)',
    touchAction: 'none',
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%',
    touchAction: 'none',
  },
  hudTop: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
    pointerEvents: 'none',
  },
  pill: {
    ...glass,
    display: 'flex',
    flexDirection: 'column',
    padding: '5px 11px',
    borderRadius: 12,
    minWidth: 62,
  },
  pillLabel: {
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: '0.16em',
    textTransform: 'uppercase',
    color: 'rgba(255,255,255,0.5)',
  },
  pillValue: {
    fontSize: 17,
    fontWeight: 900,
    color: '#fff',
    lineHeight: 1.15,
    fontVariantNumeric: 'tabular-nums',
  },
  ballRow: {
    ...glass,
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '8px 10px',
    borderRadius: 999,
    marginTop: 2,
  },
  ballDot: {
    width: 9,
    height: 9,
    borderRadius: '50%',
    display: 'block',
  },
  barTrack: {
    position: 'absolute',
    top: 62,
    left: 12,
    right: 12,
    height: 5,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.1)',
    overflow: 'visible',
    pointerEvents: 'none',
  },
  barFill: {
    width: '0%',
    height: '100%',
    borderRadius: 3,
    background: `linear-gradient(90deg, ${COLORS.blueLt}, ${COLORS.gold} 65%, ${COLORS.green})`,
    boxShadow: '0 0 8px rgba(255,200,69,0.55)',
    transition: 'width 120ms linear',
  },
  barTarget: {
    position: 'absolute',
    right: 0,
    top: 8,
    fontSize: 7.5,
    fontWeight: 900,
    letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.42)',
  },
  bonusChip: {
    position: 'absolute',
    top: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '4px 12px',
    borderRadius: 999,
    background: 'rgba(40,167,69,0.24)',
    border: '1px solid rgba(74,222,128,0.6)',
    color: COLORS.greenLt,
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: '0.1em',
    pointerEvents: 'none',
  },
  banner: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    padding: '9px 18px',
    borderRadius: 14,
    background: 'rgba(11,18,33,0.82)',
    border: '1px solid rgba(255,200,69,0.55)',
    color: COLORS.goldLt,
    fontSize: 13,
    fontWeight: 900,
    letterSpacing: '0.03em',
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
  },
  hint: {
    position: 'absolute',
    bottom: 16,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 3,
    padding: '8px 16px',
    borderRadius: 12,
    background: 'rgba(11,18,33,0.66)',
    border: '1px solid rgba(255,255,255,0.14)',
    color: '#fff',
    fontSize: 11.5,
    fontWeight: 800,
    textAlign: 'center',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
  hintSub: {
    fontSize: 9.5,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
  },
  muteBtn: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    // 44x44 is the WCAG 2.5.5 / platform-HIG minimum touch target, and it is
    // what GAME_STANDARD section 6 asks for.
    width: 44,
    height: 44,
    borderRadius: 12,
    border: 'none',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.75)',
    cursor: 'pointer',
    ...glass,
  },
  pauseVeil: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    background: 'rgba(6,18,41,0.72)',
    WebkitBackdropFilter: 'blur(4px)',
    backdropFilter: 'blur(4px)',
  },
  pauseText: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: '0.18em',
    color: '#fff',
  },
  pauseSub: {
    fontSize: 11,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.6)',
  },
};
