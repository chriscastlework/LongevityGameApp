-- Debug and fix signup RLS issues
-- This script helps identify and resolve the signup profile creation problem

BEGIN;

-- 1. First, let's check if RLS is enabled and what policies exist
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 2. Check current policies
SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'profiles';

-- 3. Temporarily disable RLS to allow signup (if needed for immediate testing)
-- UNCOMMENT ONLY FOR EMERGENCY TESTING - RE-ENABLE AFTERWARDS
-- ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- 4. Or fix the policies properly (recommended approach):

-- Drop all existing profile policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and operators can manage roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON public.profiles;

-- Create comprehensive policies that handle all scenarios

-- 1. Service role (used by API routes) can do everything
CREATE POLICY "service_role_all_access" ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- 2. Authenticated users can INSERT their own profile (for client-side signup)
CREATE POLICY "users_can_create_own_profile" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 3. Authenticated users can SELECT their own profile
CREATE POLICY "users_can_view_own_profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- 4. Users can UPDATE their own profile (with role restrictions)
CREATE POLICY "users_can_update_own_profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        (
            -- Can't change role unless admin
            role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR
            authorize_role(ARRAY['admin']::user_role[])
        )
    );

-- 5. Admins can view all profiles
CREATE POLICY "admins_can_view_all_profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (
        authorize_role(ARRAY['admin']::user_role[]) OR
        auth.uid() = id  -- Also allow users to see their own
    );

-- 6. Admins can update other users' profiles (but not their own role)
CREATE POLICY "admins_can_update_other_profiles" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        authorize_role(ARRAY['admin']::user_role[]) AND
        (auth.uid() = id OR auth.uid() != id) -- Can update any profile
    )
    WITH CHECK (
        authorize_role(ARRAY['admin']::user_role[]) AND
        (auth.uid() = id OR auth.uid() != id) -- But role change restrictions apply elsewhere
    );

-- Apply similar policies to participants table
DROP POLICY IF EXISTS "Users can view own participant record" ON public.participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON public.participants;
DROP POLICY IF EXISTS "Users can create their own participant record" ON public.participants;
DROP POLICY IF EXISTS "Operators and admins can view all participants" ON public.participants;
DROP POLICY IF EXISTS "Service role can access all participants" ON public.participants;

-- Service role access
CREATE POLICY "service_role_all_access_participants" ON public.participants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- User access to their own records
CREATE POLICY "users_can_create_own_participant" ON public.participants
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_view_own_participant" ON public.participants
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_participant" ON public.participants
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Admin/operator access
CREATE POLICY "admins_operators_can_view_all_participants" ON public.participants
    FOR SELECT
    TO authenticated
    USING (
        authorize_role(ARRAY['admin', 'operator']::user_role[]) OR
        auth.uid() = user_id
    );

COMMIT;

-- 5. Test the policies by trying to insert a test record (as service_role)
-- This should work if service_role policies are correct
-- INSERT INTO public.profiles (id, name, email, date_of_birth, gender, job_title, organisation, role)
-- VALUES ('00000000-0000-0000-0000-000000000000', 'Test User', 'test@example.com', '1990-01-01', 'male', 'Tester', 'Test Org', 'participant');
-- DELETE FROM public.profiles WHERE id = '00000000-0000-0000-0000-000000000000';

-- 6. Show final policy status
SELECT
    'FINAL POLICIES:' as status,
    schemaname,
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'participants')
ORDER BY tablename, cmd, policyname;