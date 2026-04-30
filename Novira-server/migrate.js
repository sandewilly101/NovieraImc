require('dotenv').config();
const sequelize = require('./src/config/database');
const User = require('./src/models/User');
const Project = require('./src/models/Project');
const ProjectLike = require('./src/models/ProjectLike');

User.hasMany(ProjectLike, { foreignKey: 'userId', onDelete: 'CASCADE' });
ProjectLike.belongsTo(User, { foreignKey: 'userId' });
Project.hasMany(ProjectLike, { foreignKey: 'projectId', onDelete: 'CASCADE' });
ProjectLike.belongsTo(Project, { foreignKey: 'projectId' });

async function migrate() {
    try {
        console.log('Connecting to database...');
        await sequelize.authenticate();
        console.log('Syncing ProjectLike table...');
        await ProjectLike.sync({ alter: true });

        console.log('Adding columns to Projects table...');
        const queryInterface = sequelize.getQueryInterface();

        try { await queryInterface.addColumn('Projects', 'isFinished', { type: sequelize.Sequelize.BOOLEAN, defaultValue: false }); } catch (e) { console.log('isFinished exists'); }
        try { await queryInterface.addColumn('Projects', 'isVerified', { type: sequelize.Sequelize.BOOLEAN, defaultValue: false }); } catch (e) { console.log('isVerified exists'); }
        try { await queryInterface.addColumn('Projects', 'views', { type: sequelize.Sequelize.INTEGER, defaultValue: 0 }); } catch (e) { console.log('views exists'); }
        try { await queryInterface.addColumn('Projects', 'likes', { type: sequelize.Sequelize.INTEGER, defaultValue: 0 }); } catch (e) { console.log('likes exists'); }
        try { await queryInterface.addColumn('Projects', 'category', { type: sequelize.Sequelize.STRING(100), allowNull: true }); } catch (e) { console.log('category exists'); }

        console.log('Creating sample community projects...');
        const user = await User.findOne();
        if (user) {
            await Project.bulkCreate([
                { userId: user.id, name: 'Grand Exhibition Hall', isFinished: true, views: 2500, likes: 320, isVerified: true, status: 'live', category: 'Exhibition Halls', thumbnailIcon: 'BuildingOffice2Icon' },
                { userId: user.id, name: 'Tech Summit Stage', isFinished: true, views: 1850, likes: 210, isVerified: true, status: 'live', category: 'Conference', thumbnailIcon: 'BriefcaseIcon' },
                { userId: user.id, name: 'Corporate Ballroom A', isFinished: true, views: 1250, likes: 160, isVerified: false, status: 'live', category: 'Conference', thumbnailIcon: 'UsersIcon' },
                { userId: user.id, name: 'Wedding Pavilion', isFinished: true, views: 3200, likes: 450, isVerified: true, status: 'live', category: 'Wedding', thumbnailIcon: 'SparklesIcon' },
                { userId: user.id, name: 'Concert Arena', isFinished: true, views: 4200, likes: 580, isVerified: true, status: 'live', category: 'Concert', thumbnailIcon: 'MusicalNoteIcon' },
                { userId: user.id, name: 'Modular Booth Pack', isFinished: true, views: 950, likes: 85, isVerified: false, status: 'live', category: 'Booth Packs', thumbnailIcon: 'CubeIcon' },
            ]);
            console.log('Sample templates created successfully!');
        }

        console.log('Migrations done.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

migrate();
