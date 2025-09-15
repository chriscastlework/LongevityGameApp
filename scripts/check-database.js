#!/usr/bin/env node

// Database diagnostic script
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function checkDatabase() {
  console.log('🔍 Checking Supabase Database Setup...');
  console.log('=====================================\n');

  // Check environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
    console.error('❌ Missing required environment variables');
    console.log('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  console.log('✅ Environment variables present');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Anon Key: ${supabaseAnonKey.substring(0, 20)}...`);
  console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

  // Create admin client
  const adminClient = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log('🔐 Testing admin client connection...');

    // Test basic connection by trying to access profiles table
    console.log('📋 Checking database tables...');

    // Check if profiles table exists and is accessible
    const { data: profilesData, error: profilesError } = await adminClient
      .from('profiles')
      .select('id')
      .limit(1);

    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError.message);
      console.log('   This suggests the profiles table doesn\'t exist or has permission issues');
    } else {
      console.log('✅ Profiles table accessible');
    }

    // Check if participants table exists and is accessible
    const { data: participantsData, error: participantsError } = await adminClient
      .from('participants')
      .select('id')
      .limit(1);

    if (participantsError) {
      console.error('❌ Participants table error:', participantsError.message);
      console.log('   This suggests the participants table doesn\'t exist or has permission issues');
    } else {
      console.log('✅ Participants table accessible');
    }

    // Check if we can create a basic auth user
    console.log('\n🧪 Testing auth user creation...');

    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true, // Skip email confirmation for testing
    });

    if (authError) {
      console.error('❌ Auth user creation failed:', authError.message);
      console.log('   This suggests an issue with Supabase auth configuration');
    } else {
      console.log('✅ Auth user creation successful');
      console.log(`   User ID: ${authData.user.id}`);

      // Clean up test user
      await adminClient.auth.admin.deleteUser(authData.user.id);
      console.log('✅ Test user cleaned up');
    }

    // Test anon client
    console.log('\n🔓 Testing anon client...');
    const anonClient = createClient(supabaseUrl, supabaseAnonKey);

    const { data: anonAuthData, error: anonAuthError } = await anonClient.auth.signUp({
      email: `anon-test-${Date.now()}@example.com`,
      password: 'TestPassword123!',
    });

    if (anonAuthError) {
      console.error('❌ Anon client signup failed:', anonAuthError.message);
      console.log('   Error code:', anonAuthError.status);
    } else {
      console.log('✅ Anon client signup successful');
      if (anonAuthData.user) {
        // Clean up
        await adminClient.auth.admin.deleteUser(anonAuthData.user.id);
        console.log('✅ Anon test user cleaned up');
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    process.exit(1);
  }

  console.log('\n🎉 Database check completed!');
}

checkDatabase().catch(console.error);