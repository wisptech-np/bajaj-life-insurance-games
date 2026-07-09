import React, { useState } from 'react';
import { PlayerInfo } from '../types';
import { submitToLMS } from '../services/api';

interface Props {
  score: number;
  onSubmit: (info: PlayerInfo) => void;
}

const EnterDetailsScreen: React.FC<Props> = ({ score, onSubmit }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [agreed, setAgreed] = useState(true);
  
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [consentError, setConsentError] = useState('');
  
  const [showTCModal, setShowTCModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-filter mobile input to digits only, max length 10
  const handleMobileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const sanitized = rawVal.replace(/\D/g, '').slice(0, 10);
    setMobile(sanitized);
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
    const trimmedEmail = email.trim();
    
    // 1. Name validation
    if (!trimmedName) {
      setNameError('Please enter your name');
      valid = false;
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      setNameError('Name should contain only alphabets');
      valid = false;
    }

    // 2. Mobile validation
    if (!/^[6-9]\d{9}$/.test(mobile)) {
      setMobileError('Enter a valid 10-digit mobile number');
      valid = false;
    }

    // 3. Email validation
    if (!trimmedEmail) {
      setEmailError('Please enter your email');
      valid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setEmailError('Enter a valid email address');
      valid = false;
    }

    // 4. Consent validation
    if (!agreed) {
      setConsentError('Please accept the T&C to continue');
      valid = false;
    } else {
      setConsentError('');
    }

    if (!valid) return;

    setIsSubmitting(true);
    try {
      // Check if we have an existing LeadNo in sessionStorage
      const existingLeadNo = sessionStorage.getItem('tightropeLeadNo') || 
                             sessionStorage.getItem('gamification_LeadNo');
                             
      if (!existingLeadNo) {
        // Submit details directly to WhatsApp Inhouse API
        const response = await submitToLMS({
          name: trimmedName,
          mobile_no: mobile,
          email_id: trimmedEmail,
          score: score,
          summary_dtls: 'Tightrope Protection Lead Submission'
        });
        
        if (response.success && response.data?.LeadNo) {
          // Store generated lead number in session
          sessionStorage.setItem('tightropeLeadNo', response.data.LeadNo);
          sessionStorage.setItem('gamification_LeadNo', response.data.LeadNo);
        }
      }
      
      // Proceed to the result screen
      onSubmit({ name: trimmedName, mobile, email: trimmedEmail });
    } catch (err) {
      console.error('[Details] lead submission failed:', err);
      // Proceed anyway to not block user experience
      onSubmit({ name: trimmedName, mobile, email: trimmedEmail });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="screen-scroll flex flex-col justify-between px-6 py-8" style={{ background: 'linear-gradient(185deg, #030F26 0%, #08224F 50%, #030F26 100%)' }}>
      
      {/* Upper header */}
      <div className="text-center pt-4">
        <h2 className="text-[12px] font-black uppercase tracking-[0.2em] text-[#00AEEF]">Save & Protect</h2>
        <h1 className="text-xl font-bold mt-1 text-white">Get Protected Today</h1>
        <p className="text-xs text-blue-200/60 mt-1 max-w-[280px] mx-auto">
          Enter your details below to save your high score and unlock personalized protection benefits.
        </p>
      </div>

      {/* Glassmorphic Form Card */}
      <form onSubmit={handleFormSubmit} className="my-auto py-6 space-y-4 relative z-10 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
        
        {/* Name input */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={handleNameChange}
            placeholder="Enter your full name"
            disabled={isSubmitting}
            className="w-full bg-[#051736] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-blue-300/30 focus:border-[#00AEEF] focus:outline-none transition-all"
          />
          {nameError && (
            <p className="text-[10px] font-bold text-red-400 mt-1">{nameError}</p>
          )}
        </div>

        {/* Mobile Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">Mobile Number</label>
          <div className="relative">
            <span className="absolute left-4 top-2/4 -translate-y-1/2 text-xs font-bold text-blue-300/40">+91</span>
            <input
              type="tel"
              value={mobile}
              onChange={handleMobileChange}
              placeholder="9876543210"
              disabled={isSubmitting}
              className="w-full bg-[#051736] border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder-blue-300/30 focus:border-[#00AEEF] focus:outline-none transition-all"
            />
          </div>
          {mobileError && (
            <p className="text-[10px] font-bold text-red-400 mt-1">{mobileError}</p>
          )}
        </div>

        {/* Email Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-black uppercase tracking-wider text-blue-200 block">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
            placeholder="name@example.com"
            disabled={isSubmitting}
            className="w-full bg-[#051736] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-blue-300/30 focus:border-[#00AEEF] focus:outline-none transition-all"
          />
          {emailError && (
            <p className="text-[10px] font-bold text-red-400 mt-1">{emailError}</p>
          )}
        </div>

        {/* Consent Checkbox */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setConsentError('');
              }}
              disabled={isSubmitting}
              className="mt-0.5 rounded border-white/10 bg-[#051736] text-[#00AEEF] focus:ring-0 w-4 h-4 cursor-pointer"
            />
            <span className="text-[10px] text-blue-200/60 leading-relaxed">
              I accept the{' '}
              <button 
                type="button" 
                onClick={(e) => { e.stopPropagation(); setShowTCModal(true); }}
                className="text-[#00AEEF] hover:underline font-bold inline"
              >
                Terms & Conditions
              </button>{' '}
              and authorize Bajaj Life Insurance to contact me.
            </span>
          </label>
          {consentError && (
            <p className="text-[10px] font-bold text-red-400 mt-1">{consentError}</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-press w-full rounded-xl py-4 text-sm font-black uppercase tracking-wider text-white shadow-[0_4px_16px_rgba(0,174,239,0.35)] transition-all flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg, #00AEEF 0%, #0077B6 100%)' }}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Submitting...
              </>
            ) : (
              'Get Protected Today'
            )}
          </button>
        </div>
      </form>

      {/* Safety Logo disclaimer footer */}
      <div className="text-center text-[8px] text-blue-300/40">
        🛡️ Secure SSL Encryption • Trusted by millions of families
      </div>

      {/* T&C Text Modal */}
      {showTCModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
          <div className="bg-[#061939] border border-white/10 rounded-2xl p-5 max-w-[340px] text-center shadow-2xl flex flex-col justify-between">
            <h3 className="text-xs font-black text-[#00AEEF] uppercase tracking-wider mb-2">Terms & Conditions</h3>
            <p className="text-[10px] text-blue-100 leading-relaxed text-left overflow-y-auto max-h-[160px] pr-2">
              "I hereby authorize Bajaj Life Insurance to call me on the contact number made available by me on the website with a specific request to call back. I further declare that, irrespective of my contact number being registered on National Customer Preference Register (NCPR) or on National Do Not Call Registry (NDNC), any call made, SMS or WhatsApp sent in response to my request shall not be construed as an Unsolicited Commercial Communication even though the contact number may be registered on DNC."
            </p>
            <button
              onClick={() => setShowTCModal(false)}
              className="btn-press mt-4 w-full rounded-xl bg-[#00AEEF] py-2 text-xs font-bold text-white uppercase tracking-wider"
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
