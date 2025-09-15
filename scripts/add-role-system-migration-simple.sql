-- Simple migration to add role-based access control system
-- Works whether is_admin column exists or not

BEGIN;

-- 1. Create role enum type
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('participant', 'operator', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Add role column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'participant';

-- 3. Migrate existing data if is_admin column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public'
               AND table_name = 'profiles'
               AND column_name = 'is_admin') THEN
        -- Migrate existing is_admin data
        UPDATE public.profiles
        SET role = CASE
            WHEN is_admin = true THEN 'admin'::user_role
            ELSE 'participant'::user_role
        END
        WHERE role IS NULL;
    ELSE
        -- No is_admin column, just set default for existing records
        UPDATE public.profiles
        SET role = 'participant'::user_role
        WHERE role IS NULL;
    END IF;
END
$$;

-- 4. Make role NOT NULL after data migration
ALTER TABLE public.profiles
ALTER COLUMN role SET NOT NULL;

-- 5. Create function to get user role
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role;

-- 6. Create function to authorize user actions based on role
CREATE OR REPLACE FUNCTION public.authorize_role(required_roles user_role[])
RETURNS boolean
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    user_role_value user_role;
BEGIN
    -- Get the current user's role
    SELECT role INTO user_role_value
    FROM public.profiles
    WHERE id = auth.uid();

    -- Check if user has one of the required roles
    RETURN user_role_value = ANY(required_roles);
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.authorize_role(user_role[]) TO authenticated, service_role;

-- 7. Drop old RLS policies (if they exist)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can access all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins and operators can manage roles" ON public.profiles;

-- 8. Create new RLS policies using role-based authorization
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id AND role = (SELECT role FROM public.profiles WHERE id = auth.uid()));

-- Admin users can view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT
    TO authenticated
    USING (authorize_role(ARRAY['admin']::user_role[]));

-- Admin and operator users can update user roles (but not their own role to prevent lockout)
CREATE POLICY "Admins and operators can manage roles" ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (authorize_role(ARRAY['admin', 'operator']::user_role[]) AND auth.uid() != id)
    WITH CHECK (authorize_role(ARRAY['admin', 'operator']::user_role[]));

-- Service role can access everything
CREATE POLICY "Service role can access all profiles" ON public.profiles
    FOR ALL
    USING (auth.role() = 'service_role');

-- 9. Update participants table policies to use role system
DROP POLICY IF EXISTS "Users can view own participant record" ON public.participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON public.participants;
DROP POLICY IF EXISTS "Service role can access all participants" ON public.participants;
DROP POLICY IF EXISTS "Operators and admins can view all participants" ON public.participants;

CREATE POLICY "Users can view own participant record" ON public.participants
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own participant record" ON public.participants
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Operators and admins can view all participant records
CREATE POLICY "Operators and admins can view all participants" ON public.participants
    FOR SELECT
    TO authenticated
    USING (authorize_role(ARRAY['admin', 'operator']::user_role[]));

-- Service role can access everything
CREATE POLICY "Service role can access all participants" ON public.participants
    FOR ALL
    USING (auth.role() = 'service_role');

-- 10. Add index for role-based queries
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles(role);

-- 11. Create function to set user role (admin only)
CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id uuid, new_role user_role)
RETURNS boolean
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if current user is admin
    IF NOT authorize_role(ARRAY['admin']::user_role[]) THEN
        RAISE EXCEPTION 'Insufficient privileges to change user roles';
    END IF;

    -- Prevent admins from changing their own role (to prevent lockout)
    IF target_user_id = auth.uid() THEN
        RAISE EXCEPTION 'Cannot change your own role';
    END IF;

    -- Update the role
    UPDATE public.profiles
    SET role = new_role, updated_at = now()
    WHERE id = target_user_id;

    RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_user_role(uuid, user_role) TO authenticated;

COMMIT;

-- Show current role distribution
SELECT role, COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY role;