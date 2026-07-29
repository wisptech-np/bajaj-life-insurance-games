// ThankYouScreen.jsx — confirmation after details are shared.
// Copied from the guardian-shelter gold standard; copy restyled for Ring-Fence.
import React from 'react';

// Backdrop is a gradient wash rather than the photograph the scaffold shipped
// with (goal-juggler precedent): no binary asset to carry, and it stays crisp
// at any density. Brand blue overhead, secured-green along the bottom — the
// same grammar the game uses for the safety wall and a sealed claim.
const FENCE_BG = [
  'radial-gradient(ellipse 120% 60% at 50% 0%, rgba(30,107,224,0.32), rgba(2,6,23,0) 70%)',
  'radial-gradient(ellipse 140% 45% at 50% 100%, rgba(24,110,60,0.38), rgba(2,6,23,0) 72%)',
  'linear-gradient(180deg, rgba(2,6,23,0.55), rgba(2,6,23,0.9))',
  'linear-gradient(180deg, #08152F 0%, #0A2450 45%, #061229 100%)',
].join(', ');

export default function ThankYouScreen({ details, onPlayAgain }) {
  const leadName = details?.name || '';

  return (
    <div className="sl-thanks-container" style={{ background: FENCE_BG }}>
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
