import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    MapIcon,
    ArrowTopRightOnSquareIcon,
    ArrowPathIcon,
    InformationCircleIcon,
    ChevronDownIcon,
    ChevronUpIcon,
} from '@heroicons/react/24/outline';
import { isPlannerV1Message, PLANNER_SESSION_KEY } from '../utils/plannerBridge';

/**
 * react-planner fork (`../react-planner`) matches Novira: React 18 + three@~0.164.
 * Embeds the planner demo in an iframe (isolated bundle). For in-app import, see repo notes.
 *
 * Env: REACT_APP_PLANNER_URL, REACT_APP_PLANNER_DEV_PORT, REACT_APP_PLANNER_DEV_URL
 */
const DEV_DEFAULT_PORT = process.env.REACT_APP_PLANNER_DEV_PORT || '9000';
const DEV_DEFAULT_SRC = process.env.REACT_APP_PLANNER_DEV_URL || `http://localhost:${DEV_DEFAULT_PORT}`;

const HELP_KEY = 'novira_planner_help_open';

export default function FloorPlannerPage() {
    const envPlannerUrl = (process.env.REACT_APP_PLANNER_URL || '').trim();

    const [embedMode, setEmbedMode] = useState(() => {
        try {
            return localStorage.getItem('novira_planner_embed') || 'auto';
        } catch {
            return 'auto';
        }
    });

    const [helpOpen, setHelpOpen] = useState(() => {
        try {
            return localStorage.getItem(HELP_KEY) === '1';
        } catch {
            return false;
        }
    });

    const [iframeReady, setIframeReady] = useState(false);
    const [iframeError, setIframeError] = useState(false);
    const [reloadNonce, setReloadNonce] = useState(0);
    const [slowLoadHint, setSlowLoadHint] = useState(false);

    const iframeSrc = useMemo(() => {
        if (envPlannerUrl) return envPlannerUrl;
        if (embedMode === 'static') {
            return `${window.location.origin}/react-planner/index.html`;
        }
        if (embedMode === 'dev') {
            return DEV_DEFAULT_SRC;
        }
        if (process.env.NODE_ENV === 'production') {
            return `${window.location.origin}/react-planner/index.html`;
        }
        return DEV_DEFAULT_SRC;
    }, [embedMode, envPlannerUrl]);

    useEffect(() => {
        setIframeReady(false);
        setIframeError(false);
        setSlowLoadHint(false);
    }, [iframeSrc]);

    useEffect(() => {
        if (iframeReady || iframeError) {
            setSlowLoadHint(false);
            return undefined;
        }
        const id = window.setTimeout(() => setSlowLoadHint(true), 15000);
        return () => window.clearTimeout(id);
    }, [iframeReady, iframeError, iframeSrc, reloadNonce]);

    useEffect(() => {
        if (envPlannerUrl || process.env.NODE_ENV === 'development') return undefined;
        const href = `${window.location.origin}/react-planner/index.html`;
        const linkId = 'novira-prefetch-planner-static';
        if (document.getElementById(linkId)) return undefined;
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'prefetch';
        link.href = href;
        document.head.appendChild(link);
        return () => {
            document.getElementById(linkId)?.remove();
        };
    }, [envPlannerUrl]);

    const reloadPlanner = useCallback(() => {
        setIframeReady(false);
        setIframeError(false);
        setSlowLoadHint(false);
        setReloadNonce((n) => n + 1);
    }, []);

    const persistMode = useCallback((mode) => {
        setEmbedMode(mode);
        try {
            localStorage.setItem('novira_planner_embed', mode);
        } catch {
            /* noop */
        }
    }, []);

    const toggleHelp = useCallback(() => {
        setHelpOpen((o) => {
            const next = !o;
            try {
                localStorage.setItem(HELP_KEY, next ? '1' : '0');
            } catch {
                /* noop */
            }
            return next;
        });
    }, []);

    const onIframeLoad = useCallback(() => {
        setIframeReady(true);
        setIframeError(false);
    }, []);

    const onIframeError = useCallback(() => {
        setIframeError(true);
        setIframeReady(false);
    }, []);

    const allowedMessageOrigins = useMemo(() => {
        const s = new Set([window.location.origin]);
        try {
            s.add(new URL(DEV_DEFAULT_SRC).origin);
        } catch {
            /* noop */
        }
        try {
            s.add(new URL(iframeSrc).origin);
        } catch {
            /* noop */
        }
        return s;
    }, [iframeSrc]);

    useEffect(() => {
        const onMessage = (event) => {
            if (!allowedMessageOrigins.has(event.origin)) return;
            const data = event.data;
            if (!isPlannerV1Message(data)) return;
            try {
                sessionStorage.setItem(PLANNER_SESSION_KEY, JSON.stringify(data.payload));
            } catch {
                /* quota */
            }
            document.dispatchEvent(
                new CustomEvent('novira:toast', {
                    detail: {
                        message: 'Floor plan snapshot saved locally — 3D scene import will use this next.',
                        variant: 'ok',
                    },
                })
            );
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [allowedMessageOrigins]);

    return (
        <div
            className="page active floor-planner-page"
            id="page-floor-planner"
            style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}
            aria-busy={!iframeReady && !iframeError}
        >
            <header
                style={{
                    flex: '0 0 auto',
                    padding: '12px 20px',
                    borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '12px 20px',
                    background: 'rgba(255,255,255,0.55)',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <MapIcon className="zeicon text-cyan" style={{ width: 22, height: 22 }} aria-hidden />
                    <div>
                        <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--ink)' }}>Floor planner</h1>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--silver)' }}>
                            2D layout and 3D walkthrough. Use Nov studio → Plan for the built-in planner, or the frame below for the legacy embed.
                        </p>
                    </div>
                </div>

                <div
                    style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 8,
                        marginLeft: 'auto',
                    }}
                >
                    <span
                        id="planner-source-label"
                        style={{ fontSize: '11px', color: 'var(--silver)', fontWeight: 600 }}
                    >
                        Source
                    </span>
                    {envPlannerUrl ? (
                        <span
                            style={{ fontSize: '12px', color: 'var(--ink)' }}
                            title={envPlannerUrl}
                            aria-labelledby="planner-source-label"
                        >
                            <code
                                style={{ background: 'rgba(0,0,0,0.06)', padding: '4px 8px', borderRadius: 6 }}
                            >
                                REACT_APP_PLANNER_URL
                            </code>
                        </span>
                    ) : (
                        <select
                            aria-labelledby="planner-source-label"
                            value={embedMode}
                            onChange={(e) => persistMode(e.target.value)}
                            style={{
                                fontSize: '12px',
                                padding: '6px 10px',
                                borderRadius: 8,
                                border: '1px solid rgba(0,0,0,0.12)',
                                maxWidth: 'min(100vw - 40px, 320px)',
                            }}
                        >
                            <option value="auto">Auto (prod: static / dev: planner server)</option>
                            <option value="dev">Dev server ({DEV_DEFAULT_SRC})</option>
                            <option value="static">Static embed (/react-planner/)</option>
                        </select>
                    )}
                    <a
                        href={iframeSrc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}
                    >
                        <ArrowTopRightOnSquareIcon style={{ width: 14, height: 14 }} aria-hidden />
                        Open in new tab
                    </a>
                    <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={reloadPlanner}
                        title="Reload the planner frame if it hangs or after changing ports"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    >
                        <ArrowPathIcon style={{ width: 14, height: 14 }} aria-hidden />
                        Reload frame
                    </button>
                    <Link
                        to="/editor?workspace=floorplan&fromPlanner=1"
                        className="btn btn-primary btn-sm"
                        style={{ textDecoration: 'none' }}
                        title="Open Novira Studio with the floor plan workspace (embedded react-planner)"
                    >
                        Open in Nov studio (Plan)
                    </Link>
                </div>
            </header>

            <div
                className="floor-planner-frame-wrap"
                style={{
                    flex: 1,
                    minHeight: 0,
                    position: 'relative',
                    background: '#0f172a',
                }}
            >
                {!iframeReady && !iframeError && (
                    <div
                        className="floor-planner-loading"
                        role="status"
                        aria-live="polite"
                        aria-label="Loading floor planner"
                    >
                        <div className="floor-planner-loading__spinner" aria-hidden />
                        <p className="floor-planner-loading__text">Loading planner…</p>
                        {slowLoadHint && (
                            <p className="floor-planner-loading__slow">
                                Taking a while? Confirm the planner dev server is running or try{' '}
                                <button type="button" className="floor-planner-loading__retry" onClick={reloadPlanner}>
                                    reload frame
                                </button>
                                .
                            </p>
                        )}
                    </div>
                )}
                {iframeError && (
                    <div className="floor-planner-error" role="alert">
                        <p className="floor-planner-error__title">Could not load the planner</p>
                        <p className="floor-planner-error__hint">
                            Check that the dev server is running or run{' '}
                            <code className="floor-planner-error__code">npm run planner:sync</code> for a static build.
                        </p>
                        <button
                            type="button"
                            className="btn btn-primary btn-sm floor-planner-error__retry"
                            onClick={reloadPlanner}
                        >
                            <ArrowPathIcon style={{ width: 14, height: 14 }} aria-hidden />
                            Try again
                        </button>
                    </div>
                )}
                <iframe
                    key={`${iframeSrc}::${reloadNonce}`}
                    title="Floor planner — react-planner"
                    src={iframeSrc}
                    onLoad={onIframeLoad}
                    onError={onIframeError}
                    className="floor-planner-iframe"
                    style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        border: 'none',
                        opacity: iframeReady ? 1 : 0,
                        transition: 'opacity 0.2s ease-out',
                    }}
                    referrerPolicy="same-origin-when-cross-origin"
                />
            </div>

            <footer className="floor-planner-footer">
                <button
                    type="button"
                    className="floor-planner-footer__toggle"
                    onClick={toggleHelp}
                    aria-expanded={helpOpen}
                >
                    <InformationCircleIcon style={{ width: 16, height: 16, flexShrink: 0 }} aria-hidden />
                    <span>Setup &amp; embed help</span>
                    {helpOpen ? (
                        <ChevronUpIcon style={{ width: 14, height: 14 }} aria-hidden />
                    ) : (
                        <ChevronDownIcon style={{ width: 14, height: 14 }} aria-hidden />
                    )}
                </button>
                {helpOpen && (
                    <div className="floor-planner-footer__panel" id="planner-help-panel">
                        <p>
                            <strong style={{ color: 'var(--ink)' }}>Dev:</strong> in{' '}
                            <code className="floor-planner-error__code">react-planner</code> run{' '}
                            <code className="floor-planner-error__code">npm install &amp;&amp; npm start</code> (port{' '}
                            {DEV_DEFAULT_PORT}). Port in use:{' '}
                            <code className="floor-planner-error__code">npm run start:9001</code> then set{' '}
                            <code className="floor-planner-error__code">REACT_APP_PLANNER_DEV_PORT=9001</code> in novera
                            and restart.
                        </p>
                        <p>
                            <strong style={{ color: 'var(--ink)' }}>Static:</strong>{' '}
                            <code className="floor-planner-error__code">npm run build-demo-embed-novira</code> in
                            react-planner, then <code className="floor-planner-error__code">npm run planner:sync</code> in
                            novera. Optional:{' '}
                            <code className="floor-planner-error__code">REACT_APP_PLANNER_URL=/react-planner/index.html</code>
                            .
                        </p>
                    </div>
                )}
            </footer>
        </div>
    );
}
