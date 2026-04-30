const Project = require('../models/Project');
const User = require('../models/User');
const ProjectMember = require('../models/ProjectMember');
const Notification = require('../models/Notification');
const ProjectActivity = require('../models/ProjectActivity');
const asyncHandler = require('express-async-handler');
const { Op } = require('sequelize');

exports.getProjects = asyncHandler(async (req, res) => {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ success: false, error: 'User not found' });
    }

    const projects = await Project.findAll({
        include: [{
            model: ProjectMember,
            as: 'members',
            required: false,
            where: { status: 'accepted' }
        }],
        where: {
            [Op.or]: [
                { userId: req.user.id },
                { '$members.userId$': req.user.id }
            ]
        },
        order: [['updatedAt', 'DESC']]
    });

    const threshold = new Date(Date.now() - 2 * 60 * 1000);

    const projectsWithLiveCount = await Promise.all(projects.map(async (p) => {
        const liveCount = await ProjectMember.count({
            where: {
                projectId: p.id,
                status: 'accepted',
                lastActiveAt: { [Op.gt]: threshold }
            }
        });

        const plainProject = p.get({ plain: true });
        plainProject.liveCount = liveCount || 0;
        return plainProject;
    }));

    res.status(200).json({
        success: true,
        count: projectsWithLiveCount.length,
        data: projectsWithLiveCount
    });
});

exports.createProject = asyncHandler(async (req, res) => {

    req.body.userId = req.user.id;

    const project = await Project.create(req.body);

    res.status(201).json({
        success: true,
        data: project
    });
});

exports.getProject = asyncHandler(async (req, res) => {
    const project = await Project.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    res.status(200).json({
        success: true,
        data: project
    });
});

exports.updateProject = asyncHandler(async (req, res) => {
    let project = await Project.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    project = await project.update(req.body);

    await ProjectActivity.create({
        userId: req.user.id,
        projectId: project.id,
        action: 'updated project settings'
    });

    res.status(200).json({
        success: true,
        data: project
    });
});

exports.deleteProject = asyncHandler(async (req, res) => {
    const project = await Project.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    await project.destroy();

    res.status(200).json({
        success: true,
        data: {}
    });
});

exports.toggleStar = asyncHandler(async (req, res) => {
    const project = await Project.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    project.isStarred = !project.isStarred;
    await project.save();

    res.status(200).json({
        success: true,
        data: project
    });
});

exports.toggleShare = asyncHandler(async (req, res) => {
    const project = await Project.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    project.isShared = !project.isShared;
    await project.save();

    res.status(200).json({
        success: true,
        data: project
    });
});

exports.inviteUser = asyncHandler(async (req, res) => {
    const { username, role } = req.body;

    const project = await Project.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found or unauthorized' });
    }

    const targetUser = await User.findOne({ where: { username } });
    if (!targetUser) {
        return res.status(404).json({ success: false, error: 'User not found with that username' });
    }

    if (targetUser.id === req.user.id) {
        return res.status(400).json({ success: false, error: 'You cannot invite yourself' });
    }

    const existingMember = await ProjectMember.findOne({
        where: { projectId: project.id, userId: targetUser.id }
    });

    if (existingMember) {
        return res.status(400).json({ success: false, error: 'User is already a member or has a pending invite' });
    }

    await ProjectMember.create({
        projectId: project.id,
        userId: targetUser.id,
        role: role || 'editor',
        status: 'pending'
    });

    await Notification.create({
        userId: targetUser.id,
        type: 'PROJECT_INVITE',
        title: 'Project Invitation',
        message: `${req.user.username || 'Someone'} has invited you to collaborate on '${project.name}'.`,
        relatedId: project.id
    });

    res.status(200).json({
        success: true,
        message: `Invitation sent to ${targetUser.username}`
    });
});

exports.acceptInvite = asyncHandler(async (req, res) => {

    const membership = await ProjectMember.findOne({
        where: { projectId: req.params.id, userId: req.user.id, status: 'pending' }
    });

    if (!membership) {
        return res.status(404).json({ success: false, error: 'No pending invitation found for this project' });
    }

    membership.status = 'accepted';
    await membership.save();

    res.status(200).json({
        success: true,
        data: membership
    });
});

exports.heartbeat = asyncHandler(async (req, res) => {

    let membership = await ProjectMember.findOne({
        where: { projectId: req.params.id, userId: req.user.id }
    });

    if (!membership) {
        const project = await Project.findOne({ where: { id: req.params.id, userId: req.user.id } });
        if (project) {

            membership = await ProjectMember.findOrCreate({
                where: { projectId: req.params.id, userId: req.user.id },
                defaults: { role: 'owner', status: 'accepted' }
            }).then(([m]) => m);
        }
    }

    if (!membership) {
        return res.status(403).json({ success: false, error: 'Not authorized for heartbeat' });
    }

    membership.lastActiveAt = new Date();
    await membership.save();

    res.status(200).json({
        success: true,
        data: { lastActiveAt: membership.lastActiveAt }
    });
});

