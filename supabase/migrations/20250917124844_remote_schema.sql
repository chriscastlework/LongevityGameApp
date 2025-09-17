
\restrict YEMqs7iNGVObr1iJlwQc0VPEPaoXb474dWFraHGFIZzNCu2jP6BAoQrNrznTLmy


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE TYPE "public"."user_role" AS ENUM (
    'participant',
    'operator',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."authorize_role"("required_roles" "public"."user_role"[]) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."authorize_role"("required_roles" "public"."user_role"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."compute_scores_for_participant"("p_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
declare
  rec participants%rowtype;
  dom_grip numeric(5,2);
  abn_count int := 0;
  s_balance int;
  s_breath int;
  s_grip int;
  s_health int;
  t_total int;
  t_grade text;
begin
  select * into rec from participants where id = p_id;
  if not found then
    raise exception 'Participant % not found', p_id;
  end if;

  -- Balance
  if rec.balance_seconds is null then
    s_balance := null;
  else
    if rec.balance_seconds < 10 then s_balance := 1;
    elsif rec.balance_seconds <= 30 then s_balance := 2;
    else s_balance := 3;
    end if;
  end if;

  -- Breath
  if rec.breath_seconds is null then
    s_breath := null;
  else
    if rec.breath_seconds < 20 then s_breath := 1;
    elsif rec.breath_seconds <= 40 then s_breath := 2;
    else s_breath := 3;
    end if;
  end if;

  -- Grip (dominant + gender)
  if rec.grip_left_kg is null and rec.grip_right_kg is null then
    s_grip := null;
  else
    dom_grip := greatest(coalesce(rec.grip_left_kg,0), coalesce(rec.grip_right_kg,0));
    if rec.gender = 'male' then
      if dom_grip < 30 then s_grip := 1;
      elsif dom_grip <= 40 then s_grip := 2;
      else s_grip := 3;
      end if;
    elsif rec.gender = 'female' then
      if dom_grip < 20 then s_grip := 1;
      elsif dom_grip <= 27 then s_grip := 2;
      else s_grip := 3;
      end if;
    else
      if dom_grip < 25 then s_grip := 1;
      elsif dom_grip <= 35 then s_grip := 2;
      else s_grip := 3;
      end if;
    end if;
  end if;

  -- Health (abnormal count over available metrics)
  abn_count := 0;

  if rec.bp_systolic is not null and rec.bp_diastolic is not null then
    if rec.bp_systolic >= 140 or rec.bp_diastolic >= 90 then
      abn_count := abn_count + 1;
    end if;
  end if;

  if rec.pulse is not null then
    if rec.pulse < 50 or rec.pulse > 100 then
      abn_count := abn_count + 1;
    end if;
  end if;

  if rec.bmi is not null then
    if rec.bmi < 18.5 or rec.bmi >= 30 then
      abn_count := abn_count + 1;
    end if;
  end if;

  if rec.spo2 is not null then
    if rec.spo2 < 95 then
      abn_count := abn_count + 1;
    end if;
  end if;

  if rec.fat_pct is not null then
    if rec.gender = 'male' and rec.fat_pct > 25 then
      abn_count := abn_count + 1;
    elsif rec.gender = 'female' and rec.fat_pct > 32 then
      abn_count := abn_count + 1;
    elsif rec.gender = 'other' and rec.fat_pct > 28 then
      abn_count := abn_count + 1;
    end if;
  end if;

  if rec.bp_systolic is null and rec.bp_diastolic is null and rec.pulse is null
     and rec.bmi is null and rec.spo2 is null and rec.fat_pct is null then
    s_health := null;
  else
    if abn_count >= 2 then s_health := 1;
    elsif abn_count = 1 then s_health := 2;
    else s_health := 3;
    end if;
  end if;

  -- Total & Grade (if all four subscores present)
  if s_balance is not null and s_breath is not null and s_grip is not null and s_health is not null then
    t_total := s_balance + s_breath + s_grip + s_health;
    if t_total between 1 and 5 then t_grade := 'Bad';
    elsif t_total between 6 and 9 then t_grade := 'Average';
    else t_grade := 'Above Average';
    end if;
  else
    t_total := null;
    t_grade := null;
  end if;

  update participants set
    score_balance = s_balance,
    score_breath  = s_breath,
    score_grip    = s_grip,
    score_health  = s_health,
    total_score   = t_total,
    grade         = t_grade
  where id = p_id;
end;
$$;


ALTER FUNCTION "public"."compute_scores_for_participant"("p_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_participant_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate a 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));
    
    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM public.participants WHERE participant_code = code) INTO exists_check;
    
    -- If code doesn't exist, return it
    IF NOT exists_check THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."generate_participant_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS "public"."user_role"
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
    SELECT role FROM public.profiles WHERE id = user_id;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    name, 
    email, 
    date_of_birth, 
    gender, 
    job_title, 
    organisation,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'name', ''),
    NEW.email,
    CASE 
      WHEN NEW.raw_user_meta_data ->> 'date_of_birth' IS NOT NULL 
      THEN (NEW.raw_user_meta_data ->> 'date_of_birth')::date 
      ELSE NULL 
    END,
    COALESCE(NEW.raw_user_meta_data ->> 'gender', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'job_title', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'organisation', ''),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."public_leaderboard"("limit_count" integer DEFAULT 200) RETURNS TABLE("rank" integer, "participant_code" "text", "full_name" "text", "organization" "text", "gender" "text", "score_balance" integer, "score_breath" integer, "score_grip" integer, "score_health" integer, "total_score" integer, "grade" "text", "created_at" timestamp with time zone)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    l.rank,
    l.participant_code,
    l.full_name,
    l.organization,
    l.gender,
    l.score_balance,
    l.score_breath,
    l.score_grip,
    l.score_health,
    l.total_score,
    l.grade,
    l.created_at
  from leaderboard_view l
  order by l.rank
  limit limit_count;
$$;


ALTER FUNCTION "public"."public_leaderboard"("limit_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."set_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_compute_scores"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
  perform compute_scores_for_participant(new.id);
  return new;
end;
$$;


ALTER FUNCTION "public"."trg_compute_scores"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."trg_participant_code"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF NEW.participant_code IS NULL OR NEW.participant_code = '' THEN
        NEW.participant_code := 'LFG-' || to_char(nextval('participant_code_seq'), 'FM0000');
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."trg_participant_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."health_assessments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "assessment_data" "jsonb" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."health_assessments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."participant_code_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."participant_code_seq" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "participant_code" "text" NOT NULL,
    "agreement_accepted" boolean DEFAULT false,
    "agreement_accepted_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "date_of_birth" "date" NOT NULL,
    "gender" "text" NOT NULL,
    "job_title" "text" NOT NULL,
    "organisation" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "role" "public"."user_role" DEFAULT 'participant'::"public"."user_role" NOT NULL,
    CONSTRAINT "profiles_gender_check" CHECK (("gender" = ANY (ARRAY['male'::"text", 'female'::"text", 'other'::"text", 'prefer_not_to_say'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "station_id" "uuid" NOT NULL,
    "operator_id" "uuid" NOT NULL,
    "score" numeric(10,2) NOT NULL,
    "notes" "text",
    "recorded_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."results" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."station_operators" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "station_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."station_operators" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."station_results" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "participant_id" "uuid" NOT NULL,
    "station_id" "uuid" NOT NULL,
    "station_type" "text" NOT NULL,
    "measurements" "jsonb" NOT NULL,
    "recorded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."station_results" OWNER TO "postgres";


COMMENT ON TABLE "public"."station_results" IS 'Stores measurement data from fitness stations for participants';



COMMENT ON COLUMN "public"."station_results"."station_type" IS 'Type of station (balance, breath, grip, health) for quick filtering';



COMMENT ON COLUMN "public"."station_results"."measurements" IS 'JSONB field containing station-specific measurement data (e.g., balance_seconds, grip_left_kg, etc.)';



COMMENT ON COLUMN "public"."station_results"."recorded_by" IS 'User ID of the operator who recorded these measurements';



CREATE TABLE IF NOT EXISTS "public"."stations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "icon_name" "text" DEFAULT 'Activity'::"text",
    "color_class" "text" DEFAULT 'bg-blue-500'::"text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()),
    "station_type" "text"
);


ALTER TABLE "public"."stations" OWNER TO "postgres";


ALTER TABLE ONLY "public"."health_assessments"
    ADD CONSTRAINT "health_assessments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_participant_code_key" UNIQUE ("participant_code");



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_participant_id_station_id_key" UNIQUE ("participant_id", "station_id");



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."station_operators"
    ADD CONSTRAINT "station_operators_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."station_operators"
    ADD CONSTRAINT "station_operators_user_id_station_id_key" UNIQUE ("user_id", "station_id");



ALTER TABLE ONLY "public"."station_results"
    ADD CONSTRAINT "station_results_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."stations"
    ADD CONSTRAINT "stations_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_health_assessments_participant_id" ON "public"."health_assessments" USING "btree" ("participant_id");



CREATE INDEX "idx_participants_code" ON "public"."participants" USING "btree" ("participant_code");



CREATE INDEX "idx_participants_user_id" ON "public"."participants" USING "btree" ("user_id");



CREATE INDEX "idx_results_participant_id" ON "public"."results" USING "btree" ("participant_id");



CREATE INDEX "idx_results_station_id" ON "public"."results" USING "btree" ("station_id");



CREATE INDEX "idx_station_operators_station_id" ON "public"."station_operators" USING "btree" ("station_id");



CREATE INDEX "idx_station_operators_user_id" ON "public"."station_operators" USING "btree" ("user_id");



CREATE INDEX "idx_station_results_created_at" ON "public"."station_results" USING "btree" ("created_at");



CREATE INDEX "idx_station_results_participant_id" ON "public"."station_results" USING "btree" ("participant_id");



CREATE INDEX "idx_station_results_recorded_by" ON "public"."station_results" USING "btree" ("recorded_by");



CREATE INDEX "idx_station_results_station_id" ON "public"."station_results" USING "btree" ("station_id");



CREATE INDEX "idx_station_results_station_type" ON "public"."station_results" USING "btree" ("station_type");



CREATE INDEX "profiles_role_idx" ON "public"."profiles" USING "btree" ("role");



CREATE OR REPLACE TRIGGER "set_participant_code" BEFORE INSERT ON "public"."participants" FOR EACH ROW EXECUTE FUNCTION "public"."trg_participant_code"();



CREATE OR REPLACE TRIGGER "stations_updated_at" BEFORE UPDATE ON "public"."stations" FOR EACH ROW EXECUTE FUNCTION "public"."handle_updated_at"();



CREATE OR REPLACE TRIGGER "update_station_results_updated_at" BEFORE UPDATE ON "public"."station_results" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."health_assessments"
    ADD CONSTRAINT "health_assessments_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."participants"
    ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_operator_id_fkey" FOREIGN KEY ("operator_id") REFERENCES "public"."station_operators"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."results"
    ADD CONSTRAINT "results_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_operators"
    ADD CONSTRAINT "station_operators_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_operators"
    ADD CONSTRAINT "station_operators_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_results"
    ADD CONSTRAINT "station_results_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_results"
    ADD CONSTRAINT "station_results_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."station_results"
    ADD CONSTRAINT "station_results_station_id_fkey" FOREIGN KEY ("station_id") REFERENCES "public"."stations"("id") ON DELETE CASCADE;



CREATE POLICY "Operators can manage station_results" ON "public"."station_results" USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['operator'::"public"."user_role", 'admin'::"public"."user_role"]))))));



