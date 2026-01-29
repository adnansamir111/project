# Stored Procedures Reference Guide

## Phase 4 & 5 Database Procedures

This document provides a quick reference for all stored procedures added in Phase 4 and Phase 5.

---

## Helper Functions

### `is_org_admin(p_user_id BIGINT, p_organization_id BIGINT) RETURNS BOOLEAN`

**Purpose**: Check if a user is OWNER or ADMIN of an organization

**Parameters**:
- `p_user_id`: User ID to check
- `p_organization_id`: Organization ID

**Returns**: `TRUE` if user is OWNER or ADMIN, `FALSE` otherwise

**Usage**:
```sql
SELECT is_org_admin(1, 1);
```

---

## Phase 4: Election Management Procedures

### 1. `sp_create_election()`

**Signature**:
```sql
sp_create_election(
  p_organization_id BIGINT,
  p_election_name TEXT,
  p_description TEXT,
  p_created_by_user_id BIGINT
) RETURNS BIGINT
```

**Purpose**: Create a new election in DRAFT status

**Authorization**: User must be OWNER or ADMIN of the organization

**Returns**: `election_id` of the newly created election

**Audit Log**: Creates `ELECTION_CREATE` entry

**Example**:
```sql
SELECT sp_create_election(
  1,                              -- organization_id
  'Student Council Election 2024', -- election_name
  'Annual student council election', -- description
  1                               -- created_by_user_id
);
-- Returns: 1 (election_id)
```

**Errors**:
- `28000`: Not authorized (user is not OWNER/ADMIN)

---

### 2. `sp_update_election()`

**Signature**:
```sql
sp_update_election(
  p_election_id BIGINT,
  p_election_name TEXT,
  p_description TEXT,
  p_start_at TIMESTAMPTZ,
  p_end_at TIMESTAMPTZ,
  p_updated_by BIGINT
) RETURNS VOID
```

**Purpose**: Update election details (DRAFT status only)

**Authorization**: User must be OWNER or ADMIN of the organization

**Validation**:
- Election must exist
- Election must be in DRAFT status
- If both dates provided, end_at must be after start_at

**Audit Log**: Creates `ELECTION_UPDATE` entry

**Example**:
```sql
SELECT sp_update_election(
  1,                              -- election_id
  'Updated Election Name',        -- election_name
  'Updated description',          -- description
  '2024-02-01 09:00:00+00',      -- start_at
  '2024-02-07 17:00:00+00',      -- end_at
  1                               -- updated_by
);
```

**Errors**:
- `28000`: Not authorized
- `22023`: Election not found, not in DRAFT status, or invalid dates

---

### 3. `sp_open_election()`

**Signature**:
```sql
sp_open_election(
  p_election_id BIGINT,
  p_opened_by BIGINT
) RETURNS VOID
```

**Purpose**: Open election for voting

**Authorization**: User must be OWNER or ADMIN of the organization

**Validation**:
- Election must exist
- Election must be in DRAFT status
- Must have at least 1 race
- Each race must have at least 1 approved candidate

**Side Effects**:
- Sets status to 'OPEN'
- Sets start_datetime to now() if NULL

**Audit Log**: Creates `ELECTION_OPEN` entry

**Example**:
```sql
SELECT sp_open_election(1, 1);
```

**Errors**:
- `28000`: Not authorized
- `22023`: Election not found, wrong status, no races, or no approved candidates

---

### 4. `sp_close_election()`

**Signature**:
```sql
sp_close_election(
  p_election_id BIGINT,
  p_closed_by BIGINT
) RETURNS VOID
```

**Purpose**: Close election (stop accepting votes)

**Authorization**: User must be OWNER or ADMIN of the organization

**Validation**:
- Election must exist
- Election must be in OPEN status

**Side Effects**:
- Sets status to 'CLOSED'
- Sets end_datetime to now() if NULL

**Audit Log**: Creates `ELECTION_CLOSE` entry

**Example**:
```sql
SELECT sp_close_election(1, 1);
```

**Errors**:
- `28000`: Not authorized
- `22023`: Election not found or not in OPEN status

---

### 5. `sp_get_elections_by_org()`

**Signature**:
```sql
sp_get_elections_by_org(p_organization_id BIGINT)
RETURNS TABLE (
  election_id BIGINT,
  election_name VARCHAR(200),
  description TEXT,
  start_datetime TIMESTAMPTZ,
  end_datetime TIMESTAMPTZ,
  status election_status,
  created_at TIMESTAMPTZ,
  created_by BIGINT
)
```

**Purpose**: List all elections for an organization

**Returns**: Table of elections ordered by created_at DESC

**Example**:
```sql
SELECT * FROM sp_get_elections_by_org(1);
```

---

## Phase 5: Voting Procedures

### 1. `sp_register_voter()`

**Signature**:
```sql
sp_register_voter(
  p_organization_id BIGINT,
  p_user_id BIGINT
) RETURNS VOID
```

**Purpose**: Register a user as a voter in an organization

**Validation**:
- User must be an active member in org_members
- Creates voter entry with status 'PENDING' and is_approved = FALSE

**Audit Log**: Creates `VOTER_REGISTER` entry

**Example**:
```sql
SELECT sp_register_voter(1, 5);
```

**Errors**:
- `22023`: User is not an active member of the organization

**Notes**:
- Uses ON CONFLICT DO NOTHING to prevent duplicate registrations
- Attempts to link to org_member_master, falls back to user_id if not found

---

### 2. `sp_approve_voter()`

**Signature**:
```sql
sp_approve_voter(
  p_organization_id BIGINT,
  p_user_id BIGINT,
  p_approved_by BIGINT
) RETURNS VOID
```

**Purpose**: Approve a pending voter registration

**Authorization**: User must be OWNER or ADMIN of the organization

