#!/usr/bin/env node

/**
 * Find the minimal working profile structure
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findMinimalProfile() {
  console.log('Finding minimal working profile structure...\n');

  // Based on error messages, we know:
  // - id is required (UUID)
  // - name is required (string)
  // - updated_at is required

  const testCases = [
    {
      name: 'Test 1: Just required fields',
      data: {
        id: crypto.randomUUID(),
        name: 'Test User',
      }
    },
    {
      name: 'Test 2: Add created_at and updated_at',
      data: {
        id: crypto.randomUUID(),
        name: 'Test User 2',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    },
    {
      name: 'Test 3: Add common fields',
      data: {
        id: crypto.randomUUID(),
        name: 'Test User 3',
        email: 'test3@example.com',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
  ];

  for (const testCase of testCases) {
    console.log(testCase.name);

    const { data, error } = await supabase
      .from('profiles')
      .insert([testCase.data])
      .select();

    if (error) {
      console.log(`  ❌ Failed: ${error.message}`);
      if (error.hint) console.log(`     Hint: ${error.hint}`);
      if (error.details) console.log(`     Details: ${error.details}`);
    } else {
      console.log(`  ✅ Success! Created profile:`, data[0]);

      // Clean up
      await supabase
        .from('profiles')
        .delete()
        .eq('id', testCase.data.id);
      console.log('  🧹 Cleaned up');

      // If we found a working structure, analyze what columns exist
      if (data && data[0]) {
        console.log('\n🎉 FOUND WORKING STRUCTURE!');
        console.log('Columns that exist in profiles table:');
        Object.keys(data[0]).forEach(key => {
          console.log(`  - ${key}: ${typeof data[0][key]} (${JSON.stringify(data[0][key])})`);
        });
        return data[0];
      }
    }
    console.log('');
  }

  console.log('❌ Could not find working profile structure');
}

findMinimalProfile().catch(console.error);