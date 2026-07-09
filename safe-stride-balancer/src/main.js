import { decryptToken } from './utils/crypto.js';
import { submitToLMS, updateLeadNew } from './api.js';

// --- GAME CONFIG & CONSTANTS ---
const GOAL_DISTANCE = 1000; // 1000 meters to win
const PLAYER_X = 120; // Fixed player X on screen
const ROAD_Y_PCT = 0.68; // Road position relative to height
const TILT_LIMIT = 0.785; // ~45 degrees in radians
const BASE_SPEED = 20; // 20m/s baseline speed

// Physics Parameters
const GRAVITY_TORQUE = 2.4; // Gravity pull factor on tilt
const DAMPING = 1.6; // Velocity damping
const PLAYER_CONTROL_TORQUE = 4.8; // User correction strength
const WET_ROAD_CONTROL_TORQUE = 2.2; // Halved control on wet road
const BASE_WOBBLE = 0.4; // Natural oscillation force

// Sound System (Web Audio API)
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!audioCtx) return;
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(350, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'shield') {
      // Golden coin/shield collect sound
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.setValueAtTime(375, now + 0.08);
      osc.frequency.setValueAtTime(500, now + 0.16);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.22);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'shield_break') {
      // High pitch sparkle breaking
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.25);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'hit') {
      // Crash sound
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.3);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'warning') {
      // Short beep warning
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.08);
      osc.start(now);
      osc.stop(now + 0.08);
    } else if (type === 'win') {
      // Major chord victory fanfare
      osc.type = 'square';
      const notes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5
      notes.forEach((freq, idx) => {
        const noteOsc = audioCtx.createOscillator();
        const noteGain = audioCtx.createGain();
        noteOsc.type = 'square';
        noteOsc.frequency.setValueAtTime(freq, now + idx * 0.09);
        noteGain.gain.setValueAtTime(0.15, now + idx * 0.09);
        noteGain.gain.exponentialRampToValueAtTime(0.01, now + idx * 0.09 + 0.35);
        noteOsc.connect(noteGain);
        noteGain.connect(audioCtx.destination);
        noteOsc.start(now + idx * 0.09);
        noteOsc.stop(now + idx * 0.09 + 0.35);
      });
    } else if (type === 'lose') {
      // Falling pitch crash
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.6);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
    }
  } catch (err) {
    console.error("Audio error:", err);
  }
}

// --- STATE MANAGEMENT ---
let gameState = 'START'; // START, PLAYING, GAMEOVER, SLOTBOOKING, THANKYOU
let distanceTraveled = 0;
let shieldsCollected = 0;
let hazardsEncountered = 0;
let currentLmsLeadNo = null;

// Controls State
let inputLeft = false;
let inputRight = false;

// Physics variables
let playerAngle = 0; // Theta
let playerAngVel = 0; // Omega
let shieldActive = false;
let invincibilityTimer = 0; // Invincibility flash after shield breaks

// Environment & Spawners
let timeElapsed = 0;
let roadSpeed = BASE_SPEED;
let roadOffset = 0;
let isOnWetRoad = false;
let wetRoadVisualOffset = 0;

// Game Entities lists
let activeObstacles = [];
let activeCollectibles = [];
let activeParticles = [];
let activeFloatingTexts = [];

// Pre-defined level checkpoints (Distance in meters)
const LEVEL_LAYOUT = {
  collectibles: [80, 240, 480, 700, 850], // Shield spawns
  potholes: [150, 420, 720, 920], // Sudden vertical bumps
  recklessDrivers: [320, 620, 900], // Fast passing cars (wind force)
  wetRoads: [
    { start: 500, end: 600 },
    { start: 780, end: 880 }
  ]
};

// Tracking spawned items to prevent double spawning
let spawnedEntities = {
  collectibles: {},
  potholes: {},
  recklessDrivers: {}
};

// Canvas references
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- RESIZING & RESOLUTION ---
let displayWidth = 400;
let displayHeight = 600;

function resizeCanvas() {
  const container = document.getElementById('app-container');
  const rect = container.getBoundingClientRect();
  displayWidth = rect.width || 400;
  displayHeight = rect.height || 600;

  // Set internal resolution double for crispness, then let styling scale down
  canvas.width = displayWidth * 2;
  canvas.height = displayHeight * 2;
  ctx.scale(2, 2);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- DECRYPT TOKEN & URL PARAMS ---
function bootstrapParams() {
  const params = new URLSearchParams(window.location.search);
  const storeParam = (key, storageKey) => {
    const v = params.get(key);
    if (v) sessionStorage.setItem(storageKey, v);
  };
  
  storeParam('userId', 'gamification_userId');
  storeParam('gameId', 'gamification_gameId');
  storeParam('empName', 'gamification_empName');
  storeParam('empMobile', 'gamification_empMobile');
  storeParam('location', 'gamification_location');
  storeParam('zone', 'gamification_zone');
  storeParam('token', 'gamification_token');

  const empMobile = sessionStorage.getItem('gamification_empMobile');
  if (empMobile) sessionStorage.setItem('gamification_emp_mobile', empMobile);

  const token = params.get('token');
  if (token && token !== 'GUEST_SESSION') {
    sessionStorage.setItem('gamification_rawToken', token);
    const payload = decryptToken(token);
    if (payload) {
      ['game_id', 'emp_id', 'emp_name', 'emp_mobile', 'location', 'zone'].forEach((k) => {
        if (payload[k] != null) sessionStorage.setItem(`gamification_${k}`, String(payload[k]));
      });
      sessionStorage.setItem('gamification_referral', payload.referral || 'N');
    }
  }

  if (params.toString()) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Prefill form from sessionStorage
function prefillForm() {
  const name = sessionStorage.getItem('gamification_emp_name') || sessionStorage.getItem('gamification_empName') || '';
  const mobile = sessionStorage.getItem('gamification_emp_mobile') || sessionStorage.getItem('gamification_empMobile') || '';
  const email = sessionStorage.getItem('gamification_email') || '';

  if (name) document.getElementById('lead-name').value = name;
  if (mobile) document.getElementById('lead-mobile').value = mobile;
  if (email) document.getElementById('lead-email').value = email;
}

// --- VISUAL EFFECT GENERATORS ---
function addSparks(x, y, color = '#FF6F3C') {
  for (let i = 0; i < 15; i++) {
    activeParticles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6 - 3,
      radius: Math.random() * 3 + 1,
      color,
      alpha: 1,
      life: 0.5 + Math.random() * 0.5
    });
  }
}

