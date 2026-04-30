import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { raycastGroundPlaneXZ, setViewportSpawnXZGetter } from '../../utils/viewportSpawnPlacement';

/**
 * Keeps default object spawn aligned with the viewport: ray through screen center onto the floor plane.
 * Drag-drop from the catalog still uses the pointer position via DropHandler.
 */
export default function ViewportSpawnBridge() {
  const { camera } = useThree();

  useEffect(() => {
    setViewportSpawnXZGetter((floorY) => raycastGroundPlaneXZ(camera, floorY, 0, 0));
    return () => setViewportSpawnXZGetter(null);
  }, [camera]);

  return null;
}
