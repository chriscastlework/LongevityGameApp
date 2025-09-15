-- Final signup fix - combines all necessary fixes
-- This script must be run in Supabase SQL Editor

BEGIN;

-- STEP 1: Add participant_code auto-generation
-- Create sequence if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'participant_code_seq') THEN
        CREATE SEQUENCE participant_code_seq START 1;
    END IF;
END
$$;

-- Create trigger function
CREATE OR REPLACE FUNCTION trg_participant_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.participant_code IS NULL OR NEW.participant_code = '' THEN
        NEW.participant_code := 'LFG-' || to_char(nextval('participant_code_seq'), 'FM0000');
    END IF;
    RETURN NEW;
END;
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS set_participant_code ON participants;
CREATE TRIGGER set_participant_code
    BEFORE INSERT ON participants
    FOR EACH ROW EXECUTE PROCEDURE trg_participant_code();

-- Add participant_code column if not exists and update existing records
DO $$
BEGIN
    -- Add column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants'
        AND table_schema = 'public'
        AND column_name = 'participant_code'
    ) THEN
        ALTER TABLE public.participants ADD COLUMN participant_code TEXT;
    END IF;

    -- Generate codes for existing records
    UPDATE public.participants
    SET participant_code = 'LFG-' || to_char(nextval('participant_code_seq'), 'FM0000')
    WHERE participant_code IS NULL;

    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'participants'
        AND constraint_name = 'participants_participant_code_key'
    ) THEN
        ALTER TABLE public.participants ADD CONSTRAINT participants_participant_code_key UNIQUE (participant_code);
    END IF;
END
$$;

-- STEP 2: Ensure role system exists
-- Create role enum type if not exists
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('participant', 'operator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add role column if not exists
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'participant';

-- Update existing records
UPDATE public.profiles
SET role = 'participant'::user_role
WHERE role IS NULL;

-- Make role NOT NULL
ALTER TABLE public.profiles
ALTER COLUMN role SET NOT NULL;

-- STEP 3: Fix RLS policies for API access
-- Drop all existing policies to start clean
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON public.profiles;
DROP POLICY IF EXISTS "service_role_all_access" ON public.profiles;
DROP POLICY IF EXISTS "service_role_bypass_rls_profiles" ON public.profiles;
DROP POLICY IF EXISTS "authenticated_users_own_profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view own participant record" ON public.participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON public.participants;
DROP POLICY IF EXISTS "Service role can access all participants" ON public.participants;
DROP POLICY IF EXISTS "service_role_all_access_participants" ON public.participants;
DROP POLICY IF EXISTS "service_role_bypass_rls_participants" ON public.participants;
DROP POLICY IF EXISTS "authenticated_users_own_participant" ON public.participants;

-- Create service role policies (for API operations)
CREATE POLICY "service_role_all_access" ON public.profiles
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "service_role_all_access_participants" ON public.participants
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Create authenticated user policies (for direct access)
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

-- Verify the setup
SELECT 'Setup verification:' as status;

-- Check participant_code column exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'participants'
            AND table_schema = 'public'
            AND column_name = 'participant_code'
        ) THEN '✅ participant_code column exists'
        ELSE '❌ participant_code column missing'
    END as participant_code_check;

-- Check role column exists
SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'profiles'
            AND table_schema = 'public'
            AND column_name = 'role'
        ) THEN '✅ role column exists'
        ELSE '❌ role column missing'
    END as role_check;

-- Check RLS policies
SELECT
    tablename,
    policyname,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'participants')
ORDER BY tablename, policyname;

-- Test trigger function
SELECT 'Next participant_code will be: LFG-' || to_char(nextval('participant_code_seq'), 'FM0000') as trigger_test;