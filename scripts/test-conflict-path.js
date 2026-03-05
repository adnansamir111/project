const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '..', 'apps', 'api', '.env') });

const p = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  // Find any pending invite where the user exists
  const invites = await p.query(`
    SELECT oi.token, oi.email, oi.organization_id, ua.user_id 
    FROM organization_invites oi 
    JOIN user_accounts ua ON oi.email = ua.email 
    WHERE oi.status = 'PENDING' 
    AND oi.expires_at > CURRENT_TIMESTAMP
    LIMIT 1
  `);
  
  if (invites.rows.length > 0) {
    const inv = invites.rows[0];
    console.log('Found real pending invite for:', inv.email, 'user_id:', inv.user_id);
    try {
      const test = await p.query("SELECT * FROM sp_accept_invite_existing_user($1, $2)", [inv.token, inv.user_id]);
      console.log('SUCCESS:', test.rows[0]);
    } catch(e) {
      console.log('ERROR:', e.message);
    }
  } else {
    console.log('No pending invites for existing users. Simulating the ON CONFLICT path...');
    // Create a temp test directly
    try {
      await p.query('BEGIN');
      await p.query("SELECT * FROM sp_accept_invite_existing_user('fake_token_will_return_null', 1)");
      console.log('Function runs without ambiguity errors (returned early at token check)');
      
      // Now test the actual INSERT ON CONFLICT by calling it directly
      // We need to simulate what happens in the function
      await p.query(`
        INSERT INTO org_members (organization_id, user_id, role_name, is_active) 
        VALUES (1, 1, 'MEMBER', TRUE) 
        ON CONFLICT ON CONSTRAINT org_members_pkey 
        DO UPDATE SET is_active = TRUE, role_name = EXCLUDED.role_name
      `);
      console.log('INSERT ON CONFLICT ON CONSTRAINT works correctly!');
      await p.query('ROLLBACK');
    } catch(e) {
      console.log('ERROR:', e.message);
      await p.query('ROLLBACK');
    }
  }

  await p.end();
}
main();