function addFloatingText(text, x, y, color = '#FF6F3C') {
  activeFloatingTexts.push({
    text,
    x,
    y,
    vy: -1.2,
    alpha: 1,
    color,
    life: 1.2
  });
}

// --- GAME LOGIC RESETS ---
function startNewGame() {
  gameState = 'PLAYING';
  distanceTraveled = 0;
  shieldsCollected = 0;
  hazardsEncountered = 0;
  playerAngle = 0;
  playerAngVel = 0;
  shieldActive = false;
  invincibilityTimer = 0;
  timeElapsed = 0;
  isOnWetRoad = false;

  activeObstacles = [];
  activeCollectibles = [];
  activeParticles = [];
  activeFloatingTexts = [];

  // Reset spawn track list
  spawnedEntities.collectibles = {};
  spawnedEntities.potholes = {};
  spawnedEntities.recklessDrivers = {};

  // Toggle DOM panels
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('how-to-play-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('slot-screen').classList.add('hidden');
  document.getElementById('thankyou-screen').classList.add('hidden');
  document.getElementById('game-hud').classList.remove('hidden');
  document.getElementById('controls-overlay').classList.remove('hidden');

  updateHud();
}

function updateHud() {
  document.getElementById('hud-distance').innerText = Math.floor(distanceTraveled);
  const progressPct = Math.min((distanceTraveled / GOAL_DISTANCE) * 100, 100);
  document.getElementById('hud-progress-bar').style.width = `${progressPct}%`;

  // Shield status
  const shieldContainer = document.getElementById('hud-shield-container');
  const shieldText = document.getElementById('hud-shield-text');
  if (shieldActive) {
    shieldContainer.style.opacity = '100%';
    shieldContainer.classList.add('border-brand-accent');
    shieldText.innerText = 'Shield Protected';
    shieldText.classList.remove('text-gray-300');
    shieldText.classList.add('text-brand-accent');
  } else {
    shieldContainer.style.opacity = '40%';
    shieldContainer.classList.remove('border-brand-accent');
    shieldText.innerText = 'No Shield';
    shieldText.classList.remove('text-brand-accent');
    shieldText.classList.add('text-gray-300');
  }

  // Needle angle indicator
  const needle = document.getElementById('balance-needle');
  // Normalize angle to percent: TILT_LIMIT is ~45deg. Map [-TILT_LIMIT, TILT_LIMIT] to [15%, 85%] for safety inside visual bar boundaries
  const normalizedTilt = (playerAngle / TILT_LIMIT); // -1 to 1
  const percentage = 50 + normalizedTilt * 35; // 15% to 85%
  needle.style.left = `calc(${percentage}% - 6px)`;

  // High Tilt warning flashing
  const warningAlert = document.getElementById('hud-warning-alert');
  const container = document.getElementById('app-container');
  if (Math.abs(playerAngle) > TILT_LIMIT * 0.55) {
    warningAlert.classList.remove('hidden');
    container.classList.add('critical-shake');
    // Periodically play warning beep
    if (Math.floor(timeElapsed * 10) % 5 === 0) {
      playSound('warning');
    }
  } else {
    warningAlert.classList.add('hidden');
    container.classList.remove('critical-shake');
  }
}

// --- PHYSICS & COLLISION CHECKS ---
function updatePhysics(dt) {
  timeElapsed += dt;

  // Check if player is on a wet road segment
  isOnWetRoad = false;
  LEVEL_LAYOUT.wetRoads.forEach(seg => {
    if (distanceTraveled >= seg.start && distanceTraveled <= seg.end) {
      isOnWetRoad = true;
    }
  });

  // Target control force
  let torque = 0;
  const controlStrength = isOnWetRoad ? WET_ROAD_CONTROL_TORQUE : PLAYER_CONTROL_TORQUE;
  
  if (inputLeft) {
    torque -= controlStrength; // Tilt left torque
  }
  if (inputRight) {
    torque += controlStrength; // Tilt right torque
  }

  // Wobble / wind force
  const wobbleFreq = isOnWetRoad ? 3.5 : 2.0;
  const wobbleMult = isOnWetRoad ? 1.8 : 1.0;
  // Dynamic wobble increases slightly as distance progresses
  const difficultyFactor = 1.0 + (distanceTraveled / GOAL_DISTANCE) * 0.4;
  const wobble = Math.sin(timeElapsed * wobbleFreq) * BASE_WOBBLE * wobbleMult * difficultyFactor;

  // Inverted pendulum formula: dOmega = (GravityTorque * sin(theta) + Wind/Wobble - Damping*Omega + InputTorque) * dt
  const gravityPush = GRAVITY_TORQUE * Math.sin(playerAngle);
  const angularAcc = gravityPush + wobble - (DAMPING * playerAngVel) + torque;

  playerAngVel += angularAcc * dt;
  playerAngle += playerAngVel * dt;

  // Increment distance
  roadSpeed = isOnWetRoad ? BASE_SPEED * 0.7 : BASE_SPEED;
  distanceTraveled += roadSpeed * dt;

  // Scroll background offset
  roadOffset = (roadOffset + roadSpeed * dt * 5) % 80;

  // Handle invincibility
  if (invincibilityTimer > 0) {
    invincibilityTimer -= dt;
  }

  // Check Victory
  if (distanceTraveled >= GOAL_DISTANCE) {
    distanceTraveled = GOAL_DISTANCE;
    endGame(true);
    return;
  }

  // Check Fall Wipe-out
  if (Math.abs(playerAngle) > TILT_LIMIT) {
    endGame(false);
    return;
  }

  // Trigger entity spawns based on upcoming distance
  triggerSpawning();

  // Update game objects
  updateObstacles(dt);
  updateCollectibles(dt);
  updateParticles(dt);
  updateFloatingTexts(dt);
}

// Spawns entities when distance reaches levels
function triggerSpawning() {
  const aheadDistance = distanceTraveled + 35; // Spawn slightly offscreen right

  // Spawn shield collectibles
  LEVEL_LAYOUT.collectibles.forEach(dist => {
    if (Math.abs(aheadDistance - dist) < 5 && !spawnedEntities.collectibles[dist]) {
      spawnedEntities.collectibles[dist] = true;
      activeCollectibles.push({
        x: displayWidth + 30,
        y: displayHeight * ROAD_Y_PCT - 80 - Math.random() * 20,
        radius: 14,
        scale: 1,
        pulse: 0
      });
    }
  });

  // Spawn potholes
  LEVEL_LAYOUT.potholes.forEach(dist => {
    if (Math.abs(aheadDistance - dist) < 5 && !spawnedEntities.potholes[dist]) {
      spawnedEntities.potholes[dist] = true;
      activeObstacles.push({
        type: 'pothole',
        x: displayWidth + 30,
        y: displayHeight * ROAD_Y_PCT + 10,
        width: 45,
        height: 12,
        speedMultiplier: 1,
        hit: false
      });
    }
  });

  // Spawn reckless drivers
  LEVEL_LAYOUT.recklessDrivers.forEach(dist => {
    if (Math.abs(aheadDistance - dist) < 5 && !spawnedEntities.recklessDrivers[dist]) {
      spawnedEntities.recklessDrivers[dist] = true;
      activeObstacles.push({
        type: 'driver',
        x: displayWidth + 80,
        y: displayHeight * ROAD_Y_PCT - 40,
        width: 85,
        height: 42,
        speedMultiplier: 2.2, // Rides faster than player road speed
        hit: false,
        windTriggered: false
      });
    }
  });
}

function updateObstacles(dt) {
  const roadY = displayHeight * ROAD_Y_PCT;
  
  for (let i = activeObstacles.length - 1; i >= 0; i--) {
    const obs = activeObstacles[i];
    
    // Move obstacle relative to player speed
    // Reckless driver moves faster from right to left
    const speed = roadSpeed * obs.speedMultiplier;
    obs.x -= speed * dt * 5; // 5 scale factor to match visual coordinates

    // Collision detection
    if (!obs.hit) {
      if (obs.type === 'pothole') {
        // Pothole collision at wheel coordinate
        const wheelX = PLAYER_X;
        const wheelY = roadY;
        
        // Pothole bounding oval is around obs.x, obs.y
        const dx = wheelX - obs.x;
        const dy = wheelY - obs.y;
        
        // Distance check inside ellipse
        if ((dx*dx) / (obs.width*obs.width/4) + (dy*dy) / (obs.height*obs.height/4) < 1) {
          obs.hit = true;
          hazardsEncountered++;
          triggerHazardImpact('pothole');
        }
      } else if (obs.type === 'driver') {
        // Reckless Driver creates wind push as it approaches and passes
        if (!obs.windTriggered && obs.x < PLAYER_X + 100 && obs.x > PLAYER_X - 120) {
          obs.windTriggered = true;
          triggerHazardImpact('wind');
        }
        
        // Standard crash collision if they crash directly
        const dx = Math.abs(obs.x - PLAYER_X);
        const dy = Math.abs(obs.y - (roadY - 35));
        if (dx < (obs.width/2 + 15) && dy < (obs.height/2 + 20)) {
          obs.hit = true;
          hazardsEncountered++;
          triggerHazardImpact('driver_crash');
        }
      }
    }

    // Filter out off-screen obstacles
    if (obs.x < -150) {
      activeObstacles.splice(i, 1);
    }
  }
}

function triggerHazardImpact(source) {
  if (shieldActive) {
    shieldActive = false;
    invincibilityTimer = 1.0; // 1 second flash immunity
    playSound('shield_break');
    addSparks(PLAYER_X, displayHeight * ROAD_Y_PCT - 40, '#00E8C6');
    addFloatingText('Safety Net Active!', PLAYER_X, displayHeight * ROAD_Y_PCT - 90, '#00E8C6');
    return;
  }

  if (invincibilityTimer > 0) return; // Currently immune

  // Apply hit penalties
  playSound('hit');
  
  if (source === 'pothole') {
    // Sharp torque impulse in random direction
    const dir = Math.random() < 0.5 ? -1 : 1;
    playerAngVel += dir * 2.5; 
    addSparks(PLAYER_X, displayHeight * ROAD_Y_PCT, '#EA5455');
    addFloatingText('POTHOLE JERK!', PLAYER_X, displayHeight * ROAD_Y_PCT - 70, '#EA5455');
  } else if (source === 'wind') {
    // Constant push sideways
    playerAngVel += 1.8; // Blows right
    addFloatingText('WIND GUST!', PLAYER_X, displayHeight * ROAD_Y_PCT - 80, '#FFC837');
  } else if (source === 'driver_crash') {
    // Huge impact
    const dir = Math.random() < 0.5 ? -1 : 1;
    playerAngVel += dir * 3.8;
    addSparks(PLAYER_X, displayHeight * ROAD_Y_PCT - 35, '#EA5455');
    addFloatingText('CRASH IMPACT!', PLAYER_X, displayHeight * ROAD_Y_PCT - 80, '#EA5455');
  }
}

function updateCollectibles(dt) {
  const roadY = displayHeight * ROAD_Y_PCT;
  
  for (let i = activeCollectibles.length - 1; i >= 0; i--) {
    const col = activeCollectibles[i];
    col.x -= roadSpeed * dt * 5;
    col.pulse += dt * 5;

    // Check collision with player torso (around PLAYER_X, roadY - 45)
    const pTorsoX = PLAYER_X;
    const pTorsoY = roadY - 45;
    const dx = col.x - pTorsoX;
    const dy = col.y - pTorsoY;
    const dist = Math.sqrt(dx*dx + dy*dy);

    if (dist < (col.radius + 20)) {
      // Collected!
      activeCollectibles.splice(i, 1);
      shieldsCollected++;
      playSound('shield');
      
      // Auto-restore balance completely and grant shield
      playerAngle = 0;
      playerAngVel = 0;
      shieldActive = true;
      
      addSparks(col.x, col.y, '#00E8C6');
      addFloatingText('Personal Accident Plan Active!', PLAYER_X, roadY - 95, '#00E8C6');
      addFloatingText('+Shield & Balanced!', PLAYER_X, roadY - 75, '#FFFFFF');
      updateHud();
      continue;
    }

    if (col.x < -50) {
      activeCollectibles.splice(i, 1);
    }
  }
}

function updateParticles(dt) {
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= dt / p.life;
    if (p.alpha <= 0) {
      activeParticles.splice(i, 1);
    }
  }
}

