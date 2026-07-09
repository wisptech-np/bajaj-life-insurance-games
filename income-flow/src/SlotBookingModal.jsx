// SlotBookingModal.jsx — books a callback slot via updateLeadNew (or submitToLMS fallback).
// Restyled to match the stackibility-stack .ls-card form pattern.
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { submitToLMS, updateLeadNew, LEAD_NO_KEY } from './api.js';

// Time slots from Snake-Life
const TIME_SLOTS = [
  "9:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
  "6:00 PM - 7:00 PM",
  "7:00 PM - 8:00 PM",
  "8:00 PM - 9:00 PM"
];

function CalendarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="5" width="18" height="16" rx="2" fill="rgba(255,255,255,0.18)" />
      <path d="M3 9h18M8 3v4M16 3v4" />
    </svg>
  );
}

export default function SlotBookingModal({ initialName, initialMobile, score, onConfirmed }) {
  const [name, setName] = useState(initialName || sessionStorage.getItem('lastSubmittedName') || '');
  const [mobile, setMobile] = useState(initialMobile || sessionStorage.getItem('lastSubmittedPhone') || '');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [terms, setTerms] = useState(true);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // minDate and maxDate matching Snake-Life:
  // minDate: today, maxDate: 30 days from now
  const todayStr = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  const { minDate, maxDate } = useMemo(() => {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const max = thirtyDaysFromNow.toISOString().split("T")[0];
    return { minDate: todayStr, maxDate: max };
  }, [todayStr]);

  // Filter time slots based on current time if today is selected, matching Snake-Life:
  const filteredTimeSlots = useMemo(() => {
    const isToday = date === todayStr;
    if (!isToday) return TIME_SLOTS;

    return TIME_SLOTS.filter(slot => {
      const [startTime] = slot.split(' - ');
      const slotHour = parseInt(startTime.split(':')[0], 10);
      const isPM = startTime.includes('PM');
      // Normalize to 24 hour system:
      const normalizedHour = isPM ? (slotHour === 12 ? 12 : slotHour + 12) : (slotHour === 12 ? 0 : slotHour);
      return normalizedHour > new Date().getHours();
    });
  }, [date, todayStr]);

  // Reset selected time slot if it is no longer available when selecting date
  React.useEffect(() => {
    if (time && date === todayStr) {
      const exists = filteredTimeSlots.includes(time);
      if (!exists) setTime('');
    }
  }, [date, todayStr, filteredTimeSlots, time]);

  const validate = () => {
    const errs = {};
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

    if (!date) {
      errs.date = 'Select a date';
    }

    if (!time) {
      errs.time = 'Select a slot';
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
      const leadNo = sessionStorage.getItem(LEAD_NO_KEY);
      const remarks = `Income Flow Slot Booking | Score: ${score ?? 0}`;
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
      onConfirmed({ name: name.trim(), mobile, date, time, error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const firstError = errors.name || errors.mobile || errors.date || errors.time || errors.terms || '';

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="modal-overlay">
      <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', damping: 22, stiffness: 200 }} className="ls-card" style={{ position: 'relative' }}>
        <div className="ls-card-icon" aria-hidden="true">
          <CalendarIcon />
        </div>
        <div className="ls-card-title">Book a slot</div>
        <div className="ls-card-sub">A Bajaj Life advisor will call you back</div>

        <form className="ls-form" onSubmit={onSubmit} noValidate>
          <label className="ls-field">
            <span className="ls-field-label">Full Name</span>
            <input
              className="ls-input"
              type="text"
              placeholder="e.g. Priya Sharma"
              autoComplete="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
            />
          </label>

          <label className="ls-field">
            <span className="ls-field-label">Mobile Number</span>
            <div className="ls-mobile-row">
              <span className="ls-mobile-prefix">+91</span>
              <input
                className="ls-input ls-input-mobile"
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
              />
            </div>
          </label>

          <label className="ls-field">
            <span className="ls-field-label">Date</span>
            <input
              className="ls-input"
              type="date"
              min={minDate}
              max={maxDate}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors({ ...errors, date: '' });
              }}
            />
          </label>

          <div className="ls-field">
            <span className="ls-field-label">Time Slot</span>
            <select
              className="ls-input"
              value={time}
              onChange={(e) => {
                setTime(e.target.value);
                if (errors.time) setErrors({ ...errors, time: '' });
              }}
              style={{
                cursor: 'pointer',
                color: time ? '#ffffff' : 'rgba(255, 255, 255, 0.45)',
              }}
            >
              <option value="" disabled hidden style={{ backgroundColor: '#0B1221', color: '#ffffff' }}>Select Time Slot</option>
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

          <label className="ls-tc">
            <input
              type="checkbox"
              checked={terms}
              onChange={(e) => {
                setTerms(e.target.checked);
                if (errors.terms) setErrors({ ...errors, terms: '' });
              }}
            />
            <span>
              I agree to the{' '}
              <a
                href="https://www.bajajallianzlife.com/privacy-policy.html"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#FFD37A', textDecoration: 'underline' }}
              >
                T&amp;C and Privacy Policy
              </a>
              .
            </span>
          </label>

          <div className="ls-error">{firstError}</div>

          <button
            type="submit"
            className="ls-btn ls-btn-primary ls-form-cta"
            disabled={submitting}
          >
            {submitting ? 'Confirming…' : 'Confirm booking'}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
