// sim.js — Guardian Arena world simulation. Pure logic, no canvas, no React.
//
// The whole genre is one rule, and it lives in stepPlayer(): the guardian
// auto-fires at the nearest enemy ONLY while stationary; any movement input
// stops the firing. Everything else — waves, the three enemy archetypes, the
// boss, upgrades, fairness rules — hangs off that rule.
//
// Design constraints implemented here (see data.js for every number):
//   - projectiles are strictly slower than the player;
//   - every attack is telegraphed >= 400 ms (shooter wind-up, boss fan wind-up);
//   - spawns are never within 150 px of the player and are harmless during a
//     600 ms spawn-in; splitter children are harmless while they scatter;
//   - i-frames (900 ms) prevent double-tap deaths, with knockback;
//   - anti corner-camping: spawns bias toward the player's quadrant, chasers
//     approach from alternating flanks, and shooters lead their aim (and fire
//     a spread) when the player parks in a corner;
//   - anti pause-scum: on resume from the kit's auto-pause the world stays
//     frozen behind a visible 3-2-1 (freezeLeft — the session clock is held by
//     the component via shouldTickClock) and input is refused for a short live
//     beat after it (inputLockLeft).
//
// Everything is pooled. Nothing in stepWorld allocates.

export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

const ENEMY_POOL = 44;
const BOLT_POOL = 28;
const PROJ_POOL = 20;

/* ─── World ──────────────────────────────────────────────── */

export function createWorld(cfg, rng = Math.random) {
  const A = cfg.arena;

  const enemies = new Array(ENEMY_POOL);
  for (let i = 0; i < ENEMY_POOL; i++) {
    enemies[i] = {
      alive: false, id: i, type: 'chaser',
      x: 0, y: 0, hp: 0, maxHp: 0, radius: 0, speed: 0, damage: 1, score: 0,
      spawnLeft: 0, scatterLeft: 0, sx: 0, sy: 0,      // scatter velocity
      flashLeft: 0, windup: 0, cooldown: 0, fanAim: 0,
      flankSign: 1, strafeSign: 1, seed: 0,
      isBoss: false, isTrickle: false,
    };
  }

  const bolts = new Array(BOLT_POOL);
  for (let i = 0; i < BOLT_POOL; i++) {
    bolts[i] = { alive: false, x: 0, y: 0, vx: 0, vy: 0, dmg: 1, dist: 0, pierceLeft: 0, ricochetLeft: 0, lastHit: -1 };
  }

  const projs = new Array(PROJ_POOL);
  for (let i = 0; i < PROJ_POOL; i++) {
    projs[i] = { alive: false, x: 0, y: 0, vx: 0, vy: 0, radius: 6, damage: 1 };
  }

  const world = {
    rng,
    time: 0,
    over: false,
    won: false,
    endCause: null,          // 'boss' | 'survived' | 'down'

    player: {
      x: A.width / 2, y: A.height * 0.56,
      hp: cfg.player.maxHp, maxHp: cfg.player.maxHp,
      moving: false, faceAngle: -Math.PI / 2,
      lastVx: 0, lastVy: 0,                 // for shooter lead-aim
      settleLeft: 0, fireCooldown: 0,
      iframeLeft: 0, hurtLeft: 0,
      knockX: 0, knockY: 0,
      flankToggle: 1,                        // alternates per chaser spawn
    },

    // Movement intent, written by the component's joystick each frame.
    input: { mx: 0, my: 0, mag: 0 },

    enemies, bolts, projs,
    aliveEnemies: 0,

    targetId: -1,            // nearest enemy (the target-lock reticle)

    // Waves
    waveIndex: -1,
    waveState: 'idle',       // 'active' | 'upgrade' | 'done'
    spawnQueue: [],          // reused array of type strings for the current wave
    spawnCursor: 0,
    spawnTimer: 0,
    trickleTimer: 0,
    bossId: -1,

    // Upgrades
    upgradeOpen: false,
    upgradeChoices: [],      // ids offered for the current pick
    stacks: { multishot: 0, ricochet: 0, pierce: 0, firerate: 0, damage: 0, maxhp: 0, heal: 0, speed: 0 },

    // Score
    score: 0,
    kills: 0,
    wavesCleared: 0,

    // Pause / re-acquire (anti pause-scum)
    paused: false,
    pauses: 0,
    freezeLeft: 0,
    inputLockLeft: 0,
  };

  startWave(world, cfg, 0, null);
  return world;
}

