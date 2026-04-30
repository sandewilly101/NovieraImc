const sequelize = require('./src/config/database');

async function fixDatabase() {
    try {
        console.log('Attempting to fix database schema...');
        await sequelize.authenticate();

        try {
            await sequelize.query("ALTER TABLE `Projects` ADD COLUMN `category` VARCHAR(100) NULL DEFAULT NULL AFTER `isShared`;");
            console.log('Successfully added `category` column to `Projects` table.');
        } catch (err) {
            if (err.parent && err.parent.errno === 1060) {
                console.log('`category` column already exists.');
            } else {
                throw err;
            }
        }

        console.log('Database repair completed.');
    } catch (error) {
        console.error('Database repair failed:', error);
    } finally {
        await sequelize.close();
    }
}

fixDatabase();
