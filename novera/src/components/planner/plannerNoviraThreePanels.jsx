/**
 * Replaces react-planner Viewer3D / Viewer3DFirstPerson with Novira's R3F stack while keeping
 * the same mode + Redux spine. Plan → scene sync runs on mount and when planner scene changes.
 */

import React, { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Grid, OrbitControls, PointerLockControls } from '@react-three/drei';
import { ReactPlannerConstants } from 'react-planner';
import useStore from '../../store/useStore';
import SceneContent from '../canvas/SceneContent';
import { syncPlannerBridgeToNoviraScene } from '../../utils/plannerToNoviraBridge';

const { MODE_3D_VIEW, MODE_3D_FIRST_PERSON } = ReactPlannerConstants;

function PlannerSceneSync({ plannerRootStore }) {
  const lastSceneRef = useRef(null);

  useEffect(() => {
    if (!plannerRootStore) return undefined;
    const run = () => {
      const scene = plannerRootStore.getState().getIn(['react-planner', 'scene']);
      if (scene === lastSceneRef.current) return;
      lastSceneRef.current = scene;
      syncPlannerBridgeToNoviraScene(useStore, plannerRootStore, { quiet: true });
    };
    run();
    return plannerRootStore.subscribe(run);
  }, [plannerRootStore]);

  return null;
}

function PlannerNoviraOrbitInner({ plannerRootStore }) {
  const environmentVisible = useStore((s) => s.environmentVisible);
  const lightingEnabled = useStore((s) => s.lightingEnabled);
  const gridVisible = useStore((s) => s.gridVisible);

  return (
    <>
      <PlannerSceneSync plannerRootStore={plannerRootStore} />
      <color attach="background" args={[environmentVisible ? '#bae6fd' : '#0d1b2a']} />
      <Suspense fallback={null}>
        <Environment preset="studio" />
      </Suspense>
      {!environmentVisible && (
        <>
          <ambientLight intensity={lightingEnabled ? 0.45 : 0.08} />
          <directionalLight castShadow position={[6, 12, 6]} intensity={lightingEnabled ? 1.2 : 0.15} />
        </>
      )}
      {gridVisible && <Grid infiniteGrid fadeDistance={48} sectionColor="#1e40af" cellColor="#3b82f6" />}
      <SceneContent />
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} minPolarAngle={0} maxPolarAngle={Math.PI / 2 + 0.15} />
    </>
  );
}

/** Orbit Novira viewport — same toolbar entry as react-planner 3D, different renderer. */
export function PlannerNoviraOrbitContent({ width, height, plannerRootStore }) {
  return (
    <div className="planner-novira-3d-root" style={{ width, height, display: 'flex', flexDirection: 'column', background: '#020617' }}>
      <div className="planner-novira-3d-banner">
        Novira 3D — synced from the floor plan (walls, openings, catalog models). Use the planner toolbar to return to 2D.
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Canvas
          shadows
          frameloop="demand"
          style={{ width: '100%', height: '100%' }}
          camera={{ position: [10, 10, 10], fov: 45 }}
          gl={{
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.NoToneMapping,
          }}
        >
          <PlannerNoviraOrbitInner plannerRootStore={plannerRootStore} />
        </Canvas>
      </div>
    </div>
  );
}

function PlannerNoviraFPInner({ plannerRootStore }) {
  const { camera, gl } = useThree();
  const keys = useRef({ w: false, a: false, s: false, d: false });
  useEffect(() => {
    camera.position.set(0, 1.6, 0);
  }, [camera]);

  useEffect(() => {
    const onDown = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'a' || k === 's' || k === 'd') keys.current[k] = true;
    };
    const onUp = (e) => {
      const k = e.key.toLowerCase();
      if (k === 'w' || k === 'a' || k === 's' || k === 'd') keys.current[k] = false;
    };
    window.addEventListener('keydown', onDown);
    window.addEventListener('keyup', onUp);
    return () => {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
    };
  }, []);

  useFrame((_, dt) => {
    const speed = 4;
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0;
    if (forward.lengthSq() < 1e-6) return;
    forward.normalize();
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const delta = speed * dt;
    if (keys.current.w) camera.position.addScaledVector(forward, delta);
    if (keys.current.s) camera.position.addScaledVector(forward, -delta);
    if (keys.current.a) camera.position.addScaledVector(right, -delta);
    if (keys.current.d) camera.position.addScaledVector(right, delta);
    camera.position.y = Math.max(0.3, camera.position.y);
  });

  return (
    <>
      <PlannerSceneSync plannerRootStore={plannerRootStore} />
      <color attach="background" args={['#e2e8f0']} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 10, 4]} intensity={0.85} />
      <Suspense fallback={null}>
        <Environment preset="warehouse" />
      </Suspense>
      <Grid infiniteGrid fadeDistance={60} sectionColor="#64748b" cellColor="#94a3b8" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[400, 400]} />
        <meshStandardMaterial color="#cbd5e1" />
      </mesh>
      <SceneContent />
      <PointerLockControls domElement={gl.domElement} makeDefault selector="canvas" />
    </>
  );
}

/** First-person walkthrough using drei (Novira scene), replacing planner Viewer3DFirstPerson. */
export function PlannerNoviraFirstPersonContent({ width, height, plannerRootStore }) {
  return (
    <div className="planner-novira-3d-root" style={{ width, height, display: 'flex', flexDirection: 'column', background: '#020617' }}>
      <div className="planner-novira-3d-banner planner-novira-3d-banner--fp">
        Novira first-person — click the viewport to capture the pointer (Esc to release). Plan geometry is synced from the
        floor plan.
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <Canvas
          shadows
          style={{ width: '100%', height: '100%' }}
          camera={{ position: [0, 1.6, 0], fov: 65 }}
          gl={{
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
            toneMapping: THREE.NoToneMapping,
          }}
        >
          <PlannerNoviraFPInner plannerRootStore={plannerRootStore} />
        </Canvas>
      </div>
    </div>
  );
}

export function buildNoviraPlannerCustomContents(plannerRootStore) {
  return {
    [MODE_3D_VIEW]: function NoviraOrbitWrapper(props) {
      return <PlannerNoviraOrbitContent width={props.width} height={props.height} plannerRootStore={plannerRootStore} />;
    },
    [MODE_3D_FIRST_PERSON]: function NoviraFPWrapper(props) {
      return <PlannerNoviraFirstPersonContent width={props.width} height={props.height} plannerRootStore={plannerRootStore} />;
    },
  };
}
