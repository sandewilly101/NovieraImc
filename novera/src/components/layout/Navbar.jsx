import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function Navbar() {
    const navigate = useNavigate();
    const location = useLocation();

    const hideNavbarPaths = ['/', '/login', '/signup', '/dashboard', '/starred', '/shared', '/templates', '/designer', '/ai-studio', '/floor-planner', '/settings', '/security', '/assets'];
    if (hideNavbarPaths.includes(location.pathname) || location.pathname.startsWith('/editor')) return null;

    return (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1000, padding: '10px 0', pointerEvents: 'none' }}>
            <nav className="glass-navbar">
                <div className="nav-logo" onClick={() => navigate('/')} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', pointerEvents: 'auto' }}>
                    <div className="nav-logo-icon" style={{ width: 32, height: 32, position: 'relative' }}>
                        <div className="logo-layer logo-layer-1"></div>
                        <div className="logo-layer logo-layer-2"></div>
                        <div className="logo-layer logo-layer-3"></div>
                    </div>
                    <span className="nav-logo-text">Novira</span>
                </div>

                <div className="nav-links" style={{ display: 'flex', gap: 8, pointerEvents: 'auto' }}>
                    <button className={`nav-link ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>Features</button>
                    <button className={`nav-link ${location.pathname.includes('/templates') ? 'active' : ''}`} onClick={() => navigate('/templates')}>Templates</button>
                    <button className={`nav-link nav-link-special ${location.pathname.includes('/ai-studio') ? 'active' : ''}`} onClick={() => navigate('/ai-studio')}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="brand-icon">
                            <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
                        </svg>
                        Nov Studio
                    </button>
                    <button className={`nav-link ${location.pathname.includes('/designer') ? 'active' : ''}`} onClick={() => navigate('/designer')}>For Designers</button>
                </div>

                <div className="nav-right" style={{ display: 'flex', alignItems: 'center', gap: 12, pointerEvents: 'auto' }}>

                    <button className="nav-btn-solid" onClick={() => navigate('/signup')}>
                        Get Started
                    </button>
                </div>
            </nav>
        </div>
    );
}
