/**
 * Minimal material animation tracks on scene objects (keyframe dots in inspector).
 * Tracks: color (hex), roughness, metalness, slotColor[slotId] (hex).
 */

const emptyTracks = () => ({
    color: [],
    roughness: [],
    metalness: [],
    slotColor: {},
});

export function normalizeMaterialAnim(ma) {
    if (!ma || typeof ma !== 'object') return { tracks: emptyTracks() };
    const t = ma.tracks || {};
    const slotColor = typeof t.slotColor === 'object' && t.slotColor ? { ...t.slotColor } : {};
    Object.keys(slotColor).forEach((k) => {
        if (!Array.isArray(slotColor[k])) slotColor[k] = [];
    });
    return {
        tracks: {
            color: Array.isArray(t.color) ? [...t.color] : [],
            roughness: Array.isArray(t.roughness) ? [...t.roughness] : [],
            metalness: Array.isArray(t.metalness) ? [...t.metalness] : [],
            slotColor,
        },
    };
}

function sortByFrame(arr) {
    return [...arr].sort((a, b) => a.f - b.f);
}

export function hasKeyframeAt(tracks, trackKey, frame, slotId = null) {
    const f = Math.round(Number(frame)) || 0;
    if (trackKey === 'slotColor' && slotId) {
        const arr = tracks.slotColor[slotId] || [];
        return arr.some((k) => k.f === f);
    }
    const arr = tracks[trackKey] || [];
    return arr.some((k) => k.f === f);
}

/**
 * Toggle key at frame for value; returns new tracks object.
 */
export function toggleMaterialKeyframeTrack(tracks, trackKey, frame, value, slotId = null) {
    const f = Math.round(Number(frame)) || 0;
    const next = {
        color: sortByFrame([...(tracks.color || [])]),
        roughness: sortByFrame([...(tracks.roughness || [])]),
        metalness: sortByFrame([...(tracks.metalness || [])]),
        slotColor: { ...(tracks.slotColor || {}) },
    };

    if (trackKey === 'slotColor' && slotId) {
        const prev = [...(next.slotColor[slotId] || [])];
        const i = prev.findIndex((k) => k.f === f);
        if (i >= 0) prev.splice(i, 1);
        else prev.push({ f, v: value });
        next.slotColor[slotId] = sortByFrame(prev);
        return next;
    }
    if (trackKey !== 'color' && trackKey !== 'roughness' && trackKey !== 'metalness') return tracks;
    const prev = [...(next[trackKey] || [])];
    const i = prev.findIndex((k) => k.f === f);
    if (i >= 0) prev.splice(i, 1);
    else prev.push({ f, v: value });
    next[trackKey] = sortByFrame(prev);
    return next;
}
