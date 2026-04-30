/**
 * Build a flat list of materials from the current scene + optional saved presets
 * for the Material List browser (Blender-style).
 */

function normHex(c) {
    if (typeof c !== 'string' || !c.trim()) return '#e2e8f0';
    let h = c.trim();
    if (h.length === 4 && h.startsWith('#')) {
        h = `#${h[1]}${h[1]}${h[2]}${h[2]}${h[3]}${h[3]}`;
    }
    return h;
}

/**
 * @param {Array<object>} objects
 * @returns {Array<{ id: string, source: 'scene'|'library', name: string, color: string, roughness: number, metalness: number, objectId?: string, slotId?: string }>}
 */
export function collectSceneMaterials(objects) {
    if (!Array.isArray(objects)) return [];
    const out = [];
    for (const obj of objects) {
        if (!obj || obj.type === 'ground') continue;
        const label = obj.name || obj.type || 'Object';
        const r = Number.isFinite(obj.roughness) ? obj.roughness : 0.3;
        const m = Number.isFinite(obj.metalness) ? obj.metalness : 0.2;
        const c = normHex(obj.color || '#e2e8f0');
        out.push({
            id: `scene_base_${obj.id}`,
            source: 'scene',
            name: `${label} (base)`,
            color: c,
            roughness: r,
            metalness: m,
            objectId: obj.id,
            slotId: null,
        });
        if (['primitive', 'stl'].includes(obj.type) && Array.isArray(obj.meshEditState?.materialSlots)) {
            for (const slot of obj.meshEditState.materialSlots) {
                out.push({
                    id: `scene_slot_${obj.id}_${slot.id}`,
                    source: 'scene',
                    name: `${label} · ${slot.name || 'Slot'}`,
                    color: normHex(slot.color || c),
                    roughness: r,
                    metalness: m,
                    objectId: obj.id,
                    slotId: slot.id,
                });
            }
        }
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

/**
 * @param {Array<{ id: string, name: string, color: string, roughness?: number, metalness?: number }>} presets
 */
export function mergeMaterialLists(sceneList, presets) {
    const lib = (Array.isArray(presets) ? presets : []).map((p) => ({
        id: `lib_${p.id}`,
        source: 'library',
        name: p.name || 'Saved material',
        color: normHex(p.color),
        roughness: Number.isFinite(p.roughness) ? p.roughness : 0.3,
        metalness: Number.isFinite(p.metalness) ? p.metalness : 0.2,
        objectId: null,
        slotId: null,
        presetId: p.id,
    }));
    return [...lib, ...(Array.isArray(sceneList) ? sceneList : [])];
}

export function filterMaterialList(list, query) {
    const q = (query || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => {
        const hay = `${e.name} ${e.color}`.toLowerCase();
        return hay.includes(q);
    });
}
