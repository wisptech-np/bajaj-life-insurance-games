import { submitToLMS, updateLeadNew, extractLeadNo, LEAD_NO_KEY } from './api.js';
import { incrementPlayCount } from './services/playCount.js';
import { decryptToken, buildShareUrl } from './utils/crypto.js';

// ── SESSION MANAGEMENT & TOKEN DECRYPTION ────────────────────────────────────
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

// Increment play count on load
incrementPlayCount();

// ── CANVAS CONFIGURATION ─────────────────────────────────────────────────────
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

const GAME_WIDTH = 480;
const GAME_HEIGHT = 800;

// Handle responsive canvas scaling with devicePixelRatio for retina crispness
const DPR = Math.min(window.devicePixelRatio || 1, 2);
function resizeCanvas() {
  const container = document.getElementById('canvas-container');
  const w = container.clientWidth;
  const h = container.clientHeight;
  canvas.width = w * DPR;
  canvas.height = h * DPR;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── WEB AUDIO API SYNTHESIZER ────────────────────────────────────────────────
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playSound(type) {
  try {
    const context = getAudioContext();
    if (!context) return;

    const osc = context.createOscillator();
    const gainNode = context.createGain();
    osc.connect(gainNode);
    gainNode.connect(context.destination);

    const now = context.currentTime;

    if (type === 'jump') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.12);
      gainNode.gain.setValueAtTime(0.08, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.12);
      osc.start(now);
      osc.stop(now + 0.12);
    } else if (type === 'coin') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
      gainNode.gain.setValueAtTime(0.12, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    } else if (type === 'spring') {
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, now); // A3
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.35);
      gainNode.gain.setValueAtTime(0.18, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else if (type === 'shield') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(349.23, now); // F4
      osc.frequency.setValueAtTime(440.00, now + 0.08); // A4
      osc.frequency.setValueAtTime(523.25, now + 0.16); // C5
      osc.frequency.setValueAtTime(698.46, now + 0.24); // F5
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.45);
      osc.start(now);
      osc.stop(now + 0.45);
    } else if (type === 'rescue') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.8);
      
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(500, now);
      filter.frequency.exponentialRampToValueAtTime(20, now + 0.8);
      
      osc.disconnect(gainNode);
      osc.connect(filter);
      filter.connect(gainNode);

      gainNode.gain.setValueAtTime(0.35, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.8);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (type === 'gameover') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.linearRampToValueAtTime(60, now + 0.7);
      gainNode.gain.setValueAtTime(0.2, now);
      gainNode.gain.linearRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.7);
    } else if (type === 'victory') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        const o = context.createOscillator();
        const g = context.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(freq, now + idx * 0.08);
        g.gain.setValueAtTime(0.08, now + idx * 0.08);
        g.gain.linearRampToValueAtTime(0.001, now + idx * 0.08 + 0.4);
        o.connect(g);
        g.connect(context.destination);
        o.start(now + idx * 0.08);
        o.stop(now + idx * 0.08 + 0.4);
      });
    }
  } catch (e) {
    console.error('Audio failed:', e);
  }
}

// ── GAME CONSTANTS & STATE ───────────────────────────────────────────────────
const GRAVITY = 0.35;
const JUMP_FORCE = 11.5;
const SPRING_BOOST = 18.5;
const PLAYER_MAX_SPEED = 7.5;
const PLAYER_ACCEL = 0.65;
const PLAYER_DRAG = 0.86;

const STAGES = {
  PRIMARY: { min: 0, max: 800, name: 'Primary School', color: '#22c55e', text: 'Secure foundations with regular savings.' },
  SECONDARY: { min: 800, max: 1800, name: 'Secondary School', color: '#f97316', text: 'Shield high school milestones.' },
  HIGH: { min: 1800, max: 2800, name: 'High School', color: '#eab308', text: 'Higher studies approach. Grow educational funds.' },
  COLLEGE: { min: 2800, max: 3800, name: 'College Prep', color: '#3b82f6', text: 'Empower graduation dreams.' },
  GRAD: { min: 3800, max: 4800, name: 'Graduation', color: '#a855f7', text: 'Achieve career milestones.' },
  ABROAD: { min: 4800, max: 99999, name: 'Study Abroad', color: '#eab308', text: 'Launch globally with Bajaj Allianz Child Protection!' }
};

let gameState = 'START'; // START, PLAYING, RESCUE_ANIM, GAMEOVER, VICTORY
let score = 0;
let highestAltitude = 0;
let cameraY = 0; // World coordinates
let platforms = [];
let coins = [];
let shields = [];
let particles = [];
let stars = [];
let shieldActiveCount = 0;
let screenShake = 0;

// Combo counters
let coinCombo = 0;
let comboTimer = 0;

const player = {
  x: GAME_WIDTH / 2,
  y: 120, // World Y (increases going up)
  vx: 0,
  vy: 0,
  width: 32,
  height: 32,
  shields: 0,
  isShieldBoosted: false,
  shieldBoostTimer: 0,
  facingRight: true
};

// Mobile Touch Control Variables
let leftBtnPressed = false;
let rightBtnPressed = false;

// ── PARALLAX BACKGROUND SYSTEM (Stars + Clouds + Motes) ─────────────────────
let clouds = [];
let bgMotes = [];

