
-- SQL functions to help get schema information
-- Run these in Supabase SQL editor first:

CREATE OR REPLACE FUNCTION get_columns_info()
RETURNS TABLE (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  column_default text
)
LANGUAGE sql
AS $$
  SELECT
    t.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    c.column_default::text
  FROM information_schema.tables t
  JOIN information_schema.columns c ON t.table_name = c.table_name
  WHERE t.table_schema = 'public'
  AND t.table_name IN ('participants', 'station_audits')
  ORDER BY t.table_name, c.ordinal_position;
$$;

GRANT EXECUTE ON FUNCTION get_columns_info() TO service_role;
