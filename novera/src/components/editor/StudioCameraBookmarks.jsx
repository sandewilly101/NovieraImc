import React, { useEffect, useRef, useState } from 'react';
import { BookmarkSquareIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import useStore from '../../store/useStore';
import { showToast } from '../../utils/noviraToast';

/**
 * Live Home 3D–style saved orbital views: bookmark current camera/target, recall later.
 */
export default function StudioCameraBookmarks() {
  const projectId = useStore((s) => s.projectId);
  const savedSceneCameras = useStore((s) => s.savedSceneCameras);
  const recallSavedSceneCamera = useStore((s) => s.recallSavedSceneCamera);
  const removeSavedSceneCamera = useStore((s) => s.removeSavedSceneCamera);
  const studioViewLayout = useStore((s) => s.studioViewLayout);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const show = projectId && (studioViewLayout === 'scene' || studioViewLayout === 'split');
  if (!show) return null;

  return (
    <div className="studio-camera-bookmarks" ref={wrapRef}>
      <button
        type="button"
        className="studio-camera-bookmarks__trigger"
        onClick={() => setOpen((v) => !v)}
        title="Saved 3D cameras — bookmark the current orbit view"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <BookmarkSquareIcon style={{ width: 15, height: 15 }} aria-hidden />
        <span>Cameras</span>
        <ChevronDownIcon style={{ width: 12, height: 12, opacity: 0.75 }} aria-hidden />
      </button>
      {open && (
        <div className="studio-camera-bookmarks__panel" role="menu">
          <button
            type="button"
            className="studio-camera-bookmarks__save"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              document.dispatchEvent(new CustomEvent('novira:save-scene-camera'));
            }}
          >
            Save current 3D view
          </button>
          {savedSceneCameras.length === 0 ? (
            <p className="studio-camera-bookmarks__empty">No saved views — orbit the scene, then save.</p>
          ) : (
            <ul className="studio-camera-bookmarks__list">
              {savedSceneCameras.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    className="studio-camera-bookmarks__recall"
                    role="menuitem"
                    onClick={() => {
                      recallSavedSceneCamera(c.id);
                      setOpen(false);
                      showToast(`Camera: ${c.name}`, 'ok');
                    }}
                  >
                    {c.name}
                  </button>
                  <button
                    type="button"
                    className="studio-camera-bookmarks__remove"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => removeSavedSceneCamera(c.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
