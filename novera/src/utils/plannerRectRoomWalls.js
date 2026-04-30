import { ReactPlannerClasses } from 'react-planner';

/**
 * Insert four axis-aligned walls forming a closed rectangle (planner XY, units ≈ cm).
 * Same wall `type` / `properties` as the first existing wall on the layer (defaults to `wall`).
 */
export function computeInsertRectangleRoomWallsState(plannerState, layerId, opts = {}) {
  if (!plannerState || !layerId) return { ok: false, reason: 'bad_args' };

  const x0 = Number(opts.x ?? opts.minX);
  const y0 = Number(opts.y ?? opts.minY);
  const widthCm = Number(opts.widthCm ?? opts.w);
  const heightCm = Number(opts.heightCm ?? opts.h);

  if (![x0, y0, widthCm, heightCm].every(Number.isFinite)) {
    return { ok: false, reason: 'invalid_numbers' };
  }

  const w = Math.max(40, widthCm);
  const h = Math.max(40, heightCm);

  const x1 = x0 + w;
  const y1 = y0 + h;

  const lines = plannerState.getIn(['scene', 'layers', layerId, 'lines']);
  const sampleLine = lines && typeof lines.first === 'function' && lines.size > 0 ? lines.first() : null;
  const lineType = sampleLine?.get?.('type') || 'wall';
  const lineProps = sampleLine?.get?.('properties');

  const edges = [
    [x0, y0, x1, y0],
    [x1, y0, x1, y1],
    [x1, y1, x0, y1],
    [x0, y1, x0, y0],
  ];

  let state = plannerState;
  for (let i = 0; i < edges.length; i += 1) {
    const [ax, ay, bx, by] = edges[i];
    const { updatedState } = ReactPlannerClasses.Line.create(state, layerId, lineType, ax, ay, bx, by, lineProps);
    state = updatedState;
  }

  const withAreas = ReactPlannerClasses.Layer.detectAndUpdateAreas(state, layerId).updatedState;
  return { ok: true, state: withAreas, segments: 4, widthCm: w, heightCm: h };
}
