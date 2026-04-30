/**
 * Bridge (A): sync react-planner floor data into the main Novira Zustand scene.
 * - GLB catalog items (novira-model-*) → gltf objects
 * - Walls → thin box primitives with CSG subtract modifiers targeting invisible hole volumes
 * - Doors / windows (holes on walls) → invisible box primitives (cutter data for boolean ops)
 * - Removes 3D objects whose plannerBridgeKey no longer exists on the plan (deletes sync through).
 */

import { showToast } from './noviraToast';

const WALL_COLOR = '#94a3b8';

function holePlaceholderColor(holeType) {
  const t = String(holeType || '').toLowerCase();
  if (t.includes('door')) return '#60a5fa';
  if (t.includes('window')) return '#38bdf8';
  if (t.includes('gate')) return '#fbbf24';
  return '#a8b2c4';
}

function toNum(v, fb = 0) {
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : fb;
}

function lengthMeasureCm(prop) {
  if (prop == null || prop === '') return 0;
  if (typeof prop === 'number') return prop;
  if (typeof prop.get === 'function') return toNum(prop.get('length'), 0);
  if (typeof prop === 'object' && prop.length != null) return toNum(prop.length, 0);
  return 0;
}

function lengthFromItemProps(props, key) {
  if (!props) return 0;
  if (typeof props.getIn === 'function') {
    const v = props.getIn([key, 'length']);
    if (v != null) return toNum(v, 0);
  }
  return lengthMeasureCm(typeof props.get === 'function' ? props.get(key) : null);
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
 * Planner catalog may store an already-proxied URL; the 3D viewer applies its own proxy.
 * Unwrap to the real remote URL so we never double-wrap and so AutoRecover can re-fetch.
 */
function canonicalModelUrlForStore(raw) {
  const u = String(raw || '').trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) return u;
  try {
    const parsed = new URL(u);
    if (parsed.searchParams.has('url')) {
      const p = parsed.pathname;
      if (p.includes('proxy-model') || p.includes('asset-store')) {
        const inner = parsed.searchParams.get('url');
        if (inner) return decodeURIComponent(inner);
      }
    }
  } catch {
    /* ignore */
  }
  return u;
}

function findObjectIdByBridgeKey(objects, bridgeKey) {
  const o = objects.find((x) => x.meta?.plannerBridgeKey === bridgeKey);
  return o?.id || null;
}

const SCENE_MODEL_TYPES = new Set(['gltf', 'gltf-part', 'stl', 'sketchfab']);

function sameCanonicalModelUrl(a, b) {
  if (!a || !b) return false;
  return canonicalModelUrlForStore(String(a)) === canonicalModelUrlForStore(String(b));
}

/**
 * When the plan only has `modelUrl`, reuse Sketchfab / Poly Haven identity from an existing
 * scene object with the same canonical URL so `AutoRecoverModel` can re-download instead of Expired.
 */
function pickSceneModelMetadataForUrl(objects, targetUrl) {
  const canon = canonicalModelUrlForStore(String(targetUrl || ''));
  if (!canon) return {};
  for (const o of objects) {
    if (!o || !SCENE_MODEL_TYPES.has(o.type)) continue;
    const urls = [o.url, o.originalModelUrl].filter(Boolean);
    if (!urls.some((u) => sameCanonicalModelUrl(u, canon))) continue;
    const out = {};
    if (o.source === 'sketchfab' && o.sourceAssetId) {
      out.source = 'sketchfab';
      out.sourceAssetId = o.sourceAssetId;
    }
    if (o.source === 'polyhaven' && o.originalModelUrl) {
      out.source = 'polyhaven';
      if (o.gltfIncludes) out.gltfIncludes = o.gltfIncludes;
    }
    return out;
  }
  return {};
}

/**
 * @param {import('immutable').Map} plannerState
 * @returns {Array<{ kind: 'gltf', bridgeKey: string, name: string, url: string, originalModelUrl?: string, position: [number,number,number], rotation: [number,number,number], scale: [number,number,number] }>}
 */
