const express = require('express');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const userController = require('../controllers/userController');
const { protect } = require('../middlewares/authMiddleware');
const { checkStorageLimit } = require('../middlewares/storageMiddleware');
const upload = require('../middlewares/uploadMiddleware');

const credentialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many credential change attempts. Please try again in 15 minutes.'
    }
});

const passwordRules = [
    check('currentPassword', 'Current password is required').notEmpty(),
    check('newPassword', 'New password must be at least 8 characters')
        .isLength({ min: 8 })
        .matches(/[A-Za-z]/).withMessage('Password must contain at least one letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number')
];

const emailRules = [
    check('newEmail', 'Please provide a valid email address').isEmail().normalizeEmail(),
    check('currentPassword', 'Current password is required').notEmpty()
];

router.get('/me', protect, userController.getMe);
router.put('/me', protect, userController.updateMe);
router.put('/me/password', protect, credentialLimiter, passwordRules, userController.updatePassword);
router.put('/me/email', protect, credentialLimiter, emailRules, userController.updateEmail);
router.put('/me/plan', protect, userController.updatePlan);
router.post('/me/avatar', protect, checkStorageLimit, upload.single('avatar'), userController.uploadAvatar);

router.post('/', userController.createUser);
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
