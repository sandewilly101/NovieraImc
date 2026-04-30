import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useStore from '../../store/useStore';
import { computeSceneObjectsFrameBox, cameraFocusFromFrameBox } from '../../utils/viewportFrame';
import { showToast } from '../../utils/noviraToast';

/**
 * Listens for `novira:frame-camera` and fits the orbit camera using live Three.js bounds
 * (accurate for GLTFs), with a metadata fallback when roots are not yet mounted.
 */
export default function FrameCameraBridge() {
  const { scene } = useThree();

  useEffect(() => {
    const handler = (ev) => {
      const scope = ev.detail?.scope === 'all' ? 'all' : 'selection';
      const st = useStore.getState();
      const hidden = new Set(st.hiddenObjectIds || []);
      const sel =
        st.selectedIds?.length > 0
          ? new Set(st.selectedIds)
          : st.selectedId
            ? new Set([st.selectedId])
            : null;

      if (scope === 'selection' && (!sel || sel.size === 0)) {
        showToast('Select something to frame, or use Shift+Home for the whole scene.', 'warn');
        return;
      }

      const box3 = new THREE.Box3();
      let any = false;

      scene.traverse((node) => {
        if (node.userData?.noviraUiHelper) return;
        const oid = node.userData?.noviraSceneObjectId;
        if (!oid) return;
        const rec = st.objects.find((o) => o.id === oid);
        if (!rec || rec.type === 'ground') return;
        if (hidden.has(oid)) return;
        if (scope === 'selection' && !sel.has(oid)) return;

        const b = new THREE.Box3().setFromObject(node);
        if (!b.isEmpty()) {
          if (!any) {
            box3.copy(b);
            any = true;
          } else {
            box3.union(b);
          }
        }
      });

      if (any) {
        const center = new THREE.Vector3();
        box3.getCenter(center);
        const size = new THREE.Vector3();
        box3.getSize(size);
        const span = Math.max(size.x, size.y, size.z, 0.35);
        const fp = cameraFocusFromFrameBox({ center: center.toArray(), span });
        st.setCameraFocus(fp.target, fp.position);
        showToast(scope === 'selection' ? 'Camera framed to selection (live bounds).' : 'Camera framed to scene (live bounds).', 'ok');
        return;
      }

      const fallback = computeSceneObjectsFrameBox(st.objects, {
        hiddenIds: st.hiddenObjectIds,
        scope,
        selectedIds: st.selectedIds || [],
        selectedId: st.selectedId,
      });
      if (!fallback) {
        showToast(scope === 'selection' ? 'Nothing to frame yet.' : 'Nothing visible to frame.', 'warn');
        return;
      }
      const fp = cameraFocusFromFrameBox(fallback);
      st.setCameraFocus(fp.target, fp.position);
      showToast(scope === 'selection' ? 'Camera framed to selection (approx.).' : 'Camera framed to scene (approx.).', 'ok');
    };

    document.addEventListener('novira:frame-camera', handler);
    return () => document.removeEventListener('novira:frame-camera', handler);
  }, [scene]);

  return null;
}
