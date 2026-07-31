// Screens.jsx — Home, How to Play, and Results screens for Dual Cover.
// Design language of the repo: glassmorphism, deep blue, Poppins, clean buttons.
// Backgrounds are gradient washes (no binary assets).
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS, RESULT_TARGET_SCORE } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const SCREEN_BG = [
  'radial-gradient(ellipse 90% 55% at 18% 6%, rgba(30,107,224,0.30), rgba(2,6,23,0) 70%)',
  'radial-gradient(ellipse 90% 55% at 82% 6%, rgba(242,101,34,0.24), rgba(2,6,23,0) 70%)',
  'linear-gradient(180deg, #08122B 0%, #0D2350 55%, #060E22 100%)',
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

/* ─── Hero: the twin orbit, as vector art ───────────── */
function HeroMark() {
  return (
    <svg width="250" height="250" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
      <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      {/* descending bars */}
      <rect x="24" y="34" width="62" height="12" rx="5" fill="#9FB4D8" />
      <rect x="24" y="34" width="62" height="3.5" rx="1.75" fill="#D7E3F8" />
      <rect x="118" y="58" width="58" height="12" rx="5" fill="#9FB4D8" opacity="0.8" />
      <rect x="118" y="58" width="58" height="3.5" rx="1.75" fill="#D7E3F8" opacity="0.8" />
      {/* orbit */}
      <circle cx="100" cy="126" r="46" fill="none" stroke="rgba(190,214,255,0.35)" strokeWidth="2.5" strokeDasharray="3 6" />
      {/* trails */}
      <path d="M 100 80 A 46 46 0 0 1 140 103" fill="none" stroke="#7FC0FF" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      <path d="M 100 172 A 46 46 0 0 1 60 149" fill="none" stroke="#FFB27A" strokeWidth="6" strokeLinecap="round" opacity="0.4" />
      {/* blue Protection orb */}
      <g transform="translate(140, 103)">
        <circle r="15" fill="url(#dcBlue)" />
        <path d="M0,-8 L6,-5 L6,1 C6,5.5 3.4,7.6 0,9 C-3.4,7.6 -6,5.5 -6,1 L-6,-5 Z" fill="#fff" opacity="0.92" />
        <ellipse cx="-5" cy="-6" rx="4.6" ry="2.6" fill="rgba(255,255,255,0.5)" transform="rotate(-35 -5 -6)" />
      </g>
      {/* orange Growth orb */}
      <g transform="translate(60, 149)">
        <circle r="15" fill="url(#dcOrange)" />
        <path d="M0,-8.6 L5.7,-2.3 L2.3,-2.3 L2.3,8 L-2.3,8 L-2.3,-2.3 L-5.7,-2.3 Z" fill="#fff" opacity="0.92" />
        <ellipse cx="-5" cy="-6" rx="4.6" ry="2.6" fill="rgba(255,255,255,0.5)" transform="rotate(-35 -5 -6)" />
      </g>
      <defs>
        <radialGradient id="dcBlue" cx="0.35" cy="0.3" r="1">
          <stop offset="0%" stopColor="#7FC0FF" />
          <stop offset="50%" stopColor="#1E6BE0" />
          <stop offset="100%" stopColor="#062C6B" />
        </radialGradient>
        <radialGradient id="dcOrange" cx="0.35" cy="0.3" r="1">
          <stop offset="0%" stopColor="#FFD9B0" />
          <stop offset="50%" stopColor="#FF8A3D" />
          <stop offset="100%" stopColor="#8C3708" />
        </radialGradient>
      </defs>
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
        background: SCREEN_BG,
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
          Dual <span style={{ color: COLORS.orangeBright }}>Cover</span>
        </h1>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#7FC0FF',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}>
          Protection &amp; Growth, one orbit
        </p>
      </div>

      <div style={{
        position: 'relative',
        width: 250,
        height: 250,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <HeroMark />
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

/* ─── How to play ─────────────────────────────────────────
   No instructions: one looping 4 s demo of the real thing. The pair starts
   vertical, a centre bar drops toward them, a hand holds the right half, the
   ring spins 90° so both orbs sit in the side gaps, and the bar sweeps through
   clean. Same geometry as the canvas — a centre bar's half width is narrower
   than the ring radius, which is exactly why turning horizontal saves you. */
const DEMO_CSS = `
@keyframes dcdScene  { 0%,1% { opacity: 0; } 3%,97% { opacity: 1; } 100% { opacity: 0; } }
@keyframes dcdSpin   { 0%,12% { transform: rotate(0deg); } 42%,100% { transform: rotate(90deg); } }
@keyframes dcdBar    { 0% { transform: translateY(-30px); } 100% { transform: translateY(212px); } }
@keyframes dcdHold   { 0%,10% { opacity: 0; } 14%,44% { opacity: 1; } 50%,100% { opacity: 0; } }
@keyframes dcdHand   { 0%,8% { opacity: 0; transform: translateY(14px); } 14%,44% { opacity: 1; transform: translateY(0); } 52%,100% { opacity: 0; transform: translateY(14px); } }
@keyframes dcdRipple { 0%,12% { r: 4; opacity: 0.9; } 34%,100% { r: 26; opacity: 0; } }
@keyframes dcdArrow  { 0%,12% { opacity: 0; } 20%,40% { opacity: 1; } 50%,100% { opacity: 0; } }
@keyframes dcdPass   { 0%,56% { opacity: 0; transform: scale(0.9); } 64% { opacity: 1; transform: scale(1); } 78%,100% { opacity: 0; transform: scale(1.12); } }
.dcd-scene  { animation: dcdScene 4s linear infinite; }
.dcd-spin   { animation: dcdSpin 4s cubic-bezier(0.35,0,0.2,1) infinite; transform-origin: 150px 118px; }
.dcd-bar    { animation: dcdBar 4s linear infinite; }
.dcd-hold   { animation: dcdHold 4s ease-in-out infinite; }
.dcd-hand   { animation: dcdHand 4s ease-out infinite; }
.dcd-ripple { animation: dcdRipple 4s ease-out infinite; }
.dcd-arrow  { animation: dcdArrow 4s ease-in-out infinite; }
.dcd-pass   { animation: dcdPass 4s ease-out infinite; transform-origin: 150px 118px; }
@media (prefers-reduced-motion: reduce) {
  .dcd-scene, .dcd-spin, .dcd-bar, .dcd-hold, .dcd-hand, .dcd-ripple, .dcd-arrow, .dcd-pass {
    animation: none !important;
  }
}
`;

function Orb({ kind }) {
  const blue = kind === 'blue';
  return (
    <>
      <circle r="13" fill={`url(#dcd${blue ? 'Blue' : 'Orange'})`} />
      {blue
        ? <path d="M0,-7 L5.2,-4.4 L5.2,0.9 C5.2,4.8 3,6.6 0,7.8 C-3,6.6 -5.2,4.8 -5.2,0.9 L-5.2,-4.4 Z" fill="#fff" opacity="0.92" />
        : <path d="M0,-7.5 L5,-2 L2,-2 L2,7 L-2,7 L-2,-2 L-5,-2 Z" fill="#fff" opacity="0.92" />}
      <ellipse cx="-4.4" cy="-5.2" rx="4" ry="2.3" fill="rgba(255,255,255,0.5)" transform="rotate(-35 -4.4 -5.2)" />
    </>
  );
}

function DemoOrbit() {
  return (
    <svg width="100%" viewBox="0 0 300 200" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <radialGradient id="dcdBlue" cx="0.35" cy="0.3" r="1">
          <stop offset="0%" stopColor={COLORS.blueLt} />
          <stop offset="50%" stopColor={COLORS.blue} />
          <stop offset="100%" stopColor={COLORS.blueDeep} />
        </radialGradient>
        <radialGradient id="dcdOrange" cx="0.35" cy="0.3" r="1">
          <stop offset="0%" stopColor="#FFD9B0" />
          <stop offset="50%" stopColor={COLORS.orangeBright} />
          <stop offset="100%" stopColor={COLORS.orangeDeep} />
        </radialGradient>
        <clipPath id="dcdClip"><rect x="0" y="0" width="300" height="200" rx="16" /></clipPath>
      </defs>

      <g clipPath="url(#dcdClip)" className="dcd-scene">
        <rect x="0" y="0" width="300" height="200" fill="rgba(5,20,45,0.6)" />
        {/* The two control halves, stated by geometry rather than by a caption */}
        <line x1="150" y1="6" x2="150" y2="194" stroke="rgba(190,214,255,0.16)" strokeWidth="1.4" strokeDasharray="4 6" />
        <rect className="dcd-hold" x="150" y="0" width="150" height="200" fill="rgba(127,192,255,0.09)" />

        {/* Descending centre bar: gaps at the far left and far right */}
        <g className="dcd-bar">
          <rect x="118" y="-6.5" width="64" height="13" rx="5.5" fill={COLORS.barMid} />
          <rect x="118" y="-6.5" width="64" height="3.6" rx="1.8" fill={COLORS.barHi} />
          <rect x="118" y="2.9" width="64" height="3.6" rx="1.8" fill={COLORS.barLo} />
        </g>

        {/* The ring and its two orbs */}
        <circle cx="150" cy="118" r="48" fill="none" stroke={COLORS.ring} strokeWidth="2.5" strokeDasharray="3 6" />
        <circle className="dcd-pass" cx="150" cy="118" r="48" fill="none" stroke={COLORS.greenLt} strokeWidth="3.5" />
        <g className="dcd-spin">
          <g transform="translate(150,70)"><Orb kind="blue" /></g>
          <g transform="translate(150,166)"><Orb kind="orange" /></g>
        </g>

        {/* Spin direction, shown only while the half is held */}
        <g className="dcd-arrow" fill="none" stroke={COLORS.gold} strokeWidth="2.6" strokeLinecap="round">
          <path d="M150 52 A 66 66 0 0 1 209 88" />
          <path d="M203 76 L211 90 L196 92" strokeLinejoin="round" />
        </g>

        {/* The real input: a hand holding the right half */}
        <g className="dcd-hand">
          <circle className="dcd-ripple" cx="228" cy="150" r="4" fill="none" stroke="#fff" strokeWidth="2" />
          <g transform="translate(216,138) scale(1.05)" fill="none" stroke={COLORS.goldLt} strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 11V6a2 2 0 0 0-4 0v5" />
            <path d="M14 10V5a2 2 0 0 0-4 0v5" />
            <path d="M10 10.5V2a2 2 0 0 0-4 0v8.5" />
            <path d="M6 14v-2.5a2 2 0 0 0-4 0V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Icon + ≤4 words. The only prose allowed on this screen. */
function Cue({ tint, label, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">{children}</svg>
      <span style={{
        fontSize: 9, fontWeight: 900, letterSpacing: '0.06em', color: tint,
        textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.15,
      }}>
        {label}
      </span>
    </div>
  );
}

export function HowToPlayScreen({ onPlay, assist, onToggleAssist }) {
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
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: DEMO_CSS }} />

      <div style={{
        background: 'rgba(0, 30, 70, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '20px 16px 18px',
        width: '100%',
        maxWidth: 344,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 24,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 14px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
          <DemoOrbit />
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '14px 0 12px' }}>
          <Cue tint={COLORS.goldLt} label="Hold to spin">
            <path d="M20 11V6.5a2 2 0 0 0-4 0V11" fill="none" stroke={COLORS.goldLt} strokeWidth="2" strokeLinecap="round" />
            <path d="M16 10.5V5a2 2 0 0 0-4 0v5.5" fill="none" stroke={COLORS.goldLt} strokeWidth="2" strokeLinecap="round" />
            <path d="M12 11V3a2 2 0 0 0-4 0v10" fill="none" stroke={COLORS.goldLt} strokeWidth="2" strokeLinecap="round" />
            <path d="M8 14v-2a2 2 0 0 0-4 0v5a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-2" fill="none" stroke={COLORS.goldLt} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Cue>
          <Cue tint={COLORS.blueLt} label="Both must clear">
            <circle cx="13" cy="13" r="9" fill="none" stroke={COLORS.ring} strokeWidth="1.6" strokeDasharray="2 3" />
            <circle cx="13" cy="4.5" r="4.2" fill={COLORS.blue} />
            <circle cx="13" cy="21.5" r="4.2" fill={COLORS.orangeBright} />
          </Cue>
          <Cue tint={COLORS.dangerLt} label="Three shields only">
            {[4.5, 13, 21.5].map((x, i) => (
              <path key={x} d={`M${x} 6 l4 1.6 l0 4.4 c0 3.2 -1.8 5.4 -4 6.4 c-2.2 -1 -4 -3.2 -4 -6.4 l0 -4.4 z`}
                fill={i === 2 ? 'none' : COLORS.blue} stroke={i === 2 ? COLORS.danger : COLORS.blueLt} strokeWidth="1.3" />
            ))}
          </Cue>
        </div>

        {/* Accessibility control (not an instruction): direct-drag steering, default off */}
        <label
          aria-label="Assist mode: drag to steer instead of hold to spin"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, justifyContent: 'center',
            marginBottom: 14, cursor: 'pointer', fontSize: 10, fontWeight: 900,
            letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.7)', padding: '6px 12px', borderRadius: 999,
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)',
          }}
        >
          <input
            type="checkbox"
            checked={!!assist}
            onChange={(e) => onToggleAssist?.(e.target.checked)}
            style={{ width: 15, height: 15, accentColor: COLORS.orangeBright, cursor: 'pointer' }}
          />
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M8 8l-4 4 4 4M16 8l4 4-4 4" />
          </svg>
          <span>Assist: drag</span>
        </label>

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
    const shareMessage = `Hi,\nI scored ${score} points steering Protection and Growth through the Dual Cover descent.\nLosing either one loses the future — see how long you last: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Dual Cover',
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
  const targetScore = RESULT_TARGET_SCORE;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#28A745' : '#ef4444';
  const glowColor = won ? 'rgba(40, 167, 69, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  const chips = [
    { label: 'Passed', value: stats?.obstaclesPassed ?? 0 },
    { label: 'Near-misses', value: stats?.nearMisses ?? 0 },
    { label: 'Shields left', value: stats?.shieldsLeft ?? 0 },
  ];

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
        padding: '40px 20px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      {won && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Full descent survived' : 'Your Score'}
          </span>
        </p>
      </div>

      {/* Circular Progress Ring */}
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
      <div style={{ display: 'flex', gap: 8, marginBottom: 18, width: '100%', maxWidth: 340, justifyContent: 'center' }}>
        {chips.map((c) => (
          <div key={c.label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '8px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{c.value}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{c.label}</div>
          </div>
        ))}
      </div>

      {/* Motivational Message */}
      <div style={{ textAlign: 'center', marginBottom: 22, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Protection and growth are two sides of one plan — lose either, and you lose the future.
        </h2>
      </div>

      {/* Primary Action */}
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

      {/* Action Card Section */}
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
          Talk to a specialist about balancing protection and growth in one plan.
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

      {/* Play again action */}
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
          <span>Play again</span>
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
