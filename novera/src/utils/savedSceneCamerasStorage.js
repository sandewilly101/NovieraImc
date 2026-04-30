const PREFIX = 'novira_saved_scene_cameras_v1_';
const MAX = 16;

function storageKey(projectId) {
  return `${PREFIX}${projectId}`;
}

/**
 * @param {string} projectId
 * @returns {Array<{ id: string, name: string, position: number[], target: number[] }>}
 */
export function loadSavedSceneCameras(projectId) {
  if (!projectId) return [];
  try {
    const raw = localStorage.getItem(storageKey(projectId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (x) =>
          x &&
          typeof x.id === 'string' &&
          typeof x.name === 'string' &&
          Array.isArray(x.position) &&
          x.position.length === 3 &&
          Array.isArray(x.target) &&
          x.target.length === 3
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

/**
 * @param {string} projectId
 * @param {Array<{ id: string, name: string, position: number[], target: number[] }>} list
 */
export function saveSavedSceneCameras(projectId, list) {
  if (!projectId) return;
  try {
    const next = (list || []).slice(0, MAX);
    localStorage.setItem(storageKey(projectId), JSON.stringify(next));
  } catch {
    /* quota */
  }
}

export { MAX as SAVED_SCENE_CAMERAS_MAX };
