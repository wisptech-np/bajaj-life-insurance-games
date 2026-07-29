// Screens.jsx — Home, How to Play, and Results screens for Legacy Echo.
// Matches the project design language (glassmorphism, deep blue, clean buttons).
// Backdrops are gradient washes (goal-juggler precedent) — no binary assets.
import React from 'react';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const ECHO_BG = [
  'radial-gradient(ellipse 120% 55% at 50% 0%, rgba(30,107,224,0.35), rgba(5,10,25,0) 70%)',
  'radial-gradient(circle 200px at 50% 42%, rgba(79,195,247,0.16), rgba(5,10,25,0) 75%)',
  'radial-gradient(ellipse 140% 45% at 50% 100%, rgba(242,101,34,0.14), rgba(5,10,25,0) 72%)',
  'linear-gradient(180deg, #0A1A38 0%, #0F1D42 45%, #070E22 100%)',
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
  const colors = ['#FFC845', '#FFE38A', '#FF8533', '#4FC3F7', '#B39DDB', '#28A745', '#F48FB1'];
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

/* ─── Hero mark: guardian + three fading echoes over a loop ring ── */
function EchoHero() {
  return (
    <div style={{
      position: 'relative',
      width: 240,
      height: 240,
      margin: '0 auto',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <svg width="240" height="240" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="leHeroBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8A3D" />
            <stop offset="100%" stopColor="#F26522" />
          </linearGradient>
          <linearGradient id="leHeroChest" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFE38A" />
            <stop offset="100%" stopColor="#B07B12" />
          </linearGradient>
        </defs>

        {/* Glass plate */}
        <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

        {/* Time-loop ring with arrowhead */}
        <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(79,195,247,0.45)" strokeWidth="3" strokeDasharray="10 8" />
        <path d="M 100 38 l 10 -7 l -2 12 z" fill="rgba(79,195,247,0.8)" />

        {/* Echo trail: three past selves, fading */}
        <g opacity="0.25">
          <circle cx="52" cy="128" r="12" fill="#B39DDB" />
          <circle cx="52" cy="112" r="7" fill="#B39DDB" />
        </g>
        <g opacity="0.4">
          <circle cx="78" cy="142" r="12" fill="#4FC3F7" />
          <circle cx="78" cy="126" r="7" fill="#4FC3F7" />
        </g>

        {/* The living guardian, carrying the policy chest */}
        <g>
          <circle cx="116" cy="132" r="15" fill="url(#leHeroBody)" />
          <circle cx="116" cy="112" r="9" fill="url(#leHeroBody)" />
          <circle cx="113" cy="109" r="2.6" fill="#fff" opacity="0.9" />
          <rect x="128" y="126" width="26" height="19" rx="4" fill="url(#leHeroChest)" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <rect x="139" y="126" width="4.6" height="19" fill="#8A5C06" />
        </g>

        {/* Vault door at the top of the ring */}
        <g>
          <rect x="82" y="52" width="36" height="26" rx="4" fill="#1E356B" stroke="rgba(140,180,255,0.6)" strokeWidth="1.6" />
          <circle cx="100" cy="65" r="6.5" fill="none" stroke="#FFC845" strokeWidth="2" />
          <circle cx="100" cy="65" r="1.8" fill="#FFC845" />
        </g>

        {/* Plates being held by echoes */}
        <circle cx="52" cy="146" r="8" fill="none" stroke="#4ADE80" strokeWidth="2" strokeDasharray="3 3" />
        <circle cx="78" cy="160" r="8" fill="none" stroke="#4ADE80" strokeWidth="2" strokeDasharray="3 3" />
      </svg>
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
        padding: '50px 24px 64px',
        background: ECHO_BG,
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 style={{
          fontSize: 34,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 6px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}>
          Legacy Echo
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
          Your past self protects your future
        </p>
      </div>

      <EchoHero />

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
        background: ECHO_BG,
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'rgba(6, 16, 45, 0.65)',
        border: '1px solid rgba(255, 255, 255, 0.14)',
        borderRadius: 24,
        padding: '28px 24px 24px',
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
          margin: '0 0 18px 0',
          color: '#fff',
          textShadow: '0 2px 4px rgba(0,0,0,0.5)',
        }}>
          How to Play
        </h2>

        {/* CSS animation demo: the loop-relay in miniature */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 170,
          background: 'rgba(5, 12, 32, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 18,
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes tutGhost {
              0%   { transform: translate(0, 0); opacity: 0; }
              10%  { transform: translate(0, 0); opacity: 0.5; }
              38%  { transform: translate(-64px, 26px); opacity: 0.5; }
              92%  { transform: translate(-64px, 26px); opacity: 0.5; }
              100% { transform: translate(-64px, 26px); opacity: 0; }
            }
            @keyframes tutHero {
              0%, 40% { transform: translate(0, 0); opacity: 1; }
              72%  { transform: translate(0, -58px); opacity: 1; }
              88%  { transform: translate(0, -84px); opacity: 1; }
              100% { transform: translate(0, -84px); opacity: 0; }
            }
            @keyframes tutDoor {
              0%, 40% { transform: scaleX(1); }
              52%, 92% { transform: scaleX(0.12); }
              100% { transform: scaleX(1); }
            }
            @keyframes tutPlateGlow {
              0%, 36% { opacity: 0.25; }
              44%, 92% { opacity: 1; }
              100% { opacity: 0.25; }
            }
          ` }} />

          {/* Vault at top */}
          <div style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            width: 54, height: 20, borderRadius: 6,
            border: '2px dashed rgba(255,200,69,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 7, fontWeight: 900, color: '#FFE38A', letterSpacing: '0.1em' }}>VAULT</span>
          </div>

          {/* Door bar */}
          <div style={{
            position: 'absolute', top: 52, left: 'calc(50% - 40px)', width: 80, height: 8,
            background: 'linear-gradient(180deg,#2C4C8F,#16264C)', borderRadius: 3,
            transformOrigin: 'left center',
            animation: 'tutDoor 5s ease-in-out infinite',
          }} />

          {/* Plate on the left */}
          <div style={{
            position: 'absolute', top: 96, left: 'calc(50% - 84px)',
            width: 26, height: 26, borderRadius: '50%',
            border: '2px solid #4ADE80',
            animation: 'tutPlateGlow 5s ease-in-out infinite',
            boxShadow: '0 0 10px rgba(74,222,128,0.6)',
          }} />

          {/* Ghost echo replaying toward the plate */}
          <div style={{
            position: 'absolute', top: 78, left: 'calc(50% + 40px)',
            width: 20, height: 20, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #B3E5FC, #4FC3F7)',
            animation: 'tutGhost 5s ease-in-out infinite',
          }} />

          {/* The living guardian carrying the chest */}
          <div style={{
            position: 'absolute', top: 120, left: 'calc(50% - 11px)',
            width: 22, height: 22, borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 30%, #FFD9B8, #F26522)',
            boxShadow: '0 0 12px rgba(242,101,34,0.7)',
            animation: 'tutHero 5s ease-in-out infinite',
          }}>
            <div style={{
              position: 'absolute', left: 4, top: 22, width: 14, height: 10, borderRadius: 3,
              background: 'linear-gradient(180deg,#FFE38A,#B07B12)',
            }} />
          </div>
        </div>

        <div style={{
          textAlign: 'left',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 13.5,
          lineHeight: 1.45,
          marginBottom: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 11,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>1.</span>
            <span><strong>Drag</strong> to move. You get <strong>{GAME_CONFIG.loops.count} loops of {GAME_CONFIG.loops.seconds}s</strong> — after each loop, your run replays as a living <strong>echo</strong>.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>2.</span>
            <span>Vault gates open only while their <strong style={{ color: '#4ADE80' }}>plates are held</strong> — gate 3 needs 3 bodies at once. Stand on plates now so your echoes hold them later. Echoes can also block the <strong style={{ color: '#FF8B8B' }}>red beam</strong> and sync the twin levers.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>3.</span>
            <span>On a later loop, carry the <strong style={{ color: '#FFE38A' }}>policy chest</strong> up the middle, through every open gate, into the <strong>family vault</strong> before loop {GAME_CONFIG.loops.count} ends. Grab coins for bonus points.</span>
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
    const shareMessage = `Hi,\nI scored ${score} points in the Legacy Echo challenge.\nEvery premium your past self paid is a hand protecting the family today. Try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Legacy Echo',
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
  const targetScore = 2600;
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
        padding: '36px 20px 24px',
        overflowY: 'auto',
        background: ECHO_BG,
      }}
    >
      {won && <Confetti />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#4FC3F7', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Legacy Delivered' : 'Out of Loops'}
          </span>
        </p>
      </div>

      {/* Score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ width: 170, height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#0f172a" strokeWidth="10" />
            <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#1e293b" strokeWidth="1" opacity="0.3" />
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

      {/* Run stats */}
      <div style={{
        display: 'flex',
        gap: 10,
        marginBottom: 16,
        width: '100%',
        maxWidth: 320,
        justifyContent: 'center',
      }}>
        {[
          { label: 'Loops used', value: `${stats?.loopsUsed ?? GAME_CONFIG.loops.count}/${GAME_CONFIG.loops.count}` },
          { label: 'Coins', value: `${stats?.coins ?? 0}/${GAME_CONFIG.coins.length}` },
          { label: 'Gates opened', value: `${stats?.doorsOpened ?? 0}/3` },
        ].map((it) => (
          <div key={it.label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '10px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 17, fontWeight: 900, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{it.value}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', marginTop: 2 }}>{it.label}</div>
          </div>
        ))}
      </div>

      {/* Motivational message */}
      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Every premium your past self paid is a hand protecting your family today.
        </h2>
      </div>

      {/* Share */}
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
          marginBottom: 20,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          transition: 'background 0.2s',
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Action card */}
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
        marginBottom: 18,
      }}>
        <p style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 18px 0' }}>
          Talk to a specialist about a plan that keeps working for your family, loop after loop.
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

      {/* Play again */}
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
          <span>{won ? 'Play again' : 'Try again'}</span>
        </button>
      </motion.div>

      {/* Home link */}
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
          padding: '4px 20px',
          marginBottom: 10,
        }}
      >
        Home
      </button>

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
