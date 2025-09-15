#!/usr/bin/env node

/**
 * Direct table and column inspection
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

async function checkTables() {
  console.log('Checking what tables exist...\n');

  // Try to query common table names
  const tableNames = ['participants', 'users', 'profiles', 'station_audits'];
  const results = {};

  for (const tableName of tableNames) {
    console.log(`Checking table: ${tableName}`);

    try {
      const { data, error, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(1);

      if (error) {
        console.log(`❌ Table '${tableName}' - Error: ${error.message}`);
        results[tableName] = { exists: false, error: error.message };
      } else {
        console.log(`✅ Table '${tableName}' exists with ${count || 0} records`);
        if (data && data.length > 0) {
          console.log('   Sample columns:', Object.keys(data[0]));
          results[tableName] = {
            exists: true,
            count: count || 0,
            columns: Object.keys(data[0]),
            sample: data[0]
          };
        } else {
          console.log('   No records found, trying to get column info...');

          // Try to insert a minimal test record to see what columns are required
          const { error: insertError } = await supabase
            .from(tableName)
            .insert([{}]);

          if (insertError) {
            console.log(`   Insert error reveals required columns: ${insertError.message}`);
            results[tableName] = {
              exists: true,
              count: 0,
              insertError: insertError.message,
              hint: insertError.hint,
              details: insertError.details
            };
          }
        }
      }
    } catch (err) {
      console.log(`❌ Unexpected error with '${tableName}':`, err.message);
      results[tableName] = { exists: false, unexpectedError: err.message };
    }
    console.log('');
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'table-inspection.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('📊 Results saved to scripts/table-inspection.json');

  // Summary
  console.log('\n=== SUMMARY ===');
  for (const [tableName, info] of Object.entries(results)) {
    if (info.exists) {
      console.log(`✅ ${tableName}: EXISTS`);
      if (info.columns) {
        console.log(`   Columns: ${info.columns.join(', ')}`);
      } else if (info.insertError) {
        console.log(`   Insert requirements: ${info.insertError}`);
      }
    } else {
      console.log(`❌ ${tableName}: DOES NOT EXIST`);
    }
  }

  return results;
}

checkTables().catch(console.error);