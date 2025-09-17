-- Remove all scoring-related triggers and functions
-- This migration removes the database-level scoring automation
-- Scoring will now be handled in application code

-- Drop triggers first
DROP TRIGGER IF EXISTS station_results_calculate_score ON public.station_results;
DROP TRIGGER IF EXISTS scoring_thresholds_recalculate_scores ON public.scoring_thresholds;

-- Drop functions
DROP FUNCTION IF EXISTS public.update_station_result_score();
DROP FUNCTION IF EXISTS public.recalculate_scores_on_threshold_change();
DROP FUNCTION IF EXISTS public.recalculate_all_scores();
DROP FUNCTION IF EXISTS public.recalculate_all_station_scores();
DROP FUNCTION IF EXISTS public.calculate_station_score(UUID);
DROP FUNCTION IF EXISTS public.calculate_measurement_score(TEXT, TEXT, DECIMAL, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.get_age_group(DATE);

-- Keep the score column in station_results as it will be populated by application code
-- Keep the scoring_thresholds table as it contains the configuration data
-- Keep the index on score column for performance

COMMENT ON COLUMN public.station_results.score IS 'Fitness score (1-3) calculated by application code based on demographic-specific thresholds';