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
/** One beat of the read - lock - keep-the-streak loop. Pure CSS-animated SVG. */
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
        <p style={{ fontSize: 11.5, fontWeight: 800, color: ORANGE_LT, margin: '0 0 16px 0', lineHeight: 1.4 }}>
          One tap locks the marker &middot; Green pays the premium &middot; Gold is perfect
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <Beat n="1" title="Tap to lock" copy="The marker sweeps the bar. Stop it inside the green band to pay that year's premium.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <rect x="6" y="26" width="62" height="10" rx="5" fill="rgba(6,18,41,0.9)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.9" />
              <rect x="27" y="26.5" width="20" height="9" rx="4" fill={GREEN} />
              <g className="pp-beatsweep" transform="translate(37,31)">
                <rect x="-1.7" y="-13" width="3.4" height="26" rx="1.7" fill={ORANGE} />
                <path d="M0 -16 l3.6 3.6 l-3.6 3.6 l-3.6 -3.6 z" fill={ORANGE_LT} />
              </g>
            </svg>
          </Beat>

          <Beat n="2" title="Aim for the gold" copy="The sliver at the centre is a PERFECT: double points and a combo step, up to x4.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <rect x="6" y="26" width="62" height="10" rx="5" fill="rgba(6,18,41,0.9)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.9" />
              <rect x="27" y="26.5" width="20" height="9" rx="4" fill={GREEN} />
              <rect className="pp-beatperfect" x="34" y="24.5" width="6" height="13" rx="2.6" fill={GOLD} />
              <g transform="translate(37,31)">
                <rect x="-1.7" y="-13" width="3.4" height="26" rx="1.7" fill={ORANGE} />
              </g>
              <text x="37" y="55" fill={GOLD_LT} fontSize="8" fontWeight="900" textAnchor="middle"
                fontFamily="'Poppins', sans-serif">x2</text>
            </svg>
          </Beat>

          <Beat n="3" title="Mind the grace" copy="Miss the band and one of three grace periods is gone — and the stage comes round again, faster.">
            <svg width="74" height="62" viewBox="0 0 74 62" aria-hidden="true">
              <rect x="6" y="22" width="62" height="10" rx="5" fill="rgba(6,18,41,0.9)" stroke="rgba(255,255,255,0.22)" strokeWidth="0.9" />
              <rect x="20" y="22.5" width="16" height="9" rx="4" fill={GREEN} />
              <g transform="translate(57,27)">
                <rect x="-1.7" y="-12" width="3.4" height="24" rx="1.7" fill={DANGER} />
              </g>
              <g className="pp-beatmiss" transform="translate(37,50)">
                {[0, 1, 2].map((i) => (
                  <path
                    key={i}
                    transform={`translate(${(i - 1) * 15},0) scale(0.55)`}
                    d="M0 -10 L-8 -7 v6 c0 5 3.5 9 8 11 4.5 -2 8 -6 8 -11 v-6 z"
                    fill={i < 2 ? GREEN_LT : 'rgba(255,255,255,0.18)'}
                  />
                ))}
              </g>
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', margin: '0 0 14px 0', lineHeight: 1.45 }}>
          <strong style={{ color: '#fff' }}>{TOTAL_STAGES} premiums</strong> from age{' '}
          <strong style={{ color: '#fff' }}>{STAGES[0].age}</strong> to{' '}
          <strong style={{ color: '#fff' }}>{STAGES[TOTAL_STAGES - 1].age}</strong>, in{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong>. Clear all{' '}
          {TOTAL_STAGES} before the clock or your{' '}
          <strong style={{ color: GREEN_LT }}>{GAME_CONFIG.gracePeriods} grace periods</strong> run out.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 5, marginBottom: 18 }}>
          {[
            { key: 'green', text: 'Green = paid', color: GREEN_LT },
            { key: 'gold', text: 'Gold = perfect x2', color: GOLD_LT },
            { key: 'topup', text: `Top-up +${GAME_CONFIG.topUp.bonus}`, color: ORANGE_LT },
            { key: 'arc', text: 'Every 4th bends', color: BLUE_LT },
          ].map((c, i) => (
            <span
              key={c.key}
              className="pp-chip"
              style={{
                animationDelay: `${140 + i * 80}ms`,
                fontSize: 10,
                fontWeight: 900,
                padding: '4px 9px',
                borderRadius: 999,
                color: c.color,
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.14)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {c.text}
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