function initStars() {
  stars = [];
  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random(),
      speed: Math.random() * 0.15 + 0.05,
      twinkleSpeed: Math.random() * 0.04 + 0.01,
      twinklePhase: Math.random() * Math.PI * 2
    });
  }
  // Generate parallax clouds
  clouds = [];
  for (let i = 0; i < 12; i++) {
    clouds.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      width: Math.random() * 80 + 50,
      height: Math.random() * 25 + 15,
      speed: Math.random() * 0.08 + 0.02,
      opacity: Math.random() * 0.08 + 0.03
    });
  }
  // Generate floating motes (small atmospheric particles)
  bgMotes = [];
  for (let i = 0; i < 25; i++) {
    bgMotes.push({
      x: Math.random() * GAME_WIDTH,
      y: Math.random() * GAME_HEIGHT,
      size: Math.random() * 2 + 1,
      speed: Math.random() * 0.04 + 0.01,
      driftX: Math.random() * 0.3 - 0.15,
      opacity: Math.random() * 0.15 + 0.05,
      phase: Math.random() * Math.PI * 2
    });
  }
}
initStars();

// ── LANDING DUST PARTICLE SYSTEM ─────────────────────────────────────────────
let dustParticles = [];
function spawnDustParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const angle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.8;
    const speed = Math.random() * 2 + 0.5;
    dustParticles.push({
      x: x + (Math.random() - 0.5) * 20,
      y: y,
      vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? -1 : 1),
      vy: -Math.random() * 1.5 - 0.5,
      size: Math.random() * 3 + 1.5,
      alpha: 0.6 + Math.random() * 0.3,
      life: 20 + Math.random() * 15,
      maxLife: 20 + Math.random() * 15
    });
  }
}
function updateDustParticles() {
  for (let i = dustParticles.length - 1; i >= 0; i--) {
    const d = dustParticles[i];
    d.x += d.vx;
    d.y += d.vy;
    d.vy += 0.05;
    d.vx *= 0.96;
    d.alpha = (d.life / d.maxLife) * 0.6;
    d.life--;
    if (d.life <= 0) dustParticles.splice(i, 1);
  }
}

// ── SPARKLE SYSTEM (for coins/powerups) ──────────────────────────────────────
let sparkles = [];
function spawnSparkle(x, y, color) {
  sparkles.push({
    x: x + (Math.random() - 0.5) * 12,
    y: y + (Math.random() - 0.5) * 12,
    size: Math.random() * 3 + 1,
    alpha: 1,
    life: 15 + Math.random() * 10,
    color: color || '#FFD700'
  });
}
function updateSparkles() {
  for (let i = sparkles.length - 1; i >= 0; i--) {
    const s = sparkles[i];
    s.alpha -= 1 / s.life;
    s.size *= 0.96;
    if (s.alpha <= 0) sparkles.splice(i, 1);
  }
}

// ── ACADEMIC SUBJECT LABELS BY STAGE ──────────────────────────────────────────
const SUBJECTS = {
  primary: ['Alphabets', 'Numbers', 'Colors', 'Shapes', 'Drawing', 'Crafts'],
  secondary: ['Grammar', 'Algebra', 'Geography', 'History', 'Civics', 'Poetry'],
  high: ['Calculus', 'Physics', 'Chemistry', 'Biology', 'Literature', 'Coding'],
  college: ['Engineering', 'Medicine', 'Finances', 'Economics', 'Management', 'Law'],
  grad: ['Bachelors', 'PhD Prep', 'Thesis', 'Research', 'Mastery', 'Final Exams']
};

function getRandomLabel(stageKey) {
  const list = SUBJECTS[stageKey] || ['Study'];
  return list[Math.floor(Math.random() * list.length)];
}

// ── PLATFORM & ITEM GENERATION ───────────────────────────────────────────────
let highestPlatformY = 0;

function createPlatform(y, stageKey) {
  const width = Math.max(62, 95 - (y / 110)); // Shrink as we go higher
  const x = Math.random() * (GAME_WIDTH - width - 40) + 20;
  
  // Platform Type Selection based on height
  let type = 'standard';
  const rand = Math.random();
  if (y > 800) {
    if (rand < 0.26) type = 'moving';
    else if (rand < 0.36 && y > 1400) type = 'spring';
    else if (rand < 0.46 && y > 2400) type = 'disappearing';
  }

  const label = getRandomLabel(stageKey);

  platforms.push({
    x,
    y,
    width,
    height: 15,
    type,
    stageKey,
    label,
    vx: type === 'moving' ? (Math.random() * 1.6 + 0.8) * (Math.random() < 0.5 ? 1 : -1) : 0,
    broken: false,
    timer: 0
  });

  // Spawn Coins (Savings)
  if (type !== 'disappearing' && Math.random() < 0.30) {
    coins.push({
      x: x + width / 2,
      y: y + 25,
      width: 18,
      height: 18,
      collected: false,
      pulse: Math.random() * 10
    });
  }

  // Spawn Protection Shield
  if (type !== 'disappearing' && Math.random() < 0.09) {
    shields.push({
      x: x + Math.random() * (width - 20) + 10,
      y: y + 28,
      width: 22,
      height: 22,
      collected: false
    });
  }
}

function getStageKey(y) {
  if (y < STAGES.PRIMARY.max) return 'primary';
  if (y < STAGES.SECONDARY.max) return 'secondary';
  if (y < STAGES.HIGH.max) return 'high';
  if (y < STAGES.COLLEGE.max) return 'college';
  if (y < STAGES.GRAD.max) return 'grad';
  return 'abroad';
}

