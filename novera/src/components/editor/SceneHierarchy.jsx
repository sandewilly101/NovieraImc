import React, { useState, useRef, useCallback } from 'react';
import useStore from '../../store/useStore';
import {
  EyeIcon, EyeSlashIcon, LockClosedIcon, LockOpenIcon,
  TrashIcon, DocumentDuplicateIcon, ChevronDownIcon, ChevronRightIcon,
} from '@heroicons/react/24/outline';

const iconSm = { width: 12, height: 12 };
const FONT = "'Poppins', sans-serif";

const OBJ_ICONS = {
  primitive: '▣', light: '◈', gltf: '◆', sketchfab: '◇', ground: '▬',
};

function HierarchyItem({ obj, depth = 0, children: childNodes }) {
  const selectedId = useStore(s => s.selectedId);
  const selectedIds = useStore(s => s.selectedIds);
  const hiddenObjectIds = useStore(s => s.hiddenObjectIds);
  const lockedObjectIds = useStore(s => s.lockedObjectIds);
  const setSelectedId = useStore(s => s.setSelectedId);
  const updateObject = useStore(s => s.updateObject);
  const removeObject = useStore(s => s.removeObject);

  const isSelected = selectedId === obj.id || selectedIds.includes(obj.id);
  const isHidden = hiddenObjectIds.includes(obj.id);
  const isLocked = lockedObjectIds.includes(obj.id);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState('');
  const [expanded, setExpanded] = useState(true);
  const [hovered, setHovered] = useState(false);
  const renameRef = useRef(null);

  const handleClick = useCallback((e) => {
    if (e.shiftKey) {
      useStore.getState().toggleMultiSelect(obj.id);
    } else {
      useStore.getState().deselectAll();
      setSelectedId(obj.id);
      useStore.getState().toggleMultiSelect(obj.id);
    }
  }, [obj.id, setSelectedId]);

  const handleDoubleClick = useCallback(() => {
    setRenameVal(obj.name || obj.type || 'Object');
    setIsRenaming(true);
    setTimeout(() => renameRef.current?.select(), 50);
  }, [obj.name, obj.type]);

  const commitRename = useCallback(() => {
    if (renameVal.trim()) updateObject(obj.id, { name: renameVal.trim() });
    setIsRenaming(false);
  }, [renameVal, obj.id, updateObject]);

  const hasChildren = childNodes && childNodes.length > 0;
  const icon = OBJ_ICONS[obj.type] || '◻';
  const name = obj.name || obj.type || 'Object';

  return (
    <div>
      <div
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          padding: '3px 6px', paddingLeft: 6 + depth * 14,
          borderRadius: 4, cursor: 'pointer',
          background: isSelected ? 'rgba(99,102,241,0.15)' : hovered ? 'rgba(0,0,0,0.02)' : 'transparent',
          border: `1px solid ${isSelected ? 'rgba(99,102,241,0.35)' : 'transparent'}`,
          transition: 'all 0.08s', minHeight: 26,
          opacity: isHidden ? 0.4 : 1,
        }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#94a3b8' }}
          >
            {expanded ? <ChevronDownIcon style={iconSm} /> : <ChevronRightIcon style={iconSm} />}
          </button>
        ) : (
          <span style={{ width: 12 }} />
        )}

        <span style={{ fontSize: 11, lineHeight: 1, color: obj.type === 'light' ? '#fbbf24' : '#64748b' }}>{icon}</span>

        {isRenaming ? (
          <input
            ref={renameRef}
            value={renameVal}
            onChange={e => setRenameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setIsRenaming(false); }}
            onClick={e => e.stopPropagation()}
            style={{
              flex: 1, fontSize: 10, fontFamily: FONT, color: '#1e293b',
              border: '1px solid #3b82f6', borderRadius: 3,
              padding: '1px 4px', background: '#fff', outline: 'none',
            }}
          />
        ) : (
          <span style={{
            flex: 1, fontSize: 10, fontFamily: FONT,
            color: isSelected ? '#3b82f6' : '#334155',
            fontWeight: isSelected ? 500 : 400,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {name}
          </span>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 2,
          opacity: hovered || isSelected ? 1 : 0,
          transition: 'opacity 0.1s',
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); useStore.getState().toggleObjectVisibility(obj.id); }}
            title={isHidden ? 'Show' : 'Hide'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', color: isHidden ? '#ef4444' : '#94a3b8' }}
          >
            {isHidden ? <EyeSlashIcon style={iconSm} /> : <EyeIcon style={iconSm} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); useStore.getState().toggleObjectLock(obj.id); }}
            title={isLocked ? 'Unlock' : 'Lock'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', color: isLocked ? '#f59e0b' : '#94a3b8' }}
          >
            {isLocked ? <LockClosedIcon style={iconSm} /> : <LockOpenIcon style={iconSm} />}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); useStore.getState().duplicateSelected(); }}
            title="Duplicate"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', color: '#94a3b8' }}
          >
            <DocumentDuplicateIcon style={iconSm} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); removeObject(obj.id); }}
            title="Delete"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 1, display: 'flex', color: '#ef4444' }}
          >
            <TrashIcon style={iconSm} />
          </button>
        </div>
      </div>

      {hasChildren && expanded && (
        <div>
          {childNodes.map(child => (
            <HierarchyItem key={child.id} obj={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SceneHierarchy() {
  const objects = useStore(s => s.objects);
  const selectedIds = useStore(s => s.selectedIds);
  const sceneObjects = objects.filter(o => o.type !== 'ground');
  const roots = sceneObjects.filter(o => !o.parentId);
  const childrenOf = (parentId) => sceneObjects.filter(o => o.parentId === parentId);

  if (sceneObjects.length === 0) return null;

  return (
    <div style={{ padding: '0 8px 12px' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 6, padding: '4px 6px',
      }}>
        <span style={{
          fontSize: 9, fontWeight: 600, color: '#334155', fontFamily: FONT,
        }}>
          Scene ({sceneObjects.length})
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {selectedIds.length > 1 && (
            <span style={{
              fontSize: 8, color: '#8b5cf6', fontFamily: FONT,
              background: 'rgba(139,92,246,0.1)', padding: '1px 6px', borderRadius: 3,
            }}>
              {selectedIds.length} selected
            </span>
          )}
          <button
            onClick={() => useStore.getState().selectAll()}
            style={{
              fontSize: 8, color: '#3b82f6', fontFamily: FONT, background: 'none',
              border: 'none', cursor: 'pointer', padding: 0,
            }}
            title="Select All (Ctrl+A)"
          >
            All
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: 1,
        background: '#fafbfc', borderRadius: 6,
        border: '1px solid #e8edf4', padding: '4px 2px',
        maxHeight: 280, overflowY: 'auto',
      }}>
        {roots.map(obj => (
          <HierarchyItem
            key={obj.id}
            obj={obj}
            childNodes={childrenOf(obj.id)}
          />
        ))}

        {sceneObjects.filter(o => o.parentId && !sceneObjects.find(p => p.id === o.parentId)).map(orphan => (
          <HierarchyItem key={orphan.id} obj={orphan} depth={0} />
        ))}
      </div>
    </div>
  );
}
