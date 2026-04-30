import { ReactPlannerClasses } from 'react-planner';

/**
 * If the wall graph has two nearly-touching endpoints (degree-1 vertices), add one closing wall segment.
 * Planner coordinates match react-planner demo (cm-scale vertices).
 */
export function computeSnapCloseWallState(plannerState, layerId, options = {}) {
  const maxGap = typeof options.maxGap === 'number' ? options.maxGap : 75;
  if (!plannerState || !layerId) return { ok: false, reason: 'bad_args' };

  const vertices = plannerState.getIn(['scene', 'layers', layerId, 'vertices']);
  const lines = plannerState.getIn(['scene', 'layers', layerId, 'lines']);
  if (!vertices || !lines || lines.size === 0) return { ok: false, reason: 'no_lines' };

  const sampleLine = lines.first();
  const lineType = sampleLine?.get?.('type') || 'wall';
  const lineProps = sampleLine?.get?.('properties');

  const degree = new Map();
  lines.forEach((line) => {
    const a = line.getIn(['vertices', 0]);
    const b = line.getIn(['vertices', 1]);
    degree.set(a, (degree.get(a) || 0) + 1);
    degree.set(b, (degree.get(b) || 0) + 1);
  });

  const endpoints = [];
  vertices.forEach((v, vid) => {
    if ((degree.get(vid) || 0) === 1) {
      endpoints.push({
        id: vid,
        x: typeof v.get === 'function' ? v.get('x') : v.x,
        y: typeof v.get === 'function' ? v.get('y') : v.y,
      });
    }
  });

  if (endpoints.length < 2) return { ok: false, reason: 'no_two_endpoints' };

  const hasLineBetween = (idA, idB) => {
    let hit = false;
    lines.forEach((line) => {
      const a = line.getIn(['vertices', 0]);
      const b = line.getIn(['vertices', 1]);
      if ((a === idA && b === idB) || (a === idB && b === idA)) hit = true;
    });
    return hit;
  };

  let best = null;
  for (let i = 0; i < endpoints.length; i++) {
    for (let j = i + 1; j < endpoints.length; j++) {
      const p = endpoints[i];
      const q = endpoints[j];
      const d = Math.hypot(p.x - q.x, p.y - q.y);
      if (d > maxGap) continue;
      if (hasLineBetween(p.id, q.id)) continue;
      if (!best || d < best.d) best = { p, q, d };
    }
  }

  if (!best) return { ok: false, reason: 'no_close_pair' };

  const { updatedState } = ReactPlannerClasses.Line.create(
    plannerState,
    layerId,
    lineType,
    best.p.x,
    best.p.y,
    best.q.x,
    best.q.y,
    lineProps
  );

  const withAreas = ReactPlannerClasses.Layer.detectAndUpdateAreas(updatedState, layerId).updatedState;
  return { ok: true, state: withAreas, gapCm: best.d };
}
