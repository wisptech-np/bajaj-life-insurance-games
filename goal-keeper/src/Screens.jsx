// Screens.jsx — Home, How to Play, and Results screens for Goal Keeper.
//
// All art is inline SVG or CSS: no image files, no emoji, no raster assets.
//
// The art direction is the canvas game's, restated: ONE light source high and
// to the left, CYAN for cover and only cover, CRIMSON for risk and only risk,
// GOLD for the family's goals, and a type scale with three steps and no more.
// The home hero and the how-to-play demo are built from the same geometry the
// canvas uses, so both screens preview the game rather than illustrate it.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Goal Keeper';

const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const COVER = '#00A3E0';
const COVER_LT = '#7BDCFF';
const GREEN = '#28A745';
const GREEN_LT = '#4ADE80';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const DANGER = '#EF4444';
const DANGER_LT = '#FF8B8B';
const SCREEN_BG = 'radial-gradient(ellipse at 22% 6%, rgba(70,135,215,0.30), rgba(9,15,28,0.98) 62%), #070F22';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ShieldIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M12 2.6 20 5.6v6.2c0 5-3.2 8.8-8 10.6-4.8-1.8-8-5.6-8-10.6V5.6z" fill={COVER} opacity="0.9" />
      <path d="M8.4 12.2l2.6 2.6 4.8-5.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"
        strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function BreachIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="12" cy="12" r="9" stroke={DANGER} strokeWidth="2.4" />
      <path d="M8 8l8 8M16 8l-8 8" stroke={DANGER} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function CalendarIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

function ShareIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="M8.6 10.6 15.4 6.5M8.6 13.4l6.8 4.1" />
    </svg>
  );
}

function PhoneIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"
      style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M6.6 3h3.1l1.6 4-2 1.4a12 12 0 0 0 5.3 5.3l1.4-2 4 1.6v3.1c0 .9-.8 1.7-1.7 1.6A16.5 16.5 0 0 1 5 5.7 1.6 1.6 0 0 1 6.6 3z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M20 11a8 8 0 1 0-2.3 6" />
      <path d="M20 4.5V11h-6.5" />
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

/* ─── Shared keyframes ───────────────────────────────────
   Two demos, both on the same 4.8 s clock so nothing on the page beats against
   anything else. The how-to-play loop plays the game in the order it happens:
   the policy runs down, the player renews, the crosshairs appear, the span
   slides across, the lock closes, and one of the two shots is saved. */
