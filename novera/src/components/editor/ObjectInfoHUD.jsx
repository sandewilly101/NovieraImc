import React, { useMemo } from 'react';
import useStore from '../../store/useStore';
import { estimateObjectCost, estimateSceneCost } from '../../utils/costEstimator';

const VERTEX_COUNTS = {
  box: 24, sphere: 2048, cylinder: 128, cone: 64, torus: 2048, plane: 4,
  dodecahedron: 60, icosahedron: 60, octahedron: 24, tetrahedron: 12,
  torusKnot: 12288, capsule: 512, circle: 33, ring: 128, lathe: 512,
};

export default function ObjectInfoHUD() {
  const selectedId = useStore(s => s.selectedId);
  const objects = useStore(s => s.objects);

  const obj = useMemo(() => objects.find(o => o.id === selectedId), [objects, selectedId]);

  if (!obj || obj.type === 'ground') return null;

  const dims = obj.dimensions || [1, 1, 1];
  const scale = obj.scale || [1, 1, 1];
  const w = Math.abs(dims[0] * scale[0] * 100).toFixed(1);
  const h = Math.abs(dims[1] * scale[1] * 100).toFixed(1);
  const d = Math.abs(dims[2] * scale[2] * 100).toFixed(1);
  const verts = obj.type === 'gltf' ? '—' : (VERTEX_COUNTS[obj.geo] || '?');
  const { subtotal: estCost } = estimateObjectCost(obj);
  const { total: sceneTotal, currency } = useMemo(() => estimateSceneCost(objects), [objects]);

  return (
    <div className="object-info-hud">
      <div className="object-info-hud__head">
        <div className="object-info-hud__title">{obj.name || obj.geo || obj.type}</div>
        <span className="object-info-hud__type">{obj.type}</span>
      </div>
      <div className="object-info-hud__dims">
        <span className="object-info-hud__dims-label">Size</span>
        <span className="object-info-hud__dims-value">{w} × {h} × {d} cm</span>
      </div>
      {obj.type === 'primitive' && (
        <div className="object-info-hud__row">
          <span>Vertices</span>
          <span className="object-info-hud__muted-strong">{verts}</span>
        </div>
      )}
      <div className="object-info-hud__costs">
        {estCost > 0 && (
          <div className="object-info-hud__cost">
            <span>Item</span>
            <span>${estCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        )}
        <div className="object-info-hud__cost object-info-hud__cost--scene">
          <span>Scene</span>
          <span>{currency} ${sceneTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>
      </div>
    </div>
  );
}
