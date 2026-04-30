import React, { useState } from 'react';
import useStore from '../../store/useStore';

const Toggle = ({ label, value, onChange }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '5px 0',
  }}>
    <span style={{ fontSize: 11, color: '#334155', fontFamily: "'Poppins', sans-serif" }}>{label}</span>
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 32, height: 18, borderRadius: 9, border: 'none',
        background: value ? '#3b82f6' : '#cbd5e1',
        cursor: 'pointer', position: 'relative',
        transition: 'background 0.15s',
      }}
    >
      <div style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff',
        position: 'absolute', top: 2,
        left: value ? 16 : 2,
        transition: 'left 0.15s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
      }} />
    </button>
  </div>
);

export default function ViewportOverlays({ show, onClose, anchorRef }) {
  const gridVisible = useStore(s => s.gridVisible);
  const setGridVisible = useStore(s => s.setGridVisible);
  const environmentVisible = useStore(s => s.environmentVisible);
  const setEnvironmentVisible = useStore(s => s.setEnvironmentVisible);
  const lightingEnabled = useStore(s => s.lightingEnabled);
  const setLightingEnabled = useStore(s => s.setLightingEnabled);
  const wireframe = useStore(s => s.wireframe);
  const setWireframe = useStore(s => s.setWireframe);

  if (!show) return null;

  return (
    <div
      style={{
        position: 'absolute', top: 40, right: 12, zIndex: 100,
        background: '#fff', borderRadius: 10,
        boxShadow: '0 8px 30px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
        padding: '12px 14px', minWidth: 180,
        fontFamily: "'Poppins', sans-serif",
      }}
    >
      <div style={{
        fontSize: 10, fontWeight: 600, color: '#0f172a',
        marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span>Viewport Overlays</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 14 }}>×</button>
      </div>
      <Toggle label="Grid" value={gridVisible !== false} onChange={v => setGridVisible(v)} />
      <Toggle label="Environment" value={environmentVisible !== false} onChange={v => setEnvironmentVisible(v)} />
      <Toggle label="Wireframe" value={!!wireframe} onChange={v => setWireframe?.(v)} />
    </div>
  );
}
