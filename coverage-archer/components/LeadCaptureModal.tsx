// LeadCaptureModal — collects name + mobile (+optional email) and posts to LMS.
// Logic copied from life-goals-bubble-shooter/src/LeadCaptureModal.jsx; restyled for Guardian Archer.
import React, { useState } from 'react';
import { submitToLMS, extractLeadNo, LEAD_NO_KEY } from '../services/api';
import { LeadDetails } from '../types';

const NAME_RE = /^[A-Za-z\s]+$/;
const MOBILE_RE = /^[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  score?: number;
  onSubmitted: (details: LeadDetails) => void;
}

interface Errors {
  name?: string;
  mobile?: string;
  email?: string;
  terms?: string;
}

export default function LeadCaptureModal({ score, onSubmitted }: Props) {
  const [name, setName] = useState(sessionStorage.getItem('lastSubmittedName') || '');
  const [mobile, setMobile] = useState(sessionStorage.getItem('lastSubmittedPhone') || '');
  const [email, setEmail] = useState(sessionStorage.getItem('lastSubmittedEmail') || '');
  const [terms, setTerms] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);

  const validate = () => {
    const errs: Errors = {};
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

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const result = await submitToLMS({
        name: name.trim(),
        mobile,
        email: email.trim(),
        score,
        summaryDtls: 'Guardian Archer - Post Game Lead',
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

  const inputCls = (hasError?: string) =>
    `w-full bg-[#051736] border rounded-xl px-4 py-3 text-sm text-white placeholder-blue-300/30 focus:border-[#00AEEF] focus:outline-none transition-all ${
      hasError ? 'border-red-400/60' : 'border-white/10'
    }`;

  return (
    <>
      <div className="absolute inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-5 animate-fade-in">
        <div className="relative w-full max-w-[360px] bg-[#061939]/97 border border-white/15 rounded-[1.5rem] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] pop">
          <div className="text-center mb-5">
            <h2 className="text-lg font-black text-white">Enter Details</h2>
            <p className="text-[11px] text-blue-200/60 mt-1">To see your results</p>
          </div>

          <form onSubmit={onSubmit} noValidate className="space-y-3.5">
            {/* Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">Your Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value.replace(/[^a-zA-Z\s]/g, ''));
                  if (errors.name) setErrors({ ...errors, name: '' });
                }}
                className={inputCls(errors.name)}
              />
              {errors.name && <p className="text-[10px] font-bold text-red-400">{errors.name}</p>}
            </div>

            {/* Mobile */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">Mobile Number</label>
              <div className="relative">
                <span className="absolute left-4 top-2/4 -translate-y-1/2 text-xs font-bold text-blue-300/40">+91</span>
                <input
                  type="tel"
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="9876543210"
                  value={mobile}
                  onChange={(e) => {
                    setMobile(e.target.value.replace(/\D/g, ''));
                    if (errors.mobile) setErrors({ ...errors, mobile: '' });
                  }}
                  className={`${inputCls(errors.mobile)} pl-12`}
                />
              </div>
              {errors.mobile && <p className="text-[10px] font-bold text-red-400">{errors.mobile}</p>}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">Email Address (Optional)</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (errors.email) setErrors({ ...errors, email: '' });
                }}
                className={inputCls(errors.email)}
              />
              {errors.email && <p className="text-[10px] font-bold text-red-400">{errors.email}</p>}
            </div>

            {/* Consent */}
            <div
              className="flex items-start gap-2.5 cursor-pointer pt-1"
              onClick={() => {
                const newVal = !terms;
                setTerms(newVal);
                if (errors.terms && newVal) {
                  setErrors((prev) => {
                    const next = { ...prev };
                    delete next.terms;
                    return next;
                  });
                }
              }}
            >
              <div
                className={`mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors shrink-0 ${
                  terms ? 'bg-[#00AEEF] border-[#00AEEF]' : errors.terms ? 'border-red-400/70 bg-[#051736]' : 'border-white/25 bg-[#051736]'
                }`}
              >
                {terms && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                )}
              </div>
              <p className="text-[10px] text-blue-200/60 leading-relaxed select-none">
                I agree and consent to the{' '}
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setTermsOpen(true);
                  }}
                  className="text-[#00AEEF] font-bold underline"
                >
                  T&amp;C and Privacy Policy
                </span>
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="btn-press w-full rounded-full py-3.5 text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(0,174,239,0.35)] transition-all disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #00AEEF 0%, #003DA6 100%)' }}
            >
              {submitting ? 'LOADING…' : 'See Results!'}
            </button>

            {errors.terms && !terms && (
              <p className="text-[10px] font-bold text-red-400 text-center">{errors.terms}</p>
            )}
          </form>
        </div>
      </div>

      {/* Terms overlay */}
      {termsOpen && (
        <div className="absolute inset-0 z-[130] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setTermsOpen(false)} />
          <div className="relative bg-[#061939] border border-white/10 rounded-2xl p-5 max-w-[340px] w-full shadow-2xl">
            <button
              onClick={() => setTermsOpen(false)}
              className="absolute top-3 right-3 text-blue-300/50 hover:text-white"
              aria-label="Close Terms"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <h3 className="text-xs font-black text-[#00AEEF] uppercase tracking-wider mb-3">Terms &amp; Conditions</h3>
            <div className="text-[10px] text-blue-100 leading-relaxed text-left overflow-y-auto max-h-[200px] pr-2 space-y-2">
              <p>
                I hereby authorize Bajaj Life Insurance Limited. to call me on the contact number made available by me
                on the website with a specific request to call back.
              </p>
              <p>
                I further declare that, irrespective of my contact number being registered on National Customer
                Preference Register (NCPR) or on National Do Not Call Registry (NDNC), any call made, SMS or WhatsApp
                sent in response to my request shall not be construed as an Unsolicited Commercial Communication even
                though the content of the call may be for the purposes of explaining various insurance products and
                services or solicitation and procurement of insurance business.
              </p>
              <p>
                Please refer to Bajaj Life{' '}
                <a
                  href="https://www.bajajallianzlife.com/privacy-policy.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#00AEEF] underline font-bold"
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
            <button
              onClick={() => setTermsOpen(false)}
              className="btn-press mt-4 w-full rounded-full bg-[#00AEEF] py-2.5 text-xs font-bold text-white uppercase tracking-wider"
            >
              I Agree
            </button>
          </div>
        </div>
      )}
    </>
  );
}
