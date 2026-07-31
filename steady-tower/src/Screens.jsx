// Screens.jsx — Home, How to Play, and Results screens for Steady Tower.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Steady Tower';
const GAME_TAGLINE = 'De-risk. Stay standing.';

/* ─── Icon set ───────────────────────────────────────────
   One family, shared by the screens AND the in-game HUD (SteadyTowerGame.jsx
   imports from here, so there is exactly one set to keep coherent).

   House rules, applied to every glyph below without exception:
     · 24x24 viewBox, so a size prop is the only thing that ever changes
     · currentColor, never a baked fill — the call site owns the colour
     · stroke width 2, round caps and joins
     · rx 1.5 on every rectangle, matching the block corners on the canvas
   All of them stay readable at 20px, which is the HUD size. */
const ICON = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
  style: { display: 'block', flexShrink: 0 },
};

/** Score — the stack itself. Three courses, the top one offset. */
export function StackIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <rect x="3" y="17" width="18" height="4" rx="1.5" />
      <rect x="4.5" y="10.5" width="15" height="4" rx="1.5" />
      <rect x="7" y="4" width="11" height="4" rx="1.5" />
    </svg>
  );
}

/** Risks — the same spiked mark the red blocks carry on the canvas. */
export function HazardIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <circle cx="12" cy="12" r="5" />
      <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
    </svg>
  );
}

/** Stability — a spirit level: vial, bubble, centre marks. */
export function LevelIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <rect x="2" y="8" width="20" height="8" rx="1.5" />
      <circle cx="14" cy="12" r="2" />
      <path d="M9 9.5v5M19 9.5v5" />
    </svg>
  );
}

export function ClockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}

function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <path d="M8 5.5 18.5 12 8 18.5z" fill="currentColor" />
    </svg>
  );
}

/** Win mark — the stack, squared up and crowned. */
function TrophyIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <rect x="6" y="17" width="12" height="4" rx="1.5" />
      <rect x="6" y="10.5" width="12" height="4" rx="1.5" />
      <path d="M8.5 8V4h7v4" />
      <path d="M12 4 13.4 6.2 12 8 10.6 6.2z" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Lose mark — the same stack, off its footing. */
function ToppleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <rect x="4" y="17" width="16" height="4" rx="1.5" />
      <rect x="5" y="10.5" width="14" height="4" rx="1.5" transform="rotate(-8 12 12.5)" />
      <rect x="8" y="4" width="12" height="4" rx="1.5" transform="rotate(-24 14 6)" />
    </svg>
  );
}

function CalendarIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <rect x="3" y="5" width="18" height="16" rx="1.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ShareIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <circle cx="18" cy="5" r="2.6" />
      <circle cx="6" cy="12" r="2.6" />
      <circle cx="18" cy="19" r="2.6" />
      <path d="M8.4 13.4 15.6 17.6M15.6 6.4 8.4 10.6" />
    </svg>
  );
}

function PhoneIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <path d="M21 16.9v2.6a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 1.1 3.8 2 2 0 0 1 3.1 2h2.6a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L6.7 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
    </svg>
  );
}

function RotateIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HomeIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} {...ICON}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 10v10h13V10" />
    </svg>
  );
}

/* ─── Shared keyframes ─────────────────────────────────
   No skew anywhere. The tower leans exactly the way the canvas leans it: a
   chain of nested joints, each rotating a degree or so about the seam below it,
   so the pose ACCUMULATES up the stack and the base stays planted. The lag is a
   per-level animation-delay, which is the CSS-sized version of the softer,
   slower springs the real model gives the upper joints. */
