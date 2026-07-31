import React, { useState, useEffect } from 'react';
import { updateLeadNew, submitToLMS } from '../services/api';
import { CloseIcon } from './Icons';

const fieldLabel: React.CSSProperties = {
  display: 'block',
  fontSize: 9.5,
  fontWeight: 900,
  letterSpacing: '0.16em',
  textTransform: 'uppercase',
  color: 'var(--tp-text-2)',
  marginBottom: 5,
};

const fieldError: React.CSSProperties = {
  fontSize: 10.5,
  fontWeight: 700,
  color: '#FF6B84',
  marginTop: 5,
};

interface Props {
  name: string;
  mobile: string;
  onClose: () => void;
  onBookSuccess: () => void;
}

const ALL_SLOTS = [
  "09:00 AM - 10:00 AM",
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 01:00 PM",
  "01:00 PM - 02:00 PM",
  "02:00 PM - 03:00 PM",
  "03:00 PM - 04:00 PM",
  "04:00 PM - 05:00 PM",
  "05:00 PM - 06:00 PM"
];

// Helper to parse start hour from a slot string, e.g., "09:00 AM - 10:00 AM" -> 9
// "12:00 PM - 01:00 PM" -> 12, "02:00 PM" -> 14
const parseSlotStartHour = (slot: string): number => {
  const timePart = slot.split(' - ')[0]; // e.g. "09:00 AM"
  const hourPart = parseInt(timePart.split(':')[0]);
  const isPM = timePart.includes('PM');
  
  let hour = hourPart;
  if (isPM && hourPart !== 12) {
    hour += 12;
  } else if (!isPM && hourPart === 12) {
    hour = 0;
  }
  return hour;
};

