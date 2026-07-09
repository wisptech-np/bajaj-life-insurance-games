// SlotBookingModal — books a callback slot via updateLeadNew (or submitToLMS fallback).
// Logic copied from life-goals-bubble-shooter/src/SlotBookingModal.jsx; restyled for Guardian Archer.
import React, { useEffect, useMemo, useState } from 'react';
import { submitToLMS, updateLeadNew, LEAD_NO_KEY } from '../services/api';
import { BookedDetails } from '../types';

const TIME_SLOTS = [
  '9:00 AM - 10:00 AM',
  '10:00 AM - 11:00 AM',
  '11:00 AM - 12:00 PM',
  '12:00 PM - 1:00 PM',
  '1:00 PM - 2:00 PM',
  '2:00 PM - 3:00 PM',
  '3:00 PM - 4:00 PM',
  '4:00 PM - 5:00 PM',
  '5:00 PM - 6:00 PM',
  '6:00 PM - 7:00 PM',
  '7:00 PM - 8:00 PM',
  '8:00 PM - 9:00 PM',
];

interface Props {
  initialName?: string;
  initialMobile?: string;
  score?: number;
  onConfirmed: (details: BookedDetails) => void;
  onClose?: () => void;
}

interface Errors {
  name?: string;
  mobile?: string;
  date?: string;
  time?: string;
  terms?: string;
}

function CalendarIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="rgba(255,255,255,0.18)" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

export default function SlotBookingModal({ initialName, initialMobile, score, onConfirmed, onClose }: Props) {
  const [name, setName] = useState(initialName || sessionStorage.getItem('lastSubmittedName') || '');
  const [mobile, setMobile] = useState(initialMobile || sessionStorage.getItem('lastSubmittedPhone') || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [terms, setTerms] = useState(true);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const { minDate, maxDate } = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const max = thirtyDaysFromNow.toISOString().split('T')[0];
    return { minDate: todayStr, maxDate: max };
  }, [todayStr]);

  const filteredTimeSlots = useMemo(() => {
    const isToday = date === todayStr;
    if (!isToday) return TIME_SLOTS;

    return TIME_SLOTS.filter((slot) => {
      const [startTime] = slot.split(' - ');
      const slotHour = parseInt(startTime.split(':')[0], 10);
      const isPM = startTime.includes('PM');
      const normalizedHour = isPM ? (slotHour === 12 ? 12 : slotHour + 12) : slotHour === 12 ? 0 : slotHour;
      return normalizedHour > new Date().getHours();
    });
  }, [date, todayStr]);

  useEffect(() => {
    if (time && date === todayStr) {
      const exists = filteredTimeSlots.includes(time);
      if (!exists) setTime('');
    }
  }, [date, todayStr, filteredTimeSlots, time]);

  const validate = () => {
    const errs: Errors = {};
    if (!name.trim()) {
      errs.name = 'Name is required';
    } else if (!/^[A-Za-z\s]+$/.test(name.trim())) {
      errs.name = 'Letters only';
    }

    if (!mobile) {
      errs.mobile = 'Mobile is required';
    } else if (!/^[6-9]\d{9}$/.test(mobile)) {
      errs.mobile = 'Invalid 10-digit number (starts 6-9)';
    }

    if (!date) errs.date = 'Select a date';
    if (!time) errs.time = 'Select a slot';
    if (!terms) errs.terms = 'Please agree to Terms and Conditions';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    try {
      const leadNo = sessionStorage.getItem(LEAD_NO_KEY);
      const remarks = `Guardian Archer Slot Booking | Score: ${score ?? 0}`;
      if (leadNo) {
        await updateLeadNew(leadNo, { name: name.trim(), mobile, date, time, remarks });
      } else {
        // Fallback: post a fresh lead with appointment hints in summary.
        await submitToLMS({
          name: name.trim(),
          mobile,
          score,
          summaryDtls: `${remarks} | ${date} ${time}`,
        });
      }
      onConfirmed({ name: name.trim(), mobile, date, time });
    } catch (err) {
      console.error(err);
      onConfirmed({ name: name.trim(), mobile, date, time, error: (err as Error).message });
    } finally {
      setSubmitting(false);
    }
  };

  const firstError = errors.name || errors.mobile || errors.date || errors.time || errors.terms || '';

  const inputCls =
    'w-full bg-[#051736] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-blue-300/30 focus:border-[#00AEEF] focus:outline-none transition-all';

  return (
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-5 animate-fade-in">
      <div className="relative w-full max-w-[360px] bg-[#061939]/97 border border-white/15 rounded-[1.5rem] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.6)] pop">
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-blue-300/50 hover:text-white"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        )}

        <div className="flex flex-col items-center text-center mb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0D9488] to-[#28A745] flex items-center justify-center mb-2 shadow-lg">
            <CalendarIcon />
          </div>
          <h3 className="text-base font-black text-white">Book a slot</h3>
          <p className="text-[10px] text-blue-200/60 mt-0.5">A Bajaj Life advisor will call you back</p>
        </div>

        <form onSubmit={onSubmit} noValidate className="space-y-3">
          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-blue-200 block">Full Name</label>
            <input
              type="text"
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-blue-200 block">Mobile Number</label>
            <div className="relative">
              <span className="absolute left-4 top-2/4 -translate-y-1/2 text-xs font-bold text-blue-300/40">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile"
                autoComplete="tel-national"
                value={mobile}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setMobile(v);
                  if (errors.mobile) setErrors({ ...errors, mobile: '' });
                }}
                className={`${inputCls} pl-12`}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-blue-200 block">Date</label>
            <input
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors({ ...errors, date: '' });
              }}
              className={inputCls}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] font-black uppercase tracking-wider text-blue-200 block">Time Slot</label>
            <select
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                if (errors.time) setErrors({ ...errors, time: '' });
              }}
              className={inputCls}
              style={{ cursor: 'pointer', color: time ? '#ffffff' : 'rgba(255,255,255,0.45)' }}
            >
              <option value="" disabled hidden style={{ backgroundColor: '#0B1221', color: '#ffffff' }}>
                Select Time Slot
              </option>
              {filteredTimeSlots.map((t) => (
                <option key={t} value={t} style={{ backgroundColor: '#0B1221', color: '#ffffff' }}>
                  {t.replace(' - ', ' – ')}
                </option>
              ))}
              {date === todayStr && filteredTimeSlots.length === 0 && (
                <option disabled style={{ backgroundColor: '#0B1221', color: '#9CA3AF', fontStyle: 'italic' }}>
                  No slots available for today
                </option>
              )}
            </select>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                if (errors.terms) setErrors({ ...errors, terms: '' });
              }}
              className="mt-0.5 w-4 h-4 rounded border-white/25 bg-[#051736] cursor-pointer accent-[#00AEEF]"
            />
            <span className="text-[10px] text-blue-200/60 leading-relaxed select-none">
              I agree to the{' '}
              <a
                href="https://www.bajajallianzlife.com/privacy-policy.html"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FACC15] underline font-bold"
              >
                T&amp;C and Privacy Policy
              </a>
              .
            </span>
          </label>

          {firstError && <p className="text-[10px] font-bold text-red-400 text-center">{firstError}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="btn-press w-full rounded-full py-3 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #28A745 100%)' }}
          >
            {submitting ? 'Confirming…' : 'Confirm booking'}
          </button>
        </form>
      </div>
    </div>
  );
}
