import { create } from 'zustand';
import * as THREE from 'three';
import {
  loadGlobalLibrary,
  saveGlobalLibrary,
  loadProjectShelf,
  saveProjectShelf,
  sceneObjectToBankEntry,
  mergeBankUnique,
  normalizeBankLibrary,
} from '../utils/catalogBank';
import { loadDesignUnits, persistDesignUnits, cycleDesignUnits as cycleDesignUnitKey } from '../utils/designUnits';
import {
  persistPlannerStory,
  switchPlannerStory as plannerSwitchStory,
  dispatchPlannerLoadOrNew,
  loadPlannerStoryPlain,
} from '../utils/plannerStoryBridge';
import { sanitizeNoviraIntegratedPlannerScene } from '../utils/plannerSanitizeScene';
import { PROJECT_TEMPLATES } from '../data/projectTemplates';
import { loadSavedSceneCameras, saveSavedSceneCameras, SAVED_SCENE_CAMERAS_MAX } from '../utils/savedSceneCamerasStorage';
import { sceneFloorY, resolveImplicitSpawnPosition } from '../utils/viewportSpawnPlacement';
import { normalizeMaterialAnim, toggleMaterialKeyframeTrack } from '../utils/materialAnim';

function loadMaterialPresetsFromStorage(projectId) {
  if (!projectId) return [];
  try {
    const raw = localStorage.getItem(`novira_material_presets_${projectId}`);
    const j = JSON.parse(raw);
    if (!Array.isArray(j)) return [];
    return j.filter((x) => x && x.id && typeof x.color === 'string');
  } catch {
    return [];
  }
}

function persistMaterialPresetsToStorage(projectId, list) {
  if (!projectId) return;
  try {
    localStorage.setItem(`novira_material_presets_${projectId}`, JSON.stringify(list));
  } catch {
    /* quota */
  }
}

function loadCatalogThumbScale() {
  try {
    const v = parseFloat(localStorage.getItem('novira_catalog_thumb_scale_v1'));
    if (Number.isFinite(v) && v >= 0.65 && v <= 1.85) return v;
  } catch {
    /* ignore */
  }
  return 1;
}

function loadCatalogDockMode() {
  try {
    const m = localStorage.getItem('novira_catalog_dock_v1');
    if (m === 'footer' || m === 'sidebar') return m;
    if (m === 'floating') return 'sidebar';
  } catch {
    /* ignore */
  }
  return 'sidebar';
}

function loadStudioViewLayout() {
  try {
    const v = localStorage.getItem('novira_studio_view_layout_v1');
    if (v === 'plan' || v === 'scene' || v === 'split' || v === 'elevation') return v;
  } catch {
    /* ignore */
  }
  return 'scene';
}

const initialStudioViewLayout = loadStudioViewLayout();

function loadElevationOrthoFace() {
  try {
    const v = localStorage.getItem('novira_elevation_ortho_face_v1');
    if (v === 'north' || v === 'south' || v === 'east' || v === 'west') return v;
  } catch {
    /* ignore */
  }
  return 'south';
}

const initialElevationOrthoFace = loadElevationOrthoFace();

function loadBuildingStoriesMeta(projectId) {
  if (!projectId) return [{ id: 'floor1', name: 'Floor 1', levelM: 0 }];
  try {
    const raw = localStorage.getItem(`novira_building_stories_${projectId}`);
    if (!raw) return [{ id: 'floor1', name: 'Floor 1', levelM: 0 }];
    const arr = JSON.parse(raw);
    if (Array.isArray(arr) && arr.length > 0 && arr.every((x) => x && x.id)) return arr;
  } catch {
    /* ignore */
  }
  return [{ id: 'floor1', name: 'Floor 1', levelM: 0 }];
}

function saveBuildingStoriesMeta(projectId, stories) {
  if (!projectId) return;
  try {
    localStorage.setItem(`novira_building_stories_${projectId}`, JSON.stringify(stories));
  } catch {
    /* quota */
  }
}

export const physicsState = {
  objectBounds: new Map(),
  liftPosition: null,
};

/** 3D cursor position with optional 0.25 m grid when object snap is enabled. */
function finalizeThreeDCursorWorld(state, vec) {
  if (!vec || vec.length < 3) return null;
  let p = [Number(vec[0]), Number(vec[1]), Number(vec[2])];
  const step = state.objectSnapEnabled !== false ? 0.25 : 0;
  if (step > 0) {
    p = p.map((c) => Math.round(c / step) * step);
  }
  return p;
}

