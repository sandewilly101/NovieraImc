const Project = require('../models/Project');
const User = require('../models/User');
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');
const { Sequelize } = require('sequelize');

exports.getDashboardStats = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const totalProjects = await Project.count({ where: { userId } });

    const inReviewCount = await Project.count({ where: { userId, status: 'review' } });
    const renderReadyCount = await Project.count({ where: { userId, status: 'live' } });

    const notificationCount = await Notification.count({ where: { userId, isRead: false } });

    const avgObjectsResult = await Project.findOne({
        attributes: [[Sequelize.fn('AVG', Sequelize.col('objectCount')), 'avgObjects']],
        where: { userId },
        raw: true
    });
    const avgObjects = parseFloat(avgObjectsResult.avgObjects || 0).toFixed(1);

    const user = await User.findByPk(userId, {
        attributes: ['storageUsedBytes', 'storageLimitBytes', 'aiCredits', 'dayStreak', 'plan']
    });

    const storageUsagePct = user.storageLimitBytes > 0
        ? ((user.storageUsedBytes / user.storageLimitBytes) * 100).toFixed(1)
        : 0;

    const planLimits = {
        free: { projects: 10, aiCredits: 50, avgObjectsMax: 100 },
        pro: { projects: 100, aiCredits: 500, avgObjectsMax: 500 },
        team: { projects: 500, aiCredits: 2000, avgObjectsMax: 1000 },
        enterprise: { projects: 999, aiCredits: 9999, avgObjectsMax: 5000 },
    };
    const limits = planLimits[user.plan] || planLimits.free;

    res.status(200).json({
        success: true,
        data: {
            totalProjects,
            inReviewCount,
            renderReadyCount,
            notificationCount,
            avgObjects,
            storageUsage: {
                used: user.storageUsedBytes,
                limit: user.storageLimitBytes,
                percentage: storageUsagePct
            },
            aiCredits: user.aiCredits,
            dayStreak: user.dayStreak || 0,

            projectLimit: limits.projects,
            aiCreditsLimit: limits.aiCredits,
            avgObjectsMax: limits.avgObjectsMax,
        }
    });
});
