import React from 'react';
import useStore from '../../store/useStore';

const CY = 1.5;
const D = 12;

/**
 * Blender-like viewport axis navigator (top-right): round heads with +/- axis snaps.
 * DOM-based so we avoid the double-render HUD bug seen with Drei GizmoHelper.
 */
export default function ViewportAxisNavDom() {
  const enabled = useStore((s) => s.viewportAxisGizmoEnabled !== false);
  const walk = useStore((s) => s.viewportNavMode === 'walk');
  const setCameraFocus = useStore((s) => s.setCameraFocus);

  if (!enabled || walk) return null;

  const snap = (pos) => setCameraFocus([0, CY, 0], pos);

  const HEAD = {
    x: '#ef4444',
    y: '#22c55e',
    z: '#3b82f6',
    neg: '#475569',
  };

  const axisHead = (label, color, pos, title, small = false) => (
    <button
      key={title}
      type="button"
      title={title}
      aria-label={title}
      onClick={() => snap(pos)}
      style={{
        width: small ? 18 : 26,
        height: small ? 18 : 26,
        borderRadius: '50%',
        border: '1px solid rgba(255,255,255,0.2)',
        background: small
          ? `linear-gradient(160deg, ${color}cc, ${color}88)`
          : `linear-gradient(160deg, ${color}ff, ${color}bf)`,
        color: '#e2e8f0',
        fontFamily: "'Inter', system-ui, sans-serif",
        fontSize: small ? 9 : 11,
        fontWeight: 800,
        lineHeight: 1,
        padding: 0,
        cursor: 'pointer',
        boxShadow: small
          ? '0 1px 4px rgba(0,0,0,0.45)'
          : '0 2px 8px rgba(0,0,0,0.5)',
      }}
    >
      {label}
    </button>
  );

  return (
    <div
      className="viewport-axis-nav-dom"
      style={{
        position: 'absolute',
        right: 14,
        top: 58,
        zIndex: 52,
        width: 90,
        height: 90,
        pointerEvents: 'auto',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 18,
          borderRadius: '50%',
          border: '1px solid rgba(148,163,184,0.34)',
          background: 'radial-gradient(circle at 32% 28%, rgba(30,41,59,0.72), rgba(15,23,42,0.9))',
          boxShadow: 'inset 0 0 10px rgba(0,0,0,0.35), 0 4px 18px rgba(0,0,0,0.25)',
        }}
      />

      <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)' }}>
        {axisHead('Y', HEAD.y, [0, D, 0.001], 'Top (+Y)')}
      </div>
      <div style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)' }}>
        {axisHead('X', HEAD.x, [D, CY, 0], 'Right (+X)')}
      </div>
      <div style={{ position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)' }}>
        {axisHead('-Y', HEAD.neg, [0, -D, 0.001], 'Bottom (-Y)', true)}
      </div>
      <div style={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)' }}>
        {axisHead('-X', HEAD.neg, [-D, CY, 0], 'Left (-X)', true)}
      </div>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        {axisHead('Z', HEAD.z, [0, CY, D], 'Front (+Z)')}
      </div>
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(calc(-50% - 16px), calc(-50% + 16px))',
        }}
      >
        {axisHead('-Z', HEAD.neg, [0, CY, -D], 'Back (-Z)', true)}
      </div>
    </div>
  );
}