function updateFloatingTexts(dt) {
  for (let i = activeFloatingTexts.length - 1; i >= 0; i--) {
    const ft = activeFloatingTexts[i];
    ft.y += ft.vy;
    ft.alpha -= dt / ft.life;
    if (ft.alpha <= 0) {
      activeFloatingTexts.splice(i, 1);
    }
  }
}

// --- RENDERING CANVAS ---
function drawGame() {
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  // 1. Draw Sky Gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, displayHeight * ROAD_Y_PCT);
  skyGrad.addColorStop(0, '#060f1e');
  skyGrad.addColorStop(1, '#0e2345');
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, displayWidth, displayHeight);

  // Draw sun/moon light glow
  ctx.beginPath();
  ctx.arc(displayWidth * 0.8, 60, 50, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.fill();

  // 2. Draw Stars/Clouds (Parallax Layer 1)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
  const starOffset = (distanceTraveled * 0.4) % displayWidth;
  // Simple repeating stars
  [[40, 20], [120, 45], [200, 15], [290, 50], [380, 25]].forEach(star => {
    let sx = star[0] - starOffset;
    if (sx < 0) sx += displayWidth;
    ctx.fillRect(sx, star[1], 2, 2);
  });

  // 3. Distant City Skyline (Parallax Layer 2)
  ctx.fillStyle = '#0b1b36';
  const skylineOffset = (distanceTraveled * 1.2) % displayWidth;
  const distBuildings = [
    { w: 40, h: 90 }, { w: 35, h: 120 }, { w: 50, h: 70 },
    { w: 30, h: 105 }, { w: 45, h: 80 }, { w: 35, h: 110 }
  ];
  let curX = -skylineOffset;
  while (curX < displayWidth) {
    distBuildings.forEach(bld => {
      ctx.fillRect(curX, displayHeight * ROAD_Y_PCT - bld.h, bld.w + 1, bld.h);
      curX += bld.w;
    });
  }

  // 4. Closer City Skyline (Parallax Layer 3)
  ctx.fillStyle = '#0c2246';
  const nearSkylineOffset = (distanceTraveled * 2.8) % displayWidth;
  const nearBuildings = [
    { w: 55, h: 50 }, { w: 40, h: 80 }, { w: 60, h: 40 },
    { w: 45, h: 65 }, { w: 50, h: 55 }
  ];
  curX = -nearSkylineOffset;
  while (curX < displayWidth) {
    nearBuildings.forEach(bld => {
      ctx.fillRect(curX, displayHeight * ROAD_Y_PCT - bld.h, bld.w + 1, bld.h);
      // Window lights
      ctx.fillStyle = 'rgba(255, 220, 100, 0.08)';
      for (let wx = curX + 5; wx < curX + bld.w - 5; wx += 12) {
        for (let wy = displayHeight * ROAD_Y_PCT - bld.h + 8; wy < displayHeight * ROAD_Y_PCT - 8; wy += 15) {
          ctx.fillRect(wx, wy, 4, 6);
        }
      }
      ctx.fillStyle = '#0c2246'; // Reset back
      curX += bld.w;
    });
  }

  // 5. Draw Wet Roads segments overlay (Background ground)
  LEVEL_LAYOUT.wetRoads.forEach(seg => {
    const startX = PLAYER_X - (distanceTraveled - seg.start) * 5;
    const endX = PLAYER_X - (distanceTraveled - seg.end) * 5;
    if (endX > 0 && startX < displayWidth) {
      // Draw shiny wet surface base
      ctx.beginPath();
      ctx.moveTo(startX, displayHeight * ROAD_Y_PCT);
      ctx.lineTo(endX, displayHeight * ROAD_Y_PCT);
      ctx.lineTo(endX, displayHeight);
      ctx.lineTo(startX, displayHeight);
      ctx.closePath();
      
      const wetGrad = ctx.createLinearGradient(0, displayHeight * ROAD_Y_PCT, 0, displayHeight);
      wetGrad.addColorStop(0, '#0e264d');
      wetGrad.addColorStop(1, '#0d1e3d');
      ctx.fillStyle = wetGrad;
      ctx.fill();

      // Draw water reflections (horizontal blue streaks)
      ctx.strokeStyle = 'rgba(0, 232, 198, 0.15)';
      ctx.lineWidth = 2.5;
      for (let ry = displayHeight * ROAD_Y_PCT + 15; ry < displayHeight - 20; ry += 20) {
        ctx.beginPath();
        ctx.moveTo(Math.max(startX, 0), ry);
        ctx.lineTo(Math.min(endX, displayWidth), ry);
        ctx.stroke();
      }
    }
  });

  // 6. Draw Standard Road Ground
  ctx.fillStyle = '#081730';
  ctx.fillRect(0, displayHeight * ROAD_Y_PCT, displayWidth, displayHeight * (1 - ROAD_Y_PCT));

  // Draw Road shoulders (top boundary line)
  ctx.strokeStyle = '#1D5D9B';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, displayHeight * ROAD_Y_PCT);
  ctx.lineTo(displayWidth, displayHeight * ROAD_Y_PCT);
  ctx.stroke();

  // Draw Scrolling road dashed lane marking
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([20, 20]);
  ctx.beginPath();
  ctx.moveTo(-roadOffset, displayHeight * ROAD_Y_PCT + 40);
  ctx.lineTo(displayWidth + 40, displayHeight * ROAD_Y_PCT + 40);
  ctx.stroke();
  ctx.setLineDash([]); // Reset

  // 7. Draw Wet Road splash particles if player is on wet segment
  if (isOnWetRoad && gameState === 'PLAYING') {
    // Generate brief splash droplets from bottom of wheel
    if (Math.random() < 0.35) {
      activeParticles.push({
        x: PLAYER_X + (Math.random() - 0.5) * 8,
        y: displayHeight * ROAD_Y_PCT,
        vx: -roadSpeed * 0.15 - Math.random() * 2,
        vy: -Math.random() * 3 - 1,
        radius: Math.random() * 2 + 0.5,
        color: '#00E8C6',
        alpha: 0.8,
        life: 0.4
      });
    }
  }

  // 8. Draw Obstacles / Hazards
  activeObstacles.forEach(obs => {
    if (obs.type === 'pothole') {
      // Draw pothole oval
      ctx.fillStyle = '#050c18';
      ctx.beginPath();
      ctx.ellipse(obs.x, obs.y, obs.width/2, obs.height/2, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Outer red warning ring when close
      ctx.strokeStyle = obs.hit ? '#EA5455' : 'rgba(29, 93, 155, 0.6)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else if (obs.type === 'driver') {
      // Draw Reckless Sports Car
      ctx.save();
      ctx.translate(obs.x, obs.y);

      // Body (Sleek red car)
      ctx.fillStyle = '#EA5455';
      ctx.beginPath();
      // Hood
      ctx.moveTo(-obs.width/2, 10);
      ctx.lineTo(-obs.width/2 + 25, 0);
      // Windshield / Roof
      ctx.lineTo(-obs.width/4, -18);
      ctx.lineTo(obs.width/4 - 10, -18);
      ctx.lineTo(obs.width/2 - 15, 6);
      // Rear bumper
      ctx.lineTo(obs.width/2, 12);
      ctx.lineTo(obs.width/2, 22);
      ctx.lineTo(-obs.width/2, 22);
      ctx.closePath();
      ctx.fill();

      // Roof highlight (black windshield/cabin)
      ctx.fillStyle = '#060f1e';
      ctx.beginPath();
      ctx.moveTo(-obs.width/4 + 4, -14);
      ctx.lineTo(obs.width/4 - 12, -14);
      ctx.lineTo(obs.width/3 - 4, 4);
      ctx.lineTo(-obs.width/3, 4);
      ctx.closePath();
      ctx.fill();

      // Headlight glow
      ctx.fillStyle = '#FFF';
      ctx.fillRect(-obs.width/2, 12, 3, 4);

      // Wheels
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(-obs.width/4, 22, 9, 0, Math.PI*2);
      ctx.arc(obs.width/4, 22, 9, 0, Math.PI*2);
      ctx.fill();

      // Exhaust Smoke Particles (visuals)
      if (Math.random() < 0.4) {
        activeParticles.push({
          x: obs.x + obs.width/2,
          y: obs.y + 18,
          vx: Math.random() * 2 + 1,
          vy: (Math.random() - 0.5) * 2,
          radius: Math.random() * 4 + 2,
          color: 'rgba(100,100,100,0.5)',
          alpha: 0.6,
          life: 0.6
        });
      }

      ctx.restore();
    }
  });

  // 9. Draw Collectibles
  activeCollectibles.forEach(col => {
    ctx.save();
    ctx.translate(col.x, col.y);
    
    // Hover bounce effect
    const bounce = Math.sin(col.pulse) * 4;
    ctx.translate(0, bounce);

    // Outer glow
    const outerGlow = ctx.createRadialGradient(0, 0, 2, 0, 0, col.radius + 6);
    outerGlow.addColorStop(0, 'rgba(0, 232, 198, 0.4)');
    outerGlow.addColorStop(1, 'rgba(0, 232, 198, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, col.radius + 6, 0, Math.PI * 2);
    ctx.fill();

    // Shield base drawing
    ctx.fillStyle = '#00E8C6';
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -col.radius); // Top center
    ctx.quadraticCurveTo(col.radius, -col.radius, col.radius, -col.radius/3);
    ctx.quadraticCurveTo(col.radius, col.radius/3, 0, col.radius);
    ctx.quadraticCurveTo(-col.radius, col.radius/3, -col.radius, -col.radius/3);
    ctx.quadraticCurveTo(-col.radius, -col.radius, 0, -col.radius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Shield inner details (Cross/Heart symbol representing Accident coverage protection)
    ctx.strokeStyle = '#0F2C59';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    // Vertical line
    ctx.moveTo(0, -col.radius + 5);
    ctx.lineTo(0, col.radius - 5);
    // Horizontal line
    ctx.moveTo(-col.radius + 5, -1);
    ctx.lineTo(col.radius - 5, -1);
    ctx.stroke();

    ctx.restore();
  });

  // 10. Draw Commuter Player
  const roadY = displayHeight * ROAD_Y_PCT;
  ctx.save();
  // Pivot everything on the road contact point
  ctx.translate(PLAYER_X, roadY);
  
  // Apply physics tilt rotation
  ctx.rotate(playerAngle);

  // Invincibility flashing look
  let isFlashHidden = false;
  if (invincibilityTimer > 0) {
    // Flash every 0.1s
    if (Math.floor(invincibilityTimer * 10) % 2 === 0) {
      isFlashHidden = true;
    }
  }

  if (!isFlashHidden) {
    // --- DRAW UNICYCLE ---
    // A. Wheel
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2.5;
    ctx.fillStyle = '#1F2937';
    ctx.beginPath();
    // Rotate wheel spokes visually based on distance
    const wheelRot = (distanceTraveled * 0.8) % (Math.PI * 2);
    ctx.arc(0, -15, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Spokes
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      const angle = wheelRot + (i * Math.PI / 3);
      ctx.beginPath();
      ctx.moveTo(0, -15);
      ctx.lineTo(Math.cos(angle) * 15, -15 + Math.sin(angle) * 15);
      ctx.stroke();
    }

    // Pedals and Crankset
    const pedalRot = wheelRot; //pedal synced with wheel
    const crankLength = 10;
    const pedal1X = Math.cos(pedalRot) * crankLength;
    const pedal1Y = -15 + Math.sin(pedalRot) * crankLength;
    const pedal2X = -Math.cos(pedalRot) * crankLength;
    const pedal2Y = -15 - Math.sin(pedalRot) * crankLength;

    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2.5;
    // Crank 1
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(pedal1X, pedal1Y);
    ctx.stroke();
    // Pedal 1 block
    ctx.fillStyle = '#4B5563';
    ctx.fillRect(pedal1X - 4, pedal1Y - 1.5, 8, 3);

    // Crank 2
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(pedal2X, pedal2Y);
    ctx.stroke();
    // Pedal 2 block
    ctx.fillRect(pedal2X - 4, pedal2Y - 1.5, 8, 3);

    // B. Unicycle Fork (Frame pole from wheel hub to seat)
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -15);
    ctx.lineTo(0, -32); // Seat post height
    ctx.stroke();

    // Saddle / Seat
    ctx.fillStyle = '#060f1e';
    ctx.beginPath();
    ctx.roundRect(-7, -35, 14, 4, 1.5);
    ctx.fill();

    // --- DRAW RIDER ---
    const riderY = -35; // Position relative to seat

    // 1. Hips & Torso
    ctx.fillStyle = '#FF6F3C'; // Orange safety commute jersey
    ctx.beginPath();
    ctx.roundRect(-6, riderY - 26, 12, 26, 3);
    ctx.fill();

    // 2. Helmet & Head
    ctx.fillStyle = '#FEE2E2'; // Face
    ctx.beginPath();
    ctx.arc(0, riderY - 34, 6, 0, Math.PI * 2);
    ctx.fill();

    // Helmet (Orange brand color safety helmet!)
    ctx.fillStyle = '#FF6F3C';
    ctx.beginPath();
    ctx.arc(0, riderY - 35, 6.5, Math.PI, 0); // Helmet dome
    ctx.fill();
    // Helmet visor
    ctx.fillRect(-8, riderY - 36, 11, 2.2);

    // 3. Legs (Connected to hip & pedals)
    const hipX = 0;
    const hipY = riderY - 4;

    ctx.strokeStyle = '#1D5D9B'; // Blue commuter pants
    ctx.lineWidth = 3.5;

    // Leg 1 (hip -> pedal 1)
    // Simple kinematics: hip -> knee -> pedal
    const knee1X = (hipX + pedal1X) / 2 + 5;
    const knee1Y = (hipY + pedal1Y) / 2;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(knee1X, knee1Y);
    ctx.lineTo(pedal1X, pedal1Y);
    ctx.stroke();

    // Leg 2 (hip -> pedal 2)
    const knee2X = (hipX + pedal2X) / 2 - 5;
    const knee2Y = (hipY + pedal2Y) / 2;
    ctx.beginPath();
    ctx.moveTo(hipX, hipY);
    ctx.lineTo(knee2X, knee2Y);
    ctx.lineTo(pedal2X, pedal2Y);
    ctx.stroke();

    // 4. Arms & Balance Pole
    // Draw a long balance pole representing the commuter balancing their risks
    const poleY = riderY - 14;
    const poleHalfLength = 48;

    // Drawing hands holding the pole
    ctx.fillStyle = '#FEE2E2';
    ctx.beginPath();
    ctx.arc(-8, poleY + 2, 2.5, 0, Math.PI * 2);
    ctx.arc(8, poleY + 2, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Draw the pole
    ctx.strokeStyle = '#9CA3AF'; // Silver metal
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-poleHalfLength, poleY);
    ctx.lineTo(poleHalfLength, poleY);
    ctx.stroke();

    // High vis orange weights/flags on ends of pole
    ctx.fillStyle = '#FF6F3C';
    ctx.beginPath();
    ctx.arc(-poleHalfLength, poleY, 5, 0, Math.PI * 2);
    ctx.arc(poleHalfLength, poleY, 5, 0, Math.PI * 2);
    ctx.fill();

    // 5. Draw Personal Accident Protection Shield (Aura shield)
    if (shieldActive) {
      ctx.strokeStyle = 'rgba(0, 232, 198, 0.7)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      // Pulsing effect
      const shieldPulse = 55 + Math.sin(timeElapsed * 10) * 3;
      ctx.arc(0, riderY - 15, shieldPulse, 0, Math.PI * 2);
      ctx.stroke();
      
      // Light blue tint inside aura
      ctx.fillStyle = 'rgba(0, 232, 198, 0.05)';
      ctx.fill();
    }
  }

  ctx.restore();

  // 11. Draw Particles (Sparks, splashing)
  activeParticles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 12. Draw Floating Texts
  activeFloatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = ft.alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 10px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });
}

