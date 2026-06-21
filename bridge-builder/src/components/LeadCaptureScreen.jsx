import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useGameStore, GAME_STATUS } from '../store/useGameStore';
import { submitToLMS } from '../utils/api';
import TermsModal from './TermsModal';

const LeadCaptureScreen = () => {
    const { score, setStatus, setLeadData } = useGameStore();
    const [formData, setFormData] = useState({ name: '', mobile: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isTermsAccepted, setIsTermsAccepted] = useState(true);
    const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);
    const [errors, setErrors] = useState({});

    const validate = () => {
        const errs = {};
        if (!formData.name.trim()) errs.name = 'Name is required';
        else if (!/^[A-Za-z\s]+$/.test(formData.name.trim())) errs.name = 'Letters only';

        if (!/^[6-9]\d{9}$/.test(formData.mobile)) errs.mobile = 'Invalid 10-digit number';

        if (!isTermsAccepted) errs.terms = 'Please agree to Terms and Conditions';

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;

        setIsSubmitting(true);
        try {
            const result = await submitToLMS({
                name: formData.name,
                mobile_no: formData.mobile,
                score: score,
                summary_dtls: 'Bridge Builder - Post Game Lead',
            });
            if (result.success) {
                const responseData = result.data || result;
                const ln = responseData.leadNo || responseData.LeadNo;
                if (ln) sessionStorage.setItem('bridgeBuilderLeadNo', ln);
                setLeadData({
                    name: formData.name,
                    phone: formData.mobile,
                    leadNo: ln
                });
                setStatus(GAME_STATUS.CTA);
            } else {
                // Fallback even if LMS fails, let player see results in development
                setLeadData({
                    name: formData.name,
                    phone: formData.mobile,
                    leadNo: 'DEV_FALLBACK_LEAD'
                });
                setStatus(GAME_STATUS.CTA);
            }
        } catch (error) {
            console.error(error);
            // Fallback in case of net error
            setLeadData({
                name: formData.name,
                phone: formData.mobile,
                leadNo: 'DEV_FALLBACK_LEAD'
            });
            setStatus(GAME_STATUS.CTA);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div 
            style={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '24px',
                backgroundColor: '#0B1221',
                position: 'relative',
                zIndex: 100,
                boxSizing: 'border-box'
            }}
        >
            {/* Animated Background */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
                <div 
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '200%',
                        height: '200%',
                        background: 'radial-gradient(circle, rgba(0, 61, 166, 0.15) 0%, transparent 70%)',
                    }}
                />
            </div>

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                style={{
                    padding: '32px',
                    width: '100%',
                    maxWidth: '340px',
                    borderRadius: '32px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    backdropFilter: 'blur(16px)',
                    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                    boxSizing: 'border-box',
                    textAlign: 'center'
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <h2 
                        style={{
                            fontSize: '24px',
                            fontWeight: 900,
                            color: '#FFFFFF',
                            lineHeight: '1.2',
                            margin: '0 0 8px 0',
                            textTransform: 'uppercase',
                            fontFamily: 'Outfit, sans-serif'
                        }}
                    >
                        Enter Details
                    </h2>
                    <p style={{ color: '#9CA3AF', fontWeight: 'bold', fontSize: '14px', margin: 0 }}>
                        To see your result
                    </p>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                        <label 
                            style={{
                                fontSize: '10px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: '#9CA3AF',
                                marginLeft: '4px',
                                display: 'block'
                            }}
                        >
                            Your Name
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value.replace(/[^a-zA-Z\s]/g, '') })}
                            placeholder="Full Name"
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: errors.name ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '16px',
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                            }}
                        />
                        {errors.name && <p style={{ color: '#EF4444', fontSize: '10px', fontWeight: 900, margin: '4px 0 0 4px', textTransform: 'uppercase' }}>{errors.name}</p>}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', textAlign: 'left' }}>
                        <label 
                            style={{
                                fontSize: '10px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em',
                                color: '#9CA3AF',
                                marginLeft: '4px',
                                display: 'block'
                            }}
                        >
                            Mobile Number
                        </label>
                        <input
                            type="tel"
                            maxLength={10}
                            value={formData.mobile}
                            onChange={(e) => setFormData({ ...formData, mobile: e.target.value.replace(/\D/g, '') })}
                            placeholder="9876543210"
                            style={{
                                width: '100%',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                border: errors.mobile ? '1px solid #EF4444' : '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '16px',
                                padding: '16px',
                                color: '#FFFFFF',
                                fontWeight: 'bold',
                                fontSize: '16px',
                                outline: 'none',
                                transition: 'all 0.2s',
                                boxSizing: 'border-box'
                            }}
                        />
                        {errors.mobile && <p style={{ color: '#EF4444', fontSize: '10px', fontWeight: 900, margin: '4px 0 0 4px', textTransform: 'uppercase' }}>{errors.mobile}</p>}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '4px 0', textAlign: 'left' }}>
                        <div
                            onClick={() => setIsTermsAccepted(!isTermsAccepted)}
                            style={{
                                marginTop: '2px',
                                flexShrink: 0,
                                width: '24px',
                                height: '24px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                backgroundColor: isTermsAccepted ? 'var(--color-orange)' : 'rgba(255, 255, 255, 0.05)'
                            }}
                        >
                            {isTermsAccepted && <span style={{ color: '#FFFFFF', fontWeight: 900, fontSize: '12px' }}>✓</span>}
                        </div>
                        <p style={{ fontSize: '11px', fontWeight: 'bold', color: '#9CA3AF', margin: 0, lineHeight: '1.4' }}>
                            I agree and consent to the <span onClick={() => setIsTermsModalOpen(true)} style={{ color: 'var(--color-accent)', textDecoration: 'underline', fontWeight: 900, cursor: 'pointer' }}>T&C and Privacy Policy</span>
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            width: '100%',
                            background: 'linear-gradient(135deg, var(--color-orange) 0%, #E65C00 100%)',
                            color: '#FFFFFF',
                            fontWeight: 900,
                            fontSize: '18px',
                            padding: '16px',
                            borderRadius: '16px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            letterSpacing: '0.05em',
                            textTransform: 'uppercase',
                            marginTop: '16px',
                            boxShadow: '0 4px 14px rgba(242, 101, 34, 0.35)'
                        }}
                    >
                        {isSubmitting ? 'LOADING...' : 'See Results!'}
                    </button>
                    {errors.terms && !isTermsAccepted && <p style={{ color: '#EF4444', fontSize: '10px', fontWeight: 900, margin: '8px 0 0 0', textTransform: 'uppercase', textAlign: 'center' }}>{errors.terms}</p>}
                </form>
            </motion.div>

            <TermsModal isOpen={isTermsModalOpen} onClose={() => setIsTermsModalOpen(false)} />
        </div>
    );
};

export default LeadCaptureScreen;
