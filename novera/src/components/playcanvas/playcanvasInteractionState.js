export function createInteractionState() {
    return {
        isCameraDragging: false,
        dragObjectId: null,
        dragOffset: null,
        dragAxis: null,
        dragAxisDir: null,
        dragAxisBase: null,
        dragMode: null,
        dragStartX: 0,
        dragStartY: 0,
        dragStartRotation: null,
        dragStartScale: null,
        isMarqueeSelecting: false,
        marqueeStart: null,
        marqueeEnd: null,
        marqueeMode: 'add',
    };
}

export function resetInteractionState(state) {
    state.isCameraDragging = false;
    state.dragObjectId = null;
    state.dragOffset = null;
    state.dragAxis = null;
    state.dragAxisDir = null;
    state.dragAxisBase = null;
    state.dragMode = null;
    state.dragStartX = 0;
    state.dragStartY = 0;
    state.dragStartRotation = null;
    state.dragStartScale = null;
    state.isMarqueeSelecting = false;
    state.marqueeStart = null;
    state.marqueeEnd = null;
    state.marqueeMode = 'add';
}

export function computeMarqueeRect(start, end) {
    return {
        x: Math.min(start.x, end.x),
        y: Math.min(start.y, end.y),
        w: Math.abs(end.x - start.x),
        h: Math.abs(end.y - start.y),
    };
}
