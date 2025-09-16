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
    console.log('Downloading complete database schema...');

    // Try to discover tables by attempting to query known and likely table names
    const possibleTables = [
      'participants',
      'profiles',
      'stations',
      'station_results',
      'station_audits',
      'station_operators',
      'competitions',
      'competition_entries'
    ];

    const schema = {};
    const foundTables = [];

    console.log('Step 1: Discovering tables by testing known names...');
    for (const tableName of possibleTables) {
      try {
        console.log(`Testing table: ${tableName}`);
        const { data, error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0); // Get 0 records to just check if table exists

        if (!error) {
          foundTables.push(tableName);
          console.log(`✅ Found table: ${tableName}`);
        } else {
          console.log(`❌ Table ${tableName} not found: ${error.message}`);
        }
      } catch (err) {
        console.log(`❌ Error testing ${tableName}: ${err.message}`);
      }
    }

    console.log('Found tables:', foundTables);

    // For each found table, get sample data to understand structure
    console.log('Step 2: Getting structure and sample data from each table...');
    for (const tableName of foundTables) {
      try {
        console.log(`\n--- Analyzing table: ${tableName} ---`);

        // Try to get sample data
        const { data: sampleData, error: sampleError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        if (!sampleError && sampleData && sampleData.length > 0) {
          console.log(`Sample data from ${tableName}:`);
          console.log(JSON.stringify(sampleData[0], null, 2));

          schema[tableName] = {
            exists: true,
            has_data: true,
            sample_record: sampleData[0],
            columns: Object.keys(sampleData[0]).map(key => ({
              name: key,
              javascript_type: typeof sampleData[0][key],
              value_example: sampleData[0][key],
              is_nullable: sampleData[0][key] === null
            }))
          };

        } else if (!sampleError && sampleData && sampleData.length === 0) {
          console.log(`Table ${tableName} exists but is empty`);

          // Try to get column info by selecting with limit 0 and checking the response structure
          schema[tableName] = {
            exists: true,
            has_data: false,
            sample_record: null,
            columns: []
          };

        } else {
          console.log(`Error accessing ${tableName}:`, sampleError?.message);
          schema[tableName] = {
            exists: true,
            has_data: false,
            error: sampleError?.message,
            columns: []
          };
        }

      } catch (err) {
        console.log(`Error analyzing ${tableName}:`, err.message);
        schema[tableName] = {
          exists: false,
          error: err.message
        };
      }
    }

    // Also try to find what the hint suggested
    if (schema.station_operators?.error && schema.station_operators.error.includes("Perhaps you meant")) {
      console.log('\n--- Checking hinted table: station_operators ---');
      try {
        const { data: stationOpsData, error: stationOpsError } = await supabase
          .from('station_operators')
          .select('*')
          .limit(1);

        if (!stationOpsError) {
          foundTables.push('station_operators');
          schema['station_operators'] = {
            exists: true,
            has_data: stationOpsData && stationOpsData.length > 0,
            sample_record: stationOpsData?.[0] || null,
            columns: stationOpsData && stationOpsData.length > 0
              ? Object.keys(stationOpsData[0]).map(key => ({
                  name: key,
                  javascript_type: typeof stationOpsData[0][key],
                  value_example: stationOpsData[0][key],
                  is_nullable: stationOpsData[0][key] === null
                }))
              : []
          };
          console.log('Found station_operators table!');
          if (stationOpsData && stationOpsData.length > 0) {
            console.log('Sample data:', JSON.stringify(stationOpsData[0], null, 2));
          }
        }
      } catch (err) {
        console.log('station_operators error:', err.message);
      }
    }

    // Save the complete schema
    const schemaOutput = {
      discovered_at: new Date().toISOString(),
      found_tables: foundTables,
      tables: schema
    };

    fs.writeFileSync(
      path.join(__dirname, 'complete-schema.json'),
      JSON.stringify(schemaOutput, null, 2)
    );

    console.log('\n=== SCHEMA DISCOVERY COMPLETE ===');
    console.log(`Found ${foundTables.length} tables:`, foundTables);
    console.log('Complete schema saved to scripts/complete-schema.json');

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