// Screens.jsx — Home, How to Play, and Results screens for Risk Strike.
//
// Identity: IMPACT. Ignition orange (#FF6A1A) over near-black, and one shape
// language everywhere — concentric rings. Timing rings around the ball, shock
// rings at the point of contact, the score ring on Results, the ring glyph in
// the HUD. Nothing else in the catalog is built on that, which is what stops
// this screen set reading like its neighbours.
//
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE, RISK_LABELS } from './data.js';

const GAME_TITLE = 'Risk Strike';

/* Palette, inlined so the screens never depend on the canvas palette. */
const BLUE = '#003DA6';
const BLUE_LT = '#2E7BF0';
const ORANGE = '#F26522';
const ORANGE_LT = '#FF8A3D';
const GREEN = '#28A745';
const GOLD = '#FFC845';
const GOLD_LT = '#FFE38A';
const VIRUS = '#3FD34A';
const VIRUS_RIM = '#C6FFB4';
const DANGER = '#FF5A5A';

/* The signature accent. */
const IMPACT = '#FF6A1A';
const IMPACT_HOT = '#FFE0B8';

/* Ground: near-black, so the gameplay objects are the only bright things. */
const INK = '#050912';
const PAGE_BG = `radial-gradient(ellipse at 50% 30%, rgba(255,106,26,0.16), rgba(5,9,18,0) 58%),
                 radial-gradient(ellipse at 50% 74%, rgba(0,61,166,0.34), rgba(5,9,18,0) 66%), ${INK}`;

/* One spacing scale on every screen: 6 / 12 / 18 / 26.
   Two button heights: 56 primary, 48 secondary. */
const H_PRIMARY = 56;
const H_SECONDARY = 48;

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
      <circle cx="16" cy="16" r="3.6" fill="rgba(5,9,18,0.62)" />
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

/* ─── Label glyphs for How to Play ───────────────────────
   Each of the three allowed labels is led by a glyph, and the glyph carries the
   meaning; the words are there only to name it. */
function FlickGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 20.5V6" stroke={IMPACT} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M7.4 10.6 12 5.6l4.6 5" stroke={IMPACT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="20.6" r="2.6" fill="#fff" />
    </svg>
  );
}

function CurlGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 21.4C4.8 15.6 9 8 17 5.2" stroke={BLUE_LT} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M12.6 5.4 17.6 4.8l-1.3 4.8" stroke={BLUE_LT} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClearGlyph({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke={GOLD} strokeWidth="2.2" />
      <path d="M8.2 8.2l7.6 7.6M15.8 8.2l-7.6 7.6" stroke={GOLD_LT} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Shared keyframes ─────────────────────────────────────
   The demo loop and the home hero run on one 3.2 s clock so the beats line up:
   flick, travel, contact, shockwave, topple, mark. */
const SCREEN_CSS = `
@keyframes rsTitleIn { from { opacity: 0; letter-spacing: 0.26em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.03em; transform: none; } }
@keyframes rsFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes rsChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes rsCtaPulse {
  0%,100% { box-shadow: 0 6px 22px rgba(242,101,34,0.42), 0 0 0 0 rgba(255,106,26,0.34); }
  50%     { box-shadow: 0 6px 22px rgba(242,101,34,0.42), 0 0 0 9px rgba(255,106,26,0); }
}
@keyframes rsTitleRing {
  0%       { transform: scale(0.55); opacity: 0; }
  22%      { opacity: 0.5; }
  100%     { transform: scale(1.7); opacity: 0; }
}

/* --- the one demo loop, used by How to Play and the Home hero --- */
@keyframes rsDemoFinger {
  0%,4%    { transform: translate(0,0); opacity: 0; }
  9%       { transform: translate(0,0); opacity: 1; }
  26%      { transform: translate(-9px,-26px); opacity: 1; }
  40%      { transform: translate(3px,-48px); opacity: 0.85; }
  47%,100% { transform: translate(3px,-48px); opacity: 0; }
}
@keyframes rsDemoTrack {
  0%,10%   { opacity: 0; stroke-dashoffset: 70; }
  20%      { opacity: 0.9; }
  44%      { opacity: 0.9; stroke-dashoffset: 0; }
  60%,100% { opacity: 0; stroke-dashoffset: 0; }
}
@keyframes rsDemoBall {
  0%,12%   { transform: translate(0,0) scale(1); opacity: 1; }
  30%      { transform: translate(-12px,-30px) scale(0.74); opacity: 1; }
  50%      { transform: translate(1px,-64px) scale(0.4); opacity: 1; }
  55%,100% { transform: translate(1px,-64px) scale(0.36); opacity: 0; }
}
@keyframes rsDemoShock {
  0%,50%   { transform: scale(0.18); opacity: 0; }
  55%      { transform: scale(0.5); opacity: 1; }
  76%,100% { transform: scale(2.5); opacity: 0; }
}
@keyframes rsDemoFlash {
  0%,50%   { opacity: 0; }
  55%      { opacity: 0.9; }
  68%,100% { opacity: 0; }
}
@keyframes rsDemoPin {
  0%,52%   { transform: rotate(0deg); opacity: 1; }
  68%      { transform: rotate(48deg); opacity: 1; }
  84%,100% { transform: rotate(80deg); opacity: 0.1; }
}
@keyframes rsDemoMark {
  0%,64%   { opacity: 0; transform: scale(0.4); }
  72%      { opacity: 1; transform: scale(1.2); }
  79%      { transform: scale(1); }
  93%      { opacity: 1; }
  100%     { opacity: 0; transform: scale(1); }
}

.rs-title  { animation: rsTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-float  { animation: rsFloat 4s ease-in-out infinite; }
.rs-chip   { animation: rsChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-cta    { animation: rsCtaPulse 2.4s ease-in-out infinite; }
.rs-tring  { animation: rsTitleRing 3.2s ease-out infinite; }
.rs-finger { animation: rsDemoFinger 3.2s cubic-bezier(0.4,0,0.6,1) infinite; }
.rs-track  { animation: rsDemoTrack 3.2s cubic-bezier(0.4,0,0.6,1) infinite; }
.rs-dball  { animation: rsDemoBall 3.2s cubic-bezier(0.35,0,0.7,1) infinite; }
.rs-shock  { animation: rsDemoShock 3.2s cubic-bezier(0.2,0.7,0.3,1) infinite; }
.rs-flash  { animation: rsDemoFlash 3.2s ease-out infinite; }
.rs-dpin   { animation: rsDemoPin 3.2s cubic-bezier(0.3,0.1,0.4,1) infinite; }
.rs-dmark  { animation: rsDemoMark 3.2s cubic-bezier(0.22,1,0.36,1) infinite; }

@media (prefers-reduced-motion: reduce) {
  .rs-title, .rs-float, .rs-chip, .rs-cta, .rs-tring, .rs-finger, .rs-track,
  .rs-dball, .rs-shock, .rs-flash, .rs-dpin, .rs-dmark { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [GOLD, GOLD_LT, IMPACT, ORANGE_LT, BLUE_LT, GREEN, '#EC4899'];
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

/* ─── Shared vector parts ──────────────────────────────────
   The same three objects the canvas draws, at screen scale: bottle, ball,
   shockwave. Layered fills, rim light on both sides, contact shadow. */

/** A virus bottle pin. */
function VirusPin({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx="0" cy="0.6" rx="5.4" ry="1.5" fill="rgba(0,0,0,0.45)" />
      <g fill="#0E6420">
        <path d="M-5 -10 l-4.4 -3 l4.4 -2 z" />
        <path d="M5 -10 l4.4 -3 l-4.4 -2 z" />
        <path d="M0 -23.4 l0 -4.2 l3.2 3.2 z" />
      </g>
      <path
        d="M-5 0 L-5 -8 Q-5 -13 -2 -15 L-2 -20 Q-2 -23 0 -23 Q2 -23 2 -20 L2 -15 Q5 -13 5 -8 L5 0 Z"
        fill="url(#rsPinFill)"
        stroke="rgba(2,18,8,0.8)"
        strokeWidth="0.7"
      />
      <path
        d="M-5 0 L-5 -8 Q-5 -13 -2 -15 L-2 -20 Q-2 -23 0 -23"
        fill="none" stroke={VIRUS_RIM} strokeWidth="0.8" opacity="0.6"
      />
      <path
        d="M5 0 L5 -8 Q5 -13 2 -15 L2 -20 Q2 -23 0 -23"
        fill="none" stroke={IMPACT} strokeWidth="0.7" opacity="0.5"
      />
      <rect x="-4.4" y="-16" width="8.8" height="2.2" fill="rgba(255,255,255,0.88)" />
      <circle cx="0" cy="-8" r="2.4" fill="#06380F" />
    </g>
  );
}

/** The shield ball: gradient body, two rim lights, shield emblem. */
function ShieldBall({ x, y, r = 9 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx="0" cy={r * 0.72} rx={r * 0.86} ry={r * 0.3} fill="rgba(0,0,0,0.4)" />
      <circle cx="0" cy="0" r={r} fill="url(#rsBall)" />
      <path
        d={`M ${-r * 0.93} 0 A ${r * 0.93} ${r * 0.93} 0 0 1 0 ${-r * 0.93}`}
        fill="none" stroke="rgba(214,232,255,0.9)" strokeWidth={Math.max(0.8, r * 0.11)} strokeLinecap="round"
      />
      <path
        d={`M ${r * 0.9} ${r * 0.24} A ${r * 0.93} ${r * 0.93} 0 0 1 ${r * 0.28} ${r * 0.89}`}
        fill="none" stroke="rgba(255,138,61,0.9)" strokeWidth={Math.max(0.8, r * 0.11)} strokeLinecap="round"
      />
      <path
        d={`M0 ${-r * 0.55} L${r * 0.44} ${-r * 0.25} L${r * 0.44} ${r * 0.12}`
          + ` Q${r * 0.34} ${r * 0.5} 0 ${r * 0.58}`
          + ` Q${-r * 0.34} ${r * 0.5} ${-r * 0.44} ${r * 0.12}`
          + ` L${-r * 0.44} ${-r * 0.25} Z`}
        fill="rgba(255,255,255,0.94)"
      />
    </g>
  );
}

/** Gradient definitions shared by every diagram on these screens. */
function VectorDefs() {
  return (
    <defs>
      <linearGradient id="rsHall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#04070F" />
        <stop offset="100%" stopColor="#0A1428" />
      </linearGradient>
      <linearGradient id="rsLane" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#070D1B" />
        <stop offset="55%" stopColor="#12203C" />
        <stop offset="100%" stopColor="#1B2C4E" />
      </linearGradient>
      <radialGradient id="rsBall" cx="0.34" cy="0.3" r="0.78">
        <stop offset="0%" stopColor="#D6E8FF" />
        <stop offset="40%" stopColor={BLUE_LT} />
        <stop offset="100%" stopColor="#001A4A" />
      </radialGradient>
      <linearGradient id="rsPinFill" x1="0" y1="1" x2="1" y2="0">
        <stop offset="0%" stopColor="#0E6420" />
        <stop offset="50%" stopColor={VIRUS} />
        <stop offset="100%" stopColor="#9CF08F" />
      </linearGradient>
      <radialGradient id="rsBloom" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor="rgba(46,123,240,0.42)" />
        <stop offset="100%" stopColor="rgba(46,123,240,0)" />
      </radialGradient>
      <radialGradient id="rsHit" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0%" stopColor={IMPACT_HOT} />
        <stop offset="45%" stopColor="rgba(255,106,26,0.65)" />
        <stop offset="100%" stopColor="rgba(255,106,26,0)" />
      </radialGradient>
    </defs>
  );
}

/**
 * The one animated demo, shared by Home and How to Play.
 *
 * It is the whole game in 3.2 seconds and no words: a thumb flicks up the lane
 * with a curl, the ball follows that exact curl, contact throws a shockwave and
 * a flash, the rack goes down, and the strike mark lands. `withFinger` is the
 * only difference between the two screens — Home shows the outcome, How to Play
 * shows the input that causes it.
 */
function StrikeDemo({ width, height, withFinger }) {
  return (
    <svg width={width} height={height} viewBox="0 0 200 168" aria-hidden="true" style={{ overflow: 'visible' }}>
      <VectorDefs />
      <clipPath id={withFinger ? 'rsClipDemo' : 'rsClipHero'}>
        <rect x="4" y="4" width="192" height="160" rx="24" />
      </clipPath>

      <rect x="4" y="4" width="192" height="160" rx="24" fill="url(#rsHall)"
        stroke="rgba(255,255,255,0.1)" strokeWidth="1.2" />

      <g clipPath={`url(#${withFinger ? 'rsClipDemo' : 'rsClipHero'})`}>
        {/* Arena: bloom, then the target rings that give the game its motif. */}
        <rect x="-40" y="-40" width="280" height="150" fill="url(#rsBloom)" />
        <g fill="none" stroke={IMPACT} opacity="0.16">
          <ellipse cx="100" cy="44" rx="24" ry="16" strokeWidth="1.4" />
          <ellipse cx="100" cy="44" rx="40" ry="26" strokeWidth="1.1" />
          <ellipse cx="100" cy="44" rx="58" ry="37" strokeWidth="0.9" />
        </g>
        <rect x="54" y="10" width="92" height="26" rx="8" fill="rgba(3,6,14,0.9)" />
        <rect x="54" y="34" width="92" height="1.6" fill={IMPACT} opacity="0.65" />

        {/* Gutters, lane, board seams, gloss */}
        <polygon points="52,52 148,52 180,160 20,160" fill="#080E1C" />
        <polygon points="60,52 140,52 166,160 34,160" fill="url(#rsLane)" />
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
          <line x1="80" y1="52" x2="67" y2="160" />
          <line x1="100" y1="52" x2="100" y2="160" />
          <line x1="120" y1="52" x2="133" y2="160" />
        </g>
        <polygon points="60,52 140,52 166,160 34,160" fill="rgba(190,220,255,0.07)" />

        {/* Aiming chevrons */}
        <g stroke={ORANGE_LT} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5">
          <path d="M94 112 L100 105 L106 112" />
          <path d="M80 120 L86 113 L92 120" opacity="0.65" />
          <path d="M108 120 L114 113 L120 120" opacity="0.65" />
        </g>

        {/* Impact flash + shockwave rings, centred on the deck */}
        <circle className="rs-flash" cx="100" cy="62" r="34" fill="url(#rsHit)" />
        <g style={{ transformOrigin: '100px 62px' }}>
          <ellipse className="rs-shock" cx="100" cy="62" rx="16" ry="6"
            fill="none" stroke={IMPACT_HOT} strokeWidth="2.4" style={{ transformOrigin: '100px 62px' }} />
          <ellipse className="rs-shock" cx="100" cy="62" rx="10" ry="4"
            fill="none" stroke={GOLD} strokeWidth="1.8"
            style={{ transformOrigin: '100px 62px', animationDelay: '0.09s' }} />
        </g>

        {/* The rack: back row stands, front three go down on contact */}
        <VirusPin x={86} y={58} s={0.46} />
        <VirusPin x={114} y={58} s={0.46} />
        <g className="rs-dpin" style={{ transformOrigin: '100px 58px' }}>
          <VirusPin x={100} y={58} s={0.46} />
        </g>
        <g className="rs-dpin" style={{ transformOrigin: '92px 68px', animationDelay: '0.05s' }}>
          <VirusPin x={92} y={68} s={0.54} />
        </g>
        <g className="rs-dpin" style={{ transformOrigin: '108px 68px', animationDelay: '0.09s' }}>
          <VirusPin x={108} y={68} s={0.54} />
        </g>
        <g className="rs-dpin" style={{ transformOrigin: '100px 80px', animationDelay: '0.02s' }}>
          <VirusPin x={100} y={80} s={0.62} />
        </g>

        {/* The curl the ball actually takes, drawn as it is drawn in game */}
        <path
          className="rs-track"
          d="M100 140 Q86 112 101 76"
          fill="none" stroke="#CFE4FF" strokeWidth="2" strokeLinecap="round"
          strokeDasharray="4 6" style={{ strokeDashoffset: 70 }}
        />

        {/* Ball, following that curl */}
        <g className="rs-dball" style={{ transformOrigin: '100px 140px' }}>
          <ShieldBall x={100} y={140} r={13} />
        </g>

        {/* Foul line */}
        <line x1="34" y1="160" x2="166" y2="160" stroke={IMPACT} strokeWidth="2.4" opacity="0.85" />

        {/* Thumb doing the flick — only on How to Play */}
        {withFinger && (
          <g className="rs-finger" style={{ transformOrigin: '100px 140px' }}>
            <circle cx="100" cy="141" r="11" fill="rgba(255,255,255,0.16)" />
            <circle cx="100" cy="141" r="7" fill="#fff" />
            <path d="M100 152 L100 163" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.55" />
          </g>
        )}

        {/* The outcome mark */}
        <g className="rs-dmark" style={{ transformOrigin: '100px 26px' }}>
          <rect x="82" y="14" width="36" height="24" rx="12" fill={GOLD} />
          <text x="100" y="31" fill="#2A1500" fontSize="16" fontWeight="900" textAnchor="middle"
            fontFamily="'Plus Jakarta Sans', 'Poppins', sans-serif">X</text>
        </g>
      </g>
    </svg>
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
        padding: '44px 26px 40px',
        background: PAGE_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2, position: 'relative' }}>
        {/* Shockwave behind the wordmark: the motif, stated first. */}
        <div style={{
          position: 'absolute', left: '50%', top: 18, width: 150, height: 150,
          marginLeft: -75, marginTop: -75, pointerEvents: 'none',
        }}>
          {[0, 1].map((i) => (
            <span
              key={i}
              className="rs-tring"
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                border: `1.5px solid ${i === 0 ? IMPACT : BLUE_LT}`,
                animationDelay: `${i * 1.1}s`,
              }}
            />
          ))}
        </div>

        <h1 className="rs-title" style={{
          position: 'relative',
          fontSize: 38,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          lineHeight: 0.94,
          margin: '0 0 12px 0',
          textShadow: '0 2px 14px rgba(0,0,0,0.6)',
        }}>
          Risk<br />Strike
        </h1>
        <p style={{
          position: 'relative',
          fontSize: 12,
          fontWeight: 900,
          color: ORANGE_LT,
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          margin: 0,
        }}>
          One shot. Ten risks.
        </p>
      </div>

      <div className="rs-float" style={{ position: 'relative', width: 268, height: 226, zIndex: 1 }}>
        <StrikeDemo width={268} height={226} withFinger={false} />
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
          className="rs-cta"
          style={{
            width: '100%',
            maxWidth: 320,
            height: H_PRIMARY,
            border: 'none',
            borderRadius: 16,
            fontSize: 19,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
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
   Animation only. One looping demo of the real input and the real outcome,
   three glyph-led labels of three words or fewer, and the Play button. There
   are no instruction sentences on this screen by design: the loop shows the
   thumb flicking with a curl and the rack going down, which is the entire
   mechanic. */
function Label({ glyph, text }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '10px 4px',
      borderRadius: 14,
      background: 'rgba(255,255,255,0.05)',
      border: '1px solid rgba(255,255,255,0.12)',
    }}>
      {glyph}
      <span style={{
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.92)',
        textAlign: 'center',
        lineHeight: 1.25,
      }}>
        {text}
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
        background: PAGE_BG,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{
        background: 'rgba(5,9,18,0.74)',
        border: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 26,
        padding: '18px 18px 18px',
        width: '100%',
        maxWidth: 348,
        boxShadow: '0 16px 44px rgba(0,0,0,0.55)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 22, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 12px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <StrikeDemo width={244} height={205} withFinger />
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
          <Label glyph={<FlickGlyph />} text="Flick up" />
          <Label glyph={<CurlGlyph />} text="Curl to hook" />
          <Label glyph={<ClearGlyph />} text="Clear all ten" />
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            className="rs-cta"
            style={{
              width: '100%', height: H_PRIMARY, border: 'none', borderRadius: 16,
              fontSize: 19, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <PlayIcon size={20} />
            <span>Play Game</span>
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
      <div style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.74)', marginTop: 3 }}>
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
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 250 ? 'rgba(255,90,90,0.4)' : 'rgba(255,200,69,0.4)';

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
        padding: '32px 18px 24px',
        overflowY: 'auto',
        background: PAGE_BG,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 18, width: '100%', maxWidth: 348, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 9,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(40,167,69,0.24)' : 'rgba(255,90,90,0.2)',
          border: `1px solid ${won ? 'rgba(40,167,69,0.55)' : 'rgba(255,90,90,0.5)'}`,
          marginBottom: 12,
        }}>
          {won ? <TrophyIcon size={20} /> : <RiskIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Risks cleared' : 'Risks still standing'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: ORANGE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.88)' }}>Here&rsquo;s your game.</span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18, zIndex: 2 }}>
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
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255,255,255,0.76)', marginTop: 5, letterSpacing: '0.16em' }}>
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 348, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Pins" value={`${pins}/${GAME_CONFIG.winPins}`} accent={GOLD} />
        <StatTile label="Strikes" value={strikes} accent={ORANGE_LT} />
        <StatTile label="Spares" value={spares} accent={BLUE_LT} />
      </div>

      {/* The four named risks */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 348, marginBottom: 18, zIndex: 2,
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
              color: won ? '#fff' : 'rgba(255,255,255,0.82)',
              background: won ? 'rgba(40,167,69,0.85)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${won ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.14)'}`,
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
          height: H_SECONDARY, borderRadius: 14, border: 'none', cursor: 'pointer',
          fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.05em',
          boxShadow: '0 4px 18px rgba(46,123,240,0.4)',
          width: '100%', maxWidth: 300, marginBottom: 18, zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Lead / booking card */}
      <div style={{
        width: '100%', maxWidth: 348,
        background: 'rgba(255,255,255,0.05)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: 22, padding: '18px 16px',
        border: '1px solid rgba(255,255,255,0.12)',
        textAlign: 'center', marginBottom: 18, zIndex: 2,
      }}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 700, lineHeight: 1.35, margin: '0 0 16px 0' }}>
          One shot cleared the pins. One policy can cover the risks behind them.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%', height: H_PRIMARY,
                background: `linear-gradient(180deg, ${ORANGE_LT} 0%, ${ORANGE} 100%)`,
                color: '#fff', fontWeight: 900, borderRadius: 14,
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
                background: 'rgba(255,255,255,0.06)', color: '#fff', fontWeight: 900,
                height: H_SECONDARY, borderRadius: 14,
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
      <div style={{ display: 'flex', gap: 6, width: '100%', maxWidth: 348, marginBottom: 18, zIndex: 2 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 2, height: H_SECONDARY, borderRadius: 14, cursor: 'pointer',
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
            flex: 1, height: H_SECONDARY, borderRadius: 14, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(255,255,255,0.18)',
            color: 'rgba(255,255,255,0.82)', fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 348, opacity: 0.62, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.8, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
