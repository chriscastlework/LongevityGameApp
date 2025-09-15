-- Fix participants table to auto-generate participant_code
-- This addresses the NOT NULL constraint violation

BEGIN;

-- First, check if the participant_code_seq sequence exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_sequences WHERE schemaname = 'public' AND sequencename = 'participant_code_seq') THEN
        CREATE SEQUENCE participant_code_seq START 1;
    END IF;
END
$$;

-- Create the trigger function to auto-generate participant_code
CREATE OR REPLACE FUNCTION trg_participant_code()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.participant_code IS NULL OR NEW.participant_code = '' THEN
        NEW.participant_code := 'LFG-' || to_char(nextval('participant_code_seq'), 'FM0000');
    END IF;
    RETURN NEW;
END;
$$;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS set_participant_code ON participants;
CREATE TRIGGER set_participant_code
    BEFORE INSERT ON participants
    FOR EACH ROW EXECUTE PROCEDURE trg_participant_code();

-- Check if participant_code column exists and is properly configured
DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'participants'
        AND table_schema = 'public'
        AND column_name = 'participant_code'
    ) THEN
        -- Add the column if it doesn't exist
        ALTER TABLE public.participants ADD COLUMN participant_code TEXT;
    END IF;

    -- Make it unique but allow NULL temporarily for existing records
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_name = 'participants'
        AND constraint_name = 'participants_participant_code_key'
    ) THEN
        -- Generate codes for existing records first
        UPDATE public.participants
        SET participant_code = 'LFG-' || to_char(nextval('participant_code_seq'), 'FM0000')
        WHERE participant_code IS NULL;

        -- Then add unique constraint
        ALTER TABLE public.participants ADD CONSTRAINT participants_participant_code_key UNIQUE (participant_code);
    END IF;
END
$$;

COMMIT;

-- Test the trigger by showing what would happen
SELECT 'Trigger test - next participant_code would be: LFG-' || to_char(nextval('participant_code_seq'), 'FM0000') as test_result;

-- Show table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'participants'
AND table_schema = 'public'
ORDER BY ordinal_position;