import * as pc from 'playcanvas';

export function computeEntityBounds(entity) {
    if (!entity) return null;
    let min = new pc.Vec3(Infinity, Infinity, Infinity);
    let max = new pc.Vec3(-Infinity, -Infinity, -Infinity);
    let found = false;
    const stack = [entity];
    while (stack.length) {
        const e = stack.pop();
        if (!e) continue;
        if (e.render?.meshInstances?.length) {
            e.render.meshInstances.forEach((mi) => {
                const aabb = mi?.aabb;
                if (!aabb) return;
                const lo = aabb.getMin();
                const hi = aabb.getMax();
                min.x = Math.min(min.x, lo.x);
                min.y = Math.min(min.y, lo.y);
                min.z = Math.min(min.z, lo.z);
                max.x = Math.max(max.x, hi.x);
                max.y = Math.max(max.y, hi.y);
                max.z = Math.max(max.z, hi.z);
                found = true;
            });
        }
        if (e.children?.length) stack.push(...e.children);
    }
    return found ? { min, max } : null;
}

export function rayAabbHitDistance(rayOrigin, rayDir, min, max) {
    let tmin = -Infinity;
    let tmax = Infinity;
    const axes = ['x', 'y', 'z'];
    for (let i = 0; i < axes.length; i += 1) {
        const a = axes[i];
        const o = rayOrigin[a];
        const d = rayDir[a];
        const mn = min[a];
        const mx = max[a];
        if (Math.abs(d) < 1e-8) {
            if (o < mn || o > mx) return Infinity;
            continue;
        }
        const inv = 1 / d;
        let t1 = (mn - o) * inv;
        let t2 = (mx - o) * inv;
        if (t1 > t2) {
            const tmp = t1;
            t1 = t2;
            t2 = tmp;
        }
        tmin = Math.max(tmin, t1);
        tmax = Math.min(tmax, t2);
        if (tmin > tmax) return Infinity;
    }
    if (tmax < 0) return Infinity;
    return tmin > 0 ? tmin : tmax;
}

export function aabbCorners(min, max) {
    return [
        new pc.Vec3(min.x, min.y, min.z),
        new pc.Vec3(max.x, min.y, min.z),
        new pc.Vec3(min.x, max.y, min.z),
        new pc.Vec3(max.x, max.y, min.z),
        new pc.Vec3(min.x, min.y, max.z),
        new pc.Vec3(max.x, min.y, max.z),
        new pc.Vec3(min.x, max.y, max.z),
        new pc.Vec3(max.x, max.y, max.z),
    ];
}
