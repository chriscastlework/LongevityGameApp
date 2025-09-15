#!/usr/bin/env node

/**
 * Probe profiles table schema
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

async function probeProfilesColumns() {
  console.log('Probing profiles table columns...\n');

  const possibleColumns = [
    'id',
    'created_at',
    'updated_at',
    'full_name',
    'first_name',
    'last_name',
    'email',
    'phone',
    'date_of_birth',
    'birth_date',
    'age',
    'gender',
    'job_title',
    'organization',
    'company',
    'avatar_url',
    'profile_picture',
    'bio',
    'website',
    'is_verified',
    'consent_wellness',
    'consent_liability',
    'consent_data',
    'terms_accepted'
  ];

  const results = {};

  for (const column of possibleColumns) {
    console.log(`Testing column: ${column}`);

    // Try a simple insert with just this column
    const testData = { [column]: getTestValue(column) };

    const { error } = await supabase
      .from('profiles')
      .insert([testData]);

    if (error) {
      if (error.message.includes(`column "${column}"`)) {
        if (error.message.includes('violates not-null constraint')) {
          results[column] = { exists: true, required: true, error: error.message };
          console.log(`  ✅ EXISTS (required): ${column}`);
        } else if (error.message.includes('does not exist') || error.message.includes('Could not find')) {
          results[column] = { exists: false, error: error.message };
          console.log(`  ❌ Does not exist: ${column}`);
        } else {
          results[column] = { exists: true, required: false, error: error.message };
          console.log(`  ✅ EXISTS (optional): ${column} - ${error.message}`);
        }
      } else {
        // Different error - might be about other required columns
        results[column] = { exists: 'unknown', error: error.message };
        console.log(`  ❓ Unknown: ${column} - ${error.message}`);
      }
    } else {
      results[column] = { exists: true, required: false, success: true };
      console.log(`  ✅ EXISTS (works): ${column}`);

      // Clean up successful insert
      const { data } = await supabase.from('profiles').select('id').order('created_at', { ascending: false }).limit(1);
      if (data && data[0]) {
        await supabase.from('profiles').delete().eq('id', data[0].id);
      }
    }
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'profiles-schema-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('\n📊 Results saved to scripts/profiles-schema-results.json');

  // Summary
  console.log('\n=== PROFILES SCHEMA SUMMARY ===');
  const existing = Object.entries(results).filter(([_, info]) => info.exists === true);
  const missing = Object.entries(results).filter(([_, info]) => info.exists === false);
  const required = existing.filter(([_, info]) => info.required);

  console.log(`✅ Existing columns (${existing.length}):`);
  existing.forEach(([column, info]) => {
    const status = info.required ? ' (REQUIRED)' : info.success ? ' (WORKS)' : '';
    console.log(`  - ${column}${status}`);
  });

  if (required.length > 0) {
    console.log(`\n🔒 Required columns (${required.length}):`);
    required.forEach(([column]) => {
      console.log(`  - ${column}`);
    });
  }

  if (missing.length > 0) {
    console.log(`\n❌ Missing columns (${missing.length}):`);
    missing.forEach(([column]) => {
      console.log(`  - ${column}`);
    });
  }
}

function getTestValue(column) {
  if (column === 'id') return crypto.randomUUID();
  if (column.includes('email')) return 'test@example.com';
  if (column.includes('phone')) return '123-456-7890';
  if (column.includes('date') || column.includes('birth')) return '1990-01-01';
  if (column === 'age') return 30;
  if (column === 'gender') return 'male';
  if (column.includes('name')) return 'Test User';
  if (column.includes('job') || column === 'job_title') return 'Tester';
  if (column.includes('organization') || column.includes('company')) return 'Test Corp';
  if (column.includes('url')) return 'https://example.com';
  if (column.includes('consent') || column.includes('terms') || column.includes('verified')) return true;
  if (column.includes('bio')) return 'Test bio';
  return 'test-value';
}

probeProfilesColumns().catch(console.error);