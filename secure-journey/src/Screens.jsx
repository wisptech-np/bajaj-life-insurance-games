// Screens.jsx — Home + How-to-play + Results screens for Secure Journey.
// Matches the gold-standard bubble-shooter screen flow and polish.
import React from 'react';
import { motion } from 'framer-motion';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';

/* ─── Inline icons ─────────────────────────────────────── */
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

function PlayIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function ShieldHexIcon({ size = 32, fill = 'currentColor', color = '#fff' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function ShieldCrossIcon({ size = 32 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="url(#shieldGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3B8DD4" />
          <stop offset="100%" stopColor="#003DA6" />
        </linearGradient>
      </defs>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <line x1="12" y1="8" x2="12" y2="16" stroke="#fff" strokeWidth="2.5" />
      <line x1="8" y1="12" x2="16" y2="12" stroke="#fff" strokeWidth="2.5" />
    </svg>
  );
}

function DragGlyph({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#F26522"
      strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 11V6a2 2 0 0 0-4 0v5" />
      <path d="M14 10V5a2 2 0 0 0-4 0v5" />
      <path d="M10 10.5V4a2 2 0 0 0-4 0v10" />
      <path d="M6 14v-2.5a2 2 0 0 0-4 0V17a5 5 0 0 0 5 5h5a5 5 0 0 0 5-5v-1.5" />
    </svg>
  );
}

/* Risk Barricade — the game's antagonist silhouette, used as a legend glyph. */
function BarricadeGlyph({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="sjBarricade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FF9C5B" />
          <stop offset="100%" stopColor="#C43F16" />
        </linearGradient>
      </defs>
      <path d="M12 23 1 12.5 4 1h16l3 11.5z" fill="url(#sjBarricade)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.2" />
      <path d="M8 9.5 12 14l4-4.5" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Home screen ──────────────────────────────────────── */
export function HomeScreen({ onStart, theme }) {
  void theme;

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
        gap: 30,
        padding: '40px 24px',
        background:
          'radial-gradient(ellipse at 50% 24%, rgba(20, 97, 168, 0.5), rgba(4, 16, 31, 0.92) 70%), #04101f',
        overflow: 'hidden',
      }}
    >
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <div className="sj-home-badge">
          <ShieldHexIcon size={14} fill="rgba(255,255,255,0.2)" color="rgba(255,255,255,0.9)" />
          Bajaj Life Insurance
        </div>
        <h1 className="sj-home-title" style={{ color: '#fff', textTransform: 'uppercase' }}>
          Secure<br /><span style={{ color: '#3B8DD4' }}>Journey</span>
        </h1>
        <p className="sj-home-sub">Build a stable bridge for long-term wealth by shielding against unexpected risks</p>
      </div>

      {/* Large glowing programmatic shield decoration */}
      <div style={{
        position: 'relative',
        width: 140,
        height: 140,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '10px 0',
      }}>
        {/* Glow rings */}
        <div style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59, 141, 212, 0.25) 0%, rgba(59, 141, 212, 0) 70%)',
          animation: 'ls-pulse-soft 2s ease-in-out infinite',
        }} />
        <div style={{
          position: 'absolute',
          width: 100,
          height: 100,
          borderRadius: '50%',
          border: '2px dashed rgba(59, 141, 212, 0.4)',
          animation: 'sj-banner-in 4s linear infinite',
          animationName: 'none', // we can skip keyframe for simplicity, or rotate via styles
          transform: 'rotate(0deg)',
          transition: 'transform 10s linear',
        }} />
        
        {/* Glowing Shield Icon */}
        <motion.div
          animate={{
            y: [0, -8, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            zIndex: 2,
            filter: 'drop-shadow(0 8px 24px rgba(59, 141, 212, 0.6))',
          }}
        >
          <svg width="76" height="76" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8">
            <defs>
              <linearGradient id="shieldGradHome" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B8DD4" />
                <stop offset="50%" stopColor="#003DA6" />
                <stop offset="100%" stopColor="#0a2f52" />
              </linearGradient>
            </defs>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="url(#shieldGradHome)" />
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.97 }}
        style={{ width: '100%', display: 'flex', justifyContent: 'center', zIndex: 10 }}
      >
        <button
          type="button"
          className="ls-btn ls-btn-primary"
          onClick={onStart}
          style={{ width: '100%', maxWidth: 320, height: 60, fontSize: 20 }}
        >
          <PlayIcon />
          Start Journey
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─── How to play ──────────────────────────────────────── */
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
        padding: 20,
        background:
          'radial-gradient(ellipse at 50% 25%, rgba(20, 97, 168, 0.5), rgba(4, 16, 31, 0.92) 70%), #04101f',
        overflowY: 'auto',
      }}
    >
      <div className="sj-howto-card">
        <h2 style={{ fontSize: 22, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '-0.02em', margin: 0, color: '#fff', textAlign: 'center' }}>
          How to Play
        </h2>

        {/* Looping demo of the real mechanic: drag the pod, auto-fire clears the
            barricade, drag onto the shield. No instruction text needed. */}
        <div className="sj-demo" aria-label="Animated demo: drag to steer, bolts clear barricades, collect shields">
          <div className="sj-demo-deck">
            <div className="sj-demo-lane" style={{ left: '33.3%' }} />
            <div className="sj-demo-lane" style={{ left: '66.6%' }} />
          </div>
          <div className="sj-demo-shield" />
          <div className="sj-demo-hazard" />
          <div className="sj-demo-bolt" />
          <div className="sj-demo-pod" />
          <div className="sj-demo-hand">
            <DragGlyph size={22} />
          </div>
        </div>

        <div className="sj-demo-legend">
          <div>
            <DragGlyph size={24} />
            <span>Drag</span>
          </div>
          <div>
            <BarricadeGlyph size={24} />
            <span>Blast</span>
          </div>
          <div>
            <ShieldCrossIcon size={24} />
            <span>Collect</span>
          </div>
        </div>

        <motion.div whileTap={{ scale: 0.97 }} style={{ width: '100%' }}>
          <button
            onClick={onPlay}
            className="ls-btn ls-btn-primary"
            style={{ width: '100%', height: 54, fontSize: 18 }}
          >
            <PlayIcon />
            Start Journey
          </button>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Confetti (results, win only) ─────────────────────── */
