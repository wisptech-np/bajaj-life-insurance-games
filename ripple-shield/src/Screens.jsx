// Screens.jsx — Home, How to Play, and Results for Ripple Shield.
//
// Visual identity (2026-07-31 revamp): an ABYSS board (#03101E) lit by a single
// signature accent, AQUA #19E3D6 — the colour of the shield wave. The shape
// language is concentric: every icon, gauge, hero mark and background field in
// these three screens is built from circles sharing a centre, so a thumbnail of
// any screen is identifiable as this game and no other.
//
// All art is inline SVG or CSS. No image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, WAVE_LIST, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Ripple Shield';

/* Every action on every screen shares this height. */
const BTN_H = 52;
/* One abyss backdrop, used by all three screens so transitions are seamless. */
const ABYSS = `radial-gradient(ellipse 120% 70% at 50% 30%, rgba(10,110,122,0.34), rgba(3,16,30,0) 68%),
   radial-gradient(ellipse 90% 60% at 50% 108%, rgba(30,107,224,0.2), rgba(3,16,30,0) 70%),
   linear-gradient(180deg, #03101E 0%, #062134 52%, #041A2B 100%)`;

/* ─── Icons — all concentric ─────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Win mark: a wave that reached every ring. */
function CrestIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <circle cx="16" cy="16" r="14" stroke={COLORS.aqua} strokeWidth="1.6" opacity="0.4" />
      <circle cx="16" cy="16" r="9.5" stroke={COLORS.aqua} strokeWidth="2.2" opacity="0.75" />
      <circle cx="16" cy="16" r="5.4" fill={COLORS.aqua} />
      <path d="M13.2 16.2 15.4 18.4 19 13.8" stroke="#03303A" strokeWidth="2.4"
        strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Loss mark: a wave that stalled — broken outer ring, hot core. */
function StallIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <g stroke={COLORS.danger} strokeWidth="2" strokeLinecap="round" opacity="0.55" fill="none">
        <path d="M16 2.6a13.4 13.4 0 0 1 11.6 6.7" />
        <path d="M27.6 22.7A13.4 13.4 0 0 1 16 29.4" />
        <path d="M4.4 22.7A13.4 13.4 0 0 1 4.4 9.3" />
      </g>
      <circle cx="16" cy="16" r="8" stroke={COLORS.danger} strokeWidth="2.2" fill="none" />
      <circle cx="16" cy="16" r="3.4" fill={COLORS.danger} />
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
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
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
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function RotateIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HomeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'block' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────────── */
const SCREEN_CSS = `
@keyframes rsTitleIn  { from { opacity: 0; letter-spacing: 0.3em; transform: translateY(12px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes rsFloat    { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes rsHeroRing { 0% { transform: scale(0.1); opacity: 0; } 12% { transform: scale(0.16); opacity: 1; } 100% { transform: scale(1); opacity: 0; } }
@keyframes rsHeroCore { 0%,100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes rsCover    { 0%,30% { opacity: 0; } 44%,100% { opacity: 1; } }
@keyframes rsCover2   { 0%,54% { opacity: 0; } 68%,100% { opacity: 1; } }
@keyframes rsChip     { from { opacity: 0; transform: translateY(10px) scale(0.88); } to { opacity: 1; transform: none; } }
@keyframes rsCta      { 0%,100% { box-shadow: 0 6px 22px rgba(242,101,34,0.4); } 50% { box-shadow: 0 6px 30px rgba(242,101,34,0.72); } }

/* How-to-play demo timeline — 3.4s loop, one full tap → cascade → risk beat. */
@keyframes rsDFinger { 0% { transform: translate(0,34px); opacity: 0; } 9% { transform: translate(0,8px); opacity: 1; } 17%,30% { transform: translate(0,0); opacity: 1; } 38% { transform: translate(0,-12px); opacity: 0.65; } 48%,100% { transform: translate(0,30px); opacity: 0; } }
@keyframes rsDAim    { 0%,15% { opacity: 0; transform: scale(0.28); } 20%,33% { opacity: 0.95; transform: scale(1); } 40%,100% { opacity: 0; transform: scale(1.04); } }
@keyframes rsDR1     { 0%,35% { transform: scale(0.08); opacity: 0; } 40% { transform: scale(0.14); opacity: 1; } 80%,100% { transform: scale(1); opacity: 0; } }
@keyframes rsDR2     { 0%,53% { transform: scale(0.08); opacity: 0; } 58% { transform: scale(0.14); opacity: 1; } 94%,100% { transform: scale(1); opacity: 0; } }
@keyframes rsDHit    { 0%,68% { opacity: 0; transform: scale(0.5); } 74% { opacity: 1; transform: scale(1.3); } 88%,100% { opacity: 0; transform: scale(1); } }
@keyframes rsDPts    { 0%,44% { opacity: 0; transform: translateY(6px); } 54% { opacity: 1; transform: translateY(-4px); } 74%,100% { opacity: 0; transform: translateY(-16px); } }

.rs-title  { animation: rsTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-float  { animation: rsFloat 4.5s ease-in-out infinite; }
.rs-hr1    { animation: rsHeroRing 3.2s ease-out infinite; }
.rs-hr2    { animation: rsHeroRing 3.2s ease-out 0.64s infinite; }
.rs-hr3    { animation: rsHeroRing 3.2s ease-out 1.28s infinite; }
.rs-hcore  { animation: rsHeroCore 2.2s ease-in-out infinite; }
.rs-cover  { animation: rsCover 3.2s ease-out infinite; }
.rs-cover2 { animation: rsCover2 3.2s ease-out infinite; }
.rs-chip   { animation: rsChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.rs-cta    { animation: rsCta 2.4s ease-in-out infinite; }
.rs-dfinger { animation: rsDFinger 3.4s cubic-bezier(0.34,1.3,0.5,1) infinite; }
.rs-daim   { animation: rsDAim 3.4s ease-out infinite; }
.rs-dr1    { animation: rsDR1 3.4s ease-out infinite; }
.rs-dr2    { animation: rsDR2 3.4s ease-out infinite; }
.rs-dhit   { animation: rsDHit 3.4s ease-out infinite; }
.rs-dpts   { animation: rsDPts 3.4s ease-out infinite; }
.rs-dcov1  { animation: rsCover 3.4s ease-out infinite; }
.rs-dcov2  { animation: rsCover2 3.4s ease-out infinite; }

@media (prefers-reduced-motion: reduce) {
  .rs-title, .rs-float, .rs-hr1, .rs-hr2, .rs-hr3, .rs-hcore, .rs-cover, .rs-cover2,
  .rs-chip, .rs-cta, .rs-dfinger, .rs-daim, .rs-dr1, .rs-dr2, .rs-dhit, .rs-dpts,
  .rs-dcov1, .rs-dcov2 { animation: none !important; opacity: 1 !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────────── */
function Confetti() {
  const colors = [COLORS.aqua, COLORS.aquaLt, COLORS.orangeLt, COLORS.brandBlueLt, '#FFFFFF', COLORS.aquaMid];
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

/* ─── Shared board art ───────────────────────────────────── */
/**
 * Gradients and filters shared by every SVG on these screens. Rendered once per
 * screen; ids are prefixed so they never collide with the game canvas.
 */
function Defs() {
  return (
    <defs>
      <radialGradient id="rsOrbBlue" cx="34%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#7FB4FF" />
        <stop offset="42%" stopColor={COLORS.brandBlueLt} />
        <stop offset="100%" stopColor={COLORS.orbCore} />
      </radialGradient>
      <radialGradient id="rsOrbAqua" cx="34%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="38%" stopColor={COLORS.orbSafeCore} />
        <stop offset="100%" stopColor={COLORS.orbSafeRim} />
      </radialGradient>
      <radialGradient id="rsVirusBody" cx="34%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#5FE97C" />
        <stop offset="50%" stopColor={COLORS.virus} />
        <stop offset="100%" stopColor="#083D1A" />
      </radialGradient>
      <radialGradient id="rsAbyss" cx="50%" cy="42%" r="78%">
        <stop offset="0%" stopColor="#08304A" />
        <stop offset="60%" stopColor="#062134" />
        <stop offset="100%" stopColor="#03101E" />
      </radialGradient>
      <linearGradient id="rsCrest" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={COLORS.aquaLt} />
        <stop offset="100%" stopColor={COLORS.aquaDeep} />
      </linearGradient>
    </defs>
  );
}

/** A family orb — body gradient, rim light on the lower-right, specular cap. */
function Orb({ x, y, r = 9, covered = false, className }) {
  return (
    <g transform={`translate(${x},${y})`} className={className}>
      {covered && (
        <circle cx="0" cy="0" r={r * 1.34} fill="none" stroke={COLORS.aqua}
          strokeWidth={Math.max(0.9, r * 0.11)} opacity="0.55" />
      )}
      <circle cx="0" cy="0" r={r} fill={covered ? 'url(#rsOrbAqua)' : 'url(#rsOrbBlue)'} />
      <path
        d={`M ${r * 0.96} ${r * 0.28} A ${r} ${r} 0 0 1 ${-r * 0.5} ${r * 0.86}`}
        fill="none" stroke={covered ? 'rgba(255,255,255,0.95)' : 'rgba(160,214,255,0.85)'}
        strokeWidth={Math.max(0.9, r * 0.13)} strokeLinecap="round"
      />
      <ellipse cx={-r * 0.31} cy={-r * 0.4} rx={r * 0.3} ry={r * 0.17}
        transform={`rotate(-35 ${-r * 0.31} ${-r * 0.4})`} fill="rgba(255,255,255,0.5)" />
      {covered ? (
        <path d={`M${-r * 0.36} 0 L${-r * 0.07} ${r * 0.31} L${r * 0.4} ${-r * 0.33}`}
          fill="none" stroke="#03303A" strokeWidth={Math.max(1.4, r * 0.21)}
          strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <g fill="rgba(233,244,255,0.9)">
          <circle cx={-r * 0.3} cy={r * 0.05} r={r * 0.19} />
          <circle cx={r * 0.3} cy={r * 0.05} r={r * 0.19} />
          <circle cx="0" cy={r * 0.34} r={r * 0.14} />
        </g>
      )}
    </g>
  );
}

/** A virus: irregular spiked husk, deep green body, hot red nucleus. */
function Virus({ x, y, r = 8, className }) {
  const spikes = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const long = i % 2 === 0;
    const tip = r * (long ? 1.42 : 1.14);
    const base = r * 0.84;
    const half = r * (long ? 0.17 : 0.22);
    const cx = Math.cos(a);
    const sy = Math.sin(a);
    const px = -sy;
    const py = cx;
    spikes.push(
      <path
        key={i}
        d={`M${(cx * base + px * half).toFixed(2)} ${(sy * base + py * half).toFixed(2)}`
          + ` L${(cx * tip).toFixed(2)} ${(sy * tip).toFixed(2)}`
          + ` L${(cx * base - px * half).toFixed(2)} ${(sy * base - py * half).toFixed(2)} Z`}
        fill={COLORS.virusBody}
      />,
    );
  }
  return (
    <g transform={`translate(${x},${y})`} className={className}>
      {spikes}
      <circle cx="0" cy="0" r={r * 0.94} fill="url(#rsVirusBody)" />
      <path d={`M ${r * 0.9} ${r * 0.26} A ${r * 0.94} ${r * 0.94} 0 0 1 ${-r * 0.48} ${r * 0.81}`}
        fill="none" stroke="rgba(150,255,180,0.6)" strokeWidth={Math.max(0.8, r * 0.11)} strokeLinecap="round" />
      <circle cx="0" cy="0" r={r * 0.46} fill={COLORS.virusCore} />
      <circle cx={-r * 0.12} cy={-r * 0.12} r={r * 0.16} fill="#FFE3E3" opacity="0.8" />
    </g>
  );
}

/** The still ring field that sits behind every screen. Pure CSS would need a
    repeating-radial-gradient; SVG gives real control over per-ring alpha. */
function RingField({ opacity = 1 }) {
  const rings = [];
  for (let i = 1; i <= 11; i++) {
    const t = i / 11;
    rings.push(
      <circle key={i} cx="180" cy="230" r={38 * i * (1 - t * 0.2)}
        fill="none" stroke={COLORS.aqua}
        strokeWidth={1.8 - t * 1.1} opacity={0.11 * (1 - t * 0.75)} />,
    );
  }
  for (let i = 1; i <= 7; i++) {
    const t = i / 7;
    rings.push(
      <circle key={`b${i}`} cx="52" cy="66" r={44 * i}
        fill="none" stroke={COLORS.brandBlueLt}
        strokeWidth={1.4 - t * 0.7} opacity={0.1 * (1 - t * 0.7)} />,
    );
  }
  return (
    <svg
      viewBox="0 0 360 640" preserveAspectRatio="xMidYMid slice" aria-hidden="true"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }}
    >
      {rings}
    </svg>
  );
}

/* ─── Home ───────────────────────────────────────────────── */
/**
 * Hero: the board's own logic as an emblem. A shield core at the centre sends
 * three rings outward on a stagger; the orbs each ring passes flip to aqua, and
 * two viruses sit where the chain would break. The screen previews the game
 * rather than illustrating it.
 */
export function HomeScreen({ onStart }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -16 }}
      transition={{ type: 'spring', damping: 24, stiffness: 210 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '48px 20px 44px',
        background: ABYSS,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      <RingField opacity={0.9} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="rs-title" style={{
          fontSize: 34,
          fontWeight: 900,
          color: COLORS.ink,
          textTransform: 'uppercase',
          lineHeight: 1,
          margin: '0 0 12px 0',
          textShadow: '0 2px 18px rgba(0,0,0,0.7)',
        }}>
          {GAME_TITLE}
        </h1>
        {/* Wave rule — the title's own ripple. */}
        <svg width="132" height="10" viewBox="0 0 132 10" aria-hidden="true" style={{ display: 'block', margin: '0 auto 12px' }}>
          <path d="M2 5c8-6 16 6 24 0s16-6 24 0 16 6 24 0 16-6 24 0 16 6 24 0"
            fill="none" stroke={COLORS.aqua} strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        </svg>
        <p style={{
          fontSize: 12.5,
          fontWeight: 800,
          color: COLORS.aquaLt,
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: '0 auto',
          maxWidth: 280,
          lineHeight: 1.5,
        }}>
          One policy protects many
        </p>
      </div>

      <div className="rs-float" style={{ position: 'relative', width: 268, height: 240, zIndex: 1 }}>
        <svg width="268" height="240" viewBox="0 0 200 180" style={{ overflow: 'visible' }} aria-hidden="true">
          <Defs />
          <clipPath id="rsHomeClip"><rect x="4" y="4" width="192" height="172" rx="28" /></clipPath>

          <rect x="4" y="4" width="192" height="172" rx="28" fill="url(#rsAbyss)"
            stroke="rgba(140,255,244,0.22)" strokeWidth="1.5" />

          <g clipPath="url(#rsHomeClip)">
            {/* Still interference field inside the board. */}
            <g fill="none" stroke={COLORS.aqua} opacity="0.16">
              <circle cx="100" cy="96" r="26" strokeWidth="0.9" />
              <circle cx="100" cy="96" r="50" strokeWidth="0.8" />
              <circle cx="100" cy="96" r="74" strokeWidth="0.7" />
            </g>

            {/* The wave, on a stagger. */}
            <g fill="none" stroke={COLORS.aquaLt} strokeWidth="2.6">
              <circle className="rs-hr1" cx="100" cy="96" r="78" style={{ transformOrigin: '100px 96px' }} />
              <circle className="rs-hr2" cx="100" cy="96" r="78" style={{ transformOrigin: '100px 96px' }} />
              <circle className="rs-hr3" cx="100" cy="96" r="78" style={{ transformOrigin: '100px 96px' }} />
            </g>

            {/* Orbs the wave has reached. */}
            <Orb x={68} y={72} r={9} covered className="rs-cover" />
            <Orb x={134} y={116} r={9} covered className="rs-cover2" />
            <Orb x={140} y={62} r={9} covered className="rs-cover2" />

            {/* Still exposed. */}
            <Orb x={44} y={130} r={9} />
            <Orb x={72} y={148} r={8} />
            <Orb x={166} y={140} r={8} />
            <Orb x={38} y={44} r={8} />

            {/* Risk. */}
            <Virus x={162} y={40} r={8} />
            <Virus x={110} y={152} r={7} />

            {/* Shield core — the source of the wave, and the only object on the
                screen that is not an orb. */}
            <g className="rs-hcore" style={{ transformOrigin: '100px 96px' }}>
              <circle cx="100" cy="96" r="17" fill="url(#rsCrest)" opacity="0.28" />
              <path d="M100 82.5l10.5 4.2v6.6c0 5.2-4.2 9.6-10.5 11.6-6.3-2-10.5-6.4-10.5-11.6v-6.6z"
                fill="url(#rsOrbAqua)" stroke="#03303A" strokeWidth="1.1" strokeLinejoin="round" />
              <path d="M96.6 93.6 99.4 96.6 104 90.6" fill="none" stroke="#03303A"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </g>
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 28 }}
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
            height: BTN_H,
            border: 'none',
            borderRadius: 999,
            // 19px/900 clears the WCAG "large text" threshold (18.66px bold),
            // where white on the brand orange gradient (3.14:1) passes at 3:1.
            fontSize: 19,
            fontWeight: 900,
            color: '#FFFFFF',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <PlayIcon size={18} />
          <span>Start Game</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play — animation only ───────────────────────── */
/**
 * No instructions. One looping demo of the real gesture on the real board: a
 * drawn finger presses, the aim reticle appears at its tip, the shield wave
 * leaves on release, two orbs flip to aqua and spawn a second wave, and a virus
 * takes a bite out of a third. Three icon-led labels name the beats; there is
 * no other text on the screen besides the heading and the button.
 */
function DemoLabel({ children, tint, icon }) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      padding: '10px 4px',
      borderRadius: 16,
      background: 'rgba(6,33,52,0.6)',
      border: '1px solid rgba(140,255,244,0.16)',
    }}>
      {icon}
      <span style={{
        fontSize: 9.5,
        fontWeight: 900,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: tint,
        textAlign: 'center',
        lineHeight: 1.25,
      }}>
        {children}
      </span>
    </div>
  );
}

export function HowToPlayScreen({ onPlay }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -16 }}
      transition={{ type: 'spring', damping: 24, stiffness: 210 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        background: ABYSS,
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      <RingField opacity={0.7} />

      <div style={{
        position: 'relative',
        zIndex: 2,
        background: 'rgba(3,16,30,0.78)',
        border: '1px solid rgba(140,255,244,0.22)',
        borderRadius: 28,
        padding: '22px 16px 18px',
        width: '100%',
        maxWidth: 344,
        boxShadow: '0 18px 44px rgba(0,0,0,0.55)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(18px)',
        backdropFilter: 'blur(18px)',
      }}>
        <h2 style={{
          fontSize: 23, fontWeight: 900, textTransform: 'uppercase',
          letterSpacing: '-0.02em', margin: '0 0 14px 0', color: COLORS.ink,
        }}>
          How to Play
        </h2>

        {/* The demo. */}
        <div style={{
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid rgba(140,255,244,0.2)',
          marginBottom: 14,
        }}>
          <svg width="100%" viewBox="0 0 200 152" aria-hidden="true" style={{ display: 'block' }}>
            <Defs />
            <rect x="0" y="0" width="200" height="152" fill="url(#rsAbyss)" />
            <g fill="none" stroke={COLORS.aqua} opacity="0.13">
              <circle cx="86" cy="74" r="24" strokeWidth="0.9" />
              <circle cx="86" cy="74" r="46" strokeWidth="0.8" />
              <circle cx="86" cy="74" r="68" strokeWidth="0.7" />
            </g>

            {/* The wave the tap sends, then the wave a chained orb sends. */}
            <circle className="rs-dr1" cx="86" cy="74" r="62" fill="none"
              stroke={COLORS.aquaLt} strokeWidth="2.6" style={{ transformOrigin: '86px 74px' }} />
            <circle className="rs-dr2" cx="44" cy="46" r="46" fill="none"
              stroke={COLORS.aqua} strokeWidth="2.2" style={{ transformOrigin: '44px 46px' }} />

            {/* Aim reticle, visible only while the finger is down. */}
            <g className="rs-daim" style={{ transformOrigin: '86px 74px' }}>
              <circle cx="86" cy="74" r="42" fill={COLORS.aquaDeep} opacity="0.12" />
              <circle cx="86" cy="74" r="42" fill="none" stroke={COLORS.aqua}
                strokeWidth="1.6" strokeDasharray="6 6" />
              <circle cx="86" cy="74" r="10" fill="none" stroke={COLORS.aquaLt} strokeWidth="2.4" />
            </g>

            {/* Board. */}
            <Orb x={44} y={46} r={9} />
            <Orb x={44} y={46} r={9} covered className="rs-dcov1" />
            <Orb x={120} y={100} r={9} />
            <Orb x={120} y={100} r={9} covered className="rs-dcov1" />
            <Orb x={26} y={104} r={8} />
            <Orb x={26} y={104} r={8} covered className="rs-dcov2" />
            <Orb x={150} y={44} r={8} />

            {/* Risk: a virus the wave reaches late, with an orange bite flash. */}
            <Virus x={128} y={40} r={8} />
            <circle className="rs-dhit" cx="128" cy="40" r="16" fill="none"
              stroke={COLORS.orangeLt} strokeWidth="2.6" style={{ transformOrigin: '128px 40px' }} />

            {/* The "+N at the point of impact" the HUD relies on. */}
            <text className="rs-dpts" x="44" y="30" textAnchor="middle"
              fill={COLORS.aquaLt} fontSize="13" fontWeight="900"
              style={{ fontFamily: 'inherit' }}>+200</text>

            {/* Drawn finger — the real input, never an emoji. */}
            <g className="rs-dfinger" transform="translate(86,74)">
              <g transform="translate(-3,2) scale(0.92)">
                <path
                  d="M8 2c0-1.6-1.2-2.9-2.8-2.9S2.4.4 2.4 2v13.3l-3.5-3a2.5 2.5 0 0 0-3.4.2 2.4 2.4 0 0 0 .1 3.3l7.4 7.6c1 1 2.3 1.5 3.7 1.5h5.5a5 5 0 0 0 5-5V12c0-1.4-1.1-2.5-2.5-2.5-.5 0-1 .2-1.4.5-.2-1.1-1.2-2-2.4-2-.6 0-1.1.2-1.5.5C9 7.4 8 6.6 8 6.6z"
                  fill="#061C2C" stroke={COLORS.aquaLt} strokeWidth="1.7" strokeLinejoin="round"
                />
              </g>
            </g>
          </svg>
        </div>

        {/* Exactly three icon-led labels, ≤ 4 words each. */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <DemoLabel
            tint={COLORS.orangeLt}
            icon={(
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10.4" stroke={COLORS.orangeLt} strokeWidth="1.5" opacity="0.45" />
                <circle cx="12" cy="12" r="6.4" stroke={COLORS.orangeLt} strokeWidth="1.9" opacity="0.85" />
                <circle cx="12" cy="12" r="2.6" fill={COLORS.orangeLt} />
              </svg>
            )}
          >
            Hold to aim
          </DemoLabel>

          <DemoLabel
            tint={COLORS.aquaLt}
            icon={(
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="8" cy="14" r="3" fill={COLORS.aqua} />
                <circle cx="8" cy="14" r="6.6" stroke={COLORS.aqua} strokeWidth="1.5" opacity="0.55" />
                <circle cx="17" cy="8" r="2.4" fill={COLORS.aquaLt} />
                <circle cx="17" cy="8" r="5.4" stroke={COLORS.aquaLt} strokeWidth="1.4" opacity="0.5" />
              </svg>
            )}
          >
            Waves chain
          </DemoLabel>

          <DemoLabel
            tint={COLORS.greenLt}
            icon={(
              // Reuses the gradients declared by the demo SVG above: SVG paint
              // servers resolve document-wide, so there are no duplicate ids.
              <svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true">
                <Virus x={13} y={13} r={7.4} />
              </svg>
            )}
          >
            Avoid green
          </DemoLabel>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: BTN_H, border: 'none', borderRadius: 999,
              fontSize: 19, fontWeight: 900, color: '#FFFFFF',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
              boxShadow: '0 6px 22px rgba(242,101,34,0.42)',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            <PlayIcon size={18} />
            <span>Play</span>
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
      borderRadius: 16,
      background: 'rgba(6,33,52,0.6)',
      border: '1px solid rgba(140,255,244,0.16)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 19, fontWeight: 900, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{
        fontSize: 8.5, fontWeight: 900, letterSpacing: '0.16em', textTransform: 'uppercase',
        color: COLORS.inkDim, marginTop: 4,
      }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  const score = stats?.score || 0;
  const protectedCount = stats?.protected || 0;
  const wavesCleared = stats?.waves || 0;
  const bestChain = stats?.chain || 0;
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
    const shareMessage = `Hi,\nI protected ${protectedCount} family orbs across ${wavesCleared} of ${GAME_CONFIG.waves.length} waves and scored ${score} points in the ${GAME_TITLE} challenge.\nOne policy protects many — start your ripple here: ${shareUrl}`.trim();

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
  const strokeColor = won ? COLORS.aqua : score < 1200 ? COLORS.danger : COLORS.orangeLt;
  const glowColor = won ? 'rgba(25,227,214,0.5)' : score < 1200 ? 'rgba(239,68,68,0.4)' : 'rgba(255,138,61,0.42)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -16 }}
      transition={{ type: 'spring', damping: 24, stiffness: 210 }}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '32px 20px 20px',
        overflowY: 'auto',
        background: ABYSS,
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />
      <RingField opacity={0.55} />
      {won && <Confetti />}

      {/* Outcome header */}
      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 344, zIndex: 2 }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '7px 16px', borderRadius: 999,
          background: won ? 'rgba(25,227,214,0.14)' : 'rgba(239,68,68,0.16)',
          border: `1px solid ${won ? 'rgba(25,227,214,0.5)' : 'rgba(239,68,68,0.45)'}`,
          marginBottom: 12,
        }}>
          {won ? <CrestIcon size={20} /> : <StallIcon size={20} />}
          <span style={{
            fontSize: 12, fontWeight: 900, color: COLORS.ink,
            textTransform: 'uppercase', letterSpacing: '0.09em',
          }}>
            {won ? 'Every wave held' : 'Ripple ran short'}
          </span>
        </div>
        <p style={{ color: COLORS.ink, fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: COLORS.aquaLt }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.86)' }}>Here&rsquo;s your run.</span>
        </p>
      </div>

      {/* Score ring — the game's own motif, with a still echo ring inside it */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, zIndex: 2 }}>
        <div style={{ width: 166, height: 166, position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="rgba(140,255,244,0.1)" strokeWidth="12" />
            <circle cx="100" cy="100" r="58" fill="none" stroke="rgba(140,255,244,0.12)" strokeWidth="1.2" />
            <circle cx="100" cy="100" r="44" fill="none" stroke="rgba(140,255,244,0.08)" strokeWidth="1" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{ filter: `drop-shadow(0 0 10px ${glowColor})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 31, fontWeight: 900, color: COLORS.ink, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: COLORS.inkDim, marginTop: 6, letterSpacing: '0.18em' }}>
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Run stats */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 344, marginBottom: 12, zIndex: 2 }}>
        <StatTile label="Protected" value={protectedCount} accent={COLORS.aquaLt} />
        <StatTile label="Waves" value={`${wavesCleared}/${GAME_CONFIG.waves.length}`} accent={COLORS.ink} />
        <StatTile label="Best chain" value={bestChain} accent={COLORS.orangeLt} />
      </div>

      {/* Wave chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 344, marginBottom: 16, zIndex: 2,
      }}>
        {WAVE_LIST.map((w, i) => {
          const cleared = i < wavesCleared;
          return (
            <span
              key={w.wave}
              className="rs-chip"
              style={{
                animationDelay: `${180 + i * 90}ms`,
                fontSize: 10.5,
                fontWeight: 900,
                padding: '5px 11px',
                borderRadius: 999,
                color: cleared ? '#03202B' : COLORS.inkDim,
                background: cleared ? COLORS.aqua : 'rgba(6,33,52,0.6)',
                border: `1px solid ${cleared ? 'rgba(140,255,244,0.7)' : 'rgba(140,255,244,0.16)'}`,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              W{w.wave} &middot; {w.target}/{w.orbs}
            </span>
          );
        })}
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          // Light-to-mid aqua, not aqua-to-deep: ink at #03202B measures 14.2:1
          // at the top of this gradient and 10.3:1 at the bottom. Running it to
          // aquaDeep dropped the bottom to 2.8:1.
          background: `linear-gradient(180deg, ${COLORS.aquaLt} 0%, ${COLORS.aqua} 100%)`,
          color: '#03202B', fontWeight: 900,
          height: BTN_H, borderRadius: 999, border: 'none', cursor: 'pointer',
          fontSize: 16, textTransform: 'uppercase', letterSpacing: '0.06em',
          boxShadow: '0 6px 22px rgba(25,227,214,0.32)',
          width: '100%', maxWidth: 300, marginBottom: 16, zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Lead / booking card */}
      <div style={{
        width: '100%', maxWidth: 344,
        background: 'rgba(6,33,52,0.6)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24, padding: '18px 16px',
        border: '1px solid rgba(140,255,244,0.18)',
        textAlign: 'center', marginBottom: 16, zIndex: 2,
      }}>
        <p style={{ color: COLORS.ink, fontSize: 15, fontWeight: 700, lineHeight: 1.4, margin: '0 0 16px 0' }}>
          One shield reached {protectedCount} on screen. A specialist can show you how far one policy reaches at home.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%', height: BTN_H,
                background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
                color: '#FFFFFF', fontWeight: 900, borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 19, border: 'none', cursor: 'pointer', textTransform: 'uppercase',
                letterSpacing: '0.05em',
                boxShadow: '0 6px 20px rgba(242,101,34,0.36)',
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
                height: BTN_H, boxSizing: 'border-box',
                background: 'rgba(140,255,244,0.08)', color: COLORS.ink, fontWeight: 900,
                borderRadius: 999,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                fontSize: 16, textDecoration: 'none', textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: '1px solid rgba(140,255,244,0.3)',
              }}
            >
              <PhoneIcon />
              <span>Call Specialist</span>
            </a>
          )}
        </div>
      </div>

      {/* Retry / Home */}
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 344, marginBottom: 16, zIndex: 2 }}>
        <button
          onClick={onRetry}
          style={{
            flex: 2, height: BTN_H, borderRadius: 999, cursor: 'pointer',
            background: 'rgba(140,255,244,0.08)', border: '1px solid rgba(140,255,244,0.3)',
            color: COLORS.ink, fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RotateIcon />
          <span>{retryLabel || 'Play again'}</span>
        </button>
        <button
          onClick={onHome}
          style={{
            flex: 1, height: BTN_H, borderRadius: 999, cursor: 'pointer',
            background: 'transparent', border: '1px solid rgba(140,255,244,0.22)',
            color: COLORS.inkDim, fontSize: 15, fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '0.05em',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <HomeIcon />
          <span>Home</span>
        </button>
      </div>

      <div style={{ width: '100%', maxWidth: 344, opacity: 0.45, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
