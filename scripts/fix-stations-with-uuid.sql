-- Fix for stations table with UUID primary keys
-- This script works with the actual structure from your JSON data

-- First, let's see what we have
SELECT id, name, description, created_at FROM public.stations ORDER BY created_at;

-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Add icon_name column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'icon_name'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN icon_name TEXT DEFAULT 'Activity';
    END IF;

    -- Add color_class column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'color_class'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN color_class TEXT DEFAULT 'bg-blue-500';
    END IF;

    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;

    -- Add sort_order column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;

    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;

    -- Add station_type column to map to our expected types
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'station_type'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN station_type TEXT;
    END IF;
END $$;

-- Update the stations with proper metadata based on name patterns
UPDATE public.stations SET
    station_type = CASE
        WHEN name ILIKE '%balance%' THEN 'balance'
        WHEN name ILIKE '%breath%' THEN 'breath'
        WHEN name ILIKE '%grip%' THEN 'grip'
        WHEN name ILIKE '%health%' THEN 'health'
        ELSE 'unknown'
    END,
    icon_name = CASE
        WHEN name ILIKE '%balance%' THEN 'Scale'
        WHEN name ILIKE '%breath%' THEN 'Activity'
        WHEN name ILIKE '%grip%' THEN 'Zap'
        WHEN name ILIKE '%health%' THEN 'Heart'
        ELSE 'Activity'
    END,
    color_class = CASE
        WHEN name ILIKE '%balance%' THEN 'bg-blue-500'
        WHEN name ILIKE '%breath%' THEN 'bg-green-500'
        WHEN name ILIKE '%grip%' THEN 'bg-yellow-500'
        WHEN name ILIKE '%health%' THEN 'bg-red-500'
        ELSE 'bg-blue-500'
    END,
    sort_order = CASE
        WHEN name ILIKE '%balance%' THEN 1
        WHEN name ILIKE '%breath%' THEN 2
        WHEN name ILIKE '%grip%' THEN 3
        WHEN name ILIKE '%health%' THEN 4
        ELSE 0
    END,
    is_active = true,
    updated_at = timezone('utc'::text, now());

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS stations_updated_at ON public.stations;
CREATE TRIGGER stations_updated_at
    BEFORE UPDATE ON public.stations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Show final result
SELECT
    id,
    name,
    description,
    station_type,
    icon_name,
    color_class,
    is_active,
    sort_order,
    created_at,
    updated_at
FROM public.stations
ORDER BY sort_order;