#!/usr/bin/env node

/**
 * Test complete profile structure based on discovered schema
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteProfile() {
  console.log('Testing complete profile structure...\n');

  // Based on the error details, the profiles table has:
  // (id, name, email, ?, ?, ?, ?, created_at, updated_at)
  // Where email and date_of_birth are required

  const testProfile = {
    id: crypto.randomUUID(),
    name: 'Test User Complete',
    email: 'complete@example.com',
    date_of_birth: '1990-01-01',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('Testing with all required fields:');
  console.log(JSON.stringify(testProfile, null, 2));

  const { data, error } = await supabase
    .from('profiles')
    .insert([testProfile])
    .select();

  if (error) {
    console.log(`❌ Failed: ${error.message}`);
    if (error.hint) console.log(`Hint: ${error.hint}`);
    if (error.details) console.log(`Details: ${error.details}`);
  } else {
    console.log(`✅ Success! Created profile`);
    console.log('Profile structure:');
    console.log(JSON.stringify(data[0], null, 2));

    // Now we know the exact structure - save it
    const fs = require('fs');
    fs.writeFileSync(
      path.join(__dirname, 'working-profile-structure.json'),
      JSON.stringify(data[0], null, 2)
    );
    console.log('💾 Saved working structure to working-profile-structure.json');

    // Clean up
    await supabase
      .from('profiles')
      .delete()
      .eq('id', testProfile.id);
    console.log('🧹 Cleaned up test profile');

    return data[0];
  }
}

testCompleteProfile().catch(console.error);