const SCREEN_CSS = `
@keyframes stTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.03em; transform: none; } }
@keyframes stIdleJoint {
  0%, 100% { transform: rotate(0deg); }
  40%      { transform: rotate(0.52deg); }
  72%      { transform: rotate(-0.3deg); }
}
@keyframes stPullJoint {
  0%, 26%  { transform: rotate(0deg); }
  46%      { transform: rotate(1.15deg); }
  64%      { transform: rotate(-0.52deg); }
  80%      { transform: rotate(0.22deg); }
  100%     { transform: rotate(0deg); }
}
@keyframes stFlickOut {
  0%, 26%  { transform: translateX(0); opacity: 1; }
  58%, 88% { transform: translateX(48px); opacity: 0; }
  100%     { transform: translateX(0); opacity: 1; }
}
@keyframes stThumbFlick {
  0%       { transform: translateX(0); opacity: 0; }
  18%      { transform: translateX(0); opacity: 1; }
  58%, 88% { transform: translateX(48px); opacity: 0; }
  100%     { transform: translateX(0); opacity: 0; }
}
@keyframes stArrowPulse { 0%, 100% { opacity: 0.2; } 44% { opacity: 1; } }
@keyframes stChip { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
.st-title { animation: stTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.st-joint { transform-box: view-box; }
.st-idle  { animation: stIdleJoint 4.2s ease-in-out infinite; }
.st-pull  { animation: stPullJoint 3.4s cubic-bezier(0.34,1.3,0.5,1) infinite; }
.st-fly   { animation: stFlickOut 3.4s cubic-bezier(0.22,1,0.36,1) infinite; }
.st-thumb { animation: stThumbFlick 3.4s cubic-bezier(0.22,1,0.36,1) infinite; }
.st-arrow { animation: stArrowPulse 3.4s ease-in-out infinite; }
.st-chip  { animation: stChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .st-title, .st-idle, .st-pull, .st-fly, .st-thumb, .st-arrow, .st-chip {
    animation: none !important;
  }
}
`;

/* ─── Tower demo ─────────────────────────────────────────
   One recursive component drives both screens: layer i is drawn inside layer
   i-1's group, so each joint's rotation is inherited by everything above it.
   That nesting IS the physics model the canvas runs, at SVG scale — which is
   why the hero and the how-to-play loop look like the game rather than like an
   illustration of it. `redAt` marks the block that flicks out. */
const DEMO = { cx: 80, baseY: 132, pitch: 12, blockH: 10, blockW: 26, gap: 2, layers: 8 };
const DEMO_REDS = [[2, 0], [5, 2]];

function DemoTower({ i = 0, joint, flick }) {
  if (i >= DEMO.layers) return null;
  const jointY = DEMO.baseY - i * DEMO.pitch;
  const y = jointY - DEMO.blockH;
  const x0 = DEMO.cx - (DEMO.blockW * 1.5 + DEMO.gap);
  return (
    <g
      className={`st-joint ${joint}`}
      style={{ transformOrigin: `${DEMO.cx}px ${jointY}px`, animationDelay: `${i * 45}ms` }}
    >
      {[0, 1, 2].map((s) => {
        const red = DEMO_REDS.some(([l, sl]) => l === i && sl === s);
        const flies = flick && flick[0] === i && flick[1] === s;
        const x = x0 + s * (DEMO.blockW + DEMO.gap);
        const block = (
          <>
            <rect x={x} y={y} width={DEMO.blockW} height={DEMO.blockH} rx="2.4"
              fill={red || flies ? 'url(#stRed)' : 'url(#stBlue)'} />
            <rect x={x + 0.7} y={y + 0.7} width={DEMO.blockW - 1.4} height="2.6" rx="1.2"
              fill={red || flies ? '#FF8A72' : '#5C9AEA'} opacity="0.85" />
          </>
        );
        return flies
          ? <g key={s} className="st-fly">{block}</g>
          : <g key={s}>{block}</g>;
      })}
      <DemoTower i={i + 1} joint={joint} flick={flick} />
    </g>
  );
}

function DemoBase() {
  return (
    <>
      <rect x={DEMO.cx - 52} y={DEMO.baseY} width="104" height="10" rx="3" fill="#24406E" />
      <rect x={DEMO.cx - 52} y={DEMO.baseY} width="104" height="2.4" rx="1.2" fill="rgba(143,185,245,0.45)" />
    </>
  );
}

function DemoDefs() {
  return (
    <defs>
      <linearGradient id="stBlue" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#2C6BC8" />
        <stop offset="65%" stopColor="#154B94" />
        <stop offset="100%" stopColor="#0B2F6A" />
      </linearGradient>
      <linearGradient id="stRed" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#E8563F" />
        <stop offset="65%" stopColor="#B32B2B" />
        <stop offset="100%" stopColor="#7C1522" />
      </linearGradient>
    </defs>
  );
}

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#FF8533', '#3B8DD4', '#005BAC', '#10B981', '#EC4899'];
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
              position: 'absolute',
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

