// Screens.jsx — Home, How to Play, and Results screens for Life Rush.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Life Rush';

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
const SCREEN_BG = 'radial-gradient(ellipse at 50% 26%, rgba(242,101,34,0.20), rgba(11,18,33,0.97) 68%), #0B1221';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Won: a stopwatch that beat the clock. */
function BeatClockIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="18" r="11" stroke="#fff" strokeWidth="2.4" />
      <path d="M12 3h8M16 3v3" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <path d="m11 18 3.5 3.5L22 14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Lost: a shield that has run out. */
function BrokenShieldIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M16 3 5 7v8c0 7 4.8 12.4 11 15 6.2-2.6 11-8 11-15V7L16 3z"
        stroke="#fff" strokeWidth="2.2" fill="rgba(255,255,255,0.14)" />
      <path d="m12 12 8 8M20 12l-8 8" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
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
@keyframes lrTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes lrFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes lrChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes lrSlam    { 0%,8% { opacity: 0; transform: scale(1.5) rotate(-8deg); } 16% { opacity: 1; transform: scale(1) rotate(0deg); } 30% { opacity: 1; } 36%,100% { opacity: 0; transform: scale(0.9); } }
@keyframes lrSlam2   { 0%,36% { opacity: 0; transform: scale(1.5) rotate(6deg); } 44% { opacity: 1; transform: scale(1) rotate(0deg); } 58% { opacity: 1; } 64%,100% { opacity: 0; transform: scale(0.9); } }
@keyframes lrSlam3   { 0%,64% { opacity: 0; transform: scale(1.5) rotate(-5deg); } 72% { opacity: 1; transform: scale(1) rotate(0deg); } 88% { opacity: 1; } 94%,100% { opacity: 0; transform: scale(0.9); } }
@keyframes lrBarDrain { 0% { width: 100%; } 30% { width: 8%; } 33%,100% { width: 100%; } }
@keyframes lrTapDot  { 0%,20% { opacity: 0; transform: scale(0.4); } 28% { opacity: 1; transform: scale(1); } 46%,100% { opacity: 0; transform: scale(1.6); } }
@keyframes lrDragHand { 0%,15% { transform: translate(0,0); opacity: 0; } 22% { opacity: 1; } 60% { transform: translate(0,-46px); opacity: 1; } 72%,100% { transform: translate(0,-46px); opacity: 0; } }
@keyframes lrSwipeHand { 0%,15% { transform: translate(-24px,0); opacity: 0; } 22% { opacity: 1; } 60% { transform: translate(24px,0); opacity: 1; } 72%,100% { transform: translate(24px,0); opacity: 0; } }
.lr-title { animation: lrTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.lr-float { animation: lrFloat 4s ease-in-out infinite; }
.lr-chip  { animation: lrChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.lr-slam1 { animation: lrSlam 3.6s ease-out infinite; }
.lr-slam2 { animation: lrSlam2 3.6s ease-out infinite; }
.lr-slam3 { animation: lrSlam3 3.6s ease-out infinite; }
.lr-bar   { animation: lrBarDrain 2.4s linear infinite; }
.lr-tap   { animation: lrTapDot 2.4s ease-out infinite; }
.lr-drag  { animation: lrDragHand 2.4s cubic-bezier(0.3,0,0.3,1) infinite; }
.lr-swipe { animation: lrSwipeHand 2.4s cubic-bezier(0.3,0,0.3,1) infinite; }
@media (prefers-reduced-motion: reduce) {
  .lr-title, .lr-float, .lr-chip, .lr-slam1, .lr-slam2, .lr-slam3,
  .lr-bar, .lr-tap, .lr-drag, .lr-swipe { animation: none !important; }
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
 * Hero motif: the game's own frame — a phone-shaped stage with the countdown
 * bar draining and three command words slamming in and out, exactly the beat
 * the run is made of. It previews the game rather than illustrating it.
 */
function HeroRush() {
  return (
    <svg width="252" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="lrStage" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0D1A33" />
          <stop offset="55%" stopColor="#0A1E42" />
          <stop offset="100%" stopColor="#061229" />
        </linearGradient>
        <linearGradient id="lrSlash" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="rgba(242,101,34,0)" />
          <stop offset="50%" stopColor="rgba(242,101,34,0.95)" />
          <stop offset="100%" stopColor="rgba(242,101,34,0)" />
        </linearGradient>
        <clipPath id="lrClip"><rect x="26" y="6" width="148" height="178" rx="18" /></clipPath>
      </defs>

      <rect x="26" y="6" width="148" height="178" rx="18" fill="url(#lrStage)"
        stroke="rgba(255,255,255,0.14)" strokeWidth="1.6" />

      <g clipPath="url(#lrClip)">
        {/* Speed streaks */}
        <g opacity="0.10" stroke="#CFE2FF" strokeWidth="1">
          <line x1="30" y1="30" x2="72" y2="30" />
          <line x1="110" y1="52" x2="168" y2="52" />
          <line x1="36" y1="96" x2="88" y2="96" />
          <line x1="120" y1="132" x2="170" y2="132" />
          <line x1="32" y1="158" x2="80" y2="158" />
        </g>

        {/* Countdown bar */}
        <rect x="36" y="16" width="128" height="5" rx="2.5" fill="rgba(255,255,255,0.16)" />
        <rect className="lr-bar" x="36" y="16" width="128" height="5" rx="2.5" fill={ORANGE_LT} />

        {/* Lives as shield pips */}
        <g transform="translate(74,32)">
          {[0, 1, 2].map((i) => (
            <g key={i} transform={`translate(${i * 18},0)`}>
              <path d="M8 0 1 2.6v4.6c0 3.9 2.8 7 7 8.6 4.2-1.6 7-4.7 7-8.6V2.6L8 0z"
                fill="rgba(30,107,224,0.85)" stroke="#A6D0FF" strokeWidth="1" />
            </g>
          ))}
        </g>

        {/* Three command words slamming through */}
        <g className="lr-slam1">
          <rect x="26" y="86" width="148" height="26" fill="url(#lrSlash)" />
          <text x="100" y="104" fill="#fff" fontSize="19" fontWeight="900" textAnchor="middle"
            fontFamily="'Poppins', sans-serif">PAY!</text>
        </g>
        <g className="lr-slam2">
          <rect x="26" y="86" width="148" height="26" fill="url(#lrSlash)" />
          <text x="100" y="104" fill="#fff" fontSize="17" fontWeight="900" textAnchor="middle"
            fontFamily="'Poppins', sans-serif">SWAT!</text>
        </g>
        <g className="lr-slam3">
          <rect x="26" y="86" width="148" height="26" fill="url(#lrSlash)" />
          <text x="100" y="104" fill="#fff" fontSize="16" fontWeight="900" textAnchor="middle"
            fontFamily="'Poppins', sans-serif">SHIELD!</text>
        </g>

        {/* A thumb print landing */}
        <circle className="lr-tap" cx="100" cy="146" r="11" fill="none"
          stroke={GOLD} strokeWidth="2" />
        <circle cx="100" cy="146" r="4.5" fill={GOLD} opacity="0.85" />
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
        <h1 className="lr-title" style={{
          fontSize: 36,
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
          maxWidth: 314,
          lineHeight: 1.45,
        }}>
          Life comes at you fast &mdash; pay, protect, pick and plan in seconds.
        </p>
      </div>

      <div className="lr-float" style={{ position: 'relative', width: 252, height: 240, zIndex: 1 }}>
        <HeroRush />
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
 * Animation-first tutorial. One looping demo that cycles the run itself:
 * three microgame scenes back to back, each with its own command banner glyph,
 * its own shrinking action window and its own verb — tap a target, swipe a
 * path, hold and release into a band — performed by a finger glyph, each
 * landing on a green clear. The three scenes share one keyframe set and are
 * offset with negative animation-delays, so the whole thing is CSS.
 */
const LR_TUT_CSS = `
@keyframes lrTutScene {
  0% { opacity: 0; transform: translateY(7px); }
  4%, 28% { opacity: 1; transform: translateY(0); }
  33%, 100% { opacity: 0; transform: translateY(-7px); }
}
@keyframes lrTutBanner {
  0% { opacity: 0; transform: translateX(-46px); }
  5%, 26% { opacity: 1; transform: translateX(0); }
  31%, 100% { opacity: 0; transform: translateX(24px); }
}
@keyframes lrTutTick {
  0%, 24% { opacity: 0; transform: scale(0.4); }
  27% { opacity: 1; transform: scale(1.2); }
  30%, 32% { opacity: 1; transform: scale(1); }
  33%, 100% { opacity: 0; transform: scale(1); }
}
@keyframes lrTutTap {
  0%, 9% { opacity: 0; transform: translate(0px, 16px); }
  13% { opacity: 1; transform: translate(0px, 5px); }
  17%, 20% { opacity: 1; transform: translate(0px, 0px); }
  25% { opacity: 1; transform: translate(0px, 7px); }
  29%, 100% { opacity: 0; transform: translate(0px, 14px); }
}
@keyframes lrTutRipple {
  0%, 16% { opacity: 0; transform: scale(0.3); }
  20% { opacity: 0.95; transform: scale(1); }
  27%, 100% { opacity: 0; transform: scale(1.7); }
}
@keyframes lrTutSwipeHand {
  0%, 9% { opacity: 0; transform: translate(-46px, 4px); }
  13% { opacity: 1; transform: translate(-46px, 0px); }
  25% { opacity: 1; transform: translate(46px, 0px); }
  29%, 100% { opacity: 0; transform: translate(46px, 4px); }
}
@keyframes lrTutSign {
  0%, 12% { stroke-dashoffset: 96; }
  25%, 32% { stroke-dashoffset: 0; }
  33%, 100% { stroke-dashoffset: 96; }
}
@keyframes lrTutHoldHand {
  0%, 9% { opacity: 0; transform: translate(0px, 16px) scale(1); }
  13%, 24% { opacity: 1; transform: translate(0px, 0px) scale(0.88); }
  29%, 100% { opacity: 0; transform: translate(0px, 12px) scale(1); }
}
@keyframes lrTutGrow {
  0%, 12% { transform: scaleY(0.08); }
  25%, 32% { transform: scaleY(0.74); }
  33%, 100% { transform: scaleY(0.08); }
}
@keyframes lrTutWindow {
  from { transform: scaleX(1); }
  to   { transform: scaleX(0.05); }
}
.lr-tut-scene  { animation: lrTutScene 6.6s ease-in-out infinite; }
.lr-tut-banner { animation: lrTutBanner 6.6s cubic-bezier(0.22,1,0.36,1) infinite; }
.lr-tut-tick   { transform-box: fill-box; transform-origin: center; animation: lrTutTick 6.6s cubic-bezier(0.34,1.56,0.64,1) infinite; }
.lr-tut-tap    { animation: lrTutTap 6.6s ease-in-out infinite; }
.lr-tut-ripple { transform-box: fill-box; transform-origin: center; animation: lrTutRipple 6.6s ease-out infinite; }
.lr-tut-swipe  { animation: lrTutSwipeHand 6.6s ease-in-out infinite; }
.lr-tut-sign   { stroke-dasharray: 96; animation: lrTutSign 6.6s ease-out infinite; }
.lr-tut-hold   { animation: lrTutHoldHand 6.6s ease-in-out infinite; }
.lr-tut-grow   { transform-box: fill-box; transform-origin: bottom; animation: lrTutGrow 6.6s cubic-bezier(0.4,0,0.2,1) infinite; }
.lr-tut-window { transform-box: fill-box; transform-origin: left center; animation: lrTutWindow 2.2s linear infinite; }
.lr-d2 { animation-delay: -4.4s; }
.lr-d3 { animation-delay: -2.2s; }
@media (prefers-reduced-motion: reduce) {
  .lr-tut-scene, .lr-tut-banner, .lr-tut-tick, .lr-tut-tap, .lr-tut-ripple,
  .lr-tut-swipe, .lr-tut-sign, .lr-tut-hold, .lr-tut-grow, .lr-tut-window { animation: none !important; }
}
`;

/** The finger glyph that performs every verb in the demo. */
function TutHand({ scale = 1.5 }) {
  return (
    <g transform={`scale(${scale})`}>
      <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" fill="none" stroke="#FACC15" strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  );
}

/** The cleared-scene mark. */
function TutTick({ x, y, delayCls }) {
  return (
    <g className={`lr-tut-tick ${delayCls}`} transform={`translate(${x} ${y})`}>
      <circle r="15" fill={GREEN} />
      <path d="M-7 0 L-2 5.5 L7.5 -5.5" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
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
      <style dangerouslySetInnerHTML={{ __html: LR_TUT_CSS }} />

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
          background: 'linear-gradient(180deg, #0D1A33 0%, #0A1E42 50%, #061229 100%)',
          border: '1px solid rgba(255,255,255,0.07)',
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          <svg width="100%" viewBox="0 0 300 196" aria-hidden="true" style={{ display: 'block' }}>
            {/* HUD: the action window draining, and the three shield lives. */}
            <rect x="16" y="14" width="200" height="7" rx="3.5" fill="rgba(255,255,255,0.14)" />
            <rect className="lr-tut-window" x="16" y="14" width="200" height="7" rx="3.5" fill={ORANGE_LT} />
            {[0, 1, 2].map((i) => (
              <path key={i} transform={`translate(${232 + i * 20} 10)`}
                d="M9 0 1 2.8v5.2c0 4.4 3.1 7.9 8 9.7 4.9-1.8 8-5.3 8-9.7V2.8L9 0z"
                fill="rgba(30,107,224,0.9)" stroke="#A6D0FF" strokeWidth="1.2" />
            ))}

            {/* ── Scene 1: tap a fixed target (the PAY family). ── */}
            <g className="lr-tut-scene">
              <g className="lr-tut-banner">
                <rect x="20" y="34" width="260" height="26" rx="6" fill={ORANGE} opacity="0.92" />
                <g transform="translate(150 47)" stroke="#fff" strokeWidth="2.6" fill="none">
                  <circle r="4.5" fill="#fff" stroke="none" />
                  <circle r="10" opacity="0.85" />
                </g>
              </g>
              <rect x="96" y="78" width="108" height="72" rx="10" fill="#1E6BE0" />
              <rect x="104" y="86" width="92" height="9" rx="4.5" fill="#F4F7FD" opacity="0.85" />
              <rect x="104" y="100" width="60" height="6" rx="3" fill="#9FB1CC" />
              <circle cx="150" cy="128" r="17" fill={ORANGE} />
              <circle className="lr-tut-ripple" cx="150" cy="128" r="17" fill="none" stroke={GOLD} strokeWidth="2.6" />
              <g className="lr-tut-tap" transform="translate(150 140)">
                <g transform="translate(-12 0)"><TutHand /></g>
              </g>
              <TutTick x={150} y={128} delayCls="" />
            </g>

            {/* ── Scene 2: swipe along a path (the SIGN family). ── */}
            <g className="lr-tut-scene lr-d2">
              <g className="lr-tut-banner lr-d2">
                <rect x="20" y="34" width="260" height="26" rx="6" fill={ORANGE} opacity="0.92" />
                <g transform="translate(150 47)" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M-14 0 H12" />
                  <path d="M5 -7 L12 0 L5 7" />
                </g>
              </g>
              <rect x="84" y="78" width="132" height="72" rx="8" fill="#F4F7FD" />
              <rect x="94" y="88" width="82" height="5" rx="2.5" fill="#CBD8EC" />
              <rect x="94" y="99" width="104" height="5" rx="2.5" fill="#CBD8EC" />
              <path d="M98 128 H198" stroke="#9FB1CC" strokeWidth="2.4" strokeDasharray="6 5" strokeLinecap="round" />
              <path className="lr-tut-sign lr-d2" d="M98 128 H198" stroke={GREEN} strokeWidth="4.6" strokeLinecap="round" fill="none" />
              <g className="lr-tut-swipe lr-d2" transform="translate(148 136)">
                <g transform="translate(-12 0)"><TutHand /></g>
              </g>
              <TutTick x={216} y={128} delayCls="lr-d2" />
            </g>

            {/* ── Scene 3: hold and release into a band (the GROW family). ── */}
            <g className="lr-tut-scene lr-d3">
              <g className="lr-tut-banner lr-d3">
                <rect x="20" y="34" width="260" height="26" rx="6" fill={ORANGE} opacity="0.92" />
                <g transform="translate(150 47)">
                  <circle r="5" fill="#fff" />
                  <circle r="10.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeDasharray="4 3.4" />
                </g>
              </g>
              <rect x="126" y="76" width="48" height="74" rx="9" fill="rgba(255,255,255,0.07)" stroke={GOLD} strokeWidth="1.8" />
              <rect className="lr-tut-grow lr-d3" x="130" y="80" width="40" height="66" rx="6" fill={GOLD} />
              <rect x="122" y="94" width="56" height="14" rx="4" fill="none" stroke={GREEN_LT} strokeWidth="2.4" strokeDasharray="5 4" />
              <g className="lr-tut-hold lr-d3" transform="translate(150 152)">
                <g transform="translate(-12 0)"><TutHand /></g>
              </g>
              <TutTick x={196} y={112} delayCls="lr-d3" />
            </g>
          </svg>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <circle cx="13" cy="13" r="4" fill={ORANGE} />
              <circle cx="13" cy="13" r="9" stroke={ORANGE_LT} strokeWidth="2.2" />
              <path d="M20 6 L24 2 M6 20 L2 24" stroke={ORANGE_LT} strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          }>Tap, swipe or hold</TutLabel>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              <circle cx="13" cy="15" r="9" stroke={GOLD} strokeWidth="2.2" />
              <path d="M9 2h8M13 2v3M13 15V9" stroke={GOLD} strokeWidth="2.2" strokeLinecap="round" />
              <path d="M13 15 L18 18" stroke={DANGER} strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          }>Beat the clock</TutLabel>
          <TutLabel icon={
            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <path key={i} transform={`translate(${i * 8} 6)`}
                  d="M5 0 1 1.6v3c0 2.5 1.6 4.5 4 5.5 2.4-1 4-3 4-5.5v-3L5 0z"
                  fill="rgba(30,107,224,0.9)" stroke="#A6D0FF" strokeWidth="1" />
              ))}
            </svg>
          }>Three shields only</TutLabel>
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
  const cfg = GAME_CONFIG;
  const score = stats?.score || 0;
  const cleared = stats?.cleared || 0;
  const bestStreak = stats?.bestStreak || 0;
  const perfects = stats?.perfects || 0;
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
    const shareMessage = `Hi,\nI cleared ${cleared} of ${cfg.gamesPerRun} microgames for ${score} points in the ${GAME_TITLE} challenge.\nLife comes at you fast - the right cover is what keeps up. Take your turn here: ${shareUrl}`.trim();

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
          {won ? <BeatClockIcon size={20} /> : <BrokenShieldIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'You kept up' : 'Life got ahead'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: ORANGE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your rush.</span>
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
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.55)', marginTop: 5, letterSpacing: '0.16em' }}>
              POINTS
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              {cleared} of {cfg.gamesPerRun} cleared
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, cleared, bestStreak, perfects} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Cleared" value={`${cleared}/${cfg.gamesPerRun}`} accent={GREEN_LT} />
        <StatTile label="Best streak" value={`x${bestStreak}`} accent={ORANGE_LT} />
        <StatTile label="Perfects" value={perfects} accent={GOLD} />
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
          Real life does not hand you a command word. A specialist can set up the cover that
          answers before you have to.
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
