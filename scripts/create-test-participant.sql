-- Create a test participant with the participant code LFG-7B38
-- This is for testing the participant name display functionality

-- First, create a test user profile (using a fake user ID for demonstration)
-- In production, this would be linked to actual auth.users
INSERT INTO profiles (
    id,
    name,
    email,
    date_of_birth,
    gender,
    job_title,
    organisation,
    role,
    created_at,
    updated_at
) VALUES (
    '12345678-1234-5678-9abc-123456789abc', -- fake user ID for testing
    'John Doe',
    'john.doe@example.com',
    '1990-01-15',
    'male',
    'Software Engineer',
    'Test Company Ltd',
    'participant',
    now(),
    now()
);

-- Now create the participant record with the specific code
INSERT INTO participants (
    id,
    user_id,
    participant_code,
    created_at,
    updated_at
) VALUES (
    gen_random_uuid(),
    '12345678-1234-5678-9abc-123456789abc',
    'LFG-7B38',
    now(),
    now()
);

-- Show the created participant
SELECT
    p.id,
    p.participant_code,
    p.user_id,
    pr.name,
    pr.email,
    pr.organisation
FROM participants p
JOIN profiles pr ON p.user_id = pr.id
WHERE p.participant_code = 'LFG-7B38';