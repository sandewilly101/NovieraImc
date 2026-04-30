import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Background3D from '../components/common/Background3D';

import {
    UserIcon,
    ShieldCheckIcon,
    CircleStackIcon,
    Cog6ToothIcon,
    BellAlertIcon,
    CameraIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline';
import { userService } from '../api/apiService';
import ConfirmModal from '../components/common/ConfirmModal';

const SETTINGS_TAB_IDS = ['profile', 'plan', 'preferences', 'notifications', 'security'];

const SettingsPage = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const tabFromUrl = searchParams.get('tab');
    const [activeTab, setActiveTab] = useState(() =>
        SETTINGS_TAB_IDS.includes(tabFromUrl) ? tabFromUrl : 'profile'
    );
    const [userProfile, setUserProfile] = useState(null);
    const [previewAvatar, setPreviewAvatar] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const fileInputRef = useRef(null);

    useEffect(() => {
        const t = searchParams.get('tab');
        if (SETTINGS_TAB_IDS.includes(t)) setActiveTab(t);
    }, [searchParams]);

    const [formData, setFormData] = useState({
        username: '',
        displayName: '',
        bio: '',
        companyName: '',
        industry: '',
        website: '',
        publicProfileEnabled: true,

        theme: 'dark',
        language: 'en',
        timezone: 'UTC',
        sketchfabToken: '',

        notificationsEnabled: true,
        marketingEmailsEnabled: false
    });

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    const [emailData, setEmailData] = useState({
        newEmail: '',
        currentPassword: ''
    });
    const [emailError, setEmailError] = useState('');
    const [emailSuccess, setEmailSuccess] = useState(false);
    const [showEmailForm, setShowEmailForm] = useState(false);

    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false,
        emailCurrent: false
    });

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
    };

    useEffect(() => {
        fetchUserProfile();
    }, []);

    const fetchUserProfile = async () => {
        setLoading(true);
        try {
            const res = await userService.getProfile();
            const data = res.data;
            if (data.success) {
                setUserProfile(data.data);
                const linkedSketchfab = data.data.preferences?.providerTokens?.sketchfab || '';
                if (linkedSketchfab) localStorage.setItem('provider_sketchfab_token', linkedSketchfab);
                else localStorage.removeItem('provider_sketchfab_token');

                setFormData(prev => ({
                    ...prev,
                    username: data.data.username || '',
                    displayName: data.data.displayName || '',
                    bio: data.data.bio || '',
                    companyName: data.data.companyName || '',
                    industry: data.data.industry || '',
                    website: data.data.website || '',
                    publicProfileEnabled: data.data.publicProfileEnabled !== undefined ? data.data.publicProfileEnabled : true,
                    theme: data.data.theme || 'dark',
                    language: data.data.language || 'en',
                    timezone: data.data.timezone || 'UTC',
                    sketchfabToken: data.data.preferences?.providerTokens?.sketchfab || '',
                    notificationsEnabled: data.data.notificationsEnabled !== undefined ? data.data.notificationsEnabled : true,
                    marketingEmailsEnabled: data.data.marketingEmailsEnabled !== undefined ? data.data.marketingEmailsEnabled : false
                }));
            }
        } catch (error) {
            console.error('Error fetching user profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setSaveSuccess(false);
        setSaveError('');

        try {
            const currentPrefs = userProfile?.preferences || {};
            const providerTokens = { ...(currentPrefs.providerTokens || {}) };
            if (formData.sketchfabToken && formData.sketchfabToken.trim()) {
                providerTokens.sketchfab = formData.sketchfabToken.trim();
                localStorage.setItem('provider_sketchfab_token', formData.sketchfabToken.trim());
            } else {
                delete providerTokens.sketchfab;
                localStorage.removeItem('provider_sketchfab_token');
            }

            const profilePayload = {
                ...formData,
                preferences: {
                    ...currentPrefs,
                    providerTokens
                }
            };
            delete profilePayload.sketchfabToken;

            const res = await userService.updateProfile(profilePayload);
            const data = res.data;
            if (data.success) {
                setUserProfile(data.data);
                setSaveSuccess(true);
                setTimeout(() => setSaveSuccess(false), 3000);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            setSaveError(error.response?.data?.message || 'Failed to save settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handlePasswordInputChange = (e) => {
        const { name, value } = e.target;
        setPasswordData(prev => ({ ...prev, [name]: value }));
        setPasswordError('');
    };

    const handlePasswordUpdate = async () => {
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            setPasswordError('All fields are required');
            return;
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setPasswordError('New passwords do not match');
            return;
        }

        if (passwordData.newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        setSaving(true);
        try {
            const res = await userService.updatePassword({
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            if (res.data.success) {
                setPasswordSuccess(true);
                setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                setTimeout(() => setPasswordSuccess(false), 5000);
            }
        } catch (error) {
            console.error('Password update error:', error);
            setPasswordError(error.response?.data?.message || 'Failed to update password');
        } finally {
            setSaving(false);
            setShowConfirmModal(false);
        }
    };

    const handleEmailInputChange = (e) => {
        const { name, value } = e.target;
        setEmailData(prev => ({ ...prev, [name]: value }));
        setEmailError('');
    };

    const handleEmailUpdate = async (e) => {
        e.preventDefault();
        if (!emailData.newEmail || !emailData.currentPassword) {
            setEmailError('New email and current password are required');
            return;
        }

        setSaving(true);
        try {
            const res = await userService.updateEmail({
                newEmail: emailData.newEmail,
                currentPassword: emailData.currentPassword
            });

            if (res.data.success) {
                setEmailSuccess(true);
                setUserProfile(prev => ({ ...prev, email: emailData.newEmail }));
                setEmailData({ newEmail: '', currentPassword: '' });
                setTimeout(() => {
                    setEmailSuccess(false);
                    setShowEmailForm(false);
                }, 3000);
            }
        } catch (error) {
            console.error('Email update error:', error);
            setEmailError(error.response?.data?.message || 'Failed to update email');
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        setPreviewAvatar(objectUrl);

        setUploadingAvatar(true);
        const uploadData = new FormData();
        uploadData.append('avatar', file);

        try {
            const res = await userService.uploadAvatar(uploadData);
            const data = res.data;
            if (data.success) {
                setUserProfile(prev => ({
                    ...prev,
                    avatarUrl: data.avatarUrl
                }));
                window.dispatchEvent(new CustomEvent('ProfileUpdate', { detail: { avatarUrl: data.avatarUrl } }));
            }
        } catch (error) {
            console.error('Error uploading avatar:', error);
        } finally {
            setUploadingAvatar(false);

            URL.revokeObjectURL(objectUrl);
            setPreviewAvatar(null);

            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const tabs = [
        { id: 'profile', label: 'Public Profile', icon: <UserIcon style={{ width: 18 }} /> },
        { id: 'plan', label: 'Storage & Plan', icon: <CircleStackIcon style={{ width: 18 }} /> },
        { id: 'preferences', label: 'Preferences', icon: <Cog6ToothIcon style={{ width: 18 }} /> },
        { id: 'notifications', label: 'Notifications', icon: <BellAlertIcon style={{ width: 18 }} /> },
        { id: 'security', label: 'Security', icon: <ShieldCheckIcon style={{ width: 18 }} /> },
    ];

    const renderTabContent = () => {
        if (loading) {
            return (
                <div className="settings-loading">
                    <ArrowPathIcon className="animate-spin" style={{ width: 32, height: 32, color: 'var(--cyan)' }} />
                    <p>Loading your profile data...</p>
                </div>
            );
        }

        switch (activeTab) {
            case 'profile':
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="settings-panel">
                        <h3>Public Profile</h3>
                        <p className="panel-desc">Manage how you appear to the community.</p>

                        <div className="settings-avatar-section">
                            <div className="avatar-preview">
                                {previewAvatar || userProfile?.avatarUrl ? (
                                    <>
                                        <img src={previewAvatar || userProfile.avatarUrl} alt="Avatar" />
                                        {uploadingAvatar && (
                                            <div className="avatar-upload-overlay">
                                                <ArrowPathIcon className="animate-spin" style={{ width: 24, height: 24, color: '#fff' }} />
                                            </div>
                                        )}
                                    </>
                                ) : uploadingAvatar ? (
                                    <div className="avatar-placeholder">
                                        <ArrowPathIcon className="animate-spin" style={{ width: 24, height: 24, color: 'var(--cyan)' }} />
                                    </div>
                                ) : (
                                    <div className="avatar-placeholder">{userProfile?.username?.charAt(0).toUpperCase() || 'U'}</div>
                                )}
                                <button
                                    type="button"
                                    className="avatar-upload-btn"
                                    onClick={handleAvatarClick}
                                    disabled={uploadingAvatar}
                                >
                                    <CameraIcon style={{ width: 16 }} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/png, image/jpeg, image/webp"
                                    onChange={handleAvatarChange}
                                />
                            </div>
                            <div className="avatar-info">
                                <h4>{userProfile?.companyName || 'Profile Picture'}</h4>
                                <p>{userProfile?.companyName ? 'Studio Member' : 'JPG or PNG under 5MB'}</p>
                            </div>
                        </div>

                        <form className="settings-form" onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Username</label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleInputChange}
                                    placeholder="Unique handle"
                                />
                            </div>

                            <div className="form-group">
                                <label>Display Name</label>
                                <input
                                    type="text"
                                    name="displayName"
                                    value={formData.displayName}
                                    onChange={handleInputChange}
                                    placeholder="Your public name"
                                />
                            </div>
                            <div className="form-group">
                                <label>Professional Bio</label>
                                <textarea
                                    name="bio"
                                    value={formData.bio}
                                    onChange={handleInputChange}
                                    placeholder="Tell the community about your expertise..."
                                    rows="4"
                                ></textarea>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Company / Studio</label>
                                    <input
                                        type="text"
                                        name="companyName"
                                        value={formData.companyName}
                                        onChange={handleInputChange}
                                        placeholder="E.g., Novera Studios"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Industry Focus</label>
                                    <select name="industry" value={formData.industry} onChange={handleInputChange}>
                                        <option value="">Select an industry</option>
                                        <option value="Architecture">Architecture</option>
                                        <option value="Game_Development">Game Development</option>
                                        <option value="VFX_Animation">VFX & Animation</option>
                                        <option value="Product_Design">Product Design</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Portfolio / Website</label>
                                <input
                                    type="url"
                                    name="website"
                                    value={formData.website}
                                    onChange={handleInputChange}
                                    placeholder="https://..."
                                />
                            </div>

                            <div className="form-toggle-group">
                                <div className="toggle-info">
                                    <h4>Make Profile Public</h4>
                                    <p>Allow your profile to be discovered in the creator directory.</p>
                                </div>
                                <label className="swift-toggle">
                                    <input
                                        type="checkbox"
                                        name="publicProfileEnabled"
                                        checked={formData.publicProfileEnabled}
                                        onChange={handleInputChange}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div className="settings-actions">
                                <button type="submit" className="save-btn" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                                {saveSuccess && (
                                    <span className="save-success">
                                        <CheckCircleIcon style={{ width: 16 }} /> Saved successfully
                                    </span>
                                )}
                                {saveError && (
                                    <span className="form-error-msg" style={{ marginLeft: '12px' }}>
                                        <ExclamationTriangleIcon style={{ width: 16, display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                        {saveError}
                                    </span>
                                )}
                            </div>
                        </form>
                    </motion.div>
                );
            case 'security':
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="settings-panel">
                        <h3>Account & Security</h3>
                        <p className="panel-desc">Manage your password, connected accounts, and 2FA.</p>

                        <div className="security-card">
                            <div className="security-info">
                                <h4>Email Address</h4>
                                <p>{userProfile?.email || 'N/A'}</p>
                            </div>
                            <button className="outline-btn" onClick={() => setShowEmailForm(!showEmailForm)}>
                                {showEmailForm ? 'Cancel' : 'Change Email'}
                            </button>
                        </div>

                        {showEmailForm && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="security-form-container mb-6">
                                <form onSubmit={handleEmailUpdate} className="settings-form">
                                    <div className="form-group">
                                        <label>New Email Address</label>
                                        <input
                                            type="email"
                                            name="newEmail"
                                            value={emailData.newEmail}
                                            onChange={handleEmailInputChange}
                                            placeholder="new-email@example.com"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm with Password</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPasswords.emailCurrent ? "text" : "password"}
                                                name="currentPassword"
                                                value={emailData.currentPassword}
                                                onChange={handleEmailInputChange}
                                                placeholder="Enter your password to confirm"
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => togglePasswordVisibility('emailCurrent')}
                                            >
                                                {showPasswords.emailCurrent ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>

                                    {emailError && <div className="form-error-msg">{emailError}</div>}
                                    {emailSuccess && <div className="form-success-msg">Email updated successfully!</div>}

                                    <div className="settings-actions">
                                        <button type="submit" className="save-btn" disabled={saving || !emailData.newEmail}>
                                            {saving ? 'Updating...' : 'Update Email'}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        )}

                        <div className="security-section-title">Update Password</div>
                        <div className="security-form-container">
                            <form onSubmit={(e) => { e.preventDefault(); setShowConfirmModal(true); }} className="settings-form">
                                <div className="form-group">
                                    <label>Current Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showPasswords.current ? "text" : "password"}
                                            name="currentPassword"
                                            value={passwordData.currentPassword}
                                            onChange={handlePasswordInputChange}
                                            placeholder="••••••••"
                                        />
                                        <button
                                            type="button"
                                            className="password-toggle-btn"
                                            onClick={() => togglePasswordVisibility('current')}
                                        >
                                            {showPasswords.current ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label>New Password</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPasswords.new ? "text" : "password"}
                                                name="newPassword"
                                                value={passwordData.newPassword}
                                                onChange={handlePasswordInputChange}
                                                placeholder="Min. 8 characters"
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => togglePasswordVisibility('new')}
                                            >
                                                {showPasswords.new ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>Confirm New Password</label>
                                        <div className="password-input-wrapper">
                                            <input
                                                type={showPasswords.confirm ? "text" : "password"}
                                                name="confirmPassword"
                                                value={passwordData.confirmPassword}
                                                onChange={handlePasswordInputChange}
                                                placeholder="Confirm new password"
                                            />
                                            <button
                                                type="button"
                                                className="password-toggle-btn"
                                                onClick={() => togglePasswordVisibility('confirm')}
                                            >
                                                {showPasswords.confirm ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {passwordError && <div className="form-error-msg">{passwordError}</div>}
                                {passwordSuccess && <div className="form-success-msg">Password updated successfully!</div>}

                                <div className="settings-actions">
                                    <button type="submit" className="save-btn" disabled={saving || !passwordData.currentPassword}>
                                        {saving ? 'Updating...' : 'Update Password'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        <div className="security-card highlight mt-8">
                            <div className="security-info">
                                <h4>Two-Factor Authentication (2FA)</h4>
                                <p>Add an extra layer of security to your Novera account.</p>
                            </div>
                            <button className="primary-btn">{userProfile?.twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}</button>
                        </div>

                        <ConfirmModal
                            isOpen={showConfirmModal}
                            onClose={() => setShowConfirmModal(false)}
                            onConfirm={handlePasswordUpdate}
                            title="Confirm Password Change"
                            message="Are you sure you want to update your password? You will need to use your new password the next time you log in."
                            confirmText="Update Password"
                            type="danger"
                        />
                    </motion.div>
                );
            case 'plan':
                const plans = [
                    { id: 'free', name: 'Free', price: '0', storage: '4GB', duration: '1 Month' },
                    { id: 'advanced', name: 'Advanced', price: '80', storage: '20GB', duration: 'Monthly' },
                    { id: 'premium', name: 'Premium', price: '150', storage: '100GB', duration: 'Monthly' }
                ];

                const handlePlanUpgrade = async (planId) => {
                    setSaving(true);
                    try {
                        const res = await userService.updatePlan({ plan: planId });
                        if (res.data.success) {
                            setUserProfile(prev => ({
                                ...prev,
                                plan: res.data.data.plan,
                                storageLimitBytes: res.data.data.storageLimitBytes,
                                planExpiresAt: res.data.data.planExpiresAt
                            }));
                            setSaveSuccess(true);
                            setTimeout(() => setSaveSuccess(false), 3000);
                        }
                    } catch (error) {
                        console.error('Plan upgrade error:', error);
                    } finally {
                        setSaving(false);
                    }
                };

                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="settings-panel">
                        <h3>Storage & Plan</h3>
                        <p className="panel-desc">Choose a subscription that fits your professional workflow.</p>

                        <div className="plans-grid">
                            {plans.map(p => (
                                <div key={p.id} className={`plan-card ${userProfile?.plan === p.id ? 'active' : ''}`}>
                                    <div className="plan-header">
                                        <h4>{p.name}</h4>
                                        {userProfile?.plan === p.id && <span className="active-badge">Current Plan</span>}
                                    </div>
                                    <div className="plan-price">
                                        <span className="currency">TZS</span>
                                        <span className="amount">{p.price}</span>
                                        <span className="period">{p.duration}</span>
                                    </div>
                                    <ul className="plan-features">
                                        <li>{p.storage} Cloud Storage</li>
                                        <li>4K Blueprint Export</li>
                                        <li>Priority Support</li>
                                    </ul>
                                    <button
                                        className={`plan-btn ${userProfile?.plan === p.id ? 'current' : ''}`}
                                        disabled={userProfile?.plan === p.id || saving}
                                        onClick={() => handlePlanUpgrade(p.id)}
                                    >
                                        {userProfile?.plan === p.id ? 'Active' : `Upgrade to ${p.name}`}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="usage-stats-grid mt-8">
                            <div className="usage-card">
                                <div className="usage-header">
                                    <h4>Storage Quota</h4>
                                    {userProfile?.plan === 'free' && (userProfile?.storageUsedBytes / userProfile?.storageLimitBytes) > 0.9 && (
                                        <span className="usage-warning">Low Storage! Upgrade to Advanced</span>
                                    )}
                                </div>
                                <div className="usage-bar-track">
                                    <div className="usage-bar-fill" style={{ width: `${Math.min(((userProfile?.storageUsedBytes || 0) / (userProfile?.storageLimitBytes || 4294967296)) * 100, 100)}%` }}></div>
                                </div>
                                <div className="usage-labels">
                                    <span>{((userProfile?.storageUsedBytes || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB used</span>
                                    <span>{((userProfile?.storageLimitBytes || 4294967296) / (1024 * 1024 * 1024)).toFixed(2)} GB limit</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 'preferences':
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="settings-panel">
                        <h3>Application Preferences</h3>
                        <p className="panel-desc">Customize your workspace and local settings.</p>

                        <form className="settings-form" onSubmit={handleSave}>
                            <div className="form-group">
                                <label>Interface Theme</label>
                                <select name="theme" value={formData.theme} onChange={handleInputChange}>
                                    <option value="system">System Default</option>
                                    <option value="dark">Dark Theme (Recommended)</option>
                                    <option value="light">Light Theme</option>
                                </select>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>Language</label>
                                    <select name="language" value={formData.language} onChange={handleInputChange}>
                                        <option value="en">English (US)</option>
                                        <option value="es">Español</option>
                                        <option value="fr">Français</option>
                                        <option value="ja">日本語 (Japanese)</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Timezone</label>
                                    <select name="timezone" value={formData.timezone} onChange={handleInputChange}>
                                        <option value="UTC">UTC</option>
                                        <option value="America/New_York">Eastern Time (ET)</option>
                                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                        <option value="Europe/London">London (GMT)</option>
                                    </select>
                                </div>
                            </div>
                            <div className="form-group">
                                <label>Sketchfab Personal Token (optional)</label>
                                <input
                                    type="password"
                                    name="sketchfabToken"
                                    value={formData.sketchfabToken}
                                    onChange={handleInputChange}
                                    placeholder="Use your own Sketchfab token for entitlement checks"
                                    autoComplete="off"
                                />
                                <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: 6 }}>
                                    Connect your own provider account token so downloadable assets can be validated against your entitlement.
                                </small>
                            </div>
                            <div className="settings-actions">
                                <button type="submit" className="save-btn" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Preferences'}
                                </button>
                                {saveSuccess && (
                                    <span className="save-success">
                                        <CheckCircleIcon style={{ width: 16 }} /> Saved successfully
                                    </span>
                                )}
                                {saveError && (
                                    <span className="form-error-msg" style={{ marginLeft: '12px' }}>
                                        <ExclamationTriangleIcon style={{ width: 16, display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                        {saveError}
                                    </span>
                                )}
                            </div>
                        </form>
                    </motion.div>
                );
            case 'notifications':
                return (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="settings-panel">
                        <h3>Notifications</h3>
                        <p className="panel-desc">Control how Novera communicates with you.</p>

                        <form className="settings-form" onSubmit={handleSave}>
                            <div className="form-toggle-group">
                                <div className="toggle-info">
                                    <h4>System & Engagement Alerts</h4>
                                    <p>Receive notifications for successful renders, blueprint sales, and mentions.</p>
                                </div>
                                <label className="swift-toggle">
                                    <input
                                        type="checkbox"
                                        name="notificationsEnabled"
                                        checked={formData.notificationsEnabled}
                                        onChange={handleInputChange}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                            <div className="form-toggle-group">
                                <div className="toggle-info">
                                    <h4>Marketing & News</h4>
                                    <p>Receive weekly digest emails and feature announcements.</p>
                                </div>
                                <label className="swift-toggle">
                                    <input
                                        type="checkbox"
                                        name="marketingEmailsEnabled"
                                        checked={formData.marketingEmailsEnabled}
                                        onChange={handleInputChange}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div className="settings-actions">
                                <button type="submit" className="save-btn" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Settings'}
                                </button>
                                {saveSuccess && (
                                    <span className="save-success">
                                        <CheckCircleIcon style={{ width: 16 }} /> Saved successfully
                                    </span>
                                )}
                                {saveError && (
                                    <span className="form-error-msg" style={{ marginLeft: '12px' }}>
                                        <ExclamationTriangleIcon style={{ width: 16, display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
                                        {saveError}
                                    </span>
                                )}
                            </div>
                        </form>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="page active" id="page-settings">
            <Background3D />

            <div className="settings-container">
                <div className="settings-header">
                    <h1 style={{ color: '#048fbd', letterSpacing: '0.05px', fontWeight: '600', }}>Account <span style={{ color: '#03abb7', textDecoration: 'underline' }}>Settings</span></h1>
                    <p>Manage your professional profile, billing, and system preferences.</p>
                </div>

                <div className="settings-layout">

                    <div className="settings-sidebar">
                        <div className="settings-nav">
                            {tabs.map(tab => (
                                <button
                                    type="button"
                                    key={tab.id}
                                    className={`settings-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab(tab.id);
                                        if (tab.id === 'profile') {
                                            setSearchParams({}, { replace: true });
                                        } else {
                                            setSearchParams({ tab: tab.id }, { replace: true });
                                        }
                                    }}
                                >
                                    {tab.icon}
                                    <span>{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="settings-content">
                        {renderTabContent()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
