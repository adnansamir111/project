const pg = require('pg');
const dotenv = require('dotenv');

dotenv.config();

const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL
});

async function verifyApproval() {
    try {
        console.log('=== VERIFYING APPROVAL FIX ===');

        // 1. Ensure a pending request exists
        let res = await pool.query("SELECT request_id, organization_id, user_id FROM organization_join_requests WHERE status = 'PENDING' LIMIT 1");

        if (res.rows.length === 0) {
            console.log("No pending requests. Creating one...");
            const user = await pool.query("SELECT user_id FROM user_accounts WHERE username != 'admin' LIMIT 1");
            const org = await pool.query("SELECT organization_id FROM organizations LIMIT 1");

            if (user.rows.length && org.rows.length) {
                await pool.query(
                    "INSERT INTO organization_join_requests (organization_id, user_id, status) VALUES ($1, $2, 'PENDING') ON CONFLICT DO NOTHING",
                    [org.rows[0].organization_id, user.rows[0].user_id]
                );
                res = await pool.query("SELECT request_id, organization_id, user_id FROM organization_join_requests WHERE status = 'PENDING' LIMIT 1");
            }
        }

        if (res.rows.length === 0) {
            console.error("Could not find or create a pending request.");
            process.exit(1);
        }

        const { request_id, organization_id, user_id } = res.rows[0];

        // 2. Find an admin
        const adminRes = await pool.query(
            "SELECT user_id FROM org_members WHERE organization_id = $1 AND role_name IN ('OWNER', 'ADMIN') LIMIT 1",
            [organization_id]
        );

        if (adminRes.rows.length === 0) {
            console.error("No admin found for organization", organization_id);
            process.exit(1);
        }

        const adminId = adminRes.rows[0].user_id;

        console.log(`Approving request ${request_id} (User: ${user_id}) using Admin ${adminId}`);

        // 3. Call the function
        const approvalRes = await pool.query(
            "SELECT * FROM sp_approve_join_request($1, $2)",
            [request_id, adminId]
        );

        console.log("✅ Approval Success!");
        console.table(approvalRes.rows);

        // 4. Verify membership
        const memberCheck = await pool.query(
            "SELECT * FROM org_members WHERE organization_id = $1 AND user_id = $2",
            [organization_id, user_id]
        );

        if (memberCheck.rows.length > 0) {
            console.log("✅ User successfully added to org_members.");
        } else {
            console.error("❌ User was not added to org_members.");
        }

        await pool.end();
    } catch (err) {
        console.error('❌ Error:', err.message);
        if (err.where) console.error('Context:', err.where);
        await pool.end();
        process.exit(1);
    }
}

verifyApproval();
