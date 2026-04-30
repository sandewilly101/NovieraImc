import React, { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { MapControls } from '@react-three/drei';
import * as THREE from 'three';
import SceneContent from './SceneContent';
import useStore from '../../store/useStore';

const FACE_CAMERA = {
  south: { position: [0, 4, 22], target: [0, 2.2, 0] },
  north: { position: [0, 4, -22], target: [0, 2.2, 0] },
  east: { position: [22, 4, 0], target: [0, 2.2, 0] },
  west: { position: [-22, 4, 0], target: [0, 2.2, 0] },
};

/**
 * Orthographic elevation slice; camera direction is a persisted cardinal (store).
 */
export default function ElevationOrthoPanel() {
  const elevationOrthoFace = useStore((s) => s.elevationOrthoFace);
  const setElevationOrthoFace = useStore((s) => s.setElevationOrthoFace);

  const { position, target } = FACE_CAMERA[elevationOrthoFace] || FACE_CAMERA.south;
  const targetVec = useMemo(() => new THREE.Vector3(target[0], target[1], target[2]), [target[0], target[1], target[2]]);

  return (
    <div className="studio-elevation-ortho" style={{ height: 240, minHeight: 180, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
      <div
        style={{
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#94a3b8' }}>
          Elevation · orthographic
        </span>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }} role="group" aria-label="Elevation direction">
          {['south', 'north', 'east', 'west'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setElevationOrthoFace(f)}
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '3px 8px',
                borderRadius: 6,
                border: `1px solid ${elevationOrthoFace === f ? 'rgba(56,189,248,0.65)' : 'rgba(255,255,255,0.12)'}`,
                background: elevationOrthoFace === f ? 'rgba(14,165,233,0.2)' : 'rgba(0,0,0,0.25)',
                color: elevationOrthoFace === f ? '#e0f2fe' : '#94a3b8',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: 'calc(100% - 36px)', minHeight: 140 }}>
        <Canvas
          key={elevationOrthoFace}
          orthographic
          shadows
          gl={{ antialias: true, alpha: false, toneMapping: THREE.NoToneMapping }}
          camera={{
            position,
            zoom: 34,
            near: 0.1,
            far: 500,
          }}
          onCreated={({ camera }) => {
            camera.lookAt(targetVec);
            camera.updateProjectionMatrix();
          }}
        >
          <color attach="background" args={['#0f172a']} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[-4, 10, 2]} intensity={0.9} castShadow shadow-mapSize={[1024, 1024]} />
          <Suspense fallback={null}>
            <SceneContent />
          </Suspense>
          <MapControls
            makeDefault
            screenSpacePanning
            enableRotate={false}
            maxPolarAngle={Math.PI / 2}
            minPolarAngle={Math.PI / 2}
            target={targetVec}
          />
        </Canvas>
      </div>
    </div>
  );
}
