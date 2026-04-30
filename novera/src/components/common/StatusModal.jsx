import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, InformationCircleIcon, StarIcon } from '@heroicons/react/24/outline';

const StatusModal = ({ isOpen, onClose, type = 'error', title, message }) => {
    const config = {
        success: {
            icon: CheckCircleIcon,
            color: 'var(--green)',
            bg: 'rgba(34, 197, 94, 0.1)',
            shadow: '0 0 32px rgba(34, 197, 94, 0.2)',
            borderColor: 'rgba(34, 197, 94, 0.2)'
        },
        error: {
            icon: ExclamationCircleIcon,
            color: 'var(--red)',
            bg: 'rgba(239, 68, 68, 0.1)',
            shadow: '0 0 32px rgba(239, 68, 68, 0.2)',
            borderColor: 'rgba(239, 68, 68, 0.2)'
        },
        info: {
            icon: InformationCircleIcon,
            color: 'var(--blue)',
            bg: 'rgba(59, 130, 246, 0.1)',
            shadow: '0 0 32px rgba(59, 130, 246, 0.2)',
            borderColor: 'rgba(59, 130, 246, 0.2)'
        },
        star: {
            icon: StarIcon,
            color: '#F59E0B',
            bg: 'rgba(245, 158, 11, 0.1)',
            shadow: '0 0 32px rgba(245, 158, 11, 0.2)',
            borderColor: 'rgba(245, 158, 11, 0.2)'
        }
    };

    const theme = config[type] || config.error;
    const Icon = theme.icon;

    React.useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title || type} style={{ zIndex: 9999 }} onClick={onClose}>
                <motion.div
                    className="modal-container"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxWidth: '400px',
                        padding: '0',
                        overflow: 'hidden',
                        borderRadius: '24px',
                        background: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(20px)',
                        border: `1px solid ${theme.borderColor}`,
                        boxShadow: `0 24px 64px rgba(0,0,0,0.15), ${theme.shadow}`
                    }}
                >
                    <div style={{ padding: '32px 24px', textAlign: 'center' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '24px',
                            background: theme.bg,
                            color: theme.color,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            position: 'relative'
                        }}>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.2 }}
                            >
                                <Icon className="w-12 h-12" />
                            </motion.div>
                        </div>

                        <motion.h2
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: 'var(--ink)',
                                marginBottom: '12px',
                                fontFamily: "'Poppins', sans-serif"
                            }}
                        >
                            {title || (type === 'error' ? 'Something went wrong' : 'Success')}
                        </motion.h2>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            style={{
                                fontSize: '15px',
                                color: 'var(--silver)',
                                lineHeight: '1.6',
                                marginBottom: '32px'
                            }}
                        >
                            {message}
                        </motion.p>

                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={onClose}
                            style={{
                                width: '100%',
                                height: '54px',
                                borderRadius: '16px',
                                background: 'var(--ink)',
                                color: 'white',
                                fontWeight: '600',
                                fontSize: '15px',
                                border: 'none',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                            }}
                        >
                            Got it
                        </motion.button>
                    </div>
                </motion.div>
            </div>
            )}
        </AnimatePresence>
    );
};

export default StatusModal;
