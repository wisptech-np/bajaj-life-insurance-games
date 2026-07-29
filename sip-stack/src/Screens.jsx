// Screens.jsx — Home, How to Play, and Results screens for SIP Stack.
// Glassmorphism on the dark brand gradient; all art is inline SVG / CSS.
import React from 'react';
import { motion } from 'framer-motion';
import { GAME_CONFIG } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const BG = 'linear-gradient(180deg, #0B1221 0%, #0E2247 55%, #081226 100%)';
const BG_GLOW =
  'radial-gradient(ellipse 120% 50% at 50% 0%, rgba(30,107,224,0.30), rgba(2,6,23,0) 70%), ' +
  'radial-gradient(ellipse 110% 40% at 50% 100%, rgba(242,101,34,0.16), rgba(2,6,23,0) 72%), ' + BG;

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

function StarIcon({ size = 30, filled }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8z"
        fill={filled ? '#FFC845' : 'rgba(255,255,255,0.14)'}
        stroke={filled ? '#FFB300' : 'rgba(255,255,255,0.25)'}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Confetti (lightweight, CSS-driven) ─────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#FF8A3D', '#1E6BE0', '#003DA6', '#28A745', '#EC4899'];
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

/* ─── Decorative stacked-tower mark (home) ────────────────── */
function TowerMark() {
  return (
    <div style={{ position: 'relative', width: 220, height: 230, margin: '0 auto' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ssHomeSlide {
          0% { transform: translateX(-72px); }
          42% { transform: translateX(0); }
          52% { transform: translateX(0) translateY(6px); }
          62%, 100% { transform: translateX(0) translateY(6px); }
        }
        @keyframes ssHomeGlow {
          0%, 100% { opacity: 0.55; }
          50% { opacity: 1; }
        }
      ` }} />
      <svg width="220" height="230" viewBox="0 0 220 230" style={{ overflow: 'visible' }}>
        <rect x="8" y="8" width="204" height="214" rx="28" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        <defs>
          <linearGradient id="ssb1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E6BE0" /><stop offset="100%" stopColor="#003DA6" />
          </linearGradient>
          <linearGradient id="ssb2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E86E8" /><stop offset="100%" stopColor="#0A4CB8" />
          </linearGradient>
          <linearGradient id="ssb3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#35B95C" /><stop offset="100%" stopColor="#1C7E3D" />
          </linearGradient>
          <linearGradient id="ssb4" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF8A3D" /><stop offset="100%" stopColor="#F26522" />
          </linearGradient>
        </defs>
        {/* plinth */}
        <rect x="46" y="196" width="128" height="12" rx="3" fill="rgba(6,14,32,0.9)" />
        {/* tower */}
        <g>
          <rect x="58" y="168" width="104" height="26" rx="4" fill="url(#ssb1)" />
          <rect x="58" y="168" width="104" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
        </g>
        <g>
          <rect x="64" y="140" width="92" height="26" rx="4" fill="url(#ssb2)" />
          <rect x="64" y="140" width="92" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
        </g>
        <g>
          <rect x="70" y="112" width="80" height="26" rx="4" fill="url(#ssb3)" />
          <rect x="70" y="112" width="80" height="5" rx="2.5" fill="rgba(255,255,255,0.3)" />
        </g>
        {/* sliding slab */}
        <g style={{ animation: 'ssHomeSlide 2.6s cubic-bezier(0.3, 0, 0.3, 1) infinite' }}>
          <rect x="70" y="82" width="80" height="26" rx="4" fill="url(#ssb4)" />
          <rect x="70" y="82" width="80" height="5" rx="2.5" fill="rgba(255,255,255,0.35)" />
        </g>
        {/* coin above */}
        <g style={{ animation: 'ssHomeGlow 2.6s ease-in-out infinite' }}>
          <circle cx="110" cy="52" r="16" fill="#FFC845" stroke="#B8860B" strokeWidth="2" />
          <text x="110" y="58" textAnchor="middle" fontFamily="Poppins, sans-serif" fontWeight="900" fontSize="17" fill="#7A5200">₹</text>
        </g>
      </svg>
    </div>
  );
}

export function HomeScreen({ onStart }) {
  const best = (() => {
    try { return Number(localStorage.getItem(GAME_CONFIG.bestScoreKey)) || 0; } catch { return 0; }
  })();

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
        padding: '52px 24px 56px',
        background: BG_GLOW,
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', zIndex: 2 }}>
        <h1 style={{
          fontSize: 36,
          fontWeight: 900,
          color: '#fff',
          textTransform: 'uppercase',
          letterSpacing: '-0.03em',
          lineHeight: 1,
          margin: '0 0 8px 0',
          textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
        }}>
          SIP <span style={{ color: '#FF8A3D' }}>Stack</span>
        </h1>
        <p style={{
          fontSize: 12,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.75)',
          textTransform: 'uppercase',
          letterSpacing: '0.16em',
          margin: 0,
        }}>
          Every layer is a monthly SIP
        </p>
        {best > 0 && (
          <div style={{
            marginTop: 12,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '6px 14px',
            borderRadius: 999,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.14)',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            color: '#FFC845',
            textTransform: 'uppercase',
          }}>
            Best {best}
          </div>
        )}
      </div>

      <TowerMark />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.96 }}
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
            borderRadius: 12,
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
          <span>Start Stacking</span>
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
        padding: 24,
        background: BG_GLOW,
        overflowY: 'auto',
      }}
    >
      <div style={{
        background: 'rgba(8, 18, 40, 0.65)',
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

        {/* CSS demo: slab slides, tap drops it, overhang shears off */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 170,
          background: 'rgba(5, 12, 28, 0.6)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 18,
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes tutSlide {
              0% { transform: translateX(-95px); }
              38% { transform: translateX(-14px); }
              46% { transform: translateX(-14px) translateY(26px); }
              100% { transform: translateX(-14px) translateY(26px); }
            }
            @keyframes tutShear {
              0%, 45% { transform: translate(0, 0) rotate(0); opacity: 0; }
              46% { transform: translate(0, 26px) rotate(0); opacity: 1; }
              80%, 100% { transform: translate(-34px, 130px) rotate(-48deg); opacity: 0; }
            }
            @keyframes tutTapRing {
              0%, 40% { transform: scale(0.4); opacity: 0; }
              44% { transform: scale(0.7); opacity: 1; }
              58% { transform: scale(1.5); opacity: 0; }
              100% { opacity: 0; }
            }
          ` }} />
          {/* base tower */}
          <div style={{ position: 'absolute', bottom: 12, left: '50%', width: 130, height: 24, marginLeft: -65, borderRadius: 4, background: 'linear-gradient(180deg, #1E6BE0, #003DA6)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.3)' }} />
          <div style={{ position: 'absolute', bottom: 36, left: '50%', width: 112, height: 24, marginLeft: -56, borderRadius: 4, background: 'linear-gradient(180deg, #2E86E8, #0A4CB8)', boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.3)' }} />
          {/* sliding slab */}
          <div style={{
            position: 'absolute',
            bottom: 86,
            left: '50%',
            width: 112,
            height: 24,
            marginLeft: -42,
            borderRadius: 4,
            background: 'linear-gradient(180deg, #FF8A3D, #F26522)',
            boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.35)',
            animation: 'tutSlide 3.4s cubic-bezier(0.35, 0, 0.35, 1) infinite',
          }} />
          {/* sheared overhang */}
          <div style={{
            position: 'absolute',
            bottom: 86,
            left: '50%',
            width: 26,
            height: 24,
            marginLeft: -56,
            borderRadius: 4,
            background: 'linear-gradient(180deg, #FF8A3D, #D9541A)',
            animation: 'tutShear 3.4s ease-in infinite',
          }} />
          {/* tap ring */}
          <div style={{
            position: 'absolute',
            right: 34,
            bottom: 52,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.85)',
            animation: 'tutTapRing 3.4s ease-out infinite',
          }} />
        </div>

        <div style={{
          textAlign: 'left',
          color: 'rgba(255, 255, 255, 0.9)',
          fontSize: 14,
          lineHeight: 1.45,
          marginBottom: 22,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>1.</span>
            <span>A SIP slab slides across the tower. <strong>TAP</strong> to drop it — the overlap stays, the overhang shears off.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>2.</span>
            <span>Land dead-centre for a <strong>PERFECT</strong> — no trim, bonus points, and streaks of 3+ <strong>regrow</strong> your slab.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>3.</span>
            <span>Stack <strong>{GAME_CONFIG.targetLayers} layers</strong> to reach the Retirement Corpus summit. Miss the tower and the run ends!</span>
          </div>
        </div>

        <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            style={{
              width: '100%',
              height: 52,
              border: 'none',
              borderRadius: 12,
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

export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel = 'Play again' }) {
  const score = stats?.score || 0;
  const layers = stats?.layers || 0;
  const perfects = stats?.perfects || 0;
  const prevBest = stats?.prevBest || 0;
  const target = stats?.targetLayers || GAME_CONFIG.targetLayers;
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '';

  const stars = won && perfects >= GAME_CONFIG.threeStarPerfects ? 3 : won ? 2 : layers >= 10 ? 1 : 0;

  // Best-run delta — the retry fuel.
  let deltaText;
  let deltaColor = '#FFC845';
  if (prevBest === 0) {
    deltaText = score > 0 ? 'First run on the board — set the bar!' : 'Every SIP starts with the first layer.';
  } else if (score > prevBest) {
    deltaText = `${score - prevBest} more than last time — new best!`;
    deltaColor = '#7CF5A0';
  } else if (score === prevBest) {
    deltaText = 'Matched your best run — one perfect from a record.';
  } else {
    deltaText = `${prevBest - score} short of your best (${prevBest}). One more try?`;
    deltaColor = '#FFB199';
  }

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
    const shareMessage = `Hi,\nI stacked my SIP tower ${layers} layers high and scored ${score} in SIP Stack.\nDiscipline builds the corpus — one SIP at a time. Try it: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'SIP Stack',
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
        background: BG_GLOW,
      }}
    >
      {won && <Confetti />}

      <div style={{ textAlign: 'center', marginBottom: 12, width: '100%', maxWidth: 360, zIndex: 2 }}>
        <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, lineHeight: 1.25, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {won ? (
            <>Summit reached{leadName ? `, ${leadName}` : ''}!<br /><span style={{ fontSize: 15, color: '#7CF5A0', fontWeight: 800 }}>Retirement Corpus built</span></>
          ) : (
            <>Tower toppled{leadName ? `, ${leadName}` : ''}!<br /><span style={{ fontSize: 15, color: 'rgba(255,255,255,0.75)', fontWeight: 800 }}>{layers} of {target} SIP layers placed</span></>
          )}
        </p>
      </div>

      {/* Stars */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10, zIndex: 2 }}>
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: 0.3 + i * 0.15, type: 'spring', damping: 12, stiffness: 220 }}
          >
            <StarIcon size={34} filled={i <= stars} />
          </motion.div>
        ))}
      </div>

      {/* Score */}
      <div style={{ textAlign: 'center', marginBottom: 6, zIndex: 2 }}>
        <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', lineHeight: 1, letterSpacing: '-0.03em', textShadow: '0 2px 12px rgba(0,0,0,0.55)', fontVariantNumeric: 'tabular-nums' }}>
          {animatedScore.toLocaleString()}
        </div>
        <div style={{ fontSize: 10, fontWeight: 900, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 4 }}>
          Points
        </div>
      </div>

      {/* Best-run delta */}
      <div style={{
        marginBottom: 14,
        padding: '7px 16px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.14)',
        fontSize: 12.5,
        fontWeight: 800,
        color: deltaColor,
        textAlign: 'center',
        zIndex: 2,
      }}>
        {deltaText}
      </div>

      {/* Stats grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 10,
        width: '100%',
        maxWidth: 360,
        marginBottom: 16,
        zIndex: 2,
      }}>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', textAlign: 'left' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>SIP Layers</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>{layers} <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>/ {target}</span></div>
        </div>
        <div style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '10px 14px', textAlign: 'left' }}>
          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>Perfects</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#FFC845' }}>{perfects}</div>
        </div>
      </div>

      {/* Financial hook */}
      <div style={{ textAlign: 'center', marginBottom: 18, padding: '0 14px', zIndex: 2 }}>
        <h2 style={{ fontSize: 15, fontWeight: 800, color: 'rgba(255,255,255,0.9)', lineHeight: 1.4, margin: 0 }}>
          Place every SIP with discipline and the corpus rises — consistency even repairs old mistakes.
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
          height: 50,
          borderRadius: 12,
          border: 'none',
          cursor: 'pointer',
          fontSize: 16,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          boxShadow: '0 4px 20px rgba(30, 107, 224, 0.4)',
          width: '100%',
          maxWidth: 280,
          marginBottom: 18,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          zIndex: 2,
        }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </button>

      {/* Action Card */}
      <div style={{
        width: '100%',
        maxWidth: 360,
        background: 'rgba(15, 23, 42, 0.75)',
        WebkitBackdropFilter: 'blur(12px)',
        backdropFilter: 'blur(12px)',
        borderRadius: 24,
        padding: '18px 18px',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        textAlign: 'center',
        boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
        marginBottom: 16,
        zIndex: 2,
      }}>
        <p style={{ color: '#fff', fontSize: 15, fontWeight: 'bold', lineHeight: 1.35, margin: '0 0 16px 0' }}>
          Talk to a specialist about building your real corpus — one disciplined SIP at a time.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a
              href={`tel:${empPhone}`}
              style={{
                background: '#FF8A3D',
                color: '#fff',
                fontWeight: 900,
                padding: '14px 20px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 16,
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '2px 0' }}>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', fontSize: 9, letterSpacing: '0.15em' }}>OR</span>
              <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
            </div>
          )}

          <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={onBookSlot}
              style={{
                width: '100%',
                background: '#28A745',
                color: '#fff',
                fontWeight: 900,
                padding: '14px 20px',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: 16,
                border: 'none',
                cursor: 'pointer',
                textTransform: 'uppercase',
                boxShadow: '0 4px 12px rgba(40, 167, 69, 0.25)',
              }}
            >
              <CalendarIcon size={18} />
              <span>Book a Slot</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Retry + Home — retry is ONE tap, no interstitial */}
      <div style={{ display: 'flex', gap: 4, alignItems: 'center', zIndex: 2 }}>
        <motion.div whileTap={{ scale: 0.95 }}>
          <button
            onClick={onRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 12,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: '0.05em',
              padding: '13px 26px',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            <RotateIcon />
            <span>{retryLabel}</span>
          </button>
        </motion.div>
        <motion.div whileTap={{ scale: 0.95 }}>
          <button
            onClick={onHome}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.45)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 800,
              letterSpacing: '0.08em',
              padding: '12px 16px',
              textTransform: 'uppercase',
              marginBottom: 14,
            }}
          >
            Home
          </button>
        </motion.div>
      </div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 360, opacity: 0.4, padding: '0 12px 20px', zIndex: 2 }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
