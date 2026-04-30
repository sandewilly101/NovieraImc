import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const TIMEOUT_MS = 30 * 60 * 1000;
const WARN_AT_MS = 25 * 60 * 1000;
const ACTIVITY_KEY = 'lastActivityAt';

export function useSession() {
    const navigate = useNavigate();
    const [showWarning, setShowWarning] = useState(false);
    const [remaining, setRemaining] = useState(0);

    const warningInterval = useRef(null);
    const idleTimer = useRef(null);

    const scheduleTimersRef = useRef(null);

    const clearTimers = useCallback(() => {
        clearTimeout(idleTimer.current);
        clearInterval(warningInterval.current);
    }, []);

    const doLogout = useCallback((reason = 'timeout') => {
        clearTimers();
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem(ACTIVITY_KEY);
        setShowWarning(false);
        navigate(`/login?reason=${reason}`);
    }, [clearTimers, navigate]);

    const scheduleTimers = useCallback(() => {
        clearTimers();

        idleTimer.current = setTimeout(() => {
            setShowWarning(true);

            const expiresAt = Date.now() + (TIMEOUT_MS - WARN_AT_MS);
            warningInterval.current = setInterval(() => {
                const secs = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
                setRemaining(secs);
                if (secs <= 0) {
                    clearInterval(warningInterval.current);
                    doLogout('timeout');
                }
            }, 1000);
        }, WARN_AT_MS);
    }, [clearTimers, doLogout]);

    useEffect(() => {
        scheduleTimersRef.current = scheduleTimers;
    }, [scheduleTimers]);

    const keepAlive = useCallback(() => {
        localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
        setShowWarning(false);
        clearTimers();
        scheduleTimersRef.current?.();
    }, [clearTimers]);

    const onActivity = useCallback(() => {
        if (showWarning) return;
        localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
        clearTimers();
        scheduleTimersRef.current?.();
    }, [showWarning, clearTimers]);

    useEffect(() => {
        const last = parseInt(localStorage.getItem(ACTIVITY_KEY) || '0', 10);
        if (last && Date.now() - last > TIMEOUT_MS) {
            doLogout('timeout');
            return;
        }

        localStorage.setItem(ACTIVITY_KEY, Date.now().toString());
        scheduleTimers();

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));

        return () => {
            clearTimers();
            events.forEach(ev => window.removeEventListener(ev, onActivity));
        };

    }, []);

    useEffect(() => {
        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        events.forEach(ev => window.removeEventListener(ev, onActivity));
        events.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));
        return () => events.forEach(ev => window.removeEventListener(ev, onActivity));
    }, [onActivity]);

    return {
        showWarning,
        remaining,
        keepAlive,
        forceLogout: () => doLogout('timeout'),
    };
}
