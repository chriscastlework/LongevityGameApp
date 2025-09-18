-- Fix database after deleting old results table
-- Add score column to station_results if it doesn't exist
ALTER TABLE public.station_results
ADD COLUMN IF NOT EXISTS score integer;

-- Create index for score column
CREATE INDEX IF NOT EXISTS idx_station_results_score ON public.station_results(score);

-- Drop the old results table if it exists
DROP TABLE IF EXISTS public.results CASCADE;

-- Update Health Horizon station icon color to red
UPDATE public.stations
SET color_class = 'bg-red-500'
WHERE station_type = 'health' AND name = 'Health Horizon';