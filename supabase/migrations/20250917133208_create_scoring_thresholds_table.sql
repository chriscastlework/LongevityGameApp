-- Create scoring_thresholds table to store score ranges for different demographics and stations
CREATE TABLE public.scoring_thresholds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Station and measurement details
    station_type TEXT NOT NULL, -- 'balance', 'breath', 'grip', 'health'
    metric_name TEXT NOT NULL, -- 'balance_seconds', 'balloon_diameter_cm', 'grip_seconds', etc.

    -- Demographic filters
    gender TEXT NOT NULL, -- 'male', 'female'
    age_group TEXT NOT NULL, -- '18-25', '26-35', '36-45', '46-55', '56-65', '65+'

    -- Score thresholds (ascending order for better performance)
    score_1_max DECIMAL, -- Maximum value for score 1 (lowest)
    score_2_max DECIMAL, -- Maximum value for score 2 (middle)
    score_3_min DECIMAL, -- Minimum value for score 3 (highest)

    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT true NOT NULL,

    -- Constraints
    CONSTRAINT scoring_thresholds_station_type_check
        CHECK (station_type IN ('balance', 'breath', 'grip', 'health')),
    CONSTRAINT scoring_thresholds_gender_check
        CHECK (gender IN ('male', 'female')),
    CONSTRAINT scoring_thresholds_age_group_check
        CHECK (age_group IN ('18-25', '26-35', '36-45', '46-55', '56-65', '65+')),
    CONSTRAINT scoring_thresholds_metric_name_check
        CHECK (metric_name IN ('balance_seconds', 'balloon_diameter_cm', 'grip_seconds',
                              'bp_systolic', 'bp_diastolic', 'pulse', 'bmi', 'muscle_pct', 'fat_pct', 'spo2')),

    -- Unique constraint to prevent duplicate thresholds
    CONSTRAINT scoring_thresholds_unique_threshold
        UNIQUE (station_type, metric_name, gender, age_group)
);

-- Create indexes for performance
CREATE INDEX idx_scoring_thresholds_lookup
    ON public.scoring_thresholds (station_type, metric_name, gender, age_group, is_active);

CREATE INDEX idx_scoring_thresholds_station_type
    ON public.scoring_thresholds (station_type);

CREATE INDEX idx_scoring_thresholds_demographics
    ON public.scoring_thresholds (gender, age_group);

-- Add RLS (Row Level Security)
ALTER TABLE public.scoring_thresholds ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read scoring thresholds
CREATE POLICY "Anyone can read scoring thresholds" ON public.scoring_thresholds
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can modify scoring thresholds
CREATE POLICY "Only admins can modify scoring thresholds" ON public.scoring_thresholds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER scoring_thresholds_updated_at
    BEFORE UPDATE ON public.scoring_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default scoring thresholds for all station types and demographics
-- Balance Station Thresholds (balance_seconds)
INSERT INTO public.scoring_thresholds (station_type, metric_name, gender, age_group, score_1_max, score_2_max, score_3_min, description) VALUES
-- Male thresholds for balance
('balance', 'balance_seconds', 'male', '18-25', 15, 30, 45, 'Balance time thresholds for young adult males'),
('balance', 'balance_seconds', 'male', '26-35', 12, 25, 40, 'Balance time thresholds for adult males'),
('balance', 'balance_seconds', 'male', '36-45', 10, 20, 35, 'Balance time thresholds for middle-aged males'),
('balance', 'balance_seconds', 'male', '46-55', 8, 15, 25, 'Balance time thresholds for older adult males'),
('balance', 'balance_seconds', 'male', '56-65', 6, 12, 20, 'Balance time thresholds for senior males'),
('balance', 'balance_seconds', 'male', '65+', 4, 8, 15, 'Balance time thresholds for elderly males'),

-- Female thresholds for balance
('balance', 'balance_seconds', 'female', '18-25', 18, 35, 50, 'Balance time thresholds for young adult females'),
('balance', 'balance_seconds', 'female', '26-35', 15, 30, 45, 'Balance time thresholds for adult females'),
('balance', 'balance_seconds', 'female', '36-45', 12, 25, 40, 'Balance time thresholds for middle-aged females'),
('balance', 'balance_seconds', 'female', '46-55', 10, 20, 30, 'Balance time thresholds for older adult females'),
('balance', 'balance_seconds', 'female', '56-65', 8, 15, 25, 'Balance time thresholds for senior females'),
('balance', 'balance_seconds', 'female', '65+', 6, 10, 18, 'Balance time thresholds for elderly females'),

-- Breath Station Thresholds (balloon_diameter_cm)
-- Male thresholds for breath
('breath', 'balloon_diameter_cm', 'male', '18-25', 15, 25, 35, 'Balloon diameter thresholds for young adult males'),
('breath', 'balloon_diameter_cm', 'male', '26-35', 12, 22, 32, 'Balloon diameter thresholds for adult males'),
('breath', 'balloon_diameter_cm', 'male', '36-45', 10, 20, 30, 'Balloon diameter thresholds for middle-aged males'),
('breath', 'balloon_diameter_cm', 'male', '46-55', 8, 18, 28, 'Balloon diameter thresholds for older adult males'),
('breath', 'balloon_diameter_cm', 'male', '56-65', 6, 15, 25, 'Balloon diameter thresholds for senior males'),
('breath', 'balloon_diameter_cm', 'male', '65+', 4, 12, 20, 'Balloon diameter thresholds for elderly males'),

