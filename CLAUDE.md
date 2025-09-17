## USE PNPM

## Supabase CLI commands

# Link to your supabase project

supabase link --project-ref ihcpikxtxaybuvsvzkqi

# Update Supabase Database models

npx supabase gen types typescript --project-id ihcpikxtxaybuvsvzkqi > lib/types/database.types.ts

# Update the sql database script

supabase db dump --file full-dump.sql
