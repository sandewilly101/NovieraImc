import React, { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import useStore from '../../store/useStore';
import * as THREE from 'three';

const SNAP_THRESHOLD = 0.25;
const GUIDE_COLOR = '#3b82f6';
const GUIDE_OPACITY = 0.6;

export default function SnapGuides() {
  const selectedId = useStore(s => s.selectedId);
  const objects = useStore(s => s.objects);
  const isTransformDragging = useStore(s => s.isTransformDragging);
  const objectSnapEnabled = useStore((s) => s.objectSnapEnabled !== false);

  const guides = useMemo(() => {
    if (!objectSnapEnabled || !selectedId || !isTransformDragging) return [];

    const selected = objects.find(o => o.id === selectedId);
    if (!selected || selected.type === 'ground') return [];

    const sp = selected.position || [0, 0, 0];
    const others = objects.filter(o => o.id !== selectedId && o.type !== 'ground');
    const result = [];

    for (const other of others) {
      const op = other.position || [0, 0, 0];
      const dx = Math.abs(sp[0] - op[0]);
      const dy = Math.abs(sp[1] - op[1]);
      const dz = Math.abs(sp[2] - op[2]);

      if (dx < SNAP_THRESHOLD) {
        result.push({
          axis: 'x', value: op[0],
          from: [op[0], Math.min(sp[1], op[1]) - 0.5, Math.min(sp[2], op[2])],
          to: [op[0], Math.max(sp[1], op[1]) + 0.5, Math.max(sp[2], op[2])],
          vertical: true,
        });
      }
      if (dz < SNAP_THRESHOLD) {
        result.push({
          axis: 'z', value: op[2],
          from: [Math.min(sp[0], op[0]) - 0.5, sp[1], op[2]],
          to: [Math.max(sp[0], op[0]) + 0.5, sp[1], op[2]],
          vertical: false,
        });
      }
      if (dy < SNAP_THRESHOLD) {
        result.push({
          axis: 'y', value: op[1],
          from: [Math.min(sp[0], op[0]) - 0.5, op[1], sp[2]],
          to: [Math.max(sp[0], op[0]) + 0.5, op[1], sp[2]],
          vertical: false,
        });
      }
    }

    return result;
  }, [objectSnapEnabled, selectedId, objects, isTransformDragging]);

  if (guides.length === 0) return null;

  return (
    <group>
      {guides.map((g, i) => {
        const pts = [new THREE.Vector3(...g.from), new THREE.Vector3(...g.to)];
        const geometry = new THREE.BufferGeometry().setFromPoints(pts);
        return (
          <line key={i} geometry={geometry}>
            <lineBasicMaterial
              color={g.axis === 'x' ? '#ef4444' : g.axis === 'y' ? '#22c55e' : '#3b82f6'}
              transparent
              opacity={GUIDE_OPACITY}
              linewidth={1}
              depthTest={false}
            />
          </line>
        );
      })}
    </group>
  );
}
