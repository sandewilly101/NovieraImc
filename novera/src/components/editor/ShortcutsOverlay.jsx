import React, { useLayoutEffect, useRef } from 'react';

const SHORTCUTS = [
  { section: 'Studio', items: [
    { keys: 'Strip', desc: 'Design · Present · Cinema' },
    { keys: 'Esc', desc: 'Exit Cinema (return to Present)' },
  ]},
  { section: 'Export (Rendering tab)', items: [
    { keys: '—', desc: '4K still, WebM walkthrough, cubemap ZIP, equirect PNG' },
    { keys: '—', desc: 'Technical sheet (browser print / PDF)' },
    { keys: 'WebXR', desc: 'Immersive VR when the browser reports support' },
  ]},
  { section: 'Navigation', items: [
    { keys: 'Ctrl+K', desc: 'Command Palette' },
    { keys: 'F3', desc: 'Search Commands' },
    { keys: 'F', desc: 'Focus on Selected' },
    { keys: 'Esc', desc: 'Deselect / Cancel' },
  ]},
  { section: 'Floor plan (Novira)', items: [
    { keys: 'View menu', desc: '2D plan, trace, rect/arc picks, openings (door/window), room tools, terrain/roof preview' },
    { keys: 'Ctrl+K', desc: 'Commands: trace, door/window on wall, terrain strip, roof slabs, templates, room zones' },
    { keys: '—', desc: 'Trace image under plan; per-story opacity; sync to 3D cuts door/window holes in walls' },
    { keys: '—', desc: 'Rectangle room: two-click corners; optional insert walls immediately after pick' },
    { keys: 'Esc', desc: 'Cancel arc center pick, rectangle corner pick, or planner draw modes' },
  ]},
  { section: 'Tools', items: [
    { keys: 'G', desc: 'Move Tool' },
    { keys: 'R', desc: 'Rotate Tool' },
    { keys: 'S', desc: 'Scale Tool' },
    { keys: 'X / Y / Z', desc: 'Lock Axis' },
    { keys: 'Ctrl+,', desc: 'World vs Local transform gizmo (room axes vs object axes)' },
  ]},
  { section: 'Nudge (selection)', scrollId: 'nudge', items: [
    { keys: 'Alt + ← →', desc: 'Nudge −X / +X (25 cm; add Shift for 5 cm)' },
    { keys: 'Alt + ↑ ↓', desc: 'Nudge +Z / −Z in world space' },
    { keys: 'Alt + PgUp / PgDn', desc: 'Nudge +Y / −Y' },
    { keys: 'Snap on', desc: '25 cm nudges snap to grid; Shift+fine nudges do not' },
    { keys: 'Ctrl+Z · Ctrl+Y · Ctrl+Shift+Z', desc: 'Undo / redo last nudge as one step (multi-select); Cmd+Z / Cmd+Shift+Z on Mac; then per-object history' },
  ]},
  { section: '3D Cursor', scrollId: 'cursor', items: [
    { keys: 'Shift+S', desc: 'Open or close the Cursor & placement menu (Blender-style, simplified)' },
    { keys: 'Shift+C', desc: '3D Cursor tool — click floor or surfaces to place the cursor' },
    { keys: '.', desc: '3D cursor → active selection' },
    { keys: 'Ctrl+.', desc: 'Selection → 3D cursor (keeps spacing between objects)' },
    { keys: 'Snap on', desc: '3D cursor snaps to a 25 cm grid when placing' },
  ]},
  { section: 'Visibility', items: [
    { keys: 'Ctrl+Shift+H', desc: 'Isolate selection (again to show scene) — also in right-click menu' },
    { keys: 'Shift+S menu', desc: 'Show every object — clears all hides' },
  ]},
  { section: 'Camera', scrollId: 'camera', items: [
    { keys: 'Home', desc: 'Frame on selection — live bounds in 3D; metadata preset when plan-only layout' },
    { keys: 'Shift+Home', desc: 'Frame on whole scene — same rules as Home' },
  ]},
  { section: 'Edit', scrollId: 'edit', items: [
    { keys: 'Ctrl+C', desc: 'Copy' },
    { keys: 'Ctrl+V', desc: 'Paste' },
    { keys: 'Ctrl+D', desc: 'Duplicate' },
    { keys: 'Del', desc: 'Delete' },
    { keys: 'Ctrl+A', desc: 'Select All' },
    { keys: 'Ctrl+Z / Cmd+Z', desc: 'Undo' },
    { keys: 'Ctrl+Y', desc: 'Redo' },
    { keys: 'Ctrl+Shift+Z / Cmd+Shift+Z', desc: 'Redo (macOS-style; same stack as Ctrl+Y)' },
  ]},
  { section: 'Selection', items: [
    { keys: 'Shift+Click', desc: 'Multi-Select' },
    { keys: 'Right-Click', desc: 'Context Menu' },
    { keys: 'Double-Click', desc: 'Rename in Hierarchy' },
    { keys: 'Ctrl+G', desc: 'Group Selected' },
    { keys: 'Ctrl+Shift+G', desc: 'Ungroup' },
  ]},
  { section: 'View Presets', items: [
    { keys: '1', desc: 'Front View' },
    { keys: '3', desc: 'Right View' },
    { keys: '7', desc: 'Top View' },
    { keys: '5', desc: 'Home / Perspective' },
    { keys: '9', desc: 'Bottom View' },
  ]},
  { section: 'File', items: [
    { keys: 'Ctrl+S', desc: 'Save Project' },
    { keys: 'Ctrl+Shift+S', desc: 'Screenshot' },
    { keys: 'Ctrl+E', desc: 'Export Scene (GLB/GLTF)' },
    { keys: 'Ctrl+Shift+F', desc: 'Search Objects in Scene' },
  ]},
];

export default function ShortcutsOverlay({ onClose, scrollToId = null }) {
  const bodyRef = useRef(null);

  useLayoutEffect(() => {
    if (!scrollToId || !bodyRef.current) return;
    const el = bodyRef.current.querySelector(`[data-shortcuts-section="${scrollToId}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    }
  }, [scrollToId]);

  return (
    <div
      className="studio-overlay-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
      }}
      onClick={onClose}
    >
      <div
        className="studio-overlay-panel studio-shortcuts-overlay"
        onClick={e => e.stopPropagation()}
        style={{
          width: 480, maxHeight: '75vh', overflow: 'auto',
          background: '#fff', borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)',
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div className="studio-overlay-header" style={{
          padding: '16px 20px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>Keyboard Shortcuts</span>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 18, color: '#94a3b8', lineHeight: 1,
          }}>×</button>
        </div>

        <div
          ref={bodyRef}
          className="studio-shortcuts-body"
          style={{ padding: '12px 20px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}
        >
          {SHORTCUTS.map(section => (
            <div
              key={section.section}
              className="studio-shortcuts-section"
              data-shortcuts-section={section.scrollId || undefined}
            >
              <div className="studio-shortcuts-section-title" style={{
                fontSize: 10, fontWeight: 600, color: '#3b82f6',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                marginBottom: 6,
              }}>
                {section.section}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {section.items.map(item => (
                  <div key={`${section.section}-${item.keys}-${item.desc}`} className="studio-shortcuts-row" style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '4px 8px', borderRadius: 4,
                  }}>
                    <span style={{ fontSize: 11, color: '#475569' }}>{item.desc}</span>
                    <kbd style={{
                      fontSize: 10, color: '#64748b', background: '#f1f5f9',
                      padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0',
                      fontFamily: 'monospace',
                    }}>{item.keys}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
