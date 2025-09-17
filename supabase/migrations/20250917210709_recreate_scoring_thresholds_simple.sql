-- Recreate scoring_thresholds table with simplified columns
-- Assumes table has been manually deleted

CREATE TABLE public.scoring_thresholds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,

    -- Station and measurement details
    station_type TEXT NOT NULL,
    metric_name TEXT NOT NULL,

    -- Demographic filters
    gender TEXT NOT NULL,
    age_group TEXT NOT NULL,

    -- Simplified score thresholds
    average_score_min DECIMAL,
    average_score_max DECIMAL,

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

    -- Unique constraint
    CONSTRAINT scoring_thresholds_unique_threshold
        UNIQUE (station_type, metric_name, gender, age_group)
);

-- Create indexes
CREATE INDEX idx_scoring_thresholds_lookup
    ON public.scoring_thresholds (station_type, metric_name, gender, age_group, is_active);

CREATE INDEX idx_scoring_thresholds_station_type
    ON public.scoring_thresholds (station_type);

CREATE INDEX idx_scoring_thresholds_demographics
    ON public.scoring_thresholds (gender, age_group);

-- Add RLS
ALTER TABLE public.scoring_thresholds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read scoring thresholds" ON public.scoring_thresholds
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Only admins can modify scoring thresholds" ON public.scoring_thresholds
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Add updated_at trigger
CREATE TRIGGER scoring_thresholds_updated_at
    BEFORE UPDATE ON public.scoring_thresholds
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Insert data with simplified structure
INSERT INTO public.scoring_thresholds (station_type, metric_name, gender, age_group, average_score_min, average_score_max, description) VALUES
-- Male balance thresholds
('balance', 'balance_seconds', 'male', '18-25', 15, 30, 'Balance time thresholds for young adult males'),
('balance', 'balance_seconds', 'male', '26-35', 12, 25, 'Balance time thresholds for adult males'),
('balance', 'balance_seconds', 'male', '36-45', 10, 20, 'Balance time thresholds for middle-aged males'),
('balance', 'balance_seconds', 'male', '46-55', 8, 15, 'Balance time thresholds for older adult males'),
('balance', 'balance_seconds', 'male', '56-65', 6, 12, 'Balance time thresholds for senior males'),
('balance', 'balance_seconds', 'male', '65+', 4, 8, 'Balance time thresholds for elderly males'),

-- Female balance thresholds
('balance', 'balance_seconds', 'female', '18-25', 18, 35, 'Balance time thresholds for young adult females'),
('balance', 'balance_seconds', 'female', '26-35', 15, 30, 'Balance time thresholds for adult females'),
('balance', 'balance_seconds', 'female', '36-45', 12, 25, 'Balance time thresholds for middle-aged females'),
('balance', 'balance_seconds', 'female', '46-55', 10, 20, 'Balance time thresholds for older adult females'),
('balance', 'balance_seconds', 'female', '56-65', 8, 15, 'Balance time thresholds for senior females'),
('balance', 'balance_seconds', 'female', '65+', 6, 10, 'Balance time thresholds for elderly females'),

-- Male breath thresholds
('breath', 'balloon_diameter_cm', 'male', '18-25', 15, 25, 'Balloon diameter thresholds for young adult males'),
('breath', 'balloon_diameter_cm', 'male', '26-35', 12, 22, 'Balloon diameter thresholds for adult males'),
('breath', 'balloon_diameter_cm', 'male', '36-45', 10, 20, 'Balloon diameter thresholds for middle-aged males'),
('breath', 'balloon_diameter_cm', 'male', '46-55', 8, 18, 'Balloon diameter thresholds for older adult males'),
('breath', 'balloon_diameter_cm', 'male', '56-65', 6, 15, 'Balloon diameter thresholds for senior males'),
('breath', 'balloon_diameter_cm', 'male', '65+', 4, 12, 'Balloon diameter thresholds for elderly males'),

-- Female breath thresholds
('breath', 'balloon_diameter_cm', 'female', '18-25', 12, 20, 'Balloon diameter thresholds for young adult females'),
('breath', 'balloon_diameter_cm', 'female', '26-35', 10, 18, 'Balloon diameter thresholds for adult females'),
('breath', 'balloon_diameter_cm', 'female', '36-45', 8, 16, 'Balloon diameter thresholds for middle-aged females'),
('breath', 'balloon_diameter_cm', 'female', '46-55', 6, 14, 'Balloon diameter thresholds for older adult females'),
('breath', 'balloon_diameter_cm', 'female', '56-65', 5, 12, 'Balloon diameter thresholds for senior females'),
('breath', 'balloon_diameter_cm', 'female', '65+', 4, 10, 'Balloon diameter thresholds for elderly females'),

