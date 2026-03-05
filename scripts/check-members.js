const { Pool } = require('pg');
require('dotenv').config({ path: 'apps/api/.env' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function run() {
  try {
    // Check for duplicate org_members
    const result = await pool.query(`
      SELECT 
        om.organization_id,
        o.organization_name,
        om.user_id,
        ua.email,
        ua.username,
        om.role_name,
        om.is_active,
        om.created_at
      FROM org_members om
      JOIN organizations o ON om.organization_id = o.organization_id
      JOIN user_accounts ua ON om.user_id = ua.user_id
      WHERE ua.email = 'adnansamir700@gmail.com'
      ORDER BY o.organization_name, om.created_at
    `);
    
    console.log('Memberships for adnansamir700@gmail.com:');
    console.log('='.repeat(80));
    result.rows.forEach(row => {
      console.log(`Org: ${row.organization_name} | Role: ${row.role_name} | Active: ${row.is_active}`);
    });
    
    // Check all members of MBSTU
    const mbstu = await pool.query(`
      SELECT 
        om.organization_id,
        o.organization_name,
        om.user_id,
        ua.email,
        om.role_name,
        om.is_active
      FROM org_members om
      JOIN organizations o ON om.organization_id = o.organization_id
      JOIN user_accounts ua ON om.user_id = ua.user_id
      WHERE o.organization_name LIKE '%MBSTU%'
      ORDER BY om.role_name
    `);
    
    console.log('\n\nAll MBSTU members:');
    console.log('='.repeat(80));
    mbstu.rows.forEach(row => {
      console.log(`${row.email} | Role: ${row.role_name} | Active: ${row.is_active}`);
    });
    
  } catch (e) {
    console.error(e.message);
  } finally {
    await pool.end();
  }
}

run();
