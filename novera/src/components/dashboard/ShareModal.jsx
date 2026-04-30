import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XMarkIcon, UsersIcon, UserPlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { projectService } from '../../api/apiService';

export default function ShareModal({ isOpen, onClose, project }) {
    const [username, setUsername] = useState('');
    const [role, setRole] = useState('editor');
    const [statusData, setStatusData] = useState({ loading: false, error: null, success: null });

    const handleInvite = async (e) => {
        e.preventDefault();
        if (!username.trim()) return;

        try {
            setStatusData({ loading: true, error: null, success: null });
            await projectService.inviteUser(project.id, { username, role });
            setStatusData({ loading: false, error: null, success: `Invite sent to ${username}!` });
            setUsername('');
        } catch (error) {
            setStatusData({
                loading: false,
                error: error.response?.data?.error || 'Failed to send invite',
                success: null
            });
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="modal-overlay">
                <motion.div
                    className="modal-container"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                >
                    <button className="modal-close" onClick={onClose}>
                        <XMarkIcon className="zeicon" style={{ width: 24, height: 24 }} />
                    </button>

                    <div className="modal-content">
                        <motion.div
                            initial={{ x: 50, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -50, opacity: 0 }}
                        >
                            <div className="modal-header">
                                <div className="modal-icon-wrapper success" style={{ background: 'rgba(56, 189, 248, 0.1)' }}>
                                    <UsersIcon className="zeicon text-blue" style={{ width: 32, height: 32 }} />
                                </div>
                                <h2>Share Project</h2>
                                <p>Invite collaborators to <strong>{project?.name}</strong>.</p>
                            </div>

                            <div style={{ padding: '0 24px' }}>
                                {statusData.success && (
                                    <div style={{ background: 'rgba(34, 197, 94, 0.1)', color: 'var(--green)', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)' }}></span>
                                        {statusData.success}
                                    </div>
                                )}

                                {statusData.error && (
                                    <div style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--red)', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--red)' }}></span>
                                        {statusData.error}
                                    </div>
                                )}
                            </div>

                            <form onSubmit={handleInvite} className="modal-form">
                                <div style={{ display: 'flex', gap: '12px', width: '100%', marginBottom: '8px' }}>
                                    <div style={{ position: 'relative', flex: 1 }}>
                                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontWeight: 'bold' }}>@</span>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            placeholder="username"
                                            className="modal-input"
                                            disabled={statusData.loading}
                                            style={{ paddingLeft: '36px' }}
                                        />
                                    </div>
                                    <div style={{ position: 'relative', width: '130px' }}>
                                        <select
                                            value={role}
                                            onChange={(e) => setRole(e.target.value)}
                                            disabled={statusData.loading}
                                            style={{
                                                width: '100%',
                                                cursor: 'pointer',
                                                appearance: 'none',
                                                WebkitAppearance: 'none',
                                                padding: '14px 36px 14px 16px',
                                                background: 'rgba(43, 111, 212, 0.04)',
                                                border: '1px solid rgba(43, 111, 212, 0.1)',
                                                borderRadius: '24px',
                                                color: 'var(--blue)',
                                                fontWeight: '600',
                                                fontSize: '12px',
                                                letterSpacing: '0.3px',
                                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                                outline: 'none',
                                                boxShadow: 'inset 0 2px 4px rgba(255,255,255,0.5), 0 2px 8px rgba(43, 111, 212, 0.04)'
                                            }}
                                            onMouseOver={(e) => { e.target.style.borderColor = 'rgba(43, 111, 212, 0.3)'; e.target.style.background = 'rgba(43, 111, 212, 0.08)'; e.target.style.transform = 'translateY(-1px)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(255,255,255,0.5), 0 4px 12px rgba(43, 111, 212, 0.08)'; }}
                                            onMouseOut={(e) => { e.target.style.borderColor = 'rgba(43, 111, 212, 0.1)'; e.target.style.background = 'rgba(43, 111, 212, 0.04)'; e.target.style.transform = 'translateY(0)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(255,255,255,0.5), 0 2px 8px rgba(43, 111, 212, 0.04)'; }}
                                            onFocus={(e) => { e.target.style.borderColor = 'var(--blue)'; e.target.style.boxShadow = '0 0 0 3px var(--blue-pale)'; }}
                                            onBlur={(e) => { e.target.style.borderColor = 'rgba(43, 111, 212, 0.1)'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(255,255,255,0.5), 0 2px 8px rgba(43, 111, 212, 0.04)'; }}
                                        >
                                            <option value="editor">✎  Editor</option>
                                            <option value="viewer">👁  Viewer</option>
                                        </select>
                                        <div style={{
                                            position: 'absolute',
                                            right: '14px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            pointerEvents: 'none',
                                            color: 'var(--blue)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            opacity: 0.8
                                        }}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="6 9 12 15 18 9"></polyline>
                                            </svg>
                                        </div>
                                    </div>
                                </div>
                                <p style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '20px', textAlign: 'center' }}>
                                    They will receive an invitation in their notification center.
                                </p>

                                <button
                                    type="submit"
                                    className="modal-btn-primary"
                                    disabled={!username.trim() || statusData.loading}
                                    style={{ width: '100%', height: '56px', minHeight: '56px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                                >
                                    {statusData.loading ? 'Sending...' : (
                                        <>
                                            <UserPlusIcon className="zeicon" style={{ width: 20, height: 20 }} />
                                            Send Invite
                                        </>
                                    )}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
