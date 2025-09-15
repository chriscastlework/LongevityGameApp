#!/usr/bin/env node

/**
 * Test the API authentication endpoints
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const BASE_URL = 'http://localhost:3002'; // Development server

async function testApiAuth() {
  console.log('Testing API authentication endpoints...\n');

  const testEmail = `test-api-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';

  try {
    // Test 1: Signup
    console.log('Test 1: Signup API');
    const signupData = {
      fullName: 'API Test User',
      email: testEmail,
      password: testPassword,
      dateOfBirth: '1990-01-01',
      gender: 'female',
      jobTitle: 'API Tester',
      organization: 'Test Corp',
      phone: '123-456-7890',
      consentWellness: true,
      consentLiability: true,
      consentData: true,
    };

    const signupResponse = await fetch(`${BASE_URL}/api/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(signupData),
    });

    const signupResult = await signupResponse.json();

    if (!signupResponse.ok) {
      console.log('❌ Signup failed:', signupResult.error);
      console.log('   Details:', signupResult.details);
      return;
    }

    console.log('✅ Signup successful!');
    console.log('User ID:', signupResult.data.user.id);
    console.log('Profile created:', !!signupResult.data.profile);
    console.log('Participant created:', !!signupResult.data.participant);

    const accessToken = signupResult.data.session?.access_token;
    if (!accessToken) {
      console.log('❌ No access token returned from signup');
      return;
    }

    console.log('✅ Access token received');

    // Test 2: Session validation
    console.log('\nTest 2: Session Validation API');
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const sessionResult = await sessionResponse.json();

    if (!sessionResponse.ok) {
      console.log('❌ Session validation failed:', sessionResult.error);
      console.log('   Details:', sessionResult.details);
    } else {
      console.log('✅ Session validation successful!');
      console.log('User ID:', sessionResult.data.user.id);
      console.log('Profile loaded:', !!sessionResult.data.profile);
      console.log('Participant loaded:', !!sessionResult.data.participant);
    }

    // Test 3: Logout
    console.log('\nTest 3: Logout API');
    const logoutResponse = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const logoutResult = await logoutResponse.json();

    if (!logoutResponse.ok) {
      console.log('❌ Logout failed:', logoutResult.error);
      console.log('   Details:', logoutResult.details);
    } else {
      console.log('✅ Logout successful!');
    }

    // Test 4: Login
    console.log('\nTest 4: Login API');
    const loginData = {
      email: testEmail,
      password: testPassword,
    };

    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(loginData),
    });

    const loginResult = await loginResponse.json();

    if (!loginResponse.ok) {
      console.log('❌ Login failed:', loginResult.error);
      console.log('   Details:', loginResult.details);
    } else {
      console.log('✅ Login successful!');
      console.log('User ID:', loginResult.data.user.id);
      console.log('Profile loaded:', !!loginResult.data.profile);
      console.log('Participant loaded:', !!loginResult.data.participant);
      console.log('Access token received:', !!loginResult.data.session?.access_token);
    }

    console.log('\n🎉 All API tests completed!');

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testApiAuth();