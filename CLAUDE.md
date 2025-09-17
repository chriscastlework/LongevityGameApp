## USE PNPM

## Supabase CLI commands

# Link to your supabase project

supabase link --project-ref ihcpikxtxaybuvsvzkqi

# Update Supabase Database models

npx supabase gen types typescript --project-id ihcpikxtxaybuvsvzkqi > lib/types/database.types.ts

# Get current db

supabase db pull

# Run db migrations

supabase db push
