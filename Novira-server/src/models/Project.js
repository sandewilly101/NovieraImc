const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
    id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    },
    userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Users',
            key: 'id'
        }
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false,
        defaultValue: 'Untitled Design'
    },
    description: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    technicalDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Detailed technical specification for blueprints'
    },
    status: {
        type: DataTypes.ENUM('draft', 'review', 'live'),
        defaultValue: 'draft'
    },
    thumbnailIcon: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Heroicon name or type'
    },
    themeColors: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Gradient color variables { c1, c2 }'
    },
    sceneGraph: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [],
        comment: 'Array of 3D objects forming the active scene'
    },
    objectCount: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    sizeBytes: {
        type: DataTypes.BIGINT,
        defaultValue: 0
    },
    isFinished: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Published community design'
    },
    isVerified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Certified project badge'
    },
    views: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    likes: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    isStarred: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    isShared: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Template category (e.g. Exhibition Halls, Conference)'
    },
    marketValue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
        comment: 'Price set by the designer in USD'
    },
    licenseProtocol: {
        type: DataTypes.ENUM('Commercial Standard', 'Extended Studio', 'Open Source'),
        defaultValue: 'Commercial Standard',
        comment: 'Licensing terms for blueprint'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['status'] },
        { fields: ['isStarred'] },
        { fields: ['category'] },
        { fields: ['createdAt'] },
        { fields: ['updatedAt'] }
    ]
});

module.exports = Project;
