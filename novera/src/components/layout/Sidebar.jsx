import React, { useState, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import useStore from '../../store/useStore';
import { VENUE_PRESETS } from '../../utils/venuePresets';
import { optimizeLogoDataUrl } from '../../utils/logoTextureUtils';
import AiGenerationTool from '../editor/AiGenerationTool';
import AssetBrowser from '../editor/AssetBrowser';
import ImportModal from '../common/ImportModal';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/pro-editor.css';
import {
    ViewColumnsIcon,
    CubeIcon,
    CubeTransparentIcon,
    StopIcon,
    LightBulbIcon,
    HomeIcon,
    ArrowUpTrayIcon,
    Squares2X2Icon,
    PhotoIcon,
    SparklesIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    MusicalNoteIcon,
    ChevronLeftIcon,
    EyeIcon,
    HeartIcon,
    CheckBadgeIcon,
    DocumentTextIcon,
    SunIcon,
} from '@heroicons/react/24/outline';

const CategoryRow = ({ icon: Icon, label, active, onClick }) => (
    <div className={`asset-category-row ${active ? 'active' : ''}`} onClick={onClick}>
        <div className="category-row-icon">
            <Icon className="zeicon" />
        </div>
        <span>{label}</span>
    </div>
);

const CommunityCard = ({ project, onLike, onView, onClick }) => {
    const { id, name, ownerName, ownerAvatar, isVerified, views, likes, isLiked, status, color, color2 } = project;

    const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    return (
        <div
            className="comm-card"
            onClick={() => {
                onView?.(id);
                onClick?.(id);
            }}
            style={{ cursor: 'pointer' }}
        >

            <div className="comm-card-preview" style={{ background: `linear-gradient(135deg, ${color}, ${color2})` }}>

                <div className="comm-preview-dot" style={{ left: '18%', top: '38%', width: 17, height: 17, opacity: 0.32 }} />
                <div className="comm-preview-dot" style={{ left: '52%', top: '28%', width: 11, height: 11, opacity: 0.42 }} />
                <div className="comm-preview-dot" style={{ left: '72%', top: '54%', width: 19, height: 19, opacity: 0.28 }} />
                <div className="comm-preview-dot" style={{ left: '38%', top: '62%', width: 8, height: 8, opacity: 0.38 }} />

                <span className={`comm-tag comm-tag-${status}`}>{status}</span>

                {isVerified && (
                    <span className="comm-verified">
                        <CheckBadgeIcon style={{ width: 11, height: 11 }} /> Certified
                    </span>
                )}
            </div>

            <div className="comm-card-body">
                <div className="comm-card-row">
                    <div className="comm-avatar" style={{ background: `linear-gradient(135deg,${color},${color2})` }}>
                        {ownerAvatar ?? ownerName?.[0]?.toUpperCase() ?? '?'}
                    </div>
                    <div className="comm-card-info">
                        <span className="comm-card-name">{name}</span>
                        <span className="comm-card-author">{ownerName}</span>
                    </div>
                </div>

                <div className="comm-card-stats">
                    <span className="comm-stat"><EyeIcon /> {fmt(views ?? 0)}</span>
                    <button
                        className={`comm-stat comm-stat-heart comm-like-btn ${isLiked ? 'liked' : ''}`}
                        onClick={(e) => { e.stopPropagation(); onLike?.(id); }}
                        title={isLiked ? 'Unlike' : 'Like'}
                    >
                        <HeartIcon /> {fmt(likes ?? 0)}
                    </button>
                </div>
            </div>
        </div>
    );
};

const CommCardSkeleton = () => (
    <div className="comm-card comm-card-skeleton">
        <div className="comm-skeleton-preview" />
        <div className="comm-card-body">
            <div className="comm-card-row">
                <div className="comm-skeleton-avatar" />
                <div className="comm-skeleton-lines">
                    <div className="comm-skeleton-line" style={{ width: '70%' }} />
                    <div className="comm-skeleton-line" style={{ width: '45%' }} />
                </div>
            </div>
        </div>
    </div>
);

const PRIMITIVES = [
    { label: 'Cube', geo: 'box', icon: CubeIcon, dims: [1, 1, 1] },
    { label: 'Sphere', geo: 'sphere', icon: SunIcon, dims: [1, 1, 1] },
    { label: 'Cylinder', geo: 'cylinder', icon: StopIcon, dims: [1, 2, 1] },
    { label: 'Cone', geo: 'cone', icon: SparklesIcon, dims: [1, 2, 1] },
    { label: 'Torus', geo: 'torus', icon: ViewColumnsIcon, dims: [2, 2, 2] },
    { label: 'Plane', geo: 'plane', icon: CubeTransparentIcon, dims: [2, 0.01, 2] },
];

const LIGHT_TYPES = [
    { label: 'Point Light', lightType: 'point', desc: 'Radiates light in all directions from a single point' },
    { label: 'Spot Light', lightType: 'spot', desc: 'Focused cone beam, ideal for highlighting areas' },
    { label: 'Directional', lightType: 'directional', desc: 'Parallel rays, simulates sunlight' },
    { label: 'Hemisphere', lightType: 'hemisphere', desc: 'Sky-ground ambient gradient fill light' },
];

function lightTypeIcon(lightType) {
    if (lightType === 'spot') return SparklesIcon;
    if (lightType === 'directional') return SunIcon;
    if (lightType === 'hemisphere') return ViewColumnsIcon;
    return LightBulbIcon;
}

const MATERIAL_PRESETS = [
    { label: 'Clay', color: '#e2e8f0', roughness: 0.5, metalness: 0.0, category: 'basic' },
    { label: 'Plastic', color: '#ef4444', roughness: 0.35, metalness: 0.0, category: 'basic' },
    { label: 'Rubber', color: '#1e293b', roughness: 1.0, metalness: 0.0, category: 'basic' },
    { label: 'Matte', color: '#f1f5f9', roughness: 0.9, metalness: 0.0, category: 'basic' },
    { label: 'Metal', color: '#94a3b8', roughness: 0.1, metalness: 0.9, category: 'metal' },
    { label: 'Chrome', color: '#e2e8f0', roughness: 0.02, metalness: 1.0, category: 'metal' },
    { label: 'Gold', color: '#fbbf24', roughness: 0.15, metalness: 1.0, category: 'metal' },
    { label: 'Copper', color: '#c2410c', roughness: 0.2, metalness: 0.9, category: 'metal' },
    { label: 'Brushed', color: '#78716c', roughness: 0.4, metalness: 0.85, category: 'metal' },
    { label: 'Iron', color: '#44403c', roughness: 0.55, metalness: 0.8, category: 'metal' },
    { label: 'Glass', color: '#e0f2fe', roughness: 0.0, metalness: 0.1, opacity: 0.25, category: 'transparent' },
    { label: 'Frosted', color: '#f1f5f9', roughness: 0.6, metalness: 0.0, opacity: 0.4, category: 'transparent' },
    { label: 'Ice', color: '#bae6fd', roughness: 0.1, metalness: 0.05, opacity: 0.35, category: 'transparent' },
    { label: 'Wood', color: '#92400e', roughness: 0.8, metalness: 0.0, category: 'natural' },
    { label: 'Stone', color: '#78716c', roughness: 0.85, metalness: 0.0, category: 'natural' },
    { label: 'Concrete', color: '#9ca3af', roughness: 0.95, metalness: 0.0, category: 'natural' },
    { label: 'Marble', color: '#f8fafc', roughness: 0.15, metalness: 0.0, category: 'natural' },
    { label: 'Leather', color: '#451a03', roughness: 0.65, metalness: 0.0, category: 'natural' },
    { label: 'Fabric', color: '#6366f1', roughness: 0.95, metalness: 0.0, category: 'natural' },
    { label: 'Neon Red', color: '#ff0040', roughness: 0.3, metalness: 0.0, emissive: '#ff0040', category: 'emissive' },
    { label: 'Neon Blue', color: '#0080ff', roughness: 0.3, metalness: 0.0, emissive: '#0080ff', category: 'emissive' },
    { label: 'Neon Green', color: '#00ff80', roughness: 0.3, metalness: 0.0, emissive: '#00ff80', category: 'emissive' },
    { label: 'Glow White', color: '#ffffff', roughness: 0.4, metalness: 0.0, emissive: '#ffffff', category: 'emissive' },
    { label: 'Lava', color: '#ff4500', roughness: 0.6, metalness: 0.0, emissive: '#ff2200', category: 'emissive' },
];

const panelLabelStyle = {
    fontSize: 10, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
    letterSpacing: '0.08em', textTransform: 'uppercase',
    color: 'var(--novira-online-chip-text)', backgroundColor: 'var(--novira-online-chip-bg)',
    border: '1px solid var(--novira-online-border-strong)',
    borderRadius: 8, padding: '6px 10px', display: 'inline-block', marginBottom: 10,
};

const panelBtnStyle = (active) => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 12px', borderRadius: 10, cursor: 'pointer', width: '100%',
    background: active ? 'linear-gradient(135deg, rgba(47,147,235,0.48), rgba(32,109,194,0.48))' : 'rgba(8,27,46,0.9)',
    border: `1px solid ${active ? 'var(--novira-online-btn-active-border)' : 'var(--novira-online-btn-idle-border)'}`,
    fontSize: 12, fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif", color: active ? 'var(--novira-online-text-main)' : '#c5ddf3',
    transition: 'all 0.15s',
});

const ONLINE_ASSET_THEME = {
    bgTop: 'var(--novira-online-bg-top)',
    bgBottom: 'var(--novira-online-bg-bottom)',
    cardTop: 'var(--novira-online-card-top)',
    cardBottom: 'var(--novira-online-card-bottom)',
    border: 'var(--novira-online-border)',
    borderStrong: 'var(--novira-online-border-strong)',
    chipBg: 'var(--novira-online-chip-bg)',
    chipText: 'var(--novira-online-chip-text)',
    textMain: 'var(--novira-online-text-main)',
    textMuted: 'var(--novira-online-text-muted)',
    btnTop: 'var(--novira-online-btn-top)',
    btnBottom: 'var(--novira-online-btn-bottom)',
    btnActiveBorder: 'var(--novira-online-btn-active-border)',
    btnIdleBorder: 'var(--novira-online-btn-idle-border)',
};

