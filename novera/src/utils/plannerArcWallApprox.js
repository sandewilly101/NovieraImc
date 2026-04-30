import { ReactPlannerClasses } from 'react-planner';

/**
 * Insert `segments` straight wall pieces along a circular arc (planner XY, units ≈ cm).
 * Uses the same wall `type` / `properties` as the first existing wall on the layer.
 */
export function computeInsertArcWallSegmentsState(plannerState, layerId, opts = {}) {
  if (!plannerState || !layerId) return { ok: false, reason: 'bad_args' };

  const cx = Number(opts.cx);
  const cy = Number(opts.cy);
  const radiusCm = Number(opts.radiusCm ?? opts.r ?? 200);
  const startDeg = Number(opts.startDeg ?? 0);
  const sweepDeg = Number(opts.sweepDeg ?? 90);
  let segments = Math.round(Number(opts.segments ?? 14));

  if (![cx, cy, radiusCm, startDeg, sweepDeg].every(Number.isFinite)) {
    return { ok: false, reason: 'invalid_numbers' };
  }

  const r = Math.max(5, radiusCm);
  segments = Math.max(4, Math.min(64, segments || 14));

  const lines = plannerState.getIn(['scene', 'layers', layerId, 'lines']);
  const sampleLine = lines && typeof lines.first === 'function' && lines.size > 0 ? lines.first() : null;
  const lineType = sampleLine?.get?.('type') || 'wall';
  const lineProps = sampleLine?.get?.('properties');

  const sweep = (sweepDeg * Math.PI) / 180;
  const start = (startDeg * Math.PI) / 180;

  let state = plannerState;
  for (let i = 0; i < segments; i += 1) {
    const t0 = start + (sweep * i) / segments;
    const t1 = start + (sweep * (i + 1)) / segments;
    const x0 = cx + r * Math.cos(t0);
    const y0 = cy + r * Math.sin(t0);
    const x1 = cx + r * Math.cos(t1);
    const y1 = cy + r * Math.sin(t1);
    const { updatedState } = ReactPlannerClasses.Line.create(
      state,
      layerId,
      lineType,
      x0,
      y0,
      x1,
      y1,
      lineProps
    );
    state = updatedState;
  }

  const withAreas = ReactPlannerClasses.Layer.detectAndUpdateAreas(state, layerId).updatedState;
  return { ok: true, state: withAreas, segments };
}
