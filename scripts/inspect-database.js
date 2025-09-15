#!/usr/bin/env node

/**
 * Inspect current Supabase database structure
 * This script attempts to understand the current schema by testing inserts
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

async function inspectDatabase() {
  console.log('Inspecting current database structure...\n');

  // 1. Try to get existing participants to see structure
  console.log('1. Checking existing participants...');
  const { data: existingParticipants, error: existingError } = await supabase
    .from('participants')
    .select('*')
    .limit(1);

  if (!existingError && existingParticipants && existingParticipants.length > 0) {
    console.log('✅ Found existing participant record:');
    console.log(JSON.stringify(existingParticipants[0], null, 2));

    const schemaInfo = {
      participants: {
        sample_record: existingParticipants[0],
        columns: Object.keys(existingParticipants[0]).map(key => ({
          name: key,
          type: typeof existingParticipants[0][key],
          example: existingParticipants[0][key]
        }))
      }
    };

    fs.writeFileSync(
      path.join(__dirname, 'database-structure.json'),
      JSON.stringify(schemaInfo, null, 2)
    );

    console.log('\n✅ Database structure saved to scripts/database-structure.json\n');
    return schemaInfo;
  } else {
    console.log('❌ No existing participants found or error:', existingError?.message);
  }

  // 2. Test what the current schema expects by trying different insert formats
  console.log('2. Testing current schema expectations...\n');

  const testData = [
    // Test 1: Original format (age + signature required)
    {
      name: 'Test 1: Original format',
      data: {
        full_name: 'Test User 1',
        age: 30,
        gender: 'male',
        job_title: 'Tester',
        organization: 'Test Org',
        email: 'test1@example.com',
        phone: '123-456-7890',
        consent_wellness: true,
        consent_liability: true,
        consent_data: true,
        signature: 'Test Signature 1'
      }
    },

    // Test 2: New format (date_of_birth + optional signature)
    {
      name: 'Test 2: New format with date_of_birth',
      data: {
        full_name: 'Test User 2',
        date_of_birth: '1993-01-01',
        gender: 'female',
        job_title: 'Tester',
        organization: 'Test Org',
        email: 'test2@example.com',
        phone: '123-456-7890',
        consent_wellness: true,
        consent_liability: true,
        consent_data: true
      }
    },

    // Test 3: Minimal required fields
    {
      name: 'Test 3: Minimal fields',
      data: {
        full_name: 'Test User 3',
        gender: 'male',
        consent_wellness: true,
        consent_liability: true,
        consent_data: true
      }
    }
  ];

  const results = [];

  for (const test of testData) {
    console.log(`Testing: ${test.name}`);

    const { data, error } = await supabase
      .from('participants')
      .insert([test.data])
      .select()
      .single();

    if (error) {
      console.log(`❌ Failed: ${error.message}`);
      results.push({
        test: test.name,
        success: false,
        error: error.message,
        details: error.details,
        hint: error.hint
      });
    } else {
      console.log(`✅ Success: Record created with ID ${data.id}`);
      results.push({
        test: test.name,
        success: true,
        created_record: data
      });

      // Clean up test record
      await supabase
        .from('participants')
        .delete()
        .eq('id', data.id);
      console.log(`🧹 Cleaned up test record ${data.id}`);
    }
    console.log('');
  }

  // Save results
  fs.writeFileSync(
    path.join(__dirname, 'schema-test-results.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('📊 Test results saved to scripts/schema-test-results.json');

  // Analyze results
  console.log('\n=== ANALYSIS ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    console.log(`✅ ${successful.length} test(s) passed:`);
    successful.forEach(r => console.log(`  - ${r.test}`));
  }

  if (failed.length > 0) {
    console.log(`❌ ${failed.length} test(s) failed:`);
    failed.forEach(r => {
      console.log(`  - ${r.test}: ${r.error}`);
      if (r.hint) console.log(`    Hint: ${r.hint}`);
    });
  }

  return { results, successful, failed };
}

inspectDatabase().catch(console.error);