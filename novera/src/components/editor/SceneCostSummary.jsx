import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { estimateSceneCost } from '../../utils/costEstimator';

export default function SceneCostSummary() {
  const objects = useStore(useShallow((s) => s.objects));

  const { total, currency } = useMemo(() => estimateSceneCost(objects), [objects]);

  if (!objects?.length) return null;

  return (
    <div className="studio-cost-chip scene-cost-summary">
      <div className="scene-cost-summary__label">Instant estimate</div>
      <div className="scene-cost-summary__amount">
        {currency} ${total.toLocaleString(undefined, { maximumFractionDigits: 0 })}
      </div>
      <div className="scene-cost-summary__note">
        LED · truss · carpet · print · labor (indicative)
      </div>
    </div>
  );
}
