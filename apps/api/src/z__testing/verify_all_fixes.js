require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function verifyFixes() {
    console.log('🔍 Verifying All Fixes...\n');

    try {
        // 1. Check if sp_cast_vote is unique
        console.log('1️⃣ Checking sp_cast_vote uniqueness...');
        const castVoteCheck = await pool.query(`
            SELECT COUNT(*) as count 
            FROM pg_proc 
            WHERE proname = 'sp_cast_vote'
        `);
        const castVoteCount = parseInt(castVoteCheck.rows[0].count);
        console.log(`   Found ${castVoteCount} version(s) of sp_cast_vote`);
        if (castVoteCount === 1) {
            console.log('   ✅ sp_cast_vote is unique!\n');
        } else {
            console.log('   ❌ Multiple versions found!\n');
        }

        // 2. Check if trigger exists
        console.log('2️⃣ Checking auto voter registration trigger...');
        const triggerCheck = await pool.query(`
            SELECT COUNT(*) as count 
            FROM pg_trigger 
            WHERE tgname = 'trg_org_members_auto_voter'
        `);
        const triggerExists = parseInt(triggerCheck.rows[0].count) > 0;
        console.log(`   Trigger exists: ${triggerExists ? '✅ YES' : '❌ NO'}\n`);

        // 3. Check if member management functions exist
        console.log('3️⃣ Checking member management functions...');
        const functionsCheck = await pool.query(`
            SELECT proname 
            FROM pg_proc 
            WHERE proname IN ('sp_get_org_members_detailed', 'sp_remove_org_member')
        `);
        console.log(`   Found ${functionsCheck.rows.length}/2 functions:`);
        functionsCheck.rows.forEach(row => {
            console.log(`   ✅ ${row.proname}`);
        });
        console.log();

        // 4. Check if results function exists
        console.log('4️⃣ Checking results function...');
        const resultsCheck = await pool.query(`
            SELECT COUNT(*) as count 
            FROM pg_proc 
            WHERE proname = 'sp_get_race_results'
        `);
        const resultsExists = parseInt(resultsCheck.rows[0].count) > 0;
        console.log(`   sp_get_race_results exists: ${resultsExists ? '✅ YES' : '❌ NO'}\n`);

        // 5. Sample voter check
        console.log('5️⃣ Checking sample voter registration...');
        const voterCheck = await pool.query(`
            SELECT COUNT(*) as count 
            FROM voters 
            WHERE status = 'APPROVED' AND is_approved = TRUE
        `);
        console.log(`   Approved voters: ${voterCheck.rows[0].count}\n`);

        console.log('✨ Verification Complete!\n');
        console.log('Summary:');
        console.log(`- Voting Error Fixed: ${castVoteCount === 1 ? '✅' : '❌'}`);
        console.log(`- Auto Registration: ${triggerExists ? '✅' : '❌'}`);
        console.log(`- Member Management: ${functionsCheck.rows.length === 2 ? '✅' : '❌'}`);
        console.log(`- Results Dashboard: ${resultsExists ? '✅' : '❌'}`);

    } catch (error) {
        console.error('❌ Error during verification:', error.message);
    } finally {
        await pool.end();
    }
}

verifyFixes();
