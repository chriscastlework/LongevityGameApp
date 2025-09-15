-- Longevity Fitness Games – Supabase Migration
-- Date: 2025-09-14
-- Safe to run in Supabase SQL editor or as a migration. Idempotent where possible.

-----------------------------
-- 0) Extensions
-----------------------------
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-----------------------------
-- 1) Sequences
-----------------------------
-- Participant code sequence -> LFG-0001, LFG-0002, ...
create sequence if not exists participant_code_seq start 1;

-----------------------------
-- 2) Tables
-----------------------------
-- Drop statements (UNCOMMENT for full reset)
-- drop view if exists leaderboard_view;
-- drop function if exists public.public_leaderboard(limit_count int);
-- drop table if exists station_audits cascade;
-- drop table if exists participants cascade;

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- Identity & contact
  full_name text not null,
  age int not null check (age between 10 and 95),
  gender text not null check (gender in ('male','female','other')),
  job_title text,
  organization text,
  email text,
  phone text,

  -- Consent & signature
  consent_wellness bool not null,
  consent_liability bool not null,
  consent_data bool not null,
  signature text not null, -- store data URL or a storage path

  -- Station raw values
  balance_seconds int check (balance_seconds between 0 and 60),
  breath_seconds int check (breath_seconds between 0 and 120),
  grip_left_kg numeric(5,2) check (grip_left_kg between 0 and 120),
  grip_right_kg numeric(5,2) check (grip_right_kg between 0 and 120),
  bp_systolic int check (bp_systolic between 70 and 220),
  bp_diastolic int check (bp_diastolic between 40 and 140),
  pulse int check (pulse between 30 and 200),
  bmi numeric(5,2) check (bmi between 10 and 60),
  muscle_pct numeric(5,2) check (muscle_pct between 0 and 80),
  fat_pct numeric(5,2) check (fat_pct between 0 and 80),
  spo2 int check (spo2 between 70 and 100),

  -- Derived scoring
  score_balance int check (score_balance between 1 and 3),
  score_breath int check (score_breath between 1 and 3),
  score_grip int check (score_grip between 1 and 3),
  score_health int check (score_health between 1 and 3),
  total_score int check (total_score between 4 and 12),
  grade text check (grade in ('Bad','Average','Above Average')),

  participant_code text unique
);

create table if not exists station_audits (
  id bigserial primary key,
  participant_id uuid not null references participants(id) on delete cascade,
  station text not null check (station in ('balance','breath','grip','health')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  actor text
);

-----------------------------
-- 3) Trigger: generate participant_code (LFG-XXXX)
-----------------------------
create or replace function trg_participant_code()
returns trigger language plpgsql as $$
begin
  if new.participant_code is null or new.participant_code = '' then
    new.participant_code := 'LFG-' || to_char(nextval('participant_code_seq'), 'FM0000');
  end if;
  return new;
end;
$$;

drop trigger if exists set_participant_code on participants;
create trigger set_participant_code
before insert on participants
for each row execute procedure trg_participant_code();

-----------------------------
-- 4) Scoring function + trigger
-----------------------------
create or replace function compute_scores_for_participant(p_id uuid)
returns void language plpgsql as $$
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

-- Trigger to recompute scores after relevant updates
create or replace function trg_compute_scores()
returns trigger language plpgsql as $$
begin
  perform compute_scores_for_participant(new.id);
  return new;
end;
$$;

drop trigger if exists recompute_scores on participants;
create trigger recompute_scores
after insert or update of
  balance_seconds, breath_seconds, grip_left_kg, grip_right_kg,
  bp_systolic, bp_diastolic, pulse, bmi, muscle_pct, fat_pct, spo2,
  gender
on participants
for each row execute procedure trg_compute_scores();

-----------------------------
-- 5) Leaderboard view
-----------------------------
create or replace view leaderboard_view as
select
  p.id,
  p.participant_code,
  p.full_name,
  p.organization,
  p.gender,
  p.score_balance,
  p.score_breath,
  p.score_grip,
  p.score_health,
  p.total_score,
  p.grade,
  p.created_at,
  row_number() over (
    order by p.total_score desc nulls last,
             p.score_grip desc nulls last,
             p.created_at asc
  ) as rank
from participants p
where p.total_score is not null;

-----------------------------
-- 6) Public leaderboard function (limited columns, SECURITY DEFINER)
-----------------------------
create or replace function public_leaderboard(limit_count int default 200)
returns table(
  rank int,
  participant_code text,
  full_name text,
  organization text,
  gender text,
  score_balance int,
  score_breath int,
  score_grip int,
  score_health int,
  total_score int,
  grade text,
  created_at timestamptz
) language sql security definer set search_path=public as $$
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

grant execute on function public_leaderboard(int) to anon, authenticated;

-----------------------------
-- 7) RLS Policies
-----------------------------
-- Enable RLS on base tables (service role bypasses RLS automatically)
alter table participants enable row level security;
alter table station_audits enable row level security;

-- Deny all by default
drop policy if exists participants_noop_all on participants;
create policy participants_noop_all on participants for all using (false);

drop policy if exists station_audits_noop_all on station_audits;
create policy station_audits_noop_all on station_audits for all using (false);

-- (Optional) If you want authenticated users to read their own records, add policies here.
-- For this event app we rely on server routes + service role for writes
-- and the SECURITY DEFINER function for public leaderboard access.

-----------------------------
-- 8) Indexes
-----------------------------
create index if not exists idx_participants_created_at on participants(created_at);
create index if not exists idx_participants_total_score on participants(total_score desc, score_grip desc, created_at asc);
