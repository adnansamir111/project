require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function verifyFixes() {
    console.log('🔍 Verifying Fixes...\n');

    try {
        // 1. Check if duplicate function is gone
        console.log('1️⃣ Checking sp_create_organization uniqueness...');
        const funcCheck = await pool.query(`
            SELECT proname, proargtypes::regtype[]
            FROM pg_proc 
            WHERE proname = 'sp_create_organization'
        `);

        console.log(`   Found ${funcCheck.rows.length} version(s):`);
        funcCheck.rows.forEach(row => {
            console.log(`   - Signature: ${row.proargtypes}`);
        });

        if (funcCheck.rows.length === 1) {
            console.log('   ✅ Function is unique!');
        } else {
            console.log('   ❌ Duplicates still exist!');
        }

        // 2. Check if owners are removed from voters
        console.log('\n2️⃣ Checking if owners/admins exist in voters table...');
        const ownerVoterCheck = await pool.query(`
            SELECT v.user_id, om.role_name
            FROM voters v
            JOIN org_members om ON v.organization_id = om.organization_id AND v.user_id = om.user_id
            WHERE om.role_name IN ('OWNER', 'ADMIN')
        `);

        if (ownerVoterCheck.rows.length === 0) {
            console.log('   ✅ No OWNER/ADMIN found in voters table!');
        } else {
            console.log(`   ❌ Found ${ownerVoterCheck.rows.length} OWNER/ADMIN in voters table!`);
        }

        console.log('\n✨ Verification Complete!\n');

    } catch (error) {
        console.error('❌ Error during verification:', error.message);
    } finally {
        await pool.end();
    }
}

verifyFixes();