const ModelingPanel = ({ addObject }) => {
    return (
        <div style={{ padding: '0 10px 15px' }}>
            <span style={panelLabelStyle}>Add Primitive</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                {PRIMITIVES.map(p => (
                    <button
                        key={p.geo}
                        onClick={() => addObject({
                            name: p.label,
                            type: 'primitive',
                            geo: p.geo,
                            color: '#6366f1',
                            dimensions: p.dims,
                        })}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                            padding: '10px 6px', borderRadius: 6, cursor: 'pointer',
                            background: 'rgba(8,27,46,0.9)', border: '1px solid var(--novira-online-btn-idle-border)',
                            fontSize: 8, fontFamily: "'Poppins', sans-serif", color: '#c5ddf3',
                            transition: 'all 0.15s',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(47,147,235,0.22)'; e.currentTarget.style.borderColor = 'var(--novira-online-btn-active-border)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(8,27,46,0.9)'; e.currentTarget.style.borderColor = 'var(--novira-online-btn-idle-border)'; }}
                    >
                        <p.icon style={{ width: 16, height: 16 }} />
                        <span style={{ fontSize: 10, fontWeight: 600 }}>{p.label}</span>
                    </button>
                ))}
            </div>

            <div style={{ marginTop: 14 }}>
                <span style={panelLabelStyle}>Quick Add</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <button
                        onClick={() => addObject({ name: 'Name Plate', type: 'primitive', geo: 'box', color: '#8b5cf6', dimensions: [2, 0.5, 0.1] })}
                        style={panelBtnStyle(false)}
                    >
                        <DocumentTextIcon style={{ width: 14, height: 14 }} /> <span>Name Plate</span>
                    </button>
                    <button
                        onClick={() => addObject({ name: 'Ground Plane', type: 'primitive', geo: 'plane', color: '#64748b', dimensions: [20, 0.01, 20] })}
                        style={panelBtnStyle(false)}
                    >
                        <CubeTransparentIcon style={{ width: 14, height: 14 }} /> <span>Ground Plane</span>
                    </button>
                    <button
                        onClick={() => addObject({ name: 'Wall', type: 'primitive', geo: 'box', color: '#94a3b8', dimensions: [4, 3, 0.15] })}
                        style={panelBtnStyle(false)}
                    >
                        <ViewColumnsIcon style={{ width: 14, height: 14 }} /> <span>Wall Section</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

const LightingPanel = ({ addObject }) => {
    const objects = useStore(s => s.objects);
    const setSelectedId = useStore(s => s.setSelectedId);
    const updateObject = useStore(s => s.updateObject);
    const removeObject = useStore(s => s.removeObject);
    const selectedId = useStore(s => s.selectedId);
    const sceneLights = objects.filter(o => o.type === 'light');
    const selectedLight = sceneLights.find(l => l.id === selectedId);

    return (
        <div style={{ padding: '0 10px 15px' }}>
            <span style={panelLabelStyle}>Add Light</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
                {LIGHT_TYPES.map(lt => (
                    <button
                        key={lt.lightType}
                        onClick={() => addObject({
                            name: lt.label,
                            type: 'light',
                            lightType: lt.lightType,
                            color: '#ffffff',
                            intensity: lt.lightType === 'directional' ? 1.5 : 2,
                            distance: 15,
                            angle: Math.PI / 6,
                            dimensions: [0.3, 0.3, 0.3],
                            position: [0, 3, 0],
                        })}
                        style={panelBtnStyle(false)}
                    >
                        {React.createElement(lightTypeIcon(lt.lightType), { style: { width: 14, height: 14 } })}
                        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                            <span style={{ fontWeight: 600, fontSize: 11 }}>{lt.label}</span>
                            <span style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.25 }}>{lt.desc}</span>
                        </div>
                    </button>
                ))}
            </div>

            {sceneLights.length > 0 && (
                <>
                    <span style={panelLabelStyle}>Scene Lights ({sceneLights.length})</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {sceneLights.map(light => (
                            <div
                                key={light.id}
                                onClick={() => setSelectedId(light.id)}
                                style={{
                                    ...panelBtnStyle(selectedId === light.id),
                                    justifyContent: 'space-between',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{
                                        width: 10, height: 10, borderRadius: '50%',
                                        background: light.color || '#fff',
                                        border: '1px solid #d1d5db', flexShrink: 0
                                    }} />
                                    <span style={{ fontSize: 11 }}>{light.name || light.lightType}</span>
                                </div>
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeObject(light.id); }}
                                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10, padding: '2px 4px' }}
                                >✕</button>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {selectedLight && (
                <div style={{ marginTop: 12 }}>
                    <span style={panelLabelStyle}>Light Properties</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 10, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                            Color
                            <input
                                type="color"
                                value={selectedLight.color || '#ffffff'}
                                onChange={e => updateObject(selectedLight.id, { color: e.target.value })}
                                style={{ width: '100%', height: 24, border: '1px solid #e8edf4', borderRadius: 4, cursor: 'pointer', marginTop: 2 }}
                            />
                        </label>
                        <label style={{ fontSize: 10, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                            Intensity: {(selectedLight.intensity ?? 1).toFixed(1)}
                            <input
                                type="range" min="0" max="10" step="0.1"
                                value={selectedLight.intensity ?? 1}
                                onChange={e => updateObject(selectedLight.id, { intensity: parseFloat(e.target.value) })}
                                style={{ width: '100%', marginTop: 2 }}
                            />
                        </label>
                        {(selectedLight.lightType === 'point' || selectedLight.lightType === 'spot') && (
                            <label style={{ fontSize: 10, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                                Distance: {(selectedLight.distance ?? 15).toFixed(0)}
                                <input
                                    type="range" min="1" max="50" step="1"
                                    value={selectedLight.distance ?? 15}
                                    onChange={e => updateObject(selectedLight.id, { distance: parseFloat(e.target.value) })}
                                    style={{ width: '100%', marginTop: 2 }}
                                />
                            </label>
                        )}
                        {selectedLight.lightType === 'spot' && (
                            <label style={{ fontSize: 10, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                                Angle: {((selectedLight.angle ?? Math.PI / 6) * (180 / Math.PI)).toFixed(0)}°
                                <input
                                    type="range" min="5" max="90" step="1"
                                    value={(selectedLight.angle ?? Math.PI / 6) * (180 / Math.PI)}
                                    onChange={e => updateObject(selectedLight.id, { angle: parseFloat(e.target.value) * (Math.PI / 180) })}
                                    style={{ width: '100%', marginTop: 2 }}
                                />
                            </label>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

const ShadingPanel = () => {
    const selectedId = useStore(s => s.selectedId);
    const objects = useStore(s => s.objects);
    const updateObject = useStore(s => s.updateObject);
    const selected = objects.find(o => o.id === selectedId);
    const logoInputRef = React.useRef(null);
    const [materialPrompt, setMaterialPrompt] = useState('');

    const [matCategory, setMatCategory] = useState('all');
    const categories = ['all', 'basic', 'metal', 'transparent', 'natural', 'emissive'];
    const filtered = matCategory === 'all' ? MATERIAL_PRESETS : MATERIAL_PRESETS.filter(m => m.category === matCategory);

    const applyPreset = (m) => {
        if (!selectedId) return;
        const props = { color: m.color, roughness: m.roughness, metalness: m.metalness };
        if (m.opacity !== undefined) props.opacity = m.opacity;
        if (m.emissive) props.emissive = m.emissive;
        updateObject(selectedId, props);
    };
    const applyAIMaterialPrompt = () => {
        if (!selectedId) return;
        const mat = deriveRenderMaterialFromPrompt(materialPrompt);
        updateObject(selectedId, {
            color: mat.color,
            roughness: mat.roughness,
            metalness: mat.metalness,
            opacity: mat.opacity,
            emissive: mat.emissive,
        });
    };

    return (
        <div style={{ padding: '0 10px 15px' }}>
            <span style={panelLabelStyle}>AI material prompt</span>
            <div style={{
                marginBottom: 10,
                padding: '8px',
                borderRadius: 8,
                border: '1px solid rgba(125,211,252,0.35)',
                background: 'linear-gradient(180deg, rgba(239,246,255,0.95), rgba(224,242,254,0.95))',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
            }}>
                <input
                    type="text"
                    value={materialPrompt}
                    onChange={(e) => setMaterialPrompt(e.target.value)}
                    placeholder="e.g. weathered copper with green patina"
                    style={{ width: '100%', padding: '8px', borderRadius: 6, border: '1px solid #7dd3fc', fontSize: 8, fontFamily: "'Poppins', sans-serif", background: '#0b2a3f', color: '#e0f2fe' }}
                />
                <button
                    type="button"
                    onClick={applyAIMaterialPrompt}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: selectedId ? 'pointer' : 'not-allowed',
                        opacity: selectedId ? 1 : 0.6,
                        background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', color: '#ecfeff',
                        border: '1px solid rgba(6,182,212,0.45)', fontSize: 8, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                    }}
                    disabled={!selectedId}
                >
                    Apply Material to Selected Object
                </button>
                <p style={{ fontSize: 6, color: '#0f766e', margin: 0, lineHeight: 1.35 }}>
                    Tip: choose object first, then describe finish in plain words.
                </p>
            </div>
            <span style={panelLabelStyle}>Material Library</span>

            <div style={{ display: 'flex', gap: 3, marginBottom: 8, flexWrap: 'wrap' }}>
                {categories.map(c => (
                    <button
                        key={c}
                        onClick={() => setMatCategory(c)}
                        style={{
                            padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 7,
                            background: matCategory === c ? '#3b82f6' : '#f1f5f9',
                            color: matCategory === c ? '#fff' : '#64748b',
                            border: 'none', fontFamily: "'Poppins', sans-serif", textTransform: 'capitalize',
                        }}
                    >
                        {c}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 14, maxHeight: 160, overflowY: 'auto' }}>
                {filtered.map(m => (
                    <button
                        key={m.label}
                        onClick={() => applyPreset(m)}
                        title={selectedId ? `Apply ${m.label}` : 'Select an object first'}
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                            padding: '5px 2px', borderRadius: 6, cursor: selectedId ? 'pointer' : 'default',
                            background: 'rgba(255,255,255,0.03)', border: '1px solid #e8edf4',
                            fontSize: 6.5, fontFamily: "'Poppins', sans-serif", color: '#334155',
                            opacity: selectedId ? 1 : 0.45, transition: 'all .15s',
                        }}
                    >
                        <span style={{
                            width: 22, height: 22, borderRadius: '50%',
                            background: m.emissive
                                ? `radial-gradient(circle, ${m.emissive}, ${m.color})`
                                : m.opacity !== undefined
                                    ? `linear-gradient(135deg, ${m.color}66, ${m.color})`
                                    : m.color,
                            border: '2px solid #e8edf4',
                            boxShadow: m.emissive ? `0 0 8px ${m.emissive}80` :
                                m.metalness > 0.5 ? `inset 0 -4px 8px rgba(0,0,0,0.3), 0 0 4px ${m.color}40` :
                                'inset 0 -4px 8px rgba(0,0,0,0.15)',
                        }} />
                        <span>{m.label}</span>
                    </button>
                ))}
            </div>

            {selected && selected.type !== 'ground' && (
                <div>
                    <span style={panelLabelStyle}>Object Material</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <label style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                            Color
                            <input type="color" value={selected.color || '#6366f1'}
                                onChange={e => updateObject(selectedId, { color: e.target.value })}
                                style={{ width: '100%', height: 22, border: '1px solid #e8edf4', borderRadius: 4, cursor: 'pointer', marginTop: 2 }} />
                        </label>
                        <label style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                            Roughness: {(selected.roughness ?? 0.3).toFixed(2)}
                            <input type="range" min="0" max="1" step="0.01"
                                value={selected.roughness ?? 0.3}
                                onChange={e => updateObject(selectedId, { roughness: parseFloat(e.target.value) })}
                                style={{ width: '100%', marginTop: 2 }} />
                        </label>
                        <label style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                            Metalness: {(selected.metalness ?? 0.2).toFixed(2)}
                            <input type="range" min="0" max="1" step="0.01"
                                value={selected.metalness ?? 0.2}
                                onChange={e => updateObject(selectedId, { metalness: parseFloat(e.target.value) })}
                                style={{ width: '100%', marginTop: 2 }} />
                        </label>
                        <label style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                            Opacity: {(selected.opacity ?? 1).toFixed(2)}
                            <input type="range" min="0" max="1" step="0.01"
                                value={selected.opacity ?? 1}
                                onChange={e => updateObject(selectedId, { opacity: parseFloat(e.target.value) })}
                                style={{ width: '100%', marginTop: 2 }} />
                        </label>
                        <label style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>
                            Emissive
                            <input type="color" value={selected.emissive || '#000000'}
                                onChange={e => updateObject(selectedId, { emissive: e.target.value })}
                                style={{ width: '100%', height: 20, border: '1px solid #e8edf4', borderRadius: 4, cursor: 'pointer', marginTop: 2 }} />
                        </label>
                        <span style={{ ...panelLabelStyle, marginTop: 10 }}>Logo / branding map</span>
                        <p style={{ fontSize: 7, color: '#94a3b8', margin: '0 0 6px', lineHeight: 1.35 }}>
                            Import PNG or JPG. Novira auto-resizes large images and maps them to the selected booth, banner, or primitive surface (UV-aligned diffuse).
                        </p>
                        <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async (e) => {
                                const file = e.target.files?.[0];
                                e.target.value = '';
                                if (!file || !selectedId) return;
                                const reader = new FileReader();
                                reader.onloadend = async () => {
                                    const raw = reader.result;
                                    const optimized = await optimizeLogoDataUrl(raw, 2048);
                                    updateObject(selectedId, {
                                        materialMaps: { diffuse: optimized },
                                        roughness: selected.roughness ?? 0.42,
                                        metalness: selected.metalness ?? 0.06,
                                    });
                                };
                                reader.readAsDataURL(file);
                            }} />
                        <button
                            type="button"
                            onClick={() => logoInputRef.current?.click()}
                            style={{
                                width: '100%', padding: '8px', borderRadius: 6, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', color: '#fff',
                                border: 'none', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                            }}
                        >
                            Apply logo (2D → 3D surface)
                        </button>
                        {selected.materialMaps?.diffuse && (
                            <button
                                type="button"
                                onClick={() => updateObject(selectedId, { materialMaps: null })}
                                style={{ marginTop: 6, width: '100%', padding: '6px', fontSize: 7, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', cursor: 'pointer' }}
                            >
                                Clear logo map
                            </button>
                        )}
                    </div>
                </div>
            )}

            {!selected && (
                <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: 8, fontFamily: "'Poppins', sans-serif" }}>
                    Select an object to edit its material
                </div>
            )}
        </div>
    );
};

const AudioPanel = ({ addObject }) => {
    const [audioFile, setAudioFile] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);

    const handleAudioUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAudioFile(file);
        setAudioUrl(URL.createObjectURL(file));
    };

    return (
        <div style={{ padding: '0 10px 15px' }}>
            <span style={panelLabelStyle}>Audio</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                    type="button"
                    onClick={() => addObject?.({
                        name: 'PA Speaker (coverage)',
                        type: 'primitive',
                        geo: 'cylinder',
                        color: '#1e293b',
                        dimensions: [0.35, 0.55, 0.35],
                        noviraSpeaker: { range: 14, arcDeg: 110 },
                    })}
                    style={{
                        width: '100%', padding: '8px', borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(14,165,233,0.12)', color: '#0369a1',
                        border: '1px solid rgba(14,165,233,0.35)', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    + Add PA speaker (sound zone)
                </button>
                <p style={{ fontSize: 7, color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                    Enable “Sound coverage” in Render &amp; Export to visualize SPL-style zones. Pair with spot lights for stage focus.
                </p>
                <label style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '14px 10px', borderRadius: 6, cursor: 'pointer',
                    background: 'rgba(139,92,246,0.05)', border: '1.5px dashed rgba(139,92,246,0.3)',
                    fontSize: 8, fontFamily: "'Poppins', sans-serif", color: '#8b5cf6',
                    textAlign: 'center',
                }}>
                    <MusicalNoteIcon style={{ width: 20, height: 20 }} />
                    <span style={{ fontWeight: 600 }}>Upload Audio File</span>
                    <span style={{ fontSize: 7, color: '#94a3b8' }}>MP3, WAV, OGG — up to 50MB</span>
                    <input type="file" accept="audio/*" onChange={handleAudioUpload} style={{ display: 'none' }} />
                </label>

                {audioFile && (
                    <div style={{ padding: '8px', background: 'rgba(139,92,246,0.05)', borderRadius: 6, border: '1px solid rgba(139,92,246,0.15)' }}>
                        <div style={{ fontSize: 8, fontWeight: 600, color: '#334155', fontFamily: "'Poppins', sans-serif", marginBottom: 4 }}>
                            {audioFile.name}
                        </div>
                        <audio controls src={audioUrl} style={{ width: '100%', height: 28 }} />
                    </div>
                )}
            </div>
        </div>
    );
};

function deriveRenderMaterialFromPrompt(prompt) {
    const p = String(prompt || '').toLowerCase();
    const base = { color: '#cbd5e1', roughness: 0.55, metalness: 0.08, opacity: 1, emissive: '#000000' };
    if (!p.trim()) return base;
    if (p.includes('gold')) return { ...base, color: '#f5c542', roughness: 0.18, metalness: 1.0 };
    if (p.includes('copper')) return { ...base, color: '#b86a4a', roughness: 0.26, metalness: 0.95 };
    if (p.includes('chrome')) return { ...base, color: '#dce6f5', roughness: 0.05, metalness: 1.0 };
    if (p.includes('glass')) return { ...base, color: '#d9f2ff', roughness: 0.05, metalness: 0.05, opacity: 0.28 };
    if (p.includes('rubber')) return { ...base, color: '#1f2937', roughness: 0.95, metalness: 0.0 };
    if (p.includes('concrete')) return { ...base, color: '#a8adb7', roughness: 0.9, metalness: 0.0 };
    if (p.includes('wood')) return { ...base, color: '#8b5a2b', roughness: 0.78, metalness: 0.0 };
    if (p.includes('neon') || p.includes('emissive') || p.includes('glow')) return { ...base, color: '#7dd3fc', roughness: 0.3, metalness: 0.0, emissive: '#60a5fa' };
    return base;
}

const RenderingPanel = () => {
    const projectName = useStore(s => s.projectName);
    const objects = useStore(s => s.objects);
    const selectedId = useStore(s => s.selectedId);
    const luxPreviewVisible = useStore(s => s.luxPreviewVisible);
    const setLuxPreviewVisible = useStore(s => s.setLuxPreviewVisible);
    const soundCoverageVisible = useStore(s => s.soundCoverageVisible);
    const setSoundCoverageVisible = useStore(s => s.setSoundCoverageVisible);
    const crowdFlowVisible = useStore(s => s.crowdFlowVisible);
    const setCrowdFlowVisible = useStore(s => s.setCrowdFlowVisible);
    const setEnvPreset = useStore(s => s.setEnvPreset);
    const setLightingEnabled = useStore(s => s.setLightingEnabled);
    const setEnvironmentVisible = useStore(s => s.setEnvironmentVisible);
    const setSunMinutesFromMidnight = useStore(s => s.setSunMinutesFromMidnight);
    const setSunCloudiness = useStore(s => s.setSunCloudiness);
    const setViewportNavMode = useStore(s => s.setViewportNavMode);
    const setCameraFocus = useStore(s => s.setCameraFocus);
    const webxrImmersiveVRAvailable = useStore(s => s.webxrImmersiveVRAvailable);
    const xrPresenting = useStore(s => s.xrPresenting);

    const [resolution, setResolution] = useState('3840x2160');
    const [quality, setQuality] = useState('high');
    const [walkthroughSeconds, setWalkthroughSeconds] = useState(12);
    const [walkthroughFps, setWalkthroughFps] = useState(30);
    const [cubeFaceSize, setCubeFaceSize] = useState(1024);
    const [simpleGoal, setSimpleGoal] = useState('client-review');
    const [simpleQuality, setSimpleQuality] = useState('balanced');
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [sceneType, setSceneType] = useState('auto');
    const [timeOfDay, setTimeOfDay] = useState('auto');
    const [mood, setMood] = useState('auto');
    const [aiStatus, setAiStatus] = useState('Ready - configure scene type and click Generate');
    const [camPreset, setCamPreset] = useState('manual');
    const [directorPrompt, setDirectorPrompt] = useState('');
    const [directorShotMeta, setDirectorShotMeta] = useState('No director shot yet.');
    const [directorShots, setDirectorShots] = useState([]);
    const renderLabelStyle = {
        fontSize: 10, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
        letterSpacing: '0.08em', textTransform: 'uppercase',
        color: ONLINE_ASSET_THEME.chipText, backgroundColor: ONLINE_ASSET_THEME.chipBg,
        border: `1px solid ${ONLINE_ASSET_THEME.borderStrong}`,
        borderRadius: 8, padding: '6px 10px', display: 'inline-block', marginBottom: 10,
    };
    const renderInputStyle = {
        width: '100%',
        padding: '7px 8px',
        borderRadius: 6,
        border: `1px solid ${ONLINE_ASSET_THEME.borderStrong}`,
        fontSize: 8,
        fontFamily: "'Poppins', sans-serif",
        background: `linear-gradient(180deg, ${ONLINE_ASSET_THEME.cardTop}, ${ONLINE_ASSET_THEME.cardBottom})`,
        color: ONLINE_ASSET_THEME.textMain,
    };
    const renderCardStyle = {
        marginBottom: 10,
        padding: '10px',
        borderRadius: 10,
        border: `1px solid ${ONLINE_ASSET_THEME.border}`,
        background: `linear-gradient(180deg, ${ONLINE_ASSET_THEME.cardTop}, ${ONLINE_ASSET_THEME.cardBottom})`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.07), 0 8px 22px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
    };
    const renderBtnBase = {
        width: '100%',
        padding: '9px',
        borderRadius: 8,
        cursor: 'pointer',
        fontSize: 8,
        fontWeight: 700,
        fontFamily: "'Poppins', sans-serif",
        color: ONLINE_ASSET_THEME.textMain,
        border: `1px solid ${ONLINE_ASSET_THEME.borderStrong}`,
        background: `linear-gradient(135deg, ${ONLINE_ASSET_THEME.btnTop}, ${ONLINE_ASSET_THEME.btnBottom})`,
    };
    const renderOptionBtn = (active) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 10,
        cursor: 'pointer',
        width: '100%',
        background: active ? 'linear-gradient(135deg, rgba(47,147,235,0.48), rgba(32,109,194,0.48))' : 'rgba(8,27,46,0.9)',
        border: `1px solid ${active ? ONLINE_ASSET_THEME.btnActiveBorder : ONLINE_ASSET_THEME.btnIdleBorder}`,
        fontSize: 12,
        fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
        color: active ? '#f2fbff' : '#c5ddf3',
        transition: 'all 0.15s',
    });
    const sceneStats = useMemo(() => {
        const nonGround = (objects || []).filter(o => o.type !== 'ground');
        const lights = nonGround.filter(o => o.type === 'light').length;
        const imported = nonGround.filter(o => ['gltf', 'stl', 'sketchfab'].includes(String(o.type || '').toLowerCase())).length;
        const meshes = nonGround.length - lights;
        return { total: nonGround.length, meshes, lights, imported };
    }, [objects]);
    const recommendedProfile = useMemo(() => {
        if (sceneStats.total >= 45 || sceneStats.imported >= 15 || sceneStats.lights >= 12) return 'fast';
        if (sceneStats.total >= 18 || sceneStats.imported >= 6 || sceneStats.lights >= 5) return 'balanced';
        return 'cinematic';
    }, [sceneStats]);
    const profileLabel = recommendedProfile === 'fast' ? 'Fast Preview'
        : recommendedProfile === 'balanced' ? 'Balanced'
            : 'Final Cinematic';
    const selectedObj = (objects || []).find(o => o.id === selectedId);
    const sceneCenter = useMemo(() => {
        const nonGround = (objects || []).filter(o => o.type !== 'ground');
        if (!nonGround.length) return [0, 1.5, 0];
        const acc = nonGround.reduce((a, o) => {
            const p = o.position || [0, 0, 0];
            return [a[0] + p[0], a[1] + p[1], a[2] + p[2]];
        }, [0, 0, 0]);
        return [acc[0] / nonGround.length, Math.max(1.2, acc[1] / nonGround.length), acc[2] / nonGround.length];
    }, [objects]);
    const sceneRadius = useMemo(() => {
        const nonGround = (objects || []).filter(o => o.type !== 'ground');
        if (!nonGround.length) return 8;
        const c = sceneCenter;
        let maxR = 2;
        nonGround.forEach((o) => {
            const p = o.position || [0, 0, 0];
            const dx = p[0] - c[0];
            const dy = p[1] - c[1];
            const dz = p[2] - c[2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
            const dim = Array.isArray(o.dimensions) ? Math.max(...o.dimensions.map((n) => Math.abs(Number(n) || 0))) : 1;
            maxR = Math.max(maxR, dist + dim * 0.8);
        });
        return Math.max(4, Math.min(30, maxR));
    }, [objects, sceneCenter]);

    const captureViewportQuick = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${projectName || 'novira-render'}-viewport.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const captureHighRes = () => {
        const safeName = (projectName || 'novira-render').replace(/[^\w\-]+/g, '_');
        document.dispatchEvent(new CustomEvent('novira:capture-highres', {
            detail: { resolution, filename: `${safeName}-${resolution}.png`, quality },
        }));
    };

    const recordWalkthrough = () => {
        const safeName = (projectName || 'novira-walkthrough').replace(/[^\w\-]+/g, '_');
        document.dispatchEvent(new CustomEvent('novira:record-viewport', {
            detail: { seconds: walkthroughSeconds, fps: walkthroughFps, quality, filename: `${safeName}-${Date.now()}.webm` },
        }));
    };

    const exportCubemap = () => {
        const safeName = (projectName || 'novira-360').replace(/[^\w\-]+/g, '_');
        document.dispatchEvent(new CustomEvent('novira:export-cubemap', {
            detail: { size: cubeFaceSize, center: [0, 2.4, 6], projectName: safeName },
        }));
    };

    const exportEquirectangular = () => {
        const safeName = (projectName || 'novira-360').replace(/[^\w\-]+/g, '_');
        document.dispatchEvent(new CustomEvent('novira:export-equirectangular', {
            detail: { cubeFaceSize: 512, center: [0, 2.4, 6], projectName: safeName },
        }));
    };

    const technicalPdf = () => {
        document.dispatchEvent(new CustomEvent('novira:export-technical-report'));
    };
    const runAILighting = () => {
        setAiStatus('Analyzing scene...');
        const nextScene = sceneType === 'auto'
            ? (sceneStats.imported > 4 ? 'product' : sceneStats.lights > 4 ? 'studio' : 'exterior')
            : sceneType;
        const nextTime = timeOfDay === 'auto'
            ? (mood === 'dark' ? 'night' : mood === 'warm' ? 'golden' : 'noon')
            : timeOfDay;
        const nextMood = mood === 'auto' ? 'natural' : mood;
        if (nextTime === 'night') {
            setEnvPreset('city');
            setSunMinutesFromMidnight(22 * 60);
            setSunCloudiness(0.45);
        } else if (nextTime === 'golden' || nextTime === 'dawn' || nextTime === 'dusk') {
            setEnvPreset('sunset');
            setSunMinutesFromMidnight(18 * 60);
            setSunCloudiness(nextMood === 'dramatic' ? 0.55 : 0.3);
        } else if (nextScene === 'interior' || nextScene === 'studio' || nextScene === 'product') {
            setEnvPreset('studio');
            setSunMinutesFromMidnight(13 * 60);
            setSunCloudiness(0.2);
        } else {
            setEnvPreset('apartment');
            setSunMinutesFromMidnight(12 * 60);
            setSunCloudiness(0.15);
        }
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setAiStatus(`Applied AI lighting: ${nextScene} / ${nextTime} / ${nextMood}`);
    };
    const applyCameraPreset = (preset, opts = {}) => {
        setCamPreset(preset);
        const target = opts.target || selectedObj?.position || sceneCenter;
        const baseDist = Math.max(6, opts.distance || sceneRadius * 1.25);
        const baseHeight = Math.max(2, opts.height || Math.max(2.5, sceneRadius * 0.45));
        if (preset === 'orbit') {
            setViewportNavMode('orbit');
            setCameraFocus(target, [target[0] + baseDist, target[1] + baseHeight, target[2] + baseDist]);
        } else if (preset === 'flythrough') {
            setViewportNavMode('walk');
            setCameraFocus(target, [target[0] + baseDist * 1.45, target[1] + Math.max(1.8, baseHeight * 0.6), target[2] + 2]);
        } else if (preset === 'crane') {
            setViewportNavMode('orbit');
            setCameraFocus(target, [target[0] + baseDist * 0.9, target[1] + baseHeight * 2.2, target[2] + baseDist * 0.9]);
        } else if (preset === 'dolly') {
            setViewportNavMode('orbit');
            setCameraFocus(target, [target[0], target[1] + Math.max(1.8, baseHeight * 0.55), target[2] + baseDist * 1.7]);
        } else {
            setViewportNavMode('orbit');
        }
    };
    const runAIDirectorShot = () => {
        const p = String(directorPrompt || '').toLowerCase();
        const target = selectedObj?.position || sceneCenter;
        let preset = 'orbit';
        if (p.includes('fly') || p.includes('fly-through') || p.includes('flythrough')) preset = 'flythrough';
        else if (p.includes('crane')) preset = 'crane';
        else if (p.includes('dolly') || p.includes('push')) preset = 'dolly';
        else if (p.includes('orbit') || p.includes('360')) preset = 'orbit';

        const moodToken = p.includes('night') ? 'night'
            : p.includes('golden') || p.includes('sunset') ? 'golden'
                : p.includes('dawn') ? 'dawn'
                    : p.includes('dramatic') ? 'dramatic'
                        : 'natural';

        if (moodToken === 'night') {
            setEnvPreset('city');
            setSunMinutesFromMidnight(22 * 60);
            setSunCloudiness(0.45);
        } else if (moodToken === 'golden' || moodToken === 'dawn') {
            setEnvPreset('sunset');
            setSunMinutesFromMidnight(moodToken === 'dawn' ? 6 * 60 : 18 * 60);
            setSunCloudiness(0.32);
        } else if (moodToken === 'dramatic') {
            setEnvPreset('studio');
            setSunMinutesFromMidnight(17 * 60);
            setSunCloudiness(0.62);
        } else {
            setEnvPreset('apartment');
            setSunMinutesFromMidnight(12 * 60);
            setSunCloudiness(0.2);
        }

        // Lightweight collision-aware clearance: widen shot in dense scenes.
        const densityBias = sceneStats.total > 40 ? 1.4 : sceneStats.total > 20 ? 1.2 : 1.0;
        const importBias = sceneStats.imported > 8 ? 1.25 : 1.0;
        const clearanceDist = sceneRadius * densityBias * importBias;
        applyCameraPreset(preset, { target, distance: clearanceDist, height: Math.max(2.4, clearanceDist * 0.42) });
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setWalkthroughSeconds(p.includes('slow') ? 18 : p.includes('fast') ? 8 : 12);
        setWalkthroughFps(p.includes('cinematic') || p.includes('dramatic') ? 24 : 30);
        setDirectorShotMeta(`Director applied: ${preset} · mood ${moodToken} · clearance ${clearanceDist.toFixed(1)}m`);
        setAiStatus(`Director shot ready from prompt: ${directorPrompt || 'auto shot'}`);
    };
    const createDirectorShotsFromPrompt = () => {
        const p = String(directorPrompt || '').toLowerCase();
        const target = selectedObj?.position || sceneCenter;
        const dist = Math.max(6, sceneRadius * (sceneStats.total > 28 ? 1.35 : 1.15));
        const moodToken = p.includes('night') ? 'night' : (p.includes('golden') ? 'golden' : 'natural');
        const pace = p.includes('slow') || p.includes('cinematic') ? 'slow' : (p.includes('fast') || p.includes('quick') ? 'fast' : 'normal');
        const totalFrames = pace === 'slow' ? 360 : pace === 'fast' ? 180 : 240;
        const moveLabel = p.includes('crane') ? 'Crane Move' : p.includes('dolly') ? 'Dolly Move' : p.includes('fly') ? 'Flythrough Move' : 'Orbit Move';
        const ratios = pace === 'slow' ? [0.34, 0.42, 0.24] : pace === 'fast' ? [0.3, 0.45, 0.25] : [0.33, 0.38, 0.29];
        const f1 = Math.max(1, Math.round(totalFrames * ratios[0]));
        const f2 = Math.max(f1 + 1, Math.round(totalFrames * (ratios[0] + ratios[1])));
        const shots = [
            { id: 'establish', name: 'Establish Wide', frameStart: 1, frameEnd: f1, cameraTarget: target, cameraPosition: [target[0] + dist * 1.2, target[1] + dist * 0.55, target[2] + dist * 1.2], navMode: 'orbit', envPreset: moodToken === 'night' ? 'city' : moodToken === 'golden' ? 'sunset' : 'apartment' },
            { id: 'move', name: moveLabel, frameStart: f1 + 1, frameEnd: f2, cameraTarget: target, cameraPosition: p.includes('crane') ? [target[0] + dist * 0.9, target[1] + dist * 1.15, target[2] + dist * 0.8] : p.includes('dolly') ? [target[0], target[1] + dist * 0.35, target[2] + dist * 1.6] : p.includes('fly') ? [target[0] + dist * 1.5, target[1] + dist * 0.32, target[2] + dist * 0.2] : [target[0] - dist, target[1] + dist * 0.45, target[2] + dist * 0.45], navMode: p.includes('fly') ? 'walk' : 'orbit', envPreset: moodToken === 'night' ? 'city' : moodToken === 'golden' ? 'sunset' : 'studio' },
            { id: 'close', name: 'Close-up', frameStart: f2 + 1, frameEnd: totalFrames, cameraTarget: target, cameraPosition: [target[0] + dist * 0.35, target[1] + Math.max(1.8, dist * 0.25), target[2] + dist * 0.45], navMode: 'orbit', envPreset: moodToken === 'night' ? 'city' : moodToken === 'golden' ? 'sunset' : 'studio' },
        ];
        return shots;
    };
    const buildDirectorShots = () => {
        const shots = createDirectorShotsFromPrompt();
        setDirectorShots(shots);
        setDirectorShotMeta(`Built ${shots.length} shots (${shots[0].frameStart}-${shots[shots.length - 1].frameEnd})`);
        if (shots[0]) {
            setEnvPreset(shots[0].envPreset);
            setCameraFocus(shots[0].cameraTarget, shots[0].cameraPosition);
            setViewportNavMode(shots[0].navMode);
            setLightingEnabled(true);
            setEnvironmentVisible(true);
        }
    };
    const queueDirectorShotsToExport = (shotsInput = directorShots) => {
        if (!shotsInput.length) return;
        document.dispatchEvent(new CustomEvent('novira:open-export-panel', {
            detail: {
                directorQueue: shotsInput.map((s, idx) => ({
                    id: `shot-${idx + 1}`,
                    name: s.name,
                    frameStart: s.frameStart,
                    frameEnd: s.frameEnd,
                    cameraTarget: s.cameraTarget,
                    cameraPosition: s.cameraPosition,
                    navMode: s.navMode,
                    envPreset: s.envPreset,
                })),
                directorMeta: {
                    prompt: directorPrompt,
                    fps: walkthroughFps,
                    durationSec: Math.round((shotsInput[shotsInput.length - 1]?.frameEnd || 240) / Math.max(1, walkthroughFps)),
                },
            },
        }));
    };
    const runDirectorAndQueue = () => {
        document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: 'Director AI: lighting + shots + export queue…' } }));
        runAIDirectorShot();
        const shots = createDirectorShotsFromPrompt();
        setDirectorShots(shots);
        setDirectorShotMeta(`Built ${shots.length} shots and queued export.`);
        queueDirectorShotsToExport(shots);
    };
    const finalRenderPack = () => {
        const safeName = (projectName || 'novira-render').replace(/[^\w\-]+/g, '_');
        document.dispatchEvent(new CustomEvent('novira:export-toast', { detail: { message: 'Starting Final Render Pack…' } }));
        document.dispatchEvent(new CustomEvent('novira:capture-highres', {
            detail: { resolution: '3840x2160', quality: 'high', filename: `${safeName}-final-4k.png` },
        }));
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('novira:record-viewport', {
                detail: { seconds: 12, fps: 60, quality: 'high', filename: `${safeName}-final-walkthrough.webm` },
            }));
        }, 300);
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('novira:export-equirectangular', {
                detail: { cubeFaceSize: 1024, center: [0, 2.4, 6], projectName: `${safeName}-final` },
            }));
        }, 600);
    };
    const runSimpleWizard = () => {
        const safeName = (projectName || 'novira-render').replace(/[^\w\-]+/g, '_');
        const qualityMap = simpleQuality === 'draft'
            ? { stillResolution: '1920x1080', stillQuality: 'low', fps: 24, videoQuality: 'low', cube: 512 }
            : simpleQuality === 'final'
                ? { stillResolution: '3840x2160', stillQuality: 'high', fps: 60, videoQuality: 'high', cube: 2048 }
                : { stillResolution: '2560x1440', stillQuality: 'medium', fps: 30, videoQuality: 'medium', cube: 1024 };

        if (simpleGoal === 'still-only') {
            document.dispatchEvent(new CustomEvent('novira:capture-highres', {
                detail: {
                    resolution: qualityMap.stillResolution,
                    quality: qualityMap.stillQuality,
                    filename: `${safeName}-still-${qualityMap.stillResolution}.png`,
                },
            }));
            return;
        }
        if (simpleGoal === 'walkthrough') {
            document.dispatchEvent(new CustomEvent('novira:record-viewport', {
                detail: {
                    seconds: walkthroughSeconds,
                    fps: qualityMap.fps,
                    quality: qualityMap.videoQuality,
                    filename: `${safeName}-walkthrough.webm`,
                },
            }));
            return;
        }
        if (simpleGoal === 'vr-360') {
            document.dispatchEvent(new CustomEvent('novira:export-equirectangular', {
                detail: { cubeFaceSize: qualityMap.cube, center: [0, 2.4, 6], projectName: `${safeName}-360` },
            }));
            return;
        }
        document.dispatchEvent(new CustomEvent('novira:capture-highres', {
            detail: {
                resolution: qualityMap.stillResolution,
                quality: qualityMap.stillQuality,
                filename: `${safeName}-client-still.png`,
            },
        }));
        setTimeout(() => {
            document.dispatchEvent(new CustomEvent('novira:record-viewport', {
                detail: {
                    seconds: walkthroughSeconds,
                    fps: qualityMap.fps,
                    quality: qualityMap.videoQuality,
                    filename: `${safeName}-client-walkthrough.webm`,
                },
            }));
        }, 300);
    };
    const applySceneAwareOptimization = () => {
        if (recommendedProfile === 'fast') {
            setResolution('1920x1080');
            setQuality('low');
            setLuxPreviewVisible(false);
            setSoundCoverageVisible(false);
            setCrowdFlowVisible(false);
            return;
        }
        if (recommendedProfile === 'balanced') {
            setResolution('2560x1440');
            setQuality('medium');
            return;
        }
        setResolution('3840x2160');
        setQuality('high');
    };

    const toggleRow = (label, value, onChange) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 8, color: '#d3e4fb', fontFamily: "'Poppins', sans-serif" }}>{label}</span>
            <button
                type="button"
                onClick={() => onChange(!value)}
                style={{
                    width: 36, height: 20, borderRadius: 10, border: 'none',
                    background: value ? '#1ec6ff' : '#38506f', cursor: 'pointer', position: 'relative',
                }}
            >
                <span style={{
                    position: 'absolute', top: 2, left: value ? 18 : 2,
                    width: 16, height: 16, borderRadius: '50%', background: '#fff',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transition: 'left 0.15s',
                }} />
            </button>
        </div>
    );

    return (
        <div style={{ padding: '0 10px 15px', background: `linear-gradient(180deg, ${ONLINE_ASSET_THEME.bgTop}, ${ONLINE_ASSET_THEME.bgBottom})`, borderRadius: 10 }}>
            <span style={renderLabelStyle}>Simple render wizard</span>
            <div style={renderCardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 7, color: '#9ab8dc', fontFamily: "'Poppins', sans-serif" }}>What do you need?</span>
                    <select
                        value={simpleGoal}
                        onChange={(e) => setSimpleGoal(e.target.value)}
                        style={renderInputStyle}
                    >
                        <option value="client-review">Client review package (still + walkthrough)</option>
                        <option value="still-only">High quality still image</option>
                        <option value="walkthrough">Walkthrough video</option>
                        <option value="vr-360">360 output (VR viewer)</option>
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 7, color: '#9ab8dc', fontFamily: "'Poppins', sans-serif" }}>Quality</span>
                    <select
                        value={simpleQuality}
                        onChange={(e) => setSimpleQuality(e.target.value)}
                        style={renderInputStyle}
                    >
                        <option value="draft">Draft (fast)</option>
                        <option value="balanced">Balanced</option>
                        <option value="final">Final (best quality)</option>
                    </select>
                </div>
                <button
                    type="button"
                    onClick={runSimpleWizard}
                    style={{ ...renderBtnBase, padding: '10px', background: 'linear-gradient(135deg, #1258a0, #1f7ec8)' }}
                >
                    Run Wizard Render
                </button>
                <button
                    type="button"
                    onClick={runDirectorAndQueue}
                    style={{ ...renderBtnBase, padding: '10px', background: 'linear-gradient(135deg, #3f3af2, #0a9ec8)' }}
                >
                    One-Click Director Plan (Light + Shots + Queue)
                </button>
                <p style={{ fontSize: 6, color: '#8ca9ca', margin: 0, lineHeight: 1.35 }}>
                    Tip: use this if you are not technical. It automatically picks safe settings for your selected output.
                </p>
            </div>
            <span style={renderLabelStyle}>AI smart lighting</span>
            <div style={{
                marginBottom: 10,
                padding: '10px',
                borderRadius: 8,
                border: '1px solid rgba(99,146,255,0.35)',
                background: 'linear-gradient(180deg, #0a1430, #0d1f40)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
            }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 7, color: '#a5b4fc', fontFamily: "'Poppins', sans-serif" }}>Scene Type</span>
                    <select value={sceneType} onChange={(e) => setSceneType(e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #2a3458', fontSize: 8, fontFamily: "'Poppins', sans-serif", background: '#10172b', color: '#e2e8f0' }}>
                        <option value="auto">Auto Detect</option><option value="interior">Interior</option><option value="exterior">Exterior</option><option value="product">Product</option><option value="studio">Studio</option>
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 7, color: '#a5b4fc', fontFamily: "'Poppins', sans-serif" }}>Time of Day</span>
                    <select value={timeOfDay} onChange={(e) => setTimeOfDay(e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #2a3458', fontSize: 8, fontFamily: "'Poppins', sans-serif", background: '#10172b', color: '#e2e8f0' }}>
                        <option value="auto">AI Choose</option><option value="dawn">Dawn</option><option value="noon">Noon</option><option value="golden">Golden Hour</option><option value="night">Night</option>
                    </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <span style={{ fontSize: 7, color: '#a5b4fc', fontFamily: "'Poppins', sans-serif" }}>Mood</span>
                    <select value={mood} onChange={(e) => setMood(e.target.value)} style={{ width: '100%', padding: '7px 8px', borderRadius: 6, border: '1px solid #2a3458', fontSize: 8, fontFamily: "'Poppins', sans-serif", background: '#10172b', color: '#e2e8f0' }}>
                        <option value="auto">AI Choose</option><option value="warm">Warm</option><option value="cool">Cool</option><option value="dramatic">Dramatic</option><option value="dark">Dark</option><option value="natural">Natural</option>
                    </select>
                </div>
                <button type="button" onClick={runAILighting} style={{ width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer', background: 'linear-gradient(135deg, #4f46e5, #8b5cf6)', color: '#fff', border: '1px solid rgba(167,139,250,0.35)', fontSize: 8, fontWeight: 700, fontFamily: "'Poppins', sans-serif" }}>
                    ✦ Generate AI Lighting Setup
                </button>
                <p style={{ fontSize: 6, color: '#a7b3d6', margin: 0, lineHeight: 1.35 }}>{aiStatus}</p>
            </div>
            <span style={renderLabelStyle}>Camera auto move presets</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 6, marginBottom: 12 }}>
                {[
                    ['orbit', 'Orbit'],
                    ['flythrough', 'Fly-Through'],
                    ['crane', 'Crane'],
                    ['dolly', 'Dolly'],
                    ['manual', 'Manual'],
                ].map(([id, label]) => (
                    <button
                        key={id}
                        type="button"
                        onClick={() => applyCameraPreset(id)}
                        style={{
                            padding: '7px 6px', borderRadius: 6, cursor: 'pointer',
                            border: `1px solid ${camPreset === id ? '#4db6ff' : 'rgba(72,115,160,0.6)'}`,
                            background: camPreset === id ? 'rgba(77,182,255,0.22)' : 'rgba(10,26,45,0.6)',
                            color: camPreset === id ? '#dff2ff' : '#a6c2df',
                            fontSize: 8, fontFamily: "'Poppins', sans-serif", fontWeight: camPreset === id ? 700 : 500,
                        }}
                    >
                        {label}
                    </button>
                ))}
            </div>
            <span style={renderLabelStyle}>AI director shot prompt</span>
            <div style={{
                marginBottom: 10,
                padding: '8px',
                borderRadius: 8,
                border: '1px solid rgba(86,151,255,0.45)',
                background: 'linear-gradient(180deg, #0a1431, #11254a)',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
            }}>
                <input
                    type="text"
                    value={directorPrompt}
                    onChange={(e) => setDirectorPrompt(e.target.value)}
                    placeholder="e.g. slow crane rising at golden hour"
                    style={renderInputStyle}
                />
                <button
                    type="button"
                    onClick={runAIDirectorShot}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6d28d9, #2563eb)', color: '#fff',
                        border: '1px solid rgba(167,139,250,0.42)', fontSize: 8, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    ✦ Generate Director Shot
                </button>
                <button
                    type="button"
                    onClick={buildDirectorShots}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff',
                        border: '1px solid rgba(167,139,250,0.42)', fontSize: 8, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Build Multi-Shot Sequence
                </button>
                <button
                    type="button"
                    onClick={runDirectorAndQueue}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #4f46e5, #0ea5e9)', color: '#fff',
                        border: '1px solid rgba(125,211,252,0.45)', fontSize: 8, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Run Director + Queue Export
                </button>
                {directorShots.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {directorShots.map((s, i) => (
                            <div key={s.id} style={{ fontSize: 7, color: '#ddd6fe', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{i + 1}. {s.name}</span>
                                <span>{s.frameStart}-{s.frameEnd}</span>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={queueDirectorShotsToExport}
                            style={{
                                width: '100%', padding: '8px', borderRadius: 6, cursor: 'pointer',
                                background: 'linear-gradient(135deg, #4f46e5, #0891b2)', color: '#fff',
                                border: '1px solid rgba(125,211,252,0.4)', fontSize: 8, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                            }}
                        >
                            Queue Multi-Shot Export
                        </button>
                    </div>
                )}
                <p style={{ fontSize: 6, color: '#c4b5fd', margin: 0, lineHeight: 1.35 }}>
                    {directorShotMeta}
                </p>
            </div>
            <span style={renderLabelStyle}>Scene-aware optimization</span>
            <div style={{ ...renderCardStyle, gap: 8 }}>
                <div style={{ fontSize: 8, color: '#dcecff', fontWeight: 600, fontFamily: "'Poppins', sans-serif", marginBottom: 4 }}>
                    Recommended: {profileLabel}
                </div>
                <div style={{ fontSize: 7, color: '#93b1d3', lineHeight: 1.35, marginBottom: 6 }}>
                    Scene scan: {sceneStats.total} objects · {sceneStats.meshes} meshes · {sceneStats.imported} imported · {sceneStats.lights} lights
                </div>
                <button
                    type="button"
                    onClick={applySceneAwareOptimization}
                    style={{ ...renderBtnBase }}
                >
                    Apply recommended setup
                </button>
            </div>
            <button
                type="button"
                onClick={() => setAdvancedOpen((v) => !v)}
                style={{
                    width: '100%', padding: '8px', borderRadius: 6, cursor: 'pointer',
                    border: '1px solid rgba(74, 139, 201, 0.5)', background: advancedOpen ? 'rgba(59,130,246,0.2)' : 'rgba(8,25,44,0.8)',
                    color: '#d3e4fb', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif", marginBottom: 8,
                }}
            >
                {advancedOpen ? 'Hide advanced rendering options' : 'Show advanced rendering options'}
            </button>
            {advancedOpen && (
                <>
            <span style={renderLabelStyle}>Lighting &amp; crowd preview</span>
            <p style={{ fontSize: 7, color: '#93b1d3', margin: '0 0 8px', lineHeight: 1.35 }}>
                Illustrative overlays for pitch visuals — not certified photometry (lux/SPL) or CFD-grade crowd dynamics.
            </p>
            {toggleRow('Lux floor preview', luxPreviewVisible, setLuxPreviewVisible)}
            {toggleRow('Sound coverage zones', soundCoverageVisible, setSoundCoverageVisible)}
            {toggleRow('Crowd flow path', crowdFlowVisible, setCrowdFlowVisible)}

            <span style={{ ...renderLabelStyle, marginTop: 14 }}>4K render &amp; video</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                <button
                    type="button"
                    onClick={finalRenderPack}
                    style={{
                        width: '100%', padding: '10px', borderRadius: 6, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #4338ca, #2563eb)', color: '#fff',
                        border: 'none', fontSize: 8, fontWeight: 700, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Final Render Pack (One Click)
                </button>
                <button
                    type="button"
                    onClick={captureViewportQuick}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff',
                        border: 'none', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Quick PNG (current viewport)
                </button>
                <button
                    type="button"
                    onClick={captureHighRes}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'linear-gradient(135deg, #7c3aed, #2563eb)', color: '#fff',
                        border: 'none', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Export 4K still (offscreen render)
                </button>
                <button
                    type="button"
                    onClick={recordWalkthrough}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: '#0f172a', color: '#e2e8f0',
                        border: '1px solid #334155', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Record walkthrough (WebM)
                </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 10 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>Walkthrough seconds</span>
                    <input
                        type="number"
                        min={3}
                        max={120}
                        value={walkthroughSeconds}
                        onChange={(e) => setWalkthroughSeconds(Math.max(3, Math.min(120, parseInt(e.target.value, 10) || 12)))}
                        style={{ width: '100%', padding: '6px 7px', borderRadius: 6, border: '1px solid #d7deea', fontSize: 8, fontFamily: "'Poppins', sans-serif" }}
                    />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>Walkthrough FPS</span>
                    <select
                        value={walkthroughFps}
                        onChange={(e) => setWalkthroughFps(parseInt(e.target.value, 10) || 30)}
                        style={{ width: '100%', padding: '6px 7px', borderRadius: 6, border: '1px solid #d7deea', fontSize: 8, fontFamily: "'Poppins', sans-serif" }}
                    >
                        <option value={24}>24</option>
                        <option value={30}>30</option>
                        <option value={60}>60</option>
                    </select>
                </div>
            </div>

            <span style={renderLabelStyle}>360° &amp; client pack</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <button
                    type="button"
                    onClick={exportCubemap}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(14,165,233,0.1)', color: '#0369a1',
                        border: '1px solid rgba(14,165,233,0.35)', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    360° cubemap faces (ZIP)
                </button>
                <button
                    type="button"
                    onClick={exportEquirectangular}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(124,58,237,0.12)', color: '#5b21b6',
                        border: '1px solid rgba(124,58,237,0.35)', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    360° equirectangular (single PNG, 2:1)
                </button>
                <button
                    type="button"
                    disabled={!webxrImmersiveVRAvailable || xrPresenting}
                    onClick={() => document.dispatchEvent(new CustomEvent('novira:webxr-enter-vr'))}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: (!webxrImmersiveVRAvailable || xrPresenting) ? 'not-allowed' : 'pointer',
                        opacity: (!webxrImmersiveVRAvailable || xrPresenting) ? 0.55 : 1,
                        background: 'rgba(16,185,129,0.12)', color: '#047857',
                        border: '1px solid rgba(16,185,129,0.4)', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Enter immersive VR (WebXR)
                </button>
                <button
                    type="button"
                    onClick={technicalPdf}
                    style={{
                        width: '100%', padding: '9px', borderRadius: 6, cursor: 'pointer',
                        background: 'rgba(245,158,11,0.12)', color: '#b45309',
                        border: '1px solid rgba(245,158,11,0.35)', fontSize: 8, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    }}
                >
                    Technical summary (print / PDF)
                </button>
                <p style={{ fontSize: 6, color: '#94a3b8', margin: 0, lineHeight: 1.35 }}>
                    WebXR: Quest Browser, Edge/Chrome with SteamVR or OpenXR runtime. Equirect is a GPU cube→lat/long bake (good for viewers / social), not a measurement capture rig.
                </p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 10 }}>
                <span style={{ fontSize: 7, color: '#64748b', fontFamily: "'Poppins', sans-serif" }}>360 quality (cube face size)</span>
                <select
                    value={cubeFaceSize}
                    onChange={(e) => setCubeFaceSize(parseInt(e.target.value, 10) || 1024)}
                    style={{ width: '100%', padding: '6px 7px', borderRadius: 6, border: '1px solid #d7deea', fontSize: 8, fontFamily: "'Poppins', sans-serif" }}
                >
                    <option value={512}>Preview (512)</option>
                    <option value={1024}>High (1024)</option>
                    <option value={2048}>Ultra (2048)</option>
                </select>
            </div>

            <span style={renderLabelStyle}>Resolution (4K still)</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                {[
                    { label: '720p (1280×720)', value: '1280x720' },
                    { label: '1080p (1920×1080)', value: '1920x1080' },
                    { label: '2K (2560×1440)', value: '2560x1440' },
                    { label: '4K (3840×2160)', value: '3840x2160' },
                ].map(r => (
                    <button
                        key={r.value}
                        type="button"
                        onClick={() => setResolution(r.value)}
                        style={renderOptionBtn(resolution === r.value)}
                    >
                        <span style={{ fontSize: 8, fontWeight: 600 }}>{r.label}</span>
                    </button>
                ))}
            </div>

            <span style={renderLabelStyle}>Quality label</span>
            <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
                {['low', 'medium', 'high'].map(q => (
                    <button
                        key={q}
                        type="button"
                        onClick={() => setQuality(q)}
                        style={{
                            flex: 1, padding: '6px', borderRadius: 6, cursor: 'pointer',
                            background: quality === q ? 'rgba(77,182,255,0.22)' : 'rgba(8,25,44,0.75)',
                            border: `1px solid ${quality === q ? '#4db6ff' : 'rgba(72,115,160,0.65)'}`,
                            fontSize: 7, fontFamily: "'Poppins', sans-serif", color: quality === q ? '#dff2ff' : '#9dbad8',
                            textTransform: 'capitalize', fontWeight: quality === q ? 600 : 400,
                        }}
                    >
                        {q}
                    </button>
                ))}
            </div>

            <span style={renderLabelStyle}>3D Export</span>
            <button
                type="button"
                onClick={() => document.dispatchEvent(new CustomEvent('novira:open-export-panel'))}
                style={{
                    width: '100%', padding: '10px', borderRadius: 6, cursor: 'pointer',
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
                    border: 'none', fontSize: 9, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
                    marginBottom: 14,
                }}
            >
                Export Scene (GLB / GLTF)
            </button>

            <span style={renderLabelStyle}>Scene Info</span>
            <div style={{ ...renderCardStyle, padding: 8 }}>
            <SceneStats />
            </div>
                </>
            )}
        </div>
    );
};

const SceneStats = () => {
    const objects = useStore(s => s.objects);
    const nonGround = objects.filter(o => o.type !== 'ground');
    const lights = nonGround.filter(o => o.type === 'light');
    const meshes = nonGround.filter(o => o.type !== 'light');
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {[
                { label: 'Objects', val: nonGround.length },
                { label: 'Meshes', val: meshes.length },
                { label: 'Lights', val: lights.length },
            ].map(s => (
                <div key={s.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 8px', fontSize: 7, fontFamily: "'Poppins', sans-serif",
                    color: '#9dbad8', background: 'rgba(8,25,44,0.76)',
                    border: '1px solid rgba(72,115,160,0.62)', borderRadius: 6,
                }}>
                    <span>{s.label}</span>
                    <span style={{ fontWeight: 700, color: '#e6f5ff' }}>{s.val}</span>
                </div>
            ))}
        </div>
    );
};

export default function Sidebar() {
    const navigate = useNavigate();
    const { objects, selectedId, setSelectedId, addObject, addObjectsBulk, aiTask, editorTab, setLibraryBrowserOpen, setEditorTab, openAssetCatalogTab } = useStore(
        useShallow((s) => ({
            objects: s.objects,
            selectedId: s.selectedId,
            setSelectedId: s.setSelectedId,
            addObject: s.addObject,
            addObjectsBulk: s.addObjectsBulk,
            aiTask: s.aiTask,
            editorTab: s.editorTab,
            setLibraryBrowserOpen: s.setLibraryBrowserOpen,
            setEditorTab: s.setEditorTab,
            openAssetCatalogTab: s.openAssetCatalogTab,
        }))
    );
    const sidebarExpandSignal = useStore((s) => s.sidebarExpandSignal);
    const aiImageGeneratorPrefill = useStore((s) => s.aiImageGeneratorPrefill);
    const studioLeftOpen = useStore((s) => s.studioLeftOpen !== false);
    const setStudioLeftOpen = useStore((s) => s.setStudioLeftOpen);
    const [collapsed, setCollapsed] = useState(false);
    const leftPanelHidden = !studioLeftOpen || collapsed;
    const [activeCategory, setActiveCategory] = useState('Premade Venues');
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        try {
            const raw = parseInt(localStorage.getItem('novira_left_sidebar_width_v1') || '', 10);
            if (Number.isFinite(raw) && raw >= 200 && raw <= 480) return raw;
        } catch {
            /* ignore */
        }
        return 260;
    });
    const isResizing = React.useRef(false);

    const [showImportModal, setShowImportModal] = useState(false);
    const [venueReplaceScene, setVenueReplaceScene] = useState(false);

    useEffect(() => {
        if (aiTask.status === 'queued' || aiTask.status === 'running' || aiTask.status === 'starting') {
            setLibraryBrowserOpen(false);
            setCollapsed(false);
        }
    }, [aiTask.status, setLibraryBrowserOpen]);

    useEffect(() => {
        if (aiImageGeneratorPrefill?.imageUrl) {
            setLibraryBrowserOpen(false);
            setCollapsed(false);
        }
    }, [aiImageGeneratorPrefill, setLibraryBrowserOpen]);

    useEffect(() => {
        if (sidebarExpandSignal > 0) setCollapsed(false);
    }, [sidebarExpandSignal]);

    useEffect(() => {
        if (studioLeftOpen) setCollapsed(false);
    }, [studioLeftOpen]);

    useEffect(() => {
        try {
            localStorage.setItem('novira_left_sidebar_width_v1', String(sidebarWidth));
        } catch {
            /* ignore */
        }
    }, [sidebarWidth]);

    useEffect(() => {
        const onApplyLayout = () => {
            try {
                const raw = parseInt(localStorage.getItem('novira_left_sidebar_width_v1') || '', 10);
                if (Number.isFinite(raw) && raw >= 200 && raw <= 480) setSidebarWidth(raw);
            } catch {
                /* ignore */
            }
            setCollapsed(false);
        };
        window.addEventListener('novira:workspace-layout-applied', onApplyLayout);
        return () => window.removeEventListener('novira:workspace-layout-applied', onApplyLayout);
    }, []);


    const handleResizeStart = React.useCallback((e) => {
        e.preventDefault();
        isResizing.current = true;
        const startX = e.clientX ?? e.pageX ?? 0;
        const startWidth = sidebarWidth;
        const onMove = (ev) => {
            if (!isResizing.current) return;
            const cx = ev.clientX ?? ev.pageX ?? startX;
            const newWidth = Math.min(480, Math.max(200, startWidth + (cx - startX)));
            setSidebarWidth(newWidth);
        };
        const onUp = () => {
            isResizing.current = false;
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }, [sidebarWidth]);

    const handleCategoryClick = (label) => {
        setActiveCategory(label);
    };

    const categories = [
        { label: 'Premade Venues', icon: HomeIcon },
        { label: 'Booths & Displays', icon: CubeIcon },
        { label: 'Furniture', icon: ViewColumnsIcon },
        { label: 'Lighting', icon: LightBulbIcon },
        { label: 'Audio Gear', icon: MusicalNoteIcon },
    ];

    const railItems = [
        { icon: HomeIcon, label: 'Venues' },
        { icon: CubeIcon, label: 'Booths' },
        { icon: ViewColumnsIcon, label: 'Furniture' },
        { icon: LightBulbIcon, label: 'Lighting' },
        { icon: MusicalNoteIcon, label: 'Audio' },
        { icon: SparklesIcon, label: 'AI' },
    ];

    return (
        <>
            <div
                className={`pro-sidebar editor-left-new ${leftPanelHidden ? 'collapsed' : ''}`}
                style={!leftPanelHidden ? { width: sidebarWidth, minWidth: sidebarWidth } : undefined}
            >

                <div className="icon-rail">

                    <button
                        type="button"
                        className="icon-rail-toggle-btn"
                        onClick={() => {
                            if (!studioLeftOpen) {
                                setStudioLeftOpen(true);
                                setCollapsed(false);
                            } else {
                                setCollapsed(!collapsed);
                            }
                        }}
                        title={leftPanelHidden ? 'Expand panel' : 'Collapse panel'}
                    >
                        {leftPanelHidden
                            ? <ChevronRightIcon style={{ width: 15, height: 15 }} />
                            : <ChevronLeftIcon style={{ width: 15, height: 15 }} />
                        }
                    </button>

                    {leftPanelHidden && (
                        <span className="icon-rail-collapsed-label">Assets</span>
                    )}

                    {railItems.map(({ icon: Icon, label }) => (
                        <button key={label} className="icon-rail-btn" title={label}
                            onClick={() => {
                                setStudioLeftOpen(true);
                                setCollapsed(false);
                                setEditorTab('Layout');
                                const map = {
                                    Venues: 'Premade Venues',
                                    Booths: 'Booths & Displays',
                                    Furniture: 'Furniture',
                                    Lighting: 'Lighting',
                                    Audio: 'Audio Gear',
                                    AI: 'Premade Venues',
                                };
                                handleCategoryClick(map[label] || 'Premade Venues');
                            }}
                        >
                            <Icon style={{ width: 18, height: 18 }} />
                        </button>
                    ))}
                    <div style={{ flex: 1 }} />
                    <button className="icon-rail-btn icon-rail-settings" title="Settings" onClick={() => navigate('/settings')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                    </button>
                </div>

                {!leftPanelHidden && (
                    <div className="sidebar-main-panel">

                        <div className="sidebar-panel-header">
                            <span className="sidebar-panel-title">
                                {editorTab === 'Objects & Assets' && 'Objects & Assets'}
                                {editorTab === 'Layout' && 'Layout studio'}
                                {editorTab === 'Modeling' && 'Primitives & Modifiers'}
                                {editorTab === 'Shading' && 'Materials & Textures'}
                                {editorTab === 'Lighting' && 'Lights'}
                                {editorTab === 'Rendering' && 'Render & Export'}
                            </span>
                        </div>

                        <div
                            className={`sidebar-scrollable${editorTab === 'Objects & Assets' ? ' sidebar-scrollable--asset-browser' : ''}`}
                        >

                            {editorTab === 'Modeling' && (
                                <ModelingPanel addObject={addObject} />
                            )}

                            {editorTab === 'Shading' && (
                                <ShadingPanel />
                            )}

                            {editorTab === 'Lighting' && (
                                <LightingPanel addObject={addObject} />
                            )}

                            {editorTab === 'Rendering' && (
                                <RenderingPanel />
                            )}

                            {editorTab === 'Objects & Assets' && (
                                <AssetBrowser placement="sidebar" />
                            )}

                            {editorTab === 'Layout' && (
                            <div className="sidebar-layout-v2">
                            <section className="novira-layout-ai-hero" aria-label="AI 3D generator">
                                <header className="novira-layout-ai-hero__head">
                                    <span className="novira-layout-ai-hero__kicker">Novira AI</span>
                                    <h2 className="novira-layout-ai-hero__title">Generate in 3D</h2>
                                    <p className="novira-layout-ai-hero__sub">Describe an object or use a reference image — get a mesh you can place in the scene.</p>
                                </header>
                                <AiGenerationTool />
                            </section>

                            <div className="layout-import-bar" role="group" aria-label="Bring in existing models">
                                <button type="button" className="layout-import-bar__btn layout-import-bar__btn--primary" onClick={() => setShowImportModal(true)}>
                                    <ArrowUpTrayIcon style={{ width: 14, height: 14 }} aria-hidden />
                                    <span>Upload</span>
                                </button>
                                <button type="button" className="layout-import-bar__btn" onClick={() => setEditorTab('Objects & Assets')}>
                                    <Squares2X2Icon style={{ width: 14, height: 14 }} aria-hidden />
                                    <span>Browse catalog</span>
                                </button>
                                <button type="button" className="layout-import-bar__btn" onClick={() => openAssetCatalogTab('References')}>
                                    <PhotoIcon style={{ width: 14, height: 14 }} aria-hidden />
                                    <span>Online images</span>
                                </button>
                            </div>

                            <div className="layout-section-label">Scene starters</div>
                            <div className="asset-categories-list asset-categories-list--layout-refined">
                                {categories.map(c => (
                                    <CategoryRow
                                        key={c.label}
                                        icon={c.icon}
                                        label={c.label}
                                        active={activeCategory === c.label}
                                        onClick={() => handleCategoryClick(c.label)}
                                    />
                                ))}
                            </div>

                            {activeCategory === 'Premade Venues' && (
                                <div style={{ padding: '0 10px 14px' }}>
                                    <span style={panelLabelStyle}>Venue library</span>
                                    <p style={{ fontSize: 7, color: '#64748b', margin: '0 0 8px', lineHeight: 1.35 }}>
                                        Drop in a full hall layout. Toggle below to keep only the ground plane and replace the rest.
                                    </p>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 7, color: '#475569', marginBottom: 10, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={venueReplaceScene} onChange={(e) => setVenueReplaceScene(e.target.checked)} />
                                        Replace layout (keep ground if present)
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                        {VENUE_PRESETS.map((v) => (
                                            <button
                                                key={v.id}
                                                type="button"
                                                onClick={() => addObjectsBulk(v.items, { replaceSceneExceptGround: venueReplaceScene })}
                                                style={{
                                                    textAlign: 'left', padding: 0, border: 'none', borderRadius: 8, cursor: 'pointer',
                                                    overflow: 'hidden', background: '#0f172a', color: '#fff',
                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                }}
                                            >
                                                <div style={{ height: 52, background: v.gradient }} />
                                                <div style={{ padding: '8px 10px' }}>
                                                    <div style={{ fontSize: 9, fontWeight: 700 }}>{v.name}</div>
                                                    <div style={{ fontSize: 7, opacity: 0.85, marginTop: 2 }}>{v.tagline}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {activeCategory === 'Lighting' && (
                                <LightingPanel addObject={addObject} />
                            )}

                            {activeCategory === 'Audio Gear' && (
                                <AudioPanel addObject={addObject} />
                            )}

                            {(activeCategory === 'Booths & Displays' || activeCategory === 'Furniture') && (
                                <div className="layout-category-hint">
                                    <p className="layout-category-hint__text">
                                        {activeCategory === 'Booths & Displays'
                                            ? 'Booths, stages, and exhibit hardware are in the unified catalog — search, preview, and drop into the scene.'
                                            : 'Chairs, tables, and interior props: use the catalog for licensed meshes and HDRIs.'}
                                    </p>
                                    <button type="button" className="layout-category-hint__btn" onClick={() => setEditorTab('Objects & Assets')}>
                                        Open Objects &amp; Assets
                                </button>
                                    </div>
                            )}
                                </div>
                            )}

                            

                                                    </div>
                                                    </div>
                )}

                {!leftPanelHidden && (
                    <div
                        className="sidebar-resize-handle"
                        onPointerDown={handleResizeStart}
                        onMouseDown={handleResizeStart}
                    />
                )}
            </div>

            <ImportModal isOpen={showImportModal} onClose={() => setShowImportModal(false)} />
        </>
    );
}
