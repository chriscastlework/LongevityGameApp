#!/usr/bin/env node

/**
 * Final test with all discovered required fields
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function finalProfileTest() {
  console.log('Final test with all required fields...\n');

  const testProfile = {
    id: crypto.randomUUID(),
    name: 'Test User Final',
    email: 'final@example.com',
    date_of_birth: '1990-01-01',
    gender: 'male',
    job_title: 'Tester',
    organisation: 'Test Corp',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('Testing profile with all required fields:');
  console.log(JSON.stringify(testProfile, null, 2));

  const { data, error } = await supabase
    .from('profiles')
    .insert([testProfile])
    .select();

  if (error) {
    console.log(`❌ Still failed: ${error.message}`);
    if (error.details) console.log(`Details: ${error.details}`);
  } else {
    console.log(`✅ SUCCESS! Profile created successfully!`);
    console.log('\n📋 DISCOVERED PROFILE SCHEMA:');
    console.log(JSON.stringify(data[0], null, 2));

    // Save the working structure
    fs.writeFileSync(
      path.join(__dirname, 'discovered-profile-schema.json'),
      JSON.stringify(data[0], null, 2)
    );

    // Also create a schema summary
    const schema = {
      table: 'profiles',
      columns: Object.keys(data[0]).map(key => ({
        name: key,
        type: typeof data[0][key],
        required: ['id', 'name', 'email', 'date_of_birth', 'gender', 'job_title', 'organisation'].includes(key),
        example: data[0][key]
      }))
    };

    fs.writeFileSync(
      path.join(__dirname, 'profiles-schema-summary.json'),
      JSON.stringify(schema, null, 2)
    );

    console.log('\n💾 Schema saved to:');
    console.log('  - discovered-profile-schema.json');
    console.log('  - profiles-schema-summary.json');

    // Clean up
    await supabase
      .from('profiles')
      .delete()
      .eq('id', testProfile.id);
    console.log('\n🧹 Cleaned up test profile');

    return data[0];
  }
}

finalProfileTest().catch(console.error);