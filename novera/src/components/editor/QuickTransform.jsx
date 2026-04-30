import React, { useState, useEffect, useRef } from 'react';
import useStore from '../../store/useStore';

const AxisInput = ({ label, value, onChange, colorClass }) => {
  const [localVal, setLocalVal] = useState(value.toFixed(3));
  const inputRef = useRef(null);

  useEffect(() => {
    if (document.activeElement !== inputRef.current) {
      setLocalVal(value.toFixed(3));
    }
  }, [value]);

  return (
    <div className={`quick-transform-hud__axis quick-transform-hud__axis--${colorClass}`}>
      <span className="quick-transform-hud__axis-label">{label}</span>
      <input
        ref={inputRef}
        type="number"
        step="0.1"
        value={localVal}
        onChange={e => setLocalVal(e.target.value)}
        onBlur={() => {
          const n = parseFloat(localVal);
          if (!isNaN(n)) onChange(n);
        }}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            const n = parseFloat(localVal);
            if (!isNaN(n)) onChange(n);
            e.target.blur();
          }
        }}
        className="quick-transform-hud__input"
      />
    </div>
  );
};

export default function QuickTransform() {
  const selectedId = useStore(s => s.selectedId);
  const objects = useStore(s => s.objects);
  const updateObject = useStore(s => s.updateObject);
  const [mode, setMode] = useState('position');

  const obj = objects.find(o => o.id === selectedId);
  if (!obj || obj.type === 'ground') return null;

  const pos = obj.position || [0, 0, 0];
  const rot = obj.rotation || [0, 0, 0];
  const scl = obj.scale || [1, 1, 1];

  const data = mode === 'position' ? pos : mode === 'rotation' ? rot : scl;
  const title =
    mode === 'position' ? 'Position (m)' : mode === 'rotation' ? 'Rotation (deg)' : 'Scale';

  const update = (idx, val) => {
    const arr = [...data];
    arr[idx] = val;
    updateObject(selectedId, { [mode]: arr });
  };

  const toDeg = (r) => (r * 180 / Math.PI);
  const toRad = (d) => (d * Math.PI / 180);

  const displayData = mode === 'rotation' ? data.map(toDeg) : data;
  const commitFn = mode === 'rotation'
    ? (idx, deg) => update(idx, toRad(deg))
    : update;

  return (
    <div className="quick-transform-hud" title={title}>
      <div className="quick-transform-hud__modes" role="tablist" aria-label="Transform component">
        {['position', 'rotation', 'scale'].map(m => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`quick-transform-hud__mode ${mode === m ? 'is-active' : ''}`}
            onClick={() => setMode(m)}
          >
            {m[0].toUpperCase()}
          </button>
        ))}
      </div>
      <div className="quick-transform-hud__divider" aria-hidden />
      <AxisInput label="X" value={displayData[0]} onChange={v => commitFn(0, v)} colorClass="x" />
      <AxisInput label="Y" value={displayData[1]} onChange={v => commitFn(1, v)} colorClass="y" />
      <AxisInput label="Z" value={displayData[2]} onChange={v => commitFn(2, v)} colorClass="z" />
    </div>
  );
}