export function statsOf(world) {
  return {
    score: Math.round(world.score),
    kills: world.kills,
    wavesCleared: world.wavesCleared,
    hpLeft: Math.max(0, world.player.hp),
  };
}

/* ─── Anti pause-scum ────────────────────────────────────────
   The kit's loop auto-pauses on visibilitychange and resumes at the frozen
   state, which in a reaction game makes backgrounding a free think-button.
   The rule (repo-wide): resume does NOT hand the world back. It stays frozen
   behind a visible 3-2-1 (freezeLeft) with the session clock held, then taps
   the brakes on input for one more beat (inputLockLeft). */

export function beginPause(world) {
  if (world.over) return;
  world.paused = true;
}

export function endPause(world, cfg) {
  if (world.over || !world.paused) return;
  world.paused = false;
  world.pauses += 1;
  world.freezeLeft = cfg.reacquire.freezeSeconds;
  world.inputLockLeft = cfg.reacquire.inputLockSeconds;
}

/** World (and session clock) held: the re-acquire countdown is running. */
export function isFrozen(world) {
  return world.freezeLeft > 0;
}

/** Movement input refused (countdown or the short live beat after it). */
export function isInputLocked(world) {
  return world.freezeLeft > 0 || world.inputLockLeft > 0;
}

/* ─── Waves ──────────────────────────────────────────────── */

function buildQueue(world, cfg, wave) {
  const q = world.spawnQueue;
  q.length = 0;
  const mix = wave.mix;
  // Deterministic counts from the mix fractions, then shuffled so archetypes
  // interleave instead of arriving in blocks.
  const types = Object.keys(mix);
  let placed = 0;
  for (let i = 0; i < types.length; i++) {
    const t = types[i];
    const n = i === types.length - 1 ? wave.count - placed : Math.round(wave.count * mix[t]);
    for (let k = 0; k < n; k++) q.push(t);
    placed += n;
  }
  for (let i = q.length - 1; i > 0; i--) {
    const j = Math.floor(world.rng() * (i + 1));
    const tmp = q[i]; q[i] = q[j]; q[j] = tmp;
  }
}

function startWave(world, cfg, index, ev) {
  const wave = cfg.waves[index];
  world.waveIndex = index;
  world.waveState = 'active';
  world.spawnCursor = 0;
  world.spawnTimer = 0;         // first spawn lands immediately
  world.upgradeOpen = false;

  if (wave.boss) {
    world.spawnQueue.length = 0;
    world.trickleTimer = wave.trickleEvery;
    spawnBoss(world, cfg, ev);
  } else {
    buildQueue(world, cfg, wave);
  }
  ev?.onWaveStart?.(index, wave.label);
}

/* ─── Spawning ───────────────────────────────────────────── */

function acquireEnemy(world) {
  const es = world.enemies;
  for (let i = 0; i < es.length; i++) if (!es[i].alive) return es[i];
  return null; // pool saturated — skip the spawn rather than grow
}

/**
 * Spawn position: >= spawnMinDistPx from the player, inside the walls, and
 * biased (playerQuadrantBias) toward the player's own quadrant so parking in
 * a corner pulls pressure toward you instead of away.
 */
