import * as pc from 'playcanvas';
import { computeEntityBounds } from './playcanvasMath';

export function isExternalType(obj) {
    return obj?.type === 'gltf' || obj?.type === 'sketchfab' || obj?.type === 'stl' || obj?.type === 'gltf-part';
}

export function canLoadExternalUrl(u) {
    if (!u || typeof u !== 'string') return false;
    if (u.startsWith('blob:')) return true;
    if (u.startsWith('data:')) return false;
    return /\.(glb|gltf)($|\?)/i.test(u) || u.includes('/api/') || u.includes('proxy');
}

export function cleanupOrphanedExternal(idsToRemove, externalModelRootRef, externalLoadStateRef, externalFitRef) {
    idsToRemove.forEach((id) => {
        const modelRoot = externalModelRootRef.current.get(id);
        if (modelRoot) {
            try { modelRoot.destroy(); } catch (_) { /* noop */ }
            externalModelRootRef.current.delete(id);
        }
        externalLoadStateRef.current.delete(id);
        externalFitRef.current.delete(id);
    });
}

export function syncExternalLoads(app, effectiveObjects, entities, externalModelRootRef, externalLoadStateRef, externalFitRef) {
    effectiveObjects.forEach((obj) => {
        if (!(isExternalType(obj) && canLoadExternalUrl(obj.url))) {
            if (externalModelRootRef.current.has(obj.id)) {
                const old = externalModelRootRef.current.get(obj.id);
                try { old.destroy(); } catch (_) { /* noop */ }
                externalModelRootRef.current.delete(obj.id);
                externalLoadStateRef.current.delete(obj.id);
                externalFitRef.current.delete(obj.id);
            }
            return;
        }

        const ent = entities.get(obj.id);
        if (!ent) return;
        const cacheKey = `${obj.id}::${obj.url}`;
        const status = externalLoadStateRef.current.get(obj.id);
        if (status && status.key === cacheKey) return;

        externalLoadStateRef.current.set(obj.id, { key: cacheKey, status: 'loading' });
        app.assets.loadFromUrl(obj.url, 'container', (err, asset) => {
            const st = externalLoadStateRef.current.get(obj.id);
            if (!st || st.key !== cacheKey) return;
            if (err || !asset?.resource) {
                externalLoadStateRef.current.set(obj.id, { key: cacheKey, status: 'failed' });
                return;
            }
            try {
                const old = externalModelRootRef.current.get(obj.id);
                if (old) old.destroy();
                const modelRoot = asset.resource.instantiateRenderEntity();
                modelRoot.setLocalPosition(0, 0, 0);
                modelRoot.setLocalScale(1, 1, 1);
                ent.addChild(modelRoot);
                externalModelRootRef.current.set(obj.id, modelRoot);
                externalFitRef.current.delete(obj.id);
                externalLoadStateRef.current.set(obj.id, { key: cacheKey, status: 'ok' });
            } catch (_) {
                externalLoadStateRef.current.set(obj.id, { key: cacheKey, status: 'failed' });
            }
        });
    });
}

export function fitExternalModels(effectiveObjects, externalModelRootRef, externalFitRef) {
    effectiveObjects.forEach((obj) => {
        const modelRoot = externalModelRootRef.current.get(obj.id);
        if (!modelRoot) return;
        const dims = obj.dimensions || [1, 1, 1];
        const scl = obj.scale || [1, 1, 1];
        const target = [
            Math.max(0.05, Math.abs(dims[0] * scl[0])),
            Math.max(0.05, Math.abs(dims[1] * scl[1])),
            Math.max(0.05, Math.abs(dims[2] * scl[2])),
        ];
        const fitKey = target.join(',');
        if (externalFitRef.current.get(obj.id) === fitKey) return;
        const b = computeEntityBounds(modelRoot);
        if (!b) return;
        const sizeX = Math.max(0.001, b.max.x - b.min.x);
        const sizeY = Math.max(0.001, b.max.y - b.min.y);
        const sizeZ = Math.max(0.001, b.max.z - b.min.z);
        const uniform = Math.min(target[0] / sizeX, target[1] / sizeY, target[2] / sizeZ);
        modelRoot.setLocalScale(uniform, uniform, uniform);
        const b2 = computeEntityBounds(modelRoot);
        if (b2) {
            const cx = (b2.min.x + b2.max.x) * 0.5;
            const cy = b2.min.y;
            const cz = (b2.min.z + b2.max.z) * 0.5;
            modelRoot.setLocalPosition(-cx, -cy, -cz);
        }
        externalFitRef.current.set(obj.id, fitKey);
    });
}
