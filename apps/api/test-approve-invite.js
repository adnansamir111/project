// Test approve and invite functions
const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function testFunctions() {
    try {
        console.log('=== TESTING APPROVE & INVITE FUNCTIONS ===\n');

        // 1. Test if there are any pending requests
        console.log('1. Checking for pending join requests...');
        const pendingRequests = await pool.query(`
      SELECT r.request_id, r.organization_id, r.user_id, u.username, u.email
      FROM organization_join_requests r
      JOIN user_accounts u ON r.user_id = u.user_id
      WHERE r.status = 'PENDING'
      LIMIT 5
    `);
        console.log(`Found ${pendingRequests.rows.length} pending requests`);
        console.table(pendingRequests.rows);

        // 2. Find an admin who can approve
        console.log('\n2. Finding organization admins...');
        const admins = await pool.query(`
      SELECT om.organization_id, om.user_id, u.username, o.organization_name
      FROM org_members om
      JOIN user_accounts u ON om.user_id = u.user_id
      JOIN organizations o ON om.organization_id = o.organization_id
      WHERE om.role_name IN ('OWNER', 'ADMIN') AND om.is_active = TRUE
      LIMIT 5
    `);
        console.log(`Found ${admins.rows.length} admins`);
        console.table(admins.rows);

        // 3. Test sp_approve_join_request if we have pending requests and admins
        if (pendingRequests.rows.length > 0 && admins.rows.length > 0) {
            const request = pendingRequests.rows[0];
            const admin = admins.rows.find(a => a.organization_id === request.organization_id);

            if (admin) {
                console.log(`\n3. Testing sp_approve_join_request...`);
                console.log(`   Request ID: ${request.request_id}`);
                console.log(`   Admin: ${admin.username} (ID: ${admin.user_id})`);
                console.log(`   Organization: ${admin.organization_name}`);

                try {
                    const testToken = 'test_token_' + Date.now();
                    const result = await pool.query(
                        `SELECT * FROM sp_approve_join_request($1::integer, $2::bigint, $3::varchar)`,
                        [request.request_id, admin.user_id, testToken]
                    );
                    console.log('   ✅ Function executed successfully!');
                    console.table(result.rows);
                } catch (err) {
                    console.log(`   ✗ Error: ${err.message}`);
                    console.log('   Full error:', err);
                }
            } else {
                console.log('\n3. ⚠️  No admin found for the pending request organization');
            }
        } else {
            console.log('\n3. ⚠️  Cannot test approve - need both pending requests and admins');
        }

        // 4. Test sp_create_invite
        if (admins.rows.length > 0) {
            console.log('\n4. Testing sp_create_invite...');
            const admin = admins.rows[0];
            const testEmail = `test${Date.now()}@example.com`;
            const testToken = 'invite_' + Date.now();

            try {
                const result = await pool.query(
                    `SELECT sp_create_invite($1::bigint, $2::varchar, $3::varchar, $4::varchar, $5::bigint, $6::integer)`,
                    [admin.organization_id, testEmail, testToken, 'MEMBER', admin.user_id, 7]
                );
                console.log('   ✅ Invite function executed successfully!');
                console.log('   Invite ID:', result.rows[0].sp_create_invite);
            } catch (err) {
                console.log(`   ✗ Error: ${err.message}`);
                console.log('   Full error:', err);
            }
        }

        await pool.end();
        console.log('\n=== TEST COMPLETE ===');
    } catch (err) {
        console.error('Fatal Error:', err);
        try {
            await pool.end();
        } catch (e) { }
        process.exit(1);
    }
}

testFunctions();