function pickSpawnPoint(world, cfg, out) {
  const A = cfg.arena;
  const p = world.player;
  const rng = world.rng;
  const margin = 26;
  const minD = cfg.enemies.spawnMinDistPx;

  const pqx = p.x > A.width / 2 ? 1 : 0;
  const pqy = p.y > A.height / 2 ? 1 : 0;
  let qx = pqx, qy = pqy;
  if (rng() >= cfg.enemies.playerQuadrantBias) {
    qx = rng() < 0.5 ? 0 : 1;
    qy = rng() < 0.5 ? 0 : 1;
  }
  const x0 = qx === 0 ? margin : A.width / 2;
  const x1 = qx === 0 ? A.width / 2 : A.width - margin;
  const y0 = qy === 0 ? margin : A.height / 2;
  const y1 = qy === 0 ? A.height / 2 : A.height - margin;

  for (let i = 0; i < 14; i++) {
    const x = x0 + rng() * (x1 - x0);
    const y = y0 + rng() * (y1 - y0);
    const dx = x - p.x, dy = y - p.y;
    if (dx * dx + dy * dy >= minD * minD) { out.x = x; out.y = y; return; }
  }
  // Fallback: a ring point just outside the exclusion radius, clamped in.
  const a = rng() * Math.PI * 2;
  out.x = clamp(p.x + Math.cos(a) * (minD + 24), margin, A.width - margin);
  out.y = clamp(p.y + Math.sin(a) * (minD + 24), margin, A.height - margin);
}

const SPAWN_PT = { x: 0, y: 0 };

function spawnEnemy(world, cfg, type, ev, atX = null, atY = null) {
  const e = acquireEnemy(world);
  if (!e) return null;
  const spec = cfg.enemies[type];

  if (atX === null) {
    pickSpawnPoint(world, cfg, SPAWN_PT);
    e.x = SPAWN_PT.x; e.y = SPAWN_PT.y;
  } else {
    e.x = atX; e.y = atY;
  }

  e.alive = true;
  e.type = type;
  e.hp = spec.hp;
  e.maxHp = spec.hp;
  e.radius = spec.radius;
  e.speed = cfg.player.speed * spec.speedMult;
  e.damage = spec.damage;
  e.score = spec.score;
  e.spawnLeft = cfg.enemies.spawnInSeconds;
  e.scatterLeft = 0;
  e.sx = 0; e.sy = 0;
  e.flashLeft = 0;
  e.windup = 0;
  e.cooldown = type === 'shooter' ? 0.8 + world.rng() * 0.8 : 0;
  e.strafeSign = world.rng() < 0.5 ? -1 : 1;
  e.seed = world.rng() * Math.PI * 2;
  e.isBoss = false;
  e.isTrickle = false;
  // Chasers approach from BOTH flanks: alternate the offset sign per spawn.
  world.player.flankToggle = -world.player.flankToggle;
  e.flankSign = world.player.flankToggle;

  ev?.onSpawn?.(e);
  return e;
}

function spawnBoss(world, cfg, ev) {
  const B = cfg.enemies.boss;
  const A = cfg.arena;
  const e = acquireEnemy(world);
  if (!e) return;
  // Far side of the arena from the player.
  e.x = A.width / 2;
  e.y = world.player.y > A.height / 2 ? A.height * 0.18 : A.height * 0.82;
  e.alive = true;
  e.type = 'boss';
  e.isBoss = true;
  e.isTrickle = false;
  e.hp = cfg.enemies.chaser.hp * B.hpMult;
  e.maxHp = e.hp;
  e.radius = B.radius;
  e.speed = cfg.player.speed * B.speedMult;
  e.damage = B.damage;
  e.score = B.score;
  e.spawnLeft = cfg.enemies.spawnInSeconds * 1.5;
  e.scatterLeft = 0;
  e.flashLeft = 0;
  e.windup = 0;
  e.cooldown = B.fanCooldownSeconds;
  e.seed = 0;
  e.flankSign = 1;
  e.strafeSign = 1;
  world.bossId = e.id;
  ev?.onBossSpawn?.(e);
}

/* ─── Upgrades ───────────────────────────────────────────── */