const useStore = create((set, get) => ({

  projectId: null,
  projectName: 'Untitled Project',
  isSaving: false,
  objects: [],
  /** Global “My library” (all projects); persisted in localStorage. */
  globalAssetLibrary: normalizeBankLibrary(loadGlobalLibrary()),
  /** This project’s shelf; persisted per projectId in localStorage. */
  projectAssetShelf: [],
  /** Saved material presets for Material List (localStorage per project). */
  materialLibraryPresets: [],
  /** Current frame for material keyframe authoring (inspector). */
  materialEditorCurrentFrame: 0,
  /** `grid` | `list` — Asset bank presentation. */
  catalogBankLayout: 'grid',
  /** 0.65–1.85 — scales catalog card minimum width (Live Home–style thumbnail control). */
  catalogThumbScale: loadCatalogThumbScale(),
  setCatalogThumbScale: (v) => {
    const n = Math.max(0.65, Math.min(1.85, Number(v)));
    if (!Number.isFinite(n)) return;
    try {
      localStorage.setItem('novira_catalog_thumb_scale_v1', String(n));
    } catch {
      /* quota */
    }
    set({ catalogThumbScale: n });
  },
  /** `footer` | `sidebar` — catalog dock (persisted). */
  catalogDockMode: loadCatalogDockMode(),
  /** Live Home 3D–style named 3D views — persisted per project in localStorage. */
  savedSceneCameras: [],
  setCatalogDockMode: (mode) => {
    const m = mode === 'sidebar' ? 'sidebar' : 'footer';
    try {
      localStorage.setItem('novira_catalog_dock_v1', m);
    } catch {
      /* ignore */
    }
    set({ catalogDockMode: m });
  },

  /** Left / right dock visibility (Live Home–style panel toggles from header). */
  studioLeftOpen: true,
  studioRightOpen: true,
  setStudioLeftOpen: (v) => set({ studioLeftOpen: !!v }),
  setStudioRightOpen: (v) => set({ studioRightOpen: !!v }),
  toggleStudioLeftOpen: () => set((s) => ({ studioLeftOpen: !(s.studioLeftOpen ?? true) })),
  toggleStudioRightOpen: () => set((s) => ({ studioRightOpen: !(s.studioRightOpen ?? true) })),

  selectedId: null,
  selectedIds: [],
  clipboard: null,
  hiddenObjectIds: [],
  /** While true, `hiddenObjectIds` was set by “isolate”; toggle again to restore. */
  isolateActive: false,
  isolateHiddenBackup: null,
  lockedObjectIds: [],
  showCommandPalette: false,
  setShowCommandPalette: (val) => set({ showCommandPalette: val }),
  /** Beginner-first UI mode: hides unfinished/advanced controls by default. */
  uiSimpleMode: true,
  setUiSimpleMode: (v) => set({ uiSimpleMode: !!v }),
  toggleUiSimpleMode: () => set((s) => ({ uiSimpleMode: !s.uiSimpleMode })),

  /** Sketchfab / Poly Haven / Library modal — mounted from EditorPage so it works in floor-plan workspace too. */
  libraryBrowserOpen: false,
  setLibraryBrowserOpen: (open) => set({ libraryBrowserOpen: !!open }),
  /** One-shot tab target consumed by AssetBrowser (e.g. open directly to References). */
  assetBrowserInitialCatalog: null,
  clearAssetBrowserInitialCatalog: () => set({ assetBrowserInitialCatalog: null }),
  openAssetLibrary: (opts = {}) =>
    set((s) => {
      const next = { libraryBrowserOpen: true };
      if (opts.expandSidebar) {
        next.sidebarExpandSignal = (s.sidebarExpandSignal || 0) + 1;
      }
      return next;
    }),
  openAssetCatalogTab: (tab = 'Models') =>
    set((s) => ({
      editorTab: 'Objects & Assets',
      studioLeftOpen: true,
      sidebarExpandSignal: (s.sidebarExpandSignal || 0) + 1,
      assetBrowserInitialCatalog: tab,
    })),
  /** Incremented when the planner (or other UI) asks to uncollapse the left asset panel. Sidebar reacts. */
  sidebarExpandSignal: 0,
  /**
   * One-shot payload for Image-to-3D in the Layout sidebar (e.g. from Objects & Assets → References).
   * AiGenerationTool consumes then clears via clearAiImageGeneratorPrefill.
   */
  aiImageGeneratorPrefill: null,
  clearAiImageGeneratorPrefill: () => set({ aiImageGeneratorPrefill: null }),
  openLayoutWithAiFromReference: ({ imageUrl, previewUrl, name }) => {
    const url = (imageUrl && String(imageUrl).trim()) || (previewUrl && String(previewUrl).trim());
    if (!url) return;
    const s = get();
    const payload = {
      imageUrl: url,
      previewUrl: (previewUrl && String(previewUrl).trim()) || url,
      name: (name && String(name).trim()) || 'Reference image',
    };
    try {
      sessionStorage.setItem('novira_ai_image_prefill_v1', JSON.stringify(payload));
    } catch {
      /* ignore */
    }
    set({
      editorTab: 'Layout',
      studioLeftOpen: true,
      sidebarExpandSignal: (s.sidebarExpandSignal || 0) + 1,
      aiImageGeneratorPrefill: payload,
    });
  },
  mode: 'build',
  editorTab: 'Layout',
  setEditorTab: (tab) => set((s) => ({
    editorTab: tab,
    /** Workspace tabs should always reveal the left tools panel (it can be collapsed). */
    studioLeftOpen: true,
    sidebarExpandSignal: (s.sidebarExpandSignal || 0) + 1,
  })),
  /** World [x,y,z] when user placed the 3D cursor; null = new objects use viewport-center spawn instead. */
  threeDCursorWorld: null,
  setThreeDCursorWorld: (vec) =>
    set((state) => ({
      threeDCursorWorld: !vec || vec.length < 3 ? null : finalizeThreeDCursorWorld(state, vec),
    })),
  /** When true and threeDCursorWorld is set, imports / Add use the 3D cursor (Blender-style). */
  spawnAtThreeDCursor: true,
  setSpawnAtThreeDCursor: (v) => set({ spawnAtThreeDCursor: !!v }),
  snapThreeDCursorToSelection: () =>
    set((state) => {
      const id = state.selectedId;
      if (!id) return {};
      const obj = state.objects.find((o) => o.id === id);
      if (!obj?.position) return {};
      const snapped = finalizeThreeDCursorWorld(state, obj.position);
      return { threeDCursorWorld: snapped };
    }),

  /** Move selected object(s) so their layout relative to the first selected matches the 3D cursor (Blender “Selection to Cursor”). */
  snapSelectionToThreeDCursor: () =>
    set((state) => {
      if (!state.threeDCursorWorld || state.threeDCursorWorld.length < 3) return {};
      const cursor = state.threeDCursorWorld;
      const ids = state.selectedIds.length
        ? [...state.selectedIds]
        : state.selectedId
          ? [state.selectedId]
          : [];
      if (!ids.length) return {};
      const idSet = new Set(ids);
      const objs = ids.map((oid) => state.objects.find((o) => o.id === oid)).filter(Boolean);
      if (!objs.length) return {};
      const anchorId =
        state.selectedId && idSet.has(state.selectedId) ? state.selectedId : ids[0];
      const anchor = state.objects.find((o) => o.id === anchorId) || objs[0];
      const ax = anchor.position[0];
      const ay = anchor.position[1];
      const az = anchor.position[2];
      return {
        objects: state.objects.map((o) => {
          if (!idSet.has(o.id)) return o;
          const dx = o.position[0] - ax;
          const dy = o.position[1] - ay;
          const dz = o.position[2] - az;
          return {
            ...o,
            position: [cursor[0] + dx, cursor[1] + dy, cursor[2] + dz],
          };
        }),
      };
    }),

  /** Place 3D cursor at world origin on the floor plane (XZ origin, Y = floor top). */
  snapThreeDCursorToWorldOrigin: () =>
    set((state) => {
      const fy = sceneFloorY(state.objects);
      const snapped = finalizeThreeDCursorWorld(state, [0, fy, 0]);
      return { threeDCursorWorld: snapped };
    }),

  /** Clear placed cursor — new objects use the center of the view again until you place the cursor. */
  clearThreeDCursor: () => set({ threeDCursorWorld: null }),

  /** Round the current 3D cursor to the 25 cm grid (only when Snap is on in the status bar). */
  snapThreeDCursorToGrid: () =>
    set((state) => {
      if (!state.threeDCursorWorld || state.threeDCursorWorld.length < 3) return {};
      if (state.objectSnapEnabled === false) return {};
      const step = 0.25;
      const p = state.threeDCursorWorld.map((c) => Math.round(Number(c) / step) * step);
      return { threeDCursorWorld: p };
    }),

  /** Blender-style Shift+S menu: simple snap / cursor actions (closed with Esc or backdrop). */
  snapCursorMenuOpen: false,
  setSnapCursorMenuOpen: (v) => set({ snapCursorMenuOpen: !!v }),

  activeTool: 'select',
  setActiveTool: (tool) => set((state) => {
    const updates = { activeTool: tool };
    if (state.activeTool === 'parts' && tool !== 'parts') {
      updates.selectedSubMeshNames = [];
      updates.highlightedPartNames = [];
      updates.meshElementSelection = null;
      updates.meshEditTransformMode = 'translate';
    }
    if (tool === 'parts') {
      updates.selectedSubMeshNames = [];
      updates.highlightedPartNames = [];
      updates.meshElementSelection = null;
      updates.meshEditSelectMode = 'part';
      updates.meshEditTransformMode = 'translate';
    }
    return updates;
  }),
  meshEditSelectMode: 'object',
  setMeshEditSelectMode: (mode) => {
    const allowed = new Set(['object', 'part', 'face', 'edge', 'vertex']);
    set({
      meshEditSelectMode: allowed.has(mode) ? mode : 'object',
      meshEditTransformMode: 'translate',
    });
  },
  /** While `activeTool === 'parts'`, G/R/S map to this instead of switching away from parts. */
  meshEditTransformMode: 'translate',
  setMeshEditTransformMode: (mode) => {
    const allowed = new Set(['translate', 'rotate', 'scale']);
    set({ meshEditTransformMode: allowed.has(mode) ? mode : 'translate' });
  },
  meshElementSelection: null,
  setMeshElementSelection: (payload) => set({
    meshElementSelection: payload
      ? {
        type: payload.type,
        objectId: payload.objectId,
        meshId: payload.meshId || null,
        faceIndex: Number.isFinite(payload.faceIndex) ? payload.faceIndex : null,
        indices: Array.isArray(payload.indices) ? payload.indices : [],
        partNames: Array.isArray(payload.partNames) ? payload.partNames : [],
        meshOrdinals: Array.isArray(payload.meshOrdinals) ? payload.meshOrdinals : [],
      }
      : null
  }),
  /** Delete currently selected face in parts mode (primitive/STL only for now). */
  meshDeleteSelectedFaces: () =>
    set((state) => {
      const sel = state.meshElementSelection;
      if (!sel || sel.type !== 'face' || !Number.isFinite(sel.faceIndex)) return {};
      const obj = state.objects.find((o) => o.id === sel.objectId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const deleted = new Set(Array.isArray(prev.deletedFaces) ? prev.deletedFaces : []);
      deleted.add(sel.faceIndex);
      const nextEdit = { ...prev, deletedFaces: [...deleted].sort((a, b) => a - b) };
      return {
        objects: state.objects.map((o) => (o.id === obj.id ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  /** Paint selected face with a material color (primitive/STL edit mode). */
  meshAssignSelectionMaterial: (hex = null) =>
    set((state) => {
      const sel = state.meshElementSelection;
      if (!sel || sel.type !== 'face' || !Number.isFinite(sel.faceIndex)) return {};
      const obj = state.objects.find((o) => o.id === sel.objectId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const color = typeof hex === 'string' && hex.trim() ? hex.trim() : (obj.color || '#e2e8f0');
      const prev = obj.meshEditState || {};
      const faceColors = { ...(prev.faceColors || {}), [String(sel.faceIndex)]: color };
      const nextEdit = { ...prev, faceColors };
      return {
        objects: state.objects.map((o) => (o.id === obj.id ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  /** Simple face extrude: offsets selected face vertices along face normal. */
  meshExtrudeSelectedFace: (distance = 0.1) =>
    set((state) => {
      const sel = state.meshElementSelection;
      const dist = Number(distance);
      if (!sel || sel.type !== 'face' || !Number.isFinite(sel.faceIndex) || !Number.isFinite(dist) || dist === 0) return {};
      const obj = state.objects.find((o) => o.id === sel.objectId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const extrusions = { ...(prev.extrusions || {}) };
      const key = String(sel.faceIndex);
      extrusions[key] = (Number(extrusions[key]) || 0) + dist;
      const nextEdit = { ...prev, extrusions };
      return {
        objects: state.objects.map((o) => (o.id === obj.id ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  meshAddMaterialSlot: (objectId = null, color = null) =>
    set((state) => {
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const slots = Array.isArray(prev.materialSlots) ? [...prev.materialSlots] : [];
      const id = `slot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const nextSlot = {
        id,
        name: `Material.${String(slots.length + 1).padStart(3, '0')}`,
        color: color || obj.color || '#e2e8f0',
      };
      const nextEdit = {
        ...prev,
        materialSlots: [...slots, nextSlot],
        activeMaterialSlotId: id,
      };
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  meshRemoveMaterialSlot: (slotId, objectId = null) =>
    set((state) => {
      if (!slotId) return {};
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const slots = Array.isArray(prev.materialSlots) ? [...prev.materialSlots] : [];
      if (slots.length <= 1) return {};
      const kept = slots.filter((s) => s.id !== slotId);
      if (!kept.length) return {};
      const faceSlots = { ...(prev.faceSlots || {}) };
      Object.keys(faceSlots).forEach((k) => {
        if (faceSlots[k] === slotId) delete faceSlots[k];
      });
      const active = prev.activeMaterialSlotId === slotId ? kept[0].id : (prev.activeMaterialSlotId || kept[0].id);
      const nextEdit = { ...prev, materialSlots: kept, faceSlots, activeMaterialSlotId: active };
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  meshSetActiveMaterialSlot: (slotId, objectId = null) =>
    set((state) => {
      if (!slotId) return {};
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const nextEdit = { ...prev, activeMaterialSlotId: slotId };
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  meshSetMaterialSlotColor: (slotId, hex, objectId = null) =>
    set((state) => {
      if (!slotId || typeof hex !== 'string' || !hex.trim()) return {};
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const slots = Array.isArray(prev.materialSlots) ? prev.materialSlots : [];
      const nextSlots = slots.map((s) => (s.id === slotId ? { ...s, color: hex.trim() } : s));
      const nextEdit = { ...prev, materialSlots: nextSlots };
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  meshAssignSelectionToActiveMaterialSlot: () =>
    set((state) => {
      const sel = state.meshElementSelection;
      if (!sel || sel.type !== 'face' || !Number.isFinite(sel.faceIndex)) return {};
      const obj = state.objects.find((o) => o.id === sel.objectId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const slots = Array.isArray(prev.materialSlots) ? prev.materialSlots : [];
      const activeId = prev.activeMaterialSlotId || slots[0]?.id || null;
      if (!activeId) return {};
      const faceSlots = { ...(prev.faceSlots || {}), [String(sel.faceIndex)]: activeId };
      const nextEdit = { ...prev, faceSlots };
      return {
        objects: state.objects.map((o) => (o.id === obj.id ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  /** Assign the currently selected face to a specific material slot (does not change active slot). */
  meshAssignFaceToMaterialSlot: (slotId, objectId = null) =>
    set((state) => {
      if (!slotId) return {};
      const sel = state.meshElementSelection;
      if (!sel || sel.type !== 'face' || !Number.isFinite(sel.faceIndex)) return {};
      const targetId = objectId || sel.objectId || state.selectedId;
      if (!targetId || sel.objectId !== targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const slots = Array.isArray(prev.materialSlots) ? prev.materialSlots : [];
      if (!slots.some((s) => s.id === slotId)) return {};
      const faceSlots = { ...(prev.faceSlots || {}), [String(sel.faceIndex)]: slotId };
      const nextEdit = { ...prev, faceSlots };
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  meshReorderMaterialSlot: (slotId, direction, objectId = null) =>
    set((state) => {
      if (!slotId || (direction !== 'up' && direction !== 'down')) return {};
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const slots = Array.isArray(prev.materialSlots) ? [...prev.materialSlots] : [];
      const idx = slots.findIndex((s) => s.id === slotId);
      if (idx < 0) return {};
      const j = direction === 'up' ? idx - 1 : idx + 1;
      if (j < 0 || j >= slots.length) return {};
      [slots[idx], slots[j]] = [slots[j], slots[idx]];
      const nextEdit = { ...prev, materialSlots: slots };
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  meshRenameMaterialSlot: (slotId, name, objectId = null) =>
    set((state) => {
      if (!slotId) return {};
      const trimmed = typeof name === 'string' ? name.trim() : '';
      if (!trimmed) return {};
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const slots = Array.isArray(prev.materialSlots) ? prev.materialSlots : [];
      const nextSlots = slots.map((s) => (s.id === slotId ? { ...s, name: trimmed } : s));
      if (nextSlots.every((s, i) => s.name === slots[i]?.name)) return {};
      const nextEdit = { ...prev, materialSlots: nextSlots };
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
      };
    }),
  /** Select the lowest-indexed face that uses this slot (Parts face mode). */
  meshSelectFirstFaceForMaterialSlot: (slotId, objectId = null) =>
    set((state) => {
      if (!slotId) return {};
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const faceSlots = prev.faceSlots || {};
      const keys = Object.keys(faceSlots)
        .filter((k) => faceSlots[k] === slotId)
        .map((k) => parseInt(k, 10))
        .filter((n) => Number.isFinite(n))
        .sort((a, b) => a - b);
      if (!keys.length) return {};
      const fi = keys[0];
      const prevSel = state.meshElementSelection;
      const meshId = prevSel && prevSel.objectId === targetId && prevSel.meshId ? prevSel.meshId : null;
      return {
        meshElementSelection: {
          type: 'face',
          objectId: targetId,
          meshId,
          faceIndex: fi,
          indices: [],
          partNames: [],
          meshOrdinals: [],
        },
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: { ...prev, activeMaterialSlotId: slotId } } : o)),
      };
    }),
  /** Remove all face → slot mappings that point at this slot. */
  meshClearFacesUsingMaterialSlot: (slotId, objectId = null) =>
    set((state) => {
      if (!slotId) return {};
      const targetId = objectId || state.selectedId;
      if (!targetId) return {};
      const obj = state.objects.find((o) => o.id === targetId);
      if (!obj || !['primitive', 'stl'].includes(obj.type)) return {};
      const prev = obj.meshEditState || {};
      const faceSlots = { ...(prev.faceSlots || {}) };
      let changed = false;
      Object.keys(faceSlots).forEach((k) => {
        if (faceSlots[k] === slotId) {
          delete faceSlots[k];
          changed = true;
        }
      });
      if (!changed) return {};
      const nextEdit = { ...prev, faceSlots };
      const sel = state.meshElementSelection;
      const clearSel = sel && sel.objectId === targetId && sel.type === 'face' && Number.isFinite(sel.faceIndex)
        && (prev.faceSlots || {})[String(sel.faceIndex)] === slotId;
      return {
        objects: state.objects.map((o) => (o.id === targetId ? { ...o, meshEditState: nextEdit } : o)),
        ...(clearSel ? { meshElementSelection: null } : {}),
      };
    }),

  setMaterialEditorFrame: (frame) => set({
    materialEditorCurrentFrame: Math.max(0, Math.min(9999, Math.round(Number(frame)) || 0)),
  }),

  addMaterialLibraryPreset: (payload = {}) =>
    set((state) => {
      const pid = state.projectId;
      if (!pid) return {};
      const id = `mp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const entry = {
        id,
        name: typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : 'Material',
        color: typeof payload.color === 'string' && payload.color.trim() ? payload.color.trim() : '#e2e8f0',
        roughness: Number.isFinite(payload.roughness) ? payload.roughness : 0.3,
        metalness: Number.isFinite(payload.metalness) ? payload.metalness : 0.2,
      };
      const next = [...(state.materialLibraryPresets || []), entry];
      persistMaterialPresetsToStorage(pid, next);
      return { materialLibraryPresets: next };
    }),

  removeMaterialLibraryPreset: (presetId) =>
    set((state) => {
      if (!presetId) return {};
      const pid = state.projectId;
      if (!pid) return {};
      const next = (state.materialLibraryPresets || []).filter((p) => p.id !== presetId);
      persistMaterialPresetsToStorage(pid, next);
      return { materialLibraryPresets: next };
    }),

  /** Apply a material entry (scene or library) onto the selected object’s active slot / base. */
  applySceneMaterialToSelection: (entry) =>
    set((state) => {
      if (!entry || typeof entry.color !== 'string') return {};
      const selId = state.selectedId;
      if (!selId) return {};
      const obj = state.objects.find((o) => o.id === selId);
      if (!obj) return {};
      const color = entry.color.trim();
      const roughness = Number.isFinite(entry.roughness) ? entry.roughness : (obj.roughness ?? 0.3);
      const metalness = Number.isFinite(entry.metalness) ? entry.metalness : (obj.metalness ?? 0.2);
      const meshEdit = obj.meshEditState || {};
      const slots = Array.isArray(meshEdit.materialSlots) ? meshEdit.materialSlots : [];
      const activeId = meshEdit.activeMaterialSlotId || slots[0]?.id || null;
      if (['primitive', 'stl'].includes(obj.type) && slots.length && activeId) {
        const nextSlots = slots.map((s) => (s.id === activeId ? { ...s, color } : s));
        return {
          objects: state.objects.map((o) => (o.id === selId
            ? {
              ...o,
              roughness,
              metalness,
              meshEditState: { ...meshEdit, materialSlots: nextSlots, activeMaterialSlotId: activeId },
            }
            : o)),
        };
      }
      return {
        objects: state.objects.map((o) => (o.id === selId ? { ...o, color, roughness, metalness } : o)),
      };
    }),

  /** Toggle a material property keyframe on the selected object at materialEditorCurrentFrame. */
  toggleMaterialKeyframeOnSelection: (trackKey, slotIdOverride = null) =>
    set((state) => {
      const selId = state.selectedId;
      if (!selId) return {};
      const frame = state.materialEditorCurrentFrame ?? 0;
      const obj = state.objects.find((o) => o.id === selId);
      if (!obj) return {};
      const ma = normalizeMaterialAnim(obj.materialAnim);
      const tracks = ma.tracks;

      if (trackKey === 'slotColor') {
        if (!['primitive', 'stl'].includes(obj.type)) return {};
        const meshEdit = obj.meshEditState || {};
        const slots = meshEdit.materialSlots;
        if (!Array.isArray(slots) || !slots.length) return {};
        const sid = slotIdOverride || meshEdit.activeMaterialSlotId || slots[0]?.id;
        if (!sid) return {};
        const slot = slots.find((s) => s.id === sid);
        const value = slot?.color || obj.color || '#e2e8f0';
        const newTracks = toggleMaterialKeyframeTrack(tracks, 'slotColor', frame, value, sid);
        return {
          objects: state.objects.map((o) => (o.id === selId ? { ...o, materialAnim: { tracks: newTracks } } : o)),
        };
      }

      if (trackKey === 'color') {
        const value = obj.color || '#e2e8f0';
        const newTracks = toggleMaterialKeyframeTrack(tracks, 'color', frame, value, null);
        return { objects: state.objects.map((o) => (o.id === selId ? { ...o, materialAnim: { tracks: newTracks } } : o)) };
      }
      if (trackKey === 'roughness') {
        const value = obj.roughness ?? 0.3;
        const newTracks = toggleMaterialKeyframeTrack(tracks, 'roughness', frame, value, null);
        return { objects: state.objects.map((o) => (o.id === selId ? { ...o, materialAnim: { tracks: newTracks } } : o)) };
      }
      if (trackKey === 'metalness') {
        const value = obj.metalness ?? 0.2;
        const newTracks = toggleMaterialKeyframeTrack(tracks, 'metalness', frame, value, null);
        return { objects: state.objects.map((o) => (o.id === selId ? { ...o, materialAnim: { tracks: newTracks } } : o)) };
      }
      return {};
    }),

  axisConstraint: null,
  setAxisConstraint: (axis) => set((state) => ({
    axisConstraint: state.axisConstraint === axis ? null : axis
  })),

  toggleMultiSelect: (id) => set((state) => {
    const ids = state.selectedIds.includes(id)
      ? state.selectedIds.filter(i => i !== id)
      : [...state.selectedIds, id];
    return { selectedIds: ids, selectedId: ids[ids.length - 1] || null };
  }),
  selectObject: (id) => set((state) => {
    const obj = state.objects.find((o) => o.id === id) || null;
    return {
      selectedId: id,
      selectedIds: id ? [id] : [],
      moveDelta: [0, 0, 0],
      rotationDelta: [0, 0, 0],
      selectedPositionAnchor: obj ? [...obj.position] : null,
      selectedRotationAnchor: obj ? [...(obj.rotation || [0, 0, 0])] : null,
    };
  }),

  selectAll: () => set((state) => {
    const ids = state.objects.filter(o => o.type !== 'ground').map(o => o.id);
    return { selectedIds: ids, selectedId: ids[ids.length - 1] || null };
  }),

  deselectAll: () => set({ selectedIds: [], selectedId: null }),

  copySelected: () => set((state) => {
    const ids = state.selectedIds.length ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
    const copied = state.objects.filter(o => ids.includes(o.id)).map(o => ({ ...o }));
    return { clipboard: copied };
  }),

  pasteClipboard: () => set((state) => {
    if (!state.clipboard?.length) return state;
    const baseTime = Date.now();
    const ref = state.clipboard[0];
    const refPos = ref?.position || [0, 0, 0];
    const target =
      state.spawnAtThreeDCursor && state.threeDCursorWorld?.length >= 3
        ? state.threeDCursorWorld
        : null;
    const newObjs = state.clipboard.map((o, i) => {
      const id = `obj_${baseTime + i}_${Math.random().toString(36).substring(2, 11)}`;
      let position;
      if (target) {
        const dx = (o.position?.[0] ?? 0) - refPos[0];
        const dy = (o.position?.[1] ?? 0) - refPos[1];
        const dz = (o.position?.[2] ?? 0) - refPos[2];
        const spreadX = Math.floor(i / 4) * 0.35;
        const spreadZ = (i % 4) * 0.28;
        position = [target[0] + dx + spreadX, target[1] + dy, target[2] + dz + spreadZ];
      } else {
        position = [(o.position?.[0] ?? 0) + 0.5, o.position?.[1] ?? 0, (o.position?.[2] ?? 0) + 0.5];
      }
      return { ...o, id, position };
    });
    const newIds = newObjs.map((o) => o.id);
    return {
      objects: [...state.objects, ...newObjs],
      selectedIds: newIds,
      selectedId: newIds[newIds.length - 1],
    };
  }),

  toggleObjectVisibility: (id) => set((state) => ({
    hiddenObjectIds: state.hiddenObjectIds.includes(id)
      ? state.hiddenObjectIds.filter(i => i !== id)
      : [...state.hiddenObjectIds, id],
  })),

  /** Show only selected objects (ground stays). Press again to undo. */
  toggleIsolateSelected: () =>
    set((state) => {
      if (state.isolateActive) {
        return {
          hiddenObjectIds: [...(state.isolateHiddenBackup || [])],
          isolateHiddenBackup: null,
          isolateActive: false,
        };
      }
      const ids = state.selectedIds.length
        ? [...state.selectedIds]
        : state.selectedId
          ? [state.selectedId]
          : [];
      if (!ids.length) return {};
      const keep = new Set(ids);
      const hide = state.objects
        .filter((o) => !keep.has(o.id) && o.type !== 'ground')
        .map((o) => o.id);
      return {
        isolateHiddenBackup: [...state.hiddenObjectIds],
        hiddenObjectIds: hide,
        isolateActive: true,
      };
    }),

  /** Clear all hidden flags and exit isolate. */
  showAllSceneObjects: () =>
    set({
      hiddenObjectIds: [],
      isolateActive: false,
      isolateHiddenBackup: null,
    }),

  /** World-space nudge for the current selection (ground & locked objects skipped). */
  nudgeSelectedPosition: (dx, dy, dz) =>
    set((state) => {
      const ddx = Number(dx);
      const ddy = Number(dy);
      const ddz = Number(dz);
      if (!Number.isFinite(ddx) || !Number.isFinite(ddy) || !Number.isFinite(ddz)) return {};
      if (ddx === 0 && ddy === 0 && ddz === 0) return {};
      const ids = state.selectedIds.length
        ? [...state.selectedIds]
        : state.selectedId
          ? [state.selectedId]
          : [];
      if (!ids.length) return {};
      const idSet = new Set(ids);
      const locked = state.lockedObjectIds || [];
      const movableIds = ids.filter((id) => {
        const o = state.objects.find((x) => x.id === id);
        return o && o.type !== 'ground' && !locked.includes(id);
      });
      if (!movableIds.length) return {};

      const maxStep = Math.max(Math.abs(ddx), Math.abs(ddy), Math.abs(ddz));
      const fineNudge = maxStep < 0.15;
      const snapStep = state.objectSnapEnabled !== false && !fineNudge ? 0.25 : 0;

      const snapshots = {};
      for (const id of movableIds) {
        const obj = state.objects.find((x) => x.id === id);
        snapshots[id] = get()._snapshotState(obj);
      }
      const spatialUndoStack = [...(state.spatialUndoStack || []), { kind: 'nudge', snapshots }].slice(-40);

      return {
        spatialUndoStack,
        spatialRedoStack: [],
        objects: state.objects.map((o) => {
          if (!idSet.has(o.id)) return o;
          if (o.type === 'ground') return o;
          if (locked.includes(o.id)) return o;
          const p = o.position || [0, 0, 0];
          let nx = p[0] + ddx;
          let ny = p[1] + ddy;
          let nz = p[2] + ddz;
          if (snapStep > 0) {
            nx = Math.round(nx / snapStep) * snapStep;
            ny = Math.round(ny / snapStep) * snapStep;
            nz = Math.round(nz / snapStep) * snapStep;
          }
          return {
            ...o,
            position: [nx, ny, nz],
          };
        }),
      };
    }),

  /** `selection` | `all` — EditorPage listens and moves the orbit camera (see `novira:frame-camera`). */
  frameCameraViewport: (scope = 'selection') => {
    if (typeof document === 'undefined') return;
    const s = scope === 'all' ? 'all' : 'selection';
    document.dispatchEvent(new CustomEvent('novira:frame-camera', { detail: { scope: s } }));
  },

  toggleObjectLock: (id) => set((state) => ({
    lockedObjectIds: state.lockedObjectIds.includes(id)
      ? state.lockedObjectIds.filter(i => i !== id)
      : [...state.lockedObjectIds, id],
  })),

  deleteSelected: () => set((state) => {
    const ids = state.selectedIds.length ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
    return {
      objects: state.objects.filter(o => !ids.includes(o.id)),
      selectedId: null,
      selectedIds: [],
    };
  }),

  duplicateSelected: () => set((state) => {
    const ids = state.selectedIds.length ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
    const originals = state.objects.filter((o) => ids.includes(o.id));
    if (!originals.length) return state;
    const baseTime = Date.now();
    const target =
      state.spawnAtThreeDCursor && state.threeDCursorWorld?.length >= 3
        ? state.threeDCursorWorld
        : null;
    const anchor = originals[0];
    const ax = anchor.position[0];
    const ay = anchor.position[1];
    const az = anchor.position[2];
    const dupes = originals.map((o, i) => {
      const id = `obj_${baseTime + i}_${Math.random().toString(36).substring(2, 11)}`;
      let position;
      if (target) {
        const dx = o.position[0] - ax;
        const dy = o.position[1] - ay;
        const dz = o.position[2] - az;
        position = [target[0] + dx, target[1] + dy, target[2] + dz];
      } else {
        position = [o.position[0] + 0.5, o.position[1], o.position[2] + 0.5];
      }
      return {
        ...o,
        id,
        name: `${o.name || 'Object'} Copy`,
        position,
      };
    });
    const newIds = dupes.map((o) => o.id);
    return {
      objects: [...state.objects, ...dupes],
      selectedIds: newIds,
      selectedId: newIds[newIds.length - 1],
    };
  }),

  alignObjects: (axis, mode) => set((state) => {
    const ids = state.selectedIds.length > 1 ? state.selectedIds : [];
    if (ids.length < 2) return state;
    const objs = state.objects.filter(o => ids.includes(o.id));
    const axIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    let target;
    if (mode === 'min') target = Math.min(...objs.map(o => o.position[axIdx]));
    else if (mode === 'max') target = Math.max(...objs.map(o => o.position[axIdx]));
    else target = objs.reduce((s, o) => s + o.position[axIdx], 0) / objs.length;
    return {
      objects: state.objects.map(o => {
        if (!ids.includes(o.id)) return o;
        const pos = [...o.position];
        pos[axIdx] = target;
        return { ...o, position: pos };
      }),
    };
  }),

  distributeObjects: (axis) => set((state) => {
    const ids = state.selectedIds.length > 2 ? state.selectedIds : [];
    if (ids.length < 3) return state;
    const axIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
    const objs = state.objects.filter(o => ids.includes(o.id)).sort((a, b) => a.position[axIdx] - b.position[axIdx]);
    const min = objs[0].position[axIdx];
    const max = objs[objs.length - 1].position[axIdx];
    const step = (max - min) / (objs.length - 1);
    const posMap = {};
    objs.forEach((o, i) => { posMap[o.id] = min + step * i; });
    return {
      objects: state.objects.map(o => {
        if (posMap[o.id] === undefined) return o;
        const pos = [...o.position];
        pos[axIdx] = posMap[o.id];
        return { ...o, position: pos };
      }),
    };
  }),
  groupSelected: () => set((state) => {
    const ids = state.selectedIds.length > 1 ? state.selectedIds : [];
    if (ids.length < 2) return state;
    const groupId = `group_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const members = state.objects.filter(o => ids.includes(o.id));
    const cx = members.reduce((s, o) => s + (o.position?.[0] || 0), 0) / members.length;
    const cy = members.reduce((s, o) => s + (o.position?.[1] || 0), 0) / members.length;
    const cz = members.reduce((s, o) => s + (o.position?.[2] || 0), 0) / members.length;
    return {
      objects: [
        ...state.objects.map(o => ids.includes(o.id) ? { ...o, parentId: groupId } : o),
        { id: groupId, name: 'Group', type: 'group', position: [cx, cy, cz], rotation: [0, 0, 0], scale: [1, 1, 1], dimensions: [0, 0, 0] },
      ],
      selectedId: groupId,
      selectedIds: [groupId],
    };
  }),

  ungroupSelected: () => set((state) => {
    const id = state.selectedId;
    const grp = state.objects.find(o => o.id === id && o.type === 'group');
    if (!grp) return state;
    const childIds = state.objects.filter(o => o.parentId === id).map(o => o.id);
    return {
      objects: state.objects
        .filter(o => o.id !== id)
        .map(o => o.parentId === id ? { ...o, parentId: null } : o),
      selectedId: null,
      selectedIds: childIds,
    };
  }),

  isLoadingTasks: false,
  skipNextProjectLoad: false,
  liftedObjectId: null,
  setLiftedObjectId: (id) => set({ liftedObjectId: id }),
  liftOrigin: null,
  setLiftOrigin: (pos) => set({ liftOrigin: pos }),
  isTransformDragging: false,
  setIsTransformDragging: (isDragging) => set({ isTransformDragging: isDragging }),
  axisLock: null,
  setAxisLock: (axis) => set({ axisLock: axis }),
  shiftPressed: false,
  setShiftPressed: (val) => set({ shiftPressed: val }),
  ctrlPressed: false,
  setCtrlPressed: (val) => set({ ctrlPressed: val }),
  moveDelta: [0, 0, 0],
  rotationDelta: [0, 0, 0],
  selectedPositionAnchor: null,
  selectedRotationAnchor: null,
  setMoveDelta: (delta) => set({ moveDelta: delta }),

  isDismantleModalOpen: false,
  dismantleTarget: null,
  highlightedPartNames: [],
  isDismantling: false,
  dismantleProgress: 0,
  dismantleTotal: 0,

  selectedSubMeshNames: [],
  meshVisibilityMap: {},
  setSelectedSubMeshName: (name) => set({ selectedSubMeshNames: name ? [name] : [] }),
  toggleSubMeshSelection: (name) => set((state) => {
    const names = state.selectedSubMeshNames || [];
    return {
      selectedSubMeshNames: names.includes(name)
        ? names.filter((n) => n !== name)
        : [...names, name],
    };
  }),
  clearSubMeshSelection: () => set({ selectedSubMeshNames: [], highlightedPartNames: [] }),

  toggleMeshVisibility: (objectId, meshName) => set((state) => {
    const hidden = state.meshVisibilityMap[objectId] || [];
    const isHidden = hidden.includes(meshName);
    return {
      meshVisibilityMap: {
        ...state.meshVisibilityMap,
        [objectId]: isHidden ? hidden.filter(n => n !== meshName) : [...hidden, meshName],
      },
    };
  }),

  hideAllExcept: (objectId, visibleNames) => set((state) => {
    const allParts = state.objects.find(o => o.id === objectId)?.parts || [];
    const hidden = allParts.map(p => p.name).filter(n => !visibleNames.includes(n));
    return { meshVisibilityMap: { ...state.meshVisibilityMap, [objectId]: hidden } };
  }),

  resetMeshVisibility: (objectId) => set((state) => {
    const next = { ...state.meshVisibilityMap };
    delete next[objectId];
    return { meshVisibilityMap: next };
  }),
  setIsDismantleModalOpen: (val) => set({ isDismantleModalOpen: val, highlightedPartNames: val ? [] : [] }),
  setDismantleTarget: (target) => set({ dismantleTarget: target }),
  setHighlightedPartNames: (names) => set({ highlightedPartNames: names }),

  smartZoomEnabled: true,
  setSmartZoomEnabled: (val) => set({ smartZoomEnabled: val }),
  interiorMode: false,
  interiorObjectId: null,
  exteriorCameraState: null,
  toggleInteriorMode: (objectId) => set((state) => {
    const targetId = objectId || state.selectedId;
    console.log('[Store] toggleInteriorMode called for:', targetId, 'Current mode:', state.interiorMode);

    if (state.interiorMode) {
      const ext = state.exteriorCameraState;
      console.log('[Store] Exiting Interior Mode. Returning to:', ext);
      return {
        interiorMode: false,
        interiorObjectId: null,
        exteriorCameraState: null,
        activeTool: 'select',
        cameraFocusTarget: ext ? ext.target : [0, 1.5, 0],
        cameraFocusPosition: ext ? ext.position : [8, 8, 8]
      };
    }

    const obj = state.objects.find(o => o.id === targetId);
    if (!obj) {
      console.warn('[Store] toggleInteriorMode: No object found for ID:', targetId);
      return state;
    }

    const bounds = physicsState.objectBounds.get(obj.id);
    if (!bounds) {
      console.warn('[Store] No bounds found for interior navigation of:', obj.id);
      return state;
    }

    const currentExt = {
      position: state.cameraFocusPosition || [8, 8, 8],
      target: state.cameraFocusTarget || [0, 1.5, 0]
    };

    const center = new THREE.Vector3();
    bounds.getCenter(center);

    const eyeHeight = bounds.min.y + 1.2;
    const target = [center.x, eyeHeight, center.z + 0.5];
    const position = [center.x, eyeHeight, center.z];

    console.log('[Store] Entering Interior Mode. Bounds:', bounds, 'Teleporting to:', position, 'Looking at:', target);

    return {
      interiorMode: true,
      interiorObjectId: obj.id,
      exteriorCameraState: currentExt,
      selectedId: obj.id,
      activeTool: 'select',
      cameraFocusTarget: target,
      cameraFocusPosition: position
    };
  }),

  layoutOverlays: [],
  layoutDimensions: [],
  layoutEnabled: true,
  setLayoutEnabled: (val) => set({ layoutEnabled: val }),

  layoutManagerOpen: false,
  layoutManagerTargetId: null,
  setLayoutManagerOpen: (open, targetId = null) => set({
    layoutManagerOpen: open,
    layoutManagerTargetId: targetId || get().layoutManagerTargetId
  }),

  updateLayoutDimension: (id, updates) => set((state) => ({
    layoutDimensions: state.layoutDimensions.map(d => d.id === id ? { ...d, ...updates } : d)
  })),

  removeLayoutDimension: (id) => set((state) => ({
    layoutDimensions: state.layoutDimensions.filter(d => d.id !== id)
  })),

  addLayoutOverlay: (overlay) => set((state) => ({
    layoutOverlays: [...state.layoutOverlays, {
      id: `ly_${Date.now()}`,
      position: [0, 0.01, 0],
      rotation: [-Math.PI / 2, 0, 0],
      scale: [10, 10, 1],
      opacity: 0.5,
      ...overlay
    }]
  })),

  updateLayoutOverlay: (id, updates) => set((state) => ({
    layoutOverlays: state.layoutOverlays.map(o => o.id === id ? { ...o, ...updates } : o)
  })),

  removeLayoutOverlay: (id) => set((state) => ({
    layoutOverlays: state.layoutOverlays.filter(o => o.id !== id)
  })),

  addLayoutDimension: (dim) => set((state) => ({
    layoutDimensions: [...state.layoutDimensions, { id: `dim_${Date.now()}`, ...dim }]
  })),

  removeAllLayouts: () => set({ layoutOverlays: [], layoutDimensions: [] }),

  objectHistory: {},

  /** One-step undo for multi-object moves (e.g. Alt+nudge). Consumed by `editorUndo` before per-object history. */
  spatialUndoStack: [],
  /** Paired with `spatialUndoStack` after a spatial undo (Ctrl+Y restores the nudge). */
  spatialRedoStack: [],

  _snapshotState: (obj) => JSON.stringify({
    position: [...(obj.position || [0, 0, 0])],
    rotation: [...(obj.rotation || [0, 0, 0])],
    scale: [...(obj.scale || [1, 1, 1])],
    color: obj.color
  }),

  _getNewHistory: (state, id) => {
    const obj = state.objects.find(o => o.id === id);
    if (!obj) return state.objectHistory[id] || { undo: [], redo: [] };

    const history = state.objectHistory[id] || { undo: [], redo: [] };
    const currentState = get()._snapshotState(obj);

    const lastState = history.undo[history.undo.length - 1];
    if (lastState === currentState) return history;

    return {
      undo: [...history.undo, currentState].slice(-20),
      redo: []
    };
  },

  saveHistory: (id) => set((state) => ({
    objectHistory: {
      ...state.objectHistory,
      [id]: get()._getNewHistory(state, id)
    }
  })),

  undoSpatialNudge: () =>
    set((state) => {
      const stack = state.spatialUndoStack || [];
      if (!stack.length) return {};
      const nextStack = [...stack];
      const entry = nextStack.pop();
      if (!entry || entry.kind !== 'nudge' || !entry.snapshots) return {};
      const snaps = entry.snapshots;
      const ids = Object.keys(snaps);
      const afterSnapshots = {};
      for (const id of ids) {
        const obj = state.objects.find((o) => o.id === id);
        if (obj) afterSnapshots[id] = get()._snapshotState(obj);
      }
      const spatialRedoStack = [...(state.spatialRedoStack || []), { kind: 'nudge', snapshots: afterSnapshots }].slice(-40);
      return {
        spatialUndoStack: nextStack,
        spatialRedoStack,
        objects: state.objects.map((o) => {
          const json = snaps[o.id];
          if (!json) return o;
          try {
            const prev = JSON.parse(json);
            return { ...o, ...prev };
          } catch {
            return o;
          }
        }),
      };
    }),

  redoSpatialNudge: () =>
    set((state) => {
      const rstack = state.spatialRedoStack || [];
      if (!rstack.length) return {};
      const nextRedo = [...rstack];
      const entry = nextRedo.pop();
      if (!entry || entry.kind !== 'nudge' || !entry.snapshots) return {};
      const snaps = entry.snapshots;
      const ids = Object.keys(snaps);
      const beforeSnapshots = {};
      for (const id of ids) {
        const obj = state.objects.find((o) => o.id === id);
        if (obj) beforeSnapshots[id] = get()._snapshotState(obj);
      }
      const spatialUndoStack = [...(state.spatialUndoStack || []), { kind: 'nudge', snapshots: beforeSnapshots }].slice(-40);
      return {
        spatialRedoStack: nextRedo,
        spatialUndoStack,
        objects: state.objects.map((o) => {
          const json = snaps[o.id];
          if (!json) return o;
          try {
            const next = JSON.parse(json);
            return { ...o, ...next };
          } catch {
            return o;
          }
        }),
      };
    }),

  /** Ctrl+Z: undo last spatial batch (nudge) if any, else per-object transform/color undo. */
  editorUndo: () => {
    const st = get();
    if (st.spatialUndoStack?.length) {
      get().undoSpatialNudge();
      return true;
    }
    const id = st.selectedId || (st.selectedIds?.length ? st.selectedIds[0] : null);
    if (id) {
      get().undoObject(id);
      return true;
    }
    return false;
  },

  /** Ctrl+Y: redo last spatial undo (nudge) if any, else per-object redo. */
  editorRedo: () => {
    const st = get();
    if (st.spatialRedoStack?.length) {
      get().redoSpatialNudge();
      return true;
    }
    const id = st.selectedId || (st.selectedIds?.length ? st.selectedIds[0] : null);
    if (id) {
      get().redoObject(id);
      return true;
    }
    return false;
  },

  undoObject: (id) => set((state) => {
    const history = state.objectHistory[id];
    if (!history || history.undo.length === 0) {
      return state;
    }

    const undoStack = [...history.undo];
    const redoStack = [...history.redo];
    const prevStateJson = undoStack.pop();
    const prevState = JSON.parse(prevStateJson);

    const currentObj = state.objects.find(o => o.id === id);
    if (!currentObj) return state;
    redoStack.push(get()._snapshotState(currentObj));

    return {
      objects: state.objects.map(o => o.id === id ? { ...o, ...prevState } : o),
      objectHistory: {
        ...state.objectHistory,
        [id]: { undo: undoStack, redo: redoStack }
      }
    };
  }),

  redoObject: (id) => set((state) => {
    const history = state.objectHistory[id];
    if (!history || history.redo.length === 0) {
      return state;
    }

    const undoStack = [...history.undo];
    const redoStack = [...history.redo];
    const nextStateJson = redoStack.pop();
    const nextState = JSON.parse(nextStateJson);

    const currentObj = state.objects.find(o => o.id === id);
    if (!currentObj) return state;
    undoStack.push(get()._snapshotState(currentObj));

    return {
      objects: state.objects.map(o => o.id === id ? { ...o, ...nextState } : o),
      objectHistory: {
        ...state.objectHistory,
        [id]: { undo: undoStack, redo: redoStack }
      }
    };
  }),

  linkingMode: false,
  setLinkingMode: (val) => set({ linkingMode: val }),

  cameraFocusTarget: [0, 1.5, 0],
  cameraFocusPosition: [8, 8, 8],
  setCameraFocus: (target, position) => set({
    cameraFocusTarget: target,
    cameraFocusPosition: position
  }),

  addSavedSceneCamera: (entry) =>
    set((state) => {
      const pid = state.projectId;
      if (!pid) return state;
      const name = String(entry?.name || 'Camera').trim().slice(0, 48) || 'Camera';
      const position = (entry?.position || []).map(Number).slice(0, 3);
      const target = (entry?.target || []).map(Number).slice(0, 3);
      if (position.length !== 3 || target.length !== 3) return state;
      if (state.savedSceneCameras.length >= SAVED_SCENE_CAMERAS_MAX) return state;
      const id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `cam-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const next = [...state.savedSceneCameras, { id, name, position, target }];
      saveSavedSceneCameras(pid, next);
      return { savedSceneCameras: next };
    }),

  removeSavedSceneCamera: (id) =>
    set((state) => {
      const pid = state.projectId;
      if (!pid) return state;
      const next = state.savedSceneCameras.filter((c) => c.id !== id);
      saveSavedSceneCameras(pid, next);
      return { savedSceneCameras: next };
    }),

  recallSavedSceneCamera: (id) => {
    const c = get().savedSceneCameras.find((x) => x.id === id);
    if (!c) return false;
    get().setStudioViewLayout('scene');
    get().setCameraFocus([...c.target], [...c.position]);
    return true;
  },

  collidingPairs: [],
  setCollidingPairs: (pairs) => set((state) => {
    const prev = state.collidingPairs || [];
    if (
      prev.length === pairs.length
      && prev.every((p, i) =>
        p.id1 === pairs[i]?.id1
        && p.id2 === pairs[i]?.id2
      )
    ) {
      return state;
    }
    return { collidingPairs: pairs };
  }),

  loadProject: async (routeProjectId) => {

    if (get().skipNextProjectLoad) {
      console.log('[Store] Skipping loadProject to preserve pending vault object.');
      set({ skipNextProjectLoad: false });
      return;
    }

    const id = routeProjectId != null && String(routeProjectId).trim() !== '' ? String(routeProjectId).trim() : null;

    try {
      const { projectService } = await import('../api/apiService');
      let res;
      if (id) {
        try {
          res = await projectService.getProject(id);
        } catch (e) {
          if (e?.response?.status === 404) {
            res = await projectService.getLatest();
            if (typeof document !== 'undefined') {
              document.dispatchEvent(
                new CustomEvent('novira:export-toast', {
                  detail: { message: 'Project not found — opened your latest design instead.' },
                })
              );
            }
          } else {
            throw e;
          }
        }
      } else {
        res = await projectService.getLatest();
      }

      if (res.data?.success && res.data?.data) {
        const data = res.data.data;
        let loadedObjects = data.sceneGraph || [];

        set((state) => {
          const localExtras = state.objects.filter(o =>
            o.type !== 'ground' &&
            !loadedObjects.find(lo => lo.id === o.id)
          );
          const stories = loadBuildingStoriesMeta(data.id);
          const firstStory = stories[0]?.id || 'floor1';
          const savedSceneCameras = loadSavedSceneCameras(data.id);

          return {
            projectId: data.id,
            projectName: data.name || 'Untitled Project',
            objects: [...loadedObjects, ...localExtras],
            projectAssetShelf: normalizeBankLibrary(loadProjectShelf(data.id)),
            buildingStories: stories,
            activeBuildingStoryId: firstStory,
            savedSceneCameras,
            materialLibraryPresets: loadMaterialPresetsFromStorage(data.id),
            materialEditorCurrentFrame: 0,
            threeDCursorWorld: null,
            snapCursorMenuOpen: false,
            isolateActive: false,
            isolateHiddenBackup: null,
            spatialUndoStack: [],
            spatialRedoStack: [],
          };
        });
      }
    } catch (err) {
      console.error('[Store] Failed to load project:', err);
    }
  },

  setSkipNextProjectLoad: (val) => set({ skipNextProjectLoad: val }),

  saveProject: async () => {
    const { projectId, objects, projectAssetShelf, buildingStories, activeBuildingStoryId } = get();
    if (!projectId) return;

    persistPlannerStory(projectId, activeBuildingStoryId);
    saveBuildingStoriesMeta(projectId, buildingStories);

    saveProjectShelf(projectId, projectAssetShelf);

    const cleanObjects = objects.map(obj => {
      if ((obj.type === 'gltf' || obj.type === 'gltf-part' || obj.type === 'stl') && obj.url && obj.url.startsWith('blob:')) {
        if (obj.source === 'blenderkit' && obj.sourceAssetId) {
          return { ...obj, url: null, originalModelUrl: null };
        }
        return { ...obj, url: obj.originalModelUrl || null };
      }
      return obj;
    });

    set({ isSaving: true });
    try {
      const { projectService } = await import('../api/apiService');
      await projectService.saveSceneGraph(projectId, cleanObjects);
    } catch (err) {
      console.error('Failed to save scene:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  addObject: (object, position = null) => set((state) => {
    console.log('[Store] addObject called with:', object, 'at position:', position);
    const id = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const floorY = sceneFloorY(state.objects);

    const objType = object.type || 'primitive';
    const isGltf = objType === 'gltf' || objType === 'sketchfab' || objType === 'gltf-part' || objType === 'stl';
    const bottomOffset = isGltf ? 0 : ((object.dimensions?.[1] || 1) * (object.scale?.[1] || 1)) / 2;

    let spawnPos;
    if (position) {
      spawnPos = [position[0], position[1] + floorY + bottomOffset, position[2]];
    } else {
      spawnPos = resolveImplicitSpawnPosition(state, floorY, bottomOffset);
    }

    const newObj = {
        id,
        parentId: null,
        ...object,
        position: spawnPos,
        scale: object.scale || [1, 1, 1],
        dimensions: object.dimensions || [1, 1, 1]
    };
    console.log('[Store] Object created in store:', newObj);

    const bankEntry = sceneObjectToBankEntry({ ...newObj, id });
    let globalAssetLibrary = state.globalAssetLibrary;
    let projectAssetShelf = state.projectAssetShelf;
    if (bankEntry) {
      const row = { ...bankEntry, sceneObjectId: id };
      globalAssetLibrary = mergeBankUnique(globalAssetLibrary, row);
      saveGlobalLibrary(globalAssetLibrary);
      if (state.projectId) {
        projectAssetShelf = mergeBankUnique(projectAssetShelf, { ...row, shelfScope: 'project' });
        saveProjectShelf(state.projectId, projectAssetShelf);
      }
    }

    return {
      objects: [...state.objects, newObj],
      selectedId: id,
      globalAssetLibrary,
      projectAssetShelf,
    };
  }),

  addObjectsBulk: (items, options = {}) => set((state) => {
    const {
      replaceSceneExceptGround = false,
      replaceEntireScene = false,
      clearSelection = false,
    } = options;
    let baseObjects = state.objects;
    if (replaceEntireScene) {
      baseObjects = [];
    } else if (replaceSceneExceptGround) {
      const kept = state.objects.filter((o) => o.type === 'ground');
      baseObjects = kept.length ? kept : state.objects;
    }

    const floorY = sceneFloorY(baseObjects);

    const baseTime = Date.now();
    const newObjs = items.map((item, i) => {
      const raw = item.object || item;
      const position = item.position ?? null;
      const id = `obj_${baseTime + i}_${Math.random().toString(36).substring(2, 11)}`;
      const objType = raw.type || 'primitive';
      const isGltf = objType === 'gltf' || objType === 'sketchfab' || objType === 'gltf-part' || objType === 'stl';
      const bottomOffset = isGltf ? 0 : ((raw.dimensions?.[1] || 1) * (raw.scale?.[1] || 1)) / 2;
      let spawnPos;
      if (position) {
        spawnPos = [position[0], position[1] + floorY + bottomOffset, position[2]];
      } else {
        spawnPos = resolveImplicitSpawnPosition(state, floorY, bottomOffset);
      }
      return {
        id,
        parentId: null,
        ...raw,
        position: spawnPos,
        scale: raw.scale || [1, 1, 1],
        dimensions: raw.dimensions || [1, 1, 1],
      };
    });

    let globalAssetLibrary = state.globalAssetLibrary;
    let projectAssetShelf = state.projectAssetShelf;
    for (const o of newObjs) {
      const be = sceneObjectToBankEntry(o);
      if (!be) continue;
      const row = { ...be, sceneObjectId: o.id };
      globalAssetLibrary = mergeBankUnique(globalAssetLibrary, row);
      if (state.projectId) {
        projectAssetShelf = mergeBankUnique(projectAssetShelf, { ...row, shelfScope: 'project' });
      }
    }
    if (newObjs.length) {
      saveGlobalLibrary(globalAssetLibrary);
      if (state.projectId) saveProjectShelf(state.projectId, projectAssetShelf);
    }

    return {
      objects: [...baseObjects, ...newObjs],
      selectedId: clearSelection ? null : (newObjs.length ? newObjs[newObjs.length - 1].id : state.selectedId),
      selectedIds: clearSelection ? [] : state.selectedIds,
      globalAssetLibrary,
      projectAssetShelf,
    };
  }),

  applyProjectTemplate: (templateId) => {
    const t = PROJECT_TEMPLATES.find((x) => x.id === templateId);
    if (!t?.objects?.length) return false;
    get().addObjectsBulk(
      t.objects.map((raw) => ({ object: { ...raw } })),
      { replaceEntireScene: true, clearSelection: true }
    );
    return true;
  },

  resetSelectedObject: () => set((state) => {
    const selectedId = state.selectedId;
    if (!selectedId) return state;

    return {
      liftedObjectId: null,
      liftOrigin: null,
      objects: state.objects.map(obj => {
        if (obj.id !== selectedId) return obj;

        const groundObj = state.objects.find(o => o.type === 'ground');
        let floorY = 0;
        if (groundObj) {
          floorY = groundObj.position[1] + ((groundObj.dimensions?.[1] || 1) * (groundObj.scale?.[1] || 1)) / 2;
        }

        const isGltf = obj.type === 'gltf' || obj.type === 'stl';
        const bottomOffset = isGltf ? 0 : ((obj.dimensions?.[1] || 1) * (obj.scale?.[1] || 1)) / 2;

        const resetPos = state.liftOrigin || [0, floorY + bottomOffset, 0];

        return {
          ...obj,
          position: [...resetPos],
          rotation: [0, 0, 0],
          scale: [1, 1, 1]
        };
      })
    };
  }),

  removeObject: (id) => set((state) => ({

    objects: state.objects.filter(obj => obj.id !== id && obj.parentId !== id),
    selectedId: state.selectedId === id ? null : state.selectedId
  })),

  dismantleObject: (id, parts) => {

    const HARD_CAP = 50;
    const BATCH_SIZE = 10;

    const originalObj = get().objects.find(o => o.id === id);
    if (!originalObj || !parts || parts.length === 0) return;

    if (parts.length > HARD_CAP) {

      set({ dismantleProgress: -1 });
      console.warn(`[Dismantle] Refused: ${parts.length} parts exceeds the hard cap of ${HARD_CAP}. Use Mesh Inspector instead.`);
      return;
    }

    const totalParts = parts.length;

    set((state) => ({
      objects: state.objects.map(o =>
        o.id === id ? { ...o, type: 'group', isDismantled: true } : o
      ),
      isDismantling: true,
      dismantleProgress: 0,
      dismantleTotal: totalParts,
      highlightedPartNames: [],
    }));

    let processed = 0;

    const processBatch = () => {
      const batch = parts.slice(processed, processed + BATCH_SIZE);
      if (batch.length === 0) {
        set({ isDismantling: false, dismantleProgress: 100, isDismantleModalOpen: false, dismantleTarget: null, selectedId: null });
        return;
      }
      const startIdx = processed;
      const parentPos = originalObj.position || [0, 0, 0];
      const parentRot = originalObj.rotation || [0, 0, 0];
      const parentScale = originalObj.scale || [1, 1, 1];
      const newParts = batch.map((part, i) => {

        const cx = part.center?.[0] ?? 0;
        const cy = part.center?.[1] ?? 0;
        const cz = part.center?.[2] ?? 0;
        return {
          id: `${id}_part_${startIdx + i}_${Math.random().toString(36).substring(2, 5)}`,
          name: part.name || `Part ${startIdx + i + 1}`,
          type: 'gltf-part',
          url: originalObj.url,
          meshName: part.name,

          position: [parentPos[0] + cx, parentPos[1] + cy, parentPos[2] + cz],
          rotation: [...parentRot],
          scale: [...parentScale],
          color: originalObj.color,
          parentId: id,
        };
      });
      processed += batch.length;
      set((state) => ({ objects: [...state.objects, ...newParts], dismantleProgress: Math.round((processed / totalParts) * 100) }));
      if (processed < totalParts) {
        setTimeout(processBatch, 80);
      } else {
        setTimeout(() => set({ isDismantling: false, dismantleProgress: 100, isDismantleModalOpen: false, dismantleTarget: null }), 200);
      }
    };

    setTimeout(processBatch, 80);
  },

  quickExtractPart: (id, meshName, hitPointWorld = null) => set((state) => {
    const parentObj = state.objects.find(o => o.id === id);
    if (!parentObj) return state;

    const allParts = Array.isArray(parentObj.parts) ? parentObj.parts : [];
    const partData = allParts.find(p => p.name === meshName) || null;
    if (!partData) {
      console.warn('[quickExtractPart] Part data not available yet for:', meshName);
      return state;
    }

    const existingPart = state.objects.find(
      (o) => o.type === 'gltf-part' && o.parentId === id && o.meshName === meshName
    );
    if (existingPart) {
      return {
        selectedId: existingPart.id,
        selectedIds: [existingPart.id],
      };
    }

    const parentPos = parentObj.position || [0, 0, 0];
    const parentRot = parentObj.rotation || [0, 0, 0];
    const parentScale = parentObj.scale || [1, 1, 1];
    const pivot = Array.isArray(partData?.center) && partData.center.length === 3
      ? [
        Number(partData.center[0]) || 0,
        Number(partData.center[1]) || 0,
        Number(partData.center[2]) || 0,
      ]
      : [0, 0, 0];

    // Convert local pivot offset into world-space offset:
    // world = T + R * (S * local)
    const localPivotScaled = new THREE.Vector3(
      pivot[0] * parentScale[0],
      pivot[1] * parentScale[1],
      pivot[2] * parentScale[2]
    );
    const worldPivotOffset = localPivotScaled.applyEuler(
      new THREE.Euler(parentRot[0] || 0, parentRot[1] || 0, parentRot[2] || 0, 'XYZ')
    );


    const partId = `${id}_part_${meshName}_${Math.random().toString(36).substring(2, 5)}`;
    const newPart = {
        id: partId,
        name: partData?.name || meshName || 'Part',
        type: 'gltf-part',
        url: parentObj.url,
        meshName: partData?.name || meshName,
        // Keep exact world placement while giving the part its own pivot for gizmo/editing.
        position: [
          parentPos[0] + worldPivotOffset.x,
          parentPos[1] + worldPivotOffset.y,
          parentPos[2] + worldPivotOffset.z,
        ],
        rotation: [...parentRot],
        scale: [...parentScale],
        partPivot: pivot,
        color: parentObj.color,
        parentId: id,
    };

    const hidden = state.meshVisibilityMap[id] || [];
    const nextHidden = hidden.includes(meshName) ? hidden : [...hidden, meshName];

    return {
        objects: [...state.objects, newPart],
        meshVisibilityMap: {
            ...state.meshVisibilityMap,
            [id]: nextHidden
        },
        selectedId: partId,
        selectedIds: [partId],
    };
  }),

  quickReassemblePart: (partId) => set((state) => {
    const part = state.objects.find(o => o.id === partId);
    if (!part || part.type !== 'gltf-part' || !part.parentId) return state;

    const parentId = part.parentId;
    const meshName = part.meshName;

    const hidden = state.meshVisibilityMap[parentId] || [];
    const nextHidden = hidden.filter(n => n !== meshName);

    const nextMeshVisibilityMap = { ...state.meshVisibilityMap };
    if (nextHidden.length === 0) {
        delete nextMeshVisibilityMap[parentId];
    } else {
        nextMeshVisibilityMap[parentId] = nextHidden;
    }

    return {
        objects: state.objects.filter(o => o.id !== partId),
        meshVisibilityMap: nextMeshVisibilityMap,
        selectedId: parentId
    };
  }),

  assembleObject: (id) => set((state) => {
    const parentObj = state.objects.find(o => o.id === id);
    if (!parentObj) return state;

    const remainingObjects = state.objects.filter(o => o.parentId !== id);

    return {
      objects: remainingObjects.map(o =>
        o.id === id ? { ...o, type: 'gltf', isDismantled: false } : o
      ),
      selectedId: id
    };
  }),

  updateObject: (id, updates, saveToHistory = false) => set((state) => {
    const historyUpdate = saveToHistory ? {
        objectHistory: {
            ...state.objectHistory,
            [id]: get()._getNewHistory(state, id)
        }
    } : {};

    const prevObj = state.objects.find(o => o.id === id);

    if (updates.position && prevObj?.position) {
      const dx = updates.position[0] - prevObj.position[0];
      const dy = updates.position[1] - prevObj.position[1];
      const dz = updates.position[2] - prevObj.position[2];

      if (Math.abs(dx) > 1e-6 || Math.abs(dy) > 1e-6 || Math.abs(dz) > 1e-6) {

        const getRootId = (objId) => {
          const o = state.objects.find(x => x.id === objId);
          if (!o || !o.parentId) return objId;
          return getRootId(o.parentId);
        };
        const rootId = getRootId(id);

        const isInGroup =
          prevObj.parentId != null ||
          state.objects.some(o => o.parentId === id);

        if (isInGroup) {
          const newObjects = state.objects.map(obj => {
            if (obj.id === id) return { ...obj, ...updates };

            const objRoot = getRootId(obj.id);
            if (objRoot === rootId) {
              return {
                ...obj,
                position: [
                  obj.position[0] + dx,
                  obj.position[1] + dy,
                  obj.position[2] + dz
                ]
              };
            }
            return obj;
          });
          return { ...historyUpdate, objects: newObjects };
        }
      }
    }

    const updatedObjects = state.objects.map(obj =>
      obj.id === id ? { ...obj, ...updates } : obj
    );

    let moveDeltaUpdate = {};
    if (id === state.selectedId && updates.position && state.selectedPositionAnchor) {
      const anchor = state.selectedPositionAnchor;
      moveDeltaUpdate = {
        moveDelta: [
          updates.position[0] - anchor[0],
          updates.position[1] - anchor[1],
          updates.position[2] - anchor[2]
        ]
      };
    }

    let rotationDeltaUpdate = {};
    if (id === state.selectedId && updates.rotation && state.selectedRotationAnchor) {
      const anchor = state.selectedRotationAnchor;
      rotationDeltaUpdate = {
        rotationDelta: [
          (updates.rotation[0] - anchor[0]) * (180 / Math.PI),
          (updates.rotation[1] - anchor[1]) * (180 / Math.PI),
          (updates.rotation[2] - anchor[2]) * (180 / Math.PI)
        ]
      };
    }

    return {
      ...historyUpdate,
      ...moveDeltaUpdate,
      ...rotationDeltaUpdate,
      objects: updatedObjects
    };
  }),

  setParent: (childId, parentId) => set((state) => {
    const parent = state.objects.find(o => o.id === parentId);
    const child = state.objects.find(o => o.id === childId);
    if (!parent || !child || childId === parentId) return state;

    if (child.parentId === parentId || parent.parentId === childId) return state;

    const linkOffset = [
      child.position[0] - parent.position[0],
      child.position[1] - parent.position[1],
      child.position[2] - parent.position[2]
    ];
    console.log(`[Parenting] ${childId} is now a child of ${parentId}, offset:`, linkOffset);
    return {
      objects: state.objects.map(o =>
        o.id === childId ? { ...o, parentId, linkOffset } : o
      )
    };
  }),

  breakParent: (objectId) => set((state) => {
    const obj = state.objects.find(o => o.id === objectId);
    if (!obj) return state;

    const rootId = obj.parentId || objectId;
    return {
      objects: state.objects.map(o => {
        if (o.id === rootId || o.parentId === rootId) {
          const { parentId, linkOffset, ...rest } = o;
          return { ...rest, parentId: null, linkOffset: null };
        }
        return o;
      })
    };
  }),

  setSelectedId: (id) => set((state) => {
    const obj = state.objects.find(o => o.id === id);
    return {
      selectedId: id,
      selectedIds: id ? [id] : [],
      moveDelta: [0, 0, 0],
      rotationDelta: [0, 0, 0],
      selectedPositionAnchor: obj ? [...obj.position] : null,
      selectedRotationAnchor: obj ? [...(obj.rotation || [0, 0, 0])] : null
    };
  }),
  cinemaChrome: false,
  setCinemaChrome: (val) => set({ cinemaChrome: !!val }),

  /**
   * Live Home–style layout: plan | scene | split | elevation.
   * `studioWorkspace` is kept in sync for legacy checks (floorplan vs scene chrome).
   */
  studioViewLayout: initialStudioViewLayout,
  /** Ortho elevation panel: which cardinal direction the camera looks from (XZ plane). */
  elevationOrthoFace: initialElevationOrthoFace,
  setElevationOrthoFace: (face) => {
    const f = ['north', 'south', 'east', 'west'].includes(face) ? face : 'south';
    try {
      localStorage.setItem('novira_elevation_ortho_face_v1', f);
    } catch {
      /* ignore */
    }
    set({ elevationOrthoFace: f });
  },

  setStudioViewLayout: (layout) => {
    const L = ['plan', 'scene', 'split', 'elevation'].includes(layout) ? layout : 'scene';
    const ws = L === 'plan' || L === 'elevation' ? 'floorplan' : 'scene';
    try {
      localStorage.setItem('novira_studio_view_layout_v1', L);
    } catch {
      /* ignore */
    }
    set({ studioViewLayout: L, studioWorkspace: ws });
  },

  /** @deprecated Prefer studioViewLayout — still used by integrations that only know floorplan/scene. */
  studioWorkspace:
    initialStudioViewLayout === 'plan' || initialStudioViewLayout === 'elevation' ? 'floorplan' : 'scene',
  setStudioWorkspace: (w) => {
    const L = w === 'floorplan' ? 'plan' : 'scene';
    try {
      localStorage.setItem('novira_studio_view_layout_v1', L);
    } catch {
      /* ignore */
    }
    set({ studioWorkspace: w === 'floorplan' ? 'floorplan' : 'scene', studioViewLayout: L });
  },

  /** Multi-story floor plans (react-planner state per story in localStorage). */
  buildingStories: [{ id: 'floor1', name: 'Floor 1', levelM: 0 }],
  activeBuildingStoryId: 'floor1',

  persistActivePlannerStory: () => {
    const { projectId, activeBuildingStoryId } = get();
    persistPlannerStory(projectId, activeBuildingStoryId);
  },

  setActiveBuildingStoryId: (id) =>
    set((state) => {
      if (!id || id === state.activeBuildingStoryId) return state;
      plannerSwitchStory(state.projectId, state.activeBuildingStoryId, id);
      saveBuildingStoriesMeta(state.projectId, state.buildingStories);
      return { activeBuildingStoryId: id };
    }),

  addBuildingStory: () =>
    set((state) => {
      persistPlannerStory(state.projectId, state.activeBuildingStoryId);
      const newId = `st_${Date.now().toString(36)}`;
      const n = state.buildingStories.length + 1;
      const nextStories = [
        ...state.buildingStories,
        { id: newId, name: `Floor ${n}`, levelM: (n - 1) * 3 },
      ];
      saveBuildingStoriesMeta(state.projectId, nextStories);
      dispatchPlannerLoadOrNew(null);
      return {
        buildingStories: nextStories,
        activeBuildingStoryId: newId,
      };
    }),

  /** After switching project, hydrate first story into planner if store exists. */
  hydratePlannerForActiveStory: () => {
    const { projectId, activeBuildingStoryId } = get();
    let plain = loadPlannerStoryPlain(projectId, activeBuildingStoryId);
    if (!plain && typeof window !== 'undefined') {
      try {
        const leg = window.localStorage.getItem('novira_react_planner_v2');
        if (leg) plain = sanitizeNoviraIntegratedPlannerScene(JSON.parse(leg));
      } catch {
        /* noop */
      }
    }
    dispatchPlannerLoadOrNew(plain);
  },

  setCatalogBankLayout: (layout) =>
    set({ catalogBankLayout: layout === 'list' ? 'list' : 'grid' }),

  addToGlobalAssetLibrary: (partial) =>
    set((s) => {
      const row = {
        id: `bank_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        addedAt: Date.now(),
        name: partial?.name || 'Asset',
        url: partial?.url || partial?.originalModelUrl || null,
        originalModelUrl: partial?.originalModelUrl || null,
        source: partial?.source || 'manual',
        sourceAssetId: partial?.sourceAssetId || null,
        type: partial?.type || 'gltf',
        thumbnail: partial?.thumbnail || partial?.thumbnailUrl || partial?.thumb || null,
      };
      const next = mergeBankUnique(s.globalAssetLibrary, row);
      saveGlobalLibrary(next);
      return { globalAssetLibrary: next };
    }),

  pinGlobalAssetToProject: (globalRowId) =>
    set((s) => {
      const pid = s.projectId;
      if (!pid) return s;
      const row = s.globalAssetLibrary.find((x) => x.id === globalRowId);
      if (!row) return s;
      const pin = {
        ...row,
        id: `shelf_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        fromGlobalId: globalRowId,
        shelfScope: 'project',
      };
      const next = mergeBankUnique(s.projectAssetShelf, pin);
      saveProjectShelf(pid, next);
      return { projectAssetShelf: next };
    }),

  removeGlobalLibraryEntry: (id) =>
    set((s) => {
      const next = s.globalAssetLibrary.filter((e) => e.id !== id);
      saveGlobalLibrary(next);
      return { globalAssetLibrary: next };
    }),

  removeProjectShelfEntry: (id) =>
    set((s) => {
      const pid = s.projectId;
      if (!pid) return s;
      const next = s.projectAssetShelf.filter((e) => e.id !== id);
      saveProjectShelf(pid, next);
      return { projectAssetShelf: next };
    }),

  /** Place a bank row (URL/blob) into the Novira 3D scene. */
  placeBankEntryInScene: (row) =>
    set((state) => {
      if (!row || typeof row !== 'object') return state;
      const url = String(row.url || row.originalModelUrl || '').trim();
      if (!url) return state;
      const lower = url.toLowerCase();
      const isStl = row.type === 'stl' || /\.stl($|\?)/i.test(lower);
      const id = `obj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const groundObj = state.objects.find((o) => o.type === 'ground');
      let floorY = 0;
      if (groundObj) {
        floorY =
          groundObj.position[1] +
          ((groundObj.dimensions?.[1] || 1) * (groundObj.scale?.[1] || 1)) / 2;
      }
      const newObj = {
        id,
        parentId: null,
        name: row.name || 'Asset',
        type: isStl ? 'stl' : 'gltf',
        url,
        originalModelUrl: row.originalModelUrl || (row.url && !String(row.url).startsWith('blob:') ? row.url : null),
        source: row.source || 'library',
        sourceAssetId: row.sourceAssetId || null,
        position: [0, floorY, 0],
        scale: [1, 1, 1],
        dimensions: [1, 1, 1],
      };
      const bankEntry = sceneObjectToBankEntry(newObj);
      let globalAssetLibrary = state.globalAssetLibrary;
      let projectAssetShelf = state.projectAssetShelf;
      if (bankEntry) {
        const r = { ...bankEntry, sceneObjectId: id };
        globalAssetLibrary = mergeBankUnique(globalAssetLibrary, r);
        saveGlobalLibrary(globalAssetLibrary);
        if (state.projectId) {
          projectAssetShelf = mergeBankUnique(projectAssetShelf, { ...r, shelfScope: 'project' });
          saveProjectShelf(state.projectId, projectAssetShelf);
        }
      }
      return {
        objects: [...state.objects, newObj],
        selectedId: id,
        globalAssetLibrary,
        projectAssetShelf,
      };
    }),

  setMode: (mode) => set((state) => ({
    mode,
    cinemaChrome: mode === 'build' ? false : state.cinemaChrome,
  })),

  transformMode: 'translate',
  setTransformMode: (mode) => set({ transformMode: mode }),

  wireframe: false,
  setWireframe: (val) => set({ wireframe: val }),

  /** `world` | `local` — transform gizmo aligns to scene vs object (Blender / Maya style). */
  transformSpace: 'world',
  setTransformSpace: (space) =>
    set({ transformSpace: space === 'local' ? 'local' : 'world' }),
  toggleTransformSpace: () =>
    set((s) => ({ transformSpace: s.transformSpace === 'local' ? 'world' : 'local' })),

  /** Corner X/Y/Z navigation gizmo (axis views). */
  viewportAxisGizmoEnabled: true,
  setViewportAxisGizmoEnabled: (v) => set({ viewportAxisGizmoEnabled: !!v }),

  gridVisible: true,
  setGridVisible: (val) => set({ gridVisible: val }),

  /** Live Home–style display units (scene length readouts). Internal lengths stay in meters. */
  designUnits: loadDesignUnits(),
  setDesignUnits: (u) => {
    const next = ['m', 'cm', 'mm', 'ft', 'in'].includes(u) ? u : 'm';
    persistDesignUnits(next);
    set({ designUnits: next });
  },
  cycleDesignUnits: () =>
    set((s) => {
      const next = cycleDesignUnitKey(s.designUnits);
      persistDesignUnits(next);
      return { designUnits: next };
    }),

  /** Updated from 3D viewport (ground-plane hit + zoom heuristic). */
  viewportHudZoomPct: null,
  viewportHudGroundXZ: null,
  setViewportHudZoomPct: (n) =>
    set({
      viewportHudZoomPct:
        typeof n === 'number' && Number.isFinite(n) ? Math.max(5, Math.min(800, Math.round(n))) : null,
    }),
  setViewportHudGroundXZ: (xz) =>
    set({
      viewportHudGroundXZ:
        Array.isArray(xz) && xz.length === 2 && xz.every((v) => Number.isFinite(v)) ? [xz[0], xz[1]] : null,
    }),

  /** Floor plan cursor in react-planner scene space (cm on X/Y — divide by 100 for meters). */
  plannerHudSceneCm: null,
  setPlannerHudSceneCm: (xy) =>
    set({
      plannerHudSceneCm:
        Array.isArray(xy) && xy.length === 2 && xy.every((v) => Number.isFinite(v)) ? [xy[0], xy[1]] : null,
    }),

  /** Object-to-object alignment guides while dragging (Live Home “snap” family). */
  objectSnapEnabled: true,
  toggleObjectSnap: () => set((s) => ({ objectSnapEnabled: !s.objectSnapEnabled })),

  /** Main 3D viewport: orbit (default) or first-person walk (WASD + mouse). */
  viewportNavMode: 'orbit',
  setViewportNavMode: (m) => set({ viewportNavMode: m === 'walk' ? 'walk' : 'orbit' }),

  /** Geolocated sun (degrees, NYC default). Minutes 0–1440 = local solar time approximation. */
  sunLatitude: 40.7128,
  sunLongitude: -74.006,
  sunMinutesFromMidnight: 12 * 60,
  sunCloudiness: 0.2,
  setSunGeo: (lat, lon) =>
    set({
      sunLatitude: typeof lat === 'number' ? lat : get().sunLatitude,
      sunLongitude: typeof lon === 'number' ? lon : get().sunLongitude,
    }),
  setSunMinutesFromMidnight: (min) =>
    set({ sunMinutesFromMidnight: Math.max(0, Math.min(1440, Number(min) || 0)) }),
  setSunCloudiness: (c) => set({ sunCloudiness: Math.max(0, Math.min(1, Number(c) || 0)) }),

  /** Drag material onto mesh: click targets in SceneObject raycast layer. */
  materialPaintMode: false,
  materialPaintSample: { color: '#c4a574', roughness: 0.45, metalness: 0.08 },
  setMaterialPaintMode: (v) => set({ materialPaintMode: !!v }),
  setMaterialPaintSample: (partial) =>
    set((s) => ({
      materialPaintSample: { ...s.materialPaintSample, ...(partial && typeof partial === 'object' ? partial : {}) },
    })),

  /** Experimental WebGPU / path trace preview (UI flag; renderer swap is opt-in). */
  webgpuPathTraceRequested: false,
  setWebgpuPathTraceRequested: (v) => set({ webgpuPathTraceRequested: !!v }),

  /** Roof assistant preview (degrees) — used by `appendRoofAssistPreview`. */
  roofPreviewPitchDeg: 32,
  setRoofPreviewPitchDeg: (n) =>
    set({ roofPreviewPitchDeg: Math.max(12, Math.min(58, Math.round(Number(n) || 32))) }),

  /** Quick procedural terrain strip in the 3D scene (assist pipeline placeholder). */
  appendTerrainAssistStrip: () =>
    get().addObjectsBulk(
      Array.from({ length: 10 }, (_, i) => ({
        object: {
          type: 'primitive',
          geo: 'box',
          name: `Terrain assist ${i + 1}`,
          dimensions: [1.12, 0.12 + ((Math.sin(i * 0.65) + 1) * 0.07), 1.12],
          color: '#5d6d7e',
          roughness: 0.9,
          metalness: 0.04,
        },
        position: [-5.2 + i * 1.04, 0.18 + Math.sin(i * 0.45) * 0.08, -3.8],
      })),
      {}
    ),

  /** Gabled roof preview as two rotated slabs (assist pipeline placeholder). */
  appendRoofAssistPreview: () => {
    const deg = get().roofPreviewPitchDeg;
    const pitch = (deg * Math.PI) / 180;
    const half = 2.6;
    const rise = Math.tan(pitch) * half;
    return get().addObjectsBulk(
      [
        {
          object: {
            type: 'primitive',
            geo: 'box',
            name: 'Roof assist (plane A)',
            dimensions: [half * 2, 0.1, 3.2],
            rotation: [-pitch, 0, 0],
            color: '#78716c',
            roughness: 0.78,
            metalness: 0.05,
          },
          position: [-half * 0.5, rise / 2 + 2.25, 0],
        },
        {
          object: {
            type: 'primitive',
            geo: 'box',
            name: 'Roof assist (plane B)',
            dimensions: [half * 2, 0.1, 3.2],
            rotation: [pitch, 0, 0],
            color: '#78716c',
            roughness: 0.78,
            metalness: 0.05,
          },
          position: [half * 0.5, rise / 2 + 2.25, 0],
        },
      ],
      {}
    );
  },

  lightingEnabled: true,
  setLightingEnabled: (val) => set({ lightingEnabled: val }),

  environmentVisible: false,
  setEnvironmentVisible: (val) => set({ environmentVisible: val }),

  envPreset: 'apartment',
  setEnvPreset: (preset) => set({ envPreset: preset }),

  customHdriUrl: null,
  setCustomHdriUrl: (url) => set({ customHdriUrl: url }),

  soundEnabled: false,
  setSoundEnabled: (val) => set({ soundEnabled: val }),

  luxPreviewVisible: false,
  setLuxPreviewVisible: (val) => set({ luxPreviewVisible: val }),
  soundCoverageVisible: false,
  setSoundCoverageVisible: (val) => set({ soundCoverageVisible: val }),
  crowdFlowVisible: false,
  setCrowdFlowVisible: (val) => set({ crowdFlowVisible: val }),

  /** immersive-vr from navigator.xr (Quest / desktop OpenXR), detected inside Canvas */
  webxrImmersiveVRAvailable: false,
  setWebxrImmersiveVRAvailable: (val) => set({ webxrImmersiveVRAvailable: !!val }),
  xrPresenting: false,
  setXrPresenting: (val) => set({ xrPresenting: !!val }),

  customAudioUrl: null,
  setCustomAudioUrl: (url) => set({ customAudioUrl: url }),

  audioLoop: true,
  setAudioLoop: (val) => set({ audioLoop: val }),

  audioPlaybackRate: 1,
  setAudioPlaybackRate: (rate) => set({ audioPlaybackRate: rate }),

  audioCurrentTime: 0,
  setAudioCurrentTime: (time) => set({ audioCurrentTime: time }),

  groundRef: { current: null },

  duplicateObject: (id) => set((state) => {
    const obj = state.objects.find(o => o.id === id);
    if (!obj) return state;

    const ground = state.objects.find(o => o.type === 'ground');
    let floorY = 0;
    if (ground) {
      floorY = ground.position[1] + ((ground.dimensions?.[1] || 1) * (ground.scale?.[1] || 1)) / 2;
    }
    const bottomOffset = obj.type === 'gltf' || obj.type === 'stl' ? 0 : ((obj.dimensions?.[1] || 1) * (obj.scale?.[1] || 1)) / 2;

    const useCursor = state.spawnAtThreeDCursor && state.threeDCursorWorld?.length >= 3;
    const position = useCursor
      ? [...state.threeDCursorWorld]
      : [obj.position[0] + 1, floorY + bottomOffset, obj.position[2] + 1];

    const newObj = {
      ...obj,
      id: crypto.randomUUID(),
      name: obj.name + ' (Copy)',
      position,
    };
    return { objects: [...state.objects, newObj], selectedId: newObj.id };
  }),

  measurementsEnabled: false,
  setMeasurementsEnabled: (val) => set({ measurementsEnabled: val }),

  userProfile: null,
  fetchUserProfile: async () => {
    try {
      const { userService } = await import('../api/apiService');
      const res = await userService.getProfile();
      if (res.data?.success) {
        set({ userProfile: res.data.data });
        return res.data.data;
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    }
  },

  aiTask: {
    taskId: null,
    status: 'idle',
    progress: 0,
    resultUrl: null,
    error: null,
    type: null,
    prompt: null
  },
  userTasks: [],

  fetchUserTasks: async () => {
    set({ isLoadingTasks: true });
    try {
      console.log('[Store] Fetching user AI tasks...');
      const { tripoService } = await import('../api/apiService');
      const res = await tripoService.getUserTasks();
      if (res.data.success) {
        let tasks = res.data.data;
        console.log(`[Store] Successfully fetched ${tasks.length} tasks`);

        const staleTasks = tasks.filter(t => t.status === 'success' && !t.resultUrl);
        if (staleTasks.length > 0 && !get()._staleHealAttempted) {
          set({ _staleHealAttempted: true });
          console.log(`[Store] Attempting one-time heal for ${staleTasks.length} stale task(s)...`);
          const healResults = await Promise.allSettled(
            staleTasks.map(t => tripoService.getTaskStatus(t.id))
          );

          const healedMap = {};
          healResults.forEach((r, i) => {
            if (r.status === 'fulfilled' && r.value?.data?.data) {
              healedMap[staleTasks[i].id] = r.value.data.data;
            }
          });
          tasks = tasks.map(t => healedMap[t.id] ? { ...t, ...healedMap[t.id] } : t);
        }

        set({ userTasks: tasks });
      }
    } catch (err) {
      console.error('[Store] Failed to fetch user tasks:', err);
    } finally {
      set({ isLoadingTasks: false });
    }
  },

  startAiTask: async (type, prompt, imageUrl, options = {}) => {
    set((state) => ({
      aiTask: { ...state.aiTask, status: 'starting', error: null, type, prompt }
    }));
    try {
      const { tripoService } = await import('../api/apiService');
      const res = await tripoService.createTask({ type, prompt, imageUrl, options });
      const data = res.data.data;

      set((state) => ({
        aiTask: { ...state.aiTask, taskId: data.id, status: data.status }
      }));

      get().addObject({
        id: 'ai-temp-hologram',
        name: 'AI Generating...',
        type: 'ai-hologram',
        position: [0, 0, 0],
        scale: [1, 1, 1],
        metadata: { taskId: data.id }
      });

      return data.id;
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Failed to start AI task';
      set((state) => ({
        aiTask: { ...state.aiTask, status: 'failed', error: errorMsg }
      }));
      throw err;
    }
  },

  pollAiTask: async () => {
    const { aiTask } = get();
    if (!aiTask.taskId || (aiTask.status !== 'queued' && aiTask.status !== 'running')) return;

    try {
      const { tripoService } = await import('../api/apiService');
      const res = await tripoService.getTaskStatus(aiTask.taskId);
      const data = res.data.data;

      set((state) => ({
        aiTask: {
          ...state.aiTask,
          status: data.status,
          progress: data.progress,
          resultUrl: data.status === 'success' ? data.resultUrl : state.aiTask.resultUrl
        }
      }));

      if (data.status === 'success' || data.status === 'failed') {
        const objects = get().objects.filter(o => o.id !== 'ai-temp-hologram');
        set({ objects });
        get().fetchUserProfile();
        get().fetchUserTasks();
      }
    } catch (err) {
      set((state) => ({
        aiTask: { ...state.aiTask, error: err.message || 'Error polling task status' }
      }));
    }
  },

  resetAiTask: () => set({
    aiTask: {
      taskId: null,
      status: 'idle',
      progress: 0,
      resultUrl: null,
      error: null,
      type: null,
      prompt: null
    }
  }),

  setUserProfile: (profile) => set({ userProfile: profile })
}));

let saveTimeout;
let aiPollInterval;

useStore.subscribe((state, prevState) => {

  if (state.objects !== prevState.objects && state.projectId) {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      state.saveProject();
    }, 1500);
  }

  const isPollingNeeded = state.aiTask.taskId && (state.aiTask.status === 'queued' || state.aiTask.status === 'running');
  const wasPollingNeeded = prevState.aiTask.taskId && (prevState.aiTask.status === 'queued' || prevState.aiTask.status === 'running');

  if (isPollingNeeded && !aiPollInterval) {
    aiPollInterval = setInterval(() => {
      useStore.getState().pollAiTask();
    }, 3000);
  } else if (!isPollingNeeded && aiPollInterval) {
    clearInterval(aiPollInterval);
    aiPollInterval = null;
  }
});

export default useStore;