function generateWorld(targetY) {
  if (platforms.length === 0) {
    // Starting platform
    platforms.push({
      x: GAME_WIDTH / 2 - 50,
      y: 80,
      width: 100,
      height: 15,
      type: 'standard',
      stageKey: 'primary',
      label: 'Primary School',
      broken: false
    });
    highestPlatformY = 80;
  }

  while (highestPlatformY < targetY + GAME_HEIGHT * 1.5) {
    const stageKey = getStageKey(highestPlatformY);
    let step = Math.random() * 30 + 95;
    if (stageKey === 'secondary') step = Math.random() * 35 + 110;
    else if (stageKey === 'high') step = Math.random() * 40 + 120;
    else if (stageKey === 'college') step = Math.random() * 40 + 130;
    else if (stageKey === 'grad') step = Math.random() * 40 + 140;

    highestPlatformY += step;

    if (highestPlatformY < 5000) {
      createPlatform(highestPlatformY, stageKey);
    } else {
      if (!platforms.find(p => p.type === 'victory_gate')) {
        platforms.push({
          x: GAME_WIDTH / 2 - 80,
          y: 5000,
          width: 160,
          height: 35,
          type: 'victory_gate',
          stageKey: 'abroad',
          label: 'STUDY ABROAD GRADUATION',
          broken: false
        });
        highestPlatformY = 5100;
      }
      break;
    }
  }
}

// ── PARTICLE EFFECTS ─────────────────────────────────────────────────────────
function spawnParticles(x, y, color, count = 10, speed = 3) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = Math.random() * speed + 1;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force,
      size: Math.random() * 4 + 2,
      color,
      alpha: 1,
      life: Math.random() * 30 + 20
    });
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= 1 / p.life;
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

// ── INPUT MANAGEMENT ─────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', (e) => {
  keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
  keys[e.code] = false;
});

// Canvas screen taps for easy left/right movement
window.addEventListener('touchstart', (e) => {
  if (gameState !== 'PLAYING') return;
  
  // Try to unlock Web Audio context on user gesture
  getAudioContext();
  
  const touch = e.touches[0];
  const screenWidth = window.innerWidth;
  if (touch.clientX < screenWidth / 2) {
    leftBtnPressed = true;
  } else {
    rightBtnPressed = true;
  }
}, { passive: true });

window.addEventListener('touchend', (e) => {
  if (e.touches.length === 0) {
    leftBtnPressed = false;
    rightBtnPressed = false;
  }
}, { passive: true });

// Explicit buttons
const leftBtn = document.getElementById('btn-left');
const rightBtn = document.getElementById('btn-right');

const handleLeftDown = (e) => { e.preventDefault(); getAudioContext(); leftBtnPressed = true; };
const handleLeftUp = (e) => { e.preventDefault(); leftBtnPressed = false; };
const handleRightDown = (e) => { e.preventDefault(); getAudioContext(); rightBtnPressed = true; };
const handleRightUp = (e) => { e.preventDefault(); rightBtnPressed = false; };

leftBtn.addEventListener('mousedown', handleLeftDown);
leftBtn.addEventListener('mouseup', handleLeftUp);
leftBtn.addEventListener('mouseleave', handleLeftUp);
leftBtn.addEventListener('touchstart', handleLeftDown, { passive: false });
leftBtn.addEventListener('touchend', handleLeftUp, { passive: false });

rightBtn.addEventListener('mousedown', handleRightDown);
rightBtn.addEventListener('mouseup', handleRightUp);
rightBtn.addEventListener('mouseleave', handleRightUp);
rightBtn.addEventListener('touchstart', handleRightDown, { passive: false });
rightBtn.addEventListener('touchend', handleRightUp, { passive: false });

// Prevent default scrolling on mobile touch zones
document.body.addEventListener('touchmove', (e) => {
  if (gameState === 'PLAYING') {
    e.preventDefault();
  }
}, { passive: false });

// ── RESTART AND GAME INITIALIZATION ──────────────────────────────────────────
function initGame() {
  // Unlock audio
  getAudioContext();
  
  gameState = 'PLAYING';
  score = 0;
  highestAltitude = 0;
  cameraY = 0;
  platforms = [];
  coins = [];
  shields = [];
  particles = [];
  
  player.x = GAME_WIDTH / 2;
  player.y = 120;
  player.vx = 0;
  player.vy = 0;
  player.shields = 0;
  player.isShieldBoosted = false;
  player.shieldBoostTimer = 0;
  
  shieldActiveCount = 0;
  updateShieldHUD();
  
  coinCombo = 0;
  comboTimer = 0;
  screenShake = 0;
  
  generateWorld(0);
  
  // UI setups
  document.getElementById('game-hud').classList.remove('hidden');
  document.getElementById('side-progress-bar').classList.remove('hidden');
  document.getElementById('mobile-controls').classList.remove('hidden');
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('tutorial-screen').classList.add('hidden');
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('thankyou-screen').classList.add('hidden');
}

// ── SHIELD HUD UPDATE ────────────────────────────────────────────────────────
function updateShieldHUD() {
  const container = document.getElementById('hud-shields-container');
  container.innerHTML = '';
  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = `w-4 h-4 rounded-full border border-white transition-all duration-300 ${
      i < player.shields ? 'bg-bjBlueLight shadow-[0_0_8px_#3b8dd4] scale-110' : 'bg-transparent border-white/40'
    }`;
    container.appendChild(dot);
  }
}

