/**
 * Multi-story floor plans: each building story has its own persisted react-planner scene JSON.
 */
import { ReactPlannerActions } from 'react-planner';
import { sanitizeNoviraIntegratedPlannerScene } from './plannerSanitizeScene';
import { ensurePlannerReduxStore, getPlannerReduxStore } from './plannerReduxBridge';

export function plannerStoryStorageKey(projectId, storyId) {
  const pid = projectId || 'draft';
  const sid = storyId || 'default';
  return `novira_plan_${pid}_${sid}`;
}

export function capturePlannerScenePlain() {
  const store = getPlannerReduxStore();
  if (!store) return null;
  const rp = store.getState().get('react-planner');
  if (!rp || !rp.scene) return null;
  const sceneJs = typeof rp.scene.toJS === 'function' ? rp.scene.toJS() : rp.scene;
  return sanitizeNoviraIntegratedPlannerScene(sceneJs);
}

export function persistPlannerStory(projectId, storyId) {
  const plain = capturePlannerScenePlain();
  if (!plain) return;
  try {
    const key = plannerStoryStorageKey(projectId, storyId);
    window.localStorage.setItem(key, JSON.stringify(plain));
  } catch (e) {
    console.warn('[Novira] Could not persist planner story', e);
  }
}

export function loadPlannerStoryPlain(projectId, storyId) {
  try {
    const raw = window.localStorage.getItem(plannerStoryStorageKey(projectId, storyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeNoviraIntegratedPlannerScene(parsed);
  } catch {
    return null;
  }
}

export function dispatchPlannerLoadOrNew(plainOrNull) {
  const store = ensurePlannerReduxStore();
  if (plainOrNull) {
    store.dispatch(ReactPlannerActions.projectActions.loadProject(plainOrNull));
  } else {
    store.dispatch(ReactPlannerActions.projectActions.newProject());
  }
}

/** Call before switching active story id — saves current canvas to old story key. */
export function switchPlannerStory(projectId, fromStoryId, toStoryId) {
  if (fromStoryId && fromStoryId !== toStoryId) {
    persistPlannerStory(projectId, fromStoryId);
  }
  const next = loadPlannerStoryPlain(projectId, toStoryId);
  dispatchPlannerLoadOrNew(next);
}
