// Inspect org_members table definition
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function inspectTable() {
    try {
        console.log('=== INSPECTING ORG_MEMBERS ===');
        const res = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, udt_name
      FROM information_schema.columns
      WHERE table_name = 'org_members'
      ORDER BY ordinal_position;
    `);

        res.rows.forEach(row => {
            console.log(`Column: ${row.column_name}`);
            console.log(`  Type: ${row.data_type}`);
            console.log(`  Length: ${row.character_maximum_length}`);
            console.log(`  UDT: ${row.udt_name}`);
            console.log('---');
        });

        await pool.end();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

inspectTable();
