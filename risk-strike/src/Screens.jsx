// Screens.jsx — Home, How to Play, and Results screens for Risk Strike.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE, RISK_LABELS } from './data.js';

const GAME_TITLE = 'Risk Strike';

/* Brand palette, inlined so the screens never depend on the canvas palette. */
const BLUE = '#003DA6';
const BLUE_LT = '#1E6BE0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const VIRUS = '#49E24B';
const VIRUS_CORE = '#0E5C1D';
const DANGER = '#EF4444';

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

/** Run-ended mark: the risk that stayed standing. */
function RiskIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="8" fill="#fff" />
      <circle cx="16" cy="16" r="3.6" fill="rgba(11,18,33,0.6)" />
      <g stroke="#fff" strokeWidth="2.4" strokeLinecap="round">
        <path d="M16 5v3.5M16 23.5V27M5 16h3.5M23.5 16H27" />
        <path d="M8.2 8.2l2.5 2.5M21.3 21.3l2.5 2.5M23.8 8.2l-2.5 2.5M10.7 21.3l-2.5 2.5" />
      </g>
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
@keyframes rsTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes rsFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes rsGlow    { 0%,100% { opacity: 0.35; } 50% { opacity: 0.9; } }
@keyframes rsRoll {
  0%      { transform: translate(0, 0) scale(1); opacity: 0; }
  12%     { opacity: 1; }
  62%     { transform: translate(4px, -74px) scale(0.42); opacity: 1; }
  70%,100%{ transform: translate(4px, -74px) scale(0.42); opacity: 0; }
}
@keyframes rsPinFall {
  0%,60%  { transform: rotate(0deg); opacity: 1; }
  74%     { transform: rotate(38deg); opacity: 1; }
  88%,100%{ transform: rotate(74deg); opacity: 0.15; }
}
@keyframes rsChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes rsBeatFlick {
  0%,10%  { transform: translate(0, 14px); opacity: 0; }
  22%     { transform: translate(0, 14px); opacity: 1; }
  46%     { transform: translate(2px, -14px); opacity: 1; }
  56%,100%{ transform: translate(2px, -20px); opacity: 0; }
}
@keyframes rsBeatBall {
  0%,44%  { transform: translate(0,0) scale(1); opacity: 1; }
  86%     { transform: translate(2px,-30px) scale(0.5); opacity: 1; }
  92%,100%{ transform: translate(2px,-30px) scale(0.5); opacity: 0; }
}
@keyframes rsBeatHook {
  0%,40%  { transform: translate(0,0) scale(1); opacity: 1; }
  60%     { transform: translate(-13px,-14px) scale(0.72); }
  86%     { transform: translate(6px,-30px) scale(0.5); opacity: 1; }
  92%,100%{ transform: translate(6px,-30px) scale(0.5); opacity: 0; }
}
@keyframes rsBeatMark { 0%,66% { opacity: 0; transform: scale(0.6); } 80%,100% { opacity: 1; transform: scale(1); } }
.rs-title { animation: rsTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-float { animation: rsFloat 4s ease-in-out infinite; }
.rs-glow  { animation: rsGlow 2.4s ease-in-out infinite; }
.rs-roll  { animation: rsRoll 3.4s cubic-bezier(0.4,0,0.7,1) infinite; }
.rs-fall  { animation: rsPinFall 3.4s ease-in-out infinite; }
.rs-chip  { animation: rsChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-flick { animation: rsBeatFlick 2.6s ease-in-out infinite; }
.rs-bball { animation: rsBeatBall 2.6s cubic-bezier(0.4,0,0.7,1) infinite; }
.rs-hook  { animation: rsBeatHook 2.6s cubic-bezier(0.4,0,0.7,1) infinite; }
.rs-mark  { animation: rsBeatMark 2.6s cubic-bezier(0.22,1,0.36,1) infinite; transform-origin: 37px 14px; }
@media (prefers-reduced-motion: reduce) {
  .rs-title, .rs-float, .rs-glow, .rs-roll, .rs-fall, .rs-chip,
  .rs-flick, .rs-bball, .rs-hook, .rs-mark { animation: none !important; }
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

/* ─── Shared vector parts ────────────────────────────────── */
/** A virus bottle pin — the same silhouette the canvas rasterises. */
function VirusPin({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <g fill={VIRUS_CORE}>
        <path d="M-5 -10 l-4 -3 l4 -2 z" />
        <path d="M5 -10 l4 -3 l-4 -2 z" />
        <path d="M0 -23 l0 -4 l3 3 z" />
      </g>
      <path
        d="M-5 0 L-5 -8 Q-5 -13 -2 -15 L-2 -20 Q-2 -23 0 -23 Q2 -23 2 -20 L2 -15 Q5 -13 5 -8 L5 0 Z"
        fill="url(#rsPinFill)"
        stroke="rgba(6,44,20,0.6)"
        strokeWidth="0.7"
      />
      <rect x="-4.4" y="-16" width="8.8" height="2.2" fill="rgba(255,255,255,0.85)" />
      <circle cx="0" cy="-8" r="2.4" fill={VIRUS_CORE} />
    </g>
  );
}

/** The shield ball. */
function ShieldBall({ x, y, r = 9 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={r} fill="url(#rsBall)" stroke="rgba(190,222,255,0.8)" strokeWidth="1" />
      <path
        d={`M0 ${-r * 0.55} L${r * 0.44} ${-r * 0.25} L${r * 0.44} ${r * 0.12}`
          + ` Q${r * 0.34} ${r * 0.5} 0 ${r * 0.58}`
          + ` Q${-r * 0.34} ${r * 0.5} ${-r * 0.44} ${r * 0.12}`
          + ` L${-r * 0.44} ${-r * 0.25} Z`}
        fill="rgba(255,255,255,0.92)"
      />
    </g>
  );
}

/** Gradient definitions shared by every diagram on these screens. */
function VectorDefs() {
  return (
    <defs>
      <linearGradient id="rsHall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#061634" />
        <stop offset="100%" stopColor="#0A2444" />
      </linearGradient>
      <linearGradient id="rsLane" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0F2B52" />
        <stop offset="100%" stopColor="#2B5FA6" />
      </linearGradient>
      <radialGradient id="rsBall" cx="0.35" cy="0.32" r="0.75">
        <stop offset="0%" stopColor="#BBD9FF" />
        <stop offset="45%" stopColor={BLUE_LT} />
        <stop offset="100%" stopColor="#00205C" />
      </radialGradient>
      <linearGradient id="rsPinFill" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#127A28" />
        <stop offset="50%" stopColor={VIRUS} />
        <stop offset="100%" stopColor="#B6FBAE" />
      </linearGradient>
    </defs>
  );
}

/* ─── Home ───────────────────────────────────────────────── */
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
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="rs-title" style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 8px 0',
          textShadow: '0 2px 10px rgba(0,0,0,0.55)',
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12.5,
          fontWeight: 800,
          color: ORANGE_LT,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          maxWidth: 300,
        }}>
          One decisive shot. Knock out every risk.
        </p>
      </div>

      {/* Hero: the lane itself, in the same perspective the canvas draws. */}
      <div className="rs-float" style={{ position: 'relative', width: 262, height: 236, zIndex: 1 }}>
        <svg width="262" height="236" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <VectorDefs />
          <clipPath id="rsClipHome"><rect x="4" y="4" width="192" height="172" rx="26" /></clipPath>

          <rect x="4" y="4" width="192" height="172" rx="26" fill="url(#rsHall)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#rsClipHome)">
            {/* Back wall + masking unit */}
            <rect x="4" y="4" width="192" height="58" fill="#0B2C58" opacity="0.75" />
            <rect x="52" y="14" width="96" height="40" rx="7" fill="rgba(4,14,32,0.9)" stroke="rgba(126,184,255,0.25)" />
            <rect className="rs-glow" x="56" y="26" width="88" height="3" fill={BLUE_LT} />
            <rect className="rs-glow" x="62" y="38" width="76" height="2.5" fill={ORANGE} />

            {/* Gutters + lane */}
            <polygon points="52,58 148,58 178,168 22,168" fill="#0A1730" />
            <polygon points="60,58 140,58 164,168 36,168" fill="url(#rsLane)" />
            <g stroke="rgba(255,255,255,0.07)" strokeWidth="1">
              <line x1="80" y1="58" x2="68" y2="168" />
              <line x1="100" y1="58" x2="100" y2="168" />
              <line x1="120" y1="58" x2="132" y2="168" />
            </g>
            <polygon points="60,58 140,58 164,168 36,168" fill="rgba(214,236,255,0.09)" />

            {/* Arrows */}
            <g fill="rgba(255,200,69,0.45)">
              <polygon points="100,112 104,120 96,120" />
              <polygon points="86,118 90,126 82,126" />
              <polygon points="114,118 118,126 110,126" />
            </g>

            {/* The rack, back row first */}
            <VirusPin x={86} y={70} s={0.5} />
            <VirusPin x={100} y={70} s={0.5} />
            <VirusPin x={114} y={70} s={0.5} />
            <VirusPin x={93} y={79} s={0.56} />
            <g className="rs-fall" style={{ transformOrigin: '107px 79px' }}>
              <VirusPin x={107} y={79} s={0.56} />
            </g>
            <g className="rs-fall" style={{ transformOrigin: '100px 90px', animationDelay: '0.06s' }}>
              <VirusPin x={100} y={90} s={0.64} />
            </g>

            {/* Ball rolling up the lane */}
            <g className="rs-roll">
              <ShieldBall x={98} y={152} r={13} />
            </g>

            {/* Foul line */}
            <line x1="36" y1="168" x2="164" y2="168" stroke={ORANGE_LT} strokeWidth="2" opacity="0.8" />
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
/** One beat of the flick - hook - strike loop. Pure CSS-animated SVG. */
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

/** A miniature lane for the tutorial diagrams. */
function BeatLane() {
  return (
    <g>
      <polygon points="26,8 48,8 66,58 8,58" fill="#0A1730" />
      <polygon points="29,8 45,8 60,58 14,58" fill="url(#rsLane)" />
      <polygon points="29,8 45,8 60,58 14,58" fill="rgba(214,236,255,0.08)" />
    </g>
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
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
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
        <p style={{
          fontSize: 10.5, fontWeight: 900, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: ORANGE_LT, margin: '0 0 16px 0',
        }}>
          Flick to bowl &middot; Curl your swipe for spin &middot; Strike out the risks
        </p>

        <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
          <VectorDefs />
        </svg>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Flick to bowl" copy="A faster flick is a heavier ball. The dotted line shows your line to the arrows.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatLane />
              <g stroke="#BBD9FF" strokeWidth="1.6" strokeDasharray="2 4" opacity="0.8">
                <line x1="37" y1="46" x2="38" y2="26" />
              </g>
              <g className="rs-bball"><ShieldBall x={37} y={48} r={7} /></g>
              <g className="rs-flick" stroke={ORANGE_LT} strokeWidth="2.4" strokeLinecap="round" fill="none">
                <path d="M37 54 L37 40" />
                <path d="M33 44 L37 39 L41 44" />
              </g>
            </svg>
          </Beat>

          <Beat n="2" title="Curl for the hook" copy="Curve your swipe and the ball bends late — the way to reach a corner pin.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatLane />
              <path d="M37 50 Q24 36 42 22" stroke={ORANGE_LT} strokeWidth="1.6" strokeDasharray="2 4" fill="none" opacity="0.85" />
              <g className="rs-hook"><ShieldBall x={37} y={50} r={7} /></g>
              <VirusPin x={45} y={24} s={0.42} />
            </svg>
          </Beat>

          <Beat n="3" title="Clear the rack" copy="Ten risks, five frames, two balls each. Strikes and spares carry bonuses.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <BeatLane />
              <g className="rs-fall" style={{ transformOrigin: '30px 34px' }}>
                <VirusPin x={30} y={34} s={0.44} />
              </g>
              <g className="rs-fall" style={{ transformOrigin: '44px 34px', animationDelay: '0.08s' }}>
                <VirusPin x={44} y={34} s={0.44} />
              </g>
              <g className="rs-fall" style={{ transformOrigin: '37px 44px', animationDelay: '0.04s' }}>
                <VirusPin x={37} y={44} s={0.5} />
              </g>
              <g className="rs-mark">
                <rect x="24" y="4" width="26" height="18" rx="9" fill={GOLD} />
                <text x="37" y="17" fill="#3B2500" fontSize="12" fontWeight="900" textAnchor="middle"
                  fontFamily="'Plus Jakarta Sans', 'Poppins', sans-serif">X</text>
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 16px 0', lineHeight: 1.4 }}>
          Knock down{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.winPins} risks</strong> across{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.frames} frames</strong> in{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong> to win.
        </p>

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
      padding: '10px 6px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const pins = stats?.pins || 0;
  const strikes = stats?.strikes || 0;
  const spares = stats?.spares || 0;
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
    const shareMessage = `Hi,\nI knocked down ${pins} risks and scored ${score} points in the ${GAME_TITLE} challenge.\nOne decisive shot clears them all. Take yours here: ${shareUrl}`.trim();

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
  const strokeColor = won ? GREEN : score < 250 ? DANGER : GOLD;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 250 ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
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
          {won ? <TrophyIcon size={20} /> : <RiskIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Risks cleared' : 'Risks still standing'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your game.</span>
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
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Pins" value={`${pins}/${GAME_CONFIG.winPins}`} accent={GOLD} />
        <StatTile label="Strikes" value={strikes} accent={GREEN} />
        <StatTile label="Spares" value={spares} accent={BLUE_LT} />
      </div>

      {/* The four named risks */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {RISK_LABELS.map((label, i) => (
          <span
            key={label}
            className="rs-chip"
            style={{
              animationDelay: `${180 + i * 90}ms`,
              fontSize: 10.5,
              fontWeight: 800,
              padding: '5px 11px',
              borderRadius: 999,
              color: won ? '#fff' : 'rgba(255,255,255,0.72)',
              background: won ? 'rgba(40,167,69,0.85)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${won ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
            }}
          >
            {label}
          </span>
        ))}
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
          One shot cleared the pins. One policy can cover the risks behind them.
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
