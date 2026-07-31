import React, { useState } from 'react';
import { PlayerInfo } from '../types';
import { submitToLMS } from '../services/api';
import { CloseIcon, LockIcon, PoleIcon } from './Icons';

interface Props {
  score: number;
  onSubmit: (info: PlayerInfo) => void;
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 10,
  fontWeight: 900,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--tp-text-2)',
  marginBottom: 6,
};

const errStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: '#FF6B84',
  marginTop: 6,
};

const EnterDetailsScreen: React.FC<Props> = ({ score, onSubmit }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [agreed, setAgreed] = useState(true);

  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [consentError, setConsentError] = useState('');

  const [showTCModal, setShowTCModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMobile(e.target.value.replace(/\D/g, '').slice(0, 10));
    setMobileError('');
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setNameError('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let valid = true;
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError('Please enter your name');
      valid = false;
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      setNameError('Name should contain only alphabets');
      valid = false;
    }

    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMobileError('Enter a valid 10-digit mobile number');
      valid = false;
    }

    if (!agreed) {
      setConsentError('Please accept the T&C to continue');
      valid = false;
    } else {
      setConsentError('');
    }

    if (!valid) return;

    setIsSubmitting(true);
    try {
      const existingLeadNo =
        sessionStorage.getItem('tightropeLeadNo') ||
        sessionStorage.getItem('gamification_LeadNo');

      if (!existingLeadNo) {
        const response = await submitToLMS({
          name: trimmedName,
          mobile_no: mobile,
          score: score,
          summary_dtls: 'Tightrope Protection Lead Submission',
        });

        if (response.success && response.data?.LeadNo) {
          sessionStorage.setItem('tightropeLeadNo', response.data.LeadNo);
          sessionStorage.setItem('gamification_LeadNo', response.data.LeadNo);
        }
      }

      onSubmit({ name: trimmedName, mobile });
    } catch (err) {
      console.error('[Details] lead submission failed:', err);
      onSubmit({ name: trimmedName, mobile });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="tp-screen screen-scroll flex flex-col justify-between"
      style={{
        padding: 'var(--s8) var(--s6) var(--s6)',
        background:
          'radial-gradient(120% 80% at 50% 0%, #0A2450 0%, #04122B 55%, #030913 100%)',
      }}
    >
      {/* ── Header ── */}
      <div className="rise text-center">
        <div
          className="mx-auto mb-4 flex items-center justify-center"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'rgba(242,101,34,0.14)',
            border: '1px solid rgba(242,101,34,0.42)',
          }}
        >
          <PoleIcon size={26} color="#F26522" />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>
          Lock in your score
        </h1>
        <p
          style={{
            marginTop: 6,
            fontSize: 12.5,
            fontWeight: 600,
            lineHeight: 1.5,
            color: 'var(--tp-text-2)',
            maxWidth: 280,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}
        >
          Two details and your result is saved.
        </p>
      </div>

      {/* ── Glass form ── */}
      <form
        onSubmit={handleFormSubmit}
        className="tp-glass rise my-auto"
        style={{ padding: 'var(--s5)', marginTop: 'var(--s6)', marginBottom: 'var(--s6)' }}
      >
        <div style={{ marginBottom: 'var(--s4)' }}>
          <label htmlFor="tp-name" style={labelStyle}>
            Your Name
          </label>
          <input
            id="tp-name"
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter your full name"
            disabled={isSubmitting}
            className="tp-field"
          />
          {nameError && <p style={errStyle}>{nameError}</p>}
        </div>

        <div>
          <label htmlFor="tp-mobile" style={labelStyle}>
            Mobile Number
          </label>
          <div className="relative">
            <span
              style={{
                position: 'absolute',
                left: 16,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                fontWeight: 800,
                color: 'var(--tp-text-3)',
                pointerEvents: 'none',
              }}
            >
              +91
            </span>
            <input
              id="tp-mobile"
              type="tel"
              inputMode="numeric"
              value={mobile}
              onChange={handleMobileChange}
              placeholder="9876543210"
              disabled={isSubmitting}
              className="tp-field"
              style={{ paddingLeft: 54 }}
            />
          </div>
          {mobileError && <p style={errStyle}>{mobileError}</p>}
        </div>

        {/* Consent */}
        <div style={{ marginTop: 'var(--s5)' }}>
          <label className="flex cursor-pointer items-start" style={{ gap: 10 }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setConsentError('');
              }}
              disabled={isSubmitting}
              style={{
                marginTop: 2,
                width: 18,
                height: 18,
                accentColor: '#F26522',
                flexShrink: 0,
                cursor: 'pointer',
              }}
            />
            <span style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--tp-text-3)' }}>
              I accept the{' '}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setShowTCModal(true);
                }}
                style={{
                  display: 'inline',
                  background: 'none',
                  border: 'none',
                  padding: 0,
                  font: 'inherit',
                  fontWeight: 900,
                  color: '#F26522',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                }}
              >
                Terms &amp; Conditions
              </button>{' '}
              and authorize Bajaj Life Insurance to contact me.
            </span>
          </label>
          {consentError && <p style={errStyle}>{consentError}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-press tp-btn tp-btn-rope"
          style={{ marginTop: 'var(--s5)', opacity: isSubmitting ? 0.7 : 1 }}
        >
          {isSubmitting ? (
            <>
              <svg
                className="tp-spin"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                <path
                  d="M21 12a9 9 0 0 0-9-9"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
              Saving
            </>
          ) : (
            'Get Protected'
          )}
        </button>
      </form>

      {/* ── Trust footer ── */}
      <div
        className="flex items-center justify-center"
        style={{ gap: 6, fontSize: 10, fontWeight: 700, color: 'var(--tp-text-3)' }}
      >
        <LockIcon size={13} />
        <span>Secure SSL · Trusted by millions of families</span>
      </div>

      {/* ── T&C ── */}
      {showTCModal && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(1,4,10,0.72)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            padding: 'var(--s6)',
          }}
        >
          <div
            className="pop tp-glass relative w-full"
            style={{ maxWidth: 340, padding: 'var(--s5)', background: 'rgba(7,27,62,0.9)' }}
          >
            <button
              onClick={() => setShowTCModal(false)}
              aria-label="Close"
              className="btn-press absolute flex items-center justify-center"
              style={{ top: 6, right: 6, width: 44, height: 44, background: 'transparent' }}
            >
              <CloseIcon size={18} />
            </button>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: '0.18em',
                textTransform: 'uppercase',
                color: '#F26522',
                marginBottom: 'var(--s3)',
              }}
            >
              Terms &amp; Conditions
            </h3>
            <p
              style={{
                fontSize: 11.5,
                lineHeight: 1.6,
                color: 'var(--tp-text-2)',
                maxHeight: 180,
                overflowY: 'auto',
                paddingRight: 6,
              }}
            >
              I hereby authorize Bajaj Life Insurance to call me on the contact number made
              available by me on the website with a specific request to call back. I further
              declare that, irrespective of my contact number being registered on National
              Customer Preference Register (NCPR) or on National Do Not Call Registry (NDNC), any
              call made, SMS or WhatsApp sent in response to my request shall not be construed as
              an Unsolicited Commercial Communication even though the contact number may be
              registered on DNC.
            </p>
            <button
              onClick={() => setShowTCModal(false)}
              className="btn-press tp-btn tp-btn-sm tp-btn-ghost"
              style={{ marginTop: 'var(--s4)' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnterDetailsScreen;
