import {
    BuildingOffice2Icon,
    CursorArrowRippleIcon,
    ViewColumnsIcon,
    Bars3CenterLeftIcon,
    SparklesIcon,
    BellAlertIcon,
    CheckCircleIcon,
    RocketLaunchIcon,
    FireIcon,
    BeakerIcon,
    MusicalNoteIcon,
    PlusIcon,
    Square3Stack3DIcon,
    CubeIcon,
    CubeTransparentIcon,
    ShareIcon,
    ClockIcon,
    PencilSquareIcon,
    TrashIcon
} from '@heroicons/react/24/outline';
import React, { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { StarIcon } from '@heroicons/react/24/solid';
import { projectService, dashboardService } from '../api/apiService';
import { formatDistanceToNow } from 'date-fns';
import ProjectModal from '../components/dashboard/ProjectModal';
import ShareModal from '../components/dashboard/ShareModal';
import ConfirmModal from '../components/common/ConfirmModal';
import StatusModal from '../components/common/StatusModal';

const IconMap = {
    BuildingOffice2Icon,
    CursorArrowRippleIcon,
    BeakerIcon,
    MusicalNoteIcon
};

export default function DashboardPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [filter, setFilter] = useState('all');

    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'error', title: '', message: '' });
    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        projectId: null,
        projectName: ''
    });

    const [editingProject, setEditingProject] = useState(null);
    const [editingName, setEditingName] = useState('');

    const fetchDashboardData = async () => {
        try {
            const [projectsRes, statsRes] = await Promise.all([
                projectService.getProjects(),
                dashboardService.getStats()
            ]);
            setProjects(projectsRes.data.data);
            setStats(statsRes.data.data);
        } catch (err) {
            console.error('Failed to fetch dashboard data:', err);
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Data Fetch Failed',
                message: err.response?.data?.error || 'Failed to load dashboard data. Please check your connection.'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();

        const refreshInterval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(refreshInterval);
    }, []);

    const handleCreateProject = async (name, templateId = null) => {
        try {
            const newProject = {
                name: name || 'New Spatial Design',
                status: 'draft',
                thumbnailIcon: 'BuildingOffice2Icon',
                themeColors: { c1: '#dce8ff', c2: '#b8d0f8' }
            };
            const res = await projectService.createProject(newProject);
            const created = res.data.data;
            setProjects([created, ...projects]);

            fetchDashboardData();
            setStatusModal({
                isOpen: true,
                type: 'success',
                title: 'Project Created',
                message: `"${created.name}" has been successfully created.`
            });

            const id = created?.id;
            if (id) {
                const q = templateId ? `?template=${encodeURIComponent(templateId)}` : '';
                navigate(`/editor/${id}${q}`);
            }
        } catch (err) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Creation Failed',
                message: err.response?.data?.error || 'We could not create your spatial design at this time. Please check your connection and try again.'
            });
        }
    };

    const startEditing = (e, project) => {
        e.stopPropagation();
        setEditingProject(project.id);
        setEditingName(project.name);
    };

    const saveEditing = async (e) => {
        if (e) e.stopPropagation();
        if (!editingProject) return;

        try {
            const res = await projectService.updateProject(editingProject, { name: editingName });
            setProjects(projects.map(p => p.id === editingProject ? res.data.data : p));
            setEditingProject(null);
            setStatusModal({
                isOpen: true,
                type: 'success',
                title: 'Project Renamed',
                message: `Project renamed to "${editingName}".`
            });
        } catch (err) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Rename Failed',
                message: 'Could not update the project name. Please try again.'
            });
        }
    };

    const handleKeyDown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') {
            saveEditing(e);
        } else if (e.key === 'Escape') {
            setEditingProject(null);
        }
    };

    const handleDeleteProjectClick = (e, project) => {
        e.stopPropagation();
        setConfirmModal({
            isOpen: true,
            projectId: project.id,
            projectName: project.name
        });
    };

    const confirmDeleteProject = async () => {
        const id = confirmModal.projectId;
        if (!id) return;

        try {
            await projectService.deleteProject(id);
            setProjects(projects.filter(p => p.id !== id));
            fetchDashboardData();
            setConfirmModal({ isOpen: false, projectId: null, projectName: '' });
            setStatusModal({
                isOpen: true,
                type: 'success',
                title: 'Project Deleted',
                message: 'The project has been successfully deleted.'
            });
        } catch (err) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Deletion Failed',
                message: err.response?.data?.error || 'Failed to delete project. Please try again.'
            });
        }
    };

    const [shareModal, setShareModal] = useState({
        isOpen: false,
        project: null
    });

    const handleToggleStar = async (e, id) => {
        e.stopPropagation();
        try {
            const res = await projectService.toggleStar(id);
            setProjects(projects.map(p => p.id === id ? res.data.data : p));
            setStatusModal({
                isOpen: true,
                type: 'star',
                title: 'Star Status Updated',
                message: 'Project star status has been updated.'
            });
        } catch (err) {
            setStatusModal({
                isOpen: true,
                type: 'error',
                title: 'Update Failed',
                message: err.response?.data?.error || 'Failed to update star status. Please try again.'
            });
        }
    };

    const handleShareClick = (e, project) => {
        e.stopPropagation();
        setShareModal({
            isOpen: true,
            project: project
        });
    };

    const { userProfile, dashboardSearch } = useOutletContext();

    const filteredProjects = projects.filter(p => {
        if (dashboardSearch) {
            const q = dashboardSearch.toLowerCase();
            if (!p.name?.toLowerCase().includes(q) && !p.description?.toLowerCase().includes(q)) return false;
        }
        if (filter === 'all') return true;
        if (filter === 'starred') return p.isStarred;
        if (filter === 'shared') return p.isShared;
        return p.status === filter;
    });

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'Good morning';
        if (hour >= 12 && hour < 18) return 'Good afternoon';
        if (hour >= 18 || hour < 5) return 'Good evening';
        return 'Welcome back';
    };
    const userName = userProfile?.username ||
        (userProfile?.firstName && userProfile?.lastName ? `${userProfile.firstName} ${userProfile.lastName}` :
            userProfile?.displayName || localStorage.getItem('userName') || 'Pro Designer');
    const firstName = userName.split(' ')[0];

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue"></div>
            </div>
        );
    }

    return (
        <>
            <div className="dash-welcome">
                <div className="dash-welcome-left">
                    <div className="dash-welcome-date">{dateStr}</div>
                    <h1>
                        <span className="greeting-text">{getGreeting()},</span>
                        <span className="greeting-name">{firstName}</span>
                        <SparklesIcon className="zeicon greeting-icon" />
                    </h1>
                    <p className="dash-welcome-sub">Here's your workspace overview for today.</p>
                    <div className="dash-welcome-pills">
                        <span className="welcome-pill pill-review">
                            <ClockIcon className="zeicon" /> {stats?.inReviewCount || 0} In Review
                        </span>
                        <span className="welcome-pill pill-ready">
                            <CheckCircleIcon className="zeicon" /> {stats?.renderReadyCount || 0} Render Ready
                        </span>
                        <span className="welcome-pill pill-alert">
                            <BellAlertIcon className="zeicon" /> {stats?.notificationCount || 0} Notifications
                        </span>
                    </div>
                </div>
                <div className="dash-welcome-right">
                    <button className="btn-launch" onClick={() => setIsModalOpen(true)}>
                        <RocketLaunchIcon className="zeicon" />
                        Launch Editor
                    </button>
                    <div className="dash-streak">
                        <div className="streak-number">{stats?.dayStreak || 0}</div>
                        <div className="streak-label">
                            <FireIcon className="zeicon streak-icon" /> Day Streak
                        </div>
                    </div>
                </div>
            </div>

            <div className="dash-stats">
                <div className="dash-stat dash-stat--blue">
                    <div className="stat-top">
                        <div className="dash-stat-icon blue">
                            <BuildingOffice2Icon className="zeicon" />
                        </div>
                    </div>
                    <div className="dash-stat-val">{stats?.totalProjects || 0}</div>
                    <div className="dash-stat-label">Active Projects</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: `${Math.min(((stats?.totalProjects || 0) / (stats?.projectLimit || 10)) * 100, 100).toFixed(1)}%`, background: '#2b6fd4' }} /></div>
                </div>
                <div className="dash-stat dash-stat--purple">
                    <div className="stat-top">
                        <div className="dash-stat-icon purple">
                            <CursorArrowRippleIcon className="zeicon" />
                        </div>
                    </div>
                    <div className="dash-stat-val">{stats?.avgObjects || 0}</div>
                    <div className="dash-stat-label">Avg. Objects / Project</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: `${Math.min((parseFloat(stats?.avgObjects || 0) / (stats?.avgObjectsMax || 100)) * 100, 100).toFixed(1)}%`, background: '#7c3aed' }} /></div>
                </div>
                <div className="dash-stat dash-stat--green">
                    <div className="stat-top">
                        <div className="dash-stat-icon green">
                            <BeakerIcon className="zeicon" />
                        </div>
                    </div>
                    <div className="dash-stat-val">{stats ? `${stats.storageUsage.percentage}%` : '0%'}</div>
                    <div className="dash-stat-label">Storage Used</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: `${stats?.storageUsage.percentage || 0}%`, background: '#16a34a' }} /></div>
                </div>
                <div className="dash-stat dash-stat--amber">
                    <div className="stat-top">
                        <div className="dash-stat-icon amber">
                            <MusicalNoteIcon className="zeicon" />
                        </div>
                    </div>
                    <div className="dash-stat-val">{stats?.aiCredits || 0}</div>
                    <div className="dash-stat-label">AI Credits Left</div>
                    <div className="stat-bar"><div className="stat-bar-fill" style={{ width: `${Math.min(((stats?.aiCredits || 0) / (stats?.aiCreditsLimit || 50)) * 100, 100).toFixed(1)}%`, background: '#d97706' }} /></div>
                </div>
            </div>

            <div className="section-header">
                <div className="section-title-wrapper">
                    <h2>Recent Projects</h2>
                    <span className="section-count-badge">{filteredProjects.length} Projects</span>
                </div>
                <div className="filter-group">
                    <button className={`filter-chip ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>All</button>
                    <button className={`filter-chip ${filter === 'draft' ? 'active' : ''}`} onClick={() => setFilter('draft')}>Draft</button>
                    <button className={`filter-chip ${filter === 'review' ? 'active' : ''}`} onClick={() => setFilter('review')}>Review</button>
                    <button className={`filter-chip ${filter === 'starred' ? 'active' : ''}`} onClick={() => setFilter('starred')}>Starred</button>
                </div>
            </div>

            <div className="projects-section-outer">
                <div className="projects-bg-decoration">
                    <div className="bg-box box-1" />
                    <div className="bg-box box-2" />
                    <div className="bg-box box-3" />
                </div>
                <div className="projects-grid">
                    <div className="new-project-card" onClick={() => setIsModalOpen(true)}>
                        <div className="project-thumb-3d-bg">
                            <div className="mini-box-3d colored">
                                <div className="box-face face-front"></div>
                                <div className="box-face face-back"></div>
                                <div className="box-face face-right"></div>
                                <div className="box-face face-left"></div>
                                <div className="box-face face-top"></div>
                                <div className="box-face face-bottom"></div>
                            </div>
                        </div>
                        <div className="new-project-content">
                            <div className="plus-box">
                                <div className="plus">+</div>
                            </div>
                            <span>New Project</span>
                            <span className="subtitle">Start from template or blank</span>
                        </div>
                    </div>

                    {filteredProjects.map((project) => {
                        const Icon = IconMap[project.thumbnailIcon] || BuildingOffice2Icon;
                        const colors = project.themeColors || { c1: '#dce8ff', c2: '#b8d0f8' };

                        // Deterministically choose a 3D object based on project ID
                        let hash = 0;
                        if (project.id) {
                            for (let i = 0; i < project.id.toString().length; i++) {
                                hash += project.id.toString().charCodeAt(i);
                            }
                        }
                        const objType = hash % 3;

                        const render3DObject = () => {
                            if (objType === 0) {
                                return (
                                    <div className="project-box-3d">
                                        <div className="box-face face-front"></div>
                                        <div className="box-face face-back"></div>
                                        <div className="box-face face-right"></div>
                                        <div className="box-face face-left"></div>
                                        <div className="box-face face-top"></div>
                                        <div className="box-face face-bottom"></div>
                                    </div>
                                );
                            } else if (objType === 1) {
                                return (
                                    <div className="project-rings-3d">
                                        <div className="ring-face ring-x"></div>
                                        <div className="ring-face ring-y"></div>
                                        <div className="ring-face ring-z"></div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div className="project-stack-3d">
                                        <div className="stack-layer layer-1"></div>
                                        <div className="stack-layer layer-2"></div>
                                        <div className="stack-layer layer-3"></div>
                                    </div>
                                );
                            }
                        };

                        return (
                            <div key={project.id} className="project-card" onClick={() => navigate(`/editor/${project.id}`)}>
                                <div className="project-thumb" style={{ '--c1': colors.c1, '--c2': colors.c2 }}>
                                    <div className="project-thumb-3d-bg">
                                        <div className="multi-obj-container">
                                            {render3DObject()}
                                        </div>
                                    </div>
                                    <div className="thumb-overlay">
                                        <button className="btn-open-editor">Open Editor</button>
                                    </div>
                                    <div className="thumb-icon-wrapper">
                                        <Icon className="thumb-icon" />
                                    </div>

                                </div>
                                <div className="project-info">
                                    <div className="project-info-top">
                                        {editingProject === project.id ? (
                                            <input
                                                className="project-name-input"
                                                value={editingName}
                                                onChange={(e) => setEditingName(e.target.value)}
                                                onBlur={saveEditing}
                                                onKeyDown={handleKeyDown}
                                                onClick={(e) => e.stopPropagation()}
                                                autoFocus
                                            />
                                        ) : (
                                            <div className="project-name">{project.name}</div>
                                        )}
                                        <div className="project-actions">
                                            <button className={`action-icon share ${project.isShared ? 'active' : ''}`} onClick={(e) => handleShareClick(e, project)}>
                                                <ShareIcon className="zeicon" style={project.isShared ? { fill: 'var(--green)', color: 'var(--green)' } : {}} />
                                            </button>
                                            <button className={`action-icon star ${project.isStarred ? 'active' : ''}`} onClick={(e) => handleToggleStar(e, project.id)}>
                                                {project.isStarred ? <StarIcon className="zeicon" /> : <StarOutline className="zeicon" />}
                                            </button>
                                            <button className="action-icon edit" onClick={(e) => startEditing(e, project)}>
                                                <PencilSquareIcon className="zeicon" />
                                            </button>
                                            <button className="action-icon delete" onClick={(e) => handleDeleteProjectClick(e, project)}>
                                                <TrashIcon className="zeicon" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="project-meta-bottom" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginTop: '12px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span className="project-objects" style={{ fontSize: '11px', color: 'var(--green)', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center' }}>{project.objectCount} objects</span>

                                                {(project.liveCount > 0) ? (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: 'var(--blue)',
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: '600',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '6px'
                                                    }}>
                                                        <div className="rotating-3d-box-sm" style={{ width: '8px', height: '8px', position: 'relative', transformStyle: 'preserve-3d', animation: 'rotate-box-3d 3s linear infinite' }}>
                                                            <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'translateZ(4px)', border: '0.5px solid white' }}></div>
                                                            <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateY(180deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                            <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateY(90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                            <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateY(-90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                            <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateX(90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                            <div style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateX(-90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                        </div>
                                                        {project.liveCount} LIVE
                                                    </span>
                                                ) : (
                                                    <span style={{
                                                        fontSize: '11px',
                                                        color: 'var(--blue)',
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        padding: '2px 8px',
                                                        borderRadius: '12px',
                                                        fontWeight: '600',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        gap: '4px'
                                                    }}>
                                                        Solo Workspace
                                                    </span>
                                                )}
                                            </div>
                                            <span className="project-date" style={{ fontSize: '11px' }}>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', fontWeight: '400', color: 'var(--text-secondary)', textAlign: 'left', marginTop: '10px' }}>
                                            Created: {new Date(project.createdAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <ProjectModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreate={handleCreateProject}
            />

            <ShareModal
                isOpen={shareModal.isOpen}
                onClose={() => setShareModal({ isOpen: false, project: null })}
                project={shareModal.project}
            />

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, projectId: null, projectName: '' })}
                onConfirm={confirmDeleteProject}
                title="Delete Project"
                message={`Are you sure you want to delete "${confirmModal.projectName}"? This action cannot be undone and all spatial data will be permanently removed.`}
                confirmText="Delete"
                type="danger"
            />
            <StatusModal
                isOpen={statusModal.isOpen}
                onClose={() => setStatusModal({ ...statusModal, isOpen: false })}
                type={statusModal.type}
                title={statusModal.title}
                message={statusModal.message}
            />
        </>
    );
}
