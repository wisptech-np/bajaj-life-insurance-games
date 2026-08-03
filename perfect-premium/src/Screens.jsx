// Screens.jsx — Home, How to Play, and Results screens for Perfect Premium.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, TOTAL_YEARS, YEARS } from './data.js';

const GAME_TITLE = 'Perfect Premium';
const TAGLINE = 'Too little cover and the claim lands on your family. Too much and the money never reaches your goals. Find the line.';

/* Brand palette, inline. These screens are chrome rather than gameplay, so they
   deliberately do not pull the canvas palette in from data.js. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const CYAN = '#3FD8E8';
const CYAN_LT = '#9BF3FF';
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

/** Run-ended mark: a claim that rose straight past the cover line. */
function GapIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="18" width="24" height="4" rx="2" fill="#fff" opacity="0.4" />
      <rect x="12" y="6" width="8" height="20" rx="2" fill="#fff" opacity="0.9" />
      <path d="M12 6h8v12h-8z" fill="#fff" />
      <path d="M5 13h22" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="4 3" opacity="0.7" />
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
/* The hero cover line riding up over a big claim and dropping back down. */
@keyframes ppHeroLine {
  0%    { transform: translateY(34px); }
  22%   { transform: translateY(34px); }
  40%   { transform: translateY(-16px); }
  58%   { transform: translateY(-16px); }
  70%   { transform: translateY(26px); }
  100%  { transform: translateY(34px); }
}
@keyframes ppHeroScroll {
  0%   { transform: translateX(96px); }
  100% { transform: translateX(-104px); }
}
@keyframes ppHeroBurst {
  0%, 46% { opacity: 0; transform: scale(0.3); }
  52%     { opacity: 1; transform: scale(1); }
  64%,100%{ opacity: 0; transform: scale(1.8); }
}
.pp-title { animation: ppTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-float { animation: ppFloat 4s ease-in-out infinite; }
.pp-glow  { animation: ppGlow 2.2s ease-in-out infinite; }
.pp-heroline   { animation: ppHeroLine 5s cubic-bezier(0.4,0,0.3,1) infinite; }
.pp-heroscroll { animation: ppHeroScroll 5s linear infinite; }
.pp-heroburst  { transform-origin: 0 0; animation: ppHeroBurst 5s ease-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-title, .pp-float, .pp-glow, .pp-heroline, .pp-heroscroll, .pp-heroburst { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, ORANGE_LT, BLUE_LT, CYAN, GREEN, '#EC4899'];
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
 * Hero motif: the game itself. The cover line and the shaded band beneath it
 * ride up over an inbound claim column and drop back to the floor to take a
 * gold goal token — the entire decision loop, playing on a five-second cycle.
 */
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
        padding: '38px 22px 44px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="pp-title" style={{
          fontSize: 32,
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
          fontSize: 11.5,
          fontWeight: 800,
          color: ORANGE_LT,
          letterSpacing: '0.02em',
          margin: 0,
          maxWidth: 300,
          lineHeight: 1.45,
        }}>
          {TAGLINE}
        </p>
      </div>

      <div className="pp-float" style={{ position: 'relative', width: 258, height: 220, zIndex: 1 }}>
        <svg width="258" height="220" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="ppSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0A1E42" />
              <stop offset="100%" stopColor="#061229" />
            </linearGradient>
            <linearGradient id="ppBand" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(63,216,232,0.34)" />
              <stop offset="100%" stopColor="rgba(30,107,224,0.06)" />
            </linearGradient>
            <linearGradient id="ppLine" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={BLUE_LT} />
              <stop offset="100%" stopColor={CYAN_LT} />
            </linearGradient>
            <linearGradient id="ppGoldG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FFF6D6" />
              <stop offset="100%" stopColor="#B07B12" />
            </linearGradient>
            <clipPath id="ppClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#ppSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#ppClip)">
            <g className="pp-glow">
              <ellipse cx="60" cy="150" rx="96" ry="66" fill="rgba(38,102,196,0.2)" />
            </g>

            {/* Cover scale gridlines */}
            {[60, 90, 120].map((y) => (
              <line key={y} x1="16" y1={y} x2="184" y2={y}
                stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 5" />
            ))}
            <line x1="16" y1="150" x2="184" y2="150" stroke="rgba(255,255,255,0.22)" strokeWidth="1.4" />

            {/* Claims and a goal token, scrolling right to left */}
            <g className="pp-heroscroll">
              <g>
                <rect x="66" y="78" width="24" height="72" rx="5" fill="rgba(242,101,34,0.42)"
                  stroke="rgba(255,176,122,0.8)" strokeWidth="1.2" />
                <rect x="64" y="75" width="28" height="5" rx="2.5" fill="#FFB07A" />
              </g>
              <circle cx="132" cy="138" r="8" fill="url(#ppGoldG)" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
              <g>
                <rect x="164" y="112" width="24" height="38" rx="5" fill="rgba(30,107,224,0.42)"
                  stroke="rgba(127,178,255,0.8)" strokeWidth="1.2" />
                <rect x="162" y="109" width="28" height="5" rx="2.5" fill="#7FB2FF" />
              </g>
            </g>

            {/* The cover line and the band it protects */}
            <g className="pp-heroline">
              <rect x="16" y="90" width="168" height="90" fill="url(#ppBand)" />
              <rect x="16" y="86.5" width="168" height="6" rx="3" fill="url(#ppLine)" />
            </g>

            {/* Rail and handle on the left */}
            <rect x="8" y="46" width="20" height="112" rx="10" fill="rgba(6,18,41,0.85)"
              stroke="rgba(255,255,255,0.16)" strokeWidth="1.1" />
            <g className="pp-heroline">
              <rect x="10" y="88" width="16" height="70" rx="8" fill={BLUE_LT} />
              <rect x="4" y="80.5" width="28" height="15" rx="7.5" fill="#EAF6FF" />
              <rect x="10" y="86" width="16" height="1.6" rx="0.8" fill="rgba(11,18,33,0.35)" />
              <rect x="10" y="89.5" width="16" height="1.6" rx="0.8" fill="rgba(11,18,33,0.35)" />
            </g>

            {/* NOW line */}
            <line x1="52" y1="40" x2="52" y2="154" stroke="rgba(255,255,255,0.55)" strokeWidth="1.8" />
            <g className="pp-heroburst" transform="translate(52 82)">
              <circle r="18" fill="none" stroke={GREEN_LT} strokeWidth="3" />
            </g>

            <text x="100" y="176" fill="rgba(255,255,255,0.5)" fontSize="8" fontWeight="900"
              textAnchor="middle" letterSpacing="1.4" fontFamily="'Poppins', sans-serif">DRAG TO SET YOUR COVER</text>
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
            height: 58,
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
 * Animation-first tutorial. Three beats, 7.5 s, no instructional paragraphs —
 * between them they contain the entire rule set:
 *
 *   1  drag the rail: the cover line follows, slowly upward and fast downward;
 *   2  a claim under the line is covered and the tight fit is worth double,
 *      a claim above it opens a red gap in the family's security;
 *   3  the line left sitting at the top drains the budget and sails over the
 *      gold goal token it could have taken.
 */
