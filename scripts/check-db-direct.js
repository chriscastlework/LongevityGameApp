#!/usr/bin/env node

/**
 * Check database structure directly using PostgreSQL connection
 */

const path = require('path');
const { Client } = require('pg');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.POSTGRES_URL_NON_POOLING;

if (!connectionString) {
  console.error('Missing POSTGRES_URL_NON_POOLING environment variable');
  process.exit(1);
}

async function checkDatabase() {
  // Try with built-in connection string SSL mode
  const modifiedConnectionString = connectionString.includes('sslmode=')
    ? connectionString
    : `${connectionString}&sslmode=require`;

  const client = new Client({
    connectionString: modifiedConnectionString,
    ssl: process.env.NODE_ENV === 'production' ? true : { rejectUnauthorized: false }
  });

  try {
    console.log('🔍 Connecting to database directly...\n');
    await client.connect();

    // Check 1: Basic database info
    console.log('1. Database connection info:');
    const { rows: dbInfo } = await client.query('SELECT current_database(), current_user;');
    console.log(`Database: ${dbInfo[0].current_database}, User: ${dbInfo[0].current_user}\n`);

    // Check 2: Check if profiles table exists and its structure
    console.log('2. Profiles table structure:');
    const { rows: profileColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles'
      ORDER BY ordinal_position;
    `);

    if (profileColumns.length > 0) {
      console.log('✅ Profiles table found:');
      profileColumns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ Profiles table not found');
    }
    console.log('');

    // Check 3: Check if participants table exists and its structure
    console.log('3. Participants table structure:');
    const { rows: participantColumns } = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'participants'
      ORDER BY ordinal_position;
    `);

    if (participantColumns.length > 0) {
      console.log('✅ Participants table found:');
      participantColumns.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('❌ Participants table not found');
    }
    console.log('');

    // Check 4: Check for auth.users triggers
    console.log('4. Checking triggers on auth.users:');
    const { rows: triggers } = await client.query(`
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement,
        action_timing
      FROM information_schema.triggers
      WHERE event_object_schema = 'auth' AND event_object_table = 'users'
      ORDER BY trigger_name;
    `);

    if (triggers.length > 0) {
      console.log('Found triggers on auth.users:');
      triggers.forEach(trigger => {
        console.log(`- ${trigger.trigger_name}: ${trigger.action_timing} ${trigger.event_manipulation}`);
        console.log(`  Action: ${trigger.action_statement}`);
      });
    } else {
      console.log('✅ No custom triggers found on auth.users');
    }
    console.log('');

    // Check 5: Test basic table insertion
    console.log('5. Testing basic table operations:');

    // Test profiles table insert (this should work)
    const testId = '00000000-0000-0000-0000-000000000001'; // UUID format
    try {
      await client.query('BEGIN');

      const { rows: insertTest } = await client.query(`
        INSERT INTO profiles (id, name, email, date_of_birth, gender, job_title, organisation)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id;
      `, [testId, 'Test User', 'test@example.com', '1990-01-01', 'male', 'Tester', 'Test Corp']);

      console.log('✅ Profiles table insert successful:', insertTest[0].id);

      // Clean up
      await client.query('ROLLBACK');
      console.log('✅ Transaction rolled back (test data cleaned up)');

    } catch (error) {
      await client.query('ROLLBACK');
      console.log('❌ Profiles table insert failed:', error.message);
    }

    console.log('\n6. Auth schema tables:');
    const { rows: authTables } = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'auth'
      ORDER BY table_name;
    `);

    if (authTables.length > 0) {
      console.log('Auth tables found:');
      authTables.forEach(table => console.log(`- ${table.table_name}`));
    } else {
      console.log('❌ No auth tables found (this is a problem!)');
    }

  } catch (error) {
    console.error('❌ Database check error:', error.message);
  } finally {
    await client.end();
  }

  console.log('\n🔧 Database check complete.');
}

checkDatabase();