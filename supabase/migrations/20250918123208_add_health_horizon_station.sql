-- Add Health Horizon Station (Station 4)
INSERT INTO public.stations (name, station_type, description, sort_order, color_class, icon_name, is_active)
VALUES (
    'Health Horizon',
    'health',
    'Comprehensive health assessment including blood pressure, heart rate, oxygen saturation, and BMI measurements',
    4,
    'bg-red-100 border-red-200 text-red-800',
    'activity',
    true
);

-- Add scoring thresholds for Health Horizon measurements
-- Note: Health station uses multiple metrics with different scoring patterns
-- Each metric will be scored separately and combined

-- BP Systolic thresholds (lower is better)
-- Above Average: 100-129 mmHg, Average: 130-139 mmHg, Bad: >= 140 mmHg
INSERT INTO public.scoring_thresholds (station_type, gender, min_age, max_age, min_average_value, max_average_value) VALUES
-- Men and Women - BP Systolic
('health', 'male', 18, NULL, 130, 139),
('health', 'female', 18, NULL, 130, 139);

-- Note: For the health station, we'll need custom scoring logic to handle:
-- 1. BP Diastolic: 60-79 (above avg), 80-89 (avg), >=90 (bad)
-- 2. Heart Rate: 50-70 (above avg), 71-85 (avg), >85 (bad)
-- 3. SpO2: 97-100% (above avg), 94-96% (avg), <=93% (bad)
-- 4. BMI: 18.5-24.9 (above avg), 25-29.9 (avg), >=30 or <18.5 (bad)
-- The scoring calculator will handle these specific ranges per metric