import { useEffect } from 'react';
import useStore from '../../store/useStore';
import { getPlannerReduxStore } from '../../utils/plannerReduxBridge';
import { plannerViewerEventToSceneCm } from '../../utils/plannerViewerSceneCoords';

/**
 * Pushes react-planner 2D cursor position into the global store for the bottom status bar
 * (Live Home 3D zone 5 — live coordinates on the floor plan).
 */
export default function PlannerCursorHudBridge() {
  useEffect(() => {
    const onMove = (domEvt) => {
      const ve = domEvt?.viewerEvent;
      if (!ve || typeof ve.x !== 'number' || typeof ve.y !== 'number') return;
      const rs = getPlannerReduxStore();
      if (!rs) return;
      const ps = rs.getState().get('react-planner');
      if (!ps) return;
      const sceneH = ps.getIn(['scene', 'height']);
      const { x, y } = plannerViewerEventToSceneCm(ve, sceneH);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;
      useStore.getState().setPlannerHudSceneCm([x, y]);
    };
    document.addEventListener('mousemove-planner-event', onMove);
    return () => {
      document.removeEventListener('mousemove-planner-event', onMove);
      useStore.getState().setPlannerHudSceneCm(null);
    };
  }, []);
  return null;
}
