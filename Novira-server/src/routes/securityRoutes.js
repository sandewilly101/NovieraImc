const express = require('express');
const { check } = require('express-validator');
const rateLimit = require('express-rate-limit');
const { protect } = require('../middlewares/authMiddleware');
const {
    getSecurityStatus,
    setup2FA,
    verify2FA,
    disable2FA,
    validate2FA
} = require('../controllers/securityController');

const router = express.Router();

const securityLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many security requests. Please wait 15 minutes before trying again.'
    }
});

router.use(protect);

router.use(securityLimiter);

router.get('/status', getSecurityStatus);

router.get('/2fa/setup', setup2FA);

router.post(
    '/2fa/verify',
    [
        check('token', '6-digit authentication code is required')
            .notEmpty()
            .isLength({ min: 6, max: 6 })
            .isNumeric()
    ],
    verify2FA
);

router.post(
    '/2fa/disable',
    [
        check('password', 'Current password is required').notEmpty(),
        check('token', '6-digit authentication code is required')
            .notEmpty()
            .isLength({ min: 6, max: 6 })
            .isNumeric()
    ],
    disable2FA
);

router.post(
    '/2fa/validate',
    [
        check('token', '6-digit authentication code is required')
            .notEmpty()
            .isLength({ min: 6, max: 6 })
            .isNumeric()
    ],
    validate2FA
);

module.exports = router;
