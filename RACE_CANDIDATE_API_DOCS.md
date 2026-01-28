# Race & Candidate Management API Documentation

## 🎯 Overview

This document covers the **Race and Candidate Management** endpoints that allow organizers (OWNER/ADMIN) to fully manage elections via API - **no manual SQL required!**

**Base URL**: `http://localhost:4000`

---

## 📋 Complete Election Setup Workflow

### **Automated Election Creation (No SQL Needed!)**

```bash
# 1. Create Election
POST /elections → Get election_id

# 2. Add Races (Positions)
POST /races → Add President race
POST /races → Add Vice President race
POST /races → Add Treasurer race

# 3. Add Candidates to Each Race
POST /races/{race_id}/candidates → Add Alice to President
POST /races/{race_id}/candidates → Add Bob to President
POST /races/{race_id}/candidates → Add Carol to VP

# 4. Open Election
POST /elections/{election_id}/open

# 5. Voters Vote
POST /voting/cast

# 6. Close & View Results
POST /elections/{election_id}/close
GET /voting/results
```

**Everything is now API-driven!** ✅

---

## 🏁 Race Management Endpoints

### 1. Create Race

**Endpoint**: `POST /races`

**Authorization**: OWNER or ADMIN of the organization

**Request Body**:
```json
{
  "election_id": 1,
  "race_name": "President",
  "description": "Student Council President",
  "max_votes_per_voter": 1
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "race_id": 1,
  "race_name": "President",
  "election_id": 1
}
```

**Validation**:
- Election must be in DRAFT status
- User must be OWNER/ADMIN
- `max_votes_per_voter` must be ≥ 1 (default: 1)
- Race name must be unique per election

**cURL Example**:
```bash
curl -X POST http://localhost:4000/races \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "election_id": 1,
    "race_name": "President",
    "description": "Student Council President",
    "max_votes_per_voter": 1
  }'
```

---

### 2. Get All Races for Election

**Endpoint**: `GET /races/election/:electionId`

**Authorization**: Any authenticated user

**Response** (200 OK):
```json
{
  "ok": true,
  "races": [
    {
      "race_id": 1,
      "race_name": "President",
      "description": "Student Council President",
      "max_votes_per_voter": 1,
      "candidate_count": 3
    },
    {
      "race_id": 2,
      "race_name": "Vice President",
      "description": "Student Council VP",
      "max_votes_per_voter": 1,
      "candidate_count": 2
    }
  ]
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:4000/races/election/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 3. Get Race Details with Candidates

**Endpoint**: `GET /races/:raceId`

**Authorization**: Any authenticated user

**Response** (200 OK):
```json
{
  "ok": true,
  "race": {
    "race_id": 1,
    "race_name": "President",
    "description": "Student Council President",
    "max_votes_per_voter": 1,
    "election_id": 1,
    "election_name": "Student Council 2024",
    "organization_id": 1,
    "candidates": [
      {
        "candidate_id": 1,
        "full_name": "Alice Johnson",
        "affiliation_name": "Progressive Party",
        "bio": "Experienced leader with 3 years in student government",
        "manifesto": "I will fight for better campus facilities",
        "is_approved": true,
        "ballot_order": 1,
        "display_name": "Alice Johnson"
      },
      {
        "candidate_id": 2,
        "full_name": "Bob Smith",
        "affiliation_name": "Independent",
        "bio": "Fresh perspective on student issues",
        "manifesto": "Time for change and new ideas",
        "is_approved": true,
        "ballot_order": 2,
        "display_name": "Bob Smith"
      }
    ]
  }
}
```

**cURL Example**:
```bash
curl -X GET http://localhost:4000/races/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Update Race

**Endpoint**: `PUT /races/:raceId`

**Authorization**: OWNER or ADMIN of the organization

**Request Body**:
```json
{
  "race_name": "Updated Race Name",
  "description": "Updated description",
  "max_votes_per_voter": 1
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Race updated successfully"
}
```

**Validation**:
- Election must be in DRAFT status
- User must be OWNER/ADMIN

**cURL Example**:
```bash
curl -X PUT http://localhost:4000/races/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "race_name": "Chief Executive",
    "description": "Updated description",
    "max_votes_per_voter": 1
  }'
```

---

### 5. Delete Race

**Endpoint**: `DELETE /races/:raceId`

**Authorization**: OWNER or ADMIN of the organization

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Race deleted successfully"
}
```

**Validation**:
- Election must be in DRAFT status
- User must be OWNER/ADMIN
- Cascades: Deletes all candidates and votes for this race

**cURL Example**:
```bash
curl -X DELETE http://localhost:4000/races/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 👤 Candidate Management Endpoints

