// Screens.jsx — Home, How to Play, and Results screens for Steady Tower.
// All art is inline SVG or CSS: no image files, no emoji.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import { GAME_CONFIG, RESULT_TARGET_SCORE } from './data.js';

const GAME_TITLE = 'Steady Tower';
const GAME_TAGLINE = 'Remove the risks. Keep your life plan standing.';
const GAME_HOWTO = "Flick red risk blocks out · Watch the stability meter · Don't topple the tower";

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

/** Run-ended mark: a stack that did not stay up. */
function ToppleIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect x="7" y="23" width="18" height="5" rx="1.6" fill="#fff" />
      <rect x="8" y="16" width="16" height="5" rx="1.6" fill="#fff" opacity="0.9"
        transform="rotate(-7 16 18.5)" />
      <rect x="10" y="9" width="16" height="5" rx="1.6" fill="#fff" opacity="0.78"
        transform="rotate(-17 18 11.5)" />
      <rect x="2" y="4" width="14" height="5" rx="1.6" fill="#fff" opacity="0.6"
        transform="rotate(-42 9 6.5)" />
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
      <path d="M21 12a9 9 0 1 1-2.64-6.36" />
      <path d="M21 3v6h-6" />
    </svg>
  );
}

function HomeIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle' }}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

/* ─── Shared keyframes ───────────────────────────────── */
const SCREEN_CSS = `
@keyframes stTitleIn { from { opacity: 0; letter-spacing: 0.24em; transform: translateY(10px); } to { opacity: 1; letter-spacing: -0.03em; transform: none; } }
@keyframes stHeroLean { 0%,100% { transform: skewX(0deg); } 45% { transform: skewX(-3.2deg); } 70% { transform: skewX(1.4deg); } }
@keyframes stHeroPull {
  0%, 12%   { transform: translateX(-88px); opacity: 1; }
  38%, 100% { transform: translateX(0); opacity: 0; }
}
@keyframes stHeroArrow { 0%,100% { opacity: 0.25; transform: translateX(-4px); } 45% { opacity: 1; transform: translateX(4px); } }
@keyframes stBeatFlick { 0%,18% { transform: translateX(0); opacity: 1; } 48%,100% { transform: translateX(26px); opacity: 0; } }
@keyframes stBeatNeedle { 0%,20% { transform: translateX(0); } 55%,100% { transform: translateX(13px); } }
@keyframes stBeatTip { 0%,25% { transform: skewX(0deg); } 60%,100% { transform: skewX(-9deg); } }
@keyframes stChip { from { opacity: 0; transform: translateY(8px) scale(0.9); } to { opacity: 1; transform: none; } }
.st-title      { animation: stTitleIn 700ms cubic-bezier(0.22,1,0.36,1) both; }
.st-hero-lean  { animation: stHeroLean 4.2s ease-in-out infinite; }
.st-hero-pull  { animation: stHeroPull 4.2s cubic-bezier(0.22,1,0.36,1) infinite; }
.st-hero-arrow { animation: stHeroArrow 4.2s ease-in-out infinite; }
.st-beat-flick { animation: stBeatFlick 2.6s cubic-bezier(0.22,1,0.36,1) infinite; }
.st-beat-needle{ animation: stBeatNeedle 2.6s cubic-bezier(0.22,1,0.36,1) infinite; }
.st-beat-tip   { animation: stBeatTip 2.6s cubic-bezier(0.22,1,0.36,1) infinite; transform-origin: 37px 56px; }
.st-chip       { animation: stChip 420ms cubic-bezier(0.22,1,0.36,1) both; }
@media (prefers-reduced-motion: reduce) {
  .st-title, .st-hero-lean, .st-hero-pull, .st-hero-arrow,
  .st-beat-flick, .st-beat-needle, .st-beat-tip, .st-chip { animation: none !important; }
}
`;

/* Bottom layer first. 'blue' | 'red' | 'gone' — the gap in layer 4 is the risk
   this hero has just pulled, which is why the stack is leaning. */
