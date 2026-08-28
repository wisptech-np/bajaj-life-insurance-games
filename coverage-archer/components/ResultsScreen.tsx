// ResultsScreen — canonical repo scoring screen: animated count-up, SVG progress
// ring, confetti on a win, Share Score, the shared Call Now / OR / Book a Slot
// card, ghost Play again, tiny disclaimer.
import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { GameResult } from '../types';
import { GAME_CONFIG } from '../data';
import { buildShareUrl, encryptPayload } from '../utils/crypto';
import { shortenUrl } from '../utils/shortener';
import { RMActionCard } from '../kit/screens.jsx';
import { metaFor } from '../kit/game-meta.js';

const META = metaFor('coverage-archer');

interface Props {
  result: GameResult;
  onRetry: () => void;
  onHome: () => void;
  onBookSlot: () => void;
}

/* ── Icons ─────────────────────────────────────────────── */
function ShareIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function RotateIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
    </svg>
  );
}

const CONFETTI_COLORS = ['#FFC845', '#FFE38A', '#F26522', '#00AEEF', '#003DA6', '#28A745', '#EC4899'];

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 26 }).map((_, i) => ({
        left: Math.random() * 100,
        dur: 2 + Math.random() * 2,
        delay: Math.random() * 1.5,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: Math.random() * 360,
      })),
    []
  );
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden="true">
      {pieces.map((p, i) => (
        <div
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            animationDuration: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}

const ResultsScreen: React.FC<Props> = ({ result, onRetry, onHome, onBookSlot }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const leadName = sessionStorage.getItem('lastSubmittedName') || '';
  const empPhone = (sessionStorage.getItem('gamification_emp_mobile') || '').replace(/\D/g, '');

  // Animated score count-up (cubic ease-out)
  useEffect(() => {
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(ease * result.score));
      if (progress < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [result.score]);

  const handleShare = async () => {
    let longUrl = buildShareUrl();
    if (!longUrl) {
      const origin = window.location.origin;
      const guestPayload = {
        game_id: sessionStorage.getItem('gamification_gameId') || 'GAME_036',
        referral: 'Y',
      };
      const newToken = encryptPayload(guestPayload);
      longUrl = `${origin}/gamification/${encodeURIComponent(guestPayload.game_id)}?token=${encodeURIComponent(newToken)}`;
    }

    const shareText = `Hi! I scored ${result.score} points as a Guardian Archer, covering every risk my family faced. Test your precision here:`;

    try {
      const shortUrl = await shortenUrl(longUrl);
      const finalUrl = shortUrl || longUrl;

      if (navigator.share) {
        await navigator.share({ title: 'Guardian Archer — Bajaj Life', text: shareText, url: finalUrl });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${finalUrl}`);
        alert('Score and game link copied to clipboard!');
      }
    } catch (err) {
      console.error('[Share] failed:', err);
      try {
        await navigator.clipboard.writeText(`${shareText} ${longUrl}`);
        alert('Game link copied to clipboard!');
      } catch {
        /* ignore */
      }
    }
  };

  // Progress ring
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(result.score, GAME_CONFIG.TARGET_SCORE) / GAME_CONFIG.TARGET_SCORE) * circumference;
  const strokeColor = result.won ? '#28A745' : result.score >= 800 ? '#F26522' : '#EF4444';
  const glowColor = result.won ? 'rgba(40,167,69,0.4)' : 'rgba(242,101,34,0.4)';

  const headline = result.won
    ? 'Every risk covered. That is what precise protection looks like.'
    : result.accuracy >= 60
      ? 'Sharp shooting — but a few risks still slipped through.'
      : 'Risks got past your arrows. Real cover leaves no gaps.';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 1.04, y: -15 }}
      transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      className="screen-scroll relative flex flex-col items-center px-5 pb-6 pt-9"
      style={{ background: 'linear-gradient(185deg, #04122B 0%, #08224F 50%, #04122B 100%)' }}
    >
      {result.won && <Confetti />}

      {/* Header */}
      <div className="relative z-10 mb-4 text-center">
        <h2 className="text-2xl font-black leading-tight text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          Hi <span className="text-[#00AEEF]">{leadName || 'Guardian'}!</span>
        </h2>
        <p className="mt-0.5 text-[15px] font-extrabold text-white/85">Your Score</p>
      </div>

      {/* Score ring */}
      <div className="relative z-10 mb-5 flex items-center justify-center">
        <div className="relative flex h-[170px] w-[170px] items-center justify-center">
          <svg className="h-full w-full" viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
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
              style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, transition: 'stroke-dashoffset 1.2s ease-out' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[26px] font-black leading-none text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString('en-IN')}
            </span>
            <span className="mt-1 text-[9px] font-black uppercase tracking-[0.15em] text-white/60">Points</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="relative z-10 mb-5 grid w-full max-w-[340px] grid-cols-4 gap-2">
        {[
          { label: 'Covered', value: `${result.risksNeutralized}/${result.totalRisks}`, color: '#28A745' },
          { label: 'Accuracy', value: `${result.accuracy}%`, color: '#00AEEF' },
          { label: 'Criticals', value: `${result.criticalHits}`, color: '#FACC15' },
          { label: 'Waves', value: `${result.wavesCleared}/${GAME_CONFIG.WAVES.length}`, color: '#F26522' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-1 py-2.5 text-center backdrop-blur-sm">
            <span className="block text-sm font-black" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="text-[7.5px] font-black uppercase tracking-wider text-blue-200/50">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Message */}
      <div className="relative z-10 mb-5 px-4 text-center">
        <h3 className="m-0 text-[17px] font-black leading-snug text-white" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
          {headline}
        </h3>
      </div>

      {/* Primary action */}
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={handleShare}
        className="btn-secondary relative z-10 mb-5"
        style={{ maxWidth: 280 }}
      >
        <ShareIcon />
        <span>Share Score</span>
      </motion.button>

      {/* Action card — the shared one. The shape here was already right; the
          labels ("Call Specialist" / "Book Consultation") and the local button
          classes were not, and label drift is what the parity review flagged. */}
      <div className="relative z-10 flex w-full justify-center">
        <RMActionCard message={META.rmMessage} onBookSlot={onBookSlot} />
      </div>

      {/* Ghost actions */}
      <div className="relative z-10 flex flex-col items-center">
        <motion.button whileTap={{ scale: 0.96 }} onClick={onRetry} className="btn-ghost">
          <RotateIcon />
          <span>Play again</span>
        </motion.button>
        <button onClick={onHome} className="btn-ghost" style={{ fontSize: 12, opacity: 0.55, padding: '4px 16px' }}>
          Home
        </button>
      </div>

      {/* Disclaimer */}
      <div className="relative z-10 w-full max-w-[340px] px-3 pb-5 pt-3 opacity-40">
        <p className="m-0 text-center text-[8px] font-bold leading-relaxed text-white">
          <span className="mr-1 opacity-70">Disclaimer:</span>
          The results shown in this game are indicative and based solely on the information provided by the
          participant. They are intended for engagement and awareness purposes only and do not constitute financial
          advice or a recommendation to purchase any life insurance product. Participants should seek independent
          professional advice before making any financial or insurance decisions. While due care has been taken in
          designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
        </p>
      </div>
    </motion.div>
  );
};

export default ResultsScreen;
