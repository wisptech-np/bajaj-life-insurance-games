// LeadCaptureModal.jsx — collects name + mobile and posts to LMS.
// Copied from the gold-standard bubble shooter; only titles/summary text adjusted.
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { submitToLMS, extractLeadNo, LEAD_NO_KEY } from './api.js';

const NAME_RE = /^[A-Za-z\s]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LeadCaptureModal({ score, onSubmitted }) {
  const [name, setName] = useState(sessionStorage.getItem('lastSubmittedName') || '');
  const [mobile, setMobile] = useState(sessionStorage.getItem('lastSubmittedPhone') || '');
  const [email, setEmail] = useState(sessionStorage.getItem('lastSubmittedEmail') || '');
  const [terms, setTerms] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [termsOpen, setTermsOpen] = useState(false);

  const validate = () => {
    const errs = {};
    if (!name.trim()) {
      errs.name = 'Name is required';
    } else if (!NAME_RE.test(name.trim())) {
      errs.name = 'Letters only';
    }

    if (!mobile) {
      errs.mobile = 'Mobile is required';
    } else if (!MOBILE_RE.test(mobile)) {
      errs.mobile = 'Invalid 10-digit number';
    }

    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      errs.email = 'Invalid email address';
    }

    if (!terms) {
      errs.terms = 'Please agree to Terms and Conditions';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await submitToLMS({
        name: name.trim(),
        mobile,
        email: email.trim(),
        score,
        summaryDtls: 'Portfolio Fit - Post Game Lead',
      });
      const leadNo = extractLeadNo(result);
      if (leadNo) sessionStorage.setItem(LEAD_NO_KEY, leadNo);
      sessionStorage.setItem('lastSubmittedName', name.trim());
      sessionStorage.setItem('lastSubmittedPhone', mobile);
      sessionStorage.setItem('lastSubmittedEmail', email.trim());
      onSubmitted({ name: name.trim(), mobile, email: email.trim(), leadNo });
    } catch (err) {
      console.error(err);
      onSubmitted({ name: name.trim(), mobile, email: email.trim(), leadNo: null });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="sl-lead-overlay">
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} className="sl-lead-card">
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <h2 className="sl-lead-title">
              Enter Details
            </h2>
            <p className="sl-lead-sub">
              To see your portfolio score
            </p>
          </div>

          <form onSubmit={onSubmit} noValidate className="sl-lead-form">
            {/* Name Field */}
            <div className="sl-lead-field">
              <label className="sl-lead-label">
                Your Name
              </label>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={`sl-lead-input ${errors.name ? 'has-error' : ''}`}
              />
              {errors.name && (
                <p className="sl-error-text">
                  {errors.name}
                </p>
              )}
            </div>

            {/* Mobile Field */}
            <div className="sl-lead-field">
              <label className="sl-lead-label">
                Mobile Number
              </label>
              <input
                type="tel"
                maxLength={10}
                placeholder="9876543210"
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value.replace(/\D/g, ''));
                  if (errors.mobile) setErrors({ ...errors, mobile: '' });
                }}
                className={`sl-lead-input ${errors.mobile ? 'has-error' : ''}`}
              />
              {errors.mobile && (
                <p className="sl-error-text">
                  {errors.mobile}
                </p>
              )}
            </div>

            {/* Email Field */}
            <div className="sl-lead-field">
              <label className="sl-lead-label">
                Email Address (Optional)
              </label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={`sl-lead-input ${errors.email ? 'has-error' : ''}`}
              />
              {errors.email && (
                <p className="sl-error-text">
                  {errors.email}
                </p>
              )}
            </div>

            {/* Consent Checkbox */}
            <div
              onClick={() => {
                const newVal = !terms;
                setTerms(newVal);
                if (errors.terms && newVal) {
                  setErrors(prev => {
                    const next = { ...prev };
                    delete next.terms;
                    return next;
                  });
                }
              }}
              className="sl-lead-checkbox-container"
            >
              <div className={`sl-lead-checkbox ${terms ? 'checked' : ''} ${errors.terms && !terms ? 'has-error' : ''}`}>
                {terms && <span className="sl-lead-checkbox-tick">✓</span>}
              </div>
              <p className="sl-lead-consent-text">
                I agree and consent to the{' '}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTermsOpen(true);
                  }}
                  className="sl-lead-consent-link"
                >
                  T&amp;C and Privacy Policy
                </span>
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="sl-lead-submit"
            >
              {submitting ? 'LOADING...' : 'See Results!'}
            </button>

            {errors.terms && !terms && (
              <p className="sl-error-text" style={{ textAlign: 'center', margin: '4px 0 0' }}>
                {errors.terms}
              </p>
            )}
          </form>
        </motion.div>
      </motion.div>

      {/* Terms Modal Overlay */}
      {termsOpen && (
        <div className="sl-terms-overlay">
          <div className="sl-terms-backdrop" onClick={() => setTermsOpen(false)} />
          <div className="sl-terms-card">
            <button
              onClick={() => setTermsOpen(false)}
              className="sl-terms-close"
              aria-label="Close Terms"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            <div style={{ marginBottom: 24 }}>
              <h2 className="sl-terms-title">
                Terms &amp; Conditions
              </h2>
            </div>

            <div className="sl-terms-content">
              <p>
                I hereby authorize Bajaj Life Insurance Limited. to call me on the contact number made available by me on the website with a specific request to call back.
              </p>
              <p>
                I further declare that, irrespective of my contact number being registered on National Customer Preference Register (NCPR) or on National Do Not Call Registry (NDNC), any call made, SMS or WhatsApp sent in response to my request shall not be construed as an Unsolicited Commercial Communication even though the content of the call may be for the purposes of explaining various insurance products and services or solicitation and procurement of insurance business.
              </p>
              <p>
                Please refer to Bajaj Life <a href="https://www.bajajallianzlife.com/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="sl-lead-consent-link">Privacy Policy</a>.
              </p>
            </div>

            <button
              onClick={() => setTermsOpen(false)}
              className="sl-terms-agree"
            >
              I AGREE
            </button>
          </div>
        </div>
      )}
    </>
  );
}
