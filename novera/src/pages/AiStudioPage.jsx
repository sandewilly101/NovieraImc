import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import apiService from '../api/apiService';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../store/useStore';
import {
    CubeTransparentIcon,
    SwatchIcon,
    SparklesIcon,
    CpuChipIcon,
    PhotoIcon,
    CameraIcon,
    CircleStackIcon,
    StarIcon,
    LightBulbIcon,
    Squares2X2Icon,
    ArrowPathIcon,
    CommandLineIcon,
    CheckCircleIcon,
    ArrowDownTrayIcon,
    ChevronDownIcon,
    ArrowsPointingOutIcon
} from '@heroicons/react/24/outline';
import Vault3DPreview from '../components/canvas/Vault3DPreview';
import VaultPreviewModal from '../components/canvas/VaultPreviewModal';
import { tripoService } from '../api/apiService';

const styles = ['Modern', 'Corporate', 'Luxury', 'Minimal', 'Futuristic', 'Industrial'];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1
        }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
};

export default function AiStudioPage() {
    const navigate = useNavigate();
    const {
        userProfile,
        fetchUserProfile,
        setUserProfile,
        aiTask,
        startAiTask,
        resetAiTask,
        userTasks,
        fetchUserTasks,
        addObject,
        isLoadingTasks,
        setSkipNextProjectLoad
    } = useStore(
        useShallow((s) => ({
            userProfile: s.userProfile,
            fetchUserProfile: s.fetchUserProfile,
            setUserProfile: s.setUserProfile,
            aiTask: s.aiTask,
            startAiTask: s.startAiTask,
            resetAiTask: s.resetAiTask,
            userTasks: s.userTasks,
            fetchUserTasks: s.fetchUserTasks,
            addObject: s.addObject,
            isLoadingTasks: s.isLoadingTasks,
            setSkipNextProjectLoad: s.setSkipNextProjectLoad,
        }))
    );
    const { status, progress, resultUrl, error, type, prompt } = aiTask;

    const [activeStyle, setActiveStyle] = useState('Modern');
    const [textPrompt, setTextPrompt] = useState('');
    const [imageLink, setImageLink] = useState('');
    const [localImageUrl, setLocalImageUrl] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [convertingTasks, setConvertingTasks] = useState({});
    const [previewTask, setPreviewTask] = useState(null);
    const [inlineError, setInlineError] = useState('');
    const [spatialPrompt, setSpatialPrompt] = useState('');
    const [spatialVenue, setSpatialVenue] = useState('Exhibition Hall');

    const fileInputRef = useRef(null);
    const pollIntervalsRef = useRef({});

    useEffect(() => {
        if (!userProfile) fetchUserProfile();
        fetchUserTasks();
    }, [userProfile, fetchUserProfile, fetchUserTasks]);

    useEffect(() => {
        const intervals = pollIntervalsRef.current;
        return () => {
            Object.values(intervals).forEach(id => clearInterval(id));
            pollIntervalsRef.current = {};
        };
    }, []);

    const handleDownloadFormat = async (taskId, format) => {
        if (format === 'glb') return;

        const pollKey = `${taskId}:${format}`;
        const existing = pollIntervalsRef.current[pollKey];
        if (existing) {
            clearInterval(existing);
            delete pollIntervalsRef.current[pollKey];
        }

        setInlineError('');
        setConvertingTasks(prev => ({ ...prev, [taskId]: format }));
        try {
            const res = await tripoService.convertTask(taskId, format);
            const conversionTaskId = res.data.data.id;

            const poll = setInterval(async () => {
                const statusRes = await tripoService.getTaskStatus(conversionTaskId);
                const data = statusRes.data.data;

                if (data.status === 'success') {
                    clearInterval(poll);
                    delete pollIntervalsRef.current[pollKey];
                    setConvertingTasks(prev => ({ ...prev, [taskId]: null }));
                    window.open(data.resultUrl, '_blank');
                } else if (data.status === 'failed') {
                    clearInterval(poll);
                    delete pollIntervalsRef.current[pollKey];
                    setConvertingTasks(prev => ({ ...prev, [taskId]: null }));
                    setInlineError(`Conversion to ${format.toUpperCase()} failed.`);
                }
            }, 3000);

            pollIntervalsRef.current[pollKey] = poll;
        } catch (err) {
            console.error('Conversion error:', err);
            setConvertingTasks(prev => ({ ...prev, [taskId]: null }));
        }
    };

    const handleLoadToScene = async (task) => {
        try {
            console.log('[AiStudio] Loading to scene:', task);
            if (!task.resultUrl) {
                setInlineError('This model is not yet ready for loading.');
                return;
            }

            setInlineError('');
            addObject({
                type: 'gltf',
                name: task.prompt?.substring(0, 20) || 'AI Model',
                url: task.resultUrl,
                scale: [1, 1, 1]
            });

            setSkipNextProjectLoad(true);

            let pid = useStore.getState().projectId;
            if (!pid) {
                const { projectService } = await import('../api/apiService');
                const res = await projectService.createProject({
                    name: (task.prompt?.substring(0, 40) || 'AI import').replace(/\s+/g, ' ').trim() || 'AI import',
                    status: 'draft',
                    thumbnailIcon: 'BuildingOffice2Icon',
                    themeColors: { c1: '#dce8ff', c2: '#b8d0f8' },
                });
                pid = res.data?.data?.id;
                if (!pid) throw new Error('No project id');
                useStore.setState({
                    projectId: pid,
                    projectName: res.data.data.name || 'Untitled Design',
                });
            }

            console.log('[AiStudio] Object added to store, navigating to /editor...');
            navigate(`/editor/${pid}`);
        } catch (err) {
            console.error('[AiStudio] Load error:', err);
            setInlineError('Failed to load model into the scene.');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setLocalImageUrl(reader.result);
            setImageLink(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleGenerate = async (type) => {
        const prompt = type === '3d' ? `${activeStyle} style: ${textPrompt}` : '';
        const imgUrl = type === 'image' ? imageLink : '';

        if (type === '3d' && !textPrompt.trim()) return;
        if (type === 'image' && !imageLink.trim()) return;

        if (userProfile && userProfile.aiCredits < 10) {
            setInlineError('Insufficient AI Credits. Please top up from your account settings.');
            return;
        }

        try {
            await startAiTask(
                type === '3d' ? 'text_to_model' : 'image_to_model',
                prompt,
                imgUrl
            );

            if (userProfile) {
                setUserProfile({ ...userProfile, aiCredits: userProfile.aiCredits - 10 });
            }
        } catch (err) {
            console.error('Generation Error:', err);
            fetchUserProfile();
        }
    };

    const handleSaveToVault = async () => {
        if (!resultUrl) return;
        setIsSaving(true);
        try {
            const name = textPrompt ? textPrompt.substring(0, 20) : 'AI Remix';
            await apiService.post('/assets/ai', {
                name,
                type: 'ai',
                imageUrl: resultUrl,
                metadata: {
                    prompt: textPrompt,
                    style: activeStyle,
                    generationType: status === 'success' ? 'tripo' : 'mock'
                }
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (err) {
            console.error('Failed to save to vault:', err);
            setInlineError('Failed to save asset to Vault. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="page active" id="page-ai-studio">
            <div className="ai-studio">
                <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                    className="ai-welcome"
                >
                    <div className="ai-welcome-accent"></div>
                    <div className="dash-welcome-left">
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="dash-welcome-date"
                            style={{ color: 'var(--blue)', fontWeight: 700, letterSpacing: '2px' }}
                        >
                            NOVIRA ENGINE • {userProfile?.aiCredits || 0} AI CREDITS AVAILABLE
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.6 }}
                            style={{ display: 'flex', alignItems: 'center', gap: '20px' }}
                        >
                            <span className="greeting-text" style={{ fontFamily: 'Poppins, sans-serif' }}>Spatial</span>
                            <span className="greeting-name" style={{ color: 'var(--blue)', fontFamily: 'Poppins, sans-serif' }}>Intelligence</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            className="dash-welcome-sub"
                        >
                            Harness industry-leading spatial intelligence to accelerate your design workflow.
                            Generate production-ready assets with neural precision via Novira AI integration.
                        </motion.p>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        transition={{ delay: 0.5, type: 'spring', stiffness: 120, damping: 12 }}
                        className="ai-robot-wrapper"
                    >
                        <div className="robot-3d">
                            <div className="robot-head">
                                <div className="robot-face">
                                    <div className="robot-eye"></div>
                                    <div className="robot-eye"></div>
                                </div>
                            </div>
                            <div className="robot-neck"></div>
                            <div className="robot-body"></div>
                            <div className="robot-jets"></div>
                        </div>
                    </motion.div>
                </motion.div>

                <AnimatePresence>
                    {inlineError && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#dc2626', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, margin: '0 0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <span>{inlineError}</span>
                            <button onClick={() => setInlineError('')} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: '16px', padding: '0 0 0 16px' }}>&times;</button>
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="ai-studio-grid"
                >

                    <motion.div variants={itemVariants} className={`ai-card ${status !== 'idle' && status !== 'failed' && status !== 'success' ? 'processing' : ''}`}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3><CubeTransparentIcon className="zeicon text-blue" style={{ width: 22, height: 22 }} /> AI 3D Generator</h3>
                            {status === 'success' && <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 700 }}>COMPLETED</span>}
                        </div>
                        <p>High-fidelity polygon generation from natural language descriptions.</p>

                        {(status === 'idle' || status === 'failed' || status === 'success') ? (
                            <>
                                <div style={{ position: 'relative' }}>
                                    <textarea
                                        className="prompt-box"
                                        placeholder="e.g., A minimalist geometric showroom stage with frosted glass panels..."
                                        value={textPrompt}
                                        maxLength={500}
                                        onChange={(e) => setTextPrompt(e.target.value)}
                                        disabled={status === 'success'}
                                        aria-label="3D generation prompt"
                                    />
                                    <div style={{ position: 'absolute', bottom: '32px', right: '12px', fontSize: '10px', color: 'var(--silver)', fontWeight: 600 }}>{textPrompt.length} / 500</div>
                                </div>

                                <div className="style-chips">
                                    {styles.map(s => (
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            key={s}
                                            role="button"
                                            tabIndex={status === 'success' ? -1 : 0}
                                            aria-pressed={activeStyle === s}
                                            aria-label={`Style ${s}`}
                                            className={`style-chip ${activeStyle === s ? 'active' : ''}`}
                                            onClick={() => status !== 'success' && setActiveStyle(s)}
                                            onKeyDown={(e) => {
                                                if (status === 'success') return;
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setActiveStyle(s);
                                                }
                                            }}
                                        >
                                            {s}
                                        </motion.div>
                                    ))}
                                </div>

                                {status === 'success' ? (
                                    <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                                        <button
                                            className="btn btn-primary"
                                            onClick={handleSaveToVault}
                                            disabled={isSaving || saveSuccess}
                                            style={{ flex: 2, background: saveSuccess ? 'var(--green)' : 'var(--blue)' }}
                                        >
                                            {saveSuccess ? <CheckCircleIcon style={{ width: 18 }} /> : <ArrowDownTrayIcon style={{ width: 18 }} />}
                                            {saveSuccess ? 'Saved to Vault' : isSaving ? 'Saving...' : 'Save to Vault'}
                                        </button>
                                        <button className="btn btn-ghost" onClick={resetAiTask} style={{ flex: 1 }}>Reset</button>
                                    </div>
                                ) : (
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleGenerate('3d')}
                                        style={{ width: '100%', marginTop: 'auto', gap: '10px', padding: '14px' }}
                                    >
                                        <SparklesIcon className="zeicon" style={{ width: 18, height: 18 }} />
                                        Generate High-Poly Model (10 Cr)
                                    </button>
                                )}
                            </>
                        ) : (
                            <div className="progress-display" style={{ marginTop: 'auto', paddingTop: '40px' }}>
                                <div className="progress-bar-container" style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '15px' }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        style={{ height: '100%', background: 'var(--blue)' }}
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 700 }}>
                                    <span style={{ textTransform: 'capitalize' }}>{status}...</span>
                                    <span>{progress}%</span>
                                </div>
                                <button className="btn btn-ghost" onClick={resetAiTask} style={{ width: '100%', marginTop: '20px', fontSize: '10px' }}>Cancel Task</button>
                            </div>
                        )}
                        {error && <p style={{ color: 'var(--red)', fontSize: '11px', marginTop: '10px' }}>{error}</p>}
                    </motion.div>

                    <motion.div variants={itemVariants} className="ai-card">
                        <h3><SwatchIcon className="zeicon text-blue" style={{ width: 22, height: 22 }} /> Logo & Asset Remix</h3>
                        <p>Intelligent material mapping and extrusion for 2D corporate identities.</p>

                        <div className="logo-remix-area" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <div style={{ position: 'relative', marginBottom: '15px' }}>
                                <input
                                    type="text"
                                    placeholder="Paste Image URL or browse..."
                                    value={localImageUrl ? 'Local Image Selected' : imageLink}
                                    onChange={(e) => {
                                        setLocalImageUrl(null);
                                        setImageLink(e.target.value);
                                    }}
                                    disabled={!!localImageUrl}
                                    style={{
                                        width: '100%',
                                        padding: '12px 40px 12px 12px',
                                        border: '1.5px solid var(--border)',
                                        borderRadius: '12px',
                                        fontSize: '12px',
                                        background: localImageUrl ? '#f8fafc' : 'white'
                                    }}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    style={{
                                        position: 'absolute',
                                        right: '12px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        padding: '4px',
                                        color: 'var(--blue)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <PhotoIcon style={{ width: 18, height: 18 }} />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div style={{
                                flex: 1,
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '2px dashed rgba(0,0,0,0.05)',
                                borderRadius: '15px',
                                padding: '20px',
                                background: 'rgba(0,0,0,0.01)',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {localImageUrl ? (
                                    <>
                                        <img src={localImageUrl} alt="Local" style={{ maxWidth: '100%', maxHeight: '120px', borderRadius: '10px' }} />
                                        <button
                                            onClick={() => { setLocalImageUrl(null); setImageLink(''); }}
                                            style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '20px', height: '20px', fontSize: '12px', cursor: 'pointer' }}
                                        >
                                            ×
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <PhotoIcon className="zeicon text-blue mb-2" style={{ width: 32, height: 32, opacity: 0.6 }} />
                                        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--ink)' }}>Reality Reconstruction</div>
                                        <div style={{ fontSize: 11, color: 'var(--silver)', textAlign: 'center' }}>Upload a photo to generate its 3D mesh.</div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: 'auto' }}>
                            <button
                                className="btn btn-primary"
                                onClick={() => handleGenerate('image')}
                                disabled={status !== 'idle' && status !== 'failed' && status !== 'success'}
                                style={{ width: '100%', background: 'linear-gradient(135deg, #1e293b, var(--ink))' }}
                            >
                                <ArrowPathIcon className="zeicon" style={{ width: 18, height: 18 }} />
                                Start Logo Extrusion
                            </button>
                        </div>
                    </motion.div>

                    <motion.div variants={itemVariants} className="ai-card">
                        <h3><CommandLineIcon className="zeicon text-blue" style={{ width: 22, height: 22 }} /> Spatial Layout Engine</h3>
                        <p>Algorithmic placement optimized for sightlines, logistics, and crowd flow.</p>

                        <textarea className="prompt-box" placeholder="e.g., Summit for 500 pax. Need central stage, 15 tech booths..." value={spatialPrompt} onChange={e => setSpatialPrompt(e.target.value)}></textarea>

                        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                            <select value={spatialVenue} onChange={e => setSpatialVenue(e.target.value)} style={{ flex: 1, padding: '12px', border: '1.5px solid rgba(0,0,0,0.08)', borderRadius: '10px', background: 'white', fontSize: '13px', outline: 'none' }}>
                                <option>Exhibition Hall</option>
                                <option>Conference Center</option>
                                <option>Outdoor Pavilion</option>
                                <option>Gallery Space</option>
                            </select>
                        </div>

                        <button className="btn btn-primary" onClick={() => {
                            if (!spatialPrompt.trim()) {
                                setInlineError('Describe your event layout requirements first.');
                                return;
                            }
                            setInlineError('');
                            navigate('/dashboard');
                            setTimeout(() => {
                                const store = useStore.getState();
                                store.addObject({ name: 'Stage', type: 'primitive', geo: 'box', color: '#1e293b', dimensions: [4, 0.5, 3] });
                                store.addObject({ name: 'Booth 1', type: 'primitive', geo: 'box', color: '#3b82f6', dimensions: [2, 2.5, 2], position: [-4, 0, -3] });
                                store.addObject({ name: 'Booth 2', type: 'primitive', geo: 'box', color: '#8b5cf6', dimensions: [2, 2.5, 2], position: [4, 0, -3] });
                            }, 500);
                        }} style={{ width: '100%', marginTop: 'auto', background: 'linear-gradient(135deg, #1e293b, var(--ink))' }}>
                            <ArrowPathIcon className="zeicon text-blue" style={{ width: 18, height: 18 }} /> Initialize Smart Layout
                        </button>
                    </motion.div>

                    <motion.div variants={itemVariants} className="ai-card" style={{ opacity: 0.72 }} aria-disabled="true">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                            <h3 style={{ margin: 0 }}><CameraIcon className="zeicon text-blue" style={{ width: 22, height: 22 }} /> Photogrammetry Lab</h3>
                            <span style={{ fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', color: 'var(--silver)', border: '1px solid rgba(0,0,0,0.12)', padding: '4px 10px', borderRadius: '999px' }}>COMING SOON</span>
                        </div>
                        <p>Reconstruct physical environments into editable 3D meshes using neural radiance fields.</p>

                        <div className="logo-remix-area" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <CameraIcon className="zeicon text-blue mx-auto" style={{ width: 40, height: 40, opacity: 0.6 }} />
                            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--ink)', textAlign: 'center' }}>Upload Site Photography</div>
                            <div style={{ fontSize: 12, color: 'var(--silver)', textAlign: 'center' }}>Upload photos to generate a 3D mesh scan</div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '20px' }}>
                            <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.1)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'var(--blue)', textTransform: 'uppercase' }}>Detection</div>
                            </div>
                            <div style={{ background: 'rgba(139, 92, 246, 0.05)', border: '1px solid rgba(139, 92, 246, 0.1)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: '#8b5cf6', textTransform: 'uppercase' }}>Neural Mesh</div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>

                <motion.div variants={itemVariants} className="ai-vault-section" style={{ marginTop: '60px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '30px', padding: '0 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                            <div style={{ background: 'var(--blue-pale)', padding: '10px', borderRadius: '12px' }}>
                                <Squares2X2Icon className="zeicon text-blue" style={{ width: 28, height: 28 }} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--ink)', margin: 0 }}>AI Vault</h2>
                                <p style={{ fontSize: '13px', color: 'var(--silver)', margin: 0 }}>Your permanent archive of synthesized spatial assets.</p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--blue)', background: 'white', padding: '8px 16px', borderRadius: '30px', border: '1.5px solid var(--blue-pale)' }}>
                                {userTasks.length} Assets Generated
                            </div>
                        </div>
                    </div>                    <div className="vault-grid">
                        {isLoadingTasks ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px' }}>
                                <ArrowPathIcon className="zeicon spin" style={{ width: 40, height: 40, color: 'var(--blue)', opacity: 0.3, margin: '0 auto' }} />
                                <p style={{ marginTop: '20px', color: 'var(--silver)', fontWeight: 600 }}>Synchronizing AI Vault...</p>
                            </div>
                        ) : userTasks.length === 0 ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', background: 'rgba(0,0,0,0.02)', borderRadius: '20px', border: '2px dashed rgba(0,0,0,0.05)' }}>
                                <CircleStackIcon style={{ width: 40, height: 40, color: 'var(--silver)', opacity: 0.2, margin: '0 auto' }} />
                                <p style={{ marginTop: '20px', color: 'var(--silver)', fontWeight: 600 }}>Your AI Library is empty</p>
                                <p style={{ fontSize: '12px', color: 'var(--silver)' }}>Generate a model above to see it here.</p>
                            </div>
                        ) : (
                            userTasks.map((task) => (
                                <motion.div
                                    key={task.id}
                                    whileHover={{ y: -5 }}
                                    className={`vault-card ${convertingTasks[task.id] ? 'converting' : ''}`}
                                >
                                    <div
                                        className="vault-preview"
                                        onClick={() => task.status === 'success' && setPreviewTask(task)}
                                        style={{ cursor: task.status === 'success' ? 'zoom-in' : 'default' }}
                                    >
                                        {task.status === 'success' ? (
                                            <Vault3DPreview
                                                url={task.resultUrl}
                                                thumbnailUrl={task.thumbnailUrl}
                                                fallbackIcon={task.type === 'text_to_model' ? CubeTransparentIcon : PhotoIcon}
                                            />
                                        ) : (
                                            <>
                                                {task.type === 'text_to_model' ? (
                                                    <CubeTransparentIcon style={{ width: 40, height: 40, opacity: 0.15 }} />
                                                ) : (
                                                    <PhotoIcon style={{ width: 40, height: 40, opacity: 0.15 }} />
                                                )}
                                            </>
                                        )}
                                        <div className="vault-badge">{task.status}</div>

                                        {task.status === 'success' && (
                                            <div className="vault-preview-hint">
                                                <ArrowsPointingOutIcon style={{ width: 14, height: 14 }} />
                                                Full View
                                            </div>
                                        )}

                                        {convertingTasks[task.id] && (
                                            <div className="converting-overlay">
                                                <ArrowPathIcon className="zeicon spin" style={{ width: 24, height: 24, color: 'white' }} />
                                                <span>Converting to {convertingTasks[task.id].toUpperCase()}...</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="vault-info">
                                        <div className="vault-prompt">{task.prompt || 'Untitled Generation'}</div>
                                        <div className="vault-meta">
                                            <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                                            <span>•</span>
                                            <span style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 800 }}>{task.type?.replace('_to_model', '')}</span>
                                        </div>
                                        <div style={{ marginTop: '15px', display: 'flex', gap: '8px' }}>
                                            <button
                                                className="btn btn-primary"
                                                style={{ flex: 1, padding: '8px', fontSize: '11px', whiteSpace: 'nowrap' }}
                                                onClick={() => handleLoadToScene(task)}
                                                disabled={task.status !== 'success' || !!convertingTasks[task.id]}
                                            >
                                                <Squares2X2Icon style={{ width: 14, height: 14 }} />
                                                Load
                                            </button>

                                            <div className="format-dropdown-container">
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ padding: '8px', borderRadius: '10px', width: '100%', borderColor: 'var(--blue-pale)' }}
                                                    disabled={task.status !== 'success' || !!convertingTasks[task.id]}
                                                >
                                                    <ArrowDownTrayIcon style={{ width: 14, height: 14 }} />
                                                    <ChevronDownIcon style={{ width: 10, height: 10, marginLeft: '4px' }} />
                                                </button>
                                                <div className="format-menu">
                                                    <a href={task.resultUrl} target="_blank" rel="noreferrer" className="format-item">GLB (Native)</a>
                                                    <div onClick={() => handleDownloadFormat(task.id, 'obj')} className="format-item">OBJ</div>
                                                    <div onClick={() => handleDownloadFormat(task.id, 'stl')} className="format-item">STL</div>
                                                    <div onClick={() => handleDownloadFormat(task.id, 'fbx')} className="format-item">FBX</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>

                <VaultPreviewModal
                    task={previewTask}
                    isOpen={!!previewTask}
                    onClose={() => setPreviewTask(null)}
                    onLoadToScene={handleLoadToScene}
                />
            </div>
            <style>{`
                .ai-card.processing {
                    border-color: var(--blue);
                    box-shadow: 0 0 20px rgba(43, 111, 212, 0.1);
                }
                .vault-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
                    gap: 25px;
                    padding: 0 20px;
                }
                .vault-card {
                    background: white;
                    border: 1px solid var(--border);
                    border-radius: 20px;
                    overflow: hidden;
                    transition: all 0.3s ease;
                }
                .vault-card:hover {
                    box-shadow: 0 20px 40px rgba(0,0,0,0.06);
                    border-color: var(--blue-pale);
                }
                .vault-preview {
                    height: 160px;
                    background: #f8fafc;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                    color: var(--blue);
                }
                .vault-preview-hint {
                    position: absolute;
                    bottom: 12px;
                    right: 12px;
                    background: rgba(15, 27, 45, 0.6);
                    backdrop-filter: blur(4px);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-size: 9px;
                    font-weight: 800;
                    text-transform: uppercase;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    opacity: 0;
                    transform: translateY(5px);
                    transition: all 0.3s ease;
                    pointer-events: none;
                }
                .vault-card:hover .vault-preview-hint {
                    opacity: 1;
                    transform: translateY(0);
                }
                .vault-badge {
                    position: absolute;
                    top: 12px;
                    right: 12px;
                    padding: 4px 10px;
                    border-radius: 20px;
                    background: white;
                    color: var(--ink);
                    font-size: 10px;
                    font-weight: 800;
                    text-transform: uppercase;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                }
                .vault-info {
                    padding: 20px;
                }
                .vault-prompt {
                    font-size: 14px;
                    font-weight: 700;
                    color: var(--ink);
                    margin-bottom: 5px;
                    display: -webkit-box;
                    -webkit-line-clamp: 1;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                .vault-meta {
                    font-size: 11px;
                    color: var(--silver);
                    display: flex;
                    gap: 8px;
                    align-items: center;
                }
                .format-dropdown-container {
                    position: relative;
                }
                .format-dropdown-container:hover .format-menu {
                    opacity: 1;
                    visibility: visible;
                    transform: translateY(0);
                }
                .format-menu {
                    position: absolute;
                    bottom: 100%;
                    right: 0;
                    margin-bottom: 10px;
                    background: white;
                    border: 1px solid var(--border);
                    border-radius: 12px;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                    min-width: 140px;
                    opacity: 0;
                    visibility: hidden;
                    transform: translateY(10px);
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    z-index: 100;
                    overflow: hidden;
                }
                .format-item {
                    display: block;
                    padding: 10px 15px;
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--ink);
                    text-decoration: none;
                    cursor: pointer;
                    transition: background 0.2s;
                    border-bottom: 1px solid rgba(0,0,0,0.02);
                    text-align: left;
                }
                .format-item:last-child {
                    border-bottom: none;
                }
                .format-item:hover {
                    background: var(--blue-pale);
                    color: var(--blue);
                }
                .converting-overlay {
                    position: absolute;
                    inset: 0;
                    background: rgba(43, 111, 212, 0.9);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    gap: 10px;
                    color: white;
                    font-size: 11px;
                    font-weight: 700;
                    backdrop-filter: blur(4px);
                    z-index: 10;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
}
