#!/usr/bin/env node

/**
 * Test the signup functionality with the corrected schema
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

async function testSignupFlow() {
  console.log('Testing signup flow with corrected schema...\n');

  // Test 1: Signup without email/password (profile only)
  console.log('Test 1: Profile-only signup (no email/password)');
  try {
    const testProfile = {
      id: crypto.randomUUID(),
      full_name: 'Test User No Auth',
      date_of_birth: '1990-01-01',
      gender: 'male',
      job_title: 'Tester',
      organization: 'Test Corp',
      email: null,
      phone: '123-456-7890',
      consent_wellness: true,
      consent_liability: true,
      consent_data: true,
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([testProfile])
      .select()
      .single();

    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message);
      if (profileError.hint) console.log('   Hint:', profileError.hint);
    } else {
      console.log('✅ Profile created successfully:', profile.id);

      // Clean up
      await supabase.from('profiles').delete().eq('id', profile.id);
      console.log('🧹 Cleaned up test profile');
    }
  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  console.log('');

  // Test 2: Full signup with email/password
  console.log('Test 2: Full signup with auth user + profile + participant');

  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User With Auth',
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

    // Create profile
    const testProfileWithAuth = {
      id: authData.user.id,
      full_name: 'Test User With Auth',
      date_of_birth: '1985-05-15',
      gender: 'female',
      job_title: 'Auth Tester',
      organization: 'Auth Corp',
      email: testEmail,
      phone: '987-654-3210',
      consent_wellness: true,
      consent_liability: true,
      consent_data: true,
    };

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert([testProfileWithAuth])
      .select()
      .single();

    if (profileError) {
      console.log('❌ Profile creation failed:', profileError.message);
      if (profileError.hint) console.log('   Hint:', profileError.hint);
    } else {
      console.log('✅ Profile created successfully:', profile.id);
    }

    // Create participant record
    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert([{ user_id: authData.user.id }])
      .select()
      .single();

    if (participantError) {
      console.log('❌ Participant creation failed:', participantError.message);
      if (participantError.hint) console.log('   Hint:', participantError.hint);
    } else {
      console.log('✅ Participant created successfully:', participant.id);
    }

    // Clean up
    if (participant) {
      await supabase.from('participants').delete().eq('id', participant.id);
      console.log('🧹 Cleaned up test participant');
    }

    if (profile) {
      await supabase.from('profiles').delete().eq('id', profile.id);
      console.log('🧹 Cleaned up test profile');
    }

    // Note: Auth user cleanup would require admin API, skipping for now
    console.log('ℹ️  Auth user cleanup skipped (requires admin API)');

  } catch (err) {
    console.log('❌ Unexpected error:', err.message);
  }

  console.log('\n=== TEST COMPLETE ===');
}

testSignupFlow().catch(console.error);