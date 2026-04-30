import React from 'react';
import { useSelector } from 'react-redux';
import useStore from '../../store/useStore';
import { formatDesignLength, designUnitLabel } from '../../utils/designUnits';

function lineLengthM(layer, lineId) {
  const line = layer.getIn(['lines', lineId]);
  if (!line) return null;
  const vIds = line.get('vertices');
  if (!vIds || vIds.size < 2) return null;
  const v0 = layer.getIn(['vertices', vIds.get(0)]);
  const v1 = layer.getIn(['vertices', vIds.get(1)]);
  if (!v0 || !v1) return null;
  const x0 = Number(v0.get('x'));
  const y0 = Number(v0.get('y'));
  const x1 = Number(v1.get('x'));
  const y1 = Number(v1.get('y'));
  if (![x0, y0, x1, y1].every(Number.isFinite)) return null;
  return Math.hypot(x1 - x0, y1 - y0) / 100;
}

/**
 * Dimension readout for selected planner wall segment(s). Vertices ≈ cm → meters for display.
 */
export default function PlannerSelectionDimensions() {
  const designUnits = useStore((s) => s.designUnits);

  const summary = useSelector((state) => {
    const scene = state.getIn(['react-planner', 'scene']);
    if (!scene) return null;
    const layerId = scene.get('selectedLayer');
    if (!layerId) return null;
    const layer = scene.getIn(['layers', layerId]);
    if (!layer) return null;
    const lineIds = layer.getIn(['selected', 'lines']);
    if (!lineIds || lineIds.size === 0) return null;

    let totalM = 0;
    let n = 0;
    lineIds.forEach((lineId) => {
      const m = lineLengthM(layer, lineId);
      if (m != null && Number.isFinite(m)) {
        totalM += m;
        n += 1;
      }
    });
    if (n === 0) return null;
    return { totalM, n };
  });

  if (!summary || !Number.isFinite(summary.totalM)) return null;

  const { totalM, n } = summary;

  return (
    <div className="planner-dimension-readout" role="status" aria-live="polite">
      <span className="planner-dimension-readout__label">
        {n > 1 ? `${n} wall segments` : 'Wall segment'}
      </span>
      <span className="planner-dimension-readout__value">
        {n > 1 ? <>Σ {formatDesignLength(totalM, designUnits)}</> : formatDesignLength(totalM, designUnits)}
      </span>
      <span className="planner-dimension-readout__unit">({designUnitLabel(designUnits)})</span>
    </div>
  );
}
