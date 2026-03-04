# QUICK REFERENCE GUIDE - Feature to File Mapping
## For Your Presentation - At A Glance

---

## 🔐 AUTHENTICATION

| Action | Frontend | Backend | Database | Status |
|--------|----------|---------|----------|--------|
| **Sign Up** | `Register.tsx` | `POST /auth/register` | `sp_register_user()` | ✅ Works |
| **Sign In** | `Login.tsx` | `POST /auth/login` | `sp_get_user_for_login()` | ✅ Works |
| **Refresh Token** | (Auto) | `POST /auth/refresh` | (JWT only) | ✅ Works |

---

## 🏢 ORGANIZATIONS

| Action | Frontend | Backend | Database | Status |
|--------|----------|---------|----------|--------|
| **Browse Orgs** | `Organizations.tsx` | `GET /orgs/all` | Simple SELECT | ✅ Works |
| **Create Org** | SuperAdmin only | `POST /orgs` | `sp_create_organization()` | ✅ Works |
| **Request Org** | `Organizations.tsx` | `POST /admin/org-requests` | `sp_submit_org_request()` | ✅ Works |
| **Approve Org Request** | `SuperAdminDashboard.tsx` | `POST /admin/org-requests/:id/approve` | `sp_approve_org_request()` | ✅ Works |
| **List My Orgs** | (Sidebar) | (API) | `sp_get_user_organizations()` | ✅ Works |

---

## 📋 ELECTIONS

| Action | Frontend | Backend | Database | Note |
|--------|----------|---------|----------|------|
| **Create Election** | `Elections.tsx` (Modal) | `POST /elections` | `sp_create_election()` | OWNER/ADMIN only, starts DRAFT |
| **List Elections** | `Elections.tsx` | `GET /elections?org_id=1` | `sp_get_elections_by_org()` | With status badges |
| **View Details** | `ElectionDetails.tsx` | `GET /elections/:id` | JOINs + races | Shows races & candidates |
| **Update Election** | `ElectionDetails.tsx` (form) | `PUT /elections/:id` | `sp_update_election()` | DRAFT only |
| **Schedule Election** | `ElectionDetails.tsx` (modal) | `POST /elections/:id/schedule` | UPDATEs status | Sets start_datetime, end_datetime |
| **Open Election** | `Elections.tsx` (button) | `POST /elections/:id/open` | `sp_open_election()` | Status: DRAFT → OPEN, enables voting |
| **Close Election** | `Elections.tsx` (button) | `POST /elections/:id/close` | `sp_close_election()` | Status: OPEN → CLOSED, stops voting |
| **Delete Election** | (if exists) | `DELETE /elections/:id` | (custom proc) | Only DRAFT/SCHEDULED/CLOSED |

---

## 🏆 RACES & CANDIDATES

| Action | Frontend | Backend | Database | Note |
|--------|----------|---------|----------|------|
| **Create Race** | `ElectionDetails.tsx` (modal) | `POST /races` | `sp_create_race()` | Election must be DRAFT |
| **List Races** | `ElectionDetails.tsx` | `GET /races/election/:id` | `sp_get_races_for_election()` | With candidates |
| **Add Candidate** | `ElectionDetails.tsx` (modal) | `POST /races/:id/candidates` | `sp_add_candidate_to_race()` | With photo upload |
| **Update Candidate** | `ElectionDetails.tsx` (form) | `PUT /races/:id/candidates/:id` | `sp_update_candidate()` | Can update photo |
| **Delete Candidate** | `ElectionDetails.tsx` (button) | `DELETE /races/...` | (cascades) | Removes from candidate_races |

---

## 🗳️ VOTING

| Action | Frontend | Backend | Database | Triggers |
|--------|----------|---------|----------|----------|
| **Register as Voter** | `VoterDashboard.tsx` (button) | `POST /voting/register` | `sp_register_voter()` | → audit_voters |
| **Approve Voter** | Admin UI | `POST /voting/approve` | `sp_approve_voter()` | → audit_voters |
| **Cast Vote** | `VoterPortal.tsx` (vote) | `POST /voting/cast` | `sp_cast_vote()` | → enforce_vote_rules (BEFORE), audit_votes, trg_votes_to_results (AFTER) |
| **View Results** | `ResultsDashboard.tsx` | `GET /voting/results?election_id=1&race_id=1` | `sp_get_race_results()` | Auto-refreshes every 10s |

