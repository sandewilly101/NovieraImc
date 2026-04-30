export function computeMoveUpdate({ obj, keys, axisConstraint, step, snapEnabled, snapValue, localAxes = null }) {
    const p = [...(obj.position || [0, 0, 0])];
    if (localAxes) {
        const moveX = ((keys.right ? 1 : 0) - (keys.left ? 1 : 0)) * step;
        const moveZ = ((keys.down ? 1 : 0) - (keys.up ? 1 : 0)) * step;
        const moveY = ((keys.rise ? 1 : 0) - (keys.fall ? 1 : 0)) * step;
        if (!axisConstraint || axisConstraint === 'x') {
            p[0] += localAxes.x[0] * moveX;
            p[1] += localAxes.x[1] * moveX;
            p[2] += localAxes.x[2] * moveX;
        }
        if (!axisConstraint || axisConstraint === 'z') {
            p[0] += localAxes.z[0] * moveZ;
            p[1] += localAxes.z[1] * moveZ;
            p[2] += localAxes.z[2] * moveZ;
        }
        if (!axisConstraint || axisConstraint === 'y') {
            p[0] += localAxes.y[0] * moveY;
            p[1] += localAxes.y[1] * moveY;
            p[2] += localAxes.y[2] * moveY;
        }
    } else {
        if (!axisConstraint || axisConstraint === 'x') {
            if (keys.left) p[0] -= step;
            if (keys.right) p[0] += step;
        }
        if (!axisConstraint || axisConstraint === 'z') {
            if (keys.up) p[2] -= step;
            if (keys.down) p[2] += step;
        }
        if (!axisConstraint || axisConstraint === 'y') {
            if (keys.rise) p[1] += step;
            if (keys.fall) p[1] -= step;
        }
    }
    if (snapEnabled) {
        p[0] = snapValue(p[0]);
        p[1] = snapValue(p[1]);
        p[2] = snapValue(p[2]);
    }
    const prev = obj.position || [];
    if (JSON.stringify(p) === JSON.stringify(prev)) return null;
    return { position: p };
}

export function computeRotateUpdate({ obj, keys, axisConstraint, step, snapEnabled }) {
    const r = [...(obj.rotation || [0, 0, 0])];
    if (!axisConstraint || axisConstraint === 'y') {
        if (keys.left) r[1] += step;
        if (keys.right) r[1] -= step;
    }
    if (!axisConstraint || axisConstraint === 'x') {
        if (keys.up) r[0] += step;
        if (keys.down) r[0] -= step;
    }
    if (!axisConstraint || axisConstraint === 'z') {
        if (keys.rise) r[2] += step;
        if (keys.fall) r[2] -= step;
    }
    if (snapEnabled) {
        const a = Math.PI / 12;
        r[0] = Math.round(r[0] / a) * a;
        r[1] = Math.round(r[1] / a) * a;
        r[2] = Math.round(r[2] / a) * a;
    }
    return { rotation: r };
}

export function computeScaleUpdate({ obj, keys, axisConstraint, step }) {
    let delta = 0;
    if (keys.grow) delta += step;
    if (keys.shrink) delta -= step;
    if (delta === 0) return null;
    const base = obj.scale || [1, 1, 1];
    const next = [...base];
    if (!axisConstraint || axisConstraint === 'x') next[0] = Math.max(0.05, base[0] + delta);
    if (!axisConstraint || axisConstraint === 'y') next[1] = Math.max(0.05, base[1] + delta);
    if (!axisConstraint || axisConstraint === 'z') next[2] = Math.max(0.05, base[2] + delta);
    const dims = obj.dimensions || [1, 1, 1];
    const prevHalfH = Math.max(0.025, Math.abs(dims[1] * base[1]) * 0.5);
    const nextHalfH = Math.max(0.025, Math.abs(dims[1] * next[1]) * 0.5);
    const pos = [...(obj.position || [0, 0, 0])];
    const baseY = pos[1] - prevHalfH;
    pos[1] = baseY + nextHalfH;
    return { scale: next, position: pos };
}
