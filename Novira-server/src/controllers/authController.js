const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const User = require('../models/User');
const { validationResult } = require('express-validator');

const getSignedJwtToken = require('../config/authUtils');

exports.register = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { fullName, email, password } = req.body;

    const firstNameForUsername = fullName ? fullName.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '') : 'designer';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const username = `${firstNameForUsername}${randomSuffix}`;

    const nameParts = fullName ? fullName.split(' ') : [];
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    const user = await User.create({
        username,
        email,
        password,
        firstName,
        lastName,
        displayName: fullName
    });

    const token = getSignedJwtToken(user.id);

    res.status(201).json({
        success: true,
        token,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.displayName,
            email: user.email
        }
    });
});

exports.login = asyncHandler(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });

    if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = getSignedJwtToken(user.id);

    res.status(200).json({
        success: true,
        token,
        user: {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            fullName: user.displayName,
            email: user.email
        }
    });
});

exports.getMe = asyncHandler(async (req, res, next) => {
    const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password'] }
    });

    res.status(200).json({
        success: true,
        data: user,
    });
});