---

## 👥 INVITATIONS & MEMBERS

| Action | Frontend | Backend | Database | Special |
|--------|----------|---------|----------|---------|
| **Single Invite** | `OrganizerDashboard.tsx` (modal) | `POST /orgs/:id/invites` | `sp_create_invite()` | Creates token |
| **Bulk Upload CSV** | `CSVUploadModal.tsx` | `POST /invitations/bulk-upload/:orgId` | `sp_create_bulk_invite()` | Sends emails if enabled |
| **Accept Invite** | `InvitePage.tsx` (button) | `POST /orgs/join` | `sp_accept_invite()` | 🔴 Triggers auto-voter creation! |
| **Get Organization Role** | (Store) | (API) | `sp_get_user_org_role()` | Returns role + active status |

### ⚡ Key Difference
- **Manual voter registration:** VoterDashboard → Register → Status: PENDING → Needs admin approval
- **Via Invite:** InvitePage → Accept → Auto-creates voter → Status: APPROVED (no approval needed!)

---

## 📊 ADMIN FEATURES

| Action | Frontend | Backend | Database | Requires |
|--------|----------|---------|----------|----------|
| **List Org Requests** | `SuperAdminDashboard.tsx` | `GET /admin/org-requests` | `sp_get_org_requests()` | SUPERADMIN |
| **Get My Org Requests** | `Organizations.tsx` | `GET /admin/org-requests/my` | `sp_get_my_org_requests()` | Any user |
| **Approve Org Request** | `SuperAdminDashboard.tsx` | `POST /admin/org-requests/:id/approve` | `sp_approve_org_request()` | SUPERADMIN |
| **Reject Org Request** | `SuperAdminDashboard.tsx` | `POST /admin/org-requests/:id/reject` | `sp_reject_org_request()` | SUPERADMIN |

---

## 🔄 API CALL EXAMPLES

### Creating an Election
```json
Frontend: Elections.tsx
  ↓ User fills form (election_name, description)
  ↓ Calls electionsApi.create()

POST /api/elections
{
  "organization_id": 1,
  "election_name": "Student Council Elections 2024",
  "description": "Annual elections"
}

Backend: elections.ts → sp_create_election($1, $2, $3, $4)

Response:
{
  "ok": true,
  "election_id": 5,
  "election_name": "Student Council Elections 2024",
  "organization_id": 1
}
```

### Casting a Vote
```json
Frontend: VoterPortal.tsx
  ↓ User selects candidate
  ↓ Calls votingApi.castVote()

POST /api/voting/cast
{
  "election_id": 5,
  "race_id": 10,
  "candidate_id": 42
}

Events in Database:
1. 🔴 BEFORE trigger: trg_enforce_vote_rules
   └─ Validates: election OPEN? voter APPROVED? candidate in race?
   
2. INSERT into votes succeeds (if valid)

3. 🔴 AFTER trigger: audit_votes
   └─ INSERT into audit_logs

4. 🔴 AFTER trigger: trg_votes_to_results
   └─ UPDATE race_results: vote_count += 1

Response:
{
  "ok": true,
  "vote_id": 999,
  "message": "Vote cast successfully"
}
```

### Accepting Organization Invite
```json
Frontend: InvitePage.tsx
  ↓ User enters token and clicks "Accept"
  ↓ Calls organizationsApi.join(token)

POST /api/orgs/join
{
  "token": "abc123xyz789..."
}

Database Events:
1. Validates token in organization_invites

2. 🔴 TRIGGER FIRES: trg_org_members_auto_voter
   └─ Automatically INSERTs into voters table
   └─ Status: APPROVED (no admin approval needed!)
   └─ User can immediately start voting

Response:
{
  "ok": true,
  "organization": { organization_id, organization_name, ... }
}

Result: User is now member AND approved voter!
```