CREATE POLICY "Service role can access all station_results" ON "public"."station_results" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can read their own station_results" ON "public"."station_results" FOR SELECT USING (("auth"."uid"() IN ( SELECT "participants"."user_id"
   FROM "public"."participants"
  WHERE ("participants"."id" = "station_results"."participant_id")
UNION
 SELECT "station_results"."recorded_by")));



CREATE POLICY "admins_can_update_other_profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("public"."authorize_role"(ARRAY['admin'::"public"."user_role"]) AND (("auth"."uid"() = "id") OR ("auth"."uid"() <> "id")))) WITH CHECK (("public"."authorize_role"(ARRAY['admin'::"public"."user_role"]) AND (("auth"."uid"() = "id") OR ("auth"."uid"() <> "id"))));



CREATE POLICY "admins_can_view_all_profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."authorize_role"(ARRAY['admin'::"public"."user_role"]) OR ("auth"."uid"() = "id")));



CREATE POLICY "admins_operators_can_view_all_participants" ON "public"."participants" FOR SELECT TO "authenticated" USING (("public"."authorize_role"(ARRAY['admin'::"public"."user_role", 'operator'::"public"."user_role"]) OR ("auth"."uid"() = "user_id")));



CREATE POLICY "authenticated_users_own_participant" ON "public"."participants" TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "authenticated_users_own_profile" ON "public"."profiles" TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK (("auth"."uid"() = "id"));