const SCREEN_CSS = `
@keyframes gkTitleIn { from { opacity: 0; letter-spacing: 0.22em; transform: translateY(8px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes gkRise    { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes gkFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }

/* Home hero: the span slides right and widens onto the incoming shot. */
@keyframes gkHeroSpan { 0%,10% { transform: translateX(-30px) scaleX(0.62); } 55%,100% { transform: translateX(6px) scaleX(1); } }
@keyframes gkHeroBallA { 0% { transform: translate(112px,34px) scale(0.5); opacity: 0; } 8% { opacity: 1; } 62% { transform: translate(128px,120px) scale(1); opacity: 1; } 70%,100% { transform: translate(128px,120px) scale(1); opacity: 0; } }
@keyframes gkHeroSave  { 0%,60% { opacity: 0; transform: scale(0.4); } 68% { opacity: 1; transform: scale(1); } 88%,100% { opacity: 0; transform: scale(1.5); } }

/* How to play, one full 4.8 s beat. */
@keyframes gkDMeter  { 0% { width: 86px; } 26% { width: 26px; } 30%,100% { width: 86px; } }
@keyframes gkDMeterC { 0%,20% { fill: ${COVER}; } 22%,29% { fill: ${GOLD}; } 31%,100% { fill: ${COVER}; } }
@keyframes gkDFinger { 0%,20% { opacity: 0; transform: translate(0,0); } 24%,30% { opacity: 1; transform: translate(0,0); } 38% { opacity: 1; transform: translate(0,0); } 44%,72% { opacity: 1; transform: translate(74px,0); } 80%,100% { opacity: 0; transform: translate(74px,0); } }
@keyframes gkDSpan   { 0%,40% { transform: translateX(0) scaleX(0.42); } 44% { transform: translateX(0) scaleX(1); } 70%,100% { transform: translateX(74px) scaleX(1); } }
@keyframes gkDCue    { 0%,32% { opacity: 0; } 40%,66% { opacity: 1; } 74%,100% { opacity: 0; } }
@keyframes gkDBall   { 0%,44% { transform: translate(150px,40px) scale(0.5); opacity: 0; } 48% { opacity: 1; } 78% { transform: translate(196px,116px) scale(1); opacity: 1; } 84%,100% { transform: translate(196px,116px) scale(1); opacity: 0; } }
@keyframes gkDLock   { 0%,62% { stroke: rgba(244,248,255,0.24); } 66%,86% { stroke: ${DANGER}; } 92%,100% { stroke: rgba(244,248,255,0.24); } }
@keyframes gkDSave   { 0%,78% { opacity: 0; transform: scale(0.4); } 84% { opacity: 1; transform: scale(1); } 96%,100% { opacity: 0; transform: scale(1.4); } }

.gk-title { animation: gkTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.gk-rise  { animation: gkRise 520ms cubic-bezier(0.22,1,0.36,1) both; }
.gk-float { animation: gkFloat 4.4s ease-in-out infinite; }
.gk-hero-span { animation: gkHeroSpan 3.6s cubic-bezier(0.3,0,0.3,1) infinite; }
.gk-hero-ball { animation: gkHeroBallA 3.6s cubic-bezier(0.5,0,0.7,1) infinite; }
.gk-hero-save { animation: gkHeroSave 3.6s ease-out infinite; transform-origin: 128px 120px; }
.gk-d-meter   { animation: gkDMeter 4.8s ease-in-out infinite, gkDMeterC 4.8s step-end infinite; }
.gk-d-finger  { animation: gkDFinger 4.8s cubic-bezier(0.3,0,0.3,1) infinite; }
.gk-d-span    { animation: gkDSpan 4.8s cubic-bezier(0.3,0,0.3,1) infinite; }
.gk-d-cue     { animation: gkDCue 4.8s ease-out infinite; }
.gk-d-ball    { animation: gkDBall 4.8s cubic-bezier(0.5,0,0.7,1) infinite; }
.gk-d-lock    { animation: gkDLock 4.8s step-end infinite; }
.gk-d-save    { animation: gkDSave 4.8s ease-out infinite; transform-origin: 196px 116px; }

@media (prefers-reduced-motion: reduce) {
  .gk-title, .gk-rise, .gk-float, .gk-hero-span, .gk-hero-ball, .gk-hero-save,
  .gk-d-meter, .gk-d-finger, .gk-d-span, .gk-d-cue, .gk-d-ball, .gk-d-lock,
  .gk-d-save { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, COVER_LT, BLUE_LT, GREEN];
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 1 }}>
      {Array.from({ length: 24 }).map((_, i) => (
        <div
          key={i}
          className="confetti"
          style={{
            position: 'absolute',
            left: `${Math.random() * 100}%`,
            background: colors[i % colors.length],
            '--dur': `${2 + Math.random() * 2}s`,
            '--delay': `${Math.random() * 1.5}s`,
            top: -20,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
    </div>
  );
}

/* ─── Home ───────────────────────────────────────────────
   The hero is the game's actual composition, cropped: the stand, the empty
   pitch, the goal line, the cover span with its column of light, the family's
   three banners in the net, and one shot coming in. */
function HeroGoal() {
  const L = 18;
  const R = 238;
  const lineY = 128;
  const lockY = 74;
  const netBottom = 176;
  const cx = (L + R) / 2;

  const netLines = [];
  for (let x = L; x <= R; x += 20) {
    netLines.push(<line key={`v${x}`} x1={x} y1={lineY} x2={x} y2={netBottom} stroke="rgba(206,228,255,0.16)" strokeWidth="0.7" />);
  }
  for (let y = lineY + 8; y < netBottom; y += 12) {
    netLines.push(<line key={`h${y}`} x1={L} y1={y} x2={R} y2={y} stroke="rgba(206,228,255,0.16)" strokeWidth="0.7" />);
  }

  const crowd = [];
  for (let row = 0; row < 4; row++) {
    for (let x = (row % 2) * 5; x < 256; x += 9) {
      crowd.push(<rect key={`c${row}-${x}`} x={x} y={9 + row * 6.6} width="2.4" height="2.4"
        fill={`rgba(140,185,250,${0.16 + row * 0.07})`} />);
    }
  }

  return (
    <svg width="100%" viewBox="0 0 256 200" style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="gkSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070F22" />
          <stop offset="100%" stopColor="#0C2450" />
        </linearGradient>
        <linearGradient id="gkTurf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A3520" />
          <stop offset="100%" stopColor="#15693F" />
        </linearGradient>
        <linearGradient id="gkCol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,163,224,0)" />
          <stop offset="100%" stopColor="rgba(0,163,224,0.22)" />
        </linearGradient>
        <radialGradient id="gkFlood" cx="0.16" cy="0" r="0.9">
          <stop offset="0%" stopColor="rgba(150,195,255,0.34)" />
          <stop offset="100%" stopColor="rgba(120,170,240,0)" />
        </radialGradient>
        <clipPath id="gkClip"><rect x="0" y="0" width="256" height="200" rx="20" /></clipPath>
      </defs>

      <g clipPath="url(#gkClip)">
        {/* Same construction as the canvas: everything outside the pitch is one
            flat dark tone, so the corners never read as an unfinished gradient. */}
        <rect x="0" y="0" width="256" height="200" fill="#050B18" />
        <rect x="0" y="0" width="256" height="10" fill="url(#gkSky)" />
        <rect x="0" y="6" width="256" height="30" fill="#060E1F" />
        {crowd}
        <rect x="0" y="36" width="256" height="9" fill="#08234C" />
        <path d="M-6 44 l6 -7 l6 7 M12 44 l6 -7 l6 7 M30 44 l6 -7 l6 7 M48 44 l6 -7 l6 7 M66 44 l6 -7 l6 7 M84 44 l6 -7 l6 7 M102 44 l6 -7 l6 7 M120 44 l6 -7 l6 7 M138 44 l6 -7 l6 7 M156 44 l6 -7 l6 7 M174 44 l6 -7 l6 7 M192 44 l6 -7 l6 7 M210 44 l6 -7 l6 7 M228 44 l6 -7 l6 7 M246 44 l6 -7 l6 7"
          fill="none" stroke="rgba(0,163,224,0.26)" strokeWidth="1.3" />
        <rect x="0" y="44" width="256" height="1" fill="rgba(244,248,255,0.5)" />
        <rect x="0" y="0" width="256" height="200" fill="url(#gkFlood)" />

        {/* pitch trapezoid, touchlines converging, two printed mown stripes */}
        <path d="M34 45 L222 45 L256 176 L0 176 Z" fill="url(#gkTurf)" />
        <path d="M34 45 L0 176" stroke="rgba(232,246,255,0.18)" strokeWidth="1" fill="none" />
        <path d="M222 45 L256 176" stroke="rgba(232,246,255,0.18)" strokeWidth="1" fill="none" />
        <path d="M62 45 L84 45 L74 176 L44 176 Z" fill="rgba(255,255,255,0.026)" />
        <path d="M172 45 L194 45 L212 176 L182 176 Z" fill="rgba(255,255,255,0.026)" />

        {/* the covered column and the lock line */}
        <g className="gk-hero-span" style={{ transformOrigin: `${cx}px ${lineY}px` }}>
          <path d={`M${cx - 26} ${lockY} L${cx + 26} ${lockY} L${cx + 46} ${lineY} L${cx - 46} ${lineY} Z`} fill="url(#gkCol)" />
          <line x1={cx - 26} y1={lockY} x2={cx - 46} y2={lineY} stroke="rgba(123,220,255,0.30)" strokeWidth="1" />
          <line x1={cx + 26} y1={lockY} x2={cx + 46} y2={lineY} stroke="rgba(123,220,255,0.30)" strokeWidth="1" />
          <rect x={cx - 46} y={lineY - 8} width="92" height="9" rx="3" fill={COVER} />
          <rect x={cx - 45} y={lineY - 8} width="90" height="1.6" fill={COVER_LT} />
          <path d={`M${cx - 46} ${lineY - 13} l6 0 M${cx - 46} ${lineY - 13} l0 16 M${cx + 46} ${lineY - 13} l-6 0 M${cx + 46} ${lineY - 13} l0 16`}
            stroke={COVER_LT} strokeWidth="2" fill="none" />
        </g>
        <line x1={L} y1={lockY} x2={R} y2={lockY} stroke="rgba(244,248,255,0.24)" strokeWidth="1" strokeDasharray="5 7" />

        {/* goal line, net, posts */}
        <rect x="0" y={lineY - 0.6} width="256" height="1.2" fill="rgba(232,246,255,0.40)" />
        <rect x="0" y={lineY + 1} width="256" height={netBottom - lineY} fill="rgba(4,10,22,0.86)" />
        {netLines}
        <rect x={L} y={lineY - 1.5} width={R - L} height="3" fill="#F4F8FF" />
        <rect x={L - 3} y={lineY - 4} width="6" height={netBottom - lineY + 4} fill="#F4F8FF" />
        <rect x={R - 3} y={lineY - 4} width="6" height={netBottom - lineY + 4} fill="#F4F8FF" />

        {/* the three family goals in the net */}
        {GAME_CONFIG.goals.map((g, i) => {
          const slot = (R - L) / 3;
          const x = L + i * slot + slot / 2;
          return (
            <g key={g.key}>
              <rect x={x - slot * 0.44} y={lineY + 12} width={slot * 0.88} height="26" rx="3"
                fill="rgba(255,255,255,0.055)" stroke="rgba(255,200,69,0.34)" strokeWidth="0.8" />
              <rect x={x - slot * 0.44 + 3} y={lineY + 14} width={slot * 0.88 - 6} height="1.8" fill={GOLD} />
              <text x={x} y={lineY + 24} fill={GOLD_LT} fontSize="6" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">{g.short}</text>
              {Array.from({ length: 6 }).map((_, k) => (
                <rect key={k} x={x - 16 + k * 5.6} y={lineY + 30} width="4" height="2.6" fill={GOLD} />
              ))}
            </g>
          );
        })}

        {/* three strikers on the edge of the box */}
        {[80, 128, 176].map((x) => (
          <g key={x} transform={`translate(${x},64)`}>
            <ellipse cx="1" cy="1" rx="6" ry="1.4" fill="rgba(0,0,0,0.34)" />
            <path d="M-1 -8 L-4 0 M1 -8 L4 0" stroke="#7F1D1D" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="-3.4" y="-17" width="6.8" height="9" rx="2.6" fill={DANGER} />
            <rect x="0.6" y="-17" width="2.8" height="9" rx="1.4" fill="#7F1D1D" />
            <circle cx="0" cy="-19.4" r="2.4" fill="#E8B98C" />
          </g>
        ))}

        {/* one shot arriving, and the save */}
        <g className="gk-hero-ball">
          <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
          <circle cx="2" cy="2" r="5.4" fill="#B9C8DF" opacity="0.42" />
          <circle cx="0" cy="0" r="2.4" fill="#0B1221" />
        </g>
        <g className="gk-hero-save">
          <circle cx="128" cy="120" r="17" fill="none" stroke={GREEN_LT} strokeWidth="3.4" />
        </g>
      </g>
      <rect x="0.7" y="0.7" width="254.6" height="198.6" rx="20" fill="none"
        stroke="rgba(255,255,255,0.10)" strokeWidth="1.4" />
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
        justifyContent: 'center',
        gap: 22,
        padding: '30px 20px 26px',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2, marginTop: 'auto' }}>
        <div style={{
          fontSize: 8.5, fontWeight: 900, letterSpacing: '0.30em',
          color: 'rgba(244,248,255,0.42)', marginBottom: 8,
        }}>
          BAJAJ LIFE INSURANCE
        </div>
        <h1 className="gk-title" style={{
          fontSize: 36,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 0.98,
          margin: '0 0 10px 0',
        }}>
          {GAME_TITLE}
        </h1>
        <p className="gk-rise" style={{
          fontSize: 12,
          fontWeight: 700,
          color: COVER_LT,
          margin: 0,
          maxWidth: 300,
          lineHeight: 1.5,
        }}>
          Your cover is a span on the line. Steer it, renew it, and decide which
          of the family&rsquo;s goals you can afford to leave open.
        </p>
      </div>

      {/* The hero is the biggest thing on the screen on purpose: it is the game
          board, and a player should recognise it the moment the match starts. */}
      <div className="gk-float" style={{ position: 'relative', width: '100%', maxWidth: 360, zIndex: 1 }}>
        <HeroGoal />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10, marginTop: 'auto' }}
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
            fontSize: 19,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: `linear-gradient(135deg, ${COVER} 0%, ${BLUE} 100%)`,
            boxShadow: '0 6px 22px rgba(0,163,224,0.35)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <PlayIcon size={19} />
          <span>Start Game</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play ─────────────────────────────────────────
   One 4.8 s loop of the actual game, in the order it happens: the cover meter
   runs down, a tap renews it to full, two crosshairs appear, the finger drags
   the span across, the lock line closes, and the shot inside the span is saved
   while the one outside it is not. Three captions, four words each. */
function DemoCover() {
  const L = 26;
  const R = 274;
  const lineY = 124;
  const lockY = 86;

  const net = [];
  for (let x = L; x <= R; x += 24) {
    net.push(<line key={`v${x}`} x1={x} y1={lineY} x2={x} y2="150" stroke="rgba(206,228,255,0.16)" strokeWidth="0.7" />);
  }

  return (
    <svg width="100%" viewBox="0 0 300 200" style={{ display: 'block' }} aria-hidden="true">
      <defs>
        <linearGradient id="gkDSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070F22" />
          <stop offset="100%" stopColor="#0C2450" />
        </linearGradient>
        <linearGradient id="gkDTurf" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A3520" />
          <stop offset="100%" stopColor="#15693F" />
        </linearGradient>
        <linearGradient id="gkDCol" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(0,163,224,0)" />
          <stop offset="100%" stopColor="rgba(0,163,224,0.24)" />
        </linearGradient>
        <clipPath id="gkDClip"><rect x="0" y="0" width="300" height="200" rx="14" /></clipPath>
      </defs>

      <g clipPath="url(#gkDClip)">
        <rect x="0" y="0" width="300" height="200" fill="#050B18" />
        <rect x="0" y="0" width="300" height="16" fill="url(#gkDSky)" />

        {/* the same stand, hoarding and converging pitch the canvas draws */}
        <rect x="0" y="10" width="300" height="14" fill="#060E1F" />
        {Array.from({ length: 3 }).map((_, row) => (
          <g key={row} opacity={0.35 + row * 0.16}>
            {Array.from({ length: 34 }).map((__, i) => (
              <rect key={i} x={(row % 2) * 4.5 + i * 9} y={12 + row * 4} width="2.4" height="2.4"
                fill="rgba(140,185,250,0.5)" />
            ))}
          </g>
        ))}
        <rect x="0" y="24" width="300" height="9" fill="#08234C" />
        <path d="M-6 32 l6 -7 l6 7 M12 32 l6 -7 l6 7 M30 32 l6 -7 l6 7 M48 32 l6 -7 l6 7 M66 32 l6 -7 l6 7 M84 32 l6 -7 l6 7 M102 32 l6 -7 l6 7 M120 32 l6 -7 l6 7 M138 32 l6 -7 l6 7 M156 32 l6 -7 l6 7 M174 32 l6 -7 l6 7 M192 32 l6 -7 l6 7 M210 32 l6 -7 l6 7 M228 32 l6 -7 l6 7 M246 32 l6 -7 l6 7 M264 32 l6 -7 l6 7 M282 32 l6 -7 l6 7"
          fill="none" stroke="rgba(0,163,224,0.28)" strokeWidth="1.4" />
        <rect x="0" y="32" width="300" height="1" fill="rgba(244,248,255,0.5)" />
        <path d="M40 33 L260 33 L300 150 L0 150 Z" fill="url(#gkDTurf)" />
        <path d="M40 33 L0 150" stroke="rgba(232,246,255,0.18)" strokeWidth="1" fill="none" />
        <path d="M260 33 L300 150" stroke="rgba(232,246,255,0.18)" strokeWidth="1" fill="none" />

        {/* three strikers — the risk, in crimson and nothing else */}
        {[104, 150, 196].map((x) => (
          <g key={x} transform={`translate(${x},52)`}>
            <ellipse cx="1" cy="1" rx="5.4" ry="1.3" fill="rgba(0,0,0,0.34)" />
            <path d="M-1 -7 L-3.6 0 M1 -7 L3.6 0" stroke="#7F1D1D" strokeWidth="2.4" strokeLinecap="round" />
            <rect x="-3" y="-15" width="6" height="8" rx="2.4" fill={DANGER} />
            <rect x="0.6" y="-15" width="2.4" height="8" rx="1.2" fill="#7F1D1D" />
            <circle cx="0" cy="-17.2" r="2.2" fill="#E8B98C" />
          </g>
        ))}

        {/* lock line — turns crimson when the ball is past it */}
        <line className="gk-d-lock" x1={L} y1={lockY} x2={R} y2={lockY}
          stroke="rgba(244,248,255,0.24)" strokeWidth="1.4" strokeDasharray="5 7" />
        <text x={R} y={lockY - 6} fill="rgba(244,248,255,0.45)" fontSize="6.6" fontWeight="900"
          textAnchor="end" fontFamily="'Poppins', sans-serif">RENEW ABOVE THIS LINE</text>

        {/* the cover span with its column */}
        <g className="gk-d-span" style={{ transformOrigin: '112px 124px' }}>
          <path d={`M86 ${lockY} L138 ${lockY} L150 ${lineY} L74 ${lineY} Z`} fill="url(#gkDCol)" />
          <rect x="74" y={lineY - 9} width="76" height="10" rx="3.4" fill={COVER} />
          <rect x="75" y={lineY - 9} width="74" height="1.8" fill={COVER_LT} />
          <path d={`M74 ${lineY - 14} l6 0 M74 ${lineY - 14} l0 17 M150 ${lineY - 14} l-6 0 M150 ${lineY - 14} l0 17`}
            stroke={COVER_LT} strokeWidth="2.2" fill="none" />
        </g>

        {/* goal line + net */}
        <rect x="0" y={lineY - 0.7} width="300" height="1.4" fill="rgba(232,246,255,0.40)" />
        <rect x="0" y={lineY + 1.2} width="300" height="26" fill="rgba(4,10,22,0.86)" />
        {net}
        <rect x={L} y={lineY - 1.6} width={R - L} height="3.2" fill="#F4F8FF" />
        <rect x={L - 3} y={lineY - 4} width="6" height="30" fill="#F4F8FF" />
        <rect x={R - 3} y={lineY - 4} width="6" height="30" fill="#F4F8FF" />

        {/* two crosshairs: one inside the span, one that will not be */}
        <g className="gk-d-cue" stroke={DANGER} strokeWidth="1.8" fill="none">
          <circle cx="196" cy={lineY - 5} r="9" />
          <path d={`M182 ${lineY - 5} h5 M205 ${lineY - 5} h5`} />
          <circle cx="76" cy={lineY - 5} r="9" opacity="0.5" />
        </g>

        {/* the ball that gets saved */}
        <g className="gk-d-ball">
          <circle cx="0" cy="0" r="8" fill="#FFFFFF" />
          <circle cx="2.4" cy="2.4" r="6" fill="#B9C8DF" opacity="0.42" />
          <circle cx="0" cy="0" r="2.7" fill="#0B1221" />
        </g>
        <g className="gk-d-save">
          <circle cx="196" cy={lineY - 4} r="18" fill="none" stroke={GREEN_LT} strokeWidth="3.4" />
        </g>

        {/* the control strip, running down and being renewed */}
        <rect x="0" y="156" width="300" height="44" fill="rgba(6,13,28,0.95)" />
        <rect x="0" y="156" width="300" height="0.8" fill="rgba(244,248,255,0.12)" />
        <text x="16" y="169" fill="rgba(244,248,255,0.55)" fontSize="6.4" fontWeight="900"
          fontFamily="'Poppins', sans-serif">COVER</text>
        <rect x="16" y="175" width="86" height="7" rx="3.5" fill="rgba(255,255,255,0.09)" />
        <rect className="gk-d-meter" x="16" y="175" width="86" height="7" rx="3.5" fill={COVER} />
        <text x="284" y="169" fill="rgba(244,248,255,0.55)" fontSize="6.4" fontWeight="900"
          textAnchor="end" fontFamily="'Poppins', sans-serif">PREMIUMS</text>
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${278 - i * 15} 173 l6 5.5 l-6 5.5 l-6 -5.5 Z`} fill={COVER} />
        ))}
        <rect x="118" y="167" width="64" height="19" rx="5" fill="rgba(0,163,224,0.18)"
          stroke={COVER} strokeWidth="1" />
        <text x="150" y="179.5" fill={COVER_LT} fontSize="6.4" fontWeight="900" textAnchor="middle"
          fontFamily="'Poppins', sans-serif">TAP TO RENEW</text>

        {/* the thumb: taps the strip to renew, then drags the span across */}
        <g transform="translate(112,196)">
          <g className="gk-d-finger">
            <rect x="-4.5" y="-19" width="9" height="21" rx="4.5" fill="#F3F7FF" />
            <rect x="-9" y="-6" width="19" height="16" rx="7.5" fill="#B9C8DF" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/** Icon + <=4 words. The only prose allowed on this screen. */
