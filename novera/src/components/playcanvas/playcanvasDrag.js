import * as pc from 'playcanvas';
import { computeEntityBounds } from './playcanvasMath';

export function intersectPointerPlane(camera, x, y, planeY) {
    const camComp = camera?.camera;
    if (!camComp) return null;
    const from = camComp.screenToWorld(x, y, camComp.nearClip);
    const to = camComp.screenToWorld(x, y, camComp.farClip);
    const dir = to.clone().sub(from);
    const denom = dir.y;
    if (Math.abs(denom) < 1e-6) return null;
    const t = (planeY - from.y) / denom;
    if (t <= 0) return null;
    return from.add(dir.mulScalar(t));
}

export function closestPointOnAxisFromPointer(camera, x, y, axisName, basePosition, axisDirection = null) {
    const camComp = camera?.camera;
    if (!camComp) return null;
    const rayP = camComp.screenToWorld(x, y, camComp.nearClip);
    const rayQ = camComp.screenToWorld(x, y, camComp.farClip);
    const rayD = rayQ.clone().sub(rayP).normalize();
    const axisP = new pc.Vec3(basePosition[0], basePosition[1], basePosition[2]);
    const axisD = axisDirection
        ? axisDirection.clone().normalize()
        : axisName === 'x'
            ? new pc.Vec3(1, 0, 0)
            : axisName === 'y'
                ? new pc.Vec3(0, 1, 0)
                : new pc.Vec3(0, 0, 1);
    const w0 = rayP.clone().sub(axisP);
    const a = rayD.dot(rayD);
    const b = rayD.dot(axisD);
    const c = axisD.dot(axisD);
    const d = rayD.dot(w0);
    const e2 = axisD.dot(w0);
    const denom = (a * c) - (b * b);
    if (Math.abs(denom) < 1e-6) return null;
    const tAxis = ((a * e2) - (b * d)) / denom;
    return axisP.add(axisD.mulScalar(tAxis));
}

export function computeDragRotateUpdate(obj, dragStartRotation, dragStartX, mouseX, snapEnabled) {
    const delta = (mouseX - dragStartX) * 0.01;
    const r = [...dragStartRotation];
    r[1] += delta;
    if (snapEnabled) {
        const step = Math.PI / 12;
        r[1] = Math.round(r[1] / step) * step;
    }
    return { rotation: r };
}

export function computeDragScaleUpdate(obj, dragStartScale, dragStartY, mouseY) {
    const delta = (dragStartY - mouseY) * 0.006;
    const next = dragStartScale.map((v) => Math.max(0.05, v + delta));
    const dims = obj.dimensions || [1, 1, 1];
    const prevScale = obj.scale || [1, 1, 1];
    const prevHalfH = Math.max(0.025, Math.abs(dims[1] * prevScale[1]) * 0.5);
    const nextHalfH = Math.max(0.025, Math.abs(dims[1] * next[1]) * 0.5);
    const pos = [...(obj.position || [0, 0, 0])];
    const baseY = pos[1] - prevHalfH;
    pos[1] = baseY + nextHalfH;
    return { scale: next, position: pos };
}

export function computeDragAxisMoveUpdate(obj, dragAxis, hitPoint, snapEnabled, snapValue, axisDirection = null, axisBase = null) {
    let p = [...(obj.position || [0, 0, 0])];
    if (axisDirection && Array.isArray(axisBase) && axisBase.length === 3) {
        const dir = axisDirection.clone().normalize();
        const base = new pc.Vec3(axisBase[0], axisBase[1], axisBase[2]);
        const delta = hitPoint.clone().sub(base).dot(dir);
        const moved = base.add(dir.mulScalar(delta));
        p = [moved.x, moved.y, moved.z];
    } else {
        if (dragAxis === 'x') p[0] = hitPoint.x;
        if (dragAxis === 'y') p[1] = hitPoint.y;
        if (dragAxis === 'z') p[2] = hitPoint.z;
    }
    if (snapEnabled) {
        p[0] = snapValue(p[0]);
        p[1] = snapValue(p[1]);
        p[2] = snapValue(p[2]);
    }
    return { position: p };
}

export function computeDragPlaneMoveUpdate({
    obj,
    dragOffset,
    hitPoint,
    axisConstraint,
    objectEntitiesRef,
    dragObjectId,
    snapEnabled,
    snapValue,
}) {
    const p = [...(obj.position || [0, 0, 0])];
    p[0] = hitPoint.x + dragOffset.x;
    p[2] = hitPoint.z + dragOffset.z;
    if (axisConstraint === 'x') p[2] = obj.position?.[2] || 0;
    if (axisConstraint === 'z') p[0] = obj.position?.[0] || 0;
    const dim = obj.dimensions || [1, 1, 1];
    const scl = obj.scale || [1, 1, 1];
    const halfH = Math.max(0.025, Math.abs(dim[1] * scl[1]) * 0.5);
    let supportTop = 0;
    objectEntitiesRef.current.forEach((ent, id) => {
        if (id === dragObjectId) return;
        const b = computeEntityBounds(ent);
        if (!b) return;
        const pad = 0.02;
        const withinX = p[0] >= (b.min.x - pad) && p[0] <= (b.max.x + pad);
        const withinZ = p[2] >= (b.min.z - pad) && p[2] <= (b.max.z + pad);
        if (!withinX || !withinZ) return;
        supportTop = Math.max(supportTop, b.max.y);
    });
    p[1] = supportTop + halfH;
    if (snapEnabled) {
        p[0] = snapValue(p[0]);
        p[1] = snapValue(p[1]);
        p[2] = snapValue(p[2]);
    }
    return { position: p };
}