-- Male grip thresholds
('grip', 'grip_seconds', 'male', '18-25', 30, 60, 'Grip strength time thresholds for young adult males'),
('grip', 'grip_seconds', 'male', '26-35', 25, 50, 'Grip strength time thresholds for adult males'),
('grip', 'grip_seconds', 'male', '36-45', 20, 40, 'Grip strength time thresholds for middle-aged males'),
('grip', 'grip_seconds', 'male', '46-55', 15, 30, 'Grip strength time thresholds for older adult males'),
('grip', 'grip_seconds', 'male', '56-65', 10, 20, 'Grip strength time thresholds for senior males'),
('grip', 'grip_seconds', 'male', '65+', 8, 15, 'Grip strength time thresholds for elderly males'),

-- Female grip thresholds
('grip', 'grip_seconds', 'female', '18-25', 25, 50, 'Grip strength time thresholds for young adult females'),
('grip', 'grip_seconds', 'female', '26-35', 20, 40, 'Grip strength time thresholds for adult females'),
('grip', 'grip_seconds', 'female', '36-45', 15, 30, 'Grip strength time thresholds for middle-aged females'),
('grip', 'grip_seconds', 'female', '46-55', 12, 25, 'Grip strength time thresholds for older adult females'),
('grip', 'grip_seconds', 'female', '56-65', 10, 20, 'Grip strength time thresholds for senior females'),
('grip', 'grip_seconds', 'female', '65+', 8, 15, 'Grip strength time thresholds for elderly females'),

-- Male BMI thresholds
('health', 'bmi', 'male', '18-25', 18.5, 24.9, 'BMI thresholds for young adult males'),
('health', 'bmi', 'male', '26-35', 19.0, 25.5, 'BMI thresholds for adult males'),
('health', 'bmi', 'male', '36-45', 20.0, 26.0, 'BMI thresholds for middle-aged males'),
('health', 'bmi', 'male', '46-55', 21.0, 27.0, 'BMI thresholds for older adult males'),
('health', 'bmi', 'male', '56-65', 22.0, 28.0, 'BMI thresholds for senior males'),
('health', 'bmi', 'male', '65+', 23.0, 29.0, 'BMI thresholds for elderly males'),

-- Female BMI thresholds
('health', 'bmi', 'female', '18-25', 18.5, 24.0, 'BMI thresholds for young adult females'),
('health', 'bmi', 'female', '26-35', 19.0, 24.5, 'BMI thresholds for adult females'),
('health', 'bmi', 'female', '36-45', 20.0, 25.0, 'BMI thresholds for middle-aged females'),
('health', 'bmi', 'female', '46-55', 21.0, 26.0, 'BMI thresholds for older adult females'),
('health', 'bmi', 'female', '56-65', 22.0, 27.0, 'BMI thresholds for senior females'),
('health', 'bmi', 'female', '65+', 23.0, 28.0, 'BMI thresholds for elderly females');

-- Update the scoring function to use new columns
CREATE OR REPLACE FUNCTION public.calculate_measurement_score(
    p_station_type TEXT,
    p_metric_name TEXT,
    p_value DECIMAL,
    p_gender TEXT,
    p_age_group TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
    threshold_record RECORD;
BEGIN
    SELECT average_score_min, average_score_max
    INTO threshold_record
    FROM public.scoring_thresholds
    WHERE station_type = p_station_type
      AND metric_name = p_metric_name
      AND gender = p_gender
      AND age_group = p_age_group
      AND is_active = true;

    IF NOT FOUND THEN
        RETURN 1;
    END IF;

    -- Score 3: value >= average_score_max
    -- Score 2: average_score_min <= value < average_score_max
    -- Score 1: value < average_score_min
    IF p_value >= threshold_record.average_score_max THEN
        RETURN 3;
    ELSIF p_value >= threshold_record.average_score_min THEN
        RETURN 2;
    ELSE
        RETURN 1;
    END IF;
END;
$$;