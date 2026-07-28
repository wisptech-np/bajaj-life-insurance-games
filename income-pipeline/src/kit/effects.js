// effects.js — pooled juice: particles, screen shake, floating score text, hit-stop.
//
// Everything is pre-allocated and reused. Allocating particle objects per burst
// is what turns a smooth game into a stuttering one on mid-range Android: the
// garbage collector runs during play and drops frames at exactly the moment the
// screen is busiest.
//
// Respects the device effect budget, so reduced-motion and low-end devices get a
// calmer presentation from the same call sites.

import { effectBudget, prefersReducedMotion } from './device.js';

// ---- Easing -----------------------------------------------------------------
// Chosen per the brief: fast ease-out for input response, spring for rewards,
// ease-in-out for screen transitions, linear for continuous motion.
export const Easing = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outQuint: (t) => 1 - Math.pow(1 - t, 5),
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  outElastic: (t) => {
    if (t === 0 || t === 1) return t;
    const c4 = (2 * Math.PI) / 3;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
};

/** Frame-rate independent lerp. Use instead of `a += (b-a)*0.1` in a loop. */
export function damp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

export function createEffects() {
  let budget = effectBudget();

  // ---- Particle pool --------------------------------------------------------
  const pool = [];
  for (let i = 0; i < budget.particleBudget; i++) {
    pool.push({ alive: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', gravity: 0, drag: 1 });
  }
  let cursor = 0;

  const acquire = () => {
    // Scan forward for a dead particle; if the pool is saturated, recycle the
    // oldest slot. Bursts stay bounded instead of growing without limit.
    for (let i = 0; i < pool.length; i++) {
      const idx = (cursor + i) % pool.length;
      if (!pool[idx].alive) {
        cursor = (idx + 1) % pool.length;
        return pool[idx];
      }
    }
    const p = pool[cursor];
    cursor = (cursor + 1) % pool.length;
    return p;
  };

  // ---- Floating text pool ---------------------------------------------------
  const texts = [];
  for (let i = 0; i < 24; i++) {
    texts.push({ alive: false, x: 0, y: 0, vy: 0, life: 0, maxLife: 1, text: '', color: '#fff', size: 16 });
  }

  // ---- Screen shake ---------------------------------------------------------
  let shake = 0;
  let shakeX = 0;
  let shakeY = 0;

  // ---- Hit stop -------------------------------------------------------------
  let hitStop = 0;

  return {
    /** Re-read the budget after a tier downgrade or motion-preference change. */
    refreshBudget() {
      budget = effectBudget();
    },

    /**
     * Emit a particle burst.
     * @param {object} o  x, y, count, color, speed, spread (radians), angle,
     *                    size, life, gravity, drag
     */
    burst({ x, y, count, color = '#fff', speed = 120, spread = Math.PI * 2, angle = -Math.PI / 2, size = 3, life = 0.6, gravity = 400, drag = 0.92 }) {
      const n = Math.round((count ?? budget.particlesPerBurst));
      if (n <= 0) return;
      for (let i = 0; i < n; i++) {
        const a = angle + (Math.random() - 0.5) * spread;
        const s = speed * (0.5 + Math.random() * 0.7);
        const p = acquire();
        p.alive = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(a) * s;
        p.vy = Math.sin(a) * s;
        p.maxLife = life * (0.7 + Math.random() * 0.6);
        p.life = p.maxLife;
        p.size = size * (0.7 + Math.random() * 0.7);
        p.color = color;
        p.gravity = gravity;
        p.drag = drag;
      }
    },

    /** Floating "+100" style score feedback. Kept even under reduced motion. */
    floatText(x, y, text, color = '#FFFFFF', size = 16) {
      const t = texts.find((t) => !t.alive) || texts[0];
      t.alive = true;
      t.x = x;
      t.y = y;
      t.vy = budget.floatingText.riseVelocity;
      t.maxLife = budget.floatingText.lifeSeconds;
      t.life = t.maxLife;
      t.text = text;
      t.color = color;
      t.size = size;
    },

    /** Request screen shake. Strongest request wins; they do not stack. */
    addShake(amount) {
      if (budget.shakeMaxOffsetPx <= 0) return;
      shake = Math.min(budget.shakeMaxOffsetPx, Math.max(shake, amount));
    },

    /** Freeze-frame emphasis on a meaningful impact. */
    addHitStop(seconds = budget.hitStopSeconds) {
      if (seconds <= 0) return;
      hitStop = Math.max(hitStop, seconds);
    },

    /** True while a hit-stop is active — skip the physics tick, keep drawing. */
    isFrozen: () => hitStop > 0,

    update(dt) {
      if (hitStop > 0) {
        hitStop = Math.max(0, hitStop - dt);
        return; // hold the simulation for emphasis
      }

      for (const p of pool) {
        if (!p.alive) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.alive = false;
          continue;
        }
        p.vy += p.gravity * dt;
        p.vx *= Math.pow(p.drag, dt * 60);
        p.vy *= Math.pow(p.drag, dt * 60);
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }

      for (const t of texts) {
        if (!t.alive) continue;
        t.life -= dt;
        if (t.life <= 0) {
          t.alive = false;
          continue;
        }
        t.y += t.vy * dt;
        t.vy *= Math.pow(0.94, dt * 60);
      }

      if (shake > 0) {
        shake = Math.max(0, shake - budget.shakeDecayPerSecond * dt);
        shakeX = (Math.random() - 0.5) * 2 * shake;
        shakeY = (Math.random() - 0.5) * 2 * shake;
      } else {
        shakeX = 0;
        shakeY = 0;
      }
    },

    /** Apply shake. Pair with ctx.restore() via endCamera(). */
    beginCamera(ctx) {
      ctx.save();
      if (shakeX || shakeY) ctx.translate(shakeX, shakeY);
    },
    endCamera(ctx) {
      ctx.restore();
    },

    draw(ctx) {
      for (const p of pool) {
        if (!p.alive) continue;
        const a = Math.max(0, p.life / p.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (const t of texts) {
        if (!t.alive) continue;
        const a = Math.max(0, t.life / t.maxLife);
        ctx.globalAlpha = a;
        ctx.fillStyle = t.color;
        ctx.font = `700 ${t.size}px 'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.text, t.x, t.y);
      }
      ctx.globalAlpha = 1;
    },

    /** Squash-and-stretch scale for an impact, t = 0..1 through the recovery. */
    squash(t, amount = budget.squashAmount) {
      if (amount <= 0) return { sx: 1, sy: 1 };
      const k = (1 - Easing.outElastic(Math.min(1, t))) * amount;
      return { sx: 1 + k, sy: 1 - k };
    },

    reset() {
      for (const p of pool) p.alive = false;
      for (const t of texts) t.alive = false;
      shake = 0;
      shakeX = 0;
      shakeY = 0;
      hitStop = 0;
    },

    get reducedMotion() {
      return prefersReducedMotion();
    },
  };
}
