import React, { useEffect, useRef } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../../store/useStore';
import { showToast } from '../../utils/noviraToast';

const btnBase = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '12px 14px',
  marginBottom: 8,
  borderRadius: 10,
  border: '1px solid rgba(148, 163, 184, 0.35)',
  background: 'rgba(30, 41, 59, 0.85)',
  color: '#f1f5f9',
  fontFamily: "'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s, border-color 0.15s',
};

const subStyle = {
  display: 'block',
  marginTop: 4,
  fontSize: 10,
  fontWeight: 500,
  color: '#94a3b8',
  letterSpacing: '0.02em',
};

function ActionButton({ title, blenderHint, disabled, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      style={{
        ...btnBase,
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'rgba(51, 65, 85, 0.95)';
          e.currentTarget.style.borderColor = 'rgba(129, 140, 248, 0.45)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'rgba(30, 41, 59, 0.85)';
        e.currentTarget.style.borderColor = 'rgba(148, 163, 184, 0.35)';
      }}
    >
      {title}
      {blenderHint ? <span style={subStyle}>{blenderHint}</span> : null}
    </button>
  );
}

/**
 * Blender Shift+S style menu, simplified: few clear actions instead of many hotkeys.
 */
export default function SnapCursorMenu() {
  const open = useStore((s) => s.snapCursorMenuOpen);
  const setOpen = useStore((s) => s.setSnapCursorMenuOpen);
  const close = () => setOpen(false);

  const {
    selectedId,
    selectedIdsLen,
    threeDCursorWorld,
    spawnAtThreeDCursor,
    objectSnapEnabled,
    wireframe,
    setWireframe,
    transformSpace,
    toggleTransformSpace,
    viewportAxisGizmoEnabled,
    setViewportAxisGizmoEnabled,
    isolateActive,
    toggleIsolateSelected,
    showAllSceneObjects,
  } = useStore(
    useShallow((s) => ({
      selectedId: s.selectedId,
      selectedIdsLen: s.selectedIds?.length ?? 0,
      threeDCursorWorld: s.threeDCursorWorld,
      spawnAtThreeDCursor: s.spawnAtThreeDCursor,
      objectSnapEnabled: s.objectSnapEnabled !== false,
      wireframe: s.wireframe,
      setWireframe: s.setWireframe,
      transformSpace: s.transformSpace,
      toggleTransformSpace: s.toggleTransformSpace,
      viewportAxisGizmoEnabled: s.viewportAxisGizmoEnabled !== false,
      setViewportAxisGizmoEnabled: s.setViewportAxisGizmoEnabled,
      isolateActive: s.isolateActive,
      toggleIsolateSelected: s.toggleIsolateSelected,
      showAllSceneObjects: s.showAllSceneObjects,
    }))
  );

  const panelRef = useRef(null);
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => panelRef.current?.focus?.(), 0);
    return () => window.clearTimeout(t);
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(2, 6, 23, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
      onClick={close}
      onKeyDown={(e) => {
        if (e.key === 'Escape') close();
      }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="snap-cursor-menu-title"
        style={{
          width: '100%',
          maxWidth: 380,
          borderRadius: 16,
          padding: '22px 22px 18px',
          background: 'linear-gradient(165deg, #1e293b 0%, #0f172a 100%)',
          border: '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="snap-cursor-menu-title"
          style={{
            margin: '0 0 4px',
            fontSize: 16,
            fontWeight: 700,
            color: '#f8fafc',
            fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
          }}
        >
          Cursor & placement
        </h2>
        <p style={{ margin: '0 0 18px', fontSize: 11, color: '#94a3b8', lineHeight: 1.45 }}>
          Same idea as Blender’s <strong style={{ color: '#cbd5e1' }}>Shift+S</strong> snap menu — fewer choices, plain language.
          New imports and “Add” use the 3D cursor when it’s placed and the option below is on.
          <br />
          <span style={{ color: '#cbd5e1' }}>Nudge:</span> hold <strong>Alt</strong> + arrow keys for ±X / ±Z (25 cm, or 5 cm with Shift); Alt+PgUp / PgDn for ±Y.
          With <strong>Snap</strong> on, 25 cm nudges snap to the grid; fine (Shift) nudges stay free. <strong>Ctrl+Z</strong> / <strong>Ctrl+Y</strong> (and <strong>Ctrl+Shift+Z</strong> or <strong>Cmd+Shift+Z</strong> on Mac) undo and redo the last nudge in one step (including multi-select).
        </p>

        <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#a78bfa' }}>
          Display & transform (pro, kept simple)
        </p>

        <button
          type="button"
          style={{
            ...btnBase,
            marginBottom: 8,
            borderColor: wireframe ? 'rgba(251, 191, 36, 0.5)' : 'rgba(148, 163, 184, 0.35)',
          }}
          onClick={() => {
            const next = !wireframe;
            setWireframe(next);
            showToast(next ? 'Wireframe view (all meshes).' : 'Shaded view.', 'ok');
          }}
        >
          {wireframe ? 'Wireframe: On' : 'Wireframe: Off'}
          <span style={subStyle}>Quick topology check — same idea as Blender overlays</span>
        </button>

        <button
          type="button"
          style={{
            ...btnBase,
            marginBottom: 8,
            borderColor: viewportAxisGizmoEnabled ? 'rgba(96, 165, 250, 0.45)' : 'rgba(148, 163, 184, 0.35)',
          }}
          onClick={() => {
            const next = !viewportAxisGizmoEnabled;
            setViewportAxisGizmoEnabled(next);
            showToast(
              next ? 'Corner axis widget on — click X/Y/Z for axis views.' : 'Corner axis widget hidden.',
              'ok'
            );
          }}
        >
          {viewportAxisGizmoEnabled ? 'Corner X/Y/Z widget: On' : 'Corner X/Y/Z widget: Off'}
          <span style={subStyle}>Maya / Blender–style camera snaps from the viewport corner</span>
        </button>

        <button
          type="button"
          style={{
            ...btnBase,
            marginBottom: 14,
            borderColor: transformSpace === 'local' ? 'rgba(167, 139, 250, 0.5)' : 'rgba(148, 163, 184, 0.35)',
          }}
          onClick={() => {
            toggleTransformSpace();
            const next = useStore.getState().transformSpace;
            showToast(
              next === 'local'
                ? 'Move/rotate/scale along the object (local).'
                : 'Move/rotate/scale along the room (world).',
              'ok'
            );
          }}
        >
          {transformSpace === 'local' ? 'Gizmo: Local (object axes)' : 'Gizmo: World (room axes)'}
          <span style={subStyle}>Ctrl+, — matches “global vs local” in other 3D apps</span>
        </button>

        <p style={{ margin: '4px 0 8px', fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#38bdf8' }}>
          Focus in the scene
        </p>

        <button
          type="button"
          style={{
            ...btnBase,
            marginBottom: 8,
            borderColor: isolateActive ? 'rgba(56, 189, 248, 0.55)' : 'rgba(148, 163, 184, 0.35)',
          }}
          disabled={!selectedId && !selectedIdsLen}
          onClick={() => {
            const st = useStore.getState();
            if (!st.selectedId && !(st.selectedIds && st.selectedIds.length > 0)) {
              showToast('Select something to isolate.', 'warn');
              return;
            }
            st.toggleIsolateSelected();
            const on = useStore.getState().isolateActive;
            showToast(on ? 'Only the selection is visible (ground stays).' : 'Everything visible again.', 'ok');
          }}
        >
          {isolateActive ? 'Show whole scene again' : 'Isolate — show only selection'}
          <span style={subStyle}>Blender-style solo · Ctrl+Shift+H</span>
        </button>

        <button
          type="button"
          style={{ ...btnBase, marginBottom: 8 }}
          onClick={() => {
            showAllSceneObjects();
            showToast('All objects shown.', 'ok');
          }}
        >
          Show every object
          <span style={subStyle}>Clears all hiding, including manual eye-icon hides</span>
        </button>

        <button
          type="button"
          style={{ ...btnBase, marginBottom: 8 }}
          disabled={!selectedId && !selectedIdsLen}
          onClick={() => useStore.getState().frameCameraViewport('selection')}
        >
          Frame camera on selection
          <span style={subStyle}>Home — uses real mesh bounds when the 3D view is open</span>
        </button>

        <button
          type="button"
          style={{ ...btnBase, marginBottom: 14 }}
          onClick={() => useStore.getState().frameCameraViewport('all')}
        >
          Frame camera on whole scene
          <span style={subStyle}>Shift+Home — live bounds in 3D; falls back to simple box if needed</span>
        </button>

        <ActionButton
          title="Put 3D cursor on the selected object"
          blenderHint="Blender: Cursor to Selected"
          disabled={!selectedId}
          onClick={() => {
            const st = useStore.getState();
            if (!st.selectedId) {
              showToast('Select an object first.', 'warn');
              return;
            }
            st.snapThreeDCursorToSelection();
            showToast('3D cursor moved to the selected object.', 'ok');
            close();
          }}
        />

        <ActionButton
          title="Move selection to the 3D cursor"
          blenderHint="Blender: Selection to Cursor (keeps spacing between objects)"
          disabled={!selectedId || !threeDCursorWorld}
          onClick={() => {
            const st = useStore.getState();
            if (!st.selectedId) {
              showToast('Select an object first.', 'warn');
              return;
            }
            if (!st.threeDCursorWorld) {
              showToast('Click in the scene with the 3D Cursor tool (Shift+C) to place the cursor first.', 'warn');
              return;
            }
            st.snapSelectionToThreeDCursor();
            showToast('Selection moved to the 3D cursor.', 'ok');
            close();
          }}
        />

        <ActionButton
          title="Put 3D cursor at world center (on the floor)"
          blenderHint="Blender: Cursor to World Origin"
          disabled={false}
          onClick={() => {
            useStore.getState().snapThreeDCursorToWorldOrigin();
            showToast('3D cursor set to world center on the floor.', 'ok');
            close();
          }}
        />

        <ActionButton
          title="Snap 3D cursor to the grid (25 cm)"
          blenderHint="Uses the same grid as when Snap is on in the status bar"
          disabled={!threeDCursorWorld || !objectSnapEnabled}
          onClick={() => {
            const st = useStore.getState();
            if (!st.threeDCursorWorld) return;
            if (st.objectSnapEnabled === false) {
              showToast('Turn Snap on in the status bar first.', 'warn');
              return;
            }
            st.snapThreeDCursorToGrid();
            showToast('3D cursor snapped to the 25 cm grid.', 'ok');
            close();
          }}
        />

        <ActionButton
          title="Clear 3D cursor (use view center for new objects)"
          blenderHint="Until you place the cursor again, imports and Add use the middle of the view"
          disabled={!threeDCursorWorld}
          onClick={() => {
            useStore.getState().clearThreeDCursor();
            showToast('3D cursor cleared — new objects follow the center of the view.', 'ok');
            close();
          }}
        />

        <button
          type="button"
          style={{
            ...btnBase,
            marginBottom: 10,
            borderColor: spawnAtThreeDCursor ? 'rgba(52, 211, 153, 0.45)' : 'rgba(148, 163, 184, 0.35)',
          }}
          onClick={() => {
            useStore.getState().setSpawnAtThreeDCursor(!spawnAtThreeDCursor);
            showToast(
              !spawnAtThreeDCursor
                ? 'New objects will try to use the 3D cursor when it’s set.'
                : 'New objects use the center of the view when the cursor isn’t set.',
              'ok'
            );
          }}
        >
          {spawnAtThreeDCursor
            ? 'New objects follow the 3D cursor: On'
            : 'New objects follow the 3D cursor: Off'}
          <span style={subStyle}>Turn off if you always want viewport-centered drops instead.</span>
        </button>

        <ActionButton
          title="Switch to 3D Cursor tool (click in the scene to place)"
          blenderHint="Shortcut: Shift+C"
          disabled={false}
          onClick={() => {
            useStore.getState().setActiveTool('cursor');
            showToast('3D Cursor tool — click the floor or a surface.', 'ok');
            close();
          }}
        />

        <p style={{ margin: '14px 0 0', fontSize: 10, color: '#64748b', textAlign: 'center' }}>
          Esc, click outside, or <span style={{ color: '#94a3b8' }}>Shift+S</span> again to close ·{' '}
          <span style={{ color: '#94a3b8' }}>.</span> cursor → selection · <span style={{ color: '#94a3b8' }}>Ctrl+.</span> selection → cursor ·{' '}
          <span style={{ color: '#94a3b8' }}>Ctrl+,</span> world/local gizmo ·{' '}
          <span style={{ color: '#94a3b8' }}>Ctrl+Shift+H</span> isolate · <span style={{ color: '#94a3b8' }}>Home</span> frame
        </p>
        <p
          style={{
            margin: '10px 0 0',
            fontSize: 10,
            color: '#64748b',
            textAlign: 'center',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '4px 8px',
          }}
        >
          <button
            type="button"
            onClick={() => {
              document.dispatchEvent(new CustomEvent('novira:open-shortcuts', { detail: { scrollToId: 'nudge' } }));
              useStore.getState().setSnapCursorMenuOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: 10,
              textDecoration: 'underline',
              fontFamily: 'inherit',
            }}
          >
            Nudge & transform
          </button>
          <span style={{ color: '#475569', userSelect: 'none' }} aria-hidden>·</span>
          <button
            type="button"
            onClick={() => {
              document.dispatchEvent(new CustomEvent('novira:open-shortcuts', { detail: { scrollToId: 'camera' } }));
              useStore.getState().setSnapCursorMenuOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: 10,
              textDecoration: 'underline',
              fontFamily: 'inherit',
            }}
          >
            Camera & frame
          </button>
          <span style={{ color: '#475569', userSelect: 'none' }} aria-hidden>·</span>
          <button
            type="button"
            onClick={() => {
              document.dispatchEvent(new CustomEvent('novira:open-shortcuts', { detail: { scrollToId: 'cursor' } }));
              useStore.getState().setSnapCursorMenuOpen(false);
            }}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              color: '#38bdf8',
              fontWeight: 600,
              fontSize: 10,
              textDecoration: 'underline',
              fontFamily: 'inherit',
            }}
          >
            3D cursor keys
          </button>
        </p>
      </div>
    </div>
  );
}
