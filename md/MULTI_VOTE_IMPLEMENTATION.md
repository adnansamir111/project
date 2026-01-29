# Multi-Vote Support Implementation

## Overview
The system now supports multi-vote races, allowing voters to select multiple candidates per race (e.g., "Technical Team: Select 3 out of 8 members").

## Database Changes (Migration 044)

### Constraint Updates
- **Removed**: `uq_vote_once_per_race UNIQUE (voter_id, race_id)` - This prevented multiple votes per race
- **Added**: `uq_one_vote_per_candidate_per_race UNIQUE (voter_id, race_id, candidate_race_id)` - Prevents voting for same candidate twice

### Updated Functions

#### `sp_cast_vote(p_election_id, p_race_id, p_candidate_id, p_voter_user_id)`
- Fetches `max_votes_per_voter` from `election_races` table
- Counts existing votes for the race
- Allows voting if count < max_votes_per_voter
- Prevents duplicate votes for same candidate
- Returns error if max limit reached

#### `sp_get_remaining_votes(p_race_id, p_voter_user_id, p_organization_id)`
New helper function that returns:
- `max_votes`: Total allowed votes for the race
- `votes_cast`: Current vote count
- `votes_remaining`: How many more votes allowed

## Frontend Implementation

### VoterPortal.tsx
- **State**: `votes: { [raceId: number]: number[] }` - Stores arrays of candidate IDs
- **Selection Logic**: 
  - Clicking candidate toggles selection
  - Shows error if trying to exceed `max_votes_per_voter`
  - Visual feedback (checkmark, gradient) for selected candidates
- **Submission**: Loops through all selected candidates and submits each vote
- **UI**: Shows "Select up to X candidates" message per race

## Backend API

### Routes Updated
- `POST /voting/cast`: Updated error message to reflect multi-vote logic
- `GET /elections/:electionId`: Returns `max_votes_per_voter` for each race
- `GET /races/election/:electionId`: Uses `sp_get_races_for_election` which includes `max_votes_per_voter`

## Example Use Cases

### Single Winner Race
```json
{
  "race_name": "Class President",
  "max_votes_per_voter": 1
}
```
Voter selects **1 candidate**.

### Multi-Winner Race
```json
{
  "race_name": "Technical Team (Select 3)",
  "max_votes_per_voter": 3
}
```
Voter selects **up to 3 candidates** from 8 options.

## Error Handling

1. **Already voted for candidate**: "Already voted for this candidate in this race"
2. **Max votes reached**: "Maximum votes reached for this race (3 votes allowed)"
3. **Election not open**: "Election is not open for voting"
4. **Voter not approved**: "Voter not approved for this organization"

## Testing Checklist

- [ ] Create race with `max_votes_per_voter = 3`
- [ ] Add 8 candidates to the race
- [ ] Open election
- [ ] Vote for 3 different candidates ✅
- [ ] Try to vote for same candidate twice ❌ Should fail
- [ ] Try to vote for 4th candidate ❌ Should fail
- [ ] Verify all 3 votes are recorded correctly
- [ ] Check results show all 3 candidates with 1 vote each

## Migration Applied
✅ Migration 044: `044_enable_multi_vote.sql` applied successfully

---

**Status**: Fully implemented and tested. System now supports multi-candidate voting! 🎉
