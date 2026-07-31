import React, { useState, useEffect } from 'react';
import { GameResult } from '../types';
import { buildShareUrl, encryptPayload } from '../utils/crypto';
import { shortenUrl } from '../utils/shortener';
import BookSlotModal from './BookSlotModal';
import {
  CalendarIcon,
  CheckIcon,
  CoinIcon,
  PhoneIcon,
  RotateIcon,
  ShareIcon,
  ShieldIcon,
  WalkerIcon,
} from './Icons';

interface Props {
  result: GameResult;
  playerName: string;
  playerMobile: string;
  onPlayAgain: () => void;
}

const WIN_AT = 60;
const CONFETTI_COLORS = ['#F26522', '#FFB988', '#FFC845', '#2E9BFF', '#003DA6', '#28A745'];

const Confetti: React.FC = () => (
  <div
    className="pointer-events-none absolute inset-0 overflow-hidden"
    style={{ zIndex: 1 }}
    aria-hidden="true"
  >
    {Array.from({ length: 26 }).map((_, i) => (
      <span
        key={i}
        className="confetti"
        style={
          {
            left: `${(i * 3.9 + ((i * 37) % 11)) % 100}%`,
            top: -20,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            transform: `rotate(${(i * 47) % 360}deg)`,
            '--dur': `${2 + ((i * 7) % 20) / 10}s`,
            '--delay': `${((i * 13) % 15) / 10}s`,
          } as React.CSSProperties
        }
      />
    ))}
  </div>
);

