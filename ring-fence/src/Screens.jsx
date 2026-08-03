// Screens.jsx — Home, How to Play, and Results screens for Ring-Fence.
// Structure and design language follow the guardian-shelter gold standard
// (glassmorphism, deep blue, clean buttons); the backdrop is a gradient wash
// rather than a photograph so the game ships with zero binary assets.
import React from 'react';
import { motion } from 'framer-motion';
import { ART, COLORS, GAME_CONFIG } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

// Every screen sits on the same plot sheet the field is drawn on: a measured
// graph rule at two weights, lit unevenly from beneath. It is what makes the
// home screen, the how-to and the results read as one object with the game
// instead of three unrelated gradients.
const SCREEN_BG = [
  `repeating-linear-gradient(90deg, ${ART.screen.major} 0 1px, transparent 1px 60px)`,
  `repeating-linear-gradient(0deg, ${ART.screen.major} 0 1px, transparent 1px 60px)`,
  `repeating-linear-gradient(90deg, ${ART.screen.minor} 0 1px, transparent 1px 12px)`,
  `repeating-linear-gradient(0deg, ${ART.screen.minor} 0 1px, transparent 1px 12px)`,
  'radial-gradient(ellipse 120% 55% at 50% 0%, rgba(30,107,224,0.26), rgba(4,10,25,0) 70%)',
  `radial-gradient(ellipse 130% 50% at 50% 96%, ${ART.sheet.lightbox}, rgba(4,10,25,0) 72%)`,
  `linear-gradient(180deg, ${ART.sheet.top} 0%, ${ART.sheet.base} 55%, ${ART.sheet.bottom} 100%)`,
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

/* ─── Hero vector — the family estate ring-fenced, risks outside ─ */
function HeroArt() {
  return (
    <svg width="100%" height="100%" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
      {/* The plot sheet */}
      <rect x="8" y="8" width="184" height="184" rx="8" fill="rgba(4,11,26,0.62)" stroke="rgba(127,192,255,0.2)" strokeWidth="1"
        style={{ filter: 'drop-shadow(0 10px 22px rgba(0,0,0,0.5))' }} />
      <g clipPath="url(#rfSheetClip)" stroke="rgba(127,192,255,0.12)" strokeWidth="0.6">
        {Array.from({ length: 11 }).map((_, i) => (
          <path key={`v${i}`} d={`M${8 + i * 16.8} 8 V192`} />
        ))}
        {Array.from({ length: 11 }).map((_, i) => (
          <path key={`h${i}`} d={`M8 ${8 + i * 16.8} H192`} />
        ))}
      </g>

      {/* The ring-fence: hatched ownership inside a surveyed boundary */}
      <rect x="52" y="52" width="96" height="96" rx="2" fill="rgba(13,42,92,0.9)" />
      <rect x="52" y="52" width="96" height="96" rx="2" fill="url(#rfHatch)" />
      <rect x="52" y="52" width="96" height="96" rx="2" fill="none" stroke="#3B8DD4" strokeWidth="3"
        style={{ filter: 'drop-shadow(0 0 7px rgba(88,160,255,0.7))' }} />
      <rect x="53.2" y="53.2" width="93.6" height="93.6" rx="1.5" fill="none" stroke="#7FC0FF" strokeWidth="0.9" />
      {/* Dimension ticks stepping round the boundary */}
      <g stroke="rgba(127,192,255,0.55)" strokeWidth="0.8">
        {Array.from({ length: 6 }).map((_, i) => (
          <g key={i}>
            <path d={`M${64 + i * 16} 56 v4`} />
            <path d={`M${64 + i * 16} 144 v-4`} />
            <path d={`M56 ${64 + i * 16} h4`} />
            <path d={`M144 ${64 + i * 16} h-4`} />
          </g>
        ))}
      </g>

      {/* Wealth inside: home + coin stack + family */}
      <g transform="translate(100, 88)">
        <path d="M0,-20 L20,-4 h-5 v16 h-30 v-16 h-5 Z" fill="url(#rfRoof)" />
        <rect x="-4.5" y="2" width="9" height="10" rx="2" fill="#0B1221" />
      </g>
      <g transform="translate(74, 122)">
        <ellipse cx="0" cy="6" rx="10" ry="3.4" fill="#B07B12" />
        <ellipse cx="0" cy="2" rx="10" ry="3.4" fill="#FFC845" />
        <ellipse cx="0" cy="-2" rx="10" ry="3.4" fill="#FFE38A" />
      </g>
      <g transform="translate(122, 118)">
        <circle cx="-6" cy="-4" r="5" fill="#fff" opacity="0.92" />
        <path d="M-13,10 C-13,0 -1,-1 0,2" fill="#fff" opacity="0.92" />
        <circle cx="7" cy="-2" r="4" fill="#fff" opacity="0.8" />
        <path d="M2,10 C2,2 11,1 13,4" fill="#fff" opacity="0.8" />
      </g>

      {/* Risk orbs outside the fence */}
      <g transform="translate(34, 40)">
        <circle cx="0" cy="0" r="9" fill="#49E24B" />
        <path d="M-12,0 L12,0 M0,-12 L0,12 M-8,-8 L8,8 M-8,8 L8,-8" stroke="#49E24B" strokeWidth="2.4" />
        <circle cx="0" cy="0" r="5" fill="#0E5C1D" />
      </g>
      <g transform="translate(168, 74)">
        <circle cx="0" cy="0" r="7" fill="#49E24B" />
        <path d="M-9,0 L9,0 M0,-9 L0,9 M-6,-6 L6,6 M-6,6 L6,-6" stroke="#49E24B" strokeWidth="2" />
        <circle cx="0" cy="0" r="4" fill="#0E5C1D" />
      </g>
      <g transform="translate(56, 170)">
        <circle cx="0" cy="0" r="6" fill="#49E24B" />
        <path d="M-8,0 L8,0 M0,-8 L0,8 M-5.5,-5.5 L5.5,5.5 M-5.5,5.5 L5.5,-5.5" stroke="#49E24B" strokeWidth="1.8" />
        <circle cx="0" cy="0" r="3.4" fill="#0E5C1D" />
      </g>

      {/* Guardian riding the fence */}
      <g transform="translate(148, 100)">
        <path d="M0,-9 C5,-7 8,-4.5 8,-0.5 C8,5 4.5,8.5 0,10 C-4.5,8.5 -8,5 -8,-0.5 C-8,-4.5 -5,-7 0,-9 Z" fill="url(#rfShield)" stroke="#fff" strokeWidth="1.4" style={{ filter: 'drop-shadow(0 0 6px rgba(127,192,255,0.9))' }} />
        <circle cx="0" cy="0.5" r="2.6" fill="#fff" />
      </g>

      <defs>
        <clipPath id="rfSheetClip"><rect x="8" y="8" width="184" height="184" rx="8" /></clipPath>
        <pattern id="rfHatch" width="7" height="7" patternUnits="userSpaceOnUse">
          <path d="M0 7 L7 0" stroke="rgba(140,195,255,0.22)" strokeWidth="0.8" />
        </pattern>
        <linearGradient id="rfRoof" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7FC0FF" />
          <stop offset="100%" stopColor="#1E6BE0" />
        </linearGradient>
        <linearGradient id="rfShield" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8FC4FF" />
          <stop offset="55%" stopColor="#1E6BE0" />
          <stop offset="100%" stopColor="#003DA6" />
        </linearGradient>
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
        justifyContent: 'center',
        // Rhythm scales with the viewport: a 568 px handset gets the same
        // composition as a 915 px one, just tighter. Fixed gaps overflowed.
        gap: 'clamp(12px, 3vh, 26px)',
        padding: 'clamp(16px, 4vh, 32px) 24px clamp(20px, 4vh, 40px)',
        background: SCREEN_BG,
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <span style={{
          display: 'block',
          fontSize: 9,
          fontWeight: 900,
          letterSpacing: '0.34em',
          textTransform: 'uppercase',
          color: 'rgba(127,192,255,0.65)',
          marginBottom: 10,
        }}>
          Bajaj Life
        </span>
        <h1 style={{
          fontSize: 'clamp(30px, 9.5vw, 38px)',
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.035em',
          lineHeight: 0.95,
          margin: '0 0 10px 0',
          textShadow: '0 2px 12px rgba(0, 0, 0, 0.55)',
        }}>
          Ring-Fence
        </h1>
        <p style={{
          fontSize: 12,
          fontWeight: 800,
          color: COLORS.orangeBright,
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          margin: 0,
        }}>
          Wall the risks out of your wealth
        </p>
      </div>

      <div style={{
        position: 'relative',
        width: 'min(276px, 78vw, 38vh)',
        height: 'min(276px, 78vw, 38vh)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <HeroArt />
      </div>

      {/* The brief, stated once, in numbers — hierarchy under the art. */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 320, zIndex: 2 }}>
        {[
          { v: `${GAME_CONFIG.winPct}%`, l: 'to secure' },
          { v: `${GAME_CONFIG.sessionSeconds}s`, l: 'on the clock' },
          { v: `${GAME_CONFIG.lives}`, l: 'shields' },
        ].map((it) => (
          <div key={it.l} style={{
            flex: 1,
            textAlign: 'center',
            padding: '9px 4px',
            borderRadius: 4,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(127,192,255,0.16)',
            boxShadow: 'inset 0 1px 0 rgba(127,192,255,0.28)',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{it.v}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>{it.l}</div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
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
            borderRadius: '12px',
            fontSize: 19,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: 'linear-gradient(180deg, #FF8A3D 0%, #F26522 100%)',
            boxShadow: '0 8px 24px rgba(242, 101, 34, 0.38), inset 0 1px 0 rgba(255,255,255,0.25)',
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

/* ─── How to play ────────────────────────────────────────── */
/* One 6s loop of a real claim on a miniature of the shipping field: the guardian
   rides the safety wall, a dragging finger pulls it off into open ground, the
   orange trail grows up / right / down, touching the wall seals the cut, and the
   pocket floods blue left-to-right the way the 900 px/s colour wave does — while
   two green risk orbs bounce in the ground that is still open. Same wall blue,
   same trail orange, same virus orb sprite as RingFenceGame.jsx. */
const HTP_CSS = `
@keyframes rfGuard {
  0%, 8%    { transform: translate(44px, 190px); }
  30%       { transform: translate(44px, 60px); }
  52%       { transform: translate(130px, 60px); }
  72%, 94%  { transform: translate(130px, 190px); }
  100%      { transform: translate(44px, 190px); }
}
@keyframes rfFinger {
  0%, 6%    { transform: translate(44px, 196px); opacity: 0; }
  12%       { transform: translate(44px, 178px); opacity: 1; }
  33%       { transform: translate(44px, 74px);  opacity: 1; }
  56%       { transform: translate(122px, 66px); opacity: 1; }
  76%       { transform: translate(130px, 182px); opacity: 1; }
  83%, 100% { transform: translate(130px, 194px); opacity: 0; }
}
@keyframes rfPress {
  0%, 8%    { transform: scale(0.5); opacity: 0; }
  13%       { transform: scale(1.1); opacity: 0.9; }
  76%       { transform: scale(1.1); opacity: 0.9; }
  84%, 100% { transform: scale(1.7); opacity: 0; }
}
@keyframes rfTrailV1 {
  0%, 8%    { transform: scaleY(0); opacity: 1; }
  30%, 74%  { transform: scaleY(1); opacity: 1; }
  81%, 100% { transform: scaleY(1); opacity: 0; }
}
@keyframes rfTrailH {
  0%, 30%   { transform: scaleX(0); opacity: 1; }
  52%, 74%  { transform: scaleX(1); opacity: 1; }
  81%, 100% { transform: scaleX(1); opacity: 0; }
}
@keyframes rfTrailV2 {
  0%, 52%   { transform: scaleY(0); opacity: 1; }
  72%, 74%  { transform: scaleY(1); opacity: 1; }
  81%, 100% { transform: scaleY(1); opacity: 0; }
}
@keyframes rfFlood {
  0%, 72%   { transform: scaleX(0); opacity: 0.95; }
  81%, 94%  { transform: scaleX(1); opacity: 0.95; }
  99%, 100% { transform: scaleX(1); opacity: 0; }
}
@keyframes rfNewWall {
  0%, 76%   { opacity: 0; }
  83%, 94%  { opacity: 1; }
  99%, 100% { opacity: 0; }
}
@keyframes rfOrbA {
  0%   { transform: translate(30px, 28px); }
  26%  { transform: translate(92px, 48px); }
  52%  { transform: translate(152px, 24px); }
  78%  { transform: translate(98px, 47px); }
  100% { transform: translate(30px, 28px); }
}
@keyframes rfOrbB {
  0%   { transform: translate(28px, 78px); }
  32%  { transform: translate(37px, 168px); }
  64%  { transform: translate(23px, 108px); }
  100% { transform: translate(28px, 78px); }
}

.rf-guard    { animation: rfGuard 6s linear infinite; }
.rf-finger   { animation: rfFinger 6s linear infinite; }
.rf-press    { animation: rfPress 6s ease-out infinite; transform-origin: 0 0; }
.rf-trail-v1 { animation: rfTrailV1 6s linear infinite; transform-origin: 44px 190px; }
.rf-trail-h  { animation: rfTrailH 6s linear infinite; transform-origin: 44px 60px; }
.rf-trail-v2 { animation: rfTrailV2 6s linear infinite; transform-origin: 130px 60px; }
.rf-flood    { animation: rfFlood 6s cubic-bezier(0.2,0.8,0.3,1) infinite; transform-origin: 45px 0; }
.rf-newwall  { animation: rfNewWall 6s ease-out infinite; }
.rf-orb-a    { animation: rfOrbA 4.1s linear infinite; }
.rf-orb-b    { animation: rfOrbB 3.3s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .rf-guard, .rf-finger, .rf-press, .rf-trail-v1, .rf-trail-h, .rf-trail-v2,
  .rf-flood, .rf-newwall, .rf-orb-a, .rf-orb-b { animation: none !important; }
}
`;

/** The green virus risk orb, same sprite the canvas draws. */
function Orb({ className }) {
  return (
    <g className={className}>
      <circle cx="0" cy="0" r="6" fill={COLORS.virus} />
      <path d="M-7,0 L7,0 M0,-7 L0,7 M-5,-5 L5,5 M-5,5 L5,-5"
        stroke={COLORS.virus} strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="0" cy="0" r="2.8" fill={COLORS.virusDeep} />
    </g>
  );
}

function DemoField() {
  return (
    <svg width="216" height="240" viewBox="0 0 180 200" aria-hidden="true">
      <defs>
        <linearGradient id="rfFloodGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="rgba(30,107,224,0.62)" />
          <stop offset="100%" stopColor="rgba(0,61,166,0.45)" />
        </linearGradient>
        <clipPath id="rfClip"><rect x="4" y="4" width="172" height="192" rx="6" /></clipPath>
        <pattern id="rfDemoHatch" width="8" height="8" patternUnits="userSpaceOnUse">
          <path d="M0 8 L8 0" stroke="rgba(140,195,255,0.14)" strokeWidth="0.8" />
        </pattern>
      </defs>

      <rect x="4" y="4" width="172" height="192" rx="6" fill={ART.sheet.base} />
      {/* The plot sheet's own graph rule */}
      <g clipPath="url(#rfClip)" stroke="rgba(127,192,255,0.09)" strokeWidth="0.6">
        {Array.from({ length: 12 }).map((_, i) => <path key={`v${i}`} d={`M${4 + i * 16} 4 V196`} />)}
        {Array.from({ length: 13 }).map((_, i) => <path key={`h${i}`} d={`M4 ${4 + i * 16} H176`} />)}
      </g>

      <g clipPath="url(#rfClip)">
        {/* The safety wall: a claimed frame two cells thick, hatched and ticked
            exactly as the shipping field draws it */}
        <rect x="10" y="10" width="160" height="180" fill="none" stroke={COLORS.wall} strokeWidth="12"
          opacity="0.5" />
        <rect x="10" y="10" width="160" height="180" fill="none" stroke="url(#rfDemoHatch)" strokeWidth="12" />
        <rect x="10" y="10" width="160" height="180" fill="none" stroke={COLORS.blueLt} strokeWidth="1.6"
          opacity="0.95" style={{ filter: 'drop-shadow(0 0 3px rgba(127,192,255,0.7))' }} />
        <g stroke="rgba(127,192,255,0.45)" strokeWidth="0.8">
          {Array.from({ length: 8 }).map((_, i) => (
            <g key={i}>
              <path d={`M${26 + i * 20} 16 v3.5`} />
              <path d={`M${26 + i * 20} 184 v-3.5`} />
            </g>
          ))}
          {Array.from({ length: 9 }).map((_, i) => (
            <g key={`s${i}`}>
              <path d={`M16 ${26 + i * 20} h3.5`} />
              <path d={`M164 ${26 + i * 20} h-3.5`} />
            </g>
          ))}
        </g>

        {/* The pocket, flooding left to right at the seal */}
        <g className="rf-flood">
          <rect x="45" y="61" width="84" height="123" fill="url(#rfFloodGrad)" />
          <rect x="45" y="61" width="84" height="123" fill="url(#rfDemoHatch)" />
        </g>

        {/* The cut, become wall */}
        <g className="rf-newwall">
          <path d="M44 190 L44 60 L130 60 L130 190" fill="none" stroke={COLORS.wall} strokeWidth="5"
            strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(59,141,212,0.9))' }} />
        </g>

        {/* Risk orbs, bouncing in the ground that is still open */}
        <Orb className="rf-orb-a" />
        <Orb className="rf-orb-b" />

        {/* The live trail — dashed, because it is a provisional construction
            line until the guardian gets it home. Same read as the canvas. */}
        <g stroke={COLORS.orangeBright} strokeWidth="3" strokeDasharray="7 4" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(255,138,61,0.9))' }}>
          <line className="rf-trail-v1" x1="44" y1="190" x2="44" y2="60" />
          <line className="rf-trail-h" x1="44" y1="60" x2="130" y2="60" />
          <line className="rf-trail-v2" x1="130" y1="60" x2="130" y2="190" />
        </g>

        {/* The finger, dragging the guardian off the wall and back to it */}
        <g className="rf-finger">
          <g className="rf-press">
            <circle cx="0" cy="0" r="13" fill="none" stroke="#fff" strokeWidth="2.2" />
          </g>
          <circle cx="0" cy="0" r="8" fill="rgba(255,255,255,0.5)" stroke="#fff" strokeWidth="1.6" />
        </g>

        {/* The guardian */}
        <g className="rf-guard">
          <g transform="scale(0.85) translate(-10,-10)">
            <path d="M10,1.5 C14,3 17,5.5 17,9 C17,13.5 13.8,16.8 10,18.5 C6.2,16.8 3,13.5 3,9 C3,5.5 6,3 10,1.5 Z"
              fill={COLORS.blueBright} stroke="#fff" strokeWidth="1.6"
              style={{ filter: 'drop-shadow(0 0 5px rgba(127,192,255,0.95))' }} />
            <circle cx="10" cy="10" r="3" fill="#fff" />
          </g>
        </g>
      </g>
    </svg>
  );
}

function DragGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="9" cy="15" r="4.2" fill="rgba(255,255,255,0.55)" stroke="#fff" strokeWidth="1.4" />
      <path d="M9 10.5 V4" stroke={COLORS.orangeBright} strokeWidth="2" strokeLinecap="round" />
      <path d="M6.4 6 L9 3 L11.6 6" fill="none" stroke={COLORS.orangeBright} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 15 H20" stroke={COLORS.orangeBright} strokeWidth="2" strokeLinecap="round" />
      <path d="M17.5 12.4 L20.5 15 L17.5 17.6" fill="none" stroke={COLORS.orangeBright} strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClaimGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke={COLORS.wall} strokeWidth="2.4" />
      <rect x="6" y="6" width="12" height="12" rx="1.5" fill="rgba(30,107,224,0.6)" />
      <path d="m8.5 12 2.6 2.6L16 9.6" fill="none" stroke="#fff" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OrbGlyph() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <g transform="translate(12,12)">
        <circle cx="0" cy="0" r="6.5" fill={COLORS.virus} />
        <path d="M-9,0 L9,0 M0,-9 L0,9 M-6.4,-6.4 L6.4,6.4 M-6.4,6.4 L6.4,-6.4"
          stroke={COLORS.virus} strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="0" cy="0" r="3" fill={COLORS.virusDeep} />
      </g>
    </svg>
  );
}

/** icon + one short label. The only words allowed on this screen. */
function Cue({ icon, word }) {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      padding: '9px 2px', borderRadius: 4,
      background: 'rgba(255,255,255,0.045)', border: '1px solid rgba(127,192,255,0.16)',
      boxShadow: 'inset 0 1px 0 rgba(127,192,255,0.22)',
    }}>
      {icon}
      <span style={{
        fontSize: 8.5, fontWeight: 900, letterSpacing: '0.03em', whiteSpace: 'nowrap',
        color: 'rgba(255,255,255,0.78)', textAlign: 'center', lineHeight: 1.1,
      }}>
        {word}
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
      <style dangerouslySetInnerHTML={{ __html: HTP_CSS }} />

      <div style={{
        background: 'rgba(6, 20, 45, 0.72)',
        border: '1px solid rgba(127,192,255,0.18)',
        borderRadius: 10,
        padding: '18px 16px 16px',
        width: '100%',
        maxWidth: 340,
        boxShadow: '0 18px 44px rgba(0,0,0,0.5), inset 0 1px 0 rgba(127,192,255,0.24)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        <h2 style={{
          fontSize: 22,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 4px 0',
          color: '#fff',
        }}>
          How to Play
        </h2>
        <p style={{
          fontSize: 8.5,
          fontWeight: 900,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: 'rgba(127,192,255,0.65)',
          margin: '0 0 6px 0',
        }}>
          One claim, start to finish
        </p>

        <DemoField />

        <div style={{ display: 'flex', gap: 7, margin: '8px 0 12px' }}>
          <Cue icon={<DragGlyph />} word="DRAG TO CUT" />
          <Cue icon={<ClaimGlyph />} word="SEAL TO CLAIM" />
          <Cue icon={<OrbGlyph />} word="AVOID THE ORBS" />
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

/* The two outcome marks from the asset sheet, as inline vectors: a draughtsman's
   approval stamp for a closed plot, a broken perimeter with a struck cross for
   one that never closed. No trophies, no skulls — this game is about a line
   that either met itself or did not. */
function OutcomeMark({ won }) {
  const c = won ? COLORS.gold : COLORS.danger;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true">
      {won ? (
        <g fill="none" stroke={c} strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 7px ${c}66)` }}>
          <path d="M32 5 55 18.5v27L32 59 9 45.5v-27z" strokeWidth="2.6" />
          <path d="M32 11 50 21.5v21L32 53 14 42.5v-21z" strokeWidth="1" opacity="0.6" />
          <path d="m22.5 32 7 7L43 25.5" stroke={COLORS.goldLt} strokeWidth="3.4" strokeLinecap="round" />
        </g>
      ) : (
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 50V14h36v20" stroke={COLORS.orangeBright} strokeWidth="2.6" />
          <path d="M50 40v10H32" stroke={COLORS.orangeBright} strokeWidth="2.2" strokeDasharray="4 5" opacity="0.75" />
          <path d="M18 46h10M18 40h16M18 34h8" stroke="rgba(127,192,255,0.4)" strokeWidth="1.4" />
          <path d="m26 44 10 10M36 44 26 54" stroke={c} strokeWidth="2.8" style={{ filter: `drop-shadow(0 0 6px ${c}66)` }} />
        </g>
      )}
    </svg>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot }) {
  const score = stats?.score || 0;
  const pctClaimed = stats?.pctClaimed ?? 0;
  const biggestCut = stats?.biggestCutPct ?? 0;
  const livesLeft = stats?.livesLeft ?? 0;
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
    const shareMessage = `Hi,\nI ring-fenced ${pctClaimed}% of the family wealth and scored ${score} points in Ring-Fence.\nClaim safe ground and wall the risks out: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Ring-Fence',
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
  const targetScore = GAME_CONFIG.targetScore;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
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
        padding: '40px 20px 24px',
        overflowY: 'auto',
        background: SCREEN_BG,
      }}
    >
      {won && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: 14, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <OutcomeMark won={won} />
        <p style={{
          fontSize: 22,
          fontWeight: 900,
          color: won ? COLORS.goldLt : COLORS.dangerLt,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
          margin: '6px 0 4px',
        }}>
          {won ? 'Wealth ring-fenced' : 'The fence gave way'}
        </p>
        <p style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'rgba(255,255,255,0.55)',
          margin: 0,
        }}>
          Surveyed by {leadName || 'Friend'}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 14, zIndex: 2 }}>
        <div style={{ width: 168, height: 168, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            {/* Graduation ticks — the dial reads as an instrument, not a donut */}
            <g stroke="rgba(127,192,255,0.28)" strokeWidth="1.5">
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i / 24) * Math.PI * 2;
                const r0 = radius + 9;
                const r1 = r0 + (i % 6 === 0 ? 6 : 3);
                return (
                  <path key={i} d={`M${100 + Math.cos(a) * r0} ${100 + Math.sin(a) * r0} L${100 + Math.cos(a) * r1} ${100 + Math.sin(a) * r1}`} />
                );
              })}
            </g>
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="9" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="9"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                filter: `drop-shadow(0 0 6px ${glowColor})`,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 30, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.035em', fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 8.5, fontWeight: 900, color: 'rgba(127,192,255,0.7)', marginTop: 6, letterSpacing: '0.24em', textTransform: 'uppercase' }}>
              Points
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — one card per line of the survey */}
      <div style={{
        display: 'flex',
        gap: 8,
        width: '100%',
        maxWidth: 360,
        marginBottom: 18,
        zIndex: 2,
      }}>
        {[
          { label: 'Secured', value: `${pctClaimed}%`, lead: true },
          { label: 'Biggest cut', value: `${biggestCut}%` },
          { label: 'Shields left', value: `${livesLeft}` },
        ].map((it) => (
          <div key={it.label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.045)',
            border: '1px solid rgba(127,192,255,0.16)',
            boxShadow: `inset 0 1px 0 ${it.lead ? 'rgba(127,192,255,0.55)' : 'rgba(127,192,255,0.22)'}`,
            borderRadius: 4,
            padding: '11px 6px',
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 19,
              fontWeight: 900,
              color: it.lead ? COLORS.blueLt : '#fff',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>{it.value}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 5 }}>{it.label}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px', zIndex: 2 }}>
        <h2 style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, margin: 0 }}>
          Ring-fencing is real: the right cover walls your family's wealth off from life's risks.
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
          Talk to a specialist about ring-fencing your family's financial future.
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
            marginBottom: 4,
          }}
        >
          <RotateIcon />
          <span>{won ? 'Play again' : 'Try again'}</span>
        </button>
      </motion.div>

      <button
        onClick={onHome}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.35)',
          cursor: 'pointer',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '4px 24px 12px',
        }}
      >
        Home
      </button>

      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