**Validation**:
- Voter registration must exist

**Side Effects**:
- Sets status to 'APPROVED'
- Sets is_approved to TRUE
- Records approved_by and approved_at

**Audit Log**: Creates `VOTER_APPROVE` entry

**Example**:
```sql
SELECT sp_approve_voter(1, 5, 1);
-- Org 1, approve user 5, approved by user 1
```

**Errors**:
- `28000`: Not authorized
- `22023`: Voter registration not found

---

### 3. `sp_cast_vote()`

**Signature**:
```sql
sp_cast_vote(
  p_election_id BIGINT,
  p_race_id BIGINT,
  p_candidate_id BIGINT,
  p_voter_user_id BIGINT
) RETURNS BIGINT
```

**Purpose**: Cast a vote in an election race

**Validation**:
- Election must exist and be OPEN
- Race must belong to election
- Voter must be approved in the organization
- Candidate must be approved and in the race
- Voter must not have already voted in this race

**Returns**: `vote_id` of the cast vote

**Audit Log**: Creates `VOTE_CAST` entry

**Example**:
```sql
SELECT sp_cast_vote(
  1,  -- election_id
  1,  -- race_id
  1,  -- candidate_id
  5   -- voter_user_id
);
-- Returns: 123 (vote_id)
```

**Errors**:
- `22023`: Election not found, not OPEN, race doesn't belong to election, or candidate not found/approved
- `28000`: Voter not approved
- `23505`: Already voted in this race

---

### 4. `sp_get_race_results()`

**Signature**:
```sql
sp_get_race_results(
  p_election_id BIGINT,
  p_race_id BIGINT
)
RETURNS TABLE (
  candidate_id BIGINT,
  display_name VARCHAR(200),
  vote_count BIGINT
)
```

**Purpose**: Get vote counts for all candidates in a race

**Returns**: Table of candidates with vote counts, ordered by vote_count DESC

**Example**:
```sql
SELECT * FROM sp_get_race_results(1, 1);
```

**Result**:
```
candidate_id | display_name | vote_count
-------------|--------------|------------
1            | John Doe     | 150
2            | Jane Smith   | 120
3            | Bob Johnson  | 95
```

**Notes**:
- Includes candidates with 0 votes
- Uses LEFT JOIN to include all candidates
- Results ordered by vote count (highest first)

---

### 5. `sp_get_voter_status()`

**Signature**:
```sql
sp_get_voter_status(
  p_organization_id BIGINT,
  p_user_id BIGINT
)
RETURNS TABLE (
  voter_id BIGINT,
  is_approved BOOLEAN,
  status voter_status,
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ
)
```

**Purpose**: Get voter registration status for a user in an organization

**Returns**: Single row with voter details, or empty if not registered

**Example**:
```sql
SELECT * FROM sp_get_voter_status(1, 5);
```

**Result**:
```
voter_id | is_approved | status   | approved_by | approved_at         | registered_at
---------|-------------|----------|-------------|---------------------|-------------------
5        | true        | APPROVED | 1           | 2024-01-28 12:00:00 | 2024-01-27 10:00:00
```

---

### 6. `sp_list_pending_voters()`

**Signature**:
```sql
sp_list_pending_voters(p_organization_id BIGINT)
RETURNS TABLE (
  voter_id BIGINT,
  user_id BIGINT,
  member_id VARCHAR(80),
  voter_type VARCHAR(50),
  registered_at TIMESTAMPTZ
)
```

**Purpose**: List all pending voter registrations for an organization

**Returns**: Table of pending voters ordered by registered_at ASC

**Example**:
```sql
SELECT * FROM sp_list_pending_voters(1);
```

**Result**:
```
voter_id | user_id | member_id | voter_type | registered_at
---------|---------|-----------|------------|-------------------
6        | 10      | STU12345  | STUDENT    | 2024-01-28 10:00:00
7        | 11      | STU12346  | STUDENT    | 2024-01-28 11:00:00
```

---

## Error Code Reference

| Error Code | Meaning | Common Causes |
|------------|---------|---------------|
| `28000` | Authorization error | User is not OWNER/ADMIN, or voter not approved |
| `22023` | Invalid data | Election not found, wrong status, invalid dates, missing races/candidates |
| `23505` | Duplicate entry | Already voted in race, already registered as voter |

---

## Common Patterns

### Check if user can manage election
```sql
SELECT is_org_admin(user_id, org_id);
```

### Get election with races and results
```sql
-- Get election
SELECT * FROM elections WHERE election_id = 1;

-- Get races
SELECT * FROM election_races WHERE election_id = 1;

-- Get results for each race
SELECT * FROM sp_get_race_results(1, race_id);
```

### Complete voting workflow
```sql
-- 1. Register voter
SELECT sp_register_voter(1, 5);

-- 2. Approve voter (as admin)
SELECT sp_approve_voter(1, 5, 1);

-- 3. Check status
SELECT * FROM sp_get_voter_status(1, 5);

-- 4. Cast vote
SELECT sp_cast_vote(1, 1, 1, 5);

-- 5. View results
SELECT * FROM sp_get_race_results(1, 1);
```

---

## Performance Notes

1. **Indexes**: All foreign keys are indexed for fast lookups
2. **Transactions**: All procedures that modify data should be called within transactions
3. **Results Caching**: Consider caching results for closed elections
4. **Audit Logs**: Audit log table can grow large; consider partitioning by date

---

## Security Considerations

1. **Always validate authorization** before calling procedures
2. **Use transactions** for multi-step operations
3. **Audit logs** track all critical actions
4. **Unique constraints** prevent duplicate votes
5. **Check constraints** ensure data integrity

---

**Last Updated**: January 28, 2024
**Database Version**: PostgreSQL 12+
