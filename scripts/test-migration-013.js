const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: 'apps/api/.env' });

async function testMigration() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    try {
        console.log('Testing migration 013...\n');

        const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '013_org_approval_system_admin.sql'), 'utf8');

        await client.query('BEGIN');
        await client.query(sql);
        await client.query('COMMIT');

        console.log('✅ Migration 013 applied successfully!');

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:');
        console.error('Message:', e.message);
        console.error('Detail:', e.detail);
        console.error('Hint:', e.hint);
        console.error('Position:', e.position);
    } finally {
        await client.end();
    }
}

testMigration();
