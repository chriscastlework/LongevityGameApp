import { Page, expect } from '@playwright/test'

/**
 * Authentication Test Helpers
 * 
 * Comprehensive utility class for authentication testing scenarios
 * including user data generation, form handling, and OAuth mocking
 */

export interface TestUser {
  firstName: string
  lastName: string
  email: string
  password: string
  dateOfBirth?: string
  phoneNumber?: string
}

export interface MockOAuthResponse {
  provider: 'google' | 'github' | 'discord'
  code: string
  state: string
  error?: string
  errorDescription?: string
}

export class AuthTestHelpers {
  constructor(private page: Page) {}

  /**
   * Generate realistic test user data
   */
  generateTestUser(options: {
    includeOptionalFields?: boolean
    passwordStrength?: 'weak' | 'medium' | 'strong'
    emailDomain?: string
  } = {}): TestUser {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    
    const firstName = `Test${random}`
    const lastName = `User${timestamp}`
    const domain = options.emailDomain || 'testdomain.com'
    const email = `test-${timestamp}-${random}@${domain}`
    
    let password: string
    switch (options.passwordStrength) {
      case 'weak':
        password = 'password'
        break
      case 'medium':
        password = 'Password123'
        break
      case 'strong':
      default:
        password = `TestPassword123!${random}`
        break
    }

    const user: TestUser = {
      firstName,
      lastName,
      email,
      password
    }

    if (options.includeOptionalFields) {
      user.dateOfBirth = '1990-01-01'
      user.phoneNumber = `+1555${String(random).padStart(7, '0')}`
    }

    return user
  }

  /**
   * Generate multiple test users with different characteristics
   */
  generateTestUserBatch(count: number = 5): TestUser[] {
    const users: TestUser[] = []
    
    for (let i = 0; i < count; i++) {
      const passwordStrength = ['weak', 'medium', 'strong'][i % 3] as 'weak' | 'medium' | 'strong'
      const includeOptional = i % 2 === 0
      
      users.push(this.generateTestUser({
        passwordStrength,
        includeOptionalFields: includeOptional
      }))
    }
    
    return users
  }

  /**
   * Fill login form with provided credentials
   */
  async fillLoginForm(email: string, password: string, options: {
    rememberMe?: boolean
    clearFirst?: boolean
  } = {}): Promise<void> {
    if (options.clearFirst) {
      await this.page.fill('input[name="email"]', '')
      await this.page.fill('input[name="password"]', '')
    }
    
    await this.page.fill('input[name="email"]', email)
    await this.page.fill('input[name="password"]', password)
    
    if (options.rememberMe) {
      const rememberCheckbox = this.page.locator('input[name="rememberMe"], input[type="checkbox"]:has-text("Remember")')
      if (await rememberCheckbox.count() > 0) {
        await rememberCheckbox.check()
      }
    }
    
    // Wait for form validation
    await this.page.waitForTimeout(500)
  }

  /**
   * Fill signup form with test user data
   */
  async fillSignupForm(user: TestUser, options: {
    acceptTerms?: boolean
    newsletter?: boolean
  } = { acceptTerms: true }): Promise<void> {
    await this.page.fill('input[name="firstName"]', user.firstName)
    await this.page.fill('input[name="lastName"]', user.lastName)
    await this.page.fill('input[name="email"]', user.email)
    await this.page.fill('input[name="password"]', user.password)
    
    // Fill password confirmation if present
    const confirmPassword = this.page.locator('input[name="confirmPassword"], input[name="passwordConfirm"]')
    if (await confirmPassword.count() > 0) {
      await confirmPassword.fill(user.password)
    }
    
    // Fill optional fields
    if (user.dateOfBirth) {
      const dobField = this.page.locator('input[name="dateOfBirth"], input[type="date"]')
      if (await dobField.count() > 0) {
        await dobField.fill(user.dateOfBirth)
      }
    }
    
    if (user.phoneNumber) {
      const phoneField = this.page.locator('input[name="phoneNumber"], input[name="phone"]')
      if (await phoneField.count() > 0) {
        await phoneField.fill(user.phoneNumber)
      }
    }
    
    // Handle checkboxes
    if (options.acceptTerms) {
      const termsCheckbox = this.page.locator('input[name="acceptTerms"], input[type="checkbox"]:has-text("Terms")')
      if (await termsCheckbox.count() > 0) {
        await termsCheckbox.check()
      }
    }
    
    if (options.newsletter) {
      const newsletterCheckbox = this.page.locator('input[name="newsletter"], input[type="checkbox"]:has-text("newsletter")')
      if (await newsletterCheckbox.count() > 0) {
        await newsletterCheckbox.check()
      }
    }
    
    // Wait for form validation
    await this.page.waitForTimeout(500)
  }