const PP_TUT_CSS = `
@keyframes ppTutA { 0%,30% { opacity: 1; } 34%,96% { opacity: 0; } 100% { opacity: 1; } }
@keyframes ppTutB { 0%,30% { opacity: 0; } 34%,63% { opacity: 1; } 67%,100% { opacity: 0; } }
@keyframes ppTutC { 0%,63% { opacity: 0; } 67%,96% { opacity: 1; } 100% { opacity: 0; } }
@keyframes ppTutDrag {
  0%      { transform: translateY(0px); }
  10%     { transform: translateY(0px); }
  22%     { transform: translateY(-52px); }
  27%,30% { transform: translateY(-52px); }
  100%    { transform: translateY(-52px); }
}
@keyframes ppTutHand {
  0%,4%   { opacity: 0; transform: translate(0,10px); }
  8%      { opacity: 1; transform: translate(0,0px); }
  22%     { opacity: 1; transform: translate(0,-52px); }
  29%     { opacity: 1; transform: translate(0,-52px); }
  33%,100%{ opacity: 0; transform: translate(0,-52px); }
}
@keyframes ppTutTick { 0%,40% { opacity: 0; transform: scale(0.4); } 46%,62% { opacity: 1; transform: scale(1); } 66%,100% { opacity: 0; } }
@keyframes ppTutGap  { 0%,50% { opacity: 0; } 55%,62% { opacity: 1; } 66%,100% { opacity: 0; } }
@keyframes ppTutDrain {
  0%,67% { width: 88px; }
  92%,96% { width: 4px; }
  100%   { width: 88px; }
}
@keyframes ppTutFade { 0%,74% { opacity: 1; } 86%,96% { opacity: 0.25; } 100% { opacity: 1; } }
.pp-tut-a    { animation: ppTutA 7.5s steps(1,end) infinite; }
.pp-tut-b    { animation: ppTutB 7.5s steps(1,end) infinite; }
.pp-tut-c    { animation: ppTutC 7.5s steps(1,end) infinite; }
.pp-tut-drag { animation: ppTutDrag 7.5s cubic-bezier(0.3,0,0.4,1) infinite; }
.pp-tut-hand { animation: ppTutHand 7.5s cubic-bezier(0.3,0,0.4,1) infinite; }
.pp-tut-tick { transform-origin: 0 0; animation: ppTutTick 7.5s ease-out infinite; }
.pp-tut-gap  { animation: ppTutGap 7.5s steps(1,end) infinite; }
.pp-tut-drain{ animation: ppTutDrain 7.5s ease-in infinite; }
.pp-tut-fade { animation: ppTutFade 7.5s ease-in infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-tut-a, .pp-tut-b, .pp-tut-c, .pp-tut-drag, .pp-tut-hand,
  .pp-tut-tick, .pp-tut-gap, .pp-tut-drain, .pp-tut-fade { animation: none !important; }
}
`;