-- Female thresholds for breath
('breath', 'balloon_diameter_cm', 'female', '18-25', 12, 20, 30, 'Balloon diameter thresholds for young adult females'),
('breath', 'balloon_diameter_cm', 'female', '26-35', 10, 18, 28, 'Balloon diameter thresholds for adult females'),
('breath', 'balloon_diameter_cm', 'female', '36-45', 8, 16, 26, 'Balloon diameter thresholds for middle-aged females'),
('breath', 'balloon_diameter_cm', 'female', '46-55', 6, 14, 24, 'Balloon diameter thresholds for older adult females'),
('breath', 'balloon_diameter_cm', 'female', '56-65', 5, 12, 22, 'Balloon diameter thresholds for senior females'),
('breath', 'balloon_diameter_cm', 'female', '65+', 4, 10, 18, 'Balloon diameter thresholds for elderly females'),

-- Grip Station Thresholds (grip_seconds)
-- Male thresholds for grip
('grip', 'grip_seconds', 'male', '18-25', 30, 60, 120, 'Grip strength time thresholds for young adult males'),
('grip', 'grip_seconds', 'male', '26-35', 25, 50, 100, 'Grip strength time thresholds for adult males'),
('grip', 'grip_seconds', 'male', '36-45', 20, 40, 80, 'Grip strength time thresholds for middle-aged males'),
('grip', 'grip_seconds', 'male', '46-55', 15, 30, 60, 'Grip strength time thresholds for older adult males'),
('grip', 'grip_seconds', 'male', '56-65', 10, 20, 40, 'Grip strength time thresholds for senior males'),
('grip', 'grip_seconds', 'male', '65+', 8, 15, 30, 'Grip strength time thresholds for elderly males'),

-- Female thresholds for grip
('grip', 'grip_seconds', 'female', '18-25', 25, 50, 100, 'Grip strength time thresholds for young adult females'),
('grip', 'grip_seconds', 'female', '26-35', 20, 40, 80, 'Grip strength time thresholds for adult females'),
('grip', 'grip_seconds', 'female', '36-45', 15, 30, 60, 'Grip strength time thresholds for middle-aged females'),
('grip', 'grip_seconds', 'female', '46-55', 12, 25, 50, 'Grip strength time thresholds for older adult females'),
('grip', 'grip_seconds', 'female', '56-65', 10, 20, 40, 'Grip strength time thresholds for senior females'),
('grip', 'grip_seconds', 'female', '65+', 8, 15, 30, 'Grip strength time thresholds for elderly females');

-- Health Station Thresholds
-- For health station, we'll use BMI as the primary scoring metric
-- BMI thresholds (lower is generally better, but optimal range is 18.5-24.9)
-- Male BMI thresholds
INSERT INTO public.scoring_thresholds (station_type, metric_name, gender, age_group, score_1_max, score_2_max, score_3_min, description) VALUES
('health', 'bmi', 'male', '18-25', 30, 27, 18.5, 'BMI thresholds for young adult males'),
('health', 'bmi', 'male', '26-35', 32, 28, 19, 'BMI thresholds for adult males'),
('health', 'bmi', 'male', '36-45', 34, 30, 20, 'BMI thresholds for middle-aged males'),
('health', 'bmi', 'male', '46-55', 35, 32, 21, 'BMI thresholds for older adult males'),
('health', 'bmi', 'male', '56-65', 36, 33, 22, 'BMI thresholds for senior males'),
('health', 'bmi', 'male', '65+', 38, 35, 23, 'BMI thresholds for elderly males'),

-- Female BMI thresholds
('health', 'bmi', 'female', '18-25', 28, 25, 18.5, 'BMI thresholds for young adult females'),
('health', 'bmi', 'female', '26-35', 30, 27, 19, 'BMI thresholds for adult females'),
('health', 'bmi', 'female', '36-45', 32, 29, 20, 'BMI thresholds for middle-aged females'),
('health', 'bmi', 'female', '46-55', 34, 31, 21, 'BMI thresholds for older adult females'),
('health', 'bmi', 'female', '56-65', 35, 32, 22, 'BMI thresholds for senior females'),
('health', 'bmi', 'female', '65+', 36, 33, 23, 'BMI thresholds for elderly females');

COMMENT ON TABLE public.scoring_thresholds IS 'Stores scoring thresholds for fitness stations by demographics';
COMMENT ON COLUMN public.scoring_thresholds.score_1_max IS 'Maximum value for score 1 (lowest performance)';
COMMENT ON COLUMN public.scoring_thresholds.score_2_max IS 'Maximum value for score 2 (average performance)';
COMMENT ON COLUMN public.scoring_thresholds.score_3_min IS 'Minimum value for score 3 (best performance)';