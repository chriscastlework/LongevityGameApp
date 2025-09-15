// Test script to verify service role key is working
// Run with: node scripts/test-service-role.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Supabase URL:', supabaseUrl ? 'Set' : 'NOT SET');
console.log('Service Role Key:', supabaseServiceKey ? 'Set (first 10 chars: ' + supabaseServiceKey.substring(0, 10) + '...)' : 'NOT SET');

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables!');
    console.log('Make sure you have:');
    console.log('- NEXT_PUBLIC_SUPABASE_URL in your .env.local');
    console.log('- SUPABASE_SERVICE_ROLE_KEY in your .env.local');
    process.exit(1);
}

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});

async function testServiceRole() {
    try {
        console.log('\n🧪 Testing service role access...');

        // Test 1: Can we query the profiles table structure?
        const { data: profiles, error: profilesError } = await adminClient
            .from('profiles')
            .select('*')
            .limit(1);

        if (profilesError) {
            console.error('❌ Cannot query profiles table:', profilesError.message);
            return;
        }

        console.log('✅ Can query profiles table');

        // Test 2: Check if role column exists
        const { data: columns, error: columnsError } = await adminClient
            .from('information_schema.columns')
            .select('column_name')
            .eq('table_schema', 'public')
            .eq('table_name', 'profiles')
            .eq('column_name', 'role');

        if (columnsError) {
            console.log('⚠️  Cannot check if role column exists:', columnsError.message);
        } else if (columns && columns.length > 0) {
            console.log('✅ Role column exists in profiles table');
        } else {
            console.log('❌ Role column does NOT exist in profiles table');
            console.log('👉 You need to run the migration: scripts/add-role-system-migration-simple.sql');
        }

        // Test 3: Try to insert a test profile
        const testId = '00000000-0000-0000-0000-000000000000';

        // First delete any existing test record
        await adminClient.from('profiles').delete().eq('id', testId);

        const { data: insertData, error: insertError } = await adminClient
            .from('profiles')
            .insert([{
                id: testId,
                name: 'Test User',
                email: 'test@example.com',
                date_of_birth: '1990-01-01',
                gender: 'male',
                job_title: 'Tester',
                organisation: 'Test Org',
                role: 'participant'
            }])
            .select()
            .single();

        if (insertError) {
            console.error('❌ Cannot insert test profile:', insertError.message);
            console.log('This suggests RLS policies are blocking service_role access');
            console.log('👉 Run the fix script: scripts/debug-and-fix-signup-issue.sql');
        } else {
            console.log('✅ Can insert profiles with service_role');

            // Clean up test record
            await adminClient.from('profiles').delete().eq('id', testId);
            console.log('✅ Cleaned up test record');
        }

    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
    }
}

testServiceRole().then(() => {
    console.log('\n🏁 Test complete!');
});