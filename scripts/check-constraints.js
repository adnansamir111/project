const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Find unique constraint on org_members(organization_id, user_id)
  const res = await p.query(`
    SELECT con.conname, con.contype
    FROM pg_constraint con
    JOIN pg_class rel ON con.conrelid = rel.oid
    JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    WHERE rel.relname = 'org_members' AND nsp.nspname = 'public'
  `);
  console.log('Constraints on org_members:');
  res.rows.forEach(r => console.log(`  ${r.conname} (type: ${r.contype})`));
  await p.end();
}
main();
