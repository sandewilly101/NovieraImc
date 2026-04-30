import React, { useState } from 'react';
import useStore from '../../store/useStore';

const D = 12;
const CY = 1.5;

const VIEWS = [
    { label: 'Top', icon: '⬏', pos: [0, D, 0.001], target: [0, CY, 0] },
    { label: 'Bottom', icon: '⬎', pos: [0, -D, 0.001], target: [0, CY, 0] },
    { label: 'Front', icon: '▲', pos: [0, CY, D], target: [0, CY, 0] },
    { label: 'Back', icon: '▼', pos: [0, CY, -D], target: [0, CY, 0] },
    { label: 'Left', icon: '◀', pos: [-D, CY, 0], target: [0, CY, 0] },
    { label: 'Right', icon: '▶', pos: [D, CY, 0], target: [0, CY, 0] },
    { label: 'Home', icon: '⌂', pos: [8, 8, 8], target: [0, CY, 0] },
];

function ViewBtn({ view, active, onClick }) {
    const [hover, setHover] = useState(false);
    const isActive = active === view.label;
    return (
        <button
            type="button"
            title={`${view.label} view`}
            aria-label={`${view.label} camera`}
            onClick={() => onClick(view)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                width: 23, height: 17, borderRadius: 2, cursor: 'pointer',
                backdropFilter: 'blur(16px) saturate(180%)',
                fontFamily: "'Poppins', sans-serif",
                background: isActive
                    ? 'rgba(99,102,241,0.25)'
                    : hover ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                border: `0.5px solid ${isActive
                    ? 'rgba(99,102,241,0.5)'
                    : hover ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)'}`,
                boxShadow: isActive ? '0 0 10px rgba(99,102,241,0.2)' : 'none',
                transition: 'all 0.15s',
                color: isActive ? '#818cf8' : (hover ? '#ffffff' : '#94a3b8'),
            }}
        >
            <span style={{ fontSize: 7, lineHeight: 0.5 }}>{view.icon}</span>
            <span style={{ fontSize: 4, color: isActive ? '#818cf8' : '#64748b', marginTop: 1, letterSpacing: '0.02em', fontWeight: 600 }}>
                {view.label}
            </span>
        </button>
    );
}

export default function ViewNavigator() {
    const setCameraFocus = useStore(s => s.setCameraFocus);
    const [activeView, setActiveView] = useState(null);

    const snapTo = (view) => {
        setActiveView(view.label);
        setCameraFocus(view.target, view.pos);
        setTimeout(() => setActiveView(v => v === view.label ? null : v), 1000);
    };

    const top = VIEWS[0];
    const bottom = VIEWS[1];
    const front = VIEWS[2];
    const back = VIEWS[3];
    const left = VIEWS[4];
    const right = VIEWS[5];
    const home = VIEWS[6];

    return (
        <div style={{
            position: 'absolute', bottom: 16, right: 16, zIndex: 40,

            borderRadius: 4, padding: '6px 8px',

            display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'center',
            userSelect: 'none',
        }}>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <ViewBtn view={top} active={activeView} onClick={snapTo} />
            </div>

            <div style={{ display: 'flex', gap: 4, backdropFilter: 'blur(16px) saturate(180%)' }}>
                <ViewBtn view={back} active={activeView} onClick={snapTo} />
                <ViewBtn view={home} active={activeView} onClick={snapTo} />
                <ViewBtn view={front} active={activeView} onClick={snapTo} />
            </div>

            <div style={{ display: 'flex', gap: 4, backdropFilter: 'blur(16px) saturate(180%)' }}>
                <ViewBtn view={left} active={activeView} onClick={snapTo} />
                <ViewBtn view={right} active={activeView} onClick={snapTo} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', backdropFilter: 'blur(16px) saturate(180%)' }}>
                <ViewBtn view={bottom} active={activeView} onClick={snapTo} />
            </div>
        </div>
    );
}
