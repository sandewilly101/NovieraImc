const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const sequelize = require('./config/database');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const projectRoutes = require('./routes/projectRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const assetRoutes = require('./routes/assetRoutes');
const assetStoreRoutes = require('./routes/assetStoreRoutes');
const designerRoutes = require('./routes/designerRoutes');
const securityRoutes = require('./routes/securityRoutes');
const tripoRoutes = require('./routes/tripoRoutes');
const errorHandler = require('./middlewares/errorHandler');

const User = require('./models/User');
const Project = require('./models/Project');
const Notification = require('./models/Notification');
const ProjectMember = require('./models/ProjectMember');
const ProjectLike = require('./models/ProjectLike');
const ProjectActivity = require('./models/ProjectActivity');
const UserAsset = require('./models/UserAsset');
const DesignerProfile = require('./models/DesignerProfile');
const AiTask = require('./models/AiTask');

User.hasMany(Project, { foreignKey: 'userId', onDelete: 'CASCADE' });
Project.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(Notification, { foreignKey: 'userId', onDelete: 'CASCADE' });
Notification.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(ProjectLike, { foreignKey: 'userId', onDelete: 'CASCADE' });
ProjectLike.belongsTo(User, { foreignKey: 'userId' });

Project.hasMany(ProjectLike, { foreignKey: 'projectId', onDelete: 'CASCADE' });
ProjectLike.belongsTo(Project, { foreignKey: 'projectId' });

User.hasMany(ProjectActivity, { foreignKey: 'userId', onDelete: 'CASCADE' });
ProjectActivity.belongsTo(User, { foreignKey: 'userId' });

Project.hasMany(ProjectActivity, { foreignKey: 'projectId', onDelete: 'CASCADE' });
ProjectActivity.belongsTo(Project, { foreignKey: 'projectId' });

User.hasMany(UserAsset, { foreignKey: 'userId', onDelete: 'CASCADE' });
UserAsset.belongsTo(User, { foreignKey: 'userId' });

User.hasOne(DesignerProfile, { foreignKey: 'userId', onDelete: 'CASCADE' });
DesignerProfile.belongsTo(User, { foreignKey: 'userId' });

User.hasMany(AiTask, { foreignKey: 'userId', onDelete: 'CASCADE' });
AiTask.belongsTo(User, { foreignKey: 'userId' });

Project.hasMany(ProjectMember, { foreignKey: 'projectId', as: 'members', onDelete: 'CASCADE' });
ProjectMember.belongsTo(Project, { foreignKey: 'projectId' });
User.hasMany(ProjectMember, { foreignKey: 'userId', as: 'projectMemberships', onDelete: 'CASCADE' });
ProjectMember.belongsTo(User, { foreignKey: 'userId', as: 'user' });

const app = express();
const PORT = process.env.PORT || 5000;

/** Browser origins allowed to call the API (asset proxy, Sketchfab, etc.). `CORS_ORIGINS` (comma-separated) is merged with these dev defaults. */
const DEFAULT_CORS_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
];
const extraCorsOrigins = process.env.CORS_ORIGINS?.trim()
    ? process.env.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
const corsOrigins = [...new Set([...DEFAULT_CORS_ORIGINS, ...extraCorsOrigins])];

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

app.use(cors({
    origin: (requestOrigin, callback) => {
        if (!requestOrigin) {
            callback(null, true);
            return;
        }
        if (corsOrigins.includes(requestOrigin)) {
            callback(null, true);
            return;
        }
        if (process.env.NODE_ENV !== 'production') {
            console.warn(`[cors] Blocked origin (add to CORS_ORIGINS): ${requestOrigin}`);
        }
        callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'x-provider-sketchfab-token',
    ],
}));

app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false
}));

app.use(compression());

