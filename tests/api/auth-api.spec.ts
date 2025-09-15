import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

test.describe('Authentication API Integration Tests', () => {
  test.describe('POST /api/auth/signup', () => {
    test('should create new user account successfully', async ({ request }) => {
      const timestamp = Date.now();
      const testUser = {
        fullName: `Test User ${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'TestPass123!',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        jobTitle: 'Software Engineer',
        organization: 'Test Company'
      };

      const response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: testUser,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.user.email).toBe(testUser.email);
      expect(responseData.data.profile.name).toBe(testUser.fullName);
      expect(responseData.data.participant).toBeDefined();
      expect(responseData.message).toBe('Account created successfully');
    });

    test('should reject signup with missing required fields', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: {
          email: 'test@example.com',
          // Missing password and other required fields
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Missing required fields');
      expect(responseData.details).toContain('fullName, email, password');
    });

    test('should reject signup with weak password', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: {
          fullName: 'Test User',
          email: 'test@example.com',
          password: '123', // Too short
          dateOfBirth: '1990-01-01',
          gender: 'male',
          jobTitle: 'Engineer',
          organization: 'Test Company'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Password too weak');
      expect(responseData.details).toContain('at least 8 characters');
    });

    test('should reject signup with invalid email', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: {
          fullName: 'Test User',
          email: 'invalid-email',
          password: 'TestPass123!',
          dateOfBirth: '1990-01-01',
          gender: 'male',
          jobTitle: 'Engineer',
          organization: 'Test Company'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid email format');
    });

    test('should reject signup with invalid gender', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: {
          fullName: 'Test User',
          email: 'test@example.com',
          password: 'TestPass123!',
          dateOfBirth: '1990-01-01',
          gender: 'other', // Invalid gender
          jobTitle: 'Engineer',
          organization: 'Test Company'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid gender');
      expect(responseData.details).toContain("must be 'male' or 'female'");
    });

    test('should reject duplicate email signup', async ({ request }) => {
      const timestamp = Date.now();
      const testUser = {
        fullName: `Test User ${timestamp}`,
        email: `duplicate${timestamp}@example.com`,
        password: 'TestPass123!',
        dateOfBirth: '1990-01-01',
        gender: 'female',
        jobTitle: 'Engineer',
        organization: 'Test Company'
      };

      // First signup
      const firstResponse = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: testUser,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(firstResponse.status()).toBe(200);

      // Second signup with same email
      const secondResponse = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: testUser,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(secondResponse.status()).toBe(409);

      const responseData = await secondResponse.json();
      expect(responseData.error).toBe('User already exists');
    });
  });

  test.describe('POST /api/auth/login', () => {
    let testUser: any;

    test.beforeAll(async ({ request }) => {
      // Create a test user for login tests
      const timestamp = Date.now();
      testUser = {
        fullName: `Login Test User ${timestamp}`,
        email: `logintest${timestamp}@example.com`,
        password: 'LoginTest123!',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        jobTitle: 'Test Engineer',
        organization: 'Test Company'
      };

      const response = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: testUser,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      expect(response.status()).toBe(200);
    });

    test('should login successfully with valid credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.user.email).toBe(testUser.email);
      expect(responseData.data.session.access_token).toBeDefined();
      expect(responseData.data.session.refresh_token).toBeDefined();
      expect(responseData.message).toBe('Login successful');
    });

    test('should reject login with missing credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: testUser.email
          // Missing password
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Missing required fields');
      expect(responseData.details).toBe('Email and password are required');
    });

    test('should reject login with invalid email format', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: 'invalid-email',
          password: 'password123'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(400);

      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid email format');
    });

    test('should reject login with wrong credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: 'wrongpassword'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid credentials');
      expect(responseData.details).toBe('Email or password is incorrect');
    });

    test('should reject login with non-existent user', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: 'nonexistent@example.com',
          password: 'password123'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(response.status()).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid credentials');
    });
  });

  test.describe('GET /api/auth/session', () => {
    let testUser: any;
    let accessToken: string;

    test.beforeAll(async ({ request }) => {
      // Create and login a test user
      const timestamp = Date.now();
      testUser = {
        fullName: `Session Test User ${timestamp}`,
        email: `sessiontest${timestamp}@example.com`,
        password: 'SessionTest123!',
        dateOfBirth: '1990-01-01',
        gender: 'female',
        jobTitle: 'Test Engineer',
        organization: 'Test Company'
      };

      // Signup
      await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: testUser,
        headers: { 'Content-Type': 'application/json' }
      });

      // Login to get token
      const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        },
        headers: { 'Content-Type': 'application/json' }
      });

      const loginData = await loginResponse.json();
      accessToken = loginData.data.session.access_token;
    });

    test('should return session data with valid token', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.data.user.email).toBe(testUser.email);
      expect(responseData.data.profile).toBeDefined();
      expect(responseData.data.participant).toBeDefined();
      expect(responseData.message).toBe('Session valid');
    });

    test('should reject session check without authorization header', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/session`);

      expect(response.status()).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Unauthorized');
      expect(responseData.details).toBe('Bearer token required');
    });

    test('should reject session check with invalid token', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': 'Bearer invalid-token'
        }
      });

      expect(response.status()).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Invalid session');
    });

    test('should reject session check with malformed authorization header', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': 'InvalidFormat'
        }
      });

      expect(response.status()).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Unauthorized');
      expect(responseData.details).toBe('Bearer token required');
    });
  });

  test.describe('POST /api/auth/logout', () => {
    let testUser: any;
    let accessToken: string;

    test.beforeEach(async ({ request }) => {
      // Create and login a test user for each logout test
      const timestamp = Date.now();
      testUser = {
        fullName: `Logout Test User ${timestamp}`,
        email: `logouttest${timestamp}@example.com`,
        password: 'LogoutTest123!',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        jobTitle: 'Test Engineer',
        organization: 'Test Company'
      };

      // Signup
      await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: testUser,
        headers: { 'Content-Type': 'application/json' }
      });

      // Login to get token
      const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        },
        headers: { 'Content-Type': 'application/json' }
      });

      const loginData = await loginResponse.json();
      accessToken = loginData.data.session.access_token;
    });

    test('should logout successfully with valid token', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/logout`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      expect(response.status()).toBe(200);

      const responseData = await response.json();
      expect(responseData.success).toBe(true);
      expect(responseData.message).toBe('Logged out successfully');

      // Verify session is invalid after logout
      const sessionResponse = await request.get(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      expect(sessionResponse.status()).toBe(401);
    });

    test('should reject logout without authorization header', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/logout`);

      expect(response.status()).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Unauthorized');
      expect(responseData.details).toBe('Bearer token required');
    });

    test('should reject logout with malformed authorization header', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/logout`, {
        headers: {
          'Authorization': 'InvalidFormat'
        }
      });

      expect(response.status()).toBe(401);

      const responseData = await response.json();
      expect(responseData.error).toBe('Unauthorized');
      expect(responseData.details).toBe('Bearer token required');
    });
  });

  test.describe('Authentication Flow Integration', () => {
    test('should complete full authentication flow: signup -> login -> session -> logout', async ({ request }) => {
      const timestamp = Date.now();
      const testUser = {
        fullName: `Flow Test User ${timestamp}`,
        email: `flowtest${timestamp}@example.com`,
        password: 'FlowTest123!',
        dateOfBirth: '1990-01-01',
        gender: 'female',
        jobTitle: 'Test Engineer',
        organization: 'Test Company'
      };

      // 1. Signup
      const signupResponse = await request.post(`${API_BASE_URL}/api/auth/signup`, {
        data: testUser,
        headers: { 'Content-Type': 'application/json' }
      });
      expect(signupResponse.status()).toBe(200);

      const signupData = await signupResponse.json();
      expect(signupData.success).toBe(true);

      // 2. Login
      const loginResponse = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: testUser.email,
          password: testUser.password
        },
        headers: { 'Content-Type': 'application/json' }
      });
      expect(loginResponse.status()).toBe(200);

      const loginData = await loginResponse.json();
      expect(loginData.success).toBe(true);
      const accessToken = loginData.data.session.access_token;

      // 3. Check session
      const sessionResponse = await request.get(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      expect(sessionResponse.status()).toBe(200);

      const sessionData = await sessionResponse.json();
      expect(sessionData.success).toBe(true);
      expect(sessionData.data.user.email).toBe(testUser.email);

      // 4. Logout
      const logoutResponse = await request.post(`${API_BASE_URL}/api/auth/logout`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      expect(logoutResponse.status()).toBe(200);

      const logoutData = await logoutResponse.json();
      expect(logoutData.success).toBe(true);

      // 5. Verify session is invalid after logout
      const postLogoutSessionResponse = await request.get(`${API_BASE_URL}/api/auth/session`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      expect(postLogoutSessionResponse.status()).toBe(401);
    });
  });
});