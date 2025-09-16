-- Create participant records for all existing users who don't have them
-- This ensures QR codes work for existing users
-- Uses the same format as the QR code generation: LFG-{last 4 chars of user_id}

INSERT INTO participants (
    id,
    user_id,
    participant_code,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    p.id,
    'LFG-' || UPPER(SUBSTRING(p.id FROM LENGTH(p.id) - 3)),
    now(),
    now()
FROM profiles p
WHERE p.role = 'participant'
AND NOT EXISTS (
    SELECT 1 FROM participants part
    WHERE part.user_id = p.id
);

-- Show what was created
SELECT
    p.participant_code,
    pr.name,
    pr.email,
    p.created_at
FROM participants p
JOIN profiles pr ON p.user_id = pr.id
WHERE pr.role = 'participant'
ORDER BY p.created_at DESC;