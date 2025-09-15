-- Check current stations table structure and data
-- Run this to see what your table looks like

-- Show table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'stations'
ORDER BY ordinal_position;

-- Show current data
SELECT
    id,
    name,
    description,
    created_at,
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
            AND table_name = 'stations'
            AND column_name = 'station_type'
        ) THEN station_type
        ELSE 'missing_column'
    END as station_type_check
FROM public.stations
ORDER BY created_at
LIMIT 10;

-- Check if missing columns exist
SELECT
    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'icon_name'
    ) THEN 'EXISTS' ELSE 'MISSING' END as icon_name_column,

    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'color_class'
    ) THEN 'EXISTS' ELSE 'MISSING' END as color_class_column,

    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'station_type'
    ) THEN 'EXISTS' ELSE 'MISSING' END as station_type_column,

    CASE WHEN EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'sort_order'
    ) THEN 'EXISTS' ELSE 'MISSING' END as sort_order_column;