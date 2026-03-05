const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });
const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const res = await p.query(`
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args 
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'sp_create_bulk_invite'
  `);
  console.log('Found', res.rows.length, 'versions:');
  for (const row of res.rows) {
    console.log(`  OID ${row.oid}: sp_create_bulk_invite(${row.args})`);
  }
  
  // Drop ALL versions
  for (const row of res.rows) {
    const dropSQL = `DROP FUNCTION IF EXISTS sp_create_bulk_invite(${row.args})`;
    console.log('Dropping:', dropSQL);
    await p.query(dropSQL);
  }
  
  console.log('\nVerifying - remaining versions:');
  const check = await p.query(`
    SELECT p.oid, pg_get_function_identity_arguments(p.oid) as args 
    FROM pg_proc p 
    JOIN pg_namespace n ON p.pronamespace = n.oid 
    WHERE n.nspname = 'public' AND p.proname = 'sp_create_bulk_invite'
  `);
  console.log('Found', check.rows.length, 'versions');
  
  await p.end();
}
main().catch(e => { console.error(e); p.end(); });
