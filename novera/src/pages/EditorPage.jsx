import React, { Suspense, useState, useEffect, useLayoutEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Grid, ContactShadows, Html, PointerLockControls } from '@react-three/drei';
import AudioWaveform from '../components/editor/AudioWaveform';
import {
    CursorArrowRaysIcon,
    ArrowsPointingOutIcon,
    ArrowPathIcon,
    ArrowsRightLeftIcon,
    DocumentDuplicateIcon,
    TrashIcon,
    PlayIcon,
    SparklesIcon,
    ArrowUpTrayIcon,
    CheckCircleIcon,
    XMarkIcon,
    Square2StackIcon,
    RectangleStackIcon,
    WrenchScrewdriverIcon,
    SpeakerWaveIcon,
    MagnifyingGlassPlusIcon,
    ArrowUturnLeftIcon,
    LinkIcon,
    PuzzlePieceIcon,
    ArrowsPointingInIcon,
    HomeModernIcon,
    ViewfinderCircleIcon,
} from '@heroicons/react/24/outline';

import Sidebar from '../components/layout/Sidebar';
import LibraryBrowser from '../components/layout/LibraryBrowser';
import PropertiesPanel from '../components/layout/PropertiesPanel';
import SceneContent from '../components/canvas/SceneContent';
import SnapGuides from '../components/canvas/SnapGuides';
import DropHandler from '../components/canvas/DropHandler';
import ViewportSpawnBridge from '../components/canvas/ViewportSpawnBridge';
const EnvSystem = React.lazy(() => import('../components/canvas/EnvSystem.jsx'));

import CameraAnimator from '../components/canvas/CameraAnimator';
import ViewportAxisNavDom from '../components/canvas/ViewportAxisNavDom';
import useStore from '../store/useStore';
import EditorHeader from '../components/editor/EditorHeader';
import AssetBrowser from '../components/editor/AssetBrowser';
import DismantleModal from '../components/common/DismantleModal';
import LayoutManagerModal from '../components/canvas/LayoutManagerModal';
import CommandPalette from '../components/editor/CommandPalette';
import ContextMenu from '../components/editor/ContextMenu';
import ShortcutsOverlay from '../components/editor/ShortcutsOverlay';
import ViewportOverlays from '../components/editor/ViewportOverlays';
import ArrayTool from '../components/editor/ArrayTool';
import PerformanceMonitor from '../components/editor/PerformanceMonitor';
import SceneSearch from '../components/editor/SceneSearch';
import SceneExportPanel, { ExportTrigger } from '../components/editor/SceneExporter';
import HighResExportTrigger from '../components/canvas/HighResExportTrigger';
import WebXRSessionBridge from '../components/canvas/WebXRSessionBridge';
import SimulationOverlays from '../components/canvas/SimulationOverlays';
import RulerTool from '../components/canvas/RulerTool';
import WelcomeTooltips from '../components/editor/WelcomeTooltips';
import TransformConstraints from '../components/editor/TransformConstraints';
import ViewportStatusRig from '../components/canvas/ViewportStatusRig';
import { formatDesignLength, designUnitLabel } from '../utils/designUnits';

import '../styles/pro-editor.css';
import '../styles/studio-shell.css';
import EditorStudioStrip from '../components/editor/EditorStudioStrip';
import StudioOnboarding from '../components/editor/StudioOnboarding';
import PlannerStudio from '../components/planner/PlannerStudio';
import GeolocatedSunLight from '../components/canvas/GeolocatedSunLight';
import MaterialPaintBridge from '../components/canvas/MaterialPaintBridge';
import ElevationOrthoPanel from '../components/canvas/ElevationOrthoPanel';
import WebGpuPathTraceBanner from '../components/canvas/WebGpuPathTraceBanner';
import TemplateGalleryModal from '../components/editor/TemplateGalleryModal';
import SnapCursorMenu from '../components/editor/SnapCursorMenu';
import PlayCanvasViewport from '../components/playcanvas/PlayCanvasViewport';
import { OPEN_LIBRARY_EVENT } from '../utils/plannerSceneCatalog';
import { ensurePlannerReduxStore } from '../utils/plannerReduxBridge';
import { showToast } from '../utils/noviraToast';
import { SAVED_SCENE_CAMERAS_MAX } from '../utils/savedSceneCamerasStorage';
import { computeSceneObjectsFrameBox, cameraFocusFromFrameBox } from '../utils/viewportFrame';

const TOOL_LABELS = {
    select: 'Select',
    focus: 'Focus',
    move: 'Move',
    rotate: 'Rotate',
    scale: 'Scale',
    parts: 'Edit',
    ruler: 'Ruler',
    fullscreen: 'View',
    reset: 'Reset',
    duplicate: 'Duplicate',
    interior: 'Interior',
    delete: 'Delete',
    cursor: '3D Cursor',
};

const MODE_LABELS = {
    build: 'Design',
    preview: 'Present',
};

/** One shared create when URL is `/editor` with no id — avoids duplicate POSTs under React Strict Mode. */
let bareEditorCreatePromise = null;

function WalkNavigationRig({ enabled }) {
    const { camera } = useThree();
    const keys = React.useRef({ w: false, a: false, s: false, d: false });
    useEffect(() => {
        if (!enabled) return undefined;
        const onDown = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'a' || k === 's' || k === 'd') keys.current[k] = true;
        };
        const onUp = (e) => {
            const k = e.key.toLowerCase();
            if (k === 'w' || k === 'a' || k === 's' || k === 'd') keys.current[k] = false;
        };
        window.addEventListener('keydown', onDown);
        window.addEventListener('keyup', onUp);
        return () => {
            window.removeEventListener('keydown', onDown);
            window.removeEventListener('keyup', onUp);
        };
    }, [enabled]);

    useFrame((_, dt) => {
        if (!enabled) return;
        const speed = 4.2;
        const forward = new THREE.Vector3();
        camera.getWorldDirection(forward);
        forward.y = 0;
        if (forward.lengthSq() < 1e-6) return;
        forward.normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const delta = speed * dt;
        if (keys.current.w) camera.position.addScaledVector(forward, delta);
        if (keys.current.s) camera.position.addScaledVector(forward, -delta);
        if (keys.current.a) camera.position.addScaledVector(right, -delta);
        if (keys.current.d) camera.position.addScaledVector(right, delta);
        camera.position.y = Math.max(0.3, camera.position.y);
    });

    if (!enabled) return null;
    return <PointerLockControls makeDefault selector=".canvas-wrapper" />;
}

/** Short contextual copy in the spirit of Live Home 3D’s bottom hint bar. */
function studioSceneStatusHint(activeTool, hasSelection) {
    if (activeTool === 'cursor') {
        return 'Click the floor or any surface to place the 3D cursor. Imports / Add / paste / duplicate use it when set. . = cursor → selection; Ctrl+. = selection → cursor. Snap on: cursor snaps to 25 cm grid. Right-drag pans.';
    }
    if (!hasSelection) {
        return 'Click an object to select it. Shift+S: cursor & placement menu (Blender-style, simplified). Shift+C: 3D Cursor tool. Catalog: header stack or “Show catalog”.';
    }
    const map = {
        select: 'Drag to orbit; scroll to zoom. Inspector has precise transforms. Home frames the selection; Shift+S opens the cursor and placement menu.',
        move: 'Drag axis handles or edit X/Y/Z. Alt+arrows nudge X/Z (Shift = fine); Alt+PgUp/PgDn nudge Y. Home frames selection; Shift+S: placement menu. Ctrl+, toggles World vs Local gizmo.',
        rotate: 'Use rotate handles or the inspector. With Snap on (status bar), rotation snaps to 15° steps; hold Shift for 15° when Snap is off.',
        scale: 'Adjust scale in the inspector for predictable sizing.',
    };
    return map[activeTool] || 'Use the inspector to adjust the selected object.';
}