export function HomeScreen({ onStart }) {
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
        justifyContent: 'space-between',
        padding: '50px 24px 56px',
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14, 79, 148, 0.55), rgba(11, 18, 33, 0.96) 72%), #0B1221',
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      {/* Title & Brand Section */}
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="st-title" style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 8px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12.5,
          fontWeight: 800,
          color: '#FF8A3D',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 auto',
          maxWidth: 300,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          {GAME_TAGLINE}
        </p>
      </div>

      {/* Hero: the tower, breathing on its joints. */}
      <div style={{
        position: 'relative',
        width: 250,
        height: 240,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1
      }}>
        <svg width="250" height="240" viewBox="0 0 160 152" aria-hidden="true">
          <DemoDefs />
          <rect x="2" y="2" width="156" height="148" rx="24" fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
          <g transform="translate(0 -4)">
            <DemoBase />
            <DemoTower joint="st-idle" />
          </g>
        </svg>
      </div>

      {/* Start Button */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}
      >
        <button
          type="button"
          onClick={onStart}
          style={{
            width: '100%',
            maxWidth: 320,
            height: 60,
            border: 'none',
            borderRadius: '12px',
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'linear-gradient(180deg, #FF8A3D 0%, #F26522 100%)',
            boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <PlayIcon size={22} />
          <span>Start</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play ──────────────────────────────────────────
   Animation only. One loop of the actual mechanic — thumb flicks a red block
   sideways, the block leaves, the tower leans on its joints and comes back —
   plus three wordless icon chips. No numbered steps, no instruction copy: the
   loop says all of it faster than a sentence could. */
function ChipIcon({ tint, children }) {
  return (
    <div style={{
      width: 46, height: 46, borderRadius: 14,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(255,255,255,0.05)',
      border: `1px solid ${tint}55`,
      color: tint,
    }}>
      {children}
    </div>
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
        padding: 22,
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14, 79, 148, 0.55), rgba(11, 18, 33, 0.96) 72%), #0B1221',
        overflowY: 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(11, 18, 33, 0.72)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '20px 18px 20px',
        width: '100%',
        maxWidth: 340,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 22,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 12px 0',
          color: '#fff',
        }}>
          How to Play
        </h2>

        {/* The loop: thumb flicks the red block out, tower leans, tower recovers. */}
        <svg width="100%" viewBox="0 0 210 152" style={{ display: 'block', maxHeight: 210 }} aria-hidden="true">
          <DemoDefs />
          <DemoBase />
          <DemoTower joint="st-pull" flick={[4, 2]} />

          {/* Motion arrow off the block that leaves, at its resting height. */}
          <path className="st-arrow" d="M126 79h44m-11-8 11 8-11 8" fill="none" stroke="#FF8A3D"
            strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Thumb, travelling with the flick. Outer group places it so the CSS
              transform on the inner one is free to animate. */}
          <g transform="translate(120 78)">
            <g className="st-thumb">
              <path d="M3 22V9a4 4 0 0 1 8 0v4h5a4 4 0 0 1 4 4v5a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5z"
                fill="#fff" stroke="rgba(11,18,33,0.55)" strokeWidth="2" strokeLinejoin="round" />
            </g>
          </g>
        </svg>

        {/* Three wordless chips: the risk, the balance, the fall. */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, margin: '10px 0 16px' }}>
          <ChipIcon tint="#FF7A6E"><HazardIcon size={24} /></ChipIcon>
          <ChipIcon tint="#4ADE80"><LevelIcon size={24} /></ChipIcon>
          <ChipIcon tint="#FFC845"><ToppleIcon size={24} /></ChipIcon>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%',
              height: 52,
              border: 'none',
              borderRadius: '12px',
              fontSize: 18,
              fontWeight: 900,
              color: '#fff',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              background: 'linear-gradient(180deg, #1E6BE0 0%, #003DA6 100%)',
              boxShadow: '0 4px 15px rgba(0, 61, 166, 0.4)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <PlayIcon size={22} />
            <span>Play</span>
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Results ──────────────────────────────────────────────
   Repo-standard structure (count-up score, radius-75 progress ring, confetti,
   share, glass action card, ghost replay, disclaimer). The prose is cut to what
   a result actually needs: the icons carry the labels. */
