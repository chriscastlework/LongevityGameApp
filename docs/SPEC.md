# Longevity Fitness Games – Next.js + Supabase App Specification

**Date:** 14 Sep 2025
**Event:** Disruptive Doctors Conference (20–21 Sep 2025)
**Owner:** Dr. Aiesha Medical Fitness
**Tech:** Next.js 14 (App Router), TypeScript, Tailwind, Radix UI, Supabase (Postgres + Auth), TanStack Query, React Hook Form + Zod, Playwright.

---

## 1) Goals & Non‑Functional Requirements

**Goals**

- Fast, booth‑friendly app for sign‑ups, station data entry, instant scoring, leaderboard, and export.
- QR‑driven navigation to reduce typing and errors.
- Simple, standardized scoring (Bad / Average / Above Average) with clear grand‑prize ranking.

**Non‑functional**

- Privacy by design (no PII in QR codes; short retention).
- Works offline-tolerant (graceful to flaky Wi‑Fi; retries).
- Accessible (WCAG AA: contrast, labels, large tap targets).
- Performance: ≤2s TTI on modern phones; CRUD <300ms on LAN.

---

## 2) User Roles & Flows (High Level)

**Roles**

- **Participant:** signs up, completes 4 stations, views result.
- **Station Operator (PT):** scans badge, inputs station results.
- **Admin (Dr. Aiesha / staff):** monitors leaderboard, edits mistakes, exports CSV.

**Happy Path**

1. Participant registers → receives **Participant Code + QR**.
2. At each station, operator taps **Scan**, scans participant QR → proper form opens, saves result.
3. After 4 stations, **Finish & See Score** → results page → package CTA.
4. Leaderboard shows top scores; ties broken by Grip then timestamp.

---

## 3) QR Deep Link Design

**Badge QR content:** short URL with query params:
`/s?pid=<ULID>&ts=<ISO8601>&sig=<HMAC>&goto=<balance|breath|grip|health|stations|results>`

- **pid**: Participant ULID/UUID (database id).
- **ts**: ISO timestamp when link generated.
- **sig**: `HMAC-SHA256(base64url(pid + ":" + ts), QR_SIGNING_SECRET)`
- **goto**: Optional station shortcut. Defaults to `/stations`.

**Validation**

- On route load, server verifies **sig** and **ts** (expiry window: 48h).
- If invalid/expired → show error + manual **Participant Code** fallback input.

**Security**

- No PII in QR; QR_SIGNING_SECRET stored server‑side only.
- All data writes via server routes using Supabase service role (not exposed to client).

---

## 4) Data Model (Supabase)

### 4.1 Tables

**participants**

- `id uuid default gen_random_uuid() primary key`
- `created_at timestamptz default now()`
- Identity & contact: `full_name text`, `age int`, `gender text check (gender in ('male','female','other'))`, `job_title text`, `organization text`, `email text`, `phone text`
- Consent & signature: `consent_wellness bool`, `consent_liability bool`, `consent_data bool`, `signature text` (base64 data URL or storage path)
- Raw station values:
  `balance_seconds int`, `breath_seconds int`, `grip_left_kg numeric(5,2)`, `grip_right_kg numeric(5,2)`,
  `bp_systolic int`, `bp_diastolic int`, `pulse int`, `bmi numeric(5,2)`, `muscle_pct numeric(5,2)`, `fat_pct numeric(5,2)`, `spo2 int`
- Derived:
  `score_balance int`, `score_breath int`, `score_grip int`, `score_health int`, `total_score int`, `grade text check (grade in ('Bad','Average','Above Average'))`,
  `participant_code text unique` (e.g., LFG-0042)

**station_audits** (optional, for audit trail)

- `id bigserial primary key`
- `participant_id uuid references participants(id) on delete cascade`
- `station text check (station in ('balance','breath','grip','health'))`
- `payload jsonb`
- `created_at timestamptz default now()`
- `actor text` (device or operator id)

### 4.2 Generated helpers (view)

**leaderboard_view** (computed for fast ranking)

- Rank by `total_score desc`, tie‑breaker `score_grip desc`, then `created_at asc`.

### 4.3 SQL DDL (idempotent)

```sql
-- Enable extensions
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Drop (only for clean dev resets)
-- drop table if exists station_audits cascade;
-- drop table if exists participants cascade;

create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  age int not null check (age between 10 and 95),
  gender text not null check (gender in ('male','female','other')),
  job_title text,
  organization text,
  email text,
  phone text,
  consent_wellness bool not null,
  consent_liability bool not null,
  consent_data bool not null,
  signature text not null,
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

-- View for leaderboard (recomputes on read; or compute in app and persist)
create or replace view leaderboard_view as
select p.*,
  row_number() over (
    order by p.total_score desc nulls last,
             p.score_grip desc nulls last,
             p.created_at asc
  ) as rank
from participants p
where p.total_score is not null;
```

### 4.4 RLS Policies (recommended)

Enable RLS and force access via server (service key) for writes. Public read only for leaderboard (no PII fields if desired).

```sql
alter table participants enable row level security;
alter table station_audits enable row level security;

-- Deny all by default
create policy participants_noop on participants for all using (false);
create policy station_audits_noop on station_audits for all using (false);

-- Public read of leaderboard subset (optional): create a view with limited columns and expose that via Edge Function or API route.
```

---

