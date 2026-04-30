/**
 * Map react-planner Viewer2D / react-svg-pan-zoom pointer position into react-planner
 * scene XY (same units as walls — treated as cm in Novira).
 * Mirrors {@link https://github.com/cvdlab/react-planner} Viewer2D `mapCursorPosition`.
 *
 * @param {{ x: number, y: number }} viewerEvent
 * @param {number | undefined} sceneHeight - `state.scene.height` from planner Redux
 * @returns {{ x: number, y: number }}
 */
export function plannerViewerEventToSceneCm(viewerEvent, sceneHeight) {
  const h = typeof sceneHeight === 'number' && Number.isFinite(sceneHeight) ? sceneHeight : 0;
  return {
    x: viewerEvent.x,
    y: -viewerEvent.y + h,
  };
}
