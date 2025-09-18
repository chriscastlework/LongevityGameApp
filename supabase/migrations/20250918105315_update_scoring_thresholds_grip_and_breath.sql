-- Drop the existing scoring_thresholds table
DROP TABLE IF EXISTS public.scoring_thresholds;

-- Create new scoring_thresholds table with min_age and max_age columns
CREATE TABLE public.scoring_thresholds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    station_type TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    min_age INTEGER NOT NULL,
    max_age INTEGER,
    score INTEGER NOT NULL,
    min_value NUMERIC,
    max_value NUMERIC,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert grip strength scoring thresholds
-- Above Average (3 points)  Excellent
INSERT INTO public.scoring_thresholds (station_type, gender, min_age, max_age, score, min_value, max_value) VALUES
-- Men
('grip', 'male', 18, 39, 3, 60, NULL),
('grip', 'male', 40, 59, 3, 45, NULL),
('grip', 'male', 60, NULL, 3, 25, NULL),
-- Women
('grip', 'female', 18, 39, 3, 45, NULL),
('grip', 'female', 40, 59, 3, 30, NULL),
('grip', 'female', 60, NULL, 3, 20, NULL),

-- Average (2 points)  Typical / acceptable
-- Men
('grip', 'male', 18, 39, 2, 30, 59),
('grip', 'male', 40, 59, 2, 20, 44),
('grip', 'male', 60, NULL, 2, 10, 24),
-- Women
('grip', 'female', 18, 39, 2, 20, 44),
('grip', 'female', 40, 59, 2, 15, 29),
('grip', 'female', 60, NULL, 2, 8, 19),

-- Bad (1 point)  Low / requires follow-up
-- Men
('grip', 'male', 18, 39, 1, NULL, 29),
('grip', 'male', 40, 59, 1, NULL, 19),
('grip', 'male', 60, NULL, 1, NULL, 9),
-- Women
('grip', 'female', 18, 39, 1, NULL, 19),
('grip', 'female', 40, 59, 1, NULL, 14),
('grip', 'female', 60, NULL, 1, NULL, 7),

-- Insert breath/balloon scoring thresholds
-- Above Average (3 points)  Excellent
-- Men
('breath', 'male', 18, 39, 3, 33, NULL),
('breath', 'male', 40, 59, 3, 30, NULL),
('breath', 'male', 60, NULL, 3, 25, NULL),
-- Women
('breath', 'female', 18, 39, 3, 30, NULL),
('breath', 'female', 40, 59, 3, 26, NULL),
('breath', 'female', 60, NULL, 3, 20, NULL),

-- Average (2 points)  Typical / acceptable
-- Men
('breath', 'male', 18, 39, 2, 25, 32),
('breath', 'male', 40, 59, 2, 23, 29),
('breath', 'male', 60, NULL, 2, 18, 24),
-- Women
('breath', 'female', 18, 39, 2, 23, 29),
('breath', 'female', 40, 59, 2, 20, 25),
('breath', 'female', 60, NULL, 2, 15, 19),

-- Bad (1 point)  Low / requires follow-up
-- Men
('breath', 'male', 18, 39, 1, NULL, 24),
('breath', 'male', 40, 59, 1, NULL, 22),
('breath', 'male', 60, NULL, 1, NULL, 17),
-- Women
('breath', 'female', 18, 39, 1, NULL, 22),
('breath', 'female', 40, 59, 1, NULL, 19),
('breath', 'female', 60, NULL, 1, NULL, 14);

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