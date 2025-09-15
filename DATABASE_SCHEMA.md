# Database Schema Documentation

This document provides an up-to-date overview of the database schema for the Longevity Fitness Games application.

## Current Tables

### 1. profiles
**Purpose**: User profile information linked to Supabase auth.users

```sql
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')) NOT NULL,
    job_title TEXT NOT NULL,
    organisation TEXT NOT NULL,
    role TEXT CHECK (role IN ('participant', 'operator', 'admin')) DEFAULT 'participant',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 2. participants
**Purpose**: Links users to participant codes for the games

```sql
CREATE TABLE public.participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    participant_code TEXT UNIQUE, -- Auto-generated format: LFG-XXXX
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);
```

### 3. stations
**Purpose**: Configuration for fitness testing stations

**Current Schema** (may vary in existing databases):
```sql
CREATE TABLE public.stations (
    id TEXT PRIMARY KEY, -- Station identifier (balance, breath, grip, health)
    name TEXT NOT NULL, -- Display name (e.g., "Balance of Time")
    description TEXT NOT NULL, -- Station description
    -- Additional columns that may or may not exist:
    icon_name TEXT, -- Lucide icon name (Scale, Activity, Zap, Heart)
    color_class TEXT, -- Tailwind color class (bg-blue-500, etc.)
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);
```

**Known Station Data**:
- **balance** → "Balance of Time" - Test your balance and coordination skills
- **breath** → "Breath of Youth" - Measure your respiratory capacity and control
- **grip** → "Grip of Life" - Assess your grip strength and endurance
- **health** → "Health Metrics" - Comprehensive health measurements

### 4. competitions
**Purpose**: Fitness competitions/events

```sql
CREATE TABLE public.competitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    max_participants INTEGER DEFAULT 100,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

### 5. competition_entries
**Purpose**: Participant entries and scores for competitions

```sql
CREATE TABLE public.competition_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    competition_id UUID NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    score NUMERIC DEFAULT 0,
    data JSONB, -- Flexible storage for competition-specific data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## Common Functions

### handle_updated_at()
**Purpose**: Automatically updates the `updated_at` column on record changes

```sql
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

## Migration Scripts

### Current Migration Files
- `scripts/setup-database.sql` - Initial database setup
- `scripts/check-stations-schema.sql` - Check current stations table structure
- `scripts/migrate-stations-table.sql` - Safe migration for existing stations table
- `scripts/add-stations-table.sql` - Full stations table creation (for new databases)

### Running Migrations

1. **Check existing schema first**:
   ```sql
   \i scripts/check-stations-schema.sql
   ```

2. **For existing databases with stations table**:
   ```sql
   \i scripts/migrate-stations-table.sql
   ```

3. **For new databases**:
   ```sql
   \i scripts/setup-database.sql
   \i scripts/add-stations-table.sql
   ```

## Row Level Security (RLS)

### Stations Table Policies
- **Read**: Everyone can read stations (public data)
- **Write**: Only admins can modify stations

### Profiles Table Policies
- Users can read/write their own profile
- Admins can read all profiles
- Operators can read participant profiles

## API Endpoints

### Stations API
- `GET /api/stations` - Fetch all active stations (cached 5 minutes)
- `PUT /api/stations` - Update station (admin only)

## Notes for Developers

1. **Always check existing schema** before running migrations
2. **Use the migrate-stations-table.sql** for existing databases
3. **Stations table structure may vary** between environments
4. **Icon names must match Lucide icons** (Scale, Activity, Zap, Heart)
5. **Color classes must be valid Tailwind** (bg-blue-500, bg-green-500, etc.)

## TypeScript Types

The database types are defined in `lib/types/database.ts` and should be kept in sync with the actual database schema.

## Last Updated

This documentation was last updated when implementing dynamic stations loading with TanStack Query caching.