  /**
   * Complete login flow (fill form and submit)
   */
  async login(email: string, password: string, options: {
    rememberMe?: boolean
    expectSuccess?: boolean
  } = { expectSuccess: true }): Promise<void> {
    await this.fillLoginForm(email, password, { rememberMe: options.rememberMe })
    
    const submitButton = this.page.locator('button[type="submit"]')
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    
    if (options.expectSuccess) {
      // Wait for redirect or success indication
      await this.page.waitForTimeout(3000)
      
      // Verify not on login page anymore
      const isStillOnLogin = this.page.url().includes('/auth/login')
      expect(isStillOnLogin).toBeFalsy()
    }
  }

  /**
   * Complete signup flow (fill form and submit)
   */
  async signup(user: TestUser, options: {
    acceptTerms?: boolean
    expectSuccess?: boolean
  } = { acceptTerms: true, expectSuccess: true }): Promise<void> {
    await this.fillSignupForm(user, { acceptTerms: options.acceptTerms })
    
    const submitButton = this.page.locator('button[type="submit"]')
    await expect(submitButton).toBeEnabled()
    await submitButton.click()
    
    if (options.expectSuccess) {
      await this.page.waitForTimeout(3000)
      
      // Should show success message or redirect to email confirmation
      const hasSuccess = await this.page.locator('.success, .alert-success').count() > 0
      const isOnConfirmationPage = this.page.url().includes('confirm') || this.page.url().includes('verify')
      
      expect(hasSuccess || isOnConfirmationPage).toBeTruthy()
    }
  }

  /**
   * Mock and handle OAuth flow
   */
  async mockOAuthFlow(response: MockOAuthResponse): Promise<void> {
    const { provider, code, state, error, errorDescription } = response
    
    // Mock OAuth provider redirect
    await this.page.route(`**/auth/oauth/${provider}**`, route => {
      const url = new URL(route.request().url())
      const redirectUri = url.searchParams.get('redirect_uri') || `/auth/callback/${provider}`
      
      const callbackUrl = new URL(redirectUri, this.page.url())
      
      if (error) {
        callbackUrl.searchParams.set('error', error)
        if (errorDescription) {
          callbackUrl.searchParams.set('error_description', errorDescription)
        }
      } else {
        callbackUrl.searchParams.set('code', code)
      }
      
      callbackUrl.searchParams.set('state', state)
      
      route.fulfill({
        status: 302,
        headers: { 'Location': callbackUrl.toString() }
      })
    })
    
    // Store state for validation
    await this.page.evaluate((stateValue) => {
      const data = { value: stateValue, expiry: Date.now() + 600000 }
      sessionStorage.setItem('oauth_state', JSON.stringify(data))
    }, state)
  }

