import * as THREE from 'three';

/** Top surface Y of the ground mesh, matching useStore spawn logic. */
export function sceneFloorY(objects) {
  const groundObj = objects?.find?.((o) => o.type === 'ground');
  if (!groundObj) return 0;
  return (
    groundObj.position[1] +
    ((groundObj.dimensions?.[1] || 1) * (groundObj.scale?.[1] || 1)) / 2
  );
}

/**
 * Ray from NDC into the scene; intersect horizontal plane at y = floorY.
 * Returns [x, 0, z] for use as addObject’s position offset (store adds floorY + bottomOffset).
 * Falls back to a point in front of the camera when the ray misses the plane (e.g. looking at horizon).
 */
export function raycastGroundPlaneXZ(camera, floorY, ndcX = 0, ndcY = 0) {
  const raycaster = new THREE.Raycaster();
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, floorY, 0)
  );
  const hit = new THREE.Vector3();
  if (raycaster.ray.intersectPlane(plane, hit)) {
    return [hit.x, 0, hit.z];
  }
  const dir = new THREE.Vector3();
  camera.getWorldDirection(dir);
  const forward = new THREE.Vector3().copy(dir);
  forward.y = 0;
  if (forward.lengthSq() < 1e-6) {
    forward.set(0, 0, -1);
  } else {
    forward.normalize();
  }
  const dist = 6;
  const p = new THREE.Vector3(camera.position.x, floorY, camera.position.z).addScaledVector(forward, dist);
  return [p.x, 0, p.z];
}

let spawnXZGetter = null;

/** Register from inside Canvas (R3F); pass null on unmount. */
export function setViewportSpawnXZGetter(fn) {
  spawnXZGetter = typeof fn === 'function' ? fn : null;
}

/** @returns {[number, number, number]|null} */
export function getViewportSpawnXZ(floorY) {
  if (typeof spawnXZGetter !== 'function') return null;
  const v = spawnXZGetter(floorY);
  if (!v || v.length < 3) return null;
  return [Number(v[0]), Number(v[1]), Number(v[2])];
}

/**
 * World-space position for new objects when no explicit placement was passed.
 * Uses 3D cursor when enabled and placed; otherwise viewport-center ray onto the floor.
 */
export function resolveImplicitSpawnPosition(state, floorY, bottomOffset) {
  if (
    state.spawnAtThreeDCursor &&
    Array.isArray(state.threeDCursorWorld) &&
    state.threeDCursorWorld.length >= 3
  ) {
    const [cx, cy, cz] = state.threeDCursorWorld;
    return [Number(cx), Number(cy), Number(cz)];
  }
  const vp = getViewportSpawnXZ(floorY);
  if (vp) {
    return [vp[0], vp[1] + floorY + bottomOffset, vp[2]];
  }
  return [0, floorY + bottomOffset, 0];
}
