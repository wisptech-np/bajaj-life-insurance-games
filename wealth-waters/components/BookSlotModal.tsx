import React, { useState } from 'react';
import { BLUE, BOOK_SLOT_TIMES } from '../constants';
import TCModal from './TCModal';

interface Props {
  name: string;
  mobile: string;
  onClose: () => void;
  onBook: (booking: { name: string; mobile: string; date: string; time: string }) => Promise<void>;
}

function parseSlotStartHour(slot: string): number {
  const match = slot.match(/^(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return 0;
  let h = parseInt(match[1], 10);
  const isPM = match[3].toUpperCase() === 'PM';
  if (isPM && h !== 12) h += 12;
  if (!isPM && h === 12) h = 0;
  return h;
}

function localDateStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const BookSlotModal: React.FC<Props> = ({ name, mobile, onClose, onBook }) => {
  const [bName, setBName] = useState(name);
  const [bMobile, setBMobile] = useState(mobile);
  const [date, setDate] = useState(() => localDateStr(new Date()));
  const [time, setTime] = useState('');
  const [agreed, setAgreed] = useState(true);
  const [showTC, setShowTC] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const now = new Date();
  const today = localDateStr(now);
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = localDateStr(maxDate);

  const isToday = date === today;
  const currentHour = now.getHours();

  const availableSlots = BOOK_SLOT_TIMES.filter(s => !isToday || parseSlotStartHour(s) > currentHour);
  const noSlotsToday = isToday && availableSlots.length === 0;

  function handleDateChange(val: string) {
    if (val < today) {
      setErrors({ date: 'Please select today or a future date' });
      return;
    }
    if (val > maxDateStr) {
      setErrors({ date: 'Date must be within 30 days' });
      return;
    }
    setDate(val);
    setTime('');
    setErrors({});
  }

  async function handleBook() {
    const e: Record<string, string> = {};
    if (!bName.trim()) e.name = 'Required';
    else if (!/^[A-Za-z\s]+$/.test(bName.trim())) e.name = 'Name should contain only alphabets';
    if (!/^[6-9]\d{9}$/.test(bMobile)) e.mobile = 'Invalid mobile';
    if (!date) e.date = 'Required';
    else if (date < today) e.date = 'Please select today or a future date';
    else if (date > maxDateStr) e.date = 'Date must be within 30 days';
    if (!noSlotsToday && !time) e.time = 'Required';
    if (noSlotsToday) e.time = 'No slots available for today';
    if (!agreed) e.agreed = 'Please accept T&C';
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }

    setIsSubmitting(true);
    try {
      await onBook({ name: bName, mobile: bMobile, date, time });
    } catch (err: any) {
      setErrors({ submit: err.message || 'Booking failed' });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center" style={{ background: 'rgba(0,0,0,0.72)' }}>
      {showTC && <TCModal onClose={() => setShowTC(false)} />}
      <div className="bg-white w-full max-w-sm rounded-t-3xl max-h-[92vh] overflow-y-auto pop">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-200"></div>
        </div>
        <div className="px-6 pb-8">
          <div className="flex justify-between items-start mb-5">
            <div>
              <h3 className="font-extrabold text-xl" style={{ color: BLUE }}>Book a Slot</h3>
              <p className="text-gray-500 text-xs mt-0.5">Our agent will help you secure your future.</p>
            </div>
            <button onClick={onClose} className="text-gray-300 text-3xl leading-none btn-press mt-1">&times;</button>
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">YOUR NAME</label>
            <input
              type="text"
              value={bName}
              onChange={e => { setBName(e.target.value); setErrors({}); }}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none"
              style={{ border: `2px solid ${errors.name ? '#EF4444' : '#E2E8F0'}`, background: '#F8FAFF' }}
            />
            {errors.name && <p className="text-red-500 text-xs mt-0.5">{errors.name}</p>}
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">MOBILE NUMBER</label>
            <input
              type="tel"
              inputMode="numeric"
              value={bMobile}
              onChange={e => { setBMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setErrors({}); }}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none"
              style={{ border: `2px solid ${errors.mobile ? '#EF4444' : '#E2E8F0'}`, background: '#F8FAFF' }}
            />
            {errors.mobile && <p className="text-red-500 text-xs mt-0.5">{errors.mobile}</p>}
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">PREFERRED DATE</label>
            <input
              type="date"
              value={date}
              min={today}
              max={maxDateStr}
              onChange={e => handleDateChange(e.target.value)}
              className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none"
              style={{ border: `2px solid ${errors.date ? '#EF4444' : '#E2E8F0'}`, background: '#F8FAFF' }}
            />
            {errors.date && <p className="text-red-500 text-xs mt-0.5">{errors.date}</p>}
          </div>

          <div className="mb-3">
            <label className="block text-[10px] font-extrabold text-gray-400 uppercase tracking-widest mb-1">PREFERRED TIME</label>
            {noSlotsToday ? (
              <div
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-400"
                style={{ border: `2px solid ${errors.time ? '#EF4444' : '#E2E8F0'}`, background: '#F8FAFF' }}
              >
                No slots available for today
              </div>
            ) : (
              <select
                value={time}
                onChange={e => { setTime(e.target.value); setErrors({}); }}
                className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-800 focus:outline-none bg-white"
                style={{ border: `2px solid ${errors.time ? '#EF4444' : '#E2E8F0'}` }}
              >
                <option value="">Select Slot</option>
                {availableSlots.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {errors.time && <p className="text-red-500 text-xs mt-0.5">{errors.time}</p>}
          </div>

          <div className="mb-5">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <div
                className="w-5 h-5 rounded-md flex-shrink-0 mt-0.5 flex items-center justify-center transition-all animate-none"
                style={{ background: agreed ? BLUE : 'white', border: `2px solid ${agreed ? BLUE : '#CBD5E1'}` }}
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
                  className="underline font-bold"
                  style={{ color: BLUE, display: 'inline' }}
                  onClick={e => { e.preventDefault(); setShowTC(true); }}
                >
                  T&amp;C and Privacy Policy
                </button>
              </span>
            </label>
            {errors.agreed && <p className="text-red-500 text-xs mt-1">{errors.agreed}</p>}
          </div>

          {errors.submit && <p className="text-red-500 text-xs font-semibold text-center mb-2">{errors.submit}</p>}
          <button
            onClick={handleBook}
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl font-extrabold text-white text-sm tracking-wide btn-press disabled:opacity-50"
            style={{ background: BLUE, boxShadow: `0 4px 16px rgba(0,61,166,0.35)` }}
          >
            {isSubmitting ? 'Booking...' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookSlotModal;
