import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore, GAME_STATUS } from '../store/useGameStore';
import { Phone, RotateCcw, Calendar, Share2, X, ChevronDown, Award, TrendingUp, ShieldAlert, Heart, DollarSign } from 'lucide-react';
import Confetti from './Confetti';
import Speedometer from './Speedometer';
import { buildShareUrl } from '../utils/crypto';
import { shortenUrl } from '../utils/shortener';
import { updateLeadNew } from '../utils/api';

const CTAResultScreen = () => {
    const { leadData, score, coins, metrics, setStatus, resetGame } = useGameStore();
    const empPhone = sessionStorage.getItem('gamification_emp_mobile') || '02261241800'; // Fallback company number
    const [showBooking, setShowBooking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [bookingData, setBookingData] = useState({
        name: leadData?.name || '',
        phone: leadData?.phone || '',
        date: '',
        time: ''
    });
    const [dateError, setDateError] = useState('');

    // Calculate Date constraints
    const today = new Date();
    const localToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
    const minDate = localToday.toISOString().split('T')[0];

    const nextMonth = new Date(localToday);
    nextMonth.setMonth(localToday.getMonth() + 1);
    const maxDate = nextMonth.toISOString().split('T')[0];

    // Generate Time Slots (9am to 9pm)
    const generateTimeSlots = (selectedDate) => {
        const slots = [];
        const isToday = selectedDate === minDate;
        const currentHour = today.getHours();

        for (let hour = 9; hour < 21; hour++) {
            if (isToday && currentHour >= hour) continue;

            const formatAMPM = (h) => {
                const ampm = h >= 12 ? 'PM' : 'AM';
                const formattedHour = h % 12 || 12;
                return `${formattedHour}:00 ${ampm}`;
            };

            const startStr = formatAMPM(hour);
            const endStr = formatAMPM(hour + 1);
            slots.push(`${startStr} - ${endStr}`);
        }
        return slots;
    };

    const availableSlots = generateTimeSlots(bookingData.date);

    // Dynamic quotes based on score
    let evaluationQuote = "A strong start! Build resilience by attaching key protections to your bridge.";
    if (score >= 85) {
        evaluationQuote = "Outstanding planning! Your bridge is a fortress of protection. You've secured your family's future!";
    } else if (score >= 60) {
        evaluationQuote = "Great effort! A few more protection upgrades would make your bridge completely resilient against disasters.";
    }

    const handleShare = async () => {
        const rawUrl = buildShareUrl() || window.location.href;
        const shareUrl = await shortenUrl(rawUrl);
        const senderName = leadData?.name || '';
        const signature = senderName ? `\n\nBest Regards,\n${senderName}` : '';

        const shareData = {
            title: 'Bridge Builder - Protection Score',
            text: `Hi!\nI just achieved a Protection Score of ${score}/100 in the Bridge Builder game! I protected my family from floods, earthquakes, and wind storms. Can you build a stronger bridge?\nTry it here: ${shareUrl}${signature}`.trim(),
            url: shareUrl
        };

        if (navigator.share) {
            try {
                await navigator.share({
                    title: shareData.title,
                    text: shareData.text
                });
            } catch (err) {
                console.log('Error sharing:', err);
            }
        } else {
            try {
                await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
                alert('Share message copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    return (
        <div 
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                backgroundColor: '#0B1221',
                position: 'relative',
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '24px 16px',
                boxSizing: 'border-box'
            }}
            className="custom-scrollbar"
        >
            <Confetti />

            {/* Background Glow */}
            <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
                <div 
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '100%',
                        height: '100%',
                        background: 'radial-gradient(circle, rgba(0, 61, 166, 0.1) 0%, transparent 75%)',
                        filter: 'blur(120px)'
                    }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    position: 'relative',
                    zIndex: 10,
                    width: '100%',
                    maxWidth: '440px',
                    margin: '0 auto',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                {/* Header Section */}
                <div style={{ marginBottom: '16px' }}>
                    <h1 
                        style={{
                            fontSize: '22px',
                            fontWeight: 500,
                            color: '#FFFFFF',
                            fontStyle: 'italic',
                            textTransform: 'uppercase',
                            margin: 0,
                            fontFamily: 'Outfit, sans-serif'
                        }}
                    >
                        Hi <span style={{ fontSize: '28px', fontWeight: 900, color: '#FFD700', fontStyle: 'normal' }}>{leadData?.name?.split(' ')[0] || 'Builder'}!</span>
                    </h1>
                </div>

                {/* Score Speedometer Card */}
                <div 
                    style={{ 
                        width: '100%',
                        maxWidth: '380px',
                        borderRadius: '32px',
                        padding: '24px 20px',
                        marginBottom: '20px',
                        background: 'rgba(255, 255, 255, 0.04)', 
                        border: '1px solid rgba(255, 255, 255, 0.08)', 
                        backdropFilter: 'blur(16px)', 
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                        boxSizing: 'border-box',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    <span 
                        style={{
                            fontSize: '11px',
                            fontWeight: 900,
                            letterSpacing: '0.15em',
                            color: '#00F2FE',
                            textTransform: 'uppercase',
                            fontFamily: 'Outfit, sans-serif'
                        }}
                    >
                        Protection Score
                    </span>
                    
                    {/* Gauge */}
                    <div style={{ marginTop: '-12px' }}>
                        <Speedometer score={score} />
                    </div>

                    <p 
                        style={{
                            color: '#FFFFFF',
                            fontSize: '15px',
                            fontWeight: 'bold',
                            lineHeight: '1.5',
                            margin: '8px 0 0 0',
                            fontStyle: 'italic',
                            fontFamily: 'Inter, sans-serif'
                        }}
                    >
                        "{evaluationQuote}"
                    </p>
                </div>

                {/* Dashboard Metrics Card */}
                <div 
                    style={{ 
                        width: '100%',
                        maxWidth: '380px',
                        borderRadius: '32px',
                        padding: '24px 20px',
                        marginBottom: '20px',
                        background: 'rgba(255, 255, 255, 0.03)', 
                        border: '1px solid rgba(255, 255, 255, 0.05)', 
                        backdropFilter: 'blur(12px)',
                        boxSizing: 'border-box',
                    }}
                >
                    <h3 
                        style={{
                            fontSize: '13px',
                            fontWeight: 900,
                            letterSpacing: '0.1em',
                            color: '#FFFFFF',
                            textTransform: 'uppercase',
                            margin: '0 0 16px 0',
                            fontFamily: 'Outfit, sans-serif',
                            textAlign: 'left'
                        }}
                    >
                        Financial Wisdom Dashboard
                    </h3>

                    {/* Stat Items */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[
                            { name: 'Protection Cover', val: metrics.protectionScore, color: '#00F2FE', icon: Award },
                            { name: 'Structural Planning', val: metrics.planningScore, color: '#FFB800', icon: TrendingUp },
                            { name: 'Family Safety', val: metrics.safetyScore, color: '#FF4B4B', icon: Heart },
                            { name: 'Risk Management', val: metrics.riskManagement, color: '#00E064', icon: ShieldAlert },
                            { name: 'Financial Wisdom', val: metrics.financialWisdom, color: 'var(--color-orange)', icon: DollarSign }
                        ].map((m, i) => {
                            const IconComponent = m.icon;
                            return (
                                <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 'bold' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#9CA3AF' }}>
                                            <IconComponent size={14} style={{ color: m.color }} />
                                            <span>{m.name}</span>
                                        </div>
                                        <span style={{ color: '#FFFFFF' }}>{m.val}%</span>
                                    </div>
                                    {/* Progress line */}
                                    <div style={{ height: '6px', backgroundColor: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${m.val}%` }}
                                            transition={{ duration: 1.2, delay: 0.2 + i * 0.1 }}
                                            style={{ height: '100%', backgroundColor: m.color, borderRadius: '3px' }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Share Button */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    style={{ marginBottom: '20px', width: '100%', display: 'flex', justifyContent: 'center', boxSizing: 'border-box', padding: '0 8px' }}
                >
                    <button
                        onClick={handleShare}
                        style={{
                            width: '100%',
                            maxWidth: '380px',
                            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', // WhatsApp green
                            color: '#FFFFFF',
                            fontWeight: 900,
                            padding: '14px 24px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '10px',
                            fontSize: '14px',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            boxShadow: '0 6px 20px rgba(37, 211, 102, 0.25)'
                        }}
                    >
                        <Share2 size={16} /> SHARE SCORE
                    </button>
                </motion.div>

                {/* CTA Box */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    style={{
                        width: '100%',
                        maxWidth: '380px',
                        borderRadius: '32px',
                        padding: '24px 20px',
                        marginBottom: '24px',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        background: 'rgba(255, 255, 255, 0.04)',
                        backdropFilter: 'blur(16px)',
                        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                        boxSizing: 'border-box'
                    }}
                >
                    <p 
                        style={{
                            color: '#D1D5DB',
                            fontSize: '13px',
                            fontWeight: 'bold',
                            lineHeight: '1.6',
                            margin: '0 0 20px 0',
                            fontFamily: 'Inter, sans-serif'
                        }}
                    >
                        To systematically protect your financial plan and safeguard what matters most, connect with our Relationship Manager now!
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                        {empPhone && (
                            <>
                                <a href={`tel:${empPhone}`} style={{ textDecoration: 'none', width: '100%' }}>
                                    <button 
                                        style={{
                                            width: '100%',
                                            background: 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)', // Orange/Red brand fallback
                                            color: '#FFFFFF',
                                            fontWeight: 900,
                                            padding: '14px',
                                            borderRadius: '16px',
                                            cursor: 'pointer',
                                            border: 'none',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            gap: '8px',
                                            fontSize: '13px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.05em'
                                        }}
                                    >
                                        <Phone size={14} /> CALL NOW
                                    </button>
                                </a>

                                <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', width: '100%' }}>
                                    <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }}></div>
                                    <span style={{ margin: '0 12px', color: 'rgba(255,255,255,0.3)', fontWeight: 900, fontSize: '9px', trackingWidth: '0.1em', uppercase: true }}>OR</span>
                                    <div style={{ flexGrow: 1, height: '1px', backgroundColor: 'rgba(255,255,255,0.08)' }}></div>
                                </div>
                            </>
                        )}

                        <button
                            onClick={() => setShowBooking(true)}
                            style={{
                                width: '100%',
                                background: 'linear-gradient(135deg, #003DA6 0%, #002D7A 100%)', // Bajaj Blue
                                color: '#FFFFFF',
                                fontWeight: 900,
                                padding: '14px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                border: 'none',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                fontSize: '13px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                boxShadow: '0 4px 15px rgba(0, 61, 166, 0.3)'
                            }}
                        >
                            <Calendar size={14} /> BOOK A CONVENIENT SLOT
                        </button>
                    </div>
                </motion.div>

                {/* Play Again */}
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    onClick={() => {
                        resetGame();
                        setStatus(GAME_STATUS.PLAYING);
                    }}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.15em',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        margin: '0 auto 24px auto',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.8'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
                >
                    <RotateCcw size={16} /> PLAY AGAIN
                </motion.button>

                {/* Disclaimer */}
                <div style={{ width: '100%', padding: '0 16px', opacity: 0.4, marginBottom: '24px', boxSizing: 'border-box' }}>
                    <p style={{ fontSize: '8px', color: '#FFFFFF', lineHeight: '1.5', textAlign: 'center', fontWeight: 'bold', margin: '0 auto', maxWidth: '360px' }}>
                        Disclaimer: The results shown in this game are indicative and based solely on the information provided by the participant. They are intended for engagement and awareness purposes only and do not constitute financial advice or a recommendation to purchase any life insurance product. Participants should seek independent professional advice before making any financial or insurance decisions. While due care has been taken in designing the game, Bajaj Life Insurance Ltd. assumes no liability for its outcomes.
                    </p>
                </div>
            </motion.div>

            {/* Booking Modal */}
            <AnimatePresence>
                {showBooking && (
                    <div 
                        style={{
                            position: 'fixed',
                            inset: 0,
                            zIndex: 100,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '16px',
                            backgroundColor: 'rgba(0, 0, 0, 0.75)',
                            backdropFilter: 'blur(8px)'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{
                                padding: '32px',
                                width: '100%',
                                maxWidth: '360px',
                                borderRadius: '32px',
                                background: 'rgba(10, 18, 36, 0.95)',
                                border: '1px solid rgba(255, 255, 255, 0.08)',
                                backdropFilter: 'blur(24px)',
                                boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                                boxSizing: 'border-box',
                                position: 'relative'
                            }}
                        >
                            <button
                                onClick={() => setShowBooking(false)}
                                style={{
                                    position: 'absolute',
                                    right: '16px',
                                    top: '16px',
                                    color: 'rgba(255, 255, 255, 0.6)',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    border: 'none',
                                    borderRadius: '50%',
                                    width: '32px',
                                    height: '32px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.2s'
                                }}
                            >
                                <X size={16} />
                            </button>

                            <h2 style={{ color: '#00F2FE', fontWeight: 900, textAlign: 'center', marginBottom: '24px', fontSize: '16px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Secure Your Future</h2>

                            <form 
                                style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    if (!bookingData.name || !bookingData.phone || !bookingData.date || !bookingData.time) return alert("Please fill all details");

                                    setIsSubmitting(true);
                                    try {
                                        const leadNo = sessionStorage.getItem('bridgeBuilderLeadNo');
                                        const result = await updateLeadNew(leadNo, {
                                            name: bookingData.name,
                                            mobile: bookingData.phone,
                                            date: bookingData.date,
                                            time: bookingData.time,
                                            remarks: `Bridge Builder Slot Booking | Protection Score: ${score}`
                                        });

                                        if (result.success || result) {
                                            setShowBooking(false);
                                            setStatus(GAME_STATUS.THANK_YOU);
                                        }
                                    } catch (err) {
                                        console.error(err);
                                        // Fallback
                                        setShowBooking(false);
                                        setStatus(GAME_STATUS.THANK_YOU);
                                    } finally {
                                        setIsSubmitting(false);
                                    }
                                }}
                            >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                    <label style={{ fontSize: '9px', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Name</label>
                                    <input
                                        type="text"
                                        value={bookingData.name}
                                        onChange={e => setBookingData(p => ({ ...p, name: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            height: '44px',
                                            color: '#FFFFFF',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            padding: '0 12px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                    <label style={{ fontSize: '9px', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone Number</label>
                                    <input
                                        type="tel"
                                        maxLength={10}
                                        value={bookingData.phone}
                                        onChange={e => setBookingData(p => ({ ...p, phone: e.target.value.replace(/\D/g, '') }))}
                                        style={{
                                            width: '100%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            height: '44px',
                                            color: '#FFFFFF',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            padding: '0 12px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left' }}>
                                    <label style={{ fontSize: '9px', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preferred Date</label>
                                    <input
                                        type="date"
                                        min={minDate}
                                        max={maxDate}
                                        value={bookingData.date}
                                        onChange={e => {
                                            const selectedStr = e.target.value;
                                            if (!selectedStr) {
                                                setBookingData(p => ({ ...p, date: '', time: '' }));
                                                setDateError('');
                                                return;
                                            }

                                            const [year, month, day] = selectedStr.split('-').map(Number);
                                            const selectedDate = new Date(year, month - 1, day);
                                            selectedDate.setHours(0, 0, 0, 0);

                                            const todayMidnight = new Date();
                                            todayMidnight.setHours(0, 0, 0, 0);

                                            const maxDateLimit = new Date(todayMidnight);
                                            maxDateLimit.setDate(todayMidnight.getDate() + 30);

                                            let correctedDateStr = selectedStr;
                                            let errorMsg = '';

                                            if (selectedDate < todayMidnight) {
                                                const yyyy = todayMidnight.getFullYear();
                                                const mm = String(todayMidnight.getMonth() + 1).padStart(2, '0');
                                                const dd = String(todayMidnight.getDate()).padStart(2, '0');
                                                correctedDateStr = `${yyyy}-${mm}-${dd}`;
                                                errorMsg = "Past dates are not allowed.";
                                            } else if (selectedDate > maxDateLimit) {
                                                const yyyy = maxDateLimit.getFullYear();
                                                const mm = String(maxDateLimit.getMonth() + 1).padStart(2, '0');
                                                const dd = String(maxDateLimit.getDate()).padStart(2, '0');
                                                correctedDateStr = `${yyyy}-${mm}-${dd}`;
                                                errorMsg = "Max booking range is 30 days.";
                                            }

                                            setBookingData(p => ({ ...p, date: correctedDateStr, time: '' }));
                                            setDateError(errorMsg);
                                        }}
                                        style={{
                                            width: '100%',
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            height: '44px',
                                            color: '#FFFFFF',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            padding: '0 12px',
                                            outline: 'none',
                                            colorScheme: 'dark',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    />
                                    {dateError && (
                                        <p style={{ color: 'var(--color-orange)', fontSize: '9px', fontWeight: 'bold', margin: '4px 0 0 0', textTransform: 'uppercase' }}>
                                            ⚠️ {dateError}
                                        </p>
                                    )}
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', textAlign: 'left', position: 'relative' }}>
                                    <label style={{ fontSize: '9px', fontWeight: 900, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preferred Slot</label>
                                    <select
                                        value={bookingData.time}
                                        onChange={e => setBookingData(p => ({ ...p, time: e.target.value }))}
                                        style={{
                                            width: '100%',
                                            backgroundColor: '#0B1221',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '12px',
                                            height: '44px',
                                            color: '#FFFFFF',
                                            fontSize: '13px',
                                            fontWeight: 'bold',
                                            padding: '0 12px',
                                            outline: 'none',
                                            boxSizing: 'border-box'
                                        }}
                                        required
                                    >
                                        <option value="">Select a time</option>
                                        {availableSlots.length > 0 ? (
                                            availableSlots.map(slot => (
                                                <option key={slot} value={slot}>{slot}</option>
                                            ))
                                        ) : (
                                            <option value="" disabled>No slots available today</option>
                                        )}
                                    </select>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    style={{
                                        width: '100%',
                                        background: 'linear-gradient(135deg, var(--color-orange) 0%, #E65C00 100%)',
                                        color: '#FFFFFF',
                                        fontWeight: 900,
                                        padding: '14px',
                                        borderRadius: '16px',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        letterSpacing: '0.05em',
                                        textTransform: 'uppercase',
                                        marginTop: '12px',
                                        boxShadow: '0 4px 15px rgba(242, 101, 34, 0.3)'
                                    }}
                                >
                                    {isSubmitting ? 'CONFIRMING...' : 'CONFIRM BOOKING'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CTAResultScreen;
