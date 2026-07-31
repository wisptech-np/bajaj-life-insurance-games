// Screens.jsx — Home, How to Play, and Results screens for Perfect Premium.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, STAGES, TOTAL_STAGES } from './data.js';

const GAME_TITLE = 'Perfect Premium';
const TAGLINE = 'Pay every premium right on time from 25 to 60 — discipline today is a pension tomorrow.';

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

/** Run-ended mark: a due date the marker sailed straight past. */
function LapsedIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="14" width="24" height="5" rx="2.5" fill="#fff" opacity="0.35" />
      <rect x="12" y="14" width="8" height="5" rx="2.5" fill="#fff" opacity="0.8" />
      <path d="M25 7v19" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      <path d="M25 4.5l-2.4 3h4.8z" fill="#fff" />
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
@keyframes ppTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes ppFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ppGlow    { 0%,100% { opacity: 0.3; } 50% { opacity: 0.9; } }
@keyframes ppChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
/* The hero marker sweeping the bar and settling dead centre on the gold. */
@keyframes ppSweep {
  0%   { transform: translateX(-72px); }
  38%  { transform: translateX(70px); }
  74%  { transform: translateX(-14px); }
  88%, 100% { transform: translateX(0px); }
}
@keyframes ppGoldFlash { 0%,80% { opacity: 0.55; } 90% { opacity: 1; } 100% { opacity: 0.75; } }
@keyframes ppNodeTick  { 0%,55% { opacity: 0.25; transform: scale(0.75); } 70%,100% { opacity: 1; transform: scale(1); } }
@keyframes ppBeatSweep { 0%,15% { transform: translateX(-22px); } 60%,100% { transform: translateX(20px); } }
@keyframes ppBeatPerfect { 0%,45% { opacity: 0.3; transform: scale(0.8); } 60%,100% { opacity: 1; transform: scale(1); } }
@keyframes ppBeatMiss { 0%,40% { opacity: 0.2; } 55%,100% { opacity: 1; } }
.pp-title { animation: ppTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-float { animation: ppFloat 4s ease-in-out infinite; }
.pp-glow  { animation: ppGlow 2.2s ease-in-out infinite; }
.pp-chip  { animation: ppChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-sweep { animation: ppSweep 3.2s cubic-bezier(0.45,0,0.35,1) infinite; }
.pp-goldflash { animation: ppGoldFlash 3.2s ease-in-out infinite; }
.pp-nodetick  { animation: ppNodeTick 3.2s ease-out infinite; }
.pp-beatsweep { animation: ppBeatSweep 2.2s ease-in-out infinite alternate; }
.pp-beatperfect { animation: ppBeatPerfect 2.2s ease-out infinite; }
.pp-beatmiss { animation: ppBeatMiss 2.2s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-title, .pp-float, .pp-glow, .pp-chip, .pp-sweep, .pp-goldflash, .pp-nodetick,
  .pp-beatsweep, .pp-beatperfect, .pp-beatmiss { animation: none !important; }
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
 * Hero motif: the game itself — the twelve-node life timeline from 25 to 60, the
 * bar with its green safe zone and gold PERFECT sliver, and the marker sweeping
 * in and settling on the gold. The screen previews the game rather than
 * illustrating it.
 */
function HeroTimeline() {
  return (
    <g>
      <line x1="18" y1="42" x2="182" y2="42" stroke="rgba(255,255,255,0.18)" strokeWidth="2" strokeLinecap="round" />
      {Array.from({ length: TOTAL_STAGES }).map((_, i) => {
        const x = 18 + (164 / (TOTAL_STAGES - 1)) * i;
        const done = i < 7;
        return (
          <circle
            key={i}
            className={done ? 'pp-nodetick' : undefined}
            cx={x}
            cy={42}
            r={done ? 3.6 : 2.2}
            fill={done ? GREEN : 'rgba(146,190,255,0.4)'}
            style={{ animationDelay: `${i * 0.05}s` }}
          />
        );
      })}
      <text x="18" y="30" fill="rgba(255,255,255,0.45)" fontSize="7" fontWeight="900"
        textAnchor="middle" fontFamily="'Poppins', sans-serif">AGE 25</text>
      <text x="182" y="30" fill="rgba(255,255,255,0.45)" fontSize="7" fontWeight="900"
        textAnchor="middle" fontFamily="'Poppins', sans-serif">AGE 60</text>
    </g>
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
        <h1 className="pp-title" style={{
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
          {TAGLINE}
        </p>
      </div>

      <div className="pp-float" style={{ position: 'relative', width: 262, height: 240, zIndex: 1 }}>
        <svg width="262" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="ppSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1E42" />
              <stop offset="100%" stopColor="#061229" />
            </linearGradient>
            <linearGradient id="ppGreen" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={GREEN_LT} />
              <stop offset="100%" stopColor="#0E5C24" />
            </linearGradient>
            <linearGradient id="ppGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="100%" stopColor="#B07B12" />
            </linearGradient>
            <linearGradient id="ppMarker" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ORANGE_LT} />
              <stop offset="100%" stopColor="#B93F0C" />
            </linearGradient>
            <clipPath id="ppClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#ppSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#ppClip)">
            <g className="pp-glow">
              <ellipse cx="100" cy="118" rx="86" ry="60" fill="rgba(38,102,196,0.22)" />
            </g>

            <HeroTimeline />

            <text x="100" y="82" fill="#fff" fontSize="20" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">AGE 41</text>
            <text x="100" y="96" fill={ORANGE_LT} fontSize="9" fontWeight="800" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">school fees</text>

            {/* The bar: track, green safe zone, gold PERFECT sliver. */}
            <rect x="22" y="122" width="156" height="13" rx="6.5" fill="rgba(6,18,41,0.9)"
              stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            <rect x="76" y="122.5" width="48" height="12" rx="5" fill="url(#ppGreen)" />
            <rect className="pp-goldflash" x="94" y="120.5" width="12" height="16" rx="4" fill="url(#ppGold)" />

            {/* Bonus top-up band, offset from green. */}
            <rect x="140" y="123.5" width="9" height="10" rx="3.5" fill={GOLD} opacity="0.7" />
            <path d="M144.5 116 l3.4 5 h-6.8 z" fill={GOLD_LT} opacity="0.8" />

            {/* Marker sweeping in and settling on the sliver. */}
            <g className="pp-sweep" transform="translate(100,128)">
              <rect x="-2.4" y="-17" width="4.8" height="34" rx="2.4" fill="url(#ppMarker)" />
              <path d="M0 -21 l5 5 l-5 5 l-5 -5 z" fill={ORANGE} />
              <circle cx="0" cy="-16" r="1.9" fill="#fff" />
            </g>

            <text x="100" y="164" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="900"
              textAnchor="middle" letterSpacing="1.4" fontFamily="'Poppins', sans-serif">TAP TO LOCK</text>
          </g>
        </svg>
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
/**
 * Animation-first tutorial. One looping SVG demo of the only verb in the game:
 * the orange marker sweeps the premium bar, a finger taps once, the marker
 * locks. Beat one lands in the gold PERFECT sliver and lights a combo pip;
 * beat two shows the same rule on the bent arc bar that every 4th stage uses,
 * landing in green. Bar, band, sliver and marker are the canvas's own shapes.
 */
const PP_TUT_CSS = `
@keyframes ppTutBeatA {
  0%, 46% { opacity: 1; }
  52%, 96% { opacity: 0; }
  100% { opacity: 1; }
}
@keyframes ppTutBeatB {
  0%, 46% { opacity: 0; }
  52%, 96% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes ppTutSweepA {
  0%  { transform: translateX(-96px); }
  13% { transform: translateX(96px); }
  27% { transform: translateX(-96px); }
  38%, 100% { transform: translateX(0px); }
}
@keyframes ppTutFingerA {
  0%, 26% { opacity: 0; transform: translate(0px, 20px); }
  32% { opacity: 1; transform: translate(0px, 8px); }
  38%, 43% { opacity: 1; transform: translate(0px, 0px); }
  48%, 100% { opacity: 0; transform: translate(0px, 12px); }
}
@keyframes ppTutBurstA {
  0%, 38% { opacity: 0; transform: scale(0.3); }
  42% { opacity: 1; transform: scale(1); }
  50%, 100% { opacity: 0; transform: scale(1.9); }
}
@keyframes ppTutPip {
  0%, 40% { opacity: 0.18; }
  44%, 96% { opacity: 1; }
  100% { opacity: 0.18; }
}
@keyframes ppTutSweepB {
  0%, 52% { transform: rotate(-46deg); }
  65% { transform: rotate(46deg); }
  77% { transform: rotate(-46deg); }
  88%, 100% { transform: rotate(6deg); }
}
@keyframes ppTutFingerB {
  0%, 76% { opacity: 0; transform: translate(0px, 20px); }
  82% { opacity: 1; transform: translate(0px, 8px); }
  88%, 93% { opacity: 1; transform: translate(0px, 0px); }
  97%, 100% { opacity: 0; transform: translate(0px, 12px); }
}
@keyframes ppTutBurstB {
  0%, 88% { opacity: 0; transform: scale(0.3); }
  91% { opacity: 1; transform: scale(1); }
  98%, 100% { opacity: 0; transform: scale(1.8); }
}
.pp-tut-a      { animation: ppTutBeatA 6s steps(1,end) infinite; }
.pp-tut-b      { animation: ppTutBeatB 6s steps(1,end) infinite; }
.pp-tut-sweepa { animation: ppTutSweepA 6s cubic-bezier(0.45,0,0.55,1) infinite; }
.pp-tut-fingera{ animation: ppTutFingerA 6s ease-in-out infinite; }
.pp-tut-bursta { transform-origin: 0 0; animation: ppTutBurstA 6s ease-out infinite; }
.pp-tut-pip    { animation: ppTutPip 6s steps(1,end) infinite; }
.pp-tut-sweepb { transform-origin: 0 0; animation: ppTutSweepB 6s cubic-bezier(0.45,0,0.55,1) infinite; }
.pp-tut-fingerb{ animation: ppTutFingerB 6s ease-in-out infinite; }
.pp-tut-burstb { transform-origin: 0 0; animation: ppTutBurstB 6s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-tut-a, .pp-tut-b, .pp-tut-sweepa, .pp-tut-fingera, .pp-tut-bursta,
  .pp-tut-pip, .pp-tut-sweepb, .pp-tut-fingerb, .pp-tut-burstb { animation: none !important; }
}
`;

/** The orange sweep marker the canvas draws: a needle with a diamond cap. */
function TutMarker({ len = 40 }) {
  return (
    <g>
      <rect x="-2.4" y={-len / 2} width="4.8" height={len} rx="2.4" fill={ORANGE} />
      <path d={`M0 ${-len / 2 - 8} l4.6 4.6 l-4.6 4.6 l-4.6 -4.6 z`} fill={ORANGE_LT} />
    </g>
  );
}

/** The finger glyph performing the single tap. */
function TutHand() {
  return (
    <g transform="translate(-12 0) scale(1.5)">
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  );
}

/** Icon-led label under the demo. Max three, max four words each. */
function TutLabel({ icon, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {icon}
      <span style={{
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.82)',
        lineHeight: 1.15,
        textAlign: 'center',
      }}>
        {children}
      </span>
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
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PP_TUT_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '22px 18px 20px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 24, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 14px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        <div style={{
          position: 'relative',
          width: '100%',
          borderRadius: 16,
          background: 'linear-gradient(180deg, #0A1E42 0%, #0B2450 45%, #061229 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          <svg width="100%" viewBox="0 0 300 190" aria-hidden="true" style={{ display: 'block' }}>
            {/* Timeline ribbon: the twelve premium due dates, 25 to 60. */}
            <rect x="34" y="30" width="232" height="3" rx="1.5" fill="rgba(255,255,255,0.14)" />
            {Array.from({ length: 12 }).map((_, i) => (
              <circle key={i} cx={34 + i * 21.1} cy="31.5" r={i < 3 ? 4 : 3}
                fill={i < 3 ? GREEN_LT : 'rgba(255,255,255,0.22)'} />
            ))}

            {/* Grace periods left. */}
            <g transform="translate(232 52)">
              {[0, 1, 2].map((i) => (
                <path key={i} transform={`translate(${i * 18} 0) scale(0.62)`}
                  d="M0 -10 L-8 -7 v6 c0 5 3.5 9 8 11 4.5 -2 8 -6 8 -11 v-6 z"
                  fill={GREEN_LT} />
              ))}
            </g>

            {/* ── Beat 1: the straight premium bar, locked on gold. ── */}
            <g className="pp-tut-a">
              <rect x="42" y="96" width="216" height="20" rx="10"
                fill="rgba(6,18,41,0.92)" stroke="rgba(255,255,255,0.22)" strokeWidth="1.2" />
              <rect x="120" y="98" width="60" height="16" rx="8" fill={GREEN} />
              <rect x="144" y="92" width="12" height="28" rx="5" fill={GOLD} />

              <g transform="translate(150 106)">
                <g className="pp-tut-bursta">
                  <circle r="24" fill="none" stroke={GOLD_LT} strokeWidth="3" />
                </g>
              </g>

              <g transform="translate(150 106)">
                <g className="pp-tut-sweepa"><TutMarker /></g>
              </g>

              <g className="pp-tut-fingera" transform="translate(150 134)">
                <TutHand />
              </g>

              {/* Combo pips — the first one lights on the perfect lock. */}
              <g transform="translate(150 168)">
                {[0, 1, 2, 3].map((i) => (
                  <rect key={i} className={i === 0 ? 'pp-tut-pip' : undefined}
                    x={(i - 2) * 16 + 3} y="-4" width="10" height="8" rx="4"
                    fill={GOLD} opacity={i === 0 ? undefined : 0.18} />
                ))}
              </g>
            </g>

            {/* ── Beat 2: every 4th stage bends the same bar into an arc. ── */}
            <g className="pp-tut-b">
              <path d="M90.3 117.9 A78 78 0 0 1 209.7 117.9" fill="none"
                stroke="rgba(6,18,41,0.92)" strokeWidth="20" strokeLinecap="round" />
              <path d="M90.3 117.9 A78 78 0 0 1 209.7 117.9" fill="none"
                stroke="rgba(255,255,255,0.22)" strokeWidth="21" strokeLinecap="round" opacity="0.35" />
              <path d="M90.3 117.9 A78 78 0 0 1 209.7 117.9" fill="none"
                stroke="rgba(6,18,41,0.95)" strokeWidth="18" strokeLinecap="round" />
              <path d="M132.5 92 A78 78 0 0 1 167.5 92" fill="none"
                stroke={GREEN} strokeWidth="16" strokeLinecap="butt" />
              <path d="M145.2 90.2 A78 78 0 0 1 154.8 90.2" fill="none"
                stroke={GOLD} strokeWidth="24" strokeLinecap="butt" />

              <g transform="translate(158.2 90.4)">
                <g className="pp-tut-burstb">
                  <circle r="22" fill="none" stroke={GREEN_LT} strokeWidth="3" />
                </g>
              </g>

              <g transform="translate(150 168)">
                <g className="pp-tut-sweepb">
                  <g transform="translate(0 -78)"><TutMarker len={44} /></g>
                </g>
              </g>

              <g className="pp-tut-fingerb" transform="translate(150 150)">
                <TutHand />
              </g>
            </g>
          </svg>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <rect x="1" y="10" width="24" height="6" rx="3" fill="rgba(255,255,255,0.16)" />
              <rect x="9" y="10" width="8" height="6" rx="3" fill={GREEN} />
              <rect x="11.6" y="4" width="2.8" height="18" rx="1.4" fill={ORANGE} />
            </svg>
          }>Tap to lock</TutLabel>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <rect x="3" y="10" width="20" height="6" rx="3" fill={GREEN} />
              <rect x="10.5" y="6" width="5" height="14" rx="2.4" fill={GOLD} />
              <path d="M13 1.5 L14.4 4.4 L17.5 4.8 L15.2 6.9 L15.8 10 L13 8.5 L10.2 10 L10.8 6.9 L8.5 4.8 L11.6 4.4 Z" fill={GOLD_LT} />
            </svg>
          }>Gold is perfect</TutLabel>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <path key={i} transform={`translate(${4 + i * 8} 13) scale(0.5)`}
                  d="M0 -10 L-8 -7 v6 c0 5 3.5 9 8 11 4.5 -2 8 -6 8 -11 v-6 z"
                  fill={i === 2 ? 'rgba(255,255,255,0.2)' : GREEN_LT} />
              ))}
            </svg>
          }>Three grace periods</TutLabel>
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
            Play
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
  // The {score, perfects, bestCombo, stagesCleared} contract, exactly.
  const score = stats?.score || 0;
  const perfects = stats?.perfects || 0;
  const bestCombo = stats?.bestCombo || 0;
  const stagesCleared = stats?.stagesCleared || 0;

  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';
  const reachedAge = stagesCleared > 0
    ? STAGES[Math.min(stagesCleared, TOTAL_STAGES) - 1].age
    : STAGES[0].age;

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
    const shareMessage = `Hi,\nI paid ${stagesCleared} of ${TOTAL_STAGES} premiums on time and scored ${score} in the ${GAME_TITLE} challenge.\nDiscipline today is a pension tomorrow. Take your run here: ${shareUrl}`.trim();

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

  // The ring tracks the thing you actually win on: premiums paid, not points.
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(stagesCleared, TOTAL_STAGES) / TOTAL_STAGES) * circumference;
  const weak = stagesCleared < TOTAL_STAGES * 0.4;
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
          {won ? <TrophyIcon size={20} /> : <LapsedIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Retired on time' : `Lapsed at age ${reachedAge}`}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your premium record.</span>
        </p>
      </div>

      {/* Score ring — filled by premiums paid */}
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
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              SCORE
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {stagesCleared}/{TOTAL_STAGES} premiums paid
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, perfects, bestCombo, stagesCleared} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Premiums paid" value={`${stagesCleared}/${TOTAL_STAGES}`} accent={GREEN_LT} />
        <StatTile label="Perfect pays" value={perfects} accent={GOLD} />
        <StatTile label="Best combo" value={`x${Math.min(1 + bestCombo, GAME_CONFIG.scoring.comboMaxMultiplier)}`} accent={ORANGE_LT} />
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
          Real premiums do not need perfect timing — just a plan you can keep. A specialist can size one to your income.
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
