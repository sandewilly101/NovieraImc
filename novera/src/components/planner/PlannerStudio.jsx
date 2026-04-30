import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Provider, useSelector } from 'react-redux';
import { useShallow } from 'zustand/react/shallow';
import {
  ReactPlanner,
  Plugins as PlannerPlugins,
  createNoviraIntegratedCatalog,
  ReactPlannerConstants,
} from 'react-planner';
import { getProxyModelUrl } from '../../utils/proxyModelUrl';
import useStore from '../../store/useStore';
import {
  mergePlannerCatalogSources,
  normalizePersistedPlannerCatalogModels,
  plannerNoviraModelCatalogEntriesFromPlannerState,
  requestOpenAssetLibrary,
  sceneObjectsToPlannerCatalogEntries,
} from '../../utils/plannerSceneCatalog';
import { createNoviraPlannerAutosavePlugin } from '../../utils/plannerSanitizeScene';
import { syncPlannerBridgeToNoviraScene } from '../../utils/plannerToNoviraBridge';
import { showToast } from '../../utils/noviraToast';
import {
  dispatchPlannerInsertArcWalls,
  dispatchPlannerInsertRectRoomWalls,
  dispatchPlannerSelectDrawingHole,
  dispatchPlannerSnapCloseWallGap,
  dispatchRefreshPlannerRoomZones,
  ensurePlannerReduxStore,
  getPlannerReduxStore,
} from '../../utils/plannerReduxBridge';
import { loadPlannerTraceImage, savePlannerTraceImage } from '../../utils/plannerTraceImageStorage';
import { buildNoviraPlannerCustomContents } from './plannerNoviraThreePanels';
import { plannerStoryStorageKey } from '../../utils/plannerStoryBridge';
import { plannerViewerEventToSceneCm } from '../../utils/plannerViewerSceneCoords';
import BuildingStoryBar from './BuildingStoryBar';
import PlannerSelectionDimensions from './PlannerSelectionDimensions';
import PlannerCursorHudBridge from './PlannerCursorHudBridge';
import PlannerFloatingTraceOverlay from './PlannerFloatingTraceOverlay';

/** Legacy single-slot autosave (migrated into per-story keys when empty). */
const { MODE_IDLE } = ReactPlannerConstants;

const RECT_AUTO_INSERT_KEY = 'novira_rect_auto_insert_after_pick_v1';

function loadRectAutoInsert() {
  try {
    return localStorage.getItem(RECT_AUTO_INSERT_KEY) === '1';
  } catch {
    return false;
  }
}

function persistRectAutoInsert(v) {
  try {
    localStorage.setItem(RECT_AUTO_INSERT_KEY, v ? '1' : '0');
  } catch {
    /* ignore */
  }
}

const LEGACY_GLOBAL_PLANNER_KEY = 'novira_react_planner_v2';
const LEGACY_PLANNER_AUTOSAVE_KEYS = ['novira_react_planner_v1', LEGACY_GLOBAL_PLANNER_KEY];
const CATALOG_MODELS_KEY = 'novira_planner_catalog_models_v1';

function loadPersistedModels() {
  try {
    const raw = localStorage.getItem(CATALOG_MODELS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const { entries, changed } = normalizePersistedPlannerCatalogModels(parsed);
    if (changed) {
      try {
        localStorage.setItem(CATALOG_MODELS_KEY, JSON.stringify(entries));
      } catch {
        /* quota */
      }
    }
    return entries;
  } catch {
    return [];
  }
}

function savePersistedModels(entries) {
  const persistable = entries.filter((e) => e && e.url && /^https?:/i.test(String(e.url).trim()));
  try {
    localStorage.setItem(CATALOG_MODELS_KEY, JSON.stringify(persistable));
  } catch {
    /* ignore quota */
  }
}

function needsProxyUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return (
    url.includes('tripo') ||
    url.includes('tripo3d') ||
    url.includes('amazonaws.com') ||
    url.includes('r2.cloudflarestorage.com')
  );
}

/** Apply API proxy for hosts that block direct browser loads. */
function applyProxyToEntries(entries) {
  return entries.map((e) => {
    const url = String(e.url).trim();
    const proxied = needsProxyUrl(url) ? getProxyModelUrl(url) : url;
    return {
      ...e,
      url: proxied || url,
    };
  });
}

