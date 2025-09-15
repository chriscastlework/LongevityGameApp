#!/usr/bin/env node

/**
 * Download Supabase database schema
 * This script connects to Supabase and downloads the current schema
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function downloadSchema() {
  try {
    console.log('Downloading database schema...');

    // Get table information
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_table_schema', {});

    if (tablesError) {
      // Fallback: Get basic table info
      console.log('Using fallback method to get schema...');

      // Get participants table schema
      const { data: participantsData, error: participantsError } = await supabase
        .from('participants')
        .select('*')
        .limit(0);

      if (participantsError) {
        console.error('Error fetching participants schema:', participantsError);
      }

      // Get station_audits table schema
      const { data: stationAuditsData, error: stationAuditsError } = await supabase
        .from('station_audits')
        .select('*')
        .limit(0);

      if (stationAuditsError) {
        console.error('Error fetching station_audits schema:', stationAuditsError);
      }

      // Get actual column information using information_schema
      const { data: columnsData, error: columnsError } = await supabase
        .rpc('get_columns_info');

      if (columnsError) {
        // Final fallback - query system tables directly
        const { data: systemData, error: systemError } = await supabase
          .from('information_schema.columns')
          .select('table_name, column_name, data_type, is_nullable, column_default')
          .in('table_name', ['participants', 'station_audits']);

        if (systemError) {
          console.error('Error querying system tables:', systemError);

          // Last resort - inspect a real record if it exists
          console.log('Trying to inspect existing data structure...');
          const { data: sampleData, error: sampleError } = await supabase
            .from('participants')
            .select('*')
            .limit(1);

          if (!sampleError && sampleData && sampleData.length > 0) {
            console.log('Sample participant record structure:');
            console.log(JSON.stringify(sampleData[0], null, 2));

            const schema = {
              participants: {
                columns: Object.keys(sampleData[0]).map(key => ({
                  name: key,
                  type: typeof sampleData[0][key],
                  value: sampleData[0][key]
                }))
              }
            };

            fs.writeFileSync(
              path.join(__dirname, 'current-schema.json'),
              JSON.stringify(schema, null, 2)
            );

            console.log('Schema sample saved to scripts/current-schema.json');
            return;
          }

          console.error('Could not retrieve any schema information');
          return;
        }

        console.log('System schema data:', systemData);
        fs.writeFileSync(
          path.join(__dirname, 'current-schema.json'),
          JSON.stringify(systemData, null, 2)
        );
      }
    }

    console.log('Schema download complete!');

  } catch (error) {
    console.error('Error downloading schema:', error);
  }
}

// Also create functions to get schema info
const schemaQueries = `
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
`;

fs.writeFileSync(
  path.join(__dirname, 'schema-helper-functions.sql'),
  schemaQueries
);

console.log('Created schema helper functions in scripts/schema-helper-functions.sql');
console.log('Please run the SQL in that file in your Supabase SQL editor first, then run this script again.');

downloadSchema();