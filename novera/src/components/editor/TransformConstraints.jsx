import React from 'react';
import useStore from '../../store/useStore';

const AXES = [
  { id: 'x', label: 'X', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
  { id: 'y', label: 'Y', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  { id: 'z', label: 'Z', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
];

export default function TransformConstraints() {
  const activeTool = useStore(s => s.activeTool);
  const selectedId = useStore(s => s.selectedId);
  const axisConstraint = useStore(s => s.axisConstraint);
  const setAxisConstraint = useStore(s => s.setAxisConstraint);

  const showFor = ['move', 'rotate', 'scale'];
  if (!showFor.includes(activeTool) || !selectedId) return null;

  return (
    <div className="transform-constraints-hud transform-constraints-hud--tl">
      <div className="transform-constraints-hud__title">Axis lock</div>
      {AXES.map(a => {
        const active = axisConstraint === a.id;
        return (
          <button
            key={a.id}
            type="button"
            className={`transform-constraints-hud__axis transform-constraints-hud__axis--${a.id} ${active ? 'is-active' : ''}`}
            onClick={() => setAxisConstraint(a.id)}
          >
            {a.label}
          </button>
        );
      })}
      {axisConstraint && (
        <button type="button" className="transform-constraints-hud__free" onClick={() => setAxisConstraint(null)}>
          Free
        </button>
      )}
    </div>
  );
}
