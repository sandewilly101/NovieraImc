const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const bcrypt = require('bcryptjs');

async function directInsert() {
    let connection;
    try {
        console.log(`Connecting to ${process.env.DB_NAME} at ${process.env.DB_HOST}...`);
        connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        const salt = await bcrypt.genSalt(12);
        const hashedPw = await bcrypt.hash('novira@studio', salt);
        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const sql = `
            INSERT INTO Users (
                username, email, password, firstName, lastName, displayName, role, plan, aiCredits, isActive, emailVerified, createdAt, updatedAt
            ) VALUES (
                'novira', 'admin@novira.studio', '${hashedPw}', 'Novira', 'Studio', 'Novira Studio', 'superadmin', 'premium', 9999, 1, 1, '${now}', '${now}'
            )
        `;

        const [result] = await connection.execute(sql);
        console.log('Insert Result:', result);

        const [rows] = await connection.execute("SELECT id, username, email FROM Users WHERE username = 'novira'");
        console.log('Verification:', JSON.stringify(rows, null, 2));

    } catch (error) {
        console.error('Direct insert failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

directInsert();
