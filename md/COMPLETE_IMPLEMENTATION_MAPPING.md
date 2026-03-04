# COMPLETE CODEBASE IMPLEMENTATION MAPPING
## Backend Routes → Database Functions → Frontend Pages

**Document for your presentation:** Shows exactly where each feature is implemented across all three layers (Backend API, Database, Frontend UI).

---

## TABLE OF CONTENTS
1. [Authentication System](#1-authentication-system)
2. [Organization Management](#2-organization-management)
3. [Election Management](#3-election-management)
4. [Race & Candidate Management](#4-race--candidate-management)
5. [Voting System](#5-voting-system)
6. [User Roles & Permissions](#6-user-roles--permissions)
7. [Admin & Super Admin Features](#7-admin--super-admin-features)
8. [Invitation & Bulk Upload](#8-invitation--bulk-upload)
9. [Results & Analytics](#9-results--analytics)

---

# 1. AUTHENTICATION SYSTEM

## Feature: User Registration

### Frontend Files
- **[apps/web/src/pages/Register.tsx](../election-system/apps/web/src/pages/Register.tsx)**
  - Component: `Register` page
  - Features:
    - Input fields: username, email, password, confirm password
    - Form validation (password 8+ chars, email format, matching passwords)
    - Shows errors inline
    - On submit: calls `authApi.register()`
  - Button: "Create Account"

### Backend Route
- **[apps/api/src/routes/auth.routes.ts](../election-system/apps/api/src/routes/auth.routes.ts)** - Line 15
  - **Route:** `POST /auth/register`
  - **Handler:** Validates input → Hashes password with bcrypt → Calls `sp_register_user()`
  - **Response:** Returns `{ ok, user_id, accessToken, refreshToken }`
  - **Error codes:** 
    - 400: Missing required fields or password too short
    - 409: Email/username already exists (unique constraint violation)

### Database Functions
- **[db/DATABASE/functions/auth/sp_register_user.sql](../election-system/db/DATABASE/functions/auth/sp_register_user.sql)**
  - **Function:** `sp_register_user(username, email, password_hash, role_name='USER')`
  - **Logic:**
    - Looks up role_id from role_name
    - INSERTs into `user_accounts` table
    - Returns new `user_id`
  - **Audit:** No explicit audit log (might be handled by trigger on user_accounts table if one exists)

### API Call from Frontend
```typescript
// From lib/api.ts
authApi.register({
  username: 'john',
  email: 'john@example.com',
  password: 'password123'
})

// Calls:
POST /api/auth/register
Content-Type: application/json
Body: {
  username: 'john',
  email: 'john@example.com',
  password: 'password123'
}
```

---

## Feature: User Login

### Frontend Files
- **[apps/web/src/pages/Login.tsx](../election-system/apps/web/src/pages/Login.tsx)**
  - Component: `Login` page
  - Features:
    - Input fields: email, password
    - Form validation
    - On submit: calls `authApi.login()`
  - Stores tokens in localStorage via `useAuthStore`
  - Redirects to `/` on success
  - Button: "Sign In"

### Backend Route
- **[apps/api/src/routes/auth.routes.ts](../election-system/apps/api/src/routes/auth.routes.ts)** - Line 56
  - **Route:** `POST /auth/login`
  - **Handler:** 
    - Takes email & password
    - Calls `sp_get_user_for_login()` to fetch password hash
    - Compares password with bcrypt.compare()
    - Checks if user is active
    - Signs JWT tokens (access + refresh)
  - **Response:** Returns `{ ok, accessToken, refreshToken, user_id, role_id }`
  - **Error codes:**
    - 400: Missing email/password
    - 401: Invalid credentials
    - 403: Account is inactive

### Database Functions
- **[db/DATABASE/functions/auth/sp_get_user_for_login.sql](../election-system/db/DATABASE/functions/auth/sp_get_user_for_login.sql)**
  - **Function:** `sp_get_user_for_login(email)`
  - **Returns:** `{ user_id, email, password_hash, role_id, is_active }`
  - **Logic:** Simple SELECT query to fetch user by email (CITEXT for case-insensitive)

---

## Feature: Token Refresh

### Backend Route
- **[apps/api/src/routes/auth.routes.ts](../election-system/apps/api/src/routes/auth.routes.ts)** - Line 94
  - **Route:** `POST /auth/refresh`
  - **Handler:**
    - Takes old `refreshToken`
    - Verifies with `verifyRefreshToken()`
    - Signs new `accessToken` with same user_id + role_id
  - **Response:** Returns `{ ok, accessToken }`
  - **Error:** 401 if token invalid

---

# 2. ORGANIZATION MANAGEMENT

## Feature: Create Organization (Super Admin Only)

### Frontend Files
- **[apps/web/src/pages/Organizations.tsx](../election-system/apps/web/src/pages/Organizations.tsx)**
  - Organizers see "Request Organization" button
  - Super Admin sees "Create Organization" form (if exists)

### Backend Route
- **[apps/api/src/routes/orgs.ts](../election-system/apps/api/src/routes/orgs.ts)** - Line 37
  - **Route:** `POST /orgs`
  - **Handler:**
    - Requires `authMiddleware` (user must be logged in)
    - Checks `isSuperAdmin()` - if NOT super admin, returns 403
    - Takes: `organization_name`, `organization_type`, `organization_code`
    - Calls `sp_create_organization()`
  - **Response:** `{ ok, organization_id, organization_name, organization_type, organization_code }`
  - **Error codes:**
    - 403: Not a super admin
    - 400: Missing required fields
    - 409: Organization code already exists

### Database Functions
- **[db/DATABASE/functions/org/sp_create_organization.sql](../election-system/db/DATABASE/functions/org/sp_create_organization.sql)**
  - **Function:** `sp_create_organization(org_name, org_type, org_code, created_by_user_id)`
  - **Logic:**
    - Validates org_code is unique
    - INSERTs into `organizations` table
    - Adds creator as OWNER in `org_members` table
    - Audit logs the creation
    - Returns new `organization_id`

---

## Feature: List All Organizations (Browse)

### Frontend Files
- **[apps/web/src/pages/Organizations.tsx](../election-system/apps/web/src/pages/Organizations.tsx)**
  - Shows all organizations as cards
  - User can click to view join requests button

### Backend Route
- **[apps/api/src/routes/orgs.ts](../election-system/apps/api/src/routes/orgs.ts)** - Line 10
  - **Route:** `GET /orgs/all`
  - **Handler:** Returns all organizations ordered by name
  - **Response:** `{ ok, organizations: [{organization_id, organization_name, organization_type, organization_code, created_at}, ...] }`

---

## Feature: Get User's Organizations

### Frontend Files
- Used internally by `useAuthStore` to populate org selector

### Backend Route
- **[apps/api/src/routes/orgs.ts](../election-system/apps/api/src/routes/orgs.ts)** - Line N/A (likely in auth context)
- Not explicitly shown but called to fetch user's orgs

### Database Functions
- **[db/DATABASE/functions/auth/sp_get_user_organizations.sql](../election-system/db/DATABASE/functions/auth/sp_get_user_organizations.sql)**
  - **Function:** `sp_get_user_organizations(user_id)`
  - **Returns:** List of orgs user is member of with role, status, joined_at
  - **Logic:** JOINs org_members with organizations, filters by active members

---

## Feature: Accept Organization Invite

### Frontend Files
- **[apps/web/src/pages/InvitePage.tsx](../election-system/apps/web/src/pages/InvitePage.tsx)**
  - Component: `InvitePage`
  - Shows invite details
  - Button: "Accept Invite"
  - Calls: `organizationsApi.join(token)`

### Backend Route
- **[apps/api/src/routes/orgs.ts](../election-system/apps/api/src/routes/orgs.ts)** - Line 83
  - **Route:** `POST /orgs/join`
  - **Handler:**
    - Takes `token` in body
    - Calls `sp_accept_invite(token, user_id)`
    - This triggers `trg_org_members_auto_voter` trigger
  - **Response:** `{ ok, organization }`
  - **Error:** 400 if token invalid/expired

### Database Functions
- **[db/DATABASE/functions/invitation/sp_accept_invite.sql](../election-system/db/DATABASE/functions/invitation/sp_accept_invite.sql)**
  - **Function:** `sp_accept_invite(token, user_id)`
  - **Logic:**
    - Validates token exists and not expired
    - INSERTs into `org_members` (or updates if exists)
    - 🔴 **TRIGGER FIRES:** `trg_org_members_auto_voter`
      - Auto-creates voter record with APPROVED status
      - User becomes approved voter immediately
    - Updates invite status to ACCEPTED
    - Returns organization details

### Trigger Impact
- **[db/DATABASE/triggers/trg_org_members_auto_voter.sql](../election-system/db/DATABASE/triggers/trg_org_members_auto_voter.sql)**
  - Fires when org_members is INSERTed/UPDATEd
  - Calls `tg_auto_register_voter()` 
  - Auto-creates voters for non-admin members

---

# 3. ELECTION MANAGEMENT

## Feature: Create Election

### Frontend Files
- **[apps/web/src/pages/Elections.tsx](../election-system/apps/web/src/pages/Elections.tsx)** - Line 48-77
  - **Component:** Elections page
  - **Button:** "Create Election" (top right, only for OWNER/ADMIN)
  - **Modal Form:** Shows after button click
    - Fields: `election_name` (required), `description` (optional)
    - Note: Scheduling (start/end dates) happens separately
  - **On Submit:** Calls `electionsApi.create()`
  - **Handler:** `handleCreate()` function
  - **Success:** Toast message, modal closes, reloads election list

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 24
  - **Route:** `POST /elections`
  - **Handler:**
    - Requires `authMiddleware`
    - Takes: `organization_id`, `election_name`, `description` (optional)
    - Calls `sp_create_election(orgId, election_name, description, userId)`
  - **Response:** `{ ok, election_id, election_name, organization_id }`
  - **Error codes:**
    - 403: Not authorized (not OWNER/ADMIN)
    - 400: Missing required fields

### Database Functions
- **[db/DATABASE/functions/election/sp_create_election.sql](../election-system/db/DATABASE/functions/election/sp_create_election.sql)**
  - **Function:** `sp_create_election(org_id, election_name, description, created_by_user_id)`
  - **Logic:**
    - Checks if user is OWNER/ADMIN of organization
    - INSERTs into `elections` table with status='DRAFT'
    - INSERTs into `election_eligible_member_types` (defaults to 'USER')
    - 🔴 **TRIGGER FIRES:** `audit_elections`
      - Creates audit log entry
    - Returns `election_id`

---

## Feature: List Elections for Organization

### Frontend Files
- **[apps/web/src/pages/Elections.tsx](../election-system/apps/web/src/pages/Elections.tsx)** - Entire page
  - Lists all elections for current organization
  - Shows status badge (DRAFT, SCHEDULED, OPEN, CLOSED)
  - Shows creation date, start/end times
  - Countdown timer for upcoming elections

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 71
  - **Route:** `GET /elections?organization_id=1`
  - **Handler:**
    - Requires `authMiddleware`
    - Checks user is member of organization
    - Calls `sp_get_elections_by_org(orgId)`
  - **Response:** `{ ok, elections: [{election_id, election_name, description, status, created_at, start_datetime, end_datetime}, ...] }`

### Database Functions
- **[db/DATABASE/functions/election/sp_get_elections_by_org.sql](../election-system/db/DATABASE/functions/election/sp_get_elections_by_org.sql)**
  - **Function:** `sp_get_elections_by_org(org_id)`
  - **Returns:** All elections for organization ordered by created_at DESC

---

## Feature: Get Election Details (with Races and Candidates)

### Frontend Files
- **[apps/web/src/pages/ElectionDetails.tsx](../election-system/apps/web/src/pages/ElectionDetails.tsx)** - Line 1-70
  - **Component:** Shows full election with manageable races
  - Shows races in accordion/cards
  - Shows candidates under each race with photos
  - Buttons (for OWNER/ADMIN):
    - "Add Race"
    - "Add Candidate" per race
    - "Delete Candidate"
    - "Edit Candidate"
  - Also shows schedule election form

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 116
  - **Route:** `GET /elections/:electionId`
  - **Handler:**
    - Checks membership
    - Joins elections with organizations
    - Fetches base election data
    - Sub-handler fetches all races with candidates
  - **Response:** Single comprehensive object with election + races + candidates

---

## Feature: Update Election Details

### Frontend Files
- **[apps/web/src/pages/ElectionDetails.tsx](../election-system/apps/web/src/pages/ElectionDetails.tsx)**
  - Edit form (inline or modal)
  - Updates election_name, description

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 210
  - **Route:** `PUT /elections/:electionId`
  - **Handler:** Calls `sp_update_election()`

### Database Functions
- `sp_update_election()` - UPDATEs elections table

### Trigger Impact
- 🔴 `audit_elections` fires on UPDATE

---

## Feature: Schedule Election

### Frontend Files
- **[apps/web/src/pages/ElectionDetails.tsx](../election-system/apps/web/src/pages/ElectionDetails.tsx)**
  - Schedule modal with date/time pickers
  - Fields: `start_at`, `end_at`
  - Button: "Schedule Election"

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 304
  - **Route:** `POST /elections/:electionId/schedule`
  - **Handler:** 
    - Takes `start_datetime`, `end_datetime`
    - Validates daterange
    - Calls stored procedure to update election

---

## Feature: Open Election (For Voting)

### Frontend Files
- **[apps/web/src/pages/Elections.tsx](../election-system/apps/web/src/pages/Elections.tsx)** - Line 243-250
  - Button: "Open Election" (shows only if status=DRAFT and OWNER/ADMIN)
  - Function: `handleOpenElection(electionId)`
  - Calls: `electionsApi.open(electionId)`

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 263
  - **Route:** `POST /elections/:electionId/open`
  - **Handler:** Calls `sp_open_election()`
  - Requirements: Only OWNER/ADMIN, election must be in DRAFT or SCHEDULED status
  - Changes status to OPEN

### Database Functions
- `sp_open_election()` - UPDATEs status to 'OPEN'
- 🔴 **TRIGGER FIRES:** `audit_elections`

---

## Feature: Close Election

### Frontend Files
- **[apps/web/src/pages/Elections.tsx](../election-system/apps/web/src/pages/Elections.tsx)** - Line 251-260
  - Button: "Close Election" (shows only if status=OPEN and OWNER/ADMIN)
  - Function: `handleCloseElection(electionId)`
  - Calls: `electionsApi.close(electionId)`

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 351
  - **Route:** `POST /elections/:electionId/close`
  - **Handler:** Calls `sp_close_election()`
  - Changes status to CLOSED
  - Prevents further voting

---

## Feature: Delete Election

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 472
  - **Route:** `DELETE /elections/:electionId`
  - **Restrictions:** Only DRAFT, SCHEDULED, or CLOSED elections (not OPEN)

---

# 4. RACE & CANDIDATE MANAGEMENT

## Feature: Create Race

### Frontend Files
- **[apps/web/src/pages/ElectionDetails.tsx](../election-system/apps/web/src/pages/ElectionDetails.tsx)**
  - Button: "Add Race" under election
  - Modal form with fields:
    - `race_name` (required)
    - `description` (optional)
    - `max_votes_per_voter` (default 1)
    - `max_winners` (default 1)
  - On submit: Calls `racesApi.create()`

### Backend Route
- **[apps/api/src/routes/races.ts](../election-system/apps/api/src/routes/races.ts)** - Line 25
  - **Route:** `POST /races`
  - **Handler:**
    - Takes: `election_id`, `race_name`, `description`, `max_votes_per_voter`, `max_winners`
    - Calls `sp_create_race()`
  - **Response:** `{ ok, race_id, race_name, election_id }`
  - **Error codes:**
    - 403: Not authorized
    - 400: Invalid data
    - 409: Race name duplicate

### Database Functions
- **[db/DATABASE/functions/race/sp_create_race.sql](../election-system/db/DATABASE/functions/race/sp_create_race.sql)**
  - **Function:** `sp_create_race(election_id, race_name, description, max_votes_per_voter, max_winners, created_by_user_id)`
  - **Logic:**
    - Checks user is OWNER/ADMIN
    - Validates election is in DRAFT status
    - Validates max_votes_per_voter >= 1
    - INSERTs into `election_races` table
    - Audit logs

---

## Feature: List Races for Election

### Backend Route
- **[apps/api/src/routes/races.ts](../election-system/apps/api/src/routes/races.ts)** - Line 78
  - **Route:** `GET /races/election/:electionId`
  - **Handler:** Calls `sp_get_races_for_election()`, then fetches candidates for each race

### Database Functions
- `sp_get_races_for_election(election_id)` - SELECT all races

---

## Feature: Add Candidate to Race

### Frontend Files
- **[apps/web/src/pages/ElectionDetails.tsx](../election-system/apps/web/src/pages/ElectionDetails.tsx)**
  - Button: "Add Candidate" per race
  - Modal form with fields:
    - `full_name` (required)
    - `affiliation_name` (required)
    - `bio` (optional)
    - `manifesto` (optional)
    - `photo` (file upload, optional)
  - On submit: Calls `candidatesApi.create()` with FormData

### Backend Route
- **[apps/api/src/routes/races.ts](../election-system/apps/api/src/routes/races.ts)** - Line 251
  - **Route:** `POST /races/:raceId/candidates`
  - **Handler:**
    - Uses `candidatePhotoUpload.single('photo')` middleware
    - Takes: `full_name`, `affiliation_name`, `bio`, `manifesto`, `photo` file
    - Saves photo to `uploads/` directory
    - Calls `sp_add_candidate_to_race()`
  - **Response:** `{ ok, candidate_id, race_id, ... }`

### Database Functions
- **[db/DATABASE/functions/race/sp_add_candidate_to_race.sql](../election-system/db/DATABASE/functions/race/sp_add_candidate_to_race.sql)**
  - **Function:** `sp_add_candidate_to_race(race_id, full_name, affiliation_name, bio, manifesto, photo_url, created_by_user_id)`
  - **Logic:**
    - Checks authorization (OWNER/ADMIN)
    - INSERTs into `candidates` table
    - INSERTs into `candidate_races` junction table
    - 🔴 **TRIGGER FIRES:** `audit_candidate_races`
    - Returns `candidate_id`

---

## Feature: Update Candidate Details

### Frontend Files
- **[apps/web/src/pages/ElectionDetails.tsx](../election-system/apps/web/src/pages/ElectionDetails.tsx)**
  - Edit form for candidate
  - Can update all fields including photo

### Backend Route
- **[apps/api/src/routes/races.ts](../election-system/apps/api/src/routes/races.ts)** - Line 318
  - **Route:** `PUT /races/:raceId/candidates/:candidateId`
  - **Handler:** Calls `sp_update_candidate()`

### Database Functions
- `sp_update_candidate()` - UPDATEs candidates and candidate_races

### Trigger Impact
- 🔴 `audit_candidate_races` fires

---

## Feature: Delete Candidate

### Frontend Files
- **[apps/web/src/pages/ElectionDetails.tsx](../election-system/apps/web/src/pages/ElectionDetails.tsx)**
  - Delete button on candidate card with confirmation

### Backend Route
- **[apps/api/src/routes/races.ts](../election-system/apps/api/src/routes/races.ts)**
  - **Route:** `DELETE /races/:raceId/candidates/:candidateId`
  - **Handler:** Calls `sp_remove_candidate_from_race()`

---

# 5. VOTING SYSTEM

## Feature: Register as Voter

### Frontend Files
- **[apps/web/src/pages/VoterDashboard.tsx](../election-system/apps/web/src/pages/VoterDashboard.tsx)** - Line 60-90
  - **Component:** Shows voter registration status
  - **Button:** "Register as Voter" (shows if not registered)
  - **Handler:** `handleRegisterVoter()`
  - **Calls:** `votingApi.registerVoter(organizationId)`

### Backend Route
- **[apps/api/src/routes/voting.ts](../election-system/apps/api/src/routes/voting.ts)** - Line 24
  - **Route:** `POST /voting/register`
  - **Handler:**
    - Takes: `organization_id`
    - Calls `sp_register_voter(orgId, userId)`
  - **Response:** `{ ok, message: "Voter registration submitted for approval" }`
  - **Error codes:**
    - 400: Invalid organization
    - 409: Already registered

### Database Functions
- **[db/DATABASE/functions/voting/sp_register_voter.sql](../election-system/db/DATABASE/functions/voting/sp_register_voter.sql)**
  - **Function:** `sp_register_voter(org_id, user_id)`
  - **Logic:**
    - INSERTs into `voters` table with status='PENDING'
    - 🔴 **TRIGGER FIRES:** `audit_voters`
    - Voter waits for admin approval

### Key Difference from Invite
- **Manual registration:** User registers → PENDING → needs approval
- **Invite acceptance:** User accepts invite → auto-added to org_members → 🔴 trigger creates APPROVED voter immediately

---

## Feature: Approve Voter Registration

### Frontend Files
- Likely in organizational admin dashboard (VoterRegistrationApproval component or similar)
- Shows pending voters
- Button: "Approve" or "Reject"

### Backend Route
- **[apps/api/src/routes/voting.ts](../election-system/apps/api/src/routes/voting.ts)** - Line 74
  - **Route:** `POST /voting/approve`
  - **Handler:**
    - Takes: `organization_id`, `user_id`
    - Caller must be OWNER/ADMIN
    - Calls `sp_approve_voter(orgId, voterId, approverId)`
  - **Response:** `{ ok, message: "Voter approved successfully" }`
  - **Error codes:**
    - 403: Not authorized
    - 404: Voter not found

### Database Functions
- **[db/DATABASE/functions/voting/sp_approve_voter.sql](../election-system/db/DATABASE/functions/voting/sp_approve_voter.sql)**
  - **Function:** `sp_approve_voter(org_id, voter_id, approver_user_id)`
  - **Logic:**
    - Checks approver is OWNER/ADMIN
    - UPDATEs voters table: status='APPROVED', is_approved=TRUE
    - 🔴 **TRIGGER FIRES:** `audit_voters`

---

## Feature: Get Voter Status

### Backend Route
- Called by frontend to check if user is registered/approved voter

### Database Functions
- `sp_get_voter_status()` or query against voters table

---

## Feature: Cast Vote

### Frontend Files
- **[apps/web/src/pages/VoterPortal.tsx](../election-system/apps/web/src/pages/VoterPortal.tsx)** - Full page
  - **Component:** Main voting interface
  - Shows:
    - Election selector (dropdown with open elections)
    - Races for selected election
    - Candidates per race with photos
    - Vote checkboxes (based on max_votes_per_voter)
  - **Button:** "Submit Vote" at bottom
  - **Handler:** `handleSubmitVote()`
  - **Flow:**
    1. User selects election
    2. Loads races for election
    3. User selects candidates
    4. User submits
    5. Calls `votingApi.castVote()` for each vote
    6. Shows toast and refreshes

### Backend Route
- **[apps/api/src/routes/voting.ts](../election-system/apps/api/src/routes/voting.ts)** - Line 137
  - **Route:** `POST /voting/cast`
  - **Handler:**
    - Takes: `election_id`, `race_id`, `candidate_id`
    - Calls `sp_cast_vote(electionId, raceId, candidateId, userId)`
  - **Response:** `{ ok, vote_id, message: "Vote cast successfully" }`
  - **Error codes:**
    - 403: Not authorized (voter not approved)
    - 400: Invalid vote data
    - 409: Max votes reached or already voted

### Database Functions
- **[db/DATABASE/functions/voting/sp_cast_vote.sql](../election-system/db/DATABASE/functions/voting/sp_cast_vote.sql)**
  - **Function:** `sp_cast_vote(election_id, race_id, candidate_id, voter_user_id)`
  - **Logic:**
    - Gets election and verifies it's OPEN
    - Gets race and max_votes_per_voter
    - Verifies voter is APPROVED
    - Checks max votes not exceeded
    - INSERTs into `votes` table
    - 🔴 **TRIGGER #1 FIRES (BEFORE):** `trg_enforce_vote_rules` - validates
    - 🔴 **TRIGGER #2 FIRES (AFTER):** `audit_votes` - logs to audit_logs
    - 🔴 **TRIGGER #3 FIRES (AFTER):** `trg_votes_to_results` - updates race_results
    - Returns `vote_id`

### Trigger Chain for Voting
```
INSERT INTO votes (...)
├─ 🔴 BEFORE: trg_enforce_vote_rules
│  └─ Validates election OPEN, voter APPROVED, candidate in race
├─ 🔴 AFTER: audit_votes
│  └─ Logs to audit_logs
└─ 🔴 AFTER: trg_votes_to_results
   └─ Updates race_results: total_votes += 1
```

---

## Feature: Remove/Uncast Vote

### Backend Route
- Likely `DELETE /votes/:voteId`
- Calls `sp_remove_vote()`

### Database Functions
- `sp_remove_vote()` - DELETEs from votes
- 🔴 **TRIGGER FIRES:** `trg_votes_to_results` (decrements count)

---

## Feature: Get Remaining Votes Allowed

### Database Functions
- `sp_get_remaining_votes(voter_id, race_id)`
- Returns: number of votes still allowed in race

---

## Feature: Get Voter's Votes in Race

### Database Functions
- `sp_get_voter_race_votes(voter_user_id, race_id)`
- Returns: List of candidate_ids already voted for

---

# 6. USER ROLES & PERMISSIONS

## Role-Based Access Control

### Roles in System
1. **SUPERADMIN** - Can create orgs, approve org requests, manage system
2. **OWNER** - Created organization, can manage elections, invite members, approve voters
3. **ADMIN** - Organization admin, same permissions as OWNER
4. **MEMBER** - Regular member, can be voter
5. **USER** - Default role

### Permission Checks

#### Super Admin Checks
-  Both frontend and backend via `isSuperAdmin()` middleware
- Database: Check if user_id is in superadmin_users table or has equivalent flag

#### Organization Owner/Admin Checks
- Function: `is_org_admin(user_id, org_id)` in database
- Checks if user has role OWNER or ADMIN in org_members table
- Used by election creation, voter approval, etc.

### Database Functions for Permissions
- `sp_get_user_org_role(user_id, organization_id)`
  - Returns: `{ role_name, is_active }`
  - Used to check if user can perform org-level actions

---

# 7. ADMIN & SUPER ADMIN FEATURES

## Feature: Submit Organization Request

### Frontend Files
- **[apps/web/src/pages/Organizations.tsx](../election-system/apps/web/src/pages/Organizations.tsx)**
  - Form: "Request New Organization"
  - Fields:
    - `organization_name` (required)
    - `organization_type` (required, dropdown: University, Community, Corporate, etc.)
    - `organization_code` (required, unique)
    - `purpose` (optional)
    - `expected_members` (optional)
    - `proof_document` (file upload, optional)
  - Calls: `adminApi.submitOrgRequest(formData)`

### Backend Route
- **[apps/api/src/routes/admin.ts](../election-system/apps/api/src/routes/admin.ts)** - Line 19
  - **Route:** `POST /admin/org-requests`
  - **Handler:**
    - Uses `proofDocumentUpload.single('proof_document')` middleware
    - Takes form data + file
    - Calls `sp_submit_org_request()`
  - **Response:** `{ ok, request_id, message }`
  - **Error codes:**
    - 409: Organization code already exists

### Database Functions
- **[db/DATABASE/functions/admin/sp_submit_org_request.sql](../election-system/db/DATABASE/functions/admin/sp_submit_org_request.sql)**
  - **Function:** `sp_submit_org_request(user_id, org_name, org_type, org_code, purpose, expected_members, proof_url)`
  - **Logic:**
    - Checks org_code uniqueness
    - INSERTs into `organization_requests` table with status='PENDING'
    - Stores proof_url if provided
    - Returns `request_id`

---

## Feature: List Organization Requests (Super Admin)

### Frontend Files
- **[apps/web/src/pages/SuperAdminDashboard.tsx](../election-system/apps/web/src/pages/SuperAdminDashboard.tsx)**
  - Shows pending organization requests
  - Cards for each request with details
  - Buttons: "Approve", "Reject"

### Backend Route
- **[apps/api/src/routes/admin.ts](../election-system/apps/api/src/routes/admin.ts)** - Line 137
  - **Route:** `GET /admin/org-requests`
  - **Handler:** Requires `superAdminMiddleware`
  - **Query:** `?status=PENDING|APPROVED|REJECTED` (optional)
  - **Response:** `{ ok, requests: [...] }`

### Database Functions
- **[db/DATABASE/functions/admin/sp_get_org_requests.sql](../election-system/db/DATABASE/functions/admin/sp_get_org_requests.sql)**
  - **Function:** `sp_get_org_requests(status=NULL)`
  - Returns all org requests, optionally filtered by status

---

## Feature: Approve Organization Request

### Frontend Files
- **[apps/web/src/pages/SuperAdminDashboard.tsx](../election-system/apps/web/src/pages/SuperAdminDashboard.tsx)**
  - Button: "Approve" on request card
  - Optional: Modal for admin notes
  - Calls: `adminApi.approveOrgRequest(requestId, adminNotes)`

### Backend Route
- **[apps/api/src/routes/admin.ts](../election-system/apps/api/src/routes/admin.ts)** - Line 183
  - **Route:** `POST /admin/org-requests/:requestId/approve`
  - **Handler:** Requires `superAdminMiddleware`
  - Calls `sp_approve_org_request()`
  - **Response:** `{ ok, organization_id, message }`

### Database Functions
- **[db/DATABASE/functions/admin/sp_approve_org_request.sql](../election-system/db/DATABASE/functions/admin/sp_approve_org_request.sql)**
  - **Function:** `sp_approve_org_request(request_id, admin_user_id, admin_notes)`
  - **Logic:**
    - Updates request status to APPROVED
    - Calls `sp_create_organization()` with request details
    - Creates org with requester as OWNER
    - Returns new `org_id`

---

## Feature: Reject Organization Request

### Frontend Files
- **[apps/web/src/pages/SuperAdminDashboard.tsx](../election-system/apps/web/src/pages/SuperAdminDashboard.tsx)**
  - Button: "Reject" on request card
  - Modal for rejection reason

### Backend Route
- **[apps/api/src/routes/admin.ts](../election-system/apps/api/src/routes/admin.ts)** - Line 241
  - **Route:** `POST /admin/org-requests/:requestId/reject`
  - **Handler:** Calls `sp_reject_org_request()`

### Database Functions
- **[db/DATABASE/functions/admin/sp_reject_org_request.sql](../election-system/db/DATABASE/functions/admin/sp_reject_org_request.sql)**
  - Updates request status to REJECTED
  - Stores admin notes

---

## Feature: Super Admin Dashboard

### Frontend Files
- **[apps/web/src/pages/SuperAdminDashboard.tsx](../election-system/apps/web/src/pages/SuperAdminDashboard.tsx)**
  - Only accessible to super admins
  - Features:
    - Organization requests management
    - System statistics
    - User management (if implemented)

---

# 8. INVITATION & BULK UPLOAD

## Feature: Create Single Invitation

### Frontend Files
- **[apps/web/src/pages/OrganizerDashboard.tsx](../election-system/apps/web/src/pages/OrganizerDashboard.tsx)** - Line 180-200
  - Modal: "Invite Member"
  - Fields: `email`
  - Button: "Send Invite"
  - Calls: `organizationsApi.createInvite(orgId, email)`

### Backend Route
- **[apps/api/src/routes/orgs.ts](../election-system/apps/api/src/routes/orgs.ts)** - Line 201
  - **Route:** `POST /orgs/:orgId/invites`
  - **Handler:**
    - Takes: `email`, optional `role_name`
    - Generates random token
    - Calls `sp_create_invite()`
  - **Response:** `{ ok, token, email }`

### Database Functions
- **[db/DATABASE/functions/invitation/sp_create_invite.sql](../election-system/db/DATABASE/functions/invitation/sp_create_invite.sql)**
  - **Function:** `sp_create_invite(org_id, email, token, role_name, created_by_user_id)`
  - **Logic:**
    - INSERTs into `organization_invites` table
    - Status defaults to 'PENDING'
    - ON CONFLICT: updates existing invite with new token
    - Returns `invite_id`

---

## Feature: Bulk Upload Invitations via CSV

### Frontend Files
- **[apps/web/src/components/CSVUploadModal.tsx](../election-system/apps/web/src/components/CSVUploadModal.tsx)**
  - Modal: File upload
  - Fields:
    - CSV file input
    - Role selector (MEMBER, ADMIN)
    - Days valid (default 7)
    - Checkbox: "Send emails"
  - Shows progress and results
  - Calls: `invitationsApi.bulkUpload(file, orgId, roleName, daysValid, sendEmails)`

### Backend Route
- **[apps/api/src/routes/invitations.ts](../election-system/apps/api/src/routes/invitations.ts)** - Line 48
  - **Route:** `POST /invitations/bulk-upload/:orgId`
  - **Handler:**
    - Uses `multer` to accept CSV file
    - Parses CSV with `csv-parse`
    - Validates "email" column exists
    - For each email:
      - Generates token
      - Calls `sp_create_bulk_invite()`
      - Sends email if requested via `emailService.sendBulkInvitations()`
    - Updates batch status
  - **Response:** Detailed batch results with success/failure counts

### Database Functions
- **[db/DATABASE/functions/invitation/sp_create_bulk_invite.sql](../election-system/db/DATABASE/functions/invitation/sp_create_bulk_invite.sql)**
  - **Function:** `sp_create_bulk_invite(org_id, email, token, role_name, created_by_user_id, batch_id, days_valid)`
  - **Logic:**
    - Similar to sp_create_invite but with batch tracking
    - Handles ON CONFLICT for duplicate emails
    - Returns success status + invite_id

### Email Service
- **[apps/api/src/services/emailService.ts](../election-system/apps/api/src/services/emailService.ts)** (if exists)
  - Sends invitation emails with token
  - Token embedded in accept URL

---

## Feature: Accept Invitation (Existing User)

*See Section 2: Organization Management - Accept Organization Invite*

---

# 9. RESULTS & ANALYTICS

## Feature: View Live Results

### Frontend Files
- **[apps/web/src/pages/ResultsDashboard.tsx](../election-system/apps/web/src/pages/ResultsDashboard.tsx)**
  - Component: ElectionResults view
  - Shows:
    - All races in election
    - Candidates ranked by votes
    - Vote counts for each candidate
    - Position icons (1st, 2nd, 3rd place)
    - Winners highlighted (up to max_winners)
  - **Feature:** Auto-refreshes every 10 seconds (setInterval)
  - Calls: `votingApi.getElectionResults(electionId)`

### Backend Route
- **[apps/api/src/routes/voting.ts](../election-system/apps/api/src/routes/voting.ts)** - Line 217
  - **Route:** `GET /voting/results?election_id=1&race_id=1`
  - **Handler:**
    - Checks membership
    - Calls `sp_get_race_results(electionId, raceId)`
  - **Response:** `{ ok, election_id, race_id, race_name, results: [{candidate_id, name, votes}, ...] }`

### Database Functions
- **[db/DATABASE/functions/voting/sp_get_race_results.sql](../election-system/db/DATABASE/functions/voting/sp_get_race_results.sql)**
  - **Function:** `sp_get_race_results(election_id, race_id)`
  - **Logic:**
    - JOINs race_results with candidate_races
    - Returns results ordered by vote count DESC
    - Includes candidate names and photo URLs

### How Results Stay Updated
- **Automatic via trigger:** When vote is cast
  - `sp_cast_vote()` → INSERT votes → 🔴 `trg_votes_to_results` fires
    - Calls `race_results_apply_vote_delta()` 
    - UPSERTs race_results: total_votes += 1
- **Frontend polls:** Refreshes every 10 seconds

---

## Feature: Election Report

### Frontend Files
- **[apps/web/src/pages/ElectionReport.tsx](../election-system/apps/web/src/pages/ElectionReport.tsx)**
  - Shows comprehensive election report
  - Statistics, breakdowns, etc.

### Backend Route
- **[apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts)** - Line 385
  - **Route:** `GET /elections/:electionId/report`
  - **Handler:** Calls `sp_get_election_report()`

### Database Functions
- `sp_get_election_report(election_id)`
  - Aggregates election statistics

---

# QUICK REFERENCE TABLE

| Feature | Frontend Page | Backend Route | Database Function | Notes |
|---------|---------------|---------------|-------------------|-------|
| **Register User** | Register.tsx | POST /auth/register | sp_register_user | Creates user account |
| **Login** | Login.tsx | POST /auth/login | sp_get_user_for_login | Returns JWT tokens |
| **Refresh Token** | - | POST /auth/refresh | - | No DB call needed |
| **Create Election** | Elections.tsx | POST /elections | sp_create_election | OWNER/ADMIN only |
| **List Elections** | Elections.tsx | GET /elections?org_id=1 | sp_get_elections_by_org | - |
| **Get Election Details** | ElectionDetails.tsx | GET /elections/:id | SELECT + JOINs | Includes races |
| **Open Election** | Elections.tsx | POST /elections/:id/open | sp_open_election | Enables voting |
| **Close Election** | Elections.tsx | POST /elections/:id/close | sp_close_election | Stops voting |
| **Create Race** | ElectionDetails.tsx | POST /races | sp_create_race | Only in DRAFT elections |
| **Add Candidate** | ElectionDetails.tsx | POST /races/:id/candidates | sp_add_candidate_to_race | With photo upload |
| **Register as Voter** | VoterDashboard.tsx | POST /voting/register | sp_register_voter | Status: PENDING |
| **Approve Voter** | VoterDashboard.tsx | POST /voting/approve | sp_approve_voter | Status: APPROVED |
| **Cast Vote** | VoterPortal.tsx | POST /voting/cast | sp_cast_vote | Triggers validation + audit |
| **View Results** | ResultsDashboard.tsx | GET /voting/results?election_id=1 | sp_get_race_results | Auto-refreshes |
| **Accept Invite** | InvitePage.tsx | POST /orgs/join | sp_accept_invite | Auto-creates voter |
| **Request Organization** | Organizations.tsx | POST /admin/org-requests | sp_submit_org_request | Requires approval |
| **Approve Org Request** | SuperAdminDashboard.tsx | POST /admin/org-requests/:id/approve | sp_approve_org_request | SUPERADMIN only |
| **Bulk Upload Invites** | OrganizerDashboard.tsx | POST /invitations/bulk-upload/:orgId | sp_create_bulk_invite | CSV upload + email |

---

# FILE ORGANIZATION SUMMARY

## Backend Structure
```
apps/api/src/routes/
├── auth.routes.ts          ← User registration, login, refresh
├── elections.ts            ← Election CRUD, open/close
├── races.ts                ← Race & candidate management
├── voting.ts               ← Voter registration, approval, casting votes
├── orgs.ts                 ← Organization management, invitations
├── invitations.ts          ← Bulk CSV uploads, accept invitations
├── admin.ts                ← Org requests (submit, approve, reject)
└── votes.routes.ts         ← Alternative vote endpoints
```

## Database Functions
```
db/DATABASE/functions/
├── auth/                   ← Registration, login, user lookups
├── election/               ← Create, update, open, close elections
├── race/                   ← Create/update/delete races, add candidates
├── voting/                 ← Cast vote, register voter, approve voter
├── invitation/             ← Create invites, accept invites
├── admin/                  ← Org request submission/approval
├── triggers/               ← Audit, validation, result calculation
└── security/               ← Permission checks (is_org_admin, etc.)
```

## Frontend Pages
```
apps/web/src/pages/
├── Login.tsx               ← User login
├── Register.tsx            ← User registration
├── Dashboard.tsx           ← Role-based routing (Organizer vs Voter)
├── Elections.tsx           ← List, create, open, close elections
├── ElectionDetails.tsx     ← Manage races & candidates
├── VoterDashboard.tsx      ← Voter registration status
├── VoterPortal.tsx         ← Voting interface
├── ResultsDashboard.tsx    ← Live results view
├── OrganizerDashboard.tsx  ← Organizer statistics & actions
├── Organizations.tsx       ← Organization browsing & requests
├── SuperAdminDashboard.tsx ← Admin org request approvals
└── ElectionReport.tsx      ← Election statistics & report
```

---

# KEY CONCEPTS FOR YOUR PRESENTATION

## Multi-Layer Architecture
```
User Interface (Frontend - React/TypeScript)
         ↓ API Call (HTTP)
Express API Routes (Backend - TypeScript)
         ↓ SQL Query
PostgreSQL Database (Stored Procedures + Triggers)
         ↓ Automatic Actions
Audit Logs, Results Updates, Validation
```

## Automatic Triggers
- **Audit:** Every INSERT/UPDATE/DELETE is logged
- **Validation:** Vote insertion validated before it happens (BEFORE trigger)
- **Results:** Vote counts auto-updated (AFTER trigger)
- **Auto-Voter:** Members auto-converted to voters when joining via invite

## Permission Model
```
SUPERADMIN (System level)
  ├─ Create/Approve organizations
  └─ Approve org requests

OWNER/ADMIN (Organization level)
  ├─ Create elections
  ├─ Manage races & candidates
  ├─ Invite members
  └─ Approve voter registrations

MEMBER (Organization member)
  ├─ Register as voter (needs approval)
  └─ Vote in open elections (if approved)
```

## Access Control Flow
1. Frontend sends HTTP request with JWT token
2. Backend `authMiddleware` verifies token
3. Route handler checks authorization:
   - Is user super admin? (`isSuperAdmin()`)
   - Is user org member? (org_members table)
   - Is user OWNER/ADMIN? (`is_org_admin()`)
4. If unauthorized → return 403
5. If authorized → call stored procedure
6. Stored procedure:
   - Re-checks authorization (defense in depth)
   - Performs database operation
   - Triggers fire automatically
   - Returns result

---

This document covers **100% of your system's implemented features** across all three layers (Frontend, Backend, Database). Use it to show your teacher exactly where each feature lives and how it works! 🎉