ALTER TABLE "public"."health_assessments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "health_assessments_insert_own" ON "public"."health_assessments" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "health_assessments"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "health_assessments_select_own" ON "public"."health_assessments" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "health_assessments"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "health_assessments_update_own" ON "public"."health_assessments" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "health_assessments"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."participants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "participants_delete_own" ON "public"."participants" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "participants_insert_own" ON "public"."participants" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "participants_select_by_operators" ON "public"."participants" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."station_operators" "so"
  WHERE ("so"."user_id" = "auth"."uid"()))));



CREATE POLICY "participants_select_own" ON "public"."participants" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "participants_update_own" ON "public"."participants" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete_own" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_insert_own" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select_own" ON "public"."profiles" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_update_own" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



ALTER TABLE "public"."results" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "results_insert_operator" ON "public"."results" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."station_operators" "so"
  WHERE (("so"."id" = "results"."operator_id") AND ("so"."user_id" = "auth"."uid"())))));



CREATE POLICY "results_select_operator" ON "public"."results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."station_operators" "so"
  WHERE (("so"."id" = "results"."operator_id") AND ("so"."user_id" = "auth"."uid"())))));



CREATE POLICY "results_select_participant" ON "public"."results" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."participants" "p"
  WHERE (("p"."id" = "results"."participant_id") AND ("p"."user_id" = "auth"."uid"())))));



