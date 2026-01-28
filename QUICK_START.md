# Quick Start Guide - Phase 4 & 5

## 🚀 Getting Started in 5 Minutes

This guide will help you quickly test the new Phase 4 and Phase 5 features.

---

## Prerequisites

✅ Server is running on `http://localhost:4000`
✅ Database migrations applied
✅ You have a user account and JWT token

---

## Step 1: Get Your Token

### Register a new user:
```bash
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Response**:
```json
{
  "ok": true,
  "user_id": 1,
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Save your token**: Copy the `accessToken` value!

---

## Step 2: Create an Organization

```bash
curl -X POST http://localhost:4000/orgs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "organization_name": "Test University",
    "organization_type": "UNIVERSITY",
    "organization_code": "TEST_UNI"
  }'
```

**Response**:
```json
{
  "ok": true,
  "organization_id": 1,
  "organization_name": "Test University",
  "organization_type": "UNIVERSITY",
  "organization_code": "TEST_UNI"
}
```

---

## Step 3: Create an Election

```bash
curl -X POST http://localhost:4000/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "organization_id": 1,
    "election_name": "Student Council 2024",
    "description": "Annual student council election"
  }'
```

**Response**:
```json
{
  "ok": true,
  "election_id": 1,
  "election_name": "Student Council 2024",
  "organization_id": 1
}
```

---

## Step 4: Add Races and Candidates (Direct DB)

Since race/candidate management endpoints aren't built yet, use SQL:

```sql
-- Connect to your database
psql -U election_user -d election_db

-- Add a race
INSERT INTO election_races (election_id, race_name, description, max_votes_per_voter)
VALUES (1, 'President', 'Student Council President', 1);

-- Add candidates
INSERT INTO candidates (full_name, affiliation_name, bio, is_approved)
VALUES 
  ('Alice Johnson', 'Independent', 'Experienced leader', true),
  ('Bob Smith', 'Progressive Party', 'Fresh ideas', true);

-- Link candidates to race
INSERT INTO candidate_races (race_id, candidate_id, ballot_order)
VALUES 
  (1, 1, 1),
  (1, 2, 2);
```

---

## Step 5: Register as Voter

```bash
curl -X POST http://localhost:4000/voting/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "organization_id": 1
  }'
```

**Response**:
```json
{
  "ok": true,
  "message": "Voter registration submitted for approval"
}
```

---

## Step 6: Approve Yourself as Voter

Since you're the OWNER (created the org), you can approve yourself:

```bash
curl -X POST http://localhost:4000/voting/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "organization_id": 1,
    "user_id": 1
  }'
```

**Response**:
```json
{
  "ok": true,
  "message": "Voter approved successfully"
}
```

---

## Step 7: Check Voter Status

```bash
curl -X GET "http://localhost:4000/voting/status?organization_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response**:
```json
{
  "ok": true,
  "registered": true,
  "voter": {
    "voter_id": 1,
    "is_approved": true,
    "status": "APPROVED",
    "approved_by": 1,
    "approved_at": "2024-01-28T12:00:00Z",
    "registered_at": "2024-01-28T11:55:00Z"
  }
}
```

---

## Step 8: Open the Election

```bash
curl -X POST http://localhost:4000/elections/1/open \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response**:
```json
{
  "ok": true,
  "message": "Election opened successfully"
}
```

---

## Step 9: Cast Your Vote

```bash
curl -X POST http://localhost:4000/voting/cast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -d '{
    "election_id": 1,
    "race_id": 1,
    "candidate_id": 1
  }'
```

**Response**:
```json
{
  "ok": true,
  "vote_id": 1,
  "message": "Vote cast successfully"
}
```

---

## Step 10: View Results

```bash
curl -X GET "http://localhost:4000/voting/results?election_id=1&race_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response**:
```json
{
  "ok": true,
  "election_id": 1,
  "race_id": 1,
  "race_name": "President",
  "election_status": "OPEN",
  "results": [
    {
      "candidate_id": 1,
      "display_name": "Alice Johnson",
      "vote_count": 1
    },
    {
      "candidate_id": 2,
      "display_name": "Bob Smith",
      "vote_count": 0
    }
  ]
}
```

---

## Step 11: Close the Election

```bash
curl -X POST http://localhost:4000/elections/1/close \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Response**:
```json
{
  "ok": true,
  "message": "Election closed successfully"
}
```

---

## 🎉 Congratulations!

You've successfully:
- ✅ Created an organization
- ✅ Created an election
- ✅ Registered and approved a voter
- ✅ Opened an election
- ✅ Cast a vote
- ✅ Viewed results
- ✅ Closed an election

---

## Common Issues & Solutions

### Issue: "Not authorized to create elections"
**Solution**: Make sure you're using the token of the user who created the organization (OWNER role).

### Issue: "Cannot open election in current state"
**Solution**: 
1. Make sure election has at least 1 race
2. Make sure each race has at least 1 approved candidate
3. Election must be in DRAFT status

### Issue: "Already voted in this race"
**Solution**: Each voter can only vote once per race. This is by design.

### Issue: "Voter not approved for this organization"
**Solution**: Admin must approve voter first using `/voting/approve` endpoint.

---

## Testing with Multiple Users

### Create a second user:
```bash
# Register second user
curl -X POST http://localhost:4000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "voter2",
    "email": "voter2@example.com",
    "password": "password123"
  }'

# Add them to your org (as OWNER)
curl -X POST http://localhost:4000/orgs/1/members \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{
    "user_id": 2,
    "role_name": "MEMBER"
  }'

# Second user registers as voter
curl -X POST http://localhost:4000/voting/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTER2_TOKEN" \
  -d '{"organization_id": 1}'

# You (OWNER) approve them
curl -X POST http://localhost:4000/voting/approve \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer OWNER_TOKEN" \
  -d '{
    "organization_id": 1,
    "user_id": 2
  }'

# They vote
curl -X POST http://localhost:4000/voting/cast \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTER2_TOKEN" \
  -d '{
    "election_id": 1,
    "race_id": 1,
    "candidate_id": 2
  }'
```

---

## Useful Queries

### Check all elections:
```bash
curl -X GET "http://localhost:4000/elections?organization_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Check pending voters:
```bash
curl -X GET "http://localhost:4000/voting/pending?organization_id=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Get election details:
```bash
curl -X GET "http://localhost:4000/elections/1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Next Steps

1. **Read Full Documentation**: See `PHASE_4_5_API_DOCS.md`
2. **Review Procedures**: See `STORED_PROCEDURES_REFERENCE.md`
3. **Check Implementation**: See `IMPLEMENTATION_SUMMARY.md`
4. **Build Frontend**: Use these APIs to build a web interface
5. **Add Features**: Implement race/candidate management endpoints

---

## Environment Variables

Make sure your `.env` file has:
```env
DATABASE_URL=postgresql://election_user:election123@localhost:5432/election_db
PORT=4000
JWT_SECRET=your_super_secret_key_at_least_32_chars_long_12345678
JWT_REFRESH_SECRET=your_refresh_secret_key_at_least_32_chars_long_987654321
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
```

---

## Server Commands

```bash
# Start server
npm run dev:api

# Run migrations
npm run migrate

# Stop server
Ctrl+C
```

---

**Happy Testing! 🎉**

For questions or issues, check the error messages - they're designed to be helpful!
