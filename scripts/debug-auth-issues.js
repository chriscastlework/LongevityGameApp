#!/usr/bin/env node

/**
 * Debug Supabase auth issues by checking database configuration
 */

const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

// Create admin client
const adminClient = createClient(supabaseUrl, supabaseServiceKey);

async function debugAuthIssues() {
  console.log('🔍 Debugging Supabase auth issues...\n');

  try {
    // Check 1: Test basic database connection
    console.log('1. Testing database connection...');
    const { data: connectionTest, error: connectionError } = await adminClient
      .from('profiles')
      .select('count')
      .limit(1);

    if (connectionError) {
      console.log('❌ Database connection failed:', connectionError.message);
      return;
    }
    console.log('✅ Database connection successful\n');

    // Check 2: Check for triggers on auth.users table
    console.log('2. Checking for triggers on auth.users table...');
    const { data: triggers, error: triggerError } = await adminClient
      .rpc('sql', {
        sql: `
          SELECT trigger_name, event_manipulation, event_object_table, action_statement
          FROM information_schema.triggers
          WHERE event_object_schema = 'auth' AND event_object_table = 'users'
          ORDER BY trigger_name;
        `
      });

    if (triggerError) {
      console.log('⚠️  Could not check triggers (might not have access):', triggerError.message);
    } else if (triggers && triggers.length > 0) {
      console.log('Found triggers on auth.users:');
      triggers.forEach(trigger => {
        console.log(`- ${trigger.trigger_name}: ${trigger.event_manipulation} -> ${trigger.action_statement}`);
      });
    } else {
      console.log('✅ No custom triggers found on auth.users table');
    }
    console.log('');

    // Check 3: Test profiles table structure
    console.log('3. Checking profiles table structure...');
    const { data: profileStructure, error: profileError } = await adminClient
      .rpc('sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'profiles'
          ORDER BY ordinal_position;
        `
      });

    if (profileError) {
      console.log('❌ Could not check profiles table:', profileError.message);
    } else if (profileStructure && profileStructure.length > 0) {
      console.log('Profiles table structure:');
      profileStructure.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('⚠️  Profiles table not found or no access');
    }
    console.log('');

    // Check 4: Test participants table structure
    console.log('4. Checking participants table structure...');
    const { data: participantStructure, error: participantError } = await adminClient
      .rpc('sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'participants'
          ORDER BY ordinal_position;
        `
      });

    if (participantError) {
      console.log('❌ Could not check participants table:', participantError.message);
    } else if (participantStructure && participantStructure.length > 0) {
      console.log('Participants table structure:');
      participantStructure.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('⚠️  Participants table not found or no access');
    }
    console.log('');

    // Check 5: Test simple auth operations
    console.log('5. Testing simple auth operations...');

    // Try to create a test user with minimal data
    const testEmail = `debug-test-${Date.now()}@example.com`;
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: testEmail,
      password: 'TestPassword123!',
      email_confirm: true
    });

    if (authError) {
      console.log('❌ Auth user creation failed:', authError.message);
      if (authError.message.includes('trigger')) {
        console.log('   This suggests a database trigger is causing issues');
      }
    } else {
      console.log('✅ Auth user creation successful');
      console.log('User ID:', authData.user.id);

      // Clean up test user
      const { error: deleteError } = await adminClient.auth.admin.deleteUser(authData.user.id);
      if (deleteError) {
        console.log('⚠️  Could not clean up test user:', deleteError.message);
      } else {
        console.log('✅ Test user cleaned up successfully');
      }
    }

  } catch (error) {
    console.error('❌ Debug script error:', error.message);
  }

  console.log('\n🔧 Debug complete. Check the results above for issues.');
}

debugAuthIssues();