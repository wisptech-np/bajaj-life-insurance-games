// Screens.jsx — Home, HowToPlay, and Results screens for Risk Exit.
// Matches the brand styling: deep-blue background, glassmorphism,
// 12px rounded-xl buttons with hover scale animations, and synthetic SFX.
import React from 'react';
import { motion } from 'framer-motion';
import { BRAND, LEVELS, TARGET_SCORE } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function PhoneIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

function CalendarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

/* ─── Shared block art (inline SVG, no image assets) ────── */
function BlockDefs() {
  return (
    <defs>
      <linearGradient id="rxWell" x1="0" y1="0" x2="0.6" y2="1">
        <stop offset="0%" stopColor="#0d1728" />
        <stop offset="100%" stopColor="#060c17" />
      </linearGradient>
      <linearGradient id="rxGold" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#FFE9A6" />
        <stop offset="52%" stopColor="#FFC845" />
        <stop offset="100%" stopColor="#B4780C" />
      </linearGradient>
      <linearGradient id="rxRed" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#FCA5A5" />
        <stop offset="52%" stopColor="#E23D3D" />
        <stop offset="100%" stopColor="#7A1414" />
      </linearGradient>
      <linearGradient id="rxPlum" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#FDA4C4" />
        <stop offset="52%" stopColor="#D6336C" />
        <stop offset="100%" stopColor="#6D1030" />
      </linearGradient>
      <linearGradient id="rxEmber" x1="0" y1="0" x2="0.35" y2="1">
        <stop offset="0%" stopColor="#FBA98B" />
        <stop offset="52%" stopColor="#D2451C" />
        <stop offset="100%" stopColor="#6B1D06" />
      </linearGradient>
      <linearGradient id="rxGloss" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="rgba(255,255,255,0.34)" />
        <stop offset="100%" stopColor="rgba(255,255,255,0)" />
      </linearGradient>
    </defs>
  );
}

/** One extruded slab: body gradient, top gloss band, bright rim. */
function Slab({ x, y, w, h, fill, r = 7 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} />
      <rect x={x} y={y} width={w} height={h * 0.5} rx={r} fill="url(#rxGloss)" />
      <rect x={x + 0.8} y={y + 0.8} width={w - 1.6} height={h - 1.6} rx={Math.max(1, r - 0.8)}
        fill="none" stroke="rgba(255,255,255,0.42)" strokeWidth="1.4" />
    </g>
  );
}

/** The umbrella-over-family mark stamped on the gold cover block. */
function CoverMark({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} opacity="0.8">
      <path d="M-11 -1a11 11 0 0 1 22 0z" fill="#3b2a05" />
      <path d="M0 -1V9" stroke="#3b2a05" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="-5" cy="10.5" r="2.8" fill="#3b2a05" />
      <circle cx="5" cy="10.5" r="2.8" fill="#3b2a05" />
    </g>
  );
}

/** The gate mouth: brackets and an outbound chevron on the right wall. */
function Gate({ x, y, h, w = 18 }) {
  return (
    <g>
      <rect x={x - 4} y={y} width={w + 8} height={h} fill="rgba(74,222,128,0.15)" />
      <path d={`M${x - 6} ${y + 1.4} H${x + w} M${x - 6} ${y + h - 1.4} H${x + w}`}
        stroke="#4ADE80" strokeWidth="2.6" strokeLinecap="round" />
      <path d={`M${x + 1} ${y + h * 0.3} L${x + 7} ${y + h * 0.5} L${x + 1} ${y + h * 0.7}`}
        fill="none" stroke="#4ADE80" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        className="rx-gate-chev" />
    </g>
  );
}

/** Pointing-hand cursor glyph. */
function Finger({ className }) {
  return (
    <g className={className}>
      <path
        d="M18 11V6a2 2 0 0 0-4 0v5M14 10V5a2 2 0 0 0-4 0v5M10 10.5V2a2 2 0 0 0-4 0v8.5M6 14v-2.5a2 2 0 0 0-4 0V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5"
        fill="rgba(8,14,28,0.8)" stroke="#FFF3C4" strokeWidth="1.9"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </g>
  );
}

