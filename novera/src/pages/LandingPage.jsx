import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BeakerIcon, GlobeAltIcon, UsersIcon, SwatchIcon, CurrencyDollarIcon, PresentationChartLineIcon, HandRaisedIcon, LinkIcon, VideoCameraIcon, StarIcon, LightBulbIcon, BuildingOffice2Icon, HomeIcon, ArrowTopRightOnSquareIcon, RocketLaunchIcon, SparklesIcon, FireIcon, SquaresPlusIcon, MapPinIcon, EnvelopeIcon, PhoneIcon, CubeIcon, ServerStackIcon, ComputerDesktopIcon, DocumentTextIcon, VideoCameraIcon as VideoIcon, NewspaperIcon, UserGroupIcon, PaintBrushIcon, LockClosedIcon, Bars3Icon, XMarkIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa';
import HeroBackground3D from '../components/HeroBackground3D';
import { showToast } from '../utils/noviraToast';

export default function LandingPage() {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isMobileMenuOpen) return undefined;
        const onKey = (e) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', onKey);
        return () => {
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = prevOverflow;
        };
    }, [isMobileMenuOpen]);

    const handleContactClick = (e, type, value) => {
        e.preventDefault();
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(value).catch(() => {});
        }
        const protocol = type === 'email' ? 'mailto:' : 'tel:';
        const linkValue = type === 'phone' ? value.replace(/[^\d+]/g, '') : value;
        window.location.href = `${protocol}${linkValue}`;
    };

    return (
        <div className="page active" id="page-landing">

            <HeroBackground3D />

            <nav style={{ position: 'fixed', top: 20, left: 0, width: '100%', zIndex: 3000, pointerEvents: 'none' }}>
                <div className="glass-navbar">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div className="nav-logo-icon">
                            <div className="logo-layer logo-layer-1"></div>
                            <div className="logo-layer logo-layer-2"></div>
                            <div className="logo-layer logo-layer-3"></div>
                        </div>
                        <span className="nav-logo-text">Novira</span>
                    </div>

                    <div className="nav-links" style={{ pointerEvents: 'auto' }}>
                        <button className="nav-link active" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <HomeIcon className="inline-icon" /> Home
                        </button>
                        <button className="nav-link" onClick={() => navigate('/templates')}>
                            <SquaresPlusIcon className="inline-icon" /> Templates
                        </button>
                        <button className="nav-link nav-link-special" onClick={() => navigate('/ai-studio')}>
                            <SparklesIcon className="brand-icon" />
                            Nov Studio
                        </button>
                        <button className="nav-link" onClick={() => navigate('/designer')}>
                            <PaintBrushIcon className="inline-icon" /> For Designers
                        </button>
                        <button className="nav-link" onClick={() => navigate('/editor')}>
                            <CubeIcon className="inline-icon" /> Editor
                        </button>
                    </div>

                    <div className="nav-desktop-actions" style={{ display: 'flex', gap: 12, pointerEvents: 'auto' }}>
                        <button className="nav-btn-outline" onClick={() => navigate('/login')}>
                            <LockClosedIcon className="inline-icon" /> Login
                        </button>
                        <button className="nav-btn-solid" onClick={() => navigate('/signup')}>
                            <RocketLaunchIcon className="inline-icon" style={{ color: 'white' }} /> Get Started
                        </button>
                    </div>

                    <button
                        className="mobile-menu-toggle"
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        style={{ pointerEvents: 'auto' }}
                    >
                        {isMobileMenuOpen ? (
                            <XMarkIcon className="mobile-icon" />
                        ) : (
                            <Bars3Icon className="mobile-icon" />
                        )}
                    </button>
                </div>
            </nav>

            <div
                className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}
                style={{ pointerEvents: isMobileMenuOpen ? 'auto' : 'none' }}
                role="dialog"
                aria-modal={isMobileMenuOpen}
                aria-label="Mobile navigation"
                onClick={(e) => {
                    if (e.target === e.currentTarget) setIsMobileMenuOpen(false);
                }}
            >
                <div className="mobile-menu-content" onClick={(e) => e.stopPropagation()}>
                    <div className="mobile-nav-links">
                        <button className="mobile-nav-link active" onClick={() => setIsMobileMenuOpen(false)}>
                            <HomeIcon className="inline-icon" /> Home
                        </button>
                        <button className="mobile-nav-link" onClick={() => { setIsMobileMenuOpen(false); navigate('/templates'); }}>
                            <SquaresPlusIcon className="inline-icon" /> Templates
                        </button>
                        <button className="mobile-nav-link special-mobile-link" onClick={() => { setIsMobileMenuOpen(false); navigate('/ai-studio'); }}>
                            <SparklesIcon className="inline-icon" /> Nov Studio
                        </button>
                        <button className="mobile-nav-link" onClick={() => { setIsMobileMenuOpen(false); navigate('/designer'); }}>
                            <PaintBrushIcon className="inline-icon" /> For Designers
                        </button>
                        <button className="mobile-nav-link" onClick={() => { setIsMobileMenuOpen(false); navigate('/editor'); }}>
                            <CubeIcon className="inline-icon" /> Editor
                        </button>
                    </div>

                    <div className="mobile-nav-actions">
                        <button className="btn btn-ghost w-full justify-center" onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}>
                            <LockClosedIcon className="inline-icon" /> Login
                        </button>
                        <button className="btn btn-primary w-full justify-center mt-3" onClick={() => { setIsMobileMenuOpen(false); navigate('/signup'); }}>
                            <RocketLaunchIcon className="inline-icon" style={{ color: 'white' }} /> Get Started
                        </button>
                    </div>
                </div>
            </div>

            <div className="hero">
                <div className="hero-content-inner">
                    <div className="hero-badge">
                        <div className="hero-cube-container">
                            <div className="hero-cube-3d">
                                <div className="hero-cube-face hero-cube-front"></div>
                                <div className="hero-cube-face hero-cube-back"></div>
                                <div className="hero-cube-face hero-cube-right"></div>
                                <div className="hero-cube-face hero-cube-left"></div>
                                <div className="hero-cube-face hero-cube-top"></div>
                                <div className="hero-cube-face hero-cube-bottom"></div>
                            </div>
                        </div>
                        <div className="typing-container">
                            Where ideas take shape
                        </div>
                    </div>
                    <h1 className="hero-title">Design Stunning<br /><span>3D Event Spaces</span><br />In Minutes.</h1>
                    <p className="hero-subtitle">No designers. No expensive software. Just drag, drop, and present. Built for event planners, agencies, and anyone with a vision.</p>

                    <div className="hero-cta">
                        <button className="btn btn-primary" onClick={() => navigate('/editor')}>
                            <SparklesIcon className="zeicon inline-block mr-2" /> Start Designing
                        </button>
                        <button className="btn btn-ghost" onClick={() => navigate('/templates')}>
                            <SquaresPlusIcon className="zeicon inline-block mr-2" /> Browse Templates
                        </button>
                    </div>

                    <div className="hero-features">
                        <div className="hero-feature"><HandRaisedIcon className="zeicon text-blue-500" /> Drag &amp; Drop 3D Builder</div>
                        <div className="hero-feature"><RocketLaunchIcon className="zeicon text-blue-500" /> 3D Model Generator</div>
                        <div className="hero-feature"><VideoCameraIcon className="zeicon text-blue-500" /> Real-time Simulation</div>
                        <div className="hero-feature"><CurrencyDollarIcon className="zeicon text-blue-500" /> Cost Estimator</div>
                        <div className="hero-feature"><ArrowTopRightOnSquareIcon className="zeicon text-blue-500" /> 4K Export</div>
                    </div>
                </div>
            </div>

            <div className="features-grid">
                <div className="feature-card">
                    <div className="feature-icon"><BuildingOffice2Icon className="zeicon text-blue-600" /></div>
                    <h3>Pre-Designed Venue Library</h3>
                    <p>Start with professionally designed halls, exhibition spaces, and ballrooms. Customize every element to match your vision perfectly.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><SparklesIcon className="zeicon text-blue-600" /></div>
                    <h3>3D Model Generator</h3>
                    <p>Type a description, get a 3D model. Powered by Novira. From concept to 3D in under 30 seconds.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><SwatchIcon className="zeicon text-blue-600" /></div>
                    <h3>2D/3D Logo Integration</h3>
                    <p>Import your logo, apply it to booths, banners and structures with one click. AI auto-optimizes it for 3D surfaces.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><LightBulbIcon className="zeicon text-blue-600" /></div>
                    <h3>Lighting & Sound Simulation</h3>
                    <p>See exactly how your lighting will look. Visualize sound coverage zones. Simulate crowd flow before event day.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><CurrencyDollarIcon className="zeicon text-blue-600" /></div>
                    <h3>Instant Cost Estimator</h3>
                    <p>Every element you place auto-calculates cost. LED sqm, truss length, carpet area, printing and labor — all instant.</p>
                </div>
                <div className="feature-card">
                    <div className="feature-icon"><ArrowTopRightOnSquareIcon className="zeicon text-blue-600" /></div>
                    <h3>4K Render & Video Export</h3>
                    <p>Export stunning 4K renders, cinematic walkthroughs, 360° tours, VR views and technical PDFs for client presentations.</p>
                </div>
            </div>

            <div className="stats-row">
                <div className="stat"><div className="stat-num">10x</div><div className="stat-label">Faster Than Current Design</div></div>
                <div className="stat"><div className="stat-num">85%</div><div className="stat-label">Cost Reduction vs 3D Agencies</div></div>
                <div className="stat"><div className="stat-num">5K+</div><div className="stat-label">Pre-Built Assets</div></div>
                <div className="stat"><div className="stat-num">100%</div><div className="stat-label">Easy and Robust Using Novira</div></div>
            </div>

            <div className="how-it-works">
                <div className="section-label">HOW IT WORKS</div>
                <h2 className="section-title">From Idea to Presentation in 4 Steps</h2>
                <p className="section-sub">No technical skills required. If you can drag and click, you can design with Novira.</p>
                <div className="steps">
                    <div className="step">
                        <div className="step-num">1</div>
                        <h4>Choose a Template</h4>
                        <p>Pick from 200+ pre-designed event spaces or start blank.</p>
                    </div>
                    <div className="step">
                        <div className="step-num">2</div>
                        <h4>Drag & Customize</h4>
                        <p>Add booths, stages, lights and furniture. Import your branding.</p>
                    </div>
                    <div className="step">
                        <div className="step-num">3</div>
                        <h4>Simulate & Refine</h4>
                        <p>Run lighting, sound and crowd simulations. Get AI layout advice.</p>
                    </div>
                    <div className="step">
                        <div className="step-num">4</div>
                        <h4>Export & Present</h4>
                        <p>4K renders, client presentations, cost reports — auto-generated.</p>
                    </div>
                </div>
            </div>

            <div className="cta-section">
                <div className="section-label">GET STARTED</div>
                <h2>Ready to Design Your First Space?</h2>
                <p>Join 12,000+ event professionals. Free plan available. No credit card required.</p>
                <button className="btn btn-primary" style={{ fontSize: 14, padding: '12px 28px' }} onClick={() => navigate('/signup')}>Create Free Account</button>
            </div>

            <footer className="footer-glass">
                <div className="footer-content">

                    <div className="footer-brand">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div className="nav-logo-icon">
                                <div className="logo-layer logo-layer-1"></div>
                                <div className="logo-layer logo-layer-2"></div>
                                <div className="logo-layer logo-layer-3"></div>
                            </div>
                            <span className="nav-logo-text" style={{ fontSize: 28 }}>Novira</span>
                        </div>
                        <p className="footer-desc">
                            The intelligent 3D spatial design platform.
                            Where ideas take shape instantly.
                        </p>
                        <div className="social-links">
                            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="social-icon"><FaFacebook size={20} /></a>
                            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="social-icon"><FaInstagram size={20} /></a>
                            <a href="https://wa.me/255713525152" target="_blank" rel="noopener noreferrer" className="social-icon">
                                <FaWhatsapp size={20} />
                            </a>
                        </div>
                    </div>

                    <div className="footer-links">
                        <div className="footer-col">
                            <h4>Product</h4>
                            <span className="footer-nav-link" onClick={() => navigate('/editor')}>
                                <CubeIcon className="footer-icon-svg" /> 3D Editor <span className="link-arrow">→</span>
                            </span>
                            <span className="footer-nav-link" onClick={() => navigate('/ai-studio')}>
                                <SparklesIcon className="footer-icon-svg" /> Nov Studio <span className="link-arrow">→</span>
                            </span>
                            <span className="footer-nav-link" onClick={() => navigate('/templates')}>
                                <ServerStackIcon className="footer-icon-svg" /> Templates <span className="link-arrow">→</span>
                            </span>
                            <span className="footer-nav-link" onClick={() => navigate('/designer')}>
                                <ComputerDesktopIcon className="footer-icon-svg" /> Designer Portal <span className="link-arrow">→</span>
                            </span>
                        </div>

                        <div className="footer-col">
                            <h4>Resources</h4>
                            <span className="footer-nav-link" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}><DocumentTextIcon className="footer-icon-svg" /> Documentation</span>
                            <span className="footer-nav-link" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}><VideoIcon className="footer-icon-svg" /> Tutorials</span>
                            <span className="footer-nav-link" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}><NewspaperIcon className="footer-icon-svg" /> Blog</span>
                            <span className="footer-nav-link" onClick={() => navigate('/login')} style={{ cursor: 'pointer' }}><UserGroupIcon className="footer-icon-svg" /> Community</span>
                        </div>

                        <div className="footer-col">
                            <h4>Contact Us</h4>
                            <div className="contact-info">
                                <div className="contact-item">
                                    <div className="contact-pulse">
                                        <MapPinIcon className="contact-icon-svg" />
                                    </div>
                                    <a href="https://maps.app.goo.gl/ZKNmpxLeziLJ7WrU6" target="_blank" rel="noopener noreferrer">
                                        Dar es Salaam, Tanzania
                                        <ChevronRightIcon className="contact-indicator" />
                                    </a>
                                </div>
                                <div className="contact-item">
                                    <div className="contact-pulse">
                                        <EnvelopeIcon className="contact-icon-svg" />
                                    </div>
                                    <a
                                        href="mailto:info@novira.studio"
                                        onClick={(e) => handleContactClick(e, 'email', 'info@novira.studio')}
                                    >
                                        info@novira.studio
                                        <ChevronRightIcon className="contact-indicator" />
                                    </a>
                                </div>
                                <div className="contact-item">
                                    <div className="contact-pulse">
                                        <PhoneIcon className="contact-icon-svg" />
                                    </div>
                                    <a
                                        href="tel:+255713525152"
                                        onClick={(e) => handleContactClick(e, 'phone', '+255 (0) 713 525 152')}
                                    >
                                        +255 (0) 713 525 152
                                        <ChevronRightIcon className="contact-indicator" />
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>&copy; {new Date().getFullYear()} Novira Technologies. All rights reserved.</p>
                    <div className="footer-bottom-links">
                        <span style={{ cursor: 'pointer' }} onClick={() => showToast('Privacy: Novira respects your data. For details contact support@novira.app.', 'info')}>Privacy Policy</span>
                        <span className="dot-sep">•</span>
                        <span style={{ cursor: 'pointer' }} onClick={() => showToast('Terms: By using Novira you agree to our terms. Contact support@novira.app for the full policy.', 'info')}>Terms of Service</span>

                    </div>
                </div>
            </footer>

            <style>{`
                @keyframes heroFloat {
                    0%,100% { transform:rotateX(25deg) rotateY(-10deg) }
                    50% { transform:rotateX(25deg) rotateY(-5deg) translateY(-8px) }
                }
            `}</style>
        </div>
    );
}
