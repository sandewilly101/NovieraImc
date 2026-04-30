import React, { useEffect, useState, useCallback } from 'react';
import { getPlannerReduxStore } from '../../utils/plannerReduxBridge';

const RULER = 15;

/**
 * Renders imported plan image under the planner UI, using the same 2D affine as react-svg-pan-zoom.
 */
export default function PlannerFloatingTraceOverlay({ plannerStore, viewportWidth, viewportHeight, trace }) {
  const [, setTick] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!plannerStore) return undefined;
    let raf = 0;
    const sub = plannerStore.subscribe(() => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        bump();
      });
    });
    return () => {
      if (raf) window.cancelAnimationFrame(raf);
      sub();
    };
  }, [plannerStore, bump]);

  if (!trace?.src || !plannerStore || viewportWidth < RULER + 8 || viewportHeight < RULER + 8) {
    return null;
  }

  const ps = plannerStore.getState().get('react-planner');
  if (!ps) return null;
  const scene = ps.get('scene');
  const sceneW = Number(scene?.get('width')) || 0;
  const sceneH = Number(scene?.get('height')) || 0;
  if (sceneW <= 0 || sceneH <= 0) return null;

  const v2d = ps.get('viewer2D');
  const m = v2d && typeof v2d.size === 'number' && v2d.size > 0 ? v2d.toJS() : null;
  const a = m?.a ?? 1;
  const b = m?.b ?? 0;
  const c = m?.c ?? 0;
  const d = m?.d ?? 1;
  const e = m?.e ?? 0;
  const f = m?.f ?? 0;

  const innerW = Math.max(1, viewportWidth - RULER);
  const innerH = Math.max(1, viewportHeight - RULER);

  return (
    <div
      className="planner-trace-overlay"
      style={{
        position: 'absolute',
        left: RULER,
        top: RULER,
        width: innerW,
        height: innerH,
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div
        style={{
          transform: `matrix(${a},${b},${c},${d},${e},${f})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        <div style={{ position: 'relative', width: sceneW, height: sceneH }}>
          <img
            src={trace.src}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: trace.x,
              top: trace.y,
              width: trace.width,
              height: trace.height,
              opacity: trace.opacity ?? 0.45,
              display: 'block',
              userSelect: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
