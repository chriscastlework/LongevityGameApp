#!/usr/bin/env node

/**
 * Test the complete signup flow with all components
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testCompleteSignupFlow() {
  console.log('Testing complete signup flow...\n');

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    console.log('Step 1: Create auth user');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Complete Test User',
        },
      },
    });

    if (authError) {
      console.log('❌ Auth user creation failed:', authError.message);
      return;
    }

    if (!authData.user) {
      console.log('❌ No user returned from auth signup');
      return;
    }

    console.log('✅ Auth user created:', authData.user.id);

    console.log('\nStep 2: Create profile');
    const profileData = {
      id: authData.user.id,
      name: 'Complete Test User',
      email: testEmail,
      date_of_birth: '1985-05-15',
      gender: 'female',
      job_title: 'Complete Tester',
      organisation: 'Complete Test Corp',
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([profileData])
      .select()
      .single();

    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message);
      if (profileError.hint) console.log('   Hint:', profileError.hint);
      return;
    }

    console.log('✅ Profile created successfully');
    console.log('Profile data:', JSON.stringify(profile, null, 2));

    console.log('\nStep 3: Create participant record');
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert([{ user_id: authData.user.id }])
      .select()
      .single();

    if (participantError) {
      console.log('❌ Participant creation failed:', participantError.message);
      if (participantError.hint) console.log('   Hint:', participantError.hint);
      return;
    }

    console.log('✅ Participant created successfully');
    console.log('Participant data:', JSON.stringify(participant, null, 2));

    console.log('\n🎉 COMPLETE SIGNUP FLOW SUCCESSFUL! 🎉');
    console.log('Summary:');
    console.log(`  - Auth User ID: ${authData.user.id}`);
    console.log(`  - Profile ID: ${profile.id}`);
    console.log(`  - Participant ID: ${participant.id}`);

    // Clean up
    console.log('\n🧹 Cleaning up test data...');
    await supabase.from('participants').delete().eq('id', participant.id);
    console.log('✅ Participant deleted');

    await supabase.from('profiles').delete().eq('id', profile.id);
    console.log('✅ Profile deleted');

    console.log('ℹ️  Auth user cleanup skipped (requires admin API)');

    console.log('\n✨ Test completed successfully! The signup flow is working.');

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }
}

testCompleteSignupFlow().catch(console.error);