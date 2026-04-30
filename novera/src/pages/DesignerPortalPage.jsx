import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import apiService from '../api/apiService';
import {
    BuildingOffice2Icon,
    CubeIcon,
    SparklesIcon,
    LightBulbIcon,
    HomeIcon,
    SwatchIcon,
    CloudArrowUpIcon,
    CheckBadgeIcon,
    UsersIcon,
    ChartBarIcon,
    ArrowTrendingUpIcon,
    StarIcon,
    InboxIcon,
    ClockIcon,
    CreditCardIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';

const categories = [
    { id: 'hall', icon: BuildingOffice2Icon, label: 'Exhibition Hall' },
    { id: 'booth', icon: CubeIcon, label: 'Booth Pack' },
    { id: 'stage', icon: SparklesIcon, label: 'Stage Design' },
    { id: 'light', icon: LightBulbIcon, label: 'Lighting Set' },
    { id: 'furniture', icon: HomeIcon, label: 'Furniture Pack' },
    { id: 'brand', icon: SwatchIcon, label: 'Branding Kit' }
];

const CreatorToken = () => (
    <div className="token-3d-wrapper">
        <div className="token-3d-container">
            <div className="creator-token">
                <div className="token-face front">
                    <SparklesIcon style={{ width: 40, height: 40, color: 'var(--cyan)' }} />
                </div>
                <div className="token-face back">
                    <CheckBadgeIcon style={{ width: 40, height: 40, color: 'var(--cyan)' }} />
                </div>
                <div className="token-ring"></div>
            </div>
        </div>
    </div>
);

function mulberry32(a) {
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const Background3D = () => {
    const objects = useMemo(() => {
        const rnd = mulberry32(0x9e3779b9);
        return [...Array(12)].map((_, i) => ({
            id: i,
            type: ['cube', 'ring', 'fragment'][i % 3],
            top: `${rnd() * 100}%`,
            left: `${rnd() * 100}%`,
            delay: `${rnd() * 10}s`,
            duration: `${20 + rnd() * 20}s`,
            size: 0.5 + rnd() * 1.5
        }));
    }, []);

    return (
        <div className="dp-bg-elements">
            {objects.map(obj => (
                <div
                    key={obj.id}
                    className={`dp-floating-obj dp-obj-${obj.type}`}
                    style={{
                        top: obj.top,
                        left: obj.left,
                        animationDelay: obj.delay,
                        animationDuration: obj.duration,
                        transform: `scale(${obj.size})`
                    }}
                />
            ))}
        </div>
    );
};

export default function DesignerPortalPage() {
    const [activeCat, setActiveCat] = useState('hall');
    const [profileData, setProfileData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [profileError, setProfileError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        technicalDescription: '',
        marketValue: 49,
        licenseProtocol: 'Commercial Standard'
    });
    const [submitStatus, setSubmitStatus] = useState('');

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        setProfileError('');
        try {
            const { data: json } = await apiService.get('/designer/profile');
            if (json.success) {
                setProfileData(json.data);
            } else {
                setProfileError(json.message || 'Could not load creator profile.');
            }
        } catch (err) {
            console.error('Error fetching designer profile:', err);
            setProfileError('Could not load creator metrics. Check your connection and try again.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchProfile();
    }, [fetchProfile]);

    const handleFormSubmit = async () => {
        setSubmitStatus('submitting...');
        try {
            const { data: json } = await apiService.post('/designer/blueprints', {
                ...formData,
                category: activeCat
            });
            if (json.success) {
                setSubmitStatus('Success!');
                setFormData({ title: '', technicalDescription: '', marketValue: 49, licenseProtocol: 'Commercial Standard' });

                const { data: profileJson } = await apiService.get('/designer/profile');
                if (profileJson.success) setProfileData(profileJson.data);

                setTimeout(() => setSubmitStatus(''), 3000);
            } else {
                setSubmitStatus('Failed: ' + json.message);
                setTimeout(() => setSubmitStatus(''), 3000);
            }
        } catch (err) {
            console.error(err);
            setSubmitStatus('Error submitting.');
            setTimeout(() => setSubmitStatus(''), 3000);
        }
    };

    const pendingCredits = parseFloat(profileData?.pendingCredits || 0);
    const payoutLimit = parseFloat(profileData?.payoutLimit || 2000);
    const progressPercent = Math.min(100, Math.round((pendingCredits / payoutLimit) * 100)) || 0;

    return (
        <div className="page active" id="page-designer">
            <Background3D />
            <div className="designer-portal">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="dp-welcome"
                >
                    <div className="dp-welcome-accent"></div>
                    <div className="dp-welcome-left">
                        <div className="dp-date" style={{ color: '#2baad4ff' }}>CREATOR HUB • DESIGNER PORTAL</div>
                        <h1>
                            <span style={{ color: '#2B6FD4' }}>Creator</span>
                            <span style={{ color: '#2bced4ff' }}>Economy</span>
                        </h1>
                        <p className="dp-welcome-sub">
                            The professional gateway for spatial architects. Monetize your high-fidelity blueprints and influence the next generation of 3D environments.
                        </p>
                    </div>
                    <div className="dp-welcome-right">
                        <CreatorToken />
                    </div>
                </motion.div>

                {profileError && (
                    <div
                        role="alert"
                        style={{
                            margin: '0 0 20px',
                            padding: '14px 18px',
                            borderRadius: '12px',
                            background: 'rgba(239, 68, 68, 0.08)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '16px',
                            flexWrap: 'wrap'
                        }}
                    >
                        <span style={{ color: '#b91c1c', fontSize: '14px', fontWeight: 600 }}>{profileError}</span>
                        <button
                            type="button"
                            className="dp-action-btn"
                            style={{ padding: '8px 16px', fontSize: '12px' }}
                            onClick={() => void fetchProfile()}
                        >
                            Retry
                        </button>
                    </div>
                )}

                <div className="portal-grid-layout">

                    <div className="dp-stats-container">
                        <div className="dp-card">
                            <div className="dp-card-title">
                                <ChartBarIcon style={{ width: 18, height: 18, color: 'var(--cyan)' }} />
                                Community Impact Metrics
                            </div>
                            <div className="dp-chart">
                                <div className="dp-bar" style={{ height: '30%' }}></div>
                                <div className="dp-bar" style={{ height: '55%' }}></div>
                                <div className="dp-bar" style={{ height: '45%' }}></div>
                                <div className="dp-bar" style={{ height: '70%' }}></div>
                                <div className="dp-bar" style={{ height: '85%' }}></div>
                                <div className="dp-bar" style={{ height: '75%' }}></div>
                                <div className="dp-bar" style={{ height: '95%' }}></div>
                            </div>
                            <div className="dp-metric-list">
                                <div className="dp-metric-item">
                                    <span className="dp-metric-label">
                                        <CloudArrowUpIcon style={{ width: 16, height: 16 }} /> Total Deployments
                                    </span>
                                    <span className="dp-metric-value">{loading ? '...' : profileData?.totalDeployments || 0}</span>
                                </div>
                                <div className="dp-metric-item">
                                    <span className="dp-metric-label">
                                        <ArrowTrendingUpIcon style={{ width: 16, height: 16 }} /> Gross Revenue (30d)
                                    </span>
                                    <span className="dp-metric-value">${loading ? '...' : (profileData?.grossRevenue || 0)}</span>
                                </div>
                                <div className="dp-metric-item">
                                    <span className="dp-metric-label">
                                        <StarIcon style={{ width: 16, height: 16 }} /> Reputation Score
                                    </span>
                                    <span className="dp-metric-value">{loading ? '...' : profileData?.reputationScore || '0.0'} / 5.0</span>
                                </div>
                                <div className="dp-metric-item">
                                    <span className="dp-metric-label">
                                        <InboxIcon style={{ width: 16, height: 16 }} /> Active Blueprints
                                    </span>
                                    <span className="dp-metric-value">{loading ? '...' : profileData?.activeBlueprints || 0}</span>
                                </div>
                                <div className="dp-metric-item">
                                    <span className="dp-metric-label">
                                        <ClockIcon style={{ width: 16, height: 16 }} /> In Queue
                                    </span>
                                    <span className="dp-metric-value">{loading ? '...' : profileData?.inQueue || 0}</span>
                                </div>
                            </div>
                        </div>

                        <div className="dp-card">
                            <div className="dp-card-title">
                                <CreditCardIcon style={{ width: 18, height: 18, color: 'var(--cyan)' }} />
                                Financial Settlement
                            </div>

                            <div className="dp-metric-list" style={{ marginBottom: '20px' }}>
                                <div className="dp-metric-item">
                                    <span className="dp-metric-label" style={{ fontWeight: 300, fontSize: '9px' }}>Next Settlement Date</span>
                                    <span className="dp-metric-value" style={{ fontWeight: 300, fontSize: '9px' }}>{loading ? '...' : new Date(profileData?.nextSettlementDate || Date.now()).toLocaleDateString()}</span>
                                </div>
                                <div className="dp-metric-item">
                                    <span className="dp-metric-label" style={{ fontWeight: 300, fontSize: '9px' }}>Pending Neural Credits</span>
                                    <span className="dp-metric-value" style={{ fontWeight: 300, fontSize: '9px' }}>${loading ? '...' : (profileData?.pendingCredits || 0)} USD</span>
                                </div>
                            </div>

                            <div className="dp-progress-track">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${loading ? 0 : progressPercent}%` }}
                                    transition={{ duration: 1, delay: 0.5 }}
                                    className="dp-progress-fill"
                                ></motion.div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <span style={{ fontSize: '9px', color: 'var(--silver)', fontWeight: 300 }}>
                                    {loading ? '...' : `${progressPercent}% of Minimum Payout`}
                                </span>
                                <span style={{ fontSize: '9px', color: 'var(--ink)', fontWeight: 300 }}>
                                    ${loading ? '...' : payoutLimit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Limit
                                </span>
                            </div>

                            <button
                                type="button"
                                className="dp-action-btn"
                                style={{ padding: '10px', fontSize: '9px', opacity: 0.65, cursor: 'not-allowed' }}
                                disabled
                                aria-label="Manage settlement details (coming soon)"
                                title="Coming soon"
                            >
                                Manage Settlement Details
                            </button>
                        </div>
                        <div className={`dp-cert-banner ${profileData?.isCertified ? 'certified' : ''}`}>
                            <div className="dp-cert-icon-box">
                                <CheckBadgeIcon style={{ width: 24, height: 24 }} />
                            </div>
                            <div className="dp-cert-info">
                                <h4>{profileData?.isCertified ? 'Certified Architect' : 'Certified Architect Program'}</h4>
                                <p>{profileData?.isCertified
                                    ? 'You are a verified creator utilizing 70% commission and priority mesh optimization.'
                                    : 'Verified creators receive 70% commission and priority mesh optimization on all uploads.'}</p>
                            </div>
                        </div>
                    </div>

                    <div className="dp-stats-container">
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            className="dp-upload-zone"
                        >
                            <div className="dp-upload-icon-box">
                                <CloudArrowUpIcon style={{ width: 30, height: 30 }} />
                            </div>
                            <h3>Deploy New Blueprint</h3>
                            <p>Distribute your models to over 12,000+ active spatial designers across the globe.</p>
                            <button
                                type="button"
                                className="dp-action-btn"
                                style={{ opacity: 0.65, cursor: 'not-allowed' }}
                                disabled
                                aria-label="Initialize upload (coming soon)"
                                title="Coming soon"
                            >
                                Initialize Upload
                            </button>
                        </motion.div>

                        <div className="dp-card">
                            <div className="dp-card-title">
                                <SwatchIcon style={{ width: 18, height: 18, color: 'var(--cyan)' }} />
                                Design Classification
                            </div>
                            <div className="dp-category-grid" role="radiogroup" aria-label="Blueprint category">
                                {categories.map(cat => (
                                    <button
                                        type="button"
                                        key={cat.id}
                                        role="radio"
                                        aria-checked={activeCat === cat.id}
                                        className={`dp-cat-item ${activeCat === cat.id ? 'active' : ''}`}
                                        onClick={() => setActiveCat(cat.id)}
                                    >
                                        <cat.icon style={{ width: 22, height: 22 }} />
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="dp-card">
                            <div className="dp-card-title">
                                <InformationCircleIcon style={{ width: 18, height: 18, color: 'var(--cyan)' }} />
                                Blueprint Specifications
                            </div>
                            <div className="dp-form-group">
                                <label className="dp-label">Project Title</label>
                                <input
                                    className="dp-input"
                                    placeholder="e.g. Neo-Brutalist Exhibition Hall"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="dp-form-group">
                                <label className="dp-label">Technical Description</label>
                                <textarea
                                    className="dp-input"
                                    rows="3"
                                    placeholder="Specify mesh density, lighting baked status, and intended use cases..."
                                    value={formData.technicalDescription}
                                    onChange={e => setFormData({ ...formData, technicalDescription: e.target.value })}
                                ></textarea>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                                <div className="dp-form-group">
                                    <label className="dp-label">Market Value (USD)</label>
                                    <input
                                        className="dp-input"
                                        type="number"
                                        value={formData.marketValue}
                                        onChange={e =>
                                            setFormData({
                                                ...formData,
                                                marketValue: Number.parseFloat(e.target.value) || 0
                                            })
                                        }
                                    />
                                </div>
                                <div className="dp-form-group">
                                    <label className="dp-label">License Protocol</label>
                                    <select
                                        className="dp-input"
                                        value={formData.licenseProtocol}
                                        onChange={e => setFormData({ ...formData, licenseProtocol: e.target.value })}
                                    >
                                        <option value="Commercial Standard">Commercial Standard</option>
                                        <option value="Extended Studio">Extended Studio</option>
                                        <option value="Open Source">Open Source</option>
                                    </select>
                                </div>
                            </div>
                            <button className="dp-action-btn" onClick={handleFormSubmit} disabled={submitStatus === 'submitting...' || loading}>
                                {submitStatus || 'Submit for Neural Validation'}
                            </button>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}
