# Database Triggers - Implementation & Flow Guide

## Overview
Your system has **7 database triggers** that automatically execute when specific table events occur. These triggers handle:
- **Auditing** (logging changes)
- **Validation** (enforcing business rules)
- **Auto-registration** (automatic voter creation)
- **Results calculation** (live vote counting)

---

## Trigger #1: `audit_votes` - Vote Change Logging

### Trigger Definition
```sql
CREATE TRIGGER audit_votes 
AFTER INSERT OR DELETE OR UPDATE ON votes 
FOR EACH ROW EXECUTE FUNCTION trg_audit_generic();
```

### What it does
- Automatically logs **every vote action** to the `audit_logs` table
- Captures old and new values
- Stores request ID, user ID, and action type

### When it fires
1. **User casts a vote** → INSERT into votes → **Trigger fires** → Creates audit log
2. **Vote is deleted/modified** → UPDATE/DELETE votes → **Trigger fires** → Creates audit log

### Backend Route Flow
```
Frontend (VoterPortal.tsx)
  ↓ User clicks "Cast Vote" button
POST /voting/cast
  ↓ Route Handler (voting.ts)
  └─ Calls sp_cast_vote($1, $2, $3, $4)
     ↓ Database Procedure
     └─ INSERT INTO votes (...)
        ↓
        🔴 TRIGGER FIRES: audit_votes
        └─ audit_generic() inserts into audit_logs
```

### Frontend Component
[apps/web/src/pages/VoterPortal.tsx](../election-system/apps/web/src/pages/VoterPortal.tsx) - Vote casting UI

### Related Files
- Backend: [apps/api/src/routes/voting.ts](../election-system/apps/api/src/routes/voting.ts) - Line 137-194
- Database: [db/DATABASE/functions/voting/sp_cast_vote.sql](../election-system/db/DATABASE/functions/voting/sp_cast_vote.sql)
- Trigger Function: [db/DATABASE/functions/triggers/trg_audit_generic.sql](../election-system/db/DATABASE/functions/triggers/trg_audit_generic.sql)

---

## Trigger #2: `trg_enforce_vote_rules` - Vote Validation

### Trigger Definition
```sql
CREATE TRIGGER trg_enforce_vote_rules 
BEFORE INSERT ON votes 
FOR EACH ROW EXECUTE FUNCTION enforce_vote_rules();
```

### What it does
**BEFORE inserting any vote**, validates:
1. ✅ Race exists
2. ✅ Election is in OPEN status
3. ✅ Voting window is active (now() between start_datetime and end_datetime)
4. ✅ Voter is APPROVED
5. ✅ Voter and election belong to same organization
6. ✅ Voter's type (USER, OFFICIAL, etc.) is eligible for this election
7. ✅ Candidate exists and is running in this race
8. ✅ Max votes per voter not exceeded

### When it fires
**BEFORE any vote INSERT** → Trigger validates → If valid, INSERT proceeds; if invalid, vote is REJECTED

### Backend Route Flow
```
Frontend (VoterPortal.tsx)
  ↓ User clicks "Vote" button
POST /voting/cast
  ↓ Route Handler (voting.ts)
  └─ Calls sp_cast_vote($1, $2, $3, $4)
     ↓ Database Procedure
     └─ Attempts INSERT INTO votes (...)
        ↓
        🔴 TRIGGER FIRES (BEFORE): trg_enforce_vote_rules
        └─ enforce_vote_rules() validates
           ├─ If invalid → EXCEPTION raised ❌
           └─ If valid → INSERT proceeds ✅
           ↓
           🔴 TRIGGER FIRES (AFTER): audit_votes
```

### Error Handling
If validation fails, backend receives exception with status 400/403:
```json
{
  "ok": false,
  "error": "Election is not OPEN (status=DRAFT)"
}
```

### Related Files
- Trigger Function: [db/DATABASE/functions/voting/enforce_vote_rules.sql](../election-system/db/DATABASE/functions/voting/enforce_vote_rules.sql)
- Backend Handler: [apps/api/src/routes/voting.ts](../election-system/apps/api/src/routes/voting.ts) Line 137-194

---

## Trigger #3: `trg_votes_to_results` - Live Results Calculation

### Trigger Definition
```sql
CREATE TRIGGER trg_votes_to_results 
AFTER INSERT OR DELETE OR UPDATE ON votes 
FOR EACH ROW EXECUTE FUNCTION trg_votes_to_results();
```