---

## 🏗️ FOLDER STRUCTURE AT A GLANCE

### Backend Routes (8 files)
```
apps/api/src/routes/
├── auth.routes.ts       (2 endpoints: /register, /login, /refresh)
├── elections.ts         (8+ endpoints: CRUD + open/close)
├── races.ts            (10+ endpoints: races + candidates)
├── voting.ts           (3 endpoints: register/approve voter, cast vote)
├── orgs.ts             (6+ endpoints: create, list, join, etc.)
├── invitations.ts      (4+ endpoints: bulk upload, resend)
├── admin.ts            (6 endpoints: org request management)
└── votes.routes.ts     (alternative vote endpoint)
```

### Database Functions (65+ files)
```
db/DATABASE/functions/
├── auth/               (4 functions: login, register, get_user_orgs, get_role)
├── election/           (7 functions: create/update/open/close/delete)
├── race/              (8 functions: create/update/delete race/candidate)
├── voting/            (11 functions: register/approve voter, cast vote, results)
├── invitation/        (8 functions: create/accept/validate invites)
├── admin/             (5 functions: request submission/approval/rejection)
├── triggers/          (4 trigger functions: audit, validate, results, auto-voter)
└── security/          (Helper functions: is_org_admin, app_org_id, etc.)
```

### Frontend Pages (15 files)
```
apps/web/src/pages/
├── Login.tsx                  (1 page: user login)
├── Register.tsx               (1 page: user signup)
├── Dashboard.tsx              (1 page: role-based routing)
├── Elections.tsx              (1 page: list, create, open, close)
├── ElectionDetails.tsx        (1 page: manage races & candidates)
├── VoterDashboard.tsx         (1 page: voter status & registration)
├── VoterPortal.tsx            (1 page: voting interface)
├── ResultsDashboard.tsx       (1 page: live election results)
├── OrganizerDashboard.tsx     (1 page: organizer statistics)
├── Organizations.tsx          (1 page: browse & request orgs)
├── SuperAdminDashboard.tsx    (1 page: manage org requests)
├── ElectionReport.tsx         (1 page: election statistics)
├── InvitePage.tsx             (1 page: accept invite)
├── UserProfile.tsx            (1 page: user settings)
└── Results.tsx                (alternative results page)
```

---

## 💾 DATABASE TABLES (Key Tables)

```sql
user_accounts          ← Users (email, password_hash, role_id)
roles                  ← System roles (USER, ADMIN, SUPERADMIN, etc.)
organizations          ← Organizations (name, type, code)
org_members           ← Org membership (user_id, org_id, role_name)
elections             ← Elections (election_id, status=DRAFT|OPEN|CLOSED)
election_races        ← Races per election (race_id, max_votes_per_voter)
candidates            ← Candidate records (full_name, bio, photo_url)
candidate_races       ← Candidate assignments to races
voters                ← Voter registrations (status=PENDING|APPROVED)
votes                 ← Actual votes cast (election_id, race_id, candidate_id)
race_results          ← Live vote counts (candidate_id → total_votes)
organization_invites  ← Invite tokens (status=PENDING|ACCEPTED)
organization_requests ← Org creation requests (status=PENDING|APPROVED|REJECTED)
audit_logs            ← All audit trail entries (action_type, entity_name, details_json)
```

---

## 🔐 ROLE-BASED FEATURES MATRIX

|  | USER | MEMBER | ADMIN | OWNER | SUPERADMIN |
|--|------|--------|-------|-------|-----------|
| **Create Account** | ✅ | - | - | - | - |
| **Login** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Request Organization** | ✅ | ✅ | - | - | - |
| **Create Organization** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Approve Org Request** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Create Election** | ❌ | ❌ | ✅ | ✅ | - |
| **Manage Races** | ❌ | ❌ | ✅ | ✅ | - |
| **Invite Members** | ❌ | ❌ | ✅ | ✅ | - |
| **Approve Voters** | ❌ | ❌ | ✅ | ✅ | - |
| **Register as Voter** | ✅ | ✅ | ❌ | ❌ | - |
| **Cast Vote** | ✅ (if registered) | ✅ (if registered) | ❌ | ❌ | - |
| **View Results** | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 🎯 USER JOURNEY EXAMPLES