function offerUpgrades(world, cfg, ev) {
  const rng = world.rng;
  const pool = [];
  for (const u of cfg.upgrades) {
    if (u.maxStacks && world.stacks[u.id] >= u.maxStacks) continue;
    if (u.id === 'heal' && world.player.hp >= world.player.maxHp) continue;
    pool.push(u);
  }
  // Shuffle, then force at least one offense card into the offer.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = pool[i]; pool[i] = pool[j]; pool[j] = tmp;
  }
  const picks = pool.slice(0, 3);
  if (!picks.some((u) => u.offense)) {
    const off = pool.find((u) => u.offense);
    if (off) picks[picks.length - 1] = off;
  }
  world.upgradeChoices = picks.map((u) => u.id);
  world.upgradeOpen = true;
  world.waveState = 'upgrade';
  ev?.onUpgradeOffer?.(world.upgradeChoices);
}

/** Apply the picked card and release the world into the next wave. */
export function applyUpgrade(world, cfg, id, ev) {
  if (!world.upgradeOpen) return;
  const fx = cfg.upgradeEffects;
  world.stacks[id] = (world.stacks[id] || 0) + 1;
  const p = world.player;
  if (id === 'maxhp') {
    p.maxHp += fx.maxHpAdd;
    p.hp += fx.maxHpAdd;
  } else if (id === 'heal') {
    const missing = p.maxHp - p.hp;
    p.hp = Math.min(p.maxHp, p.hp + Math.max(1, Math.round(missing * fx.healFraction)));
  }
  world.upgradeOpen = false;
  ev?.onUpgradePicked?.(id);
  startWave(world, cfg, world.waveIndex + 1, ev);
}

export function playerSpeedOf(world, cfg) {
  return cfg.player.speed * Math.pow(cfg.upgradeEffects.speedMult, world.stacks.speed);
}

function boltDamageOf(world, cfg) {
  const fx = cfg.upgradeEffects;
  return cfg.fire.baseDamage
    * Math.pow(fx.damageMult, world.stacks.damage)
    * Math.pow(fx.multishotDamageMult, world.stacks.multishot);
}

function fireIntervalOf(world, cfg) {
  return cfg.fire.interval * Math.pow(cfg.upgradeEffects.firerateMult, world.stacks.firerate);
}

/* ─── Combat helpers ─────────────────────────────────────── */

function acquireBolt(world) {
  const bs = world.bolts;
  for (let i = 0; i < bs.length; i++) if (!bs[i].alive) return bs[i];
  return null;
}

function acquireProj(world) {
  const ps = world.projs;
  for (let i = 0; i < ps.length; i++) if (!ps[i].alive) return ps[i];
  return null;
}

function fireVolley(world, cfg, target, ev) {
  const p = world.player;
  const n = 1 + world.stacks.multishot;
  const dmg = boltDamageOf(world, cfg);
  const base = Math.atan2(target.y - p.y, target.x - p.x);
  p.faceAngle = base;
  const spread = cfg.upgradeEffects.multishotSpreadRad;
  for (let i = 0; i < n; i++) {
    const b = acquireBolt(world);
    if (!b) break;
    const a = base + (i - (n - 1) / 2) * spread;
    b.alive = true;
    b.x = p.x + Math.cos(a) * (cfg.player.radius + 4);
    b.y = p.y + Math.sin(a) * (cfg.player.radius + 4);
    b.vx = Math.cos(a) * cfg.fire.boltSpeed;
    b.vy = Math.sin(a) * cfg.fire.boltSpeed;
    b.dmg = dmg;
    b.dist = 0;
    b.pierceLeft = world.stacks.pierce;
    b.ricochetLeft = world.stacks.ricochet;
    b.lastHit = -1;
  }
  ev?.onFire?.(p.x, p.y, base, n);
}

function fireEnemyProjectile(world, cfg, e, angle, speedMult, radius, ev) {
  const pr = acquireProj(world);
  if (!pr) return;
  const sp = cfg.player.speed * speedMult; // strictly < player speed — dodgeable
  pr.alive = true;
  pr.x = e.x + Math.cos(angle) * (e.radius + 4);
  pr.y = e.y + Math.sin(angle) * (e.radius + 4);
  pr.vx = Math.cos(angle) * sp;
  pr.vy = Math.sin(angle) * sp;
  pr.radius = radius;
  pr.damage = e.damage;
  ev?.onEnemyShot?.(e, pr);
}

