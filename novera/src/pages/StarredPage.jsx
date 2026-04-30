import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BuildingOffice2Icon, CursorArrowRippleIcon, BeakerIcon, MusicalNoteIcon,
    StarIcon, TrashIcon, PencilSquareIcon
} from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';
import { formatDistanceToNow } from 'date-fns';
import { projectService } from '../api/apiService';
import ConfirmModal from '../components/common/ConfirmModal';
import StatusModal from '../components/common/StatusModal';

const IconMap = {
    BuildingOffice2Icon,
    CursorArrowRippleIcon,
    BeakerIcon,
    MusicalNoteIcon
};

export default function StarredPage() {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [confirmModal, setConfirmModal] = useState({
        isOpen: false,
        projectId: null,
        projectName: ''
    });

    const [editingProject, setEditingProject] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [fetchError, setFetchError] = useState(false);
    const [statusModal, setStatusModal] = useState({ isOpen: false, type: 'error', title: '', message: '' });

    const fetchProjects = async () => {
        try {
            setFetchError(false);
            const res = await projectService.getProjects();
            setProjects(res.data.data.filter(p => p.isStarred));
        } catch (err) {
            console.error('Failed to fetch starred projects:', err);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();

        const refreshInterval = setInterval(fetchProjects, 30000);
        return () => clearInterval(refreshInterval);
    }, []);

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
        } catch (err) {
            setStatusModal({ isOpen: true, type: 'error', title: 'Rename Failed', message: 'Could not update the project name. Please try again.' });
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
            setConfirmModal({ isOpen: false, projectId: null, projectName: '' });
        } catch (err) {
            setStatusModal({ isOpen: true, type: 'error', title: 'Delete Failed', message: 'Could not delete the project. Please try again.' });
        }
    };

    const handleToggleStar = async (e, id) => {
        e.stopPropagation();
        try {
            await projectService.toggleStar(id);

            setProjects(projects.filter(p => p.id !== id));
        } catch (err) {
            setStatusModal({ isOpen: true, type: 'error', title: 'Star Update Failed', message: 'Could not update the star status. Please try again.' });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber"></div>
            </div>
        );
    }

    return (
        <div className="starred-page-container">

            <div className="dash-welcome" style={{ marginBottom: '32px' }}>
                <div className="dash-welcome-left">
                    <div className="dash-welcome-date" style={{ color: 'var(--amber)' }}>Quick Access</div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <StarIcon className="zeicon" style={{ width: 36, height: 36, color: 'var(--amber)' }} />
                        <span className="greeting-text">Starred</span>
                        <span className="greeting-name">Workspace</span>
                        <StarOutline className="zeicon greeting-icon" style={{ color: 'var(--amber)' }} />
                    </h1>
                    <p className="dash-welcome-sub">Quick access to your most important spatial designs and components.</p>
                </div>
            </div>

            {fetchError ? (
                <div className="starred-empty-state">
                    <div className="empty-star-wrapper" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        <StarOutline className="empty-star-icon" style={{ color: 'var(--red)' }} />
                    </div>
                    <h3>Failed to load starred projects</h3>
                    <p>Something went wrong while fetching your data. Please check your connection.</p>
                    <button className="btn btn-primary mt-6" onClick={() => { setLoading(true); fetchProjects(); }}>
                        Retry
                    </button>
                </div>
            ) : projects.length === 0 ? (
                <div className="starred-empty-state">
                    <div className="empty-star-wrapper">
                        <StarOutline className="empty-star-icon" />
                    </div>
                    <h3>No starred projects yet</h3>
                    <p>Projects you star in your dashboard will appear here for quick access.</p>
                    <button className="btn btn-primary mt-6" onClick={() => navigate('/dashboard')}>
                        Go to Dashboard
                    </button>
                </div>
            ) : (

                <div className="projects-grid mt-8">
                    {projects.map((project) => {
                        const Icon = IconMap[project.thumbnailIcon] || BuildingOffice2Icon;
                        const colors = project.themeColors || { c1: '#dce8ff', c2: '#b8d0f8' };

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
                                            <span className="project-date" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}</span>
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
            )}

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
        </div>
    );
}
