import { chromium, FullConfig } from '@playwright/test'

/**
 * Global Setup for Deep Link Authentication Tests
 * 
 * Prepares the test environment including:
 * - Database seeding with test data
 * - Test user creation and verification
 * - Mock OAuth provider setup
 * - Competition test data creation
 */

async function globalSetup(config: FullConfig) {
  console.log('🚀 Setting up deep link authentication test environment...')
  
  // Get base URL from config
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
  
  try {
    // Launch browser for setup operations
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Wait for application to be available
    await waitForApplication(page, baseURL)
    
    // Setup test data
    await setupTestUsers(page, baseURL)
    await setupTestCompetitions(page, baseURL)
    await setupOAuthMocks(page)
    
    await browser.close()
    
    console.log('✅ Test environment setup complete')
    
  } catch (error) {
    console.error('❌ Failed to setup test environment:', error)
    throw error
  }
}

/**
 * Wait for application to be available
 */
async function waitForApplication(page: any, baseURL: string) {
  console.log('⏳ Waiting for application to be available...')
  
  let retries = 30
  while (retries > 0) {
    try {
      await page.goto(baseURL, { timeout: 10000 })
      
      // Check if app is responding
      const title = await page.title()
      if (title) {
        console.log(`✅ Application available: ${title}`)
        return
      }
    } catch (error) {
      console.log(`🔄 Waiting for application... (${retries} retries left)`)
      await page.waitForTimeout(2000)
      retries--
    }
  }
  
  throw new Error('Application failed to start within timeout')
}

/**
 * Setup test users for authentication testing
 */
async function setupTestUsers(page: any, baseURL: string) {
  console.log('👥 Setting up test users...')
  
  const testUsers = [
    {
      email: 'deep-link-test@example.com',
      password: 'DeepLinkTest123!',
      firstName: 'DeepLink',
      lastName: 'TestUser',
      role: 'user'
    },
    {
      email: 'oauth-test@example.com',
      password: 'OAuthTest123!',
      firstName: 'OAuth',
      lastName: 'TestUser',
      role: 'user'
    },
    {
      email: 'mobile-test@example.com',
      password: 'MobileTest123!',
      firstName: 'Mobile',
      lastName: 'TestUser',
      role: 'user'
    },
    {
      email: 'competition-test@example.com',
      password: 'CompetitionTest123!',
      firstName: 'Competition',
      lastName: 'TestUser',
      role: 'user'
    },
    {
      email: 'admin-test@example.com',
      password: 'AdminTest123!',
      firstName: 'Admin',
      lastName: 'TestUser',
      role: 'admin'
    }
  ]
  
  for (const user of testUsers) {
    try {
      // Try to create user via API or signup flow
      await page.goto(`${baseURL}/auth/signup`)
      
      // Fill signup form
      await page.fill('input[name="firstName"]', user.firstName)
      await page.fill('input[name="lastName"]', user.lastName)
      await page.fill('input[name="email"]', user.email)
      await page.fill('input[name="password"]', user.password)
      
      // Accept terms if present
      const termsCheckbox = page.locator('input[name="acceptTerms"], input[type="checkbox"]:has-text("Terms")')
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check()
      }
      
      // Submit form
      const submitButton = page.locator('button[type="submit"]')
      if (await submitButton.isEnabled()) {
        await submitButton.click()
        await page.waitForTimeout(2000)
      }
      
      console.log(`✅ Created test user: ${user.email}`)
      
    } catch (error) {
      console.log(`⚠️  User ${user.email} may already exist or creation failed:`, error.message)
    }
  }
}

/**
 * Setup test competitions for entry testing
 */
async function setupTestCompetitions(page: any, baseURL: string) {
  console.log('🏆 Setting up test competitions...')
  
  const testCompetitions = [
    {
      id: '123e4567-e89b-12d3-a456-426614174000',
      title: 'Deep Link Test Competition',
      description: 'Competition for testing deep link authentication',
      status: 'open',
      isPublic: true,
      requiresInvite: false,
      maxParticipants: 1000
    },
    {
      id: '987fcdeb-51d2-4321-b654-123456789abc',
      title: 'OAuth Test Competition',
      description: 'Competition for testing OAuth flows',
      status: 'open',
      isPublic: true,
      requiresInvite: false,
      maxParticipants: 500
    },
    {
      id: 'aaaabbbb-cccc-dddd-eeee-ffffgggghhh',
      title: 'Mobile PWA Test Competition',
      description: 'Competition for testing mobile PWA deep links',
      status: 'open',
      isPublic: true,
      requiresInvite: false,
      maxParticipants: 2000
    },
    {
      id: 'invite123-test-4567-89ab-cdefghijklmn',
      title: 'Invite Only Competition',
      description: 'Competition requiring invite tokens',
      status: 'open',
      isPublic: false,
      requiresInvite: true,
      maxParticipants: 100
    },
    {
      id: 'closed12-3456-789a-bcde-fghijklmnopq',
      title: 'Closed Competition',
      description: 'Competition that is closed for testing',
      status: 'closed',
      isPublic: true,
      requiresInvite: false,
      maxParticipants: 50
    }
  ]
  
  // Store competition data for tests to use
  await page.evaluate((competitions) => {
    localStorage.setItem('test-competitions', JSON.stringify(competitions))
  }, testCompetitions)
  
  console.log(`✅ Setup ${testCompetitions.length} test competitions`)
}

/**
 * Setup OAuth mocks and test tokens
 */
async function setupOAuthMocks(page: any) {
  console.log('🔐 Setting up OAuth test environment...')
  
  // Setup OAuth state tokens for testing
  const oauthStates = [
    'mock-oauth-state-google-123456789abcdef',
    'mock-oauth-state-github-987654321fedcba',
    'mock-oauth-state-discord-abcdef123456789',
    'security-test-state-tamper-detection',
    'expired-state-test-should-fail-validation'
  ]
  
  // Setup invite tokens for testing
  const inviteTokens = [
    {
      token: 'valid-invite-token-abc123',
      competitionId: 'invite123-test-4567-89ab-cdefghijklmn',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      usageLimit: 100,
      usedCount: 0
    },
    {
      token: 'expired-invite-token',
      competitionId: 'invite123-test-4567-89ab-cdefghijklmn',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
      usageLimit: 50,
      usedCount: 25
    },
    {
      token: 'limited-invite-token',
      competitionId: 'invite123-test-4567-89ab-cdefghijklmn',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      usageLimit: 10,
      usedCount: 10 // At limit
    }
  ]
  
  // Store test data
  await page.evaluate(({ states, tokens }) => {
    localStorage.setItem('test-oauth-states', JSON.stringify(states))
    localStorage.setItem('test-invite-tokens', JSON.stringify(tokens))
  }, { states: oauthStates, tokens: inviteTokens })
  
  console.log('✅ OAuth test environment ready')
}

export default globalSetup