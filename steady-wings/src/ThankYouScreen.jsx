// ThankYouScreen.jsx — confirmation after details are shared.
// Copied from the life-goals-bubble-shooter gold standard; copy restyled for Steady Wings.
import React from 'react';

// Backdrop is a high-altitude sky wash built from gradients rather than the
// photograph the scaffold shipped with: no binary asset to carry, and it stays
// crisp at any density. Brand blue overhead, a warm horizon glow along the base.
const SKY_BG = [
  'radial-gradient(ellipse 120% 55% at 50% 0%, rgba(59,141,212,0.30), rgba(2,6,23,0) 70%)',
  'radial-gradient(ellipse 150% 40% at 50% 100%, rgba(242,105,34,0.24), rgba(2,6,23,0) 72%)',
  'linear-gradient(180deg, rgba(5,26,58,0.55), rgba(3,12,30,0.92))',
  'linear-gradient(180deg, #051A3A 0%, #0E4F94 52%, #062042 100%)',
].join(', ');

export default function ThankYouScreen({ details, onPlayAgain }) {
  const leadName = details?.name || '';

  return (
    <div className="sl-thanks-container" style={{ background: SKY_BG }}>
      <div className="sl-thanks-content-area">
        {/* Success Icon */}
        <div className="sl-thanks-icon-wrapper">
          <div className="sl-thanks-icon-bg">
            <div className="sl-thanks-icon-ping" />
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              className="sl-thanks-icon-svg"
            >
              <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
        </div>

        {/* Thank You Message */}
        <div className="sl-thanks-message">
          <h2 className="sl-thanks-title">
            <span>THANK YOU</span>
            {leadName && <span className="sl-thanks-name">{leadName}</span>}
            <span>FOR SHARING YOUR DETAILS</span>
          </h2>
          {details?.date && details?.time ? (
            <p className="sl-thanks-subtitle">
              Your slot is booked for {details.date} at {details.time}. Our Relationship Manager will reach out to you
            </p>
          ) : (
            <p className="sl-thanks-subtitle">
              Our Relationship Manager will reach out to you
            </p>
          )}
        </div>
      </div>

      {/* Action Section */}
      <div className="sl-thanks-action-area">
        <button
          onClick={onPlayAgain}
          className="sl-thanks-play-btn"
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          <span>PLAY AGAIN</span>
        </button>
      </div>
    </div>
  );
}