### 1. Add Candidate to Race

**Endpoint**: `POST /races/:raceId/candidates`

**Authorization**: OWNER or ADMIN of the organization

**Request Body**:
```json
{
  "full_name": "Alice Johnson",
  "affiliation_name": "Progressive Party",
  "bio": "Experienced leader with 3 years in student government",
  "manifesto": "I will fight for better campus facilities and student rights",
  "ballot_order": 1
}
```

**Response** (201 Created):
```json
{
  "ok": true,
  "candidate_id": 1,
  "full_name": "Alice Johnson",
  "race_id": 1
}
```

**Validation**:
- Election must be in DRAFT status
- User must be OWNER/ADMIN
- `full_name` is required
- Other fields are optional
- Candidate is auto-approved when added by admin

**cURL Example**:
```bash
curl -X POST http://localhost:4000/races/1/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "full_name": "Alice Johnson",
    "affiliation_name": "Progressive Party",
    "bio": "Experienced leader",
    "manifesto": "Better campus facilities",
    "ballot_order": 1
  }'
```

---

### 2. Update Candidate

**Endpoint**: `PUT /races/:raceId/candidates/:candidateId`

**Authorization**: OWNER or ADMIN of the organization

**Request Body**:
```json
{
  "full_name": "Alice M. Johnson",
  "affiliation_name": "Progressive Party",
  "bio": "Updated bio",
  "manifesto": "Updated manifesto"
}
```

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Candidate updated successfully"
}
```

**Validation**:
- User must be OWNER/ADMIN
- `full_name` is required
- Updates display_name in all races

**cURL Example**:
```bash
curl -X PUT http://localhost:4000/races/1/candidates/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "full_name": "Alice M. Johnson",
    "affiliation_name": "Progressive Party",
    "bio": "Updated biography",
    "manifesto": "Updated campaign promises"
  }'
```

---

### 3. Remove Candidate from Race

**Endpoint**: `DELETE /races/:raceId/candidates/:candidateId`

**Authorization**: OWNER or ADMIN of the organization

**Response** (200 OK):
```json
{
  "ok": true,
  "message": "Candidate removed from race successfully"
}
```

**Validation**:
- Election must be in DRAFT status
- User must be OWNER/ADMIN
- Removes candidate from this race only (candidate record remains)

**cURL Example**:
```bash
curl -X DELETE http://localhost:4000/races/1/candidates/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🚀 Complete Example: Setup Election from Scratch

### Step-by-Step Guide (No SQL Required!)

```bash
# ============================================
# STEP 1: Login and Create Organization
# ============================================

# Login
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "password123"
  }'

# Save the token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Create organization
curl -X POST http://localhost:4000/orgs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "organization_name": "State University",
    "organization_type": "UNIVERSITY",
    "organization_code": "STATE_UNI"
  }'

# ============================================
# STEP 2: Create Election
# ============================================

curl -X POST http://localhost:4000/elections \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "organization_id": 1,
    "election_name": "Student Council Election 2024",
    "description": "Annual student council election"
  }'

# ============================================
# STEP 3: Add Races (Positions)
# ============================================

# Add President race
curl -X POST http://localhost:4000/races \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "election_id": 1,
    "race_name": "President",
    "description": "Student Council President",
    "max_votes_per_voter": 1
  }'

# Add Vice President race
curl -X POST http://localhost:4000/races \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "election_id": 1,
    "race_name": "Vice President",
    "description": "Student Council Vice President",
    "max_votes_per_voter": 1
  }'

# Add Treasurer race
curl -X POST http://localhost:4000/races \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "election_id": 1,
    "race_name": "Treasurer",
    "description": "Financial Officer",
    "max_votes_per_voter": 1
  }'

# ============================================
# STEP 4: Add Candidates to President Race
# ============================================

# Add Alice Johnson
curl -X POST http://localhost:4000/races/1/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name": "Alice Johnson",
    "affiliation_name": "Progressive Party",
    "bio": "3 years experience in student government",
    "manifesto": "Better facilities, lower fees, more student voice",
    "ballot_order": 1
  }'

# Add Bob Smith
curl -X POST http://localhost:4000/races/1/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name": "Bob Smith",
    "affiliation_name": "Independent",
    "bio": "Fresh perspective on campus issues",
    "manifesto": "Transparency, accountability, student welfare",
    "ballot_order": 2
  }'

# Add Carol Davis
curl -X POST http://localhost:4000/races/1/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name": "Carol Davis",
    "affiliation_name": "Student First Party",
    "bio": "Passionate advocate for student rights",
    "manifesto": "Free textbooks, extended library hours",
    "ballot_order": 3
  }'

# ============================================
# STEP 5: Add Candidates to VP Race
# ============================================

curl -X POST http://localhost:4000/races/2/candidates \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "full_name": "David Lee",
    "affiliation_name": "Progressive Party",
    "bio": "Economics major, budget expert",
    "manifesto": "Fiscal responsibility and student programs",
    "ballot_order": 1
  }'

# ============================================
# STEP 6: Verify Setup
# ============================================

# Get all races with candidate counts
curl -X GET "http://localhost:4000/races/election/1" \
  -H "Authorization: Bearer $TOKEN"

# Get specific race with all candidates
curl -X GET "http://localhost:4000/races/1" \
  -H "Authorization: Bearer $TOKEN"

# ============================================
# STEP 7: Open Election
# ============================================

curl -X POST http://localhost:4000/elections/1/open \
  -H "Authorization: Bearer $TOKEN"

# ============================================
# DONE! Election is ready for voting
# ============================================
```

