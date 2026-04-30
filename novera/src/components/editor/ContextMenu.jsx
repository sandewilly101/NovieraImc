import React, { useEffect, useRef } from 'react';
import useStore from '../../store/useStore';

export default function ContextMenu({ x, y, onClose }) {
  const ref = useRef(null);
  const selectedId = useStore(s => s.selectedId);
  const selectedIds = useStore(s => s.selectedIds);
  const objects = useStore(s => s.objects);
  const hasSelection = selectedId || selectedIds.length > 0;
  const multiCount = selectedIds.length > 1 ? selectedIds.length : 0;
  const clipboard = useStore(s => s.clipboard);
  const isolateActive = useStore((s) => s.isolateActive);
  const selected = objects.find(o => o.id === selectedId);

  useEffect(() => {
    const handle = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [onClose]);

  const act = (fn) => { fn(); onClose(); };

  const items = [];

  if (hasSelection) {
    items.push({ label: `Duplicate${multiCount ? ` (${multiCount})` : ''}`, key: 'Ctrl+D', action: () => act(() => useStore.getState().duplicateSelected()) });
    items.push({ label: 'Copy', key: 'Ctrl+C', action: () => act(() => useStore.getState().copySelected()) });
    items.push({
      label: 'Frame camera on selection',
      key: 'Home',
      action: () => act(() => useStore.getState().frameCameraViewport('selection')),
    });
    items.push({
      label: isolateActive ? 'Exit isolate (show scene)' : 'Isolate selection',
      key: 'Ctrl+Shift+H',
      action: () => act(() => useStore.getState().toggleIsolateSelected()),
    });
    items.push({ label: 'Show every object', action: () => act(() => useStore.getState().showAllSceneObjects()) });
    items.push({ type: 'sep' });
    if (selected) {
      items.push({ label: selected.hidden ? 'Show' : 'Hide', action: () => act(() => useStore.getState().toggleObjectVisibility(selectedId)) });
      items.push({ label: selected.locked ? 'Unlock' : 'Lock', action: () => act(() => useStore.getState().toggleObjectLock(selectedId)) });
      items.push({ type: 'sep' });
    }
    if (multiCount >= 2) {
      items.push({ label: 'Align Left (X)', action: () => act(() => useStore.getState().alignObjects('x', 'min')) });
      items.push({ label: 'Align Center (X)', action: () => act(() => useStore.getState().alignObjects('x', 'center')) });
      items.push({ label: 'Align to Floor', action: () => act(() => useStore.getState().alignObjects('y', 'min')) });
      if (multiCount >= 3) {
        items.push({ label: 'Distribute X', action: () => act(() => useStore.getState().distributeObjects('x')) });
        items.push({ label: 'Distribute Z', action: () => act(() => useStore.getState().distributeObjects('z')) });
      }
      items.push({ type: 'sep' });
    }
    if (multiCount >= 2) {
      items.push({ label: 'Group', key: 'Ctrl+G', action: () => act(() => useStore.getState().groupSelected()) });
    }
    if (selected?.type === 'group') {
      items.push({ label: 'Ungroup', key: 'Ctrl+Shift+G', action: () => act(() => useStore.getState().ungroupSelected()) });
    }
    items.push({ type: 'sep' });
    items.push({ label: `Delete${multiCount ? ` (${multiCount})` : ''}`, key: 'Del', danger: true, action: () => act(() => useStore.getState().deleteSelected()) });
  } else {
    items.push({ label: 'Add Cube', action: () => act(() => useStore.getState().addObject({ name: 'Cube', type: 'primitive', geo: 'box', color: '#e2e8f0', dimensions: [1, 1, 1] })) });
    items.push({ label: 'Add Sphere', action: () => act(() => useStore.getState().addObject({ name: 'Sphere', type: 'primitive', geo: 'sphere', color: '#e2e8f0', dimensions: [1, 1, 1] })) });
    items.push({ label: 'Add Light', action: () => act(() => useStore.getState().addObject({ name: 'Point Light', type: 'light', lightType: 'point', color: '#ffffff', intensity: 2, distance: 15, dimensions: [0.3, 0.3, 0.3], position: [0, 3, 0] })) });
    items.push({ type: 'sep' });
    if (clipboard?.length) {
      items.push({ label: `Paste (${clipboard.length})`, key: 'Ctrl+V', action: () => act(() => useStore.getState().pasteClipboard()) });
      items.push({ type: 'sep' });
    }
    items.push({ label: 'Select All', key: 'Ctrl+A', action: () => act(() => useStore.getState().selectAll()) });
  }

  items.push({ type: 'sep' });
  items.push({
    label: 'Keyboard shortcuts…',
    key: '?',
    action: () => act(() => {
      document.dispatchEvent(
        new CustomEvent('novira:open-shortcuts', {
          detail: { scrollToId: hasSelection ? 'nudge' : 'cursor' },
        })
      );
    }),
  });

  const menuW = 200, menuH = items.length * 30;
  const adjX = x + menuW > window.innerWidth ? x - menuW : x;
  const adjY = y + menuH > window.innerHeight ? y - menuH : y;

  return (
    <div
      ref={ref}
      className="studio-context-menu"
      style={{
        position: 'fixed', left: adjX, top: adjY, zIndex: 10000,
        background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '4px 0', minWidth: 200,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      {items.map((item, i) => item.type === 'sep' ? (
        <div key={i} className="studio-ctx-sep" style={{ height: 1, background: '#f1f5f9', margin: '3px 8px' }} />
      ) : (
        <div
          key={i}
          className={`studio-ctx-row${item.danger ? ' studio-ctx-row--danger' : ''}`}
          onClick={item.action}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '6px 12px', cursor: 'pointer', fontSize: 11,
            color: item.danger ? '#ef4444' : '#334155',
            transition: 'background 0.12s',
          }}
        >
          <span>{item.label}</span>
          {item.key && <kbd className="studio-ctx-kbd" style={{ fontSize: 9, color: '#94a3b8', background: '#f8fafc', padding: '1px 4px', borderRadius: 3, border: '1px solid #e2e8f0' }}>{item.key}</kbd>}
        </div>
      ))}
    </div>
  );
}