/** The finger glyph performing the drag. */
function TutHand() {
  return (
    <g transform="translate(-10 2) scale(1.25)">
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  );
}

/** The cover line plus the band it protects, drawn at the demo's baseline. */
function TutCoverLine({ className }) {
  return (
    <g className={className}>
      <rect x="52" y="126" width="238" height="46" fill="rgba(63,216,232,0.22)" />
      <rect x="52" y="122.5" width="238" height="6" rx="3" fill={CYAN} />
    </g>
  );
}

/** Icon-led label under the demo. Max three, max four words each. */
function TutLabel({ icon, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      {icon}
      <span style={{
        fontSize: 9,
        fontWeight: 900,
        letterSpacing: '0.06em',
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
        padding: 16,
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: PP_TUT_CSS }} />

      <div style={{
        background: 'rgba(11,18,33,0.72)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 24,
        padding: '20px 16px 18px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 14px 40px rgba(0,0,0,0.45)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 23, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 12px 0', color: '#fff',
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
          marginBottom: 14,
        }}>
          <svg width="100%" viewBox="0 0 300 200" aria-hidden="true" style={{ display: 'block' }}>
            {/* Persistent chrome: the two meters, the rail, the floor. */}
            <rect x="14" y="12" width="88" height="7" rx="3.5" fill="rgba(255,255,255,0.14)" />
            <rect className="pp-tut-drain" x="14" y="12" width="88" height="7" rx="3.5" fill={GOLD} />
            <text x="14" y="9" fill="rgba(255,255,255,0.5)" fontSize="7" fontWeight="900"
              fontFamily="'Poppins', sans-serif">BUDGET</text>

            <rect x="198" y="12" width="88" height="7" rx="3.5" fill="rgba(255,255,255,0.14)" />
            <rect className="pp-tut-b" x="198" y="12" width="88" height="7" rx="3.5" fill={GREEN} />
            <rect className="pp-tut-a" x="198" y="12" width="88" height="7" rx="3.5" fill={GREEN} />
            <rect className="pp-tut-c" x="198" y="12" width="88" height="7" rx="3.5" fill={GREEN} />
            <text x="198" y="9" fill="rgba(255,255,255,0.5)" fontSize="7" fontWeight="900"
              fontFamily="'Poppins', sans-serif">SECURITY</text>

            <line x1="52" y1="172" x2="290" y2="172" stroke="rgba(255,255,255,0.22)" strokeWidth="1.4" />
            {[60, 100, 140].map((y) => (
              <line key={y} x1="52" y1={y} x2="290" y2={y}
                stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 5" />
            ))}
            <rect x="16" y="34" width="22" height="146" rx="11" fill="rgba(6,18,41,0.85)"
              stroke="rgba(255,255,255,0.16)" strokeWidth="1.1" />

            {/* ── Beat 1: drag the rail, the cover line follows. ── */}
            <g className="pp-tut-a">
              <g className="pp-tut-drag">
                <rect x="18" y="124" width="18" height="56" rx="9" fill={BLUE_LT} />
                <rect x="11" y="115" width="32" height="16" rx="8" fill="#EAF6FF" />
                <rect x="18" y="120" width="18" height="1.8" rx="0.9" fill="rgba(11,18,33,0.35)" />
                <rect x="18" y="124.5" width="18" height="1.8" rx="0.9" fill="rgba(11,18,33,0.35)" />
              </g>
              <TutCoverLine className="pp-tut-drag" />
              <g className="pp-tut-hand" transform="translate(46 128)">
                <TutHand />
              </g>
              <path d="M78 96 v-26 m0 26 l-5 -6 m5 6 l5 -6" stroke={CYAN_LT} strokeWidth="2"
                fill="none" strokeLinecap="round" opacity="0.6" />
            </g>

            {/* ── Beat 2: above the claim is covered, below it is a gap. ── */}
            <g className="pp-tut-b">
              <rect x="18" y="72" width="18" height="108" rx="9" fill={BLUE_LT} />
              <rect x="11" y="63" width="32" height="16" rx="8" fill="#EAF6FF" />
              <rect x="52" y="74" width="238" height="98" fill="rgba(63,216,232,0.2)" />
              <rect x="52" y="70.5" width="238" height="6" rx="3" fill={CYAN} />

              {/* A covered claim: its cap sits under the line. */}
              <rect x="96" y="104" width="30" height="68" rx="5" fill="rgba(40,167,69,0.42)"
                stroke={GREEN_LT} strokeWidth="1.4" />
              <rect x="94" y="100" width="34" height="5" rx="2.5" fill={GREEN_LT} />
              <g className="pp-tut-tick" transform="translate(111 104)">
                <circle r="20" fill="none" stroke={GREEN_LT} strokeWidth="3" />
              </g>
              <text x="111" y="92" fill={GOLD_LT} fontSize="10" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif" className="pp-tut-tick">TIGHT = x2</text>

              {/* An uncovered claim: the slice above the line goes red. */}
              <rect x="204" y="70" width="30" height="102" rx="5" fill="rgba(239,68,68,0.3)"
                stroke={DANGER} strokeWidth="1.4" />
              <g className="pp-tut-gap">
                <rect x="204" y="42" width="30" height="30" rx="5" fill={DANGER} />
                <rect x="202" y="38" width="34" height="5" rx="2.5" fill="#FF9A9A" />
                <text x="219" y="30" fill="#FF9A9A" fontSize="9" fontWeight="900" textAnchor="middle"
                  fontFamily="'Poppins', sans-serif">GAP</text>
              </g>
            </g>

            {/* ── Beat 3: cover left high drains the budget and misses goals. ── */}
            <g className="pp-tut-c">
              <rect x="18" y="44" width="18" height="136" rx="9" fill={BLUE_LT} />
              <rect x="11" y="35" width="32" height="16" rx="8" fill="#EAF6FF" />
              <rect x="52" y="46" width="238" height="126" fill="rgba(63,216,232,0.24)" />
              <rect x="52" y="42.5" width="238" height="6" rx="3" fill={CYAN} />

              <rect x="120" y="132" width="30" height="40" rx="5" fill="rgba(30,107,224,0.4)"
                stroke="#7FB2FF" strokeWidth="1.2" />
              <rect x="118" y="128" width="34" height="5" rx="2.5" fill="#7FB2FF" />

              <g className="pp-tut-fade">
                <circle cx="222" cy="156" r="11" fill={GOLD} />
                <path d="M222 148 l3 6 l6 2 l-6 2 l-3 6 l-3 -6 l-6 -2 l6 -2 z" fill="#fff" opacity="0.9" />
                <text x="222" y="180" fill="rgba(255,255,255,0.55)" fontSize="7.5" fontWeight="900"
                  textAnchor="middle" fontFamily="'Poppins', sans-serif">OUT OF REACH</text>
              </g>

              <text x="171" y="196" fill={ORANGE_LT} fontSize="9" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">COVER YOU DO NOT NEED STILL COSTS</text>
            </g>
          </svg>
        </div>

        <div style={{ display: 'flex', gap: 5, marginBottom: 14 }}>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <rect x="3" y="2" width="8" height="22" rx="4" fill="rgba(255,255,255,0.14)" />
              <rect x="4.5" y="11" width="5" height="12" rx="2.5" fill={BLUE_LT} />
              <rect x="1.5" y="8" width="11" height="6" rx="3" fill="#EAF6FF" />
              <path d="M18 16 v-8 m0 8 l-3 -3 m3 3 l3 -3" stroke={CYAN_LT} strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
          }>Drag to set cover</TutLabel>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <rect x="1" y="11" width="24" height="4" rx="2" fill={CYAN} />
              <rect x="4" y="15" width="7" height="9" rx="2" fill={GREEN} />
              <rect x="15" y="4" width="7" height="20" rx="2" fill={DANGER} />
              <rect x="15" y="4" width="7" height="7" rx="2" fill="#FF9A9A" />
            </svg>
          }>Cover every claim</TutLabel>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <rect x="2" y="6" width="22" height="6" rx="3" fill="rgba(255,255,255,0.16)" />
              <rect x="2" y="6" width="9" height="6" rx="3" fill={GOLD} />
              <circle cx="8" cy="20" r="4.5" fill={GOLD} />
              <path d="M18.5 15.5 l1.6 3.2 l3.4 0.5 l-2.5 2.4 l0.6 3.4 l-3.1 -1.6 l-3.1 1.6 l0.6 -3.4 l-2.5 -2.4 l3.4 -0.5 z" fill={GOLD_LT} opacity="0.5" />
            </svg>
          }>Cover costs budget</TutLabel>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 50, border: 'none', borderRadius: 12,
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
      padding: '9px 4px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: '0.11em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

