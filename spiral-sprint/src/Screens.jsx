// Screens.jsx — Home, How to Play, and Results screens for Spiral Sprint.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { COLORS, GAME_CONFIG, MILESTONE_LIST, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Spiral Sprint';

/* ─── Inline icons ─────────────────────────────────────── */
function PlayIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/** Win mark: the vault at the bottom of the tower. */
function VaultIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="4" y="5" width="24" height="22" rx="3" fill="#fff" opacity="0.95" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="rgba(11,18,33,0.75)" strokeWidth="2.4" />
      <circle cx="16" cy="16" r="2" fill="rgba(11,18,33,0.75)" />
      <g stroke="rgba(11,18,33,0.75)" strokeWidth="2" strokeLinecap="round">
        <path d="M16 7.5v3M16 21.5v3M7.5 16h3M21.5 16h3" />
      </g>
    </svg>
  );
}

/** Run-ended mark: the risk blob that stopped you. */
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
@keyframes ssTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.02em; transform: none; } }
@keyframes ssFloat   { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes ssGlow    { 0%,100% { opacity: 0.35; transform: scale(1); } 50% { opacity: 0.85; transform: scale(1.07); } }
@keyframes ssHeroDrop {
  0%,10%   { transform: translateY(0); opacity: 1; }
  28%,40%  { transform: translateY(34px); opacity: 1; }
  58%,70%  { transform: translateY(68px); opacity: 1; }
  92%,100% { transform: translateY(104px); opacity: 0; }
}
@keyframes ssHeroSpin { 0%,100% { transform: translateX(-7px); } 50% { transform: translateX(7px); } }
@keyframes ssChip    { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
@keyframes ssBeatWarn { 0%,100% { opacity: 0.45; } 50% { opacity: 1; } }

/* How-to-play demo — one 5 s loop of the real mechanic. Three thumb strokes turn
   the tower 120 degrees each (360 total, so the loop wraps invisibly), and the
   ball's bounces are scripted against those angles rather than eyeballed:

     4-30%   stroke 1: ring 1's gap (centred 210 deg) arrives at the front
     30-42%  the ball drops through it onto ring 2
     44-70%  stroke 2: ring 2's crash arc (centred 260 deg) crosses the front
             between 48% and 61% — entirely inside the ball's 42-66% hop, which
             is the real skill in this game: the hazard passes under a ball that
             is in the air, and the ball comes down on blue
     78-100% stroke 3 closes the turn                                          */
@keyframes ssHtpSpin {
  0%, 4%    { transform: rotate(0deg); }
  30%, 44%  { transform: rotate(-120deg); }
  70%, 78%  { transform: rotate(-240deg); }
  100%      { transform: rotate(-360deg); }
}
@keyframes ssHtpFall {
  0%   { transform: translateY(0); opacity: 0; }
  3%   { transform: translateY(0); opacity: 1; }
  10%  { transform: translateY(-14px); }
  18%  { transform: translateY(0); }
  24%  { transform: translateY(-14px); }
  30%  { transform: translateY(0); }
  42%  { transform: translateY(48px); }
  52%  { transform: translateY(26px); }
  66%  { transform: translateY(48px); }
  74%  { transform: translateY(34px); }
  82%  { transform: translateY(48px); }
  88%  { transform: translateY(38px); }
  94%  { transform: translateY(48px); opacity: 1; }
  98%  { transform: translateY(48px); opacity: 0; }
  100% { transform: translateY(0); opacity: 0; }
}
@keyframes ssHtpDrag {
  0%   { transform: translateX(-26px); opacity: 0; }
  4%   { transform: translateX(-26px); opacity: 1; }
  30%  { transform: translateX(26px);  opacity: 1; }
  34%  { transform: translateX(26px);  opacity: 0; }
  40%  { transform: translateX(-26px); opacity: 0; }
  44%  { transform: translateX(-26px); opacity: 1; }
  70%  { transform: translateX(26px);  opacity: 1; }
  74%  { transform: translateX(26px);  opacity: 0; }
  77%  { transform: translateX(-26px); opacity: 0; }
  78%  { transform: translateX(-26px); opacity: 1; }
  97%  { transform: translateX(24px);  opacity: 1; }
  100% { transform: translateX(26px);  opacity: 0; }
}
/* fill-box + 50% 50% puts the spin on the ring's own centre. The default
   (view-box) would resolve the origin against the SVG viewport instead, which
   inside a translated, non-uniformly scaled group is nowhere near the ring.
   Every animated element here is a bare <g> with NO transform attribute of its
   own — a CSS transform replaces the attribute rather than composing with it,
   so positioning lives on a static parent group. */
.ss-htp-spin { animation: ssHtpSpin 5s linear infinite; transform-box: fill-box; transform-origin: 50% 50%; }
.ss-htp-fall { animation: ssHtpFall 5s ease-in-out infinite; }
.ss-htp-drag { animation: ssHtpDrag 5s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-htp-spin, .ss-htp-fall, .ss-htp-drag { animation: none !important; }
}
.ss-title { animation: ssTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-float { animation: ssFloat 4s ease-in-out infinite; }
.ss-glow  { animation: ssGlow 2.4s ease-in-out infinite; }
.ss-chip  { animation: ssChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.ss-hero-drop { animation: ssHeroDrop 3.6s cubic-bezier(0.4,0,0.7,1) infinite; }
.ss-hero-spin { animation: ssHeroSpin 5s ease-in-out infinite; }
.ss-warn  { animation: ssBeatWarn 1.1s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .ss-title, .ss-float, .ss-glow, .ss-chip, .ss-hero-drop, .ss-hero-spin,
  .ss-warn { animation: none !important; }
}
`;

/* ─── Confetti (lightweight) ─────────────────────────── */
function Confetti() {
  const colors = [COLORS.gold, COLORS.goldLt, COLORS.orangeLt, COLORS.brandBlueLt, COLORS.brandBlue, COLORS.green, '#EC4899'];
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
 * Hero motif: the tower itself, built the way the canvas builds it — tilted
 * platform rings with a darker front face for thickness, a wedge cut out for
 * the gap, a green wedge for a crash arc, and the shield ball dropping down the
 * shaft toward the vault. The screen previews the game rather than illustrating
 * it.
 */
function wedgePath(cx, cy, rx, ry, from, to) {
  return `M${cx} ${cy} L${cx + rx * Math.cos(from)} ${cy + ry * Math.sin(from)}`
    + ` A${rx} ${ry} 0 0 1 ${cx + rx * Math.cos(to)} ${cy + ry * Math.sin(to)} Z`;
}

function HeroRing({ y, rx, ry, gap, crash, dim }) {
  return (
    <g opacity={dim}>
      <ellipse cx="100" cy={y + 6} rx={rx} ry={ry} fill={COLORS.safeFront} />
      <ellipse cx="100" cy={y} rx={rx} ry={ry} fill={COLORS.landTop} />
      {crash && <path d={wedgePath(100, y, rx, ry, crash[0], crash[1])} fill={COLORS.crashTop} />}
      <path d={wedgePath(100, y, rx, ry, gap[0], gap[1])} fill="#061634" />
      <ellipse cx="100" cy={y} rx={rx * 0.34} ry={ry * 0.34} fill={COLORS.coreTop} />
    </g>
  );
}

function HeroBall({ x, y, r = 9 }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <circle cx="0" cy="0" r={r} fill="url(#ssBall)" />
      <path
        d={`M0 ${-r * 0.62} L${r * 0.46} ${-r * 0.3} L${r * 0.46} ${r * 0.14}`
          + ` Q${r * 0.38} ${r * 0.6} 0 ${r * 0.68}`
          + ` Q${-r * 0.38} ${r * 0.6} ${-r * 0.46} ${r * 0.14}`
          + ` L${-r * 0.46} ${-r * 0.3} Z`}
        fill="rgba(255,255,255,0.92)"
      />
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
        padding: '50px 24px 56px',
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14,79,148,0.55), rgba(11,18,33,0.96) 72%), #0B1221',
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="ss-title" style={{
          fontSize: 33,
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
          color: COLORS.orangeLt,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: 0,
          maxWidth: 300,
        }}>
          Ride the market cycles &mdash; land safe, dodge the crash
        </p>
      </div>

      <div className="ss-float" style={{ position: 'relative', width: 250, height: 230, zIndex: 1 }}>
        <svg width="250" height="230" viewBox="0 0 200 184" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="ssSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#061634" />
              <stop offset="100%" stopColor="#08182F" />
            </linearGradient>
            <radialGradient id="ssBall" cx="35%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#CFE4FF" />
              <stop offset="45%" stopColor="#4E96FF" />
              <stop offset="100%" stopColor="#003DA6" />
            </radialGradient>
            <linearGradient id="ssVault" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F3C75A" />
              <stop offset="100%" stopColor="#8A5F12" />
            </linearGradient>
            <clipPath id="ssClip"><rect x="4" y="4" width="192" height="176" rx="26" /></clipPath>
          </defs>

          <rect x="4" y="4" width="192" height="176" rx="26" fill="url(#ssSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

          <g clipPath="url(#ssClip)">
            {/* Core cylinder the rings thread onto. */}
            <rect x="82" y="4" width="36" height="176" fill={COLORS.coreMid} />
            <rect x="82" y="4" width="13" height="176" fill={COLORS.coreTop} opacity="0.55" />

            {/* Far to near, so each near ring's front face stays visible. */}
            <g className="ss-hero-spin">
              <HeroRing y={46} rx={58} ry={20} gap={[0.55, 1.65]} dim={0.55} />
              <HeroRing y={80} rx={63} ry={21} gap={[2.5, 3.55]} crash={[0.25, 1.2]} dim={0.75} />
              <HeroRing y={114} rx={68} ry={23} gap={[0.6, 1.75]} dim={0.92} />
            </g>

            {/* The vault floor at the bottom of the shaft. */}
            <ellipse cx="100" cy="158" rx="72" ry="24" fill={COLORS.vaultFront} />
            <ellipse cx="100" cy="152" rx="72" ry="24" fill="url(#ssVault)" />
            <ellipse cx="100" cy="152" rx="26" ry="9" fill="none" stroke="rgba(11,18,33,0.6)" strokeWidth="2.4" />
            <circle cx="100" cy="152" r="3" fill="rgba(11,18,33,0.7)" />

            {/* Ball dropping down the shaft. */}
            <g className="ss-hero-drop"><HeroBall x={100} y={40} r={9} /></g>

            {/* Years-to-retirement rule near the top. */}
            <text x="100" y="26" fill={COLORS.goldLt} fontSize="8.5" fontWeight="900" textAnchor="middle"
              letterSpacing="1.5" fontFamily="'Plus Jakarta Sans', sans-serif">
              40 YEARS TO RETIREMENT
            </text>

            {/* Depth fog at the base. */}
            <g className="ss-glow">
              <rect x="4" y="168" width="192" height="12" fill="rgba(4,10,22,0.75)" />
            </g>
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
            background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
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

/* ─── How to play ─────────────────────────────────────────
   No instructions. One looping demo of the real mechanic at the real scale,
   plus three icon labels. Everything the player needs to learn is on screen
   happening to the game's own shapes: the thumb drags, the tower spins, the gap
   arrives, the ball drops, a green crash arc swings in and the next drag steers
   the ball clear of it. */

const rad = (deg) => (deg * Math.PI) / 180;

/**
 * A demo ring. The wedges live inside a group that is translated to the ring
 * centre and flattened with scale(1, 0.32); rotating THAT group is a true spin
 * of the tilted disc, which is why the gap really does travel around the ring
 * instead of sliding sideways. `transform-origin: 0 0` (set in SCREEN_CSS) puts
 * the rotation on the ring's own centre.
 */
function DemoRing({ y, gap, crash, warn, dim = 1 }) {
  const r = 54;
  return (
    <g opacity={dim}>
      <ellipse cx="100" cy={y + 5} rx={r} ry={r * 0.32} fill={COLORS.safeFront} />
      <g transform={`translate(100 ${y}) scale(1 0.32)`}>
        <g className="ss-htp-spin">
          <circle cx="0" cy="0" r={r} fill={COLORS.landTop} />
          {crash && (
            <>
              <path d={wedgePath(0, 0, r, r, rad(crash[0]), rad(crash[1]))} fill={COLORS.crashTop} />
              {warn && (
                <path
                  className="ss-warn"
                  d={`M${r * Math.cos(rad(crash[0]))} ${r * Math.sin(rad(crash[0]))}`
                    + ` A${r} ${r} 0 0 1 ${r * Math.cos(rad(crash[1]))} ${r * Math.sin(rad(crash[1]))}`}
                  fill="none"
                  stroke={COLORS.danger}
                  strokeWidth="7"
                />
              )}
            </>
          )}
          <path d={wedgePath(0, 0, r, r, rad(gap[0]), rad(gap[1]))} fill="#08182F" />
        </g>
      </g>
      <ellipse cx="100" cy={y} rx={r * 0.28} ry={r * 0.32 * 0.28} fill={COLORS.coreTop} />
    </g>
  );
}

/** Icon-led label. Four words maximum, by rule. */
function Cue({ tint, label, children }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <div style={{
        width: 38, height: 38, borderRadius: 12,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.06)', border: `1px solid ${tint}55`, color: tint,
      }}>
        {children}
      </div>
      <span style={{
        fontSize: 9.5, fontWeight: 900, letterSpacing: '0.1em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,0.82)', textAlign: 'center',
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
          letterSpacing: '-0.02em', margin: '0 0 16px 0', color: '#fff',
        }}>
          How to Play
        </h2>

        <svg
          viewBox="0 0 200 176"
          style={{ width: '100%', maxWidth: 288, display: 'block', margin: '0 auto 14px' }}
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="ssBall2" cx="35%" cy="32%" r="70%">
              <stop offset="0%" stopColor="#CFE4FF" />
              <stop offset="45%" stopColor="#4E96FF" />
              <stop offset="100%" stopColor="#003DA6" />
            </radialGradient>
            <linearGradient id="ssDemoSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#061634" />
              <stop offset="100%" stopColor="#08182F" />
            </linearGradient>
            <clipPath id="ssDemoClip"><rect x="2" y="2" width="196" height="172" rx="20" /></clipPath>
          </defs>

          <rect x="2" y="2" width="196" height="172" rx="20" fill="url(#ssDemoSky)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.2" />

          <g clipPath="url(#ssDemoClip)">
            <rect x="86" y="2" width="28" height="172" fill={COLORS.coreMid} />
            <rect x="86" y="2" width="10" height="172" fill={COLORS.coreTop} opacity="0.5" />

            {/* Far to near. Angles are the ones the keyframe comment solves for:
                ring 1's gap fronts at 30% (the drop), ring 2's crash arc fronts
                between 48% and 61% (inside the ball's hop) and its own gap never
                fronts while the ball is resting on it. */}
            <DemoRing y={52} gap={[165, 255]} crash={[10, 56]} />
            <DemoRing y={100} gap={[75, 165]} crash={[230, 290]} warn />
            <DemoRing y={146} gap={[-60, 20]} dim={0.55} />

            <g transform="translate(100 58)">
              <g className="ss-htp-fall">
                <circle cx="0" cy="0" r="11" fill="url(#ssBall2)" />
                <path
                  d="M0 -6.8 L5.1 -3.3 L5.1 1.5 Q4.2 6.6 0 7.5 Q-4.2 6.6 -5.1 1.5 L-5.1 -3.3 Z"
                  fill="rgba(255,255,255,0.92)"
                />
              </g>
            </g>

            {/* Depth fog over the bottom ring — also the backdrop the thumb
                needs to stay legible. */}
            <rect x="2" y="126" width="196" height="48" fill="rgba(4,10,22,0.74)" />

            {/* Thumb track and the thumb itself. */}
            <path d="M64 158 H136" stroke="rgba(255,255,255,0.16)" strokeWidth="2"
              strokeLinecap="round" strokeDasharray="3 5" />
            <g transform="translate(100 158)">
              <g className="ss-htp-drag">
                <circle cx="0" cy="0" r="10" fill="rgba(242,101,34,0.26)"
                  stroke={COLORS.orangeLt} strokeWidth="2" />
                <circle cx="0" cy="0" r="3.4" fill={COLORS.orangeLt} />
                <path d="M4.5 6.5 L11 15 L2.5 12.5 Z" fill={COLORS.orangeLt} opacity="0.9" />
              </g>
            </g>
          </g>
        </svg>

        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <Cue tint={COLORS.orangeLt} label="Drag">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12h16" />
              <path d="M7 9l-3 3 3 3M17 9l3 3-3 3" />
            </svg>
          </Cue>
          <Cue tint={COLORS.danger} label={`Max ${GAME_CONFIG.fall.maxRings} drops`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 4l6 6 6-6M6 12l6 6 6-6" />
            </svg>
          </Cue>
          <Cue tint={COLORS.virus} label="Avoid green">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="5.2" fill="currentColor" />
              <circle cx="12" cy="12" r="2.2" fill="rgba(11,18,33,0.65)" />
              <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2.6v2.6M12 18.8v2.6M2.6 12h2.6M18.8 12h2.6" />
                <path d="M5.4 5.4l1.9 1.9M16.7 16.7l1.9 1.9M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9" />
              </g>
            </svg>
          </Cue>
        </div>

        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%', height: 52, border: 'none', borderRadius: 12,
              fontSize: 18, fontWeight: 900, color: '#fff',
              textTransform: 'uppercase', letterSpacing: '0.05em',
              background: `linear-gradient(180deg, ${COLORS.brandBlueLt} 0%, ${COLORS.brandBlue} 100%)`,
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
  const rings = stats?.rings || 0;
  const smashes = stats?.smashes || 0;
  const streak = stats?.streak || 0;
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
    const shareMessage = `Hi,\nI rode ${rings} of ${GAME_CONFIG.tower.rings} market cycles down and scored ${score} points in the ${GAME_TITLE} challenge.\nVolatility is survivable when you are covered. Take your run here: ${shareUrl}`.trim();

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
  const strokeColor = won ? COLORS.green : score < 400 ? COLORS.danger : COLORS.gold;
  const glowColor = won ? 'rgba(40,167,69,0.45)' : score < 400 ? 'rgba(239,68,68,0.4)' : 'rgba(255,200,69,0.4)';

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
          {won ? <VaultIcon size={20} /> : <RiskIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Vault reached' : 'Run ended'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: COLORS.brandBlueLt }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your descent.</span>
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
        <StatTile label="Rings" value={`${rings}/${GAME_CONFIG.tower.rings}`} accent={COLORS.brandBlueLt} />
        <StatTile label="Smashes" value={smashes} accent={COLORS.orangeLt} />
        <StatTile label="Best streak" value={streak} accent={COLORS.gold} />
      </div>

      {/* Milestone chips */}
      <div style={{
        display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6,
        width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2,
      }}>
        {MILESTONE_LIST.map((ms, i) => {
          const hit = rings >= ms.ring;
          return (
            <span
              key={ms.ring}
              className="ss-chip"
              style={{
                animationDelay: `${180 + i * 90}ms`,
                fontSize: 10.5,
                fontWeight: 800,
                padding: '5px 11px',
                borderRadius: 999,
                color: hit ? '#fff' : 'rgba(255,255,255,0.4)',
                background: hit ? 'rgba(0,61,166,0.9)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${hit ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)'}`,
              }}
            >
              {ms.label}
            </span>
          );
        })}
      </div>

      <button
        onClick={handleShare}
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          background: COLORS.brandBlueLt, color: '#fff', fontWeight: 900,
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
          You rode the cycles down on screen. A specialist can help you ride the real ones.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: `linear-gradient(180deg, ${COLORS.orangeLt} 0%, ${COLORS.orange} 100%)`,
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
