/**
 * Drop a resolved GLB/STL URL onto the react-planner floor (Layout Library → Plan).
 */

import {
  ReactPlannerActions,
  ReactPlannerClasses,
  createNoviraIntegratedCatalog,
  noviraCatalogElementName,
} from 'react-planner';
import {
  mergePlannerCatalogSources,
  normalizePersistedPlannerCatalogModels,
  plannerNoviraModelCatalogEntriesFromPlannerState,
  sceneObjectsToPlannerCatalogEntries,
  stableIdFromUrl,
} from './plannerSceneCatalog';
import { getProxyModelUrl } from './proxyModelUrl';

const CATALOG_MODELS_KEY = 'novira_planner_catalog_models_v1';

function loadPersistedPlannerModels() {
  try {
    const raw = localStorage.getItem(CATALOG_MODELS_KEY);
    if (!raw) return [];
    const { entries } = normalizePersistedPlannerCatalogModels(JSON.parse(raw));
    return entries;
  } catch {
    return [];
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

function itemId(item) {
  if (item && typeof item.get === 'function') return item.get('id');
  return item?.id;
}

/**
 * @param {import('redux').Store} reduxStore — root Map store (singleton from PlannerStudio)
 * @param {{ modelUrl: string, name?: string, sceneObjects?: unknown[] }} params
 * @returns {{ ok: boolean, error?: string }}
 */
export function addResolvedModelToFloorPlan(reduxStore, { modelUrl, name, sceneObjects }) {
  if (!reduxStore || typeof reduxStore.getState !== 'function' || typeof reduxStore.dispatch !== 'function') {
    return { ok: false, error: 'no_store' };
  }
  const u = String(modelUrl || '').trim();
  if (!u) return { ok: false, error: 'no_url' };

  let plannerState = reduxStore.getState().get('react-planner');
  const typeName = noviraCatalogElementName({ id: stableIdFromUrl(u), url: u });

  if (!plannerState.hasIn(['catalog', 'elements', typeName])) {
    const planLinked = plannerNoviraModelCatalogEntriesFromPlannerState(plannerState);
    const mergedRaw = mergePlannerCatalogSources(
      sceneObjectsToPlannerCatalogEntries(sceneObjects || []),
      loadPersistedPlannerModels(),
      [
        ...planLinked,
        {
          id: stableIdFromUrl(u),
          name: (name && String(name).trim()) || 'Model',
          url: u,
          source: 'Library',
          fromScene: false,
        },
      ]
    );
    const catalog = createNoviraIntegratedCatalog(applyProxyToEntries(mergedRaw));
    reduxStore.dispatch(ReactPlannerActions.projectActions.initCatalog(catalog));
    plannerState = reduxStore.getState().get('react-planner');
  }

  const scene = plannerState.get('scene');
  const layers = scene.get('layers');
  if (!layers || layers.size === 0) {
    return { ok: false, error: 'no_layer' };
  }
  const layerID = scene.get('selectedLayer') || layers.keySeq().first();

  const { Item } = ReactPlannerClasses;
  const mx = plannerState.getIn(['mouse', 'x']);
  const my = plannerState.getIn(['mouse', 'y']);
  const x = typeof mx === 'number' && !Number.isNaN(mx) ? mx : 200;
  const y = typeof my === 'number' && !Number.isNaN(my) ? my : -200;

  const { updatedState, item } = Item.create(plannerState, layerID, typeName, x, y, 200, 100, 0);
  const itemID = itemId(item);
  let next = Item.setJsProperties(updatedState, layerID, itemID, { modelUrl: u }).updatedState;
  if (name && String(name).trim()) {
    next = Item.setJsAttributes(next, layerID, itemID, { name: String(name).trim() }).updatedState;
  }

  reduxStore.dispatch(ReactPlannerActions.projectActions.replaceNoviraPlannerState(next));
  return { ok: true };
}
