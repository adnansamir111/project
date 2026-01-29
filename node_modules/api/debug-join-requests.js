// Debug script to find the join requests bug
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function debugJoinRequests() {
    try {
        console.log('=== DEBUGGING JOIN REQUESTS ===\n');

        // 1. Check all join requests
        console.log('1. All join requests in database:');
        const allRequests = await pool.query(`
      SELECT r.request_id, r.organization_id, r.user_id, r.status, r.request_message, r.created_at,
             u.username, u.email, o.organization_name
      FROM organization_join_requests r
      JOIN user_accounts u ON r.user_id = u.user_id
      JOIN organizations o ON r.organization_id = o.organization_id
      ORDER BY r.created_at DESC
    `);
        console.log(`Found ${allRequests.rows.length} total requests`);
        console.table(allRequests.rows);

        // 2. Check pending requests only
        console.log('\n2. Pending requests only:');
        const pendingRequests = await pool.query(`
      SELECT r.request_id, r.organization_id, r.user_id, r.status, r.request_message, r.created_at,
             u.username, u.email, o.organization_name
      FROM organization_join_requests r
      JOIN user_accounts u ON r.user_id = u.user_id
      JOIN organizations o ON r.organization_id = o.organization_id
      WHERE r.status = 'PENDING'
      ORDER BY r.created_at DESC
    `);
        console.log(`Found ${pendingRequests.rows.length} pending requests`);
        console.table(pendingRequests.rows);

        // 3. Check org members (who are admins)
        console.log('\n3. Organization members with OWNER/ADMIN roles:');
        const admins = await pool.query(`
      SELECT om.organization_id, om.user_id, om.role_name, om.is_active,
             u.username, o.organization_name
      FROM org_members om
      JOIN user_accounts u ON om.user_id = u.user_id
      JOIN organizations o ON om.organization_id = o.organization_id
      WHERE om.role_name IN ('OWNER', 'ADMIN') AND om.is_active = TRUE
      ORDER BY om.organization_id, om.role_name
    `);
        console.log(`Found ${admins.rows.length} admins`);
        console.table(admins.rows);

        // 4. Test sp_get_pending_join_requests for each org
        if (admins.rows.length > 0) {
            console.log('\n4. Testing sp_get_pending_join_requests for each admin:');
            for (const admin of admins.rows) {
                console.log(`\n   Testing: ${admin.organization_name} (org_id=${admin.organization_id}), ${admin.username} (user_id=${admin.user_id}, role=${admin.role_name})`);
                try {
                    const result = await pool.query(
                        `SELECT request_id, user_id, username, email, request_message, created_at 
             FROM sp_get_pending_join_requests($1::bigint, $2::bigint)`,
                        [admin.organization_id, admin.user_id]
                    );
                    console.log(`   ✓ Function returned ${result.rows.length} pending request(s)`);
                    if (result.rows.length > 0) {
                        console.table(result.rows);
                    } else {
                        console.log('   (Function found no pending requests for this org)');
                    }
                } catch (err) {
                    console.log(`   ✗ Error calling function: ${err.message}`);
                    console.log(`      Full error:`, err);
                }
            }
        } else {
            console.log('\n⚠️  No admins found! This means no users were added as OWNER when creating orgs.');
        }

        await pool.end();
        console.log('\n=== DEBUG COMPLETE ===');
    } catch (err) {
        console.error('Fatal Error:', err);
        try {
            await pool.end();
        } catch (e) { }
        process.exit(1);
    }
}

debugJoinRequests();
