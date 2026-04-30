import React, { useState, useMemo } from 'react';
import useStore from '../../store/useStore';

const FONT = "'Poppins', sans-serif";

const PATTERNS = [
  { id: 'linear', label: 'Linear', icon: '⟶', desc: 'Along one axis' },
  { id: 'grid', label: 'Grid', icon: '⊞', desc: 'XZ plane grid' },
  { id: 'radial', label: 'Radial', icon: '◎', desc: 'Around center' },
  { id: 'stack', label: 'Stack', icon: '⊡', desc: 'Vertical stack' },
];

export default function ArrayTool({ onClose }) {
  const selectedId = useStore(s => s.selectedId);
  const objects = useStore(s => s.objects);
  const addObject = useStore(s => s.addObject);

  const selected = objects.find(o => o.id === selectedId);

  const [pattern, setPattern] = useState('linear');
  const [count, setCount] = useState(5);
  const [axis, setAxis] = useState('x');
  const [spacing, setSpacing] = useState(1.5);
  const [gridCols, setGridCols] = useState(3);
  const [radius, setRadius] = useState(3);

  const preview = useMemo(() => {
    if (!selected) return [];
    const sp = selected.position || [0, 0, 0];
    const items = [];

    if (pattern === 'linear') {
      const axIdx = axis === 'x' ? 0 : axis === 'y' ? 1 : 2;
      for (let i = 1; i <= count; i++) {
        const pos = [...sp];
        pos[axIdx] += spacing * i;
        items.push(pos);
      }
    } else if (pattern === 'grid') {
      let idx = 0;
      for (let r = 0; r < Math.ceil(count / gridCols); r++) {
        for (let c = 0; c < gridCols && idx < count; c++, idx++) {
          items.push([sp[0] + c * spacing, sp[1], sp[2] + r * spacing]);
        }
      }
    } else if (pattern === 'radial') {
      for (let i = 0; i < count; i++) {
        const angle = (2 * Math.PI * i) / count;
        items.push([
          sp[0] + Math.cos(angle) * radius,
          sp[1],
          sp[2] + Math.sin(angle) * radius,
        ]);
      }
    } else if (pattern === 'stack') {
      for (let i = 1; i <= count; i++) {
        items.push([sp[0], sp[1] + spacing * i, sp[2]]);
      }
    }

    return items;
  }, [selected, pattern, count, axis, spacing, gridCols, radius]);

  const execute = () => {
    if (!selected) return;
    preview.forEach(pos => {
      addObject({
        ...selected,
        id: `obj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: `${selected.name || 'Object'} Clone`,
        position: pos,
      });
    });
    onClose?.();
  };

  if (!selected || selected.type === 'ground') {
    return (
      <div style={{ padding: 16, textAlign: 'center', color: '#94a3b8', fontSize: 11, fontFamily: FONT }}>
        Select an object to use Array Tool
      </div>
    );
  }

  return (
    <div style={{ padding: 12, fontFamily: FONT }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#0f172a' }}>Array / Clone</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>×</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 10 }}>
        {PATTERNS.map(p => (
          <button
            key={p.id}
            onClick={() => setPattern(p.id)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              padding: '6px 4px', borderRadius: 6, cursor: 'pointer',
              background: pattern === p.id ? '#eff6ff' : '#f8fafc',
              border: `1px solid ${pattern === p.id ? '#3b82f6' : '#e2e8f0'}`,
              fontSize: 8, color: pattern === p.id ? '#3b82f6' : '#64748b',
            }}
          >
            <span style={{ fontSize: 14 }}>{p.icon}</span>
            <span style={{ fontWeight: 500 }}>{p.label}</span>
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontSize: 10, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Count</span>
          <input type="number" min="1" max="50" value={count} onChange={e => setCount(parseInt(e.target.value) || 1)}
            style={{ width: 50, fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 6px', textAlign: 'right', fontFamily: 'monospace' }}
          />
        </label>
        <label style={{ fontSize: 10, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Spacing</span>
          <input type="number" step="0.1" value={spacing} onChange={e => setSpacing(parseFloat(e.target.value) || 1)}
            style={{ width: 50, fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 6px', textAlign: 'right', fontFamily: 'monospace' }}
          />
        </label>

        {pattern === 'linear' && (
          <div style={{ display: 'flex', gap: 4 }}>
            {['x', 'y', 'z'].map(a => (
              <button key={a} onClick={() => setAxis(a)}
                style={{
                  flex: 1, padding: '4px', borderRadius: 4, cursor: 'pointer',
                  background: axis === a ? (a === 'x' ? '#fef2f2' : a === 'y' ? '#f0fdf4' : '#eff6ff') : '#f8fafc',
                  border: `1px solid ${axis === a ? (a === 'x' ? '#ef4444' : a === 'y' ? '#22c55e' : '#3b82f6') : '#e2e8f0'}`,
                  color: axis === a ? (a === 'x' ? '#ef4444' : a === 'y' ? '#22c55e' : '#3b82f6') : '#94a3b8',
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                }}
              >{a}</button>
            ))}
          </div>
        )}

        {pattern === 'grid' && (
          <label style={{ fontSize: 10, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Columns</span>
            <input type="number" min="1" max="20" value={gridCols} onChange={e => setGridCols(parseInt(e.target.value) || 1)}
              style={{ width: 50, fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 6px', textAlign: 'right', fontFamily: 'monospace' }}
            />
          </label>
        )}

        {pattern === 'radial' && (
          <label style={{ fontSize: 10, color: '#475569', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Radius</span>
            <input type="number" step="0.5" min="0.5" value={radius} onChange={e => setRadius(parseFloat(e.target.value) || 1)}
              style={{ width: 50, fontSize: 10, border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 6px', textAlign: 'right', fontFamily: 'monospace' }}
            />
          </label>
        )}
      </div>

      <div style={{ marginTop: 8, fontSize: 9, color: '#94a3b8', textAlign: 'center' }}>
        Will create {preview.length} clone{preview.length !== 1 ? 's' : ''} of "{selected.name || 'Object'}"
      </div>

      <button
        onClick={execute}
        style={{
          width: '100%', marginTop: 8, padding: '8px', borderRadius: 6, cursor: 'pointer',
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
          border: 'none', fontSize: 11, fontWeight: 600, fontFamily: FONT,
        }}
      >
        Apply Array ({preview.length} objects)
      </button>
    </div>
  );
}