/* ─── Home hero: the gold cover block escaping a packed board ─── */
function BoardHero() {
  const C = 34;   // cell size
  const O = 12;   // board origin
  const px = (n) => O + n * C;
  return (
    <div aria-hidden="true" className="re-hero" style={{ width: 252, height: 196, margin: '0 auto' }}>
      <svg width="252" height="196" viewBox="0 0 252 196">
        <BlockDefs />
        <rect x={O - 7} y={O - 7} width={C * 5 + 14} height={C * 5 + 14} rx="20" fill="url(#rxWell)" />
        {Array.from({ length: 25 }).map((_, i) => {
          const col = i % 5;
          const row = (i - col) / 5;
          return (
            <rect key={i} x={px(col) + 3} y={px(row) + 3} width={C - 6} height={C - 6} rx="7"
              fill={(col + row) % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.042)'} />
          );
        })}

        <Gate x={px(5) + 3} y={px(1) + 3} h={C - 6} />

        {/* Risks shoved clear of the escape lane — row 1 is the open path */}
        <Slab x={px(0) + 3} y={px(0) + 3} w={C * 2 - 6} h={C - 6} fill="url(#rxRed)" />
        <Slab x={px(3) + 3} y={px(0) + 3} w={C * 2 - 6} h={C - 6} fill="url(#rxEmber)" />
        <Slab x={px(2) + 3} y={px(2) + 3} w={C - 6} h={C * 2 - 6} fill="url(#rxRed)" />
        <Slab x={px(3) + 3} y={px(2) + 3} w={C - 6} h={C * 2 - 6} fill="url(#rxPlum)" />
        <Slab x={px(4) + 3} y={px(2) + 3} w={C - 6} h={C * 3 - 6} fill="url(#rxEmber)" />
        <Slab x={px(0) + 3} y={px(3) + 3} w={C - 6} h={C * 2 - 6} fill="url(#rxPlum)" />
        <Slab x={px(1) + 3} y={px(4) + 3} w={C * 2 - 6} h={C - 6} fill="url(#rxPlum)" />

        {/* The gold cover block, escaping forever */}
        <g className="rx-hero-run">
          <Slab x={px(0) + 3} y={px(1) + 3} w={C * 2 - 6} h={C - 6} fill="url(#rxGold)" />
          <CoverMark x={px(1)} y={px(1) + C / 2 - 3} s={0.82} />
        </g>
      </svg>
    </div>
  );
}

/* ─── HomeScreen ───────────────────────────────────────── */
export function HomeScreen({ onStart, theme }) {
  void theme;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '28px 24px 40px',
        background: 'radial-gradient(ellipse at 50% 25%, rgba(14,79,148,0.6), rgba(5,26,58,0.9) 72%), #051a3a',
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.28em',
          color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginBottom: 8,
        }}>
          Bajaj Life Insurance
        </div>
        <h1 style={{
          margin: 0, fontSize: 40, fontWeight: 900, lineHeight: 1.05, letterSpacing: '-0.03em',
          color: '#fff', textShadow: '0 4px 18px rgba(0,0,0,0.45)',
        }}>
          Risk <span style={{
            background: 'linear-gradient(180deg, #FF8533 0%, #F26522 60%, #C24A0E 100%)',
            WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent',
          }}>Exit</span>
        </h1>
        <p style={{
          margin: '10px auto 0', maxWidth: 300, fontSize: 13.5, lineHeight: 1.45,
          color: 'rgba(255,255,255,0.75)', fontWeight: 600,
        }}>
          Debt, illness, market shocks and job loss are wedged across your family&rsquo;s path.
          Slide them aside and get your cover out.
        </p>
      </div>

      <BoardHero />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.96 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 15, zIndex: 5 }}
      >
        <button
          type="button"
          className="re-play-btn"
          onClick={onStart}
          style={{
            width: '100%', maxWidth: 320, height: 60,
            fontSize: 20, letterSpacing: '0.06em', textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            backgroundColor: BRAND.orange,
            color: '#fff',
            fontWeight: 900,
            borderRadius: '12px',
            border: 'none',
            boxShadow: '0 4px 18px rgba(242, 101, 34, 0.45)',
            cursor: 'pointer',
          }}
        >
          <PlayIcon size={22} />
          Play Game
        </button>
      </motion.div>

      <p style={{
        marginTop: 16, fontSize: 11, fontWeight: 600,
        color: 'rgba(255,255,255,0.4)', textAlign: 'center',
      }}>
        2-minute cap &middot; {LEVELS.length} boards &middot; beat par
      </p>
    </motion.div>
  );
}

