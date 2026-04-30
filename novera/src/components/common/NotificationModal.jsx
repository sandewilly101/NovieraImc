import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    XMarkIcon,
    BellIcon,
    CheckIcon,
    XMarkIcon as CloseIcon,
    UserGroupIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

const NotificationModal = ({ isOpen, onClose, notifications, onAccept, onDecline, onMarkAsRead }) => {
    const unreadCount = notifications.filter(n => !n.isRead).length;

    React.useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen, onClose]);

    return (
        <AnimatePresence>
            {isOpen && (
            <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Notifications" style={{ zIndex: 9999 }} onClick={onClose}>
                <motion.div
                    className="modal-container"
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        maxWidth: '500px',
                        width: '90%',
                        maxHeight: '80vh',
                        padding: '0',
                        overflow: 'hidden',
                        borderRadius: '28px',
                        background: 'rgba(255, 255, 255, 0.9)',
                        backdropFilter: 'blur(24px)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        boxShadow: '0 32px 80px rgba(0,0,0,0.15)',
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >

                    <div style={{
                        padding: '24px 32px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        background: 'rgba(255, 255, 255, 0.5)',
                        borderBottom: '1px solid rgba(0,0,0,0.05)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                background: 'var(--blue)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white'
                            }}>
                                <BellIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: '700', color: 'var(--ink)', margin: 0 }}>Notifications</h2>
                                {unreadCount > 0 && (
                                    <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: '600' }}>
                                        {unreadCount} new updates
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                border: 'none',
                                background: 'rgba(0,0,0,0.05)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'all 0.2s'
                            }}
                            className="hover:bg-red-50 hover:text-red-500"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '16px'
                    }} className="custom-scrollbar">
                        {notifications.length === 0 ? (
                            <div style={{ padding: '60px 40px', textAlign: 'center' }}>
                                <div style={{
                                    width: '64px',
                                    height: '64px',
                                    background: 'var(--off-white)',
                                    borderRadius: '50%',
                                    margin: '0 auto 20px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'var(--silver)'
                                }}>
                                    <BellIcon className="w-8 h-8 opacity-30" />
                                </div>
                                <h3 style={{ color: 'var(--ink)', marginBottom: '8px' }}>All caught up!</h3>
                                <p style={{ color: 'var(--silver)', fontSize: '14px' }}>No new notifications to show right now.</p>
                            </div>
                        ) : (
                            notifications.map((notif, idx) => (
                                <motion.div
                                    key={notif.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    style={{
                                        background: notif.isRead ? 'rgba(0,0,0,0.02)' : 'white',
                                        borderRadius: '20px',
                                        padding: '20px',
                                        border: '1px solid ' + (notif.isRead ? 'transparent' : 'rgba(59, 130, 246, 0.1)'),
                                        boxShadow: notif.isRead ? 'none' : '0 4px 20px rgba(0,0,0,0.04)',
                                        position: 'relative'
                                    }}
                                >
                                    <div style={{ display: 'flex', gap: '16px' }}>
                                        <div style={{
                                            width: '44px',
                                            height: '44px',
                                            borderRadius: '14px',
                                            background: notif.type === 'PROJECT_INVITE' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                            color: notif.type === 'PROJECT_INVITE' ? 'var(--green)' : 'var(--blue)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            shrink: 0
                                        }}>
                                            {notif.type === 'PROJECT_INVITE' ? <UserGroupIcon className="w-6 h-6" /> : <SparklesIcon className="w-5 h-5" />}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <h4 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: '600', color: 'var(--ink)' }}>{notif.title}</h4>
                                                {!notif.isRead && <div className="pulse-dot" style={{ width: '8px', height: '8px', background: 'var(--blue)', borderRadius: '50%' }}></div>}
                                            </div>
                                            <p style={{ margin: 0, fontSize: '14px', color: 'var(--silver)', lineHeight: '1.5' }}>{notif.message}</p>

                                            {notif.type === 'PROJECT_INVITE' && !notif.isRead && (
                                                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                                                    <button
                                                        onClick={() => onAccept(notif)}
                                                        style={{
                                                            flex: 1,
                                                            height: '40px',
                                                            borderRadius: '12px',
                                                            background: 'var(--ink)',
                                                            color: 'white',
                                                            border: 'none',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                        className="hover:scale-[1.02] active:scale-[0.98] transition-transform"
                                                    >
                                                        <CheckIcon className="w-4 h-4" /> Accept
                                                    </button>
                                                    <button
                                                        onClick={() => onMarkAsRead(notif.id)}
                                                        style={{
                                                            flex: 1,
                                                            height: '40px',
                                                            borderRadius: '12px',
                                                            background: 'rgba(0,0,0,0.05)',
                                                            color: 'var(--ink)',
                                                            border: 'none',
                                                            fontSize: '13px',
                                                            fontWeight: '600',
                                                            cursor: 'pointer',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            gap: '6px'
                                                        }}
                                                        className="hover:bg-red-50 hover:text-red-500 transition-colors"
                                                    >
                                                        <CloseIcon className="w-4 h-4" /> Decline
                                                    </button>
                                                </div>
                                            )}

                                            <div style={{ marginTop: '12px', fontSize: '11px', color: 'var(--silver)', opacity: 0.7 }}>
                                                {new Date(notif.createdAt).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div style={{
                            padding: '16px 24px',
                            background: 'rgba(255, 255, 255, 0.5)',
                            borderTop: '1px solid rgba(0,0,0,0.05)',
                            textAlign: 'center'
                        }}>
                            <button
                                onClick={() => notifications.forEach(n => !n.isRead && onMarkAsRead(n.id))}
                                style={{
                                    fontSize: '13px',
                                    color: 'var(--blue)',
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    fontWeight: '600'
                                }}
                            >
                                Mark all as read
                            </button>
                        </div>
                    )}
                </motion.div>
            </div>
            )}
        </AnimatePresence>
    );
};

export default NotificationModal;