exports.getCommunityProjects = asyncHandler(async (req, res) => {
    const { type, category } = req.query;

    const whereCondition = {};
    if (type === 'finished') {
        whereCondition.isFinished = true;
    } else if (type === 'shared') {
        whereCondition.isShared = true;
    } else {
        return res.status(400).json({ success: false, error: 'Invalid type. Use "finished" or "shared"' });
    }

    if (category && category !== 'All') {
        whereCondition.category = category;
    }

    const projects = await Project.findAll({
        where: whereCondition,
        include: [{
            model: User,
            attributes: ['id', 'username', 'avatarUrl']
        }],
        order: [['createdAt', 'DESC']],
        limit: 50
    });

    let likedProjectIds = new Set();
    if (req.user) {
        const ProjectLike = require('../models/ProjectLike');
        const likes = await ProjectLike.findAll({
            where: {
                userId: req.user.id,
                projectId: projects.map(p => p.id)
            }
        });
        likedProjectIds = new Set(likes.map(l => l.projectId));
    }

    const formattedProjects = projects.map(p => {
        const isLiked = likedProjectIds.has(p.id);
        return {
            id: p.id,
            name: p.name,
            ownerName: p.User ? p.User.username : 'Unknown',
            ownerAvatar: p.User ? p.User.avatarUrl : null,
            isVerified: p.isVerified,
            views: p.views,
            likes: p.likes,
            isLiked,
            status: type,
            category: p.category,
            thumbnailIcon: p.thumbnailIcon,
            themeColors: p.themeColors || null
        };
    });

    res.status(200).json({
        success: true,
        count: formattedProjects.length,
        data: formattedProjects
    });
});

exports.toggleLikeProject = asyncHandler(async (req, res) => {
    const ProjectLike = require('../models/ProjectLike');
    const projectId = req.params.id;
    const userId = req.user.id;

    const project = await Project.findByPk(projectId);
    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    const existingLike = await ProjectLike.findOne({
        where: { projectId, userId }
    });

    let isLiked = false;

    if (existingLike) {

        await existingLike.destroy();
        project.likes = Math.max(0, project.likes - 1);
        await project.save();
    } else {

        await ProjectLike.create({ projectId, userId });
        project.likes += 1;
        await project.save();
        isLiked = true;
    }

    res.status(200).json({
        success: true,
        data: {
            id: project.id,
            likes: project.likes,
            isLiked
        }
    });
});

exports.recordView = asyncHandler(async (req, res) => {
    const project = await Project.findByPk(req.params.id);

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    project.views += 1;
    await project.save();

    res.status(200).json({
        success: true,
        data: {
            id: project.id,
            views: project.views
        }
    });
});

exports.getLatestProject = asyncHandler(async (req, res) => {

    let project = await Project.findOne({
        where: { userId: req.user.id },
        order: [['updatedAt', 'DESC']]
    });

    if (!project) {

        project = await Project.create({
            userId: req.user.id,
            name: 'Untitled Design',
            status: 'draft',
            sceneGraph: []
        });
    }

    res.status(200).json({
        success: true,
        data: project
    });
});

exports.updateSceneGraph = asyncHandler(async (req, res) => {
    const { sceneGraph } = req.body;

    const project = await Project.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });

    if (!project) {
        return res.status(404).json({ success: false, error: 'Project not found' });
    }

    project.sceneGraph = sceneGraph || [];
    project.objectCount = project.sceneGraph.length;
    await project.save();

    await ProjectActivity.create({
        userId: req.user.id,
        projectId: project.id,
        action: 'modified 3D objects',
        progress: Math.floor(Math.random() * 12) + 1
    });

    res.status(200).json({ success: true, data: project });
});

exports.getSharedActivity = asyncHandler(async (req, res) => {

    const projects = await Project.findAll({
        include: [{
            model: ProjectMember,
            as: 'members',
            required: false,
            where: { status: 'accepted' }
        }],
        where: {
            isShared: true,
            [Op.or]: [
                { userId: req.user.id },
                { '$members.userId$': req.user.id }
            ]
        }
    });

    const projectIds = projects.map(p => p.id);

    const activities = await ProjectActivity.findAll({
        where: { projectId: projectIds },
        include: [
            { model: User, attributes: ['username', 'avatarUrl'] },
            { model: Project, attributes: ['name'] }
        ],
        order: [['createdAt', 'DESC']],
        limit: 15
    });

    res.status(200).json({
        success: true,
        data: activities
    });
});
