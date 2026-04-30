const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {

    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique public handle',
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true,
        validate: { isEmail: true },
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },

    firstName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    lastName: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    displayName: {
        type: DataTypes.STRING(150),
        allowNull: true,
        comment: 'Public display name shown in the app',
    },
    bio: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Short user biography',
    },
    avatarUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Profile picture URL',
    },
    bannerUrl: {
        type: DataTypes.STRING(500),
        allowNull: true,
        comment: 'Profile banner image URL',
    },
    website: {
        type: DataTypes.STRING(255),
        allowNull: true,
        validate: {
            isUrlOrEmpty(value) {
                if (value && value.trim() !== '' && !/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(value)) {
                    throw new Error('Invalid URL format');
                }
            }
        },
    },
    phone: {
        type: DataTypes.STRING(30),
        allowNull: true,
    },
    dateOfBirth: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'non-binary', 'prefer_not_to_say'),
        allowNull: true,
    },

    companyName: {
        type: DataTypes.STRING(200),
        allowNull: true,
        comment: 'Organization or Company name',
    },
    jobTitle: {
        type: DataTypes.STRING(150),
        allowNull: true,
    },
    industry: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'e.g. Architecture, Game Dev, VFX',
    },

    country: {
        type: DataTypes.STRING(2),
        allowNull: true,
        comment: 'ISO 3166-1 alpha-2 country code (e.g. US, KE)',
    },
    timezone: {
        type: DataTypes.STRING(100),
        defaultValue: 'UTC',
        comment: 'IANA timezone string (e.g. Africa/Nairobi)',
    },
    language: {
        type: DataTypes.STRING(10),
        defaultValue: 'en',
        comment: 'BCP 47 language tag (e.g. en, fr, sw)',
    },
    locale: {
        type: DataTypes.STRING(20),
        defaultValue: 'en-US',
        comment: 'Full locale (e.g. en-US, fr-FR)',
    },

    role: {
        type: DataTypes.ENUM('user', 'designer', 'moderator', 'admin', 'superadmin'),
        defaultValue: 'user',
    },
    plan: {
        type: DataTypes.ENUM('free', 'advanced', 'premium'),
        defaultValue: 'free',
        comment: 'Subscription tier: free, advanced, premium',
    },
    isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'False = account deactivated by user',
    },
    isBanned: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'True = banned by an admin',
    },
    banReason: {
        type: DataTypes.STRING(500),
        allowNull: true,
    },
    bannedAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    planExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Timestamp when the current subscription plan expires',
    },

    emailVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    emailVerificationToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    emailVerificationExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    },

    passwordResetToken: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    passwordResetExpires: {
        type: DataTypes.DATE,
        allowNull: true,
    },

    twoFactorEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    twoFactorSecret: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'TOTP secret for authenticator apps',
    },

    googleId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
    },
    githubId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
    },
    microsoftId: {
        type: DataTypes.STRING(255),
        allowNull: true,
        unique: true,
    },

    refreshToken: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Hashed refresh token for persistent sessions',
    },
    lastLoginAt: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    lastLoginIp: {
        type: DataTypes.STRING(45),
        allowNull: true,
        comment: 'Supports both IPv4 and IPv6',
    },
    loginCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },

    theme: {
        type: DataTypes.ENUM('light', 'dark', 'system'),
        defaultValue: 'dark',
    },
    notificationsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
    marketingEmailsEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    preferences: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Flexible key-value store for app-specific user settings',
    },

    storageUsedBytes: {
        type: DataTypes.BIGINT,
        defaultValue: 0,
        comment: 'Total storage used by user assets in bytes',
    },
    storageLimitBytes: {
        type: DataTypes.BIGINT,
        defaultValue: 4294967296,
        comment: 'Max storage quota in bytes',
    },
    projectCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    publicProfileEnabled: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: 'Whether the user portfolio is publicly visible',
    },
    aiCredits: {
        type: DataTypes.INTEGER,
        defaultValue: 50,
        comment: 'Remaining AI generation credits',
    },
    dayStreak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: 'User engagement day streak',
    },

    deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp; null = active account',
    },

}, {
    timestamps: true,
    paranoid: true,
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password') && user.password) {
                const salt = await bcrypt.genSalt(12);
                user.password = await bcrypt.hash(user.password, salt);
            }
        },
    },
    indexes: [
        { unique: true, fields: ['email'] },
        { unique: true, fields: ['username'] },
        { fields: ['role'] },
        { fields: ['plan'] },
        { fields: ['country'] },
        { fields: ['createdAt'] },
        { fields: ['deletedAt'] },
    ],
});

User.prototype.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = User;