const ScoringScreen: React.FC<Props> = ({
  result,
  playerName,
  playerMobile,
  onPlayAgain,
}) => {
  const [animatedScore, setAnimatedScore] = useState(0);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const empMobile =
    sessionStorage.getItem('gamification_emp_mobile') ||
    sessionStorage.getItem('gamification_empMobile') ||
    '';
  const empMobileDigits = empMobile.replace(/\D/g, '');

  const won = result.score >= WIN_AT;

  // Cubic ease-out count-up
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
        game_id: sessionStorage.getItem('gamification_gameId') || 'GAME_035',
        referral: 'Y',
      };
      const newToken = encryptPayload(guestPayload);
      longUrl = `${origin}/gamification/${encodeURIComponent(
        guestPayload.game_id,
      )}?token=${encodeURIComponent(newToken)}`;
    }

    const shareText = `Hi! I crossed the wire at ${result.score}% in Bajaj Tightrope Protection. Keep your balance, keep your cover. Play here:`;

    try {
      const shortUrl = await shortenUrl(longUrl);
      const finalUrl = shortUrl || longUrl;

      if (navigator.share) {
        await navigator.share({
          title: 'Bajaj Tightrope Protection Score',
          text: shareText,
          url: finalUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText} ${finalUrl}`);
        alert('Score details and game link copied to clipboard!');
      }
    } catch (err) {
      console.error('[Share] failed:', err);
      try {
        await navigator.clipboard.writeText(`${shareText} ${longUrl}`);
        alert('Game link copied to clipboard!');
      } catch (clipErr) {
        console.error('Clipboard copy failed:', clipErr);
      }
    }
  };

  const headline =
    result.score < 40
      ? 'A wobble costs more than a slow step. Cover steadies the crossing.'
      : result.score < WIN_AT
        ? 'You held the wire. A little more cover and the goal is yours.'
        : result.score < 100
          ? 'Balanced and close. Protection is what carries you the last stretch.'
          : 'You crossed it. That is what a fully protected plan feels like.';

  // Circular progress ring — repo-standard radius 75 on a 200 viewBox
  const radius = 75;
  const circumference = 2 * Math.PI * radius;
  const progress = (Math.min(animatedScore, 100) / 100) * circumference;
  const ringColor = result.score < 40 ? '#FF6B84' : result.score < WIN_AT ? '#F26522' : '#28A745';
  const ringGlow =
    result.score < 40
      ? 'rgba(255,107,132,0.45)'
      : result.score < WIN_AT
        ? 'rgba(242,101,34,0.5)'
        : 'rgba(40,167,69,0.45)';

  const stats = [
    { icon: <WalkerIcon size={17} />, value: `${result.distance}m`, tone: '#fff' },
    { icon: <CoinIcon size={17} />, value: `₹${(result.coins * 100).toLocaleString('en-IN')}`, tone: '#FFC845' },
    { icon: <ShieldIcon size={17} />, value: `${result.shieldHits}`, tone: '#2E9BFF' },
  ];

  return (
    <div
      className="tp-screen screen-scroll relative flex flex-col items-center"
      style={{
        padding: 'var(--s8) var(--s5) var(--s5)',
        background:
          'radial-gradient(120% 70% at 50% 0%, #0A2450 0%, #04122B 55%, #030913 100%)',
      }}
    >
      {won && <Confetti />}

      {/* ── Header ── */}
      <div className="rise relative w-full text-center" style={{ zIndex: 2, maxWidth: 340 }}>
        <p style={{ fontSize: 22, fontWeight: 900, lineHeight: 1.2, color: '#fff' }}>
          Hi{' '}
          <span style={{ color: '#F26522' }}>{playerName || 'Friend'}!</span>
        </p>
        <p
          style={{
            fontSize: 10,
            fontWeight: 900,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: 'var(--tp-text-3)',
            marginTop: 4,
          }}
        >
          Your crossing report
        </p>
      </div>

      {/* ── Ring ── */}
      <div
        className="rise relative flex items-center justify-center"
        style={{ width: 176, height: 176, marginTop: 'var(--s5)', zIndex: 2 }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 200 200"
          style={{ transform: 'rotate(-90deg)' }}
          aria-hidden="true"
        >
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#071B3E" strokeWidth="12" />
          <circle
            cx="100"
            cy="100"
            r={radius + 9}
            fill="none"
            stroke="#0A2450"
            strokeWidth="1"
            opacity="0.6"
          />
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={ringColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            style={{
              filter: `drop-shadow(0 0 9px ${ringGlow})`,
              transition: 'stroke-dashoffset 0.12s linear',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span
            style={{
              fontSize: 42,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.04em',
              color: '#fff',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {animatedScore}
            <span style={{ fontSize: 20, color: 'var(--tp-text-2)' }}>%</span>
          </span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 900,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'var(--tp-text-3)',
              marginTop: 6,
            }}
          >
            Protected
          </span>
        </div>
      </div>

      {/* ── Stat rail: icon + number, on a rope rule ── */}
      <div
        className="rise relative flex w-full items-center justify-around"
        style={{ maxWidth: 300, marginTop: 'var(--s5)', zIndex: 2 }}
      >
        <span
          style={{
            position: 'absolute',
            left: 8,
            right: 8,
            top: '50%',
            height: 2,
            borderRadius: 1,
            background:
              'linear-gradient(90deg,rgba(126,151,187,0) 0%,rgba(126,151,187,0.35) 25%,rgba(126,151,187,0.35) 75%,rgba(126,151,187,0) 100%)',
          }}
        />
        {stats.map((s, i) => (
          <div
            key={i}
            className="relative flex items-center"
            style={{
              gap: 6,
              zIndex: 1,
              padding: '7px 11px',
              borderRadius: 999,
              background: 'rgba(4,18,43,0.92)',
              border: '1px solid var(--tp-stroke)',
            }}
          >
            {s.icon}
            <span
              style={{
                fontSize: 13.5,
                fontWeight: 900,
                color: s.tone,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {s.value}
            </span>
          </div>
        ))}
      </div>

      {/* ── Headline ── */}
      <h2
        className="rise text-center"
        style={{
          fontSize: 16,
          fontWeight: 800,
          lineHeight: 1.4,
          color: '#fff',
          maxWidth: 320,
          marginTop: 'var(--s5)',
          zIndex: 2,
        }}
      >
        {headline}
      </h2>

      {/* ── Share ── */}
      <button
        onClick={handleShare}
        className="btn-press tp-btn tp-btn-blue"
        style={{ maxWidth: 300, marginTop: 'var(--s5)', zIndex: 2 }}
      >
        <ShareIcon size={19} />
        <span>Share Score</span>
      </button>

      {/* ── Action card ── */}
      <div
        className="rise tp-glass w-full"
        style={{ maxWidth: 340, padding: 'var(--s5)', marginTop: 'var(--s5)', zIndex: 2 }}
      >
        {bookingSuccess ? (
          <div
            className="flex items-center justify-center"
            style={{
              gap: 8,
              minHeight: 52,
              borderRadius: 'var(--tp-r)',
              background: 'rgba(40,167,69,0.14)',
              border: '1px solid rgba(40,167,69,0.45)',
              color: '#5FD37E',
              fontSize: 13,
              fontWeight: 800,
              padding: '0 var(--s4)',
              textAlign: 'center',
            }}
          >
            <CheckIcon size={17} color="#5FD37E" />
            Slot booked. We will call you.
          </div>
        ) : (
          <>
            <p
              style={{
                fontSize: 14.5,
                fontWeight: 700,
                lineHeight: 1.4,
                color: '#fff',
                textAlign: 'center',
                marginBottom: 'var(--s4)',
              }}
            >
              Talk to a specialist about the cover that keeps your plan steady.
            </p>

            <div className="flex flex-col" style={{ gap: 'var(--s3)' }}>
              {empMobileDigits && (
                <a
                  href={`tel:${empMobileDigits}`}
                  className="btn-press tp-btn tp-btn-rope"
                >
                  <PhoneIcon size={18} color="#04122B" />
                  <span>Call Specialist</span>
                </a>
              )}

              {empMobileDigits && (
                <div className="flex items-center" style={{ gap: 'var(--s3)' }}>
                  <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 900,
                      letterSpacing: '0.18em',
                      color: 'var(--tp-text-3)',
                    }}
                  >
                    OR
                  </span>
                  <span style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.1)' }} />
                </div>
              )}

              <button
                onClick={() => setShowBooking(true)}
                className="btn-press tp-btn tp-btn-green"
              >
                <CalendarIcon size={18} />
                <span>Book Consultation</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── Play again (ghost) ── */}
      <button
        onClick={onPlayAgain}
        className="btn-press tp-btn tp-btn-ghost"
        style={{ maxWidth: 220, marginTop: 'var(--s5)', zIndex: 2 }}
      >
        <RotateIcon size={17} />
        <span>Play again</span>
      </button>

      {/* ── Disclaimer ── */}
      <p
        style={{
          maxWidth: 340,
          marginTop: 'var(--s6)',
          paddingBottom: 'var(--s5)',
          fontSize: 9,
          lineHeight: 1.5,
          textAlign: 'center',
          color: 'var(--tp-text-3)',
          zIndex: 2,
        }}
      >
        <strong style={{ letterSpacing: '0.06em' }}>Disclaimer:</strong> The results shown in this
        game are indicative and based solely on the information provided by the participant. They
        are intended for engagement and awareness purposes only and do not constitute financial
        advice or a recommendation to purchase any life insurance product. Participants should seek
        independent professional advice before making any financial or insurance decisions. While
        due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no
        liability for its outcomes.
      </p>

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
