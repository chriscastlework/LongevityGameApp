-- Fix the scoring calculation logic
-- The issue was using >= score_2_max instead of proper range checking

CREATE OR REPLACE FUNCTION public.calculate_measurement_score(
    p_station_type TEXT,
    p_metric_name TEXT,
    p_value DECIMAL,
    p_gender TEXT,
    p_age_group TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    threshold_record RECORD;
BEGIN
    -- Get scoring thresholds for this demographic and metric
    SELECT score_1_max, score_2_max, score_3_min
    INTO threshold_record
    FROM public.scoring_thresholds
    WHERE station_type = p_station_type
      AND metric_name = p_metric_name
      AND gender = p_gender
      AND age_group = p_age_group
      AND is_active = true;

    -- If no thresholds found, return default score of 1
    IF NOT FOUND THEN
        RETURN 1;
    END IF;

    -- Calculate score based on thresholds
    -- For most metrics, higher values = higher scores
    -- For BMI, we use a special case where optimal range gets highest score
    IF p_metric_name = 'bmi' THEN
        -- BMI scoring: optimal range (18.5-24.9) gets score 3
        IF p_value >= threshold_record.score_3_min AND p_value <= 24.9 THEN
            RETURN 3;
        ELSIF p_value <= threshold_record.score_2_max THEN
            RETURN 2;
        ELSE
            RETURN 1;
        END IF;
    ELSE
        -- Standard scoring with correct range logic:
        -- Score 3: value >= score_3_min
        -- Score 2: score_1_max < value < score_3_min
        -- Score 1: value <= score_1_max
        IF p_value >= threshold_record.score_3_min THEN
            RETURN 3;
        ELSIF p_value > threshold_record.score_1_max THEN
            RETURN 2;
        ELSE
            RETURN 1;
        END IF;
    END IF;
END;
$$;