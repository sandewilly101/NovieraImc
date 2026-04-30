/**
 * Build react-planner catalog entries from Novira scene objects + planner-only extras.
 * Scene models (gltf / Sketchfab / STL) appear in the floor-plan library by URL (deduped).
 */

import useStore from '../store/useStore';

const MODEL_TYPES = new Set(['gltf', 'gltf-part', 'stl', 'sketchfab']);

function normalizeUrl(url) {
  return String(url || '').trim();
}

/** Browser-loadable model URLs for the floor-plan GLTF preview (skip junk that always fails). */
export function isPlausiblePlannerModelUrl(url) {
  const u = normalizeUrl(url);
  if (!u) return false;
  const lower = u.toLowerCase();
  if (lower === 'undefined' || lower === 'null' || lower === 'about:blank') return false;
  if (/^https?:\/\//i.test(u)) return true;
  if (u.startsWith('blob:')) return true;
  if (u.startsWith('/')) return true;
  return false;
}

function inferNameFromUrl(url) {
  try {
    const u = url.split('?')[0];
    const base = u.split('/').pop() || 'Model';
    return decodeURIComponent(base).replace(/\.(glb|gltf|stl)$/i, '') || 'Model';
  } catch {
    return 'Model';
  }
}

/** FNV-1a → short stable id for catalog element names (`novira-model-${stableIdFromUrl(url)}` in react-planner). */
export function stableIdFromUrl(url) {
  let h = 2166136261;
  const s = String(url);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return `scene-${(h >>> 0).toString(36)}`;
}

/**
 * One entry per unique model URL currently used in the 3D scene.
 * @param {Array<object>} objects - useStore().objects
 * @returns {Array<{ id: string, name: string, url: string, source: string, thumbnail?: string, fromScene: boolean }>}
 */
export function sceneObjectsToPlannerCatalogEntries(objects) {
  if (!objects?.length) return [];
  const byUrl = new Map();
  for (const o of objects) {
    if (!MODEL_TYPES.has(o.type)) continue;
    const rawUrl = o.url || o.originalModelUrl;
    const url = normalizeUrl(rawUrl);
    if (!url || !isPlausiblePlannerModelUrl(url)) continue;
    if (byUrl.has(url)) continue;
    byUrl.set(url, {
      id: stableIdFromUrl(url),
      name: (o.name && String(o.name).trim()) || inferNameFromUrl(url),
      url,
      source: 'Scene',
      thumbnail: o.thumbnail || o.previewUrl || undefined,
      fromScene: true,
    });
  }
  return [...byUrl.values()];
}

function propString(props, key) {
  if (!props || typeof props.get !== 'function') return '';
  const v = props.get(key);
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v.toJS === 'function') {
    const j = v.toJS();
    if (typeof j === 'string') return j;
  }
  return String(v);
}

/**
 * URLs referenced by floor-plan items (`type` novira-model-*) so the integrated catalog always
 * matches autosaved items even when those GLBs are no longer in the 3D scene.
 * @param {import('immutable').Map} plannerState - `state.get('react-planner')`
 */
export function plannerNoviraModelCatalogEntriesFromPlannerState(plannerState) {
  if (!plannerState || typeof plannerState.get !== 'function') return [];
  const scene = plannerState.get('scene');
  if (!scene) return [];
  const layers = scene.get('layers');
  if (!layers || typeof layers.forEach !== 'function') return [];

  const byUrl = new Map();

  layers.forEach((layer) => {
    const items = layer.get('items');
    if (!items || typeof items.forEach !== 'function') return;

    items.forEach((item) => {
      const type = item.get('type');
      if (!type || !String(type).startsWith('novira-model-')) return;
      const props = item.get('properties');
      const url = normalizeUrl(propString(props, 'modelUrl'));
      if (!url || !isPlausiblePlannerModelUrl(url) || byUrl.has(url)) return;
      const name =
        (item.get('name') && String(item.get('name')).trim()) || inferNameFromUrl(url);
      byUrl.set(url, {
        id: stableIdFromUrl(url),
        name,
        url,
        source: 'Floor plan',
        fromScene: false,
      });
    });
  });

  return [...byUrl.values()];
}

/**
 * Rewrite saved catalog rows in localStorage: URL-canonical `id` (matches `novira-model-*` on the plan),
 * drop duplicate URLs, keep only http(s) URLs (same rule as persist).
 * @param {unknown} raw — JSON.parse result
 * @returns {{ entries: Array<object>, changed: boolean }}
 */
export function normalizePersistedPlannerCatalogModels(raw) {
  if (!Array.isArray(raw)) return { entries: [], changed: false };

  const byUrl = new Map();
  let sawDuplicate = false;

  for (const e of raw) {
    if (!e || typeof e !== 'object') continue;
    const u = normalizeUrl(e.url);
    if (!u || !/^https?:/i.test(u)) continue;
    if (byUrl.has(u)) {
      sawDuplicate = true;
      continue;
    }
    const id = stableIdFromUrl(u);
    const name =
      e.name != null && String(e.name).trim() ? String(e.name).trim() : inferNameFromUrl(u);
    const source =
      e.source != null && String(e.source).trim() ? String(e.source).trim() : 'Saved';
    byUrl.set(u, {
      ...e,
      id,
      url: u,
      name,
      source,
      thumbnail: e.thumbnail || e.previewUrl || undefined,
    });
  }

  const entries = [...byUrl.values()];
  let changed = sawDuplicate;

  if (!changed) {
    const prevHttps = raw.filter(
      (e) =>
        e &&
        typeof e === 'object' &&
        normalizeUrl(e.url) &&
        /^https?:/i.test(normalizeUrl(e.url))
    );
    if (prevHttps.length !== entries.length) {
      changed = true;
    } else {
      for (const e of prevHttps) {
        const u = normalizeUrl(e.url);
        if (String(e.id) !== stableIdFromUrl(u)) {
          changed = true;
          break;
        }
      }
    }
  }

  return { entries, changed };
}

/**
 * Scene URLs first, then planner-saved URLs, then session blobs. Later lists skip URLs already seen.
 */
export function mergePlannerCatalogSources(sceneEntries, persistedPlanner, sessionPlanner) {
  const seen = new Set();
  const out = [];

  const push = (e, fromSceneFlag) => {
    if (!e || !e.url) return;
    const u = normalizeUrl(e.url);
    if (!u || !isPlausiblePlannerModelUrl(u) || seen.has(u)) return;
    seen.add(u);
    // react-planner uses `entry.id` for `novira-model-${id}`; keep it URL-derived so plan items match
    // even when the same URL was saved under a random UUID in localStorage.
    out.push({
      ...e,
      id: stableIdFromUrl(u),
      url: u,
      fromScene: fromSceneFlag ?? !!e.fromScene,
    });
  };

  for (const e of sceneEntries || []) push(e, true);
  for (const e of persistedPlanner || []) push({ ...e, fromScene: false }, false);
  for (const e of sessionPlanner || []) push({ ...e, fromScene: false }, false);

  return out;
}

/** @deprecated Prefer requestOpenAssetLibrary() — kept for external integrations. */
export const OPEN_LIBRARY_EVENT = 'novira:open-library';

/** Opens the global asset library (Sketchfab, Poly Haven, …). Expands the left sidebar when on the 3D workspace. */
export function requestOpenAssetLibrary(options = {}) {
  if (typeof window === 'undefined') return;
  useStore.getState().openAssetLibrary({ expandSidebar: true, ...options });
}