function useContainerSize() {
  const ref = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      const w = Math.max(320, Math.floor(r.width));
      const h = Math.max(240, Math.floor(r.height));
      if (w > 0 && h > 0) setSize({ width: w, height: h });
    }
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const ro = new ResizeObserver((entries) => {
      const cr = entries[0]?.contentRect;
      if (!cr) return;
      const w = Math.max(320, Math.floor(cr.width));
      const h = Math.max(240, Math.floor(cr.height));
      setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}

/**
 * Lives under Redux Provider so catalog entries from the current plan (novira-model-*) stay in sync
 * with autosave hydration — avoids catalog.getElement errors on first paint after load.
 */
function PlannerReactPlannerMount({
  width,
  height,
  sceneCatalogEntries,
  persistedModels,
  sessionModels,
  plannerRootStore,
  plugins,
}) {
  const plannerState = useSelector((s) => s.get('react-planner'));
  const planLinkedCatalogEntries = useMemo(
    () => plannerNoviraModelCatalogEntriesFromPlannerState(plannerState),
    [plannerState]
  );
  const mergedRaw = useMemo(
    () =>
      mergePlannerCatalogSources(sceneCatalogEntries, persistedModels, [
        ...planLinkedCatalogEntries,
        ...sessionModels,
      ]),
    [sceneCatalogEntries, persistedModels, sessionModels, planLinkedCatalogEntries]
  );
  const catalogEntries = useMemo(() => applyProxyToEntries(mergedRaw), [mergedRaw]);
  const catalog = useMemo(() => createNoviraIntegratedCatalog(catalogEntries), [catalogEntries]);
  const projectId = useStore((s) => s.projectId);
  const activeBuildingStoryId = useStore((s) => s.activeBuildingStoryId);

  const plannerKey = useMemo(
    () =>
      `novira-planner-${projectId || 'draft'}-${activeBuildingStoryId || 'floor1'}-${catalogEntries
        .map((e) => e.id)
        .join('.')}`,
    [projectId, activeBuildingStoryId, catalogEntries]
  );

  const customContents = useMemo(
    () => buildNoviraPlannerCustomContents(plannerRootStore),
    [plannerRootStore]
  );

  return (
    <ReactPlanner
      key={plannerKey}
      catalog={catalog}
      width={width}
      height={height}
      plugins={plugins}
      toolbarButtons={[]}
      customContents={customContents}
      stateExtractor={(state) => state.get('react-planner')}
    />
  );
}

/**
 * In-app react-planner: Novira-integrated catalog (walls/openings + GLB from scene & extras), Redux, 2D/3D tools.
 * Parent must give a sized box (flex:1; min-height:0).
 */
export default function PlannerStudio() {
  const objects = useStore(useShallow((s) => s.objects));
  const projectId = useStore((s) => s.projectId);
  const activeBuildingStoryId = useStore((s) => s.activeBuildingStoryId);
  const roofPreviewPitchDeg = useStore((s) => s.roofPreviewPitchDeg);
  const setRoofPreviewPitchDeg = useStore((s) => s.setRoofPreviewPitchDeg);
  const appendTerrainAssistStrip = useStore((s) => s.appendTerrainAssistStrip);
  const appendRoofAssistPreview = useStore((s) => s.appendRoofAssistPreview);

  const storyAutosaveKey = useMemo(
    () => plannerStoryStorageKey(projectId, activeBuildingStoryId),
    [projectId, activeBuildingStoryId]
  );

  const plugins = useMemo(
    () => [
      PlannerPlugins.Keyboard(),
      createNoviraPlannerAutosavePlugin(storyAutosaveKey, LEGACY_PLANNER_AUTOSAVE_KEYS),
      PlannerPlugins.ConsoleDebugger(),
    ],
    [storyAutosaveKey]
  );

  const [persistedModels, setPersistedModels] = useState(loadPersistedModels);
  const [sessionModels, setSessionModels] = useState([]);
  const [urlInput, setUrlInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [arcCx, setArcCx] = useState(420);
  const [arcCy, setArcCy] = useState(380);
  const [arcR, setArcR] = useState(220);
  const [arcStartDeg, setArcStartDeg] = useState(0);
  const [arcSweepDeg, setArcSweepDeg] = useState(90);
  const [arcSegments, setArcSegments] = useState(16);
  const [arcPickCenterMode, setArcPickCenterMode] = useState(false);
  const arcDetailsRef = useRef(null);
  const fileInputRef = useRef(null);
  const traceFileInputRef = useRef(null);
  const [traceImage, setTraceImage] = useState(null);
  const [traceOpacity, setTraceOpacity] = useState(0.45);
  const [rectMinX, setRectMinX] = useState(220);
  const [rectMinY, setRectMinY] = useState(200);
  const [rectWidthCm, setRectWidthCm] = useState(480);
  const [rectHeightCm, setRectHeightCm] = useState(400);
  const [rectPickCornersActive, setRectPickCornersActive] = useState(false);
  const [rectPickAwaitingSecond, setRectPickAwaitingSecond] = useState(false);
  const [rectAutoInsertAfterPick, setRectAutoInsertAfterPick] = useState(loadRectAutoInsert);
  const rectPickFirstCornerRef = useRef(null);
  const rectDetailsRef = useRef(null);
  const traceDetailsRef = useRef(null);

  const sceneCatalogEntries = useMemo(() => sceneObjectsToPlannerCatalogEntries(objects), [objects]);

  const store = useMemo(
    () =>
      ensurePlannerReduxStore(
        typeof window !== 'undefined' && window.__REDUX_DEVTOOLS_EXTENSION__
          ? window.__REDUX_DEVTOOLS_EXTENSION__()
          : undefined
      ),
    []
  );

  useEffect(() => {
    if (!projectId) {
      setTraceImage(null);
      return;
    }
    const loaded = loadPlannerTraceImage(projectId, activeBuildingStoryId);
    setTraceImage(loaded);
    if (loaded && typeof loaded.opacity === 'number') {
      setTraceOpacity(loaded.opacity);
    }
  }, [projectId, activeBuildingStoryId]);

  useEffect(() => {
    if (!projectId) return;
    try {
      savePlannerTraceImage(projectId, activeBuildingStoryId, traceImage);
    } catch {
      showToast('Could not persist plan trace (storage quota).', 'warn');
    }
  }, [projectId, activeBuildingStoryId, traceImage]);

  const onImportTraceImage = useCallback(
    (event) => {
      const file = event.target.files && event.target.files[0];
      event.target.value = '';
      if (!file || !String(file.type || '').startsWith('image/')) {
        showToast('Choose a PNG or JPEG floor plan image.', 'warn');
        return;
      }
      if (!projectId) {
        showToast('Open a saved project first so the trace can be stored.', 'warn');
        return;
      }
      const reader = new FileReader();
      reader.onerror = () => showToast('Could not read the image file.', 'warn');
      reader.onload = () => {
        const src = reader.result;
        if (typeof src !== 'string') return;
        const img = new window.Image();
        img.onload = () => {
          const rs = getPlannerReduxStore();
          const scene = rs?.getState()?.getIn(['react-planner', 'scene']);
          const sw = Number(scene?.get('width')) || 1200;
          const sh = Number(scene?.get('height')) || 800;
          const iw = Math.max(1, img.naturalWidth);
          const ih = Math.max(1, img.naturalHeight);
          const scale = Math.max(sw / iw, sh / ih);
          const width = iw * scale;
          const height = ih * scale;
          const x = (sw - width) / 2;
          const y = (sh - height) / 2;
          const op = Math.max(0.05, Math.min(1, traceOpacity));
          setTraceImage({ src, opacity: op, x, y, width, height });
          showToast('Trace image added — draw walls on top; opacity and story are saved per floor.', 'ok');
        };
        img.onerror = () => showToast('Could not decode the image.', 'warn');
        img.src = src;
      };
      reader.readAsDataURL(file);
    },
    [projectId, traceOpacity]
  );

  useEffect(() => {
    persistRectAutoInsert(rectAutoInsertAfterPick);
  }, [rectAutoInsertAfterPick]);

  useEffect(() => {
    const openTrace = () => {
      const el = traceDetailsRef.current;
      if (el && typeof el.open === 'boolean' && !el.open) el.open = true;
    };
    document.addEventListener('novira:planner-open-trace-details', openTrace);
    return () => document.removeEventListener('novira:planner-open-trace-details', openTrace);
  }, []);

  useEffect(() => {
    return () => {
      const { added, updated, removed } = syncPlannerBridgeToNoviraScene(useStore, store, { quiet: true });
      if (added + updated + removed > 0) {
        showToast('Floor plan applied to the 3D scene.', 'ok');
      }
    };
  }, [store]);

  const sendPlacementsToNoviraScene = useCallback(() => {
    const { added, updated, removed } = syncPlannerBridgeToNoviraScene(useStore, store);
    if (added > 0 || updated > 0 || removed > 0) {
      const lay = useStore.getState().studioViewLayout;
      if (lay === 'plan' || lay === 'elevation') useStore.getState().setStudioViewLayout('scene');
    }
  }, [store]);

  const detectRoomsFromWalls = useCallback(() => {
    const res = dispatchRefreshPlannerRoomZones();
    if (!res.ok) {
      if (res.reason === 'no_layer') {
        showToast('Select a floor layer in the plan first.', 'warn');
      } else {
        showToast('Planner is not ready yet — open the 2D plan tab and try again.', 'warn');
      }
      return;
    }
    try {
      useStore.getState().persistActivePlannerStory();
    } catch {
      /* ignore */
    }
    const n = res.areaCount ?? 0;
    const d = typeof res.delta === 'number' ? res.delta : 0;
    if (d > 0) {
      showToast(`Detected ${d} new room zone(s). ${n} total on this layer.`, 'ok');
    } else if (n === 0) {
      showToast('No closed wall loops yet — connect wall segments into a ring to form a room.', 'ok');
    } else {
      showToast(`Room zones up to date (${n} on this layer).`, 'ok');
    }
  }, []);

  const snapCloseWallGap = useCallback(() => {
    const res = dispatchPlannerSnapCloseWallGap({ maxGap: 85 });
    if (!res.ok) {
      const map = {
        no_two_endpoints: 'Need exactly two open wall ends (or use Detect rooms after closing manually).',
        no_close_pair: 'No open ends within ~85 cm — move vertices closer or draw the last segment.',
        no_lines: 'Draw walls on the plan first.',
      };
      showToast(map[res.reason] || 'Could not snap-close this graph.', 'warn');
      return;
    }
    try {
      useStore.getState().persistActivePlannerStory();
    } catch {
      /* ignore */
    }
    showToast(`Added closing wall (≈${(res.gapCm || 0).toFixed(0)} cm gap). Run Detect rooms if zones do not appear.`, 'ok');
  }, []);

  useEffect(() => {
    const openArcDetails = () => {
      const el = arcDetailsRef.current;
      if (el && typeof el.open === 'boolean' && !el.open) el.open = true;
    };
    const onRequestPick = () => {
      openArcDetails();
      rectPickFirstCornerRef.current = null;
      setRectPickAwaitingSecond(false);
      setRectPickCornersActive(false);
      setArcPickCenterMode(true);
    };
    document.addEventListener('novira:planner-arc-pick-center', onRequestPick);
    return () => document.removeEventListener('novira:planner-arc-pick-center', onRequestPick);
  }, []);

  useEffect(() => {
    const openRectDetails = () => {
      const el = rectDetailsRef.current;
      if (el && typeof el.open === 'boolean' && !el.open) el.open = true;
    };
    const onRectPickCmd = () => {
      openRectDetails();
      setArcPickCenterMode(false);
      rectPickFirstCornerRef.current = null;
      setRectPickAwaitingSecond(false);
      setRectPickCornersActive(true);
    };
    document.addEventListener('novira:planner-rect-pick-corners', onRectPickCmd);
    return () => document.removeEventListener('novira:planner-rect-pick-corners', onRectPickCmd);
  }, []);

  useEffect(() => {
    if (!arcPickCenterMode) return undefined;

    const onKey = (e) => {
      if (e.key === 'Escape') {
        setArcPickCenterMode(false);
        showToast('Arc center pick cancelled.', 'ok');
      }
    };
    window.addEventListener('keydown', onKey);

    const onPlannerMouseDown = (domEvt) => {
      const ve = domEvt && domEvt.viewerEvent;
      if (!ve || typeof ve.x !== 'number' || typeof ve.y !== 'number') return;

      const ps = store.getState().get('react-planner');
      const mode = ps && ps.get('mode');
      if (mode !== MODE_IDLE) {
        showToast('Use Select mode (not drawing a wall) — then click the plan to set arc center.', 'warn');
        return;
      }

      const sceneH = ps.getIn(['scene', 'height']);
      const { x, y } = plannerViewerEventToSceneCm(ve, sceneH);
      setArcCx(Math.round(x));
      setArcCy(Math.round(y));
      setArcPickCenterMode(false);
      showToast(`Arc center set to (${Math.round(x)}, ${Math.round(y)}) cm.`, 'ok');
    };

    document.addEventListener('mousedown-planner-event', onPlannerMouseDown);
    return () => {
      document.removeEventListener('mousedown-planner-event', onPlannerMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [arcPickCenterMode, store]);

  useEffect(() => {
    if (!rectPickCornersActive) return undefined;

    const resetPick = () => {
      rectPickFirstCornerRef.current = null;
      setRectPickAwaitingSecond(false);
      setRectPickCornersActive(false);
    };

    const onKey = (e) => {
      if (e.key === 'Escape') {
        resetPick();
        showToast('Rectangle corner pick cancelled.', 'ok');
      }
    };
    window.addEventListener('keydown', onKey);

    const onPlannerMouseDown = (domEvt) => {
      const ve = domEvt && domEvt.viewerEvent;
      if (!ve || typeof ve.x !== 'number' || typeof ve.y !== 'number') return;

      const ps = store.getState().get('react-planner');
      const mode = ps && ps.get('mode');
      if (mode !== MODE_IDLE) {
        showToast('Use Select mode — then click the plan for rectangle corners.', 'warn');
        return;
      }

      const sceneH = ps.getIn(['scene', 'height']);
      const { x, y } = plannerViewerEventToSceneCm(ve, sceneH);
      const xr = Math.round(x);
      const yr = Math.round(y);

      if (!rectPickFirstCornerRef.current) {
        rectPickFirstCornerRef.current = { x: xr, y: yr };
        setRectPickAwaitingSecond(true);
        showToast(`First corner (${xr}, ${yr}) cm — click opposite corner of the room.`, 'ok');
        return;
      }

      const f = rectPickFirstCornerRef.current;
      rectPickFirstCornerRef.current = null;
      setRectPickAwaitingSecond(false);
      setRectPickCornersActive(false);

      const minX = Math.min(f.x, xr);
      const minY = Math.min(f.y, yr);
      const w = Math.abs(xr - f.x);
      const h = Math.abs(yr - f.y);
      if (w < 40 || h < 40) {
        showToast('Rectangle too small — corners must be at least ~40 cm apart on each axis.', 'warn');
        return;
      }
      setRectMinX(minX);
      setRectMinY(minY);
      setRectWidthCm(w);
      setRectHeightCm(h);

      if (rectAutoInsertAfterPick) {
        const res = dispatchPlannerInsertRectRoomWalls({
          x: minX,
          y: minY,
          widthCm: w,
          heightCm: h,
        });
        if (!res.ok) {
          showToast('Corners set — insert failed (draw one wall first for wall type, then Insert).', 'warn');
          return;
        }
        try {
          useStore.getState().persistActivePlannerStory();
        } catch {
          /* ignore */
        }
        const zone = dispatchRefreshPlannerRoomZones();
        const n = zone.ok ? zone.areaCount ?? 0 : 0;
        showToast(
          `Picked and inserted ${res.segments} walls (${w}×${h} cm). Room zones on layer: ${n}.`,
          'ok'
        );
      } else {
        showToast(
          `Rectangle ${w}×${h} cm from (${minX}, ${minY}) — press Insert closed rectangle or edit values.`,
          'ok'
        );
      }
    };

    document.addEventListener('mousedown-planner-event', onPlannerMouseDown);
    return () => {
      document.removeEventListener('mousedown-planner-event', onPlannerMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [rectPickCornersActive, rectAutoInsertAfterPick, store]);

  const insertArcWallApprox = useCallback(() => {
    const res = dispatchPlannerInsertArcWalls({
      cx: arcCx,
      cy: arcCy,
      radiusCm: arcR,
      startDeg: arcStartDeg,
      sweepDeg: arcSweepDeg,
      segments: arcSegments,
    });
    if (!res.ok) {
      if (res.reason === 'no_layer') showToast('Select a floor layer in the plan first.', 'warn');
      else if (res.reason === 'invalid_numbers') showToast('Check arc numbers (center, radius, angles).', 'warn');
      else showToast('Could not insert arc walls — draw at least one wall first so type/properties exist.', 'warn');
      return;
    }
    try {
      useStore.getState().persistActivePlannerStory();
    } catch {
      /* ignore */
    }
    showToast(`Inserted arc as ${res.segments} wall segments. Use Detect rooms if you closed a loop.`, 'ok');
  }, [arcCx, arcCy, arcR, arcStartDeg, arcSweepDeg, arcSegments]);

  const insertRectangleRoomWalls = useCallback(() => {
    const res = dispatchPlannerInsertRectRoomWalls({
      x: rectMinX,
      y: rectMinY,
      widthCm: rectWidthCm,
      heightCm: rectHeightCm,
    });
    if (!res.ok) {
      if (res.reason === 'no_layer') showToast('Select a floor layer in the plan first.', 'warn');
      else if (res.reason === 'invalid_numbers') showToast('Check rectangle numbers (min corner, width, height in cm).', 'warn');
      else showToast('Could not insert rectangle — try drawing one wall first for wall type.', 'warn');
      return;
    }
    try {
      useStore.getState().persistActivePlannerStory();
    } catch {
      /* ignore */
    }
    const zone = dispatchRefreshPlannerRoomZones();
    const n = zone.ok ? zone.areaCount ?? 0 : 0;
    showToast(
      `Inserted ${res.segments} walls (${Math.round(res.widthCm)}×${Math.round(res.heightCm)} cm). Room zones on layer: ${n}.`,
      'ok'
    );
  }, [rectMinX, rectMinY, rectWidthCm, rectHeightCm]);

  const addFromUrl = useCallback(() => {
    const url = urlInput.trim();
    if (!url) return;
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const name = nameInput.trim() || 'Linked model';
    setPersistedModels((prev) => {
      const next = [...prev, { id, name, url, source: 'Saved' }];
      savePersistedModels(next);
      return next;
    });
    setUrlInput('');
    setNameInput('');
  }, [urlInput, nameInput]);

  const addFromFile = useCallback((event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `m-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const name = file.name.replace(/\.(glb|gltf)$/i, '') || 'Local model';
    setSessionModels((prev) => [...prev, { id, name, url: objectUrl, source: 'This session' }]);
  }, []);

  const removePersisted = useCallback((id) => {
    setPersistedModels((prev) => {
      const next = prev.filter((e) => e.id !== id);
      savePersistedModels(next);
      return next;
    });
  }, []);

  const removeSession = useCallback((id) => {
    setSessionModels((prev) => {
      const victim = prev.find((e) => e.id === id);
      if (victim && victim.url && String(victim.url).startsWith('blob:')) {
        try {
          URL.revokeObjectURL(victim.url);
        } catch {
          /* noop */
        }
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const sessionModelsRef = useRef(sessionModels);
  sessionModelsRef.current = sessionModels;

  useEffect(
    () => () => {
      sessionModelsRef.current.forEach((e) => {
        if (e.url && String(e.url).startsWith('blob:')) {
          try {
            URL.revokeObjectURL(e.url);
          } catch {
            /* noop */
          }
        }
      });
    },
    []
  );

  const [viewportRef, viewportSize] = useContainerSize();
  const { width, height } = viewportSize;

  const sceneUrlSet = useMemo(() => {
    const s = new Set();
    sceneCatalogEntries.forEach((e) => {
      if (e.url) s.add(String(e.url).trim());
    });
    return s;
  }, [sceneCatalogEntries]);

  const persistedListed = useMemo(
    () => persistedModels.filter((e) => e && e.url && !sceneUrlSet.has(String(e.url).trim())),
    [persistedModels, sceneUrlSet]
  );

  const sessionListed = useMemo(
    () => sessionModels.filter((e) => e && e.url && !sceneUrlSet.has(String(e.url).trim())),
    [sessionModels, sceneUrlSet]
  );

  return (
    <div className="planner-studio-root">
      <BuildingStoryBar />
      <div className="planner-catalog-bar">
        <div className="planner-bar-row planner-bar-row--library">
          <span
            className="planner-bar-eyebrow"
            title="Scene-linked GLBs list automatically. Add URL or file for layout-only assets."
          >
            Library
          </span>
          <input
            type="url"
            placeholder="GLB / GLTF URL"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFromUrl()}
            aria-label="Model URL"
          />
          <input
            type="text"
            placeholder="Name (optional)"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addFromUrl()}
            aria-label="Display name"
          />
          <button type="button" onClick={addFromUrl}>
            Save URL
          </button>
          <button type="button" className="secondary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
            Add file
          </button>
          <button
            type="button"
            className="secondary"
            onClick={requestOpenAssetLibrary}
            title="Sketchfab, Poly Haven, Novira demos"
          >
            Online…
          </button>
        </div>

        <div className="planner-bar-row planner-bar-row--tools">
          <button
            type="button"
            className="secondary"
            onClick={detectRoomsFromWalls}
            title="Find closed wall loops on the active layer and refresh room zones (saved with this story)"
          >
            Detect rooms
          </button>
          <button
            type="button"
            className="secondary"
            onClick={snapCloseWallGap}
            title="If two wall ends almost meet, add one segment to close the loop (≤85 cm)"
          >
            Close gap
          </button>
          <div className="planner-opening-tools" title="Place on a wall in plan view, then sync to cut openings in 3D">
            <span className="planner-opening-tools__label">Openings</span>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                useStore.getState().setStudioViewLayout('plan');
                requestAnimationFrame(() => {
                  const r = dispatchPlannerSelectDrawingHole('door');
                  if (!r.ok) showToast('Planner layer not ready.', 'warn');
                  else showToast('Door — click a wall line.', 'ok');
                });
              }}
            >
              Door
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                useStore.getState().setStudioViewLayout('plan');
                requestAnimationFrame(() => {
                  const r = dispatchPlannerSelectDrawingHole('window');
                  if (!r.ok) showToast('Planner layer not ready.', 'warn');
                  else showToast('Window — click a wall line.', 'ok');
                });
              }}
            >
              Window
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                useStore.getState().setStudioViewLayout('plan');
                requestAnimationFrame(() => {
                  const r = dispatchPlannerSelectDrawingHole('sash-window');
                  if (!r.ok) showToast('Planner layer not ready.', 'warn');
                  else showToast('Sash window — click a wall line.', 'ok');
                });
              }}
            >
              Sash
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => {
                useStore.getState().setStudioViewLayout('plan');
                requestAnimationFrame(() => {
                  const r = dispatchPlannerSelectDrawingHole('sliding-door');
                  if (!r.ok) showToast('Planner layer not ready.', 'warn');
                  else showToast('Sliding door — click a wall line.', 'ok');
                });
              }}
            >
              Slider
            </button>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              appendTerrainAssistStrip();
              showToast('Terrain strip preview added to the 3D scene.', 'ok');
            }}
            title="Undulating ground blocks in the 3D viewport (placeholder)"
          >
            Terrain
          </button>
          <label className="planner-roof-pitch" title="Pitch for roof preview slabs">
            <span className="planner-roof-pitch__label">Roof°</span>
            <input
              type="number"
              min={12}
              max={58}
              value={roofPreviewPitchDeg}
              onChange={(e) => setRoofPreviewPitchDeg(Number(e.target.value))}
            />
          </label>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              appendRoofAssistPreview();
              showToast('Roof preview slabs added to the 3D scene.', 'ok');
            }}
            title="Two pitched planes using Roof° — full truss later"
          >
            Roof
          </button>
        </div>

        <div className="planner-bar-row planner-bar-row--sync">
          <details className="planner-bar-help">
            <summary className="planner-bar-help__summary">Rooms and sync</summary>
            <div className="planner-bar-help__body">
              <ul>
                <li>Scene models appear as chips automatically; URL/file adds extras for this plan only.</li>
                <li>
                  <strong>Detect rooms</strong> scans closed wall loops and writes floor zones (per story).
                </li>
                <li>
                  <strong>Close gap</strong> joins two wall ends that almost meet (≤85&nbsp;cm).
                </li>
                <li>
                  <strong>Openings</strong> attach catalog holes to wall lines; <strong>Sync to 3D</strong> subtracts them in the editor.
                </li>
                <li>
                  <strong>Terrain / Roof</strong> drop quick preview meshes in 3D (placeholders).
                </li>
                <li>
                  <strong>Sync to 3D</strong> pushes walls, cutters, and library placements; removing items from the plan removes them from 3D on sync. Switching to the 3D tab also applies quietly—re-run sync after edits for a summary toast.
                </li>
              </ul>
            </div>
          </details>
          <button
            type="button"
            className="planner-bridge-cta planner-bar-sync-cta"
            onClick={sendPlacementsToNoviraScene}
            title="Walls, door/window booleans, cutters, and catalog models → main 3D scene"
          >
            Sync to 3D
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".glb,.gltf,model/gltf-binary,model/gltf+json"
          style={{ display: 'none' }}
          onChange={addFromFile}
        />
        <div className="planner-bar-row planner-bar-row--advanced">
        <details ref={arcDetailsRef} className="planner-arc-details">
          <summary className="planner-arc-details__summary">
            Arc wall
          </summary>
          <div
            style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: 8,
              alignItems: 'end',
            }}
          >
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Cx
              <input type="number" value={arcCx} onChange={(e) => setArcCx(Number(e.target.value))} style={{ width: '100%', marginTop: 2 }} />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Cy
              <input type="number" value={arcCy} onChange={(e) => setArcCy(Number(e.target.value))} style={{ width: '100%', marginTop: 2 }} />
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className={arcPickCenterMode ? 'planner-bridge-cta' : 'secondary'}
                onClick={() => {
                  rectPickFirstCornerRef.current = null;
                  setRectPickAwaitingSecond(false);
                  setRectPickCornersActive(false);
                  setArcPickCenterMode((v) => !v);
                }}
                title="Click once on the 2D plan to copy that point into Cx/Cy (Select mode only). Esc cancels."
              >
                {arcPickCenterMode ? 'Click plan to set center…' : 'Pick center on plan'}
              </button>
              {arcPickCenterMode ? (
                <span style={{ fontSize: 10, color: '#fbbf24' }}>Select tool · idle · then click the drawing</span>
              ) : null}
            </div>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              R
              <input type="number" value={arcR} onChange={(e) => setArcR(Number(e.target.value))} style={{ width: '100%', marginTop: 2 }} />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Start°
              <input type="number" value={arcStartDeg} onChange={(e) => setArcStartDeg(Number(e.target.value))} style={{ width: '100%', marginTop: 2 }} />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Sweep°
              <input type="number" value={arcSweepDeg} onChange={(e) => setArcSweepDeg(Number(e.target.value))} style={{ width: '100%', marginTop: 2 }} />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Segs
              <input type="number" min={4} max={64} value={arcSegments} onChange={(e) => setArcSegments(Number(e.target.value))} style={{ width: '100%', marginTop: 2 }} />
            </label>
            <button type="button" className="secondary" onClick={insertArcWallApprox} style={{ gridColumn: 'span 2' }}>
              Insert arc walls
            </button>
          </div>
        </details>
        <details ref={rectDetailsRef} className="planner-arc-details">
          <summary className="planner-arc-details__summary">
            Rectangle room
          </summary>
          <div
            style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: 8,
              alignItems: 'end',
            }}
          >
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Min X
              <input
                type="number"
                value={rectMinX}
                onChange={(e) => setRectMinX(Number(e.target.value))}
                style={{ width: '100%', marginTop: 2 }}
              />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Min Y
              <input
                type="number"
                value={rectMinY}
                onChange={(e) => setRectMinY(Number(e.target.value))}
                style={{ width: '100%', marginTop: 2 }}
              />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Width
              <input
                type="number"
                min={40}
                value={rectWidthCm}
                onChange={(e) => setRectWidthCm(Number(e.target.value))}
                style={{ width: '100%', marginTop: 2 }}
              />
            </label>
            <label style={{ fontSize: 10, color: '#94a3b8' }}>
              Depth
              <input
                type="number"
                min={40}
                value={rectHeightCm}
                onChange={(e) => setRectHeightCm(Number(e.target.value))}
                style={{ width: '100%', marginTop: 2 }}
              />
            </label>
            <label
              style={{
                gridColumn: '1 / -1',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 10,
                color: '#94a3b8',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={rectAutoInsertAfterPick}
                onChange={(e) => setRectAutoInsertAfterPick(e.target.checked)}
              />
              After 2-click pick, insert walls immediately
            </label>
            <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              <button
                type="button"
                className={rectPickCornersActive ? 'planner-bridge-cta' : 'secondary'}
                onClick={() => {
                  if (rectPickCornersActive) {
                    rectPickFirstCornerRef.current = null;
                    setRectPickAwaitingSecond(false);
                    setRectPickCornersActive(false);
                    showToast('Rectangle pick mode off.', 'ok');
                  } else {
                    setArcPickCenterMode(false);
                    rectPickFirstCornerRef.current = null;
                    setRectPickAwaitingSecond(false);
                    setRectPickCornersActive(true);
                  }
                }}
                title="Two clicks on the plan: opposite corners of the room box (Select mode). Esc cancels."
              >
                {rectPickCornersActive
                  ? rectPickAwaitingSecond
                    ? 'Click opposite corner…'
                    : 'Click first corner…'
                  : 'Pick corners on plan (2 clicks)'}
              </button>
              {rectPickCornersActive ? (
                <span style={{ fontSize: 10, color: '#38bdf8' }}>Select tool · idle · Esc cancels</span>
              ) : null}
            </div>
            <button type="button" className="planner-bridge-cta" onClick={insertRectangleRoomWalls} style={{ gridColumn: '1 / -1' }}>
              Insert closed rectangle
            </button>
            <p className="planner-arc-details__hint">
              Four walls, min 40×40&nbsp;cm — run <strong>Detect rooms</strong> after insert. Works with a trace underlay.
            </p>
          </div>
        </details>
        <details ref={traceDetailsRef} className="planner-arc-details planner-trace-details">
          <summary className="planner-arc-details__summary">
            Plan trace
          </summary>
          <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
            <button type="button" className="secondary" onClick={() => traceFileInputRef.current && traceFileInputRef.current.click()}>
              Choose image…
            </button>
            <label style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6 }}>
              Opacity
              <input
                type="range"
                min={0.05}
                max={1}
                step={0.05}
                value={traceOpacity}
                onChange={(e) => {
                  const op = Number(e.target.value);
                  setTraceOpacity(op);
                  setTraceImage((prev) => (prev ? { ...prev, opacity: op } : prev));
                }}
              />
            </label>
            <button
              type="button"
              className="secondary"
              disabled={!traceImage}
              onClick={() => {
                setTraceImage(null);
                showToast('Plan trace removed for this floor.', 'ok');
              }}
            >
              Clear trace
            </button>
            <input
              ref={traceFileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
              style={{ display: 'none' }}
              onChange={onImportTraceImage}
            />
            <p className="planner-arc-details__hint planner-trace-details__hint">
              Underlay scales with the plan; stored per story in this browser.
            </p>
          </div>
        </details>
        </div>
        {sceneCatalogEntries.length > 0 || persistedListed.length > 0 || sessionListed.length > 0 ? (
          <div className="planner-bar-row planner-bar-row--chips">
            <span className="planner-bar-eyebrow">In this plan</span>
            <div className="planner-catalog-bar__chips">
            {sceneCatalogEntries.map((e) => (
              <span key={e.id} className="planner-catalog-chip planner-catalog-chip--scene" title={e.url}>
                <span>{e.name}</span>
                <span className="planner-catalog-chip__badge">Scene</span>
              </span>
            ))}
            {persistedListed.map((e) => (
              <span key={e.id} className="planner-catalog-chip" title={e.url}>
                <span>{e.name}</span>
                <span className="planner-catalog-chip__badge">Saved</span>
                <button type="button" onClick={() => removePersisted(e.id)} aria-label="Remove">
                  ✕
                </button>
              </span>
            ))}
            {sessionListed.map((e) => (
              <span key={e.id} className="planner-catalog-chip" title={e.url}>
                <span>{e.name}</span>
                <span className="planner-catalog-chip__badge">Session</span>
                <button type="button" onClick={() => removeSession(e.id)} aria-label="Remove">
                  ✕
                </button>
              </span>
            ))}
            </div>
          </div>
        ) : null}
      </div>
      <div
        ref={viewportRef}
        className={`planner-studio-viewport${arcPickCenterMode ? ' planner-studio-viewport--arc-pick' : ''}${
          rectPickCornersActive ? ' planner-studio-viewport--rect-pick' : ''
        }`}
        style={{ flex: 1, minHeight: 0, minWidth: 0, position: 'relative' }}
      >
        <PlannerFloatingTraceOverlay
          plannerStore={store}
          viewportWidth={width}
          viewportHeight={height}
          trace={traceImage}
        />
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <Provider store={store}>
            <PlannerCursorHudBridge />
            <PlannerSelectionDimensions />
            <PlannerReactPlannerMount
              width={width}
              height={height}
              sceneCatalogEntries={sceneCatalogEntries}
              persistedModels={persistedModels}
              sessionModels={sessionModels}
              plannerRootStore={store}
              plugins={plugins}
            />
          </Provider>
        </div>
      </div>
    </div>
  );
}
