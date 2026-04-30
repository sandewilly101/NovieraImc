/**
 * Singleton react-planner Redux store so Layout Library / Scene can dispatch while the Plan tab is unmounted.
 * On first `ensurePlannerReduxStore`, the same autosave bootstrap as the ReactPlanner plugin runs immediately
 * so the first dispatch (e.g. + Plan) never races an empty store against a later `loadProject`.
 */

import { Map } from 'immutable';
import { createStore } from 'redux';
import { Models, reducer as PlannerReducer, ReactPlannerClasses, ReactPlannerActions } from 'react-planner';
import { bootstrapPlannerReduxFromLocalStorage } from './plannerSanitizeScene';
import { computeSnapCloseWallState } from './plannerSnapCloseWall';
import { computeInsertArcWallSegmentsState } from './plannerArcWallApprox';
import { computeInsertRectangleRoomWallsState } from './plannerRectRoomWalls';

/** Re-runs react-planner inner-cycle detection so closed wall loops become room areas. */
export const NOVIRA_REFRESH_PLANNER_AREAS = 'NOVIRA_REFRESH_PLANNER_AREAS';

/** Adds a closing wall between two nearby open endpoints, then refreshes room areas. */
export const NOVIRA_SNAP_CLOSE_WALL_GAP = 'NOVIRA_SNAP_CLOSE_WALL_GAP';

/** Chains short wall segments along a circular arc (native-style arc approximation). */
export const NOVIRA_ADD_ARC_WALL_SEGMENTS = 'NOVIRA_ADD_ARC_WALL_SEGMENTS';

/** Four walls forming a closed rectangle (quick room shell). */
export const NOVIRA_ADD_RECT_ROOM_WALLS = 'NOVIRA_ADD_RECT_ROOM_WALLS';

const rootReducer = (state, action) => {
  const next = state || Map({ 'react-planner': new Models.State() });
  if (action && action.type === NOVIRA_REFRESH_PLANNER_AREAS) {
    return next.update('react-planner', (plannerState) => {
      const layerId = plannerState.getIn(['scene', 'selectedLayer']);
      if (!layerId) return plannerState;
      try {
        return ReactPlannerClasses.Layer.detectAndUpdateAreas(plannerState, layerId).updatedState;
      } catch (e) {
        console.warn('[Novira] detectAndUpdateAreas failed', e);
        return plannerState;
      }
    });
  }
  if (action && action.type === NOVIRA_SNAP_CLOSE_WALL_GAP) {
    return next.update('react-planner', (plannerState) => {
      const layerId = plannerState.getIn(['scene', 'selectedLayer']);
      if (!layerId) return plannerState;
      try {
        const res = computeSnapCloseWallState(plannerState, layerId, action.payload || {});
        return res.ok ? res.state : plannerState;
      } catch (e) {
        console.warn('[Novira] snap close wall failed', e);
        return plannerState;
      }
    });
  }
  if (action && action.type === NOVIRA_ADD_ARC_WALL_SEGMENTS) {
    return next.update('react-planner', (plannerState) => {
      const layerId = plannerState.getIn(['scene', 'selectedLayer']);
      if (!layerId) return plannerState;
      try {
        const res = computeInsertArcWallSegmentsState(plannerState, layerId, action.payload || {});
        return res.ok ? res.state : plannerState;
      } catch (e) {
        console.warn('[Novira] arc wall segments failed', e);
        return plannerState;
      }
    });
  }
  if (action && action.type === NOVIRA_ADD_RECT_ROOM_WALLS) {
    return next.update('react-planner', (plannerState) => {
      const layerId = plannerState.getIn(['scene', 'selectedLayer']);
      if (!layerId) return plannerState;
      try {
        const res = computeInsertRectangleRoomWallsState(plannerState, layerId, action.payload || {});
        return res.ok ? res.state : plannerState;
      } catch (e) {
        console.warn('[Novira] rect room walls failed', e);
        return plannerState;
      }
    });
  }
  return next.update('react-planner', (plannerState) => PlannerReducer(plannerState, action));
};

let singleton = null;

export function ensurePlannerReduxStore(enhancer) {
  if (singleton) return singleton;
  singleton = createStore(
    rootReducer,
    undefined,
    typeof enhancer === 'function' ? enhancer : undefined
  );
  bootstrapPlannerReduxFromLocalStorage(singleton);
  return singleton;
}

export function getPlannerReduxStore() {
  return singleton;
}

function layerAreaCount(plannerState, layerId) {
  if (!plannerState || !layerId) return 0;
  const areas = plannerState.getIn(['scene', 'layers', layerId, 'areas']);
  return areas && typeof areas.size === 'number' ? areas.size : 0;
}

