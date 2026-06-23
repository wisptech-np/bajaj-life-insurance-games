import React, { useState, useEffect } from 'react';
import { updateLeadNew, submitToLMS } from '../services/api';

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
    <div className="absolute inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      {/* Modal Container */}
      <div className="relative w-full max-w-[360px] bg-[#061939] border border-white/10 rounded-2xl p-6 shadow-2xl">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-black text-[#00AEEF] uppercase tracking-wider">Book a Consultation</h3>
          <button 
            type="button" 
            onClick={onClose} 
            className="text-blue-300/40 hover:text-white text-lg font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleBooking} className="space-y-3.5">
          {/* Name input */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase text-blue-200">Name</label>
            <input
              type="text"
              value={custName}
              onChange={(e) => { setCustName(e.target.value); setNameError(''); }}
              className="w-full bg-[#051736] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-blue-300/20 focus:border-[#00AEEF] focus:outline-none"
            />
            {nameError && <p className="text-[9px] font-bold text-red-400">{nameError}</p>}
          </div>

          {/* Mobile input */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase text-blue-200">Mobile</label>
            <input
              type="tel"
              value={custMobile}
              onChange={(e) => { setCustMobile(e.target.value.replace(/\D/g, '').slice(0, 10)); setMobileError(''); }}
              className="w-full bg-[#051736] border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-blue-300/20 focus:border-[#00AEEF] focus:outline-none"
            />
            {mobileError && <p className="text-[9px] font-bold text-red-400">{mobileError}</p>}
          </div>

          {/* Preferred Date */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase text-blue-200">Preferred Date</label>
            <input
              type="date"
              value={date}
              min={todayStr}
              max={maxDateStr}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#051736] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AEEF] focus:outline-none"
            />
          </div>

          {/* Preferred Time Slot */}
          <div className="space-y-0.5">
            <label className="text-[9px] font-black uppercase text-blue-200">Preferred Time Slot</label>
            {availableSlots.length > 0 ? (
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full bg-[#051736] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:border-[#00AEEF] focus:outline-none"
              >
                {availableSlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            ) : (
              <div className="w-full bg-[#051736] border border-red-500/30 text-red-400 rounded-lg px-3 py-2 text-xs font-bold text-center">
                No slots available for today
              </div>
            )}
            {slotError && <p className="text-[9px] font-bold text-red-400">{slotError}</p>}
          </div>

          {/* Consent Checkbox */}
          <div className="pt-1">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => {
                  setAgreed(e.target.checked);
                  if (e.target.checked) setConsentError('');
                }}
                className="mt-0.5 rounded border-white/10 bg-[#051736] text-[#00AEEF] w-3.5 h-3.5 cursor-pointer"
              />
              <span className="text-[9px] text-blue-200/50 leading-relaxed text-left">
                Authorize Bajaj Life Insurance to call me back regarding my request.
              </span>
            </label>
            {consentError && <p className="text-[9px] font-bold text-red-400">{consentError}</p>}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || (date === todayStr && availableSlots.length === 0)}
            className="btn-press w-full rounded-full py-2.5 text-xs font-black uppercase tracking-wider text-white shadow-lg transition-all flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #0D9488 0%, #0F766E 100%)' }}
          >
            {isSubmitting ? 'Booking...' : 'Confirm Slot'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BookSlotModal;
