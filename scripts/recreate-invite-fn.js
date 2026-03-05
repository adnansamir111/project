const path = require('path');
const fs = require('fs');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const sql = fs.readFileSync(path.join(__dirname, '..', 'db', 'migrations', '051_fix_invite_param_order.sql'), 'utf8');
  await p.query(sql);
  console.log('Function recreated successfully');
  
  // Verify
  const res = await p.query(`
    SELECT pg_get_function_identity_arguments(p.oid) as args 
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'sp_create_bulk_invite'
  `);
  console.log('Found', res.rows.length, 'version(s):');
  for (const row of res.rows) {
    console.log(' ', row.args);
  }
  await p.end();
}
main().catch(e => { console.error(e); p.end(); });
