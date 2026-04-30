import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import {
    RectangleStackIcon,
    ViewColumnsIcon,
    InformationCircleIcon,
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    TrashIcon,
    ChevronRightIcon,
} from '@heroicons/react/24/outline';
import useStore from '../../store/useStore';
import { showToast } from '../../utils/noviraToast';
import {
    dispatchPlannerInsertArcWalls,
    dispatchPlannerInsertRectRoomWalls,
    dispatchPlannerSelectDrawingHole,
    dispatchPlannerSnapCloseWallGap,
    dispatchRefreshPlannerRoomZones,
} from '../../utils/plannerReduxBridge';

import '../../styles/pro-editor.css';

export default function EditorHeader() {
    const navigate = useNavigate();
    const projectName = useStore(s => s.projectName);
    const isSaving = useStore(s => s.isSaving);
    const editorTab = useStore(s => s.editorTab);
    const setEditorTab = useStore(s => s.setEditorTab);
    const uiSimpleMode = useStore(s => s.uiSimpleMode);
    const toggleUiSimpleMode = useStore(s => s.toggleUiSimpleMode);
    const environmentVisible = useStore(s => s.environmentVisible);
    const gridVisible = useStore(s => s.gridVisible);
    const setEnvironmentVisible = useStore(s => s.setEnvironmentVisible);
    const setGridVisible = useStore(s => s.setGridVisible);
    const {
        studioLeftOpen,
        studioRightOpen,
        toggleStudioLeftOpen,
        toggleStudioRightOpen,
        studioViewLayout,
    } = useStore(
        useShallow((s) => ({
            studioLeftOpen: s.studioLeftOpen,
            studioRightOpen: s.studioRightOpen,
            toggleStudioLeftOpen: s.toggleStudioLeftOpen,
            toggleStudioRightOpen: s.toggleStudioRightOpen,
            studioViewLayout: s.studioViewLayout,
        }))
    );
    const showSceneChrome = studioViewLayout === 'scene' || studioViewLayout === 'split';
    const [openMenu, setOpenMenu] = useState(null);
    const [openSubmenuKey, setOpenSubmenuKey] = useState(null);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenu(null);
                setOpenSubmenuKey(null);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const captureScreenshot = () => {
        const canvas = document.querySelector('canvas');
        if (!canvas) return;
        const link = document.createElement('a');
        link.download = `${projectName || 'novira-render'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const saveWorkspaceLayoutPreset = () => {
        try {
            const s = useStore.getState();
            const payload = {
                studioViewLayout: s.studioViewLayout,
                studioLeftOpen: s.studioLeftOpen !== false,
                studioRightOpen: s.studioRightOpen !== false,
                catalogDockMode: s.catalogDockMode === 'footer' ? 'footer' : 'sidebar',
                leftSidebarWidth: Number(localStorage.getItem('novira_left_sidebar_width_v1') || 260),
                rightSidebarWidth: Number(localStorage.getItem('novira_right_sidebar_width_v1') || 240),
                splitRatio: Number(localStorage.getItem('novira_split_ratio_v1') || 0.42),
            };
            localStorage.setItem('novira_workspace_layout_preset_v1', JSON.stringify(payload));
            showToast('Workspace layout saved.', 'ok');
        } catch {
            showToast('Could not save workspace layout.', 'warn');
        }
    };

    const applyWorkspaceLayoutPreset = (reset = false) => {
        try {
            const s = useStore.getState();
            const fallback = {
                studioViewLayout: 'scene',
                studioLeftOpen: true,
                studioRightOpen: true,
                catalogDockMode: 'sidebar',
                leftSidebarWidth: 260,
                rightSidebarWidth: 240,
                splitRatio: 0.42,
            };
            const raw = !reset ? localStorage.getItem('novira_workspace_layout_preset_v1') : null;
            const loaded = raw ? JSON.parse(raw) : null;
            const layout = loaded && typeof loaded === 'object' ? { ...fallback, ...loaded } : fallback;

            s.setStudioViewLayout(
                layout.studioViewLayout === 'plan' ||
                layout.studioViewLayout === 'split' ||
                layout.studioViewLayout === 'elevation'
                    ? layout.studioViewLayout
                    : 'scene'
            );
            s.setStudioLeftOpen(layout.studioLeftOpen !== false);
            s.setStudioRightOpen(layout.studioRightOpen !== false);
            s.setCatalogDockMode(layout.catalogDockMode === 'footer' ? 'footer' : 'sidebar');
            localStorage.setItem('novira_left_sidebar_width_v1', String(Math.max(200, Math.min(480, Number(layout.leftSidebarWidth) || 260))));
            localStorage.setItem('novira_right_sidebar_width_v1', String(Math.max(220, Math.min(460, Number(layout.rightSidebarWidth) || 240))));
            localStorage.setItem('novira_split_ratio_v1', String(Math.max(0.28, Math.min(0.72, Number(layout.splitRatio) || 0.42))));
            window.dispatchEvent(new CustomEvent('novira:workspace-layout-applied'));
            showToast(reset ? 'Workspace reset to defaults.' : 'Workspace layout restored.', 'ok');
        } catch {
            showToast('Could not restore workspace layout.', 'warn');
        }
    };

    const menuDefs = {
        File: [
            {
                label: 'Project',
                children: [
                    { type: 'header', label: 'Start' },
                    { label: 'New Project', action: () => navigate('/dashboard'), shortcut: '' },
                    {
                        label: 'New from template…',
                        action: () => document.dispatchEvent(new CustomEvent('novira:open-template-gallery')),
                        shortcut: '',
                    },
                    { label: 'Save', action: () => useStore.getState().saveProject(), shortcut: 'Ctrl+S' },
                ],
            },
            {
                label: 'Export',
                children: [
                    { type: 'header', label: 'Outputs' },
                    { label: 'Screenshot (PNG)', action: captureScreenshot, shortcut: 'Ctrl+Shift+S' },
                    { label: 'Export Scene (GLB/GLTF)', action: () => document.dispatchEvent(new CustomEvent('novira:open-export-panel')), shortcut: 'Ctrl+E' },
                ],
            },
        ],
        Edit: [
            { label: 'Undo', action: () => { useStore.getState().editorUndo(); }, shortcut: 'Ctrl+Z / Cmd+Z' },
            { label: 'Redo', action: () => { useStore.getState().editorRedo(); }, shortcut: 'Ctrl+Y · Ctrl+Shift+Z' },
            { type: 'sep' },
            {
                label: 'Clipboard',
                children: [
                    { type: 'header', label: 'Clipboard' },
                    { label: 'Copy', action: () => useStore.getState().copySelected(), shortcut: 'Ctrl+C' },
                    { label: 'Paste', action: () => useStore.getState().pasteClipboard(), shortcut: 'Ctrl+V' },
                    { label: 'Duplicate', action: () => useStore.getState().duplicateSelected(), shortcut: 'Ctrl+D' },
                    { label: 'Delete', action: () => useStore.getState().deleteSelected(), shortcut: 'Del' },
                ],
            },
            {
                label: 'Selection',
                children: [
                    { type: 'header', label: 'Hierarchy' },
                    { label: 'Select All', action: () => useStore.getState().selectAll(), shortcut: 'Ctrl+A' },
                    { label: 'Group', action: () => useStore.getState().groupSelected(), shortcut: 'Ctrl+G' },
                    { label: 'Ungroup', action: () => useStore.getState().ungroupSelected(), shortcut: 'Ctrl+Shift+G' },
                ],
            },
            { type: 'sep' },
            { label: 'Find in Scene...', action: () => document.dispatchEvent(new CustomEvent('novira:open-scene-search')), shortcut: 'Ctrl+Shift+F' },
            { label: 'Command Palette...', action: () => useStore.getState().setShowCommandPalette(true), shortcut: 'Ctrl+K' },
        ],
        View: [
            {
                label: 'Workspace',
                children: [
                    { label: '2D Floor Plan', action: () => useStore.getState().setStudioViewLayout('plan'), shortcut: '' },
                    { label: 'Split View (2D + 3D)', action: () => useStore.getState().setStudioViewLayout('split'), shortcut: '' },
                    { label: '3D Scene', action: () => useStore.getState().setStudioViewLayout('scene'), shortcut: '' },
                    { label: 'Elevation (wall heights)', action: () => useStore.getState().setStudioViewLayout('elevation'), shortcut: '' },
                ],
            },
            {
                label: 'Planner tools',
                children: [
                    { type: 'header', label: 'Trace & guided picks' },
                    {
                        label: 'Open trace import panel',
                        action: () => {
                            useStore.getState().setStudioViewLayout('plan');
                            requestAnimationFrame(() => {
                                document.dispatchEvent(new CustomEvent('novira:planner-open-trace-details'));
                            });
                            showToast('Trace — import PNG/JPEG; opacity saves per story.', 'ok');
                        },
                        shortcut: '',
                    },
                    {
                        label: 'Pick rectangle corners (2 clicks)',
                        action: () => {
                            useStore.getState().setStudioViewLayout('plan');
                            requestAnimationFrame(() => {
                                document.dispatchEvent(new CustomEvent('novira:planner-rect-pick-corners'));
                            });
                            showToast('Click two opposite corners — then Insert closed rectangle (or enable auto-insert in the panel).', 'ok');
                        },
                        shortcut: '',
                    },
                    {
                        label: 'Pick arc center (click)',
                        action: () => {
                            useStore.getState().setStudioViewLayout('plan');
                            requestAnimationFrame(() => {
                                document.dispatchEvent(new CustomEvent('novira:planner-arc-pick-center'));
                            });
                            showToast('Click the plan once for arc center. Esc cancels.', 'ok');
                        },
                        shortcut: '',
                    },
                    { type: 'header', label: 'Wall openings' },
                    {
                        label: 'Door on wall',
                        action: () => {
                            useStore.getState().setStudioViewLayout('plan');
                            requestAnimationFrame(() => {
                                const r = dispatchPlannerSelectDrawingHole('door');
                                if (!r.ok) showToast('Planner not ready — open 2D plan first.', 'warn');
                                else showToast('Door — click a wall segment.', 'ok');
                            });
                        },
                        shortcut: '',
                    },
                    {
                        label: 'Window on wall',
                        action: () => {
                            useStore.getState().setStudioViewLayout('plan');
                            requestAnimationFrame(() => {
                                const r = dispatchPlannerSelectDrawingHole('window');
                                if (!r.ok) showToast('Planner not ready — open 2D plan first.', 'warn');
                                else showToast('Window — click a wall segment.', 'ok');
                            });
                        },
                        shortcut: '',
                    },
                    { type: 'header', label: 'Rooms & geometry helpers' },
                    {
                        label: 'Insert sample rectangle room',
                        action: () => {
                            const s = useStore.getState();
                            s.setStudioViewLayout('plan');
                            const r = dispatchPlannerInsertRectRoomWalls({
                                x: 220,
                                y: 200,
                                widthCm: 500,
                                heightCm: 400,
                            });
                            if (!r.ok) {
                                showToast('Rectangle room failed — open plan tab or add one wall for wall type.', 'warn');
                                return;
                            }
                            try {
                                s.persistActivePlannerStory();
                            } catch {
                                /* ignore */
                            }
                            const z = dispatchRefreshPlannerRoomZones();
                            const n = z.ok ? z.areaCount ?? 0 : 0;
                            showToast(`Rectangle room inserted (${r.segments} walls). Room zones: ${n}.`, 'ok');
                        },
                        shortcut: '',
                    },
                    {
                        label: 'Insert 90° arc walls',
                        action: () => {
                            const s = useStore.getState();
                            s.setStudioViewLayout('plan');
                            const r = dispatchPlannerInsertArcWalls({
                                cx: 420,
                                cy: 380,
                                radiusCm: 200,
                                startDeg: 0,
                                sweepDeg: 90,
                                segments: 16,
                            });
                            if (!r.ok) {
                                showToast('Arc insert failed — add one wall first for wall type.', 'warn');
                                return;
                            }
                            try {
                                s.persistActivePlannerStory();
                            } catch {
                                /* ignore */
                            }
                            showToast(`Arc walls inserted (${r.segments} segments).`, 'ok');
                        },
                        shortcut: '',
                    },
                    {
                        label: 'Snap-close wall gap',
                        action: () => {
                            const s = useStore.getState();
                            s.setStudioViewLayout('plan');
                            const r = dispatchPlannerSnapCloseWallGap({ maxGap: 85 });
                            if (!r.ok) {
                                showToast('No snap pair found — check open ends.', 'warn');
                                return;
                            }
                            try {
                                s.persistActivePlannerStory();
                            } catch {
                                /* ignore */
                            }
                            showToast('Closing wall added.', 'ok');
                        },
                        shortcut: '',
                    },
                    {
                        label: 'Detect room zones',
                        action: () => {
                            const s = useStore.getState();
                            s.setStudioViewLayout('plan');
                            const r = dispatchRefreshPlannerRoomZones();
                            if (!r.ok) {
                                showToast('Planner not ready or no layer.', 'warn');
                                return;
                            }
                            try {
                                s.persistActivePlannerStory();
                            } catch {
                                /* ignore */
                            }
                            showToast(`Room scan done (${r.areaCount ?? 0} zones on layer).`, 'ok');
                        },
                        shortcut: '',
                    },
                    { type: 'header', label: 'Templates' },
                    {
                        label: 'Template gallery…',
                        action: () => {
                            useStore.getState().setStudioViewLayout('plan');
                            document.dispatchEvent(new CustomEvent('novira:open-template-gallery'));
                        },
                        shortcut: '',
                    },
                ],
            },
            {
                label: 'Scene camera',
                children: [
                    { type: 'header', label: 'Bookmarks' },
                    {
                        label: 'Save 3D camera bookmark',
                        action: () => document.dispatchEvent(new CustomEvent('novira:save-scene-camera')),
                        shortcut: '',
                    },
                ],
            },
            {
                label: '3D viewport overlays',
                children: [
                    { type: 'header', label: 'Display' },
                    { label: 'Toggle Grid', action: () => { const s = useStore.getState(); s.setGridVisible(!s.gridVisible); }, shortcut: '' },
                    { label: 'Toggle Environment', action: () => { const s = useStore.getState(); s.setEnvironmentVisible(!s.environmentVisible); }, shortcut: '' },
                ],
            },
            {
                label: 'Assist previews',
                children: [
                    { type: 'header', label: 'Scene assist' },
                    {
                        label: 'Terrain strip (3D)',
                        action: () => {
                            useStore.getState().appendTerrainAssistStrip();
                            showToast('Terrain strip added to the 3D scene. GIS / heightmap import is on the roadmap.', 'ok');
                        },
                        shortcut: '',
                    },
                    {
                        label: 'Roof pitched slabs (3D)',
                        action: () => {
                            useStore.getState().appendRoofAssistPreview();
                            showToast('Roof slabs added (Roof ° in plan bar). Full truss solver is staged.', 'ok');
                        },
                        shortcut: '',
                    },
                    { type: 'header', label: 'Interop' },
                    {
                        label: 'SketchUp import (via GLB)…',
                        action: () => {
                            document.dispatchEvent(new CustomEvent('novira:open-export-panel'));
                            document.dispatchEvent(
                                new CustomEvent('novira:export-toast', {
                                    detail: {
                                        message:
                                            'Export GLB, then in SketchUp use File → Import. Live Trimble Connect sync is still on the integration roadmap.',
                                    },
                                })
                            );
                        },
                        shortcut: '',
                    },
                ],
            },
        ],
        Render: [
            {
                label: 'Still & motion',
                children: [
                    { type: 'header', label: 'Raster / video' },
                    { label: 'Screenshot PNG', action: captureScreenshot, shortcut: 'Ctrl+Shift+S' },
                    { label: 'Export 4K still (PNG)', action: () => {
                        const s = useStore.getState();
                        const safe = (s.projectName || 'novira-render').replace(/[^\w\-]+/g, '_');
                        document.dispatchEvent(new CustomEvent('novira:capture-highres', { detail: { resolution: '3840x2160', filename: `${safe}-3840x2160.png` } }));
                    }, shortcut: '' },
                    { label: 'Record walkthrough (WebM)', action: () => {
                        const s = useStore.getState();
                        const safe = (s.projectName || 'novira-walkthrough').replace(/[^\w\-]+/g, '_');
                        document.dispatchEvent(new CustomEvent('novira:record-viewport', { detail: { seconds: 12, filename: `${safe}-${Date.now()}.webm` } }));
                    }, shortcut: '' },
                ],
            },
            {
                label: '360° exports',
                children: [
                    { type: 'header', label: 'Panorama' },
                    { label: 'Cubemap faces (ZIP)', action: () => {
                        const s = useStore.getState();
                        const safe = (s.projectName || 'novira-360').replace(/[^\w\-]+/g, '_');
                        document.dispatchEvent(new CustomEvent('novira:export-cubemap', { detail: { size: 1024, center: [0, 2.4, 6], projectName: safe } }));
                    }, shortcut: '' },
                    { label: 'Equirectangular (PNG)', action: () => {
                        const s = useStore.getState();
                        const safe = (s.projectName || 'novira-360').replace(/[^\w\-]+/g, '_');
                        document.dispatchEvent(new CustomEvent('novira:export-equirectangular', { detail: { cubeFaceSize: 512, center: [0, 2.4, 6], projectName: safe } }));
                    }, shortcut: '' },
                ],
            },
            {
                label: 'Reports & immersion',
                children: [
                    { type: 'header', label: 'Docs / XR' },
                    { label: 'Technical summary (print/PDF)', action: () => document.dispatchEvent(new CustomEvent('novira:export-technical-report')), shortcut: '' },
                    { label: 'Enter immersive VR (WebXR)', action: () => document.dispatchEvent(new CustomEvent('novira:webxr-enter-vr')), shortcut: '' },
                ],
            },
            {
                label: 'Mesh export',
                children: [
                    { type: 'header', label: 'Scene file' },
                    { label: 'Export Scene (GLB)...', action: () => document.dispatchEvent(new CustomEvent('novira:open-export-panel')), shortcut: 'Ctrl+E' },
                ],
            },
            {
                label: 'Viewport overlays',
                children: [
                    { type: 'header', label: 'Display' },
                    { label: 'Toggle Grid', action: () => { const s = useStore.getState(); s.setGridVisible(!s.gridVisible); }, shortcut: '' },
                    { label: 'Toggle Environment', action: () => { const s = useStore.getState(); s.setEnvironmentVisible(!s.environmentVisible); }, shortcut: '' },
                ],
            },
        ],
        Window: [
            {
                label: 'Sidebar tabs',
                children: [
                    { type: 'header', label: 'Workspace panels' },
                    { label: 'Objects & Assets', action: () => setEditorTab('Objects & Assets') },
                    { label: 'Layout', action: () => setEditorTab('Layout') },
                    { label: 'Modeling', action: () => setEditorTab('Modeling') },
                    { label: 'Shading', action: () => setEditorTab('Shading') },
                    { label: 'Lighting', action: () => setEditorTab('Lighting') },
                    { label: 'Rendering', action: () => setEditorTab('Rendering') },
                ],
            },
            {
                label: 'Layout presets',
                children: [
                    { type: 'header', label: 'Save / restore' },
                    { label: 'Save workspace layout', action: saveWorkspaceLayoutPreset },
                    { label: 'Restore workspace layout', action: () => applyWorkspaceLayoutPreset(false) },
                    { label: 'Reset workspace layout', action: () => applyWorkspaceLayoutPreset(true) },
                ],
            },
        ],
        Help: [
            {
                label: 'Learn',
                children: [
                    { type: 'header', label: 'Guidance' },
                    { label: 'Studio tour…', action: () => document.dispatchEvent(new CustomEvent('novira:open-studio-tour')) },
                    { label: 'Keyboard Shortcuts...', action: () => document.dispatchEvent(new CustomEvent('novira:open-shortcuts')) },
                ],
            },
            {
                label: 'About',
                children: [
                    { type: 'header', label: 'Novira' },
                    { label: 'About Novira', action: () => window.open('/', '_blank') },
                ],
            },
        ],
    };
    const simpleMenuDefs = {
        File: [
            { label: 'Save Project', action: () => useStore.getState().saveProject(), shortcut: 'Ctrl+S' },
            { label: 'Export Scene (GLB)', action: () => document.dispatchEvent(new CustomEvent('novira:open-export-panel')), shortcut: 'Ctrl+E' },
            { label: 'Screenshot PNG', action: captureScreenshot, shortcut: 'Ctrl+Shift+S' },
        ],
        Edit: [
            { label: 'Undo', action: () => useStore.getState().editorUndo(), shortcut: 'Ctrl+Z' },
            { label: 'Redo', action: () => useStore.getState().editorRedo(), shortcut: 'Ctrl+Y' },
            { label: 'Delete Selection', action: () => useStore.getState().deleteSelected(), shortcut: 'Del' },
        ],
        View: [
            { label: environmentVisible ? 'Hide Environment' : 'Show Environment', action: () => setEnvironmentVisible(!environmentVisible) },
            { label: gridVisible ? 'Hide Grid' : 'Show Grid', action: () => setGridVisible(!gridVisible) },
            { label: 'Toggle Right Inspector', action: () => toggleStudioRightOpen() },
        ],
    };
    const activeMenuDefs = uiSimpleMode ? simpleMenuDefs : menuDefs;
    React.useEffect(() => {
        if (!uiSimpleMode) return;
        const allowed = new Set(['Objects & Assets', 'Layout', 'Rendering']);
        if (!allowed.has(editorTab)) setEditorTab('Layout');
    }, [uiSimpleMode, editorTab, setEditorTab]);

    const menus = Object.keys(activeMenuDefs);
    const tabs = uiSimpleMode
        ? [
            { id: 'Objects & Assets', full: '1. Assets', short: 'Assets' },
            { id: 'Layout', full: '2. Arrange', short: 'Arrange' },
            { id: 'Rendering', full: '3. Export', short: 'Export' },
        ]
        : [
            { id: 'Objects & Assets', full: 'Objects & Assets', short: 'Assets' },
            { id: 'Layout', full: 'Layout', short: 'Layout' },
            { id: 'Modeling', full: 'Modeling', short: 'Model' },
            { id: 'Shading', full: 'Shading', short: 'Shade' },
            { id: 'Lighting', full: 'Lighting', short: 'Light' },
            { id: 'Rendering', full: 'Rendering', short: 'Render' },
        ];

    const renderMenuItems = (menuName, items, basePath = '') => items.map((item, i) => {
        const path = `${basePath}/${i}`;
        if (item.type === 'sep') {
            return <div key={path} className="editor-menubar__sep" role="separator" />;
        }
        if (item.type === 'header') {
            return (
                <div key={path} className="editor-menubar__section" role="presentation">
                    <div className="editor-menubar__section-label">{item.label}</div>
                </div>
            );
        }
        if (item.children && item.children.length) {
            const subOpen = openSubmenuKey === `${menuName}:${path}`;
            return (
                <div
                    key={path}
                    className={`editor-menubar__submenu-wrap${subOpen ? ' editor-menubar__submenu-wrap--open' : ''}`}
                    onMouseEnter={() => setOpenSubmenuKey(`${menuName}:${path}`)}
                    onMouseLeave={() => setOpenSubmenuKey((cur) => (cur === `${menuName}:${path}` ? null : cur))}
                >
                    <button
                        type="button"
                        className="editor-menubar__item editor-menubar__item--parent"
                        aria-haspopup="menu"
                        aria-expanded={subOpen}
                        disabled={!!item.disabled}
                        onClick={() => setOpenSubmenuKey(subOpen ? null : `${menuName}:${path}`)}
                    >
                        <span>{item.label}</span>
                        <span className="editor-menubar__subchev" aria-hidden>
                            <ChevronRightIcon style={{ width: 14, height: 14 }} />
                        </span>
                    </button>
                    {subOpen && (
                        <div className="editor-menubar__submenu" role="menu">
                            {renderMenuItems(menuName, item.children, path)}
                        </div>
                    )}
                </div>
            );
        }
        return (
            <button
                key={path}
                type="button"
                role="menuitem"
                className="editor-menubar__item"
                disabled={!!item.disabled}
                onClick={() => {
                    if (!item.disabled && item.action) {
                        item.action();
                        setOpenMenu(null);
                        setOpenSubmenuKey(null);
                    }
                }}
            >
                <span>{item.label}</span>
                {item.shortcut ? (
                    <span className="editor-menubar__shortcut">{item.shortcut}</span>
                ) : null}
            </button>
        );
    });

    return (
        <header
            ref={menuRef}
            className="editor-menubar blender-top-bar"
            style={{
                display: 'flex',
                alignItems: 'stretch',
                width: '100%',
                overflow: 'visible',
                flexShrink: 0,
                userSelect: 'none',
                fontFamily: "'Poppins', sans-serif",
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center' }}>
                <button
                    type="button"
                    className="editor-menubar__logo-btn"
                    onClick={() => navigate('/dashboard')}
                    title="Back to Dashboard"
                    aria-label="Back to Dashboard"
                >
                    <div className="nav-logo-icon" style={{ width: 32, height: 32, transform: 'scale(0.5)', transformOrigin: 'center' }}>
                        <div className="logo-layer logo-layer-1"></div>
                        <div className="logo-layer logo-layer-2"></div>
                        <div className="logo-layer logo-layer-3"></div>
                    </div>
                </button>

                {showSceneChrome && (
                    <div className="editor-menubar__lh-undo" role="group" aria-label="Edit">
                        <button
                            type="button"
                            className="editor-menubar__lh-icon"
                            title="Undo (Ctrl+Z or Cmd+Z)"
                            aria-label="Undo"
                            onClick={() => {
                                useStore.getState().editorUndo();
                            }}
                        >
                            <ArrowUturnLeftIcon style={{ width: 16, height: 16 }} aria-hidden />
                        </button>
                        <button
                            type="button"
                            className="editor-menubar__lh-icon"
                            title="Redo (Ctrl+Y or Ctrl+Shift+Z; Cmd+Shift+Z on Mac)"
                            aria-label="Redo"
                            onClick={() => {
                                useStore.getState().editorRedo();
                            }}
                        >
                            <ArrowUturnRightIcon style={{ width: 16, height: 16 }} aria-hidden />
                        </button>
                        <button
                            type="button"
                            className="editor-menubar__lh-icon editor-menubar__lh-icon--danger"
                            title="Delete selection (Del)"
                            aria-label="Delete selection"
                            onClick={() => useStore.getState().deleteSelected()}
                        >
                            <TrashIcon style={{ width: 16, height: 16 }} aria-hidden />
                        </button>
                    </div>
                )}

                {menus.map((m) => (
                    <div key={m} className="editor-menubar__menu-wrap">
                        <button
                            type="button"
                            className="editor-menubar__trigger"
                            onClick={() => {
                                setOpenSubmenuKey(null);
                                setOpenMenu(openMenu === m ? null : m);
                            }}
                            aria-haspopup="menu"
                            aria-expanded={openMenu === m}
                        >
                            {m}
                        </button>
                        {openMenu === m && (
                            <div className="editor-menubar__dropdown" role="menu">
                                {renderMenuItems(m, activeMenuDefs[m])}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="editor-menubar__tabs">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        className={`editor-menubar__tab${editorTab === t.id ? ' editor-menubar__tab--active' : ''}`}
                        onClick={() => setEditorTab(t.id)}
                    >
                        <span className="editor-menubar__tab-full">{t.full}</span>
                        <span className="editor-menubar__tab-short">{t.short}</span>
                    </button>
                ))}
            </div>

            {showSceneChrome && (
                <div className="editor-menubar__panel-toggles" role="toolbar" aria-label="Panel visibility">
                    <button
                        type="button"
                        className={`editor-menubar__panel-btn${studioLeftOpen ? ' editor-menubar__panel-btn--on' : ''}`}
                        onClick={() => toggleStudioLeftOpen()}
                        title="Toggle left assets / library column"
                    >
                        <ViewColumnsIcon style={{ width: 16, height: 16 }} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className="editor-menubar__panel-btn"
                        onClick={() => document.dispatchEvent(new CustomEvent('novira:toggle-catalog'))}
                        title="Toggle bottom / floating catalog"
                    >
                        <RectangleStackIcon style={{ width: 16, height: 16 }} aria-hidden />
                    </button>
                    <button
                        type="button"
                        className={`editor-menubar__panel-btn${studioRightOpen ? ' editor-menubar__panel-btn--on' : ''}`}
                        onClick={() => toggleStudioRightOpen()}
                        title="Toggle right inspector"
                    >
                        <InformationCircleIcon style={{ width: 16, height: 16 }} aria-hidden />
                    </button>
                </div>
            )}

            <div className="editor-menubar__status">
                {isSaving ? (
                    <span style={{ color: '#b45309', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="editor-menubar__save-dot" aria-hidden />
                        Saving…
                    </span>
                ) : (
                    <span style={{ color: '#15803d', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg viewBox="0 0 20 20" fill="currentColor" style={{ width: 10, height: 10 }} aria-hidden>
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Saved
                    </span>
                )}
                <span className="editor-menubar__project-name" title={projectName || ''}>{projectName}</span>
            </div>

            <div className="editor-menubar__quick-wrap">
                <button
                    type="button"
                    className={`editor-menubar__quick${uiSimpleMode ? ' editor-menubar__quick--on' : ''}`}
                    onClick={() => toggleUiSimpleMode()}
                    title="Toggle Simple Mode"
                >
                    <span>Simple</span>
                </button>
                <button
                    type="button"
                    className={`editor-menubar__quick${environmentVisible ? ' editor-menubar__quick--on' : ''}`}
                    onClick={() => setEnvironmentVisible(!environmentVisible)}
                    title="Toggle environment / sky"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }} aria-hidden>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                    </svg>
                    <span>Env</span>
                </button>

                <button
                    type="button"
                    className={`editor-menubar__quick${gridVisible ? ' editor-menubar__quick--on' : ''}`}
                    onClick={() => setGridVisible(!gridVisible)}
                    title="Toggle grid"
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }} aria-hidden>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <line x1="3" y1="9" x2="21" y2="9" />
                        <line x1="3" y1="15" x2="21" y2="15" />
                        <line x1="9" y1="3" x2="9" y2="21" />
                        <line x1="15" y1="3" x2="15" y2="21" />
                    </svg>
                    <span>Grid</span>
                </button>
            </div>
        </header>
    );
}
