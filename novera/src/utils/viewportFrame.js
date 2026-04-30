/**
 * Rough world AABB from scene object records (position + dimensions * scale).
 * Used for “frame selection / frame all” without traversing Three.js meshes.
 */
export function computeSceneObjectsFrameBox(objects, opts = {}) {
  const {
    hiddenIds = [],
    scope = 'all',
    selectedIds = [],
    selectedId = null,
  } = opts;
  const hiddenSet = new Set(hiddenIds);
  const selSet =
    selectedIds.length > 0
      ? new Set(selectedIds)
      : selectedId
        ? new Set([selectedId])
        : null;

  const list = objects.filter((o) => {
    if (hiddenSet.has(o.id)) return false;
    if (o.type === 'ground') return false;
    if (scope === 'selection') {
      if (!selSet || selSet.size === 0) return false;
      if (!selSet.has(o.id)) return false;
    }
    return true;
  });

  if (!list.length) return null;

  let minx = Infinity;
  let miny = Infinity;
  let minz = Infinity;
  let maxx = -Infinity;
  let maxy = -Infinity;
  let maxz = -Infinity;

  for (const o of list) {
    const p = o.position || [0, 0, 0];
    const d = o.dimensions || [1, 1, 1];
    const sc = o.scale || [1, 1, 1];
    const hx = (Number(d[0]) * Number(sc[0])) / 2;
    const hy = (Number(d[1]) * Number(sc[1])) / 2;
    const hz = (Number(d[2]) * Number(sc[2])) / 2;
    const x = Number(p[0]);
    const y = Number(p[1]);
    const z = Number(p[2]);
    minx = Math.min(minx, x - hx);
    maxx = Math.max(maxx, x + hx);
    miny = Math.min(miny, y - hy);
    maxy = Math.max(maxy, y + hy);
    minz = Math.min(minz, z - hz);
    maxz = Math.max(maxz, z + hz);
  }

  const cx = (minx + maxx) / 2;
  const cy = (miny + maxy) / 2;
  const cz = (minz + maxz) / 2;
  const span = Math.max(maxx - minx, maxy - miny, maxz - minz, 0.5);
  return { center: [cx, cy, cz], span };
}

/** Camera position offset from box center for a pleasant orbit-style view. */
export function cameraFocusFromFrameBox(box) {
  if (!box) return null;
  const { center, span } = box;
  const dist = Math.max(2.8, span * 2.35);
  const position = [
    center[0] + dist * 0.52,
    center[1] + dist * 0.38,
    center[2] + dist * 0.52,
  ];
  return { target: [...center], position };
}
