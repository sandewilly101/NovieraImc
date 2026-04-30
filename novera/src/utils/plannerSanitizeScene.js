/**
 * Strips planner scene entities that are not in the Novira integrated catalog.
 * Old autosaves used the full react-planner demo catalog (e.g. conditioner, text);
 * the integrated catalog only has structure + holes + novira-model-* items.
 */

import { ReactPlannerActions, createFullDemoCatalog } from 'react-planner';
import { isPlausiblePlannerModelUrl } from './plannerSceneCatalog';

const VALID_LINES = new Set(['wall']);
const VALID_AREAS = new Set(['area']);
const VALID_HOLES = new Set([
  'door-double',
  'door',
  'gate',
  'panic-door-double',
  'panic-door',
  'sash-window',
  'sliding-door',
  'venetian-blind-window',
  'window-curtain',
  'window',
]);

function filterMapByType(map, validSet) {
  if (!map || typeof map !== 'object') return map;
  const next = {};
  for (const [id, el] of Object.entries(map)) {
    const t = el && el.type;
    if (validSet.has(t)) next[id] = el;
  }
  return next;
}

/** Plain `properties.modelUrl` from scene JSON (Immutable `toJS()` shapes vary). */
function extractPlainModelUrl(el) {
  const p = el && el.properties;
  if (!p || typeof p !== 'object') return '';
  const v = p.modelUrl;
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object') {
    if (typeof v.defaultValue === 'string') return v.defaultValue.trim();
    if (typeof v.value === 'string') return v.value.trim();
  }
  return String(v).trim();
}

let _validPlannerItemTypes = null;
function getValidPlannerItemTypes() {
  if (_validPlannerItemTypes) return _validPlannerItemTypes;
  try {
    const cat = createFullDemoCatalog();
    _validPlannerItemTypes = new Set(Object.keys(cat.elements));
  } catch {
    _validPlannerItemTypes = new Set();
  }
  return _validPlannerItemTypes;
}

/** Keep registered catalog item types + novira-model-* GLB rows (full demo catalog integration). */
function filterPlannerItemsMap(itemsMap) {
  if (!itemsMap || typeof itemsMap !== 'object') return itemsMap;
  const validTypes = getValidPlannerItemTypes();
  const next = {};
  for (const [id, el] of Object.entries(itemsMap)) {
    const t = el && el.type;
    if (typeof t !== 'string') continue;
    if (t.startsWith('novira-model-')) {
      const url = extractPlainModelUrl(el);
      if (!url || !isPlausiblePlannerModelUrl(url)) continue;
      next[id] = el;
      continue;
    }
    if (validTypes.has(t)) {
      next[id] = el;
    }
  }
  return next;
}

/**
 * Deep-clone and remove catalog entries that cannot render with createNoviraIntegratedCatalog.
 * @param {object} scene - Plain object from scene.toJS() / localStorage JSON
 * @returns {object}
 */
export function sanitizeNoviraIntegratedPlannerScene(scene) {
  if (!scene || typeof scene !== 'object') return scene;
  const clone = JSON.parse(JSON.stringify(scene));
  const layers = clone.layers;
  if (!layers || typeof layers !== 'object') return clone;

  for (const layerId of Object.keys(layers)) {
    const L = layers[layerId];
    if (!L || typeof L !== 'object') continue;
    if (L.lines) L.lines = filterMapByType(L.lines, VALID_LINES);
    if (L.holes) L.holes = filterMapByType(L.holes, VALID_HOLES);
    if (L.areas) L.areas = filterMapByType(L.areas, VALID_AREAS);
    if (L.items) {
      const prevItems = L.items;
      L.items = filterPlannerItemsMap(L.items);
      if (process.env.NODE_ENV === 'development') {
        const before = Object.keys(prevItems || {}).length;
        const after = Object.keys(L.items || {}).length;
        if (before > after) {
          console.warn(
            `[Novira planner] Sanitize: removed ${before - after} invalid library item(s) from layer ${layerId}.`
          );
        }
      }
    }
  }

  return clone;
}

const DEFAULT_DELAY = 500;
let autosaveTimeout = null;

function readSanitizedScene(key) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  const raw = window.localStorage.getItem(key);
  if (raw == null) return null;
  try {
    return sanitizeNoviraIntegratedPlannerScene(JSON.parse(raw));
  } catch (e) {
    console.warn('[Novira planner] Invalid autosave JSON', key, e);
    return null;
  }
}

/**
 * Like react-planner Autosave, but loads through sanitizeNoviraIntegratedPlannerScene.
 * Migrates from legacyKeys into autosaveKey when the new key is empty.
 */
/**
 * Load sanitized planner scene from localStorage into the root Redux store (singleton).
 * Call once when the editor shell mounts so the Layout Library can add to the plan before the Plan tab is opened.
 */
export function bootstrapPlannerReduxFromLocalStorage(
  rootStore,
  autosaveKey = 'novira_react_planner_v2',
  legacyKeys = ['novira_react_planner_v1']
) {
  if (!rootStore || typeof rootStore.dispatch !== 'function') return;
  const ls = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  if (!autosaveKey || !ls) return;

  let initial = readSanitizedScene(autosaveKey);
  if (!initial && legacyKeys.length) {
    for (const legacy of legacyKeys) {
      const migrated = readSanitizedScene(legacy);
      if (migrated) {
        initial = migrated;
        try {
          ls.setItem(autosaveKey, JSON.stringify(migrated));
          ls.removeItem(legacy);
        } catch (e) {
          console.warn('[Novira planner] Could not migrate planner autosave', e);
        }
        break;
      }
    }
  }

  if (initial) {
    rootStore.dispatch(ReactPlannerActions.projectActions.loadProject(initial));
  }
}

export function createNoviraPlannerAutosavePlugin(autosaveKey, legacyKeys = [], delay = DEFAULT_DELAY) {
  return (store, stateExtractor) => {
    const ls = typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
    if (!autosaveKey || !ls) return;

    bootstrapPlannerReduxFromLocalStorage(store, autosaveKey, legacyKeys);

    store.subscribe(() => {
      if (autosaveTimeout) clearTimeout(autosaveTimeout);
      autosaveTimeout = setTimeout(() => {
        const state = stateExtractor(store.getState());
        try {
          const sceneJs = state.scene.toJS();
          const cleaned = sanitizeNoviraIntegratedPlannerScene(sceneJs);
          ls.setItem(autosaveKey, JSON.stringify(cleaned));
        } catch (e) {
          console.warn('[Novira planner] Autosave failed', e);
        }
      }, delay || DEFAULT_DELAY);
    });
  };
}
