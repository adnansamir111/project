BEGIN;

-- Migration 040: Add Multi-Vote Support
-- Allows voters to cast multiple votes per race (up to max_votes_per_voter)
-- For example: Creative Team with 3 positions = voter can select 3 candidates

-- =====================================================
-- 1) Remove the unique constraint that limits one vote per race
-- =====================================================
ALTER TABLE votes DROP CONSTRAINT IF EXISTS uq_vote_once_per_race;

-- =====================================================
-- 2) Add a new constraint to prevent voting for same candidate twice
-- =====================================================
ALTER TABLE votes ADD CONSTRAINT uq_vote_voter_candidate_race 
  UNIQUE (voter_id, race_id, candidate_race_id);

-- =====================================================
-- 3) Update sp_cast_vote to support multiple votes per race
-- =====================================================
CREATE OR REPLACE FUNCTION sp_cast_vote(
  p_election_id BIGINT,
  p_race_id BIGINT,
  p_candidate_id BIGINT,
  p_voter_user_id BIGINT
)
RETURNS BIGINT
LANGUAGE plpgsql
AS $$
DECLARE
  v_vote_id BIGINT;
  v_voter_id BIGINT;
  v_org_id BIGINT;
  v_election_status election_status;
  v_candidate_race_id BIGINT;
  v_max_votes INT;
  v_current_vote_count INT;
BEGIN
  -- Get election details
  SELECT organization_id, status
  INTO v_org_id, v_election_status
  FROM elections
  WHERE election_id = p_election_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Election not found'
      USING ERRCODE = '22023';
  END IF;

  -- Election must be OPEN
  IF v_election_status != 'OPEN' THEN
    RAISE EXCEPTION 'Election is not open for voting'
      USING ERRCODE = '22023';
  END IF;

  -- Verify race belongs to election and get max_votes_per_voter
  SELECT max_votes_per_voter INTO v_max_votes
  FROM election_races
  WHERE race_id = p_race_id
    AND election_id = p_election_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Race does not belong to this election'
      USING ERRCODE = '22023';
  END IF;

  -- Get voter_id and check if approved
  SELECT voter_id INTO v_voter_id
  FROM voters
  WHERE user_id = p_voter_user_id
    AND organization_id = v_org_id
    AND is_approved = TRUE
    AND status = 'APPROVED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voter not approved for this organization'
      USING ERRCODE = '28000';
  END IF;

  -- Get candidate_race_id and verify candidate is approved
  SELECT cr.candidate_race_id INTO v_candidate_race_id
  FROM candidate_races cr
  JOIN candidates c ON cr.candidate_id = c.candidate_id
  WHERE cr.race_id = p_race_id
    AND cr.candidate_id = p_candidate_id
    AND c.is_approved = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate not found or not approved for this race'
      USING ERRCODE = '22023';
  END IF;

  -- Check if already voted for this specific candidate
  IF EXISTS (
    SELECT 1 FROM votes
    WHERE voter_id = v_voter_id
      AND race_id = p_race_id
      AND candidate_race_id = v_candidate_race_id
  ) THEN
    RAISE EXCEPTION 'Already voted for this candidate in this race'
      USING ERRCODE = '23505';
  END IF;

  -- Check if voter has reached max votes for this race
  SELECT COUNT(*) INTO v_current_vote_count
  FROM votes
  WHERE voter_id = v_voter_id
    AND race_id = p_race_id;

  IF v_current_vote_count >= v_max_votes THEN
    RAISE EXCEPTION 'Maximum votes reached for this race (max: %)', v_max_votes
      USING ERRCODE = '22023';
  END IF;

  -- Cast vote
  INSERT INTO votes (
    voter_id,
    race_id,
    candidate_race_id,
    cast_channel
  )
  VALUES (
    v_voter_id,
    p_race_id,
    v_candidate_race_id,
    'WEB'
  )
  RETURNING vote_id INTO v_vote_id;

  -- Audit log
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action_type,
    entity_name,
    entity_id,
    details_json
  )
  VALUES (
    v_org_id,
    p_voter_user_id,
    'VOTE_CAST',
    'votes',
    v_vote_id,
    jsonb_build_object(
      'election_id', p_election_id,
      'race_id', p_race_id,
      'candidate_id', p_candidate_id,
      'vote_count', v_current_vote_count + 1,
      'max_votes', v_max_votes
    )
  );

  RETURN v_vote_id;
END;
$$;

-- =====================================================
-- 4) Add function to get voter's current votes for a race
-- =====================================================
CREATE OR REPLACE FUNCTION sp_get_voter_race_votes(
  p_voter_user_id BIGINT,
  p_race_id BIGINT
)
RETURNS TABLE (
  candidate_id BIGINT,
  candidate_name VARCHAR(200),
  vote_id BIGINT,
  cast_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    c.candidate_id,
    c.full_name AS candidate_name,
    v.vote_id,
    v.cast_at
  FROM votes v
  JOIN voters vr ON v.voter_id = vr.voter_id
  JOIN candidate_races cr ON v.candidate_race_id = cr.candidate_race_id
  JOIN candidates c ON cr.candidate_id = c.candidate_id
  WHERE vr.user_id = p_voter_user_id
    AND v.race_id = p_race_id
  ORDER BY v.cast_at ASC;
$$;

-- =====================================================
-- 5) Add function to remove a vote (for changing selection)
-- =====================================================
CREATE OR REPLACE FUNCTION sp_remove_vote(
  p_voter_user_id BIGINT,
  p_race_id BIGINT,
  p_candidate_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_voter_id BIGINT;
  v_vote_id BIGINT;
  v_org_id BIGINT;
BEGIN
  -- Get voter_id
  SELECT voter_id, organization_id INTO v_voter_id, v_org_id
  FROM voters
  WHERE user_id = p_voter_user_id
    AND is_approved = TRUE
    AND status = 'APPROVED';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Voter not found or not approved'
      USING ERRCODE = '28000';
  END IF;

  -- Delete the vote
  DELETE FROM votes
  WHERE voter_id = v_voter_id
    AND race_id = p_race_id
    AND candidate_race_id IN (
      SELECT candidate_race_id 
      FROM candidate_races 
      WHERE race_id = p_race_id 
        AND candidate_id = p_candidate_id
    )
  RETURNING vote_id INTO v_vote_id;

  IF v_vote_id IS NULL THEN
    RAISE EXCEPTION 'Vote not found'
      USING ERRCODE = '22023';
  END IF;

  -- Audit log
  INSERT INTO audit_logs (
    organization_id,
    user_id,
    action_type,
    entity_name,
    entity_id,
    details_json
  )
  VALUES (
    v_org_id,
    p_voter_user_id,
    'VOTE_REMOVED',
    'votes',
    v_vote_id,
    jsonb_build_object(
      'race_id', p_race_id,
      'candidate_id', p_candidate_id
    )
  );
END;
$$;

COMMIT;
