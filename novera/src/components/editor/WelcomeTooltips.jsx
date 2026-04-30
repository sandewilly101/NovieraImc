import React, { useState, useEffect } from 'react';

const TIPS = [
  { id: 'welcome', title: 'Welcome to Novira', text: 'A professional 3D editor right in your browser. Let us show you the basics!', position: 'center' },
  { id: 'sidebar', title: 'Sidebar', text: 'Add objects, change materials, set up lighting — all from here.', position: 'left' },
  { id: 'tools', title: 'Transform Tools', text: 'Use G to Move, R to Rotate, S to Scale. With Move active and a selection, Alt+arrows nudge in X/Z and Alt+PgUp/PgDn nudge height. Shift+S opens the cursor and placement menu.', position: 'top-left' },
  { id: 'palette', title: 'Command Palette', text: 'Press Ctrl+K to access any command instantly. Pro workflow at your fingertips!', position: 'center' },
  { id: 'shortcuts', title: 'Keyboard Shortcuts', text: 'Press ? anytime for the full list. Shift+S: cursor menu. Home frames the selection. Del deletes; Ctrl+D duplicates.', position: 'center' },
];

const STORAGE_KEY = 'novira_onboarding_done';

export default function WelcomeTooltips() {
  const [step, setStep] = useState(0);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }
    try {
      if (localStorage.getItem('novira-studio-tour-v2') === 'done' || localStorage.getItem('novira-studio-tour-v1') === 'done') {
        const t = window.setTimeout(() => setDismissed(false), 1800);
        return () => clearTimeout(t);
      }
    } catch { /* ignore */ }

    let opened = false;
    const show = () => {
      if (opened) return;
      opened = true;
      setDismissed(false);
    };
    const onStudioClosed = () => show();
    document.addEventListener('novira-studio-tour-closed', onStudioClosed);
    const fallback = window.setTimeout(show, 45000);
    return () => {
      document.removeEventListener('novira-studio-tour-closed', onStudioClosed);
      clearTimeout(fallback);
    };
  }, []);

  if (dismissed || step >= TIPS.length) return null;

  const tip = TIPS[step];
  const isLast = step === TIPS.length - 1;

  const dismiss = () => {
    setDismissed(true);
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
  };

  const next = () => {
    if (isLast) dismiss();
    else setStep(s => s + 1);
  };

  const posStyle = {
    'center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
    'left': { top: '50%', left: 260, transform: 'translateY(-50%)' },
    'top-left': { top: 70, left: 56 },
  }[tip.position] || { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };

  return (
    <div className="welcome-tooltips-root" style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'auto' }}>
      {step === 0 && <div className="welcome-tooltips-scrim" style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }} />}
      <div
        className="welcome-tooltips-card"
        style={{
          position: 'absolute', ...posStyle,
          background: '#fff', borderRadius: 12, padding: '18px 22px', width: 300,
          boxShadow: '0 24px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(0,0,0,0.04)',
          fontFamily: "'Poppins', sans-serif", zIndex: 100000,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{tip.title}</span>
          <button onClick={dismiss} style={{
            background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8', padding: 0,
          }}>×</button>
        </div>
        <p style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, margin: '0 0 14px' }}>{tip.text}</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#94a3b8' }}>{step + 1} / {TIPS.length}</span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={dismiss} style={{
              padding: '5px 12px', borderRadius: 6, border: '1px solid #e2e8f0', background: '#f8fafc',
              fontSize: 10, color: '#64748b', cursor: 'pointer', fontFamily: "'Poppins', sans-serif",
            }}>Skip</button>
            <button onClick={next} style={{
              padding: '5px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              background: 'linear-gradient(135deg, #3b82f6, #6366f1)', color: '#fff',
              fontSize: 10, fontWeight: 600, fontFamily: "'Poppins', sans-serif",
            }}>{isLast ? 'Get Started' : 'Next'}</button>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 10 }}>
          {TIPS.map((_, i) => (
            <span key={i} style={{
              width: 6, height: 6, borderRadius: '50%',
              background: i === step ? '#3b82f6' : i < step ? '#93c5fd' : '#e2e8f0',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
}
