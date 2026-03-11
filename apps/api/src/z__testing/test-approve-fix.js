const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function testApproveFlow() {
    try {
        console.log('=== TESTING FULL REQUEST -> APPROVE FLOW ===\n');

        // 1. Find a User and an Org they are NOT in
        // This is hard to query generically.
        // Instead, I'll update an existing request to PENDING to retry, or create one if possible.

        // Let's just create a new request for an existing user/org combination if possible
        // Or simpler: reset one of the APPROVED requests to PENDING

        console.log('1. RESETTING a request to PENDING for testing...');
        const resetResult = await pool.query(`
      UPDATE organization_join_requests
      SET status = 'PENDING', approval_token = NULL
      WHERE request_id = (SELECT request_id FROM organization_join_requests LIMIT 1)
      RETURNING *
    `);

        if (resetResult.rows.length === 0) {
            console.log('No requests found to reset. Cannot test.');
            process.exit(0);
        }

        const request = resetResult.rows[0];
        console.log(`   Reset Request ID: ${request.request_id} to PENDING`);

        // 2. Find Admin for this org
        const adminRes = await pool.query(`
      SELECT user_id FROM org_members 
      WHERE organization_id = $1 AND role_name IN ('OWNER', 'ADMIN') AND is_active = TRUE
      LIMIT 1
    `, [request.organization_id]);

        if (adminRes.rows.length === 0) {
            console.log('No admin found for this org.');
            process.exit(0);
        }

        const adminId = adminRes.rows[0].user_id;

        // 3. Approve it
        console.log(`\n2. APPROVING Request ${request.request_id}...`);
        const token = 'test_' + Date.now();

        const approveRes = await pool.query(`
      SELECT * FROM sp_approve_join_request($1::integer, $2::bigint, $3::varchar)
    `, [request.request_id, adminId, token]);

        console.log('   ✅ Approved Successfully!');
        console.table(approveRes.rows);

        // 4. Try to approve AGAIN (Should fail or update? Previous constraint failed. Now should succeed and update)
        // Wait, if I call it again, request is APPROVED.
        // sp_approve_join_request logic:
        // UPDATE ... WHERE request_id = ...
        // And `sp_get_pending...` filters by PENDING.
        // But `sp_approve...` doesn't check current status?
        // It updates regardless.

        console.log('\n3. Testing Re-Approval (Update existing)...');
        const token2 = 'test_2_' + Date.now();
        const approveRes2 = await pool.query(`
      SELECT * FROM sp_approve_join_request($1::integer, $2::bigint, $3::varchar)
    `, [request.request_id, adminId, token2]);
        console.log('   ✅ Re-Approved Successfully (Constraint fix worked if no error)');
        console.table(approveRes2.rows);

        await pool.end();
    } catch (err) {
        console.error('❌ Error:', err);
        await pool.end();
        process.exit(1);
    }
}

testApproveFlow();
