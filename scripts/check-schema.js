const { Client } = require('pg');
require('dotenv').config({ path: 'apps/api/.env' });

async function checkSchema() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();

    console.log('\n=== Organizations Table Columns ===');
    const orgCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name='organizations' 
    ORDER BY ordinal_position
  `);
    orgCols.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`));

    console.log('\n=== Org Members Table Columns ===');
    const memberCols = await client.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name='org_members' 
    ORDER BY ordinal_position
  `);
    memberCols.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`));

    await client.end();
}

checkSchema().catch(console.error);
