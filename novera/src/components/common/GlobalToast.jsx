import React, { useEffect, useRef, useState } from 'react';

const DISMISS_MS = 4800;

/**
 * Fixed toasts for the whole app. Listens to `novira:toast` and `novira:export-toast`.
 */
export default function GlobalToast() {
    const [toast, setToast] = useState(null);
    const timerRef = useRef(null);

    useEffect(() => {
        const on = (ev) => {
            const msg = ev.detail?.message;
            if (!msg) return;
            const variant = ev.detail?.variant || 'info';
            setToast({ message: msg, variant });
            if (timerRef.current) window.clearTimeout(timerRef.current);
            timerRef.current = window.setTimeout(() => setToast(null), DISMISS_MS);
        };
        document.addEventListener('novira:toast', on);
        document.addEventListener('novira:export-toast', on);
        return () => {
            document.removeEventListener('novira:toast', on);
            document.removeEventListener('novira:export-toast', on);
            if (timerRef.current) window.clearTimeout(timerRef.current);
        };
    }, []);

    if (!toast) return null;

    const border =
        toast.variant === 'err'
            ? 'rgba(239, 68, 68, 0.45)'
            : toast.variant === 'warn'
              ? 'rgba(245, 158, 11, 0.45)'
              : toast.variant === 'ok'
                ? 'rgba(34, 197, 94, 0.45)'
                : 'rgba(59, 130, 246, 0.35)';

    return (
        <div
            role="status"
            className="novira-global-toast"
            style={{
                position: 'fixed',
                top: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 200000,
                maxWidth: 'min(92vw, 420px)',
                padding: '12px 18px',
                borderRadius: 14,
                fontSize: 13,
                fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', 'Poppins', system-ui, sans-serif",
                color: '#0f172a',
                background: 'rgba(255, 255, 255, 0.94)',
                border: `1px solid ${border}`,
                boxShadow: '0 18px 48px rgba(15, 23, 42, 0.18)',
                pointerEvents: 'none',
                lineHeight: 1.35,
            }}
        >
            {toast.message}
        </div>
    );
}
