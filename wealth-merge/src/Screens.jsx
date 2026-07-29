// Screens.jsx — Home, How to Play, and Results screens for Wealth Merge.
// Glassmorphism on the deep-blue brand gradient; all art is inline SVG.
import React from 'react';
import { motion } from 'framer-motion';
import { COLORS, RESULT_TARGET_SCORE, TIERS } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

const SCREEN_BG = [
  'radial-gradient(ellipse 130% 55% at 50% 0%, rgba(30,107,224,0.30), rgba(2,6,23,0) 70%)',
  'radial-gradient(ellipse 150% 45% at 50% 100%, rgba(176,123,18,0.30), rgba(2,6,23,0) 72%)',
  'linear-gradient(180deg, #08152F 0%, #0C2A57 55%, #061229 100%)',
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

/* Reusable glossy token for SVG scenes: gradient disc + rim + gloss. */
function SvgToken({ x, y, r, color, colorDeep, id }) {
  return (
    <g>
      <defs>
        <radialGradient id={`wmTok${id}`} cx="0.35" cy="0.32" r="0.95">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="28%" stopColor={color} />
          <stop offset="100%" stopColor={colorDeep} />
        </radialGradient>
      </defs>
      <circle cx={x} cy={y} r={r} fill={`url(#wmTok${id})`} stroke="rgba(255,255,255,0.35)" strokeWidth={r * 0.06} />
      <ellipse cx={x - r * 0.3} cy={y - r * 0.4} rx={r * 0.3} ry={r * 0.14} fill="rgba(255,255,255,0.4)" transform={`rotate(-30 ${x - r * 0.3} ${y - r * 0.4})`} />
    </g>
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

/* ─── Home ─────────────────────────────────────────────── */
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
          Wealth <span style={{ color: COLORS.gold }}>Merge</span>
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
          Compounding In Your Hands
        </p>
      </div>

      {/* Hero: the jar with the tier ladder mid-merge */}
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
        <svg width="250" height="250" viewBox="0 0 200 200" style={{ overflow: 'visible' }}>
          <rect x="10" y="10" width="180" height="180" rx="30" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />

          {/* Jar walls */}
          <path d="M 48 52 L 48 162 L 152 162 L 152 52" fill="rgba(120,170,240,0.08)" stroke="rgba(190,220,255,0.55)" strokeWidth="4" strokeLinecap="round" />
          <line x1="40" y1="50" x2="56" y2="50" stroke="rgba(190,220,255,0.7)" strokeWidth="4" strokeLinecap="round" />
          <line x1="144" y1="50" x2="160" y2="50" stroke="rgba(190,220,255,0.7)" strokeWidth="4" strokeLinecap="round" />

          {/* Danger line */}
          <line x1="52" y1="76" x2="148" y2="76" stroke="rgba(255,139,139,0.55)" strokeWidth="1.6" strokeDasharray="5 5" />

          {/* Settled tokens */}
          <SvgToken x={72} y={144} r={17} color="#4ADE80" colorDeep="#106B36" id="a" />
          <SvgToken x={118} y={146} r={14} color="#FF8A3D" colorDeep="#8C3708" id="b" />
          <SvgToken x={144} y={152} r={9} color="#FFC845" colorDeep="#8F6206" id="c" />
          <SvgToken x={95} y={120} r={12} color="#F2A93B" colorDeep="#8A5104" id="d" />

          {/* The merging pair, glowing */}
          <g>
            <circle cx="100" cy="96" r="20" fill="rgba(255,224,102,0.25)" />
            <SvgToken x={92} y={98} r={11} color="#FFD25E" colorDeep="#9A6B0A" id="e" />
            <SvgToken x={110} y={96} r={11} color="#FFD25E" colorDeep="#9A6B0A" id="f" />
            <path d="M 100 82 l 3 6 6 1 -4.5 4.5 1 6.5 -5.5 -3 -5.5 3 1 -6.5 -4.5 -4.5 6 -1 z" fill="#FFE38A" />
          </g>

          {/* Falling token above the jar */}
          <SvgToken x={100} y={34} r={9} color="#FFD25E" colorDeep="#9A6B0A" id="g" />
          <line x1="100" y1="46" x2="100" y2="70" stroke="rgba(255,255,255,0.4)" strokeWidth="1.6" strokeDasharray="3 5" />
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

/* ─── How to Play ──────────────────────────────────────── */
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

        {/* Animated demo: drop, merge, pop */}
        <div style={{
          position: 'relative',
          width: '100%',
          height: 170,
          background: 'rgba(5, 20, 45, 0.5)',
          borderRadius: 16,
          border: '1px solid rgba(255,255,255,0.06)',
          overflow: 'hidden',
          marginBottom: 18,
        }}>
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes wmTutDrop {
              0%, 12% { transform: translate(0, 0); opacity: 1; }
              38%     { transform: translate(0, 92px); opacity: 1; }
              46%, 100% { transform: translate(0, 92px); opacity: 0; }
            }
            @keyframes wmTutSit {
              0%, 40% { transform: scale(1); opacity: 1; }
              46%, 100% { opacity: 0; }
            }
            @keyframes wmTutMerged {
              0%, 42% { transform: scale(0); opacity: 0; }
              50%  { transform: scale(1.35); opacity: 1; }
              60%  { transform: scale(1); opacity: 1; }
              92%  { transform: scale(1); opacity: 1; }
              100% { transform: scale(1); opacity: 0; }
            }
            @keyframes wmTutScore {
              0%, 48% { transform: translateY(0); opacity: 0; }
              56% { transform: translateY(-10px); opacity: 1; }
              85%, 100% { transform: translateY(-26px); opacity: 0; }
            }
            @keyframes wmTutHand {
              0% { transform: translateX(-34px); opacity: 0; }
              8% { opacity: 1; }
              12% { transform: translateX(0); opacity: 1; }
              20% { transform: translateX(0) scale(1.15); opacity: 1; }
              30%, 100% { transform: translateX(0); opacity: 0; }
            }
          ` }} />

          {/* Jar outline */}
          <div style={{
            position: 'absolute', left: 40, right: 40, top: 26, bottom: 12,
            borderLeft: '3px solid rgba(190,220,255,0.5)',
            borderRight: '3px solid rgba(190,220,255,0.5)',
            borderBottom: '3px solid rgba(190,220,255,0.5)',
            borderRadius: '0 0 10px 10px',
          }} />

          {/* Resting same-tier token */}
          <div style={{
            position: 'absolute', left: 'calc(50% - 34px)', bottom: 16,
            width: 28, height: 28, borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 28%, #FFECA8 0%, #FFD25E 45%, #9A6B0A 100%)',
            animation: 'wmTutSit 4s infinite',
          }} />

          {/* Dropping token */}
          <div style={{
            position: 'absolute', left: 'calc(50% + 6px)', top: 30,
            width: 28, height: 28, borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 28%, #FFECA8 0%, #FFD25E 45%, #9A6B0A 100%)',
            animation: 'wmTutDrop 4s ease-in infinite',
          }} />

          {/* Merged bigger token */}
          <div style={{
            position: 'absolute', left: 'calc(50% - 20px)', bottom: 12,
            width: 40, height: 40, borderRadius: '50%',
            background: 'radial-gradient(circle at 32% 28%, #FFE38A 0%, #FFC845 45%, #8F6206 100%)',
            boxShadow: '0 0 18px rgba(255,200,69,0.65)',
            animation: 'wmTutMerged 4s cubic-bezier(0.34,1.56,0.64,1) infinite',
          }} />

          {/* Score float */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 64,
            textAlign: 'center', fontWeight: 900, fontSize: 15, color: '#FFE38A',
            animation: 'wmTutScore 4s ease-out infinite',
          }}>
            +3 MERGE!
          </div>

          {/* Hand dragging to aim */}
          <div style={{
            position: 'absolute', left: 'calc(50% + 14px)', top: 52,
            width: 30, height: 30,
            animation: 'wmTutHand 4s ease-in-out infinite',
          }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#FACC15" strokeWidth="2.5">
              <path d="M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M14 10V5a2 2 0 0 0-2-2 2 2 0 0 0-2 2v5" />
              <path d="M10 10.5V2a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8.5" />
              <path d="M6 14v-2.5a2 2 0 0 0-2-2 2 2 0 0 0-2 2V17a6 6 0 0 0 6 6h4a6 6 0 0 0 6-6v-1.5" />
            </svg>
          </div>
        </div>

        {/* Tier ladder strip */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          marginBottom: 16,
          flexWrap: 'nowrap',
        }}>
          {TIERS.map((t, i) => (
            <React.Fragment key={t.key}>
              <span style={{
                width: 10 + i * 2.6,
                height: 10 + i * 2.6,
                borderRadius: '50%',
                flexShrink: 0,
                background: `radial-gradient(circle at 32% 28%, ${t.colorLt} 0%, ${t.color} 45%, ${t.colorDeep} 100%)`,
                boxShadow: i === TIERS.length - 1 ? `0 0 10px ${t.glow}` : 'none',
              }} />
              {i < TIERS.length - 1 && (
                <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 9, fontWeight: 900 }}>{'>'}</span>
              )}
            </React.Fragment>
          ))}
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
            <span><strong>Drag</strong> to aim, <strong>release</strong> to drop a wealth token into the jar. Two identical tokens <strong>merge into the next tier</strong> — chase the glowing Retirement Corpus.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>2.</span>
            <span>Quick back-to-back merges build a <strong>chain multiplier</strong> (x1.5, x2, x3...). Score <strong>300 points in 100 seconds</strong> — or forge the Corpus to win instantly.</span>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <span style={{ color: '#FF8A3D', fontWeight: 900 }}>3.</span>
            <span>Keep the pile <strong>below the red line</strong>. If a resting token sits above it for 2 seconds, the jar overflows — merge your way out before the countdown ends!</span>
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

/* ─── Results ──────────────────────────────────────────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot }) {
  const score = stats?.score || 0;
  const bestTier = TIERS[Math.min(stats?.bestTier ?? 0, TIERS.length - 1)];
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
    const shareMessage = `Hi,\nI compounded ${score} points in the Wealth Merge challenge and reached the ${bestTier.label}!\nSmall savings merge into big goals. Try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Wealth Merge',
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
  const progress = (Math.min(score, RESULT_TARGET_SCORE) / RESULT_TARGET_SCORE) * circumference;
  const strokeColor = won ? '#28A745' : '#ef4444';
  const glowColor = won ? 'rgba(40, 167, 69, 0.4)' : 'rgba(239, 68, 68, 0.4)';

  const headline = won
    ? (stats?.cause === 'corpus'
      ? 'You forged the Retirement Corpus — compounding did the heavy lifting.'
      : 'Goal reached! Steady merges grew two rupees into a future.')
    : (stats?.cause === 'overflow'
      ? 'The jar overflowed. Unmerged savings pile up — consolidate them early.'
      : 'Time ran out short of the goal. Start merging earlier, compound longer.');

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
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>Your Wealth Score</span>
        </p>
      </div>

      {/* Circular Progress Ring */}
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

      {/* Run stats strip */}
      <div style={{
        display: 'flex',
        gap: 8,
        marginBottom: 16,
        width: '100%',
        maxWidth: 340,
        justifyContent: 'center',
      }}>
        {[
          { label: 'Best Tier', value: bestTier.label },
          { label: 'Merges', value: stats?.merges ?? 0 },
          { label: 'Top Chain', value: `x${stats?.maxChain ?? 0}` },
        ].map((it) => (
          <div key={it.label} style={{
            flex: 1,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            padding: '8px 6px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: '0.14em', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase' }}>{it.label}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginTop: 2 }}>{it.value}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: 'center', marginBottom: 20, padding: '0 16px' }}>
        <h2 style={{ fontSize: 17, fontWeight: 900, color: '#fff', lineHeight: 1.35, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {headline}
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
          A specialist can show you how disciplined saving compounds into your life goals.
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
