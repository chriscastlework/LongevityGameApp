-- Add score column to station_results table
ALTER TABLE public.station_results ADD COLUMN score INTEGER;

-- Add index for score queries
CREATE INDEX idx_station_results_score ON public.station_results(score);

-- Create function to calculate age group from date of birth
CREATE OR REPLACE FUNCTION public.get_age_group(date_of_birth DATE)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    age INTEGER;
BEGIN
    -- Calculate age in years
    age := DATE_PART('year', AGE(CURRENT_DATE, date_of_birth));

    -- Return appropriate age group
    CASE
        WHEN age BETWEEN 18 AND 25 THEN RETURN '18-25';
        WHEN age BETWEEN 26 AND 35 THEN RETURN '26-35';
        WHEN age BETWEEN 36 AND 45 THEN RETURN '36-45';
        WHEN age BETWEEN 46 AND 55 THEN RETURN '46-55';
        WHEN age BETWEEN 56 AND 65 THEN RETURN '56-65';
        WHEN age >= 66 THEN RETURN '65+';
        ELSE RETURN '18-25'; -- Default for edge cases
    END CASE;
END;
$$;

-- Create function to calculate score for a single measurement
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
        -- Standard scoring: higher values = higher scores
        IF p_value >= threshold_record.score_3_min THEN
            RETURN 3;
        ELSIF p_value >= threshold_record.score_2_max THEN
            RETURN 2;
        ELSIF p_value >= threshold_record.score_1_max THEN
            RETURN 1;
        ELSE
            RETURN 1; -- Below all thresholds still gets minimum score
        END IF;
    END IF;
END;
$$;

-- Create function to calculate overall station score
CREATE OR REPLACE FUNCTION public.calculate_station_score(
    p_station_result_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    result_record RECORD;
    participant_record RECORD;
    profile_record RECORD;
    station_score INTEGER := 1;
    age_group TEXT;
    measurement_value DECIMAL;
BEGIN
    -- Get station result data
    SELECT sr.station_type, sr.measurements, sr.participant_id
    INTO result_record
    FROM public.station_results sr
    WHERE sr.id = p_station_result_id;

    IF NOT FOUND THEN
        RETURN 1;
    END IF;

    -- Get participant and profile data
    SELECT p.user_id
    INTO participant_record
    FROM public.participants p
    WHERE p.id = result_record.participant_id;

    IF NOT FOUND THEN
        RETURN 1;
    END IF;

    SELECT pr.gender, pr.date_of_birth
    INTO profile_record
    FROM public.profiles pr
    WHERE pr.id = participant_record.user_id;

    IF NOT FOUND THEN
        RETURN 1;
    END IF;

    -- Calculate age group
    age_group := public.get_age_group(profile_record.date_of_birth::DATE);

    -- Calculate score based on station type
    CASE result_record.station_type
        WHEN 'balance' THEN
            measurement_value := (result_record.measurements->>'balance_seconds')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'balance', 'balance_seconds', measurement_value,
                profile_record.gender, age_group
            );

        WHEN 'breath' THEN
            measurement_value := (result_record.measurements->>'balloon_diameter_cm')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'breath', 'balloon_diameter_cm', measurement_value,
                profile_record.gender, age_group
            );

        WHEN 'grip' THEN
            measurement_value := (result_record.measurements->>'grip_seconds')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'grip', 'grip_seconds', measurement_value,
                profile_record.gender, age_group
            );

        WHEN 'health' THEN
            -- For health station, use BMI as primary metric
            measurement_value := (result_record.measurements->>'bmi')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'health', 'bmi', measurement_value,
                profile_record.gender, age_group
            );

        ELSE
            station_score := 1;
    END CASE;

    RETURN station_score;
END;
$$;

-- Create trigger function to automatically calculate and update scores
CREATE OR REPLACE FUNCTION public.update_station_result_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate and set the score for the new/updated result
    NEW.score := public.calculate_station_score(NEW.id);
    RETURN NEW;
END;
$$;

-- Create trigger to automatically calculate scores on INSERT/UPDATE
CREATE TRIGGER station_results_calculate_score
    BEFORE INSERT OR UPDATE OF measurements, participant_id
    ON public.station_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_station_result_score();

-- Create function to recalculate all scores (useful when thresholds change)
CREATE OR REPLACE FUNCTION public.recalculate_all_scores()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
    result_record RECORD;
BEGIN
    -- Loop through all station results and recalculate scores
    FOR result_record IN
        SELECT id FROM public.station_results
    LOOP
        UPDATE public.station_results
        SET score = public.calculate_station_score(result_record.id)
        WHERE id = result_record.id;

        updated_count := updated_count + 1;
    END LOOP;

    RETURN updated_count;
END;
$$;

-- Create trigger function to recalculate scores when thresholds change
CREATE OR REPLACE FUNCTION public.recalculate_scores_on_threshold_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    affected_count INTEGER;
BEGIN
    -- Recalculate scores for all results of the affected station type
    UPDATE public.station_results sr
    SET score = public.calculate_station_score(sr.id)
    FROM public.participants p, public.profiles pr
    WHERE sr.participant_id = p.id
      AND p.user_id = pr.id
      AND sr.station_type = COALESCE(NEW.station_type, OLD.station_type);

    GET DIAGNOSTICS affected_count = ROW_COUNT;

    RAISE NOTICE 'Recalculated scores for % station results due to threshold change', affected_count;

    RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to recalculate scores when scoring thresholds are modified
CREATE TRIGGER scoring_thresholds_recalculate_scores
    AFTER INSERT OR UPDATE OR DELETE
    ON public.scoring_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION public.recalculate_scores_on_threshold_change();

-- Add comments for documentation
COMMENT ON COLUMN public.station_results.score IS 'Calculated fitness score (1-3) based on demographic-specific thresholds';
COMMENT ON FUNCTION public.get_age_group(DATE) IS 'Calculates age group category from date of birth';
COMMENT ON FUNCTION public.calculate_measurement_score(TEXT, TEXT, DECIMAL, TEXT, TEXT) IS 'Calculates score for a single measurement based on thresholds';
COMMENT ON FUNCTION public.calculate_station_score(UUID) IS 'Calculates overall score for a station result';
COMMENT ON FUNCTION public.recalculate_all_scores() IS 'Recalculates scores for all station results';

-- Update existing station_results to have calculated scores
-- This will be done by the trigger, but we can force it for existing data
UPDATE public.station_results
SET score = public.calculate_station_score(id)
WHERE score IS NULL;