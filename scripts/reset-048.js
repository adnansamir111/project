const { Pool } = require('pg');
require('dotenv').config({ path: 'apps/api/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    await pool.query("DELETE FROM schema_migrations WHERE name = '048_fix_invitation_types.sql'");
    console.log('Reset migration 048');
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}

run();
