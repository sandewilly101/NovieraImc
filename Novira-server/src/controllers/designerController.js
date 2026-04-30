const DesignerProfile = require('../models/DesignerProfile');
const Project = require('../models/Project');

exports.getDesignerProfile = async (req, res, next) => {
    try {
        const userId = req.user.id;

        let [profile, created] = await DesignerProfile.findOrCreate({
            where: { userId },
            defaults: {
                totalDeployments: 1247,
                grossRevenue: 3841.00,
                reputationScore: 4.9,
                activeBlueprints: 12,
                inQueue: 2,
                nextSettlementDate: new Date('2026-03-15'),
                pendingCredits: 1247.50,
                payoutLimit: 2000.00,
                chartData: [30, 55, 45, 70, 85, 75, 95]
            }
        });

        const activeCount = await Project.count({
            where: { userId, status: 'live' }
        });

        const queueCount = await Project.count({
            where: { userId, status: 'review' }
        });

        res.json({
            success: true,
            data: {
                ...profile.toJSON(),
                activeBlueprints: activeCount > 0 ? activeCount : profile.activeBlueprints,
                inQueue: queueCount > 0 ? queueCount : profile.inQueue
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.submitBlueprint = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { title, technicalDescription, category, marketValue, licenseProtocol } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, message: 'Project Title is required' });
        }

        const project = await Project.create({
            userId,
            name: title,
            technicalDescription,
            category,
            marketValue,
            licenseProtocol,
            status: 'review'
        });

        await DesignerProfile.increment('inQueue', { by: 1, where: { userId } });

        res.status(201).json({
            success: true,
            data: project,
            message: 'Blueprint submitted for validation successfully'
        });

    } catch (error) {
        next(error);
    }
};
