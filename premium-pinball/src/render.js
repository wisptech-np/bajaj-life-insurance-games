// render.js — every canvas painter for Premium Pinball.
//
// Split out of the component on purpose. Nothing here imports React, so
// scripts/render-smoke.mjs can run the whole paint path under Node against a
// recording stub context: `pnpm build` only proves the JSX compiles, it cannot
// catch a misspelled canvas call or a reference to a config key that does not
// exist. Those only surface on a real device otherwise.
//
// `document` is touched in exactly one place (offscreen()), which the smoke
// test stubs.

import { COLORS } from './data.js';
import { flipperTip } from './table.js';

/* ─── Drawing helpers ────────────────────────────────────── */

export const TAU = Math.PI * 2;
const FONT = "'Poppins', 'Plus Jakarta Sans', system-ui, sans-serif";

// A plain <canvas>, not OffscreenCanvas: the house pattern, and OffscreenCanvas
// 2D still has gaps outside Chromium that are not worth discovering on a
// customer's phone.
export function offscreen(w, h) {
  const cv = document.createElement('canvas');
  cv.width = Math.max(1, w);
  cv.height = Math.max(1, h);
  return cv;
}

/** fillText with manual tracking — ctx.letterSpacing is Chromium-only. */
export function trackedText(ctx, text, cx, y, spacing) {
  let total = 0;
  for (let i = 0; i < text.length; i++) total += ctx.measureText(text[i]).width + spacing;
  total -= spacing;
  let x = cx - total / 2;
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < text.length; i++) {
    ctx.fillText(text[i], x, y);
    x += ctx.measureText(text[i]).width + spacing;
  }
  ctx.textAlign = align;
}

