const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ProjectActivity = sequelize.define('ProjectActivity', {
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
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'Projects',
            key: 'id'
        }
    },
    action: {
        type: DataTypes.STRING(200),
        allowNull: false,
        comment: 'A description of the action taken (e.g. updated materials, deleted object)'
    },
    progress: {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: 'Optional numeric indicator or completion value'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] },
        { fields: ['projectId'] },
        { fields: ['createdAt'] }
    ]
});

module.exports = ProjectActivity;