  /**
   * Mock successful OAuth authentication
   */
  async mockSuccessfulOAuth(provider: 'google' | 'github' | 'discord' = 'google'): Promise<void> {
    const state = `mock-oauth-state-${Date.now()}`
    const code = `mock-auth-code-${Date.now()}`
    
    await this.mockOAuthFlow({ provider, code, state })
    
    // Mock token exchange API
    await this.page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: {
            id: 'mock-user-id',
            email: 'oauth@testdomain.com',
            user_metadata: {
              full_name: 'OAuth Test User',
              avatar_url: 'https://example.com/avatar.jpg'
            }
          },
          session: {
            access_token: 'mock-access-token',
            refresh_token: 'mock-refresh-token',
            expires_at: Date.now() + 3600000
          }
        })
      })
    })
  }

  /**
   * Simulate user already logged in
   */
  async loginUser(user?: TestUser): Promise<void> {
    const testUser = user || this.generateTestUser()
    
    // Mock authentication state
    await this.page.evaluate(({ email, id }) => {
      const authData = {
        user: {
          id: id || 'mock-user-id',
          email,
          user_metadata: {
            full_name: 'Test User'
          }
        },
        session: {
          access_token: 'mock-access-token',
          refresh_token: 'mock-refresh-token',
          expires_at: Date.now() + 3600000
        }
      }
      
      localStorage.setItem('supabase.auth.token', JSON.stringify(authData))
    }, { email: testUser.email, id: `user-${Date.now()}` })
    
    // Mock API responses for authenticated user
    await this.page.route('**/api/auth/user', route => {
      route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'mock-user-id',
          email: testUser.email,
          user_metadata: {
            full_name: `${testUser.firstName} ${testUser.lastName}`
          }
        })
      })
    })
  }

  /**
   * Validate form accessibility
   */
  async validateFormAccessibility(): Promise<void> {
    // Check for proper labels
    const inputs = await this.page.locator('input[type="email"], input[type="password"], input[type="text"]').all()
    
    for (const input of inputs) {
      const id = await input.getAttribute('id')
      const name = await input.getAttribute('name')
      const ariaLabel = await input.getAttribute('aria-label')
      
      if (id) {
        // Check for associated label
        const label = this.page.locator(`label[for="${id}"]`)
        const hasLabel = await label.count() > 0
        expect(hasLabel || !!ariaLabel).toBeTruthy()
      }
      
      // Check for required attribute and aria-required
      const isRequired = await input.getAttribute('required')
      const ariaRequired = await input.getAttribute('aria-required')
      
      if (isRequired !== null) {
        expect(ariaRequired).toBe('true')
      }
    }
    
    // Check form has proper role
    const form = this.page.locator('form')
    if (await form.count() > 0) {
      const role = await form.getAttribute('role')
      const ariaLabel = await form.getAttribute('aria-label')
      const ariaLabelledBy = await form.getAttribute('aria-labelledby')
      
      // Should have proper identification
      expect(role === 'form' || !!ariaLabel || !!ariaLabelledBy).toBeTruthy()
    }
    
    // Check submit button accessibility
    const submitButton = this.page.locator('button[type="submit"]')
    if (await submitButton.count() > 0) {
      const ariaLabel = await submitButton.getAttribute('aria-label')
      const text = await submitButton.textContent()
      
      // Should have accessible name
      expect(!!text || !!ariaLabel).toBeTruthy()
    }
  }

  /**
   * Test password strength validation
   */
  async testPasswordStrength(): Promise<void> {
    const weakPasswords = [
      'password',
      '123456',
      'qwerty',
      'abc123',
      'password123',
      '12345678'
    ]
    
    const strongPasswords = [
      'MyStr0ngP@ssw0rd!',
      'C0mpl3x!P@ssw0rd',
      'S3cur3_P@ssw0rd!23',
      'MyV3ryStr0ng!P@ss'
    ]
    
    const passwordInput = this.page.locator('input[name="password"], input[type="password"]')
    
    // Test weak passwords
    for (const weakPassword of weakPasswords) {
      await passwordInput.fill(weakPassword)
      await this.page.waitForTimeout(500)
      
      // Should show weakness indicator
      const weakIndicator = await this.page.locator('.password-weak, .strength-weak, [data-strength="weak"]').count() > 0
      expect(weakIndicator).toBeTruthy()
    }
    
    // Test strong passwords
    for (const strongPassword of strongPasswords) {
      await passwordInput.fill(strongPassword)
      await this.page.waitForTimeout(500)
      
      // Should show strength indicator
      const strongIndicator = await this.page.locator('.password-strong, .strength-strong, [data-strength="strong"]').count() > 0
      expect(strongIndicator).toBeTruthy()
    }
  }

  /**
   * Test form validation messages
   */
  async testValidationMessages(): Promise<void> {
    const emailInput = this.page.locator('input[name="email"], input[type="email"]')
    const passwordInput = this.page.locator('input[name="password"], input[type="password"]')
    
    // Test invalid email
    await emailInput.fill('invalid-email')
    await emailInput.blur()
    await this.page.waitForTimeout(500)
    
    const emailError = await this.page.locator('.error:has-text("email"), .invalid:has-text("email"), [aria-invalid="true"]').count() > 0
    expect(emailError).toBeTruthy()
    
    // Test empty required fields
    await passwordInput.fill('')
    await passwordInput.blur()
    await this.page.waitForTimeout(500)
    
    const requiredError = await this.page.locator('.error:has-text("required"), .invalid:has-text("required")').count() > 0
    expect(requiredError).toBeTruthy()
  }

  /**
   * Get common test scenarios
   */
  static getTestScenarios() {
    return {
      weakPasswords: [
        'password',
        '123456',
        'qwerty',
        'abc123'
      ],
      strongPasswords: [
        'MyStr0ngP@ssw0rd!',
        'C0mpl3x!P@ssw0rd',
        'S3cur3_P@ssw0rd!23'
      ],
      invalidEmails: [
        'invalid-email',
        '@domain.com',
        'user@',
        'user..user@domain.com',
        'user@domain',
        'user name@domain.com'
      ],
      validEmails: [
        'user@domain.com',
        'user.name@domain.com',
        'user+tag@domain.co.uk',
        'user123@test-domain.com'
      ],
      maliciousInputs: [
        '<script>alert("xss")</script>',
        'javascript:alert(1)',
        '../../etc/passwd',
        '"><script>evil()</script>',
        'data:text/html,<script>alert(1)</script>'
      ]
    }
  }

  /**
   * Clean up after tests
   */
  async cleanup(): Promise<void> {
    // Clear all storage
    await this.page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
    
    // Clear all cookies
    await this.page.context().clearCookies()
    
    // Remove any mock routes
    await this.page.unroute('**/*')
  }
}

/**
 * Test data generators for different scenarios
 */
export class TestDataGenerator {
  static generateCompetitionId(): string {
    // Generate valid UUID v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }
  
  static generateInviteToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return result
  }
  
  static generateOAuthState(): string {
    const array = new Uint8Array(32)
    crypto.getRandomValues(array)
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
  }
  
  static generateCampaignParams(): Record<string, string> {
    const sources = ['google', 'facebook', 'twitter', 'email', 'direct']
    const mediums = ['cpc', 'social', 'email', 'referral', 'organic']
    const campaigns = ['summer_challenge', 'new_user', 'retargeting', 'viral_share']
    
    return {
      utm_source: sources[Math.floor(Math.random() * sources.length)],
      utm_medium: mediums[Math.floor(Math.random() * mediums.length)],
      utm_campaign: campaigns[Math.floor(Math.random() * campaigns.length)]
    }
  }
}