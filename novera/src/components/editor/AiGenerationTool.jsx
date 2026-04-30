import React, { useState, useRef, useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { showToast } from '../../utils/noviraToast';
import { SparklesIcon, PhotoIcon, CubeIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

const AiGenerationTool = () => {
    const {
        userProfile, fetchUserProfile, setUserProfile, aiTask, startAiTask, resetAiTask, addObject,
        aiImageGeneratorPrefill, clearAiImageGeneratorPrefill,
    } = useStore(
        useShallow((s) => ({
            userProfile: s.userProfile,
            fetchUserProfile: s.fetchUserProfile,
            setUserProfile: s.setUserProfile,
            aiTask: s.aiTask,
            startAiTask: s.startAiTask,
            resetAiTask: s.resetAiTask,
            addObject: s.addObject,
            aiImageGeneratorPrefill: s.aiImageGeneratorPrefill,
            clearAiImageGeneratorPrefill: s.clearAiImageGeneratorPrefill,
        }))
    );
    const { status, progress, resultUrl, error, type, prompt } = aiTask;

    const [activeTab, setActiveTab] = useState('text');
    const [textPrompt, setTextPrompt] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [localImageUrl, setLocalImageUrl] = useState(null);
    /** Optional instructions sent with image-to-3D (merged into Tripo `options`). */
    const [imageRefinementPrompt, setImageRefinementPrompt] = useState('');
    const [isv2, setIsv2] = useState(true);
    const fileInputRef = useRef(null);
    const appliedPrefillKey = useRef('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            setLocalImageUrl(reader.result);
            setImageUrl(reader.result);
        };
        reader.readAsDataURL(file);
    };

    React.useEffect(() => {
        if (!userProfile) fetchUserProfile();
    }, [userProfile, fetchUserProfile]);

    useEffect(() => {
        let p = aiImageGeneratorPrefill;
        if (p?.imageUrl) {
            try {
                sessionStorage.removeItem('novira_ai_image_prefill_v1');
            } catch {
                /* ignore */
            }
        } else {
            try {
                const raw = sessionStorage.getItem('novira_ai_image_prefill_v1');
                if (raw) {
                    p = JSON.parse(raw);
                    sessionStorage.removeItem('novira_ai_image_prefill_v1');
                }
            } catch {
                /* ignore */
            }
        }
        if (!p?.imageUrl) return;
        const key = `${p.imageUrl}|${p.previewUrl || ''}|${p.name || ''}`;
        if (appliedPrefillKey.current === key) return;
        appliedPrefillKey.current = key;
        setActiveTab('image');
        setImageUrl(p.imageUrl);
        setLocalImageUrl(p.previewUrl || p.imageUrl);
        setImageRefinementPrompt((p.name && String(p.name)) ? `Based on: ${p.name}` : '');
        clearAiImageGeneratorPrefill();
        showToast('Reference image loaded — add optional notes below, then Generate.', 'ok');
    }, [aiImageGeneratorPrefill, clearAiImageGeneratorPrefill]);

    const handleGenerate = async () => {
        const genType = activeTab === 'text' ? 'text_to_model' : 'image_to_model';
        const p = activeTab === 'text' ? textPrompt : imageRefinementPrompt;
        const img = activeTab === 'image' ? imageUrl : '';

        if (activeTab === 'text' && !textPrompt.trim()) return;
        if (activeTab === 'image' && !imageUrl.trim()) return;

        if (userProfile && userProfile.aiCredits < 10) {
            showToast('Insufficient AI credits.', 'warn');
            return;
        }

        try {

            if (userProfile) {
                setUserProfile({ ...userProfile, aiCredits: userProfile.aiCredits - 10 });
            }

            const options = {
                model_version: isv2 ? 'v2.0-20240919' : 'v1.4-20240625',
            };
            if (activeTab === 'image' && imageRefinementPrompt.trim()) {
                options.prompt = imageRefinementPrompt.trim();
            }

            await startAiTask(genType, activeTab === 'text' ? p : '', img, options);
        } catch (err) {
            console.error('Generation failed:', err);
            fetchUserProfile();
        }
    };

    const handleAddToScene = () => {
        if (!resultUrl) return;

        addObject({
            type: 'gltf',
            name: activeTab === 'text' ? textPrompt.substring(0, 20) : 'AI Model',
            url: resultUrl,
            scale: [1, 1, 1],
            rotation: [0, 0, 0]
        });
        resetAiTask();
        setTextPrompt('');
        setImageUrl('');
        setLocalImageUrl(null);
        setImageRefinementPrompt('');
        appliedPrefillKey.current = '';
    };

    return (
        <div className="novira-ai-gen">
            <div className="novira-ai-gen__toolbar">
                <div className="novira-ai-gen__toolbar-text">
                    <h3 className="novira-ai-gen__title">3D model generator</h3>
                    <p className="novira-ai-gen__lede">
                        GLB output, queue-backed — usually under a minute once processing starts.
                    </p>
                </div>
                {userProfile && (
                    <div className="novira-ai-gen__credits" title="AI credits">
                        {userProfile.aiCredits} <span>credits</span>
                    </div>
                )}
            </div>

            <div className="novira-ai-gen__tabs" role="tablist">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'text'}
                    className={`novira-ai-gen__tab${activeTab === 'text' ? ' novira-ai-gen__tab--active' : ''}`}
                    onClick={() => setActiveTab('text')}
                >
                    Text → 3D
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'image'}
                    className={`novira-ai-gen__tab${activeTab === 'image' ? ' novira-ai-gen__tab--active' : ''}`}
                    onClick={() => setActiveTab('image')}
                >
                    Image → 3D
                </button>
            </div>

            {status === 'idle' || status === 'failed' ? (
                <div className="novira-ai-gen__body">
                    {activeTab === 'text' ? (
                        <textarea
                            value={textPrompt}
                            onChange={(e) => setTextPrompt(e.target.value)}
                            placeholder="Describe your 3D model here and let Novira Generate it for you"
                            className="prompt-box novira-ai-gen__prompt"
                        />
                    ) : (
                        <div className="novira-ai-gen__image-pane">
                            <div className="novira-ai-gen__image-input-wrap" onClick={() => fileInputRef.current?.click()}>
                                <input
                                    type="text"
                                    value={
                                        localImageUrl
                                            ? (String(localImageUrl).startsWith('data:') ? 'Local image selected' : 'Reference image (URL)')
                                            : imageUrl
                                    }
                                    onChange={(e) => {
                                        setLocalImageUrl(null);
                                        setImageUrl(e.target.value);
                                    }}
                                    disabled={!!localImageUrl}
                                    placeholder="Paste URL or browse image..."
                                    className="prompt-box novira-ai-gen__image-url"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="novira-ai-gen__browse-btn"
                                >
                                    Browse
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                />
                            </div>

                            <div className={`novira-ai-gen__preview ${localImageUrl ? 'has-image' : ''}`}>
                                {localImageUrl ? (
                                    <>
                                        <img src={localImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '100%', borderRadius: '4px', objectFit: 'contain' }} />
                                        <button
                                            type="button"
                                            onClick={() => { setLocalImageUrl(null); setImageUrl(''); setImageRefinementPrompt(''); appliedPrefillKey.current = ''; }}
                                            style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer' }}
                                        >
                                            ×
                                        </button>
                                    </>
                                ) : (
                                    <span className="novira-ai-gen__preview-placeholder">Browse or paste to preview</span>
                                )}
                            </div>
                            <textarea
                                value={imageRefinementPrompt}
                                onChange={(e) => setImageRefinementPrompt(e.target.value)}
                                placeholder="Optional: describe geometry, style, or materials to emphasize (sent with the image)."
                                className="prompt-box novira-ai-gen__refinement"
                            />
                        </div>
                    )}

                    {error && (
                        <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '4px' }}>
                            <p style={{ fontSize: '10px', color: 'var(--red)', margin: 0 }}>{error}</p>
                        </div>
                    )}

                    <div style={{ padding: '8px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '9px', fontWeight: 600, color: 'var(--silver)' }}>High Quality Model (v2.0)</span>
                                <span style={{ fontSize: '7px', color: 'rgba(255,255,255,0.4)' }}>Better for complex scenes & architecture</span>
                            </div>
                            <div
                                onClick={() => setIsv2(!isv2)}
                                style={{
                                    width: '28px',
                                    height: '14px',
                                    background: isv2 ? 'var(--blue)' : 'rgba(255,255,255,0.1)',
                                    borderRadius: '10px',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s ease'
                                }}
                            >
                                <div style={{
                                    width: '10px',
                                    height: '10px',
                                    background: 'white',
                                    borderRadius: '50%',
                                    position: 'absolute',
                                    top: '2px',
                                    left: isv2 ? '16px' : '2px',
                                    transition: 'all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
                                }} />
                            </div>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGenerate}
                        disabled={status === 'starting'}
                        className="novira-ai-gen__submit"
                    >
                        {status === 'starting' ? (
                            <ArrowPathIcon className="zeicon" style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                        ) : (
                            <SparklesIcon className="zeicon" style={{ width: 16, height: 16 }} />
                        )}
                        <span>Generate</span>
                    </button>
                </div>
            ) : status === 'success' ? (
                <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <div style={{ width: '48px', height: '48px', background: 'rgba(34, 197, 94, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                        <CubeIcon className="zeicon" style={{ color: 'var(--green)', width: 24, height: 24 }} />
                    </div>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, margin: '0 0 4px 0' }}>Model Ready!</h4>
                    <p style={{ fontSize: '10px', color: 'var(--silver)', marginBottom: '16px' }}>Your AI creation is ready to be added.</p>
                    <button
                        type="button"
                        onClick={handleAddToScene}
                        className="btn btn-primary"
                        style={{ width: '100%', background: 'var(--green)', boxShadow: '0 4px 15px rgba(34, 197, 94, 0.3)' }}
                    >
                        Place in Scene
                    </button>
                    <button
                        type="button"
                        onClick={resetAiTask}
                        style={{ background: 'none', border: 'none', color: 'var(--silver)', fontSize: '10px', marginTop: '12px', cursor: 'pointer' }}
                    >
                        Start New Generation
                    </button>
                </div>
            ) : (
                <div className="novira-ai-gen__running">
                    <div className="novira-ai-gen__ring-wrap">
                        <svg className="novira-ai-gen__ring" width="88" height="88" viewBox="0 0 88 88" aria-hidden>
                            <circle className="novira-ai-gen__ring-bg" cx="44" cy="44" r="38" fill="none" strokeWidth="5" />
                            <circle
                                className="novira-ai-gen__ring-progress"
                                cx="44"
                                cy="44"
                                r="38"
                                fill="none"
                                strokeWidth="5"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 38}`}
                                strokeDashoffset={`${2 * Math.PI * 38 * (1 - progress / 100)}`}
                                transform="rotate(-90 44 44)"
                            />
                        </svg>
                        <span className="novira-ai-gen__ring-label">{progress}%</span>
                    </div>
                    <p className="novira-ai-gen__running-title">{status}…</p>
                    <p className="novira-ai-gen__running-sub">Building mesh from your prompt or image</p>
                    <button
                        type="button"
                        onClick={resetAiTask}
                        style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: '10px', marginTop: '20px', cursor: 'pointer', opacity: 0.6 }}
                    >
                        Cancel Task
                    </button>
                </div>
            )}

            <style>{`
@keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
}
`}</style>
        </div>
    );
};

export default AiGenerationTool;
