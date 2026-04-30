import { useThree, useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import useStore from '../../store/useStore';

/**
 * Feeds the bottom status bar with ground-plane cursor position (XZ) and a zoom heuristic
 * (Live Home–style “quick zoom %” readout).
 */
export default function ViewportStatusRig({ orbitRef }) {
  const { camera, gl } = useThree();
  const lastZoom = useRef(null);
  const lastG = useRef([null, null]);
  const tick = useRef(0);

  useFrame(() => {
    tick.current += 1;
    if (tick.current % 2 !== 0) return;
    if (useStore.getState().viewportNavMode === 'walk') {
      const dist = Math.max(0.35, camera.position.length() * 0.35);
      const zoomPct = Math.round((11.5 / dist) * 100);
      if (lastZoom.current === null || Math.abs(zoomPct - lastZoom.current) > 2) {
        lastZoom.current = zoomPct;
        useStore.getState().setViewportHudZoomPct(zoomPct);
      }
      return;
    }
    const oc = orbitRef?.current;
    if (!oc || !oc.target) return;
    const dist = camera.position.distanceTo(oc.target);
    const zoomPct = Math.round((11.5 / Math.max(0.35, dist)) * 100);
    if (lastZoom.current === null || Math.abs(zoomPct - lastZoom.current) > 2) {
      lastZoom.current = zoomPct;
      useStore.getState().setViewportHudZoomPct(zoomPct);
    }
  });

  useEffect(() => {
    const el = gl.domElement;
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const pt = new THREE.Vector3();

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(plane, pt)) {
        const x = pt.x;
        const z = pt.z;
        if (
          lastG.current[0] === null ||
          Math.abs(x - lastG.current[0]) > 0.02 ||
          Math.abs(z - lastG.current[1]) > 0.02
        ) {
          lastG.current = [x, z];
          useStore.getState().setViewportHudGroundXZ([x, z]);
        }
      }
    };

    el.addEventListener('pointermove', onMove);
    return () => el.removeEventListener('pointermove', onMove);
  }, [gl, camera]);

  return null;
}
