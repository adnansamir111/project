const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'apps/api/.env' });

async function testMigration() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        console.log('Testing migration 014...\n');

        const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '014_system_admin_flag.sql'), 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log('✅ Migration 014 applied successfully!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:');
        console.error('Message:', e.message);
        console.error('Detail:', e.detail);
        console.error('Hint:', e.hint);
    } finally {
        await client.end();
    }
}

testMigration();
