-- Create station_results table to store measurement data
-- This table is missing from the database but required by the station-results API

CREATE TABLE IF NOT EXISTS public.station_results (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
    station_id UUID NOT NULL REFERENCES public.stations(id) ON DELETE CASCADE,
    station_type TEXT NOT NULL,
    measurements JSONB NOT NULL,
    recorded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_station_results_participant_id ON public.station_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_station_results_station_id ON public.station_results(station_id);
CREATE INDEX IF NOT EXISTS idx_station_results_station_type ON public.station_results(station_type);
CREATE INDEX IF NOT EXISTS idx_station_results_recorded_by ON public.station_results(recorded_by);
CREATE INDEX IF NOT EXISTS idx_station_results_created_at ON public.station_results(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_station_results_updated_at
    BEFORE UPDATE ON public.station_results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE public.station_results ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow service role to access all records (for admin client)
CREATE POLICY "Service role can access all station_results" ON public.station_results
    FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read their own results
CREATE POLICY "Users can read their own station_results" ON public.station_results
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM public.participants WHERE id = participant_id
            UNION
            SELECT recorded_by
        )
    );

-- Allow operators and admins to insert/update station results
CREATE POLICY "Operators can manage station_results" ON public.station_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
            AND role IN ('operator', 'admin')
        )
    );

-- Grant permissions
GRANT ALL ON public.station_results TO service_role;
GRANT SELECT ON public.station_results TO authenticated;
GRANT INSERT, UPDATE ON public.station_results TO authenticated;

-- Comment the table
COMMENT ON TABLE public.station_results IS 'Stores measurement data from fitness stations for participants';
COMMENT ON COLUMN public.station_results.measurements IS 'JSONB field containing station-specific measurement data (e.g., balance_seconds, grip_left_kg, etc.)';
COMMENT ON COLUMN public.station_results.station_type IS 'Type of station (balance, breath, grip, health) for quick filtering';
COMMENT ON COLUMN public.station_results.recorded_by IS 'User ID of the operator who recorded these measurements';