function hitPlayer(world, cfg, fromX, fromY, dmg, ev) {
  const p = world.player;
  if (p.iframeLeft > 0 || world.over) return;
  p.hp -= dmg;
  p.iframeLeft = cfg.player.iframeSeconds;
  p.hurtLeft = cfg.player.hurtVignetteSeconds;
  const dx = p.x - fromX, dy = p.y - fromY;
  const d = Math.hypot(dx, dy) || 1;
  p.knockX = (dx / d) * cfg.player.knockbackSpeed;
  p.knockY = (dy / d) * cfg.player.knockbackSpeed;
  ev?.onPlayerHit?.(p.hp);
  if (p.hp <= 0) {
    world.over = true;
    world.won = false;
    world.endCause = 'down';
    ev?.onLose?.();
  }
}

function killEnemy(world, cfg, e, ev) {
  e.alive = false;
  world.kills += 1;
  world.score += e.score;
  ev?.onEnemyKilled?.(e);

  if (e.type === 'splitter') {
    const S = cfg.enemies.splitter;
    for (let k = 0; k < S.splitCount; k++) {
      const child = spawnEnemy(world, cfg, 'mini', ev, e.x, e.y);
      if (!child) break;
      child.spawnLeft = 0; // children are visible at once…
      child.scatterLeft = S.scatterSeconds; // …but harmless while they scatter
      const a = world.rng() * Math.PI * 2;
      child.sx = Math.cos(a) * S.scatterSpeed;
      child.sy = Math.sin(a) * S.scatterSpeed;
    }
  }

  if (e.isBoss && !world.over) {
    world.over = true;
    world.won = true;
    world.endCause = 'boss';
    world.wavesCleared = cfg.waves.length;
    world.score += cfg.waveClearBonusBase * cfg.waves.length;
    ev?.onWin?.();
  }
}

/** Nearest live, materialised enemy to the player. -1 when the field is clear. */
function retarget(world) {
  const p = world.player;
  let best = -1;
  let bestD = Infinity;
  const es = world.enemies;
  for (let i = 0; i < es.length; i++) {
    const e = es[i];
    if (!e.alive || e.spawnLeft > 0) continue;
    const dx = e.x - p.x, dy = e.y - p.y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = i; }
  }
  world.targetId = best;
}

/* ─── Step ───────────────────────────────────────────────── */

