-- Quick fix for signup RLS issues
-- This adds service role access to bypass RLS for API operations

-- Add service role policy to profiles table
DROP POLICY IF EXISTS "service_role_all_access" ON public.profiles;
CREATE POLICY "service_role_all_access" ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add service role policy to participants table
DROP POLICY IF EXISTS "service_role_all_access_participants" ON public.participants;
CREATE POLICY "service_role_all_access_participants" ON public.participants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Show current policies
SELECT
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'participants')
ORDER BY tablename, policyname;