// ── HIGHLIGHT SIDE PROGRESS NODE ─────────────────────────────────────────────
function updateProgressBar(alt) {
  const nodes = [
    { id: 'node-pri', max: 800 },
    { id: 'node-sec', max: 1800 },
    { id: 'node-high', max: 2800 },
    { id: 'node-college', max: 3800 },
    { id: 'node-grad', max: 4800 },
    { id: 'node-abroad', max: 5000 }
  ];

  nodes.forEach((n, idx) => {
    const elem = document.getElementById(n.id);
    if (!elem) return;
    
    const prevMax = idx === 0 ? 0 : nodes[idx - 1].max;
    if (alt >= prevMax && alt < n.max) {
      elem.className = 'progress-node active';
    } else if (alt >= n.max) {
      elem.className = 'progress-node completed';
    } else {
      elem.className = 'progress-node';
    }
  });

  const percent = Math.min(100, (alt / 5000) * 100);
  document.getElementById('progress-fill-bar').style.height = `${percent}%`;
}

// ── SHIELD RESCUE BOOST LOGIC ────────────────────────────────────────────────
function triggerShieldRescue() {
  gameState = 'RESCUE_ANIM';
  player.shields--;
  updateShieldHUD();
  
  // Audio chime
  playSound('rescue');
  screenShake = 25; // Shake intensely
  
  player.isShieldBoosted = true;
  player.shieldBoostTimer = 160; // 2.6 seconds
  player.vy = JUMP_FORCE * 1.6;
  
  spawnParticles(player.x, canvas.height / DPR - (player.y - cameraY), '#3B8DD4', 30, 7);
  
  setTimeout(() => {
    if (gameState === 'RESCUE_ANIM') gameState = 'PLAYING';
  }, 400);
}

// ── UPDATE LOOP ──────────────────────────────────────────────────────────────
function update() {
  if (gameState !== 'PLAYING' && gameState !== 'RESCUE_ANIM') return;

  // Horizontal input logic
  if (keys['ArrowLeft'] || keys['KeyA'] || leftBtnPressed) {
    player.vx -= PLAYER_ACCEL;
    player.facingRight = false;
  } else if (keys['ArrowRight'] || keys['KeyD'] || rightBtnPressed) {
    player.vx += PLAYER_ACCEL;
    player.facingRight = true;
  } else {
    player.vx *= PLAYER_DRAG;
  }

  player.vx = Math.max(-PLAYER_MAX_SPEED, Math.min(PLAYER_MAX_SPEED, player.vx));
  player.x += player.vx;

  if (player.x < -16) player.x = GAME_WIDTH - 16;
  if (player.x > GAME_WIDTH - 16) player.x = -16;

  // Combo timer update
  if (comboTimer > 0) {
    comboTimer--;
    if (comboTimer === 0) {
      coinCombo = 0;
    }
  }

  // Physics update
  if (player.isShieldBoosted) {
    player.shieldBoostTimer--;
    player.vy = 8.5;
    
    // Spawn boost fire trails
    if (Math.random() < 0.5) {
      particles.push({
        x: player.x + 16 + (Math.random() * 12 - 6),
        y: canvas.height / DPR - (player.y - cameraY) + 16,
        vx: (Math.random() - 0.5) * 1.5,
        vy: Math.random() * 3 + 2,
        size: Math.random() * 5 + 3,
        color: '#3B8DD4',
        alpha: 1,
        life: 25
      });
    }

    if (player.shieldBoostTimer <= 0) {
      player.isShieldBoosted = false;
    }
  } else {
    player.vy -= GRAVITY;
  }

  player.y += player.vy;

  // Scroll camera Y
  const triggerHeight = GAME_HEIGHT * 0.45;
  if (player.y - cameraY > triggerHeight) {
    cameraY = player.y - triggerHeight;
  }

  generateWorld(cameraY);

  // Altitude reporting
  const currentAltitude = Math.max(0, Math.floor(player.y / 10));
  if (currentAltitude > highestAltitude) {
    highestAltitude = currentAltitude;
    document.getElementById('hud-height').innerText = `${highestAltitude}m`;
    
    const stage = STAGES[getStageKey(player.y).toUpperCase()];
    document.getElementById('hud-stage').innerText = stage.name;
    updateProgressBar(player.y);
  }

  // Move platforms
  platforms.forEach((plat) => {
    if (plat.type === 'moving') {
      plat.x += plat.vx;
      if (plat.x < 0 || plat.x + plat.width > GAME_WIDTH) {
        plat.vx *= -1;
      }
    }
  });

  platforms = platforms.filter(plat => plat.y > cameraY - 100);
  coins = coins.filter(c => c.y > cameraY - 100);
  shields = shields.filter(s => s.y > cameraY - 100);

  // Collision checks
  const px = player.x + 16;
  const py = player.y;

  if (player.vy <= 0 && !player.isShieldBoosted) {
    for (let i = 0; i < platforms.length; i++) {
      const plat = platforms[i];
      if (
        px > plat.x - 6 &&
        px < plat.x + plat.width + 6 &&
        player.y > plat.y &&
        player.y < plat.y + plat.height + 8
      ) {
        if (plat.type === 'victory_gate') {
          triggerVictory();
          break;
        }

        if (plat.type === 'disappearing') {
          plat.broken = true;
          player.vy = JUMP_FORCE;
          playSound('jump');
          spawnParticles(px, canvas.height / DPR - (plat.y - cameraY), '#a855f7', 12, 3);
          spawnDustParticles(px, canvas.height / DPR - (plat.y - cameraY));
        } else if (plat.type === 'spring') {
          player.vy = SPRING_BOOST;
          playSound('spring');
          screenShake = 12; // bounce shake
          spawnParticles(px, canvas.height / DPR - (plat.y - cameraY), '#FFD700', 16, 5.5);
          spawnDustParticles(px, canvas.height / DPR - (plat.y - cameraY));
        } else {
          player.vy = JUMP_FORCE;
          playSound('jump');
          spawnParticles(px, canvas.height / DPR - (plat.y - cameraY), '#ffffff', 8, 2);
          spawnDustParticles(px, canvas.height / DPR - (plat.y - cameraY));
        }
        break;
      }
    }
  }

  // Coin Collisions (with combos)
  for (let i = coins.length - 1; i >= 0; i--) {
    const coin = coins[i];
    if (!coin.collected && Math.abs(px - coin.x) < 20 && Math.abs(py - coin.y) < 20) {
      coin.collected = true;
      playSound('coin');
      
      // Update combos
      if (comboTimer > 0) {
        coinCombo++;
      } else {
        coinCombo = 1;
      }
      comboTimer = 180; // Reset combo timer to 3s

      const bonus = 100 * coinCombo;
      score += bonus;
      document.getElementById('hud-score').innerText = score;
      
      spawnParticles(coin.x, canvas.height / DPR - (coin.y - cameraY), '#FFD700', 10, 2);
      
      const txt = coinCombo > 1 ? `Savings Combo x${coinCombo} (+${bonus})` : `+100 Savings`;
      createFloatingText(txt, coin.x, coin.y, coinCombo > 1 ? '#FFD700' : '#ffffff');
    }
  }

  // Shield Collisions
  for (let i = shields.length - 1; i >= 0; i--) {
    const shield = shields[i];
    if (!shield.collected && Math.abs(px - shield.x) < 22 && Math.abs(py - shield.y) < 22) {
      shield.collected = true;
      playSound('shield');
      
      if (player.shields < 3) {
        player.shields++;
        updateShieldHUD();
        spawnParticles(shield.x, canvas.height / DPR - (shield.y - cameraY), '#3B8DD4', 15, 3);
        createFloatingText('+1 Child Protection Shield!', shield.x, shield.y, '#3B8DD4');
      } else {
        score += 250;
        document.getElementById('hud-score').innerText = score;
        spawnParticles(shield.x, canvas.height / DPR - (shield.y - cameraY), '#FFD700', 12, 3);
        createFloatingText('+250 Shield Bonus!', shield.x, shield.y, '#FFD700');
      }
    }
  }

  // Falling check
  if (player.y < cameraY - 40) {
    if (player.shields > 0) {
      triggerShieldRescue();
    } else {
      triggerGameOver();
    }
  }

  updateParticles();
}

