-- Update station_results check constraint to include 'health' station type
-- Drop the existing constraint
ALTER TABLE station_results DROP CONSTRAINT IF EXISTS station_results_station_type_check;

-- Add the updated constraint that includes 'health'
ALTER TABLE station_results ADD CONSTRAINT station_results_station_type_check
CHECK (station_type IN ('balance', 'breath', 'grip', 'health'));