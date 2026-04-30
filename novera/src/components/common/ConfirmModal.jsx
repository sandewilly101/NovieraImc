import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExclamationTriangleIcon, XMarkIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    type = 'danger'
}) {
    const isDanger = type === 'danger';

    React.useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="modal-overlay" role="dialog" aria-modal="true" aria-label={title} onClick={onClose}>
                    <motion.div
                        className="modal-container confirm-modal"
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button className="modal-close" onClick={onClose} aria-label="Close">
                            <XMarkIcon className="w-6 h-6" />
                        </button>

                        <div className="modal-content text-center">
                            <div className={`modal-icon-wrapper ${isDanger ? 'danger' : 'info'}`}>
                                {isDanger ? (
                                    <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                                ) : (
                                    <InformationCircleIcon className="w-8 h-8 text-blue-500" />
                                )}
                            </div>

                            <div className="modal-header">
                                <h2>{title}</h2>
                                <p>{message}</p>
                            </div>

                            <div className="modal-actions mt-6">
                                <button className="modal-btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button
                                    className={`modal-btn-primary ${isDanger ? 'danger-btn' : ''}`}
                                    onClick={() => { onConfirm(); onClose(); }}
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
