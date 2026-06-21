import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

const TermsModal = ({ isOpen, onClose }) => {
    return (
        <AnimatePresence>
            {isOpen && (
                <div 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 200,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            inset: 0,
                            backgroundColor: 'rgba(0, 0, 0, 0.4)',
                            backdropFilter: 'blur(4px)',
                        }}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="glass-card"
                        style={{
                            width: '100%',
                            maxWidth: '340px',
                            padding: '32px',
                            borderRadius: '32px',
                            border: '4px solid var(--color-primary)',
                            backgroundColor: '#FFFFFF',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            position: 'relative',
                            overflow: 'hidden',
                            zIndex: 201,
                            textAlign: 'left',
                        }}
                    >
                        <button
                            onClick={onClose}
                            style={{
                                position: 'absolute',
                                top: '24px',
                                right: '24px',
                                border: 'none',
                                background: 'none',
                                color: '#9CA3AF',
                                cursor: 'pointer',
                                padding: 0,
                            }}
                        >
                            <X className="h-6 w-6" />
                        </button>

                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{
                                color: 'var(--color-blue)',
                                fontSize: '24px',
                                fontWeight: 900,
                                textTransform: 'uppercase',
                                lineHeight: '1.2',
                                margin: 0,
                                fontFamily: 'Outfit, sans-serif'
                            }}>
                                Terms & Conditions
                            </h2>
                        </div>

                        <div 
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px',
                                color: '#4B5563',
                                fontSize: '10px',
                                fontWeight: 500,
                                lineHeight: '1.6',
                                maxHeight: '300px',
                                overflowY: 'auto',
                                paddingRight: '8px',
                                textAlign: 'left',
                            }}
                        >
                            <p style={{ margin: 0 }}>
                                I hereby authorize Bajaj Life Insurance Limited. to call me on the contact number made available by me on the website with a specific request to call back.
                            </p>
                            <p style={{ margin: 0 }}>
                                I further declare that, irrespective of my contact number being registered on National Customer Preference Register (NCPR) or on National Do Not Call Registry (NDNC), any call made, SMS or WhatsApp sent in response to my request shall not be construed as an Unsolicited Commercial Communication even though the content of the call may be for the purposes of explaining various insurance products and services or solicitation and procurement of insurance business.
                            </p>
                            <p style={{ margin: 0 }}>
                                Please refer to Bajaj Life <a href="https://www.bajajallianzlife.com/privacy-policy.html" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-primary)', textDecoration: 'underline', fontWeight: 'bold' }}>Privacy Policy</a>.
                            </p>
                        </div>

                        <div style={{ marginTop: '32px' }}>
                            <button
                                onClick={onClose}
                                className="btn-primary"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    fontSize: '18px',
                                    letterSpacing: '0.05em',
                                    color: '#FFFFFF',
                                    textTransform: 'uppercase',
                                    fontWeight: 900,
                                    border: 'none',
                                    cursor: 'pointer',
                                    background: 'var(--color-primary)',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 4px 6px rgba(0, 61, 166, 0.2)',
                                }}
                            >
                                I AGREE
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default TermsModal;