// ── FLOATING TEXT GRAPHIC EFFECT ─────────────────────────────────────────────
let floatingTexts = [];
function createFloatingText(str, x, y, color = '#ffffff') {
  floatingTexts.push({
    str, x, y, color,
    alpha: 1,
    life: 50
  });
}

function updateFloatingTexts() {
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const t = floatingTexts[i];
    t.y += 1.3;
    t.alpha -= 1 / t.life;
    if (t.alpha <= 0) {
      floatingTexts.splice(i, 1);
    }
  }
}

// Confetti array
let confettiList = [];
function updateConfetti() {
  if (gameState !== 'VICTORY') {
    confettiList = [];
    return;
  }
  
  if (confettiList.length < 80) {
    confettiList.push({
      x: Math.random() * GAME_WIDTH,
      y: -20,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 3 + 2,
      size: Math.random() * 6 + 4,
      color: `hsl(${Math.random() * 360}, 100%, 60%)`,
      rot: Math.random() * Math.PI,
      rotSpeed: Math.random() * 0.1 - 0.05
    });
  }

  for (let i = confettiList.length - 1; i >= 0; i--) {
    const c = confettiList[i];
    c.x += c.vx;
    c.y += c.vy;
    c.rot += c.rotSpeed;
    if (c.y > GAME_HEIGHT) {
      confettiList.splice(i, 1);
    }
  }
}