/**
 * Rebuilds floor "room" polygons from the current wall graph (closed loops → areas).
 * @returns {{ ok: boolean, areaCount?: number, reason?: string }}
 */
export function dispatchRefreshPlannerRoomZones() {
  const store = getPlannerReduxStore();
  if (!store) return { ok: false, reason: 'no_store' };
  const ps = store.getState().get('react-planner');
  const layerId = ps?.getIn(['scene', 'selectedLayer']);
  if (!layerId) return { ok: false, reason: 'no_layer' };
  const before = layerAreaCount(ps, layerId);
  store.dispatch({ type: NOVIRA_REFRESH_PLANNER_AREAS });
  const afterPs = store.getState().get('react-planner');
  const after = layerAreaCount(afterPs, layerId);
  return { ok: true, areaCount: after, before, delta: after - before };
}

/**
 * Snap-close: add one wall between two degree-1 vertices closer than `maxGap` (planner units ≈ cm).
 */
export function dispatchPlannerSnapCloseWallGap(payload = {}) {
  const store = getPlannerReduxStore();
  if (!store) return { ok: false, reason: 'no_store' };
  const ps = store.getState().get('react-planner');
  const layerId = ps?.getIn(['scene', 'selectedLayer']);
  if (!layerId) return { ok: false, reason: 'no_layer' };
  const preview = computeSnapCloseWallState(ps, layerId, payload);
  if (!preview.ok) return preview;
  store.dispatch({ type: NOVIRA_SNAP_CLOSE_WALL_GAP, payload });
  return { ok: true, gapCm: preview.gapCm };
}

/**
 * Insert arc as chained wall segments (cm space).
 */
export function dispatchPlannerInsertArcWalls(payload = {}) {
  const store = getPlannerReduxStore();
  if (!store) return { ok: false, reason: 'no_store' };
  const ps = store.getState().get('react-planner');
  const layerId = ps?.getIn(['scene', 'selectedLayer']);
  if (!layerId) return { ok: false, reason: 'no_layer' };
  const preview = computeInsertArcWallSegmentsState(ps, layerId, payload);
  if (!preview.ok) return preview;
  store.dispatch({ type: NOVIRA_ADD_ARC_WALL_SEGMENTS, payload });
  return { ok: true, segments: preview.segments };
}

/**
 * Insert four walls as a closed axis-aligned rectangle (planner cm).
 * @returns {{ ok: boolean, segments?: number, reason?: string, widthCm?: number, heightCm?: number }}
 */
export function dispatchPlannerInsertRectRoomWalls(payload = {}) {
  const store = getPlannerReduxStore();
  if (!store) return { ok: false, reason: 'no_store' };
  const ps = store.getState().get('react-planner');
  const layerId = ps?.getIn(['scene', 'selectedLayer']);
  if (!layerId) return { ok: false, reason: 'no_layer' };
  const preview = computeInsertRectangleRoomWallsState(ps, layerId, payload);
  if (!preview.ok) return preview;
  store.dispatch({ type: NOVIRA_ADD_RECT_ROOM_WALLS, payload });
  return { ok: true, segments: preview.segments, widthCm: preview.widthCm, heightCm: preview.heightCm };
}

/**
 * Activate react-planner opening draw mode for catalog hole type (e.g. door, window, sash-window).
 * User then clicks a wall segment on the plan.
 */
export function dispatchPlannerSelectDrawingHole(holeType) {
  const store = getPlannerReduxStore();
  if (!store) return { ok: false, reason: 'no_store' };
  const ps = store.getState().get('react-planner');
  const layerId = ps?.getIn(['scene', 'selectedLayer']);
  if (!layerId) return { ok: false, reason: 'no_layer' };
  const t = String(holeType || '').trim();
  if (!t) return { ok: false, reason: 'no_type' };
  store.dispatch(ReactPlannerActions.holesActions.selectToolDrawingHole(t));
  return { ok: true, holeType: t };
}

/** Wall / opening / room counts on the selected planner layer (for technical export). */
export function getPlannerLayerSummary() {
  const store = getPlannerReduxStore();
  if (!store) return null;
  const ps = store.getState().get('react-planner');
  if (!ps || typeof ps.getIn !== 'function') return null;
  const layerId = ps.getIn(['scene', 'selectedLayer']);
  if (!layerId) return { hasLayer: false };
  const layer = ps.getIn(['scene', 'layers', layerId]);
  if (!layer) return { hasLayer: false };
  const lines = layer.get('lines');
  const holes = layer.get('holes');
  const areas = layer.get('areas');
  return {
    hasLayer: true,
    wallLines: lines && typeof lines.size === 'number' ? lines.size : 0,
    openings: holes && typeof holes.size === 'number' ? holes.size : 0,
    roomAreas: areas && typeof areas.size === 'number' ? areas.size : 0,
  };
}