export function extractNoviraModelPlacementsFromPlanner(plannerState) {
  if (!plannerState || typeof plannerState.get !== 'function') return [];
  const scene = plannerState.get('scene');
  if (!scene) return [];
  const layers = scene.get('layers');
  if (!layers || typeof layers.forEach !== 'function') return [];

  const out = [];

  layers.forEach((layer, layerId) => {
    const layerAltCm = lengthMeasureCm(layer.get('altitude'));
    const items = layer.get('items');
    if (!items || typeof items.forEach !== 'function') return;

    items.forEach((item) => {
      const type = item.get('type');
      if (!type || !String(type).startsWith('novira-model-')) return;

      const props = item.get('properties');
      const rawUrl = propString(props, 'modelUrl');
      const url = canonicalModelUrlForStore(rawUrl);
      if (!url) return;
      const originalModelUrl = /^https?:\/\//i.test(url) ? url : undefined;

      const itemId = item.get('id') || '';
      const bridgeKey = `${String(layerId)}::${String(itemId)}`;

      const xCm = toNum(item.get('x'), 0);
      const yCm = toNum(item.get('y'), 0);
      const rotDeg = toNum(item.get('rotation'), 0);

      const altCm = lengthFromItemProps(props, 'altitude');
      const xm = xCm / 100;
      const zm = -yCm / 100;
      const ym = (layerAltCm + altCm) / 100;

      const name = (item.get('name') && String(item.get('name')).trim()) || 'Floor plan model';

      out.push({
        kind: 'gltf',
        bridgeKey,
        name,
        url,
        originalModelUrl,
        position: [xm, ym, zm],
        rotation: [0, (rotDeg * Math.PI) / 180, 0],
        scale: [1, 1, 1],
      });
    });
  });

  return out;
}

/**
 * @param {import('immutable').Map} plannerState
 * @returns {Array<{ kind: 'wall', bridgeKey: string, name: string, position: [number,number,number], rotation: [number,number,number], dimensions: [number,number,number] }>}
 */
export function extractWallSegmentsFromPlanner(plannerState) {
  if (!plannerState || typeof plannerState.get !== 'function') return [];
  const scene = plannerState.get('scene');
  if (!scene) return [];
  const layers = scene.get('layers');
  if (!layers || typeof layers.forEach !== 'function') return [];

  const out = [];

  layers.forEach((layer, layerId) => {
    const layerAltCm = lengthMeasureCm(layer.get('altitude'));
    const layerAltM = layerAltCm / 100;
    const lines = layer.get('lines');
    const vertices = layer.get('vertices');
    if (!lines || typeof lines.forEach !== 'function' || !vertices) return;

    lines.forEach((line, lineId) => {
      if (line.get('type') !== 'wall') return;
      const vIds = line.get('vertices');
      if (!vIds || vIds.size < 2) return;
      const v0 = vertices.get(vIds.get(0));
      const v1 = vertices.get(vIds.get(1));
      if (!v0 || !v1) return;

      const x1 = toNum(v0.get('x'), 0);
      const y1 = toNum(v0.get('y'), 0);
      const x2 = toNum(v1.get('x'), 0);
      const y2 = toNum(v1.get('y'), 0);

      const dxM = (x2 - x1) / 100;
      const dzM = -(y2 - y1) / 100;
      let lengthM = Math.sqrt(dxM * dxM + dzM * dzM);
      if (lengthM < 0.02) lengthM = 0.02;

      const props = line.get('properties');
      const heightCm = lengthFromItemProps(props, 'height') || 300;
      const thickCm = lengthFromItemProps(props, 'thickness') || 20;
      const heightM = heightCm / 100;
      const thickM = Math.max(0.01, thickCm / 100);

      const cx = ((x1 + x2) / 2) / 100;
      const cz = (-(y1 + y2) / 2) / 100;
      const theta = Math.atan2(dzM, dxM);

      const bridgeKey = `${String(layerId)}::line::${String(lineId)}`;

      out.push({
        kind: 'wall',
        bridgeKey,
        name: `Wall ${String(lineId).slice(0, 8)}`,
        position: [cx, layerAltM, cz],
        rotation: [0, theta, 0],
        dimensions: [lengthM, heightM, thickM],
      });
    });
  });

  return out;
}

/**
 * Doors / windows / gates on wall lines → thin boxes aligned with the host wall.
 * @param {import('immutable').Map} plannerState
 * @returns {Array<{ kind: 'hole', bridgeKey: string, lineBridgeKey: string, holeType: string, name: string, color: string, position: [number,number,number], rotation: [number,number,number], dimensions: [number,number,number] }>}
 */
