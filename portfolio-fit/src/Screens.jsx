// Screens.jsx — Home + HowToPlay + Results screens for Portfolio Fit.
// Icons all come from ./icons.jsx so the HUD, the block faces and the screens
// share one drawing language. How-to-play is animation-only (G2).
import React from 'react';
import { motion } from 'framer-motion';
import { ASSETS, GAME_CONFIG } from './data.js';
import { buildShareUrl } from './utils/crypto';
import { shortenUrl } from './utils/shortener';
import {
  ASSET_ICONS,
  PlayIcon,
  CalendarIcon,
  ShareIcon,
  PhoneIcon,
  RotateIcon,
  ShieldTinyIcon,
  RebalanceIcon,
  DiversifyIcon,
  DragIcon,
  LineIcon,
} from './icons.jsx';

/* Shared block skin — one gradient direction for every asset, everywhere. */
function blockBg(asset) {
  const a = ASSETS[asset];
  return `linear-gradient(180deg, ${a.light} -18%, ${a.color} 48%, ${a.deep} 132%)`;
}

/* ─── Asset legend (home + how-to-play) ─────────────────────── */
function Legend({ className = '' }) {
  return (
    <div className={`pf-legend ${className}`}>
      {Object.values(ASSETS).map((a) => {
        const Glyph = ASSET_ICONS[a.id];
        return (
          <span key={a.id} className="pf-legend-item">
            <span className="pf-legend-chip" style={{ background: blockBg(a.id) }}>
              <Glyph size={11} />
            </span>
            <span className="pf-legend-name">{a.name}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ─── Home board preview ────────────────────────────────────── */
const Eq = ASSET_ICONS.equity;

function BoardPreview() {
  const E = 'equity';
  const D = 'debt';
  const G = 'gold';
  const I = 'insurance';
  // Row 2 is the line that completes when the dragged piece lands.
  const grid = [
    [D, null, G, null, null, E, null],
    [D, E, null, null, I, null, null],
    [E, G, I, D, E, G, I],
    [null, null, D, null, null, null, G],
    [I, null, null, E, null, D, null],
    [null, G, null, null, null, null, null],
  ];

  return (
    <div className="pf-preview-board" aria-hidden="true">
      <div className="pf-preview-grid">
        {grid.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`pf-preview-cell${cell ? ' filled' : ''}${r === 2 && cell ? ' flash-row' : ''}`}
              style={cell ? { background: blockBg(cell) } : undefined}
            />
          ))
        )}
      </div>

      {/* A 2×2 equity holding dragged in as ONE object, not four tiles */}
      <div className="pf-preview-piece" style={{ background: blockBg('equity') }}>
        <Eq size={13} /><Eq size={13} /><Eq size={13} /><Eq size={13} />
      </div>
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
      className="pf-home"
    >
      <div className="pf-home-badge">
        <ShieldTinyIcon size={13} />
        <span>Bajaj Life · Asset Allocation</span>
      </div>

      <h1 className="pf-home-title">Portfolio<br />Fit</h1>
      <p className="pf-home-sub">
        Fit every asset class into one balanced portfolio. Clear a line to rebalance.
      </p>

      <BoardPreview />

      <Legend />

      <motion.button
        type="button"
        className="ls-btn ls-btn-primary pf-play-btn"
        onClick={onStart}
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18, type: 'spring', damping: 20, stiffness: 180 }}
        whileTap={{ scale: 0.97 }}
      >
        <PlayIcon size={20} />
        <span>Play</span>
      </motion.button>
    </motion.div>
  );
}

/* ─── How to play — looping demo, no instruction text (G2) ──── */
const Ins = ASSET_ICONS.insurance;