const HERO_LAYERS = [
  ['blue', 'blue', 'blue'],
  ['blue', 'blue', 'blue'],
  ['blue', 'red', 'blue'],
  ['blue', 'blue', 'blue'],
  ['gone', 'blue', 'blue'],
  ['blue', 'blue', 'red'],
  ['blue', 'blue', 'blue'],
  ['red', 'blue', 'blue'],
];

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
        background: 'radial-gradient(ellipse at 50% 28%, rgba(14, 79, 148, 0.55), rgba(11, 18, 33, 0.96) 72%), #0B1221',
        overflow: 'hidden',
      }}
    >
      <style dangerouslySetInnerHTML={{ __html: SCREEN_CSS }} />

      {/* Title & Brand Section */}
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 className="st-title" style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 8px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)'
        }}>
          {GAME_TITLE}
        </h1>
        <p style={{
          fontSize: 12.5,
          fontWeight: 800,
          color: '#FF8A3D',
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          margin: '0 auto',
          maxWidth: 300,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
        }}>
          {GAME_TAGLINE}
        </p>
      </div>

      {/* Hero: the tower itself, mid-pull and leaning. Same construction the
          canvas uses — a sheared stack of three-block layers — so the screen
          previews the game rather than illustrating it. */}
      <div style={{
        position: 'relative',
        width: 250,
        height: 240,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1
      }}>
        <svg width="250" height="240" viewBox="0 0 200 190" style={{ overflow: 'visible' }} aria-hidden="true">
          <defs>
            <linearGradient id="stBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#2C6BC8" />
              <stop offset="65%" stopColor="#154B94" />
              <stop offset="100%" stopColor="#0B2F6A" />
            </linearGradient>
            <linearGradient id="stRed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#E8563F" />
              <stop offset="65%" stopColor="#B32B2B" />
              <stop offset="100%" stopColor="#7C1522" />
            </linearGradient>
            <clipPath id="stHeroClip"><rect x="6" y="6" width="188" height="178" rx="28" /></clipPath>
          </defs>

          <rect x="6" y="6" width="188" height="178" rx="28" fill="rgba(255,255,255,0.06)"
            stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

          <g clipPath="url(#stHeroClip)">
            {HERO_LAYERS.map((row, i) => {
              const y = 156 - i * 12;
              const shift = i * 1.15;
              return (
                <g key={i} className="st-hero-lean" style={{ transformOrigin: '100px 162px' }}>
                  {row.map((kind, s) => {
                    if (kind === 'gone') return null;
                    const x = 62 + s * 26 + shift;
                    return (
                      <g key={s}>
                        <rect x={x} y={y} width="24" height="10" rx="2.4"
                          fill={kind === 'red' ? 'url(#stRed)' : 'url(#stBlue)'} />
                        <rect x={x + 0.6} y={y + 0.6} width="22.8" height="2.6" rx="1.2"
                          fill={kind === 'red' ? '#FF8A72' : '#5C9AEA'} opacity="0.85" />
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Base plate */}
            <rect x="48" y="164" width="104" height="10" rx="3" fill="#24406E" />
            <rect x="48" y="164" width="104" height="2.4" rx="1.2" fill="rgba(143,185,245,0.45)" />

            {/* The block being flicked out, with its motion arrow */}
            <g className="st-hero-pull">
              <rect x="150" y="96" width="24" height="10" rx="2.4" fill="url(#stRed)" />
              <rect x="150.6" y="96.6" width="22.8" height="2.6" rx="1.2" fill="#FF8A72" opacity="0.85" />
            </g>
            <path className="st-hero-arrow" d="M140 101 h30 m-7 -5 l7 5 l-7 5"
              fill="none" stroke="#FF8A3D" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />

            {/* Stability read-out under the stack */}
            <rect x="56" y="176" width="88" height="5" rx="2.5" fill="rgba(255,255,255,0.14)" />
            <rect x="70" y="176" width="60" height="5" rx="2.5" fill="#28A745" />
            <rect x="118" y="173.5" width="3" height="10" rx="1.5" fill="#FF8A3D" />
          </g>
        </svg>
      </div>

      {/* Start Button */}
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
            borderRadius: '12px',
            fontSize: 20,
            fontWeight: 900,
            color: '#fff',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            background: 'linear-gradient(180deg, #FF8A3D 0%, #F26522 100%)',
            boxShadow: '0 6px 20px rgba(242, 101, 34, 0.4)',
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
/** A three-layer stub of the tower, reused by two of the three beats. */
function BeatStack() {
  return (
    <g>
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${i * 1.4}, ${52 - i * 10})`}>
          <rect x="16" y="0" width="42" height="9" rx="2.2" fill="url(#stBlueB)" />
          <rect x="16.6" y="0.6" width="40.8" height="2.4" rx="1.2" fill="#5C9AEA" opacity="0.8" />
          <line x1="30" y1="0" x2="30" y2="9" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
          <line x1="44" y1="0" x2="44" y2="9" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
        </g>
      ))}
    </g>
  );
}

/** One beat of the flick - read - hold loop. Pure CSS-animated SVG. */
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
      <div style={{ width: 74, height: 66, flexShrink: 0 }}>{children}</div>
      <div style={{ textAlign: 'left' }}>
        <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '0.18em', color: '#FF8A3D', textTransform: 'uppercase' }}>
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
        padding: '24px',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.95) 70%), #051a3a',
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'rgba(0, 30, 70, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '30px 24px 24px',
        width: '100%',
        maxWidth: 360,
        boxShadow: '0 12px 36px rgba(0,0,0,0.4)',
        textAlign: 'center',
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Title */}
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 20px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          How to Play
        </h2>

        {/* Three beats of the loop, as CSS-animated SVG */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          <Beat n="1" title="Flick a red risk out" copy="Red blocks are debt, junk funds, punts. Flick one sideways to pull it.">
            <svg width="74" height="66" viewBox="0 0 74 66" aria-hidden="true">
              <BeatStack />
              <g className="st-beat-flick">
                <rect x="45" y="30" width="22" height="9" rx="2.2" fill="url(#stRedB)" />
                <rect x="45.6" y="30.6" width="20.8" height="2.4" rx="1.2" fill="#FF8A72" opacity="0.85" />
              </g>
              <path d="M40 34.5 h22 m-6 -4.5 l6 4.5 l-6 4.5" fill="none" stroke="#FF8A3D"
                strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
            </svg>
          </Beat>

          <Beat n="2" title="Watch the stability meter" copy="It shows how far the centre of mass has drifted. It heartbeats when critical.">
            <svg width="74" height="66" viewBox="0 0 74 66" aria-hidden="true">
              <rect x="6" y="26" width="62" height="7" rx="3.5" fill="rgba(255,255,255,0.14)" />
              <rect x="17" y="26" width="40" height="7" rx="3.5" fill="#28A745" />
              <rect x="36.5" y="23" width="1.4" height="13" fill="rgba(255,255,255,0.42)" />
              <g className="st-beat-needle">
                <rect x="35.5" y="22" width="3" height="15" rx="1.5" fill="#FF8A3D" />
              </g>
              <text x="37" y="49" fill="rgba(255,255,255,0.72)" fontSize="9" fontWeight="900"
                textAnchor="middle" fontFamily="'Plus Jakarta Sans', sans-serif">STABILITY</text>
            </svg>
          </Beat>

          <Beat n="3" title="Don't topple the tower" copy="Yanking, or pulling the wrong support, racks the stack until it goes.">
            <svg width="74" height="66" viewBox="0 0 74 66" aria-hidden="true">
              <g className="st-beat-tip"><BeatStack /></g>
              <rect x="16" y="56" width="42" height="5" rx="2" fill="#24406E" />
            </svg>
          </Beat>
        </div>

        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.62)', margin: '0 0 16px 0', lineHeight: 1.45 }}>
          {GAME_HOWTO}
          <br />
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.tower.redCount} risks</strong> ·{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.tower.layers} layers</strong> ·{' '}
          <strong style={{ color: '#fff' }}>{GAME_CONFIG.sessionSeconds}s</strong>
        </p>

        {/* Play Button */}
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
              cursor: 'pointer'
            }}
          >
            Play Game
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot }) {
  const score = stats?.score || 0;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    let start = 0;
    const end = score;
    if (start === end) {
      setAnimatedScore(end);
      return;
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
    const shareMessage = `Hi,\nI secured ${score} points in the Guardian Shelter challenge.\nPreemptive risk protection makes all the difference! Protect your family here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Guardian Shelter',
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
  const targetScore = 1500;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = score < 500 ? "#ef4444" : "#28A745";
  const glowColor = score < 500 ? "rgba(239, 68, 68, 0.4)" : "rgba(40, 167, 69, 0.4)";

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
        background: 'radial-gradient(ellipse at 50% 30%, rgba(14, 79, 148, 0.55), rgba(5, 26, 58, 0.95) 70%), #051a3a',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {won && <Confetti />}

      {/* Header / Top Bar */}
      <div style={{ textAlign: 'center', marginBottom: 20, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>Your Score</span>
        </p>
      </div>

      {/* Circular Progress Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 24 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            {/* Background ring */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke="#0f172a"
              strokeWidth="10"
            />
            {/* Outline border decor */}
            <circle
              cx="100"
              cy="100"
              r={radius + 6}
              fill="none"
              stroke="#1e293b"
              strokeWidth="1"
              opacity="0.3"
            />
            {/* Progress circle */}
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                filter: `drop-shadow(0 0 8px ${glowColor})`,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          {/* Inner Text */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span style={{ fontSize: 26, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.02em', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span style={{ fontSize: 9, fontWeight: 900, color: 'rgba(255, 255, 255, 0.6)', marginTop: 4, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
              POINTS
            </span>
          </div>
        </div>
      </div>

      {/* Motivational Message */}
      <div style={{ textAlign: 'center', marginBottom: 24, padding: '0 16px' }}>
        <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Preemptive protection shields your family's future from unexpected storms.
        </h2>
      </div>

      {/* Primary Action */}
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
          marginBottom: 24,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background 0.2s',
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Action Card Section */}
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
          Consult a specialist to shield your goals against potential risks.
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

      {/* Play again action */}
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
            marginBottom: 16,
          }}
        >
          <RotateIcon />
          <span>Play again</span>
        </button>
      </motion.div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
