-- Remove participant code trigger and related objects
-- This moves participant code generation from database trigger to API logic

-- Drop the trigger first
DROP TRIGGER IF EXISTS "set_participant_code" ON "public"."participants";

-- Drop the trigger function
DROP FUNCTION IF EXISTS "public"."trg_participant_code"();

-- Keep the generate_participant_code function as it's still useful for API calls
-- Keep the participant_code_seq sequence as it's used by generate_participant_code
-- Keep the participant_code column and constraints as they're still needed

-- Note: The generate_participant_code() function and participant_code_seq sequence
-- are preserved for use in the API layer for generating participant codes