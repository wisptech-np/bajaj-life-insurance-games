// Screens.jsx — Home, How to Play, and Results screens for Ring-Fence.
// Structure and design language follow the guardian-shelter gold standard
// (glassmorphism, deep blue, clean buttons); the backdrop is a gradient wash
// rather than a photograph so the game ships with zero binary assets.
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS, GAME_CONFIG } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const SCREEN_BG = [
  'radial-gradient(ellipse 120% 55% at 50% 0%, rgba(30,107,224,0.30), rgba(4,10,25,0) 70%)',
  'radial-gradient(ellipse 130% 45% at 50% 100%, rgba(40,167,69,0.16), rgba(4,10,25,0) 72%)',
  'linear-gradient(180deg, #0A1730 0%, #0B1221 55%, #060D1C 100%)',
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
    <svg width="250" height="250" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
      <rect x="8" y="8" width="184" height="184" rx="30" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

      {/* Open-field dot grid */}
      {Array.from({ length: 5 }).map((_, r) => (
        Array.from({ length: 5 }).map((__, c) => (
          <circle key={`${r}-${c}`} cx={36 + c * 32} cy={36 + r * 32} r="1.4" fill="rgba(127,192,255,0.22)" />
        ))
      ))}

      {/* The glowing ring-fence */}
      <rect x="52" y="52" width="96" height="96" rx="14" fill="rgba(18,51,111,0.75)" stroke="#3B8DD4" strokeWidth="3.5" style={{ filter: 'drop-shadow(0 0 8px rgba(88,160,255,0.85))' }} />
      <rect x="52" y="52" width="96" height="96" rx="14" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1" />

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
        justifyContent: 'space-between',
        padding: '50px 24px 64px',
        background: SCREEN_BG,
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
          Ring-Fence
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
          Wall the risks out of your wealth
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
        background: SCREEN_BG,
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

        {/* CSS animation demo: cut out from the wall, seal, the pocket floods */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 180,
          background: 'rgba(5, 20, 45, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes tutGuardian {
              0%, 12%  { left: 24px; top: 132px; }
              34%      { left: 24px; top: 40px; }
              62%      { left: 148px; top: 40px; }
              84%, 100%{ left: 148px; top: 132px; }
            }
            @keyframes tutTrailV {
              0%, 12% { height: 0; }
              34%, 84% { height: 92px; }
              88%, 100% { height: 92px; }
            }
            @keyframes tutTrailH {
              0%, 34% { width: 0; }
              62%, 88% { width: 124px; }
              100% { width: 124px; }
            }
            @keyframes tutTrailV2 {
              0%, 62% { height: 0; }
              84%, 100% { height: 92px; }
            }
            @keyframes tutFlood {
              0%, 84% { opacity: 0; }
              92%, 100% { opacity: 1; }
            }
            @keyframes tutOrbBounce {
              0%   { transform: translate(0, 0); }
              30%  { transform: translate(48px, 26px); }
              55%  { transform: translate(6px, 44px); }
              80%  { transform: translate(52px, 8px); }
              100% { transform: translate(0, 0); }
            }
          ` }} />

          {/* Safety wall frame */}
          <div style={{ position: 'absolute', inset: 10, border: '3px solid #3B8DD4', borderRadius: 8, boxShadow: '0 0 10px rgba(88,160,255,0.65), inset 0 0 8px rgba(88,160,255,0.3)' }} />

          {/* Flooded claimed pocket (appears at seal) */}
          <div style={{
            position: 'absolute', left: 27, top: 43, width: 124, height: 92,
            background: 'linear-gradient(135deg, rgba(30,107,224,0.55), rgba(0,61,166,0.4))',
            borderRadius: 4,
            animation: 'tutFlood 5s infinite',
          }} />

          {/* Trail segments */}
          <div style={{ position: 'absolute', left: 26, bottom: 45, width: 3, animation: 'tutTrailV 5s infinite', background: '#FF8A3D', boxShadow: '0 0 8px rgba(255,138,61,0.9)', transformOrigin: 'bottom' }} />
          <div style={{ position: 'absolute', left: 27, top: 41, height: 3, animation: 'tutTrailH 5s infinite', background: '#FF8A3D', boxShadow: '0 0 8px rgba(255,138,61,0.9)' }} />
          <div style={{ position: 'absolute', left: 150, top: 43, width: 3, animation: 'tutTrailV2 5s infinite', background: '#FF8A3D', boxShadow: '0 0 8px rgba(255,138,61,0.9)' }} />

          {/* Bouncing risk orb (right side, outside the bite) */}
          <div style={{ position: 'absolute', right: 66, top: 58, width: 18, height: 18, animation: 'tutOrbBounce 3.4s ease-in-out infinite' }}>
            <svg width="18" height="18" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="6" fill="#49E24B" />
              <path d="M1,8 L15,8 M8,1 L8,15 M3,3 L13,13 M3,13 L13,3" stroke="#49E24B" strokeWidth="1.5" />
              <circle cx="8" cy="8" r="3" fill="#0E5C1D" />
            </svg>
          </div>

          {/* Guardian */}
          <div style={{ position: 'absolute', width: 16, height: 16, animation: 'tutGuardian 5s infinite', zIndex: 3 }}>
            <svg width="16" height="16" viewBox="0 0 20 20">
              <path d="M10,1.5 C14,3 17,5.5 17,9 C17,13.5 13.8,16.8 10,18.5 C6.2,16.8 3,13.5 3,9 C3,5.5 6,3 10,1.5 Z" fill="#1E6BE0" stroke="#fff" strokeWidth="1.4" style={{ filter: 'drop-shadow(0 0 5px rgba(127,192,255,0.9))' }} />
              <circle cx="10" cy="10" r="3" fill="#fff" />
            </svg>
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
            <span><strong>Swipe or drag</strong> to steer the guardian along the glowing safety wall. Leave the wall to start cutting open ground.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>2.</span>
            <span>Return to the wall to <strong>seal the cut</strong> — every pocket without a virus orb floods blue and is ring-fenced. Bigger bites pay x1.5, x2.5, even x4.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>3.</span>
            <span>Orbs that touch your <strong>unfinished trail</strong> cost a shield, and stalling mid-cut lights a fuse. Secure <strong>{GAME_CONFIG.winPct}%</strong> in {GAME_CONFIG.sessionSeconds}s to win!</span>
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

      <div style={{ textAlign: 'center', marginBottom: 16, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Wealth ring-fenced!' : 'The fence gave way'}
          </span>
        </p>
      </div>

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
        gap: 8,
        width: '100%',
        maxWidth: 360,
        marginBottom: 18,
      }}>
        {[
          { label: 'Secured', value: `${pctClaimed}%` },
          { label: 'Biggest cut', value: `${biggestCut}%` },
          { label: 'Shields left', value: `${livesLeft}` },
        ].map((it) => (
          <div key={it.label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 14,
            padding: '10px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#fff', lineHeight: 1.1 }}>{it.value}</div>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.55)', marginTop: 3 }}>{it.label}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
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