/* ─── HowToPlayScreen — one looping demo, near-zero text ── */
function DragDemo() {
  // 4-column mini board, 30px cells at origin (14,14). One red block is
  // dragged down out of the lane; the gold block then slides out the gate.
  const C = 30;
  const O = 14;
  const px = (n) => O + n * C;
  return (
    <div className="rx-demo" aria-label="Drag a red block out of the lane, then slide the gold block out through the gate">
      <svg width="100%" height="100%" viewBox="0 0 190 152" role="img">
        <BlockDefs />
        <rect x={O - 7} y={O - 7} width={C * 4 + 14} height={C * 4 + 14} rx="16" fill="url(#rxWell)" />
        {Array.from({ length: 16 }).map((_, i) => (
          <rect key={i} x={px(i % 4) + 3} y={px(Math.floor(i / 4)) + 3}
            width={C - 6} height={C - 6} rx="6"
            fill={(i % 4 + Math.floor(i / 4)) % 2 ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.042)'} />
        ))}

        <Gate x={px(4) + 3} y={px(1) + 3} h={C - 6} />

        {/* Idle risk, never moves — shows the board is packed */}
        <Slab x={px(3) + 3} y={px(2) + 3} w={C - 6} h={C * 2 - 6} fill="url(#rxPlum)" r={6} />

        {/* The blocker being dragged down and out of the lane */}
        <g className="rx-demo-risk">
          <Slab x={px(2) + 3} y={px(0) + 3} w={C - 6} h={C * 2 - 6} fill="url(#rxRed)" r={6} />
        </g>

        {/* The gold cover, escaping once the lane is clear */}
        <g className="rx-demo-hero">
          <Slab x={px(0) + 3} y={px(1) + 3} w={C * 2 - 6} h={C - 6} fill="url(#rxGold)" r={6} />
          <CoverMark x={px(1)} y={px(1) + C / 2 - 3} s={0.7} />
        </g>

        {/* Finger 1: drags the risk down. Finger 2: drags the cover out. */}
        <g transform={`translate(${px(2) + 4} ${px(0) + 6})`}>
          <Finger className="rx-demo-f1" />
        </g>
        <g transform={`translate(${px(0) + 12} ${px(1) + 8})`}>
          <Finger className="rx-demo-f2" />
        </g>
      </svg>
    </div>
  );
}

