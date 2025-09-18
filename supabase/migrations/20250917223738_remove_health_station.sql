-- Remove health station completely from the database

-- 1. Remove health scoring thresholds
DELETE FROM scoring_thresholds WHERE station_type = 'health';

-- 2. Remove health station results (this will cascade delete related data)
DELETE FROM station_results WHERE station_type = 'health';

-- 3. Drop the health_assessments table
DROP TABLE IF EXISTS health_assessments CASCADE;

-- 4. Update the scoring function to remove health references
CREATE OR REPLACE FUNCTION calculate_participant_score(participant_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  s_balance int;
  s_breath int;
  s_grip int;
  t_total int;
  grade_value text;
  abn_count int;
BEGIN
  -- Balance
  SELECT
    CASE
      WHEN avg_sway < 20 THEN 3
      WHEN avg_sway <= 40 THEN 2
      ELSE 1
    END INTO s_balance
  FROM (
    SELECT
      (measurements->>'avg_sway')::numeric as avg_sway
    FROM station_results
    WHERE station_results.participant_id = calculate_participant_score.participant_id
      AND station_type = 'balance'
    ORDER BY created_at DESC
    LIMIT 1
  ) latest_balance;

  -- Breath
  SELECT
    CASE
      WHEN breath_hold >= 45 THEN 3
      WHEN breath_hold >= 30 THEN 2
      ELSE 1
    END INTO s_breath
  FROM (
    SELECT
      (measurements->>'breath_hold')::numeric as breath_hold
    FROM station_results
    WHERE station_results.participant_id = calculate_participant_score.participant_id
      AND station_type = 'breath'
    ORDER BY created_at DESC
    LIMIT 1
  ) latest_breath;

  -- Grip
  SELECT
    CASE
      WHEN avg_grip >= 40 THEN 3
      WHEN avg_grip >= 25 THEN 2
      ELSE 1
    END INTO s_grip
  FROM (
    SELECT
      (measurements->>'avg_grip')::numeric as avg_grip
    FROM station_results
    WHERE station_results.participant_id = calculate_participant_score.participant_id
      AND station_type = 'grip'
    ORDER BY created_at DESC
    LIMIT 1
  ) latest_grip;

  -- Calculate total (now only 3 stations)
  if s_balance is not null and s_breath is not null and s_grip is not null then
    t_total := s_balance + s_breath + s_grip;
  end if;

  -- Grade calculation (adjusted for 3 stations, max score = 9)
  case
    when t_total >= 8 then grade_value := 'A';
    when t_total >= 6 then grade_value := 'B';
    when t_total >= 4 then grade_value := 'C';
    else grade_value := 'D';
  end case;

  -- Update the leaderboard
  UPDATE leaderboard SET
    score_balance = s_balance,
    score_breath  = s_breath,
    score_grip    = s_grip,
    score_health  = null,  -- Remove health score
    total_score   = t_total,
    grade         = grade_value,
    updated_at    = now()
  WHERE leaderboard.participant_id = calculate_participant_score.participant_id;

  -- Insert if not exists
  IF NOT FOUND THEN
    INSERT INTO leaderboard (
      participant_id, score_balance, score_breath, score_grip, score_health, total_score, grade
    ) VALUES (
      calculate_participant_score.participant_id, s_balance, s_breath, s_grip, null, t_total, grade_value
    );
  END IF;

END;
$$;

-- 5. Update the public leaderboard function to remove health references
CREATE OR REPLACE FUNCTION public_leaderboard(limit_count integer DEFAULT 200)
RETURNS TABLE(
  rank integer,
  participant_code text,
  full_name text,
  organization text,
  gender text,
  score_balance integer,
  score_breath integer,
  score_grip integer,
  score_health integer,  -- Keep column for backward compatibility but will be null
  total_score integer,
  grade text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY l.total_score DESC, l.updated_at ASC)::integer as rank,
    p.participant_code,
    p.full_name,
    p.organization,
    p.gender,
    l.score_balance,
    l.score_breath,
    l.score_grip,
    null::integer as score_health,  -- Always return null for health
    l.total_score,
    l.grade,
    l.created_at
  FROM leaderboard l
  JOIN participants p ON l.participant_id = p.id
  WHERE l.total_score IS NOT NULL
  ORDER BY l.total_score DESC, l.updated_at ASC
  LIMIT limit_count;
END;
$$;

-- 6. Update station type check constraints (remove 'health' from allowed values)
-- Note: This will update any existing constraints
ALTER TABLE scoring_thresholds DROP CONSTRAINT IF EXISTS scoring_thresholds_station_type_check;
ALTER TABLE scoring_thresholds ADD CONSTRAINT scoring_thresholds_station_type_check
    CHECK (station_type IN ('balance', 'breath', 'grip'));

-- 7. Update station_results table constraint if it exists
ALTER TABLE station_results DROP CONSTRAINT IF EXISTS station_results_station_type_check;
ALTER TABLE station_results ADD CONSTRAINT station_results_station_type_check
    CHECK (station_type IN ('balance', 'breath', 'grip'));