app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/asset-store', assetStoreRoutes);
app.use('/api/designer', designerRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/tripo', tripoRoutes);

app.get('/novira-test', (req, res) => {
    res.send('Novira API Server is running with enhanced security!');
});

app.use(errorHandler);

const startServer = async () => {
    try {
        await sequelize.authenticate();

        try {
            await sequelize.query("ALTER TABLE `Projects` ADD COLUMN `category` VARCHAR(100) NULL DEFAULT NULL AFTER `isShared`;");
            console.log('Successfully injected `category` column via manual migration.');
        } catch (err) {

            if (err.parent && err.parent.errno !== 1060) {
                console.warn('Migration Notice:', err.message);
            }
        }

        try {
            await sequelize.query("ALTER TABLE `Projects` ADD COLUMN `marketValue` DECIMAL(10, 2) DEFAULT 0.00 AFTER `category`;");
            await sequelize.query("ALTER TABLE `Projects` ADD COLUMN `licenseProtocol` ENUM('Commercial Standard', 'Extended Studio', 'Open Source') DEFAULT 'Commercial Standard' AFTER `marketValue`;");
            await sequelize.query("ALTER TABLE `Projects` ADD COLUMN `technicalDescription` TEXT NULL AFTER `description`;");
            console.log('Successfully injected Designer Portal columns to Projects via manual migration.');
        } catch (err) {
            if (err.parent && err.parent.errno !== 1060) {
                console.warn('Migration Notice:', err.message);
            }
        }

        const userColumns = [
            { name: 'displayName', sql: "ALTER TABLE `Users` ADD COLUMN `displayName` VARCHAR(150) DEFAULT NULL AFTER `lastName`;" },
            { name: 'bio', sql: "ALTER TABLE `Users` ADD COLUMN `bio` TEXT DEFAULT NULL AFTER `displayName`;" },
            { name: 'bannerUrl', sql: "ALTER TABLE `Users` ADD COLUMN `bannerUrl` VARCHAR(500) DEFAULT NULL AFTER `avatarUrl`;" },
            { name: 'website', sql: "ALTER TABLE `Users` ADD COLUMN `website` VARCHAR(255) DEFAULT NULL AFTER `bannerUrl`;" },
            { name: 'industry', sql: "ALTER TABLE `Users` ADD COLUMN `industry` VARCHAR(100) DEFAULT NULL AFTER `jobTitle`;" },
            { name: 'plan', sql: "ALTER TABLE `Users` ADD COLUMN `plan` ENUM('free', 'advanced', 'premium') DEFAULT 'free' AFTER `role`;" },
            { name: 'planExpiresAt', sql: "ALTER TABLE `Users` ADD COLUMN `planExpiresAt` DATETIME DEFAULT NULL AFTER `plan`;" },
            { name: 'theme', sql: "ALTER TABLE `Users` ADD COLUMN `theme` ENUM('light', 'dark', 'system') DEFAULT 'dark' AFTER `loginCount`;" },
            { name: 'notificationsEnabled', sql: "ALTER TABLE `Users` ADD COLUMN `notificationsEnabled` TINYINT(1) DEFAULT 1 AFTER `theme`;" },
            { name: 'marketingEmailsEnabled', sql: "ALTER TABLE `Users` ADD COLUMN `marketingEmailsEnabled` TINYINT(1) DEFAULT 0 AFTER `notificationsEnabled`;" },
            { name: 'storageUsedBytes', sql: "ALTER TABLE `Users` ADD COLUMN `storageUsedBytes` BIGINT DEFAULT 0 AFTER `marketingEmailsEnabled`;" },
            { name: 'storageLimitBytes', sql: "ALTER TABLE `Users` ADD COLUMN `storageLimitBytes` BIGINT DEFAULT 4294967296 AFTER `storageUsedBytes`;" },
            { name: 'aiCredits', sql: "ALTER TABLE `Users` ADD COLUMN `aiCredits` INTEGER DEFAULT 50 AFTER `storageLimitBytes`;" },
            { name: 'dayStreak', sql: "ALTER TABLE `Users` ADD COLUMN `dayStreak` INTEGER DEFAULT 0 AFTER `aiCredits`;" },
            { name: 'publicProfileEnabled', sql: "ALTER TABLE `Users` ADD COLUMN `publicProfileEnabled` TINYINT(1) DEFAULT 1 AFTER `projectCount`;" },
            { name: 'aiTasks_imageUrl_longtext', sql: "ALTER TABLE `AiTasks` MODIFY `imageUrl` LONGTEXT;" },
            { name: 'aiTasks_type_enum_convert', sql: "ALTER TABLE `AiTasks` MODIFY `type` ENUM('text_to_model', 'image_to_model', 'convert') NOT NULL;" },
            { name: 'aiTasks_resultUrl_longtext', sql: "ALTER TABLE `AiTasks` MODIFY `resultUrl` LONGTEXT;" },
            { name: 'aiTasks_thumbnailUrl_longtext', sql: "ALTER TABLE `AiTasks` MODIFY `thumbnailUrl` LONGTEXT;" }
        ];

        for (const col of userColumns) {
            try {
                await sequelize.query(col.sql);
                console.log(`Successfully added column: ${col.name}`);
            } catch (err) {
                if (err.parent && err.parent.errno === 1060) {

                } else {
                    console.warn(`Migration Notice (${col.name}):`, err.message);
                }
            }
        }

        const performanceIndexes = [
            { name: 'Projects_createdAt', sql: "ALTER TABLE `Projects` ADD INDEX `projects_created_at` (`createdAt`);" },
            { name: 'Projects_updatedAt', sql: "ALTER TABLE `Projects` ADD INDEX `projects_updated_at` (`updatedAt`);" },
            { name: 'AiTasks_createdAt', sql: "ALTER TABLE `AiTasks` ADD INDEX `aitasks_created_at` (`createdAt`);" },
            { name: 'UserAssets_createdAt', sql: "ALTER TABLE `UserAssets` ADD INDEX `userassets_created_at` (`createdAt`);" }
        ];

        for (const idx of performanceIndexes) {
            try {
                await sequelize.query(idx.sql);
                console.log(`Successfully added index: ${idx.name}`);
            } catch (err) {

                if (err.parent && err.parent.errno === 1061) {

                } else {
                    console.warn(`Migration Notice (${idx.name}):`, err.message);
                }
            }
        }

        await sequelize.sync({ force: false });
        console.log('Database synced successfully.');

        await seedAdminUser();

        app.listen(PORT, () => {
            console.log(`Novira - Server is listening on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
};

const seedAdminUser = async () => {
    try {
        const fs = require('fs');
        const total = await User.count({ paranoid: false });
        const logMsg = `[${new Date().toISOString()}] ADMIN SEED: Connecting to ${sequelize.config.database}, Total users: ${total}\n`;
        fs.appendFileSync('server-seed-log.txt', logMsg);
        console.log(logMsg);
        const adminEmail = 'admin@novira.studio';
        const adminData = {
            username: 'novira',
            email: adminEmail,
            password: 'novira@studio',
            firstName: 'Novira',
            lastName: 'Studio',
            displayName: 'Novira Studio',
            role: 'superadmin',
            plan: 'premium',
            aiCredits: 9999,
            isActive: true,
            emailVerified: true
        };

        const [user, created] = await User.findOrCreate({
            where: { email: adminEmail },
            defaults: adminData
        });

        if (created) {
            console.log('--- ADMIN SEED: Superadmin created successfully ---');
        } else {
            console.log('--- ADMIN SEED: Ensuring admin data is correct ---');
            user.role = 'superadmin';
            user.plan = 'premium';
            user.aiCredits = 9999;
            user.displayName = adminData.displayName;
            user.password = adminData.password;
            await user.save();
        }

        const updatedUser = await User.findOne({ where: { email: adminEmail } });
        const finalLog = `[${new Date().toISOString()}] ADMIN SEED: Verified User: ${updatedUser.username}, Role: ${updatedUser.role}, PW Length: ${updatedUser.password.length}\n`;
        fs.appendFileSync('server-seed-log.txt', finalLog);
    } catch (err) {
        console.error('--- ADMIN SEED ERROR ---', err.message);
    }
};

startServer();
