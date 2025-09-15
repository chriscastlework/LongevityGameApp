-- Migration script for existing stations table
-- This will add missing columns and update data safely

-- First, let's add any missing columns that don't exist
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
END $$;

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at trigger if it doesn't exist
DROP TRIGGER IF EXISTS stations_updated_at ON public.stations;
CREATE TRIGGER stations_updated_at
    BEFORE UPDATE ON public.stations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Now update/insert the station data with proper mapping
-- First, let's map existing stations to their proper metadata
UPDATE public.stations SET
    icon_name = CASE
        WHEN id = 'balance' OR name ILIKE '%balance%' THEN 'Scale'
        WHEN id = 'breath' OR name ILIKE '%breath%' THEN 'Activity'
        WHEN id = 'grip' OR name ILIKE '%grip%' THEN 'Zap'
        WHEN id = 'health' OR name ILIKE '%health%' THEN 'Heart'
        ELSE 'Activity'
    END,
    color_class = CASE
        WHEN id = 'balance' OR name ILIKE '%balance%' THEN 'bg-blue-500'
        WHEN id = 'breath' OR name ILIKE '%breath%' THEN 'bg-green-500'
        WHEN id = 'grip' OR name ILIKE '%grip%' THEN 'bg-yellow-500'
        WHEN id = 'health' OR name ILIKE '%health%' THEN 'bg-red-500'
        ELSE 'bg-blue-500'
    END,
    sort_order = CASE
        WHEN id = 'balance' OR name ILIKE '%balance%' THEN 1
        WHEN id = 'breath' OR name ILIKE '%breath%' THEN 2
        WHEN id = 'grip' OR name ILIKE '%grip%' THEN 3
        WHEN id = 'health' OR name ILIKE '%health%' THEN 4
        ELSE 0
    END,
    is_active = true,
    updated_at = timezone('utc'::text, now());

-- Update names and descriptions with the new engaging names
UPDATE public.stations SET
    name = CASE
        WHEN id = 'balance' OR name ILIKE '%balance%' THEN 'Balance of Time'
        WHEN id = 'breath' OR name ILIKE '%breath%' THEN 'Breath of Youth'
        WHEN id = 'grip' OR name ILIKE '%grip%' THEN 'Grip of Life'
        WHEN id = 'health' OR name ILIKE '%health%' THEN 'Health Metrics'
        ELSE name
    END,
    description = CASE
        WHEN id = 'balance' OR name ILIKE '%balance%' THEN 'Test your balance and coordination skills'
        WHEN id = 'breath' OR name ILIKE '%breath%' THEN 'Measure your respiratory capacity and control'
        WHEN id = 'grip' OR name ILIKE '%grip%' THEN 'Assess your grip strength and endurance'
        WHEN id = 'health' OR name ILIKE '%health%' THEN 'Comprehensive health measurements'
        ELSE description
    END,
    updated_at = timezone('utc'::text, now());

-- Show final result
SELECT
    id, name, description, icon_name, color_class, is_active, sort_order, created_at, updated_at
FROM public.stations
ORDER BY sort_order;