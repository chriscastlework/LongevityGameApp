-- Check current stations table schema
-- Run this to see what columns exist in your stations table

-- Check if stations table exists and show its structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'stations'
ORDER BY ordinal_position;

-- Show sample data if any exists
SELECT * FROM public.stations LIMIT 5;