## 5) Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server only
QR_SIGNING_SECRET=           # HMAC secret for deep links
ADMIN_PASSWORD=              # basic admin gate
APP_BASE_URL=                # e.g. https://lfg.example.com
```

---

## 6) API Contract (Next.js Route Handlers)

**All writes go through server routes** that validate HMAC and business rules, then use `SUPABASE_SERVICE_ROLE_KEY` to perform DB ops.

- **POST `/api/participants`**
  Create participant after consent + signature.
  **Body:** `{ fullName, age, gender, jobTitle, organization, email?, phone?, consents: {wellness, liability, data}, signatureDataUrl }`
  **Response:** `{ id, participantCode, qr: "/s?pid=...&ts=...&sig=..." }`

- **POST `/api/stations/:pid`**
  Upsert any subset of station values.
  **Body:** `{ balanceSeconds?, breathSeconds?, gripLeftKg?, gripRightKg?, bpSystolic?, bpDiastolic?, pulse?, bmi?, musclePct?, fatPct?, spo2?, goto? }`
  **Auth:** require QR query params `pid, ts, sig` or admin session.
  **Side‑effects:** write `station_audits` row; recompute scores; return updated participant.

- **GET `/api/participants/:pid`**
  Server fetch (admin or QR‑signed link).

- **GET `/api/leaderboard`**
  Returns `leaderboard_view` (limited columns if exposed publicly).

- **GET `/api/export.csv`**
  Admin‑only full export.

**HMAC validation**

- `sig = HMAC_SHA256(base64url(pid + ':' + ts), QR_SIGNING_SECRET)`
- Reject if `now() - ts > 48h`.

---

## 7) Scoring Logic (Authoritative Rules)

**Balance:** `<10s → 1`, `10–30s → 2`, `>30s → 3`
**Breath:** `<20s → 1`, `20–40s → 2`, `>40s → 3`
**Grip (dominant & gender):**

- Male: `<30 → 1`, `30–40 → 2`, `>40 → 3`
- Female: `<20 → 1`, `20–27 → 2`, `>27 → 3`
- Other: `<25 → 1`, `25–35 → 2`, `>35 → 3`
  **Health (abnormal count):**
- Abnormal if: BP ≥140/90; Pulse <50 or >100; BMI <18.5 or ≥30; SpO₂ <95; Body fat (male >25%, female >32%, other >28%).
- `≥2 → 1`, `=1 → 2`, `=0 → 3`.
  **Total:** `score_balance + score_breath + score_grip + score_health` (4–12).
  **Grade:** `1–5 Bad`, `6–9 Average`, `10–12 Above Average`.

> _Implementation note:_ scoring runs server‑side whenever station values update; store results in `participants` to keep reads simple and enable SQL leaderboard.

---

## 8) UI / Routes & Screens

**`/` Welcome**

- Title, description, buttons: **Start Sign‑Up** → `/signup`, **View Leaderboard** → `/leaderboard`.

**`/signup` (2‑step)**

- Step 1: form fields, validation.
- Step 2: consent checkboxes + signature pad.
- Submit → create participant, generate `participantCode`, show **badge QR** + **manual code**.

**`/scan`**

- Opens camera, decodes QR (ZXing), redirects to target `/s?...` or station.

**`/stations?pid=...`**

- Participant dashboard; shows 4 station cards with status; **Finish & See Score** disabled until complete.

**`/station/balance|breath|grip|health?pid=...&ts=...&sig=...`**

- Station forms with big inputs + quick buttons; Save → toast; back to `/stations`.

**`/results/:id`**

- 4 station badges (Bad/Avg/Above Avg) + points, Total, Grade; CTA: **Join Longevity Package**; **Download Summary (PDF)**; show QR to reopen.

**`/leaderboard`**

- Table: Rank, Name, Organization, Total, station subscores, timestamp. Filters: Organization, Gender; Search: Name.

**`/admin`**

- Password gate. Grid/table with inline edit; **Recompute Scores** button; **Export CSV**; delete with confirm.

---

## 9) Components & Libraries

- **Forms:** React Hook Form + Zod; Radix primitives; `sonner` toasts.
- **Data:** TanStack Query for fetching/mutations; optimistic updates on station save.
- **QR:** `qrcode.react` for render; `@zxing/library` for scanning.
- **Charts (optional):** Recharts small gauge; keep minimal.
- **Styling:** Tailwind + `tailwind-merge`, `clsx`; soft shadows, large buttons.

---

## 10) Security & Privacy

- No PII in QR; only `pid`, `ts`, `sig`.
- All writes via server routes using service role; client never sees service key.
- Minimal data retention; export + purge flow post‑event.
- CORS restricted to event domain; rate limit station update endpoints.

---

## 11) Testing Plan (Playwright)

- **Auth‑free app** (no user accounts) → test flows:
  1. Sign‑up happy path → participant created → QR rendered → code visible.
  2. Station updates via deep link (mock `pid, ts, sig`) → scores recompute.
  3. Results total/grade; leaderboard ranking.
  4. Invalid/expired QR shows manual input fallback.
  5. Admin export CSV protected by password.

---

## 12) Deployment & Ops

- **Supabase**: run DDL SQL (above) on clean project/db.
- **Vercel**: set env vars; connect to repo; Next.js 14 build (`next build`).
- **Monitoring**: Vercel Analytics basic; simple server log of station_audits.
- **Incident fallback**: manual paper forms + later backfill.

---

## 13) Acceptance Criteria

- Participant can register, sign consent, and receive badge QR + code in ≤90s.
- Each station entry ≤30s; autosave; instant toast.
- Results computed deterministically; leaderboard updates in ≤2s after final station save.
- CSV export contains all sign‑ups + scores; opens in Excel.
- No PII present inside QR link; invalid QR is rejected.

---

## 14) Future Enhancements

- Role‑based auth for staff logins; per‑device station assignment.
- Corporate/organization set filters and reports.
- Email/SMS result delivery and package booking link.
- Offline cache and sync queue for unstable network environments.
