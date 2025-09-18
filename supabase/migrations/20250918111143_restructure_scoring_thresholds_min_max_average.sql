-- Drop the existing scoring_thresholds table
DROP TABLE IF EXISTS public.scoring_thresholds;

-- Create new scoring_thresholds table with min_average_value and max_average_value columns
CREATE TABLE public.scoring_thresholds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_type TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    min_age INTEGER NOT NULL,
    max_age INTEGER,
    min_average_value NUMERIC NOT NULL,
    max_average_value NUMERIC NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert grip strength scoring thresholds
-- Converted from existing data: score 1 (poor) = below min_average_value, score 2 (average) = between min_average_value and max_average_value, score 3 (excellent) = above max_average_value
INSERT INTO public.scoring_thresholds (station_type, gender, min_age, max_age, min_average_value, max_average_value) VALUES
-- Men
('grip', 'male', 18, 39, 30, 59),  -- poor: <30, average: 30-59, excellent: >=60
('grip', 'male', 40, 59, 20, 44),  -- poor: <20, average: 20-44, excellent: >=45
('grip', 'male', 60, NULL, 10, 24), -- poor: <10, average: 10-24, excellent: >=25
-- Women
('grip', 'female', 18, 39, 20, 44), -- poor: <20, average: 20-44, excellent: >=45
('grip', 'female', 40, 59, 15, 29), -- poor: <15, average: 15-29, excellent: >=30
('grip', 'female', 60, NULL, 8, 19), -- poor: <8, average: 8-19, excellent: >=20

-- Insert breath/balloon scoring thresholds
-- Men
('breath', 'male', 18, 39, 25, 32), -- poor: <25, average: 25-32, excellent: >=33
('breath', 'male', 40, 59, 23, 29), -- poor: <23, average: 23-29, excellent: >=30
('breath', 'male', 60, NULL, 18, 24), -- poor: <18, average: 18-24, excellent: >=25
-- Women
('breath', 'female', 18, 39, 23, 29), -- poor: <23, average: 23-29, excellent: >=30
('breath', 'female', 40, 59, 20, 25), -- poor: <20, average: 20-25, excellent: >=26
('breath', 'female', 60, NULL, 15, 19), -- poor: <15, average: 15-19, excellent: >=20

-- Insert balance scoring thresholds
-- Men
('balance', 'male', 18, 39, 15, 24), -- poor: <15, average: 15-24, excellent: >=25
('balance', 'male', 40, 59, 10, 19), -- poor: <10, average: 10-19, excellent: >=20
('balance', 'male', 60, NULL, 5, 14), -- poor: <5, average: 5-14, excellent: >=15
-- Women
('balance', 'female', 18, 39, 12, 19), -- poor: <12, average: 12-19, excellent: >=20
('balance', 'female', 40, 59, 7, 14), -- poor: <7, average: 7-14, excellent: >=15
('balance', 'female', 60, NULL, 4, 9); -- poor: <4, average: 4-9, excellent: >=10

-- Enable RLS (Row Level Security)
ALTER TABLE public.scoring_thresholds ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read access to all users" ON public.scoring_thresholds
    FOR SELECT USING (true);

CREATE POLICY "Allow insert for authenticated users" ON public.scoring_thresholds
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update for authenticated users" ON public.scoring_thresholds
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete for authenticated users" ON public.scoring_thresholds
    FOR DELETE USING (auth.role() = 'authenticated');