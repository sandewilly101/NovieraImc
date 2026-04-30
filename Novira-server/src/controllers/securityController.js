const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const getSignedJwtToken = require('../config/authUtils');

exports.getSecurityStatus = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: [
                'id', 'email', 'emailVerified',
                'twoFactorEnabled',
                'lastLoginAt', 'lastLoginIp', 'loginCount',
                'passwordResetToken', 'passwordResetExpires',
                'createdAt', 'updatedAt'
            ]
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        let score = 40;
        if (user.emailVerified) score += 20;
        if (user.twoFactorEnabled) score += 30;
        if (user.email) score += 10;

        score = Math.min(score, 100);

        res.status(200).json({
            success: true,
            data: {
                email: user.email,
                emailVerified: user.emailVerified,
                twoFactorEnabled: user.twoFactorEnabled,
                lastLoginAt: user.lastLoginAt,
                lastLoginIp: user.lastLoginIp,
                loginCount: user.loginCount,
                securityScore: score,
                accountAge: user.createdAt
            }
        });
    } catch (error) {
        console.error('getSecurityStatus Error:', error);
        res.status(500).json({ success: false, message: 'Server error fetching security status' });
    }
};

exports.setup2FA = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({
                success: false,
                message: '2FA is already enabled. Disable it first before setting up again.'
            });
        }

        const secret = speakeasy.generateSecret({
            name: `Novira (${user.email})`,
            length: 20
        });

        await user.update({ twoFactorSecret: secret.base32 });

        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        res.status(200).json({
            success: true,
            data: {
                qrCodeDataUrl,
                manualEntryKey: secret.base32,
                otpauthUrl: secret.otpauth_url
            }
        });
    } catch (error) {
        console.error('setup2FA Error:', error);
        res.status(500).json({ success: false, message: 'Server error generating 2FA secret' });
    }
};

exports.verify2FA = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { token } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.twoFactorSecret) {
            return res.status(400).json({
                success: false,
                message: 'No 2FA setup in progress. Please call /api/security/2fa/setup first.'
            });
        }

        if (user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: '2FA is already active.' });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: String(token).trim(),
            window: 1
        });

        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired authentication code. Please try again.'
            });
        }

        await user.update({ twoFactorEnabled: true });

        const newToken = getSignedJwtToken(user.id);

        res.status(200).json({
            success: true,
            message: 'Two-factor authentication enabled successfully.',
            token: newToken
        });
    } catch (error) {
        console.error('verify2FA Error:', error);
        res.status(500).json({ success: false, message: 'Server error verifying 2FA token' });
    }
};

exports.disable2FA = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { password, token } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: '2FA is not currently enabled.' });
        }

        const isPasswordValid = await user.matchPassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const isTokenValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: String(token).trim(),
            window: 1
        });

        if (!isTokenValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid authentication code. Please check your authenticator app.'
            });
        }

        await user.update({
            twoFactorEnabled: false,
            twoFactorSecret: null
        });

        const newToken = getSignedJwtToken(user.id);

        res.status(200).json({
            success: true,
            message: 'Two-factor authentication has been disabled.',
            token: newToken
        });
    } catch (error) {
        console.error('disable2FA Error:', error);
        res.status(500).json({ success: false, message: 'Server error disabling 2FA' });
    }
};

exports.validate2FA = async (req, res) => {
    try {
        const { token } = req.body;

        const user = await User.findByPk(req.user.id);
        if (!user || !user.twoFactorEnabled) {
            return res.status(400).json({ success: false, message: '2FA is not enabled on this account.' });
        }

        const isValid = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: String(token).trim(),
            window: 1
        });

        if (!isValid) {
            return res.status(401).json({ success: false, message: 'Invalid authentication code.' });
        }

        res.status(200).json({ success: true, message: 'Token is valid.' });
    } catch (error) {
        console.error('validate2FA Error:', error);
        res.status(500).json({ success: false, message: 'Server error validating token' });
    }
};
