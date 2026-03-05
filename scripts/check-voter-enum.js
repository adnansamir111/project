const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });
const p = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const res = await p.query("SELECT unnest(enum_range(NULL::voter_status)) as val");
  console.log('voter_status enum values:');
  res.rows.forEach(r => console.log(' ', r.val));
  
  // Also check column type of voters.status
  const cols = await p.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name='voters' AND column_name='status'");
  console.log('\nvoters.status column:', cols.rows[0]);
  await p.end();
}
main();