### What it does
**AFTER vote changes**, automatically updates `race_results` table:
- When vote is **INSERTED**: Increments candidate's vote count (+1)
- When vote is **DELETED**: Decrements candidate's vote count (-1)
- When vote is **UPDATED**: Adjusts counts if validity changed

This provides **live, real-time results** without manual calculation.

### When it fires
```
User casts vote
  ↓
INSERT INTO votes (...)
  ↓
🔴 TRIGGER FIRES: trg_enforce_vote_rules (BEFORE)
  ↓ (validates)
INSERT succeeds
  ↓
🔴 TRIGGER FIRES: audit_votes (AFTER)
  ↓
🔴 TRIGGER FIRES: trg_votes_to_results (AFTER)
  └─ UPSERT INTO race_results
     ├─ INSERT if first vote for candidate
     └─ UPDATE total_votes = total_votes + 1
```

### Database Execution
```sql
-- Function called by trigger:
SELECT race_results_apply_vote_delta(
  NEW.race_id,
  NEW.candidate_race_id,
  1  -- +1 for new vote, -1 for deleted
);

-- Internally does:
INSERT INTO race_results(race_id, candidate_race_id, total_votes)
VALUES ($1, $2, $3)
ON CONFLICT (race_id, candidate_race_id) 
DO UPDATE SET total_votes = total_votes + delta;
```

### Frontend Result Display
[apps/web/src/pages/ResultsDashboard.tsx](../election-system/apps/web/src/pages/ResultsDashboard.tsx)
- Fetches from `GET /voting/results?election_id=1&race_id=1`
- Shows live vote counts

### Related Files
- Trigger Function: [db/DATABASE/functions/triggers/trg_votes_to_results.sql](../election-system/db/DATABASE/functions/triggers/trg_votes_to_results.sql)
- Helper Function: [db/DATABASE/functions/voting/race_results_apply_vote_delta.sql](../election-system/db/DATABASE/functions/voting/race_results_apply_vote_delta.sql)

---

## Trigger #4: `audit_elections` - Election Change Logging

### Trigger Definition
```sql
CREATE TRIGGER audit_elections 
AFTER INSERT OR DELETE OR UPDATE ON elections 
FOR EACH ROW EXECUTE FUNCTION trg_audit_generic();
```

### What it does
Logs **all election operations** to `audit_logs`:
- Election created
- Election details updated
- Election status changed (DRAFT → OPEN → CLOSED)

### When it fires

| Action | Backend Route | Frontend | Trigger fires |
|--------|---------------|----------|--------------|
| Create election | `POST /elections` | Elections.tsx form submit | INSERT → SELECT sp_create_election() → INSERT elections → 🔴 audit_elections |
| Update election | `PUT /elections/:id` | ElectionDetails.tsx form | UPDATE elections → 🔴 audit_elections |
| Open election | `POST /elections/:id/open` | Elections.tsx "Open" button | UPDATE elections (status→OPEN) → 🔴 audit_elections |
| Close election | `POST /elections/:id/close` | Elections.tsx "Close" button | UPDATE elections (status→CLOSED) → 🔴 audit_elections |

### Example Flow - Creating an Election

```
Frontend (Elections.tsx)
  ↓ User submits "Create Election" form
POST /elections
  Body: {
    organization_id: 1,
    election_name: "Student Elections 2024",
    description: "..."
  }
  ↓ authMiddleware checks JWT
  ↓ Route handler (elections.ts line 24)
  └─ Calls: sp_create_election($1, $2, $3, $4)
     ↓ Database procedure (sp_create_election.sql)
     ├─ Validates user is OWNER/ADMIN
     ├─ INSERT INTO elections (...)
     │  status = 'DRAFT'
     │  ↓
     │  🔴 TRIGGER FIRES: audit_elections
     │  └─ INSERT INTO audit_logs (
     │       action_type: 'INSERT',
     │       entity_name: 'elections',
     │       details_json: {election_name, description}
     │     )
     │
     ├─ INSERT INTO election_eligible_member_types (...)
     │  ↓ (no trigger)
     │
     └─ Procedure returns election_id
  ↓ Backend returns 201 with election_id
  ↓ Frontend toast: "Election created!"
  ↓ Modal closes, election list reloads
```

