const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DesignerProfile = sequelize.define('DesignerProfile', {
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
    totalDeployments: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    grossRevenue: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    reputationScore: {
        type: DataTypes.DECIMAL(3, 1),
        defaultValue: 5.0,
    },
    activeBlueprints: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    inQueue: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    nextSettlementDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
    },
    pendingCredits: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00,
    },
    payoutLimit: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 2000.00,
    },
    chartData: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: [30, 55, 45, 70, 85, 75, 95],
    },
    isCertified: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'Certified Architect badge for priority uploads'
    }
}, {
    timestamps: true,
    indexes: [
        { fields: ['userId'] }
    ]
});

module.exports = DesignerProfile;