export default function EditorPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const engineMode = searchParams.get('engine') === 'playcanvas' ? 'playcanvas' : 'r3f';
    const {
        mode,
        setMode,
        cinemaChrome,
        setCinemaChrome,
        loadProject,
        liftedObjectId,
        liftOrigin,
        objects,
        activeTool,
        setActiveTool,
        meshEditSelectMode,
        setMeshEditSelectMode,
        meshEditTransformMode,
        setMeshEditTransformMode,
        setCameraFocus,
        interiorMode,
        toggleInteriorMode,
        selectedId,
        selectedIds,
        moveDelta,
        rotationDelta,
        smartZoomEnabled,
        setSmartZoomEnabled,
        layoutEnabled,
        setLayoutEnabled,
        layoutOverlays,
        lightingEnabled,
        environmentVisible,
        customHdriUrl,
        setEnvironmentVisible,
        gridVisible,
        isTransformDragging,
        axisLock,
        linkingMode,
        setLinkingMode,
        shiftPressed,
        ctrlPressed,
        axisConstraint,
        studioViewLayout,
        setStudioViewLayout,
        libraryBrowserOpen,
        setLibraryBrowserOpen,
        catalogDockMode,
        designUnits,
        cycleDesignUnits,
        viewportHudZoomPct,
        viewportHudGroundXZ,
        objectSnapEnabled,
        toggleObjectSnap,
        viewportNavMode,
        setViewportNavMode,
        activeBuildingStoryId,
        buildingStories,
        plannerHudSceneCm,
        materialPaintMode,
        setMaterialPaintMode,
        sunMinutesFromMidnight,
        sunCloudiness,
        setSunMinutesFromMidnight,
        setSunCloudiness,
        sunLatitude,
        sunLongitude,
        setSunGeo,
        webgpuPathTraceRequested,
        setWebgpuPathTraceRequested,
        transformSpace,
        toggleTransformSpace,
        wireframe,
        setWireframe,
        viewportAxisGizmoEnabled,
        setViewportAxisGizmoEnabled,
    } = useStore(
        useShallow((s) => ({
            mode: s.mode,
            setMode: s.setMode,
            cinemaChrome: s.cinemaChrome,
            setCinemaChrome: s.setCinemaChrome,
            loadProject: s.loadProject,
            liftedObjectId: s.liftedObjectId,
            liftOrigin: s.liftOrigin,
            objects: s.objects,
            activeTool: s.activeTool,
            setActiveTool: s.setActiveTool,
            meshEditSelectMode: s.meshEditSelectMode,
            setMeshEditSelectMode: s.setMeshEditSelectMode,
            meshEditTransformMode: s.meshEditTransformMode,
            setMeshEditTransformMode: s.setMeshEditTransformMode,
            setCameraFocus: s.setCameraFocus,
            interiorMode: s.interiorMode,
            toggleInteriorMode: s.toggleInteriorMode,
            selectedId: s.selectedId,
            selectedIds: s.selectedIds,
            moveDelta: s.moveDelta,
            rotationDelta: s.rotationDelta,
            smartZoomEnabled: s.smartZoomEnabled,
            setSmartZoomEnabled: s.setSmartZoomEnabled,
            layoutEnabled: s.layoutEnabled,
            setLayoutEnabled: s.setLayoutEnabled,
            layoutOverlays: s.layoutOverlays,
            lightingEnabled: s.lightingEnabled,
            environmentVisible: s.environmentVisible,
            customHdriUrl: s.customHdriUrl,
            setEnvironmentVisible: s.setEnvironmentVisible,
            gridVisible: s.gridVisible,
            isTransformDragging: s.isTransformDragging,
            axisLock: s.axisLock,
            linkingMode: s.linkingMode,
            setLinkingMode: s.setLinkingMode,
            shiftPressed: s.shiftPressed,
            ctrlPressed: s.ctrlPressed,
            axisConstraint: s.axisConstraint,
            studioViewLayout: s.studioViewLayout,
            setStudioViewLayout: s.setStudioViewLayout,
            libraryBrowserOpen: s.libraryBrowserOpen,
            setLibraryBrowserOpen: s.setLibraryBrowserOpen,
            catalogDockMode: s.catalogDockMode,
            designUnits: s.designUnits,
            cycleDesignUnits: s.cycleDesignUnits,
            viewportHudZoomPct: s.viewportHudZoomPct,
            viewportHudGroundXZ: s.viewportHudGroundXZ,
            objectSnapEnabled: s.objectSnapEnabled,
            toggleObjectSnap: s.toggleObjectSnap,
            viewportNavMode: s.viewportNavMode,
            setViewportNavMode: s.setViewportNavMode,
            activeBuildingStoryId: s.activeBuildingStoryId,
            buildingStories: s.buildingStories,
            plannerHudSceneCm: s.plannerHudSceneCm,
            materialPaintMode: s.materialPaintMode,
            setMaterialPaintMode: s.setMaterialPaintMode,
            sunMinutesFromMidnight: s.sunMinutesFromMidnight,
            sunCloudiness: s.sunCloudiness,
            setSunMinutesFromMidnight: s.setSunMinutesFromMidnight,
            setSunCloudiness: s.setSunCloudiness,
            sunLatitude: s.sunLatitude,
            sunLongitude: s.sunLongitude,
            setSunGeo: s.setSunGeo,
            webgpuPathTraceRequested: s.webgpuPathTraceRequested,
            setWebgpuPathTraceRequested: s.setWebgpuPathTraceRequested,
            transformSpace: s.transformSpace,
            toggleTransformSpace: s.toggleTransformSpace,
            wireframe: s.wireframe,
            setWireframe: s.setWireframe,
            viewportAxisGizmoEnabled: s.viewportAxisGizmoEnabled,
            setViewportAxisGizmoEnabled: s.setViewportAxisGizmoEnabled,
        }))
    );

    useLayoutEffect(() => {
        ensurePlannerReduxStore(
            typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
                ? window.__REDUX_DEVTOOLS_EXTENSION__()
                : undefined
        );
    }, []);

    useEffect(() => {
        const onToggleCatalog = () => setFooterVisible((v) => !v);
        document.addEventListener('novira:toggle-catalog', onToggleCatalog);
        return () => document.removeEventListener('novira:toggle-catalog', onToggleCatalog);
    }, []);

    const selectedObj = objects.find(o => o.id === selectedId);
    const selectedLayout = layoutOverlays.find(ly => ly.id === selectedId);
    const liftedObj = liftedObjectId ? objects.find(o => o.id === liftedObjectId) : null;

    const showSceneUI = studioViewLayout === 'scene' || studioViewLayout === 'split';
    const showPlanUI = studioViewLayout === 'plan' || studioViewLayout === 'elevation' || studioViewLayout === 'split';
    const planOnlyFullBleed = studioViewLayout === 'plan' || studioViewLayout === 'elevation';

    /** When the R3F canvas is not mounted (plan-only), still update orbit preset from metadata so Home works. */
    useEffect(() => {
        if (showSceneUI) return undefined;
        const handler = (ev) => {
            const scope = ev.detail?.scope === 'all' ? 'all' : 'selection';
            const st = useStore.getState();
            const hasSelection = (st.selectedIds?.length > 0) || !!st.selectedId;

            if (scope === 'selection' && !hasSelection) {
                showToast('Select something to frame, or use Shift+Home for the whole scene.', 'warn');
                return;
            }

            const fallback = computeSceneObjectsFrameBox(st.objects, {
                hiddenIds: st.hiddenObjectIds,
                scope,
                selectedIds: st.selectedIds || [],
                selectedId: st.selectedId,
            });
            if (!fallback) {
                showToast(scope === 'selection' ? 'Nothing to frame yet.' : 'Nothing visible to frame.', 'warn');
                return;
            }
            const fp = cameraFocusFromFrameBox(fallback);
            if (!fp) return;
            st.setCameraFocus(fp.target, fp.position);
            showToast(
                scope === 'selection'
                    ? 'Camera preset updated from scene data — open 3D view to see it.'
                    : 'Scene-wide camera preset updated — open 3D view to see it.',
                'ok',
            );
        };
        document.addEventListener('novira:frame-camera', handler);
        return () => document.removeEventListener('novira:frame-camera', handler);
    }, [showSceneUI]);
    const [canvasMode, setCanvasMode] = useState('creator');
    const [canvasFullscreen, setCanvasFullscreen] = useState(false);
    const [footerVisible, setFooterVisible] = useState(true);
    const [footerHeight, setFooterHeight] = useState(280);
    const usingPlayCanvas = engineMode === 'playcanvas';
    const switchEngine = React.useCallback((nextEngine) => {
        const next = new URLSearchParams(searchParams);
        if (nextEngine === 'playcanvas') next.set('engine', 'playcanvas');
        else next.delete('engine');
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);
    const footerBaseRef = React.useRef(280);
    const [ctxMenu, setCtxMenu] = useState(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [shortcutsScrollId, setShortcutsScrollId] = useState(null);
    const [showOverlays, setShowOverlays] = useState(false);
    const [showArrayTool, setShowArrayTool] = useState(false);
    const [showPerfMonitor, setShowPerfMonitor] = useState(false);
    const [showSceneSearch, setShowSceneSearch] = useState(false);
    const [showExportPanel, setShowExportPanel] = useState(false);
    const [exportPrefill, setExportPrefill] = useState(null);
    const [viewportControlsOpen, setViewportControlsOpen] = useState(false);
    useEffect(() => {
        const handler = () => setShowArrayTool(true);
        const exportHandler = (ev) => {
            setExportPrefill(ev?.detail || null);
            setShowExportPanel(true);
        };
        const searchHandler = () => setShowSceneSearch(true);
        const shortcutsHandler = (ev) => {
            setShortcutsScrollId(ev?.detail?.scrollToId ?? null);
            setShowShortcuts(true);
        };
        document.addEventListener('novira:open-array-tool', handler);
        document.addEventListener('novira:open-export-panel', exportHandler);
        document.addEventListener('novira:open-scene-search', searchHandler);
        document.addEventListener('novira:open-shortcuts', shortcutsHandler);
        return () => {
            document.removeEventListener('novira:open-array-tool', handler);
            document.removeEventListener('novira:open-export-panel', exportHandler);
            document.removeEventListener('novira:open-scene-search', searchHandler);
            document.removeEventListener('novira:open-shortcuts', shortcutsHandler);
        };
    }, []);

    /** Legacy: `window.dispatchEvent(new CustomEvent(OPEN_LIBRARY_EVENT))` opens the same modal as the floor planner button. */
    useEffect(() => {
        const onOpenLibrary = () => useStore.getState().openAssetLibrary({ expandSidebar: true });
        window.addEventListener(OPEN_LIBRARY_EVENT, onOpenLibrary);
        return () => window.removeEventListener(OPEN_LIBRARY_EVENT, onOpenLibrary);
    }, []);

    const UNITS_TO_CM = 100;
    const dx = liftedObj && liftOrigin ? ((liftedObj.position[0] - liftOrigin[0]) * UNITS_TO_CM) : 0;
    const dz = liftedObj && liftOrigin ? ((liftedObj.position[2] - liftOrigin[2]) * UNITS_TO_CM) : 0;
    const totalDist = Math.sqrt(dx * dx + dz * dz);

    const bearingRad = Math.atan2(dx, -dz);
    const bearingDeg = ((bearingRad * 180 / Math.PI) + 360) % 360;
    const compassDir = totalDist > 0.5
        ? (['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'N'][Math.round(bearingDeg / 45)])
        : '—';

    useEffect(() => {
        if (!projectId) return;
        loadProject(projectId);
    }, [loadProject, projectId]);

    useEffect(() => {
        if (!projectId) return undefined;
        const id = window.requestAnimationFrame(() => {
            useStore.getState().hydratePlannerForActiveStory();
        });
        return () => window.cancelAnimationFrame(id);
    }, [projectId, activeBuildingStoryId]);

    /** One-time tip when entering Move in Design mode (nudge + placement). */
    useEffect(() => {
        if (mode !== 'build' || activeTool !== 'move') return undefined;
        let cancelled = false;
        const t = window.setTimeout(() => {
            if (cancelled) return;
            try {
                if (localStorage.getItem('novira_tip_move_tool_v1')) return;
                localStorage.setItem('novira_tip_move_tool_v1', '1');
            } catch {
                return;
            }
            showToast(
                'Move tool: Alt+arrows nudge X/Z, Alt+PgUp/PgDn for Y (Shift = smaller step). Shift+S: cursor and placement menu.',
                'ok',
            );
        }, 500);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [activeTool, mode]);

    const appliedTplKey = React.useRef('');
    useEffect(() => {
        const tpl = searchParams.get('template');
        if (!tpl || !projectId) return undefined;
        const key = `${projectId}:${tpl}`;
        if (appliedTplKey.current === key) return undefined;
        let cancelled = false;
        const t = window.setTimeout(() => {
            if (cancelled) return;
            const ok = useStore.getState().applyProjectTemplate(tpl);
            if (ok) {
                appliedTplKey.current = key;
                setSearchParams(
                    (prev) => {
                        const p = new URLSearchParams(prev);
                        p.delete('template');
                        return p;
                    },
                    { replace: true }
                );
            }
        }, 500);
        return () => {
            cancelled = true;
            window.clearTimeout(t);
        };
    }, [projectId, searchParams, setSearchParams]);

    const marketplaceToastKey = React.useRef('');
    useEffect(() => {
        if (searchParams.get('source') !== 'marketplace' || !projectId) return undefined;
        const onceKey = `${projectId}:marketplace`;
        if (marketplaceToastKey.current === onceKey) return undefined;
        marketplaceToastKey.current = onceKey;
        showToast(
            'Opened from Marketplace — this loads the shared project. Use Save / Dashboard to keep your own copy if you change it.',
            'ok'
        );
        setSearchParams(
            (prev) => {
                const p = new URLSearchParams(prev);
                p.delete('source');
                return p;
            },
            { replace: true }
        );
        return undefined;
    }, [projectId, searchParams, setSearchParams]);

    const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
    useEffect(() => {
        const open = () => setTemplateGalleryOpen(true);
        document.addEventListener('novira:open-template-gallery', open);
        return () => document.removeEventListener('novira:open-template-gallery', open);
    }, []);

    const webgpuHintRef = React.useRef(false);
    useEffect(() => {
        if (!webgpuPathTraceRequested) {
            webgpuHintRef.current = false;
            return undefined;
        }
        if (webgpuHintRef.current) return undefined;
        webgpuHintRef.current = true;
        const hasGpu = typeof navigator !== 'undefined' && navigator.gpu;
        showToast(
            hasGpu
                ? 'WebGPU is available in this browser — path-traced viewport swap is still being integrated.'
                : 'WebGPU is not exposed in this browser — path trace preview will fall back when wired.',
            hasGpu ? 'ok' : 'warn'
        );
        return undefined;
    }, [webgpuPathTraceRequested]);

    useEffect(() => {
        const w = searchParams.get('workspace');
        if (w === 'floorplan') setStudioViewLayout('plan');
    }, [searchParams, setStudioViewLayout]);

    useEffect(() => {
        if (!viewportControlsOpen) return undefined;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') setViewportControlsOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [viewportControlsOpen]);

    useEffect(() => {
        if (studioViewLayout === 'scene') {
            useStore.getState().setPlannerHudSceneCm(null);
        }
    }, [studioViewLayout]);

    useEffect(() => {
        if (!projectId) return undefined;
        const id = window.setInterval(() => {
            useStore.getState().saveProject();
        }, 30000);
        return () => window.clearInterval(id);
    }, [projectId]);

    /** Bare `/editor` — create a draft project so URL always carries an id (shareable, saveable). */
    useEffect(() => {
        if (projectId) {
            bareEditorCreatePromise = null;
            return undefined;
        }

        if (!bareEditorCreatePromise) {
            bareEditorCreatePromise = (async () => {
                try {
                    const { projectService } = await import('../api/apiService');
                    const res = await projectService.createProject({
                        name: 'Untitled Design',
                        status: 'draft',
                        thumbnailIcon: 'BuildingOffice2Icon',
                        themeColors: { c1: '#dce8ff', c2: '#b8d0f8' },
                    });
                    return res.data?.data?.id || null;
                } catch (err) {
                    console.error('[Editor] Failed to create project:', err);
                    return null;
                }
            })();
        }

        let cancelled = false;
        bareEditorCreatePromise.then((id) => {
            if (cancelled) return;
            if (!id) {
                bareEditorCreatePromise = null;
                document.dispatchEvent(
                    new CustomEvent('novira:export-toast', {
                        detail: { message: 'Could not create a project — check connection or open from Dashboard.' },
                    })
                );
                return;
            }
            const qs = typeof window !== 'undefined' ? window.location.search : '';
            navigate(`/editor/${id}${qs}`, { replace: true });
        });

        return () => {
            cancelled = true;
        };
    }, [projectId, navigate]);

    useEffect(() => {
        if (searchParams.get('fromPlanner') !== '1') return;
        const mark = `novira_fromPlanner_${window.location.pathname}${window.location.search}`;
        let already;
        try {
            already = sessionStorage.getItem(mark);
        } catch {
            already = null;
        }
        const next = new URLSearchParams(searchParams);
        next.delete('fromPlanner');
        if (already) {
            setSearchParams(next, { replace: true });
            return;
        }
        try {
            sessionStorage.setItem(mark, '1');
        } catch {
            /* noop */
        }
        document.dispatchEvent(
            new CustomEvent('novira:toast', {
                detail: {
                    message:
                        'Nov studio — continue your event layout here. Deep link from Floor planner is ready; automated plan → 3D import can follow.',
                    variant: 'info',
                },
            })
        );
        setSearchParams(next, { replace: true });
    }, [searchParams, setSearchParams]);

    const prevModeRef = React.useRef(mode);
    useEffect(() => {
        if (mode === 'preview' && prevModeRef.current !== 'preview') {
            setFooterVisible(false);
        }
        prevModeRef.current = mode;
    }, [mode]);

    const [showDragHint, setShowDragHint] = useState(true);
    const [showSelectHint, setShowSelectHint] = useState(false);
    const splitRootRef = React.useRef(null);
    const splitDraggingRef = React.useRef(false);
    const [splitRatio, setSplitRatio] = useState(() => {
        try {
            const raw = parseFloat(localStorage.getItem('novira_split_ratio_v1'));
            if (Number.isFinite(raw) && raw >= 0.28 && raw <= 0.72) return raw;
        } catch {
            /* ignore */
        }
        return 0.42;
    });

    useEffect(() => {
        try {
            localStorage.setItem('novira_split_ratio_v1', String(splitRatio));
        } catch {
            /* ignore */
        }
    }, [splitRatio]);

    useEffect(() => {
        const onApplyLayout = () => {
            try {
                const raw = parseFloat(localStorage.getItem('novira_split_ratio_v1') || '');
                if (Number.isFinite(raw) && raw >= 0.28 && raw <= 0.72) setSplitRatio(raw);
            } catch {
                /* ignore */
            }
        };
        window.addEventListener('novira:workspace-layout-applied', onApplyLayout);
        return () => window.removeEventListener('novira:workspace-layout-applied', onApplyLayout);
    }, []);

    useEffect(() => {
        const onMove = (e) => {
            if (!splitDraggingRef.current || !splitRootRef.current) return;
            const r = splitRootRef.current.getBoundingClientRect();
            if (!r.width) return;
            const next = (e.clientX - r.left) / r.width;
            setSplitRatio(Math.max(0.28, Math.min(0.72, next)));
        };
        const onUp = () => {
            if (!splitDraggingRef.current) return;
            splitDraggingRef.current = false;
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

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const st = useStore.getState();
            if (e.key === 'Shift') st.setShiftPressed(true);
            if (e.key === 'Control') st.setCtrlPressed(true);

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                st.setShowCommandPalette(!st.showCommandPalette);
                return;
            }
            if (e.key === 'F3') {
                e.preventDefault();
                st.setShowCommandPalette(true);
                return;
            }

            if (e.shiftKey && e.code === 'KeyS' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                st.setSnapCursorMenuOpen(!st.snapCursorMenuOpen);
                return;
            }

            if (e.ctrlKey && e.shiftKey && e.code === 'KeyH' && !e.metaKey && !e.altKey) {
                e.preventDefault();
                st.toggleIsolateSelected();
                const iso = useStore.getState().isolateActive;
                showToast(
                  iso ? 'Only the selection is visible (ground stays).' : 'Whole scene visible again.',
                  'ok'
                );
                return;
            }

            if (e.code === 'Home' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                document.dispatchEvent(
                    new CustomEvent('novira:frame-camera', { detail: { scope: e.shiftKey ? 'all' : 'selection' } })
                );
                return;
            }

            if (e.altKey && !e.ctrlKey && !e.metaKey) {
                const hasSel = st.selectedId || (st.selectedIds && st.selectedIds.length > 0);
                const step = e.shiftKey ? 0.05 : 0.25;
                if (hasSel) {
                    let dx = 0;
                    let dy = 0;
                    let dz = 0;
                    if (e.code === 'ArrowRight') {
                        e.preventDefault();
                        dx = step;
                    } else if (e.code === 'ArrowLeft') {
                        e.preventDefault();
                        dx = -step;
                    } else if (e.code === 'ArrowUp') {
                        e.preventDefault();
                        dz = step;
                    } else if (e.code === 'ArrowDown') {
                        e.preventDefault();
                        dz = -step;
                    } else if (e.code === 'PageUp') {
                        e.preventDefault();
                        dy = step;
                    } else if (e.code === 'PageDown') {
                        e.preventDefault();
                        dy = -step;
                    }
                    if (dx !== 0 || dy !== 0 || dz !== 0) {
                        st.nudgeSelectedPosition(dx, dy, dz);
                    }
                }
            }

            if (e.ctrlKey && e.code === 'Comma' && !e.shiftKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                st.toggleTransformSpace();
                const next = useStore.getState().transformSpace;
                showToast(
                  next === 'local'
                    ? 'Transform gizmo: Local (object axes).'
                    : 'Transform gizmo: World (room axes).',
                  'ok'
                );
                return;
            }

            if (e.shiftKey && (e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                st.setActiveTool('cursor');
                return;
            }
            if (e.code === 'Period' && e.ctrlKey && !e.shiftKey && !e.metaKey && !e.altKey) {
                if (st.selectedId || (st.selectedIds && st.selectedIds.length > 0)) {
                    if (!st.threeDCursorWorld) {
                        showToast('Place the 3D cursor first (Shift+C, then click in the scene).', 'warn');
                    } else {
                        e.preventDefault();
                        st.snapSelectionToThreeDCursor();
                        showToast('Selection moved to 3D cursor (relative layout kept).', 'ok');
                    }
                }
                return;
            }
            if (e.code === 'Period' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (st.selectedId) {
                    e.preventDefault();
                    st.snapThreeDCursorToSelection();
                    showToast('3D cursor moved to selection origin.', 'ok');
                }
                return;
            }

            if (e.key.toLowerCase() === 'g' && !e.ctrlKey) {
                if (st.activeTool === 'parts') st.setMeshEditTransformMode('translate');
                else st.setActiveTool('move');
            }
            if (e.key.toLowerCase() === 'r' && !e.ctrlKey) {
                if (st.activeTool === 'parts') st.setMeshEditTransformMode('rotate');
                else st.setActiveTool('rotate');
            }
            if (e.key.toLowerCase() === 's' && !e.ctrlKey && !e.shiftKey) {
                if (st.activeTool === 'parts') st.setMeshEditTransformMode('scale');
                else st.setActiveTool('scale');
            }
            if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                e.preventDefault();
                st.setActiveTool(st.activeTool === 'parts' ? 'select' : 'parts');
            }
            if (st.activeTool === 'parts' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                if (e.key === '1') st.setMeshEditSelectMode('part');
                if (e.key === '2') st.setMeshEditSelectMode('face');
                if (e.key === '3') st.setMeshEditSelectMode('edge');
                if (e.key === '4') st.setMeshEditSelectMode('vertex');
            }
            if (e.key === 'Escape') {
                if (st.snapCursorMenuOpen) {
                    e.preventDefault();
                    st.setSnapCursorMenuOpen(false);
                    return;
                }
                if (st.viewportNavMode === 'walk') {
                    e.preventDefault();
                    st.setViewportNavMode('orbit');
                    try {
                        if (document.pointerLockElement) document.exitPointerLock();
                    } catch {
                        /* ignore */
                    }
                    return;
                }
                if (st.mode === 'preview' && st.cinemaChrome) {
                    e.preventDefault();
                    st.setCinemaChrome(false);
                    return;
                }
                st.setActiveTool('select');
                st.setShowCommandPalette(false);
                setCtxMenu(null);
            }

            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                st.editorRedo();
            } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'z') {
                e.preventDefault();
                st.editorUndo();
            }
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === 'y') {
                e.preventDefault();
                st.editorRedo();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); st.duplicateSelected(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) { e.preventDefault(); st.groupSelected(); }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'G') { e.preventDefault(); st.ungroupSelected(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); st.copySelected(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); st.pasteClipboard(); }
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); st.selectAll(); }
            if (e.key === 'Delete' || e.key === 'Backspace') { st.deleteSelected(); }

            const isTransformActive = ['move', 'rotate', 'scale'].includes(st.activeTool);
            const partGizmoAxes = st.activeTool === 'parts'
                && st.meshEditSelectMode === 'part'
                && st.meshElementSelection?.type === 'part';
            if ((isTransformActive || partGizmoAxes) && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
                if (e.key === 'x') { e.preventDefault(); st.setAxisConstraint('x'); }
                if (e.key === 'y') { e.preventDefault(); st.setAxisConstraint('y'); }
                if (e.key === 'z') { e.preventDefault(); st.setAxisConstraint('z'); }
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
                e.preventDefault();
                const canvas = document.querySelector('canvas');
                if (canvas) {
                    const link = document.createElement('a');
                    link.download = `${st.projectName || 'novira-render'}.png`;
                    link.href = canvas.toDataURL('image/png');
                    link.click();
                }
            }
            if ((e.key.toLowerCase() === 'f' || e.key === '.') && !e.ctrlKey) {
                if (st.selectedId) st.setActiveTool('focus');
            }
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                setShortcutsScrollId(null);
                setShowShortcuts((prev) => !prev);
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
                e.preventDefault();
                setShowSceneSearch(true);
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
                e.preventDefault();
                setShowExportPanel(true);
            }

            const viewMap = {
                '1': { pos: [0, 1.5, 12], target: [0, 1.5, 0] },
                '3': { pos: [12, 1.5, 0], target: [0, 1.5, 0] },
                '7': { pos: [0, 12, 0.001], target: [0, 1.5, 0] },
                '5': { pos: [8, 8, 8], target: [0, 1.5, 0] },
                '9': { pos: [0, -12, 0.001], target: [0, 1.5, 0] },
            };
            if (viewMap[e.key] && !e.ctrlKey && !e.altKey) {
                const v = viewMap[e.key];
                st.setCameraFocus(v.target, v.pos);
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Shift') useStore.getState().setShiftPressed(false);
            if (e.key === 'Control') useStore.getState().setCtrlPressed(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        if (activeTool === 'focus') {
            setShowSelectHint(true);
            const timer = setTimeout(() => setShowSelectHint(false), 3000);
            return () => clearTimeout(timer);
        } else {
            setShowSelectHint(false);
        }
    }, [activeTool]);

    const audioInputRef = React.useRef(null);
    const [audioFileName, setAudioFileName] = useState(null);
    const orbitRef = React.useRef(null);

    React.useEffect(() => {
        const onSaveSceneCamera = () => {
            const oc = orbitRef.current;
            if (!oc?.object) {
                showToast('3D viewport is not ready — switch to 3D or Split view.', 'warn');
                return;
            }
            const st = useStore.getState();
            if (!st.projectId) {
                showToast('Open or create a project first — then save camera bookmarks.', 'warn');
                return;
            }
            if (st.savedSceneCameras.length >= SAVED_SCENE_CAMERAS_MAX) {
                showToast(`Maximum ${SAVED_SCENE_CAMERAS_MAX} saved views per project.`, 'warn');
                return;
            }
            const pos = oc.object.position.toArray();
            const tgt = oc.target.toArray();
            const n = st.savedSceneCameras.length + 1;
            st.addSavedSceneCamera({
                name: `View ${n}`,
                position: pos.map((x) => Number(Number(x).toFixed(4))),
                target: tgt.map((x) => Number(Number(x).toFixed(4))),
            });
            showToast(`Saved 3D camera: View ${n} (Live Home–style bookmark).`, 'ok');
        };
        const onSaveSceneCameraBatch = (ev) => {
            const payload = Array.isArray(ev?.detail?.cameras) ? ev.detail.cameras : [];
            if (!payload.length) return;
            const st = useStore.getState();
            if (!st.projectId) {
                showToast('Open or create a project first — then save camera bookmarks.', 'warn');
                return;
            }
            const available = Math.max(0, SAVED_SCENE_CAMERAS_MAX - st.savedSceneCameras.length);
            if (available <= 0) {
                showToast(`Maximum ${SAVED_SCENE_CAMERAS_MAX} saved views per project.`, 'warn');
                return;
            }
            const toSave = payload.slice(0, available);
            toSave.forEach((c, idx) => {
                const position = Array.isArray(c?.position) ? c.position.slice(0, 3).map((x) => Number(Number(x).toFixed(4))) : null;
                const target = Array.isArray(c?.target) ? c.target.slice(0, 3).map((x) => Number(Number(x).toFixed(4))) : null;
                if (!position || !target || position.length !== 3 || target.length !== 3) return;
                const fallbackName = `Director ${st.savedSceneCameras.length + idx + 1}`;
                st.addSavedSceneCamera({
                    name: String(c?.name || fallbackName).slice(0, 48),
                    position,
                    target,
                });
            });
            showToast(`Saved ${toSave.length} director cameras.`, 'ok');
        };
        document.addEventListener('novira:save-scene-camera', onSaveSceneCamera);
        document.addEventListener('novira:save-scene-camera-batch', onSaveSceneCameraBatch);
        return () => {
            document.removeEventListener('novira:save-scene-camera', onSaveSceneCamera);
            document.removeEventListener('novira:save-scene-camera-batch', onSaveSceneCameraBatch);
        };
    }, []);

    const handleAudioUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            setAudioFileName(file.name);
            const url = URL.createObjectURL(file);
            useStore.getState().setCustomAudioUrl(url);
            useStore.getState().setSoundEnabled(true);
        }
    };

    const tools = [
        { id: 'fullscreen', icon: canvasFullscreen ? ArrowsPointingInIcon : ArrowsPointingOutIcon, title: canvasFullscreen ? 'Exit Fullscreen' : 'Canvas Fullscreen' },
        { id: 'select', icon: CursorArrowRaysIcon, title: 'Select (Esc)' },
        { id: 'cursor', icon: ViewfinderCircleIcon, title: '3D Cursor (Shift+C) — . cursor→selection, Ctrl+. selection→cursor' },
        { id: 'focus', icon: MagnifyingGlassPlusIcon, title: 'Face Focus (F)' },
        { id: 'move', icon: ArrowsPointingOutIcon, title: 'Move (G)' },
        { id: 'rotate', icon: ArrowPathIcon, title: 'Rotate (R)' },
        { id: 'scale', icon: ArrowsRightLeftIcon, title: 'Scale (S)' },
        { id: 'reset', icon: ArrowUturnLeftIcon, title: 'Reset Position' },
        { id: 'duplicate', icon: DocumentDuplicateIcon, title: 'Duplicate Object' },
        { id: 'parts', icon: PuzzlePieceIcon, title: 'Edit Parts (Tab)' },
        { id: 'interior', icon: HomeModernIcon, title: interiorMode ? 'Exit Interior' : 'Enter Interior / Core' },
        { id: 'delete', icon: TrashIcon, title: 'Delete Object' },
    ];

    const FloatingToolBtn = ({ icon, title, onClick, active }) => (
        <button
            type="button"
            onClick={onClick}
            title={title}
            aria-label={title}
            className={`floating-tool-btn ${active ? 'active' : ''}`}
        >
            <span style={{ fontSize: '14px' }} aria-hidden>{icon}</span>
        </button>
    );

    const modeLabel = mode === 'preview' && cinemaChrome ? 'Cinema' : (MODE_LABELS[mode] || mode);
    const xrPresenting = useStore((s) => s.xrPresenting);
    const toolLabel = TOOL_LABELS[activeTool] || activeTool;


    return (
        <div
            className={`editor-layout novira-studio ${canvasFullscreen ? 'canvas-only' : ''} ${mode === 'preview' ? 'studio-mode-preview' : ''} ${mode === 'preview' && cinemaChrome && !canvasFullscreen ? 'studio-cinema-mode' : ''}`}
        >
            {!canvasFullscreen && (
                <>
                    <EditorHeader />
                    <EditorStudioStrip />
                </>
            )}
            <div className="editor-workspace studio-workspace-bg">
                {showSceneUI && !canvasFullscreen && <Sidebar />}

                <div
                    ref={splitRootRef}
                    className={`editor-center-new${planOnlyFullBleed && !showSceneUI ? ' editor-center-new--floorplan' : ''}${studioViewLayout === 'split' ? ' editor-center-new--split' : ''}`}
                >
                    {showPlanUI && (
                        <div
                            className={studioViewLayout === 'split' ? 'editor-split-panel editor-split-panel--plan' : undefined}
                            style={
                                studioViewLayout === 'split'
                                    ? {
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flex: `0 0 ${Math.round(splitRatio * 1000) / 10}%`,
                                        minWidth: 260,
                                        minHeight: 0,
                                    }
                                    : undefined
                            }
                        >
                            {studioViewLayout === 'elevation' && (
                                <>
                                    <ElevationOrthoPanel />
                                    <div className="studio-elevation-hint" role="note">
                                        Orthographic elevation preview (live scene). Edit walls and openings in the planner below — dimensions show when a wall segment is selected.
                                    </div>
                                </>
                            )}
                            <div className="planner-studio-viewport" style={{ flex: 1, minHeight: 0 }}>
                                <PlannerStudio />
                            </div>
                        </div>
                    )}
                    {showPlanUI && showSceneUI && studioViewLayout === 'split' && (
                        <div
                            className="studio-split-resizer"
                            role="separator"
                            aria-label="Resize plan and scene split"
                            aria-orientation="vertical"
                            onPointerDown={(e) => {
                                e.preventDefault();
                                splitDraggingRef.current = true;
                                document.body.style.cursor = 'col-resize';
                                document.body.style.userSelect = 'none';
                            }}
                            onMouseDown={(e) => {
                                e.preventDefault();
                                splitDraggingRef.current = true;
                                document.body.style.cursor = 'col-resize';
                                document.body.style.userSelect = 'none';
                            }}
                        />
                    )}
                    {showSceneUI && (
                    <div
                        className={studioViewLayout === 'split' ? 'editor-split-panel editor-split-panel--scene' : undefined}
                        style={
                            studioViewLayout === 'split'
                                ? {
                                    display: 'flex',
                                    flexDirection: 'column',
                                    flex: `1 1 ${Math.round((1 - splitRatio) * 1000) / 10}%`,
                                    minWidth: 0,
                                    minHeight: 0,
                                }
                                : { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }
                        }
                    >
                    <div
                        className="viewport"
                        style={{
                            position: 'relative',
                            flex: 1,
                            cursor: liftedObjectId ? 'grabbing' : 'default'
                        }}
                    >
                        <button
                            type="button"
                            className={`viewport-controls-launcher ${viewportControlsOpen ? 'is-active' : ''}`}
                            onClick={() => setViewportControlsOpen((v) => !v)}
                            title="Open quick viewport controls"
                        >
                            Viewport controls
                        </button>

                        {viewportControlsOpen && (
                            <div className="viewport-controls-popover" role="dialog" aria-label="Viewport controls">
                                <div className="viewport-controls-popover__head">
                                    <span>Viewport controls</span>
                                    <button type="button" onClick={() => setViewportControlsOpen(false)}>Done</button>
                                </div>
                                <div className="viewport-controls-popover__grid">
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
                                    <div className="viewport-controls-popover__sun">
                                        <div className="viewport-controls-popover__sun-title">Sun</div>
                                        <div className="viewport-controls-popover__sun-row">
                                            <label>Lat
                                                <input type="number" step={0.01} value={Number.isFinite(sunLatitude) ? sunLatitude : 0} onChange={(e) => {
                                                    const lat = parseFloat(e.target.value);
                                                    setSunGeo(Number.isFinite(lat) ? lat : sunLatitude, sunLongitude);
                                                }} />
                                            </label>
                                            <label>Lon
                                                <input type="number" step={0.01} value={Number.isFinite(sunLongitude) ? sunLongitude : 0} onChange={(e) => {
                                                    const lon = parseFloat(e.target.value);
                                                    setSunGeo(sunLatitude, Number.isFinite(lon) ? lon : sunLongitude);
                                                }} />
                                            </label>
                                        </div>
                                        <label className="viewport-controls-popover__sun-range">Time
                                            <input type="range" min={0} max={1440} value={sunMinutesFromMidnight} onChange={(e) => setSunMinutesFromMidnight(Number(e.target.value))} />
                                        </label>
                                        <label className="viewport-controls-popover__sun-range">Cloud
                                            <input type="range" min={0} max={1} step={0.02} value={sunCloudiness} onChange={(e) => setSunCloudiness(Number(e.target.value))} />
                                        </label>
                                    </div>
                                )}
                            </div>
                        )}

                        <div
                            className="editor-viewport-status-wrap"
                            role="status"
                            aria-live="polite"
                            aria-label="Editor context"
                        >
                            <div className="editor-viewport-status">
                                <span className="editor-viewport-status__mode">{modeLabel}</span>
                                <span className="editor-viewport-status__sep" aria-hidden>·</span>
                                <span className="editor-viewport-status__tool">{toolLabel}</span>
                                {activeTool === 'parts' && (
                                    <>
                                        <span className="editor-viewport-status__sep" aria-hidden>·</span>
                                        <span className="editor-viewport-status__link">
                                            {meshEditSelectMode === 'part'
                                                ? 'Part pick'
                                                : `${meshEditSelectMode} pick`}
                                        </span>
                                    </>
                                )}
                                {axisConstraint && ['move', 'rotate', 'scale'].includes(activeTool) && (
                                    <>
                                        <span className="editor-viewport-status__sep" aria-hidden>·</span>
                                        <span className="editor-viewport-status__axis">{axisConstraint.toUpperCase()} axis</span>
                                    </>
                                )}
                                {linkingMode && (
                                    <>
                                        <span className="editor-viewport-status__sep" aria-hidden>·</span>
                                        <span className="editor-viewport-status__link">Link</span>
                                    </>
                                )}
                                {interiorMode && (
                                    <>
                                        <span className="editor-viewport-status__sep" aria-hidden>·</span>
                                        <span className="editor-viewport-status__link">Interior</span>
                                    </>
                                )}
                            </div>
                        </div>
                        {activeTool === 'parts' && (
                            <div className="viewport-edit-mode-strip" role="toolbar" aria-label="Edit selection mode">
                                {[
                                    { id: 'part', label: 'Part', hotkey: '1' },
                                    { id: 'face', label: 'Face', hotkey: '2' },
                                    { id: 'edge', label: 'Edge', hotkey: '3' },
                                    { id: 'vertex', label: 'Vertex', hotkey: '4' },
                                ].map((m) => (
                                    <button
                                        key={m.id}
                                        type="button"
                                        className={`viewport-edit-mode-pill ${meshEditSelectMode === m.id ? 'is-active' : ''}`}
                                        onClick={() => setMeshEditSelectMode(m.id)}
                                        title={`${m.label} selection (${m.hotkey})`}
                                    >
                                        {m.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        <ViewportOverlays show={showOverlays} onClose={() => setShowOverlays(false)} />
                        <PerformanceMonitor visible={showPerfMonitor} />
                        <TransformConstraints />

                        {liftedObjectId && liftOrigin && (
                            <div style={{
                                position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
                                zIndex: 50, display: 'flex', gap: '10px', alignItems: 'center',
                                background: 'rgba(26, 67, 92, 0.2)', backdropFilter: 'blur(14px)',
                                border: '0.8px solid rgba(111, 177, 232, 0.21)',
                                borderRadius: '5px', padding: '7px 20px',
                                fontFamily: "'Poppins', monospace", fontSize: '11px',
                                color: '#fff', boxShadow: '0 0 40px rgba(249,115,22,0.18)',
                                pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap'
                            }}>
                                <span style={{ color: '#f97316', fontWeight: 700, fontSize: '9px', letterSpacing: '0.01em' }}>Dragging</span>
                                {axisLock && (
                                    <span style={{
                                        background: axisLock === 'X' ? 'rgba(249,115,22,0.2)' : 'rgba(56,189,248,0.2)',
                                        border: `1px solid ${axisLock === 'X' ? '#f97316' : '#38bdf8'}`,
                                        color: axisLock === 'X' ? '#f97316' : '#38bdf8',
                                        borderRadius: '6px', padding: '2px 8px',
                                        fontSize: '10px', fontWeight: 800, letterSpacing: '0.012em',
                                        boxShadow: `0 0 10px ${axisLock === 'X' ? 'rgba(249,115,22,0.4)' : 'rgba(56,189,248,0.4)'}`
                                    }}>
                                        {axisLock}-Axis Locked
                                    </span>
                                )}
                                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />
                                <div style={{ display: 'flex', gap: '14px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#f97316', fontSize: '8px', fontWeight: 700, letterSpacing: '0.01em' }}>ΔX</div>
                                        <div style={{ fontWeight: 600, fontSize: '10px' }}>{dx >= 0 ? '+' : ''}{dx.toFixed(1)} <span style={{ fontSize: '9px', opacity: 0.6 }}>cm</span></div>
                                    </div>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#38bdf8', fontSize: '8px', fontWeight: 700, letterSpacing: '0.01em' }}>ΔZ</div>
                                        <div style={{ fontWeight: 600, fontSize: '10px' }}>{dz >= 0 ? '+' : ''}{dz.toFixed(1)} <span style={{ fontSize: '9px', opacity: 0.6 }}>cm</span></div>
                                    </div>
                                    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#a78bfa', fontSize: '8px', fontWeight: 700, letterSpacing: '0.01em' }}>Distance</div>
                                        <div style={{ fontWeight: 800, fontSize: '10px', color: '#a78bfa' }}>{totalDist.toFixed(1)} <span style={{ fontSize: '9px', opacity: 0.7 }}>cm</span></div>
                                    </div>
                                    <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />

                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ color: '#34d399', fontSize: '8px', fontWeight: 700, letterSpacing: '0.01em' }}>Bearing</div>
                                        <div style={{ fontWeight: 800, fontSize: '10px', color: '#34d399', display: 'flex', alignItems: 'center', gap: '3px', justifyContent: 'center' }}>
                                            <span style={{ display: 'inline-block', transform: `rotate(${totalDist > 0.5 ? bearingDeg : 0}deg)`, fontSize: '12px', lineHeight: 1, transition: 'transform 0.1s' }}>↑</span>
                                            {totalDist > 0.5 ? `${bearingDeg.toFixed(0)}°` : '0°'}
                                            <span style={{ fontSize: '9px', opacity: 0.75, marginLeft: '2px' }}>{compassDir}</span>
                                        </div>
                                    </div>
                                </div>
                                <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.12)' }} />
                                <span style={{ fontSize: '9px', color: '#64748b', letterSpacing: '0.01em' }}>Click to Drop · Esc Cancel</span>
                            </div>
                        )}

                        {shiftPressed && ctrlPressed && (
                            <div className="canvas-dismantle-hud">
                                <PuzzlePieceIcon className="dismantle-hud-icon" />
                                <span>Quick Dismantle Mode Active</span>
                                <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.2)' }} />
                                <span style={{ color: '#fb923c' }}>Click parts to detach</span>
                            </div>
                        )}

                        <div className="canvas-tool-strip">
                            {tools.map(t => (
                                <button
                                    type="button"
                                    key={t.id}
                                    className={`canvas-tool-btn ${(activeTool === t.id || (t.id === 'interior' && interiorMode)) ? 'active' : ''} ${(t.id === 'delete') ? 'tool-danger' : ''}`}
                                    title={t.title}
                                    aria-label={t.title}
                                    onClick={() => {
                                        const st = useStore.getState();
                                        if (t.id === 'reset') {
                                            st.resetSelectedObject();
                                        } else if (t.id === 'fullscreen') {
                                            setCanvasFullscreen(!canvasFullscreen);
                                        } else if (t.id === 'interior') {
                                            toggleInteriorMode(selectedId);
                                        } else if (t.id === 'duplicate') {
                                            if (st.selectedId) st.duplicateObject(st.selectedId);
                                        } else if (t.id === 'delete') {
                                            if (st.selectedId) st.removeObject(st.selectedId);
                                        } else if (st.activeTool === 'parts' && (t.id === 'move' || t.id === 'rotate' || t.id === 'scale')) {
                                            if (t.id === 'move') st.setMeshEditTransformMode('translate');
                                            if (t.id === 'rotate') st.setMeshEditTransformMode('rotate');
                                            if (t.id === 'scale') st.setMeshEditTransformMode('scale');
                                            setLinkingMode(false);
                                        } else {
                                            setActiveTool(t.id);
                                            setLinkingMode(false);
                                        }
                                    }}
                                >
                                    <t.icon style={{ width: 18, height: 18, color: t.id === 'fullscreen' ? '#38bdf8' : t.id === 'delete' ? '#ef4444' : undefined }} aria-hidden />
                                </button>
                            ))}

                            <div style={{ width: '80%', height: 1, background: 'rgba(255,255,255,0.1)', margin: '4px auto' }} />
                            <button
                                type="button"
                                className={`canvas-tool-btn ${linkingMode ? 'active' : ''}`}
                                title="Link Objects (Parent-Child)"
                                aria-label={linkingMode ? 'Exit link mode' : 'Link objects (parent-child)'}
                                aria-pressed={linkingMode}
                                onClick={() => setLinkingMode(!linkingMode)}
                                style={linkingMode ? {
                                    background: 'rgba(34,211,153,0.18)',
                                    border: '1px solid rgba(34,211,153,0.6)',
                                    boxShadow: '0 0 12px rgba(34,211,153,0.4)',
                                    animation: 'pulse 1.5s ease-in-out infinite'
                                } : {}}
                            >
                                <LinkIcon style={{ width: 18, height: 18, color: linkingMode ? '#34d399' : undefined }} aria-hidden />
                            </button>
                        </div>

                        {canvasFullscreen && (
                            <div className="floating-right-tools">
                                <div className="floating-tool-group">
                                    <div className="floating-group-title">Primitives</div>
                                    <div className="floating-tool-grid">
                                        <FloatingToolBtn icon="□" title="Box" onClick={() => useStore.getState().addObject({ type: 'primitive', geo: 'box', dimensions: [1, 1, 1], color: '#e2e8f0' })} />
                                        <FloatingToolBtn icon="○" title="Sphere" onClick={() => useStore.getState().addObject({ type: 'primitive', geo: 'sphere', dimensions: [1, 1, 1], color: '#e2e8f0' })} />
                                        <FloatingToolBtn icon="⌒" title="Cylinder" onClick={() => useStore.getState().addObject({ type: 'primitive', geo: 'cylinder', dimensions: [1, 1, 1], color: '#e2e8f0' })} />
                                        <FloatingToolBtn icon="◎" title="Torus" onClick={() => useStore.getState().addObject({ type: 'primitive', geo: 'torus', dimensions: [1, 1, 1], color: '#e2e8f0' })} />
                                        <FloatingToolBtn icon="△" title="Cone" onClick={() => useStore.getState().addObject({ type: 'primitive', geo: 'cone', dimensions: [1, 1, 1], color: '#e2e8f0' })} />
                                        <FloatingToolBtn icon="▭" title="Plane" onClick={() => useStore.getState().addObject({ type: 'primitive', geo: 'plane', dimensions: [1, 1, 1], color: '#e2e8f0' })} />
                                    </div>
                                </div>

                                <div className="floating-tool-group">
                                    <div className="floating-group-title">Modifiers</div>
                                    <div className="floating-tool-grid">
                                        <FloatingToolBtn icon="⟺" title="Mirror X" onClick={() => {
                                            const { objects, selectedId, updateObject } = useStore.getState();
                                            const obj = objects.find(o => o.id === selectedId);
                                            if (obj) {
                                                const scl = [...(obj.scale || [1, 1, 1])];
                                                scl[0] *= -1;
                                                updateObject(selectedId, { scale: scl });
                                            }
                                        }} />
                                        <FloatingToolBtn icon="⟺" title="Mirror Y" onClick={() => {
                                            const { objects, selectedId, updateObject } = useStore.getState();
                                            const obj = objects.find(o => o.id === selectedId);
                                            if (obj) {
                                                const scl = [...(obj.scale || [1, 1, 1])];
                                                scl[1] *= -1;
                                                updateObject(selectedId, { scale: scl });
                                            }
                                        }} />
                                        <FloatingToolBtn icon="⟺" title="Mirror Z" onClick={() => {
                                            const { objects, selectedId, updateObject } = useStore.getState();
                                            const obj = objects.find(o => o.id === selectedId);
                                            if (obj) {
                                                const scl = [...(obj.scale || [1, 1, 1])];
                                                scl[2] *= -1;
                                                updateObject(selectedId, { scale: scl });
                                            }
                                        }} />
                                    </div>
                                </div>

                                <div className="floating-tool-group">
                                    <div className="floating-group-title">Alignment</div>
                                    <div className="floating-tool-grid">
                                        <FloatingToolBtn icon="↓" title="Ground" onClick={() => {
                                            const { objects, selectedId, updateObject } = useStore.getState();
                                            const obj = objects.find(o => o.id === selectedId);
                                            if (obj) {
                                                const groundObj = objects.find(g => g.type === 'ground');
                                                let floorY = 0;
                                                if (groundObj) floorY = groundObj.position[1] + ((groundObj.dimensions?.[1] || 1) * (groundObj.scale?.[1] || 1)) / 2;
                                                const bottomOffset = obj.type === 'gltf' || obj.type === 'stl' ? 0 : ((obj.dimensions?.[1] || 1) / 2 * (obj.scale?.[1] || 1));
                                                updateObject(selectedId, { position: [obj.position[0], floorY + bottomOffset, obj.position[2]] });
                                            }
                                        }} />
                                        <FloatingToolBtn icon="⊢" title="Align X" onClick={() => {
                                            const { objects, selectedId, updateObject } = useStore.getState();
                                            const obj = objects.find(o => o.id === selectedId);
                                            if (obj) {
                                                const pos = [...(obj.position || [0, 0, 0])];
                                                pos[0] = 0;
                                                updateObject(selectedId, { position: pos });
                                            }
                                        }} />
                                        <FloatingToolBtn icon="⊣" title="Align Y" onClick={() => {
                                            const { objects, selectedId, updateObject } = useStore.getState();
                                            const obj = objects.find(o => o.id === selectedId);
                                            if (obj) {
                                                const pos = [...(obj.position || [0, 0, 0])];
                                                pos[1] = 0;
                                                updateObject(selectedId, { position: pos });
                                            }
                                        }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div
                            className={`canvas-wrapper${materialPaintMode ? ' canvas-wrapper--paint-touch' : ''}`}
                            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY }); }}
                        >
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 12,
                                    right: 12,
                                    zIndex: 30,
                                    display: 'flex',
                                    gap: 8,
                                }}
                            >
                                <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => switchEngine(usingPlayCanvas ? 'r3f' : 'playcanvas')}
                                    title={usingPlayCanvas ? 'Switch to React Three Fiber renderer' : 'Switch to PlayCanvas renderer'}
                                >
                                    {usingPlayCanvas ? 'Use R3F' : 'Use PlayCanvas'}
                                </button>
                            </div>
                            <WebGpuPathTraceBanner />
                            {usingPlayCanvas ? (
                                <>
                                    <PlayCanvasViewport
                                        objects={objects}
                                        selectedId={selectedId}
                                        activeTool={activeTool}
                                        axisConstraint={axisConstraint}
                                        transformSpace={transformSpace}
                                        objectSnapEnabled={objectSnapEnabled}
                                        onSelectObject={(id) => {
                                            const st = useStore.getState();
                                            if (!id) {
                                                st.deselectAll();
                                                return;
                                            }
                                            st.setSelectedId(id);
                                        }}
                                        onUpdateObject={(id, updates) => {
                                            useStore.getState().updateObject(id, updates);
                                        }}
                                        onDeleteSelected={() => {
                                            useStore.getState().deleteSelected();
                                        }}
                                        onDuplicateSelected={() => {
                                            useStore.getState().duplicateSelected();
                                        }}
                                        onFrameSelection={(scope) => {
                                            document.dispatchEvent(new CustomEvent('novira:frame-camera', { detail: { scope } }));
                                        }}
                                        onUndo={() => {
                                            useStore.getState().editorUndo();
                                        }}
                                        onRedo={() => {
                                            useStore.getState().editorRedo();
                                        }}
                                        onCopySelected={() => {
                                            useStore.getState().copySelected();
                                        }}
                                        onPasteClipboard={() => {
                                            useStore.getState().pasteClipboard();
                                        }}
                                        onSelectAll={() => {
                                            useStore.getState().selectAll();
                                        }}
                                        onGroupSelected={() => {
                                            useStore.getState().groupSelected();
                                        }}
                                        onUngroupSelected={() => {
                                            useStore.getState().ungroupSelected();
                                        }}
                                        onSetAxisConstraint={(axis) => {
                                            useStore.getState().setAxisConstraint(axis);
                                        }}
                                        onToggleTransformSpace={() => {
                                            useStore.getState().toggleTransformSpace();
                                        }}
                                        onEscape={() => {
                                            const st = useStore.getState();
                                            st.setAxisConstraint(st.axisConstraint);
                                            st.setActiveTool('select');
                                            st.setShowCommandPalette(false);
                                        }}
                                        onToggleMultiSelect={(id) => {
                                            useStore.getState().toggleMultiSelect(id);
                                        }}
                                        onMarqueeSelect={(ids, mode = 'add') => {
                                            const st = useStore.getState();
                                            const current = new Set(
                                                (st.selectedIds && st.selectedIds.length)
                                                    ? st.selectedIds
                                                    : (st.selectedId ? [st.selectedId] : [])
                                            );
                                            const hit = new Set(Array.isArray(ids) ? ids : []);
                                            let next = new Set(current);
                                            if (mode === 'subtract') {
                                                hit.forEach((id) => next.delete(id));
                                            } else if (mode === 'replace') {
                                                next = new Set(hit);
                                            } else {
                                                hit.forEach((id) => next.add(id));
                                            }
                                            st.deselectAll();
                                            [...next].forEach((id) => st.toggleMultiSelect(id));
                                        }}
                                        onFocusSelection={() => {
                                            const st = useStore.getState();
                                            if (st.selectedId) st.setActiveTool('focus');
                                            else document.dispatchEvent(new CustomEvent('novira:frame-camera', { detail: { scope: 'all' } }));
                                        }}
                                        onContextPick={(id) => {
                                            const st = useStore.getState();
                                            if (id) st.setSelectedId(id);
                                        }}
                                        background={environmentVisible ? '#bae6fd' : '#0d1b2a'}
                                        showGround={environmentVisible}
                                    />
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 12,
                                            bottom: 12,
                                            zIndex: 22,
                                            padding: '8px 12px',
                                            borderRadius: 10,
                                            background: 'rgba(15, 23, 42, 0.88)',
                                            color: '#e2e8f0',
                                            border: '1px solid rgba(56, 189, 248, 0.45)',
                                            fontSize: 11,
                                            fontWeight: 600,
                                            letterSpacing: '0.01em',
                                        }}
                                    >
                                        PlayCanvas mode active. Selection works; use Move/Rotate/Scale + arrows/WASD, R/F (up/down), Q/E or Z/X (scale).
                                    </div>
                                    <div
                                        style={{
                                            position: 'absolute',
                                            left: 12,
                                            top: 52,
                                            zIndex: 22,
                                            padding: '8px 10px',
                                            borderRadius: 8,
                                            background: 'rgba(2, 6, 23, 0.82)',
                                            color: '#bfdbfe',
                                            border: '1px solid rgba(56, 189, 248, 0.35)',
                                            fontSize: 11,
                                            lineHeight: 1.35,
                                            minWidth: 220,
                                        }}
                                    >
                                        <div style={{ fontWeight: 700, color: '#e0f2fe', marginBottom: 2 }}>
                                            PlayCanvas Transform HUD
                                        </div>
                                        <div>Tool: <strong>{TOOL_LABELS[activeTool] || activeTool}</strong></div>
                                        <div>Selected: <strong>{selectedObj?.name || selectedObj?.id || 'None'}</strong></div>
                                        <div>Axis: <strong>{axisConstraint ? axisConstraint.toUpperCase() : 'Free'}</strong></div>
                                        <div>Space: <strong>{transformSpace === 'local' ? 'Local' : 'World'}</strong></div>
                                        <div style={{ opacity: 0.9 }}>
                                            Gizmo: Move (X/Y/Z), Rotate (Y), Scale (uniform)
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <Canvas
                                    shadows
                                    camera={{ position: [8, 8, 8], fov: 45 }}
                                    gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true, powerPreference: 'high-performance', toneMapping: THREE.NoToneMapping }}
                                    onCreated={({ gl }) => {
                                        const xr = gl.xr;
                                        if (xr && typeof xr === 'object' && typeof xr.getEnvironmentBlendMode !== 'function') {
                                            xr.getEnvironmentBlendMode = () => 'opaque';
                                        }
                                    }}
                                    onPointerMissed={() => {
                                        useStore.getState().setSelectedId(null);
                                        useStore.getState().deselectAll();
                                    }}
                                >
                                    <color attach="background" args={[environmentVisible ? '#bae6fd' : '#0d1b2a']} />
                                    {environmentVisible && <fog attach="fog" args={['#bae6fd', 10, 800]} />}
                                    <Suspense
                                        fallback={(
                                            <Html center prepend distanceFactor={8} style={{ pointerEvents: 'none' }}>
                                                <div
                                                    style={{
                                                        padding: '12px 20px',
                                                        borderRadius: 12,
                                                        fontFamily: "'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif",
                                                        fontSize: 13,
                                                        fontWeight: 600,
                                                        color: '#0c4a6e',
                                                        background: 'rgba(255,255,255,0.92)',
                                                        border: '1px solid rgba(14, 165, 233, 0.35)',
                                                        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                                        whiteSpace: 'nowrap',
                                                    }}
                                                    role="status"
                                                    aria-live="polite"
                                                >
                                                    Loading scene…
                                                </div>
                                            </Html>
                                        )}
                                    >
                                        {(environmentVisible || customHdriUrl) ? <EnvSystem /> : <Environment preset="studio" />}
                                        <SceneContent />
                                        <SnapGuides />
                                        <RulerTool />
                                        <ExportTrigger />
                                        <HighResExportTrigger />
                                        <WebXRSessionBridge />
                                        <SimulationOverlays />
                                        <DropHandler />
                                        <ViewportSpawnBridge />
                                        <MaterialPaintBridge />
                                        <ViewportStatusRig orbitRef={orbitRef} />
                                        <GeolocatedSunLight />
                                    </Suspense>

                                    {!environmentVisible && (
                                        <>
                                            <ambientLight intensity={lightingEnabled ? 0.42 : 0.05} />
                                            <directionalLight
                                                position={[-18, 14, -12]}
                                                intensity={lightingEnabled ? 0.22 : 0}
                                            />
                                        </>
                                    )}

                                    {environmentVisible && (
                                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
                                            <planeGeometry args={[5000, 5000]} />
                                            <meshStandardMaterial color="#cbd5e1" roughness={1} metalness={0} />
                                        </mesh>
                                    )}

                                    {gridVisible && <Grid infiniteGrid fadeDistance={40} sectionColor="#1e40af" cellColor="#3b82f6" />}

                                    {lightingEnabled && (
                                        <ContactShadows resolution={1024} scale={20} blur={2} opacity={0.3} far={10} color="#000000" />
                                    )}
                                    <CameraAnimator orbitRef={orbitRef} />
                                    {viewportNavMode === 'walk' ? (
                                        <WalkNavigationRig enabled />
                                    ) : (
                                        <OrbitControls
                                            ref={orbitRef}
                                            makeDefault
                                            minPolarAngle={0}
                                            maxPolarAngle={Math.PI / 2 + 0.1}
                                            enabled={!liftedObjectId && !isTransformDragging}
                                            enableRotate={activeTool !== 'cursor'}
                                            enableDamping={true}
                                            dampingFactor={0.05}
                                            zoomSpeed={0.8}
                                            panSpeed={0.8}
                                            rotateSpeed={0.8}
                                        />
                                    )}
                                </Canvas>
                            )}
                        </div>

                        {xrPresenting && (
                            <button
                                type="button"
                                className="studio-webxr-exit"
                                onClick={() => document.dispatchEvent(new CustomEvent('novira:webxr-exit-vr'))}
                                title="End WebXR session (also ends from headset)"
                            >
                                Exit VR (WebXR)
                            </button>
                        )}

                        <ViewportAxisNavDom />

                        {viewportNavMode === 'walk' && (
                            <div
                                className="canvas-walk-hint"
                                style={{
                                    position: 'absolute',
                                    left: 12,
                                    top: 52,
                                    zIndex: 20,
                                    padding: '6px 12px',
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: '#e0f2fe',
                                    background: 'rgba(15, 23, 42, 0.88)',
                                    border: '1px solid rgba(56, 189, 248, 0.35)',
                                    pointerEvents: 'none',
                                }}
                            >
                                WASD move · click canvas to look · Esc = orbit
                            </div>
                        )}

                        {(showSelectHint || (interiorMode && smartZoomEnabled)) && !liftedObjectId && (
                            <div className="canvas-drag-hint" style={{
                                bottom: showDragHint ? '80px' : '40px',
                                background: interiorMode ? 'rgba(59,130,246,0.95)' : 'rgba(249,115,22,0.95)',
                                borderColor: interiorMode ? '#3b82f6' : '#f97316',
                                boxShadow: interiorMode ? '0 0 20px rgba(59,130,246,0.3)' : '0 0 20px rgba(249,115,22,0.3)'
                            }}>
                                <SparklesIcon style={{ width: 16, height: 16, color: '#ffffff' }} />
                                <span style={{ color: '#ffffff', fontWeight: 500 }}>
                                    {interiorMode ? 'Smart Zoom Active: Click any surface to focus' : 'Click any flat face to auto-focus camera'}
                                </span>
                            </div>
                        )}

                        {mode === 'preview' && cinemaChrome && !canvasFullscreen && (
                            <button
                                type="button"
                                className="studio-cinema-exit"
                                onClick={() => setCinemaChrome(false)}
                                title="Exit Cinema (Esc) — return to Present"
                            >
                                <ArrowsPointingOutIcon style={{ width: 16, height: 16 }} />
                                <span>Exit cinema</span>
                            </button>
                        )}
                    </div>

                    {mode === 'preview' && !cinemaChrome && !canvasFullscreen && (
                        <div className="studio-present-hint" aria-live="polite">
                            <span className="studio-present-hint__title">Present mode</span>
                            <span className="studio-present-hint__sub">Minimal chrome · Switch to Design to edit · Use the pill to open the asset library</span>
                        </div>
                    )}

                    {!canvasFullscreen &&
                        footerVisible &&
                        catalogDockMode !== 'sidebar' &&
                        showSceneUI &&
                        catalogDockMode === 'footer' && (
                            <div
                                className="editor-footer-bar editor-footer-bar--assets"
                                style={{
                                    height: footerHeight,
                                    minHeight: 220,
                                    width: '100%',
                                    flexShrink: 0,
                                }}
                            >
                                <AssetBrowser
                                    onClose={() => setFooterVisible(false)}
                                    onResize={(delta) => {
                                        setFooterHeight((h) => Math.min(560, Math.max(220, h + delta)));
                                    }}
                                />
                            </div>
                        )}

                    {!canvasFullscreen && !footerVisible && (
                        <button
                            type="button"
                            className="pro-footer-toggle studio-footer-catalog-restore"
                            title="Restore the asset catalog (docked bar or floating library). You can also use the header stack icon."
                            aria-label="Show asset catalog"
                            onClick={() => setFooterVisible(true)}
                        >
                            <RectangleStackIcon style={{ width: 14, height: 14 }} aria-hidden />
                            <span>Show catalog</span>
                        </button>
                    )}
                    </div>
                    )}
                </div>

                {showSceneUI && !canvasFullscreen && <PropertiesPanel />}
            </div>

            <DismantleModal />
            <TemplateGalleryModal open={templateGalleryOpen} onClose={() => setTemplateGalleryOpen(false)} />
            <LayoutManagerModal />
            <CommandPalette />
            {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} onClose={() => setCtxMenu(null)} />}
            {showShortcuts && (
                <ShortcutsOverlay
                    scrollToId={shortcutsScrollId}
                    onClose={() => {
                        setShowShortcuts(false);
                        setShortcutsScrollId(null);
                    }}
                />
            )}
            {showArrayTool && (
                <div
                    className="studio-modal-shell"
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 9990,
                        width: 280,
                        overflow: 'hidden',
                    }}
                >
                    <ArrayTool onClose={() => setShowArrayTool(false)} />
                </div>
            )}
            {showSceneSearch && <SceneSearch onClose={() => setShowSceneSearch(false)} />}
            {showExportPanel && (
                <div
                    className="studio-modal-shell"
                    style={{
                        position: 'fixed',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        zIndex: 9990,
                        width: 320,
                        overflow: 'hidden',
                    }}
                >
                    <SceneExportPanel prefill={exportPrefill} onClose={() => { setShowExportPanel(false); setExportPrefill(null); }} />
                </div>
            )}

            <div
                className="editor-status-bar studio-status-bar"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '0 14px',
                    flexShrink: 0,
                    userSelect: 'none',
                    fontFamily: "'Plus Jakarta Sans', 'Poppins', sans-serif",
                }}
            >
                {!showSceneUI ? (
                    <>
                        <span style={{
                            fontWeight: 700, color: '#fff',
                            background: 'linear-gradient(135deg, #0d9488, #14b8a6)', padding: '3px 10px', borderRadius: 999, fontSize: 10,
                            letterSpacing: '0.02em',
                        }}>{studioViewLayout === 'elevation' ? 'Elevation' : '2D plan'}</span>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <span style={{
                            fontWeight: 600, color: '#cbd5e1', fontSize: 9, padding: '2px 8px', borderRadius: 999,
                            border: '1px solid rgba(148,163,184,0.35)', letterSpacing: '0.04em',
                        }} title="Active building story (floor plan layer)">
                            {(buildingStories || []).find((s) => s.id === activeBuildingStoryId)?.name
                                || activeBuildingStoryId
                                || 'Story'}
                        </span>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <button
                            type="button"
                            className="studio-status-link"
                            title="Cycle display units (m, cm, mm, ft, in)"
                            onClick={() => cycleDesignUnits()}
                        >
                            Units: {designUnitLabel(designUnits)}
                        </button>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <span
                            style={{ color: '#94a3b8', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
                            title="Floor plan cursor — react-planner scene coordinates (horizontal plane)"
                        >
                            Cursor{' '}
                            {plannerHudSceneCm
                                ? `X ${formatDesignLength(plannerHudSceneCm[0] / 100, designUnits)} · Y ${formatDesignLength(
                                      plannerHudSceneCm[1] / 100,
                                      designUnits
                                  )}`
                                : '— · —'}
                        </span>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <span
                            style={{ color: '#94a3b8', fontSize: 10, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            title="Plan walls and openings in 2D; use Sync to 3D in the plan toolbar to push geometry and catalog items into the viewport."
                        >
                            {studioViewLayout === 'elevation'
                                ? 'Elevation: wall heights & openings — sync from plan toolbar when ready.'
                                : '2D plan: draw walls, then Sync to 3D. Use toolbar for 2D / 3D / walk or Split.'}
                        </span>
                        <button
                            type="button"
                            className="studio-status-link"
                            onClick={() => setStudioViewLayout('scene')}
                            title="Show main 3D viewport"
                        >
                            3D scene
                        </button>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <button type="button" className="studio-status-link" onClick={() => setStudioViewLayout('split')} title="Plan and 3D side by side">
                            Split view
                        </button>
                    </>
                ) : (
                    <>
                        {studioViewLayout === 'split' && (
                            <>
                                <span style={{
                                    fontWeight: 700, color: '#fff',
                                    background: 'linear-gradient(135deg, #0d9488, #6366f1)', padding: '3px 10px', borderRadius: 999, fontSize: 10,
                                    letterSpacing: '0.02em',
                                }}>Split 2D+3D</span>
                                <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                            </>
                        )}
                        <span style={{
                            fontWeight: 700, color: '#fff', textTransform: 'capitalize',
                            background: 'linear-gradient(135deg, #7c3aed, #6366f1)', padding: '3px 10px', borderRadius: 999, fontSize: 10,
                            letterSpacing: '0.02em',
                        }}>{activeTool}</span>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <button
                            type="button"
                            className="studio-status-link"
                            onClick={() => toggleTransformSpace()}
                            title="World = move along room axes; Local = along the object (like Blender). Ctrl+,"
                        >
                            {transformSpace === 'local' ? 'Local' : 'World'}
                        </button>
                        {mode === 'build' && (
                            <>
                                <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                                <span
                                    className="studio-status-shortcuts"
                                    title="Viewport tools (same as the left tool strip)"
                                    aria-label="Tool shortcuts: Escape select, G move, R rotate, S scale, question mark for help"
                                >
                                    <span className="studio-status-kbd">Esc</span>
                                    <span className="studio-status-kbd">G</span>
                                    <span className="studio-status-kbd">R</span>
                                    <span className="studio-status-kbd">S</span>
                                    <span className="studio-status-kbd">?</span>
                                    <span className="studio-status-kbd">Shift+S</span>
                                    <span className="studio-status-kbd">Ctrl+,</span>
                                    <span className="studio-status-kbd">Ctrl+Shift+H</span>
                                    <span className="studio-status-kbd">Home</span>
                                    <span className="studio-status-kbd" title="Alt + arrows / PgUp PgDn">Alt+↑</span>
                                </span>
                            </>
                        )}
                        <span style={{ color: '#5c5878' }}>|</span>
                        <button
                            type="button"
                            className="studio-status-link"
                            title="Cycle display units (m, cm, mm, ft, in)"
                            onClick={() => cycleDesignUnits()}
                        >
                            {designUnitLabel(designUnits)}
                        </button>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <button
                            type="button"
                            className="studio-status-link"
                            onClick={() => toggleObjectSnap()}
                            title="Alignment guides while dragging; when Snap is on: 25 cm move steps, 5% scale steps, 15° rotate steps (Shift still gives 15° rotate when Snap is off)"
                        >
                            Snap {objectSnapEnabled !== false ? 'on' : 'off'}
                        </button>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <button
                            type="button"
                            className="studio-status-link"
                            onClick={() => useStore.getState().setSnapCursorMenuOpen(true)}
                            title="Cursor & placement — same idea as Blender Shift+S (press again to close)"
                        >
                            Cursor menu
                        </button>
                        {studioViewLayout === 'split' && plannerHudSceneCm && (
                            <>
                                <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                                <span
                                    style={{ color: '#5eead4', fontSize: 10, fontFamily: 'ui-monospace, monospace' }}
                                    title="Floor plan cursor while the 2D panel is active"
                                >
                                    Plan X·Y{' '}
                                    {formatDesignLength(plannerHudSceneCm[0] / 100, designUnits)} ·{' '}
                                    {formatDesignLength(plannerHudSceneCm[1] / 100, designUnits)}
                                </span>
                            </>
                        )}
                        <span style={{ color: '#5c5878' }}>|</span>
                        <span style={{ color: '#c4bdd9' }}>{objects.filter(o => o.type !== 'ground').length} obj</span>
                        <span style={{ color: '#c4bdd9' }}>{objects.filter(o => o.type === 'light').length} lt</span>
                        <span style={{ color: '#64748b' }}>|</span>
                        <span
                            style={{
                                color: '#94a3b8',
                                fontSize: 10,
                                flex: 0,
                                minWidth: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                            title={studioSceneStatusHint(
                                activeTool,
                                !!(selectedId || (selectedIds && selectedIds.length > 0)),
                            )}
                        >
                            {mode === 'build' ? 'Design' : 'Present'}
                        </span>
                        <button type="button" className="studio-status-link" onClick={() => setShowSceneSearch(true)}>
                            Ctrl+Shift+F Search
                        </button>
                        <span style={{ color: '#5c5878' }} aria-hidden>|</span>
                        <button type="button" className="studio-status-link" onClick={() => useStore.getState().setShowCommandPalette(true)}>
                            Ctrl+K Commands
                        </button>
                    </>
                )}
            </div>

            <LibraryBrowser isOpen={libraryBrowserOpen} onClose={() => setLibraryBrowserOpen(false)} />

            <SnapCursorMenu />

            <StudioOnboarding />
            <WelcomeTooltips />
        </div>
    );
}
