import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, RocketLaunchIcon } from '@heroicons/react/24/outline';
import { PROJECT_TEMPLATES } from '../../data/projectTemplates';

export default function ProjectModal({ isOpen, onClose, onCreate }) {
    const [name, setName] = useState('');
    const [step, setStep] = useState(1);
    const [selectedTemplateId, setSelectedTemplateId] = useState(null);

    const handleNext = (e) => {
        e.preventDefault();
        if (name.trim()) setStep(2);
    };

    const handleCreate = () => {
        onCreate(name, selectedTemplateId);
        onClose();
        setStep(1);
        setName('');
        setSelectedTemplateId(null);
    };

    React.useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') {
                onClose();
                setStep(1);
                setName('');
                setSelectedTemplateId(null);
            }
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Create Project" onClick={onClose}>
                <motion.div
                    className="modal-container"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <button className="modal-close" onClick={onClose}>
                        <XMarkIcon className="w-6 h-6" />
                    </button>

                    <div className="modal-content">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -50, opacity: 0 }}
                            >
                                <div className="modal-header">
                                    <div className="modal-icon-wrapper-hero">
                                        <div className="modal-hero-3d">
                                            <div className="hero-face hero-front"></div>
                                            <div className="hero-face hero-back"></div>
                                            <div className="hero-face hero-right"></div>
                                            <div className="hero-face hero-left"></div>
                                            <div className="hero-face hero-top"></div>
                                            <div className="hero-face hero-bottom"></div>
                                        </div>
                                    </div>
                                    <h2>Name your workspace</h2>
                                    <p>Give your new spatial design a name to get started.</p>
                                </div>
                                <form onSubmit={handleNext} className="modal-form">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Launching Event"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="modal-input"
                                        required
                                    />
                                    <button type="submit" className="modal-btn-primary" style={{ width: '100%', height: '56px', minHeight: '56px' }}>
                                        Continue
                                    </button>
                                </form>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ x: 50, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -50, opacity: 0 }}
                                className="modal-confirmation"
                            >
                                <div className="modal-header">
                                    <div className="modal-icon-wrapper success">
                                        <RocketLaunchIcon className="w-8 h-8 text-green-500" />
                                    </div>
                                    <h2>Choose a template</h2>
                                    <p>
                                        Starting <strong>{name}</strong>. Pick a 3D starter or blank — you can change the
                                        scene anytime in the editor.
                                    </p>
                                </div>
                                <div
                                    style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                                        gap: 10,
                                        marginBottom: 16,
                                        maxHeight: 280,
                                        overflowY: 'auto',
                                    }}
                                >
                                    <button
                                        type="button"
                                        onClick={() => setSelectedTemplateId(null)}
                                        style={{
                                            padding: 12,
                                            borderRadius: 10,
                                            border: selectedTemplateId === null ? '2px solid #22c55e' : '1px solid #e2e8f0',
                                            background: selectedTemplateId === null ? '#f0fdf4' : '#fff',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, fontSize: 13 }}>Blank</div>
                                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Default empty scene from server</div>
                                    </button>
                                    {PROJECT_TEMPLATES.map((t) => (
                                        <button
                                            key={t.id}
                                            type="button"
                                            onClick={() => setSelectedTemplateId(t.id)}
                                            style={{
                                                padding: 12,
                                                borderRadius: 10,
                                                border:
                                                    selectedTemplateId === t.id ? '2px solid #22c55e' : '1px solid #e2e8f0',
                                                background: selectedTemplateId === t.id ? '#f0fdf4' : '#fff',
                                                textAlign: 'left',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.name}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4, lineHeight: 1.35 }}>
                                                {t.description}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                                <div className="modal-actions">
                                    <button className="modal-btn-secondary" onClick={() => setStep(1)}>
                                        Go Back
                                    </button>
                                    <button className="modal-btn-primary success" onClick={handleCreate}>
                                        Create &amp; open
                                    </button>
                                </div>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            </div>
            )}
        </AnimatePresence>
    );
}
