import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import useStore from '../../store/useStore';
import { raycastGroundPlaneXZ, sceneFloorY } from '../../utils/viewportSpawnPlacement';

function isNoviraUiHelper(obj) {
  let o = obj;
  while (o) {
    if (o.userData?.noviraUiHelper) return true;
    o = o.parent;
  }
  return false;
}

function collectPickMeshes(root) {
  const out = [];
  root.traverse((obj) => {
    if (!obj.isMesh || isNoviraUiHelper(obj)) return;
    if (!obj.visible) return;
    out.push(obj);
  });
  return out;
}

/**
 * In 3D Cursor tool: click empty viewport to place cursor on the floor plane (meshes use SceneObject click).
 */
export default function ThreeDCursorPlacement() {
  const { camera, gl, scene } = useThree();
  const downRef = useRef(null);

  useEffect(() => {
    const el = gl.domElement;

    const onDown = (e) => {
      if (e.button !== 0 || e.target !== el) return;
      const st = useStore.getState();
      if (st.activeTool !== 'cursor' || st.viewportNavMode === 'walk') return;
      const r = el.getBoundingClientRect();
      downRef.current = {
        x: e.clientX,
        y: e.clientY,
        ndcX: ((e.clientX - r.left) / r.width) * 2 - 1,
        ndcY: -((e.clientY - r.top) / r.height) * 2 + 1,
      };
    };

    const onUp = (e) => {
      const down = downRef.current;
      downRef.current = null;
      if (e.button !== 0 || e.target !== el || !down) return;
      const st = useStore.getState();
      if (st.activeTool !== 'cursor' || st.viewportNavMode === 'walk') return;

      const dist = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      if (dist > 8) return;

      const floorY = sceneFloorY(st.objects);
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera({ x: down.ndcX, y: down.ndcY }, camera);
      const meshes = collectPickMeshes(scene);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length > 0) {
        const p = hits[0].point;
        st.setThreeDCursorWorld([p.x, p.y, p.z]);
        return;
      }
      const [x, , z] = raycastGroundPlaneXZ(camera, floorY, down.ndcX, down.ndcY);
      st.setThreeDCursorWorld([x, floorY, z]);
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
    };
  }, [camera, gl, scene]);

  return null;
}
