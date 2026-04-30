const User = require('../models/User');
const PLAN_CONFIG = require('../config/planConfig');
const getSignedJwtToken = require('../config/authUtils');
const { validationResult } = require('express-validator');

exports.createUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.create({ username, email, password });
        res.status(201).json({ message: 'User created successfully', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
};

exports.getUsers = async (req, res) => {
    try {
        const users = await User.findAll();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve users', details: error.message });
    }
};

exports.getUserById = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user', details: error.message });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await user.update({ username, email, password });
        res.status(200).json({ message: 'User updated successfully', user });
    } catch (error) {
        res.status(500).json({ error: 'Failed to update user', details: error.message });
    }
};

exports.deleteUser = async (req, res) => {
    try {
        const user = await User.findByPk(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        await user.destroy();
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete user', details: error.message });
    }
};

exports.getMe = async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: { exclude: ['password', 'twoFactorSecret', 'refreshToken'] }
        });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server Error fetching user profile' });
    }
};

exports.updateMe = async (req, res) => {
    try {

        const updates = { ...req.body };
        const sensitiveFields = ['id', 'password', 'role', 'plan', 'emailVerified', 'twoFactorEnabled', 'isActive', 'isBanned', 'aiCredits', 'storageUsedBytes', 'storageLimitBytes'];

        sensitiveFields.forEach(field => delete updates[field]);

        Object.keys(updates).forEach(key => {
            if (updates[key] === '') {
                updates[key] = null;
            }
        });

        const user = await User.findByPk(req.user.id);

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await user.update(updates);

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ success: false, message: 'Server error updating profile' });
    }
};

exports.updatePassword = async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Please provide current and new password' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const isSame = await user.matchPassword(newPassword);
        if (isSame) {
            return res.status(400).json({ success: false, message: 'New password must be different from your current password' });
        }

        user.password = newPassword;
        await user.save();

        const token = getSignedJwtToken(user.id);

        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
            token
        });
    } catch (error) {
        console.error('Update Password Error:', error);
        res.status(500).json({ success: false, message: 'Server error updating password' });
    }
};

exports.updateEmail = async (req, res) => {
    try {

        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array()[0].msg });
        }

        const { currentPassword, newEmail } = req.body;

        if (!currentPassword || !newEmail) {
            return res.status(400).json({ success: false, message: 'Please provide current password and new email' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.email.toLowerCase() === newEmail.toLowerCase()) {
            return res.status(400).json({ success: false, message: 'New email must be different from your current email' });
        }

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        }

        const emailExists = await User.findOne({ where: { email: newEmail } });
        if (emailExists) {
            return res.status(400).json({ success: false, message: 'This email is already associated with another account' });
        }

        user.email = newEmail;
        user.emailVerified = false;
        await user.save();

        const token = getSignedJwtToken(user.id);

        res.status(200).json({
            success: true,
            message: 'Email updated successfully',
            email: newEmail,
            token
        });
    } catch (error) {
        console.error('Update Email Error:', error);
        res.status(500).json({ success: false, message: 'Server error updating email' });
    }
};

exports.updatePlan = async (req, res) => {
    try {
        const { plan } = req.body;

        if (!PLAN_CONFIG[plan]) {
            return res.status(400).json({ success: false, message: 'Invalid plan selected' });
        }

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const config = PLAN_CONFIG[plan];
        user.plan = plan;
        user.storageLimitBytes = config.storageLimit;

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + config.durationDays);
        user.planExpiresAt = expiryDate;

        await user.save();

        res.status(200).json({
            success: true,
            message: `Plan updated to ${plan} successfully`,
            data: {
                plan: user.plan,
                storageLimitBytes: user.storageLimitBytes,
                planExpiresAt: user.planExpiresAt
            }
        });
    } catch (error) {
        console.error('Update Plan Error:', error);
        res.status(500).json({ success: false, message: 'Server error updating plan' });
    }
};

exports.uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        const avatarUrl = req.file.path;

        const user = await User.findByPk(req.user.id);
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        await user.update({ avatarUrl });

        res.status(200).json({
            success: true,
            message: 'Avatar uploaded successfully',
            avatarUrl: avatarUrl
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        res.status(500).json({ success: false, message: 'Failed to upload image' });
    }
};
