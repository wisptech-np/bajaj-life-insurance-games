// Screens.jsx — Home, How to Play, and Results screens for Time Shield.
// Glassmorphism over a gradient wash (no binary assets — goal-juggler
// precedent); the hero art is inline SVG.
import React from 'react';
import { motion } from 'framer-motion';
import { RESULT_TARGET_SCORE } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

// Frozen-time wash: brand blue overhead, a steel band of stopped time through
// the middle, near-black below.
const TIME_BG = [
  'radial-gradient(ellipse 130% 55% at 50% 0%, rgba(30,107,224,0.32), rgba(2,6,23,0) 70%)',
  'radial-gradient(ellipse 120% 40% at 50% 62%, rgba(120,150,190,0.14), rgba(2,6,23,0) 70%)',
  'linear-gradient(180deg, rgba(5,16,38,0.5), rgba(3,8,20,0.88))',
  'linear-gradient(180deg, #0A1B3C 0%, #0B2450 45%, #05101F 100%)',
].join(', ');

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
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

/* ─── Hero: guardian frozen mid-lattice ────────────────── */
function HeroArt() {
  return (
    <svg width="240" height="240" viewBox="0 0 200 200" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <radialGradient id="tsOrb" cx="38%" cy="34%" r="80%">
          <stop offset="0%" stopColor="#7FB4FF" />
          <stop offset="55%" stopColor="#1E6BE0" />
          <stop offset="100%" stopColor="#003DA6" />
        </radialGradient>
        <linearGradient id="tsTrail" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(255,138,61,0)" />
          <stop offset="100%" stopColor="#FF8A3D" />
        </linearGradient>
      </defs>

      {/* Glass plate */}
      <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

      {/* Clock ring, stopped */}
      <circle cx="100" cy="100" r="74" fill="none" stroke="rgba(140,180,240,0.22)" strokeWidth="1.5" strokeDasharray="4 8" />
      <line x1="100" y1="100" x2="100" y2="44" stroke="rgba(140,180,240,0.35)" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="100" y1="100" x2="136" y2="112" stroke="rgba(140,180,240,0.35)" strokeWidth="2.5" strokeLinecap="round" />

      {/* Frozen bullet lattice with hovering trails */}
      {[
        [36, 58, 22], [150, 76, 18], [30, 118, 16], [154, 138, 22], [44, 156, 14],
      ].map(([x, y, t], i) => (
        <g key={i}>
          <rect x={x - t} y={y - 2} width={t} height={4} rx={2} fill="url(#tsTrail)" opacity="0.8" />
          <circle cx={x} cy={y} r="5.5" fill="#F26522" />
          <circle cx={x - 1.5} cy={y - 1.5} r="2" fill="#FFE0C4" />
        </g>
      ))}

      {/* The guardian */}
      <circle cx="100" cy="104" r="30" fill="url(#tsOrb)" />
      <circle cx="100" cy="104" r="37" fill="none" stroke="#9CC5FF" strokeWidth="2.6" opacity="0.9" />
      <path
        d="M100 84 L116 94 L116 110 L100 124 L84 110 L84 94 Z"
        fill="rgba(255,255,255,0.95)"
      />
      <path d="M92 104 L98 110 L110 96" fill="none" stroke="#003DA6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
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
        padding: '50px 24px 64px',
        background: TIME_BG,
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 6px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}>
          Time Shield
        </h1>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#FF8A3D',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}>
          Time moves only when you move
        </p>
      </div>

      <div style={{
        position: 'relative',
        width: 240,
        height: 240,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <HeroArt />
      </div>

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
          <PlayIcon size={20} />
          <span>Start Game</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play ────────────────────────────────────────── */
/**
 * Animation-first how-to-play. One 5.6 s loop states the whole SUPERHOT rule
 * without a word: while the hand drags, bullets streak and their trails stretch;
 * the moment the hand lifts, everything hangs in the air. Two drags carry the
 * guardian from the floor through the zone gate.
 */
const TUT_CSS = `
@keyframes tsTutGuardian {
  0%, 16%   { transform: translate(0, 0); }
  40%       { transform: translate(0, -70px); }
  58%, 70%  { transform: translate(0, -70px); }
  94%, 100% { transform: translate(0, -128px); }
}
@keyframes tsTutHand {
  0%, 12%   { transform: translate(26px, 40px) scale(0.9); opacity: 0; }
  16%       { transform: translate(26px, 40px) scale(1);   opacity: 1; }
  40%       { transform: translate(26px, -30px) scale(1);  opacity: 1; }
  50%       { transform: translate(26px, -30px) scale(0.9); opacity: 0; }
  70%       { transform: translate(26px, -30px) scale(1);  opacity: 1; }
  94%, 100% { transform: translate(26px, -88px) scale(1);  opacity: 1; }
}
@keyframes tsTutBulletA {
  0%, 16%   { transform: translateX(0); }
  40%       { transform: translateX(104px); }
  58%, 70%  { transform: translateX(110px); }
  94%, 100% { transform: translateX(240px); }
}
@keyframes tsTutBulletB {
  0%, 16%   { transform: translateX(0); }
  40%       { transform: translateX(-96px); }
  58%, 70%  { transform: translateX(-102px); }
  94%, 100% { transform: translateX(-228px); }
}
/* The tell: trails are long while time runs and collapse to nothing when it stops. */
@keyframes tsTutTrail {
  0%, 14%   { width: 5px;  opacity: 0.45; }
  26%, 40%  { width: 48px; opacity: 1; }
  54%, 70%  { width: 5px;  opacity: 0.45; }
  80%, 94%  { width: 48px; opacity: 1; }
  100%      { width: 5px;  opacity: 0.45; }
}
@keyframes tsTutFlow {
  0%, 14%   { width: 7%; }
  26%, 40%  { width: 82%; }
  54%, 70%  { width: 7%; }
  80%, 94%  { width: 82%; }
  100%      { width: 7%; }
}
/* Frost bloom over the whole plate while the world is stopped. */
@keyframes tsTutFrost {
  0%, 14%   { opacity: 0.55; }
  26%, 44%  { opacity: 0; }
  56%, 70%  { opacity: 0.55; }
  80%, 96%  { opacity: 0; }
  100%      { opacity: 0.55; }
}
@keyframes tsTutGate {
  0%, 88%   { opacity: 0.5; transform: scaleX(1); }
  95%       { opacity: 1;   transform: scaleX(1.35); }
  100%      { opacity: 0.5; transform: scaleX(1); }
}
.ts-tut-guardian { animation: tsTutGuardian 5.6s ease-in-out infinite; }
.ts-tut-hand     { animation: tsTutHand 5.6s ease-in-out infinite; }
.ts-tut-a        { animation: tsTutBulletA 5.6s ease-in-out infinite; }
.ts-tut-b        { animation: tsTutBulletB 5.6s ease-in-out infinite; }
.ts-tut-trail    { animation: tsTutTrail 5.6s ease-in-out infinite; }
.ts-tut-flow     { animation: tsTutFlow 5.6s ease-in-out infinite; }
.ts-tut-frost    { animation: tsTutFrost 5.6s ease-in-out infinite; }
.ts-tut-gate     { animation: tsTutGate 5.6s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ts-tut-guardian, .ts-tut-hand, .ts-tut-a, .ts-tut-b,
  .ts-tut-trail, .ts-tut-flow, .ts-tut-frost, .ts-tut-gate { animation: none !important; }
}
`;

/** The dragging hand: white fill so it stays legible over the bullet lattice. */
function DragHand({ size = 34 }) {
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 34 40" fill="none" aria-hidden="true">
      <path d="M13 21V7.6a3 3 0 0 1 6 0V18h1.6a3 3 0 0 1 3 3v.6l3.2 1.4a4 4 0 0 1 2.3 4.5l-1.2 5.6A5 5 0 0 1 23 37h-6.4a6 6 0 0 1-4.6-2.2l-5.6-6.9a2.8 2.8 0 0 1 3.9-4L13 26"
        fill="#FFFFFF" stroke="#05101F" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** One bullet: a glowing head with a trail that stretches only while time runs. */
function TutBullet({ cls, top, side }) {
  const isLeft = side === 'left';
  return (
    <div className={cls} style={{
      position: 'absolute',
      top,
      [isLeft ? 'left' : 'right']: 10,
      display: 'flex',
      flexDirection: isLeft ? 'row' : 'row-reverse',
      alignItems: 'center',
    }}>
      <div className="ts-tut-trail" style={{
        height: 5,
        borderRadius: 3,
        background: isLeft
          ? 'linear-gradient(90deg, rgba(255,138,61,0), #FF8A3D)'
          : 'linear-gradient(270deg, rgba(255,138,61,0), #FF8A3D)',
      }} />
      <div style={{
        width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
        background: '#F26522',
        boxShadow: '0 0 10px rgba(242,101,34,0.9)',
      }} />
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
        padding: 18,
        background: TIME_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: TUT_CSS }} />

      <div style={{
        background: 'rgba(0, 30, 70, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '18px 14px 16px',
        width: '100%',
        maxWidth: 344,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 23,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 12px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        {/* ── The looping demo: drag = time runs, stop = time freezes ── */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 208,
          background: 'radial-gradient(ellipse at 50% 90%, rgba(30,107,224,0.18), rgba(5,20,45,0.7) 72%)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}>
          {/* Zone gate the guardian has to reach */}
          <div style={{ position: 'absolute', top: 30, left: 0, right: 0, height: 3, background: 'rgba(150,190,240,0.3)' }} />
          <div className="ts-tut-gate" style={{
            position: 'absolute', top: 26, left: 'calc(50% - 26px)', width: 52, height: 11,
            borderRadius: 4, background: '#57E0A0', boxShadow: '0 0 14px rgba(87,224,160,0.7)',
          }} />

          <TutBullet cls="ts-tut-a" top={84} side="left" />
          <TutBullet cls="ts-tut-b" top={128} side="right" />

          {/* Frost wash: the world is visibly stopped whenever the hand is still */}
          <div className="ts-tut-frost" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(180deg, rgba(150,200,255,0.16), rgba(120,170,230,0.05))',
            backdropFilter: 'saturate(0.55)', WebkitBackdropFilter: 'saturate(0.55)',
          }} />

          {/* The guardian */}
          <div className="ts-tut-guardian" style={{
            position: 'absolute',
            bottom: 24,
            left: 'calc(50% - 15px)',
            width: 30,
            height: 30,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 36% 32%, #7FB4FF, #1E6BE0 55%, #003DA6)',
            boxShadow: '0 0 14px rgba(30,107,224,0.85), 0 0 0 3px rgba(156,197,255,0.55)',
            zIndex: 3,
          }} />

          {/* The finger doing the real drag */}
          <div className="ts-tut-hand" style={{
            position: 'absolute', bottom: 6, left: 'calc(50% - 4px)', zIndex: 5,
          }}>
            <DragHand size={30} />
          </div>

          {/* Time-flow meter: how fast the world is running right now */}
          <div style={{
            position: 'absolute', bottom: 7, left: 12, right: 12, height: 6,
            borderRadius: 3, background: 'rgba(255,255,255,0.12)', overflow: 'hidden',
          }}>
            <div className="ts-tut-flow" style={{
              height: '100%', borderRadius: 3,
              background: 'linear-gradient(90deg, #7C94AE, #1E6BE0, #FF8A3D)',
            }} />
          </div>
        </div>

        {/* ── At most three icon-led labels ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, margin: '12px 2px 14px' }}>
          {[
            {
              color: '#FF8A3D', word: 'DRAG TO MOVE',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="4.4" fill="#FF8A3D" />
                  <path d="M12 1.6 14.4 5.4H9.6L12 1.6zM12 22.4 9.6 18.6h4.8L12 22.4zM1.6 12 5.4 9.6v4.8L1.6 12zM22.4 12 18.6 14.4V9.6L22.4 12z" fill="#FF8A3D" opacity="0.75" />
                </svg>
              ),
            },
            {
              color: '#9CC5FF', word: 'STOP FREEZES TIME',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="#9CC5FF" strokeWidth="2" />
                  <path d="M12 6.6V12l3.6 2.4" stroke="#9CC5FF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M4 4 20 20" stroke="#9CC5FF" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
                </svg>
              ),
            },
            {
              color: '#57E0A0', word: 'CLIMB FIVE GATES',
              icon: (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M3 20h18" stroke="#57E0A0" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
                  <rect x="3" y="14.5" width="5" height="4" rx="1" fill="#57E0A0" opacity="0.55" />
                  <rect x="9.5" y="10" width="5" height="8.5" rx="1" fill="#57E0A0" opacity="0.8" />
                  <rect x="16" y="4.5" width="5" height="14" rx="1" fill="#57E0A0" />
                </svg>
              ),
            },
          ].map(({ color, word, icon }) => (
            <div key={word} style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '7px 2px', borderRadius: 12,
              background: 'rgba(255,255,255,0.05)', border: `1px solid ${color}44`,
            }}>
              {icon}
              <span style={{ fontSize: 9.5, fontWeight: 900, color, letterSpacing: '0.03em', lineHeight: 1.15 }}>
                {word}
              </span>
            </div>
          ))}
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
            }}
          >
            Play Game
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot }) {
  const score = stats?.score || 0;
  const zones = stats?.zones ?? 0;
  const nearMisses = stats?.nearMisses ?? 0;
  const avgFlow = Math.round((stats?.avgTimeScale ?? 0) * 100);
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
    const shareMessage = `Hi,\nI scored ${score} points in the Time Shield challenge — ${zones}/5 life stages secured.\nGood cover buys you time to think. Try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Time Shield',
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
  const progress = (Math.min(score, RESULT_TARGET_SCORE) / RESULT_TARGET_SCORE) * circumference;
  const strokeColor = won ? '#28A745' : '#ef4444';
  const glowColor = won ? 'rgba(40, 167, 69, 0.4)' : 'rgba(239, 68, 68, 0.4)';

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
        background: TIME_BG,
      }}
    >
      {won && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'All five zones secured' : 'Your Score'}
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
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="12"
              strokeLinecap="round"
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

      {/* Run stats */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 18,
        width: '100%',
        maxWidth: 360,
        justifyContent: 'center',
      }}>
        {[
          { label: 'Zones', value: `${zones}/5` },
          { label: 'Near misses', value: nearMisses },
          { label: 'Avg time flow', value: `${avgFlow}%` },
        ].map((chip) => (
          <div key={chip.label} style={{
            flex: 1,
            maxWidth: 116,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 14,
            padding: '8px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{chip.value}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>{chip.label}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          When life comes at you fast, the right cover buys you time to think.
        </h2>
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: '#1E6BE0',
          color: '#fff',
          fontWeight: 900,
          height: 52,
          borderRadius: '12px',
          border: 'none',
          cursor: 'pointer',
          fontSize: 18,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(30, 107, 224, 0.4)',
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
        <span>Share Score</span>
      </button>

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
          Talk to a specialist about cover that gives your family time when it matters.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: '#FF8A3D',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                textDecoration: 'none',
                textTransform: 'uppercase',
                border: '1px solid #FF8A3D',
                boxShadow: '0 4px 12px rgba(255, 138, 61, 0.25)',
              }}
            >
              <PhoneIcon />
              <span>Call Specialist</span>
            </a>
          )}

          {empPhone && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', fontSize: 9, letterSpacing: '0.15em' }}>OR</span>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}

          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: '#28A745',
                color: '#fff',
                fontWeight: 900,
                padding: '15px 20px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 17,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.25)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book Consultation</span>
            </button>
          </motion.div>
        </div>
      </div>

      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
        >
          <RotateIcon />
          <span>{won ? 'Play again' : 'Try again'}</span>
        </button>
      </motion.div>

      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>

      <span style={{ display: 'none' }} onClick={onHome} />
    </motion.div>
  );
}
