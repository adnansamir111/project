require('dotenv').config({ path: '.env' });
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

async function debugOrgSwitching() {
    console.log('🔍 Debugging Organization Switching Issue...\n');

    try {
        // Find user "adnansamir700" or similar
        const userQuery = await pool.query(`
            SELECT user_id, username, email 
            FROM user_accounts 
            WHERE username LIKE '%adnan%' OR email LIKE '%adnan%'
            LIMIT 5
        `);

        console.log('📋 Found users:');
        userQuery.rows.forEach(u => {
            console.log(`   - ID: ${u.user_id}, Username: ${u.username}, Email: ${u.email}`);
        });

        if (userQuery.rows.length === 0) {
            console.log('❌ No user found matching "adnan"');
            return;
        }

        const userId = userQuery.rows[0].user_id;
        console.log(`\n🎯 Using user: ${userQuery.rows[0].username} (ID: ${userId})\n`);

        // Check org memberships
        console.log('📊 User\'s organization memberships:');
        const memberships = await pool.query(`
            SELECT 
                om.organization_id,
                o.organization_name,
                o.organization_code,
                om.role_name,
                om.is_active
            FROM org_members om
            JOIN organizations o ON om.organization_id = o.organization_id
            WHERE om.user_id = $1
            ORDER BY o.organization_name
        `, [userId]);

        memberships.rows.forEach(m => {
            console.log(`   - ${m.organization_name} (${m.organization_code}): ${m.role_name} [${m.is_active ? 'ACTIVE' : 'INACTIVE'}]`);
        });

        // Test sp_get_user_organizations
        console.log('\n🔧 Testing sp_get_user_organizations function:');
        const funcResult = await pool.query(`SELECT * FROM sp_get_user_organizations($1)`, [userId]);

        console.log(`   Found ${funcResult.rows.length} organizations:`);
        funcResult.rows.forEach(org => {
            console.log(`   - ID: ${org.organization_id}, Name: ${org.organization_name}, Role: ${org.user_role}`);
        });

        // Check if SUST exists
        const sustCheck = funcResult.rows.find(o => o.organization_name.includes('SUST'));
        if (sustCheck) {
            console.log(`\n✅ SUST organization found:`);
            console.log(`   - Organization ID: ${sustCheck.organization_id}`);
            console.log(`   - Role: ${sustCheck.user_role}`);
            console.log(`   - Expected: OWNER`);
            if (sustCheck.user_role !== 'OWNER') {
                console.log(`   ❌ MISMATCH! User has role ${sustCheck.user_role} but expects OWNER`);
            }
        } else {
            console.log('\n❌ SUST organization NOT found in results!');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

debugOrgSwitching();
