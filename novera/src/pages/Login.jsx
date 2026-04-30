import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import apiService from '../api/apiService';
import { showToast } from '../utils/noviraToast';
import {
    EnvelopeIcon,
    LockClosedIcon,
    ArrowRightOnRectangleIcon,
    GlobeAltIcon,
    SparklesIcon,
    CubeIcon,
    UserPlusIcon,
    EyeIcon,
    EyeSlashIcon
} from '@heroicons/react/24/outline';
import { FaFacebook, FaGoogle, FaWhatsapp, FaTwitter } from 'react-icons/fa';

export default function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const params = new URLSearchParams(location.search);
    const reason = params.get('reason');
    const reasonMsg = reason === 'timeout'
        ? 'Your session expired due to inactivity. Please log in again.'
        : reason === 'auth'
            ? 'Please log in to access this page.'
            : null;

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { data } = await apiService.post('/auth/login', { email, password });

            if (data.success) {
                localStorage.setItem('token', data.token);

                const firstName = data.user?.firstName || '';
                const lastName = data.user?.lastName || '';
                const fullName = data.user?.fullName || `${firstName} ${lastName}`.trim();
                localStorage.setItem('userName', fullName || 'Pro Designer');

                localStorage.setItem('lastActivityAt', Date.now().toString());
                navigate('/dashboard');
            } else {
                setError(data.error || 'Invalid email or password');
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
                            <h2>Novira Spatial</h2>
                            <p>Enter the next dimension of collaborative 3D design.</p>
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
                            <h1>Welcome Back</h1>
                            <p>Enter your credentials to access your workspace</p>
                        </div>

                        <form onSubmit={handleLogin} className="login-form">
                            {reasonMsg && (
                                <div className="auth-error-msg" style={{
                                    background: reason === 'timeout'
                                        ? 'rgba(239,68,68,0.08)'
                                        : 'rgba(43,111,212,0.08)',
                                    borderColor: reason === 'timeout' ? '#ef4444' : '#2b6fd4',
                                    color: reason === 'timeout' ? '#ef4444' : '#2b6fd4',
                                }}>
                                    {reasonMsg}
                                </div>
                            )}
                            {error && <div className="auth-error-msg">{error}</div>}
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
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
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

                            <div className="form-options">
                                <label className="remember-me">
                                    <input type="checkbox" disabled={loading} /> Remember me
                                </label>
                                <a
                                    className="forgot-password"
                                    href="mailto:support@novira.app?subject=Novira%20password%20reset"
                                    style={{ cursor: 'pointer' }}
                                >
                                    Forgot password?
                                </a>
                            </div>

                            <button type="submit" className="login-submit-btn" disabled={loading}>
                                {loading ? 'Signing In...' : 'Sign In'} <ArrowRightOnRectangleIcon className="btn-icon" />
                            </button>
                        </form>

                        <div className="social-divider">
                            <span>or continue with</span>
                        </div>

                        <div className="social-login-grid">
                            <button
                                type="button"
                                className="social-btn google"
                                aria-label="Google sign-in (coming soon)"
                                onClick={() => showToast('Google SSO is not configured yet — use email sign-in.', 'warn')}
                            >
                                <FaGoogle />
                            </button>
                            <button
                                type="button"
                                className="social-btn facebook"
                                aria-label="Facebook sign-in (coming soon)"
                                onClick={() => showToast('Facebook SSO is not configured yet — use email sign-in.', 'warn')}
                            >
                                <FaFacebook />
                            </button>
                            <button
                                type="button"
                                className="social-btn whatsapp"
                                aria-label="WhatsApp sign-in (coming soon)"
                                onClick={() => showToast('WhatsApp sign-in is not configured yet — use email sign-in.', 'warn')}
                            >
                                <FaWhatsapp />
                            </button>
                        </div>

                        <p className="signup-prompt">
                            Don&apos;t have an account? <Link to="/signup">Get Started</Link>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
