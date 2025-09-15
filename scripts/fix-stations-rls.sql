-- Fix RLS policies for stations table
-- Stations should be readable by everyone but only editable by admins

-- Enable RLS on stations table if not already enabled
ALTER TABLE public.stations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON public.stations;
DROP POLICY IF EXISTS "Enable insert access for admins only" ON public.stations;
DROP POLICY IF EXISTS "Enable update access for admins only" ON public.stations;
DROP POLICY IF EXISTS "Enable delete access for admins only" ON public.stations;

-- Allow all users to read stations (public data)
CREATE POLICY "Enable read access for all users" ON public.stations
    FOR SELECT USING (true);

-- Only admins can insert stations
CREATE POLICY "Enable insert access for admins only" ON public.stations
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can update stations
CREATE POLICY "Enable update access for admins only" ON public.stations
    FOR UPDATE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Only admins can delete stations
CREATE POLICY "Enable delete access for admins only" ON public.stations
    FOR DELETE USING (
        auth.jwt() ->> 'role' = 'admin' OR
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'stations';