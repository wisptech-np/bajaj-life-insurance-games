// Screens.jsx — Home, How to Play, and Results screens for Cover Drive.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_RUNS } from './data.js';

const GAME_TITLE = 'Cover Drive';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const DANGER = '#EF4444';
const SCREEN_BG = 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function TrophyIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M9 5h14v5a7 7 0 0 1-14 0V5z" fill="#fff" />
      <path d="M5 7h4v3a3 3 0 0 1-3-3z" fill="#fff" opacity="0.85" />
      <path d="M27 7h-4v3a3 3 0 0 0 3-3z" fill="#fff" opacity="0.85" />
      <rect x="13" y="16" width="6" height="6" fill="#fff" opacity="0.92" />
      <rect x="9" y="22" width="14" height="4" rx="1.5" fill="#fff" />
    </svg>
  );
}

/** Run-ended mark: broken stumps. */
function BowledIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="8" y="10" width="3" height="18" rx="1.5" fill="#fff" transform="rotate(-14 9.5 19)" />
      <rect x="14.5" y="9" width="3" height="19" rx="1.5" fill="#fff" />
      <rect x="21" y="10" width="3" height="18" rx="1.5" fill="#fff" transform="rotate(13 22.5 19)" />
      <rect x="6" y="4" width="9" height="2.6" rx="1.3" fill="#fff" opacity="0.9" transform="rotate(-26 10.5 5.3)" />
      <rect x="18" y="4" width="9" height="2.6" rx="1.3" fill="#fff" opacity="0.9" transform="rotate(22 22.5 5.3)" />
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
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
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HomeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes cdTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes cdFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes cdGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes cdChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes cdHeroBall {
  0%      { transform: translate(100px, 44px) scale(0.42); opacity: 0; }
  8%      { opacity: 1; }
  56%     { transform: translate(97px, 126px) scale(0.9); }
  68%     { transform: translate(96px, 138px) scale(1); }
  76%     { transform: translate(120px, 120px) scale(1); }
  100%    { transform: translate(196px, 52px) scale(0.7); opacity: 0; }
}
@keyframes cdHeroBat  { 0%,58% { transform: rotate(-52deg); } 72% { transform: rotate(10deg); } 100% { transform: rotate(46deg); } }
@keyframes cdHeroMark { 0%,40% { opacity: 0.35; } 52% { opacity: 1; } 100% { opacity: 0.35; } }
@keyframes cdBeatSweep { 0%,10% { transform: translateX(-26px); } 62%,100% { transform: translateX(20px); } }
@keyframes cdBeatBall  { 0%,20% { transform: translate(0,0); opacity: 0.2; } 40% { opacity: 1; } 72%,100% { transform: translate(4px, 30px); opacity: 1; } }
@keyframes cdBeatShield { 0%,40% { opacity: 0.35; transform: scale(0.86); } 62%,100% { opacity: 1; transform: scale(1); } }
.cd-title { animation: cdTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.cd-float { animation: cdFloat 4s ease-in-out infinite; }
.cd-glow  { animation: cdGlow 2.2s ease-in-out infinite; }
.cd-chip  { animation: cdChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.cd-hero-ball { animation: cdHeroBall 3.2s cubic-bezier(0.5,0,0.6,1) infinite; }
.cd-hero-bat  { animation: cdHeroBat 3.2s cubic-bezier(0.6,0,0.3,1) infinite; transform-origin: 0 0; }
.cd-hero-mark { animation: cdHeroMark 3.2s ease-in-out infinite; }
.cd-sweep  { animation: cdBeatSweep 2.4s cubic-bezier(0.5,0,0.5,1) infinite; }
.cd-fall   { animation: cdBeatBall 2.4s cubic-bezier(0.5,0,0.7,1) infinite; }
.cd-shieldb { animation: cdBeatShield 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cd-title, .cd-float, .cd-glow, .cd-chip, .cd-hero-ball, .cd-hero-bat, .cd-hero-mark,
  .cd-sweep, .cd-fall, .cd-shieldb { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, BLUE, GREEN, '#EC4899'];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {Array.from({ length: 26 }).map((_, i) => {
        const left = Math.random() * 100;
        const dur = 2 + Math.random() * 2;
        const delay = Math.random() * 1.5;
        return (
          <div
            key={i}
            className="confetti"
            style={{
              position: 'absolute',
              left: `${left}%`,
              background: colors[i % colors.length],
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

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero motif: the ground itself — floodlit sky, boundary rope arc, the pitch in
 * perspective with a length marker on it, the stumps, and a ball that pitches
 * and is driven away as the bat comes through. Same construction the canvas
 * uses, so the screen previews the game rather than illustrating it.
 */
function HeroGround() {
  return (
    <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="cdSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#081026" />
          <stop offset="100%" stopColor="#0A1E42" />
        </linearGradient>
        <linearGradient id="cdTurf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A3320" />
          <stop offset="100%" stopColor="#1B7040" />
        </linearGradient>
        <linearGradient id="cdPitch" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8B7748" />
          <stop offset="100%" stopColor="#E0CDA0" />
        </linearGradient>
        <radialGradient id="cdBall" cx="0.36" cy="0.32" r="0.75">
          <stop offset="0%" stopColor="#FF6E63" />
          <stop offset="60%" stopColor="#D8302A" />
          <stop offset="100%" stopColor="#7C1410" />
        </radialGradient>
        <clipPath id="cdClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
      </defs>

      <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#cdSky)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

      <g clipPath="url(#cdClip)">
        <rect x="4" y="46" width="192" height="140" fill="url(#cdTurf)" />

        <g className="cd-glow">
          <ellipse cx="100" cy="40" rx="86" ry="26" fill="rgba(206,228,255,0.20)" />
        </g>

        {/* Floodlights */}
        {[34, 100, 166].map((x) => (
          <g key={x}>
            <rect x={x - 8} y="14" width="16" height="8" rx="2" fill="rgba(224,238,255,0.9)" />
            <line x1={x} y1="22" x2={x} y2="42" stroke="rgba(150,180,220,0.55)" strokeWidth="1.6" />
          </g>
        ))}

        {/* Boundary rope */}
        <path d="M -6 78 Q 100 40 206 78" fill="none" stroke="#EAF1FA" strokeWidth="2.4" strokeLinecap="round" />

        {/* Pitch in perspective */}
        <path d="M88 64 L112 64 L136 172 L64 172 Z" fill="url(#cdPitch)" />
        <line x1="70" y1="162" x2="130" y2="162" stroke="rgba(255,255,255,0.8)" strokeWidth="1.6" />
        <line x1="90" y1="70" x2="110" y2="70" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />

        {/* Length marker */}
        <ellipse className="cd-hero-mark" cx="96" cy="138" rx="15" ry="5"
          fill="rgba(242,101,34,0.28)" stroke="#FF8A3D" strokeWidth="1.6" />

        {/* Stumps */}
        <g>
          <rect x="93" y="146" width="2.4" height="18" rx="1.2" fill="#EFE0BC" />
          <rect x="98.8" y="146" width="2.4" height="18" rx="1.2" fill="#EFE0BC" />
          <rect x="104.6" y="146" width="2.4" height="18" rx="1.2" fill="#EFE0BC" />
          <rect x="93" y="143.6" width="8" height="2" rx="1" fill="#EFE0BC" />
          <rect x="100" y="143.6" width="8" height="2" rx="1" fill="#EFE0BC" />
        </g>

        {/* Batter: rounded-rect + circle rig, same grammar as the canvas */}
        <g>
          <ellipse cx="122" cy="168" rx="12" ry="3.4" fill="rgba(0,0,0,0.28)" />
          <rect x="116" y="140" width="8" height="28" rx="3.4" fill="#F0EBDA" stroke="#C6BC9C" strokeWidth="0.8" />
          <rect x="124" y="140" width="8" height="28" rx="3.4" fill="#F0EBDA" stroke="#C6BC9C" strokeWidth="0.8" />
          <rect x="115" y="118" width="16" height="24" rx="5" fill="#F3F7FF" />
          <rect x="115" y="118" width="16" height="4.5" rx="2" fill="#003DA6" />
          <circle cx="123" cy="111" r="7" fill="#1E6BE0" />
          <circle cx="123" cy="113" r="5" fill="#D9A277" />
          <g transform="translate(117,130)">
            <g className="cd-hero-bat">
              <rect x="-2" y="-1" width="4" height="15" rx="2" fill="#12284A" />
              <rect x="-4" y="13" width="8" height="24" rx="2.4" fill="#DDBB80" stroke="#A67E45" strokeWidth="0.8" />
            </g>
          </g>
          <circle cx="117" cy="130" r="3.6" fill="#F0EBDA" />
        </g>

        {/* The ball: pitches on the marker, then is driven to the rope */}
        <g className="cd-hero-ball">
          <circle cx="0" cy="0" r="6" fill="url(#cdBall)" />
          <ellipse cx="0" cy="0" rx="5" ry="1.7" fill="none" stroke="#F4E3C8" strokeWidth="1.2" transform="rotate(28)" />
        </g>
      </g>
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
        padding: '46px 24px 52px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="cd-title" style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 9px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.55)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12,
          fontWeight: 800,
          color: ORANGE_LT,
          letterSpacing: '0.04em',
          margin: 0,
          maxWidth: 300,
          lineHeight: 1.45,
        }}>
          Every ball is a life event — cover it with the right timing.
        </p>
      </div>

      <div className="cd-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <HeroGround />
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
            borderRadius: 14,
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
            boxShadow: '0 6px 22px rgba(242,101,34,0.45)',
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
function Beat({ n, title, copy, children }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '10px 12px',
      borderRadius: 16,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
    }}>
      <div style={{ width: 74, height: 62, flexShrink: 0 }}>{children}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: ORANGE_LT, textTransform: 'uppercase' }}>
          Step {n}
        </div>
        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.68)', lineHeight: 1.35 }}>{copy}</div>
      </div>
    </div>
  );
}

export function HowToPlayScreen({ onPlay }) {
  const outcomes = [
    { label: 'Perfect', value: '4 then 6', color: GOLD_LT, bg: 'rgba(255,200,69,0.16)', border: 'rgba(255,200,69,0.5)' },
    { label: 'Good', value: '1 or 2', color: GREEN_LT, bg: 'rgba(40,167,69,0.16)', border: 'rgba(40,167,69,0.5)' },
    { label: 'Edge', value: 'no run, risky', color: ORANGE_LT, bg: 'rgba(242,101,34,0.16)', border: 'rgba(242,101,34,0.5)' },
    { label: 'Miss', value: 'bowled if straight', color: '#FF8B8B', bg: 'rgba(239,68,68,0.16)', border: 'rgba(239,68,68,0.5)' },
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
        justifyContent: 'center',
        padding: 22,
        background: SCREEN_BG,
        overflowY: 'auto',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '26px 20px 22px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 25, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 6px 0', color: '#fff',
        }}>
          How to Play
        </h2>
        <p style={{ fontSize: 11.5, fontWeight: 800, color: ORANGE_LT, margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Read the marker &middot; Tap to swing &middot; Middle the Cover ball for a shield
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Read the ball" copy="A coloured marker shows the pace and where it lands. Red rails mean it is on your stumps.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <path d="M28 6 L46 6 L58 56 L16 56 Z" fill="#C2A971" opacity="0.85" />
              <ellipse className="cd-hero-mark" cx="36" cy="30" rx="11" ry="4"
                fill="rgba(242,101,34,0.3)" stroke="#FF8A3D" strokeWidth="1.5" />
              <g>
                <rect x="32" y="40" width="2" height="12" rx="1" fill="#EFE0BC" />
                <rect x="36" y="40" width="2" height="12" rx="1" fill="#EFE0BC" />
                <rect x="40" y="40" width="2" height="12" rx="1" fill="#EFE0BC" />
              </g>
              <line x1="26" y1="31" x2="31" y2="41" stroke="rgba(239,68,68,0.7)" strokeWidth="1.2" strokeDasharray="3 3" />
              <line x1="46" y1="31" x2="42" y2="41" stroke="rgba(239,68,68,0.7)" strokeWidth="1.2" strokeDasharray="3 3" />
            </svg>
          </Beat>

          <Beat n="2" title="Tap on the green" copy="A gauge sweeps as the ball arrives. Green is runs; the bright core is a boundary.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <path d="M8 30 A 29 16 0 0 0 66 30" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="4" strokeLinecap="round" />
              <path d="M27 44.6 A 29 16 0 0 0 47 44.6" fill="none" stroke="rgba(40,167,69,0.6)" strokeWidth="5" strokeLinecap="round" />
              <path d="M34 46 A 29 16 0 0 0 40 46" fill="none" stroke="#4ADE80" strokeWidth="6" strokeLinecap="round" />
              <g className="cd-sweep"><circle cx="37" cy="46" r="4" fill="#FF8A3D" /></g>
              <g className="cd-fall"><circle cx="37" cy="10" r="4.4" fill="#D8302A" /></g>
            </svg>
          </Beat>

          <Beat n="3" title="Bank your cover" copy="Every 6th ball is a Cover ball. Time it perfectly and a shield absorbs one wicket.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <g className="cd-shieldb" style={{ transformOrigin: '37px 28px' }}>
                <path d="M37 10 l11 4 l0 9 c0 7 -4.6 12.4 -11 15.2 c-6.4 -2.8 -11 -8.2 -11 -15.2 l0 -9 z"
                  fill="#1E6BE0" stroke="#A6D0FF" strokeWidth="1.4" />
                <path d="M32 24 l3.4 3.4 l6.2 -6.8" fill="none" stroke="#fff" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round" />
              </g>
              <g opacity="0.85">
                <rect x="31" y="44" width="2.2" height="14" rx="1.1" fill="#EFE0BC" />
                <rect x="35.9" y="44" width="2.2" height="14" rx="1.1" fill="#EFE0BC" />
                <rect x="40.8" y="44" width="2.2" height="14" rx="1.1" fill="#EFE0BC" />
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
          Chase <strong style={{ color: GREEN_LT }}>{GAME_CONFIG.chase.target} runs</strong> off{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.chase.balls} balls</strong> with{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.chase.wickets} wickets</strong> in hand.
          The bowler gets <strong style={{ color: '#fff' }}>8% quicker</strong> every over.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {outcomes.map((o, i) => (
            <span
              key={o.label}
              className="cd-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: o.color,
                background: o.bg,
                border: `1px solid ${o.border}`,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {o.label} · {o.value}
            </span>
          ))}
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${BLUE_LT} 0%, ${BLUE} 100%)`,
              boxShadow: '0 4px 16px rgba(0,61,166,0.45)',
              cursor: 'pointer',
            }}
          >
            Take Strike
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Results ────────────────────────────────────────────── */
function StatTile({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '10px 6px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  // The {runs, boundaries, wickets, perfects} contract, and nothing else.
  const runs = stats?.runs || 0;
  const boundaries = stats?.boundaries || 0;
  const wickets = stats?.wickets || 0;
  const perfects = stats?.perfects || 0;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedRuns, setAnimatedRuns] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = runs;
    if (start === end) {
      setAnimatedRuns(end);
      return undefined;
    }
    const stepTime = 16;
    const increment = end / (1200 / stepTime);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setAnimatedRuns(end);
        clearInterval(timer);
      } else {
        setAnimatedRuns(Math.round(start));
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [runs]);

  async function handleShare() {
    const rawShareUrl = buildShareUrl() || window.location.href;
    const shareUrl = await shortenUrl(rawShareUrl);
    const shareMessage = `Hi,\nI made ${runs} off ${GAME_CONFIG.chase.balls} with ${boundaries} boundaries in the ${GAME_TITLE} challenge.\nEvery ball is a life event - the right cover is all about timing. Take strike here: ${shareUrl}`.trim();

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
  const progress = (Math.min(runs, RESULT_TARGET_RUNS) / RESULT_TARGET_RUNS) * circumference;
  const weak = runs < RESULT_TARGET_RUNS * 0.4;
  const strokeColor = won ? GREEN : weak ? DANGER : GOLD;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : weak ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
        background: SCREEN_BG,
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
          {won ? <TrophyIcon size={20} /> : <BowledIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Chase completed' : wickets >= GAME_CONFIG.chase.wickets ? 'All out' : 'Short of target'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your innings.</span>
        </p>
      </div>

      {/* Runs ring */}
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
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedRuns}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              RUNS
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              target {RESULT_TARGET_RUNS}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {runs, boundaries, wickets, perfects} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Boundaries" value={boundaries} accent={GOLD} />
        <StatTile label="Perfect timing" value={perfects} accent={GREEN_LT} />
        <StatTile label="Wickets lost" value={`${wickets}/${GAME_CONFIG.chase.wickets}`} accent={DANGER} />
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: BLUE_LT, color: '#fff', fontWeight: 900,
          height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 17, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(30,107,224,0.4)',
          width: '100%', maxWidth: 300, marginBottom: 18, zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
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
          Life bowls the unplayable ball eventually. A specialist can set your cover so one delivery never ends the innings.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
                color: '#fff', fontWeight: 900, padding: '15px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 17, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                boxShadow: '0 4px 16px rgba(242,101,34,0.35)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book a Slot</span>
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
              <PhoneIcon />
              <span>Call Specialist</span>
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

      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
