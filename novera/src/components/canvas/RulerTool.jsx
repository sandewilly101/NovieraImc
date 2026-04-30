import React, { useState, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import useStore from '../../store/useStore';

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

export default function RulerTool() {
  const activeTool = useStore(s => s.activeTool);
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [measuring, setMeasuring] = useState(false);
  const { camera, gl } = useThree();

  if (activeTool !== 'ruler') return null;

  const getWorldPos = (e) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const target = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, target);
    return target;
  };

  const handlePointerDown = (e) => {
    if (e.button !== 0) return;
    const pos = getWorldPos(e);
    if (!pos) return;
    setStart([pos.x, pos.y, pos.z]);
    setEnd([pos.x, pos.y, pos.z]);
    setMeasuring(true);
  };

  const handlePointerMove = (e) => {
    if (!measuring) return;
    const pos = getWorldPos(e);
    if (pos) setEnd([pos.x, pos.y, pos.z]);
  };

  const handlePointerUp = () => {
    setMeasuring(false);
  };

  if (!start || !end) return null;

  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const mid = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + 0.3, (start[2] + end[2]) / 2];

  const points = [new THREE.Vector3(...start), new THREE.Vector3(...end)];
  const geometry = new THREE.BufferGeometry().setFromPoints(points);

  return (
    <group>
      <line geometry={geometry}>
        <lineBasicMaterial color="#f59e0b" linewidth={2} depthTest={false} />
      </line>

      <mesh position={start}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>
      <mesh position={end}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshBasicMaterial color="#f59e0b" />
      </mesh>

      {dist > 0.01 && (
        <Html position={mid} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(15,23,42,0.9)', color: '#fbbf24',
            padding: '3px 8px', borderRadius: 4, fontSize: 10,
            fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
            whiteSpace: 'nowrap', border: '1px solid rgba(251,191,36,0.3)',
          }}>
            {(dist * 100).toFixed(1)} cm
          </div>
        </Html>
      )}
    </group>
  );
}