export function extractHoleOpeningsFromPlanner(plannerState) {
  if (!plannerState || typeof plannerState.get !== 'function') return [];
  const scene = plannerState.get('scene');
  if (!scene) return [];
  const layers = scene.get('layers');
  if (!layers || typeof layers.forEach !== 'function') return [];

  const out = [];

  layers.forEach((layer, layerId) => {
    const layerAltCm = lengthMeasureCm(layer.get('altitude'));
    const layerAltM = layerAltCm / 100;
    const holes = layer.get('holes');
    const lines = layer.get('lines');
    const vertices = layer.get('vertices');
    if (!holes || typeof holes.forEach !== 'function' || !lines || !vertices) return;

    holes.forEach((hole, holeId) => {
      const lineId = hole.get('line');
      const line = lineId ? lines.get(lineId) : null;
      if (!line || line.get('type') !== 'wall') return;

      const vIds = line.get('vertices');
      if (!vIds || vIds.size < 2) return;
      const v0 = vertices.get(vIds.get(0));
      const v1 = vertices.get(vIds.get(1));
      if (!v0 || !v1) return;

      const xa = toNum(v0.get('x'), 0);
      const ya = toNum(v0.get('y'), 0);
      const xb = toNum(v1.get('x'), 0);
      const yb = toNum(v1.get('y'), 0);
      const dx = xb - xa;
      const dy = yb - ya;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const offset = toNum(hole.get('offset'), 0);
      const hx = xa + dx * offset;
      const hy = ya + dy * offset;

      const dxM = dx / 100;
      const dzM = -dy / 100;
      const theta = Math.atan2(dzM, dxM);

      const hProps = hole.get('properties');
      const widthCm = lengthFromItemProps(hProps, 'width') || 90;
      const heightCm = lengthFromItemProps(hProps, 'height') || 210;
      const thickCm = lengthFromItemProps(hProps, 'thickness') || 30;
      const holeAltCm = lengthFromItemProps(hProps, 'altitude') || 0;

      const lProps = line.get('properties');
      const wallThickCm = lengthFromItemProps(lProps, 'thickness') || 20;

      const widthM = Math.max(0.05, widthCm / 100);
      const heightM = Math.max(0.05, heightCm / 100);
      const depthM = Math.max(0.12, (Math.max(thickCm, wallThickCm) / 100) * 1.25);

      const cx = hx / 100;
      const cz = -hy / 100;
      const posY = layerAltM + holeAltCm / 100;

      const holeType = hole.get('type') || 'opening';
      const bridgeKey = `${String(layerId)}::hole::${String(holeId)}`;
      const lineBridgeKey = `${String(layerId)}::line::${String(lineId)}`;
      const name = (hole.get('name') && String(hole.get('name')).trim()) || String(holeType);

      out.push({
        kind: 'hole',
        bridgeKey,
        lineBridgeKey,
        holeType: String(holeType),
        name,
        color: holePlaceholderColor(holeType),
        position: [cx, posY, cz],
        rotation: [0, theta, 0],
        dimensions: [widthM, heightM, depthM],
      });
    });
  });

  return out;
}

export function extractNoviraModelPlacementsFromReduxRoot(reduxRoot) {
  if (!reduxRoot || typeof reduxRoot.get !== 'function') return [];
  const plannerState = reduxRoot.get('react-planner');
  return extractNoviraModelPlacementsFromPlanner(plannerState);
}

function collectBridgeSpecs(plannerState) {
  const walls = extractWallSegmentsFromPlanner(plannerState);
  const holes = extractHoleOpeningsFromPlanner(plannerState);
  const models = extractNoviraModelPlacementsFromPlanner(plannerState);
  return { walls, holes, models, specs: [...walls, ...holes, ...models] };
}

/**
 * @param {ReturnType<typeof extractHoleOpeningsFromPlanner>} holes
 * @param {ReturnType<typeof extractWallSegmentsFromPlanner>} walls
 */
function applyWallHoleSubtractModifiers(storeApi, walls, holes) {
  const { updateObject } = storeApi.getState();
  const holeIdsByLine = new Map();

  for (const h of holes) {
    const objects = storeApi.getState().objects;
    const hid = findObjectIdByBridgeKey(objects, h.bridgeKey);
    if (!hid) continue;
    const lk = h.lineBridgeKey;
    if (!holeIdsByLine.has(lk)) holeIdsByLine.set(lk, []);
    holeIdsByLine.get(lk).push(hid);
  }

  for (const w of walls) {
    const objects = storeApi.getState().objects;
    const wid = findObjectIdByBridgeKey(objects, w.bridgeKey);
    if (!wid) continue;
    const cutters = holeIdsByLine.get(w.bridgeKey) || [];
    updateObject(wid, {
      modifiers: cutters.map((targetId) => ({ type: 'subtract', targetId })),
    });
  }
}

/**
 * Sync planner walls, holes, and GLB items into the Novira scene; drop stale bridged objects.
 * @param {{ quiet?: boolean }} [options] — if `quiet`, skip toasts (e.g. auto-sync when leaving the plan tab).
 * @returns {{ added: number, updated: number, removed: number, skipped: number }}
 */
