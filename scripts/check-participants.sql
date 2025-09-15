-- Check what participants exist in the database
SELECT
    p.id,
    p.participant_code,
    p.user_id,
    p.created_at,
    pr.name,
    pr.email,
    pr.organisation
FROM participants p
LEFT JOIN profiles pr ON p.user_id = pr.id
ORDER BY p.created_at DESC
LIMIT 10;

-- Also check if there are any profiles without participants
SELECT
    pr.id,
    pr.name,
    pr.email,
    pr.role,
    p.participant_code
FROM profiles pr
LEFT JOIN participants p ON pr.id = p.user_id
WHERE pr.role = 'participant'
ORDER BY pr.created_at DESC
LIMIT 10;