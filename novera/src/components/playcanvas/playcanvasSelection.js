import * as pc from 'playcanvas';
import { aabbCorners, computeEntityBounds, rayAabbHitDistance } from './playcanvasMath';

export function pickObjectAtScreen({ x, y, camera, objects, objectEntitiesRef, raySphereHitDistance }) {
    const camComp = camera?.camera;
    if (!camComp) return null;
    const from = camComp.screenToWorld(x, y, camComp.nearClip);
    const to = camComp.screenToWorld(x, y, camComp.farClip);
    const dir = to.clone().sub(from).normalize();
    let best = null;
    let bestDist = Infinity;
    objects.forEach((obj) => {
        let hit = Infinity;
        const ent = objectEntitiesRef.current.get(obj.id);
        if (ent) {
            const b = computeEntityBounds(ent);
            if (b) hit = rayAabbHitDistance(from, dir, b.min, b.max);
        }
        if (hit === Infinity) {
            const pos = obj.position || [0, 0, 0];
            const dim = obj.dimensions || [1, 1, 1];
            const scl = obj.scale || [1, 1, 1];
            const rx = Math.abs(dim[0] * scl[0]) * 0.5;
            const ry = Math.abs(dim[1] * scl[1]) * 0.5;
            const rz = Math.abs(dim[2] * scl[2]) * 0.5;
            const radius = Math.max(0.25, Math.sqrt(rx * rx + ry * ry + rz * rz));
            const center = new pc.Vec3(pos[0], pos[1], pos[2]);
            hit = raySphereHitDistance(from, dir, center, radius);
        }
        if (hit < bestDist) {
            bestDist = hit;
            best = obj;
        }
    });
    return best;
}

export function computeMarqueeHitIds({
    camera,
    cameraEntity,
    marqueeStart,
    marqueeEnd,
    objects,
    objectEntitiesRef,
    marqueeIncludeOccluded,
}) {
    const x1 = Math.min(marqueeStart.x, marqueeEnd.x);
    const y1 = Math.min(marqueeStart.y, marqueeEnd.y);
    const x2 = Math.max(marqueeStart.x, marqueeEnd.x);
    const y2 = Math.max(marqueeStart.y, marqueeEnd.y);
    const hitIds = [];
    const camComp = camera;
    if (!camComp) return hitIds;

    const camPos = cameraEntity.getPosition().clone();
    const isOccludedByAnother = (objId, target) => {
        const dir = target.clone().sub(camPos);
        const maxDist = dir.length();
        if (maxDist < 1e-5) return false;
        dir.normalize();
        let nearestId = objId;
        let nearestDist = maxDist + 1;
        objectEntitiesRef.current.forEach((ent, id) => {
            const b = computeEntityBounds(ent);
            if (!b) return;
            const d = rayAabbHitDistance(camPos, dir, b.min, b.max);
            if (d < nearestDist) {
                nearestDist = d;
                nearestId = id;
            }
        });
        return nearestId !== objId;
    };

    objects.forEach((obj) => {
        const ent = objectEntitiesRef.current.get(obj.id);
        let screenMinX = Infinity;
        let screenMinY = Infinity;
        let screenMaxX = -Infinity;
        let screenMaxY = -Infinity;
        let hasProjection = false;

        const bounds = ent ? computeEntityBounds(ent) : null;
        if (bounds) {
            const corners = aabbCorners(bounds.min, bounds.max);
            corners.forEach((c) => {
                const s = camComp.worldToScreen(c.x, c.y, c.z);
                if (!s) return;
                hasProjection = true;
                screenMinX = Math.min(screenMinX, s.x);
                screenMinY = Math.min(screenMinY, s.y);
                screenMaxX = Math.max(screenMaxX, s.x);
                screenMaxY = Math.max(screenMaxY, s.y);
            });
        }
        if (!hasProjection) {
            const p = obj.position || [0, 0, 0];
            const s = camComp.worldToScreen(p[0], p[1], p[2]);
            if (!s) return;
            hasProjection = true;
            screenMinX = screenMaxX = s.x;
            screenMinY = screenMaxY = s.y;
        }
        if (!hasProjection) return;
        const overlaps =
            screenMaxX >= x1 &&
            screenMinX <= x2 &&
            screenMaxY >= y1 &&
            screenMinY <= y2;
        if (!overlaps) return;
        const p = obj.position || [0, 0, 0];
        const target = new pc.Vec3(p[0], p[1], p[2]);
        if (marqueeIncludeOccluded || !isOccludedByAnother(obj.id, target)) {
            hitIds.push(obj.id);
        }
    });

    return hitIds;
}
