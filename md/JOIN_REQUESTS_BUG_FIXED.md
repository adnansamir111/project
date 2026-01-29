# 🐛 JOIN REQUESTS BUG - FIXED

## Problem
Users could submit join requests to organizations, but these requests **were not showing up** in the Organizer Dashboard's "Pending Join Requests" section.

## Root Cause
**Type mismatch in the database schema** causing the stored procedure `sp_get_pending_join_requests` to fail silently.

### Details:
1. **`org_members` table** was created with `INT` for `organization_id` and `user_id` (migration 009)
2. **`user_accounts` table** uses `BIGINT` for `user_id` (migration 001)
3. **`organization_join_requests` table** uses `BIGINT` for IDs (migration 019)
4. **`is_org_admin()` function** accepts `BIGINT` parameters but queries `org_members` with `INT` columns
5. **`sp_get_pending_join_requests()` function** had incorrect return types:
   - Expected `VARCHAR(100)` for username, but `user_accounts` uses `VARCHAR(50)`
   - Expected `VARCHAR(255)` for email, but `user_accounts` uses `CITEXT`
   - Expected `TIMESTAMPTZ` but table uses `TIMESTAMP`

## Solution
Created **3 migrations** to fix the type mismatches:

### Migration 021: Fix org_members types
- Changed `org_members.organization_id` from `INT` to `BIGINT`
- Changed `org_members.user_id` from `INT` to `BIGINT`
- Updated `sp_create_organization` to use `BIGINT`
- Updated `sp_add_org_member` to use `BIGINT`
- Updated `sp_get_org_members` to return `BIGINT`

### Migration 022: Fix sp_get_pending_join_requests (partial)
- Changed request_id from `BIGINT` to `INTEGER` (SERIAL = INTEGER)
- Changed created_at from `TIMESTAMP` to `TIMESTAMPTZ`
- (This was incomplete and replaced by migration 023)

### Migration 023: Fix sp_get_pending_join_requests (final)
- Set exact column types to match source tables:
  - `request_id`: `INTEGER` (SERIAL)
  - `user_id`: `BIGINT`
  - `username`: `VARCHAR(50)` (from user_accounts)
  - `email`: `CITEXT` (from user_accounts)
  - `request_message`: `TEXT`
  - `created_at`: `TIMESTAMP` (not TIMESTAMPTZ)

## Testing
Used debug script `apps/api/debug-join-requests.js` to verify:
- ✅ Join requests are created successfully
- ✅ Pending requests exist in database
- ✅ Admins are properly set when creating organizations
- ✅ `sp_get_pending_join_requests` now returns results correctly

## Result
The Organizer Dashboard will now **successfully display pending join requests** when:
1. A user submits a join request via the Organizations page
2. An organizer (OWNER/ADMIN) views their dashboard
3. The join requests section will show all pending requests with user details

## Files Modified
- `db/migrations/021_fix_org_members_types.sql` (created)
- `db/migrations/022_fix_join_requests_types.sql` (created)
- `db/migrations/023_fix_join_requests_exact_types.sql` (created)
- `apps/api/debug-join-requests.js` (created for debugging)

## How to Verify
1. As a regular user, go to Organizations page
2. Click "Request to Join" on an organization
3. As the organization owner, go to Organizer Dashboard
4. The request should now appear in "Pending Join Requests" section
5. Approve or reject the request
6. If approved, copy the token and send to user
7. User can then complete registration with the token
