import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../api/apiService';
import { showToast } from '../utils/noviraToast';
import {
    EnvelopeIcon,
    LockClosedIcon,
    UserIcon,
    ArrowRightOnRectangleIcon,
    GlobeAltIcon,
    SparklesIcon,
    CubeIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline';
import { FaFacebook, FaGoogle, FaWhatsapp } from 'react-icons/fa';

export default function SignupPage() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }

        setLoading(true);

        try {
            const { data } = await apiService.post('/auth/register', { fullName: name, email, password });

            if (data.success) {
                localStorage.setItem('token', data.token);

                const registeredName = data.user?.fullName || name;
                localStorage.setItem('userName', registeredName || 'Pro Designer');
                navigate('/dashboard');
            } else {
                setError(data.error || (data.errors && data.errors[0].msg) || 'Registration failed');
            }
        } catch (err) {
            const msg = err.response?.data?.error || 'Server connection failed. Is the backend running?';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">

                <div className="login-visual-pane">
                    <div className="visual-content">
                        <div className="login-3d-box-wrapper">
                            <div className="box-3d-large">
                                <div className="box-face face-front"></div>
                                <div className="box-face face-back"></div>
                                <div className="box-face face-right"></div>
                                <div className="box-face face-left"></div>
                                <div className="box-face face-top"></div>
                                <div className="box-face face-bottom"></div>
                            </div>
                        </div>
                        <div className="floating-icons">
                            <CubeIcon className="float-icon icon-1" />
                            <SparklesIcon className="float-icon icon-2" />
                            <GlobeAltIcon className="float-icon icon-3" />
                        </div>
                        <div className="visual-text">
                            <h2>Join Novira</h2>
                            <p>Create your account and start designing in the 4th dimension.</p>
                        </div>
                    </div>
                    <div className="visual-orb orb-1"></div>
                    <div className="visual-orb orb-2"></div>
                </div>

                <div className="login-form-pane">
                    <div className="login-form-card">
                        <div className="form-header">
                            <div className="login-logo">
                                <div className="nav-logo-icon">
                                    <div className="logo-layer logo-layer-1"></div>
                                    <div className="logo-layer logo-layer-2"></div>
                                    <div className="logo-layer logo-layer-3"></div>
                                </div>
                            </div>
                            <h1>Create Account</h1>
                            <p>Get started with a free workspace today</p>
                        </div>

                        <form onSubmit={handleSignup} className="login-form">
                            {error && <div className="auth-error-msg">{error}</div>}
                            <div className="input-group">
                                <label><UserIcon className="input-icon" /> Full Name</label>
                                <input
                                    type="text"
                                    placeholder="Enter your name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="input-group">
                                <label><EnvelopeIcon className="input-icon" /> Email Address</label>
                                <input
                                    type="email"
                                    placeholder="name@company.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="input-group">
                                <label><LockClosedIcon className="input-icon" /> Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="Create a password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                        aria-pressed={showPassword}
                                    >
                                        {showPassword ? <EyeSlashIcon className="toggle-icon" /> : <EyeIcon className="toggle-icon" />}
                                    </button>
                                </div>
                            </div>

                            <div className="input-group">
                                <label><LockClosedIcon className="input-icon" /> Confirm Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                                        aria-pressed={showConfirmPassword}
                                    >
                                        {showConfirmPassword ? <EyeSlashIcon className="toggle-icon" /> : <EyeIcon className="toggle-icon" />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="login-submit-btn" disabled={loading}>
                                {loading ? 'Creating Account...' : 'Create Workspace'} <ArrowRightOnRectangleIcon className="btn-icon" />
                            </button>
                        </form>

                        <div className="social-divider">
                            <span>or join with</span>
                        </div>

                        <div className="social-login-grid">
                            <button
                                type="button"
                                className="social-btn google"
                                aria-label="Google sign-up (coming soon)"
                                onClick={() => showToast('Google SSO is not configured yet — use email sign-up.', 'warn')}
                            >
                                <FaGoogle />
                            </button>
                            <button
                                type="button"
                                className="social-btn facebook"
                                aria-label="Facebook sign-up (coming soon)"
                                onClick={() => showToast('Facebook SSO is not configured yet — use email sign-up.', 'warn')}
                            >
                                <FaFacebook />
                            </button>
                            <button
                                type="button"
                                className="social-btn whatsapp"
                                aria-label="WhatsApp sign-up (coming soon)"
                                onClick={() => showToast('WhatsApp sign-up is not configured yet — use email sign-up.', 'warn')}
                            >
                                <FaWhatsapp />
                            </button>
                        </div>

                        <p className="signup-prompt">
                            Already have a workspace? <Link to="/login">Sign In</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
