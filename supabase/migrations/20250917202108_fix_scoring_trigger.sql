-- Fix the scoring trigger function to work with BEFORE INSERT
-- The issue was calling calculate_station_score(NEW.id) when NEW.id doesn't exist yet

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS station_results_calculate_score ON public.station_results;
DROP FUNCTION IF EXISTS public.update_station_result_score();

-- Create a new trigger function that calculates score without relying on ID
CREATE OR REPLACE FUNCTION public.update_station_result_score()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    profile_record RECORD;
    age_group TEXT;
    measurement_value DECIMAL;
    station_score INTEGER;
BEGIN
    -- Get participant profile information
    SELECT gender, date_of_birth
    INTO profile_record
    FROM public.profiles p
    JOIN public.participants pt ON pt.user_id = p.id
    WHERE pt.id = NEW.participant_id;

    -- If no profile found, set default score
    IF NOT FOUND THEN
        NEW.score := 1;
        RETURN NEW;
    END IF;

    -- Calculate age group
    age_group := public.get_age_group(profile_record.date_of_birth);

    -- Calculate score based on station type and measurements
    CASE NEW.station_type
        WHEN 'balance' THEN
            measurement_value := (NEW.measurements->>'balance_seconds')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'balance', 'balance_seconds', measurement_value,
                profile_record.gender, age_group
            );

        WHEN 'breath' THEN
            measurement_value := (NEW.measurements->>'balloon_diameter_cm')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'breath', 'balloon_diameter_cm', measurement_value,
                profile_record.gender, age_group
            );

        WHEN 'grip' THEN
            measurement_value := (NEW.measurements->>'grip_seconds')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'grip', 'grip_seconds', measurement_value,
                profile_record.gender, age_group
            );

        WHEN 'health' THEN
            -- For health station, use BMI as primary metric
            measurement_value := (NEW.measurements->>'bmi')::DECIMAL;
            station_score := public.calculate_measurement_score(
                'health', 'bmi', measurement_value,
                profile_record.gender, age_group
            );

        ELSE
            station_score := 1;
    END CASE;

    -- Set the calculated score
    NEW.score := station_score;
    RETURN NEW;
END;
$$;

-- Create the trigger to automatically calculate scores on INSERT/UPDATE
CREATE TRIGGER station_results_calculate_score
    BEFORE INSERT OR UPDATE OF measurements, participant_id
    ON public.station_results
    FOR EACH ROW
    EXECUTE FUNCTION public.update_station_result_score();

-- Also create a function to recalculate all existing scores
CREATE OR REPLACE FUNCTION public.recalculate_all_station_scores()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE
    updated_count INTEGER := 0;
    result_record RECORD;
BEGIN
    -- Loop through all station results and recalculate scores
    FOR result_record IN
        SELECT id, measurements, participant_id, station_type
        FROM public.station_results
    LOOP
        -- Update the record to trigger score recalculation
        UPDATE public.station_results
        SET measurements = measurements
        WHERE id = result_record.id;

        updated_count := updated_count + 1;
    END LOOP;

    RETURN updated_count;
END;
$$;

COMMENT ON FUNCTION public.recalculate_all_station_scores() IS 'Recalculates scores for all existing station results by triggering the scoring trigger';