-- Add test station data with proper UUID structure
-- This will insert the stations with the names you provided

-- First, run the column fixes if needed
DO $$
BEGIN
    -- Add missing columns if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'station_type'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN station_type TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'icon_name'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN icon_name TEXT DEFAULT 'Activity';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'color_class'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN color_class TEXT DEFAULT 'bg-blue-500';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN sort_order INTEGER DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'stations'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.stations ADD COLUMN is_active BOOLEAN DEFAULT true;
    END IF;
END $$;

-- Clear existing stations to avoid conflicts
DELETE FROM public.stations;

-- Insert the specific stations you requested
INSERT INTO public.stations (
    id,
    name,
    description,
    station_type,
    icon_name,
    color_class,
    sort_order,
    is_active,
    created_at
) VALUES
(
    gen_random_uuid(),
    'Balance of Time',
    'Test your balance and stability with time-based challenges',
    'balance',
    'Scale',
    'bg-blue-500',
    1,
    true,
    now()
),
(
    gen_random_uuid(),
    'Breath of Youth',
    'Measure your breathing capacity and lung health',
    'breath',
    'Activity',
    'bg-green-500',
    2,
    true,
    now()
),
(
    gen_random_uuid(),
    'Grip of Life',
    'Test your grip strength and hand coordination',
    'grip',
    'Zap',
    'bg-yellow-500',
    3,
    true,
    now()
);

-- Show what was inserted
SELECT
    id,
    name,
    description,
    station_type,
    icon_name,
    color_class,
    sort_order,
    is_active
FROM public.stations
ORDER BY sort_order;