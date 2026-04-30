import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../api/apiService';
import { useNavigate } from 'react-router-dom';
import {
    CubeIcon,
    CpuChipIcon,
    SwatchIcon,
    ArrowDownTrayIcon,
    PencilSquareIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    EllipsisVerticalIcon,
    XMarkIcon,
    CheckIcon
} from '@heroicons/react/24/outline';

const MiniCube = ({ colorClass = 'blue' }) => (
    <div className={`mini-cube-container ${colorClass}`}>
        <div className="mini-cube">
            <div className="face front"></div>
            <div className="face back"></div>
            <div className="face left"></div>
            <div className="face right"></div>
            <div className="face top"></div>
            <div className="face bottom"></div>
        </div>
    </div>
);

const tabs = [
    { id: 'blueprint', label: '3D Blueprints', icon: CubeIcon },
    { id: 'ai', label: 'AI Generations', icon: CpuChipIcon },
    { id: 'brand', label: 'Brand Assets', icon: SwatchIcon }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 12 } }
};

export default function MyAssetsPage() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('blueprint');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState('all');
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    const [renamingAsset, setRenamingAsset] = useState(null);
    const [renameValue, setRenameValue] = useState('');
    const [deletingAsset, setDeletingAsset] = useState(null);

    useEffect(() => {
        fetchAssets();
    }, []);

    const fetchAssets = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            if (!token) {
                navigate('/login');
                return;
            }

            const { data: response } = await apiService.get('/assets');
            if (response.success) {
                setAssets(response.data);
            }
        } catch (error) {
            console.error('Error fetching assets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = (asset) => {
        const link = document.createElement('a');
        link.href = asset.imageUrl;
        link.download = `${asset.name}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleEdit = (asset) => {
        setRenamingAsset(asset);
        setRenameValue(asset.name);
    };

    const submitRename = async () => {
        if (!renamingAsset || !renameValue || renameValue === renamingAsset.name) {
            setRenamingAsset(null);
            return;
        }
        try {
            const { data: response } = await apiService.put(`/assets/${renamingAsset.id}`, { name: renameValue });
            if (response.success) {
                setAssets(assets.map(a => a.id === renamingAsset.id ? { ...a, name: renameValue } : a));
            }
        } catch (error) {
            console.error('Error updating asset:', error);
        } finally {
            setRenamingAsset(null);
        }
    };

    const handleDelete = (asset) => {
        setDeletingAsset(asset);
    };

    const confirmDelete = async () => {
        if (!deletingAsset) return;
        try {
            const { data: response } = await apiService.delete(`/assets/${deletingAsset.id}`);
            if (response.success) {
                setAssets(assets.filter(a => a.id !== deletingAsset.id));
            }
        } catch (error) {
            console.error('Error deleting asset:', error);
        } finally {
            setDeletingAsset(null);
        }
    };

    const filteredAssets = assets.filter(a =>
        a.type === activeTab &&
        a.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="page active" id="page-my-assets">
            <div className="assets-container">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8 }}
                    className="assets-welcome"
                >
                    <div className="assets-welcome-left">
                        <div className="status-badge">
                            <MiniCube colorClass="blue" />
                            VAULT SECURED • {assets.length} OBJECTS
                        </div>
                        <h1 className="assets-hero-title">
                            My <span className="text-orange">Vault</span>
                        </h1>
                        <p className="assets-hero-sub">
                            Your centralized repository for production blueprints, neural generations, and corporate identity assets.
                            Synchronized across all spatial instances.
                        </p>

                        <div className="assets-header-actions">
                            <div className="assets-hero-search">
                                <MagnifyingGlassIcon className="zeicon" />
                                <input
                                    type="text"
                                    placeholder="Locate asset in vault..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button className="btn-filter-premium" onClick={() => setFilterType(filterType === 'all' ? 'recent' : 'all')} style={filterType !== 'all' ? { background: 'rgba(59,130,246,0.1)', borderColor: '#3b82f6' } : {}}>
                                <FunnelIcon className="zeicon" />
                                <span>{filterType === 'all' ? 'Filter' : 'Recent'}</span>
                            </button>
                        </div>
                    </div>

                    <div className="assets-welcome-right">
                        <div className="vault-3d-container">
                            <motion.div
                                animate={{
                                    rotateY: [0, 10, -10, 0],
                                    y: [0, -10, 0]
                                }}
                                transition={{
                                    duration: 6,
                                    repeat: Infinity,
                                    ease: "easeInOut"
                                }}
                                className="vault-3d-object"
                            >
                                <div className="vault-door">
                                    <div className="vault-handle"></div>
                                    <div className="vault-display">
                                        <div className="scan-line"></div>
                                    </div>
                                </div>
                                <div className="vault-shadow"></div>
                            </motion.div>
                        </div>
                    </div>
                </motion.div>

                <nav className="assets-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`asset-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon className="zeicon" />
                            <span>{tab.label}</span>
                            {activeTab === tab.id && (
                                <motion.div layoutId="tab-underline" className="tab-underline" />
                            )}
                        </button>
                    ))}
                </nav>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, transition: { duration: 0.2 } }}
                        className="assets-grid"
                    >
                        {loading ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px' }}>
                                <div className="loader"></div>
                                <p style={{ color: 'var(--blue)', fontWeight: 600, marginTop: '20px' }}>Syncing Library...</p>
                            </div>
                        ) : filteredAssets.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: 'var(--silver)' }}>
                                <CubeIcon style={{ width: 48, height: 48, margin: '0 auto 15px', opacity: 0.3 }} />
                                <p>No assets found in this sector.</p>
                            </div>
                        ) : filteredAssets.map(asset => (
                            <motion.div
                                key={asset.id}
                                variants={itemVariants}
                                className="asset-card"
                            >
                                <div className="asset-thumb">
                                    <img src={asset.imageUrl || '/brain/c6911b57-cc45-4724-ab6b-b7c717c5ad43/tech_stage_3d_1773058665145.png'} alt={asset.name} />
                                    <div className="asset-overlay">
                                        <button className="asset-action-btn" title="Download Source" onClick={() => handleDownload(asset)}>
                                            <ArrowDownTrayIcon className="zeicon" />
                                        </button>
                                        <button className="asset-action-btn" title="Edit Metadata" onClick={() => handleEdit(asset)}>
                                            <PencilSquareIcon className="zeicon" />
                                        </button>
                                        <button className="asset-action-btn text-red" title="Obfuscate" onClick={() => handleDelete(asset)}>
                                            <TrashIcon className="zeicon" />
                                        </button>
                                    </div>
                                    <div className="asset-type-badge">{asset.type}</div>
                                </div>
                                <div className="asset-info">
                                    <div className="asset-main">
                                        <h4 className="asset-name">{asset.name}</h4>
                                        <button className="asset-more" onClick={(e) => {
                                            e.stopPropagation();
                                            setRenamingAsset(asset.id);
                                            setNewName(asset.name);
                                        }}>
                                            <EllipsisVerticalIcon className="zeicon" />
                                        </button>
                                    </div>
                                    <div className="asset-meta">
                                        <span>Modified {new Date(asset.updatedAt).toLocaleDateString()}</span>
                                        <MiniCube colorClass="blue-light" />
                                    </div>
                                </div>
                                <div className="asset-hologram-glint"></div>
                            </motion.div>
                        ))}
                    </motion.div>
                </AnimatePresence>

                {renamingAsset && (
                    <div className="asset-modal-overlay" onClick={() => setRenamingAsset(null)}>
                        <div className="asset-modal-card" onClick={e => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 12px', fontSize: '14px', color: 'var(--ink)' }}>Rename Asset</h3>
                            <input
                                className="dp-input"
                                autoFocus
                                value={renameValue}
                                onChange={e => setRenameValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') submitRename(); if (e.key === 'Escape') setRenamingAsset(null); }}
                                style={{ width: '100%', marginBottom: '12px' }}
                            />
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="asset-action-btn" onClick={() => setRenamingAsset(null)} title="Cancel">
                                    <XMarkIcon className="zeicon" /> Cancel
                                </button>
                                <button className="dp-action-btn" onClick={submitRename} style={{ padding: '6px 14px', fontSize: '11px' }}>
                                    <CheckIcon className="zeicon" style={{ width: 14, height: 14, marginRight: 4 }} /> Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {deletingAsset && (
                    <div className="asset-modal-overlay" onClick={() => setDeletingAsset(null)}>
                        <div className="asset-modal-card" onClick={e => e.stopPropagation()}>
                            <h3 style={{ margin: '0 0 8px', fontSize: '14px', color: '#ef4444' }}>Remove from Vault?</h3>
                            <p style={{ fontSize: '12px', color: 'var(--silver)', margin: '0 0 16px' }}>
                                Permanently remove <strong style={{ color: 'var(--ink)' }}>{deletingAsset.name}</strong> from your vault? This cannot be undone.
                            </p>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="asset-action-btn" onClick={() => setDeletingAsset(null)} title="Cancel">
                                    Cancel
                                </button>
                                <button className="dp-action-btn" onClick={confirmDelete} style={{ padding: '6px 14px', fontSize: '11px', background: '#ef4444' }}>
                                    <TrashIcon className="zeicon" style={{ width: 14, height: 14, marginRight: 4 }} /> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
