import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheckIcon,
    KeyIcon,
    DevicePhoneMobileIcon,
    EnvelopeIcon,
    EyeIcon,
    EyeSlashIcon,
    ArrowPathIcon,
    LockClosedIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    SparklesIcon,
    FingerPrintIcon,
    BoltIcon,
    XMarkIcon,
    ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckSolid, CheckBadgeIcon } from '@heroicons/react/24/solid';
import { userService, securityService } from '../api/apiService';
import ConfirmModal from '../components/common/ConfirmModal';

const getPasswordStrength = (pw) => {
    if (!pw) return { score: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    const map = [
        { label: 'Too Short', color: '#ef4444' },
        { label: 'Weak', color: '#f97316' },
        { label: 'Fair', color: '#eab308' },
        { label: 'Good', color: '#22c55e' },
        { label: 'Strong', color: '#10b981' },
        { label: 'Very Strong', color: '#059669' },
    ];
    return { score, ...map[score] };
};

const SecurityScore = ({ score, has2FA }) => {
    const levelColor = score >= 80 ? '#059669' : score >= 60 ? '#d97706' : '#ef4444';
    const levelLabel = score >= 80 ? 'High Security' : score >= 60 ? 'Medium Security' : 'Low Security';
    const circumference = 2 * Math.PI * 40;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="sp-score-wrap">
            <div className="sp-score-ring-container">
                <svg viewBox="0 0 100 100" className="sp-score-svg">
                    <circle cx="50" cy="50" r="40" className="sp-score-track" />
                    <motion.circle
                        cx="50" cy="50" r="40"
                        className="sp-score-fill"
                        style={{ stroke: levelColor, strokeDasharray: circumference }}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset: offset }}
                        transition={{ duration: 1.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    />
                </svg>
                <div className="sp-score-inner">
                    <motion.span
                        className="sp-score-num"
                        style={{ color: levelColor }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                    >
                        {score}
                    </motion.span>
                    <span className="sp-score-den">/100</span>
                </div>
            </div>
            <div className="sp-score-info">
                <div className="sp-score-level" style={{ color: levelColor }}>{levelLabel}</div>
                <p className="sp-score-hint">
                    {has2FA ? 'All protection layers are active.' : 'Enable 2FA to boost your score by +30.'}
                </p>
                <div className="sp-score-checks">
                    {[
                        { label: 'Password', active: true },
                        { label: '2FA', active: !!has2FA },
                        { label: 'Email', active: true },
                    ].map(({ label, active }) => (
                        <div key={label} className={`sp-check-pill ${active ? 'sp-check-pill-on' : 'sp-check-pill-off'}`}>
                            {active
                                ? <CheckBadgeIcon style={{ width: 10, height: 10 }} />
                                : <span style={{ width: 10, height: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8 }}>○</span>
                            }
                            {label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Alert = ({ type, children }) => (
    <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className={`sp-alert sp-alert-${type}`}
    >
        {type === 'error'
            ? <ExclamationCircleIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
            : <CheckCircleIcon style={{ width: 14, height: 14, flexShrink: 0 }} />}
        <span>{children}</span>
    </motion.div>
);

const PasswordField = ({ label, name, value, onChange, show, onToggle, autoComplete }) => (
    <div className="sp-field">
        <label className="sp-label">{label}</label>
        <div className="sp-input-wrap">
            <input
                type={show ? 'text' : 'password'}
                name={name}
                value={value}
                onChange={onChange}
                className="sp-input"
                placeholder="••••••••"
                autoComplete={autoComplete}
                required
            />
            <button type="button" className="sp-eye" onClick={onToggle} tabIndex={-1}>
                {show ? <EyeSlashIcon style={{ width: 15, height: 15 }} /> : <EyeIcon style={{ width: 15, height: 15 }} />}
            </button>
        </div>
    </div>
);

const TwoFAModal = ({ isOpen, onClose, onSuccess }) => {
    const [step, setStep] = useState('loading');
    const [qrCode, setQrCode] = useState('');
    const [manualKey, setManualKey] = useState('');
    const [token, setToken] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (!isOpen) { setStep('loading'); setToken(''); setError(''); return; }
        const setup = async () => {
            setStep('loading');
            try {
                const res = await securityService.setup2FA();
                if (res.data.success) {
                    setQrCode(res.data.data.qrCodeDataUrl);
                    setManualKey(res.data.data.manualEntryKey);
                    setStep('scan');
                }
            } catch (e) {
                setError(e.response?.data?.message || 'Failed to generate 2FA setup. Please try again.');
                setStep('error');
            }
        };
        setup();
    }, [isOpen]);

    const handleVerify = async (e) => {
        e.preventDefault();
        if (!token || token.length !== 6) { setError('Enter the 6-digit code from your authenticator app.'); return; }
        setSaving(true); setError('');
        try {
            const res = await securityService.verify2FA({ token });
            if (res.data.success) {
                if (res.data.token) localStorage.setItem('token', res.data.token);
                setStep('done');
                setTimeout(() => { onSuccess(); onClose(); }, 1800);
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Invalid code. Please try again.');
        } finally { setSaving(false); }
    };

    const copyKey = () => {
        navigator.clipboard.writeText(manualKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    return (
        <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                className="sp-modal"
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="sp-modal-header">
                    <div className="sp-modal-title-wrap">
                        <div className="sp-section-icon" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                            <DevicePhoneMobileIcon style={{ width: 14, height: 14, color: '#059669' }} />
                        </div>
                        <div>
                            <div className="sp-modal-title">Enable Two-Factor Authentication</div>
                            <div className="sp-modal-sub">Scan with Google Authenticator, Authy or any TOTP app</div>
                        </div>
                    </div>
                    <button className="sp-modal-close" onClick={onClose}><XMarkIcon style={{ width: 16, height: 16 }} /></button>
                </div>

                <div className="sp-modal-body">
                    {step === 'loading' && (
                        <div className="sp-modal-center">
                            <ArrowPathIcon className="animate-spin" style={{ width: 28, height: 28, color: '#10b981' }} />
                            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 12 }}>Generating your secure key…</p>
                        </div>
                    )}

                    {step === 'error' && (
                        <Alert type="error">{error}</Alert>
                    )}

                    {step === 'scan' && (
                        <div className="sp-2fa-steps">

                            <div className="sp-2fa-step">
                                <div className="sp-2fa-step-num">1</div>
                                <div>
                                    <div className="sp-2fa-step-title">Scan QR Code</div>
                                    <div className="sp-2fa-step-desc">Open your authenticator app and scan this QR code.</div>
                                    <div className="sp-qr-wrap">
                                        <img src={qrCode} alt="2FA QR Code" className="sp-qr-img" />
                                    </div>
                                </div>
                            </div>

                            <div className="sp-manual-key-wrap">
                                <span className="sp-manual-key-label">Can't scan? Enter this key manually:</span>
                                <div className="sp-manual-key">
                                    <code className="sp-manual-key-code">{manualKey}</code>
                                    <button className="sp-copy-btn" onClick={copyKey}>
                                        {copied ? <CheckCircleIcon style={{ width: 13, height: 13, color: '#059669' }} /> : <ClipboardDocumentIcon style={{ width: 13, height: 13 }} />}
                                        {copied ? 'Copied!' : 'Copy'}
                                    </button>
                                </div>
                            </div>

                            <div className="sp-2fa-step">
                                <div className="sp-2fa-step-num">2</div>
                                <div style={{ flex: 1 }}>
                                    <div className="sp-2fa-step-title">Enter Verification Code</div>
                                    <div className="sp-2fa-step-desc">Enter the 6-digit code shown in your authenticator app to confirm setup.</div>
                                    <form onSubmit={handleVerify} className="sp-fields" style={{ marginTop: 12 }}>
                                        <div className="sp-field">
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                value={token}
                                                onChange={e => { setToken(e.target.value.replace(/\D/g, '')); setError(''); }}
                                                className="sp-input sp-input-plain sp-totp-input"
                                                placeholder="000000"
                                                autoFocus
                                            />
                                        </div>
                                        <AnimatePresence>
                                            {error && <Alert type="error">{error}</Alert>}
                                        </AnimatePresence>
                                        <button type="submit" className="sp-btn-primary" disabled={saving || token.length !== 6}>
                                            {saving
                                                ? <ArrowPathIcon className="animate-spin" style={{ width: 12, height: 12 }} />
                                                : <CheckCircleIcon style={{ width: 12, height: 12 }} />}
                                            {saving ? 'Verifying…' : 'Activate 2FA'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="sp-modal-center">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 260, damping: 20 }}
                                className="sp-success-icon"
                            >
                                <CheckCircleIcon style={{ width: 32, height: 32, color: '#059669' }} />
                            </motion.div>
                            <p className="sp-success-text">Two-Factor Authentication Activated!</p>
                            <p className="sp-success-sub">Your account is now much harder to compromise.</p>
                        </div>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   2FA Disable Modal
───────────────────────────────────────────── */
const DisableTwoFAModal = ({ isOpen, onClose, onSuccess }) => {
    const [password, setPassword] = useState('');
    const [token, setToken] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) { setPassword(''); setToken(''); setError(''); }
    }, [isOpen]);

    const handleDisable = async (e) => {
        e.preventDefault();
        setSaving(true); setError('');
        try {
            const res = await securityService.disable2FA({ password, token });
            if (res.data.success) {
                if (res.data.token) localStorage.setItem('token', res.data.token);
                onSuccess();
                onClose();
            }
        } catch (e) {
            setError(e.response?.data?.message || 'Failed to disable 2FA. Please try again.');
        } finally { setSaving(false); }
    };

    if (!isOpen) return null;

    return (
        <div className="sp-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <motion.div
                className="sp-modal"
                initial={{ opacity: 0, scale: 0.94, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            >
                <div className="sp-modal-header">
                    <div className="sp-modal-title-wrap">
                        <div className="sp-section-icon" style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                            <LockClosedIcon style={{ width: 14, height: 14, color: '#dc2626' }} />
                        </div>
                        <div>
                            <div className="sp-modal-title">Disable Two-Factor Authentication</div>
                            <div className="sp-modal-sub">You'll need your password and current TOTP code</div>
                        </div>
                    </div>
                    <button className="sp-modal-close" onClick={onClose}><XMarkIcon style={{ width: 16, height: 16 }} /></button>
                </div>
                <div className="sp-modal-body">
                    <div className="sp-alert sp-alert-error" style={{ marginBottom: 20 }}>
                        <ExclamationCircleIcon style={{ width: 14, height: 14, flexShrink: 0 }} />
                        <span>Disabling 2FA will reduce your account's security score by 30 points.</span>
                    </div>
                    <form onSubmit={handleDisable} className="sp-fields">
                        <div className="sp-field">
                            <label className="sp-label">Current Password</label>
                            <div className="sp-input-wrap">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    className="sp-input"
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    required
                                />
                                <button type="button" className="sp-eye" onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                                    {showPw ? <EyeSlashIcon style={{ width: 15, height: 15 }} /> : <EyeIcon style={{ width: 15, height: 15 }} />}
                                </button>
                            </div>
                        </div>
                        <div className="sp-field">
                            <label className="sp-label">Authenticator Code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                maxLength={6}
                                value={token}
                                onChange={e => { setToken(e.target.value.replace(/\D/g, '')); setError(''); }}
                                className="sp-input sp-input-plain sp-totp-input"
                                placeholder="000000"
                                required
                            />
                        </div>
                        <AnimatePresence>
                            {error && <Alert type="error">{error}</Alert>}
                        </AnimatePresence>
                        <div className="sp-form-actions">
                            <button
                                type="submit"
                                className="sp-btn-danger"
                                disabled={saving || !password || token.length !== 6}
                            >
                                {saving
                                    ? <ArrowPathIcon className="animate-spin" style={{ width: 12, height: 12 }} />
                                    : <LockClosedIcon style={{ width: 12, height: 12 }} />}
                                {saving ? 'Disabling…' : 'Disable 2FA'}
                            </button>
                            <button type="button" className="sp-btn-secondary" onClick={onClose}>Cancel</button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
const SecurityPage = () => {
    const [loading, setLoading] = useState(true);
    const [userProfile, setUserProfile] = useState(null);
    const [securityStatus, setSecurityStatus] = useState(null);
    const [saving, setSaving] = useState(false);

    const [passwordData, setPasswordData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [showEmailForm, setShowEmailForm] = useState(false);
    const [emailData, setEmailData] = useState({ newEmail: '', currentPassword: '' });
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState(false);

    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false, emailCurrent: false });

    // 2FA modals
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [show2FADisable, setShow2FADisable] = useState(false);

    useEffect(() => { fetchAll(); }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [profileRes, statusRes] = await Promise.allSettled([
                userService.getProfile(),
                securityService.getStatus()
            ]);
            if (profileRes.status === 'fulfilled' && profileRes.value.data.success) {
                setUserProfile(profileRes.value.data.data);
            }
            if (statusRes.status === 'fulfilled' && statusRes.value.data.success) {
                setSecurityStatus(statusRes.value.data.data);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const togglePw = (k) => setShowPasswords(p => ({ ...p, [k]: !p[k] }));

    const handlePasswordInputChange = (e) => {
        setPasswordData(p => ({ ...p, [e.target.name]: e.target.value }));
        setPasswordError('');
    };
    const handleEmailInputChange = (e) => {
        setEmailData(p => ({ ...p, [e.target.name]: e.target.value }));
        setEmailError('');
    };

    const handlePasswordUpdate = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('Passwords don\'t match'); setShowConfirmModal(false); return;
        }
        setSaving(true); setPasswordError('');
        try {
            const res = await userService.updatePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });
            if (res.data.success) {
                if (res.data.token) localStorage.setItem('token', res.data.token);
                setPasswordSuccess(true);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => setPasswordSuccess(false), 3500);
            }
        } catch (e) {
            setPasswordError(e.response?.data?.message || 'Failed to update password');
        } finally { setSaving(false); setShowConfirmModal(false); }
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault(); setSaving(true); setEmailError('');
        try {
            const res = await userService.updateEmail({ newEmail: emailData.newEmail, currentPassword: emailData.currentPassword });
            if (res.data.success) {
                if (res.data.token) localStorage.setItem('token', res.data.token);
                setEmailSuccess(true);
                setUserProfile(p => ({ ...p, email: emailData.newEmail }));
                setEmailData({ newEmail: '', currentPassword: '' });
                setTimeout(() => { setEmailSuccess(false); setShowEmailForm(false); }, 3000);
            }
        } catch (e) {
            setEmailError(e.response?.data?.message || 'Failed to update email');
        } finally { setSaving(false); }
    };

    const handle2FASuccess = () => {
        setUserProfile(p => ({ ...p, twoFactorEnabled: true }));
        setSecurityStatus(s => ({ ...s, twoFactorEnabled: true, securityScore: Math.min((s?.securityScore || 0) + 30, 100) }));
    };
    const handle2FADisableSuccess = () => {
        setUserProfile(p => ({ ...p, twoFactorEnabled: false }));
        setSecurityStatus(s => ({ ...s, twoFactorEnabled: false, securityScore: Math.max((s?.securityScore || 0) - 30, 0) }));
    };

    const strength = getPasswordStrength(passwordData.newPassword);
    const secScore = securityStatus?.securityScore ?? (userProfile?.twoFactorEnabled ? 92 : 58);
    const has2FA = userProfile?.twoFactorEnabled ?? securityStatus?.twoFactorEnabled ?? false;

    if (loading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 400, gap: 14 }}>
                <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(16,185,129,0.25)' }}>
                    <ArrowPathIcon className="animate-spin" style={{ width: 24, height: 24, color: '#fff' }} />
                </div>
                <p style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    Initializing Security Vault…
                </p>
            </div>
        );
    }

    return (
        <>
            <style>{`
                .sp-page { padding: 36px 32px 64px; min-height: 100%; font-family: 'Inter','Segoe UI',system-ui,sans-serif; color: #111827; position: relative; }
                @media (max-width:680px) { .sp-page { padding: 20px 14px 48px; } }

                /* Header */
                .sp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 36px; flex-wrap: wrap; }
                .sp-header-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: linear-gradient(135deg,#ecfdf5,#d1fae5); border: 1px solid #6ee7b7; border-radius: 100px; font-size: 10px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #065f46; margin-bottom: 12px; }
                .sp-header-badge svg { width: 11px; height: 11px; }
                .sp-header-title { font-size: 26px; font-weight: 800; letter-spacing: -0.035em; line-height: 1.15; margin: 0 0 8px; color: #0f172a; }
                .sp-header-title span { background: linear-gradient(135deg,#059669 0%,#10b981 60%,#34d399 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
                .sp-header-sub { font-size: 12px; color: #6b7280; max-width: 380px; line-height: 1.75; }

                /* Score */
                .sp-score-wrap { display: flex; align-items: center; gap: 18px; background: #fff; border: 1px solid #e5e7eb; border-radius: 20px; padding: 20px 24px; box-shadow: 0 4px 20px rgba(0,0,0,.06); flex-shrink: 0; min-width: 240px; }
                @media (max-width:680px) { .sp-score-wrap { min-width: unset; width: 100%; } .sp-header { flex-direction: column; } }
                .sp-score-ring-container { position: relative; width: 78px; height: 78px; flex-shrink: 0; }
                .sp-score-svg { width: 100%; height: 100%; transform: rotate(-90deg); }
                .sp-score-track { fill: none; stroke: #f3f4f6; stroke-width: 7; }
                .sp-score-fill { fill: none; stroke-width: 7; stroke-linecap: round; }
                .sp-score-inner { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                .sp-score-num { font-size: 22px; font-weight: 900; letter-spacing: -0.05em; line-height: 1; }
                .sp-score-den { font-size: 9px; color: #9ca3af; font-weight: 600; }
                .sp-score-level { font-size: 13px; font-weight: 700; margin-bottom: 3px; }
                .sp-score-hint { font-size: 10px; color: #9ca3af; line-height: 1.5; max-width: 140px; margin-bottom: 10px; }
                .sp-score-checks { display: flex; gap: 5px; flex-wrap: wrap; }
                .sp-check-pill { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 100px; font-size: 9px; font-weight: 700; letter-spacing: .06em; }
                .sp-check-pill-on { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }
                .sp-check-pill-off { background: #f9fafb; border: 1px solid #e5e7eb; color: #9ca3af; }

                /* Grid & Cards */
                .sp-grid { display: grid; gap: 18px; }
                .sp-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 20px; padding: 28px 32px; box-shadow: 0 2px 12px rgba(0,0,0,.04); position: relative; overflow: hidden; transition: border-color .25s,box-shadow .25s; }
                .sp-card:hover { border-color: #d1d5db; box-shadow: 0 6px 24px rgba(0,0,0,.07); }
                .sp-card-accent { border-color: #a7f3d0; background: linear-gradient(135deg,#f0fdf4 0%,#fff 60%); }
                .sp-card-accent:hover { border-color: #6ee7b7; }
                .sp-card-stripe { position: absolute; top: 0; left: 0; right: 0; height: 3px; border-radius: 20px 20px 0 0; }
                .sp-deco { position: absolute; bottom: -16px; right: -16px; opacity: .04; pointer-events: none; color: #10b981; }
                @media (max-width:600px) { .sp-card { padding: 20px 16px; } }

                /* Section title */
                .sp-section-title { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
                .sp-section-icon { width: 30px; height: 30px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
                .sp-section-label { font-size: 10px; font-weight: 800; letter-spacing: .18em; text-transform: uppercase; color: #6b7280; }
                .sp-divider { height: 1px; background: #f3f4f6; margin: 26px 0; }

                /* Email row */
                .sp-email-row { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; padding: 16px 18px; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 14px; }
                .sp-email-label-text { font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #9ca3af; margin-bottom: 3px; }
                .sp-email-value { font-size: 13px; font-weight: 600; color: #111827; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
                .sp-verified-badge { display: inline-flex; align-items: center; gap: 3px; font-size: 9px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase; color: #059669; background: #ecfdf5; border: 1px solid #6ee7b7; border-radius: 100px; padding: 2px 7px; }
                .sp-verified-badge svg { width: 9px; height: 9px; }
                .sp-btn-ghost { padding: 8px 16px; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; font-size: 10px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: #374151; cursor: pointer; transition: all .2s; white-space: nowrap; }
                .sp-btn-ghost:hover { background: #f9fafb; border-color: #d1d5db; color: #111827; }
                .sp-email-panel { margin-top: 14px; overflow: hidden; background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 16px; padding: 22px; }

                /* Fields */
                .sp-fields { display: grid; gap: 14px; }
                .sp-fields-2 { grid-template-columns: 1fr 1fr; }
                @media (max-width:600px) { .sp-fields-2 { grid-template-columns: 1fr; } }
                .sp-label { display: block; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #6b7280; margin-bottom: 7px; }
                .sp-input-wrap { position: relative; }
                .sp-input { width: 100%; box-sizing: border-box; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; padding: 11px 40px 11px 13px; font-size: 13px; color: #111827; outline: none; font-family: inherit; transition: all .22s; }
                .sp-input::placeholder { color: #d1d5db; }
                .sp-input:focus { border-color: #10b981; box-shadow: 0 0 0 3px rgba(16,185,129,.1); }
                .sp-input-plain { padding-right: 13px; }
                .sp-totp-input { font-size: 22px; font-weight: 700; letter-spacing: .3em; text-align: center; }
                .sp-eye { position: absolute; right: 11px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #9ca3af; display: flex; align-items: center; transition: color .18s; padding: 3px; }
                .sp-eye:hover { color: #10b981; }

                /* Strength */
                .sp-strength { margin-top: 7px; }
                .sp-strength-track { height: 3px; background: #f3f4f6; border-radius: 100px; overflow: hidden; margin-bottom: 4px; }
                .sp-strength-fill { height: 100%; border-radius: 100px; transition: width .4s, background .4s; }
                .sp-strength-label { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }

                /* Alerts */
                .sp-alert { display: flex; align-items: center; gap: 8px; font-size: 11px; font-weight: 600; padding: 10px 14px; border-radius: 10px; }
                .sp-alert-error { background: #fef2f2; border: 1px solid #fecaca; color: #dc2626; }
                .sp-alert-success { background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; }

                /* Buttons */
                .sp-btn-primary { display: inline-flex; align-items: center; justify-content: center; gap: 7px; padding: 11px 26px; background: linear-gradient(135deg,#10b981 0%,#059669 100%); border: none; border-radius: 10px; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #fff; cursor: pointer; box-shadow: 0 3px 14px rgba(16,185,129,.3),inset 0 1px 0 rgba(255,255,255,.15); transition: all .22s; }
                .sp-btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(16,185,129,.4); }
                .sp-btn-primary:active { transform: scale(.97); }
                .sp-btn-primary:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }
                .sp-btn-secondary { display: inline-flex; align-items: center; gap: 7px; padding: 11px 20px; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 10px; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #6b7280; cursor: pointer; transition: all .2s; }
                .sp-btn-secondary:hover { border-color: #d1d5db; color: #374151; }
                .sp-btn-danger { display: inline-flex; align-items: center; gap: 7px; padding: 11px 26px; background: linear-gradient(135deg,#ef4444,#dc2626); border: none; border-radius: 10px; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #fff; cursor: pointer; box-shadow: 0 3px 14px rgba(239,68,68,.25); transition: all .22s; }
                .sp-btn-danger:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(239,68,68,.35); }
                .sp-btn-danger:disabled { opacity: .5; cursor: not-allowed; transform: none; }
                .sp-form-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 4px; }
                .sp-form-hint { font-size: 10px; color: #9ca3af; }

                /* 2FA card */
                .sp-2fa-row { display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
                .sp-2fa-title { font-size: 16px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 5px; }
                .sp-2fa-active-badge { display: inline-flex; align-items: center; gap: 4px; font-size: 9px; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; padding: 3px 9px; border-radius: 100px; background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; }
                .sp-2fa-desc { font-size: 12px; color: #6b7280; line-height: 1.65; max-width: 380px; }
                .sp-2fa-enable-btn { padding: 12px 26px; background: linear-gradient(135deg,#10b981,#059669); border: none; border-radius: 12px; font-size: 10px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; color: #fff; cursor: pointer; white-space: nowrap; box-shadow: 0 4px 16px rgba(16,185,129,.3); transition: all .22s; display: inline-flex; align-items: center; gap: 7px; }
                .sp-2fa-enable-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 22px rgba(16,185,129,.4); }
                .sp-2fa-disable-btn { padding: 12px 26px; background: #fff; border: 1.5px solid #e5e7eb; border-radius: 12px; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; color: #374151; cursor: pointer; white-space: nowrap; transition: all .22s; display: inline-flex; align-items: center; gap: 7px; }
                .sp-2fa-disable-btn:hover { border-color: #fca5a5; color: #dc2626; background: #fef2f2; }
                .sp-feature-grid { display: grid; grid-template-columns: repeat(auto-fit,minmax(170px,1fr)); gap: 10px; }
                .sp-feature-item { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; font-size: 11px; font-weight: 600; color: #374151; transition: border-color .2s; }
                .sp-card-accent .sp-feature-item { background: rgba(255,255,255,.7); }
                .sp-feature-item:hover { border-color: #a7f3d0; }
                .sp-feature-icon { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: #ecfdf5; }
                .sp-feature-icon svg { width: 13px; height: 13px; color: #10b981; }

                /* Modal */
                .sp-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.45); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 16px; }
                .sp-modal { background: #fff; border-radius: 24px; box-shadow: 0 24px 60px rgba(0,0,0,.2); width: 100%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
                .sp-modal-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; padding: 24px 28px 0; }
                .sp-modal-title-wrap { display: flex; align-items: flex-start; gap: 12px; }
                .sp-modal-title { font-size: 16px; font-weight: 700; color: #111827; }
                .sp-modal-sub { font-size: 11px; color: #9ca3af; margin-top: 2px; }
                .sp-modal-close { background: none; border: none; cursor: pointer; color: #9ca3af; transition: color .2s; padding: 4px; border-radius: 6px; display: flex; }
                .sp-modal-close:hover { color: #374151; background: #f3f4f6; }
                .sp-modal-body { padding: 20px 28px 28px; }
                .sp-modal-center { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 32px 0; gap: 12px; text-align: center; }
                .sp-success-icon { width: 64px; height: 64px; border-radius: 50%; background: #ecfdf5; border: 2px solid #a7f3d0; display: flex; align-items: center; justify-content: center; }
                .sp-success-text { font-size: 16px; font-weight: 700; color: #111827; }
                .sp-success-sub { font-size: 12px; color: #6b7280; }

                /* 2FA steps */
                .sp-2fa-steps { display: flex; flex-direction: column; gap: 20px; }
                .sp-2fa-step { display: flex; align-items: flex-start; gap: 14px; }
                .sp-2fa-step-num { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg,#10b981,#059669); color: #fff; font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 2px; }
                .sp-2fa-step-title { font-size: 13px; font-weight: 700; color: #111827; margin-bottom: 3px; }
                .sp-2fa-step-desc { font-size: 11px; color: #6b7280; line-height: 1.6; }
                .sp-qr-wrap { display: flex; justify-content: flex-start; margin-top: 12px; }
                .sp-qr-img { width: 160px; height: 160px; border-radius: 12px; border: 1px solid #e5e7eb; padding: 4px; background: #fff; }

                /* Manual key */
                .sp-manual-key-wrap { background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 12px; padding: 14px; }
                .sp-manual-key-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em; color: #9ca3af; display: block; margin-bottom: 8px; }
                .sp-manual-key { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
                .sp-manual-key-code { font-family: 'Fira Code','Courier New',monospace; font-size: 11px; letter-spacing: .12em; color: #374151; background: #fff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 6px 10px; word-break: break-all; flex: 1; }
                .sp-copy-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 10px; font-weight: 700; color: #374151; cursor: pointer; transition: all .2s; white-space: nowrap; }
                .sp-copy-btn:hover { border-color: #a7f3d0; color: #059669; }
            `}</style>

            <div className="sp-page">

                <div className="sp-header">
                    <div>
                        <div className="sp-header-badge">
                            <ShieldCheckSolid style={{ width: 11, height: 11 }} />
                            Security Center
                        </div>
                        <h1 className="sp-header-title">Account <span>Protection</span></h1>
                        <p className="sp-header-sub">
                            Manage credentials, authentication layers, and protect your workspace from unauthorized access.
                        </p>
                    </div>
                    <SecurityScore score={secScore} has2FA={has2FA} />
                </div>

                <div className="sp-grid">

                    <motion.div
                        className="sp-card"
                        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="sp-card-stripe" style={{ background: 'linear-gradient(90deg,#10b981,#059669,#6ee7b7)' }} />
                        <EnvelopeIcon className="sp-deco" style={{ width: 130, height: 130 }} />

                        <div className="sp-section-title">
                            <div className="sp-section-icon" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                <EnvelopeIcon style={{ width: 14, height: 14, color: '#059669' }} />
                            </div>
                            <span className="sp-section-label">Identity Verification</span>
                        </div>
                        <div className="sp-email-row">
                            <div>
                                <div className="sp-email-label-text">Primary Email Address</div>
                                <div className="sp-email-value">
                                    {userProfile?.email || 'Not set'}
                                    <span className="sp-verified-badge">
                                        <CheckBadgeIcon style={{ width: 9, height: 9 }} /> Verified
                                    </span>
                                </div>
                            </div>
                            <button className="sp-btn-ghost" onClick={() => setShowEmailForm(v => !v)}>
                                {showEmailForm ? 'Cancel' : 'Modify Email'}
                            </button>
                        </div>

                        <AnimatePresence>
                            {showEmailForm && (
                                <motion.div
                                    key="email-panel"
                                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                    animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                    style={{ overflow: 'hidden' }}
                                >
                                    <div className="sp-email-panel">
                                        <form onSubmit={handleEmailUpdate} className="sp-fields">
                                            <div className="sp-field">
                                                <label className="sp-label">New Email Address</label>
                                                <input type="email" name="newEmail" value={emailData.newEmail} onChange={handleEmailInputChange} className="sp-input sp-input-plain" placeholder="you@newdomain.com" required />
                                            </div>
                                            <PasswordField label="Confirm with Current Password" name="currentPassword" value={emailData.currentPassword} onChange={handleEmailInputChange} show={showPasswords.emailCurrent} onToggle={() => togglePw('emailCurrent')} autoComplete="current-password" />
                                            <AnimatePresence>
                                                {emailError && <Alert type="error">{emailError}</Alert>}
                                                {emailSuccess && <Alert type="success">Email updated successfully.</Alert>}
                                            </AnimatePresence>
                                            <div className="sp-form-actions">
                                                <button type="submit" className="sp-btn-primary" disabled={saving || !emailData.newEmail}>
                                                    {saving ? <ArrowPathIcon className="animate-spin" style={{ width: 12, height: 12 }} /> : <CheckCircleIcon style={{ width: 12, height: 12 }} />}
                                                    {saving ? 'Updating…' : 'Save New Email'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="sp-divider" />

                        <div className="sp-section-title">
                            <div className="sp-section-icon" style={{ background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                                <LockClosedIcon style={{ width: 14, height: 14, color: '#2563eb' }} />
                            </div>
                            <span className="sp-section-label">Access Credentials</span>
                        </div>

                        <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="sp-fields">
                            <PasswordField label="Current Password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordInputChange} show={showPasswords.current} onToggle={() => togglePw('current')} autoComplete="current-password" />
                            <div className="sp-fields sp-fields-2">
                                <div>
                                    <PasswordField label="New Password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordInputChange} show={showPasswords.new} onToggle={() => togglePw('new')} autoComplete="new-password" />
                                    {passwordData.newPassword && (
                                        <div className="sp-strength">
                                            <div className="sp-strength-track"><div className="sp-strength-fill" style={{ width: `${(strength.score / 5) * 100}%`, background: strength.color }} /></div>
                                            <span className="sp-strength-label" style={{ color: strength.color }}>{strength.label}</span>
                                        </div>
                                    )}
                                </div>
                                <PasswordField label="Confirm New Password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordInputChange} show={showPasswords.confirm} onToggle={() => togglePw('confirm')} autoComplete="new-password" />
                            </div>
                            <AnimatePresence>
                                {passwordError && <Alert type="error">{passwordError}</Alert>}
                                {passwordSuccess && <Alert type="success">Password updated and encrypted successfully.</Alert>}
                            </AnimatePresence>
                            <div className="sp-form-actions">
                                <button type="submit" className="sp-btn-primary" disabled={saving || !passwordData.currentPassword}>
                                    {saving ? <ArrowPathIcon className="animate-spin" style={{ width: 12, height: 12 }} /> : <KeyIcon style={{ width: 12, height: 12 }} />}
                                    {saving ? 'Encrypting…' : 'Update Password'}
                                </button>
                                <span className="sp-form-hint">Requires a confirmation step</span>
                            </div>
                        </form>
                    </motion.div>

                    <motion.div
                        className="sp-card sp-card-accent"
                        initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="sp-card-stripe" style={{ background: 'linear-gradient(90deg,#059669,#10b981,#34d399)' }} />
                        <FingerPrintIcon className="sp-deco" style={{ width: 130, height: 130 }} />

                        <div className="sp-section-title">
                            <div className="sp-section-icon" style={{ background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                                <DevicePhoneMobileIcon style={{ width: 14, height: 14, color: '#059669' }} />
                            </div>
                            <span className="sp-section-label">Advanced Safeguards</span>
                        </div>

                        <div className="sp-2fa-row">
                            <div>
                                <div className="sp-2fa-title">
                                    Two-Factor Authentication
                                    {has2FA && (
                                        <span className="sp-2fa-active-badge">
                                            <BoltIcon style={{ width: 9, height: 9 }} /> Active
                                        </span>
                                    )}
                                </div>
                                <p className="sp-2fa-desc">
                                    Protect your account with a one-time password (TOTP) from your authenticator app.
                                    Drastically reduces the risk of unauthorized access even if your password is compromised.
                                </p>
                            </div>
                            {has2FA ? (
                                <button className="sp-2fa-disable-btn" onClick={() => setShow2FADisable(true)}>
                                    <ShieldCheckIcon style={{ width: 13, height: 13 }} /> Manage / Disable
                                </button>
                            ) : (
                                <button className="sp-2fa-enable-btn" onClick={() => setShow2FASetup(true)}>
                                    <SparklesIcon style={{ width: 13, height: 13 }} /> Enable 2FA
                                </button>
                            )}
                        </div>

                        <div className="sp-divider" />

                        <div className="sp-feature-grid">
                            {[
                                { icon: ShieldCheckIcon, label: 'TOTP App Support' },
                                { icon: BoltIcon, label: 'Instant breach lock' },
                                { icon: SparklesIcon, label: 'Recovery code backup' },
                            ].map(({ icon: Icon, label }) => (
                                <div className="sp-feature-item" key={label}>
                                    <div className="sp-feature-icon"><Icon /></div>
                                    {label}
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>

            <ConfirmModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={handlePasswordUpdate}
                title="Confirm Password Change"
                message="You'll be required to sign in again on all devices after this change. Continue?"
                confirmText="Yes, Update Password"
                type="danger"
            />

            <AnimatePresence>
                {show2FASetup && (
                    <TwoFAModal
                        isOpen={show2FASetup}
                        onClose={() => setShow2FASetup(false)}
                        onSuccess={handle2FASuccess}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {show2FADisable && (
                    <DisableTwoFAModal
                        isOpen={show2FADisable}
                        onClose={() => setShow2FADisable(false)}
                        onSuccess={handle2FADisableSuccess}
                    />
                )}
            </AnimatePresence>
        </>
    );
};

export default SecurityPage;