function DemoLabel({ children, tint, icon }) {
  return (
    <span className="rx-tip" style={{ '--tip': tint }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={tint}
        strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {icon}
      </svg>
      {children}
    </span>
  );
}

export function HowToPlayScreen({ onPlay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        overflow: 'hidden',
      }}
    >
      <div className="re-glass-card" style={{
        width: '100%',
        maxWidth: 356,
        padding: '20px 18px 18px',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        alignItems: 'center',
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: 24,
        backdropFilter: 'blur(12px)',
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.01em', margin: 0, color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        <DragDemo />

        <div className="rx-tips">
          <DemoLabel tint="#FFC845" icon={<><path d="M5 12h14" /><path d="M13 6l6 6-6 6" /><path d="M11 18l-6-6 6-6" /></>}>
            Drag
          </DemoLabel>
          <DemoLabel tint="#F87171" icon={<><rect x="4" y="9" width="16" height="6" rx="2" /><path d="M9 12h6" /></>}>
            One axis
          </DemoLabel>
          <DemoLabel tint="#4ADE80" icon={<><path d="M14 4h5v16h-5" /><path d="M3 12h12" /><path d="M11 8l4 4-4 4" /></>}>
            Exit
          </DemoLabel>
        </div>

        <motion.div whileTap={{ scale: 0.96 }} style={{ width: '100%', marginTop: 2 }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52,
              fontSize: 18, textTransform: 'uppercase', letterSpacing: '0.06em',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              backgroundColor: BRAND.orange,
              color: '#fff',
              fontWeight: 900,
              borderRadius: '12px',
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(242, 101, 34, 0.3)',
            }}
          >
            <PlayIcon size={20} />
            Play
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Confetti (win only) ──────────────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#F26522', '#3B8DD4', '#003DA6', '#28A745'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = Math.random() * 100;
        const dur = 2 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        const color = colors[i % colors.length];
        return (
          <div
            key={i}
            className="confetti"
            style={{
              left: `${left}%`,
              background: color,
              '--dur': `${dur}s`,
              '--delay': `${delay}s`,
              top: -20,
              transform: `rotate(${Math.random() * 360}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

/* ─── ResultsScreen ────────────────────────────────────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  void onHome;
  const score = stats?.score || 0;
  const levelsCleared = stats?.levelsCleared ?? 0;
  const moves = stats?.moves ?? 0;
  const risksCleared = stats?.risksCleared ?? 0;

  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return;
    }
    const duration = 1200;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = end / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedScore(end);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.round(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [score]);

  async function handleShare() {
    const rawShareUrl = buildShareUrl() || window.location.href;
    const shareUrl = await shortenUrl(rawShareUrl);
    const shareMessage = `Hi,\nI scored ${score} points in Risk Exit — I slid every risk aside and got my family's cover out!\nCan you beat my score? Try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Risk Exit',
          text: shareMessage,
        });
      } catch { /* dismissed */ }
    } else {
      try {
        await navigator.clipboard.writeText(shareMessage);
        alert('Score and link copied to clipboard!');
      } catch { /* ignore */ }
    }
  }

  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const targetScore = TARGET_SCORE;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#22c55e' : score < 500 ? '#ef4444' : '#FFC845';
  const glowColor = won ? 'rgba(34, 197, 94, 0.4)' : score < 500 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 200, 69, 0.4)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '36px 20px 24px',
        overflowY: 'auto',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.85) 70%), #051a3a',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {won && <Confetti />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#FFC845', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Cover Secured!' : 'Session Complete'}
          </span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#0f172a" strokeWidth="10" />
            <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                filter: `drop-shadow(0 0 8px ${glowColor})`,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Session stats chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
        <div style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          Boards <span style={{ color: '#FFC845' }}>{levelsCleared}/{LEVELS.length}</span>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          Risks <span style={{ color: '#22c55e' }}>{risksCleared}</span>
        </div>
        <div style={{
          padding: '8px 14px', borderRadius: 12,
          background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
          fontSize: 12, fontWeight: 800, color: '#fff',
        }}>
          Moves <span style={{ color: '#7DD3FC' }}>{moves}</span>
        </div>
      </div>

      {/* Motivational message */}
      <div style={{ textAlign: 'center', marginBottom: 22, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Real risks do not move themselves. Clear a path for your cover before you need it.
        </h2>
      </div>

      {/* Share */}
      <button
        onClick={handleShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: '#1d4ed8',
          color: '#fff',
          fontWeight: 900,
          height: 52,
          borderRadius: '16px',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(29, 78, 216, 0.6)',
          width: '100%',
          maxWidth: 280,
          marginBottom: 22,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background 0.2s',
        }}
      >
        <ShareIcon />
        <span>Share</span>
      </button>

      {/* Action Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: 'rgba(15, 23, 42, 0.75)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: '24px',
        padding: '20px 18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        marginBottom: 20,
      }}>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
          Consult an expert to balance your protection and investment choices.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: '#F59E0B',
                color: '#000',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                textDecoration: 'none',
                textTransform: 'uppercase',
                border: '1px solid #fbbf24',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
              }}
            >
              <PhoneIcon />
              <span>Call Now</span>
            </a>
          )}

          {empPhone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', fontSize: 9, letterSpacing: '0.15em' }}>OR</span>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}

          <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: '#16A34A',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book a Slot</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Retry */}
      <motion.div whileTap={{ scale: 0.95 }}>
        <button
          onClick={onRetry}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.5)',
            cursor: 'pointer',
            fontSize: 16,
            fontWeight: 'bold',
            letterSpacing: '0.05em',
            padding: '12px 24px',
            textTransform: 'uppercase',
            transition: 'color 0.2s',
            marginBottom: 16,
          }}
          className="play-again-btn"
        >
          <RotateIcon />
          <span>{retryLabel || 'Play again'}</span>
        </button>
      </motion.div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
