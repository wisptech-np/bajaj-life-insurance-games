import React, { useState, useEffect } from 'react';
import { GameResult } from '../types';
import { buildShareUrl, encryptPayload } from '../utils/crypto';
import { shortenUrl } from '../utils/shortener';
import BookSlotModal from './BookSlotModal';

interface Props {
  result: GameResult;
  playerName: string;
  playerMobile: string;
  onPlayAgain: () => void;
}

const ScoringScreen: React.FC<Props> = ({ result, playerName, playerMobile, onPlayAgain }) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  
  const empMobile = sessionStorage.getItem('gamification_emp_mobile') || 
                    sessionStorage.getItem('gamification_empMobile') || '';

  // Clean formatted mobile for tel link (digits only)
  const empMobileDigits = empMobile.replace(/\D/g, '');

  // Cubic ease-out score animation sweep
  useEffect(() => {
    const start = performance.now();
    const duration = 1200; 
    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setAnimatedScore(Math.round(ease * result.score));
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [result.score]);

  const handleShare = async () => {
    let longUrl = buildShareUrl();
    if (!longUrl) {
      // Fallback guest URL if no token exists
      const origin = window.location.origin;
      const guestPayload = {
        game_id: sessionStorage.getItem('gamification_gameId') || 'GAME_036',
        referral: 'Y'
      };
      const newToken = encryptPayload(guestPayload);
      longUrl = `${origin}/gamification/${encodeURIComponent(guestPayload.game_id)}?token=${encodeURIComponent(newToken)}`;
    }

    const shareText = `Hi! I just scored ${result.score}% in Bajaj Coverage Archer! Defend your goals and protect your future! Play here:`;
    
    try {
      const shortUrl = await shortenUrl(longUrl);
      const finalUrl = shortUrl || longUrl;
      
      if (navigator.share) {
        await navigator.share({
          title: 'Bajaj Coverage Archer Score',
          text: shareText,
          url: finalUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${finalUrl}`);
        alert('Score details and game link copied to clipboard!');
      }
    } catch (err) {
      console.error('[Share] failed:', err);
      // Fail-soft clipboard copy
      try {
        await navigator.clipboard.writeText(`${shareText} ${longUrl}`);
        alert('Game link copied to clipboard!');
      } catch (clipErr) {
        console.error('Clipboard copy failed:', clipErr);
      }
    }
  };

  const getFeedbackMessage = (score: number) => {
    if (score < 60) {
      return "You can do better. Try avoiding negative obstacles.";
    } else if (score < 100) {
      return "Good job. You're close to your goal.";
    } else {
      return "Fantastic! You have achieved your goal!";
    }
  };

  // Speedometer path properties
  // Semi-circle length for radius=40 is PI * r = 125.6
  const strokeDasharray = 126;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * (animatedScore / 100));

  // Determine gauge color transition
  const getGaugeColor = (score: number) => {
    if (score < 40) return '#EF4444'; // Red
    if (score < 80) return '#F97316'; // Orange
    return '#22C55E'; // Green
  };

  return (
    <div className="screen-scroll flex flex-col justify-between px-6 py-6" style={{ background: 'linear-gradient(185deg, #030F26 0%, #08224F 50%, #030F26 100%)' }}>
      
      {/* Greeting Header */}
      <div className="text-center pt-2">
        <h2 className="text-lg font-extrabold text-white">Hi {playerName}!</h2>
        <p className="text-[10px] text-blue-200/50 uppercase tracking-widest mt-0.5">Scoring Report</p>
      </div>

      {/* Glassmorphic Score Card Container */}
      <div className="mx-1 my-4 p-5 bg-white/5 border border-white/10 rounded-[1.5rem] shadow-xl backdrop-blur-md flex flex-col items-center">
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-200">Your Protection Score</span>
        
        {/* SVG Speedometer Gauge Widget */}
        <div className="relative w-44 h-28 flex items-center justify-center mt-3">
          <svg className="w-full h-full transform -rotate-180" viewBox="0 0 100 60">
            {/* Background Arch */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Foreground Sweeping Arch */}
            <path
              d="M 10 50 A 40 40 0 0 1 90 50"
              fill="none"
              stroke={getGaugeColor(animatedScore)}
              strokeWidth="8"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-300"
            />
          </svg>

          {/* Central Text Counter */}
          <div className="absolute bottom-1 text-center">
            <span className="text-3xl font-black italic text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.5)' }}>
              {animatedScore}%
            </span>
            <p className="text-[9px] font-bold text-blue-300/60 uppercase tracking-wider mt-0.5">Protected</p>
          </div>
        </div>

        {/* Adaptive Feedback */}
        <p className="text-center text-xs font-bold leading-relaxed text-blue-100 max-w-[240px] mt-2">
          {getFeedbackMessage(result.score)}
        </p>

        {/* Mini stats grid */}
        <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-4 border-t border-white/5 text-center">
          <div>
            <span className="text-[9px] font-black text-blue-200/50 uppercase tracking-wider block">Shield %</span>
            <span className="text-sm font-extrabold text-[#22C55E]">{result.familyShieldPct}%</span>
          </div>
          <div>
            <span className="text-[9px] font-black text-blue-200/50 uppercase tracking-wider block">Goal Status</span>
            <span className="text-sm font-extrabold text-white">{result.score >= 80 ? 'Secured' : 'At Risk'}</span>
          </div>
          <div>
            <span className="text-[9px] font-black text-blue-200/50 uppercase tracking-wider block">Neutralized</span>
            <span className="text-sm font-extrabold text-[#00AEEF]">{result.virusesNeutralized}</span>
          </div>
        </div>
      </div>

      {/* Share score */}
      <div className="px-1 space-y-4">
        <button
          onClick={handleShare}
          className="btn-press w-full rounded-xl py-3.5 text-xs font-black uppercase tracking-wider text-white shadow-md flex items-center justify-center gap-2"
          style={{ background: '#1D9BF0' }}
        >
          <span>🐦</span> Share Score
        </button>

        {/* Promotion Message */}
        <p className="text-xs font-semibold leading-relaxed text-center text-blue-200/80 max-w-[280px] mx-auto">
          Avoid real-life financial hazards by securing your goals. Connect with our Relationship Manager today!
        </p>

        {/* Connect with RM */}
        <div className="bg-[#051636] border border-white/5 rounded-2xl p-4 shadow-inner space-y-3">
          {/* Booking feedback */}
          {bookingSuccess ? (
            <div className="bg-teal-500/10 border border-teal-500/30 text-teal-400 rounded-xl py-3 px-4 text-xs font-bold text-center">
              ✓ Slot Booked Successfully! We will contact you.
            </div>
          ) : (
            <div className="grid gap-3" style={{ gridTemplateColumns: empMobileDigits ? '1fr 1fr' : '1fr' }}>
              {empMobileDigits && (
                <a
                  href={`tel:${empMobileDigits}`}
                  className="btn-press flex items-center justify-center rounded-xl py-3 text-xs font-bold text-white uppercase tracking-wider bg-[#EA580C]"
                >
                  📞 Call Now
                </a>
              )}
              <button
                onClick={() => setShowBooking(true)}
                className="btn-press w-full rounded-xl py-3 text-xs font-black text-white uppercase tracking-wider bg-[#0D9488]"
              >
                📅 Book a Slot
              </button>
            </div>
          )}
        </div>

        {/* Restart Ghost Button */}
        <button
          onClick={onPlayAgain}
          className="btn-press w-full rounded-xl py-3 text-xs font-black uppercase tracking-wider text-white/80 border border-white/20 hover:bg-white/5"
        >
          Play Again
        </button>
      </div>

      {/* Footer Legal Disclaimer */}
      <div className="text-center text-[7.5px] leading-relaxed text-blue-300/30 px-2 mt-6 pb-2">
        <strong>DISCLAIMER:</strong> THE RESULTS SHOWN IN THIS GAME ARE INDICATIVE AND BASED SOLELY ON THE INFORMATION PROVIDED BY THE PARTICIPANT. THEY ARE INTENDED FOR ENGAGEMENT AND AWARENESS PURPOSES ONLY AND DO NOT CONSTITUTE FINANCIAL ADVICE OR A RECOMMENDATION TO PURCHASE ANY LIFE INSURANCE PRODUCT. PARTICIPANTS SHOULD SEEK INDEPENDENT PROFESSIONAL ADVICE BEFORE MAKING ANY FINANCIAL OR INSURANCE DECISIONS. WHILE DUE CARE HAS BEEN TAKEN IN DESIGNING THE GAME, BAJAJ LIFE INSURANCE ASSUMES NO LIABILITY FOR ITS OUTCOMES.
      </div>

      {/* Booking Slot Modal overlay */}
      {showBooking && (
        <BookSlotModal
          name={playerName}
          mobile={playerMobile}
          onClose={() => setShowBooking(false)}
          onBookSuccess={() => {
            setShowBooking(false);
            setBookingSuccess(true);
          }}
        />
      )}
    </div>
  );
};

export default ScoringScreen;
