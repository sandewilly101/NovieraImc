const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const asyncHandler = require('express-async-handler');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', asyncHandler(async (req, res) => {
    const notifications = await Notification.findAll({
        where: { userId: req.user.id },
        order: [['createdAt', 'DESC']]
    });
    res.status(200).json({ success: true, count: notifications.length, data: notifications });
}));

router.put('/:id/read', asyncHandler(async (req, res) => {
    const notification = await Notification.findOne({
        where: { id: req.params.id, userId: req.user.id }
    });
    if (!notification) return res.status(404).json({ success: false, error: 'Notification not found' });
    notification.isRead = true;
    await notification.save();
    res.status(200).json({ success: true, data: notification });
}));

module.exports = router;