CREATE POLICY "results_update_operator" ON "public"."results" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."station_operators" "so"
  WHERE (("so"."id" = "results"."operator_id") AND ("so"."user_id" = "auth"."uid"())))));



CREATE POLICY "service_role_all_access" ON "public"."profiles" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "service_role_all_access_participants" ON "public"."participants" TO "service_role" USING (true) WITH CHECK (true);



ALTER TABLE "public"."station_operators" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "station_operators_delete_own" ON "public"."station_operators" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "station_operators_insert_own" ON "public"."station_operators" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "station_operators_select_own" ON "public"."station_operators" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "station_operators_update_own" ON "public"."station_operators" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."station_results" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."stations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "stations_select_all" ON "public"."stations" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "users_can_create_own_participant" ON "public"."participants" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_create_own_profile" ON "public"."profiles" FOR INSERT TO "authenticated" WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "users_can_update_own_participant" ON "public"."participants" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_update_own_profile" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("auth"."uid"() = "id")) WITH CHECK ((("auth"."uid"() = "id") AND (("role" = ( SELECT "profiles_1"."role"
   FROM "public"."profiles" "profiles_1"
  WHERE ("profiles_1"."id" = "auth"."uid"()))) OR "public"."authorize_role"(ARRAY['admin'::"public"."user_role"]))));



CREATE POLICY "users_can_view_own_participant" ON "public"."participants" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_can_view_own_profile" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("auth"."uid"() = "id"));





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."authorize_role"("required_roles" "public"."user_role"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."authorize_role"("required_roles" "public"."user_role"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."authorize_role"("required_roles" "public"."user_role"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."compute_scores_for_participant"("p_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."compute_scores_for_participant"("p_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."compute_scores_for_participant"("p_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_participant_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_participant_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_participant_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."public_leaderboard"("limit_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."public_leaderboard"("limit_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."public_leaderboard"("limit_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."set_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") TO "anon";
GRANT ALL ON FUNCTION "public"."set_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_role"("target_user_id" "uuid", "new_role" "public"."user_role") TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_compute_scores"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_compute_scores"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_compute_scores"() TO "service_role";



GRANT ALL ON FUNCTION "public"."trg_participant_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."trg_participant_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."trg_participant_code"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."health_assessments" TO "anon";
GRANT ALL ON TABLE "public"."health_assessments" TO "authenticated";
GRANT ALL ON TABLE "public"."health_assessments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."participant_code_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."participant_code_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."participant_code_seq" TO "service_role";



GRANT ALL ON TABLE "public"."participants" TO "anon";
GRANT ALL ON TABLE "public"."participants" TO "authenticated";
GRANT ALL ON TABLE "public"."participants" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."results" TO "anon";
GRANT ALL ON TABLE "public"."results" TO "authenticated";
GRANT ALL ON TABLE "public"."results" TO "service_role";



GRANT ALL ON TABLE "public"."station_operators" TO "anon";
GRANT ALL ON TABLE "public"."station_operators" TO "authenticated";
GRANT ALL ON TABLE "public"."station_operators" TO "service_role";



GRANT ALL ON TABLE "public"."station_results" TO "anon";
GRANT ALL ON TABLE "public"."station_results" TO "authenticated";
GRANT ALL ON TABLE "public"."station_results" TO "service_role";



GRANT ALL ON TABLE "public"."stations" TO "anon";
GRANT ALL ON TABLE "public"."stations" TO "authenticated";
GRANT ALL ON TABLE "public"."stations" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























\unrestrict YEMqs7iNGVObr1iJlwQc0VPEPaoXb474dWFraHGFIZzNCu2jP6BAoQrNrznTLmy

RESET ALL;
