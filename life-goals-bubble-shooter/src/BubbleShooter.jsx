// BubbleShooter.jsx — classic bubble shooter with sliding ammo queue.
// Match 3+ same colour to clear. Hex grid, ceiling drops every N shots.
import React, { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { COLORS } from './data.js';
import gameBackground from './game_background.webp';

const BUBBLE_R = 22;
const BUBBLE_D = BUBBLE_R * 2;
const ROW_H = BUBBLE_D * 0.866;
const COLS = 8;
export const GAME_W = COLS * BUBBLE_D; // 352
export const GAME_H = 660;
const SHOT_SPEED = 16;
const DROP_INTERVAL = 6;              // ceiling drops every 6 shots
const DROP_DIST = ROW_H;

const QUEUE_LEN = 5; // 4 visible (current, next, q1, q2) + 1 incoming buffer
const HUD_BAR_H = 56;
const QUEUE_STRIP_H = 60;

function gridToPx(row, col, totalShiftedRows = 0) {
  const isOdd = (row + totalShiftedRows) % 2 === 1;
  const x = BUBBLE_R + col * BUBBLE_D + (isOdd ? BUBBLE_R : 0);
  const y = BUBBLE_R + 8 + row * ROW_H;
  return { x, y };
}

function ammoSlot(idx, shooterX, shooterY, scale, nextX, nextY, swapX, swapY) {
  // Returns the absolute (x, y) and visual scale for ammo at queue index `idx`.
  // 0 = cannon, 1 = swap (bottom-right), 2 = next (bottom-left), 3+ = off-screen.
  switch (idx) {
    case 0: return { x: shooterX, y: shooterY, scale: 1.0 * scale };
    case 1: return { x: swapX, y: swapY, scale: 0.9 * scale };
    case 2: return { x: nextX, y: nextY, scale: 0.9 * scale };
    default: return { x: -100, y: -100, scale: 0.0 };
  }
}

function findFloating(all, totalShiftedRows = 0) {
  const alive = all.filter(b => b.state === 'alive');
  const connected = new Set();
  const seeds = alive.filter(b => b.row === 0);
  const queue = [...seeds];
  seeds.forEach(s => connected.add(s.id));

  // Quick lookup map of row-col to bubble
  const gridMap = new Map();
  for (const b of alive) {
    gridMap.set(`${b.row},${b.col}`, b);
  }

  while (queue.length) {
    const cur = queue.shift();
    const neighbors = getNeighbors(cur.row, cur.col, totalShiftedRows);
    for (const n of neighbors) {
      const neighborBubble = gridMap.get(`${n.row},${n.col}`);
      if (neighborBubble && !connected.has(neighborBubble.id)) {
        connected.add(neighborBubble.id);
        queue.push(neighborBubble);
      }
    }
  }
  return alive.filter(b => !connected.has(b.id)).map(b => b.id);
}

function buildInitialBubbles(config) {
  let out = [];
  const colors = config.colors;
  const rows = config.rows;
  for (let row = 0; row < rows; row++) {
    const cols = row % 2 === 1 ? COLS - 1 : COLS;
    for (let col = 0; col < cols; col++) {
      const colorId = colors[Math.floor(Math.random() * colors.length)];
      const { x, y } = gridToPx(row, col, 0);
      out.push({ id: `b${row}-${col}`, colorId, row, col, x, y, state: 'alive' });
    }
  }
  
  // Filter out any initially floating bubbles
  const floating = findFloating(out, 0);
  out = out.filter(b => !floating.includes(b.id));
  
  return out;
}

function buildInitialQueue(config) {
  const colors = config.colors;
  return Array.from({ length: QUEUE_LEN }, (_, i) => ({
    id: `ammo-init-${i}-${Math.random().toString(36).slice(2, 8)}`,
    colorId: colors[i % colors.length],
  }));
}

function getNeighbors(row, col, totalShiftedRows = 0) {
  const neighbors = [];
  const isOdd = (row + totalShiftedRows) % 2 === 1;
  
  // Left / Right
  neighbors.push({ row, col: col - 1 });
  neighbors.push({ row, col: col + 1 });
  
  if (isOdd) {
    // Top neighbors
    neighbors.push({ row: row - 1, col: col });
    neighbors.push({ row: row - 1, col: col + 1 });
    // Bottom neighbors
    neighbors.push({ row: row + 1, col: col });
    neighbors.push({ row: row + 1, col: col + 1 });
  } else {
    // Top neighbors
    neighbors.push({ row: row - 1, col: col - 1 });
    neighbors.push({ row: row - 1, col: col });
    // Bottom neighbors
    neighbors.push({ row: row + 1, col: col - 1 });
    neighbors.push({ row: row + 1, col: col });
  }
  
  return neighbors.filter(n => {
    if (n.row < 0 || n.row >= 14) return false;
    const maxCols = (n.row + totalShiftedRows) % 2 === 1 ? COLS - 1 : COLS;
    return n.col >= 0 && n.col < maxCols;
  });
}

function getBestSnapPosition(px, py, bubbles, totalShiftedRows = 0) {
  let bestRow = 0;
  let bestCol = 0;
  let bestD = Infinity;
  
  // Quick lookup of occupied cells
  const occupiedSet = new Set();
  for (const b of bubbles) {
    if (b.state === 'alive') {
      occupiedSet.add(`${b.row},${b.col}`);
    }
  }
  
  for (let row = 0; row < 14; row++) {
    const cols = (row + totalShiftedRows) % 2 === 1 ? COLS - 1 : COLS;
    for (let col = 0; col < cols; col++) {
      if (occupiedSet.has(`${row},${col}`)) continue;
      
      // Must be adjacent to ceiling or adjacent to an occupied bubble
      let isValid = (row === 0);
      if (!isValid) {
        const neighbors = getNeighbors(row, col, totalShiftedRows);
        for (const n of neighbors) {
          if (occupiedSet.has(`${n.row},${n.col}`)) {
            isValid = true;
            break;
          }
        }
      }
      
      if (!isValid) continue;
      
      const { x, y } = gridToPx(row, col, totalShiftedRows);
      const d = Math.hypot(x - px, y - py);
      if (d < bestD) {
        bestD = d;
        bestRow = row;
        bestCol = col;
      }
    }
  }
  
  const coords = gridToPx(bestRow, bestCol, totalShiftedRows);
  return { row: bestRow, col: bestCol, x: coords.x, y: coords.y };
}

const Bubble = memo(function Bubble({ x, y, colorDef, popping, falling, isStuck, scale = 1 }) {
  const bg = `radial-gradient(circle at 32% 28%, ${colorDef.glow} 0%, ${colorDef.color} 45%, ${colorDef.colorDeep} 100%)`;
  return (
    <div
      className={`bubble ${popping ? 'bubble-popping' : ''} ${falling ? 'bubble-falling' : ''} ${(isStuck && !popping && !falling) ? 'is-stuck' : ''}`}
      style={{ left: x, top: y, width: BUBBLE_D * scale, height: BUBBLE_D * scale, background: bg }}
    />
  );
});

const AmmoBall = memo(function AmmoBall({ ammo, idx, projectileActive, onSwap, justLoadedId, swappingId, shooterX, shooterY, scale, nextX, nextY, swapX, swapY }) {
  const colorDef = COLORS[ammo.colorId];
  const slot = ammoSlot(idx, shooterX, shooterY, scale, nextX, nextY, swapX, swapY);
  const size = BUBBLE_D * slot.scale;
  const bg = `radial-gradient(circle at 32% 28%, ${colorDef.glow} 0%, ${colorDef.color} 45%, ${colorDef.colorDeep} 100%)`;

  const hidden = idx === 0 && projectileActive;
  const isSwapSlot = (idx === 0 || idx === 1) && !projectileActive;
  const justLoaded = justLoadedId === ammo.id;

  const isSwappingToRight = swappingId === ammo.id;
  const isSwappingToLeft = swappingId && !isSwappingToRight && idx === 0;
  const swapClass = isSwappingToRight ? 'swap-arc-up' : isSwappingToLeft ? 'swap-arc-down' : '';

  const cls = [
    'ammo-ball',
    isSwapSlot ? 'is-swap' : '',
    justLoaded ? 'is-loaded' : '',
    swapClass,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cls}
      onClick={isSwapSlot ? (e) => { e.stopPropagation(); onSwap(); } : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onPointerMove={(e) => e.stopPropagation()}
      onPointerUp={(e) => e.stopPropagation()}
      style={{
        left: slot.x,
        top: slot.y,
        width: size,
        height: size,
        background: bg,
        opacity: hidden ? 0 : 1,
        zIndex: idx === 0 ? 11 : (13 - idx),
      }}
      title={isSwapSlot ? 'Tap to swap' : undefined}
    >
      {/* Swap icon overlay directly on the ball if it is the swap slot (idx === 1) */}
      {idx === 1 && (
        <div style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <svg width={22 * scale} height={22 * scale} viewBox="0 0 24 24" fill="none" stroke="rgba(255, 255, 255, 0.95)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 3px rgba(0,0,0,0.6))' }}>
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38" />
          </svg>
        </div>
      )}
    </div>
  );
});

export default function BubbleShooter({ config, onWin, onLose }) {
  const [bubbles, setBubbles] = useState(() => buildInitialBubbles(config));
  const [shotsLeft, setShotsLeft] = useState(config.shots);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [totalShiftedRows, setTotalShiftedRows] = useState(0);
  const [shotsTaken, setShotsTaken] = useState(0);
  const [dimensions, setDimensions] = useState({ width: GAME_W, height: 660 });

  const wrapperRef = useRef(null);

  const scaleFactor = dimensions.width / GAME_W;
  const W = GAME_W;
  const H = dimensions.height / scaleFactor;
  const scale = H / 660;
  const horizontalScale = GAME_W / 374;

  const SHOOTER_X = W / 2 + 2;
  const SHOOTER_Y = H / 2 + 237 * scale;
  const LOSE_LINE = SHOOTER_Y - 80 * scale;

  const NEXT_X = SHOOTER_X - 137 * horizontalScale;
  const NEXT_Y = SHOOTER_Y + 12 * scale;

  const SWAP_X = SHOOTER_X + 133 * horizontalScale;
  const SWAP_Y = SHOOTER_Y + 12 * scale;

  const availableColors = useMemo(() => {
    const set = new Set(bubbles.filter(b => b.state === 'alive').map(b => b.colorId));
    const arr = [...set];
    return arr.length ? arr : config.colors;
  }, [bubbles, config.colors]);

  const [ammoQueue, setAmmoQueue] = useState(() => buildInitialQueue(config));
  const [justLoadedId, setJustLoadedId] = useState(null);

  const [projectile, setProjectile] = useState(null);
  const [aimAngle, setAimAngle] = useState(-Math.PI / 2);
  const [aiming, setAiming] = useState(false);
  const [isPointerDown, setIsPointerDown] = useState(false);
  const [scorePops, setScorePops] = useState([]);
  const [bursts, setBursts] = useState([]);
  const [recoil, setRecoil] = useState(false);

  const containerRef = useRef(null);
  const playfieldRef = useRef(null);
  const rafRef = useRef(null);
  const finishedRef = useRef(false);

  const pickColor = useCallback((excludeId) => {
    const pool = availableColors.length ? availableColors : config.colors;
    const filtered = excludeId ? pool.filter(c => c !== excludeId) : pool;
    const arr = filtered.length ? filtered : pool;
    return arr[Math.floor(Math.random() * arr.length)];
  }, [availableColors, config.colors]);

  const cycleAmmo = useCallback(() => {
    setAmmoQueue(prev => {
      const newColor = pickColor(prev[prev.length - 1]?.colorId);
      const next = [
        ...prev.slice(1),
        { id: `ammo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, colorId: newColor },
      ];
      setJustLoadedId(next[0]?.id || null);
      return next;
    });
  }, [pickColor]);

  const [swappingId, setSwappingId] = useState(null);

  const swapAmmo = useCallback(() => {
    if (projectile) return;
    if (ammoQueue.length < 2) return;
    const firstId = ammoQueue[0].id;
    setSwappingId(firstId);
    setAmmoQueue(prev => {
      const [a, b, ...rest] = prev;
      return [b, a, ...rest];
    });
    setTimeout(() => setSwappingId(null), 400);
  }, [projectile, ammoQueue]);

  // Reset window and body scroll on mount to prevent autofocus scroll bugs.
  useEffect(() => {
    window.scrollTo(0, 0);
    if (document.body) document.body.scrollTop = 0;
    if (document.documentElement) document.documentElement.scrollTop = 0;
  }, []);

  // Clear the "just loaded" pulse class shortly after it fires.
  useEffect(() => {
    if (!justLoadedId) return;
    const t = setTimeout(() => setJustLoadedId(null), 360);
    return () => clearTimeout(t);
  }, [justLoadedId]);

  // Keep ammo within still-available colours after the board changes.
  useEffect(() => {
    setAmmoQueue(prev => {
      let changed = false;
      const next = prev.map(a => {
        if (availableColors.includes(a.colorId)) return a;
        changed = true;
        return { ...a, colorId: availableColors[Math.floor(Math.random() * availableColors.length)] };
      });
      return changed ? next : prev;
    });
  }, [availableColors]);

  useLayoutEffect(() => {
    if (wrapperRef.current) {
      setDimensions({
        width: wrapperRef.current.clientWidth || GAME_W,
        height: wrapperRef.current.clientHeight || 660,
      });
    }
    const handleResize = () => {
      if (wrapperRef.current) {
        setDimensions({
          width: wrapperRef.current.clientWidth || GAME_W,
          height: wrapperRef.current.clientHeight || 660,
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const playfieldRectRef = useRef(null);

  const updateAimAngleFromEvent = useCallback((e) => {
    if (!playfieldRef.current) return;
    const rect = playfieldRectRef.current || playfieldRef.current.getBoundingClientRect();
    const scale = rect.width / GAME_W;
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    const dx = x - SHOOTER_X;
    const dy = y - SHOOTER_Y;
    let a = Math.atan2(dy, dx);
    const min = -Math.PI + 0.18;
    const max = -0.18;
    if (a > max) a = max;
    if (a < min) a = min;
    setAimAngle(a);
  }, [SHOOTER_X, SHOOTER_Y]);

  const handlePointerDown = useCallback((e) => {
    if (projectile || finishedRef.current) return;
    if (playfieldRef.current) {
      playfieldRectRef.current = playfieldRef.current.getBoundingClientRect();
    }
    setIsPointerDown(true);
    setAiming(true);
    updateAimAngleFromEvent(e);
  }, [projectile, updateAimAngleFromEvent]);

  const handlePointerMove = useCallback((e) => {
    if (!isPointerDown) return;
    updateAimAngleFromEvent(e);
  }, [isPointerDown, updateAimAngleFromEvent]);

  const fireShot = useCallback(() => {
    if (projectile || finishedRef.current) { setAiming(false); return; }
    if (shotsLeft <= 0) { setAiming(false); return; }
    const currentColor = ammoQueue[0]?.colorId;
    if (!currentColor) { setAiming(false); return; }
    setProjectile({
      x: SHOOTER_X,
      y: SHOOTER_Y,
      vx: Math.cos(aimAngle) * SHOT_SPEED,
      vy: Math.sin(aimAngle) * SHOT_SPEED,
      colorId: currentColor,
    });
    setRecoil(true);
    setTimeout(() => setRecoil(false), 150);
    cycleAmmo();
    setAiming(false);
  }, [aimAngle, ammoQueue, projectile, shotsLeft, cycleAmmo, SHOOTER_X, SHOOTER_Y]);

  const handlePointerUp = useCallback((e) => {
    if (!isPointerDown) return;
    setIsPointerDown(false);
    fireShot();
  }, [isPointerDown, fireShot]);

  const handleStick = useCallback((x, y, colorId) => {
    setBubbles((prev) => {
      const snap = getBestSnapPosition(x, y, prev, totalShiftedRows);
      const occupied = prev.some(b => b.state === 'alive' && Math.hypot(b.x - snap.x, b.y - snap.y) < 4);
      const newBubble = {
        id: `stuck-${Date.now()}-${Math.random()}`,
        colorId,
        row: snap.row, col: snap.col,
        x: snap.x, y: snap.y,
        state: 'alive',
      };
      
      const next = occupied ? prev : [...prev, newBubble];

      if (!occupied) {
        const chain = collectChain(next, newBubble.id, colorId);
        if (chain.length >= 3) {
          const after = next.map(b => chain.includes(b.id) ? { ...b, state: 'popping' } : b);
          setTimeout(() => {
            setBubbles((curr) => {
              const remaining = curr.filter(b => !chain.includes(b.id));
              const floating = findFloating(remaining, totalShiftedRows);
              if (floating.length) {
                pushScorePop(snap.x, snap.y - 30, `+${floating.length * 50} drop!`);
                setScore(s => s + floating.length * 50);
                return remaining.map(b => {
                  if (floating.includes(b.id)) {
                    const visualX = gridToPx(b.row, b.col, totalShiftedRows).x;
                    const visualY = gridToPx(b.row, b.col, totalShiftedRows).y;
                    return { ...b, x: visualX, y: visualY, state: 'falling' };
                  }
                  return b;
                });
              }
              return remaining;
            });
            setTimeout(() => {
              setBubbles(curr => curr.filter(b => b.state !== 'falling'));
            }, 900);
          }, 320);

          const points = chain.length * 100 + (combo > 0 ? combo * 50 : 0);
          setScore(s => s + points);
          setCombo(c => c + 1);

          const isMega = chain.length >= 5;
          if (isMega) {
            let msg = 'Mega Match!';
            if (chain.length === 6) msg = 'Super Combo!';
            if (chain.length >= 7) msg = 'Explosive Pop!';
            pushScorePop(snap.x, snap.y - 45, msg);
          }
          pushScorePop(snap.x, snap.y - 20, `+${points}`);

          // Spawn burst at each bubble's center coordinate
          chain.forEach(bid => {
            const bubble = next.find(b => b.id === bid);
            if (bubble) {
              pushBurst(bubble.x, bubble.y, COLORS[colorId].color, isMega);
            }
          });
          return after;
        }
        setCombo(0);
      }
      return next;
    });

    setShotsLeft(s => s - 1);
    setShotsTaken((t) => {
      const newT = t + 1;
      if (newT % DROP_INTERVAL === 0) {
        // Calculate new colors using availableColors in the current scope
        const newRowColors = [];
        const nextShiftCount = totalShiftedRows + 1;
        const cols = nextShiftCount % 2 === 1 ? COLS - 1 : COLS;
        for (let col = 0; col < cols; col++) {
          newRowColors.push(pickColor());
        }

        setTotalShiftedRows(nextShiftCount);
        setBubbles((prev) => {
          const shifted = prev.map(b => {
            if (b.state === 'falling') return b;
            const nextRow = b.row + 1;
            const coords = gridToPx(nextRow, b.col, nextShiftCount);
            return {
              ...b,
              row: nextRow,
              x: coords.x,
              y: coords.y,
            };
          });
          const newRow = [];
          for (let col = 0; col < cols; col++) {
            const { x, y } = gridToPx(0, col, nextShiftCount);
            newRow.push({
              id: `b-new-${Date.now()}-${col}-${Math.random()}`,
              colorId: newRowColors[col],
              row: 0,
              col,
              x,
              y,
              state: 'alive'
            });
          }
          return [...newRow, ...shifted];
        });
      }
      return newT;
    });
  }, [totalShiftedRows, combo, pickColor]);

  // Projectile loop
  useEffect(() => {
    if (!projectile) return;
    let running = true;
    const tick = () => {
      if (!running) return;
      setProjectile((p) => {
        if (!p) return p;
        let { x, y, vx, vy, colorId } = p;
        x += vx; y += vy;
        if (x < BUBBLE_R) { x = BUBBLE_R; vx = -vx; }
        if (x > GAME_W - BUBBLE_R) { x = GAME_W - BUBBLE_R; vx = -vx; }
        if (y < BUBBLE_R) {
          handleStick(x, y, colorId);
          return null;
        }
        const alive = bubbles.filter(b => b.state === 'alive');
        for (const b of alive) {
          const bx = gridToPx(b.row, b.col, totalShiftedRows).x;
          const by = gridToPx(b.row, b.col, totalShiftedRows).y;
          if (Math.hypot(bx - x, by - y) < BUBBLE_D - 1) {
            handleStick(x, y, colorId);
            return null;
          }
        }
        return { x, y, vx, vy, colorId };
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, [projectile, bubbles, totalShiftedRows, handleStick]);


  function collectChain(all, startId, colorId) {
    const alive = all.filter(b => b.state === 'alive');
    const start = alive.find(b => b.id === startId);
    if (!start) return [startId];
    
    const seen = new Set([start.id]);
    const queue = [start];
    
    // Quick lookup map of row-col to bubble
    const gridMap = new Map();
    for (const b of alive) {
      gridMap.set(`${b.row},${b.col}`, b);
    }
    
    while (queue.length) {
      const cur = queue.shift();
      const neighbors = getNeighbors(cur.row, cur.col, totalShiftedRows);
      for (const n of neighbors) {
        const neighborBubble = gridMap.get(`${n.row},${n.col}`);
        if (neighborBubble && neighborBubble.colorId === colorId && !seen.has(neighborBubble.id)) {
          seen.add(neighborBubble.id);
          queue.push(neighborBubble);
        }
      }
    }
    return [...seen];
  }

  function pushBurst(x, y, color, isMega = false) {
    const id = Date.now() + Math.random();
    const count = isMega ? 14 : 7;
    const parts = Array.from({ length: count }, (_, i) => {
      const a = Math.random() * Math.PI * 2;
      const dist = isMega ? (35 + Math.random() * 65) : (20 + Math.random() * 40);
      const size = isMega ? (5 + Math.random() * 8) : (3 + Math.random() * 5);
      const isGold = isMega && Math.random() < 0.35;
      return { 
        id: `${id}-${i}`, 
        x, 
        y, 
        color: isGold ? '#FFD700' : color, 
        size,
        bx: Math.cos(a) * dist, 
        by: Math.sin(a) * dist 
      };
    });
    setBursts(prev => [...prev, ...parts]);
    setTimeout(() => {
      setBursts(prev => prev.filter(p => !p.id.toString().startsWith(`${id}-`)));
    }, 600);
  }

  function pushScorePop(x, y, text) {
    const id = Date.now() + Math.random();
    setScorePops(prev => [...prev, { id, x, y, text }]);
    setTimeout(() => setScorePops(prev => prev.filter(p => p.id !== id)), 950);
  }

  // Win/lose detection.
  useEffect(() => {
    if (finishedRef.current) return;
    const aliveCount = bubbles.filter(b => b.state === 'alive').length;
    if (aliveCount === 0) {
      finishedRef.current = true;
      setTimeout(() => onWin && onWin({ score, shotsUsed: config.shots - shotsLeft, shotsLeft }), 400);
      return;
    }
    const crossed = bubbles.some(b => b.state === 'alive' && b.y > LOSE_LINE);
    if (crossed) {
      finishedRef.current = true;
      setTimeout(() => onLose && onLose({ score, shotsUsed: config.shots - shotsLeft, aliveCount }), 400);
      return;
    }
    if (shotsLeft <= 0 && !projectile) {
      finishedRef.current = true;
      setTimeout(() => onLose && onLose({ score, shotsUsed: config.shots, aliveCount }), 400);
    }
  }, [bubbles, shotsLeft, projectile, score, onWin, onLose, config.shots, LOSE_LINE]);

  const trailDots = useMemo(() => {
    if (!aiming) return [];
    const dots = [];
    let x = SHOOTER_X;
    let y = SHOOTER_Y;
    let vx = Math.cos(aimAngle) * 8;
    let vy = Math.sin(aimAngle) * 8;
    for (let i = 0; i < 96; i++) {
      x += vx; y += vy;
      if (x < BUBBLE_R) { x = BUBBLE_R; vx = -vx; }
      if (x > GAME_W - BUBBLE_R) { x = GAME_W - BUBBLE_R; vx = -vx; }
      if (y < BUBBLE_R + 50) break;
      const hit = bubbles.some(b => b.state === 'alive' && Math.hypot(b.x - x, b.y - y) < BUBBLE_D - 6);
      if (hit) break;
      if (i % 2 === 0) dots.push({ x, y, i });
    }
    return dots;
  }, [aimAngle, aiming, bubbles, totalShiftedRows, SHOOTER_X, SHOOTER_Y]);

  const currentDef = COLORS[ammoQueue[0]?.colorId || config.colors[0]];

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        background: 'transparent',
      }}
    >
      <div
        ref={containerRef}
        className="no-touch"
        style={{
          position: 'relative',
          width: GAME_W,
          height: H,
          transform: `scale(${scaleFactor})`,
          transformOrigin: 'center center',
          backgroundImage: `url(${gameBackground})`,
          backgroundSize: '100% 100%',
          backgroundPosition: 'center',
          overflow: 'hidden',
          boxShadow: 'none',
          flexShrink: 0,
        }}
      >
      {/* HUD bar — floating overlay at the very top of the screen */}
      <div
        style={{
          position: 'absolute',
          top: 'calc(12px + env(safe-area-inset-top, 0px))',
          left: 12,
          right: 12,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 12,
          zIndex: 25,
        }}
      >
        <div
          className="ls-chip"
          style={{
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            background: 'rgba(0, 20, 50, 0.65)',
            border: '2px solid rgba(59, 141, 212, 0.4)',
            borderRadius: '20px',
            boxShadow: '0 0 15px rgba(59, 141, 212, 0.2), inset 0 0 10px rgba(59, 141, 212, 0.1)',
          }}
        >
          <div className="hud-label" style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255, 255, 255, 0.55)' }}>Score</div>
          <div className="ls-num" style={{ fontSize: 20, lineHeight: 1, marginTop: 2, color: '#FFD700', textShadow: '0 0 8px rgba(255, 215, 0, 0.35)' }}>
            {score.toLocaleString()}
          </div>
          {combo > 1 && (
            <div style={{
              fontSize: 8, fontWeight: 800, marginTop: 2,
              color: 'var(--ls-orange-bright)', letterSpacing: '0.18em',
              textShadow: '0 0 6px rgba(255, 133, 51, 0.3)',
            }}>
              ×{combo} COMBO
            </div>
          )}
        </div>

        <div
          className="ls-chip"
          style={{
            padding: '8px 14px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'flex-end',
            textAlign: 'right',
            background: 'rgba(0, 20, 50, 0.65)',
            border: '2px solid rgba(59, 141, 212, 0.4)',
            borderRadius: '20px',
            boxShadow: '0 0 15px rgba(59, 141, 212, 0.2), inset 0 0 10px rgba(59, 141, 212, 0.1)',
          }}
        >
          <div className="hud-label" style={{ fontSize: 8, letterSpacing: '0.18em', color: 'rgba(255, 255, 255, 0.55)' }}>Shots Left</div>
          <div
            className="ls-num"
            style={{
              fontSize: 20,
              lineHeight: 1,
              marginTop: 2,
              color: shotsLeft <= 5 ? '#FF5555' : '#FF8533',
              textShadow: shotsLeft <= 5 ? '0 0 8px rgba(255, 85, 85, 0.4)' : '0 0 8px rgba(255, 133, 81, 0.35)',
            }}
          >
            {shotsLeft}
          </div>
        </div>
      </div>

      {/* Playfield — pinned to the bottom of the container */}
      <div
        ref={playfieldRef}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: GAME_W,
          height: '100%',
          background: 'transparent',
          overflow: 'hidden',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { setIsPointerDown(false); setAiming(false); }}
      >
        <div className="starfield" style={{ position: 'absolute', inset: 0, opacity: 0.3 }} />

        {/* Lose line */}
        <div style={{
          position: 'absolute', left: 0, right: 0, top: LOSE_LINE, height: 1,
          background: 'repeating-linear-gradient(90deg, rgba(239,68,68,0.6) 0 8px, transparent 8px 16px)',
        }} />

        {/* Bubbles */}
        {bubbles.map(b => {
          const visualX = b.state === 'falling' ? b.x : gridToPx(b.row, b.col, totalShiftedRows).x;
          const visualY = b.state === 'falling' ? b.y : gridToPx(b.row, b.col, totalShiftedRows).y;
          return (
            <Bubble key={b.id} x={visualX} y={visualY} colorDef={COLORS[b.colorId]}
              popping={b.state === 'popping'} falling={b.state === 'falling'}
              isStuck={b.id.startsWith('stuck-')} />
          );
        })}

        {/* Aim trail */}
        {trailDots.map(d => (
          <div 
            key={d.i} 
            className="aim-dot" 
            style={{ 
              left: d.x, 
              top: d.y, 
              opacity: 1 - d.i / 100,
              background: currentDef.color,
              boxShadow: `0 0 8px ${currentDef.glow}`
            }} 
          />
        ))}

        {/* Projectile */}
        {projectile && (
          <Bubble x={projectile.x} y={projectile.y} colorDef={COLORS[projectile.colorId]} />
        )}

        {/* Bursts */}
        {bursts.map(p => (
          <div key={p.id} className="burst-particle"
            style={{ 
              left: p.x, 
              top: p.y, 
              background: p.color, 
              width: p.size,
              height: p.size,
              '--bx': `${p.bx}px`, 
              '--by': `${p.by}px` 
            }} 
          />
        ))}

        {/* Score pops */}
        {scorePops.map(p => {
          const isSpecial = /[a-zA-Z]/.test(p.text) && !p.text.includes('drop');
          return (
            <div 
              key={p.id} 
              className={`score-pop ${isSpecial ? 'score-pop-special' : ''}`} 
              style={{ 
                left: p.x, 
                top: p.y,
                ...(isSpecial ? {
                  fontSize: 26,
                  color: '#FFD700',
                  textShadow: '0 2px 4px rgba(0,0,0,0.8), 0 0 15px #FF8533, 0 0 30px #FF3300',
                  letterSpacing: '0.05em',
                  animation: 'scorefloat-special 1.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
                } : {})
              }}
            >
              {p.text}
            </div>
          );
        })}

        {/* Aim hint */}
        {!aiming && (
          <div style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))',
            textAlign: 'center',
            fontFamily: 'var(--ls-font)',
            fontSize: 10,
            fontWeight: 900,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            pointerEvents: 'none',
            animation: 'blink 2s ease-in-out infinite',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.8), 0 0 10px rgba(0, 191, 255, 0.6)',
          }}>
            Drag to Aim • Release to Fire
          </div>
        )}

        {/* Next bubble container frame */}
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'absolute',
            left: NEXT_X,
            top: NEXT_Y,
            transform: 'translate(-50%, -50%)',
            width: 52 * scale,
            height: 52 * scale,
            borderRadius: '50%',
            border: `${2 * scale}px solid rgba(59, 141, 212, 0.6)`,
            background: 'rgba(0, 20, 50, 0.55)',
            boxShadow: `0 0 ${10 * scale}px rgba(59, 141, 212, 0.3), inset 0 0 ${8 * scale}px rgba(59, 141, 212, 0.2)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            zIndex: 5,
          }}
        >
          <div style={{
            position: 'absolute',
            bottom: -15 * scale,
            fontSize: 8 * scale,
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'rgba(255, 255, 255, 0.65)',
            textTransform: 'uppercase',
          }}>
            Next
          </div>
        </div>

        {/* Swap bubble container frame */}
        <div 
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          onClick={(e) => { e.stopPropagation(); swapAmmo(); }}
          style={{
            position: 'absolute',
            left: SWAP_X,
            top: SWAP_Y,
            transform: 'translate(-50%, -50%)',
            width: 52 * scale,
            height: 52 * scale,
            borderRadius: '50%',
            border: `${2 * scale}px solid rgba(255, 133, 51, 0.6)`,
            background: 'rgba(0, 20, 50, 0.55)',
            boxShadow: `0 0 ${10 * scale}px rgba(255, 133, 51, 0.3), inset 0 0 ${8 * scale}px rgba(255, 133, 51, 0.2)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            pointerEvents: 'auto',
            zIndex: 5,
          }}
          title="Tap to Swap"
        >
          <div style={{
            position: 'absolute',
            bottom: -15 * scale,
            fontSize: 8 * scale,
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: 'rgba(255, 255, 255, 0.65)',
            textTransform: 'uppercase',
          }}>
            Swap
          </div>
        </div>

        {/* Cannon Base */}
        <CannonBase aimAngle={aimAngle} recoil={recoil} shooterX={SHOOTER_X} shooterY={SHOOTER_Y} scale={scale} />

        {/* Ammo balls layer inside the playfield */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 14,
        }}>
          {ammoQueue.map((ammo, idx) => (
            <AmmoBall
              key={ammo.id}
              ammo={ammo}
              idx={idx}
              projectileActive={!!projectile}
              onSwap={swapAmmo}
              justLoadedId={justLoadedId}
              swappingId={swappingId}
              shooterX={SHOOTER_X}
              shooterY={SHOOTER_Y}
              scale={scale}
              nextX={NEXT_X}
              nextY={NEXT_Y}
              swapX={SWAP_X}
              swapY={SWAP_Y}
            />
          ))}
        </div>
      </div>
    </div>
    </div>
  );
}

const CannonBase = memo(function CannonBase({ aimAngle, recoil, shooterX, shooterY, scale }) {
  const aimAngleDeg = (aimAngle * 180) / Math.PI + 90; // Align with SVG coordinates (0 deg is up)
  const recoilOffset = recoil ? 12 : 0;
  
  return (
    <>
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: GAME_W,
        height: '100%',
        pointerEvents: 'none',
        zIndex: 13
      }}>
        <svg width={GAME_W} height="100%" style={{ overflow: 'visible' }}>
          <defs>
            {/* Metallic gradient for launcher */}
            <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0a2a5a" />
              <stop offset="30%" stopColor="#1e4f94" />
              <stop offset="50%" stopColor="#3b8dd4" />
              <stop offset="70%" stopColor="#1e4f94" />
              <stop offset="100%" stopColor="#0a2a5a" />
            </linearGradient>
            
            {/* Brand orange glow gradient */}
            <radialGradient id="orangeGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#FF8533" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#F26922" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#F26922" stopOpacity="0" />
            </radialGradient>
            
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Pivoting launcher group */}
          <g transform={`translate(${shooterX}, ${shooterY}) rotate(${aimAngleDeg}) translate(0, ${recoilOffset * scale}) scale(${scale})`}>
            {/* Futuristic Dome Cannon Turret */}
            {/* Barrel */}
            <path 
              d="M -10 -45 L 10 -45 L 14 -20 L -14 -20 Z" 
              fill="url(#metalGrad)" 
              stroke="rgba(255,255,255,0.25)"
              strokeWidth="1.5"
            />
            {/* Gold Accent Ring at barrel tip */}
            <rect 
              x="-12" 
              y="-52" 
              width="24" 
              height="7" 
              rx="1.5" 
              fill="#FFD700" 
              stroke="rgba(255,255,255,0.4)"
              strokeWidth="0.5"
            />
            {/* Glowing tip indicator */}
            <ellipse
              cx="0"
              cy="-52"
              rx="8"
              ry="2"
              fill="#00ffff"
              filter="url(#glowFilter)"
            />
            {/* Dome Body */}
            <circle
              cx="0"
              cy="0"
              r="32"
              fill="rgba(10, 42, 90, 0.35)"
              stroke="rgba(0, 229, 255, 0.4)"
              strokeWidth="1.5"
            />
            {/* Accent Gold Ring around Core */}
            <circle
              cx="0"
              cy="0"
              r="20"
              fill="none"
              stroke="#FFA500"
              strokeWidth="2.5"
              strokeDasharray="6 4"
            />
            {/* Glass dome reflection overlay */}
            <path
              d="M -22 -15 A 26 26 0 0 1 22 -15"
              fill="none"
              stroke="rgba(255,255,255,0.45)"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </g>
        </svg>
      </div>
    </>
  );
});
