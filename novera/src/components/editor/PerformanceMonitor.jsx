import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';

export default function PerformanceMonitor({ visible }) {
  const [fps, setFps] = useState(60);
  const [mem, setMem] = useState(0);
  const frameRef = useRef([]);
  const objects = useStore(s => s.objects);

  useEffect(() => {
    if (!visible) return;
    let rafId;
    let lastTime = performance.now();

    const tick = () => {
      const now = performance.now();
      frameRef.current.push(now);
      const cutoff = now - 1000;
      frameRef.current = frameRef.current.filter(t => t > cutoff);
      setFps(frameRef.current.length);

      if (performance.memory) {
        setMem(Math.round(performance.memory.usedJSHeapSize / 1048576));
      }
      lastTime = now;
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [visible]);

  if (!visible) return null;

  const sceneObjs = objects.filter(o => o.type !== 'ground');
  const lights = sceneObjs.filter(o => o.type === 'light').length;
  const meshes = sceneObjs.length - lights;
  const fpsColor = fps >= 50 ? '#22c55e' : fps >= 30 ? '#f59e0b' : '#ef4444';

  return (
    <div className="studio-perf-monitor" style={{
      position: 'absolute', top: 50, left: 8, zIndex: 40,
      background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)',
      borderRadius: 6, padding: '6px 10px',
      fontFamily: "'JetBrains Mono', monospace", fontSize: 9,
      color: '#94a3b8', minWidth: 110,
      border: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
        <span>FPS</span>
        <span style={{ color: fpsColor, fontWeight: 700, fontSize: 11 }}>{fps}</span>
      </div>
      {mem > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span>Memory</span>
          <span style={{ color: '#60a5fa' }}>{mem} MB</span>
        </div>
      )}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '3px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span>Objects</span><span style={{ color: '#e2e8f0' }}>{sceneObjs.length}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
        <span>Meshes</span><span style={{ color: '#e2e8f0' }}>{meshes}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Lights</span><span style={{ color: '#fbbf24' }}>{lights}</span>
      </div>
    </div>
  );
}
