const sequelize = require('../config/database');
const User = require('../models/User');
const path = require('path');

async function seedAdmin() {
    try {
        console.log('Connecting to database...');
        console.log(`DB_NAME: ${process.env.DB_NAME}`);
        console.log(`DB_HOST: ${process.env.DB_HOST}`);
        console.log(`DB_USER: ${process.env.DB_USER}`);
        await sequelize.authenticate();

        const adminData = {
            username: 'novira',
            email: 'admin@novira.studio',
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

        let user = await User.findOne({
            where: {
                [require('sequelize').Op.or]: [
                    { username: adminData.username },
                    { email: adminData.email }
                ]
            }
        });

        if (user) {
            console.log(`User already exists: ${user.username} (${user.email}). Updating to superadmin role...`);
            user.role = 'superadmin';
            user.displayName = adminData.displayName;
            user.plan = 'premium';
            if (adminData.password) {

                user.password = adminData.password;
            }
            await user.save();
            console.log(`User updated successfully! ID: ${user.id}`);
        } else {
            console.log(`Creating new superadmin: ${adminData.username}...`);
            user = await User.create(adminData);
            console.log(`Superadmin created successfully! ID: ${user.id}`);
        }

        console.log('-----------------------------------');
        console.log('Admin Credentials:');
        console.log(`Username: ${adminData.username}`);
        console.log(`Email: ${adminData.email}`);
        console.log(`Password: ${adminData.password}`);
        console.log('-----------------------------------');

    } catch (error) {
        console.error('Seed failed!');
        console.error(error);
        if (error.errors) {
            error.errors.forEach(e => console.error(`- ${e.message} (${e.path})`));
        }
    } finally {
        await sequelize.close();
        console.log('Database connection closed.');
    }
}

seedAdmin();
