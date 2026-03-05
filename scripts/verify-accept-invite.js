const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Check sp_accept_invite_existing_user
  const res = await p.query(
    "SELECT pg_get_function_identity_arguments(p.oid) as args FROM pg_proc p JOIN pg_namespace n ON p.pronamespace=n.oid WHERE n.nspname='public' AND p.proname='sp_accept_invite_existing_user'"
  );
  console.log('sp_accept_invite_existing_user versions:', res.rows.length);
  res.rows.forEach(row => console.log('  Args:', row.args));

  // Quick test
  console.log('\nTesting function call with dummy token...');
  try {
    const test = await p.query(
      "SELECT * FROM sp_accept_invite_existing_user('nonexistent_token_test', 1)"
    );
    console.log('Result:', test.rows[0]);
  } catch(e) {
    console.log('Error:', e.message);
  }

  await p.end();
}
main();