function DemoBoard() {
  const E = 'equity';
  const D = 'debt';
  const G = 'gold';
  const I = 'insurance';
  // Row 2 is one insurance pair short of a full line.
  const grid = [
    [null, G, null, null, D],
    [I, null, null, E, null],
    [E, D, G, null, null],
    [null, null, I, null, G],
    [D, null, null, E, null],
  ];

  return (
    <div className="pfh-demo" aria-hidden="true">
      <div className="pfh-board">
        {grid.flatMap((row, r) =>
          row.map((cell, c) => (
            <div
              key={`${r}-${c}`}
              className={`pfh-cell${cell ? ' filled' : ''}${r === 2 && cell ? ' in-line' : ''}`}
              style={cell ? { background: blockBg(cell) } : undefined}
            />
          ))
        )}
      </div>

      <div className="pfh-sweep" />

      {/* the dragged holding: one silhouette, two icon faces */}
      <div className="pfh-piece" style={{ background: blockBg('insurance') }}>
        <Ins size={15} />
        <Ins size={15} />
      </div>

      <div className="pfh-finger">
        <DragIcon size={30} />
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
      className="pf-howto"
    >
      <div className="pf-howto-card">
        <h2 className="pf-howto-title">How to Play</h2>

        <DemoBoard />

        <div className="pf-howto-keys">
          <span className="pf-howto-key">
            <DragIcon size={20} />
            <b>Drag</b>
          </span>
          <span className="pf-howto-key">
            <LineIcon size={20} />
            <b>Fill a line</b>
          </span>
          <span className="pf-howto-key pf-howto-key-hot">
            <DiversifyIcon size={20} />
            <b>Mix for &times;2</b>
          </span>
        </div>

        <motion.button
          type="button"
          onClick={onPlay}
          className="ls-btn ls-btn-primary pf-howto-play"
          whileTap={{ scale: 0.97 }}
        >
          <PlayIcon size={18} />
          <span>Play</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ─── Confetti (lightweight) ─────────────────────── */
function Confetti() {
  const colors = ['#FFC845', '#FFE38A', '#FF8533', '#3B8DD4', '#003DA6', '#28A745', '#F2B705'];
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

/* ─── ResultsScreen — full-screen game-over view ──────── */
export function ResultsScreen({ stats, won, onRetry, onHome, onBookSlot, retryLabel }) {
  void onHome;
  void retryLabel;
  const score = stats?.score || 0;
  const linesCleared = stats?.linesCleared || 0;
  const diversifiedClears = stats?.diversifiedClears || 0;
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
    const shareMessage = `Hi,\nI scored ${score} points balancing my portfolio in Portfolio Fit.\nEquity, debt, gold, insurance — every piece has to fit. Try it here: ${shareUrl}`.trim();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Portfolio Fit',
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
  const strokeColor = score < targetScore * 0.3 ? '#ef4444' : '#22c55e';
  const glowColor = score < targetScore * 0.3 ? 'rgba(239, 68, 68, 0.4)' : 'rgba(34, 197, 94, 0.4)';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="pf-results"
    >
      {won && <Confetti />}

      {/* Header */}
      <div className="pf-res-col" style={{ textAlign: 'center' }}>
        <p style={{ color: '#fff', fontSize: 24, fontWeight: 900, lineHeight: 1.2, margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span style={{ color: '#3b82f6', fontWeight: 950 }}>{leadName || 'Investor'}!</span><br />
          <span style={{ fontSize: 20, color: 'rgba(255, 255, 255, 0.85)', fontWeight: 800 }}>
            {won ? 'Portfolio Rebalanced' : 'Portfolio Overloaded'}
          </span>
        </p>
      </div>

      {/* Circular Progress Ring */}
      <div style={{ width: 170, height: 170, position: 'relative', flexShrink: 0 }}>
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

      {/* Round stats — icon, value and label on one baseline */}
      <div className="pf-res-stats">
        <div className="ls-chip pf-res-stat">
          <RebalanceIcon size={18} />
          <span className="pf-res-stat-val">{linesCleared}</span>
          <span className="hud-label">Rebalances</span>
        </div>
        <div className="ls-chip pf-res-stat">
          <span style={{ color: '#FFC845', display: 'flex' }}><DiversifyIcon size={18} /></span>
          <span className="pf-res-stat-val" style={{ color: '#FFC845' }}>{diversifiedClears}</span>
          <span className="hud-label">Diversified</span>
        </div>
      </div>

      {/* Motivational Message */}
      <h2 className="pf-res-msg">
        A balanced portfolio needs protection too — see how insurance fits into yours
      </h2>

      {/* Share */}
      <button type="button" onClick={handleShare} className="pf-res-share">
        <ShareIcon size={18} />
        <span>Share</span>
      </button>

      {/* Action Card Section */}
      <div className="pf-res-card">
        <p className="pf-res-card-title">
          A simple conversation can protect everything you&apos;re building
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {empPhone && (
            <a href={`tel:${empPhone}`} className="pf-res-action pf-res-action-call">
              <PhoneIcon size={18} />
              <span>Call Now</span>
            </a>
          )}

          {empPhone && (
            <div className="pf-res-or">
              <i /><span>OR</span><i />
            </div>
          )}

          <motion.button
            type="button"
            onClick={onBookSlot}
            className="pf-res-action pf-res-action-book"
            whileTap={{ scale: 0.97 }}
          >
            <CalendarIcon size={18} />
            <span>Book a Slot</span>
          </motion.button>
        </div>
      </div>

      {/* Play again action */}
      <motion.button type="button" onClick={onRetry} className="pf-res-again" whileTap={{ scale: 0.95 }}>
        <RotateIcon size={18} />
        <span>Play again</span>
      </motion.button>

      {/* Disclaimer */}
      <div className="pf-res-col" style={{ opacity: 0.4, padding: '0 12px 20px' }}>
        <p style={{ fontSize: 8, textAlign: 'center', color: '#fff', lineHeight: 1.4, fontWeight: 'bold', margin: 0 }}>
          <span style={{ opacity: 0.7, marginRight: 4 }}>Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
}
