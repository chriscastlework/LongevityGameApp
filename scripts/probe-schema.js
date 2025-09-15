#!/usr/bin/env node

/**
 * Probe exact database schema by testing individual columns
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

async function probeParticipantsSchema() {
  console.log('Probing participants table schema...\n');

  // From the error details, we know the failing row had these positions:
  // (04cfe5e9-7665-4d2b-9fd8-54bfaf2d7a8c, null, null, f, null, 2025-09-14 17:50:19.078245+00, 2025-09-14 17:50:19.078245+00)
  // This suggests: (id, user_id, something, boolean, something, created_at, updated_at)

  const possibleColumns = [
    'id',
    'user_id',
    'full_name',
    'email',
    'phone',
    'date_of_birth',
    'age',
    'gender',
    'job_title',
    'organization',
    'is_verified',
    'consent_wellness',
    'consent_liability',
    'consent_data',
    'signature',
    'created_at',
    'updated_at'
  ];

  const results = {};

  console.log('Testing individual columns...\n');

  for (const column of possibleColumns) {
    console.log(`Testing column: ${column}`);

    // Try different test values based on likely column type
    const testValues = [
      null,
      'test-value',
      true,
      false,
      123,
      '2025-01-01',
      new Date().toISOString()
    ];

    for (const testValue of testValues) {
      const testData = { [column]: testValue };

      const { error } = await supabase
        .from('participants')
        .insert([testData]);

      if (error) {
        if (error.message.includes(`column "${column}" of relation "participants"`)) {
          // This column exists but has constraints
          if (!results[column]) results[column] = { exists: true, tests: [] };
          results[column].tests.push({
            value: testValue,
            error: error.message,
            hint: error.hint,
            details: error.details
          });
        } else if (error.message.includes(`column "${column}"`)) {
          // Column exists
          if (!results[column]) results[column] = { exists: true, tests: [] };
          results[column].tests.push({
            value: testValue,
            error: error.message
          });
        } else if (error.message.includes('does not exist') || error.message.includes('unknown column')) {
          // Column doesn't exist
          if (!results[column]) results[column] = { exists: false, error: error.message };
          break; // No need to test other values
        } else {
          // Different error (might be missing required columns)
          if (!results[column]) results[column] = { exists: 'unknown', tests: [] };
          results[column].tests.push({
            value: testValue,
            error: error.message,
            type: 'other'
          });
        }
      } else {
        // Success! This tells us about the column type and constraints
        console.log(`  ✅ SUCCESS with ${column} = ${testValue}`);
        if (!results[column]) results[column] = { exists: true, tests: [] };
        results[column].tests.push({
          value: testValue,
          success: true
        });

        // Clean up the test record
        const { data } = await supabase.from('participants').select('id').order('created_at', { ascending: false }).limit(1);
        if (data && data[0]) {
          await supabase.from('participants').delete().eq('id', data[0].id);
        }
        break; // Found working value, move to next column
      }
    }
    console.log('');
  }

  // Save detailed results
  fs.writeFileSync(
    path.join(__dirname, 'participants-schema-probe.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('📊 Detailed results saved to scripts/participants-schema-probe.json');

  // Analyze results
  console.log('\n=== PARTICIPANTS SCHEMA ANALYSIS ===');
  const existing = Object.entries(results).filter(([_, info]) => info.exists === true);
  const missing = Object.entries(results).filter(([_, info]) => info.exists === false);
  const unknown = Object.entries(results).filter(([_, info]) => info.exists === 'unknown');

  if (existing.length > 0) {
    console.log(`\n✅ Columns that exist (${existing.length}):`);
    existing.forEach(([column, info]) => {
      console.log(`  - ${column}`);
      const workingTest = info.tests?.find(t => t.success);
      if (workingTest) {
        console.log(`    Works with: ${JSON.stringify(workingTest.value)}`);
      } else {
        const errorInfo = info.tests?.[0];
        if (errorInfo) {
          console.log(`    Constraint: ${errorInfo.error}`);
        }
      }
    });
  }

  if (missing.length > 0) {
    console.log(`\n❌ Columns that don't exist (${missing.length}):`);
    missing.forEach(([column]) => {
      console.log(`  - ${column}`);
    });
  }

  if (unknown.length > 0) {
    console.log(`\n❓ Uncertain columns (${unknown.length}):`);
    unknown.forEach(([column, info]) => {
      console.log(`  - ${column}: ${info.tests?.[0]?.error || 'unknown error'}`);
    });
  }

  return results;
}

async function probeProfilesSchema() {
  console.log('\nProbing profiles table schema...\n');

  // Quick test of profiles table
  const { error } = await supabase
    .from('profiles')
    .insert([{ full_name: 'Test User' }]);

  if (error) {
    console.log('Profiles insert error:', error.message);
    if (error.details) {
      console.log('Details:', error.details);
    }
  }
}

async function main() {
  await probeParticipantsSchema();
  await probeProfilesSchema();
}

main().catch(console.error);