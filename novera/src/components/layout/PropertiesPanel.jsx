import React, { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { showToast } from '../../utils/noviraToast';
import { getPremiumColor } from '../../utils/colorUtils';
import { estimateSceneCost } from '../../utils/costEstimator';
import {
    LightBulbIcon,
    TrashIcon,
    FolderIcon,
    CubeIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ChevronRightIcon,
    ChevronLeftIcon,
    PlusIcon,

    DocumentDuplicateIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    ArrowPathIcon,
    PuzzlePieceIcon,
    EyeIcon,
    EyeSlashIcon,
    LockClosedIcon,
    LockOpenIcon,
    WrenchScrewdriverIcon,
    Bars3CenterLeftIcon,
    CheckCircleIcon,
    ArrowsPointingOutIcon,
    ViewColumnsIcon,
    SparklesIcon,
    SunIcon,
    MinusSmallIcon,
    XMarkIcon,
    ShieldCheckIcon,
    CursorArrowRaysIcon,
    ArrowsRightLeftIcon,
    ArrowPathRoundedSquareIcon,
    ArrowsPointingInIcon,
    Squares2X2Icon,
    CommandLineIcon,
    ArrowDownOnSquareStackIcon,
    AdjustmentsHorizontalIcon,
} from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import '../../styles/pro-editor.css';
import MaterialListPopover from './MaterialListPopover';
import { collectSceneMaterials, mergeMaterialLists, filterMaterialList } from '../../utils/projectMaterials';
import { hasKeyframeAt, normalizeMaterialAnim } from '../../utils/materialAnim';

const TreeNode = ({ label, icon: Icon, depth = 0, children, defaultOpen = false, isSelected, onClick, actions }) => {
    const [open, setOpen] = useState(defaultOpen);
    const [hovered, setHovered] = useState(false);
    const hasChildren = !!children && (Array.isArray(children) ? children.length > 0 : true);
    const selectedIds = useStore(s => s.selectedIds);
    const isMultiSelected = selectedIds?.includes?.(label) || false;

    return (
        <div style={{ marginLeft: depth * 12 }}>
            <div
                className={`scene-tree-node ${isSelected ? 'selected' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    if (onClick) onClick();
                    if (hasChildren) setOpen(!open);
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                style={{
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontFamily: "'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif",
                    fontWeight: isSelected ? 600 : 500,
                    transition: 'background 0.12s ease, border-color 0.12s ease, color 0.12s ease',
                    padding: '4px 6px',
                    border: '1px solid transparent',
                    position: 'relative',
                    minHeight: 26,
                }}
            >
                {hasChildren
                    ? (open ? <ChevronDownIcon className="scene-tree-node__caret" /> : <ChevronRightIcon className="scene-tree-node__caret" />)
                    : <span style={{ width: 10, flexShrink: 0 }} />}
                {Icon && <Icon className="scene-tree-node__icon" style={{ width: 11, height: 11, flexShrink: 0 }} />}
                <span style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    flex: 1,
                    letterSpacing: '0.1px',
                    minWidth: 0,
                }}
                title={label}
                >
                    {label}
                </span>

                {actions && (
                    <div style={{
                        display: 'flex', gap: 2, marginLeft: 'auto', paddingLeft: 2, flexShrink: 0,
                        opacity: hovered || isSelected ? 1 : 0,
                        transition: 'opacity 0.1s',
                    }}>
                        {actions}
                    </div>
                )}
            </div>
            <AnimatePresence>
                {open && hasChildren && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'hidden' }}
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const TransformGroup = ({ label, values, onChange }) => {
    const axes = ['X', 'Y', 'Z'];
    const step = label === 'rotation' ? 15 : 0.1;
    const unitHint = label === 'rotation' ? '°' : label === 'scale' ? '' : 'm';

    const handleUpdate = (idx, newValue, saveToHistory = false) => {
        const newVals = [...values];
        newVals[idx] = label === 'rotation' ? (newValue * Math.PI / 180) : newValue;
        onChange(newVals, saveToHistory);
    };

    return (
        <div className="inspector-transform-block">
            <div className="inspector-field-label">{label}</div>
            <div className="inspector-vector-row" role="group" aria-label={`${label} ${axes.join(' ')}`}>
                {axes.map((ax, idx) => {
                    const val = label === 'rotation'
                        ? (values[idx] * 180 / Math.PI)
                        : values[idx];

                    const displayVal = label === 'rotation' ? Math.round(val) : (Math.round(val * 100) / 100);

                    return (
                        <div key={ax} className={`props-input-group inspector-vector-cell inspector-vector-cell--${ax.toLowerCase()}`}>
                            <span className={`props-input-label axis-${ax.toLowerCase()}`}>{ax}</span>
                            <input
                                type="number"
                                step={step}
                                value={displayVal}
                                onFocus={() => useStore.getState().saveHistory(useStore.getState().selectedId)}
                                onChange={(e) => handleUpdate(idx, parseFloat(e.target.value) || 0)}
                                className="props-input-field"
                            />
                            <div className="props-input-controls inspector-vector-nudge" aria-hidden>
                                <button
                                    type="button"
                                    className="props-control-btn"
                                    onClick={() => handleUpdate(idx, displayVal + step, true)}
                                >
                                    <ChevronUpIcon />
                                </button>
                                <button
                                    type="button"
                                    className="props-control-btn"
                                    onClick={() => handleUpdate(idx, displayVal - step, true)}
                                >
                                    <ChevronDownIcon />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
            {unitHint && <span className="inspector-field-unit">{unitHint}</span>}
        </div>
    );
};

/** Live Home–style W / D / H in cm by editing per-axis scale against base dimensions. */
function MeshBoundingSizeCard({ selectedObj, updateObject }) {
    const base = selectedObj.originalDimensions || selectedObj.dimensions;
    if (!base || !Array.isArray(base) || base.length < 3) return null;
    if (!['gltf', 'gltf-part', 'stl'].includes(selectedObj.type)) return null;

    const s = selectedObj.scale || [1, 1, 1];
    const rows = [
        { label: 'W', name: 'Width · X', idx: 0 },
        { label: 'D', name: 'Depth · Z', idx: 2 },
        { label: 'H', name: 'Height · Y', idx: 1 },
    ];
    const step = 5;

    const setCm = (idx, cm) => {
        const d = base[idx] || 1;
        const next = [...(selectedObj.scale || [1, 1, 1])];
        next[idx] = Math.max(0.001, (Number(cm) / 100) / d);
        updateObject(selectedObj.id, { scale: next }, true);
    };

    return (
        <div className="props-card props-mesh-bounds inspector-mesh-bounds" title="Edits scale per axis; mesh proportions are unchanged.">
            <div className="inspector-subsection-head">
                <span className="inspector-subsection-head__title">Bounding size</span>
                <span className="inspector-subsection-head__meta">cm</span>
            </div>
            <div className="inspector-size-grid">
                {rows.map(({ label, name, idx }) => {
                    const cm = Math.abs((base[idx] || 1) * (s[idx] || 1) * 100);
                    const display = Math.round(cm * 10) / 10;
                    return (
                        <div key={label} className="inspector-size-cell">
                            <div className="inspector-size-cell__head">
                                <span className={`props-mesh-bounds-axis inspector-size-axis inspector-size-axis--${label.toLowerCase()}`}>{label}</span>
                                <span className="inspector-size-axis-name">{name.replace(' · ', ' ')}</span>
                            </div>
                            <div className="props-input-group inspector-size-input">
                                <input
                                    type="number"
                                    step={1}
                                    value={display}
                                    className="props-input-field"
                                    onFocus={() => useStore.getState().saveHistory(selectedObj.id)}
                                    onChange={(e) => setCm(idx, parseFloat(e.target.value) || 0)}
                                />
                                <div className="props-input-controls inspector-vector-nudge">
                                    <button type="button" className="props-control-btn" onClick={() => setCm(idx, display + step)}>
                                        <ChevronUpIcon />
                                    </button>
                                    <button type="button" className="props-control-btn" onClick={() => setCm(idx, display - step)}>
                                        <ChevronDownIcon />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

const ToolBtn = ({ active, onClick, icon, label, shortcut, disabled = false }) => (
    <button
        type="button"
        className={`props-tool-btn inspector-tool-btn${active ? ' props-tool-btn--active' : ''}`}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        title={shortcut ? `${label} (${shortcut})` : label}
    >
        <span className="inspector-tool-btn__icon">{icon}</span>
        <span className="inspector-tool-btn__label">{label}</span>
    </button>
);

const GroupTitle = ({ title }) => (
    <div className={`props-group-title props-group-title--${String(title).replace(/\s+/g, '-').toLowerCase()}`} role="presentation">
        {title}
    </div>
);

function deriveMaterialFromPrompt(prompt) {
    const p = String(prompt || '').toLowerCase();
    const base = {
        color: '#cbd5e1',
        roughness: 0.55,
        metalness: 0.08,
        emissive: '#000000',
        emissiveIntensity: 0,
        opacity: 1,
    };
    if (!p.trim()) return base;
    if (p.includes('gold')) return { ...base, color: '#f5c542', roughness: 0.18, metalness: 1.0 };
    if (p.includes('copper')) return { ...base, color: '#b86a4a', roughness: 0.26, metalness: 0.95 };
    if (p.includes('chrome')) return { ...base, color: '#dce6f5', roughness: 0.05, metalness: 1.0 };
    if (p.includes('glass')) return { ...base, color: '#d9f2ff', roughness: 0.05, metalness: 0.05, opacity: 0.25 };
    if (p.includes('rubber')) return { ...base, color: '#1f2937', roughness: 0.95, metalness: 0.0 };
    if (p.includes('concrete')) return { ...base, color: '#a8adb7', roughness: 0.9, metalness: 0.0 };
    if (p.includes('wood')) return { ...base, color: '#8b5a2b', roughness: 0.78, metalness: 0.0 };
    if (p.includes('neon') || p.includes('emissive')) {
        return { ...base, color: '#7dd3fc', roughness: 0.3, metalness: 0.0, emissive: '#60a5fa', emissiveIntensity: 1.8 };
    }
    return base;
}

const RENDER_PIPELINE_PRESETS = {
    draft: {
        label: 'Draft',
        samples: 24,
        rayDepth: 3,
        bounceBudget: 2,
        denoise: true,
        denoiseQuality: 'fast',
        useWebgpu: false,
        smartZoom: false,
        viewTransform: 'Standard',
    },
    balanced: {
        label: 'Balanced',
        samples: 96,
        rayDepth: 5,
        bounceBudget: 4,
        denoise: true,
        denoiseQuality: 'balanced',
        useWebgpu: false,
        smartZoom: true,
        viewTransform: 'Filmic',
    },
    final: {
        label: 'Final',
        samples: 256,
        rayDepth: 7,
        bounceBudget: 6,
        denoise: true,
        denoiseQuality: 'high',
        useWebgpu: true,
        smartZoom: true,
        viewTransform: 'Filmic',
    },
    cinematic: {
        label: 'Cinematic',
        samples: 384,
        rayDepth: 8,
        bounceBudget: 8,
        denoise: true,
        denoiseQuality: 'high',
        useWebgpu: true,
        smartZoom: true,
        viewTransform: 'Filmic',
    },
};

/** Checker-tinted sphere like Blender material list icons */
const BlenderMatSphere = ({ color, size = 'sm' }) => (
    <span
        className={`blender-mat-sphere blender-mat-sphere--${size}`}
        style={{ '--blender-mat': color || '#b8b8b8' }}
        aria-hidden
    />
);

const BlenderMatSubpanel = ({ title, open, onToggle, children }) => (
    <div className="blender-mat-subpanel">
        <button type="button" className="blender-mat-subpanel__head" onClick={onToggle} aria-expanded={open}>
            <ChevronRightIcon
                className="blender-mat-subpanel__chev"
                style={{
                    width: 11,
                    height: 11,
                    flexShrink: 0,
                    transform: open ? 'rotate(90deg)' : 'none',
                    transition: 'transform 0.12s ease',
                }}
                aria-hidden
            />
            <span>{title}</span>
        </button>
        {open && <div className="blender-mat-subpanel__body">{children}</div>}
    </div>
);

const SliderRow = ({ label, value, min, max, step = 'any', unit = '', onChange, colorClass = '', keyframe = null }) => {
    const span = max - min;
    const pct = !Number.isFinite(span) || span === 0 ? 0 : Math.min(100, Math.max(0, ((value - min) / span) * 100));
    return (
        <div className={`inspector-slider blender-surface-sliderow${keyframe ? ' blender-surface-sliderow--kf' : ''}`}>
            <div className="blender-surface-sliderow__main">
                <div className="props-row-between inspector-slider__head">
                    <span className="inspector-slider__label">{label}</span>
                    <span className="inspector-slider__value">{value}{unit}</span>
                </div>
                <div className="props-slider-container inspector-slider__track-wrap">
                    <div className="props-slider-track inspector-slider__track" />
                    <div className={`props-slider-fill inspector-slider__fill ${colorClass}`} style={{ width: `${pct}%` }} />
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={value}
                        onChange={(e) => onChange(parseFloat(e.target.value))}
                        className="props-slider-input"
                    />
                </div>
            </div>
            {keyframe && (
                <button
                    type="button"
                    className={`blender-keyframe-dot${keyframe.active ? ' is-keyed' : ''}`}
                    title={keyframe.active ? 'Remove keyframe' : 'Insert keyframe'}
                    aria-pressed={!!keyframe.active}
                    onClick={keyframe.onToggle}
                />
            )}
        </div>
    );
};

const ColorSwatch = ({ color, active, onClick }) => (
    <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
            }
        }}
        className={`props-swatch inspector-swatch ${active ? 'active' : ''}`}
        style={{ background: color }}
        aria-pressed={active}
    />
);

const PropertySection = ({ title, icon: Icon, colorClass, isOpen, onToggle, children }) => {
    return (
        <div className={`props-card collapsible props-section ${isOpen ? 'props-section--open' : ''}`}>
            <button
                type="button"
                className={`props-section__header props-header ${colorClass}`}
                onClick={onToggle}
                aria-expanded={isOpen}
            >
                <span className="props-section__header-inner">
                    {Icon && <Icon className="props-section__icon" aria-hidden />}
                    <span className="props-section__title">{title}</span>
                </span>
                {isOpen ? (
                    <ChevronDownIcon className="props-section__chev" aria-hidden />
                ) : (
                    <ChevronRightIcon className="props-section__chev" aria-hidden />
                )}
            </button>
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="props-section__motion"
                    >
                        <div className="props-section__body">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const SidebarTools = () => {
    const {
        transformMode, setTransformMode,
        objectSnapEnabled, toggleObjectSnap,
        spawnAtThreeDCursor, setSpawnAtThreeDCursor,
        isolateActive, toggleIsolateSelected, showAllSceneObjects,
        selectAll, deselectAll, frameCameraViewport,
        selectedIds, lockedObjectIds,
        uiSimpleMode, setUiSimpleMode,
        materialPaintMode, setMaterialPaintMode,
        lightingEnabled, setLightingEnabled,
        environmentVisible, setEnvironmentVisible,
        setWebgpuPathTraceRequested,
        editorUndo, editorRedo,
        wireframe, setWireframe,
        gridVisible, setGridVisible,
        objects, selectedId, duplicateObject, removeObject, updateObject, addObject,
    } = useStore(
        useShallow((s) => ({
            transformMode: s.transformMode,
            setTransformMode: s.setTransformMode,
            objectSnapEnabled: s.objectSnapEnabled,
            toggleObjectSnap: s.toggleObjectSnap,
            spawnAtThreeDCursor: s.spawnAtThreeDCursor,
            setSpawnAtThreeDCursor: s.setSpawnAtThreeDCursor,
            isolateActive: s.isolateActive,
            toggleIsolateSelected: s.toggleIsolateSelected,
            showAllSceneObjects: s.showAllSceneObjects,
            selectAll: s.selectAll,
            deselectAll: s.deselectAll,
            frameCameraViewport: s.frameCameraViewport,
            selectedIds: s.selectedIds,
            lockedObjectIds: s.lockedObjectIds,
            uiSimpleMode: s.uiSimpleMode,
            setUiSimpleMode: s.setUiSimpleMode,
            materialPaintMode: s.materialPaintMode,
            setMaterialPaintMode: s.setMaterialPaintMode,
            lightingEnabled: s.lightingEnabled,
            setLightingEnabled: s.setLightingEnabled,
            environmentVisible: s.environmentVisible,
            setEnvironmentVisible: s.setEnvironmentVisible,
            setWebgpuPathTraceRequested: s.setWebgpuPathTraceRequested,
            editorUndo: s.editorUndo,
            editorRedo: s.editorRedo,
            wireframe: s.wireframe,
            setWireframe: s.setWireframe,
            gridVisible: s.gridVisible,
            setGridVisible: s.setGridVisible,
            objects: s.objects,
            selectedId: s.selectedId,
            duplicateObject: s.duplicateObject,
            removeObject: s.removeObject,
            updateObject: s.updateObject,
            addObject: s.addObject,
        }))
    );

    const selectedObj = objects.find(o => o.id === selectedId);
    const [operatorPanel, setOperatorPanel] = useState('');
    const [toolOrientation, setToolOrientation] = useState(() => localStorage.getItem('novira_tool_orientation_v1') || 'global');
    const [toolPivot, setToolPivot] = useState(() => localStorage.getItem('novira_tool_pivot_v1') || 'median');
    const [axisLock, setAxisLock] = useState(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('novira_axis_lock_v1') || '{}');
            return { x: !!parsed.x, y: !!parsed.y, z: !!parsed.z };
        } catch {
            return { x: false, y: false, z: false };
        }
    });
    const [snapFilter, setSnapFilter] = useState(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('novira_snap_filter_v1') || '{}');
            return {
                increment: parsed.increment !== false,
                vertex: !!parsed.vertex,
                edge: !!parsed.edge,
                face: parsed.face !== false,
            };
        } catch {
            return { increment: true, vertex: false, edge: false, face: true };
        }
    });
    const [arrayPreset, setArrayPreset] = useState(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('novira_array_preset_v1') || '{}');
            return {
                count: Math.max(2, Math.min(24, Math.round(parsed.count || 4))),
                offsetX: Number.isFinite(parsed.offsetX) ? parsed.offsetX : 1,
                offsetY: Number.isFinite(parsed.offsetY) ? parsed.offsetY : 0,
                offsetZ: Number.isFinite(parsed.offsetZ) ? parsed.offsetZ : 0,
            };
        } catch {
            return { count: 4, offsetX: 1, offsetY: 0, offsetZ: 0 };
        }
    });
    const [mirrorPreset, setMirrorPreset] = useState(() => localStorage.getItem('novira_mirror_axis_v1') || 'x');
    const [alignPreset, setAlignPreset] = useState(() => localStorage.getItem('novira_align_preset_v1') || 'center_xz');
    const [guidedMode, setGuidedMode] = useState(() => localStorage.getItem('novira_tools_guided_v1') !== '0');
    const [operatorHistory, setOperatorHistory] = useState(() => {
        try {
            const parsed = JSON.parse(localStorage.getItem('novira_operator_history_v1') || '[]');
            return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
        } catch {
            return [];
        }
    });
    const [directorShotPlan, setDirectorShotPlan] = useState([]);
    const [directorPreviewIndex, setDirectorPreviewIndex] = useState(0);
    const [directorAutoPreview, setDirectorAutoPreview] = useState(false);
    const [transformAssistant, setTransformAssistant] = useState({ open: false, mode: 'translate', axis: 'x', value: 0 });
    const [transformOriginals, setTransformOriginals] = useState({});

    React.useEffect(() => {
        localStorage.setItem('novira_tool_orientation_v1', toolOrientation);
        localStorage.setItem('novira_tool_pivot_v1', toolPivot);
        localStorage.setItem('novira_mirror_axis_v1', mirrorPreset);
        localStorage.setItem('novira_align_preset_v1', alignPreset);
        localStorage.setItem('novira_axis_lock_v1', JSON.stringify(axisLock));
        localStorage.setItem('novira_snap_filter_v1', JSON.stringify(snapFilter));
        localStorage.setItem('novira_array_preset_v1', JSON.stringify(arrayPreset));
        localStorage.setItem('novira_tools_guided_v1', guidedMode ? '1' : '0');
        localStorage.setItem('novira_operator_history_v1', JSON.stringify(operatorHistory.slice(0, 8)));
    }, [toolOrientation, toolPivot, mirrorPreset, alignPreset, axisLock, snapFilter, arrayPreset, guidedMode, operatorHistory]);

    const handleCopy = () => { if (selectedId) duplicateObject(selectedId); };
    const handleDel = () => { if (selectedId) removeObject(selectedId); };

    const addPrim = (geo) => addObject({ type: 'primitive', geo, dimensions: [1, 1, 1], color: '#e2e8f0' });

    const modObj = (updater) => { if (selectedObj) updateObject(selectedId, updater(selectedObj)); };
    const mirror = (axis) => modObj(o => { const scl = [...(o.scale || [1, 1, 1])]; scl[axis] *= -1; return { scale: scl }; });

    const ground = () => modObj(o => {
        const groundObj = objects.find(g => g.type === 'ground');
        let floorY = 0;
        if (groundObj) floorY = groundObj.position[1] + ((groundObj.dimensions?.[1] || 1) * (groundObj.scale?.[1] || 1)) / 2;
        const bottomOffset = o.type === 'gltf' || o.type === 'stl' ? 0 : ((o.dimensions?.[1] || 1) / 2 * (o.scale?.[1] || 1));
        return { position: [o.position[0], floorY + bottomOffset, o.position[2]] };
    });

    const align = (axis) => modObj(o => { const pos = [...(o.position || [0, 0, 0])]; pos[axis] = 0; return { position: pos }; });

    const openCmdPalette = () => useStore.getState().setShowCommandPalette(true);
    const openExportPanel = () => document.dispatchEvent(new CustomEvent('novira:open-export-panel'));
    const applyDisplayMode = (mode) => {
        if (mode === 'solid') {
            setWireframe(false);
            setMaterialPaintMode(false);
            setLightingEnabled(true);
            setEnvironmentVisible(false);
            setWebgpuPathTraceRequested(false);
            return;
        }
        if (mode === 'edit') {
            setWireframe(true);
            setMaterialPaintMode(true);
            setLightingEnabled(true);
            setEnvironmentVisible(false);
            setWebgpuPathTraceRequested(false);
            return;
        }
        // render
        setWireframe(false);
        setMaterialPaintMode(false);
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setWebgpuPathTraceRequested(false);
    };
    const applyRenderPipelinePreset = (presetKey) => {
        const preset = RENDER_PIPELINE_PRESETS[presetKey];
        if (!preset) return;
        setRenderPipelinePreset(presetKey);
        setRenderSamples(preset.samples);
        setRenderRayDepth(preset.rayDepth);
        setRenderBounceBudget(preset.bounceBudget);
        setRenderUseDenoise(Boolean(preset.denoise));
        setRenderDenoiseQuality(preset.denoiseQuality);
        setWebgpuPathTraceRequested(Boolean(preset.useWebgpu));
        setSmartZoomEnabled(Boolean(preset.smartZoom));
        setRenderViewTransform(preset.viewTransform);
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setAiRenderNote(`Pipeline preset: ${preset.label} (${preset.samples} samples, depth ${preset.rayDepth})`);
        showToast(`Render preset "${preset.label}" applied.`, 'ok');
    };
    const applyAIMaterialPrompt = () => {
        if (!selectedObj) {
            showToast('Select an object first.', 'warn');
            return;
        }
        const mat = deriveMaterialFromPrompt(aiMaterialPrompt);
        updateObject(selectedObj.id, {
            color: mat.color,
            roughness: mat.roughness,
            metalness: mat.metalness,
            emissive: mat.emissive,
            emissiveIntensity: mat.emissiveIntensity,
            opacity: mat.opacity,
        }, true);
        setAiRenderNote(`Material applied: ${aiMaterialPrompt || 'default neutral surface'}`);
        showToast('Applied neural material suggestion.', 'ok');
    };
    const runAIDirectorShot = () => {
        const st = useStore.getState();
        const prompt = String(aiShotPrompt || '').toLowerCase();
        const center = selectedObj?.position || [0, 1.2, 0];
        let position = [center[0] + 8, center[1] + 5, center[2] + 8];
        let nav = 'orbit';
        if (prompt.includes('crane')) {
            position = [center[0] + 6, center[1] + 11, center[2] + 7];
            nav = 'orbit';
        } else if (prompt.includes('dolly')) {
            position = [center[0], center[1] + 2.2, center[2] + 11];
            nav = 'orbit';
        } else if (prompt.includes('fly') || prompt.includes('fly-through') || prompt.includes('flythrough')) {
            position = [center[0] + 12, center[1] + 2.5, center[2] + 1.5];
            nav = 'walk';
        }
        st.setMode?.('preview');
        st.setCameraFocus?.(center, position);
        st.setViewportNavMode?.(nav);
        if (prompt.includes('golden')) st.setEnvPreset?.('sunset');
        if (prompt.includes('night')) st.setEnvPreset?.('city');
        setEnvironmentVisible(true);
        setLightingEnabled(true);
        setSmartZoomEnabled(true);
        setAiRenderNote(`Shot applied: ${aiShotPrompt || 'director auto framing'}`);
        showToast('Director shot solved and framed.', 'ok');
    };
    const bakeDirectorTimeline = () => {
        const prompt = String(aiShotPrompt || '').toLowerCase();
        const center = selectedObj?.position || [0, 1.2, 0];
        const moodEnvPreset = prompt.includes('night') ? 'city' : (prompt.includes('golden') ? 'sunset' : 'studio');
        const shotTokens = [];
        if (prompt.includes('establish')) shotTokens.push('establish');
        if (prompt.includes('crane')) shotTokens.push('crane');
        if (prompt.includes('dolly')) shotTokens.push('dolly');
        if (prompt.includes('fly') || prompt.includes('fly-through') || prompt.includes('flythrough')) shotTokens.push('fly');
        if (prompt.includes('orbit') || prompt.includes('360')) shotTokens.push('orbit');
        if (prompt.includes('close') || prompt.includes('detail')) shotTokens.push('close');
        if (!shotTokens.length) shotTokens.push('establish', 'orbit', 'close');
        const durationFrames = Math.max(1, Math.round(Number(directorDurationSec || 10) * Number(directorFps || 30)));
        const totalShots = shotTokens.length;
        const framesPerShot = Math.max(1, Math.floor(durationFrames / totalShots));
        const plan = shotTokens.map((token, idx) => {
            const start = idx * framesPerShot + 1;
            const end = idx === totalShots - 1 ? durationFrames : ((idx + 1) * framesPerShot);
            const base = {
                target: [...center],
                position: [center[0] + 8, center[1] + 4, center[2] + 8],
                label: `Shot ${idx + 1}`,
                navMode: 'orbit',
                envPreset: moodEnvPreset,
            };
            if (token === 'establish') {
                base.label = 'Establish';
                base.position = [center[0] + 11, center[1] + 7, center[2] + 11];
            } else if (token === 'crane') {
                base.label = 'Crane Rise';
                base.position = [center[0] + 7, center[1] + 11, center[2] + 6];
            } else if (token === 'dolly') {
                base.label = 'Dolly Push';
                base.position = [center[0], center[1] + 2.2, center[2] + 12];
            } else if (token === 'orbit') {
                base.label = 'Orbit Arc';
                base.position = [center[0] - 9, center[1] + 4, center[2] + 3];
            } else if (token === 'fly') {
                base.label = 'Fly Through';
                base.position = [center[0] + 12, center[1] + 2.5, center[2] + 1.5];
                base.navMode = 'walk';
            } else if (token === 'close') {
                base.label = 'Detail Close-up';
                base.position = [center[0] + 2.1, center[1] + 1.8, center[2] + 2.6];
            }
            return {
                ...base,
                start,
                end,
                name: `${base.label} (${start}-${end})`,
            };
        });
        setFrameStart(1);
        setFrameEnd(durationFrames);
        setDirectorShotPlan(plan);
        setAiRenderNote(`Director timeline baked: ${plan.length} shots, ${durationFrames} frames.`);
        showToast(`Baked ${plan.length} shots to timeline range.`, 'ok');
    };
    const applyDirectorShotToViewport = (shot) => {
        if (!shot) return;
        const st = useStore.getState();
        st.setMode?.('preview');
        st.setCameraFocus?.(shot.target, shot.position);
        st.setViewportNavMode?.(shot.navMode || 'orbit');
        st.setEnvPreset?.(shot.envPreset || 'studio');
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setFrameStart(Math.max(1, Number(shot.start) || 1));
        setFrameEnd(Math.max(Number(shot.start) || 1, Number(shot.end) || Number(shot.start) || 1));
        setAiRenderNote(`Applied shot "${shot.label}" with export range ${shot.start}-${shot.end}.`);
    };
    const applyDirectorSequenceDefaults = () => {
        if (!directorShotPlan.length) {
            showToast('Bake timeline first to apply sequence defaults.', 'warn');
            return;
        }
        const first = directorShotPlan[0];
        applyDirectorShotToViewport(first);
        showToast('Sequence defaults applied. Opening export panel…', 'ok');
        openExportPanel();
    };
    const queueDirectorShotsForExport = () => {
        if (!directorShotPlan.length) {
            showToast('Bake timeline first to queue exports.', 'warn');
            return;
        }
        document.dispatchEvent(new CustomEvent('novira:open-export-panel', {
            detail: {
                directorQueue: directorShotPlan.map((shot, idx) => ({
                    id: `shot-${idx + 1}`,
                    name: shot.label,
                    frameStart: shot.start,
                    frameEnd: shot.end,
                    cameraTarget: shot.target,
                    cameraPosition: shot.position,
                    navMode: shot.navMode || 'orbit',
                    envPreset: shot.envPreset || 'studio',
                })),
                directorMeta: {
                    prompt: aiShotPrompt,
                    fps: directorFps,
                    durationSec: directorDurationSec,
                },
            },
        }));
        showToast(`Queued ${directorShotPlan.length} shots for export.`, 'ok');
    };
    const saveDirectorCameras = () => {
        if (!directorShotPlan.length) {
            showToast('Bake timeline first to generate cameras.', 'warn');
            return;
        }
        document.dispatchEvent(new CustomEvent('novira:save-scene-camera-batch', {
            detail: {
                cameras: directorShotPlan.map((s) => ({
                    name: `Director - ${s.label}`,
                    position: s.position,
                    target: s.target,
                })),
            },
        }));
    };
    const previewDirectorShotAt = (idx) => {
        if (!directorShotPlan.length) return;
        const safeIdx = Math.max(0, Math.min(directorShotPlan.length - 1, idx));
        setDirectorPreviewIndex(safeIdx);
        applyDirectorShotToViewport(directorShotPlan[safeIdx]);
    };
    const previewNextDirectorShot = () => {
        if (!directorShotPlan.length) return;
        previewDirectorShotAt((directorPreviewIndex + 1) % directorShotPlan.length);
    };
    const previewPrevDirectorShot = () => {
        if (!directorShotPlan.length) return;
        previewDirectorShotAt((directorPreviewIndex - 1 + directorShotPlan.length) % directorShotPlan.length);
    };
    React.useEffect(() => {
        if (!directorAutoPreview || directorShotPlan.length <= 1) return undefined;
        const id = window.setInterval(() => {
            setDirectorPreviewIndex((prev) => {
                const next = (prev + 1) % directorShotPlan.length;
                applyDirectorShotToViewport(directorShotPlan[next]);
                return next;
            });
        }, 1800);
        return () => window.clearInterval(id);
    }, [directorAutoPreview, directorShotPlan]);
    const displayMode = materialPaintMode ? 'edit' : (wireframe ? 'edit' : (environmentVisible ? 'render' : 'solid'));
    const axisAllowed = (axis) => !axisLock[axis];
    const targetIds = useMemo(() => {
        const base = selectedIds?.length ? selectedIds : (selectedId ? [selectedId] : []);
        return base.filter((id) => !lockedObjectIds.includes(id));
    }, [selectedIds, selectedId, lockedObjectIds]);
    const targetObjects = useMemo(() => {
        const setIds = new Set(targetIds);
        return objects.filter((o) => setIds.has(o.id));
    }, [objects, targetIds]);
    const hasSelection = targetIds.length > 0;
    const canEditScene = displayMode !== 'render';
    const canTransformSelection = canEditScene && hasSelection;
    const canPlaceObjects = canEditScene;
    const pushHistory = (entry) => {
        setOperatorHistory((prev) => [entry, ...prev].slice(0, 8));
    };
    const openTransformAssistant = (mode) => {
        const originals = {};
        targetObjects.forEach((o) => {
            originals[o.id] = {
                position: [...(o.position || [0, 0, 0])],
                rotation: [...(o.rotation || [0, 0, 0])],
                scale: [...(o.scale || [1, 1, 1])],
            };
        });
        setTransformOriginals(originals);
        setTransformAssistant({ open: true, mode, axis: 'x', value: mode === 'scale' ? 1 : 0 });
    };
    const applyTransformAssistant = (next = transformAssistant, commit = false, origins = transformOriginals) => {
        if (!targetIds.length) return;
        const axisIndex = next.axis === 'x' ? 0 : next.axis === 'y' ? 1 : 2;
        targetIds.forEach((id) => {
            const origin = origins[id];
            if (!origin) return;
            if (next.mode === 'translate') {
                const pos = [...origin.position];
                if (axisAllowed(next.axis)) pos[axisIndex] = origin.position[axisIndex] + Number(next.value || 0);
                updateObject(id, { position: pos }, commit);
            } else if (next.mode === 'rotate') {
                const rot = [...origin.rotation];
                if (axisAllowed(next.axis)) rot[axisIndex] = origin.rotation[axisIndex] + ((Number(next.value || 0) * Math.PI) / 180);
                updateObject(id, { rotation: rot }, commit);
            } else {
                const scl = [...origin.scale];
                const factor = Math.max(0.001, Number(next.value || 1));
                if (axisAllowed(next.axis)) scl[axisIndex] = origin.scale[axisIndex] * factor;
                updateObject(id, { scale: scl }, commit);
            }
        });
    };
    const cancelTransformAssistant = () => {
        targetIds.forEach((id) => {
            const origin = transformOriginals[id];
            if (!origin) return;
            updateObject(id, {
                position: [...origin.position],
                rotation: [...origin.rotation],
                scale: [...origin.scale],
            }, false);
        });
        setTransformAssistant({ open: false, mode: 'translate', axis: 'x', value: 0 });
        setTransformOriginals({});
    };
    const confirmTransformAssistant = () => {
        applyTransformAssistant(transformAssistant, true);
        pushHistory({
            type: 'transform',
            label: `${transformAssistant.mode} ${transformAssistant.axis.toUpperCase()} ${transformAssistant.value}`,
            payload: { ...transformAssistant },
        });
        setTransformAssistant((prev) => ({ ...prev, open: false }));
    };
    const applyArrayPreset = (preset = arrayPreset) => {
        if (!targetObjects.length) return;
        targetObjects.forEach((obj) => {
            const base = obj.position || [0, 0, 0];
            for (let i = 1; i < preset.count; i += 1) {
                const clone = { ...obj };
                delete clone.id;
                delete clone.parentId;
                clone.name = `${obj.name || obj.type} ${i + 1}`;
                clone.position = [
                    axisAllowed('x') ? base[0] + (preset.offsetX * i) : base[0],
                    axisAllowed('y') ? base[1] + (preset.offsetY * i) : base[1],
                    axisAllowed('z') ? base[2] + (preset.offsetZ * i) : base[2],
                ];
                addObject(clone);
            }
        });
        pushHistory({ type: 'array', label: `Array x${preset.count}`, payload: preset });
        showToast(`Array applied to ${targetObjects.length} object(s)`, 'ok');
    };
    const applyMirrorPreset = (axisName = mirrorPreset) => {
        const axis = axisName === 'x' ? 0 : axisName === 'y' ? 1 : 2;
        targetIds.forEach((id) => {
            const obj = objects.find((o) => o.id === id);
            if (!obj) return;
            const scl = [...(obj.scale || [1, 1, 1])];
            scl[axis] *= -1;
            updateObject(id, { scale: scl }, true);
        });
        pushHistory({ type: 'mirror', label: `Mirror ${axisName.toUpperCase()}`, payload: { axisName } });
    };
    const applyAlignPreset = (presetName = alignPreset) => {
        if (!targetIds.length) return;
        targetIds.forEach((id) => {
            const obj = objects.find((o) => o.id === id);
            if (!obj) return;
            const pos = [...(obj.position || [0, 0, 0])];
            if (presetName === 'ground') {
                const groundObj = objects.find((g) => g.type === 'ground');
                let floorY = 0;
                if (groundObj) floorY = groundObj.position[1] + ((groundObj.dimensions?.[1] || 1) * (groundObj.scale?.[1] || 1)) / 2;
                const bottomOffset = obj.type === 'gltf' || obj.type === 'stl' ? 0 : ((obj.dimensions?.[1] || 1) / 2 * (obj.scale?.[1] || 1));
                pos[1] = floorY + bottomOffset;
            } else if (presetName === 'origin_all') {
                if (axisAllowed('x')) pos[0] = 0;
                if (axisAllowed('y')) pos[1] = 0;
                if (axisAllowed('z')) pos[2] = 0;
            } else {
                if (axisAllowed('x')) pos[0] = 0;
                if (axisAllowed('z')) pos[2] = 0;
            }
            updateObject(id, { position: pos }, true);
        });
        pushHistory({ type: 'align', label: `Align ${presetName}`, payload: { presetName } });
    };
    const rerunHistory = (entry) => {
        if (!entry) return;
        if (entry.type === 'array') applyArrayPreset(entry.payload || arrayPreset);
        if (entry.type === 'mirror') applyMirrorPreset(entry.payload?.axisName || mirrorPreset);
        if (entry.type === 'align') applyAlignPreset(entry.payload?.presetName || alignPreset);
        if (entry.type === 'transform') {
            const originals = {};
            targetObjects.forEach((o) => {
                originals[o.id] = {
                    position: [...(o.position || [0, 0, 0])],
                    rotation: [...(o.rotation || [0, 0, 0])],
                    scale: [...(o.scale || [1, 1, 1])],
                };
            });
            const next = {
                open: true,
                mode: entry.payload?.mode || 'translate',
                axis: entry.payload?.axis || 'x',
                value: entry.payload?.value ?? 0,
            };
            setTransformAssistant(next);
            setTransformOriginals(originals);
            applyTransformAssistant(next, true, originals);
            setTransformAssistant((prev) => ({ ...prev, open: false }));
        }
    };

    return (
        <div className="inspector-tools-stack inspector-tools-shelf">
            <div className="inspector-tools-topbar">
                <span className="inspector-tools-topbar__count">{targetIds.length} target</span>
                <div className="inspector-operator-strip__axis">
                    <button type="button" className={`inspector-pill-btn ${uiSimpleMode ? 'inspector-pill-btn--active' : ''}`} onClick={() => setUiSimpleMode(!uiSimpleMode)}>
                        Simple
                    </button>
                    {!uiSimpleMode && (
                        <button type="button" className={`inspector-pill-btn ${guidedMode ? 'inspector-pill-btn--active' : ''}`} onClick={() => setGuidedMode((v) => !v)}>
                            Easy labels {guidedMode ? 'On' : 'Off'}
                        </button>
                    )}
                </div>
            </div>
            <div className="inspector-operator-strip">
                <div className="inspector-field-label">Display Mode</div>
                <div className="inspector-operator-strip__axis">
                    <button type="button" className={`inspector-pill-btn ${displayMode === 'solid' ? 'inspector-pill-btn--active' : ''}`} onClick={() => applyDisplayMode('solid')}>
                        Solid
                    </button>
                    <button type="button" className={`inspector-pill-btn ${displayMode === 'edit' ? 'inspector-pill-btn--active' : ''}`} onClick={() => applyDisplayMode('edit')}>
                        Edit
                    </button>
                    <button type="button" className={`inspector-pill-btn ${displayMode === 'render' ? 'inspector-pill-btn--active' : ''}`} onClick={() => applyDisplayMode('render')}>
                        Render
                    </button>
                </div>
            </div>
            {uiSimpleMode && (
                <div className="inspector-operator-pop">
                    <div className="inspector-field-label">Guided Build Flow</div>
                    <div className="inspector-context-hint">1) Add a shape 2) Move/scale it 3) Switch to Render 4) Export your scene.</div>
                    {displayMode === 'render' && (
                        <div className="inspector-context-hint">Render mode is preview-only. Switch to Solid or Edit to modify objects.</div>
                    )}
                    <div className="inspector-tool-grid inspector-tool-grid--3">
                        <button type="button" className="inspector-btn inspector-btn--secondary" disabled={!canPlaceObjects} onClick={() => addPrim('box')}>Add Box</button>
                        <button type="button" className="inspector-btn inspector-btn--secondary" disabled={!canPlaceObjects} onClick={() => addPrim('plane')}>Add Floor</button>
                        <button type="button" className="inspector-btn inspector-btn--secondary" onClick={() => applyDisplayMode('render')}>Preview Render</button>
                    </div>
                    <div className="inspector-tool-grid inspector-tool-grid--3">
                        <button type="button" className="inspector-btn inspector-btn--secondary" disabled={!canTransformSelection} onClick={() => setTransformMode('translate')}>Move Tool</button>
                        <button type="button" className="inspector-btn inspector-btn--secondary" disabled={!canTransformSelection} onClick={() => setTransformMode('scale')}>Scale Tool</button>
                        <button type="button" className="inspector-btn inspector-btn--secondary" onClick={openExportPanel}>Export</button>
                    </div>
                </div>
            )}
            <GroupTitle title="transform" />
            <div className="inspector-tool-grid inspector-tool-grid--4">
                <ToolBtn icon={<CursorArrowRaysIcon className="inspector-icon-md" />} label="Select" shortcut="Esc" active={transformMode === 'select'} onClick={() => setTransformMode('select')} />
                <ToolBtn icon={<ArrowsRightLeftIcon className="inspector-icon-md" />} label="Move" shortcut="G" active={transformMode === 'translate'} disabled={!canTransformSelection} onClick={() => { setTransformMode('translate'); openTransformAssistant('translate'); }} />
                <ToolBtn icon={<ArrowPathRoundedSquareIcon className="inspector-icon-md" />} label="Rotate" shortcut="R" active={transformMode === 'rotate'} disabled={!canTransformSelection} onClick={() => { setTransformMode('rotate'); openTransformAssistant('rotate'); }} />
                <ToolBtn icon={<ArrowsPointingInIcon className="inspector-icon-md" />} label="Scale" shortcut="S" active={transformMode === 'scale'} disabled={!canTransformSelection} onClick={() => { setTransformMode('scale'); openTransformAssistant('scale'); }} />
            </div>
            {transformAssistant.open && (
                <div className="inspector-operator-pop">
                    <div className="inspector-field-label">Transform Assistant</div>
                    <div className="inspector-operator-strip__axis">
                        {['translate', 'rotate', 'scale'].map((mode) => (
                            <button
                                key={mode}
                                type="button"
                                className={`inspector-pill-btn ${transformAssistant.mode === mode ? 'inspector-pill-btn--active' : ''}`}
                                onClick={() => {
                                    const next = { ...transformAssistant, mode, value: mode === 'scale' ? 1 : 0 };
                                    setTransformAssistant(next);
                                    applyTransformAssistant(next, false);
                                }}
                            >
                                {mode === 'translate' ? 'Move' : mode === 'rotate' ? 'Rotate' : 'Scale'}
                            </button>
                        ))}
                    </div>
                    <div className="inspector-operator-strip__axis">
                        {['x', 'y', 'z'].map((ax) => (
                            <button
                                key={ax}
                                type="button"
                                className={`inspector-pill-btn ${transformAssistant.axis === ax ? 'inspector-pill-btn--active' : ''}`}
                                onClick={() => {
                                    const next = { ...transformAssistant, axis: ax };
                                    setTransformAssistant(next);
                                    applyTransformAssistant(next, false);
                                }}
                            >
                                {ax.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <label className="inspector-operator-strip__label">
                        Amount {transformAssistant.mode === 'rotate' ? '(deg)' : transformAssistant.mode === 'scale' ? '(factor)' : '(m)'}
                        <input
                            type="number"
                            step={transformAssistant.mode === 'rotate' ? 1 : 0.1}
                            className="props-input-field"
                            value={transformAssistant.value}
                            onChange={(e) => {
                                const next = { ...transformAssistant, value: parseFloat(e.target.value) || 0 };
                                setTransformAssistant(next);
                                applyTransformAssistant(next, false);
                            }}
                        />
                    </label>
                    <div className="inspector-operator-strip__axis">
                        <button type="button" className="inspector-btn inspector-btn--secondary" onClick={confirmTransformAssistant}>Confirm</button>
                        <button type="button" className="inspector-btn inspector-btn--ghost" onClick={cancelTransformAssistant}>Cancel</button>
                    </div>
                </div>
            )}
            <div className="inspector-operator-strip">
                {guidedMode && <div className="inspector-context-hint">Use orientation + pivot first, then lock axes for constrained motion.</div>}
                <label className="inspector-operator-strip__label">
                    Orientation
                    <select className="props-select-field" value={toolOrientation} onChange={(e) => setToolOrientation(e.target.value)}>
                        <option value="global">Global</option>
                        <option value="local">Local</option>
                        <option value="normal">Normal</option>
                        <option value="view">View</option>
                    </select>
                </label>
                <label className="inspector-operator-strip__label">
                    Pivot
                    <select className="props-select-field" value={toolPivot} onChange={(e) => setToolPivot(e.target.value)}>
                        <option value="median">Median</option>
                        <option value="active">Active</option>
                        <option value="cursor">3D Cursor</option>
                        <option value="bounds">Bounding Box</option>
                    </select>
                </label>
                <div className="inspector-operator-strip__axis">
                    {['x', 'y', 'z'].map((ax) => (
                        <button
                            key={ax}
                            type="button"
                            className={`inspector-pill-btn ${axisLock[ax] ? 'inspector-pill-btn--active' : ''}`}
                            onClick={() => setAxisLock((prev) => ({ ...prev, [ax]: !prev[ax] }))}
                        >
                            Lock {ax.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            <GroupTitle title="selection" />
            <div className="inspector-tool-grid inspector-tool-grid--4">
                <ToolBtn icon={<CheckCircleIcon className="inspector-icon-md" />} label="All" shortcut="A" disabled={objects.length === 0} onClick={selectAll} />
                <ToolBtn icon={<MinusSmallIcon className="inspector-icon-md" />} label="None" shortcut="Alt+A" onClick={deselectAll} />
                <ToolBtn icon={<EyeSlashIcon className="inspector-icon-md" />} label="Isolate" active={isolateActive} disabled={!canTransformSelection} onClick={toggleIsolateSelected} />
                <ToolBtn icon={<EyeIcon className="inspector-icon-md" />} label="Show All" disabled={objects.length === 0} onClick={showAllSceneObjects} />
            </div>

            <GroupTitle title="viewport" />
            <div className="inspector-tool-grid inspector-tool-grid--4">
                <ToolBtn icon={<Squares2X2Icon className="inspector-icon-md" />} label="Grid" active={gridVisible} onClick={() => setGridVisible(!gridVisible)} />
                <ToolBtn icon={<ViewColumnsIcon className="inspector-icon-md" />} label="Wire" active={wireframe} onClick={() => setWireframe(!wireframe)} />
                <ToolBtn icon={<ArrowsPointingOutIcon className="inspector-icon-md" />} label="Frame Sel" shortcut="F" onClick={() => frameCameraViewport('selection')} />
                <ToolBtn icon={<ArrowsPointingOutIcon className="inspector-icon-md" />} label="Frame All" shortcut="Home" onClick={() => frameCameraViewport('all')} />
            </div>

            {!uiSimpleMode && (
                <>
            <GroupTitle title="snap / cursor" />
            <div className="inspector-tool-grid inspector-tool-grid--4">
                <ToolBtn icon={<AdjustmentsHorizontalIcon className="inspector-icon-md" />} label="Snap" active={objectSnapEnabled} onClick={toggleObjectSnap} />
                <ToolBtn icon={<PlusIcon className="inspector-icon-md" />} label="Use Cursor" active={spawnAtThreeDCursor} onClick={() => setSpawnAtThreeDCursor(!spawnAtThreeDCursor)} />
                <ToolBtn icon={<ArrowUturnLeftIcon className="inspector-icon-md" />} label="Undo" shortcut="Ctrl+Z" onClick={editorUndo} />
                <ToolBtn icon={<ArrowUturnRightIcon className="inspector-icon-md" />} label="Redo" shortcut="Ctrl+Y" onClick={editorRedo} />
            </div>
            <div className="inspector-operator-strip">
                {guidedMode && <div className="inspector-context-hint">Enable the snap targets your team needs to avoid off-grid placement.</div>}
                <div className="inspector-field-label">Snap targets</div>
                <div className="inspector-operator-strip__axis">
                    {[
                        ['increment', 'Increment'],
                        ['vertex', 'Vertex'],
                        ['edge', 'Edge'],
                        ['face', 'Face'],
                    ].map(([key, label]) => (
                        <button
                            key={key}
                            type="button"
                            className={`inspector-pill-btn ${snapFilter[key] ? 'inspector-pill-btn--active' : ''}`}
                            onClick={() => setSnapFilter((prev) => ({ ...prev, [key]: !prev[key] }))}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <GroupTitle title="workflow" />
            <div className="inspector-tool-grid inspector-tool-grid--4">
                {uiSimpleMode ? (
                    <ToolBtn icon={<ArrowDownOnSquareStackIcon className="inspector-icon-md" />} label="Export" onClick={openExportPanel} />
                ) : (
                    <ToolBtn icon={<CommandLineIcon className="inspector-icon-md" />} label="Cmds" shortcut="Ctrl+K" onClick={openCmdPalette} />
                )}
                <ToolBtn icon={<DocumentDuplicateIcon className="inspector-icon-md" />} label="Dup" shortcut="Shift+D" disabled={!canTransformSelection} onClick={handleCopy} />
                <ToolBtn icon={<XMarkIcon className="inspector-icon-md" />} label="Delete" shortcut="X" disabled={!canTransformSelection} onClick={handleDel} />
                {uiSimpleMode ? (
                    <ToolBtn icon={<ArrowsPointingOutIcon className="inspector-icon-md" />} label="Frame Sel" shortcut="F" disabled={!hasSelection} onClick={() => frameCameraViewport('selection')} />
                ) : (
                    <ToolBtn icon={<ArrowDownOnSquareStackIcon className="inspector-icon-md" />} label="Array+" active={operatorPanel === 'array'} disabled={!canTransformSelection} onClick={() => setOperatorPanel((p) => (p === 'array' ? '' : 'array'))} />
                )}
            </div>
            {!uiSimpleMode && operatorPanel === 'array' && (
                <div className="inspector-operator-pop">
                    {guidedMode && <div className="inspector-context-hint">Count clones each selected object. Offsets are per-step spacing.</div>}
                    <SliderRow label="Count" value={arrayPreset.count} min={2} max={24} step={1} onChange={(v) => setArrayPreset((p) => ({ ...p, count: Math.round(v) }))} />
                    <SliderRow label="Offset X" value={arrayPreset.offsetX} min={-10} max={10} step={0.1} onChange={(v) => setArrayPreset((p) => ({ ...p, offsetX: v }))} />
                    <SliderRow label="Offset Y" value={arrayPreset.offsetY} min={-10} max={10} step={0.1} onChange={(v) => setArrayPreset((p) => ({ ...p, offsetY: v }))} />
                    <SliderRow label="Offset Z" value={arrayPreset.offsetZ} min={-10} max={10} step={0.1} onChange={(v) => setArrayPreset((p) => ({ ...p, offsetZ: v }))} />
                    <button type="button" className="inspector-btn inspector-btn--secondary" onClick={applyArrayPreset}>Apply array preset</button>
                </div>
            )}
                </>
            )}

            <GroupTitle title="placement" />
            <div className="inspector-tool-grid inspector-tool-grid--4">
                <ToolBtn icon={<ArrowDownOnSquareStackIcon className="inspector-icon-md" />} label="Floor" disabled={!canTransformSelection} onClick={ground} />
                <ToolBtn icon={<MinusSmallIcon className="inspector-icon-md" />} label="Align X" disabled={!canTransformSelection} onClick={() => align(0)} />
                <ToolBtn icon={<MinusSmallIcon className="inspector-icon-md" />} label="Align Z" disabled={!canTransformSelection} onClick={() => align(2)} />
                {uiSimpleMode ? (
                    <ToolBtn icon={<ArrowsPointingOutIcon className="inspector-icon-md" />} label="Center" disabled={!canTransformSelection} onClick={() => applyAlignPreset('center_xz')} />
                ) : (
                    <ToolBtn icon={<AdjustmentsHorizontalIcon className="inspector-icon-md" />} label="Align+" active={operatorPanel === 'align'} disabled={!canTransformSelection} onClick={() => setOperatorPanel((p) => (p === 'align' ? '' : 'align'))} />
                )}
            </div>
            {!uiSimpleMode && operatorPanel === 'align' && (
                <div className="inspector-operator-pop">
                    {guidedMode && <div className="inspector-context-hint">Center XZ for staging, Origin XYZ for reset, Ground for physical placement.</div>}
                    <label className="inspector-field-label">Align preset</label>
                    <select className="props-select-field" value={alignPreset} onChange={(e) => setAlignPreset(e.target.value)}>
                        <option value="center_xz">Center XZ</option>
                        <option value="origin_all">Origin XYZ</option>
                        <option value="ground">Ground</option>
                    </select>
                    <button type="button" className="inspector-btn inspector-btn--secondary" onClick={applyAlignPreset}>Apply alignment</button>
                </div>
            )}

            <GroupTitle title="add primitives" />
            <div className="inspector-tool-grid inspector-tool-grid--3">
                <ToolBtn icon="□" label="Cube" disabled={!canPlaceObjects} onClick={() => addPrim('box')} />
                <ToolBtn icon="○" label="Sphere" disabled={!canPlaceObjects} onClick={() => addPrim('sphere')} />
                <ToolBtn icon="⌒" label="Cylinder" disabled={!canPlaceObjects} onClick={() => addPrim('cylinder')} />
                <ToolBtn icon="◎" label="Torus" disabled={!canPlaceObjects} onClick={() => addPrim('torus')} />
                <ToolBtn icon="△" label="Cone" disabled={!canPlaceObjects} onClick={() => addPrim('cone')} />
                <ToolBtn icon="▭" label="Plane" disabled={!canPlaceObjects} onClick={() => addPrim('plane')} />
            </div>

            {!uiSimpleMode && (
                <>
            <GroupTitle title="modifiers" />
            <div className="inspector-tool-grid inspector-tool-grid--3">
                <ToolBtn icon={<ArrowPathIcon className="inspector-icon-md" />} label="MirX" disabled={!canTransformSelection} onClick={() => { setMirrorPreset('x'); mirror(0); }} />
                <ToolBtn icon={<ArrowPathIcon className="inspector-icon-md" />} label="MirY" disabled={!canTransformSelection} onClick={() => { setMirrorPreset('y'); mirror(1); }} />
                <ToolBtn icon={<PuzzlePieceIcon className="inspector-icon-md" />} label="Mir+" active={operatorPanel === 'mirror'} disabled={!canTransformSelection} onClick={() => setOperatorPanel((p) => (p === 'mirror' ? '' : 'mirror'))} />
            </div>
            {operatorPanel === 'mirror' && (
                <div className="inspector-operator-pop">
                    {guidedMode && <div className="inspector-context-hint">Mirror applies to all selected unlocked objects with one click.</div>}
                    <label className="inspector-field-label">Mirror axis</label>
                    <select className="props-select-field" value={mirrorPreset} onChange={(e) => setMirrorPreset(e.target.value)}>
                        <option value="x">X axis</option>
                        <option value="y">Y axis</option>
                        <option value="z">Z axis</option>
                    </select>
                    <button type="button" className="inspector-btn inspector-btn--secondary" onClick={applyMirrorPreset}>Apply mirror</button>
                </div>
            )}
            <GroupTitle title="operator history" />
            <div className="inspector-operator-history">
                {operatorHistory.length === 0 ? (
                    <div className="inspector-context-hint">No operator yet. Run array, mirror, or align to build replay history.</div>
                ) : (
                    operatorHistory.map((entry, idx) => (
                        <button
                            key={`${entry.type}-${idx}`}
                            type="button"
                            className="inspector-operator-history__item"
                            onClick={() => rerunHistory(entry)}
                            title="Run this operator again on current selection"
                        >
                            <span>{entry.label}</span>
                            <span className="inspector-operator-history__run">Run</span>
                        </button>
                    ))
                )}
            </div>
                </>
            )}
        </div>
    );
};

const BlenderItemContextTabs = ({ active, onChange }) => {
    const tabs = [
        { id: 'render', label: 'Render' },
        { id: 'output', label: 'Output' },
        { id: 'viewLayer', label: 'View Layer' },
        { id: 'scene', label: 'Scene' },
        { id: 'world', label: 'World' },
        { id: 'object', label: 'Object' },
        { id: 'modifiers', label: 'Modifiers' },
        { id: 'constraints', label: 'Constraints' },
        { id: 'objectData', label: 'Object Data' },
        { id: 'material', label: 'Material' },
    ];
    return (
        <div className="inspector-context-tabs" role="tablist" aria-label="Blender 3.6 properties contexts">
            {tabs.map((tab) => (
                <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={active === tab.id}
                    className={`inspector-context-tabs__tab ${active === tab.id ? 'is-active' : ''}`}
                    onClick={() => onChange(tab.id)}
                >
                    {tab.label}
                </button>
            ))}
            </div>
    );
};

const BlenderItemContextIconRail = ({ active, onChange }) => {
    const tabs = [
        { id: 'render', label: 'Render', icon: SparklesIcon },
        { id: 'output', label: 'Output', icon: DocumentDuplicateIcon },
        { id: 'viewLayer', label: 'View Layer', icon: EyeIcon },
        { id: 'scene', label: 'Scene', icon: FolderIcon },
        { id: 'world', label: 'World', icon: SunIcon },
        { id: 'object', label: 'Object', icon: CubeIcon },
        { id: 'modifiers', label: 'Modifiers', icon: PuzzlePieceIcon },
        { id: 'constraints', label: 'Constraints', icon: ShieldCheckIcon },
        { id: 'objectData', label: 'Object Data', icon: WrenchScrewdriverIcon },
        { id: 'material', label: 'Material', icon: SparklesIcon },
    ];
    return (
        <div className="inspector-context-rail" role="tablist" aria-label="Blender 3.6 icon contexts">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={active === tab.id}
                        title={tab.label}
                        className={`inspector-context-rail__btn ${active === tab.id ? 'is-active' : ''}`}
                        onClick={() => onChange(tab.id)}
                    >
                        <Icon className="inspector-icon-md" aria-hidden />
                    </button>
                );
            })}
        </div>
    );
};

const BlenderContextHint = ({ tab }) => {
    const map = {
        render: 'Renderer, preview quality, and realtime visual behavior controls.',
        output: 'Output dimensions, scale percentage, and export framing setup.',
        viewLayer: 'Per-layer visibility and viewport drawing behavior.',
        scene: 'Global scene settings, tree overview, and project-level controls.',
        world: 'Control environment lighting and sun setup for scene lookdev.',
        object: 'Transforms, hierarchy, collections, and visibility for the active object.',
        modifiers: 'Stack non-destructive operations; order matters from top to bottom.',
        constraints: 'Drive object behavior using targets and influence values.',
        objectData: 'Type-specific data like mesh primitives and light source properties.',
        material: 'Assign and tune surface shading, slots, and keyframe-ready properties.',
    };
    return <p className="inspector-context-hint">{map[tab] || ''}</p>;
};

const EasyAssistBar = ({ enabled, onToggle, selectedObj, addObject, setTransformMode, setViewportNavMode }) => {
    const runQuick = (mode) => {
        if (mode === 'booth') {
            addObject({ name: 'Booth Wall', type: 'primitive', geo: 'box', dimensions: [4, 3, 0.2], color: '#e2e8f0' });
            addObject({ name: 'Counter', type: 'primitive', geo: 'box', dimensions: [1.8, 1, 0.6], color: '#cbd5e1', position: [0, 0.5, 1.1] });
            showToast('Quick booth starter added.', 'ok');
            return;
        }
        if (mode === 'stage') {
            addObject({ name: 'Stage Deck', type: 'primitive', geo: 'box', dimensions: [6, 0.4, 3], color: '#1f2937', position: [0, 0.2, 0] });
            addObject({ name: 'Backwall', type: 'primitive', geo: 'box', dimensions: [6, 3, 0.15], color: '#475569', position: [0, 1.7, -1.5] });
            showToast('Quick stage starter added.', 'ok');
            return;
        }
        if (mode === 'focus' && selectedObj?.id) {
            useStore.getState().setSelectedId(selectedObj.id);
            setTransformMode('translate');
            setViewportNavMode('orbit');
            showToast('Focus setup ready: orbit + move tool.', 'info');
        }
    };

    return (
        <div className="inspector-easy-assist">
            <div className="inspector-easy-assist__head">
                <strong>Easy Assist</strong>
                <button type="button" className={`inspector-pill-btn ${enabled ? 'inspector-pill-btn--active' : ''}`} onClick={onToggle}>
                    {enabled ? 'On' : 'Off'}
                </button>
            </div>
            {enabled && (
                <div className="inspector-easy-assist__actions">
                    <button type="button" className="inspector-chip-btn" onClick={() => runQuick('booth')}>Booth starter</button>
                    <button type="button" className="inspector-chip-btn" onClick={() => runQuick('stage')}>Stage starter</button>
                    <button type="button" className="inspector-chip-btn" onClick={() => runQuick('focus')}>Focus current</button>
                </div>
            )}
        </div>
    );
};

const BlenderConstraintsPanel = ({ selectedObj, updateObject }) => {
    const constraints = Array.isArray(selectedObj?.constraints) ? selectedObj.constraints : [];
    const setConstraints = (next) => updateObject(selectedObj.id, { constraints: next }, true);
    const addConstraint = () => setConstraints([
        ...constraints,
        { id: `con_${Date.now()}`, type: 'copy_location', targetId: '', influence: 1 },
    ]);
    return (
        <div className="inspector-stack-gap">
            {constraints.map((con, idx) => (
                <div key={con.id || idx} className="inspector-modifier-card">
                    <div className="inspector-modifier-card__toolbar">
                        <select
                            className="inspector-modifier-card__select"
                            value={con.type || 'copy_location'}
                            onChange={(e) => {
                                const next = constraints.map((c, i) => (i === idx ? { ...c, type: e.target.value } : c));
                                setConstraints(next);
                            }}
                        >
                            <option value="copy_location">Copy Location</option>
                            <option value="copy_rotation">Copy Rotation</option>
                            <option value="copy_scale">Copy Scale</option>
                            <option value="track_to">Track To</option>
                            <option value="limit_distance">Limit Distance</option>
                        </select>
                        <button
                            type="button"
                            className="inspector-modifier-card__remove"
                            onClick={() => setConstraints(constraints.filter((_, i) => i !== idx))}
                        >
                            Remove
                        </button>
                    </div>
                    <select
                        className="inspector-modifier-card__target-select"
                        value={con.targetId || ''}
                        onChange={(e) => {
                            const next = constraints.map((c, i) => (i === idx ? { ...c, targetId: e.target.value } : c));
                            setConstraints(next);
                        }}
                    >
                        <option value="">No target</option>
                        {useStore.getState().objects.filter((o) => o.id !== selectedObj.id).map((o) => (
                            <option key={o.id} value={o.id}>{o.name || o.type}</option>
                        ))}
                    </select>
                    <SliderRow
                        label="Influence"
                        value={Math.round((con.influence ?? 1) * 100)}
                        min={0}
                        max={100}
                        unit="%"
                        onChange={(v) => {
                            const next = constraints.map((c, i) => (i === idx ? { ...c, influence: v / 100 } : c));
                            setConstraints(next);
                        }}
                    />
                </div>
            ))}
            <button type="button" className="inspector-btn inspector-btn--dashed" onClick={addConstraint}>
                <PlusIcon className="inspector-icon-sm" aria-hidden />
                Add constraint
            </button>
        </div>
    );
};

const BlenderCustomPropsPanel = ({ selectedObj, updateObject }) => {
    const rows = Array.isArray(selectedObj?.customProps) ? selectedObj.customProps : [];
    const setRows = (next) => updateObject(selectedObj.id, { customProps: next }, true);
    return (
        <div className="inspector-stack-gap">
            {rows.map((row, idx) => (
                <div key={row.id || idx} className="inspector-customprop-row">
                    <input
                        type="text"
                        className="props-input-field"
                        placeholder="Property"
                        value={row.key || ''}
                        onChange={(e) => {
                            const next = rows.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r));
                            setRows(next);
                        }}
                    />
                    <input
                        type="text"
                        className="props-input-field"
                        placeholder="Value"
                        value={row.value || ''}
                        onChange={(e) => {
                            const next = rows.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r));
                            setRows(next);
                        }}
                    />
                    <button type="button" className="inspector-logo-row__clear" onClick={() => setRows(rows.filter((_, i) => i !== idx))}>
                        Remove
                    </button>
                </div>
            ))}
            <button
                type="button"
                className="inspector-btn inspector-btn--dashed"
                onClick={() => setRows([...(rows || []), { id: `cp_${Date.now()}`, key: '', value: '' }])}
            >
                <PlusIcon className="inspector-icon-sm" aria-hidden />
                Add custom property
            </button>
        </div>
    );
};

const DEFAULT_OPEN_SECTIONS = {
    sceneTree: true,
    transform: true,
    materials: true,
    lighting: false,
    rendering: false,
    branding: false,
    customProps: true,
    viewportDisplay: true,
    dismantling: true,
    modifiers: true,
    viewport: true,
    projectActions: true,
};

export default function PropertiesPanel() {
    const studioRightOpen = useStore((s) => s.studioRightOpen !== false);
    const toggleStudioRightOpen = useStore((s) => s.toggleStudioRightOpen);
    const panelHidden = !studioRightOpen;
    const [rightWidth, setRightWidth] = useState(() => {
        try {
            const raw = parseInt(localStorage.getItem('novira_right_sidebar_width_v1') || '', 10);
            if (Number.isFinite(raw) && raw >= 220 && raw <= 460) return raw;
        } catch {
            /* ignore */
        }
        return 240;
    });
    const resizingRef = React.useRef(false);
    const [openSectionsByTab, setOpenSectionsByTab] = useState({
        item: { ...DEFAULT_OPEN_SECTIONS },
        tool: { ...DEFAULT_OPEN_SECTIONS },
        view: { ...DEFAULT_OPEN_SECTIONS },
        create: { ...DEFAULT_OPEN_SECTIONS },
    });
    const [meshExtrudeStep, setMeshExtrudeStep] = useState(0.08);
    const [inspectorTab, setInspectorTab] = useState('item');
    const [materialBlenderPreviewOpen, setMaterialBlenderPreviewOpen] = useState(true);
    const [materialBlenderSurfaceOpen, setMaterialBlenderSurfaceOpen] = useState(true);
    const [materialPreviewShape, setMaterialPreviewShape] = useState('sphere');
    const [materialListOpen, setMaterialListOpen] = useState(false);
    const [materialListSearch, setMaterialListSearch] = useState('');
    const [itemContextTab, setItemContextTab] = useState('render');
    const [easyAssistEnabled, setEasyAssistEnabled] = useState(true);
    const [outputWidth, setOutputWidth] = useState(1920);
    const [outputHeight, setOutputHeight] = useState(1080);
    const [outputScale, setOutputScale] = useState(100);
    const [renderEngine, setRenderEngine] = useState('EEVEE');
    const [renderSamples, setRenderSamples] = useState(64);
    const [renderUseDenoise, setRenderUseDenoise] = useState(true);
    const [renderViewTransform, setRenderViewTransform] = useState('Filmic');
    const [renderPipelinePreset, setRenderPipelinePreset] = useState('balanced');
    const [renderRayDepth, setRenderRayDepth] = useState(5);
    const [renderBounceBudget, setRenderBounceBudget] = useState(4);
    const [renderDenoiseQuality, setRenderDenoiseQuality] = useState('balanced');
    const [renderOptimizeTarget, setRenderOptimizeTarget] = useState('balanced');
    const [aiMaterialPrompt, setAiMaterialPrompt] = useState('');
    const [aiShotPrompt, setAiShotPrompt] = useState('');
    const [aiRenderNote, setAiRenderNote] = useState('Ready');
    const [directorDurationSec, setDirectorDurationSec] = useState(10);
    const [directorFps, setDirectorFps] = useState(30);
    const [directorShotPlan, setDirectorShotPlan] = useState([]);
    const [directorPreviewIndex, setDirectorPreviewIndex] = useState(0);
    const [directorAutoPreview, setDirectorAutoPreview] = useState(false);
    const [frameStart, setFrameStart] = useState(1);
    const [frameEnd, setFrameEnd] = useState(250);
    const [outputFormat, setOutputFormat] = useState('PNG');
    const [viewLayerCombined, setViewLayerCombined] = useState(true);
    const [viewLayerZ, setViewLayerZ] = useState(false);
    const [viewLayerNormal, setViewLayerNormal] = useState(false);
    const [viewLayerDiffuseColor, setViewLayerDiffuseColor] = useState(false);
    const [viewLayerEmit, setViewLayerEmit] = useState(false);
    const [worldStrength, setWorldStrength] = useState(1);
    const [worldUseVolume, setWorldUseVolume] = useState(false);
    const [worldUseMist, setWorldUseMist] = useState(false);
    const [sceneUseGravity, setSceneUseGravity] = useState(true);
    const [viewLensMm, setViewLensMm] = useState(50);
    const [viewClipStart, setViewClipStart] = useState(0.01);
    const [viewClipEnd, setViewClipEnd] = useState(1000);
    const [viewLockCursor, setViewLockCursor] = useState(false);
    const [sceneUseSimplify, setSceneUseSimplify] = useState(false);
    const [sceneViewportSubdiv, setSceneViewportSubdiv] = useState(2);
    const [sceneRenderSubdiv, setSceneRenderSubdiv] = useState(3);
    const [collections, setCollections] = useState([
        { id: 'col_scene', name: 'Scene Collection', parentId: null, visible: true, holdout: false, indirectOnly: false },
    ]);
    const [activeCollectionId, setActiveCollectionId] = useState('col_scene');
    const [dragCollectionId, setDragCollectionId] = useState(null);
    const [collapsedCollectionIds, setCollapsedCollectionIds] = useState(() => {
        try {
            const raw = localStorage.getItem('novira_collection_tree_collapsed_v1');
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    });
    const [soloCollectionId, setSoloCollectionId] = useState(null);
    const soloHiddenBackupRef = React.useRef(null);
    const [toolTransformOrientation, setToolTransformOrientation] = useState('global');
    const [toolPivotPoint, setToolPivotPoint] = useState('median');

    const openSections = openSectionsByTab[inspectorTab] || DEFAULT_OPEN_SECTIONS;
    const toggleSection = (section) => {
        setOpenSectionsByTab((prev) => {
            const current = prev[inspectorTab] || DEFAULT_OPEN_SECTIONS;
            return {
                ...prev,
                [inspectorTab]: { ...current, [section]: !current[section] },
            };
        });
    };

    const {
        objects, selectedId, setSelectedId, updateObject, removeObject,
        isTransformDragging, liftedObjectId, activeTool, moveDelta, rotationDelta,
        layoutOverlays, updateLayoutOverlay, assembleObject,
        hiddenObjectIds, lockedObjectIds,
        lightingEnabled, setLightingEnabled,
        measurementsEnabled, setMeasurementsEnabled,
        smartZoomEnabled, setSmartZoomEnabled,
        environmentVisible, setEnvironmentVisible,
        layoutEnabled, setLayoutEnabled,
        gridVisible, setGridVisible,
        wireframe, setWireframe,
        viewportNavMode, setViewportNavMode,
        materialPaintMode, setMaterialPaintMode,
        webgpuPathTraceRequested, setWebgpuPathTraceRequested,
        sunMinutesFromMidnight, setSunMinutesFromMidnight,
        sunCloudiness, setSunCloudiness,
        sunLatitude, sunLongitude, setSunGeo,
        meshElementSelection,
        meshDeleteSelectedFaces,
        meshAssignSelectionMaterial,
        meshExtrudeSelectedFace,
        meshAddMaterialSlot,
        meshRemoveMaterialSlot,
        meshSetActiveMaterialSlot,
        meshSetMaterialSlotColor,
        meshAssignSelectionToActiveMaterialSlot,
        meshAssignFaceToMaterialSlot,
        meshReorderMaterialSlot,
        meshRenameMaterialSlot,
        meshSelectFirstFaceForMaterialSlot,
        meshClearFacesUsingMaterialSlot,
        materialLibraryPresets,
        materialEditorCurrentFrame,
        setMaterialEditorFrame,
        addMaterialLibraryPreset,
        removeMaterialLibraryPreset,
        applySceneMaterialToSelection,
        toggleMaterialKeyframeOnSelection,
        projectId,
        designUnits,
        cycleDesignUnits,
        uiSimpleMode,
        transformMode, setTransformMode,
        objectSnapEnabled, toggleObjectSnap,
        spawnAtThreeDCursor, setSpawnAtThreeDCursor,
    } = useStore(
        useShallow((s) => ({
            objects: s.objects,
            selectedId: s.selectedId,
            setSelectedId: s.setSelectedId,
            updateObject: s.updateObject,
            removeObject: s.removeObject,
            isTransformDragging: s.isTransformDragging,
            liftedObjectId: s.liftedObjectId,
            activeTool: s.activeTool,
            moveDelta: s.moveDelta,
            rotationDelta: s.rotationDelta,
            layoutOverlays: s.layoutOverlays,
            updateLayoutOverlay: s.updateLayoutOverlay,
            assembleObject: s.assembleObject,
            hiddenObjectIds: s.hiddenObjectIds,
            lockedObjectIds: s.lockedObjectIds,
            lightingEnabled: s.lightingEnabled,
            setLightingEnabled: s.setLightingEnabled,
            measurementsEnabled: s.measurementsEnabled,
            setMeasurementsEnabled: s.setMeasurementsEnabled,
            smartZoomEnabled: s.smartZoomEnabled,
            setSmartZoomEnabled: s.setSmartZoomEnabled,
            environmentVisible: s.environmentVisible,
            setEnvironmentVisible: s.setEnvironmentVisible,
            layoutEnabled: s.layoutEnabled,
            setLayoutEnabled: s.setLayoutEnabled,
            gridVisible: s.gridVisible,
            setGridVisible: s.setGridVisible,
            wireframe: s.wireframe,
            setWireframe: s.setWireframe,
            viewportNavMode: s.viewportNavMode,
            setViewportNavMode: s.setViewportNavMode,
            materialPaintMode: s.materialPaintMode,
            setMaterialPaintMode: s.setMaterialPaintMode,
            webgpuPathTraceRequested: s.webgpuPathTraceRequested,
            setWebgpuPathTraceRequested: s.setWebgpuPathTraceRequested,
            sunMinutesFromMidnight: s.sunMinutesFromMidnight,
            setSunMinutesFromMidnight: s.setSunMinutesFromMidnight,
            sunCloudiness: s.sunCloudiness,
            setSunCloudiness: s.setSunCloudiness,
            sunLatitude: s.sunLatitude,
            sunLongitude: s.sunLongitude,
            setSunGeo: s.setSunGeo,
            meshElementSelection: s.meshElementSelection,
            meshDeleteSelectedFaces: s.meshDeleteSelectedFaces,
            meshAssignSelectionMaterial: s.meshAssignSelectionMaterial,
            meshExtrudeSelectedFace: s.meshExtrudeSelectedFace,
            meshAddMaterialSlot: s.meshAddMaterialSlot,
            meshRemoveMaterialSlot: s.meshRemoveMaterialSlot,
            meshSetActiveMaterialSlot: s.meshSetActiveMaterialSlot,
            meshSetMaterialSlotColor: s.meshSetMaterialSlotColor,
            meshAssignSelectionToActiveMaterialSlot: s.meshAssignSelectionToActiveMaterialSlot,
            meshAssignFaceToMaterialSlot: s.meshAssignFaceToMaterialSlot,
            meshReorderMaterialSlot: s.meshReorderMaterialSlot,
            meshRenameMaterialSlot: s.meshRenameMaterialSlot,
            meshSelectFirstFaceForMaterialSlot: s.meshSelectFirstFaceForMaterialSlot,
            meshClearFacesUsingMaterialSlot: s.meshClearFacesUsingMaterialSlot,
            materialLibraryPresets: s.materialLibraryPresets,
            materialEditorCurrentFrame: s.materialEditorCurrentFrame,
            setMaterialEditorFrame: s.setMaterialEditorFrame,
            addMaterialLibraryPreset: s.addMaterialLibraryPreset,
            removeMaterialLibraryPreset: s.removeMaterialLibraryPreset,
            applySceneMaterialToSelection: s.applySceneMaterialToSelection,
            toggleMaterialKeyframeOnSelection: s.toggleMaterialKeyframeOnSelection,
            projectId: s.projectId,
            designUnits: s.designUnits,
            cycleDesignUnits: s.cycleDesignUnits,
            uiSimpleMode: s.uiSimpleMode,
            transformMode: s.transformMode,
            setTransformMode: s.setTransformMode,
            objectSnapEnabled: s.objectSnapEnabled,
            toggleObjectSnap: s.toggleObjectSnap,
            spawnAtThreeDCursor: s.spawnAtThreeDCursor,
            setSpawnAtThreeDCursor: s.setSpawnAtThreeDCursor,
        }))
    );

    const mergedMaterialBrowse = useMemo(
        () => mergeMaterialLists(collectSceneMaterials(objects), materialLibraryPresets),
        [objects, materialLibraryPresets]
    );
    const filteredMaterialBrowse = useMemo(
        () => filterMaterialList(mergedMaterialBrowse, materialListSearch),
        [mergedMaterialBrowse, materialListSearch]
    );

    const selectedObj = objects.find(o => o.id === selectedId);
    const faceEditReady = !!selectedObj
        && activeTool === 'parts'
        && ['primitive', 'stl'].includes(selectedObj.type)
        && meshElementSelection?.type === 'face'
        && meshElementSelection?.objectId === selectedObj.id
        && Number.isFinite(meshElementSelection?.faceIndex);
    const isMeshEditObject = !!selectedObj && ['primitive', 'stl'].includes(selectedObj.type);
    const meshEditState = selectedObj?.meshEditState || {};
    const materialSlots = isMeshEditObject
        ? (Array.isArray(meshEditState.materialSlots) && meshEditState.materialSlots.length
            ? meshEditState.materialSlots
            : [{ id: 'slot0', name: 'Material', color: selectedObj.color || '#e2e8f0' }])
        : [];
    const activeMaterialSlotId = meshEditState.activeMaterialSlotId || materialSlots[0]?.id || null;
    const slotsArePersisted = Array.isArray(meshEditState.materialSlots) && meshEditState.materialSlots.length > 0;
    const activeSlotForPreview = materialSlots.find((s) => s.id === activeMaterialSlotId) || materialSlots[0];
    const selectedLayout = layoutOverlays ? layoutOverlays.find(ly => ly.id === selectedId) : null;
    const sceneEstimate = useMemo(() => estimateSceneCost(objects), [objects]);
    const activeCollection = collections.find((c) => c.id === activeCollectionId) || collections[0];
    const activeItemContextTab = uiSimpleMode ? 'object' : itemContextTab;
    const renderReadinessScore = useMemo(() => {
        let score = 42;
        score += Math.min(30, Math.round((renderSamples / 512) * 30));
        if (renderUseDenoise) score += 10;
        if (environmentVisible) score += 8;
        if (lightingEnabled) score += 8;
        if (webgpuPathTraceRequested) score += 6;
        if (directorShotPlan.length > 0) score += 6;
        return Math.max(0, Math.min(100, score));
    }, [renderSamples, renderUseDenoise, environmentVisible, lightingEnabled, webgpuPathTraceRequested, directorShotPlan.length]);
    const renderReadinessLabel = renderReadinessScore >= 85 ? 'Production Ready'
        : renderReadinessScore >= 65 ? 'Preview Ready'
            : 'Setup Needed';
    const renderOptimizeHint = renderOptimizeTarget === 'fast'
        ? 'Fast preview for iteration and layout checks.'
        : renderOptimizeTarget === 'cinematic'
            ? 'Best visual quality for final sequence output.'
            : 'Balanced speed and quality for most scenes.';
    const openCmdPalette = () => useStore.getState().setShowCommandPalette(true);
    const openExportPanel = () => document.dispatchEvent(new CustomEvent('novira:open-export-panel'));
    const applyDisplayMode = (mode) => {
        if (mode === 'solid') {
            setWireframe(false);
            setMaterialPaintMode(false);
            setLightingEnabled(true);
            setEnvironmentVisible(false);
            setWebgpuPathTraceRequested(false);
            return;
        }
        if (mode === 'edit') {
            setWireframe(true);
            setMaterialPaintMode(true);
            setLightingEnabled(true);
            setEnvironmentVisible(false);
            setWebgpuPathTraceRequested(false);
            return;
        }
        setWireframe(false);
        setMaterialPaintMode(false);
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setWebgpuPathTraceRequested(false);
    };
    const applyRenderPipelinePreset = (presetKey) => {
        const preset = RENDER_PIPELINE_PRESETS[presetKey];
        if (!preset) return;
        setRenderPipelinePreset(presetKey);
        setRenderSamples(preset.samples);
        setRenderRayDepth(preset.rayDepth);
        setRenderBounceBudget(preset.bounceBudget);
        setRenderUseDenoise(Boolean(preset.denoise));
        setRenderDenoiseQuality(preset.denoiseQuality);
        setWebgpuPathTraceRequested(Boolean(preset.useWebgpu));
        setSmartZoomEnabled(Boolean(preset.smartZoom));
        setRenderViewTransform(preset.viewTransform);
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setAiRenderNote(`Pipeline preset: ${preset.label} (${preset.samples} samples, depth ${preset.rayDepth})`);
        showToast(`Render preset "${preset.label}" applied.`, 'ok');
    };
    const autoOptimizeRender = () => {
        if (renderOptimizeTarget === 'fast') {
            applyRenderPipelinePreset('draft');
            setRenderEngine('EEVEE');
            setRenderDenoiseQuality('fast');
            setRenderUseDenoise(true);
            setAiRenderNote('Auto Optimize: Fast preview profile applied.');
            showToast('Optimized for fast preview.', 'ok');
            return;
        }
        if (renderOptimizeTarget === 'cinematic') {
            applyRenderPipelinePreset('cinematic');
            setRenderEngine('Cycles');
            setRenderDenoiseQuality('high');
            setRenderUseDenoise(true);
            setAiRenderNote('Auto Optimize: Final cinematic profile applied.');
            showToast('Optimized for cinematic output.', 'ok');
            return;
        }
        applyRenderPipelinePreset('balanced');
        setRenderEngine('EEVEE');
        setRenderDenoiseQuality('balanced');
        setRenderUseDenoise(true);
        setAiRenderNote('Auto Optimize: Balanced profile applied.');
        showToast('Optimized for balanced quality.', 'ok');
    };
    const applyAIMaterialPrompt = () => {
        if (!selectedObj) {
            showToast('Select an object first.', 'warn');
            return;
        }
        const mat = deriveMaterialFromPrompt(aiMaterialPrompt);
        updateObject(selectedObj.id, {
            color: mat.color,
            roughness: mat.roughness,
            metalness: mat.metalness,
            emissive: mat.emissive,
            emissiveIntensity: mat.emissiveIntensity,
            opacity: mat.opacity,
        }, true);
        setAiRenderNote(`Material applied: ${aiMaterialPrompt || 'default neutral surface'}`);
        showToast('Applied neural material suggestion.', 'ok');
    };
    const runAIDirectorShot = () => {
        const st = useStore.getState();
        const prompt = String(aiShotPrompt || '').toLowerCase();
        const center = selectedObj?.position || [0, 1.2, 0];
        let position = [center[0] + 8, center[1] + 5, center[2] + 8];
        let nav = 'orbit';
        if (prompt.includes('crane')) {
            position = [center[0] + 6, center[1] + 11, center[2] + 7];
            nav = 'orbit';
        } else if (prompt.includes('dolly')) {
            position = [center[0], center[1] + 2.2, center[2] + 11];
            nav = 'orbit';
        } else if (prompt.includes('fly') || prompt.includes('fly-through') || prompt.includes('flythrough')) {
            position = [center[0] + 12, center[1] + 2.5, center[2] + 1.5];
            nav = 'walk';
        }
        st.setMode?.('preview');
        st.setCameraFocus?.(center, position);
        st.setViewportNavMode?.(nav);
        if (prompt.includes('golden')) st.setEnvPreset?.('sunset');
        if (prompt.includes('night')) st.setEnvPreset?.('city');
        setEnvironmentVisible(true);
        setLightingEnabled(true);
        setSmartZoomEnabled(true);
        setAiRenderNote(`Shot applied: ${aiShotPrompt || 'director auto framing'}`);
        showToast('Director shot solved and framed.', 'ok');
    };
    const bakeDirectorTimeline = () => {
        const prompt = String(aiShotPrompt || '').toLowerCase();
        const center = selectedObj?.position || [0, 1.2, 0];
        const moodEnvPreset = prompt.includes('night') ? 'city' : (prompt.includes('golden') ? 'sunset' : 'studio');
        const shotTokens = [];
        if (prompt.includes('establish')) shotTokens.push('establish');
        if (prompt.includes('crane')) shotTokens.push('crane');
        if (prompt.includes('dolly')) shotTokens.push('dolly');
        if (prompt.includes('fly') || prompt.includes('fly-through') || prompt.includes('flythrough')) shotTokens.push('fly');
        if (prompt.includes('orbit') || prompt.includes('360')) shotTokens.push('orbit');
        if (prompt.includes('close') || prompt.includes('detail')) shotTokens.push('close');
        if (!shotTokens.length) shotTokens.push('establish', 'orbit', 'close');
        const durationFrames = Math.max(1, Math.round(Number(directorDurationSec || 10) * Number(directorFps || 30)));
        const totalShots = shotTokens.length;
        const framesPerShot = Math.max(1, Math.floor(durationFrames / totalShots));
        const plan = shotTokens.map((token, idx) => {
            const start = idx * framesPerShot + 1;
            const end = idx === totalShots - 1 ? durationFrames : ((idx + 1) * framesPerShot);
            const base = {
                target: [...center],
                position: [center[0] + 8, center[1] + 4, center[2] + 8],
                label: `Shot ${idx + 1}`,
                navMode: 'orbit',
                envPreset: moodEnvPreset,
            };
            if (token === 'establish') {
                base.label = 'Establish';
                base.position = [center[0] + 11, center[1] + 7, center[2] + 11];
            } else if (token === 'crane') {
                base.label = 'Crane Rise';
                base.position = [center[0] + 7, center[1] + 11, center[2] + 6];
            } else if (token === 'dolly') {
                base.label = 'Dolly Push';
                base.position = [center[0], center[1] + 2.2, center[2] + 12];
            } else if (token === 'orbit') {
                base.label = 'Orbit Arc';
                base.position = [center[0] - 9, center[1] + 4, center[2] + 3];
            } else if (token === 'fly') {
                base.label = 'Fly Through';
                base.position = [center[0] + 12, center[1] + 2.5, center[2] + 1.5];
                base.navMode = 'walk';
            } else if (token === 'close') {
                base.label = 'Detail Close-up';
                base.position = [center[0] + 2.1, center[1] + 1.8, center[2] + 2.6];
            }
            return { ...base, start, end, name: `${base.label} (${start}-${end})` };
        });
        setFrameStart(1);
        setFrameEnd(durationFrames);
        setDirectorShotPlan(plan);
        setAiRenderNote(`Director timeline baked: ${plan.length} shots, ${durationFrames} frames.`);
        showToast(`Baked ${plan.length} shots to timeline range.`, 'ok');
    };
    const applyDirectorShotToViewport = (shot) => {
        if (!shot) return;
        const st = useStore.getState();
        st.setMode?.('preview');
        st.setCameraFocus?.(shot.target, shot.position);
        st.setViewportNavMode?.(shot.navMode || 'orbit');
        st.setEnvPreset?.(shot.envPreset || 'studio');
        setLightingEnabled(true);
        setEnvironmentVisible(true);
        setFrameStart(Math.max(1, Number(shot.start) || 1));
        setFrameEnd(Math.max(Number(shot.start) || 1, Number(shot.end) || Number(shot.start) || 1));
        setAiRenderNote(`Applied shot "${shot.label}" with export range ${shot.start}-${shot.end}.`);
    };
    const applyDirectorSequenceDefaults = () => {
        if (!directorShotPlan.length) {
            showToast('Bake timeline first to apply sequence defaults.', 'warn');
            return;
        }
        applyDirectorShotToViewport(directorShotPlan[0]);
        showToast('Sequence defaults applied. Opening export panel…', 'ok');
        openExportPanel();
    };
    const queueDirectorShotsForExport = () => {
        if (!directorShotPlan.length) {
            showToast('Bake timeline first to queue exports.', 'warn');
            return;
        }
        document.dispatchEvent(new CustomEvent('novira:open-export-panel', {
            detail: {
                directorQueue: directorShotPlan.map((shot, idx) => ({
                    id: `shot-${idx + 1}`,
                    name: shot.label,
                    frameStart: shot.start,
                    frameEnd: shot.end,
                    cameraTarget: shot.target,
                    cameraPosition: shot.position,
                    navMode: shot.navMode || 'orbit',
                    envPreset: shot.envPreset || 'studio',
                })),
                directorMeta: { prompt: aiShotPrompt, fps: directorFps, durationSec: directorDurationSec },
            },
        }));
        showToast(`Queued ${directorShotPlan.length} shots for export.`, 'ok');
    };
    const saveDirectorCameras = () => {
        if (!directorShotPlan.length) {
            showToast('Bake timeline first to generate cameras.', 'warn');
            return;
        }
        document.dispatchEvent(new CustomEvent('novira:save-scene-camera-batch', {
            detail: {
                cameras: directorShotPlan.map((s) => ({
                    name: `Director - ${s.label}`,
                    position: s.position,
                    target: s.target,
                })),
            },
        }));
    };
    const objectsInActiveCollection = useMemo(() => {
        if (!activeCollection) return [];
        return objects.filter((o) => (o.collectionName || 'Scene Collection') === activeCollection.name);
    }, [objects, activeCollection]);
    const collectionObjectCounts = useMemo(() => {
        const counts = {};
        objects.forEach((o) => {
            const key = o.collectionName || 'Scene Collection';
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [objects]);
    const collectionRows = useMemo(() => {
        const byParent = new Map();
        collections.forEach((col) => {
            const key = col.parentId || '__root__';
            if (!byParent.has(key)) byParent.set(key, []);
            byParent.get(key).push(col);
        });
        const rows = [];
        const walk = (parentId, depth) => {
            const key = parentId || '__root__';
            const kids = byParent.get(key) || [];
            kids.forEach((child) => {
                const hasChildren = (byParent.get(child.id) || []).length > 0;
                const isCollapsed = collapsedCollectionIds.includes(child.id);
                rows.push({ collection: child, depth, hasChildren, isCollapsed });
                if (!isCollapsed) walk(child.id, depth + 1);
            });
        };
        walk(null, 0);
        return rows;
    }, [collections, collapsedCollectionIds]);

    React.useEffect(() => {
        try {
            localStorage.setItem('novira_right_sidebar_width_v1', String(rightWidth));
        } catch {
            /* ignore */
        }
    }, [rightWidth]);

    React.useEffect(() => {
        const onMove = (e) => {
            if (!resizingRef.current) return;
            const vw = window.innerWidth || 1280;
            const next = Math.max(220, Math.min(460, vw - e.clientX));
            setRightWidth(next);
        };
        const onUp = () => {
            if (!resizingRef.current) return;
            resizingRef.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, []);

    React.useEffect(() => {
        const onApplyLayout = () => {
            try {
                const raw = parseInt(localStorage.getItem('novira_right_sidebar_width_v1') || '', 10);
                if (Number.isFinite(raw) && raw >= 220 && raw <= 460) setRightWidth(raw);
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('novira:workspace-layout-applied', onApplyLayout);
        return () => window.removeEventListener('novira:workspace-layout-applied', onApplyLayout);
    }, []);

    React.useEffect(() => {
        const onOpenViewportControls = () => {
            useStore.getState().setStudioRightOpen(true);
            setInspectorTab('view');
            setOpenSectionsByTab((prev) => ({
                ...prev,
                view: { ...(prev.view || DEFAULT_OPEN_SECTIONS), viewport: true },
            }));
        };
        window.addEventListener('novira:open-viewport-controls', onOpenViewportControls);
        return () => window.removeEventListener('novira:open-viewport-controls', onOpenViewportControls);
    }, []);

    React.useEffect(() => {
        try {
            const rawSections = localStorage.getItem('novira_inspector_open_sections_by_tab_v2');
            if (rawSections) {
                const parsed = JSON.parse(rawSections);
                if (parsed && typeof parsed === 'object') {
                    const next = {
                        item: { ...DEFAULT_OPEN_SECTIONS, ...(parsed.item || {}) },
                        tool: { ...DEFAULT_OPEN_SECTIONS, ...(parsed.tool || {}) },
                        view: { ...DEFAULT_OPEN_SECTIONS, ...(parsed.view || {}) },
                        create: { ...DEFAULT_OPEN_SECTIONS, ...(parsed.create || {}) },
                    };
                    setOpenSectionsByTab(next);
                }
            }
            const rawContext = localStorage.getItem('novira_inspector_item_context_v1');
            if (rawContext) {
                const allowed = new Set(['render', 'output', 'viewLayer', 'scene', 'world', 'object', 'modifiers', 'constraints', 'objectData', 'material']);
                setItemContextTab(allowed.has(rawContext) ? rawContext : 'render');
            }
            const rawEasy = localStorage.getItem('novira_inspector_easy_assist_v1');
            if (rawEasy === '0') setEasyAssistEnabled(false);
        } catch {
            /* ignore */
        }
    }, []);

    React.useEffect(() => {
        try {
            localStorage.setItem('novira_inspector_open_sections_by_tab_v2', JSON.stringify(openSectionsByTab));
        } catch {
            /* ignore */
        }
    }, [openSectionsByTab]);

    React.useEffect(() => {
        try {
            localStorage.setItem('novira_inspector_item_context_v1', itemContextTab);
        } catch {
            /* ignore */
        }
    }, [itemContextTab]);

    React.useEffect(() => {
        if (uiSimpleMode && itemContextTab !== 'object') {
            setItemContextTab('object');
        }
    }, [uiSimpleMode, itemContextTab]);

    React.useEffect(() => {
        if (!selectedObj && inspectorTab === 'item' && itemContextTab !== 'object') {
            setItemContextTab('object');
        }
    }, [selectedObj, inspectorTab, itemContextTab]);

    React.useEffect(() => {
        try {
            localStorage.setItem('novira_inspector_easy_assist_v1', easyAssistEnabled ? '1' : '0');
        } catch {
            /* ignore */
        }
    }, [easyAssistEnabled]);

    React.useEffect(() => {
        try {
            localStorage.setItem('novira_collection_tree_collapsed_v1', JSON.stringify(collapsedCollectionIds));
        } catch {
            /* ignore */
        }
    }, [collapsedCollectionIds]);

    React.useEffect(() => {
        const existingIds = new Set(collections.map((c) => c.id));
        setCollapsedCollectionIds((prev) => prev.filter((id) => existingIds.has(id)));
    }, [collections]);

    React.useEffect(() => {
        if (!soloCollectionId) {
            if (soloHiddenBackupRef.current) {
                useStore.setState({
                    hiddenObjectIds: [...soloHiddenBackupRef.current],
                    isolateActive: false,
                    isolateHiddenBackup: null,
                });
                soloHiddenBackupRef.current = null;
            }
            return;
        }
        const byId = new Map(collections.map((c) => [c.id, c]));
        const names = new Set();
        const walk = (id) => {
            const row = byId.get(id);
            if (!row) return;
            names.add(row.name);
            collections.filter((c) => c.parentId === id).forEach((child) => walk(child.id));
        };
        walk(soloCollectionId);
        const st = useStore.getState();
        if (!soloHiddenBackupRef.current) soloHiddenBackupRef.current = [...(st.hiddenObjectIds || [])];
        const hide = st.objects
            .filter((o) => o.type !== 'ground' && !names.has(o.collectionName || 'Scene Collection'))
            .map((o) => o.id);
        useStore.setState({
            hiddenObjectIds: hide,
            isolateActive: false,
            isolateHiddenBackup: null,
        });
    }, [soloCollectionId, collections]);

    const renderSceneTree = (parentId = null, depth = 1) => {
        const filtered = objects.filter(obj => obj.parentId === parentId && obj.type !== 'ground');
        const layouts = parentId === null ? useStore.getState().layoutOverlays : [];

        return [
            ...layouts.map(ly => (
                <TreeNode
                    key={ly.id}
                    label={ly.name || 'Layout Overlay'}
                    icon={Bars3CenterLeftIcon}
                    depth={depth}
                    isSelected={selectedId === ly.id}
                    onClick={() => setSelectedId(ly.id)}
                    actions={
                        <button className="scene-action-btn scene-action-delete" onClick={(e) => { e.stopPropagation(); useStore.getState().removeLayoutOverlay(ly.id); }}>
                            <TrashIcon className="scene-action-icon" />
                        </button>
                    }
                />
            )),
            ...filtered.map((obj) => {
                const isHidden = hiddenObjectIds.includes(obj.id);
                const isLocked = lockedObjectIds.includes(obj.id) || obj.locked;
                const typeIcon = obj.type === 'light' ? LightBulbIcon
                    : obj.type === 'gltf' || obj.type === 'gltf-part' || obj.type === 'stl' || obj.isDismantled ? CubeIcon
                    : obj.type === 'group' ? FolderIcon
                    : CubeIcon;

                return (
                    <TreeNode
                        key={obj.id}
                        label={obj.name || obj.type || 'Object'}
                        icon={typeIcon}
                        depth={depth}
                        isSelected={selectedId === obj.id}
                        onClick={() => {
                            if (isLocked) return;
                            setSelectedId(obj.id);
                        }}
                        actions={
                            <div className="scene-action-row">
                                <button className="scene-action-btn" title={isHidden ? 'Show' : 'Hide'} onClick={(e) => { e.stopPropagation(); useStore.getState().toggleObjectVisibility(obj.id); }}>
                                    {isHidden ? <EyeSlashIcon className="scene-action-icon scene-action-icon--hidden" /> : <EyeIcon className="scene-action-icon scene-action-icon--idle" />}
                                </button>
                                <button className="scene-action-btn" title={isLocked ? 'Unlock' : 'Lock'} onClick={(e) => { e.stopPropagation(); useStore.getState().toggleObjectLock(obj.id); }}>
                                    {isLocked ? <LockClosedIcon className="scene-action-icon scene-action-icon--locked" /> : <LockOpenIcon className="scene-action-icon scene-action-icon--idle" />}
                                </button>
                                {obj.isDismantled && (
                                    <button className="scene-action-btn" title="Assemble Parts" onClick={(e) => { e.stopPropagation(); assembleObject(obj.id); }}>
                                        <ArrowPathIcon className="scene-action-icon scene-action-icon--assemble" />
                                    </button>
                                )}
                                <button className="scene-action-btn scene-action-delete" onClick={(e) => { e.stopPropagation(); removeObject(obj.id); }}>
                                    <TrashIcon className="scene-action-icon" />
                                </button>
                            </div>
                        }
                    >
                        {renderSceneTree(obj.id, depth + 1)}
                    </TreeNode>
                );
            })
        ];
    };

    return (
        <div className="props-sidebar-wrap" style={{ position: 'relative', height: '100%', display: 'flex', zIndex: 20 }}>
            <button
                type="button"
                className="props-sidebar-collapse-btn"
                onClick={() => toggleStudioRightOpen()}
                title={panelHidden ? 'Show inspector' : 'Hide inspector'}
            >
                {panelHidden ? <ChevronLeftIcon className="inspector-icon-sm" /> : <ChevronRightIcon className="inspector-icon-sm" />}
            </button>

            <div
                className="pro-properties props-sidebar props-sidebar--blender-root"
                style={{
                    width: panelHidden ? '0px' : `${rightWidth}px`,
                    minWidth: panelHidden ? '0px' : `${rightWidth}px`,
                    transition: 'width 0.25s cubic-bezier(0.165, 0.84, 0.44, 1), min-width 0.25s cubic-bezier(0.165, 0.84, 0.44, 1)',
                    overflow: 'hidden',
                    borderLeft: panelHidden ? 'none' : undefined,
                }}
            >
                {!panelHidden && (
                    <div
                        className="props-resize-handle"
                        onPointerDown={(e) => {
                            e.preventDefault();
                            resizingRef.current = true;
                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                        }}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            resizingRef.current = true;
                            document.body.style.cursor = 'col-resize';
                            document.body.style.userSelect = 'none';
                        }}
                        style={{
                            position: 'absolute',
                            left: '-3px',
                            top: 0,
                            bottom: 0,
                            width: 6,
                            cursor: 'col-resize',
                            zIndex: 31,
                        }}
                        title="Resize inspector"
                    />
                )}
                <div style={{ width: `${rightWidth}px`, height: '100%', opacity: panelHidden ? 0 : 1, transition: 'opacity 0.2s ease' }}>
                    <div className="props-scrollable inspector-panel props-sidebar--blender" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <div className="blender-npanel-shell">
                            <div className="blender-npanel-shell__content">

                        {inspectorTab === 'view' && <PropertySection
                            title="Active Scene"
                            icon={FolderIcon}
                            colorClass="color-branding"
                            isOpen={openSections.sceneTree}
                            onToggle={() => toggleSection('sceneTree')}
                        >
                            <div className="scene-tree">
                                <TreeNode label="Root Scene" icon={FolderIcon} defaultOpen={true} depth={0}>
                                    {objects.length === 0 ? (
                                        <div className="inspector-tree-empty">
                                            <span className="inspector-tree-empty__text">No objects in scene</span>
                                        </div>
                                    ) : (
                                        renderSceneTree(null, 1)
                                    )}
                                </TreeNode>
                            </div>
                        </PropertySection>}

                        {(inspectorTab === 'item' || inspectorTab === 'tool' || inspectorTab === 'create') && <div className="inspector-panel__heading">
                            <span className="inspector-panel__heading-label">Inspector</span>
                            {(selectedObj || selectedLayout) && (
                                <button
                                    type="button"
                                    className="inspector-panel__heading-delete"
                                    title="Remove selection"
                                    onClick={() => selectedObj ? removeObject(selectedObj.id) : useStore.getState().removeLayoutOverlay(selectedLayout.id)}
                                >
                                    <TrashIcon className="inspector-icon-md" aria-hidden />
                                </button>
                            )}
                        </div>}

                        {(inspectorTab === 'item' || inspectorTab === 'tool' || inspectorTab === 'create') && <div className="inspector-content-pad-bottom">
                            {(inspectorTab === 'tool' || inspectorTab === 'create') && (
                                <EasyAssistBar
                                    enabled={easyAssistEnabled}
                                    onToggle={() => setEasyAssistEnabled((v) => !v)}
                                    selectedObj={selectedObj}
                                    addObject={useStore.getState().addObject}
                                    setTransformMode={useStore.getState().setTransformMode}
                                    setViewportNavMode={setViewportNavMode}
                                />
                            )}
                            {inspectorTab === 'item' && selectedObj && !uiSimpleMode && (
                                <div className="inspector-context-shell">
                                    <BlenderItemContextIconRail active={activeItemContextTab} onChange={setItemContextTab} />
                                    <div className="inspector-context-shell__main">
                                    <BlenderItemContextTabs active={activeItemContextTab} onChange={setItemContextTab} />
                                    {easyAssistEnabled && <BlenderContextHint tab={activeItemContextTab} />}
                                    </div>
                                </div>
                            )}
                            {!selectedObj && !selectedLayout ? (
                                <div className="inspector-empty-card studio-inspector-empty-library">
                                    <div className="inspector-empty-card__title">Nothing selected</div>
                                    <p className="inspector-empty-card__text">
                                        Open the catalog or 3D library, drag a model into the viewport, or use the scene tree above.
                                    </p>
                                    <div className="inspector-empty-card__actions">
                                        <button
                                            type="button"
                                            className="inspector-chip-btn inspector-chip-btn--accent"
                                            onClick={() => document.dispatchEvent(new CustomEvent('novira:toggle-catalog'))}
                                        >
                                            Toggle catalog
                                        </button>
                                        <button
                                            type="button"
                                            className="inspector-chip-btn"
                                            onClick={() => useStore.getState().openAssetLibrary({ expandSidebar: true })}
                                        >
                                            3D library
                                        </button>
                                        <button
                                            type="button"
                                            className="inspector-chip-btn"
                                            onClick={() => useStore.getState().setStudioViewLayout('split')}
                                        >
                                            Split 2D + 3D
                                        </button>
                                    </div>
                                </div>
                            ) : selectedLayout ? (
                                <>
                                    <div className="inspector-target-bar inspector-target-bar--layout">
                                        <Bars3CenterLeftIcon className="inspector-target-bar__icon" aria-hidden />
                                        <span className="inspector-target-bar__name" title={selectedLayout.name}>
                                            {selectedLayout.name}
                                        </span>
                                        <span className="inspector-target-bar__type">layout</span>
                                    </div>

                                    <div className="props-card inspector-nested-card">
                                        <GroupTitle title="Layout layer" />
                                        <SliderRow
                                            label="Opacity"
                                            value={Math.round(selectedLayout.opacity * 100)}
                                            min={0} max={100} unit="%"
                                            onChange={(v) => updateLayoutOverlay(selectedLayout.id, { opacity: v/100 })}
                                        />

                                        <div className="inspector-field-label">Scale</div>
                                        <div className="inspector-vector-row inspector-vector-row--tight">
                                            {['W', 'H'].map((ax, idx) => (
                                                <div key={ax} className={`props-input-group inspector-vector-cell inspector-vector-cell--${idx === 0 ? 'x' : 'y'}`}>
                                                    <span className={`props-input-label axis-${idx === 0 ? 'x' : 'y'}`}>{ax}</span>
                                                    <input
                                                        type="number"
                                                        step={0.5}
                                                        value={selectedLayout.scale[idx]}
                                                        onChange={(e) => {
                                                            const next = [...selectedLayout.scale];
                                                            next[idx] = parseFloat(e.target.value) || 1;
                                                            updateLayoutOverlay(selectedLayout.id, { scale: next });
                                                        }}
                                                        className="props-input-field"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="inspector-target-bar">
                                        <LightBulbIcon className="inspector-target-bar__icon" aria-hidden />
                                        <span className="inspector-target-bar__name" title={selectedObj.name}>
                                            {selectedObj.name}
                                        </span>
                                        <span className="inspector-target-bar__type">{selectedObj.type}</span>
                                    </div>
                                    {(() => {
                                        const isChild = !!selectedObj.parentId;
                                        const parentObj2 = isChild ? objects.find(o => o.id === selectedObj.parentId) : null;
                                        const myChildren = objects.filter(o => o.parentId === selectedObj.id);
                                        const isParent = myChildren.length > 0;
                                        if (!isChild && !isParent) return null;

                                        return (
                                            <div className="inspector-callout inspector-callout--link">
                                                <div className="inspector-callout__title">Hierarchy</div>

                                                {isChild && parentObj2 && (
                                                    <div className="inspector-callout__line">
                                                        <span className="inspector-callout__muted">Child of</span>
                                                        <strong className="inspector-callout__strong">{parentObj2.name || parentObj2.type}</strong>
                                                    </div>
                                                )}
                                                {isParent && (
                                                    <div className="inspector-callout__line">
                                                        <span className="inspector-callout__muted">Parent of</span>
                                                        <strong className="inspector-callout__strong">{myChildren.map(c => c.name || c.type).join(', ')}</strong>
                                                    </div>
                                                )}

                                                <button
                                                    type="button"
                                                    className="inspector-callout__break"
                                                    onClick={() => useStore.getState().breakParent(selectedObj.id)}
                                                >
                                                    Break links
                                                </button>
                                            </div>
                                        );
                                    })()}

                                    {selectedObj.type === 'primitive' && (
                                        <div className="props-card inspector-nested-card">
                                            <GroupTitle title="Geometry" />
                                            <SliderRow label="Width" value={Math.round(selectedObj.dimensions[0]*10)/10} min={0.1} max={10} step={0.1} unit="m" onChange={(v) => { const d = [...selectedObj.dimensions]; d[0] = v; updateObject(selectedObj.id, { dimensions: d }); }} />
                                            {['box', 'cylinder', 'cone', 'plane'].includes(selectedObj.geo) && (
                                                <SliderRow label="Height" value={Math.round(selectedObj.dimensions[1]*10)/10} min={0.1} max={10} step={0.1} unit="m" onChange={(v) => { const d = [...selectedObj.dimensions]; d[1] = v; updateObject(selectedObj.id, { dimensions: d }); }} />
                                            )}
                                            {['box', 'plane'].includes(selectedObj.geo) && (
                                                <SliderRow label="Depth" value={Math.round(selectedObj.dimensions[2]*10)/10} min={0.1} max={10} step={0.1} unit="m" onChange={(v) => { const d = [...selectedObj.dimensions]; d[2] = v; updateObject(selectedObj.id, { dimensions: d }); }} />
                                            )}
                                            {['sphere', 'cylinder', 'cone', 'torus'].includes(selectedObj.geo) && (
                                                <SliderRow label="Radial Segments" value={selectedObj.radialSegments || 32} min={3} max={64} step={1} onChange={(v) => updateObject(selectedObj.id, { radialSegments: Math.round(v) })} unit="" />
                                            )}
                                            {['box', 'plane', 'sphere'].includes(selectedObj.geo) && (
                                                <SliderRow label="Width/Height Segments" value={selectedObj.widthSegments || (selectedObj.geo === 'sphere' ? 16 : 1)} min={1} max={32} step={1} onChange={(v) => updateObject(selectedObj.id, { widthSegments: Math.round(v) })} unit="" />
                                            )}
                                            {selectedObj.geo === 'torus' && (
                                                <SliderRow label="Tube Radius" value={Math.round((selectedObj.tubeRadius || (selectedObj.dimensions[0] / 4))*100)/100} min={0.05} max={selectedObj.dimensions[0]/1.5} step={0.01} onChange={(v) => updateObject(selectedObj.id, { tubeRadius: v })} unit="m" />
                                            )}
                                        </div>
                                    )}

                                    {(inspectorTab === 'tool' || (inspectorTab === 'item' && activeItemContextTab === 'modifiers')) && <PropertySection
                                        title="Modifiers (CSG)"
                                        icon={PuzzlePieceIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.modifiers}
                                        onToggle={() => toggleSection('modifiers')}
                                    >
                                        {selectedObj.modifiers && selectedObj.modifiers.map((mod, idx) => (
                                            <div key={idx} className="inspector-modifier-card">
                                                <div className="inspector-modifier-card__toolbar">
                                                    <select
                                                        className="inspector-modifier-card__select"
                                                        value={mod.type}
                                                        onChange={(e) => {
                                                            const newMods = selectedObj.modifiers.map((m, i) =>
                                                                i === idx ? { ...m, type: e.target.value } : m
                                                            );
                                                            updateObject(selectedObj.id, { modifiers: newMods });
                                                        }}
                                                    >
                                                        <option value="subtract">Subtract</option>
                                                        <option value="union">Union</option>
                                                        <option value="intersect">Intersect</option>
                                                    </select>
                                                    <button
                                                        type="button"
                                                        className="inspector-modifier-card__remove"
                                                        onClick={() => {
                                                            const newMods = selectedObj.modifiers.filter((_, i) => i !== idx);
                                                            updateObject(selectedObj.id, { modifiers: newMods });
                                                        }}
                                                    >
                                                        Remove
                                                    </button>
                                                </div>
                                                <div className="inspector-vp-grid">
                                                    <button
                                                        type="button"
                                                        className={`inspector-pill-btn ${mod.enabled !== false ? 'inspector-pill-btn--active' : ''}`}
                                                        onClick={() => {
                                                            const newMods = selectedObj.modifiers.map((m, i) =>
                                                                i === idx ? { ...m, enabled: m.enabled === false } : m
                                                            );
                                                            updateObject(selectedObj.id, { modifiers: newMods });
                                                        }}
                                                    >
                                                        {mod.enabled === false ? 'Disabled' : 'Enabled'}
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="inspector-pill-btn"
                                                        disabled={idx === 0}
                                                        onClick={() => {
                                                            if (idx === 0) return;
                                                            const newMods = [...selectedObj.modifiers];
                                                            [newMods[idx - 1], newMods[idx]] = [newMods[idx], newMods[idx - 1]];
                                                            updateObject(selectedObj.id, { modifiers: newMods });
                                                        }}
                                                    >
                                                        Move Up
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="inspector-pill-btn"
                                                        disabled={idx >= selectedObj.modifiers.length - 1}
                                                        onClick={() => {
                                                            if (idx >= selectedObj.modifiers.length - 1) return;
                                                            const newMods = [...selectedObj.modifiers];
                                                            [newMods[idx + 1], newMods[idx]] = [newMods[idx], newMods[idx + 1]];
                                                            updateObject(selectedObj.id, { modifiers: newMods });
                                                        }}
                                                    >
                                                        Move Down
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="inspector-pill-btn"
                                                        onClick={() => {
                                                            const newMods = selectedObj.modifiers.filter((_, i) => i !== idx);
                                                            updateObject(selectedObj.id, { modifiers: newMods }, true);
                                                            showToast('Modifier applied to current object state.', 'ok');
                                                        }}
                                                    >
                                                        Apply
                                                    </button>
                                                </div>
                                                {mod.targetId ? (
                                                    <div className="inspector-modifier-card__target">
                                                        Target: {objects.find(o => o.id === mod.targetId)?.geo || 'object'}
                                                    </div>
                                                ) : (
                                                    <select
                                                        className="inspector-modifier-card__target-select"
                                                        onChange={(e) => {
                                                            const newMods = selectedObj.modifiers.map((m, i) =>
                                                                i === idx ? { ...m, targetId: e.target.value } : m
                                                            );
                                                            updateObject(selectedObj.id, { modifiers: newMods });
                                                        }}
                                                        value=""
                                                    >
                                                        <option value="" disabled>Choose target mesh…</option>
                                                        {objects.filter(o => o.id !== selectedObj.id && o.type === 'primitive').map(o => (
                                                            <option key={o.id} value={o.id}>{o.geo || 'object'} ({o.id.substring(4, 8)})</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        ))}
                                        <button
                                            type="button"
                                            className="inspector-btn inspector-btn--dashed"
                                            onClick={() => {
                                                const newMods = [...(selectedObj.modifiers || []), { type: 'subtract', targetId: null }];
                                                updateObject(selectedObj.id, { modifiers: newMods });
                                            }}
                                        >
                                            <PlusIcon className="inspector-icon-sm" aria-hidden />
                                            Add boolean
                                        </button>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Transform"
                                        icon={CubeIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.transform}
                                        onToggle={() => toggleSection('transform')}
                                    >
                                        <TransformGroup
                                            label="position"
                                            values={selectedObj.position || [0, 0, 0]}
                                            onChange={(v, saveH) => updateObject(selectedObj.id, { position: v }, saveH)}
                                        />
                                        <TransformGroup
                                            label="rotation"
                                            values={selectedObj.rotation || [0, 0, 0]}
                                            onChange={(v, saveH) => updateObject(selectedObj.id, { rotation: v }, saveH)}
                                        />
                                        <TransformGroup
                                            label="scale"
                                            values={selectedObj.scale || [1, 1, 1]}
                                            onChange={(v, saveH) => updateObject(selectedObj.id, { scale: v }, saveH)}
                                        />

                                        <MeshBoundingSizeCard selectedObj={selectedObj} updateObject={updateObject} />

                                        <div className="inspector-readout-strip">
                                            <span className="inspector-readout-strip__label">Extents</span>
                                            <div className="inspector-readout-strip__axes">
                                                {(() => {
                                                    const d = selectedObj.originalDimensions || selectedObj.dimensions || [1, 1, 1];
                                                    const sc = selectedObj.scale || [1, 1, 1];
                                                    const axes = ['X', 'Y', 'Z'];
                                                    return axes.map((ax, idx) => (
                                                        <div key={ax} className={`inspector-readout-strip__cell inspector-readout-strip__cell--${ax.toLowerCase()}`}>
                                                            <span className="inspector-readout-strip__axis">{ax}</span>
                                                            <span className="inspector-readout-strip__val">
                                                                {Math.abs(d[idx] * sc[idx] * 100).toFixed(1)}
                                                                <span className="inspector-readout-strip__unit">cm</span>
                                                            </span>
                                                        </div>
                                                    ));
                                                })()}
                                            </div>
                                            <button
                                                type="button"
                                                className="inspector-readout-strip__action"
                                                onClick={() => useStore.getState().toggleInteriorMode(selectedObj.id)}
                                            >
                                                Interior
                                            </button>
                                        </div>

                                        {selectedId && (Math.abs(moveDelta[0]) > 0.001 || Math.abs(moveDelta[1]) > 0.001 || Math.abs(moveDelta[2]) > 0.001) && (
                                            <div className="inspector-delta-card">
                                                <div className="inspector-delta-card__title">Real-time Move Delta</div>
                                                <div className="inspector-delta-card__grid">
                                                    {['X', 'Y', 'Z'].map((ax, idx) => (
                                                        <div key={ax} className="inspector-delta-card__cell">
                                                            <span className="inspector-delta-card__axis">Δ{ax}</span>
                                                            <span className="inspector-delta-card__val">{(moveDelta[idx] * 100).toFixed(1)}cm</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {selectedId && (Math.abs(rotationDelta[0]) > 0.1 || Math.abs(rotationDelta[1]) > 0.1 || Math.abs(rotationDelta[2]) > 0.1) && (
                                            <div className="inspector-delta-card">
                                                <div className="inspector-delta-card__title">Real-time Rotation Delta</div>
                                                <div className="inspector-delta-card__grid">
                                                    {['X', 'Y', 'Z'].map((ax, idx) => (
                                                        <div key={ax} className="inspector-delta-card__cell">
                                                            <span className="inspector-delta-card__axis">Δ{ax}</span>
                                                            <span className="inspector-delta-card__val">{rotationDelta[idx].toFixed(1)}°</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Delta Transform"
                                        icon={ArrowPathIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.transform}
                                        onToggle={() => toggleSection('transform')}
                                    >
                                        <TransformGroup
                                            label="position"
                                            values={selectedObj.deltaPosition || [0, 0, 0]}
                                            onChange={(v, saveH) => updateObject(selectedObj.id, { deltaPosition: v }, saveH)}
                                        />
                                        <TransformGroup
                                            label="rotation"
                                            values={selectedObj.deltaRotation || [0, 0, 0]}
                                            onChange={(v, saveH) => updateObject(selectedObj.id, { deltaRotation: v }, saveH)}
                                        />
                                        <TransformGroup
                                            label="scale"
                                            values={selectedObj.deltaScale || [1, 1, 1]}
                                            onChange={(v, saveH) => updateObject(selectedObj.id, { deltaScale: v }, saveH)}
                                        />
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'render' && <PropertySection
                                        title="Render"
                                        icon={SparklesIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.viewport}
                                        onToggle={() => toggleSection('viewport')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="render-engine-status-card">
                                                <div>
                                                    <div className="render-engine-status-card__title">Render Engine Health</div>
                                                    <div className="render-engine-status-card__meta">{renderReadinessLabel}</div>
                                                </div>
                                                <div className="render-engine-status-card__score">{renderReadinessScore}</div>
                                            </div>
                                            <div className="render-quick-actions">
                                                <button type="button" className="inspector-pill-btn" onClick={() => applyDisplayMode('solid')}>Solid</button>
                                                <button type="button" className="inspector-pill-btn" onClick={() => applyDisplayMode('edit')}>Edit</button>
                                                <button type="button" className="inspector-pill-btn" onClick={() => applyDisplayMode('render')}>Render</button>
                                                <button type="button" className="inspector-pill-btn" onClick={openExportPanel}>Export</button>
                                            </div>
                                            <div className="render-optimize-card">
                                                <div className="inspector-customprop-row">
                                                    <label className="inspector-field-label inspector-field-label--tight">Auto Optimize</label>
                                                    <select className="props-input-field" value={renderOptimizeTarget} onChange={(e) => setRenderOptimizeTarget(e.target.value)}>
                                                        <option value="fast">Fast Preview</option>
                                                        <option value="balanced">Balanced</option>
                                                        <option value="cinematic">Final Cinematic</option>
                                                    </select>
                                                    <span />
                                                </div>
                                                <button type="button" className="inspector-pill-btn inspector-pill-btn--active" onClick={autoOptimizeRender}>
                                                    Apply Optimization
                                                </button>
                                                <p className="inspector-hint">{renderOptimizeHint}</p>
                                            </div>
                                            <div className="inspector-field-label">Sampling</div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Render Engine</label>
                                                <select className="props-input-field" value={renderEngine} onChange={(e) => setRenderEngine(e.target.value)}>
                                                    <option value="EEVEE">EEVEE</option>
                                                    <option value="Workbench">Workbench</option>
                                                    <option value="Cycles">Cycles (mapped)</option>
                                                </select>
                                                <span />
                                            </div>
                                            <SliderRow
                                                label="Samples"
                                                value={renderSamples}
                                                min={1}
                                                max={1024}
                                                step={1}
                                                onChange={(v) => setRenderSamples(Math.round(v))}
                                            />
                                            <div className="inspector-field-label">Wavefront Pipeline</div>
                                            <div className="inspector-vp-grid render-pipeline-presets">
                                                {Object.entries(RENDER_PIPELINE_PRESETS).map(([key, preset]) => (
                                                    <button
                                                        key={key}
                                                        type="button"
                                                        className={`inspector-pill-btn ${renderPipelinePreset === key ? 'inspector-pill-btn--active' : ''}`}
                                                        onClick={() => applyRenderPipelinePreset(key)}
                                                    >
                                                        {preset.label}
                                                    </button>
                                                ))}
                                            </div>
                                            <SliderRow
                                                label="Ray Depth"
                                                value={renderRayDepth}
                                                min={1}
                                                max={12}
                                                step={1}
                                                onChange={(v) => setRenderRayDepth(Math.round(v))}
                                            />
                                            <SliderRow
                                                label="Bounce Budget"
                                                value={renderBounceBudget}
                                                min={1}
                                                max={12}
                                                step={1}
                                                onChange={(v) => setRenderBounceBudget(Math.round(v))}
                                            />
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Denoise Quality</label>
                                                <select className="props-input-field" value={renderDenoiseQuality} onChange={(e) => setRenderDenoiseQuality(e.target.value)}>
                                                    <option value="fast">Fast</option>
                                                    <option value="balanced">Balanced</option>
                                                    <option value="high">High</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-field-label">Performance</div>
                                            <button type="button" className={`inspector-pill-btn ${webgpuPathTraceRequested ? 'inspector-pill-btn--active' : ''}`} onClick={() => setWebgpuPathTraceRequested(!webgpuPathTraceRequested)}>
                                                WebGPU {webgpuPathTraceRequested ? 'On' : 'Off'}
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${lightingEnabled ? 'inspector-pill-btn--active' : ''}`} onClick={() => setLightingEnabled(!lightingEnabled)}>
                                                Scene Lighting
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${environmentVisible ? 'inspector-pill-btn--active' : ''}`} onClick={() => setEnvironmentVisible(!environmentVisible)}>
                                                World
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${smartZoomEnabled ? 'inspector-pill-btn--active' : ''}`} onClick={() => setSmartZoomEnabled(!smartZoomEnabled)}>
                                                Viewport Denoise
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${renderUseDenoise ? 'inspector-pill-btn--active' : ''}`} onClick={() => setRenderUseDenoise(!renderUseDenoise)}>
                                                Denoise
                                            </button>
                                            <div className="inspector-field-label">Color Management</div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">View Transform</label>
                                                <select className="props-input-field" value={renderViewTransform} onChange={(e) => setRenderViewTransform(e.target.value)}>
                                                    <option value="Filmic">Filmic</option>
                                                    <option value="Standard">Standard</option>
                                                    <option value="Raw">Raw</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-field-label">Neural Material Prompt</div>
                                            <input
                                                className="props-input-field"
                                                value={aiMaterialPrompt}
                                                onChange={(e) => setAiMaterialPrompt(e.target.value)}
                                                placeholder='e.g. weathered copper with green patina'
                                            />
                                            <button type="button" className="inspector-pill-btn" onClick={applyAIMaterialPrompt}>
                                                Apply Prompt to Selected
                                            </button>
                                            <div className="inspector-field-label">Director Shot Prompt</div>
                                            <input
                                                className="props-input-field"
                                                value={aiShotPrompt}
                                                onChange={(e) => setAiShotPrompt(e.target.value)}
                                                placeholder='e.g. slow crane rising at golden hour'
                                            />
                                            <button type="button" className="inspector-pill-btn" onClick={runAIDirectorShot}>
                                                Solve Shot + Frame Scene
                                            </button>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Duration (s)</label>
                                                <input
                                                    type="number"
                                                    className="props-input-field"
                                                    min={1}
                                                    max={120}
                                                    value={directorDurationSec}
                                                    onChange={(e) => setDirectorDurationSec(Math.max(1, Math.min(120, parseInt(e.target.value, 10) || 10)))}
                                                />
                                                <span />
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">FPS</label>
                                                <select className="props-input-field" value={directorFps} onChange={(e) => setDirectorFps(parseInt(e.target.value, 10) || 30)}>
                                                    <option value={24}>24</option>
                                                    <option value={30}>30</option>
                                                    <option value={60}>60</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-vp-grid render-director-actions">
                                                <button type="button" className="inspector-pill-btn" onClick={bakeDirectorTimeline}>
                                                    Bake Timeline
                                                </button>
                                                <button type="button" className="inspector-pill-btn" onClick={saveDirectorCameras}>
                                                    Save Shot Cameras
                                                </button>
                                                <button type="button" className="inspector-pill-btn" onClick={applyDirectorSequenceDefaults}>
                                                    Apply + Open Export
                                                </button>
                                                <button type="button" className="inspector-pill-btn" onClick={queueDirectorShotsForExport}>
                                                    Queue Shots
                                                </button>
                                            </div>
                                            {directorShotPlan.length > 0 && (
                                                <div className="inspector-vp-grid render-director-preview-actions">
                                                    <button type="button" className="inspector-pill-btn" onClick={previewPrevDirectorShot}>
                                                        Prev Shot
                                                    </button>
                                                    <button type="button" className={`inspector-pill-btn ${directorAutoPreview ? 'inspector-pill-btn--active' : ''}`} onClick={() => setDirectorAutoPreview((v) => !v)}>
                                                        Auto Preview {directorAutoPreview ? 'On' : 'Off'}
                                                    </button>
                                                    <button type="button" className="inspector-pill-btn" onClick={previewNextDirectorShot}>
                                                        Next Shot
                                                    </button>
                                                </div>
                                            )}
                                            {directorShotPlan.length > 0 && (
                                                <div className="inspector-stack-gap render-shot-list">
                                                    {directorShotPlan.map((shot, idx) => (
                                                        <div key={`${shot.label}-${idx}`} className="inspector-customprop-row render-shot-row">
                                                            <span className="inspector-hint">{idx + 1}. {shot.label} - Frames {shot.start} to {shot.end}{directorPreviewIndex === idx ? ' (active)' : ''}</span>
                                                            <button type="button" className="inspector-pill-btn" onClick={() => previewDirectorShotAt(idx)}>
                                                                Apply
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <p className="inspector-hint">Director shots: {directorShotPlan.length} · {directorFps} fps · {directorDurationSec}s</p>
                                            <p className="inspector-hint">AI Status: {aiRenderNote}</p>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'output' && <PropertySection
                                        title="Output"
                                        icon={DocumentDuplicateIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.rendering}
                                        onToggle={() => toggleSection('rendering')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-field-label">Dimensions</div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Resolution X</label>
                                                <input type="number" className="props-input-field" value={outputWidth} min={256} max={8192} onChange={(e) => setOutputWidth(Math.max(256, Math.min(8192, parseInt(e.target.value, 10) || 1920)))} />
                                                <span />
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Resolution Y</label>
                                                <input type="number" className="props-input-field" value={outputHeight} min={256} max={8192} onChange={(e) => setOutputHeight(Math.max(256, Math.min(8192, parseInt(e.target.value, 10) || 1080)))} />
                                                <span />
                                            </div>
                                            <SliderRow label="Scale" value={outputScale} min={10} max={200} step={1} unit="%" onChange={(v) => setOutputScale(Math.round(v))} />
                                            <div className="inspector-field-label">Frame Range</div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Frame Start</label>
                                                <input type="number" className="props-input-field" value={frameStart} min={1} max={100000} onChange={(e) => setFrameStart(Math.max(1, parseInt(e.target.value, 10) || 1))} />
                                                <span />
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Frame End</label>
                                                <input type="number" className="props-input-field" value={frameEnd} min={1} max={100000} onChange={(e) => setFrameEnd(Math.max(frameStart, parseInt(e.target.value, 10) || frameStart))} />
                                                <span />
                                            </div>
                                            <div className="inspector-field-label">File Format</div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">File Format</label>
                                                <select className="props-input-field" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value)}>
                                                    <option value="PNG">PNG</option>
                                                    <option value="JPEG">JPEG</option>
                                                    <option value="WEBP">WEBP</option>
                                                    <option value="OPEN_EXR">OpenEXR (mapped)</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-vp-grid">
                                                <button type="button" className="inspector-pill-btn" onClick={() => { setOutputWidth(1920); setOutputHeight(1080); }}>1080p</button>
                                                <button type="button" className="inspector-pill-btn" onClick={() => { setOutputWidth(2560); setOutputHeight(1440); }}>1440p</button>
                                                <button type="button" className="inspector-pill-btn" onClick={() => { setOutputWidth(3840); setOutputHeight(2160); }}>4K</button>
                                                <button type="button" className="inspector-pill-btn" onClick={() => { setOutputWidth(1080); setOutputHeight(1080); }}>1:1</button>
                                            </div>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'viewLayer' && <PropertySection
                                        title="View Layer"
                                        icon={EyeIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.sceneTree}
                                        onToggle={() => toggleSection('sceneTree')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-field-label">Filter</div>
                                            <div className="inspector-vp-grid">
                                            <button type="button" className={`inspector-pill-btn ${layoutEnabled ? 'inspector-pill-btn--active' : ''}`} onClick={() => setLayoutEnabled(!layoutEnabled)}>
                                                Overlays
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${gridVisible ? 'inspector-pill-btn--active' : ''}`} onClick={() => setGridVisible(!gridVisible)}>
                                                Grid
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${wireframe ? 'inspector-pill-btn--active' : ''}`} onClick={() => setWireframe(!wireframe)}>
                                                Wireframe
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${measurementsEnabled ? 'inspector-pill-btn--active' : ''}`} onClick={() => setMeasurementsEnabled(!measurementsEnabled)}>
                                                Measurements
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${materialPaintMode ? 'inspector-pill-btn--active' : ''}`} onClick={() => setMaterialPaintMode(!materialPaintMode)}>
                                                Material Preview
                                            </button>
                                            </div>
                                            <div className="inspector-field-label">Passes</div>
                                            <div className="inspector-vp-grid">
                                            <button type="button" className={`inspector-pill-btn ${viewLayerCombined ? 'inspector-pill-btn--active' : ''}`} onClick={() => setViewLayerCombined(!viewLayerCombined)}>
                                                Pass: Combined
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${viewLayerZ ? 'inspector-pill-btn--active' : ''}`} onClick={() => setViewLayerZ(!viewLayerZ)}>
                                                Pass: Z
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${viewLayerNormal ? 'inspector-pill-btn--active' : ''}`} onClick={() => setViewLayerNormal(!viewLayerNormal)}>
                                                Pass: Normal
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${viewLayerDiffuseColor ? 'inspector-pill-btn--active' : ''}`} onClick={() => setViewLayerDiffuseColor(!viewLayerDiffuseColor)}>
                                                Pass: Diffuse Color
                                            </button>
                                            <button type="button" className={`inspector-pill-btn ${viewLayerEmit ? 'inspector-pill-btn--active' : ''}`} onClick={() => setViewLayerEmit(!viewLayerEmit)}>
                                                Pass: Emit
                                            </button>
                                            </div>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Relations"
                                        icon={FolderIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.projectActions}
                                        onToggle={() => toggleSection('projectActions')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Parent</label>
                                                <select
                                                    className="props-input-field"
                                                    value={selectedObj.parentId || ''}
                                                    onChange={(e) => {
                                                        const nextParent = e.target.value;
                                                        if (!nextParent) {
                                                            useStore.getState().breakParent(selectedObj.id);
                                                            return;
                                                        }
                                                        useStore.getState().setParent(selectedObj.id, nextParent);
                                                    }}
                                                >
                                                    <option value="">None</option>
                                                    {objects.filter((o) => o.id !== selectedObj.id).map((o) => (
                                                        <option key={o.id} value={o.id}>{o.name || o.type}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Collection</label>
                                                <input
                                                    type="text"
                                                    className="props-input-field"
                                                    placeholder="Collection name"
                                                    value={selectedObj.collectionName || ''}
                                                    onChange={(e) => updateObject(selectedObj.id, { collectionName: e.target.value })}
                                                />
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Pass Index</label>
                                                <input
                                                    type="number"
                                                    className="props-input-field"
                                                    min={0}
                                                    max={32767}
                                                    value={selectedObj.passIndex ?? 0}
                                                    onChange={(e) => updateObject(selectedObj.id, { passIndex: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                                                />
                                                <span />
                                            </div>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Instancing"
                                        icon={DocumentDuplicateIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.rendering}
                                        onToggle={() => toggleSection('rendering')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Type</label>
                                                <select
                                                    className="props-input-field"
                                                    value={selectedObj.instancingMode || 'none'}
                                                    onChange={(e) => updateObject(selectedObj.id, { instancingMode: e.target.value })}
                                                >
                                                    <option value="none">None</option>
                                                    <option value="verts">Vertices</option>
                                                    <option value="faces">Faces</option>
                                                    <option value="collection">Collection</option>
                                                </select>
                                            </div>
                                            <SliderRow
                                                label="Instance count"
                                                value={Number(selectedObj.instanceCount ?? 1)}
                                                min={1}
                                                max={300}
                                                step={1}
                                                onChange={(v) => updateObject(selectedObj.id, { instanceCount: Math.round(v) })}
                                            />
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Motion Paths"
                                        icon={ArrowPathIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.lighting}
                                        onToggle={() => toggleSection('lighting')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <SliderRow
                                                label="Start frame"
                                                value={Number(selectedObj.motionPathStart ?? 1)}
                                                min={1}
                                                max={500}
                                                step={1}
                                                onChange={(v) => updateObject(selectedObj.id, { motionPathStart: Math.round(v) })}
                                            />
                                            <SliderRow
                                                label="End frame"
                                                value={Number(selectedObj.motionPathEnd ?? 120)}
                                                min={1}
                                                max={1000}
                                                step={1}
                                                onChange={(v) => updateObject(selectedObj.id, { motionPathEnd: Math.round(v) })}
                                            />
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Visibility"
                                        icon={EyeIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.viewport}
                                        onToggle={() => toggleSection('viewport')}
                                    >
                                        <div className="inspector-vp-grid">
                                            <button
                                                type="button"
                                                className={`inspector-pill-btn ${hiddenObjectIds.includes(selectedObj.id) ? '' : 'inspector-pill-btn--active'}`}
                                                onClick={() => useStore.getState().toggleObjectVisibility(selectedObj.id)}
                                            >
                                                {hiddenObjectIds.includes(selectedObj.id) ? 'Show in viewport' : 'Visible in viewport'}
                                            </button>
                                            <button
                                                type="button"
                                                className={`inspector-pill-btn ${lockedObjectIds.includes(selectedObj.id) ? 'inspector-pill-btn--active' : ''}`}
                                                onClick={() => useStore.getState().toggleObjectLock(selectedObj.id)}
                                            >
                                                {lockedObjectIds.includes(selectedObj.id) ? 'Locked' : 'Unlocked'}
                                            </button>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Viewport Display"
                                        icon={ViewColumnsIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.viewportDisplay}
                                        onToggle={() => toggleSection('viewportDisplay')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Display As</label>
                                                <select
                                                    className="props-input-field"
                                                    value={selectedObj.viewportDisplayAs || 'solid'}
                                                    onChange={(e) => updateObject(selectedObj.id, { viewportDisplayAs: e.target.value })}
                                                >
                                                    <option value="bounds">Bounds</option>
                                                    <option value="wire">Wire</option>
                                                    <option value="solid">Solid</option>
                                                    <option value="textured">Textured</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-vp-grid">
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${selectedObj.showNameInViewport ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={() => updateObject(selectedObj.id, { showNameInViewport: !selectedObj.showNameInViewport })}
                                                >
                                                    Name
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${selectedObj.showInFront ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={() => updateObject(selectedObj.id, { showInFront: !selectedObj.showInFront })}
                                                >
                                                    In Front
                                                </button>
                                            </div>
                                        </div>
                                    </PropertySection>}

                                    {(inspectorTab === 'tool' || inspectorTab === 'create') && <PropertySection
                                        title="Tool Settings"
                                        icon={WrenchScrewdriverIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.transform}
                                        onToggle={() => toggleSection('transform')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Transform</label>
                                                <select
                                                    className="props-input-field"
                                                    value={transformMode}
                                                    onChange={(e) => setTransformMode(e.target.value)}
                                                >
                                                    <option value="translate">Move (G)</option>
                                                    <option value="rotate">Rotate (R)</option>
                                                    <option value="scale">Scale (S)</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Orientation</label>
                                                <select
                                                    className="props-input-field"
                                                    value={toolTransformOrientation}
                                                    onChange={(e) => setToolTransformOrientation(e.target.value)}
                                                >
                                                    <option value="global">Global</option>
                                                    <option value="local">Local</option>
                                                    <option value="normal">Normal</option>
                                                    <option value="view">View</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Pivot Point</label>
                                                <select
                                                    className="props-input-field"
                                                    value={toolPivotPoint}
                                                    onChange={(e) => setToolPivotPoint(e.target.value)}
                                                >
                                                    <option value="median">Median Point</option>
                                                    <option value="active">Active Element</option>
                                                    <option value="cursor">3D Cursor</option>
                                                    <option value="individual">Individual Origins</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-vp-grid">
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${objectSnapEnabled ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={toggleObjectSnap}
                                                >
                                                    Snap
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${spawnAtThreeDCursor ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={() => setSpawnAtThreeDCursor(!spawnAtThreeDCursor)}
                                                >
                                                    Use 3D Cursor
                                                </button>
                                            </div>
                                        </div>
                                    </PropertySection>}

                                    {(inspectorTab === 'tool' || inspectorTab === 'create') && <PropertySection
                                        title="Modeling & Dismantle"
                                        icon={PuzzlePieceIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.dismantling}
                                        onToggle={() => toggleSection('dismantling')}
                                    >
                                        <div className="inspector-dismantle-stack">
                                            {!selectedObj.isDismantled && selectedObj.parts && selectedObj.parts.length > 0 && (
                                                <button
                                                    type="button"
                                                    className="inspector-btn inspector-btn--primary"
                                                    onClick={() => useStore.getState().dismantleObject(selectedObj.id, selectedObj.parts)}
                                                >
                                                    <PuzzlePieceIcon className="inspector-icon-lg" aria-hidden />
                                                    <span>Dismantle object</span>
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                className="inspector-btn inspector-btn--secondary"
                                                onClick={() => useStore.getState().setLayoutManagerOpen(true, selectedId)}
                                            >
                                                <ViewColumnsIcon className="inspector-icon-lg" aria-hidden />
                                                <span>Layout manager</span>
                                            </button>

                                            <p className="inspector-hint inspector-hint--center">
                                                Floor plan extraction and PDF sync
                                            </p>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'material' && <PropertySection
                                        title="Materials"
                                        icon={SparklesIcon}
                                        colorClass="color-materials"
                                        isOpen={openSections.materials}
                                        onToggle={() => toggleSection('materials')}
                                    >
                                        {(() => {
                                            const surfaceHex = (isMeshEditObject && slotsArePersisted && activeSlotForPreview?.color)
                                                ? activeSlotForPreview.color
                                                : (selectedObj.color || '#e2e8f0');
                                            const setSurfaceColor = (hex) => {
                                                if (isMeshEditObject && slotsArePersisted && activeMaterialSlotId) {
                                                    meshSetMaterialSlotColor(activeMaterialSlotId, hex, selectedObj.id);
                                                } else {
                                                    updateObject(selectedObj.id, { color: hex }, true);
                                                }
                                            };
                                            const activeSlotIdx = materialSlots.findIndex((s) => s.id === activeMaterialSlotId);
                                            const maTracks = normalizeMaterialAnim(selectedObj.materialAnim).tracks;
                                            const kfFrame = materialEditorCurrentFrame ?? 0;
                                            const useSlotColorKf = isMeshEditObject && slotsArePersisted && !!activeMaterialSlotId;
                                            const colorKeyed = useSlotColorKf
                                                ? hasKeyframeAt(maTracks, 'slotColor', kfFrame, activeMaterialSlotId)
                                                : hasKeyframeAt(maTracks, 'color', kfFrame);
                                            const roughKeyed = hasKeyframeAt(maTracks, 'roughness', kfFrame);
                                            const metalKeyed = hasKeyframeAt(maTracks, 'metalness', kfFrame);
                                            const matListPopover = (
                                                <MaterialListPopover
                                                    open={materialListOpen}
                                                    onClose={() => { setMaterialListOpen(false); setMaterialListSearch(''); }}
                                                    search={materialListSearch}
                                                    onSearchChange={setMaterialListSearch}
                                                    entries={filteredMaterialBrowse}
                                                    onPick={(entry) => {
                                                        applySceneMaterialToSelection({
                                                            color: entry.color,
                                                            roughness: entry.roughness,
                                                            metalness: entry.metalness,
                                                        });
                                                        showToast(`Applied “${entry.name}”.`, 'ok');
                                                        setMaterialListOpen(false);
                                                    }}
                                                    onSaveCurrent={() => {
                                                        addMaterialLibraryPreset({
                                                            name: (isMeshEditObject && slotsArePersisted && activeSlotForPreview?.name)
                                                                ? activeSlotForPreview.name
                                                                : (selectedObj.name || 'Material'),
                                                            color: surfaceHex,
                                                            roughness: selectedObj.roughness ?? 0.3,
                                                            metalness: selectedObj.metalness ?? 0.2,
                                                        });
                                                        showToast('Material saved to project library.', 'ok');
                                                    }}
                                                    canSaveCurrent={!!selectedObj && !!projectId}
                                                    onRemovePreset={(pid) => {
                                                        removeMaterialLibraryPreset(pid);
                                                        showToast('Removed saved material.', 'ok');
                                                    }}
                                                />
                                            );
                                            return (
                                        <div className="blender-materials">
                                            {isMeshEditObject ? (
                                                <>
                                                    <div className="blender-mat-slots" aria-label="Material slots">
                                                        <div className="blender-mat-slots__list" role="listbox">
                                                            {materialSlots.map((slot) => (
                                                                <button
                                                                    key={slot.id}
                                                                    type="button"
                                                                    role="option"
                                                                    aria-selected={slot.id === activeMaterialSlotId}
                                                                    className={`blender-mat-slots__row${slot.id === activeMaterialSlotId ? ' is-active' : ''}`}
                                                                    onClick={() => meshSetActiveMaterialSlot(slot.id, selectedObj.id)}
                                                                >
                                                                    <BlenderMatSphere color={slot.color} size="sm" />
                                                                    <span className="blender-mat-slots__name">{slot.name}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <div className="blender-mat-slots__rail" aria-label="Slot list actions">
                                                            <button
                                                                type="button"
                                                                className="blender-mat-rail-btn"
                                                                title="Add slot"
                                                                onClick={() => meshAddMaterialSlot(selectedObj.id)}
                                                            >
                                                                <PlusIcon className="inspector-icon-lg" aria-hidden />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="blender-mat-rail-btn"
                                                                title="Remove active slot"
                                                                disabled={materialSlots.length <= 1 || !activeMaterialSlotId}
                                                                onClick={() => activeMaterialSlotId && meshRemoveMaterialSlot(activeMaterialSlotId, selectedObj.id)}
                                                            >
                                                                <MinusSmallIcon className="inspector-icon-lg" aria-hidden />
                                                            </button>
                                                            <details className="blender-mat-rail-menu">
                                                                <summary className="blender-mat-rail-menu__summary" title="More slot tools">
                                                                    <ChevronDownIcon className="inspector-icon-lg" aria-hidden />
                                                                </summary>
                                                                <div className="blender-mat-rail-menu__body">
                                                                    <button
                                                                        type="button"
                                                                        className="blender-mat-rail-menu__item"
                                                                        disabled={!slotsArePersisted || activeSlotIdx <= 0}
                                                                        onClick={() => activeMaterialSlotId && meshReorderMaterialSlot(activeMaterialSlotId, 'up', selectedObj.id)}
                                                                    >
                                                                        Move active up
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="blender-mat-rail-menu__item"
                                                                        disabled={!slotsArePersisted || activeSlotIdx < 0 || activeSlotIdx >= materialSlots.length - 1}
                                                                        onClick={() => activeMaterialSlotId && meshReorderMaterialSlot(activeMaterialSlotId, 'down', selectedObj.id)}
                                                                    >
                                                                        Move active down
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="blender-mat-rail-menu__item"
                                                                        disabled={!faceEditReady || !slotsArePersisted}
                                                                        onClick={() => {
                                                                            meshAssignSelectionToActiveMaterialSlot();
                                                                            showToast('Assigned selected face to active slot.', 'ok');
                                                                        }}
                                                                    >
                                                                        Assign face → active
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="blender-mat-rail-menu__item"
                                                                        disabled={!slotsArePersisted || !activeMaterialSlotId}
                                                                        onClick={() => {
                                                                            const fs = selectedObj.meshEditState?.faceSlots || {};
                                                                            const has = Object.values(fs).includes(activeMaterialSlotId);
                                                                            if (!has) {
                                                                                showToast('No faces use the active slot yet.', 'info');
                                                                                return;
                                                                            }
                                                                            meshSelectFirstFaceForMaterialSlot(activeMaterialSlotId, selectedObj.id);
                                                                            showToast('Selected first face for active slot.', 'ok');
                                                                        }}
                                                                    >
                                                                        Select first face (active)
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        className="blender-mat-rail-menu__item"
                                                                        disabled={!slotsArePersisted || !activeMaterialSlotId}
                                                                        onClick={() => {
                                                                            meshClearFacesUsingMaterialSlot(activeMaterialSlotId, selectedObj.id);
                                                                            showToast('Cleared face assignments for active slot.', 'ok');
                                                                        }}
                                                                    >
                                                                        Clear faces (active)
                                                                    </button>
                                                                </div>
                                                            </details>
                                                        </div>
                                                    </div>

                                                    <div className="blender-mat-datablock-wrap">
                                                        <div className="blender-mat-datablock">
                                                            <BlenderMatSphere color={activeSlotForPreview?.color || selectedObj.color} size="md" />
                                                            <input
                                                                type="text"
                                                                className="blender-mat-datablock__name props-input-field"
                                                                defaultValue={activeSlotForPreview?.name || 'Material'}
                                                                key={`${activeMaterialSlotId}-${activeSlotForPreview?.name}`}
                                                                title="Material name"
                                                                disabled={!slotsArePersisted}
                                                                onBlur={(e) => {
                                                                    const v = e.target.value.trim();
                                                                    if (!slotsArePersisted || !activeMaterialSlotId || !v || v === activeSlotForPreview?.name) return;
                                                                    meshRenameMaterialSlot(activeMaterialSlotId, v, selectedObj.id);
                                                                }}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="blender-mat-iconbtn"
                                                                title="Browse project materials"
                                                                onClick={() => setMaterialListOpen((o) => !o)}
                                                            >
                                                                <ChevronDownIcon className="inspector-icon-xl" aria-hidden />
                                                            </button>
                                                            <button type="button" className="blender-mat-iconbtn" title="Fake user (reserved)" disabled>
                                                                <ShieldCheckIcon className="inspector-icon-xl" aria-hidden />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="blender-mat-iconbtn"
                                                                title="Duplicate material slot"
                                                                disabled={!slotsArePersisted}
                                                                onClick={() => {
                                                                    meshAddMaterialSlot(selectedObj.id, activeSlotForPreview?.color || selectedObj.color);
                                                                    showToast('Duplicated material slot.', 'ok');
                                                                }}
                                                            >
                                                                <DocumentDuplicateIcon className="inspector-icon-xl" aria-hidden />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="blender-mat-iconbtn"
                                                                title="Remove active slot"
                                                                disabled={materialSlots.length <= 1 || !activeMaterialSlotId}
                                                                onClick={() => activeMaterialSlotId && meshRemoveMaterialSlot(activeMaterialSlotId, selectedObj.id)}
                                                            >
                                                                <XMarkIcon className="inspector-icon-xl" aria-hidden />
                                                            </button>
                                                        </div>
                                                        {matListPopover}
                                                    </div>
                                                    {!slotsArePersisted && (
                                                        <p className="inspector-hint blender-mat-hint">Press + to add slots for per-face materials.</p>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="blender-mat-datablock-wrap">
                                                    <div className="blender-mat-datablock">
                                                        <BlenderMatSphere color={selectedObj.color} size="md" />
                                                        <span className="blender-mat-datablock__static">{selectedObj.name || selectedObj.type}</span>
                                                        <button
                                                            type="button"
                                                            className="blender-mat-iconbtn"
                                                            title="Browse project materials"
                                                            onClick={() => setMaterialListOpen((o) => !o)}
                                                        >
                                                            <ChevronDownIcon className="inspector-icon-xl" aria-hidden />
                                                        </button>
                                                    </div>
                                                    {matListPopover}
                                                </div>
                                            )}

                                            <BlenderMatSubpanel
                                                title="Preview"
                                                open={materialBlenderPreviewOpen}
                                                onToggle={() => setMaterialBlenderPreviewOpen(!materialBlenderPreviewOpen)}
                                            >
                                                <div className="blender-mat-preview">
                                                    <div
                                                        className={`blender-mat-preview__stage blender-mat-preview__stage--${materialPreviewShape}`}
                                                        style={{ '--pv': surfaceHex }}
                                                    />
                                                    <div className="blender-mat-preview__shapes" role="toolbar" aria-label="Preview shape">
                                                        <button
                                                            type="button"
                                                            className={`blender-mat-preview-shape${materialPreviewShape === 'sphere' ? ' is-on' : ''}`}
                                                            title="Sphere"
                                                            onClick={() => setMaterialPreviewShape('sphere')}
                                                        >
                                                            ○
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`blender-mat-preview-shape${materialPreviewShape === 'cube' ? ' is-on' : ''}`}
                                                            title="Cube"
                                                            onClick={() => setMaterialPreviewShape('cube')}
                                                        >
                                                            □
                                                        </button>
                                                    </div>
                                                </div>
                                            </BlenderMatSubpanel>

                                            <BlenderMatSubpanel
                                                title="Surface"
                                                open={materialBlenderSurfaceOpen}
                                                onToggle={() => setMaterialBlenderSurfaceOpen(!materialBlenderSurfaceOpen)}
                                            >
                                                <div className="blender-surface-shader">
                                                    <span className="blender-surface-shader__dot" aria-hidden />
                                                    <span className="blender-surface-shader__lbl">Surface</span>
                                                    <select className="blender-surface-shader__select" value="principled" aria-label="Shader" disabled>
                                                        <option value="principled">Principled BSDF</option>
                                                    </select>
                                                </div>

                                                <div className="blender-mat-frame-row">
                                                    <span className="blender-mat-frame-row__lbl">Frame</span>
                                                    <input
                                                        type="number"
                                                        min={0}
                                                        max={9999}
                                                        className="props-input-field blender-mat-frame-input"
                                                        value={materialEditorCurrentFrame}
                                                        onChange={(e) => setMaterialEditorFrame(parseInt(e.target.value, 10) || 0)}
                                                        title="Material keyframe frame"
                                                    />
                                                </div>

                                                <div className="blender-surface-row blender-surface-row--color">
                                                    <span className="blender-surface-row__label">Base Color</span>
                                                    <label className="blender-surface-color-wide" style={{ background: surfaceHex }}>
                                                        <input
                                                            type="color"
                                                            value={surfaceHex}
                                                            onChange={(e) => setSurfaceColor(e.target.value)}
                                                            aria-label="Base color"
                                                        />
                                                    </label>
                                                    <span className="blender-surface-color-dot" style={{ background: surfaceHex }} aria-hidden />
                                                    <button
                                                        type="button"
                                                        className={`blender-keyframe-dot${colorKeyed ? ' is-keyed' : ''}`}
                                                        title={colorKeyed ? 'Remove keyframe at current frame' : 'Insert keyframe at current frame'}
                                                        aria-pressed={colorKeyed}
                                                        onClick={() => (useSlotColorKf
                                                            ? toggleMaterialKeyframeOnSelection('slotColor', activeMaterialSlotId)
                                                            : toggleMaterialKeyframeOnSelection('color'))}
                                                    />
                                                </div>

                                                <div className="blender-surface-swatches">
                                                    {['#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#ffffff', '#1a1a2e', '#475569'].map((c) => (
                                                        <ColorSwatch
                                                            key={c}
                                                            color={c}
                                                            active={surfaceHex.toLowerCase() === c.toLowerCase()}
                                                            onClick={() => setSurfaceColor(c)}
                                                        />
                                                    ))}
                                                </div>

                                                <div className="blender-surface-sliders">
                                                    <SliderRow
                                                        label="Roughness"
                                                        value={Math.round((selectedObj.roughness ?? 0.3) * 100)}
                                                        min={0}
                                                        max={100}
                                                        unit="%"
                                                        onChange={(v) => updateObject(selectedObj.id, { roughness: v / 100 })}
                                                        keyframe={{
                                                            active: roughKeyed,
                                                            onToggle: () => toggleMaterialKeyframeOnSelection('roughness'),
                                                        }}
                                                    />
                                                    <SliderRow
                                                        label="Metalness"
                                                        value={Math.round((selectedObj.metalness ?? 0.2) * 100)}
                                                        min={0}
                                                        max={100}
                                                        unit="%"
                                                        onChange={(v) => updateObject(selectedObj.id, { metalness: v / 100 })}
                                                        keyframe={{
                                                            active: metalKeyed,
                                                            onToggle: () => toggleMaterialKeyframeOnSelection('metalness'),
                                                        }}
                                                    />
                                                </div>

                                                {isMeshEditObject && faceEditReady && (
                                                    <div className="blender-mat-face-tools">
                                                        <span className="blender-mat-face-tools__label">Mesh (face)</span>
                                                        <div className="blender-mat-face-tools__grid">
                                                            <button
                                                                type="button"
                                                                className="inspector-pill-btn"
                                                                onClick={() => {
                                                                    meshDeleteSelectedFaces();
                                                                    showToast('Selected face deleted.', 'ok');
                                                                }}
                                                            >
                                                                Delete face
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="inspector-pill-btn"
                                                                onClick={() => {
                                                                    meshAssignSelectionMaterial(surfaceHex);
                                                                    showToast('Painted face with base color.', 'ok');
                                                                }}
                                                            >
                                                                Paint face
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="inspector-pill-btn inspector-pill-btn--active"
                                                                disabled={!slotsArePersisted}
                                                                onClick={() => {
                                                                    meshAssignSelectionToActiveMaterialSlot();
                                                                    showToast('Face → active slot.', 'ok');
                                                                }}
                                                            >
                                                                Face → slot
                                                            </button>
                                                        </div>
                                                        <div className="blender-mat-face-tools__extrude">
                                                            <span className="blender-mat-face-tools__extrude-label">Extrude</span>
                                                            <input
                                                                type="number"
                                                                step={0.01}
                                                                value={meshExtrudeStep}
                                                                className="props-input-field blender-mat-extrude-input"
                                                                onChange={(e) => setMeshExtrudeStep(parseFloat(e.target.value) || 0)}
                                                            />
                                                            <button
                                                                type="button"
                                                                className="inspector-pill-btn inspector-pill-btn--active"
                                                                onClick={() => {
                                                                    meshExtrudeSelectedFace(meshExtrudeStep);
                                                                    showToast(`Extruded ${meshExtrudeStep.toFixed(2)}m`, 'ok');
                                                                }}
                                                            >
                                                                Apply
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </BlenderMatSubpanel>
                                        </div>
                                        );
                                        })()}
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'material' && <PropertySection
                                        title="Settings"
                                        icon={WrenchScrewdriverIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.branding}
                                        onToggle={() => toggleSection('branding')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Blend Mode</label>
                                                <select
                                                    className="props-input-field"
                                                    value={selectedObj.materialBlendMode || 'opaque'}
                                                    onChange={(e) => updateObject(selectedObj.id, { materialBlendMode: e.target.value }, true)}
                                                >
                                                    <option value="opaque">Opaque</option>
                                                    <option value="alphaClip">Alpha Clip</option>
                                                    <option value="alphaHashed">Alpha Hashed</option>
                                                    <option value="alphaBlend">Alpha Blend</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-customprop-row">
                                                <label className="inspector-field-label inspector-field-label--tight">Shadow Mode</label>
                                                <select
                                                    className="props-input-field"
                                                    value={selectedObj.materialShadowMode || 'opaque'}
                                                    onChange={(e) => updateObject(selectedObj.id, { materialShadowMode: e.target.value }, true)}
                                                >
                                                    <option value="opaque">Opaque</option>
                                                    <option value="clip">Clip</option>
                                                    <option value="hashed">Hashed</option>
                                                    <option value="none">None</option>
                                                </select>
                                                <span />
                                            </div>
                                            <div className="inspector-vp-grid">
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${selectedObj.showBackface ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={() => updateObject(selectedObj.id, { showBackface: !selectedObj.showBackface }, true)}
                                                >
                                                    Show Backface
                                                </button>
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${selectedObj.screenRefraction ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={() => updateObject(selectedObj.id, { screenRefraction: !selectedObj.screenRefraction }, true)}
                                                >
                                                    Screen Refraction
                                                </button>
                                            </div>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && ['primitive', 'gltf', 'gltf-part', 'stl'].includes(selectedObj.type) && (
                                        <PropertySection
                                            title="Rendering"
                                            icon={SunIcon}
                                            colorClass="color-lighting"
                                            isOpen={openSections.rendering}
                                            onToggle={() => toggleSection('rendering')}
                                        >
                                            <label className="inspector-check-row">
                                                <span className="inspector-check-row__label">Cast shadows</span>
                                                <input
                                                    type="checkbox"
                                                    className="inspector-check"
                                                    checked={selectedObj.castShadows !== false}
                                                    onChange={(e) => updateObject(selectedObj.id, { castShadows: e.target.checked }, true)}
                                                />
                                            </label>
                                            <label className="inspector-check-row">
                                                <span className="inspector-check-row__label">Receive shadows</span>
                                                <input
                                                    type="checkbox"
                                                    className="inspector-check"
                                                    checked={selectedObj.receiveShadows !== false}
                                                    onChange={(e) => updateObject(selectedObj.id, { receiveShadows: e.target.checked }, true)}
                                                />
                                            </label>
                                            <p className="inspector-hint" title="Disable cast on tiny props or receive on glass">
                                                Optional: tune for props or transparent materials.
                                            </p>
                                        </PropertySection>
                                    )}

                                    {inspectorTab === 'item' && <PropertySection
                                        title="Lighting"
                                        icon={LightBulbIcon}
                                        colorClass="color-lighting"
                                        isOpen={openSections.lighting}
                                        onToggle={() => toggleSection('lighting')}
                                    >
                                        {selectedObj.type === 'light' ? (<>
                                            <SliderRow
                                                label="Intensity"
                                                value={Math.round((selectedObj.intensity ?? 1) * 10)}
                                                min={0} max={100}
                                                onChange={(v) => updateObject(selectedObj.id, { intensity: v / 10 })}
                                                colorClass="color-lighting"
                                            />
                                            {(selectedObj.lightType === 'point' || selectedObj.lightType === 'spot') && (
                                                <SliderRow
                                                    label="Distance"
                                                    value={selectedObj.distance ?? 15}
                                                    min={1} max={50}
                                                    onChange={(v) => updateObject(selectedObj.id, { distance: v })}
                                                    colorClass="color-lighting"
                                                />
                                            )}
                                            {selectedObj.lightType === 'spot' && (
                                                <SliderRow
                                                    label="Beam Angle"
                                                    value={Math.round((selectedObj.angle ?? Math.PI / 6) * (180 / Math.PI))}
                                                    min={5} max={90} unit="°"
                                                    onChange={(v) => updateObject(selectedObj.id, { angle: v * (Math.PI / 180) })}
                                                    colorClass="color-lighting"
                                                />
                                            )}
                                            <div className="inspector-color-row">
                                                <span className="inspector-color-row__label">Light color</span>
                                                <input
                                                    type="color"
                                                    className="inspector-color-input"
                                                    value={selectedObj.color || '#ffffff'}
                                                    onChange={e => updateObject(selectedObj.id, { color: e.target.value })}
                                                />
                                            </div>
                                        </>) : (<>
                                            <SliderRow
                                                label="Emissive"
                                                value={Math.round((selectedObj.emissiveIntensity ?? 0) * 100)}
                                                min={0} max={100} unit="%"
                                                onChange={(v) => updateObject(selectedObj.id, { emissiveIntensity: v / 100 })}
                                                colorClass="color-lighting"
                                            />
                                        </>)}
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'constraints' && <PropertySection
                                        title="Constraints"
                                        icon={ShieldCheckIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.modifiers}
                                        onToggle={() => toggleSection('modifiers')}
                                    >
                                        <BlenderConstraintsPanel selectedObj={selectedObj} updateObject={updateObject} />
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'objectData' && <PropertySection
                                        title="Object Data"
                                        icon={WrenchScrewdriverIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.dismantling}
                                        onToggle={() => toggleSection('dismantling')}
                                    >
                                        {selectedObj?.type === 'light' ? (
                                            <div className="inspector-stack-gap">
                                                <div className="inspector-field-label">Light</div>
                                                <label className="inspector-field-label">Light Color</label>
                                                <input
                                                    type="color"
                                                    className="props-input-field"
                                                    value={selectedObj.color || '#ffffff'}
                                                    onChange={(e) => updateObject(selectedObj.id, { color: e.target.value })}
                                                />
                                                <SliderRow
                                                    label="Intensity"
                                                    value={Math.round((selectedObj.intensity ?? 1) * 10) / 10}
                                                    min={0}
                                                    max={20}
                                                    step={0.1}
                                                    onChange={(v) => updateObject(selectedObj.id, { intensity: v })}
                                                />
                                                <SliderRow
                                                    label="Radius"
                                                    value={Math.round((selectedObj.lightRadius ?? 0.25) * 100) / 100}
                                                    min={0}
                                                    max={5}
                                                    step={0.01}
                                                    onChange={(v) => updateObject(selectedObj.id, { lightRadius: v })}
                                                />
                                            </div>
                                        ) : selectedObj?.type === 'primitive' ? (
                                            <div className="inspector-stack-gap">
                                                <div className="inspector-field-label">Geometry</div>
                                                <div className="inspector-customprop-row">
                                                    <label className="inspector-field-label inspector-field-label--tight">Geometry</label>
                                                    <select
                                                        className="props-input-field"
                                                        value={selectedObj.geo || 'box'}
                                                        onChange={(e) => updateObject(selectedObj.id, { geo: e.target.value })}
                                                    >
                                                        <option value="box">Cube</option>
                                                        <option value="sphere">Sphere</option>
                                                        <option value="cylinder">Cylinder</option>
                                                        <option value="cone">Cone</option>
                                                        <option value="torus">Torus</option>
                                                        <option value="plane">Plane</option>
                                                    </select>
                                                    <span />
                                                </div>
                                                <SliderRow
                                                    label="Subdivision"
                                                    value={selectedObj.widthSegments || 1}
                                                    min={1}
                                                    max={32}
                                                    step={1}
                                                    onChange={(v) => updateObject(selectedObj.id, { widthSegments: Math.round(v), radialSegments: Math.max(3, Math.round(v * 2)) })}
                                                />
                                                <div className="inspector-field-label">Normals</div>
                                                <div className="inspector-vp-grid">
                                                    <button
                                                        type="button"
                                                        className={`inspector-pill-btn ${selectedObj.shadeSmooth ? 'inspector-pill-btn--active' : ''}`}
                                                        onClick={() => updateObject(selectedObj.id, { shadeSmooth: !selectedObj.shadeSmooth })}
                                                    >
                                                        Shade Smooth
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`inspector-pill-btn ${selectedObj.autoSmooth ? 'inspector-pill-btn--active' : ''}`}
                                                        onClick={() => updateObject(selectedObj.id, { autoSmooth: !selectedObj.autoSmooth })}
                                                    >
                                                        Auto Smooth
                                                    </button>
                                                </div>
                                                <SliderRow
                                                    label="Auto Smooth Angle"
                                                    value={Math.round(selectedObj.autoSmoothAngle ?? 30)}
                                                    min={0}
                                                    max={180}
                                                    step={1}
                                                    unit="°"
                                                    onChange={(v) => updateObject(selectedObj.id, { autoSmoothAngle: Math.round(v) })}
                                                />
                                            </div>
                                        ) : (
                                            <p className="inspector-context-hint">No dedicated object-data settings for this object type yet.</p>
                                        )}
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'world' && <PropertySection
                                        title="World"
                                        icon={SunIcon}
                                        colorClass="color-transform"
                                        isOpen={openSections.viewport}
                                        onToggle={() => toggleSection('viewport')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div className="inspector-field-label">Surface</div>
                                            <div className="inspector-vp-grid">
                                                <button type="button" className={`inspector-pill-btn ${environmentVisible ? 'inspector-pill-btn--active' : ''}`} onClick={() => setEnvironmentVisible(!environmentVisible)}>
                                                    Use World
                                                </button>
                                                <button type="button" className={`inspector-pill-btn ${lightingEnabled ? 'inspector-pill-btn--active' : ''}`} onClick={() => setLightingEnabled(!lightingEnabled)}>
                                                    Affect Lighting
                                                </button>
                                            </div>
                                            <SliderRow
                                                label="Strength"
                                                value={Math.round(worldStrength * 100) / 100}
                                                min={0}
                                                max={8}
                                                step={0.05}
                                                onChange={(v) => setWorldStrength(v)}
                                            />

                                            <div className="inspector-field-label">Volume</div>
                                            <div className="inspector-vp-grid">
                                                <button type="button" className={`inspector-pill-btn ${worldUseVolume ? 'inspector-pill-btn--active' : ''}`} onClick={() => setWorldUseVolume(!worldUseVolume)}>
                                                    Use Volume
                                                </button>
                                            </div>

                                            <div className="inspector-field-label">Mist Pass</div>
                                            <div className="inspector-vp-grid">
                                                <button type="button" className={`inspector-pill-btn ${worldUseMist ? 'inspector-pill-btn--active' : ''}`} onClick={() => setWorldUseMist(!worldUseMist)}>
                                                    Mist
                                                </button>
                                            </div>

                                            <div className="inspector-vp-sun">
                                                <div className="inspector-vp-sun__title">Sun</div>
                                                <div className="inspector-vp-sun__row">
                                                    <label>Lat<input type="number" step={0.01} value={Number.isFinite(sunLatitude) ? sunLatitude : 0} onChange={(e) => { const lat = parseFloat(e.target.value); setSunGeo(Number.isFinite(lat) ? lat : sunLatitude, sunLongitude); }} /></label>
                                                    <label>Lon<input type="number" step={0.01} value={Number.isFinite(sunLongitude) ? sunLongitude : 0} onChange={(e) => { const lon = parseFloat(e.target.value); setSunGeo(sunLatitude, Number.isFinite(lon) ? lon : sunLongitude); }} /></label>
                                                </div>
                                                <label className="inspector-vp-sun__range">Time<input type="range" min={0} max={1440} value={sunMinutesFromMidnight} onChange={(e) => setSunMinutesFromMidnight(Number(e.target.value))} /></label>
                                                <label className="inspector-vp-sun__range">Cloud<input type="range" min={0} max={1} step={0.02} value={sunCloudiness} onChange={(e) => setSunCloudiness(Number(e.target.value))} /></label>
                                            </div>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'scene' && <PropertySection
                                        title="Scene"
                                        icon={FolderIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.sceneTree}
                                        onToggle={() => toggleSection('sceneTree')}
                                    >
                                        <div className="inspector-scene-estimate">
                                            <span className="inspector-scene-estimate__label">Scene estimate</span>
                                            <strong className="inspector-scene-estimate__value">
                                                {sceneEstimate.currency} ${sceneEstimate.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                            </strong>
                                        </div>
                                        <div className="inspector-stack-gap inspector-stack-gap--mt8">
                                            <div className="inspector-field-label">Units</div>
                                            <div className="inspector-vp-grid">
                                                <button
                                                    type="button"
                                                    className="inspector-pill-btn inspector-pill-btn--active"
                                                    onClick={cycleDesignUnits}
                                                >
                                                    Length: {String(designUnits || 'metric').toUpperCase()}
                                                </button>
                                            </div>
                                            <div className="inspector-field-label">Gravity</div>
                                            <div className="inspector-vp-grid">
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${sceneUseGravity ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={() => setSceneUseGravity(!sceneUseGravity)}
                                                >
                                                    Use Gravity
                                                </button>
                                            </div>
                                            <div className="inspector-field-label">Simplify</div>
                                            <div className="inspector-vp-grid">
                                                <button
                                                    type="button"
                                                    className={`inspector-pill-btn ${sceneUseSimplify ? 'inspector-pill-btn--active' : ''}`}
                                                    onClick={() => setSceneUseSimplify(!sceneUseSimplify)}
                                                >
                                                    Use Simplify
                                                </button>
                                            </div>
                                            {sceneUseSimplify && (
                                                <>
                                                    <SliderRow
                                                        label="Viewport Subdivision"
                                                        value={sceneViewportSubdiv}
                                                        min={0}
                                                        max={6}
                                                        step={1}
                                                        onChange={(v) => setSceneViewportSubdiv(Math.round(v))}
                                                    />
                                                    <SliderRow
                                                        label="Render Subdivision"
                                                        value={sceneRenderSubdiv}
                                                        min={0}
                                                        max={8}
                                                        step={1}
                                                        onChange={(v) => setSceneRenderSubdiv(Math.round(v))}
                                                    />
                                                </>
                                            )}
                                        </div>
                                        <div className="scene-tree inspector-scene-tree--spaced">
                                            <TreeNode label="Root Scene" icon={FolderIcon} defaultOpen={true} depth={0}>
                                                {objects.length === 0 ? (
                                                    <div className="inspector-tree-empty">
                                                        <span className="inspector-tree-empty__text">No objects in scene</span>
                                                    </div>
                                                ) : (
                                                    renderSceneTree(null, 1)
                                                )}
                                            </TreeNode>
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'scene' && <PropertySection
                                        title="Collections"
                                        icon={FolderIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.projectActions}
                                        onToggle={() => toggleSection('projectActions')}
                                    >
                                        <div className="inspector-stack-gap">
                                            <div
                                                className="inspector-collection-rootdrop"
                                                onDragOver={(e) => {
                                                    e.preventDefault();
                                                    e.dataTransfer.dropEffect = 'move';
                                                }}
                                                onDrop={(e) => {
                                                    e.preventDefault();
                                                    const draggedId = e.dataTransfer.getData('text/plain') || dragCollectionId;
                                                    if (!draggedId) return;
                                                    setCollections((prev) => prev.map((c) => (
                                                        c.id === draggedId ? { ...c, parentId: null } : c
                                                    )));
                                                    setDragCollectionId(null);
                                                }}
                                            >
                                                Drop here for Scene Root
                                            </div>
                                            <div className="inspector-collection-tree">
                                                {collectionRows.map(({ collection: col, depth, hasChildren, isCollapsed }, idx) => (
                                                    <div
                                                        key={col.id}
                                                        className={`inspector-collection-tree__row ${activeCollectionId === col.id ? 'is-active' : ''} ${dragCollectionId === col.id ? 'is-dragging' : ''}`}
                                                        draggable
                                                        onClick={() => setActiveCollectionId(col.id)}
                                                        onDragStart={(e) => {
                                                            setDragCollectionId(col.id);
                                                            e.dataTransfer.effectAllowed = 'move';
                                                            e.dataTransfer.setData('text/plain', col.id);
                                                        }}
                                                        onDragEnd={() => setDragCollectionId(null)}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = 'move';
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            const draggedId = e.dataTransfer.getData('text/plain') || dragCollectionId;
                                                            if (!draggedId || draggedId === col.id) return;
                                                            const mapById = new Map(collections.map((c) => [c.id, c]));
                                                            let cursor = col.id;
                                                            while (cursor) {
                                                                if (cursor === draggedId) return;
                                                                cursor = mapById.get(cursor)?.parentId || null;
                                                            }
                                                            setCollections((prev) => prev.map((c) => (
                                                                c.id === draggedId ? { ...c, parentId: col.id } : c
                                                            )));
                                                            setDragCollectionId(null);
                                                        }}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="inspector-collection-tree__twist"
                                                            disabled={!hasChildren}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (!hasChildren) return;
                                                                setCollapsedCollectionIds((prev) => (
                                                                    prev.includes(col.id)
                                                                        ? prev.filter((id) => id !== col.id)
                                                                        : [...prev, col.id]
                                                                ));
                                                            }}
                                                        >
                                                            {hasChildren ? (isCollapsed ? '▸' : '▾') : '•'}
                                                        </button>
                                                        <span
                                                            className="inspector-collection-tree__name"
                                                            style={{ paddingLeft: `${Math.min(depth, 6) * 12}px` }}
                                                            title={col.name}
                                                        >
                                                            {col.name}
                                                        </span>
                                                        <span className="inspector-collection-tree__count" title="Objects in collection">
                                                            {collectionObjectCounts[col.name] || 0}
                                                        </span>
                                                        <div className="inspector-collection-tree__actions">
                                                            <button
                                                                type="button"
                                                                className={`scene-action-btn ${soloCollectionId === col.id ? 'is-active' : ''}`}
                                                                title={soloCollectionId === col.id ? 'Exit solo' : 'Solo collection'}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSoloCollectionId((prev) => (prev === col.id ? null : col.id));
                                                                }}
                                                            >
                                                                S
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="scene-action-btn"
                                                                title="Move selected object here"
                                                                disabled={!selectedObj}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!selectedObj) return;
                                                                    updateObject(selectedObj.id, { collectionName: col.name }, true);
                                                                }}
                                                            >
                                                                +
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="scene-action-btn"
                                                                title="Move up"
                                                                disabled={idx === 0}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (idx === 0) return;
                                                                    setCollections((prev) => {
                                                                        const next = [...prev];
                                                                        const fromId = col.id;
                                                                        const toId = collectionRows[idx - 1]?.collection?.id;
                                                                        const fromIndex = next.findIndex((c) => c.id === fromId);
                                                                        const toIndex = next.findIndex((c) => c.id === toId);
                                                                        if (fromIndex < 0 || toIndex < 0) return prev;
                                                                        [next[toIndex], next[fromIndex]] = [next[fromIndex], next[toIndex]];
                                                                        return next;
                                                                    });
                                                                }}
                                                            >
                                                                ▲
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="scene-action-btn"
                                                                title="Move down"
                                                                disabled={idx >= collectionRows.length - 1}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (idx >= collectionRows.length - 1) return;
                                                                    setCollections((prev) => {
                                                                        const next = [...prev];
                                                                        const fromId = col.id;
                                                                        const toId = collectionRows[idx + 1]?.collection?.id;
                                                                        const fromIndex = next.findIndex((c) => c.id === fromId);
                                                                        const toIndex = next.findIndex((c) => c.id === toId);
                                                                        if (fromIndex < 0 || toIndex < 0) return prev;
                                                                        [next[toIndex], next[fromIndex]] = [next[fromIndex], next[toIndex]];
                                                                        return next;
                                                                    });
                                                                }}
                                                            >
                                                                ▼
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="inspector-vp-grid">
                                                <button
                                                    type="button"
                                                    className="inspector-pill-btn"
                                                    onClick={() => {
                                                        const id = `col_${Date.now()}`;
                                                        const name = `Collection ${collections.length + 1}`;
                                                        setCollections((prev) => [
                                                            ...prev,
                                                            {
                                                                id,
                                                                name,
                                                                parentId: activeCollection?.id || null,
                                                                visible: true,
                                                                holdout: false,
                                                                indirectOnly: false,
                                                            },
                                                        ]);
                                                        setActiveCollectionId(id);
                                                    }}
                                                >
                                                    New Collection
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inspector-pill-btn"
                                                    disabled={!activeCollection}
                                                    onClick={() => {
                                                        if (!activeCollection) return;
                                                        const next = prompt('Rename collection', activeCollection.name);
                                                        if (!next || !next.trim()) return;
                                                        setCollections((prev) => prev.map((c) => c.id === activeCollection.id ? { ...c, name: next.trim() } : c));
                                                    }}
                                                >
                                                    Rename
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inspector-pill-btn"
                                                    disabled={!selectedObj || !activeCollection}
                                                    onClick={() => {
                                                        if (!selectedObj || !activeCollection) return;
                                                        updateObject(selectedObj.id, { collectionName: activeCollection.name }, true);
                                                    }}
                                                >
                                                    Move Selected Here
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inspector-pill-btn"
                                                    disabled={!activeCollection || objects.length === 0}
                                                    onClick={() => {
                                                        if (!activeCollection) return;
                                                        objects.forEach((obj) => {
                                                            if (hiddenObjectIds.includes(obj.id)) return;
                                                            updateObject(obj.id, { collectionName: activeCollection.name }, true);
                                                        });
                                                    }}
                                                >
                                                    Move Visible Here
                                                </button>
                                                <button
                                                    type="button"
                                                    className="inspector-pill-btn"
                                                    disabled={!activeCollection || objects.length === 0}
                                                    onClick={() => {
                                                        if (!activeCollection) return;
                                                        objects.forEach((obj) => {
                                                            if (lockedObjectIds.includes(obj.id) || obj.locked) return;
                                                            updateObject(obj.id, { collectionName: activeCollection.name }, true);
                                                        });
                                                    }}
                                                >
                                                    Move Unlocked Here
                                                </button>
                                            </div>
                                            {activeCollection && (
                                                <div className="inspector-stack-gap">
                                                    <label className="inspector-field-label inspector-field-label--tight">Parent collection</label>
                                                    <select
                                                        className="props-select-field"
                                                        value={activeCollection.parentId || ''}
                                                        onChange={(e) => {
                                                            const nextParent = e.target.value || null;
                                                            if (nextParent === activeCollection.id) return;
                                                            let cursor = nextParent;
                                                            while (cursor) {
                                                                if (cursor === activeCollection.id) return;
                                                                cursor = collections.find((c) => c.id === cursor)?.parentId || null;
                                                            }
                                                            setCollections((prev) => prev.map((c) => (
                                                                c.id === activeCollection.id ? { ...c, parentId: nextParent } : c
                                                            )));
                                                        }}
                                                    >
                                                        <option value="">Scene Root</option>
                                                        {collections
                                                            .filter((c) => c.id !== activeCollection.id)
                                                            .map((c) => (
                                                                <option key={c.id} value={c.id}>{c.name}</option>
                                                            ))}
                                                    </select>
                                                </div>
                                            )}

                                            {activeCollection && (
                                                <>
                                                    <div className="inspector-vp-grid">
                                                        <button
                                                            type="button"
                                                            className={`inspector-pill-btn ${activeCollection.visible ? 'inspector-pill-btn--active' : ''}`}
                                                            onClick={() => {
                                                                setCollections((prev) => prev.map((c) => c.id === activeCollection.id ? { ...c, visible: !c.visible } : c));
                                                            }}
                                                        >
                                                            Visible
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`inspector-pill-btn ${activeCollection.holdout ? 'inspector-pill-btn--active' : ''}`}
                                                            onClick={() => {
                                                                setCollections((prev) => prev.map((c) => c.id === activeCollection.id ? { ...c, holdout: !c.holdout } : c));
                                                            }}
                                                        >
                                                            Holdout
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className={`inspector-pill-btn ${activeCollection.indirectOnly ? 'inspector-pill-btn--active' : ''}`}
                                                            onClick={() => {
                                                                setCollections((prev) => prev.map((c) => c.id === activeCollection.id ? { ...c, indirectOnly: !c.indirectOnly } : c));
                                                            }}
                                                        >
                                                            Indirect Only
                                                        </button>
                                                    </div>
                                                    <div className="inspector-collection-members">
                                                        <div className="inspector-field-label">Members</div>
                                                        {objectsInActiveCollection.length === 0 ? (
                                                            <div className="inspector-context-hint">No objects in this collection.</div>
                                                        ) : (
                                                            <div className="inspector-collection-members__list">
                                                                {objectsInActiveCollection.map((o) => (
                                                                    <button
                                                                        key={o.id}
                                                                        type="button"
                                                                        className={`inspector-pill-btn ${selectedId === o.id ? 'inspector-pill-btn--active' : ''}`}
                                                                        onClick={() => setSelectedId(o.id)}
                                                                    >
                                                                        {o.name || o.type}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Custom Properties"
                                        icon={Bars3CenterLeftIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.customProps}
                                        onToggle={() => toggleSection('customProps')}
                                    >
                                        <BlenderCustomPropsPanel selectedObj={selectedObj} updateObject={updateObject} />
                                    </PropertySection>}

                                    {inspectorTab === 'item' && activeItemContextTab === 'object' && <PropertySection
                                        title="Branding"
                                        icon={SparklesIcon}
                                        colorClass="color-branding"
                                        isOpen={openSections.branding}
                                        onToggle={() => toggleSection('branding')}
                                    >
                                        <label className="inspector-file-field">
                                            <span className="inspector-file-field__text">Surface logo</span>
                                            <input type="file" accept="image/*" className="inspector-file-field__input" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file && selectedObj) {
                                                    const url = URL.createObjectURL(file);
                                                    updateObject(selectedObj.id, { logoUrl: url, logoName: file.name });
                                                }
                                            }} />
                                        </label>
                                        {selectedObj.logoName && (
                                            <div className="inspector-logo-row">
                                                <span className="inspector-logo-row__ok" aria-hidden>✓</span>
                                                <span className="inspector-logo-row__name">{selectedObj.logoName}</span>
                                                <button type="button" className="inspector-logo-row__clear" onClick={() => updateObject(selectedObj.id, { logoUrl: null, logoName: null })}>Clear</button>
                                            </div>
                                        )}
                                        <button type="button" className="inspector-btn inspector-btn--secondary" onClick={() => {
                                            if (selectedObj) {
                                                updateObject(selectedObj.id, { name: `${selectedObj.name || 'Object'} (Branded)` });
                                            }
                                        }}>
                                            Append "Branded" to name
                                        </button>
                                    </PropertySection>}
                                </>
                            )}
                        </div>}

                        {inspectorTab === 'view' && <PropertySection
                            title="Viewport"
                            icon={ArrowsPointingOutIcon}
                            colorClass="color-transform"
                            isOpen={openSections.viewport}
                            onToggle={() => toggleSection('viewport')}
                        >
                            <div className="inspector-vp-panel inspector-vp-panel--hero">
                                <div className="inspector-vp-panel__head">Visual controls</div>
                                <div className="inspector-vp-grid">
                                    <button type="button" className={`inspector-pill-btn ${smartZoomEnabled ? 'inspector-pill-btn--active' : ''}`} onClick={() => setSmartZoomEnabled(!smartZoomEnabled)}>
                                        Zoom {smartZoomEnabled ? 'On' : 'Off'}
                                    </button>
                                    <button type="button" className={`inspector-pill-btn ${environmentVisible ? 'inspector-pill-btn--active' : ''}`} onClick={() => setEnvironmentVisible(!environmentVisible)}>
                                        World {environmentVisible ? 'On' : 'Off'}
                                    </button>
                                    <button type="button" className={`inspector-pill-btn ${layoutEnabled ? 'inspector-pill-btn--active' : ''}`} onClick={() => setLayoutEnabled(!layoutEnabled)}>
                                        Layout {layoutEnabled ? 'On' : 'Off'}
                                    </button>
                                    <button type="button" className={`inspector-pill-btn ${viewportNavMode === 'walk' ? 'inspector-pill-btn--active' : ''}`} onClick={() => setViewportNavMode(viewportNavMode === 'walk' ? 'orbit' : 'walk')}>
                                        Walk {viewportNavMode === 'walk' ? 'On' : 'Off'}
                                    </button>
                                    <button type="button" className={`inspector-pill-btn ${materialPaintMode ? 'inspector-pill-btn--active' : ''}`} onClick={() => setMaterialPaintMode(!materialPaintMode)}>
                                        Paint {materialPaintMode ? 'On' : 'Off'}
                                    </button>
                                    <button type="button" className={`inspector-pill-btn ${webgpuPathTraceRequested ? 'inspector-pill-btn--active' : ''}`} onClick={() => setWebgpuPathTraceRequested(!webgpuPathTraceRequested)}>
                                        WebGPU {webgpuPathTraceRequested ? 'On' : 'Off'}
                                    </button>
                                </div>
                                {!environmentVisible && (
                                    <div className="inspector-vp-sun">
                                        <div className="inspector-vp-sun__title">Sun</div>
                                        <div className="inspector-vp-sun__row">
                                            <label>Lat<input type="number" step={0.01} value={Number.isFinite(sunLatitude) ? sunLatitude : 0} onChange={(e) => { const lat = parseFloat(e.target.value); setSunGeo(Number.isFinite(lat) ? lat : sunLatitude, sunLongitude); }} /></label>
                                            <label>Lon<input type="number" step={0.01} value={Number.isFinite(sunLongitude) ? sunLongitude : 0} onChange={(e) => { const lon = parseFloat(e.target.value); setSunGeo(sunLatitude, Number.isFinite(lon) ? lon : sunLongitude); }} /></label>
                                        </div>
                                        <label className="inspector-vp-sun__range">Time<input type="range" min={0} max={1440} value={sunMinutesFromMidnight} onChange={(e) => setSunMinutesFromMidnight(Number(e.target.value))} /></label>
                                        <label className="inspector-vp-sun__range">Cloud<input type="range" min={0} max={1} step={0.02} value={sunCloudiness} onChange={(e) => setSunCloudiness(Number(e.target.value))} /></label>
                                    </div>
                                )}
                            </div>
                        </PropertySection>}

                        {inspectorTab === 'view' && <PropertySection
                            title="View"
                            icon={EyeIcon}
                            colorClass="color-transform"
                            isOpen={openSections.rendering}
                            onToggle={() => toggleSection('rendering')}
                        >
                            <div className="inspector-stack-gap">
                                <SliderRow
                                    label="Focal Length"
                                    value={viewLensMm}
                                    min={1}
                                    max={250}
                                    step={1}
                                    unit="mm"
                                    onChange={(v) => setViewLensMm(Math.round(v))}
                                />
                                <div className="inspector-customprop-row">
                                    <label className="inspector-field-label inspector-field-label--tight">Clip Start</label>
                                    <input
                                        type="number"
                                        step="0.001"
                                        className="props-input-field"
                                        value={viewClipStart}
                                        onChange={(e) => setViewClipStart(Math.max(0.001, parseFloat(e.target.value) || 0.01))}
                                    />
                                    <span />
                                </div>
                                <div className="inspector-customprop-row">
                                    <label className="inspector-field-label inspector-field-label--tight">Clip End</label>
                                    <input
                                        type="number"
                                        step="1"
                                        className="props-input-field"
                                        value={viewClipEnd}
                                        onChange={(e) => setViewClipEnd(Math.max(viewClipStart + 1, parseFloat(e.target.value) || 1000))}
                                    />
                                    <span />
                                </div>
                                <div className="inspector-vp-grid">
                                    <button
                                        type="button"
                                        className={`inspector-pill-btn ${viewLockCursor ? 'inspector-pill-btn--active' : ''}`}
                                        onClick={() => setViewLockCursor(!viewLockCursor)}
                                    >
                                        Lock to 3D Cursor
                                    </button>
                                    <button
                                        type="button"
                                        className="inspector-pill-btn"
                                        onClick={() => {
                                            useStore.getState().setSpawnAtThreeDCursor(!useStore.getState().spawnAtThreeDCursor);
                                            showToast(`Spawn at 3D cursor ${useStore.getState().spawnAtThreeDCursor ? 'enabled' : 'disabled'}.`, 'info');
                                        }}
                                    >
                                        Use Cursor For Spawn
                                    </button>
                                </div>
                            </div>
                        </PropertySection>}

                        {inspectorTab === 'view' && <PropertySection
                            title="Project & Scene"
                            icon={WrenchScrewdriverIcon}
                            colorClass="color-branding"
                            isOpen={openSections.projectActions}
                            onToggle={() => toggleSection('projectActions')}
                        >
                            <div className="inspector-project-stack">
                                <div className="inspector-scene-estimate">
                                    <span className="inspector-scene-estimate__label">Scene estimate</span>
                                    <strong className="inspector-scene-estimate__value">
                                        {sceneEstimate.currency} ${sceneEstimate.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </strong>
                                </div>
                                <button
                                    type="button"
                                    className="inspector-project-toggle"
                                    onClick={() => setLightingEnabled(!lightingEnabled)}
                                >
                                    <span className="inspector-project-toggle__left">
                                        <LightBulbIcon className="inspector-project-toggle__icon" style={{ color: lightingEnabled ? '#facc15' : undefined }} aria-hidden />
                                        <span>Scene lighting</span>
                                    </span>
                                    <div className={`rp-toggle inspector-project-toggle__switch ${lightingEnabled ? 'on' : ''}`}>
                                        <div className="rp-toggle-knob" />
                                    </div>
                                </button>
                                <div className="inspector-rule" />
                                <div className="inspector-pill-grid">
                                    <button
                                        type="button"
                                        className={`inspector-pill-btn ${measurementsEnabled ? 'inspector-pill-btn--active' : ''}`}
                                        onClick={() => setMeasurementsEnabled(!measurementsEnabled)}
                                    >
                                        <ArrowsPointingOutIcon className="inspector-icon-sm" aria-hidden />
                                        {measurementsEnabled ? 'Measures on' : 'Measures'}
                                    </button>
                                    <button
                                        type="button"
                                        className="inspector-pill-btn inspector-pill-btn--solid"
                                        onClick={() => {
                                            const objs = useStore.getState().objects.filter(o => o.type !== 'ground');
                                            const count = objs.length;
                                            const lights = objs.filter(o => o.type === 'light').length;
                                            const models = objs.filter(o => o.type === 'gltf' || o.type === 'stl' || o.type === 'sketchfab').length;
                                            showToast(
                                                `Scene estimate: ${count} objects · ${models} imported · ${lights} lights · ${count - models - lights} primitives`,
                                                'info'
                                            );
                                        }}
                                    >
                                        <CheckCircleIcon className="inspector-icon-sm" aria-hidden />
                                        Summary
                                    </button>
                                </div>
                            </div>
                        </PropertySection>}

                        {(inspectorTab === 'tool' || inspectorTab === 'create') && <div className="inspector-tools-wrap">
                            <SidebarTools />
                        </div>}
                            </div>
                            <div className="blender-npanel-rail" role="tablist" aria-label="N panel tabs">
                                {[
                                    { id: 'item', label: 'Item' },
                                    { id: 'tool', label: 'Tool' },
                                    { id: 'view', label: 'View' },
                                    { id: 'create', label: 'Create' },
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        role="tab"
                                        aria-selected={inspectorTab === tab.id}
                                        className={`blender-npanel-rail__tab ${inspectorTab === tab.id ? 'is-active' : ''}`}
                                        onClick={() => setInspectorTab(tab.id)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
