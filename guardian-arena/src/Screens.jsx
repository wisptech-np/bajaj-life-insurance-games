// Screens.jsx — Home, How to Play, and Results screens for Guardian Arena.
// Same design language as guardian-shelter (glass cards, deep blue, Poppins),
// with pure-gradient backdrops and inline SVG art — no image assets.
import React from 'react';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const BG = 'linear-gradient(180deg, #0B1221 0%, #0d2149 55%, #071630 100%)';

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

/* ─── Hero art: guardian holding the arena against virus blobs ── */
function HeroArt() {
  return (
    <svg width="250" height="250" viewBox="0 0 200 200" style={{ overflow: 'visible' }} aria-hidden="true">
      <defs>
        <radialGradient id="guaHeroBody" cx="0.38" cy="0.34" r="1">
          <stop offset="0%" stopColor="#7FC0FF" />
          <stop offset="55%" stopColor="#1E6BE0" />
          <stop offset="100%" stopColor="#00246B" />
        </radialGradient>
        <radialGradient id="guaHeroVirus" cx="0.38" cy="0.34" r="1">
          <stop offset="0%" stopColor="#8DF08F" />
          <stop offset="60%" stopColor="#49E24B" />
          <stop offset="100%" stopColor="#1D8F2C" />
        </radialGradient>
      </defs>

      {/* Glass arena plate */}
      <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
      <rect x="26" y="26" width="148" height="148" rx="20" fill="none" stroke="rgba(127,192,255,0.28)" strokeWidth="1.6" strokeDasharray="7 6" />

      {/* Virus blobs closing in */}
      <g transform="translate(50, 52)">
        <circle r="13" fill="url(#guaHeroVirus)" />
        <g stroke="#2FBF3F" strokeWidth="3" strokeLinecap="round">
          <line x1="-17" y1="0" x2="17" y2="0" />
          <line x1="0" y1="-17" x2="0" y2="17" />
          <line x1="-12" y1="-12" x2="12" y2="12" />
          <line x1="-12" y1="12" x2="12" y2="-12" />
        </g>
        <circle r="12" fill="url(#guaHeroVirus)" />
        <circle r="5.5" fill="#0E5C1D" />
      </g>
      <g transform="translate(152, 78)">
        <circle r="9" fill="url(#guaHeroVirus)" />
        <g stroke="#2FBF3F" strokeWidth="2.4" strokeLinecap="round">
          <line x1="-12" y1="0" x2="12" y2="0" />
          <line x1="0" y1="-12" x2="0" y2="12" />
          <line x1="-8.5" y1="-8.5" x2="8.5" y2="8.5" />
        </g>
        <circle r="8.4" fill="url(#guaHeroVirus)" />
        <circle r="3.8" fill="#0E5C1D" />
      </g>
      <g transform="translate(136, 152)">
        <circle r="11" fill="url(#guaHeroVirus)" />
        <g stroke="#2FBF3F" strokeWidth="2.6" strokeLinecap="round">
          <line x1="-14" y1="0" x2="14" y2="0" />
          <line x1="0" y1="-14" x2="0" y2="14" />
          <line x1="-10" y1="10" x2="10" y2="-10" />
        </g>
        <circle r="10.2" fill="url(#guaHeroVirus)" />
        <circle r="4.6" fill="#0E5C1D" />
      </g>

      {/* Bolts streaking toward the blobs */}
      <g stroke="#9FD1FF" strokeWidth="3.4" strokeLinecap="round">
        <line x1="86" y1="102" x2="66" y2="72" opacity="0.9" />
        <line x1="112" y1="100" x2="140" y2="86" opacity="0.75" />
        <line x1="110" y1="118" x2="128" y2="140" opacity="0.6" />
      </g>

      {/* The guardian */}
      <g transform="translate(96, 112)">
        <ellipse cx="0" cy="24" rx="19" ry="6.5" fill="rgba(0,0,0,0.4)" />
        <circle r="22" fill="url(#guaHeroBody)" stroke="rgba(191,224,255,0.8)" strokeWidth="1.6" />
        {/* Shield emblem */}
        <path
          d="M0,-12 L9.5,-7.5 L9.5,1.5 C9.5,7.5 5,10.8 0,13 C-5,10.8 -9.5,7.5 -9.5,1.5 L-9.5,-7.5 Z"
          fill="rgba(255,255,255,0.94)"
        />
        <path
          d="M0,-7.4 L5.8,-4.6 L5.8,1 C5.8,4.6 3,6.7 0,8 C-3,6.7 -5.8,4.6 -5.8,1 L-5.8,-4.6 Z"
          fill="#003DA6"
        />
        <ellipse cx="-7" cy="-9" rx="5" ry="2.8" fill="rgba(255,255,255,0.4)" transform="rotate(-30 -7 -9)" />
      </g>

      {/* Target reticle on the big blob */}
      <g transform="translate(50, 52)" stroke="#FF8A3D" strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M -22 -8 A 23.5 23.5 0 0 1 -8 -22" />
        <path d="M 8 -22 A 23.5 23.5 0 0 1 22 -8" />
        <path d="M 22 8 A 23.5 23.5 0 0 1 8 22" />
        <path d="M -8 22 A 23.5 23.5 0 0 1 -22 8" />
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
        padding: '50px 24px 64px',
        background: BG,
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 style={{
          fontSize: 32,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 6px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}>
          Guardian Arena
        </h1>
        <p style={{
          fontSize: 13,
          fontWeight: 700,
          color: '#FF8A3D',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          margin: 0,
          textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
        }}>
          Layered Protection, Wave After Wave
        </p>
      </div>

      <div style={{
        position: 'relative',
        width: 250,
        height: 250,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
      }}>
        <HeroArt />
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
        background: BG,
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
        <h2 style={{
          fontSize: 26,
          fontWeight: 900,
          textTransform: 'uppercase',
          letterSpacing: '-0.02em',
          margin: '0 0 20px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        {/* Animated demo: move (silent) → stop (fire) → repeat */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 170,
          background: 'rgba(5, 20, 45, 0.5)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes guaTutGuardian {
              0%   { transform: translate(0, 0); }
              28%  { transform: translate(64px, -18px); }
              38%, 100% { transform: translate(64px, -18px); }
            }
            @keyframes guaTutBolt {
              0%, 44% { opacity: 0; transform: translate(0, 0); }
              48% { opacity: 1; transform: translate(0, 0); }
              62% { opacity: 1; transform: translate(96px, -26px); }
              64%, 100% { opacity: 0; transform: translate(96px, -26px); }
            }
            @keyframes guaTutVirus {
              0%, 60% { opacity: 1; transform: scale(1); }
              66% { opacity: 1; transform: scale(1.35); }
              70%, 88% { opacity: 0; transform: scale(0.1); }
              96%, 100% { opacity: 1; transform: scale(1); }
            }
            @keyframes guaTutFinger {
              0%   { opacity: 1; transform: translate(0, 0); }
              28%  { opacity: 1; transform: translate(64px, -18px); }
              34%  { opacity: 0; transform: translate(64px, -10px); }
              100% { opacity: 0; transform: translate(64px, -10px); }
            }
          ` }} />

          {/* Virus target */}
          <div style={{ position: 'absolute', right: 34, top: 38, width: 30, height: 30, animation: 'guaTutVirus 4s ease-in-out infinite' }}>
            <svg width="30" height="30" viewBox="0 0 30 30">
              <g stroke="#2FBF3F" strokeWidth="2.4" strokeLinecap="round">
                <line x1="2" y1="15" x2="28" y2="15" />
                <line x1="15" y1="2" x2="15" y2="28" />
                <line x1="6" y1="6" x2="24" y2="24" />
                <line x1="6" y1="24" x2="24" y2="6" />
              </g>
              <circle cx="15" cy="15" r="10" fill="#49E24B" />
              <circle cx="15" cy="15" r="4.5" fill="#0E5C1D" />
            </svg>
          </div>

          {/* Guardian moving then planting */}
          <div style={{ position: 'absolute', left: 46, top: 96, width: 34, height: 34, animation: 'guaTutGuardian 4s ease-in-out infinite' }}>
            <svg width="34" height="34" viewBox="0 0 34 34">
              <circle cx="17" cy="17" r="14" fill="#1E6BE0" stroke="#9FD1FF" strokeWidth="1.6" />
              <path d="M17 8 l6.5 3 v6 c0 4-3 6.4-6.5 8 c-3.5-1.6-6.5-4-6.5-8 v-6 Z" fill="rgba(255,255,255,0.94)" />
              <path d="M17 11.4 l3.8 1.8 v3.6 c0 2.4-1.8 3.8-3.8 4.8 c-2-1-3.8-2.4-3.8-4.8 v-3.6 Z" fill="#003DA6" />
            </svg>
          </div>

          {/* Bolt fired once stationary */}
          <div style={{ position: 'absolute', left: 82, top: 106, width: 18, height: 8, animation: 'guaTutBolt 4s linear infinite' }}>
            <svg width="18" height="8" viewBox="0 0 18 8">
              <line x1="1" y1="4" x2="11" y2="4" stroke="rgba(127,192,255,0.6)" strokeWidth="3" strokeLinecap="round" />
              <circle cx="14" cy="4" r="3.4" fill="#DFF0FF" />
            </svg>
          </div>

          {/* Finger dragging the joystick */}
          <div style={{ position: 'absolute', left: 58, top: 118, width: 30, height: 30, animation: 'guaTutFinger 4s ease-in-out infinite', zIndex: 5 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5">
              <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
              <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
            </svg>
          </div>

          <div style={{
            position: 'absolute',
            bottom: 8,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 9,
            fontWeight: 900,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.55)',
          }}>
            Move · Stop · Fire · Repeat
          </div>
        </div>

        <div style={{
          textAlign: 'left',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 14,
          lineHeight: 1.45,
          marginBottom: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>1.</span>
            <span><strong>Hold and drag anywhere</strong> to move your guardian — a floating joystick appears under your finger.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>2.</span>
            <span><strong>Stand still to auto-fire</strong> at the nearest virus. Moving stops the firing — dodge, plant your feet, shoot.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>3.</span>
            <span>Clear a wave, <strong>pick 1 of 3 rider upgrades</strong>, and survive all {GAME_CONFIG.waves.length} waves — down the mini-boss to win big.</span>
          </div>
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
    const shareMessage = `Hi,\nI scored ${score} points defending the Guardian Arena.\nLayered protection wins — every rider counts! Take the challenge: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Guardian Arena',
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
  const targetScore = GAME_CONFIG.scoring.winTargetForRing;
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
        background: BG,
      }}
    >
      {won && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Guardian'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Arena Defended' : 'Your Score'}
          </span>
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#0f172a" strokeWidth="10" />
            <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />
            <circle
              cx="100" cy="100" r={radius} fill="none"
              stroke={strokeColor} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                filter: `drop-shadow(0 0 8px ${glowColor})`,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
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

      {/* Run stats strip */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 18,
        width: '100%',
        maxWidth: 340,
        justifyContent: 'center',
      }}>
        {[
          { label: 'Kills', value: stats?.kills ?? 0 },
          { label: 'Waves', value: `${stats?.wavesCleared ?? 0}/${GAME_CONFIG.waves.length}` },
          { label: 'HP Left', value: stats?.hpLeft ?? 0 },
        ].map((it) => (
          <div key={it.label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '8px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{it.value}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)' }}>{it.label}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {won
            ? 'Every rider you added held the line. Layered cover protects a family the same way.'
            : 'One layer of cover is never enough. Add riders before the next wave hits.'}
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
          Consult a specialist to layer the right riders onto your family&apos;s cover.
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

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
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
              padding: '12px 20px',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
            }}
          >
            <RotateIcon />
            <span>{won ? 'Play again' : 'Try again'}</span>
          </button>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <button
            onClick={onHome}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              fontSize: 16,
              fontWeight: 'bold',
              letterSpacing: '0.05em',
              padding: '12px 20px',
              textTransform: 'uppercase',
              transition: 'color 0.2s',
            }}
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 10.5 12 3l9 7.5" />
              <path d="M5 9.5V21h14V9.5" />
            </svg>
            <span>Home</span>
          </button>
        </motion.div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
