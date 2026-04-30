import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import apiService from '../api/apiService';
import StatusModal from '../components/common/StatusModal';
import {
    BuildingOffice2Icon,
    BuildingOfficeIcon,
    SparklesIcon,
    MusicalNoteIcon,
    SunIcon,
    UsersIcon,
    CheckBadgeIcon,
    BriefcaseIcon,
    CubeIcon,
    PlusIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const iconMap = {
    'BuildingOffice2Icon': BuildingOffice2Icon,
    'BuildingOfficeIcon': BuildingOfficeIcon,
    'SparklesIcon': SparklesIcon,
    'MusicalNoteIcon': MusicalNoteIcon,
    'SunIcon': SunIcon,
    'UsersIcon': UsersIcon,
    'CheckBadgeIcon': CheckBadgeIcon,
    'BriefcaseIcon': BriefcaseIcon,
    'CubeIcon': CubeIcon
};

const imageMap = {
    'Exhibition Halls': '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/exhibition_hall_3d_1773058646712.png',
    'Conference': '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/tech_stage_3d_1773058665145.png',
    'Wedding': '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/wedding_pavilion_3d_1773058682131.png',
    'Concert': '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/concert_arena_3d_1773058696593.png',
    'Gala Dinner': '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/gala_hall_3d_1773058713163.png',
    'Booth Packs': '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/modular_booth_3d_1773058731137.png',
    'Stage Designs': '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/tech_stage_3d_1773058665145.png'
};

const filters = ['All', 'Exhibition Halls', 'Conference', 'Gala Dinner', 'Wedding', 'Concert', 'Booth Packs', 'Stage Designs'];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.08
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: { type: 'spring', stiffness: 100, damping: 15 }
    }
};

