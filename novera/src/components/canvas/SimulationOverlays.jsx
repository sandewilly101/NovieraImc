/**
 * Event-visualization overlays (lux-like heatmap, SPL-like rings, crowd path).
 * Heuristic GPU previews only — not lab-grade photometry, acoustics, or CFD crowd simulation.
 */
import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';

function useFloorY() {
  const objects = useStore((s) => s.objects);
  return useMemo(() => {
    const g = objects.find((o) => o.type === 'ground');
    if (!g) return 0;
    return g.position[1] + ((g.dimensions?.[1] || 1) * (g.scale?.[1] || 1)) / 2;
  }, [objects]);
}

function LuxHeatmap({ visible }) {
  const objects = useStore((s) => s.objects);
  const floorY = useFloorY();

  const geom = useMemo(() => {
    const segs = 36;
    const g = new THREE.PlaneGeometry(48, 48, segs, segs);
    g.rotateX(-Math.PI / 2);
    const pos = g.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const lights = objects.filter((o) => o.type === 'light');
    const ambient = 0.15;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = floorY + 0.04;
      const p = new THREE.Vector3(x, y, z);
      let e = ambient;

      for (const L of lights) {
        const lp = new THREE.Vector3(...(L.position || [0, 3, 0]));
        const li = L.intensity ?? 1;
        const lc = new THREE.Color(L.color || '#ffffff');
        const lum = 0.2126 * lc.r + 0.7152 * lc.g + 0.0722 * lc.b;

        if (L.lightType === 'directional') {
          const dir = new THREE.Vector3(0.4, -1, 0.25).normalize();
          const ndotl = Math.max(0, new THREE.Vector3(0, 1, 0).dot(dir.clone().negate()));
          e += li * lum * ndotl * 0.4;
        } else if (L.lightType === 'point' || L.lightType === 'spot') {
          const dist = p.distanceTo(lp);
          const dmax = L.distance ?? 20;
          if (dist < dmax) {
            const att = (1 - dist / dmax) ** 2;
            e += li * lum * att * 0.35;
          }
        } else if (L.lightType === 'hemisphere') {
          e += li * lum * 0.12;
        }
      }

      const heat = Math.min(1, e / 2.5);
      const c = new THREE.Color().setHSL(0.58 - heat * 0.45, 0.85, 0.35 + heat * 0.35);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  }, [objects, floorY]);

  if (!visible) return null;

  return (
    <mesh geometry={geom} position={[0, floorY + 0.04, 0]} renderOrder={500}>
      <meshBasicMaterial vertexColors transparent opacity={0.55} depthWrite={false} />
    </mesh>
  );
}

function SoundCones({ visible }) {
  const objects = useStore((s) => s.objects);
  const items = useMemo(
    () =>
      objects.filter(
        (o) =>
          o.noviraSpeaker ||
          (o.type === 'light' && (o.lightType === 'spot' || o.lightType === 'point'))
      ),
    [objects]
  );

  if (!visible) return null;

  return (
    <group>
      {items.map((o) => {
        const pos = o.position || [0, 2, 0];
        const rot = o.rotation || [0, 0, 0];
        const range = o.noviraSpeaker?.range ?? o.distance ?? 12;
        const arcDeg = o.noviraSpeaker?.arcDeg ?? (o.lightType === 'spot' ? (o.angle ?? Math.PI / 6) * (180 / Math.PI) * 2 : 360);
        const radius = Math.tan(((arcDeg / 2) * Math.PI) / 180) * range;
        const isOmni = arcDeg >= 350;
        return (
          <group key={o.id} position={pos} rotation={rot}>
            {isOmni ? (
              <mesh>
                <sphereGeometry args={[range * 0.35, 24, 24]} />
                <meshBasicMaterial color="#22d3ee" wireframe transparent opacity={0.12} depthWrite={false} />
              </mesh>
            ) : (
              <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -range / 2, 0]}>
                <coneGeometry args={[Math.max(0.05, radius), range, 32, 1, true]} />
                <meshBasicMaterial color="#22d3ee" transparent opacity={0.14} side={THREE.DoubleSide} depthWrite={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}

const FLOW_PATH = [
  new THREE.Vector3(-14, 0, 10),
  new THREE.Vector3(-4, 0, 4),
  new THREE.Vector3(4, 0, 0),
  new THREE.Vector3(10, 0, -6),
  new THREE.Vector3(2, 0, -12),
];

function CrowdFlow({ visible }) {
  const floorY = useFloorY();
  const lineRef = useRef();

  const { geom, tip, quat } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(FLOW_PATH);
    curve.curveType = 'catmullrom';
    const pts = curve.getPoints(80);
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    g.computeLineDistances();
    const t1 = curve.getPoint(1);
    const t0 = curve.getPoint(0.97);
    const dir = t1.clone().sub(t0).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(up, dir);
    return { geom: g, tip: t1, quat: q };
  }, []);

  useFrame(({ clock }) => {
    if (!visible || !lineRef.current?.material) return;
    lineRef.current.material.dashOffset = clock.getElapsedTime() * 0.35;
  });

  if (!visible) return null;

  return (
    <group position={[0, floorY + 0.06, 0]}>
      <line ref={lineRef} geometry={geom}>
        <lineDashedMaterial
          color="#f97316"
          dashSize={0.45}
          gapSize={0.28}
          transparent
          opacity={0.9}
        />
      </line>
      <mesh position={[tip.x, tip.y, tip.z]} quaternion={quat}>
        <coneGeometry args={[0.15, 0.4, 8]} />
        <meshBasicMaterial color="#fb923c" transparent opacity={0.95} />
      </mesh>
    </group>
  );
}

export default function SimulationOverlays() {
  const { luxPreviewVisible, soundCoverageVisible, crowdFlowVisible } = useStore(
    useShallow((s) => ({
      luxPreviewVisible: s.luxPreviewVisible,
      soundCoverageVisible: s.soundCoverageVisible,
      crowdFlowVisible: s.crowdFlowVisible,
    }))
  );

  if (!luxPreviewVisible && !soundCoverageVisible && !crowdFlowVisible) return null;

  return (
    <>
      <LuxHeatmap visible={luxPreviewVisible} />
      <SoundCones visible={soundCoverageVisible} />
      <CrowdFlow visible={crowdFlowVisible} />
    </>
  );
}
