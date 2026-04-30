/**
 * Locked floor-plan trace image (per project + building story), localStorage.
 * Coordinates are react-planner scene units (same as walls — cm in Novira).
 */

export function plannerTraceStorageKey(projectId, storyId) {
  const pid = projectId || 'draft';
  const sid = storyId || 'floor1';
  return `novira_planner_trace_v1_${pid}_${sid}`;
}

/**
 * @typedef {{ src: string, opacity: number, x: number, y: number, width: number, height: number }} PlannerTracePayload
 */

/** @returns {PlannerTracePayload | null} */
export function loadPlannerTraceImage(projectId, storyId) {
  try {
    const raw = localStorage.getItem(plannerTraceStorageKey(projectId, storyId));
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || typeof o.src !== 'string' || !o.src.startsWith('data:')) return null;
    const opacity = typeof o.opacity === 'number' && Number.isFinite(o.opacity) ? Math.max(0.05, Math.min(1, o.opacity)) : 0.45;
    const x = Number(o.x);
    const y = Number(o.y);
    const width = Number(o.width);
    const height = Number(o.height);
    if (![x, y, width, height].every((v) => Number.isFinite(v)) || width <= 0 || height <= 0) return null;
    return { src: o.src, opacity, x, y, width, height };
  } catch {
    return null;
  }
}

/** @param {PlannerTracePayload | null} payload */
export function savePlannerTraceImage(projectId, storyId, payload) {
  const key = plannerTraceStorageKey(projectId, storyId);
  try {
    if (!payload) {
      localStorage.removeItem(key);
      return;
    }
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota */
  }
}
