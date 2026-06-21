import React, { useState } from 'react';
import { PlayerInfo } from '../types';
import TCModal from './TCModal';
import { submitToLMS } from '../services/api';
import { BLUE } from '../constants';

interface Props {
  onSubmit: (info: PlayerInfo) => void;
  score?: number;
}

const EnterDetailsScreen: React.FC<Props> = ({ onSubmit, score }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [showTC, setShowTC] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate() {
    const e: Record<string, string> = {};
    if (!name.trim()) e.name = 'Please enter your name';
    else if (!/^[A-Za-z\s]+$/.test(name.trim())) e.name = 'Name should contain only alphabets';
    if (!/^[6-9]\d{9}$/.test(mobile)) e.mobile = 'Enter a valid 10-digit mobile number';
    if (!agreed) e.agreed = 'Please accept the T&C to continue';
    return e;
  }

  async function handleSubmit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await submitToLMS({
        name: name.trim(),
        mobile_no: mobile,
        score: score,
        summary_dtls: 'Wealth Waters Lead'
      });
      if (res.success) {
        const leadNo = res.data?.leadNo || res.data?.LeadNo;
        if (leadNo) sessionStorage.setItem('wealthWatersLeadNo', leadNo);
        onSubmit({ name: name.trim(), mobile });
      } else {
        setErrors({ submit: res.error || 'Failed to submit details. Please try again.' });
      }
    } catch (err: any) {
      setErrors({ submit: err.message || 'Error occurred' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="screen-scroll flex min-h-full items-center justify-center px-6 py-10"
      style={{ background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)' }}
    >
      {showTC && <TCModal onClose={() => setShowTC(false)} />}

      <div
        className="w-full max-w-sm rounded-3xl bg-white p-8 border border-white/5 shadow-2xl pop"
        style={{ borderTop: `6px solid ${BLUE}` }}
      >
        <h2 className="text-center text-2xl font-black tracking-tight text-gray-900 mb-1 font-sans">
          SECURE DETAILS
        </h2>
        <p className="text-center text-xs text-gray-400 mb-7">Enter details to see your Wealth protection card</p>

        <div className="mb-5">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            YOUR NAME
          </label>
          <input
            type="text"
            value={name}
            onChange={e => { setName(e.target.value); setErrors({}); }}
            placeholder="Full Name"
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none"
            style={{
              background: errors.name ? '#FFF5F5' : '#F1F5F9',
              border: `2px solid ${errors.name ? '#EF4444' : 'transparent'}`,
            }}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.name}</p>}
        </div>

        <div className="mb-5">
          <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
            MOBILE NUMBER
          </label>
          <input
            type="tel"
            inputMode="numeric"
            value={mobile}
            onChange={e => { setMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors({}); }}
            placeholder="9876543210"
            className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-gray-800 focus:outline-none"
            style={{
              background: errors.mobile ? '#FFF5F5' : '#F1F5F9',
              border: `2px solid ${errors.mobile ? '#EF4444' : 'transparent'}`,
            }}
          />
          {errors.mobile && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.mobile}</p>}
        </div>

        <div className="mb-7">
          <label className="flex items-start gap-3 cursor-pointer">
            <div
              className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-md flex items-center justify-center transition-all animate-none"
              style={{
                background: agreed ? BLUE : 'white',
                border: `2px solid ${agreed ? BLUE : '#CBD5E1'}`,
              }}
              onClick={() => { setAgreed(a => !a); setErrors({}); }}
            >
              {agreed && (
                <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </div>
            <span className="text-xs text-gray-500 leading-relaxed">
              I agree and consent to the{' '}
              <button
                type="button"
                className="font-bold underline text-blue-800"
                onClick={e => { e.preventDefault(); setShowTC(true); }}
              >
                T&amp;C and Privacy Policy
              </button>
            </span>
          </label>
          {errors.agreed && <p className="text-red-500 text-xs mt-1 font-semibold">{errors.agreed}</p>}
        </div>

        {errors.submit && <p className="text-red-500 text-xs font-semibold text-center mt-2">{errors.submit}</p>}
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3.5 rounded-2xl font-black text-white text-sm tracking-wider btn-press disabled:opacity-50"
          style={{ background: BLUE, boxShadow: `0 4px 16px rgba(0,61,166,0.3)` }}
        >
          {isSubmitting ? 'LOADING...' : 'SEE RESULTS!'}
        </button>
      </div>
    </div>
  );
};

export default EnterDetailsScreen;
