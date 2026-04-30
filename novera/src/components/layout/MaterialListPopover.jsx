import React, { useEffect, useRef } from 'react';
import { MagnifyingGlassIcon, BookmarkIcon, TrashIcon } from '@heroicons/react/24/outline';

function ListSphere({ color }) {
    return (
        <span
            className="blender-mat-sphere blender-mat-sphere--sm"
            style={{ '--blender-mat': color || '#b8b8b8' }}
            aria-hidden
        />
    );
}

/**
 * Blender-style material browser: search + list (scene + saved presets).
 */
export default function MaterialListPopover({
    open,
    onClose,
    search,
    onSearchChange,
    entries,
    onPick,
    onSaveCurrent,
    canSaveCurrent,
    onRemovePreset,
}) {
    const rootRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => {
            if (rootRef.current && !rootRef.current.contains(e.target)) {
                onClose();
            }
        };
        const t = setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mousedown', onDoc);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="blender-mat-list-popover" ref={rootRef} role="dialog" aria-label="Material list">
            <div className="blender-mat-list-popover__head">
                <span className="blender-mat-list-popover__title">Material List</span>
            </div>
            <div className="blender-mat-list-popover__search">
                <MagnifyingGlassIcon style={{ width: 14, height: 14 }} aria-hidden />
                <input
                    type="search"
                    className="blender-mat-list-popover__search-input props-input-field"
                    placeholder="Search…"
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    autoFocus
                />
            </div>
            <div className="blender-mat-list-popover__list">
                {entries.length === 0 ? (
                    <div className="blender-mat-list-popover__empty">No materials match.</div>
                ) : (
                    entries.map((e) => (
                        <div key={e.id} className="blender-mat-list-popover__row">
                            <button
                                type="button"
                                className="blender-mat-list-popover__pick"
                                onClick={() => onPick(e)}
                            >
                                <ListSphere color={e.color} />
                                <span className="blender-mat-list-popover__pick-name">{e.name}</span>
                                <span className="blender-mat-list-popover__pick-meta">
                                    {e.source === 'library' ? 'Saved' : 'Scene'}
                                </span>
                            </button>
                            {e.source === 'library' && e.presetId && (
                                <button
                                    type="button"
                                    className="blender-mat-list-popover__del"
                                    title="Remove from library"
                                    onClick={(ev) => {
                                        ev.stopPropagation();
                                        onRemovePreset(e.presetId);
                                    }}
                                >
                                    <TrashIcon style={{ width: 12, height: 12 }} aria-hidden />
                                </button>
                            )}
                        </div>
                    ))
                )}
            </div>
            <div className="blender-mat-list-popover__foot">
                <button
                    type="button"
                    className="inspector-pill-btn"
                    disabled={!canSaveCurrent}
                    onClick={onSaveCurrent}
                >
                    <BookmarkIcon style={{ width: 12, height: 12 }} aria-hidden />
                    <span>Save current</span>
                </button>
            </div>
        </div>
    );
}