export default function MarketplacePage() {
    const navigate = useNavigate();
    const [currentFilter, setCurrentFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'error', title: '', message: '' });

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                setLoading(true);
                const response = await apiService.get('/projects/community', {
                    params: { type: 'finished' }
                });
                if (response.data.success) {
                    setTemplates(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching templates:', error);
                setFetchError(true);
            } finally {
                setLoading(false);
            }
        };
        fetchTemplates();
    }, []);

    const handleClaim = async (template) => {
        try {
            const response = await apiService.post('/assets/claim', {
                projectId: template.id,
                name: template.name,
                imageUrl: imageMap[template.category] || imageMap['Conference']
            });

            if (response.data.success) {
                setStatusModal({ isOpen: true, type: 'success', title: 'Template Claimed', message: `"${template.name}" has been added to your Vault!` });
            }
        } catch (error) {
            console.error('Error claiming asset:', error);
            setStatusModal({ isOpen: true, type: 'error', title: 'Claim Failed', message: error.response?.data?.error || 'Failed to claim asset. Please try again.' });
        }
    };

    const filteredTemplates = templates.filter(t => {
        const matchesFilter = currentFilter === 'All' || t.category === currentFilter;
        const matchesSearch = t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (t.ownerName && t.ownerName.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesFilter && matchesSearch;
    });

    return (
        <div className="page active" id="page-marketplace">
            <div className="marketplace">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="tm-welcome"
                >
                    <div className="tm-welcome-accent"></div>
                    <div className="dash-welcome-left">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="dash-welcome-date"
                            style={{ color: 'var(--pink)', fontWeight: 700, letterSpacing: '2px' }}
                        >
                            BLUEPRINT COLLECTION • READY
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
                        >
                            <span className="greeting-text" style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>Event</span>
                            <span className="greeting-name" style={{ color: 'var(--pink)', fontFamily: 'Poppins, sans-serif', fontWeight: 800 }}>Templates</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="dash-welcome-sub"
                        >
                            Discover and deploy high-fidelity spatial blueprints optimized for performance and visual impact.
                            Over 2,000+ premium designs at your fingertips.
                        </motion.p>
                    </div>

                    <div className="dash-welcome-right" style={{ zIndex: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', width: '100%' }}>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotate: -20 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ delay: 0.5, type: 'spring', stiffness: 100 }}
                                className="blueprint-stack"
                            >
                                <div className="blueprint-layer layer-1"></div>
                                <div className="blueprint-layer layer-2"></div>
                                <div className="blueprint-layer layer-3"></div>
                            </motion.div>

                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '11px', fontWeight: 800, color: 'var(--silver)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Asset Management</div>
                                <div className="search-wrapper">
                                    <MagnifyingGlassIcon className="zeicon" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', width: '18px', height: '18px', color: 'var(--blue-light)' }} />
                                    <input
                                        style={{
                                            width: '100%',
                                            padding: '14px 14px 14px 40px',
                                            border: '1px solid var(--blue-light)',
                                            borderRadius: '5px',
                                            fontFamily: 'Poppins, sans-serif',
                                            fontSize: '14px',
                                            outline: 'none',
                                            background: 'rgba(255,255,255,0.7)',
                                            backdropFilter: 'blur(10px)',
                                            transition: 'all 0.3s'
                                        }}
                                        className="search-input"
                                        placeholder="Filter library..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                padding: '16px',
                                borderRadius: '12px',
                                background: 'linear-gradient(135deg, var(--ink), #1e293b)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                                fontFamily: 'Poppins, sans-serif',
                                fontWeight: 600,
                                fontSize: '14px',
                                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.3s'
                            }}
                            onClick={() => navigate('/designer')}
                        >
                            <PlusIcon style={{ width: 20, height: 20, strokeWidth: 2.5, color: 'var(--blue-light)' }} />
                            Contribute Template
                        </button>
                    </div>

                </motion.div>

                <div className="market-filters market-filters--static">
                    <div className="market-filters-track market-filters-track--static" role="tablist" aria-label="Template categories">
                        {filters.map((f) => (
                            <motion.button
                                type="button"
                                role="tab"
                                aria-selected={currentFilter === f}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                key={f}
                                className={`filter-chip ${currentFilter === f ? 'active' : ''}`}
                                onClick={() => setCurrentFilter(f)}
                            >
                                {f}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="loading-templates" style={{ textAlign: 'center', padding: '100px', color: 'var(--blue)' }}>
                        <div className="loader"></div>
                        <p style={{ marginTop: '20px', fontWeight: 600 }}>Syncing Blueprint Database...</p>
                    </div>
                ) : (
                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        className="market-grid"
                    >
                        {filteredTemplates.map((t, idx) => {
                            const Icon = iconMap[t.thumbnailIcon] || BuildingOfficeIcon;
                            const image = imageMap[t.category] || imageMap['Conference'];

                            return (
                                <motion.div
                                    key={t.id || idx}
                                    variants={itemVariants}
                                    className="market-card"
                                    onClick={() => navigate(`/editor/${t.id}?source=marketplace`)}
                                >
                                    <div className="market-thumb">
                                        <img src={image} alt={t.name} className="thumb-img" />
                                        <div className="thumb-overlay">
                                            <motion.button
                                                whileHover={{ scale: 1.1 }}
                                                whileTap={{ scale: 0.9 }}
                                                className="btn btn-primary btn-sm"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleClaim(t);
                                                }}
                                                style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '12px' }}
                                            >
                                                Claim to Vault
                                            </motion.button>
                                        </div>
                                        <div className="market-icon-overlay">
                                            <Icon className="zeicon" />
                                        </div>
                                        {t.isVerified && <div className="market-badge">Verified</div>}
                                    </div>
                                    <div className="market-info">
                                        <div className="market-name">{t.name}</div>
                                        <div className="market-meta">
                                            <span className="market-designer">by {t.ownerName}</span>
                                            <span className="market-category-slug" style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 700, textTransform: 'uppercase' }}>
                                                {t.category}
                                            </span>
                                        </div>
                                        <div className="market-stats" style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                            <span style={{ fontSize: '11px', color: 'var(--silver)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {t.views} views
                                            </span>
                                            <span style={{ fontSize: '11px', color: 'var(--silver)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                {t.likes} likes
                                            </span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </motion.div>
                )}

                {!loading && fetchError && (
                    <div style={{ textAlign: 'center', padding: '80px 20px' }}>
                        <p style={{ color: 'var(--red)', fontWeight: 600, fontSize: '16px', marginBottom: '12px' }}>Failed to load templates</p>
                        <p style={{ color: 'var(--silver)', fontSize: '14px', marginBottom: '24px' }}>Check your connection and try again.</p>
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>Retry</button>
                    </div>
                )}
            </div>
            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
            />
        </div>
    );
}