const BookSlotModal: React.FC<Props> = ({ name, mobile, onClose, onBookSuccess }) => {
  // Date boundaries
  const todayStr = new Date().toISOString().split('T')[0];
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 30);
  const maxDateStr = maxDate.toISOString().split('T')[0];

  const [date, setDate] = useState(todayStr);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  
  const [custName, setCustName] = useState(name);
  const [custMobile, setCustMobile] = useState(mobile);
  
  const [nameError, setNameError] = useState('');
  const [mobileError, setMobileError] = useState('');
  const [slotError, setSlotError] = useState('');
  
  const [agreed, setAgreed] = useState(true);
  const [consentError, setConsentError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter slots dynamically if selected date is today
  useEffect(() => {
    if (date === todayStr) {
      const currentHour = new Date().getHours();
      const filtered = ALL_SLOTS.filter(slot => parseSlotStartHour(slot) > currentHour);
      setAvailableSlots(filtered);
      if (filtered.length > 0) {
        setSelectedSlot(filtered[0]);
      } else {
        setSelectedSlot('');
      }
    } else {
      setAvailableSlots(ALL_SLOTS);
      setSelectedSlot(ALL_SLOTS[0]);
    }
  }, [date, todayStr]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let valid = true;
    const trimmedName = custName.trim();
    
    if (!trimmedName) {
      setNameError('Please enter your name');
      valid = false;
    } else if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      setNameError('Name should contain only alphabets');
      valid = false;
    } else {
      setNameError('');
    }

    if (!/^[6-9]\d{9}$/.test(custMobile)) {
      setMobileError('Enter a valid 10-digit mobile number');
      valid = false;
    } else {
      setMobileError('');
    }

    if (!agreed) {
      setConsentError('Please accept the T&C to continue');
      valid = false;
    } else {
      setConsentError('');
    }

    if (availableSlots.length === 0) {
      setSlotError('No slots available for today');
      valid = false;
    } else if (!selectedSlot) {
      setSlotError('Required');
      valid = false;
    } else {
      setSlotError('');
    }

    if (!valid) return;

    setIsSubmitting(true);
    try {
      // Formatted date string for backend "DD/MM/YYYY"
      const dParts = date.split('-');
      const formattedDate = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
      
      const leadNo = sessionStorage.getItem('tightropeLeadNo') || 
                     sessionStorage.getItem('gamification_LeadNo');

      if (leadNo) {
        // Lead exists: call updateLeadNew API
        console.log('[Booking] Updating existing lead no:', leadNo);
        const res = await updateLeadNew(leadNo, {
          name: trimmedName,
          mobile: custMobile,
          date: formattedDate,
          time: selectedSlot,
          remarks: `Appointment via Tightrope Protection | Slot: ${selectedSlot}`
        });
        
        if (res.success) {
          onBookSuccess();
        } else {
          alert('Failed to update slot booking. Please try again.');
        }
      } else {
        // No lead exists: call submitToLMS
        console.log('[Booking] Creating new lead with booking');
        const res = await submitToLMS({
          name: trimmedName,
          mobile_no: custMobile,
          date: date, // submitToLMS formats it internally
          timeSlot: selectedSlot,
          summary_dtls: `Appointment booked for ${selectedSlot}`
        });
        
        if (res.success) {
          if (res.data?.LeadNo) {
            sessionStorage.setItem('tightropeLeadNo', res.data.LeadNo);
            sessionStorage.setItem('gamification_LeadNo', res.data.LeadNo);
          }
          onBookSuccess();
        } else {
          alert('Failed to submit slot booking. Please try again.');
        }
      }
    } catch (err) {
      console.error('[Booking] Error during API call:', err);
      alert('Network error. Slot booking failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="absolute inset-0 z-[120] flex items-center justify-center"
      style={{
        background: 'rgba(1,4,10,0.72)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: 'var(--s4)',
      }}
    >
      <div
        className="pop tp-glass relative w-full"
        style={{
          maxWidth: 340,
          padding: 'var(--s5)',
          background: 'rgba(7,27,62,0.92)',
          maxHeight: '92%',
          overflowY: 'auto',
        }}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3
            style={{
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              color: '#F26522',
            }}
          >
            Book a Consultation
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="btn-press flex items-center justify-center"
            style={{ width: 44, height: 44, marginRight: -12, background: 'transparent' }}
          >
            <CloseIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleBooking} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--s3)' }}>
          <div>
            <label htmlFor="bs-name" style={fieldLabel}>Name</label>
            <input
              id="bs-name"
              type="text"
              value={custName}
              onChange={(e) => { setCustName(e.target.value); setNameError(''); }}
              className="tp-field"
              style={{ height: 44 }}
            />
            {nameError && <p style={fieldError}>{nameError}</p>}
          </div>

          <div>
            <label htmlFor="bs-mobile" style={fieldLabel}>Mobile</label>
            <input
              id="bs-mobile"
              type="tel"
              inputMode="numeric"
              value={custMobile}
              onChange={(e) => { setCustMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setMobileError(''); }}
              className="tp-field"
              style={{ height: 44 }}
            />
            {mobileError && <p style={fieldError}>{mobileError}</p>}
          </div>

          <div>
            <label htmlFor="bs-date" style={fieldLabel}>Preferred Date</label>
            <input
              id="bs-date"
              type="date"
              value={date}
              min={todayStr}
              max={maxDateStr}
              onChange={(e) => setDate(e.target.value)}
              className="tp-field"
              style={{ height: 44 }}
            />
          </div>

          <div>
            <label htmlFor="bs-slot" style={fieldLabel}>Preferred Time Slot</label>
            {availableSlots.length > 0 ? (
              <select
                id="bs-slot"
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="tp-field"
                style={{ height: 44 }}
              >
                {availableSlots.map(slot => (
                  <option key={slot} value={slot} style={{ background: '#071B3E' }}>{slot}</option>
                ))}
              </select>
            ) : (
              <div
                style={{
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 'var(--tp-r)',
                  border: '1px solid rgba(255,107,132,0.4)',
                  color: '#FF6B84',
                  fontSize: 12.5,
                  fontWeight: 800,
                }}
              >
                No slots available for today
              </div>
            )}
            {slotError && <p style={fieldError}>{slotError}</p>}
          </div>

          <label className="flex cursor-pointer items-start" style={{ gap: 9, marginTop: 2 }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                if (e.target.checked) setConsentError('');
              }}
              style={{ marginTop: 1, width: 17, height: 17, accentColor: '#F26522', flexShrink: 0, cursor: 'pointer' }}
            />
            <span style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--tp-text-3)', textAlign: 'left' }}>
              Authorize Bajaj Life Insurance to call me back regarding my request.
            </span>
          </label>
          {consentError && <p style={fieldError}>{consentError}</p>}

          <button
            type="submit"
            disabled={isSubmitting || (date === todayStr && availableSlots.length === 0)}
            className="btn-press tp-btn tp-btn-green"
            style={{ marginTop: 'var(--s2)', opacity: isSubmitting ? 0.7 : 1 }}
          >
            {isSubmitting ? 'Booking…' : 'Confirm Slot'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookSlotModal;
