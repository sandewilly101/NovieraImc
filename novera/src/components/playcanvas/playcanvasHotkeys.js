export function isEditableTarget(target) {
    if (!target || !(target instanceof HTMLElement)) return false;
    const tag = (target.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || !!target.closest('[contenteditable="true"]');
}

export function resolvePlayCanvasHotkey(e) {
    if (isEditableTarget(e.target)) return null;
    const key = (e.key || '').toLowerCase();
    const mod = e.ctrlKey || e.metaKey;

    if (key === 'escape') return 'escape';
    if (mod && e.shiftKey && key === 'z') return 'redo';
    if (mod && !e.shiftKey && key === 'z') return 'undo';
    if (mod && !e.shiftKey && key === 'y') return 'redo';
    if (mod && key === 'd') return 'duplicate';
    if (mod && key === ',') return 'toggleTransformSpace';
    if (mod && e.shiftKey && key === 'g') return 'ungroup';
    if (mod && !e.shiftKey && key === 'g') return 'group';
    if (mod && key === 'c') return 'copy';
    if (mod && key === 'v') return 'paste';
    if (mod && key === 'a') return 'selectAll';
    if (key === 'delete' || key === 'backspace') return 'delete';
    if (key === 'home') return e.shiftKey ? 'frameAll' : 'frameSelection';
    if (e.altKey && key === 'm') return 'toggleMarqueeMode';
    if (!mod && !e.shiftKey && (key === 'x' || key === 'y' || key === 'z')) return `axis:${key}`;
    if (!mod && !e.shiftKey && (key === 'f' || key === '.')) return 'focusSelection';
    return null;
}