export function stepWorld(world, cfg, dt, ev) {
  if (world.over) return;

  // Re-acquire freeze: the world is held while the visible countdown runs.
  // The component also holds the session clock (shouldTickClock → isFrozen).
  if (world.freezeLeft > 0) {
    world.freezeLeft = Math.max(0, world.freezeLeft - dt);
    return;
  }
  if (world.inputLockLeft > 0) world.inputLockLeft = Math.max(0, world.inputLockLeft - dt);

  // Upgrade pick holds the world too (and the clock, via the component).
  if (world.upgradeOpen) return;

  world.time += dt;

  const p = world.player;
  const A = cfg.arena;

  /* -- player ------------------------------------------------------------ */
  const inputLive = world.inputLockLeft <= 0;
  const mag = inputLive ? world.input.mag : 0;
  p.moving = mag > 0;
  const spd = playerSpeedOf(world, cfg);
  if (p.moving) {
    p.lastVx = world.input.mx * spd * mag;
    p.lastVy = world.input.my * spd * mag;
    p.x += p.lastVx * dt;
    p.y += p.lastVy * dt;
    p.faceAngle = Math.atan2(world.input.my, world.input.mx);
    p.settleLeft = cfg.fire.settleSeconds;   // moving cancels the fire windup
  } else {
    p.lastVx = 0; p.lastVy = 0;
    if (p.settleLeft > 0) p.settleLeft = Math.max(0, p.settleLeft - dt);
  }
  // Knockback impulse, decaying exponentially.
  if (p.knockX !== 0 || p.knockY !== 0) {
    p.x += p.knockX * dt;
    p.y += p.knockY * dt;
    const k = Math.exp(-cfg.player.knockbackDecay * dt);
    p.knockX *= k; p.knockY *= k;
    if (Math.abs(p.knockX) + Math.abs(p.knockY) < 4) { p.knockX = 0; p.knockY = 0; }
  }
  p.x = clamp(p.x, A.wallPad + cfg.player.radius, A.width - A.wallPad - cfg.player.radius);
  p.y = clamp(p.y, A.wallPad + cfg.player.radius, A.height - A.wallPad - cfg.player.radius);
  if (p.iframeLeft > 0) p.iframeLeft = Math.max(0, p.iframeLeft - dt);
  if (p.hurtLeft > 0) p.hurtLeft = Math.max(0, p.hurtLeft - dt);

  /* -- targeting + auto-fire (stationary only) --------------------------- */
  retarget(world);
  if (p.fireCooldown > 0) p.fireCooldown = Math.max(0, p.fireCooldown - dt);
  const canFire = !p.moving && p.settleLeft <= 0 && world.targetId >= 0;
  if (canFire && p.fireCooldown <= 0) {
    fireVolley(world, cfg, world.enemies[world.targetId], ev);
    p.fireCooldown = fireIntervalOf(world, cfg);
  }

  /* -- bolts ------------------------------------------------------------- */
  const bs = world.bolts;
  const es = world.enemies;
  for (let i = 0; i < bs.length; i++) {
    const b = bs[i];
    if (!b.alive) continue;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.dist += cfg.fire.boltSpeed * dt;
    if (b.dist > cfg.fire.range || b.x < -20 || b.x > A.width + 20 || b.y < -20 || b.y > A.height + 20) {
      b.alive = false;
      continue;
    }
    // vs enemies (materialised only — a spawning blob cannot be farmed).
    for (let j = 0; j < es.length; j++) {
      const e = es[j];
      if (!e.alive || e.spawnLeft > 0 || j === b.lastHit) continue;
      const dx = e.x - b.x, dy = e.y - b.y;
      const rr = e.radius + cfg.fire.boltRadius;
      if (dx * dx + dy * dy > rr * rr) continue;

      e.hp -= b.dmg;
      e.flashLeft = cfg.fx.enemyFlashSeconds;
      ev?.onEnemyHit?.(e, b.dmg, b.x, b.y);
      const killed = e.hp <= 0;
      if (killed) killEnemy(world, cfg, e, ev);

      b.lastHit = j;
      if (b.pierceLeft > 0) {
        b.pierceLeft -= 1;               // sail on through
      } else if (b.ricochetLeft > 0) {
        // Leap to the nearest other threat in range.
        let nj = -1, nd = cfg.fire.ricochetSearchPx * cfg.fire.ricochetSearchPx;
        for (let k = 0; k < es.length; k++) {
          const o = es[k];
          if (!o.alive || o.spawnLeft > 0 || k === j) continue;
          const ox = o.x - b.x, oy = o.y - b.y;
          const od = ox * ox + oy * oy;
          if (od < nd) { nd = od; nj = k; }
        }
        if (nj >= 0) {
          const o = es[nj];
          const a = Math.atan2(o.y - b.y, o.x - b.x);
          b.vx = Math.cos(a) * cfg.fire.boltSpeed;
          b.vy = Math.sin(a) * cfg.fire.boltSpeed;
          b.ricochetLeft -= 1;
          b.lastHit = j;
          ev?.onRicochet?.(b.x, b.y);
        } else {
          b.alive = false;
        }
      } else {
        b.alive = false;
      }
      break;
    }
  }

  /* -- enemies ----------------------------------------------------------- */
  let alive = 0;
  let trickleAlive = 0;
  for (let i = 0; i < es.length; i++) {
    const e = es[i];
    if (!e.alive) continue;
    alive += 1;
    if (e.isTrickle) trickleAlive += 1;
    if (e.flashLeft > 0) e.flashLeft = Math.max(0, e.flashLeft - dt);

    // Materialising: visible, harmless, unhittable.
    if (e.spawnLeft > 0) {
      e.spawnLeft = Math.max(0, e.spawnLeft - dt);
      continue;
    }
    // Splitter children: harmless scatter beat.
    if (e.scatterLeft > 0) {
      e.scatterLeft = Math.max(0, e.scatterLeft - dt);
      e.x += e.sx * dt;
      e.y += e.sy * dt;
      e.sx *= Math.exp(-6 * dt);
      e.sy *= Math.exp(-6 * dt);
      e.x = clamp(e.x, e.radius, A.width - e.radius);
      e.y = clamp(e.y, e.radius, A.height - e.radius);
      continue;
    }

    const dx = p.x - e.x, dy = p.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const toP = Math.atan2(dy, dx);

    if (e.type === 'chaser' || e.type === 'mini' || e.type === 'splitter') {
      // Flanked approach: offset the heading by ± flankAngle, fading out as
      // they close, so the pack arrives from both sides instead of a queue.
      const k = clamp((dist - 46) / cfg.enemies.flankFadePx, 0, 1);
      const a = toP + e.flankSign * cfg.enemies.flankAngleRad * k;
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
    } else if (e.type === 'shooter') {
      const S = cfg.enemies.shooter;
      // Hold range: approach when far, back away when crowded, strafe between.
      let move = 0;
      if (dist > S.holdRangePx + 24) move = 1;
      else if (dist < S.holdRangePx - 32) move = -1;
      if (move !== 0) {
        e.x += Math.cos(toP) * e.speed * move * dt;
        e.y += Math.sin(toP) * e.speed * move * dt;
      } else {
        const sa = toP + Math.PI / 2;
        e.x += Math.cos(sa) * e.speed * 0.5 * e.strafeSign * dt;
        e.y += Math.sin(sa) * e.speed * 0.5 * e.strafeSign * dt;
      }
      if (e.x < e.radius + 8 || e.x > A.width - e.radius - 8 ||
          e.y < e.radius + 8 || e.y > A.height - e.radius - 8) e.strafeSign = -e.strafeSign;

      // Attack cycle: cooldown → 450 ms wind-up flash → shot.
      if (e.windup > 0) {
        e.windup = Math.max(0, e.windup - dt);
        if (e.windup === 0) {
          // Lead the aim so corner-parking is punished; still slower than you.
          const tx = p.x + p.lastVx * S.leadSeconds;
          const ty = p.y + p.lastVy * S.leadSeconds;
          const aim = Math.atan2(ty - e.y, tx - e.x);
          const cz = A.cornerZonePx;
          const inCorner = (p.x < cz || p.x > A.width - cz) && (p.y < cz || p.y > A.height - cz);
          if (inCorner) {
            // Arc a spread into the corner: both exits are covered, the gap
            // between them is the way out.
            fireEnemyProjectile(world, cfg, e, aim - S.cornerSpreadRad / 2, S.projSpeedMult, S.projRadius, ev);
            fireEnemyProjectile(world, cfg, e, aim + S.cornerSpreadRad / 2, S.projSpeedMult, S.projRadius, ev);
          } else {
            fireEnemyProjectile(world, cfg, e, aim, S.projSpeedMult, S.projRadius, ev);
          }
          e.cooldown = S.cooldownSeconds;
        }
      } else {
        e.cooldown -= dt;
        if (e.cooldown <= 0) {
          e.windup = S.windupSeconds;
          ev?.onWindup?.(e);
        }
      }
    } else if (e.type === 'boss') {
      const B = cfg.enemies.boss;
      // Slow relentless chase, pausing to telegraph the fan.
      if (e.windup > 0) {
        e.windup = Math.max(0, e.windup - dt);
        if (e.windup === 0) {
          // Fire along the aim LOCKED at wind-up start — the telegraph lines
          // the player saw are exactly where the shots go, so sidestepping
          // during the wind-up genuinely dodges the fan.
          for (let s = 0; s < B.fanShots; s++) {
            const a = e.fanAim + (s - (B.fanShots - 1) / 2) * (B.fanSpreadRad / (B.fanShots - 1));
            fireEnemyProjectile(world, cfg, e, a, B.projSpeedMult, B.projRadius, ev);
          }
          e.cooldown = B.fanCooldownSeconds;
        }
      } else {
        e.x += Math.cos(toP) * e.speed * dt;
        e.y += Math.sin(toP) * e.speed * dt;
        e.cooldown -= dt;
        if (e.cooldown <= 0) {
          e.windup = B.fanWindupSeconds;
          e.fanAim = toP;
          ev?.onWindup?.(e);
        }
      }
    }

    // Contact damage (i-frames make double-taps impossible).
    const cr = e.radius + cfg.player.radius;
    const cdx = p.x - e.x, cdy = p.y - e.y;
    if (cdx * cdx + cdy * cdy < cr * cr) {
      hitPlayer(world, cfg, e.x, e.y, e.damage, ev);
      if (world.over) return;
    }
  }

  // Soft separation so blobs never merge into one super-blob. O(n²) over a
  // pool of ≤ 44 with early alive checks — cheap at this scale.
  const sep = cfg.enemies.separationPx;
  for (let i = 0; i < es.length; i++) {
    const a = es[i];
    if (!a.alive || a.spawnLeft > 0) continue;
    for (let j = i + 1; j < es.length; j++) {
      const b2 = es[j];
      if (!b2.alive || b2.spawnLeft > 0) continue;
      const dx = b2.x - a.x, dy = b2.y - a.y;
      const want = Math.max(sep, (a.radius + b2.radius) * 0.9);
      const d2 = dx * dx + dy * dy;
      if (d2 >= want * want || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const push = ((want - d) / d) * 0.5;
      const px2 = dx * push, py2 = dy * push;
      if (!a.isBoss) { a.x -= px2; a.y -= py2; }
      if (!b2.isBoss) { b2.x += px2; b2.y += py2; }
    }
  }
  world.aliveEnemies = alive;

  /* -- enemy projectiles -------------------------------------------------- */
  const ps = world.projs;
  for (let i = 0; i < ps.length; i++) {
    const pr = ps[i];
    if (!pr.alive) continue;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    if (pr.x < -14 || pr.x > A.width + 14 || pr.y < -14 || pr.y > A.height + 14) {
      pr.alive = false;
      continue;
    }
    const rr = pr.radius + cfg.player.radius;
    const dx = p.x - pr.x, dy = p.y - pr.y;
    if (dx * dx + dy * dy < rr * rr) {
      pr.alive = false;
      hitPlayer(world, cfg, pr.x, pr.y, pr.damage, ev);
      if (world.over) return;
    }
  }

  /* -- wave flow ---------------------------------------------------------- */
  const wave = cfg.waves[world.waveIndex];
  if (world.waveState === 'active') {
    if (wave.boss) {
      // Trickle chasers while the boss lives, capped.
      world.trickleTimer -= dt;
      if (world.trickleTimer <= 0 && trickleAlive < wave.trickleMaxAlive) {
        const t = spawnEnemy(world, cfg, 'chaser', ev);
        if (t) t.isTrickle = true;
        world.trickleTimer = wave.trickleEvery;
      }
    } else {
      if (world.spawnCursor < world.spawnQueue.length) {
        world.spawnTimer -= dt;
        if (world.spawnTimer <= 0) {
          spawnEnemy(world, cfg, world.spawnQueue[world.spawnCursor], ev);
          world.spawnCursor += 1;
          world.spawnTimer = wave.spawnEvery;
        }
      } else if (alive === 0) {
        // Wave cleared → bonus, then the pick-1-of-3 (world + clock held).
        world.wavesCleared = world.waveIndex + 1;
        const bonus = cfg.waveClearBonusBase * (world.waveIndex + 1);
        world.score += bonus;
        ev?.onWaveCleared?.(world.waveIndex, bonus);
        offerUpgrades(world, cfg, ev);
      }
    }
  }
}

/** Session clock expired with the guardian still standing: that is a win. */
export function expireSession(world, cfg, ev) {
  if (world.over) return;
  world.over = true;
  world.won = true;
  world.endCause = 'survived';
  ev?.onWin?.();
}
