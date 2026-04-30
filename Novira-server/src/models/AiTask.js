const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AiTask = sequelize.define('AiTask', {
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
    tripoTaskId: {
        type: DataTypes.STRING(100),
        allowNull: true,
        comment: 'Task ID returned by Tripo AI API'
    },
    type: {
        type: DataTypes.ENUM('text_to_model', 'image_to_model', 'convert'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('queued', 'running', 'success', 'failed', 'cancelled'),
        defaultValue: 'queued'
    },
    prompt: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Original prompt for text-to-model'
    },
    imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'Source image URL for image-to-model (handles large Base64)'
    },
    resultUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL of the generated 3D model (.glb)'
    },
    thumbnailUrl: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: 'URL of the 2D thumbnail preview'
    },
    progress: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['tripoTaskId'] },
        { fields: ['status'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = AiTask;
