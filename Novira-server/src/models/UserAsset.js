const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserAsset = sequelize.define('UserAsset', {
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
    type: {
        type: DataTypes.ENUM('blueprint', 'ai', 'brand'),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(200),
        allowNull: false
    },
    imageUrl: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    sourceProjectId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Reference to the original project/template if applicable'
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true,
        comment: 'Flexible storage for type-specific data (e.g. AI prompt, file sizes)'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['type'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = UserAsset;
