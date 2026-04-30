import React, { useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

let GLTFExporter = null;

async function getExporter() {
  if (!GLTFExporter) {
    const mod = await import('three/examples/jsm/exporters/GLTFExporter.js');
    GLTFExporter = mod.GLTFExporter;
  }
  return new GLTFExporter();
}

export function ExportTrigger() {
  const { scene } = useThree();

  React.useEffect(() => {
    const handler = async (e) => {
      const format = e.detail?.format || 'glb';
      try {
        const exporter = await getExporter();
        const options = {
          binary: format === 'glb',
          onlyVisible: true,
          includeCustomExtensions: false,
        };

        exporter.parse(
          scene,
          (result) => {
            const blob = format === 'glb'
              ? new Blob([result], { type: 'application/octet-stream' })
              : new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `novira-scene.${format}`;
            a.click();
            URL.revokeObjectURL(url);

            document.dispatchEvent(new CustomEvent('novira:export-done', { detail: { success: true } }));
          },
          (error) => {
            console.error('Export failed:', error);
            document.dispatchEvent(new CustomEvent('novira:export-done', { detail: { success: false, error: error.message } }));
          },
          options
        );
      } catch (err) {
        console.error('Export error:', err);
      }
    };

    document.addEventListener('novira:export-scene', handler);
    return () => document.removeEventListener('novira:export-scene', handler);
  }, [scene]);

  return null;
}

export default function SceneExportPanel({ onClose, prefill }) {
  const [format, setFormat] = useState('glb');
  const [exporting, setExporting] = useState(false);
  const directorQueue = Array.isArray(prefill?.directorQueue) ? prefill.directorQueue : [];
  const directorMeta = prefill?.directorMeta || null;

  const doExport = () => {
    setExporting(true);
    const done = () => { setExporting(false); onClose?.(); };
    document.addEventListener('novira:export-done', done, { once: true });
    document.dispatchEvent(new CustomEvent('novira:export-scene', { detail: { format } }));
    setTimeout(() => { setExporting(false); }, 5000);
  };

  const downloadDirectorQueue = () => {
    if (!directorQueue.length) return;
    const payload = {
      type: 'novira-director-render-queue',
      version: 1,
      createdAt: new Date().toISOString(),
      meta: directorMeta || {},
      shots: directorQueue,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novira-shot-queue-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ padding: 14, fontFamily: "'Poppins', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a' }}>Export Scene</span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 16 }}>×</button>
      </div>

      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 10 }}>
        Export your 3D scene for use in other tools (Blender, Unity, Unreal, web).
      </div>
      {directorQueue.length > 0 && (
        <div style={{ marginBottom: 10, padding: 8, borderRadius: 8, background: '#eff6ff', border: '1px solid #bfdbfe' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#1d4ed8', marginBottom: 4 }}>
            Director Queue Ready ({directorQueue.length} shots)
          </div>
          <div style={{ fontSize: 9, color: '#475569', marginBottom: 6 }}>
            {directorMeta?.fps ? `${directorMeta.fps} fps` : 'FPS n/a'} · {directorMeta?.durationSec ? `${directorMeta.durationSec}s` : 'Duration n/a'}
          </div>
          <div style={{ maxHeight: 110, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {directorQueue.map((shot) => (
              <div key={shot.id} style={{ fontSize: 9, color: '#334155' }}>
                {shot.name}: {shot.frameStart}-{shot.frameEnd}
              </div>
            ))}
          </div>
          <button
            onClick={downloadDirectorQueue}
            style={{
              width: '100%',
              marginTop: 8,
              padding: '8px',
              borderRadius: 7,
              cursor: 'pointer',
              background: '#dbeafe',
              color: '#1e40af',
              border: '1px solid #93c5fd',
              fontSize: 10,
              fontWeight: 600,
              fontFamily: "'Poppins', sans-serif",
            }}
          >
            Download Shot Queue (.json)
          </button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[
          { id: 'glb', label: 'GLB (Binary)', desc: 'Compact, single file' },
          { id: 'gltf', label: 'GLTF (JSON)', desc: 'Human-readable' },
        ].map(f => (
          <button
            key={f.id}
            onClick={() => setFormat(f.id)}
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '10px 8px', borderRadius: 8, cursor: 'pointer',
              background: format === f.id ? '#eff6ff' : '#f8fafc',
              border: `1.5px solid ${format === f.id ? '#3b82f6' : '#e2e8f0'}`,
              fontSize: 10, color: format === f.id ? '#2563eb' : '#64748b',
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 11 }}>{f.label}</span>
            <span style={{ fontSize: 8, color: '#94a3b8' }}>{f.desc}</span>
          </button>
        ))}
      </div>

      <button
        onClick={doExport}
        disabled={exporting}
        style={{
          width: '100%', padding: '10px', borderRadius: 8, cursor: exporting ? 'wait' : 'pointer',
          background: exporting ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6, #6366f1)',
          color: '#fff', border: 'none', fontSize: 11, fontWeight: 600,
          fontFamily: "'Poppins', sans-serif",
        }}
      >
        {exporting ? 'Exporting...' : `Export as .${format}`}
      </button>

      <div style={{ marginTop: 10, fontSize: 8, color: '#94a3b8', textAlign: 'center' }}>
        GLB files work in Blender, Unity, Unreal Engine, Three.js, and web browsers.
      </div>
    </div>
  );
}