export function roundedCapsule(ctx, x1, y1, x2, y2, r) {
  ctx.beginPath();
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 2;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

/**
 * Pre-render everything that never moves: the cabinet floor, every wall, the
 * lane dividers, the slingshot bodies, the bumper skirts and all the lettering.
 * Rebuilt only when the canvas is resized — repainting ~40 stroked segments and
 * a dozen gradients every frame is exactly the kind of work that costs a
 * mid-range Android its frame budget.
 */
export function makeTableBitmap(table, cfg, scale, dpr, shadows) {
  const t = cfg.table;
  const k = scale * dpr;
  const cv = offscreen(Math.round(t.W * k), Math.round(t.H * k));
  const ctx = cv.getContext('2d');
  ctx.setTransform(k, 0, 0, k, 0, 0);

  /* --- cabinet floor --- */
  const floor = ctx.createLinearGradient(0, 0, 0, t.H);
  floor.addColorStop(0, '#0d2a5c');
  floor.addColorStop(0.45, '#0a1e42');
  floor.addColorStop(1, '#061229');
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.roundRect(t.pfL - 8, t.top - 8, (t.laneR + 8) - (t.pfL - 8), (t.laneFloorY + 8) - (t.top - 8), 30);
  ctx.fill();

  // Upper glow behind the goal cluster.
  const glow = ctx.createRadialGradient(table.cx, 240, 10, table.cx, 240, 210);
  glow.addColorStop(0, 'rgba(62,132,224,0.28)');
  glow.addColorStop(1, 'rgba(62,132,224,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(t.pfL - 8, t.top - 8, t.laneR - t.pfL + 16, t.laneFloorY - t.top + 16);

  /* --- plunger lane channel --- */
  const laneGrad = ctx.createLinearGradient(t.laneL, 0, t.laneR, 0);
  laneGrad.addColorStop(0, 'rgba(0,0,0,0.34)');
  laneGrad.addColorStop(0.5, 'rgba(0,0,0,0.16)');
  laneGrad.addColorStop(1, 'rgba(0,0,0,0.34)');
  ctx.fillStyle = laneGrad;
  ctx.fillRect(t.laneL, t.gateY, t.laneR - t.laneL, t.laneFloorY - t.gateY);

  /* --- drain mouth --- */
  const f = cfg.flipper;
  const tipL = table.cx - f.pivotDX + f.length * Math.cos(f.restAngle);
  const tipR = table.cx + f.pivotDX - f.length * Math.cos(f.restAngle);
  const drain = ctx.createLinearGradient(0, t.drainY - 40, 0, t.laneFloorY);
  drain.addColorStop(0, 'rgba(239,68,68,0)');
  drain.addColorStop(1, 'rgba(239,68,68,0.3)');
  ctx.fillStyle = drain;
  ctx.beginPath();
  ctx.moveTo(tipL - 26, t.drainY - 44);
  ctx.lineTo(tipR + 26, t.drainY - 44);
  ctx.lineTo(tipR + 12, t.laneFloorY);
  ctx.lineTo(tipL - 12, t.laneFloorY);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,139,139,0.5)';
  ctx.font = `900 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  trackedText(ctx, 'LAPSE', table.cx, t.drainY + 16, 3);

  /* --- rollover lane bed --- */
  for (const ln of table.lanes) {
    ctx.fillStyle = 'rgba(255,255,255,0.035)';
    ctx.beginPath();
    ctx.roundRect(ln.x0 + 2, t.rolloverTopY - 4, ln.x1 - ln.x0 - 4, t.rolloverBotY - t.rolloverTopY + 8, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = `900 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(ln.label, ln.cx, t.rolloverBotY + 12);
  }

  /* --- slingshot bodies ---
     The bulge is filled back to the wall chord it sits on, so it reads as a
     kicker swelling out of the rail rather than a triangle floating beside it. */
  for (const s of table.slings) {
    const g = ctx.createLinearGradient(s.ax, s.ay, s.apexX, s.apexY);
    g.addColorStop(0, '#12386f');
    g.addColorStop(1, '#1b4f96');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(s.ax, s.ay);
    ctx.lineTo(s.apexX, s.apexY);
    ctx.lineTo(s.bx, s.by);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }

  /* --- walls --- */
  for (const s of table.segments) {
    if (s.kind === 'gate') {
      ctx.save();
      ctx.setLineDash([5, 4]);
      ctx.strokeStyle = 'rgba(255,200,69,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      ctx.restore();
      continue;
    }
    if (s.kind === 'sling') continue; // painted below with a bright face

    const isPost = s.kind === 'post';
    ctx.strokeStyle = isPost ? 'rgba(143,184,232,0.55)' : COLORS.rail;
    if (shadows && !isPost) {
      ctx.shadowColor = 'rgba(120,180,255,0.5)';
      ctx.shadowBlur = 6;
    }
    roundedCapsule(ctx, s.x1, s.y1, s.x2, s.y2, isPost ? 2.4 : 3.2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    roundedCapsule(ctx, s.x1, s.y1, s.x2, s.y2, isPost ? 0.9 : 1.2);
  }

  /* --- slingshot kicker faces (bright, on top of the walls) --- */
  for (const s of table.slings) {
    for (const [x1, y1, x2, y2] of [
      [s.ax, s.ay, s.apexX, s.apexY],
      [s.apexX, s.apexY, s.bx, s.by],
    ]) {
      ctx.strokeStyle = COLORS.orange;
      if (shadows) {
        ctx.shadowColor = 'rgba(242,101,34,0.75)';
        ctx.shadowBlur = 9;
      }
      roundedCapsule(ctx, x1, y1, x2, y2, 3.4);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = COLORS.orangeLt;
      roundedCapsule(ctx, x1, y1, x2, y2, 1.4);
    }
  }

  /* --- bumper skirts --- */
  for (const b of table.bumpers) {
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(b.x, b.y + 3, b.r + 6, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r + 6, 0, TAU);
    ctx.stroke();
  }

  /* --- flipper pivot posts --- */
  for (const fl of table.flippers) {
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.beginPath();
    ctx.arc(fl.px, fl.py, fl.radius + 3.5, 0, TAU);
    ctx.fill();
  }

  return cv;
}

/**
 * Build every reused gradient once.
 *
 * A canvas gradient resolves against the transform in force when it is PAINTED,
 * not when it is created, so a gradient authored in an object's own frame can
 * be reused for every instance at every size — paint it inside a
 * translate/rotate/scale and it lands correctly. That is what lets the bumper,
 * flipper and plunger fills live here instead of being rebuilt (six
 * createRadialGradient / createLinearGradient calls) on every single frame.
 *
 * @param canvasH CSS height of the real canvas. The backdrop is painted over
 *   the whole canvas OUTSIDE the letterbox transform, so it must be built in
 *   canvas pixels; building it over the table's authored 640 units ran the
 *   gradient off the bottom of any shorter viewport.
 */
export function buildPaints(ctx, cfg, table, canvasH) {
  const t = cfg.table;

  const backdrop = ctx.createLinearGradient(0, 0, 0, Math.max(1, canvasH));
  backdrop.addColorStop(0, COLORS.bg);
  backdrop.addColorStop(0.55, COLORS.bgMid);
  backdrop.addColorStop(1, COLORS.bgLow);

  // Unit ball: painted inside translate(x, y) + scale(r, r).
  const ball = ctx.createRadialGradient(-0.33, -0.38, 0.07, 0, 0, 1);
  ball.addColorStop(0, '#FFFFFF');
  ball.addColorStop(0.4, '#D6E5FA');
  ball.addColorStop(1, '#5E7FA8');

  // Unit bumper cap per goal, same trick — one per colour, not one per frame.
  const bumperFill = table.bumpers.map((b) => {
    const g = ctx.createRadialGradient(-0.34, -0.4, 0.1, 0, 0, 1);
    g.addColorStop(0, '#FFFFFF');
    g.addColorStop(0.28, b.colorLt);
    g.addColorStop(1, b.color);
    return g;
  });

  // Flipper, in the flipper's own frame: pivot at the origin, tip at +length.
  const f = cfg.flipper;
  const flipper = ctx.createLinearGradient(0, -f.radius, f.length, f.radius);
  flipper.addColorStop(0, COLORS.orangeLt);
  flipper.addColorStop(1, COLORS.orange);

  // Plunger charge meter — fixed in table space, so a plain cached gradient.
  const meter = ctx.createLinearGradient(0, t.laneFloorY - 40, 0, t.gateY + 40);
  meter.addColorStop(0, COLORS.green);
  meter.addColorStop(0.6, COLORS.gold);
  meter.addColorStop(1, COLORS.orange);

  return { backdrop, ball, bumperFill, flipper, meter };
}

export function drawBumper(ctx, b, cfg, lit, flash, time, shadows, paints) {
  const pulse = 0.5 + 0.5 * Math.sin(time * 2.6 + b.index * 1.7);
  const r = b.r * (1 + flash * 0.16);

  // Outer ring — brightens once this goal is lit on the current ball.
  ctx.strokeStyle = lit ? b.colorLt : 'rgba(255,255,255,0.22)';
  ctx.lineWidth = lit ? 2.6 : 1.6;
  if (shadows && lit) {
    ctx.shadowColor = b.colorLt;
    ctx.shadowBlur = 10 + pulse * 8;
  }
  ctx.beginPath();
  ctx.arc(b.x, b.y, r + 3.5, 0, TAU);
  ctx.stroke();
  ctx.shadowBlur = 0;

  if (shadows) {
    ctx.shadowColor = b.color;
    ctx.shadowBlur = 8 + flash * 22;
  }
  // Cached unit gradient, scaled into place. Shadow blur is applied in device
  // space and is deliberately set before the scale so it does not scale with r.
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.scale(r, r);
  ctx.fillStyle = paints.bumperFill[b.index];
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.restore();
  ctx.shadowBlur = 0;

  if (flash > 0) {
    ctx.globalAlpha = flash * 0.75;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, TAU);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  ctx.font = `900 ${b.r > 22 ? 9 : 8}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(b.short, b.x, b.y + 0.5);
}

export function drawLaneLamps(ctx, table, cfg, lit, flash, time, shadows) {
  const y = cfg.table.rolloverTopY - 12;
  for (let i = 0; i < table.lanes.length; i++) {
    const ln = table.lanes[i];
    const on = lit[i];
    const fl = flash[i];
    const pulse = 0.55 + 0.45 * Math.sin(time * 4 + i);
    ctx.fillStyle = on ? COLORS.gold : 'rgba(255,255,255,0.14)';
    if (shadows && on) {
      ctx.shadowColor = COLORS.goldLt;
      ctx.shadowBlur = 8 + pulse * 7;
    }
    ctx.beginPath();
    ctx.arc(ln.cx, y, on ? 5.2 : 4, 0, TAU);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (fl > 0) {
      ctx.globalAlpha = fl;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ln.cx, y, 5.2 + (1 - fl) * 8, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

/**
 * Painted in the flipper's own frame — pivot at the origin, tip at +length —
 * so one cached gradient serves both flippers at every angle.
 *
 * translate, then scale(dir, 1), then rotate: applied to a local point that
 * composes to R first, then the mirror, which is what puts the right flipper's
 * tip at pivot + (-L cos a, L sin a). The mirror is uniform in magnitude, so
 * stroke widths are unaffected.
 */
export function drawFlipper(ctx, fl, angle, tip, shadows, paints) {
  flipperTip(fl, angle, tip);
  const L = fl.length;
  const r = fl.radius;

  ctx.save();
  ctx.translate(fl.px, fl.py);
  ctx.scale(fl.dir, 1);
  ctx.rotate(angle);

  ctx.strokeStyle = paints.flipper;
  if (shadows) {
    ctx.shadowColor = 'rgba(242,101,34,0.6)';
    ctx.shadowBlur = 8;
  }
  roundedCapsule(ctx, 0, 0, L, 0, r);
  ctx.shadowBlur = 0;

  // Top highlight, on the face the ball actually lands on.
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  roundedCapsule(ctx, 0, -r * 0.42, L * 0.72, -r * 0.42, r * 0.24);

  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.32, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawBall(ctx, s, cfg, paints) {
  const b = s.run.ball;
  const r = cfg.ball.radius;

  // Motion trail, oldest first.
  for (let i = 0; i < s.trailCount; i++) {
    const idx = (s.trailHead - 1 - i + s.trailMax * 2) % s.trailMax;
    const a = (1 - i / s.trailCount) * 0.28;
    ctx.globalAlpha = a;
    ctx.fillStyle = COLORS.railLt;
    ctx.beginPath();
    ctx.arc(s.trailX[idx], s.trailY[idx], r * (0.9 - i / s.trailCount * 0.55), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(1.5, 2.5, r * 0.95, r * 0.85, 0, 0, TAU);
  ctx.fill();
  // Unit-space ball so the cached gradient lands at any radius.
  ctx.scale(r, r);
  ctx.fillStyle = paints.ball;
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(-0.34, -0.38, 0.24, 0, TAU);
  ctx.fill();
  ctx.restore();
}

/** Plunger rod + power meter at the foot of the lane. */
export function drawPlunger(ctx, s, cfg, time, paints) {
  const t = cfg.table;
  const run = s.run;
  const ready = run.phase === 'ready';
  const power = ready ? run.plungerPower : run.lastLaunchPower;
  const cx = (t.laneL + t.laneR) / 2;
  const topY = t.laneFloorY - 6;
  const pull = ready ? power * 16 : 0;

  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx, topY + pull);
  ctx.lineTo(cx, t.laneFloorY + 4);
  ctx.stroke();
  ctx.fillStyle = ready ? COLORS.orangeLt : 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.roundRect(cx - 9, topY - 6 + pull, 18, 8, 3);
  ctx.fill();

  // Vertical charge meter beside the lane.
  const mx = t.laneR - 7;
  const my0 = t.gateY + 40;
  const my1 = t.laneFloorY - 40;
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath();
  ctx.roundRect(mx - 2.5, my0, 5, my1 - my0, 3);
  ctx.fill();
  if (power > 0) {
    const h = (my1 - my0) * power;
    ctx.fillStyle = paints.meter;
    ctx.beginPath();
    ctx.roundRect(mx - 2.5, my1 - h, 5, h, 3);
    ctx.fill();
  }
  if (ready) {
    const blink = 0.5 + 0.5 * Math.sin(time * 5);
    ctx.globalAlpha = 0.45 + blink * 0.5;
    ctx.fillStyle = COLORS.goldLt;
    ctx.font = `900 8px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.save();
    ctx.translate(t.laneL - 9, (my0 + my1) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('HOLD TO CHARGE', 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/** Bonus Secure band across the goal cluster while the 2x is live. */
export function drawBonusBand(ctx, table, cfg, remaining, time) {
  const frac = remaining / cfg.bonus.seconds;
  const y = cfg.table.rolloverBotY + 16;
  const w = 168;
  const pulse = 0.55 + 0.45 * Math.sin(time * 7);
  ctx.globalAlpha = 0.16 + pulse * 0.16;
  ctx.fillStyle = COLORS.green;
  ctx.beginPath();
  ctx.roundRect(table.cx - w / 2, y - 11, w, 22, 11);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = COLORS.greenLt;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.roundRect(table.cx - w / 2, y - 11, w, 22, 11);
  ctx.stroke();
  ctx.fillStyle = COLORS.greenLt;
  ctx.font = `900 10px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`BONUS SECURE  x${cfg.bonus.multiplier}`, table.cx, y - 0.5);
  // Drain-down bar.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.beginPath();
  ctx.roundRect(table.cx - w / 2 + 4, y + 8, (w - 8) * frac, 2.4, 1.2);
  ctx.fill();
}
