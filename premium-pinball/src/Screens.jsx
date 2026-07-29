// Screens.jsx — Home, How to Play, and Results screens for Premium Pinball.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, GOALS, RESULT_TARGET_SCORE, SCORE_LADDER } from './data.js';

const GAME_TITLE = 'Premium Pinball';

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

/** Run-ended mark: a ball that slipped past two open flippers. */
function DrainIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path d="M5 12l7 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <path d="M27 12l-7 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="24" r="4" fill="#fff" />
      <path d="M16 4v8" stroke="#fff" strokeWidth="2" strokeDasharray="2 3" opacity="0.75" />
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
@keyframes ppHeroBall {
  0%      { transform: translate(176px, 152px); }
  12%     { transform: translate(176px, 40px); }
  24%     { transform: translate(126px, 34px); }
  36%     { transform: translate(112px, 62px); }
  48%     { transform: translate(74px, 84px); }
  60%     { transform: translate(120px, 98px); }
  72%     { transform: translate(88px, 128px); }
  86%     { transform: translate(66px, 156px); }
  100%    { transform: translate(176px, 152px); }
}
@keyframes ppHeroFlipL { 0%,64% { transform: rotate(0deg); } 74% { transform: rotate(-56deg); } 88%,100% { transform: rotate(0deg); } }
@keyframes ppHeroBumper { 0%,44% { opacity: 0.6; } 52% { opacity: 1; } 70%,100% { opacity: 0.6; } }
@keyframes ppBeatPlunge { 0%,20% { transform: translateY(0); } 40% { transform: translateY(6px); } 70%,100% { transform: translateY(-26px); } }
@keyframes ppBeatFlip { 0%,45% { transform: rotate(0deg); } 60% { transform: rotate(-52deg); } 85%,100% { transform: rotate(0deg); } }
@keyframes ppBeatLamp { 0%,30% { opacity: 0.25; } 45%,100% { opacity: 1; } }
.pp-title  { animation: ppTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-float  { animation: ppFloat 4s ease-in-out infinite; }
.pp-glow   { animation: ppGlow 2.2s ease-in-out infinite; }
.pp-chip   { animation: ppChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
.pp-hero-ball   { animation: ppHeroBall 5.2s cubic-bezier(0.45,0,0.55,1) infinite; }
.pp-hero-flip   { animation: ppHeroFlipL 5.2s ease-out infinite; transform-origin: 0 0; }
.pp-hero-bumper { animation: ppHeroBumper 5.2s ease-in-out infinite; }
.pp-beat-plunge { animation: ppBeatPlunge 2.4s ease-in-out infinite; }
.pp-beat-flip   { animation: ppBeatFlip 2.4s ease-out infinite; transform-origin: 0 0; }
.pp-beat-lamp   { animation: ppBeatLamp 2.4s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .pp-title, .pp-float, .pp-glow, .pp-chip, .pp-hero-ball, .pp-hero-flip, .pp-hero-bumper,
  .pp-beat-plunge, .pp-beat-flip, .pp-beat-lamp { animation: none !important; }
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
 * Hero motif: the table itself, in miniature — plunger lane on the right, three
 * rollover lanes across the top, the Education / Home / Retirement goal bumpers,
 * two slingshots and a pair of flippers, with a ball running the orbit. Same
 * arrangement the canvas uses, so the screen previews the game rather than
 * decorating it.
 */
function HeroTable() {
  return (
    <svg width="256" height="242" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <linearGradient id="ppBed" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d2a5c" />
          <stop offset="100%" stopColor="#061229" />
        </linearGradient>
        <radialGradient id="ppBall" cx="0.34" cy="0.3" r="0.75">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#D6E5FA" />
          <stop offset="100%" stopColor="#5E7FA8" />
        </radialGradient>
        <clipPath id="ppClip"><rect x="4" y="4" width="192" height="182" rx="26" /></clipPath>
      </defs>

      <rect x="4" y="4" width="192" height="182" rx="26" fill="url(#ppBed)"
        stroke="rgba(255,255,255,0.12)" strokeWidth="1.4" />

      <g clipPath="url(#ppClip)">
        <g className="pp-glow">
          <ellipse cx="96" cy="86" rx="80" ry="70" fill="rgba(38,102,196,0.22)" />
        </g>

        {/* Plunger lane */}
        <rect x="166" y="24" width="21" height="150" fill="rgba(0,0,0,0.3)" />
        <line x1="166" y1="24" x2="166" y2="174" stroke="#6E93C6" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="187" y1="24" x2="187" y2="174" stroke="#6E93C6" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="170" y="164" width="13" height="5" rx="2" fill={ORANGE_LT} />

        {/* Rollover lanes */}
        {[0, 1, 2].map((i) => (
          <g key={i}>
            <line x1={40 + i * 42} y1="24" x2={40 + i * 42} y2="46" stroke="rgba(143,184,232,0.6)" strokeWidth="2" strokeLinecap="round" />
            <circle className="pp-hero-bumper" cx={61 + i * 42} cy="18" r="3.6" fill={GOLD}
              style={{ animationDelay: `${i * 0.18}s` }} />
          </g>
        ))}
        <line x1="166" y1="24" x2="166" y2="46" stroke="rgba(143,184,232,0.6)" strokeWidth="2" strokeLinecap="round" />

        {/* Goal bumpers */}
        {[{ x: 58, y: 96, r: 13 }, { x: 100, y: 68, r: 14 }, { x: 142, y: 96, r: 13 }].map((b, i) => (
          <g key={GOALS[i].key} className="pp-hero-bumper" style={{ animationDelay: `${i * 0.22}s` }}>
            <circle cx={b.x} cy={b.y} r={b.r + 3.5} fill="none" stroke={GOALS[i].colorLt} strokeWidth="1.6" />
            <circle cx={b.x} cy={b.y} r={b.r} fill={GOALS[i].color} />
            <circle cx={b.x - b.r * 0.32} cy={b.y - b.r * 0.36} r={b.r * 0.34} fill="rgba(255,255,255,0.55)" />
            <text x={b.x} y={b.y + 2.6} fill="#fff" fontSize="6" fontWeight="900" textAnchor="middle"
              fontFamily="'Poppins', sans-serif">{GOALS[i].short}</text>
          </g>
        ))}

        {/* Slingshots */}
        <path d="M34 128 L34 148 L54 145 Z" fill="#1b4f96" stroke={ORANGE} strokeWidth="1.6" />
        <path d="M132 128 L132 148 L112 145 Z" fill="#1b4f96" stroke={ORANGE} strokeWidth="1.6" />

        {/* Funnel walls */}
        <path d="M14 118 L34 152 L52 160" fill="none" stroke="#6E93C6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M152 118 L132 152 L114 160" fill="none" stroke="#6E93C6" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />

        {/* Flippers */}
        <g transform="translate(50,158)">
          <g className="pp-hero-flip">
            <line x1="0" y1="0" x2="26" y2="15" stroke={ORANGE} strokeWidth="7" strokeLinecap="round" />
          </g>
        </g>
        <g transform="translate(116,158)">
          <line x1="0" y1="0" x2="-26" y2="15" stroke={ORANGE} strokeWidth="7" strokeLinecap="round" />
        </g>

        {/* Ball on its orbit */}
        <g className="pp-hero-ball">
          <circle cx="0" cy="0" r="5.6" fill="url(#ppBall)" />
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
        padding: '42px 24px 48px',
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
          fontSize: 12,
          fontWeight: 800,
          color: ORANGE_LT,
          letterSpacing: '0.03em',
          margin: 0,
          maxWidth: 310,
          lineHeight: 1.45,
        }}>
          Keep your family&rsquo;s cover in play &mdash; every save at the flippers
          is a premium paid on time.
        </p>
      </div>

      <div className="pp-float" style={{ position: 'relative', zIndex: 1 }}>
        <HeroTable />
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
        padding: '24px 20px 20px',
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
          Hold to charge the plunger &middot; Tap LEFT or RIGHT to flip &middot; Hold to keep a flipper up
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
          <Beat n="1" title="Charge and launch" copy="Hold anywhere to load the plunger. More power sends the ball further round the top.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <rect x="40" y="4" width="18" height="54" rx="4" fill="rgba(0,0,0,0.3)" />
              <line x1="40" y1="4" x2="40" y2="58" stroke="#6E93C6" strokeWidth="2.2" strokeLinecap="round" />
              <line x1="58" y1="4" x2="58" y2="58" stroke="#6E93C6" strokeWidth="2.2" strokeLinecap="round" />
              <g className="pp-beat-plunge">
                <circle cx="49" cy="40" r="5.4" fill="#D6E5FA" />
              </g>
              <rect x="43" y="50" width="12" height="4.5" rx="2" fill={ORANGE} />
              <rect x="10" y="14" width="5" height="34" rx="2.5" fill="rgba(255,255,255,0.12)" />
              <rect x="10" y="30" width="5" height="18" rx="2.5" fill={GOLD} />
            </svg>
          </Beat>

          <Beat n="2" title="Work the goal bumpers" copy="Education, Home and Retirement each pay out. Hit all three on one ball for a bonus.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              {[{ x: 20, y: 34 }, { x: 37, y: 18 }, { x: 54, y: 34 }].map((b, i) => (
                <g key={i} className="pp-hero-bumper" style={{ animationDelay: `${i * 0.2}s` }}>
                  <circle cx={b.x} cy={b.y} r="10.5" fill="none" stroke={GOALS[i].colorLt} strokeWidth="1.5" />
                  <circle cx={b.x} cy={b.y} r="8" fill={GOALS[i].color} />
                </g>
              ))}
              <circle cx="46" cy="50" r="4.6" fill="#D6E5FA" />
            </svg>
          </Beat>

          <Beat n="3" title="Save it at the flippers" copy="A ball down the middle is a lapsed premium. Flip it back up and keep the cover live.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <path d="M4 12 L20 38 L28 44" fill="none" stroke="#6E93C6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M70 12 L54 38 L46 44" fill="none" stroke="#6E93C6" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              <g transform="translate(26,44)">
                <g className="pp-beat-flip">
                  <line x1="0" y1="0" x2="17" y2="10" stroke={ORANGE} strokeWidth="6" strokeLinecap="round" />
                </g>
              </g>
              <line x1="48" y1="44" x2="31" y2="54" stroke={ORANGE} strokeWidth="6" strokeLinecap="round" />
              <circle cx="34" cy="26" r="4.6" fill="#D6E5FA" />
            </svg>
          </Beat>

          <Beat n="4" title="Light all three lanes" copy="Roll through the top lanes to arm Bonus Secure — everything scores double for 8 seconds.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <g key={i}>
                  <line x1={16 + i * 14} y1="16" x2={16 + i * 14} y2="36" stroke="rgba(143,184,232,0.6)" strokeWidth="2" strokeLinecap="round" />
                  <circle className="pp-beat-lamp" cx={23 + i * 14} cy="10" r="3.6" fill={GOLD}
                    style={{ animationDelay: `${i * 0.22}s` }} />
                </g>
              ))}
              <line x1="58" y1="16" x2="58" y2="36" stroke="rgba(143,184,232,0.6)" strokeWidth="2" strokeLinecap="round" />
              <rect x="12" y="44" width="50" height="12" rx="6" fill="rgba(40,167,69,0.25)" stroke={GREEN_LT} strokeWidth="1" />
              <text x="37" y="52.5" fill={GREEN_LT} fontSize="7" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">BONUS x2</text>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 12px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.balls} balls</strong> and{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong> &mdash; whichever runs out first.
          Reach <strong style={{ color: GREEN_LT }}>{RESULT_TARGET_SCORE.toLocaleString()}</strong> to win.
          <br />
          <strong style={{ color: GREEN_LT }}>Cover Note:</strong> lose a ball in its first{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.ballSave.seconds}s</strong> and it comes
          straight back &mdash; once per ball.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 16 }}>
          {SCORE_LADDER.map((row, i) => (
            <span
              key={row.key}
              className="pp-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: GOLD_LT,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                letterSpacing: '0.02em',
              }}
            >
              {row.label} {row.value}
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
      <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>
        {label}
      </div>
    </div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  // The {score, bumpers, goalsLit, combo} contract from engine.js runStats().
  const score = stats?.score || 0;
  const bumpers = stats?.bumpers || 0;
  const goalsLit = stats?.goalsLit || 0;
  const combo = stats?.combo || 0;
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
    const shareMessage = `Hi,\nI kept the ball alive for ${score} points in the ${GAME_TITLE} challenge - ${bumpers} goal bumpers hit.\nEvery save at the flippers is a premium paid on time. Take your run here: ${shareUrl}`.trim();

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
  const maxGoals = GAME_CONFIG.balls * GOALS.length;

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
          {won ? <TrophyIcon size={20} /> : <DrainIcon size={20} />}
          <span style={{ fontSize: 13, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {won ? 'Cover secured' : 'Cover lapsed'}
          </span>
        </div>
        <p style={{ color: '#fff', fontSize: 21, fontWeight: 900, lineHeight: 1.25, margin: 0 }}>
          Hi <span style={{ color: BLUE_LT }}>{leadName || 'Friend'}!</span>{' '}
          <span style={{ color: 'rgba(255,255,255,0.85)' }}>Here&rsquo;s your table.</span>
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
              SCORE
            </span>
            <span style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
              target {RESULT_TARGET_SCORE.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Run stats — the {score, bumpers, goalsLit, combo} contract */}
      <div style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 360, marginBottom: 18, zIndex: 2 }}>
        <StatTile label="Bumper hits" value={bumpers} accent={GOLD} />
        <StatTile label="Goals lit" value={`${goalsLit}/${maxGoals}`} accent={BLUE_LT} />
        <StatTile label="Best combo" value={`x${combo}`} accent={GREEN_LT} />
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
          Life keeps sending the ball back down. A specialist can show you the cover
          that keeps Education, Home and Retirement funded whatever the table throws.
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