### Related Files
- Backend Route: [apps/api/src/routes/elections.ts](../election-system/apps/api/src/routes/elections.ts#L24)
- Frontend: [apps/web/src/pages/Elections.tsx](../election-system/apps/web/src/pages/Elections.tsx#L48)
- Database: [db/DATABASE/functions/election/sp_create_election.sql](../election-system/db/DATABASE/functions/election/sp_create_election.sql)

---

## Trigger #5: `audit_voters` - Voter Change Logging

### Trigger Definition
```sql
CREATE TRIGGER audit_voters 
AFTER INSERT OR DELETE OR UPDATE ON voters 
FOR EACH ROW EXECUTE FUNCTION trg_audit_generic();
```

### What it does
Logs **voter-related actions**:
- Voter registration submitted
- Voter approval status changed

### When it fires

| Action | Backend Route | Frontend | Flow |
|--------|---------------|----------|------|
| Register voter | `POST /voting/register` | VoterDashboard.tsx "Register" button | INSERT voters → 🔴 audit_voters |
| Approve voter | `POST /voting/approve` | Voter approval UI | UPDATE voters (status→APPROVED) → 🔴 audit_voters |

### Example Flow - Voter Registration

```
Frontend (VoterDashboard.tsx)
  ↓ User clicks "Register as Voter"
POST /voting/register
  Body: { organization_id: 1 }
  ↓ Route: voting.ts line 24
  └─ Calls: sp_register_voter($1, $2)
     ↓ Database
     └─ INSERT INTO voters (
          organization_id, user_id,
          status: 'PENDING',
          voter_type: 'USER'
        )
        ↓
        🔴 TRIGGER FIRES: audit_voters
        └─ INSERT INTO audit_logs (
             action_type: 'INSERT',
             entity_name: 'voters'
           )
  ↓ Backend returns 201
  ↓ Frontend: "Registration submitted for approval"
```

### Related Files
- Backend: [apps/api/src/routes/voting.ts](../election-system/apps/api/src/routes/voting.ts#L24)
- Stored Procedure: [db/DATABASE/functions/voting/sp_register_voter.sql](../election-system/db/DATABASE/functions/voting/sp_register_voter.sql)

---

## Trigger #6: `audit_candidate_races` - Candidate Assignment Logging

### Trigger Definition
```sql
CREATE TRIGGER audit_candidate_races 
AFTER INSERT OR DELETE OR UPDATE ON candidate_races 
FOR EACH ROW EXECUTE FUNCTION trg_audit_generic();
```

### What it does
Logs **all candidate race assignments**:
- Candidate added to race
- Candidate details updated
- Candidate removed from race

### When it fires

| Action | Backend Route | Frontend | Trigger |
|--------|---------------|----------|---------|
| Add candidate | `POST /races/:raceId/candidates` | ElectionDetails.tsx form | INSERT candidate_races → 🔴 audit_candidate_races |
| Update candidate | `PUT /races/:raceId/candidates/:candidateId` | ElectionDetails.tsx edit | UPDATE candidate_races → 🔴 audit_candidate_races |
| Remove candidate | `DELETE /races/:raceId/candidates/:candidateId` | ElectionDetails.tsx delete | DELETE candidate_races → 🔴 audit_candidate_races |

### Example Flow - Adding a Candidate

```
Frontend (ElectionDetails.tsx)
  ↓ User submits "Add Candidate" form
POST /races/:raceId/candidates
  FormData: {
    full_name, affiliation, bio,
    manifesto, photo (file)
  }
  ↓ Route: races.ts line 251
  └─ Calls: sp_add_candidate_to_race($1, $2, $3, $4, $5, $6, $7, $8)
     ↓ Database
     ├─ INSERT INTO candidates (full_name, ...)
     └─ INSERT INTO candidate_races (race_id, candidate_id, ...)
        ↓
        🔴 TRIGGER FIRES: audit_candidate_races
        └─ INSERT INTO audit_logs (
             entity_name: 'candidate_races',
             details_json: {full_name, affiliation, ...}
           )
  ↓ Returns candidate_id
  ↓ Frontend: Toast "Candidate added"
```

### Related Files
- Backend: [apps/api/src/routes/races.ts](../election-system/apps/api/src/routes/races.ts#L251)
- Database: [db/DATABASE/functions/race/sp_add_candidate_to_race.sql](../election-system/db/DATABASE/functions/race/sp_add_candidate_to_race.sql)

---

## Trigger #7: `trg_org_members_auto_voter` - Automatic Voter Registration

### Trigger Definition
```sql
CREATE TRIGGER trg_org_members_auto_voter 
AFTER INSERT OR UPDATE OF is_active ON org_members 
FOR EACH ROW EXECUTE FUNCTION tg_auto_register_voter();
```

### What it does
**Automatically creates voters** when org members are added/activated:
1. Skips OWNER and ADMIN members
2. Inserts member into `org_member_master` (idempotent)
3. Creates voter record with **APPROVED status** (no admin approval needed!)
4. Voter is immediately eligible to vote

### When it fires

| Scenario | Backend Route | Trigger fires |
|----------|---------------|---------------|
| User accepts organization invite | `POST /invites/accept` or stored proc | INSERT/UPDATE org_members → 🔴 trg_org_members_auto_voter |
| Admin adds member to organization | `POST /orgs/:orgId/members` | INSERT org_members → 🔴 trg_org_members_auto_voter |
| Member is reactivated | Direct UPDATE org_members (is_active=true) | UPDATE org_members → 🔴 trg_org_members_auto_voter |

### Example Flow - User Accepts Invite

```
Frontend (InvitePage.tsx)
  ↓ User clicks "Accept Invite" button
POST /invitations/accept
  Body: { invite_token }
  ↓ Route: invitations.ts line 303
  └─ Calls: sp_accept_invite($1, $2)
     ↓ Database Procedure
     ├─ Validates invite
     ├─ INSERT INTO org_members (
     │    organization_id, user_id,
     │    role_name, is_active: true
     │  )
     │  ↓
     │  🔴 TRIGGER FIRES: trg_org_members_auto_voter
     │  └─ tg_auto_register_voter() executes:
     │     ├─ IF role NOT IN ('OWNER','ADMIN')
     │     ├─ INSERT INTO org_member_master (...)
     │     └─ INSERT INTO voters (
     │          status: 'APPROVED',
     │          is_approved: true
     │        ) ← ALREADY APPROVED! No admin needed
     │
     └─ UPDATE organization_invites (status: 'ACCEPTED')
  ↓ Returns success
  ↓ Frontend redirects to dashboard
  ↓ User is now member AND approved voter!
```

### Special Behavior
- **Automatic Approval**: Unlike voter registration (which needs approval), members added via invite are **immediately approved**
- **Idempotent**: Multiple trigger fires won't duplicate records (uses ON CONFLICT)
- **OWNER/ADMIN Skip**: Organization owners and admins are NOT auto-registered as voters

### Related Files
- Trigger Function: [db/DATABASE/functions/triggers/tg_auto_register_voter.sql](../election-system/db/DATABASE/functions/triggers/tg_auto_register_voter.sql)
- Backend Invite Accept: [apps/api/src/routes/invitations.ts](../election-system/apps/api/src/routes/invitations.ts#L303)
- Frontend: [apps/web/src/pages/InvitePage.tsx](../election-system/apps/web/src/pages/InvitePage.tsx)

---

## Trigger Execution Order

When a user **votes in an election**, triggers fire in this sequence:

```
POST /voting/cast
↓
1️⃣ BEFORE INSERT ON votes
   └─ trg_enforce_vote_rules fires ← VALIDATES
   
If validation PASSES:
↓
2️⃣ INSERT INTO votes succeeds
↓
3️⃣ AFTER INSERT ON votes
   ├─ audit_votes fires ← LOGS THE ACTION
   └─ trg_votes_to_results fires ← UPDATES RESULTS
   
Result: Vote recorded, logged, and results updated - ALL IN ONE ATOMIC TRANSACTION
```

---

## Audit Log Structure

All triggers write to `audit_logs` table with this structure:

```sql
CREATE TABLE audit_logs (
  audit_id BIGSERIAL PRIMARY KEY,
  organization_id BIGINT,
  user_id BIGINT,
  action_type VARCHAR(50),        -- 'INSERT', 'UPDATE', 'DELETE'
  entity_name VARCHAR(50),        -- 'votes', 'elections', 'voters', etc.
  entity_id BIGINT,               -- The vote_id, election_id, etc.
  details_json JSONB,             -- {old, new, request_id}
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Example entry for vote cast:
```json
{
  "audit_id": 12345,
  "organization_id": 1,
  "user_id": 42,
  "action_type": "INSERT",
  "entity_name": "votes",
  "entity_id": 999,
  "details_json": {
    "request_id": "req-123-abc",
    "new": {
      "vote_id": 999,
      "voter_id": 10,
      "candidate_race_id": 5,
      "is_valid": true,
      "created_at": "2026-03-13T10:30:00Z"
    },
    "old": null
  },
  "created_at": "2026-03-13T10:30:00.123Z"
}
```

---

## Presentation Summary

### Key Points for Your Teacher

1. **7 Total Triggers** - Audit logs, validation, auto-registration, results
2. **3 Audit Triggers** - Log votes, elections, voters, candidates (audit_votes, audit_elections, audit_voters, audit_candidate_races)
3. **1 Validation Trigger** - `trg_enforce_vote_rules` checks election is OPEN, voter approved, candidate in race
4. **1 Calculation Trigger** - `trg_votes_to_results` updates live results
5. **1 Auto-Registration Trigger** - `trg_org_members_auto_voter` creates approved voters when people join

### Backend Implementation
- All database changes go through **stored procedures** (sp_*)
- Routes in [apps/api/src/routes/](../election-system/apps/api/src/routes/) call these procedures
- Triggers fire automatically when procedures modify data

### Frontend → Backend → Trigger Chain
```
Frontend Component (Elections.tsx, VoterPortal.tsx, etc.)
  ↓ User action (click button, submit form)
  ↓ API call (electionsApi.create(), votingApi.castVote(), etc.)
  ↓ Redux/Zustand updates state
  ↓ POST/PUT/DELETE to /api/elections, /api/voting, etc.
  ↓ Vite proxy forwards to localhost:4000
  ↓ Express route handler
  ↓ Calls stored procedure
  ↓ Procedure INSERTs/UPDATEs/DELETEs table
  ↓ 🔴 TRIGGER FIRES AUTOMATICALLY
  ↓ Audit logs, validation, or results update
  ↓ Return success/error to frontend
  ↓ UI updates
```

---

## File Organization

```
election-system/
├── apps/
│   ├── api/src/routes/
│   │   ├── elections.ts       ← Create/update/open/close elections
│   │   ├── voting.ts          ← Register/approve voters, cast votes
│   │   ├── races.ts           ← Create races, add candidates
│   │   └── invitations.ts     ← Accept invites (triggers voter creation)
│   │
│   └── web/src/
│       ├── pages/
│       │   ├── Elections.tsx         ← Create/open/close elections UI
│       │   ├── VoterPortal.tsx       ← Vote casting UI
│       │   ├── ElectionDetails.tsx   ← Add/manage candidates
│       │   ├── VoterDashboard.tsx    ← Register as voter
│       │   ├── ResultsDashboard.tsx  ← View live results
│       │   └── InvitePage.tsx        ← Accept organization invite
│       │
│       └── lib/api.ts         ← API calls (electionsApi, votingApi, etc.)
│
└── db/DATABASE/
    ├── triggers/
    │   ├── audit_votes.sql
    │   ├── audit_elections.sql
    │   ├── audit_voters.sql
    │   ├── audit_candidate_races.sql
    │   ├── trg_enforce_vote_rules.sql
    │   ├── trg_org_members_auto_voter.sql
    │   └── trg_votes_to_results.sql
    │
    └── functions/
        ├── triggers/
        │   ├── trg_audit_generic.sql     ← Handles all audit logging
        │   ├── tg_auto_register_voter.sql
        │   └── trg_votes_to_results.sql
        │
        ├── voting/
        │   ├── sp_cast_vote.sql
        │   ├── sp_register_voter.sql
        │   ├── sp_approve_voter.sql
        │   ├── enforce_vote_rules.sql
        │   └── race_results_apply_vote_delta.sql
        │
        └── election/
            ├── sp_create_election.sql
            ├── sp_update_election.sql
            ├── sp_open_election.sql
            └── sp_close_election.sql
```

---

## Testing Triggers

To verify triggers are working:

1. **Cast a vote** - Check `audit_logs` for new entry with action_type='INSERT'
2. **Check results** - Verify `race_results.total_votes` incremented
3. **Accept invite** - Check `voters` table has APPROVED entry for that user
4. **Create election** - Check `audit_logs` has ELECTION_CREATE entry

Database query to verify:
```sql
SELECT * FROM audit_logs 
WHERE entity_name = 'votes' 
ORDER BY created_at DESC 
LIMIT 5;
```