function StatTile({ icon, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '9px 6px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 4,
      color: accent,
    }}>
      {icon}
      <div style={{ fontSize: 18, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  // The stats contract this game reports: { score, risks, stability, time }.
  const score = stats?.score || 0;
  const risks = stats?.risks || 0;
  const stability = stats?.stability || 0;
  const timeLeft = stats?.time || 0;
  const totalRisks = GAME_CONFIG.tower.redCount;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return undefined;
    }
    const stepTime = 16;
    const increment = end / (1200 / stepTime);
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
    const shareMessage = `Hi,
I pulled ${risks} of ${totalRisks} risks out of the ${GAME_TITLE} challenge at ${stability}% average stability, scoring ${score} points.
De-risk your portfolio without destabilising your life plan. Take your run here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({ title: GAME_TITLE, text: shareMessage });
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
  const progress = (Math.min(score, RESULT_TARGET_SCORE) / RESULT_TARGET_SCORE) * circumference;
  const strokeColor = won ? '#28A745' : score < 600 ? '#EF4444' : '#FFC845';
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 600 ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
        padding: '34px 20px 24px',
        overflowY: 'auto',
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14, 79, 148, 0.55), rgba(11, 18, 33, 0.96) 72%), #0B1221',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 10,
        }}>
          <span style={{ color: won ? '#4ADE80' : '#FF7A6E', display: 'flex' }}>
            {won ? <TrophyIcon size={20} /> : <ToppleIcon size={20} />}
          </span>
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Secured' : 'Toppled'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: '#1E6BE0' }}>{leadName || 'Friend'}!</span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, zIndex: 2 }}>
        <div style={{ width: 162, height: 162, position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="12" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', marginTop: 6 }}>
              <StackIcon size={18} />
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the { score, risks, stability, time } contract, on screen */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 12, zIndex: 2 }}>
        <StatTile icon={<HazardIcon size={17} />} value={`${risks}/${totalRisks}`} accent="#FF7A6E" />
        <StatTile icon={<LevelIcon size={17} />} value={`${stability}%`} accent="#4ADE80" />
        <StatTile icon={<ClockIcon size={17} />} value={`${timeLeft}s`} accent="#FFC845" />
      </div>

      {/* One block per risk: filled green = pulled, hollow red = left standing.
          The same shape the player spent the run looking at, so it needs no
          caption to say which is which. */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {Array.from({ length: totalRisks }).map((_, i) => {
          const cleared = i < risks;
          return (
            <span
              key={i}
              className="st-chip"
              style={{
                animationDelay: `${180 + i * 70}ms`,
                width: 30,
                height: 14,
                borderRadius: 4,
                background: cleared ? '#28A745' : 'rgba(239,68,68,0.16)',
                border: `1.5px solid ${cleared ? '#4ADE80' : 'rgba(239,68,68,0.6)'}`,
              }}
            />
          );
        })}
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: '#1E6BE0', color: '#fff', fontWeight: 900,
          height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(30,107,224,0.4)',
          width: '100%', maxWidth: 300, marginBottom: 18, zIndex: 2,
        }}
      >
        <ShareIcon size={20} />
        <span>Share</span>
      </button>

      {/* Lead / booking card */}
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'rgba(255,255,255,0.05)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: 22, padding: '18px 16px',
        border: '1px solid rgba(255,255,255,0.12)',
        textAlign: 'center', marginBottom: 16, zIndex: 2,
      }}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.35, margin: '0 0 16px 0' }}>
          Take the real risks out without destabilising your plan.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: 'linear-gradient(180deg, #FF8A3D 0%, #F26522 100%)',
                color: '#fff', fontWeight: 900, padding: '15px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 17, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                boxShadow: '0 4px 16px rgba(242,101,34,0.35)',
              }}
            >
              <CalendarIcon size={20} />
              <span>Book</span>
            </button>
          </motion.div>

          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: 'rgba(255,255,255,0.05)', color: '#fff', fontWeight: 900,
                padding: '14px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 16, textDecoration: 'none', textTransform: 'uppercase',
                border: '1px solid rgba(255,255,255,0.18)',
              }}
            >
              <PhoneIcon size={20} />
              <span>Call</span>
            </a>
          )}
        </div>
      </div>

      {/* Retry / Home */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 360, marginBottom: 16, zIndex: 2 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 2, height: 48, borderRadius: 12, cursor: 'pointer',
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)',
            color: '#fff', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RotateIcon />
          <span>{retryLabel || 'Play again'}</span>
        </button>
        <button
          onClick={onHome}
          style={{
            flex: 1, height: 48, borderRadius: 12, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.72)', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
