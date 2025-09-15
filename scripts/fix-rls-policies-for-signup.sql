-- Fix RLS policies to allow profile creation during signup
-- This addresses the "new row violates row-level security policy" error

BEGIN;

-- Drop existing restrictive policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and operators can manage roles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON public.profiles;

-- Create new policies that allow profile creation during signup

-- Allow users to INSERT their own profile (for signup)
CREATE POLICY "Users can create their own profile" ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Allow users to SELECT their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Allow users to UPDATE their own profile (but not change their role unless admin)
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id AND
        (
            -- Regular users can't change their role
            role = (SELECT role FROM public.profiles WHERE id = auth.uid()) OR
            -- Unless they're admin/operator
            authorize_role(ARRAY['admin', 'operator']::user_role[])
        )
    );

-- Admin users can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (authorize_role(ARRAY['admin']::user_role[]));

-- Admin users can update any user's role (but not their own role to prevent lockout)
CREATE POLICY "Admins can manage roles" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        authorize_role(ARRAY['admin']::user_role[]) AND
        auth.uid() != id
    )
    WITH CHECK (authorize_role(ARRAY['admin']::user_role[]));

-- Service role can access everything (for API operations)
CREATE POLICY "Service role can access all profiles" ON public.profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- Also fix participants table policies if needed
DROP POLICY IF EXISTS "Users can create their own participant record" ON public.participants;

-- Allow users to INSERT their own participant record (for signup)
CREATE POLICY "Users can create their own participant record" ON public.participants
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

COMMIT;

-- Test the policies by checking what they allow
SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'participants')
ORDER BY tablename, policyname;