function Cue({ tint, label, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <svg width="28" height="26" viewBox="0 0 28 26" aria-hidden="true">{children}</svg>
      <span style={{
        fontSize: 8.5, fontWeight: 900, letterSpacing: '0.05em', color: tint,
        textTransform: 'uppercase', textAlign: 'center', lineHeight: 1.2,
      }}>
        {label}
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
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(7,15,34,0.78)',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 22,
        padding: '18px 14px 16px',
        width: '100%',
        maxWidth: 344,
        boxShadow: '0 14px 40px rgba(0,0,0,0.5)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.01em', margin: '0 0 4px 0', color: '#fff',
        }}>
          How to Play
        </h2>
        <p style={{
          fontSize: 10, fontWeight: 700, color: COVER_LT, letterSpacing: '0.04em',
          margin: '0 0 12px 0',
        }}>
          Hold the line for {GAME_CONFIG.planSeconds} seconds
        </p>

        <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
          <DemoCover />
        </div>

        <div style={{ display: 'flex', gap: 6, margin: '14px 0 14px' }}>
          <Cue tint={COVER_LT} label="Drag to move cover">
            <rect x="3" y="9" width="22" height="5" rx="2.5" fill={COVER} />
            <rect x="4" y="9" width="20" height="1.2" fill={COVER_LT} />
            <path d="M9 20 l-5 -3.5 l5 -3.5 M19 20 l5 -3.5 l-5 -3.5" fill="none" stroke={COVER_LT}
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </Cue>
          <Cue tint={COVER_LT} label="Tap to renew">
            <path d="M14 2 l7 3 l0 6.5 c0 4.6 -3 8 -7 9.6 c-4 -1.6 -7 -5 -7 -9.6 l0 -6.5 z"
              fill={COVER} />
            <path d="M10.6 12 l2.5 2.5 l4.5 -5" fill="none" stroke="#F4F8FF" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round" />
          </Cue>
          <Cue tint={DANGER_LT} label="Cover before the shot">
            <path d="M3 8 h22" stroke={DANGER} strokeWidth="2" strokeDasharray="4 4" />
            <circle cx="14" cy="17" r="5.5" fill="#fff" />
            <circle cx="15.4" cy="18.4" r="4" fill="#B9C8DF" opacity="0.5" />
            <circle cx="14" cy="17" r="1.8" fill="#0B1221" />
          </Cue>
        </div>

        <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(135deg, ${COVER} 0%, ${BLUE} 100%)`,
              boxShadow: '0 4px 16px rgba(0,163,224,0.35)',
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

/* ─── Results ────────────────────────────────────────────── */
function StatTile({ label, value, accent }) {
  return (
    <div style={{
      flex: 1,
      padding: '10px 4px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 7.5, fontWeight: 900, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const saves = stats?.saves || 0;
  const conceded = stats?.conceded || 0;
  const streak = stats?.streak || 0;
  const renewals = stats?.renewals || 0;
  const funding = stats?.funding ?? 0;
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
    const shareMessage = `Hi,\nI kept ${saves} shots out and finished with ${funding}% of my family's goals still funded — ${score} points in the ${GAME_TITLE} challenge.\nCover you buy in advance is the only cover that pays. Take your turn on the line here: ${shareUrl}`.trim();

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
  const weak = score < RESULT_TARGET_SCORE * 0.4;
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
        padding: '30px 20px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      {won && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.22)' : 'rgba(239,68,68,0.18)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 10,
        }}>
          {won ? <ShieldIcon size={19} /> : <BreachIcon size={19} />}
          <span style={{ fontSize: 12.5, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Full time — plan intact' : 'A goal went uninsured'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: COVER_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your match.</span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, zIndex: 2 }}>
        <div style={{ width: 160, height: 160, position: 'relative' }}>
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
            <span style={{ fontSize: 8.5, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              POINTS
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.42)', marginTop: 3 }}>
              {funding}% of goals still funded
            </span>
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 7, width: '100%', maxWidth: 360, marginBottom: 8, zIndex: 2 }}>
        <StatTile label="Saves" value={saves} accent={GREEN_LT} />
        <StatTile label="Conceded" value={conceded} accent={DANGER} />
        <StatTile label="Best run" value={`x${streak}`} accent={GOLD} />
        <StatTile label="Renewals" value={renewals} accent={COVER_LT} />
      </div>

      <p style={{
        fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.45)', textAlign: 'center',
        maxWidth: 340, lineHeight: 1.5, margin: '0 0 16px', zIndex: 2,
      }}>
        You renewed {renewals} time{renewals === 1 ? '' : 's'} and still let {conceded} shot
        {conceded === 1 ? '' : 's'} through. Real life does not telegraph its shots at all.
      </p>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: COVER, color: '#fff', fontWeight: 900,
          height: 50, borderRadius: 12, border: 'none', cursor: 'pointer',
          fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(0,163,224,0.35)',
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
        <p style={{ color: '#fff', fontSize: 14.5, fontWeight: 700, lineHeight: 1.4, margin: '0 0 16px 0' }}>
          Cover has to be in place before the shot, and wide enough to matter. A specialist can
          size the cover that keeps your family&rsquo;s goals funded whatever arrives.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(135deg, ${COVER} 0%, ${BLUE} 100%)`,
                color: '#fff', fontWeight: 900, padding: '15px 20px', borderRadius: 12,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 16, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                boxShadow: '0 4px 16px rgba(0,163,224,0.3)',
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
                fontSize: 15, textDecoration: 'none', textTransform: 'uppercase',
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
