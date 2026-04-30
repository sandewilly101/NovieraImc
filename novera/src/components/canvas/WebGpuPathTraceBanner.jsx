import useStore from '../../store/useStore';

/** Opt-in flag: full WebGPU path tracing needs a dedicated renderer pipeline (tracked separately). */
export default function WebGpuPathTraceBanner() {
  const on = useStore((s) => s.webgpuPathTraceRequested);
  const setOn = useStore((s) => s.setWebgpuPathTraceRequested);
  if (!on) return null;
  return (
    <div
      className="webgpu-path-banner"
      style={{
        position: 'absolute',
        top: 8,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 25,
        padding: '6px 14px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: 'rgba(15, 23, 42, 0.92)',
        color: '#e2e8f0',
        border: '1px solid rgba(56, 189, 248, 0.35)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        pointerEvents: 'auto',
      }}
    >
      <span>WebGPU path trace preview is flagged — pipeline hookup is staged.</span>
      <button
        type="button"
        onClick={() => setOn(false)}
        style={{
          border: 'none',
          background: 'rgba(56, 189, 248, 0.2)',
          color: '#7dd3fc',
          borderRadius: 8,
          padding: '2px 10px',
          fontSize: 10,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Dismiss
      </button>
    </div>
  );
}
