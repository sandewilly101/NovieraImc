const User = require('../models/User');

const checkStorageLimit = async (req, res, next) => {
    try {
        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.storageUsedBytes >= user.storageLimitBytes) {
            return res.status(403).json({
                success: false,
                message: 'Storage limit reached. Please upgrade your plan to continue uploading.',
                limitReached: true
            });
        }

        next();
    } catch (error) {
        console.error('Storage Check Error:', error);
        res.status(500).json({ success: false, message: 'Error checking storage limits' });
    }
};

module.exports = { checkStorageLimit };