export function syncPlannerBridgeToNoviraScene(storeApi, reduxStore, options = {}) {
  const quiet = !!options.quiet;
  const { addObject, updateObject, removeObject } = storeApi.getState();
  const root = reduxStore.getState();
  const plannerState = root.get('react-planner');
  const { walls, holes, specs } = collectBridgeSpecs(plannerState);
  const desiredKeys = new Set(specs.map((s) => s.bridgeKey));

  let removed = 0;
  const isBridgedFromPlanner = (o) => {
    if (!o.meta?.plannerBridgeKey) return false;
    if (o.meta?.plannerBridge?.source === 'react-planner') return true;
    return /^.+::(line|hole)::/.test(String(o.meta.plannerBridgeKey));
  };

  const staleIds = storeApi
    .getState()
    .objects.filter((o) => isBridgedFromPlanner(o) && !desiredKeys.has(o.meta.plannerBridgeKey))
    .map((o) => o.id);

  staleIds.forEach((id) => {
    removeObject(id);
    removed += 1;
  });

  if (!specs.length) {
    applyWallHoleSubtractModifiers(storeApi, walls, holes);
    if (!quiet) {
      if (removed) {
        showToast(`Floor plan → 3D: removed ${removed} linked object${removed === 1 ? '' : 's'} no longer on the plan.`, 'ok');
      } else {
        showToast('Nothing to sync — floor plan has no walls, openings, or Novira library models.', 'info');
      }
    }
    return { added: 0, updated: 0, removed, skipped: 0 };
  }

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const spec of specs) {
    const objects = storeApi.getState().objects;
    const existingId = findObjectIdByBridgeKey(objects, spec.bridgeKey);

    if (spec.kind === 'wall') {
      if (existingId) {
        updateObject(existingId, {
          type: 'primitive',
          geo: 'box',
          name: spec.name,
          color: WALL_COLOR,
          dimensions: spec.dimensions,
          position: spec.position,
          rotation: spec.rotation,
          meta: {
            plannerBridgeKey: spec.bridgeKey,
            plannerBridge: { version: 2, kind: 'wall', source: 'react-planner' },
          },
        });
        updated += 1;
      } else {
        addObject(
          {
            type: 'primitive',
            geo: 'box',
            name: spec.name,
            color: WALL_COLOR,
            dimensions: spec.dimensions,
            rotation: spec.rotation,
            meta: {
              plannerBridgeKey: spec.bridgeKey,
              plannerBridge: { version: 2, kind: 'wall', source: 'react-planner' },
            },
          },
          spec.position
        );
        added += 1;
      }
      continue;
    }

    if (spec.kind === 'hole') {
      if (existingId) {
        updateObject(existingId, {
          type: 'primitive',
          geo: 'box',
          name: spec.name,
          color: '#64748b',
          visible: false,
          locked: true,
          dimensions: spec.dimensions,
          position: spec.position,
          rotation: spec.rotation,
          meta: {
            plannerBridgeKey: spec.bridgeKey,
            plannerBridge: { version: 4, kind: 'hole', holeType: spec.holeType, source: 'react-planner' },
          },
        });
        updated += 1;
      } else {
        addObject(
          {
            type: 'primitive',
            geo: 'box',
            name: spec.name,
            color: '#64748b',
            visible: false,
            locked: true,
            dimensions: spec.dimensions,
            rotation: spec.rotation,
            meta: {
              plannerBridgeKey: spec.bridgeKey,
              plannerBridge: { version: 4, kind: 'hole', holeType: spec.holeType, source: 'react-planner' },
            },
          },
          spec.position
        );
        added += 1;
      }
      continue;
    }

    if (spec.kind === 'gltf') {
      const fromScene = pickSceneModelMetadataForUrl(storeApi.getState().objects, spec.url);
      const gltfPayload = {
        type: 'gltf',
        name: spec.name,
        url: spec.url,
        originalModelUrl: spec.originalModelUrl,
        rotation: spec.rotation,
        scale: spec.scale,
        ...fromScene,
        meta: {
          plannerBridgeKey: spec.bridgeKey,
          plannerBridge: { version: 2, kind: 'gltf', source: 'react-planner' },
        },
      };
      if (existingId) {
        updateObject(existingId, {
          ...gltfPayload,
          position: spec.position,
        });
        updated += 1;
      } else {
        addObject(gltfPayload, spec.position);
        added += 1;
      }
    } else {
      skipped += 1;
    }
  }

  applyWallHoleSubtractModifiers(storeApi, walls, holes);

  const parts = [];
  if (added) parts.push(`${added} added`);
  if (updated) parts.push(`${updated} updated`);
  if (removed) parts.push(`${removed} removed`);
  if (!quiet) {
    if (parts.length) {
      showToast(`Floor plan → 3D: ${parts.join(', ')}.`, 'ok');
    } else {
      showToast('Nothing changed in the 3D scene.', 'info');
    }
  }

  return { added, updated, removed, skipped };
}

/** @deprecated Use syncPlannerBridgeToNoviraScene — kept for imports */
export function pushPlannerNoviraModelsToScene(storeApi, reduxStore, options) {
  return syncPlannerBridgeToNoviraScene(storeApi, reduxStore, options);
}