// ── DRAWING OPERATIONS ───────────────────────────────────────────────────────
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  const scaleX = canvas.width / GAME_WIDTH;
  const scaleY = canvas.height / GAME_HEIGHT;
  ctx.scale(scaleX, scaleY);

  // Screen shake translation
  if (screenShake > 0) {
    const shakeX = (Math.random() - 0.5) * 8;
    const shakeY = (Math.random() - 0.5) * 8;
    ctx.translate(shakeX, shakeY);
    screenShake--;
  }

  // Draw background gradient
  const baseGrad = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  const sk = getStageKey(player.y);
  if (sk === 'primary') {
    baseGrad.addColorStop(0, '#041738');
    baseGrad.addColorStop(1, '#0c2e6b');
  } else if (sk === 'secondary' || sk === 'high') {
    baseGrad.addColorStop(0, '#0c2454');
    baseGrad.addColorStop(1, '#1b3f8c');
  } else if (sk === 'college' || sk === 'grad') {
    baseGrad.addColorStop(0, '#100e33');
    baseGrad.addColorStop(1, '#051b3d');
  } else {
    baseGrad.addColorStop(0, '#1d1702');
    baseGrad.addColorStop(1, '#0a0d1a');
  }
  ctx.fillStyle = baseGrad;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  // Stars (Parallax)
  stars.forEach((star) => {
    star.opacity += (Math.random() - 0.5) * 0.05;
    star.opacity = Math.max(0.2, Math.min(0.9, star.opacity));
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`;
    
    let starY = (star.y + cameraY * star.speed) % GAME_HEIGHT;
    ctx.beginPath();
    ctx.arc(star.x, starY, star.size, 0, Math.PI * 2);
    ctx.fill();
  });

  // Platforms
  platforms.forEach((plat) => {
    const screenY = GAME_HEIGHT - (plat.y - cameraY);
    if (screenY < -50 || screenY > GAME_HEIGHT + 50) return;

    if (plat.broken) return;

    ctx.save();
    const color = STAGES[plat.stageKey.toUpperCase()]?.color || '#ffffff';
    
    ctx.shadowBlur = 8;
    ctx.shadowColor = color;
    
    ctx.fillStyle = `rgba(255, 255, 255, 0.15)`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5;
    
    ctx.beginPath();
    ctx.roundRect(plat.x, screenY, plat.width, plat.height, 7);
    ctx.fill();
    ctx.stroke();
    
    ctx.shadowBlur = 0;
    
    // Label details
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText(plat.label, plat.x + plat.width / 2, screenY + 11);

    // Spring details
    if (plat.type === 'spring') {
      ctx.fillStyle = '#FFD700';
      ctx.fillRect(plat.x + plat.width / 2 - 8, screenY - 8, 16, 8);
      ctx.strokeStyle = '#B8860B';
      ctx.lineWidth = 2;
      ctx.strokeRect(plat.x + plat.width / 2 - 8, screenY - 8, 16, 8);
    }
    
    // Disappearing borders
    if (plat.type === 'disappearing') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(plat.x - 2, screenY - 2, plat.width + 4, plat.height + 4);
    }

    // Victory gate rendering
    if (plat.type === 'victory_gate') {
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#FFD700';
      ctx.fillStyle = 'rgba(255, 215, 0, 0.25)';
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.roundRect(plat.x, screenY - 60, plat.width, 80, [15, 15, 0, 0]);
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Poppins';
      ctx.fillText('STUDY ABROAD GOAL', plat.x + plat.width / 2, screenY - 35);
      ctx.font = '7px Poppins';
      ctx.fillText('JUMP TO ACHIEVE GOAL', plat.x + plat.width / 2, screenY - 15);
    }
    
    ctx.restore();
  });

  // Coins (Savings)
  coins.forEach((coin) => {
    if (coin.collected) return;
    const screenY = GAME_HEIGHT - (coin.y - cameraY);
    
    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFD700';
    
    const widthScale = Math.abs(Math.sin(coin.pulse));
    coin.pulse += 0.05;

    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.ellipse(coin.x, screenY, coin.width / 2 * widthScale, coin.height / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = '#B8860B';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#B8860B';
    ctx.font = 'bold 9px Poppins';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (widthScale > 0.4) {
      ctx.fillText('₹', coin.x, screenY);
    }
    ctx.restore();
  });

  // Shields (Child Protection)
  shields.forEach((shield) => {
    if (shield.collected) return;
    const screenY = GAME_HEIGHT - (shield.y - cameraY);
    
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#3B8DD4';

    ctx.fillStyle = '#3B8DD4';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shield.x, screenY - 11);
    ctx.lineTo(shield.x + 9, screenY - 6);
    ctx.lineTo(shield.x + 7, screenY + 5);
    ctx.quadraticCurveTo(shield.x, screenY + 11, shield.x - 7, screenY + 5);
    ctx.lineTo(shield.x - 9, screenY - 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(shield.x, screenY, 4, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(shield.x - 0.75, screenY, 1.5, 5);
    ctx.restore();
  });

  // Particles
  particles.forEach((p) => {
    ctx.save();
    ctx.fillStyle = p.color;
    ctx.globalAlpha = p.alpha;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Player Character
  const playerScreenY = GAME_HEIGHT - (player.y - cameraY);
  ctx.save();

  if (player.isShieldBoosted) {
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#3B8DD4';
    
    // Shield protection orbit/bubble
    ctx.strokeStyle = 'rgba(59, 141, 212, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x + 16, playerScreenY + 16, 26, 0, Math.PI * 2);
    ctx.stroke();
    
    ctx.fillStyle = 'rgba(59, 141, 212, 0.15)';
    ctx.beginPath();
    ctx.arc(player.x + 16, playerScreenY + 16, 26, 0, Math.PI * 2);
    ctx.fill();
  }

  // Body
  ctx.fillStyle = '#f26922';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(player.x + 16, playerScreenY + 16, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mortarboard Cap
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(player.x + 16, playerScreenY - 6);
  ctx.lineTo(player.x + 32, playerScreenY + 2);
  ctx.lineTo(player.x + 16, playerScreenY + 10);
  ctx.lineTo(player.x, playerScreenY + 2);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillRect(player.x + 10, playerScreenY + 4, 12, 4);

  // Tassel
  ctx.strokeStyle = '#FFD700';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(player.x + 16, playerScreenY + 2);
  ctx.lineTo(player.x + 6, playerScreenY + 6);
  ctx.lineTo(player.x + 4, playerScreenY + 12);
  ctx.stroke();

  // Eyes
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  const eyeOffset = player.facingRight ? 4 : -4;
  ctx.arc(player.x + 16 + eyeOffset - 3, playerScreenY + 16, 4, 0, Math.PI * 2);
  ctx.arc(player.x + 16 + eyeOffset + 3, playerScreenY + 16, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  const pupilOffset = player.facingRight ? 5 : -3;
  ctx.arc(player.x + 16 + pupilOffset - 3, playerScreenY + 16, 2, 0, Math.PI * 2);
  ctx.arc(player.x + 16 + pupilOffset + 3, playerScreenY + 16, 2, 0, Math.PI * 2);
  ctx.fill();

  // Draw Combo visual badge above head if combo active
  if (coinCombo > 1 && comboTimer > 0) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#FFD700';
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 9px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText(`Combo x${coinCombo}`, player.x + 16, playerScreenY - 14);
  }

  ctx.restore();

  // Floating text
  floatingTexts.forEach((t) => {
    const textScreenY = GAME_HEIGHT - (t.y - cameraY);
    ctx.save();
    ctx.globalAlpha = t.alpha;
    ctx.fillStyle = t.color;
    ctx.font = 'bold 10px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText(t.str, t.x, textScreenY);
    ctx.restore();
  });

  // Confetti particles
  confettiList.forEach((c) => {
    ctx.save();
    ctx.fillStyle = c.color;
    ctx.translate(c.x, c.y);
    ctx.rotate(c.rot);
    ctx.fillRect(-c.size / 2, -c.size / 2, c.size, c.size / 2);
    ctx.restore();
  });

  // Rescue Overlay Animation Text
  if (gameState === 'RESCUE_ANIM') {
    ctx.fillStyle = 'rgba(0, 91, 172, 0.85)';
    ctx.fillRect(0, GAME_HEIGHT / 2 - 60, GAME_WIDTH, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px Poppins';
    ctx.textAlign = 'center';
    ctx.fillText('BAJAJ CHILD PROTECTION SHIELD', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 15);
    ctx.font = '10px Poppins';
    ctx.fillText('Goal Safely Rescued & Boosted!', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 15);
  }

  ctx.restore();
}

// ── FLOATING TEXT UPDATE ─────────────────────────────────────────────────────
function updateTexts() {
  updateFloatingTexts();
}

// ── MAIN LOOP TRIGGER ────────────────────────────────────────────────────────
function loop() {
  update();
  updateTexts();
  updateConfetti();
  updateDustParticles();
  updateSparkles();
  draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ── WIN / LOSE TRANSITIONS ───────────────────────────────────────────────────
function triggerVictory() {
  gameState = 'VICTORY';
  playSound('victory');
  
  document.getElementById('mobile-controls').classList.add('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('side-progress-bar').classList.add('hidden');

  document.getElementById('go-title').innerText = 'Study Abroad Achieved!';
  document.getElementById('go-subtitle').innerText = 'Congratulations! You reached the ultimate milestone.';
  document.getElementById('go-height').innerText = `${highestAltitude}m`;
  document.getElementById('go-score').innerText = score;
  document.getElementById('go-stage').innerText = 'Study Abroad!';
  document.getElementById('go-pitch-text').innerText = 'Your child has successfully reached the Study Abroad milestone! Match this milestone with complete financial security against unexpected events. Secure their education using a Bajaj Allianz Child Protection Goal today.';

  const screen = document.getElementById('gameover-screen');
  screen.classList.remove('hidden');
  screen.classList.add('animate-fade-in');

  const icon = document.getElementById('go-icon-container');
  icon.className = 'w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-yellow-500/20 border-2 border-yellow-500 text-yellow-500';
}

function triggerGameOver() {
  gameState = 'GAMEOVER';
  playSound('gameover');
  
  document.getElementById('mobile-controls').classList.add('hidden');
  document.getElementById('game-hud').classList.add('hidden');
  document.getElementById('side-progress-bar').classList.add('hidden');

  document.getElementById('go-title').innerText = 'Journey Interrupted';
  document.getElementById('go-subtitle').innerText = 'Educational expenses caught up without a shield!';
  document.getElementById('go-height').innerText = `${highestAltitude}m`;
  document.getElementById('go-score').innerText = score;
  
  const finalStage = STAGES[getStageKey(player.y).toUpperCase()];
  document.getElementById('go-stage').innerText = finalStage.name;
  document.getElementById('go-pitch-text').innerText = 'In real life, falls from study paths have severe implications. Securing your children\'s studies (Primary to Study Abroad) with Bajaj Allianz Child Protection Plan ensures their goals are met even in your absence.';

  const screen = document.getElementById('gameover-screen');
  screen.classList.remove('hidden');
  screen.classList.add('animate-fade-in');

  const icon = document.getElementById('go-icon-container');
  icon.className = 'w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-bjOrange/20 border-2 border-bjOrange text-bjOrange';
}

// ── SCREEN INTERACTION AND WIREUPS ───────────────────────────────────────────
document.getElementById('btn-start-game').addEventListener('click', initGame);
document.getElementById('btn-how-to').addEventListener('click', () => {
  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('tutorial-screen').classList.remove('hidden');
  document.getElementById('tutorial-screen').classList.add('animate-fade-in');
});

document.getElementById('btn-close-tutorial').addEventListener('click', () => {
  document.getElementById('tutorial-screen').classList.add('hidden');
  initGame();
});

document.getElementById('btn-restart').addEventListener('click', initGame);

document.getElementById('btn-show-lead').addEventListener('click', () => {
  document.getElementById('gameover-screen').classList.add('hidden');
  document.getElementById('lead-screen').classList.remove('hidden');
  document.getElementById('lead-screen').classList.add('animate-fade-in');
});

// Share Action
document.getElementById('btn-share-game').addEventListener('click', () => {
  const shareUrl = buildShareUrl();
  if (shareUrl) {
    navigator.clipboard.writeText(shareUrl).then(() => {
      alert('Referral share link copied to clipboard!');
    }).catch(() => {
      alert(`Share link: ${shareUrl}`);
    });
  } else {
    navigator.clipboard.writeText(window.location.href).then(() => {
      alert('Game link copied to clipboard!');
    });
  }
});

// ── FORM INTERACTION HANDLERS ────────────────────────────────────────────────
const leadForm = document.getElementById('lead-form');
const leadError = document.getElementById('lead-error');

leadForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  leadError.classList.add('hidden');
  
  const name = document.getElementById('user-name').value.trim();
  const mobile = document.getElementById('user-mobile').value.trim();
  const email = document.getElementById('user-email').value.trim();
  const agreed = document.getElementById('user-tc').checked;

  if (!name || !/^[A-Za-z\s]+$/.test(name) || name.length < 2) {
    showError(leadError, 'Please enter a valid full name (alphabets only).');
    return;
  }
  
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    showError(leadError, 'Please enter a valid 10-digit mobile number.');
    return;
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    showError(leadError, 'Please enter a valid email address.');
    return;
  }

  if (!agreed) {
    showError(leadError, 'You must accept the Terms & Conditions.');
    return;
  }

  const submitBtn = document.getElementById('btn-lead-submit');
  submitBtn.disabled = true;
  submitBtn.innerText = 'Submitting...';

  const res = await submitToLMS({
    name,
    mobile,
    email_id: email,
    score: score
  });

  submitBtn.disabled = false;
  submitBtn.innerText = 'Proceed to Book Slot';

  if (res.success) {
    const leadNo = extractLeadNo(res);
    if (leadNo) {
      sessionStorage.setItem(LEAD_NO_KEY, leadNo);
    }
    document.getElementById('lead-screen').classList.add('hidden');
    document.getElementById('slot-screen').classList.remove('hidden');
    document.getElementById('slot-screen').classList.add('animate-fade-in');
  } else {
    showError(leadError, res.error || 'Failed to submit details. Please try again.');
  }
});

// Slot Booking Form
const slotForm = document.getElementById('slot-form');
const slotError = document.getElementById('slot-error');
const slotItems = document.querySelectorAll('.slot-item');
let selectedTime = '10:00 AM - 12:00 PM';

const dateInput = document.getElementById('slot-date');
const today = new Date().toISOString().split('T')[0];
dateInput.min = today;
dateInput.value = today;

slotItems.forEach(item => {
  item.addEventListener('click', () => {
    slotItems.forEach(i => i.classList.remove('selected'));
    item.classList.add('selected');
    selectedTime = item.getAttribute('data-time');
  });
});

slotForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  slotError.classList.add('hidden');

  const leadNo = sessionStorage.getItem(LEAD_NO_KEY);
  const dateVal = dateInput.value;
  const name = document.getElementById('user-name').value.trim();
  const mobile = document.getElementById('user-mobile').value.trim();

  if (!leadNo) {
    showError(slotError, 'Lead ID not found. Skipping to thank you.');
    setTimeout(() => advanceToThankYou(dateVal, selectedTime), 1500);
    return;
  }

  const confirmBtn = document.getElementById('btn-slot-confirm');
  confirmBtn.disabled = true;
  confirmBtn.innerText = 'Confirming...';

  const res = await updateLeadNew(leadNo, {
    name,
    mobile,
    date: dateVal,
    time: selectedTime,
    remarks: `Appointment scheduled via EduRise Jumper at altitude: ${highestAltitude}m`
  });

  confirmBtn.disabled = false;
  confirmBtn.innerText = 'Confirm Appointment';

  advanceToThankYou(dateVal, selectedTime);
});

document.getElementById('btn-slot-skip').addEventListener('click', () => {
  advanceToThankYou(null, null);
});

document.getElementById('btn-thankyou-restart').addEventListener('click', () => {
  document.getElementById('thankyou-screen').classList.add('hidden');
  initGame();
});

function showError(elem, text) {
  elem.innerText = text;
  elem.classList.remove('hidden');
}

function advanceToThankYou(date, time) {
  document.getElementById('slot-screen').classList.add('hidden');
  const summaryBox = document.getElementById('appointment-summary');
  const thankyouScreen = document.getElementById('thankyou-screen');
  
  if (date && time) {
    document.getElementById('summary-dt').innerText = `${date} at ${time}`;
    summaryBox.classList.remove('hidden');
  } else {
    summaryBox.classList.add('hidden');
  }
  
  thankyouScreen.classList.remove('hidden');
  thankyouScreen.classList.add('animate-fade-in');
}

// Terms & Conditions Modal
const tcModal = document.getElementById('tc-modal');
document.getElementById('link-tc').addEventListener('click', (e) => {
  e.preventDefault();
  tcModal.classList.remove('hidden');
  tcModal.classList.add('animate-fade-in');
});

document.getElementById('btn-modal-close').addEventListener('click', () => {
  tcModal.classList.add('hidden');
});

document.getElementById('btn-modal-agree').addEventListener('click', () => {
  document.getElementById('user-tc').checked = true;
  tcModal.classList.add('hidden');
});
