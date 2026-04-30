import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ClockIcon, ArrowRightOnRectangleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

export default function SessionWarningModal({ isOpen, remaining, onKeepAlive, onLogout }) {
    if (!isOpen) return null;

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    const countdownStr = `${minutes}:${String(seconds).padStart(2, '0')}`;

    const countdownColor = remaining <= 60 ? '#ef4444' : '#2b6fd4';

    return (
        <AnimatePresence>
            <div className="modal-overlay" style={{ zIndex: 99999 }}>
                <motion.div
                    className="modal-container"
                    style={{ maxWidth: 420 }}
                    initial={{ opacity: 0, scale: 0.92, y: 16 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.92, y: 16 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                >

                    <div className="modal-icon-wrapper info" style={{ marginBottom: 20 }}>
                        <ClockIcon className="w-8 h-8 text-blue-500" style={{ width: 32, height: 32, color: '#2b6fd4' }} />
                    </div>

                    <div className="modal-header" style={{ marginBottom: 12 }}>
                        <h2 style={{ fontSize: 20 }}>Session Expiring Soon</h2>
                        <p style={{ fontSize: 14, lineHeight: 1.6, marginTop: 8 }}>
                            You've been inactive for a while. For your security,
                            you'll be logged out automatically in:
                        </p>
                    </div>

                    <div style={{
                        textAlign: 'center',
                        fontSize: 42,
                        fontWeight: 700,
                        fontFamily: "'Poppins', sans-serif",
                        color: countdownColor,
                        letterSpacing: 2,
                        margin: '16px 0 28px',
                        transition: 'color 0.4s ease',
                    }}>
                        {countdownStr}
                    </div>

                    <div className="modal-actions">
                        <button
                            className="modal-btn-secondary"
                            onClick={onLogout}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <ArrowRightOnRectangleIcon style={{ width: 18, height: 18 }} />
                            Log Out
                        </button>
                        <button
                            className="modal-btn-primary"
                            onClick={onKeepAlive}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                        >
                            <ShieldCheckIcon style={{ width: 18, height: 18 }} />
                            I'm Still Here
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