### Journey 1: Regular User Voting
```
1. Register (Register.tsx) 
   → POST /auth/register 
   → sp_register_user()

2. Login (Login.tsx) 
   → POST /auth/login 
   → Gets JWT tokens

3. Request to join Organization (Organizations.tsx) 
   → Filled form 
   → POST /admin/org-requests 
   → sp_submit_org_request()

4. [Wait for admin approval]

5. [Or] Accept Organization Invite (InvitePage.tsx) 
   → POST /orgs/join 
   → sp_accept_invite() 
   → 🔴 Auto-creates voter!

6. View Open Elections (VoterDashboard.tsx) 
   → GET /elections?org_id=1

7. Cast Vote (VoterPortal.tsx) 
   → POST /voting/cast 
   → 3 triggers fire (validate, audit, update results)

8. View Results (ResultsDashboard.tsx) 
   → GET /voting/results 
   → Auto-refreshes every 10 seconds
```

### Journey 2: Organizer Managing Elections
```
1. Login as OWNER/ADMIN

2. Create Election (Elections.tsx) 
   → POST /elections 
   → sp_create_election()

3. Add Races (ElectionDetails.tsx) 
   → POST /races 
   → sp_create_race()

4. Add Candidates with Photos (ElectionDetails.tsx) 
   → POST /races/:id/candidates 
   → sp_add_candidate_to_race()

5. Schedule Election (ElectionDetails.tsx) 
   → POST /elections/:id/schedule

6. Open Election (Elections.tsx) 
   → POST /elections/:id/open 
   → Status changes to OPEN → voters can now vote

7. Monitor Results (ElectionDetails.tsx or ResultsDashboard.tsx) 
   → GET /voting/results 
   → Live updating via triggers

8. Close Election (Elections.tsx) 
   → POST /elections/:id/close 
   → Status changes to CLOSED → no more voting

9. View Final Results (ResultsDashboard.tsx)
```

### Journey 3: Super Admin Managing Organization Requests
```
1. Login as SUPERADMIN

2. View Organization Requests (SuperAdminDashboard.tsx) 
   → GET /admin/org-requests

3. Review Request Details (Card display)

4. Approve Request (SuperAdminDashboard.tsx) 
   → POST /admin/org-requests/:id/approve 
   → sp_approve_org_request() 
   → Creates organization 
   → Requester becomes OWNER

5. [Or] Reject Request (SuperAdminDashboard.tsx) 
   → POST /admin/org-requests/:id/reject

6. Organization appears in browse (Organizations.tsx) 
   → GET /orgs/all
```

---

## 🚀 DEPLOYMENT OVERVIEW

**Frontend:** React + TypeScript, deployed to static host (Vite)  
**Backend:** Express.js + Node.js, running on port 4000  
**Database:** PostgreSQL with 65+ stored procedures, 7 triggers  
**Email:** Optional email service for invitations  
**Storage:** Multer for file uploads (photos, proof documents)  

---

## 📝 FOR YOUR TEACHER

**Key Points to Emphasize:**

1. ✅ **Complete CRUD** - Create, Read, Update, Delete for all entities
2. ✅ **Multi-role System** - Different dashboards for different roles
3. ✅ **Voting Validation** - Election must be OPEN, voter must be APPROVED, etc.
4. ✅ **Real-time Results** - Automatic vote count updates via database triggers
5. ✅ **Audit Trail** - Every action logged to audit_logs table
6. ✅ **CSV Bulk Upload** - Process hundreds of invitations at once
7. ✅ **Token-based Invites** - Secure invitation links with expiration
8. ✅ **Permission Layers** - Frontend, Backend, and Database-level authorization
9. ✅ **Triggers as Business Logic** - Validation, logging, and calculations via database triggers
10. ✅ **Responsive UI** - Mobile-friendly interface with React components

---

This guide should help you quickly locate any feature your teacher asks about! 🎯
