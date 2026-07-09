// ResultsScreen — full-screen game-over view: animated score ring, stats, CTAs.
// Follows the life-goals-bubble-shooter ResultsScreen structure.
import React, { useEffect, useMemo, useState } from 'react';
import { GameResult } from '../types';
import { buildShareUrl, encryptPayload } from '../utils/crypto';
import { shortenUrl } from '../utils/shortener';

interface Props {
  result: GameResult;
  onRetry: () => void;
  onHome: () => void;
  onBookSlot: () => void;
}

/* ── Icons ─────────────────────────────────────────────── */
function ShareIcon({ size = 16 }: { size?: number }) {
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

function PhoneIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

function CalendarIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

function RotateIcon({ size = 16 }: { size?: number }) {
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
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-[1]" aria-hidden="true">
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

const TARGET_SCORE = 2000; // full ring

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

    const shareText = `Hi! I scored ${result.score} points as a Guardian Archer, protecting a family from every risk. Test your precision here:`;

    try {
      const shortUrl = await shortenUrl(longUrl);
      const finalUrl = shortUrl || longUrl;

      if (navigator.share) {
        await navigator.share({
          title: 'Guardian Archer — Bajaj Life',
          text: shareText,
          url: finalUrl,
        });
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
  const progress = (Math.min(animatedScore, TARGET_SCORE) / TARGET_SCORE) * circumference;
  const strokeColor = result.won ? '#28A745' : result.score >= 800 ? '#F26522' : '#EF4444';
  const glowColor = result.won ? 'rgba(40,167,69,0.4)' : 'rgba(242,101,34,0.4)';

  const headline = result.won
    ? 'Family secured! Every risk neutralized with precision.'
    : result.accuracy >= 60
      ? 'Sharp shooting! A few risks slipped through — cover them all next time.'
      : 'Risks got past your arrows. Real protection needs the right cover.';

  return (
    <div
      className="screen-scroll relative flex flex-col items-center px-5 pt-9 pb-6"
      style={{ background: 'linear-gradient(185deg, #030F26 0%, #08224F 50%, #030F26 100%)' }}
    >
      {result.won && <Confetti />}

      {/* Header */}
      <div className="relative z-10 text-center mb-4">
        <h2 className="text-xl font-black text-white leading-tight">
          Hi <span className="text-[#00AEEF]">{leadName || 'Guardian'}!</span>
        </h2>
        <p className="text-[10px] text-blue-200/50 uppercase tracking-widest mt-0.5">
          {result.won ? 'Mission Accomplished' : 'Mission Report'}
        </p>
      </div>

      {/* Score ring */}
      <div className="relative z-10 flex justify-center items-center mb-4">
        <div className="relative w-[168px] h-[168px] flex items-center justify-center">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 200 200">
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
              style={{ filter: `drop-shadow(0 0 8px ${glowColor})`, transition: 'stroke-dashoffset 0.3s linear' }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[27px] font-black italic text-white leading-none" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {animatedScore.toLocaleString('en-IN')}
            </span>
            <span className="text-[9px] font-black text-blue-200/60 uppercase tracking-[0.2em] mt-1">Points</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="relative z-10 w-full max-w-[340px] grid grid-cols-4 gap-2 mb-4">
        {[
          { label: 'Hits', value: `${result.virusesNeutralized}/${result.totalViruses}`, color: '#28A745' },
          { label: 'Accuracy', value: `${result.accuracy}%`, color: '#00AEEF' },
          { label: 'Criticals', value: `${result.criticalHits}`, color: '#FACC15' },
          { label: 'Waves', value: `${result.wavesCleared}/3`, color: '#F26522' },
        ].map((s) => (
          <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl py-2.5 px-1 text-center backdrop-blur-sm">
            <span className="text-sm font-black block" style={{ color: s.color }}>
              {s.value}
            </span>
            <span className="text-[7.5px] font-black text-blue-200/50 uppercase tracking-wider">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Message */}
      <p className="relative z-10 text-center text-[13px] font-bold text-blue-100 leading-relaxed max-w-[300px] mb-5">
        {headline}
      </p>
      <p className="relative z-10 text-center text-xs font-black text-white leading-snug max-w-[300px] mb-5">
        Know how much Life Cover your family needs to stay protected from every risk
      </p>

      {/* Action card */}
      <div className="relative z-10 w-full max-w-[340px] bg-slate-950/70 border border-white/10 rounded-3xl p-4 backdrop-blur-md shadow-xl mb-4 space-y-3">
        <button
          onClick={onBookSlot}
          className="btn-press w-full rounded-2xl py-3.5 text-sm font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(40,167,69,0.35)]"
          style={{ background: 'linear-gradient(135deg, #28A745 0%, #16A34A 100%)' }}
        >
          <CalendarIcon />
          Book a Slot
        </button>

        {empPhone && (
          <a
            href={`tel:${empPhone}`}
            className="btn-press w-full rounded-2xl py-3 text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #FACC15 0%, #F26522 100%)' }}
          >
            <PhoneIcon />
            Call Now
          </a>
        )}

        <button
          onClick={handleShare}
          className="btn-press w-full rounded-2xl py-3 text-xs font-black uppercase tracking-wider text-white flex items-center justify-center gap-2 bg-[#003DA6] border border-white/10"
        >
          <ShareIcon />
          Share Score
        </button>
      </div>

      {/* Secondary actions */}
      <div className="relative z-10 flex gap-3 w-full max-w-[340px] mb-5">
        <button
          onClick={onRetry}
          className="btn-press flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white border border-white/20 hover:bg-white/5 flex items-center justify-center gap-2"
        >
          <RotateIcon />
          {result.won ? 'Play Again' : 'Try Again'}
        </button>
        <button
          onClick={onHome}
          className="btn-press flex-1 rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white/60 border border-white/10 hover:bg-white/5"
        >
          Home
        </button>
      </div>

      {/* Disclaimer */}
      <div className="relative z-10 text-center text-[7.5px] leading-relaxed text-blue-300/30 px-2">
        <strong>Disclaimer:</strong> The results shown in this game are indicative and based solely on the information
        provided by the participant. They are intended for engagement and awareness purposes only and do not constitute
        financial advice or a recommendation to purchase any life insurance product. Participants should seek
        independent professional advice before making any financial or insurance decisions. While due care has been
        taken in designing the game, Bajaj Life Insurance assumes no liability for its outcomes.
      </div>
    </div>
  );
};

export default ResultsScreen;
