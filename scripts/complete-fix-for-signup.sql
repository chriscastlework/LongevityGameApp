-- Complete fix for signup - adds role system + fixes RLS
-- Run this in Supabase SQL Editor

BEGIN;

-- PART 1: Add role system (if not already done)
-- Create role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('participant', 'operator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'participant';

-- Set default for existing records
UPDATE public.profiles
SET role = 'participant'::user_role
WHERE role IS NULL;

-- Make role NOT NULL after data migration
ALTER TABLE public.profiles
ALTER COLUMN role SET NOT NULL;

-- PART 2: Fix RLS policies for service role access

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON public.profiles;
DROP POLICY IF EXISTS "service_role_all_access" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own participant record" ON public.participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON public.participants;
DROP POLICY IF EXISTS "Service role can access all participants" ON public.participants;
DROP POLICY IF EXISTS "service_role_all_access_participants" ON public.participants;

-- Create service role policies that allow API operations
CREATE POLICY "service_role_bypass_rls_profiles" ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_bypass_rls_participants" ON public.participants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create user policies (for when users access directly)
CREATE POLICY "authenticated_users_own_profile" ON public.profiles
    FOR ALL
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "authenticated_users_own_participant" ON public.participants
    FOR ALL
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

COMMIT;

-- Test that the role column exists and has the right type
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND table_schema = 'public'
AND column_name = 'role';

-- Show final policies
SELECT
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'participants')
ORDER BY tablename, policyname;