function Confetti() {
  const colors = ['#3B8DD4', '#FF8533', '#28A745', '#003DA6', '#F26522', '#FFFFFF'];
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

/* ─── ResultsScreen ────────────────────────────────────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot }) {
  void onHome;
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
    const shareMessage = `Hi,\nI scored ${score} points protecting my path in Secure Journey.\nSee how far you can make it across the wealth bridge — play here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Secure Journey',
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

  const radius = 55;
  const circumference = 2 * Math.PI * radius;
  // target score for visual wrap
  const targetScore = 1800;
  const progress = (Math.min(score, targetScore) / targetScore) * circumference;
  const strokeColor = won ? '#28A745' : (score < 500 ? '#ef4444' : '#F26522');
  const glowColor = won ? 'rgba(40, 167, 69, 0.4)' : (score < 500 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(242, 101, 34, 0.4)');

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
        padding: '20px 20px 16px',
        overflowY: 'auto',
        background: 'radial-gradient(ellipse at 50% 30%, rgba(20, 97, 168, 0.5), rgba(4, 16, 31, 0.92) 70%), #04101f',
        WebkitBackdropFilter: 'blur(8px)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {won && <Confetti />}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8, width: '100%', maxWidth: 360 }}>
        <p style={{ color: '#fff', fontSize: 18, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3B8DD4', fontWeight: 950 }}>{leadName || 'Friend'}!</span><br />
          <span style={{ fontSize: 15, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Wealth Vault Reached!' : 'Journey Interrupted'}
          </span>
        </p>
      </div>

      {/* Circular Progress Ring */}
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
          <svg style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
            <circle cx="100" cy="100" r={radius} fill="none" stroke="#0c192c" strokeWidth="12" />
            <circle cx="100" cy="100" r={radius + 6} fill="none" stroke="#172e4c" strokeWidth="1.5" opacity="0.3" />
            <circle
              cx="100"
              cy="100"
              r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference - progress}
              style={{
                filter: `drop-shadow(0 0 6px ${glowColor})`,
                transition: 'stroke-dashoffset 1.2s ease-out',
              }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <span className="ls-num" style={{ fontSize: 20, color: '#fff', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString()}
            </span>
            <span className="hud-label" style={{ fontSize: 8, marginTop: 2 }}>
              Points
            </span>
          </div>
        </div>
      </div>

      {/* Round stats */}
      <div style={{
        display: 'flex',
        width: '100%',
        maxWidth: 340,
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        padding: '8px 4px',
        marginBottom: 10,
        justifyContent: 'space-around',
        textAlign: 'center'
      }}>
        <div style={{ flex: 1 }}>
          <div className="ls-num" style={{ fontSize: 15, color: '#fff' }}>{stats?.cleared || 0}</div>
          <div className="hud-label" style={{ fontSize: 8 }}>Risks Cleared</div>
        </div>
        <div style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div style={{ flex: 1 }}>
          <div className="ls-num" style={{ fontSize: 15, color: '#F26522' }}>{stats?.shields || 0}</div>
          <div className="hud-label" style={{ fontSize: 8 }}>Shields Kept</div>
        </div>
        <div style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <div style={{ flex: 1 }}>
          <div className="ls-num" style={{ fontSize: 15, color: '#28A745' }}>{stats?.health || 0}%</div>
          <div className="hud-label" style={{ fontSize: 8 }}>Final Health</div>
        </div>
      </div>

      {/* Motivational Message */}
      <div style={{ textAlign: 'center', marginBottom: 10, padding: '0 12px' }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255, 255, 255, 0.95)', lineHeight: 1.35, margin: 0 }}>
          {won
            ? 'Shielding your life journey with early planning ensures you reach your long-term wealth goals safely.'
            : 'Unshielded financial risks can derail your journey. Add core protection layers to keep your wealth goals safe.'}
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleShare}
          className="ls-btn"
          style={{
            display: 'inline-flex',
            backgroundColor: '#003DA6',
            height: 40,
            borderRadius: '10px',
            fontSize: 14,
            width: '100%',
            maxWidth: 300,
            boxShadow: '0 3px 10px rgba(0, 61, 166, 0.3)',
          }}
        >
          <ShareIcon size={16} />
          Share Score
        </button>

        {/* Action Card */}
        <div className="ls-card" style={{
          width: '100%',
          maxWidth: 300,
          background: 'rgba(12, 25, 44, 0.85)',
          padding: '12px 12px',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
          animation: 'none',
        }}>
          <p style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1.3, margin: '0 0 8px 0', textAlign: 'center' }}>
            Consult a Bajaj Life advisor to build a stable protection bridge for your family's future
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {empPhone && (
              <a
                href={`tel:${empPhone}`}
                className="ls-btn"
                style={{
                  background: '#F59E0B',
                  color: '#000',
                  fontWeight: 900,
                  height: 36,
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  textDecoration: 'none',
                  textTransform: 'uppercase',
                  border: '1px solid #fbbf24',
                  boxShadow: '0 3px 8px rgba(245, 158, 11, 0.15)',
                }}
              >
                <PhoneIcon size={14} />
                Call Specialist
              </a>
            )}

            {empPhone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '1px 0' }}>
                <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
                <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 'bold', fontSize: 8, letterSpacing: '0.1em' }}>OR</span>
                <div style={{ height: 1, flex: 1, backgroundColor: 'rgba(255,255,255,0.08)' }} />
              </div>
            )}

            <button
              onClick={onBookSlot}
              className="ls-btn"
              style={{
                width: '100%',
                background: '#28A745',
                color: '#fff',
                fontWeight: 900,
                height: 36,
                borderRadius: '10px',
                fontSize: 13,
                boxShadow: '0 3px 8px rgba(40, 167, 69, 0.15)',
              }}
            >
              <CalendarIcon size={14} />
              Book Consultation
            </button>
          </div>
        </div>

        {/* Retry */}
        <button
          onClick={onRetry}
          className="ls-btn"
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.55)',
            fontSize: 14,
            fontWeight: 800,
            textTransform: 'uppercase',
            padding: '4px 12px',
            marginTop: 2,
          }}
        >
          <RotateIcon size={14} />
          Play again
        </button>
      </div>

      {/* Disclaimer */}
      <div style={{ width: '100%', maxWidth: 300, opacity: 0.35, marginTop: 10, padding: '0 8px 4px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.3, fontWeight: 'bold', margin: 0 }}>
          Disclaimer: The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