/**
 * The takeaway line. Picked from the run's own numbers, so it names the thing
 * the player actually did rather than a generic slogan — and both directions of
 * the trade-off have a line, because both are real mistakes.
 */
function verdictFor(stats, won) {
  const surplus = stats.meanSurplus || 0;
  if (stats.cause === 'budget') {
    return 'Your budget ran out before the years did. Cover you are not using is still cover you are paying for.';
  }
  if (stats.cause === 'exposure') {
    return 'The claims landed above your line. Cover takes time to raise — the forecast is there to be read early.';
  }
  if (surplus > 0.12) {
    return 'You survived every claim by carrying far more cover than you used. Safe, and expensive — the right amount scores far more.';
  }
  if (won && surplus <= 0.06) {
    return 'You carried close to exactly what each year needed. That is the whole skill: right-sized cover, held on time.';
  }
  if (won) {
    return 'You made it to 60 intact. Tightening the fit on each claim is where the rest of the points live.';
  }
  return 'Somewhere between "not enough" and "far too much" is a line that holds. Finding it is the game.';
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const covered = stats?.covered || 0;
  const perfects = stats?.perfects || 0;
  const shortfalls = stats?.shortfalls || 0;
  const goals = stats?.goals || 0;
  const yearsCleared = stats?.yearsCleared || 0;
  const budgetLeft = stats?.budgetLeft || 0;
  const endBonusPts = stats?.endBonus || 0;
  const cause = stats?.cause;

  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';
  const reachedAge = YEARS[Math.min(yearsCleared, TOTAL_YEARS - 1)].age;

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
    const shareMessage = `Hi,\nI covered ${covered} claims and reached age ${reachedAge} with ${score} points in the ${GAME_TITLE} challenge.\nToo little cover hurts. Too much costs. Find the line: ${shareUrl}`.trim();

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

  // The ring tracks the thing you actually win on: chapters survived.
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(yearsCleared, TOTAL_YEARS) / TOTAL_YEARS) * circumference;
  const weak = yearsCleared < TOTAL_YEARS * 0.4;
  const strokeColor = won ? GREEN : weak ? DANGER : GOLD;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : weak ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

  const headline = won
    ? 'Covered all the way to 60'
    : cause === 'budget'
      ? `Budget gone at age ${reachedAge}`
      : cause === 'timeout'
        ? 'Time up'
        : `Family exposed at age ${reachedAge}`;

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
        padding: '30px 18px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 12, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 15px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 10,
        }}>
          {won ? <TrophyIcon size={20} /> : <GapIcon size={20} />}
          <span style={{ fontSize: 12.5, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {headline}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: CYAN_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your cover record.</span>
        </p>
      </div>

      {/* Score ring — filled by chapters survived */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14, zIndex: 2 }}>
        <div style={{ width: 158, height: 158, position: 'relative' }}>
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
            <span style={{ fontSize: 29, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              SCORE
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {yearsCleared}/{TOTAL_YEARS} chapters cleared
            </span>
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 360, marginBottom: 6, zIndex: 2 }}>
        <StatTile label="Claims covered" value={covered} accent={GREEN_LT} />
        <StatTile label="Perfect cover" value={perfects} accent={GOLD} />
        <StatTile label="Cover gaps" value={shortfalls} accent={shortfalls > 0 ? DANGER : 'rgba(255,255,255,0.6)'} />
      </div>
      <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 360, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Goals funded" value={goals} accent={GOLD_LT} />
        <StatTile label="Budget left" value={budgetLeft} accent={ORANGE_LT} />
        <StatTile label="End bonus" value={endBonusPts.toLocaleString()} accent={CYAN_LT} />
      </div>

      {/* The takeaway, drawn from this run's own numbers */}
      <div style={{
        width: '100%', maxWidth: 360, marginBottom: 14, zIndex: 2,
        background: 'rgba(30,107,224,0.14)',
        border: '1px solid rgba(63,216,232,0.3)',
        borderRadius: 14, padding: '11px 13px',
      }}>
        <p style={{ margin: 0, color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: 700, lineHeight: 1.42 }}>
          {verdictFor(stats || {}, won)}
        </p>
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: BLUE_LT, color: '#fff', fontWeight: 900,
          height: 48, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(30,107,224,0.4)',
          width: '100%', maxWidth: 300, marginBottom: 16, zIndex: 2,
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
          Real cover is not a dial you move every year. A specialist can size one plan to your income and your goals.
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
          Cover amounts, budgets and claims in this game are illustrative game mechanics only and do not represent any product,
          premium or benefit. The results shown are indicative and based solely on how the game was played. They are intended for
          engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life
          insurance product. Participants should seek independent professional advice before making any financial or insurance
          decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}

/* Kept so the module's public surface still exposes the tunables the app uses
   for copy, without every screen importing data.js separately. */
export const GAME_META = { title: GAME_TITLE, tagline: TAGLINE, config: GAME_CONFIG };
