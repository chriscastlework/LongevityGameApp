#!/usr/bin/env node

/**
 * Setup missing database tables
 * This script checks for missing tables and provides instructions to create them
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

async function checkAndSetupTables() {
  try {
    console.log('🔍 Checking for missing database tables...\n');

    // Check if station_results table exists
    console.log('Checking station_results table...');
    const { data: stationResultsData, error: stationResultsError } = await supabase
      .from('station_results')
      .select('*')
      .limit(0);

    if (stationResultsError) {
      console.log('❌ station_results table MISSING');
      console.log('Error:', stationResultsError.message);
      console.log('\n📋 TO FIX THIS ISSUE:');
      console.log('1. Go to your Supabase Dashboard > SQL Editor');
      console.log('2. Run the SQL script: scripts/create-station-results-table.sql');
      console.log('3. The script creates the station_results table with proper structure and RLS policies');
      console.log('\nOR copy and paste this SQL into Supabase SQL Editor:');
      console.log('='.repeat(60));

      const sqlContent = fs.readFileSync(
        path.join(__dirname, 'create-station-results-table.sql'),
        'utf8'
      );
      console.log(sqlContent);
      console.log('='.repeat(60));

      return false;
    } else {
      console.log('✅ station_results table exists');

      // Test if we can query it
      const { data: testData, error: testError } = await supabase
        .from('station_results')
        .select('*')
        .limit(1);

      if (testError) {
        console.log('⚠️  station_results table exists but has access issues:', testError.message);
      } else {
        console.log('✅ station_results table is accessible');
        if (testData && testData.length > 0) {
          console.log('📊 Sample record:', JSON.stringify(testData[0], null, 2));
        } else {
          console.log('📭 station_results table is empty (this is normal for a new setup)');
        }
      }
      return true;
    }

  } catch (error) {
    console.error('Error checking tables:', error);
    return false;
  }
}

async function main() {
  const tablesOk = await checkAndSetupTables();

  if (tablesOk) {
    console.log('\n🎉 All required tables are present and accessible!');
    console.log('The station results API should now work correctly.');
  } else {
    console.log('\n🔧 Please create the missing tables using the SQL scripts provided above.');
    console.log('After creating the tables, run this script again to verify.');
  }
}

main();