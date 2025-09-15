-- Database setup for Longevity Fitness Games
-- This script creates the necessary tables and triggers for Supabase Auth integration

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (should already exist, but ensuring proper structure)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
    job_title TEXT NOT NULL,
    organisation TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create participants table (should already exist, but ensuring proper structure)
CREATE TABLE IF NOT EXISTS public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS participants_updated_at ON public.participants;
CREATE TRIGGER participants_updated_at
    BEFORE UPDATE ON public.participants
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Set up Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Service role can access all profiles" ON public.profiles;
CREATE POLICY "Service role can access all profiles" ON public.profiles
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for participants
DROP POLICY IF EXISTS "Users can view own participant record" ON public.participants;
CREATE POLICY "Users can view own participant record" ON public.participants
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own participant record" ON public.participants;
CREATE POLICY "Users can update own participant record" ON public.participants
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can access all participants" ON public.participants;
CREATE POLICY "Service role can access all participants" ON public.participants
    FOR ALL USING (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

-- Profiles table permissions
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- Participants table permissions
GRANT ALL ON public.participants TO postgres, service_role;
GRANT SELECT, INSERT, UPDATE ON public.participants TO authenticated;
GRANT SELECT ON public.participants TO anon;

-- Grant sequence permissions
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Create a function to handle new user signup (optional, for automated profile creation)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- This trigger function would automatically create profile records
    -- but we're handling this manually in the API for better control
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: We're not creating the trigger for automatic profile creation
-- because we want to handle it manually in the API for better error handling

COMMENT ON TABLE public.profiles IS 'User profile information linked to auth.users';
COMMENT ON TABLE public.participants IS 'Participant records for competition system';
COMMENT ON FUNCTION public.handle_updated_at() IS 'Automatically updates the updated_at column';
COMMENT ON FUNCTION public.handle_new_user() IS 'Function for handling new user creation (not currently triggered)';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON public.profiles(email);
CREATE INDEX IF NOT EXISTS participants_user_id_idx ON public.participants(user_id);

-- Show current table status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    hasindexes
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'participants');

SELECT
    schemaname,
    tablename,
    policyname,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'participants');