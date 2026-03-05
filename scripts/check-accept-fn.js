const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Get the FULL function body
  const res = await p.query(
    "SELECT prosrc FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='sp_accept_invite_existing_user'"
  );
  
  console.log('Versions found:', res.rows.length);
  for (let i = 0; i < res.rows.length; i++) {
    console.log(`\n=== VERSION ${i+1} ===`);
    console.log(res.rows[i].prosrc);
  }

  // Also check for other accept invite functions
  const res2 = await p.query(
    "SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname LIKE '%accept_invite%'"
  );
  console.log('\n=== ALL accept_invite functions ===');
  res2.rows.forEach(r => console.log(`${r.proname}(${r.args})`));

  await p.end();
}
main();
