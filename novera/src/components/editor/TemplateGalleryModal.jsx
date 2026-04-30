import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { PROJECT_TEMPLATES } from '../../data/projectTemplates';
import useStore from '../../store/useStore';
import { showToast } from '../../utils/noviraToast';

/**
 * In-editor template gallery — replaces the 3D scene from curated starters (see `projectTemplates.js`).
 */
export default function TemplateGalleryModal({ open, onClose }) {
  if (!open) return null;

  const apply = (id) => {
    const ok = useStore.getState().applyProjectTemplate(id);
    if (ok) {
      showToast('Template applied to the 3D scene.', 'ok');
      onClose();
    } else {
      showToast('Unknown template id.', 'warn');
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Templates" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: 720, width: '92vw', maxHeight: '85vh', overflow: 'auto' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <XMarkIcon className="w-6 h-6" />
        </button>
        <div className="modal-content">
          <div className="modal-header" style={{ marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>New scene from template</h2>
            <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13 }}>
              Replaces current 3D objects with a starter layout. Floor plan data is unchanged — save the project first if
              you need a snapshot.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {PROJECT_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => apply(t.id)}
                style={{
                  textAlign: 'left',
                  padding: 14,
                  borderRadius: 12,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                  cursor: 'pointer',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{t.name}</div>
                <div style={{ marginTop: 6, fontSize: 12, color: '#64748b', lineHeight: 1.45 }}>{t.description}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
