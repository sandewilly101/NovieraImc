import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../../store/useStore';

/**
 * Live Home–style material drop: click mesh in 3D while paint mode is on to apply PBR sample to object.
 */
export default function MaterialPaintBridge() {
  const { camera, gl, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const ndc = useMemo(() => new THREE.Vector2(), []);

  useEffect(() => {
    const el = gl.domElement;

    const onPointerDown = (e) => {
      const st = useStore.getState();
      if (!st.materialPaintMode) return;
      if (e.button !== 0) return;

      const r = el.getBoundingClientRect();
      ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(scene.children, true);
      const hit = hits.find((h) => h.object?.userData?.noviraObjectId);
      if (!hit) return;
      const id = hit.object.userData.noviraObjectId;
      const sample = st.materialPaintSample || {};
      st.updateObject(id, {
        color: sample.color || '#c4a574',
        roughness: typeof sample.roughness === 'number' ? sample.roughness : 0.45,
        metalness: typeof sample.metalness === 'number' ? sample.metalness : 0.08,
      }, true);
    };

    el.addEventListener('pointerdown', onPointerDown);
    return () => el.removeEventListener('pointerdown', onPointerDown);
  }, [camera, gl, scene, raycaster, ndc]);

  return null;
}
