import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import {
    HomeIcon,
    StarIcon,
    UsersIcon,
    PencilSquareIcon,
    CpuChipIcon,
    ViewColumnsIcon,
    FolderIcon,
    Cog6ToothIcon,
    ShieldCheckIcon,
    MagnifyingGlassIcon,
    BellIcon,
    Bars3Icon,
    ArrowRightOnRectangleIcon,
    XMarkIcon,
    PlusCircleIcon,
    MapIcon,
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';
import { useSession } from '../hooks/useSession';
import SessionWarningModal from '../components/common/SessionWarningModal';
import NotificationModal from '../components/common/NotificationModal';
import { projectService, dashboardService, notificationService, userService } from '../api/apiService';
import apiService from '../api/apiService';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../store/useStore';

function isSidebarItemActive(item, location) {
    if (item.navActive === 'settings-security') {
        return location.pathname === '/settings' && new URLSearchParams(location.search).get('tab') === 'security';
    }
    if (item.navActive === 'settings-general') {
        return location.pathname === '/settings' && new URLSearchParams(location.search).get('tab') !== 'security';
    }
    return location.pathname === item.path;
}

function goToSidebarItem(item, navigate) {
    if (item.path.includes('?')) {
        const [pathname, query] = item.path.split('?');
        navigate({ pathname, search: `?${query}` });
    } else {
        navigate(item.path);
    }
}

export default function DashboardLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [dashboardSearch, setDashboardSearch] = useState('');
    const [starredCount, setStarredCount] = useState(0);
    const [sharedCount, setSharedCount] = useState(0);
    const { userProfile, fetchUserProfile, setUserProfile } = useStore(
        useShallow((s) => ({
            userProfile: s.userProfile,
            fetchUserProfile: s.fetchUserProfile,
            setUserProfile: s.setUserProfile,
        }))
    );

    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [inviteError, setInviteError] = useState(null);
    const hasUnreadNotifications = notifications.some(n => !n.isRead);

    const fetchNotifications = async () => {
        try {
            const res = await apiService.get('/notifications');
            if (res.data.success) {
                setNotifications(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const handleAcceptInvite = async (notif) => {
        try {
            setInviteError(null);
            await projectService.acceptInvite(notif.relatedId);
            await apiService.put(`/notifications/${notif.id}/read`);
            fetchNotifications();
            setShowNotifications(false);

        } catch (error) {
            console.error('Failed to accept invite:', error);
            setInviteError('Failed to accept invite. Please try again.');
        }
    };

    const handleDeclineInvite = async (notif) => {
        try {

            await apiService.put(`/notifications/${notif.id}/read`);
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to decline invite:', error);
        }
    };

    const handleMarkAsRead = async (id) => {
        try {
            await apiService.put(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error('Failed to mark read:', error);
        }
    };

    useEffect(() => {
        fetchUserProfile();

        const handleProfileUpdate = (e) => {
            if (e.detail?.avatarUrl) {
                setUserProfile(prev => ({
                    ...prev,
                    avatarUrl: e.detail.avatarUrl
                }));
            }
        };
        window.addEventListener('ProfileUpdate', handleProfileUpdate);

        projectService.getProjects()
            .then(res => {
                const projects = res.data.data;
                setStarredCount(projects.filter(p => p.isStarred).length);
                setSharedCount(projects.filter(p => Boolean(p.isShared)).length);
            })
            .catch(err => console.error('Failed to fetch project counts', err));

        fetchNotifications();
        const notifInterval = setInterval(fetchNotifications, 30000);
        return () => {
            clearInterval(notifInterval);
            window.removeEventListener('ProfileUpdate', handleProfileUpdate);
        };
    }, [location.pathname]);

    useEffect(() => {
        if (!isMobileMenuOpen) return;
        const handleEscape = (e) => {
            if (e.key === 'Escape') setIsMobileMenuOpen(false);
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isMobileMenuOpen]);

    const { showWarning, remaining, keepAlive, forceLogout } = useSession();

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userName');
        localStorage.removeItem('lastActivityAt');
        navigate('/login');
    };

    const menuItems = [
        { name: 'Nov Projects', icon: HomeIcon, path: '/dashboard', section: 'WORKSPACE', color: 'text-blue' },
        { name: 'Starred', icon: StarIcon, path: '/starred', badge: starredCount > 0 ? starredCount : null, badgeClass: 'sidebar-badge-starred', section: 'WORKSPACE', color: 'text-amber' },
        { name: 'Shared', icon: UsersIcon, path: '/shared', badge: sharedCount > 0 ? sharedCount : null, badgeClass: 'sidebar-badge-shared', section: 'WORKSPACE', color: 'text-green' },
        { name: 'Nov studio', icon: PencilSquareIcon, path: '/editor', section: 'CREATE', color: 'text-purple' },
        { name: 'Floor planner', icon: MapIcon, path: '/floor-planner', section: 'CREATE', color: 'text-teal' },
        { name: 'Novira AI', icon: CpuChipIcon, path: '/ai-studio', section: 'CREATE', color: 'text-blue' },
        { name: 'Templates', icon: ViewColumnsIcon, path: '/templates', section: 'CREATE', color: 'text-pink' },
        { name: 'My Assets', icon: FolderIcon, path: '/assets', section: 'RESOURCES', color: 'text-orange' },
        { name: 'Designer Portal', icon: UsersIcon, path: '/designer', section: 'RESOURCES', color: 'text-cyan' },
        { name: 'Settings', icon: Cog6ToothIcon, path: '/settings', navActive: 'settings-general', section: 'SETTINGS', color: 'text-silver' },
        { name: 'Security', icon: ShieldCheckIcon, path: '/settings?tab=security', navActive: 'settings-security', section: 'SETTINGS', color: 'text-red' },
    ];

    const sections = ['WORKSPACE', 'CREATE', 'RESOURCES', 'SETTINGS'];

    return (
        <div className="dashboard-layout">
            <div className="sidebar">
                <button className="sidebar-logo" onClick={() => navigate('/')} aria-label="Novira home">
                    <div className="nav-logo-icon">
                        <div className="logo-layer logo-layer-1"></div>
                        <div className="logo-layer logo-layer-2"></div>
                        <div className="logo-layer logo-layer-3"></div>
                    </div>
                    <span>Novira</span>
                </button>

                <button className="sidebar-user" onClick={() => navigate('/settings')} aria-label="User settings">
                    {userProfile?.avatarUrl ? (
                        <img src={userProfile.avatarUrl} alt="Avatar" className="user-avatar-sm" style={{ objectFit: 'cover', borderRadius: '50%' }} />
                    ) : (
                        <div className="user-avatar-sm" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>

                        </div>
                    )}
                    <div className="user-meta-sm">
                        <span className="user-name-sm">
                            {userProfile?.username ||
                                (userProfile?.firstName && userProfile?.lastName ? `${userProfile.firstName} ${userProfile.lastName}` :
                                    userProfile?.displayName || localStorage.getItem('userName') || 'Designer')}
                        </span>
                        <span className="user-role-sm">{userProfile?.companyName || 'Novira Designer'}</span>
                    </div>
                    <Cog6ToothIcon className="zeicon ml-auto text-silver cursor-pointer hover:text-blue transition-colors" />
                </button>

                {sections.map(section => (
                    <React.Fragment key={section}>
                        <div className="sidebar-section">{section}</div>
                        {menuItems.filter(item => item.section === section).map(item => (
                            <button
                                key={item.name}
                                className={`sidebar-item ${isSidebarItemActive(item, location) ? 'active' : ''}`}
                                onClick={() => item.path !== '#' && goToSidebarItem(item, navigate)}
                                aria-current={isSidebarItemActive(item, location) ? 'page' : undefined}
                            >
                                <item.icon className={`zeicon ${item.color}`} />
                                {item.name}
                                {item.badge && <span className={item.badgeClass || "sidebar-badge"}>{item.badge}</span>}
                            </button>
                        ))}
                    </React.Fragment>
                ))}

                <div className="sidebar-logout-wrapper">
                    <button className="sidebar-item logout-btn" onClick={handleLogout}>
                        <ArrowRightOnRectangleIcon className="zeicon text-red" />
                        Logout
                    </button>
                </div>
            </div>

            <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'open' : ''}`}>
                <div className="mobile-menu-content">
                    <button className="sidebar-logo mb-6" onClick={() => { setIsMobileMenuOpen(false); navigate('/'); }} aria-label="Novira home">
                        <div className="nav-logo-icon">
                            <div className="logo-layer logo-layer-1"></div>
                            <div className="logo-layer logo-layer-2"></div>
                            <div className="logo-layer logo-layer-3"></div>
                        </div>
                        <span>Novira</span>
                    </button>

                    <div className="mobile-nav-links">
                        {sections.map(section => (
                            <React.Fragment key={section}>
                                <div className="sidebar-section mt-4 mb-2 opacity-50 text-[10px] uppercase tracking-widest">{section}</div>
                                {menuItems.filter(item => item.section === section).map(item => (
                                    <button
                                        key={item.name}
                                        className={`sidebar-item ${isSidebarItemActive(item, location) ? 'active' : ''}`}
                                        onClick={() => {
                                            if (item.path !== '#') {
                                                goToSidebarItem(item, navigate);
                                                setIsMobileMenuOpen(false);
                                            }
                                        }}
                                        aria-current={isSidebarItemActive(item, location) ? 'page' : undefined}
                                    >
                                        <item.icon className={`zeicon ${item.color}`} />
                                        {item.name}
                                        {item.badge && <span className="sidebar-badge">{item.badge}</span>}
                                    </button>
                                ))}
                            </React.Fragment>
                        ))}
                    </div>

                    <div className="mobile-nav-actions mt-6 pt-6 border-t border-slate-200/20">
                        <button className="sidebar-item logout-btn" onClick={() => { handleLogout(); setIsMobileMenuOpen(false); }}>
                            <ArrowRightOnRectangleIcon className="zeicon text-red" />
                            Logout
                        </button>
                    </div>
                </div>
            </div>

            <div className="dash-main">
                <header className="dash-floating-header">
                    <button className="mobile-dashboard-toggle" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <XMarkIcon className="zeicon" /> : <Bars3Icon className="zeicon" />}
                    </button>
                    <div className="header-search">
                        <MagnifyingGlassIcon className="search-icon" />
                        <input type="text" placeholder="Search projects..." aria-label="Search projects" value={dashboardSearch} onChange={e => setDashboardSearch(e.target.value)} />
                    </div>
                    <div className="header-actions">
                        <div className="header-ai-credits" onClick={() => navigate('/ai-studio')}>
                            <CpuChipIcon className="zeicon text-blue" />
                            <div className="credit-info">
                                <span className="credit-count">{userProfile?.aiCredits ?? '--'}</span>
                                <span className="credit-label">Credits</span>
                            </div>
                        </div>

                        <div className="relative">
                            <button
                                className={`header-icon-btn ${hasUnreadNotifications ? 'text-blue-500' : ''}`}
                                onClick={() => setShowNotifications(!showNotifications)}
                                aria-expanded={showNotifications}
                                aria-label={`Notifications${hasUnreadNotifications ? ` (${notifications.filter(n => !n.isRead).length} unread)` : ''}`}
                            >
                                <BellIcon className="zeicon" />
                                {hasUnreadNotifications && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>}
                            </button>

                        </div>
                        <div className="header-divider"></div>
                        <button className="btn btn-primary btn-sm mobile-new-btn" onClick={() => navigate('/editor')}>
                            <PlusCircleIcon className="zeicon mobile-new-icon" />
                            <span className="mobile-new-label">New Design</span>
                        </button>
                    </div>
                </header>
                <div className="dash-content-area">
                    <Outlet context={{ userProfile, dashboardSearch }} />
                </div>
            </div>

            <SessionWarningModal
                isOpen={showWarning}
                remaining={remaining}
                onKeepAlive={keepAlive}
                onLogout={forceLogout}
            />

            <NotificationModal
                isOpen={showNotifications}
                onClose={() => { setShowNotifications(false); setInviteError(null); }}
                notifications={notifications}
                onAccept={handleAcceptInvite}
                onDecline={handleDeclineInvite}
                onMarkAsRead={handleMarkAsRead}
                inviteError={inviteError}
            />
        </div>
    );
}
