-- Add stations table for dynamic station configuration
-- This allows customizing station names, descriptions, and settings

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.stations (
    id TEXT PRIMARY KEY CHECK (id IN ('balance', 'breath', 'grip', 'health')),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_name TEXT NOT NULL DEFAULT 'Activity', -- Lucide icon name
    color_class TEXT NOT NULL DEFAULT 'bg-blue-500', -- Tailwind color class
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS stations_updated_at ON public.stations;
CREATE TRIGGER stations_updated_at
    BEFORE UPDATE ON public.stations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Insert default station data
INSERT INTO public.stations (id, name, description, icon_name, color_class, sort_order) VALUES
    ('balance', 'Balance of Time', 'Test your balance and coordination skills', 'Scale', 'bg-blue-500', 1),
    ('breath', 'Breath of Youth', 'Measure your respiratory capacity and control', 'Activity', 'bg-green-500', 2),
    ('grip', 'Grip of Life', 'Assess your grip strength and endurance', 'Zap', 'bg-yellow-500', 3),
    ('health', 'Health Metrics', 'Comprehensive health measurements', 'Heart', 'bg-red-500', 4)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    icon_name = EXCLUDED.icon_name,
    color_class = EXCLUDED.color_class,
    sort_order = EXCLUDED.sort_order,
    updated_at = timezone('utc'::text, now());

-- Enable RLS
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Everyone can read stations (they need to see the list)
CREATE POLICY "Stations are readable by everyone" ON public.stations
    FOR SELECT USING (true);

-- Only admins can modify stations
CREATE POLICY "Stations are writable by admins only" ON public.stations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );