import React, { useState, useEffect, useRef, useMemo } from 'react';
import useStore from '../../store/useStore';

export default function SceneSearch({ onClose }) {
  const objects = useStore(s => s.objects);
  const setSelectedId = useStore(s => s.setSelectedId);
  const setCameraFocus = useStore(s => s.setCameraFocus);
  const [query, setQuery] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef(null);

  const sceneObjs = useMemo(() =>
    objects.filter(o => o.type !== 'ground'),
    [objects]
  );

  const results = useMemo(() => {
    if (!query.trim()) return sceneObjs;
    const q = query.toLowerCase();
    return sceneObjs.filter(o =>
      (o.name || '').toLowerCase().includes(q) ||
      (o.type || '').toLowerCase().includes(q) ||
      (o.geo || '').toLowerCase().includes(q)
    );
  }, [query, sceneObjs]);

  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const selectObj = (obj) => {
    setSelectedId(obj.id);
    if (obj.position) {
      setCameraFocus(obj.position, [
        obj.position[0] + 5,
        obj.position[1] + 3,
        obj.position[2] + 5,
      ]);
    }
    onClose?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter' && results[selectedIdx]) { selectObj(results[selectedIdx]); }
    else if (e.key === 'Escape') { onClose?.(); }
  };

  const typeIcons = { primitive: '▣', light: '◈', gltf: '◆', group: '◫' };

  return (
    <div
      className="studio-overlay-backdrop"
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(3px)',
        display: 'flex', justifyContent: 'center', paddingTop: '18vh',
      }}
      onClick={onClose}
    >
      <div
        className="studio-overlay-panel studio-scene-search"
        onClick={e => e.stopPropagation()}
        style={{
          width: 400, maxHeight: 340, background: '#fff', borderRadius: 12,
          boxShadow: '0 24px 80px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column',
          overflow: 'hidden', fontFamily: "'Poppins', sans-serif",
        }}
      >
        <div className="studio-overlay-header" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid #e2e8f0' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search objects in scene..."
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, fontFamily: "'Poppins', sans-serif", background: 'transparent' }}
          />
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{results.length} found</span>
        </div>

        <div className="studio-overlay-list" style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {results.length === 0 && (
            <div className="studio-overlay-empty" style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 11 }}>No objects found</div>
          )}
          {results.map((obj, i) => (
            <div
              key={obj.id}
              className={`studio-cp-row${i === selectedIdx ? ' is-selected' : ''}`}
              onClick={() => selectObj(obj)}
              onMouseEnter={() => setSelectedIdx(i)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 14px',
                cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 12, color: obj.type === 'light' ? '#fbbf24' : '#64748b' }}>
                {typeIcons[obj.type] || '◻'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, color: '#1e293b', fontWeight: i === selectedIdx ? 500 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {obj.name || obj.type || 'Object'}
                </div>
                <div style={{ fontSize: 8, color: '#94a3b8' }}>
                  {obj.type}{obj.geo ? ` / ${obj.geo}` : ''} — pos [{(obj.position || [0, 0, 0]).map(v => v.toFixed(1)).join(', ')}]
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