---

## 📊 Workflow Comparison

### ❌ **Before (Manual SQL)**

```sql
-- Had to run SQL manually
INSERT INTO election_races (...) VALUES (...);
INSERT INTO candidates (...) VALUES (...);
INSERT INTO candidate_races (...) VALUES (...);
```

### ✅ **Now (API-Driven)**

```bash
# Everything via API
POST /races
POST /races/{race_id}/candidates
```

**Benefits**:
- ✅ No database access needed
- ✅ Automatic validation
- ✅ Audit logging
- ✅ Permission checks
- ✅ Can build frontend easily
- ✅ Mobile app ready

---

## 🔒 Security & Validation

### **Race Operations**
- ✅ Only OWNER/ADMIN can create/update/delete
- ✅ Can only modify DRAFT elections
- ✅ Race names must be unique per election
- ✅ Deleting race cascades to candidates and votes

### **Candidate Operations**
- ✅ Only OWNER/ADMIN can add/update/remove
- ✅ Can only modify DRAFT elections
- ✅ Candidates auto-approved when added by admin
- ✅ Cannot remove candidates after election opens

### **Audit Trail**
All actions logged:
- `RACE_CREATE`
- `RACE_UPDATE`
- `RACE_DELETE`
- `CANDIDATE_ADD`
- `CANDIDATE_UPDATE`
- `CANDIDATE_REMOVE`

---

## 🎯 Best Practices

### **1. Race Setup**
```bash
# Create races in logical order
POST /races → President (ballot_order: 1)
POST /races → Vice President (ballot_order: 2)
POST /races → Treasurer (ballot_order: 3)
```

### **2. Candidate Setup**
```bash
# Use ballot_order for display sequence
POST /races/1/candidates → Alice (ballot_order: 1)
POST /races/1/candidates → Bob (ballot_order: 2)
POST /races/1/candidates → Carol (ballot_order: 3)
```

### **3. Verification Before Opening**
```bash
# Always verify before opening
GET /races/election/1  # Check all races
GET /races/1           # Check candidates per race
POST /elections/1/open # Open only when ready
```

---

## 🐛 Common Errors

| Error | Code | Cause | Solution |
|-------|------|-------|----------|
| Not authorized | 403 | Not OWNER/ADMIN | Check user role in org |
| Election not DRAFT | 400 | Election already open/closed | Can only edit DRAFT elections |
| Race name exists | 409 | Duplicate race name | Use unique race names |
| No candidates | 400 | Trying to open without candidates | Add at least 1 candidate per race |

---

## 📱 Frontend Integration

### **React Example**

```typescript
// Create race
const createRace = async (electionId: number, raceName: string) => {
  const response = await fetch('http://localhost:4000/races', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      election_id: electionId,
      race_name: raceName,
      description: 'Race description',
      max_votes_per_voter: 1
    })
  });
  return response.json();
};

// Add candidate
const addCandidate = async (raceId: number, candidateData: any) => {
  const response = await fetch(`http://localhost:4000/races/${raceId}/candidates`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(candidateData)
  });
  return response.json();
};

// Get races with candidates
const getRaces = async (electionId: number) => {
  const response = await fetch(
    `http://localhost:4000/races/election/${electionId}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  return response.json();
};
```

---

## ✨ Summary

**You can now manage elections entirely through the API!**

| Feature | Status |
|---------|--------|
| Create races | ✅ API |
| Update races | ✅ API |
| Delete races | ✅ API |
| Add candidates | ✅ API |
| Update candidates | ✅ API |
| Remove candidates | ✅ API |
| View races/candidates | ✅ API |

**No more manual SQL needed!** 🎉