// --- GAME LOOP ---
let lastTime = 0;

function gameLoop(timestamp) {
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / 1000;
  
  // Cap dt to prevent massive jumps when tab goes inactive
  if (dt > 0.1) dt = 0.1;
  lastTime = timestamp;

  if (gameState === 'PLAYING') {
    updatePhysics(dt);
    drawGame();
  }

  requestAnimationFrame(gameLoop);
}

// --- STATE END TRANSITIONS (GAME OVER/WIN) ---
function endGame(isWin) {
  gameState = 'GAMEOVER';
  playSound(isWin ? 'win' : 'lose');
  
  // Remove container shake alert
  document.getElementById('app-container').classList.remove('critical-shake');
  
  // Display Results
  document.getElementById('hud-warning-alert').classList.add('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('controls-overlay').classList.add('hidden');

  const gameOverScreen = document.getElementById('gameover-screen');
  gameOverScreen.classList.remove('hidden');

  const title = document.getElementById('gameover-title');
  const subtitle = document.getElementById('gameover-subtitle');
  const statusBadge = document.getElementById('summary-status');

  if (isWin) {
    title.innerText = "COMMUTE SECURED!";
    title.classList.remove('text-red-500');
    title.classList.add('text-white');
    subtitle.innerText = "1000m Safely Covered";
    statusBadge.innerText = "SECURED";
    statusBadge.className = "text-xs font-black px-2.5 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30 mt-1 uppercase";
  } else {
    title.innerText = "COMMUTE WIPE-OUT!";
    title.classList.remove('text-white');
    title.classList.add('text-red-500');
    subtitle.innerText = "Lost Balance on the Road";
    statusBadge.innerText = "INCOMPLETE";
    statusBadge.className = "text-xs font-black px-2.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 mt-1 uppercase";
  }

  document.getElementById('summary-distance').innerText = `${Math.floor(distanceTraveled)}m`;
  document.getElementById('summary-shields').innerText = shieldsCollected;

  prefillForm();
}

// --- API SUBMISSIONS (LMS) ---
async function handleLeadFormSubmit(e) {
  e.preventDefault();
  initAudio();
  playSound('click');

  const nameInput = document.getElementById('lead-name');
  const mobileInput = document.getElementById('lead-mobile');
  const emailInput = document.getElementById('lead-email');
  const errorAlert = document.getElementById('lead-form-error');
  const submitBtnText = document.getElementById('submit-btn-text');
  const spinner = document.getElementById('submit-btn-spinner');

  errorAlert.classList.add('hidden');
  errorAlert.innerText = "";

  // Validate values
  const name = nameInput.value.trim();
  const mobile = mobileInput.value.trim();
  const email = emailInput.value.trim();

  if (name.length < 2) {
    errorAlert.innerText = "Please enter a valid full name.";
    errorAlert.classList.remove('hidden');
    return;
  }
  if (!/^[6-9][0-9]{9}$/.test(mobile)) {
    errorAlert.innerText = "Mobile number must be 10 digits starting with 6-9.";
    errorAlert.classList.remove('hidden');
    return;
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    errorAlert.innerText = "Please enter a valid email address.";
    errorAlert.classList.remove('hidden');
    return;
  }
  const consentChecked = document.getElementById('lead-consent').checked;
  if (!consentChecked) {
    errorAlert.innerText = "Please agree and consent to the T&C.";
    errorAlert.classList.remove('hidden');
    return;
  }

  // Loading spinner activation
  submitBtnText.innerText = "Submitting...";
  spinner.classList.remove('hidden');
  
  // Disable button
  const submitBtn = document.getElementById('btn-submit-lead');
  submitBtn.disabled = true;

  const scorePct = Math.min(Math.round((distanceTraveled / GOAL_DISTANCE) * 100), 100);

  const lmsPayload = {
    fullName: name,
    mobile: mobile,
    email_id: email,
    score: scorePct,
    summary_dtls: `Accident Shields Collected: ${shieldsCollected} | Hazards Encountered: ${hazardsEncountered} | Game Over Distance: ${Math.floor(distanceTraveled)}m`
  };

  try {
    const res = await submitToLMS(lmsPayload);
    if (res.success && res.data && res.data.leadNo) {
      currentLmsLeadNo = res.data.leadNo;
      
      // Success: Move to slot booking
      gameState = 'SLOTBOOKING';
      document.getElementById('gameover-screen').classList.add('hidden');
      document.getElementById('slot-screen').classList.remove('hidden');
    } else {
      // API succeeded but no lead ID returned
      console.warn("LMS submission response error:", res);
      // Failover: allow slot booking anyway to prevent blocking
      currentLmsLeadNo = "FAILOVER_LEAD_001";
      gameState = 'SLOTBOOKING';
      document.getElementById('gameover-screen').classList.add('hidden');
      document.getElementById('slot-screen').classList.remove('hidden');
    }
  } catch (err) {
    console.error("Submission failed:", err);
    errorAlert.innerText = "Network error. Please try again.";
    errorAlert.classList.remove('hidden');
  } finally {
    submitBtnText.innerText = "Submit Details";
    spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

async function handleSlotFormSubmit(e) {
  e.preventDefault();
  initAudio();
  playSound('click');

  const dateInput = document.getElementById('slot-date');
  const timeInput = document.getElementById('slot-time');
  const errorAlert = document.getElementById('slot-form-error');
  const confirmBtn = document.getElementById('btn-confirm-slot');
  const spinner = document.getElementById('slot-btn-spinner');

  errorAlert.classList.add('hidden');
  errorAlert.innerText = "";

  const date = dateInput.value;
  const timeSlot = timeInput.value;

  if (!date || !timeSlot) {
    errorAlert.innerText = "Please fill in both Date and Time fields.";
    errorAlert.classList.remove('hidden');
    return;
  }

  // Loading spinner
  confirmBtn.disabled = true;
  spinner.classList.remove('hidden');

  const slotPayload = {
    name: document.getElementById('lead-name').value.trim(),
    mobile: document.getElementById('lead-mobile').value.trim(),
    date: date,
    time: timeSlot,
    remarks: `Safe Stride Callback | Distance: ${Math.floor(distanceTraveled)}m`
  };

  try {
    const res = await updateLeadNew(currentLmsLeadNo || 'UNKNOWN', slotPayload);
    if (res.success) {
      // Transition to thank you
      gameState = 'THANKYOU';
      document.getElementById('slot-screen').classList.add('hidden');
      document.getElementById('thankyou-screen').classList.remove('hidden');
    } else {
      console.warn("Slot booking response error:", res);
      // Skip/fallback
      gameState = 'THANKYOU';
      document.getElementById('slot-screen').classList.add('hidden');
      document.getElementById('thankyou-screen').classList.remove('hidden');
    }
  } catch (err) {
    console.error("Slot update failed:", err);
    errorAlert.innerText = "Network issue. Skip or try again.";
    errorAlert.classList.remove('hidden');
  } finally {
    spinner.classList.add('hidden');
    confirmBtn.disabled = false;
  }
}

// --- DOM EVENT EVENT HANDLERS ---
function setupEventListeners() {
  // Start Game
  document.getElementById('btn-start').addEventListener('click', () => {
    initAudio();
    playSound('click');
    startNewGame();
  });

  // How to Play modal toggle
  document.getElementById('btn-how-to-play').addEventListener('click', () => {
    initAudio();
    playSound('click');
    document.getElementById('how-to-play-screen').classList.remove('hidden');
  });
  
  document.getElementById('btn-close-how-to').addEventListener('click', () => {
    initAudio();
    playSound('click');
    document.getElementById('how-to-play-screen').classList.add('hidden');
  });

  // Skip Lead Form
  document.getElementById('btn-skip-lead').addEventListener('click', () => {
    initAudio();
    playSound('click');
    document.getElementById('gameover-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    gameState = 'START';
  });

  // Skip Slot Booking
  document.getElementById('btn-skip-slot').addEventListener('click', () => {
    initAudio();
    playSound('click');
    gameState = 'THANKYOU';
    document.getElementById('slot-screen').classList.add('hidden');
    document.getElementById('thankyou-screen').classList.remove('hidden');
  });

  // Thankyou Reset
  document.getElementById('btn-thankyou-restart').addEventListener('click', () => {
    initAudio();
    playSound('click');
    document.getElementById('thankyou-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
    gameState = 'START';
  });

  // Terms modal toggle
  document.getElementById('btn-open-terms').addEventListener('click', () => {
    initAudio();
    playSound('click');
    document.getElementById('terms-modal').classList.remove('hidden');
  });
  document.getElementById('btn-close-terms').addEventListener('click', () => {
    initAudio();
    playSound('click');
    document.getElementById('terms-modal').classList.add('hidden');
  });
  document.getElementById('btn-agree-terms').addEventListener('click', () => {
    initAudio();
    playSound('click');
    document.getElementById('lead-consent').checked = true;
    document.getElementById('terms-modal').classList.add('hidden');
  });

  // Lead Submission
  document.getElementById('lead-form').addEventListener('submit', handleLeadFormSubmit);
  
  // Slot Submission
  document.getElementById('slot-form').addEventListener('submit', handleSlotFormSubmit);

  // --- BUTTON TOUCH AND KEY CONTROLS ---
  const leftBtn = document.getElementById('btn-tilt-left');
  const rightBtn = document.getElementById('btn-tilt-right');

  // Left Button
  const onLeftStart = (e) => {
    if (e) e.preventDefault();
    initAudio();
    inputLeft = true;
  };
  const onLeftEnd = (e) => {
    if (e) e.preventDefault();
    inputLeft = false;
  };
  leftBtn.addEventListener('touchstart', onLeftStart, { passive: false });
  leftBtn.addEventListener('touchend', onLeftEnd, { passive: false });
  leftBtn.addEventListener('mousedown', onLeftStart);
  leftBtn.addEventListener('mouseup', onLeftEnd);
  leftBtn.addEventListener('mouseleave', onLeftEnd);

  // Right Button
  const onRightStart = (e) => {
    if (e) e.preventDefault();
    initAudio();
    inputRight = true;
  };
  const onRightEnd = (e) => {
    if (e) e.preventDefault();
    inputRight = false;
  };
  rightBtn.addEventListener('touchstart', onRightStart, { passive: false });
  rightBtn.addEventListener('touchend', onRightEnd, { passive: false });
  rightBtn.addEventListener('mousedown', onRightStart);
  rightBtn.addEventListener('mouseup', onRightEnd);
  rightBtn.addEventListener('mouseleave', onRightEnd);

  // Keyboard fallbacks
  window.addEventListener('keydown', (e) => {
    if (gameState !== 'PLAYING') return;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      inputLeft = true;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      inputRight = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      inputLeft = false;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      inputRight = false;
    }
  });
}

// --- BOOTSTRAP INITIALIZATION ---
bootstrapParams();
setupEventListeners();
requestAnimationFrame(gameLoop);
