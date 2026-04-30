import React, { useState, useEffect } from 'react';
import { projectService } from '../api/apiService';
import { motion, AnimatePresence } from 'framer-motion';
import { GlobeAltIcon, UsersIcon, TrashIcon, PencilIcon, BoltIcon, ShareIcon, SparklesIcon, BuildingOffice2Icon, CursorArrowRippleIcon, BeakerIcon, MusicalNoteIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { BoltIcon as BoltIconSolid, StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { StarIcon as StarOutline } from '@heroicons/react/24/outline';

const IconMap = {
    BuildingOffice2Icon,
    CursorArrowRippleIcon,
    BeakerIcon,
    MusicalNoteIcon
};
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/common/ConfirmModal';

export default function SharedPage() {
    const navigate = useNavigate();
    const [sharedProjects, setSharedProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activityLog, setActivityLog] = useState([]);

    const [editingProject, setEditingProject] = useState(null);
    const [editingName, setEditingName] = useState('');
    const [confirmModal, setConfirmModal] = useState({ isOpen: false, projectId: null, projectName: '' });

    useEffect(() => {
        fetchSharedProjects();
    }, []);

    useEffect(() => {
        if (sharedProjects.length === 0) return;

        const fetchActivities = async () => {
            try {
                const res = await projectService.getSharedActivity();
                setActivityLog(res.data.data);
            } catch (error) {
                console.error('Failed to fetch shared activity log:', error);
            }
        };

        fetchActivities();

        const activityInterval = setInterval(fetchActivities, 10000);

        return () => clearInterval(activityInterval);
    }, [sharedProjects.length]);

    const fetchSharedProjects = async () => {
        try {
            setLoading(true);
            const res = await projectService.getProjects();

            const filtered = res.data.data.filter(p => Boolean(p.isShared));
            setSharedProjects(filtered);
        } catch (error) {
            console.error('Failed to fetch shared projects:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleShare = async (id) => {
        try {

            setSharedProjects(prev => prev.filter(p => p.id !== id));
            await projectService.toggleShare(id);
        } catch (error) {
            console.error('Failed to toggle share:', error);
            fetchSharedProjects();
        }
    };

    const handleDeleteClick = (e, project) => {
        e.stopPropagation();
        setConfirmModal({ isOpen: true, projectId: project.id, projectName: project.name });
    };

    const confirmDeleteProject = async () => {
        const id = confirmModal.projectId;
        if (!id) return;
        try {
            await projectService.deleteProject(id);
            setSharedProjects(prev => prev.filter(p => p.id !== id));
            setConfirmModal({ isOpen: false, projectId: null, projectName: '' });
        } catch (error) {
            console.error('Failed to delete project:', error);
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
            setSharedProjects(prev => prev.map(p => p.id === editingProject ? res.data.data : p));
            setEditingProject(null);
        } catch (error) {
            console.error('Failed to update project:', error);
        }
    };

    const handleEditKeyDown = (e) => {
        e.stopPropagation();
        if (e.key === 'Enter') saveEditing(e);
        else if (e.key === 'Escape') setEditingProject(null);
    };

    if (loading) {
        return (
            <div className="shared-page-container">
                <div className="animate-pulse flex space-x-4 p-8">
                    <div className="flex-1 space-y-4 py-1">
                        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
                        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="shared-page-container fade-in">

            <div className="shared-page-3d-bg">
                <div className="bg-object bg-object-1"></div>
                <div className="bg-object bg-object-2"></div>
                <div className="bg-object bg-object-3"></div>
            </div>

            <div className="dash-welcome shared-welcome-hero" style={{ marginBottom: '32px', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '24px', paddingRight: '32px' }}>

                <div className="hero-3d-container">
                    <div className="hero-grid-3d"></div>
                    <div className="hero-floating-cube cube-1">
                        <div className="cube-face face-front"></div>
                        <div className="cube-face face-back"></div>
                        <div className="cube-face face-right"></div>
                        <div className="cube-face face-left"></div>
                        <div className="cube-face face-top"></div>
                        <div className="cube-face face-bottom"></div>
                    </div>
                    <div className="hero-floating-cube cube-2">
                        <div className="cube-face face-front"></div>
                        <div className="cube-face face-back"></div>
                        <div className="cube-face face-right"></div>
                        <div className="cube-face face-left"></div>
                        <div className="cube-face face-top"></div>
                        <div className="cube-face face-bottom"></div>
                    </div>
                </div>

                <div className="dash-welcome-left" style={{ position: 'relative', zIndex: 2, background: 'rgba(255, 255, 255, 0.2)', borderRadius: '6px', padding: '32px', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1)', flex: 1 }}>
                    <div className="dash-welcome-date" style={{ color: 'var(--green)', fontFamily: "'Archivo', sans-serif", fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', fontSize: '10px', marginBottom: '8px' }}>Live Collaboration</div>
                    <h1 style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div className="rotating-3d-box-lg">
                            <div className="box-face face-front"></div>
                            <div className="box-face face-back"></div>
                            <div className="box-face face-right"></div>
                            <div className="box-face face-left"></div>
                            <div className="box-face face-top"></div>
                            <div className="box-face face-bottom"></div>
                        </div>
                        <span className="greeting-text" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>Shared</span>
                        <span className="greeting-name" style={{ color: 'var(--green)', textShadow: '0 2px 10px rgba(34, 197, 94, 0.2)' }}>Workspace</span>
                    </h1>
                    <p className="dash-welcome-sub" style={{ maxWidth: '600px', opacity: 0.9 }}>Collaborate in real-time on spatial designs. Your team's active sessions and live activity are synced across the network.</p>
                </div>

                <div className="live-activity-sidebar" style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: '300px', top: 0, margin: 0, maxHeight: '280px', overflowY: 'auto', padding: '16px', background: 'rgba(255, 255, 255, 0.2)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.3)', boxShadow: '0 8px 32px rgba(34, 197, 94, 0.1)' }}>
                    <div className="activity-header" style={{ marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.2)' }}>
                        <h3><SparklesIcon className="zeicon text-green mr-2" style={{ width: 14, height: 14, display: 'inline' }} /> Live Contributions</h3>
                        <div className="rotating-3d-box-sm">
                            <div className="box-face face-front"></div>
                            <div className="box-face face-back"></div>
                            <div className="box-face face-right"></div>
                            <div className="box-face face-left"></div>
                            <div className="box-face face-top"></div>
                            <div className="box-face face-bottom"></div>
                        </div>
                    </div>
                    <div className="activity-feed" style={{ gap: '8px', paddingRight: '4px' }}>
                        {activityLog.length === 0 && (
                            <p style={{ fontSize: '10px', color: 'var(--silver)', textAlign: 'center', marginTop: '16px' }}>Waiting for updates...</p>
                        )}
                        {activityLog.map(log => {
                            const username = log.User?.username || 'Unknown';
                            const avatarPath = log.User?.avatarUrl || `https://i.pravatar.cc/100?u=${username}`;
                            const projectName = log.Project?.name || 'a project';

                            return (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="activity-item"
                                    style={{ padding: '8px', gap: '8px', borderRadius: '4px', background: 'rgba(255, 255, 255, 0.4)', border: '1px solid rgba(255, 255, 255, 0.5)' }}
                                >
                                    <img src={avatarPath} alt="User" style={{ width: 24, height: 24, borderRadius: '4px', objectFit: 'cover' }} />
                                    <div className="activity-details">
                                        <p style={{ marginBottom: '2px' }}><strong>{username}</strong> {log.action} <span>{projectName}</span></p>
                                        <div className="activity-meta">
                                            <span>{formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}</span>
                                            {log.progress && <span className="text-green font-medium">+{log.progress}%</span>}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {sharedProjects.length === 0 ? (
                <div className="shared-empty-state" style={{ position: 'relative', zIndex: 5 }}>
                    <div className="empty-icon-wrapper">
                        <UsersIcon className="zeicon text-silver" style={{ width: 48, height: 48 }} />
                    </div>
                    <h2>No shared projects</h2>
                    <p>You haven't shared any designs yet. Click the share icon on your projects to invite collaborators and see live presence here.</p>
                </div>
            ) : (
                <div className="shared-content-wrapper" style={{ position: 'relative', zIndex: 5 }}>
                    <div className="projects-grid">
                        <AnimatePresence>
                            {sharedProjects.map(project => {
                                const liveCount = project.liveCount || 0;
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
                                    <motion.div
                                        key={project.id}
                                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                                        animate={{ opacity: 1, y: 0, scale: 1 }}
                                        exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                                        whileHover={{ y: -8 }}
                                        className="project-card"
                                        onClick={() => navigate(`/editor/${project.id}`)}
                                    >
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
                                                        onKeyDown={handleEditKeyDown}
                                                        onClick={(e) => e.stopPropagation()}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="project-name">{project.name}</div>
                                                )}
                                                <div className="project-actions">
                                                    <button className={`action-icon share ${project.isShared ? 'active' : ''}`} onClick={(e) => { e.stopPropagation(); handleToggleShare(project.id); }}>
                                                        <ShareIcon className="zeicon" style={project.isShared ? { fill: 'var(--green)', color: 'var(--green)' } : {}} />
                                                    </button>
                                                    <button className="action-icon edit" onClick={(e) => startEditing(e, project)}>
                                                        <PencilSquareIcon className="zeicon" />
                                                    </button>
                                                    <button className="action-icon delete" onClick={(e) => handleDeleteClick(e, project)}>
                                                        <TrashIcon className="zeicon" />
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="project-meta-bottom" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '4px', marginTop: '12px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <span className="project-objects" style={{ fontSize: '11px', color: 'var(--green)', background: 'rgba(34, 197, 94, 0.1)', padding: '2px 8px', borderRadius: '12px', fontWeight: '500', display: 'inline-flex', alignItems: 'center' }}>{project.objectCount} objects</span>

                                                        {(liveCount > 0) ? (
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
                                                                    <div className="box-face" style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'translateZ(4px)', border: '0.5px solid white' }}></div>
                                                                    <div className="box-face" style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateY(180deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                                    <div className="box-face" style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateY(90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                                    <div className="box-face" style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateY(-90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                                    <div className="box-face" style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateX(90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                                    <div className="box-face" style={{ position: 'absolute', width: '100%', height: '100%', background: 'var(--blue)', opacity: 0.8, transform: 'rotateX(-90deg) translateZ(4px)', border: '0.5px solid white' }}></div>
                                                                </div>
                                                                {liveCount} LIVE
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
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </div>

                </div>
            )}

            <ConfirmModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ isOpen: false, projectId: null, projectName: '' })}
                onConfirm={confirmDeleteProject}
                title="Delete Project"
                message={`Are you sure you want to delete "${confirmModal.projectName}"? This action cannot be undone.`}
                confirmText="Delete"
                type="danger"
            />
        </div>
    );
}
