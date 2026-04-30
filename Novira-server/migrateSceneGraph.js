require('dotenv').config();
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const Project = require('./src/models/Project');

async function migrateSceneGraph() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();

        console.log('Adding sceneGraph column to Projects table...');
        const queryInterface = sequelize.getQueryInterface();

        try {
            await queryInterface.addColumn('Projects', 'sceneGraph', {
                type: sequelize.Sequelize.JSON,
                allowNull: true,
                defaultValue: []
            });
            console.log('Successfully added sceneGraph!');
        } catch (e) {
            console.log('sceneGraph may already exist or error:', e.message);
        }

        console.log('Migrations done.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrateSceneGraph();
