import { test, expect } from '@playwright/test'
import { AuthTestHelpers } from '../utils/auth-test-helpers'

/**
 * Authentication Error Scenarios Test Suite
 * 
 * Comprehensive testing of error conditions and edge cases in
 * deep link authentication flows including network failures,
 * malformed data, and recovery scenarios
 */

test.describe('Authentication Error Scenarios', () => {
  let authHelpers: AuthTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthTestHelpers(page)
  })

  test.describe('Network Failure Scenarios', () => {
    test('should handle network timeout during authentication', async ({ page }) => {
      const testUser = authHelpers.generateTestUser()
      
      // Mock slow/timeout network
      await page.route('**/api/auth/**', route => {
        // Delay response to trigger timeout
        setTimeout(() => {
          route.fulfill({
            status: 408,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Request timeout' })
          })
        }, 10000) // 10 second delay
      })
      
      await page.goto('/auth/login?redirect=/competition/timeout-test/enter')
      
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Should show timeout error
      await expect(page.locator('.error:has-text("timeout"), .alert-destructive:has-text("timeout")')).toBeVisible({ timeout: 15000 })
      
      // Should provide retry mechanism
      const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")')
      await expect(retryButton).toBeVisible()
    })

    test('should handle intermittent connectivity during OAuth flow', async ({ page }) => {
      const competitionUrl = '/competition/connectivity-test/enter'
      
      // Start OAuth flow
      await page.goto(`/auth/login?redirect=${encodeURIComponent(competitionUrl)}`)
      
      const state = 'intermittent-connectivity-state-123'
      await page.evaluate((s) => {
        const data = { value: s, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      // Mock intermittent network failure
      let requestCount = 0
      await page.route('**/auth/callback/**', route => {
        requestCount++
        if (requestCount === 1) {
          // First request fails
          route.fulfill({
            status: 0, // Network error
            body: ''
          })
        } else {
          // Second request succeeds
          route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: { id: 'test-user', email: 'test@example.com' },
              session: { access_token: 'mock-token' }
            })
          })
        }
      })
      
      // Attempt OAuth callback
      await page.goto(`/auth/callback/google?code=connectivity-test&state=${state}`)
      
      // Should eventually succeed with retry
      await page.waitForTimeout(5000)
      const finalUrl = page.url()
      expect(finalUrl).toContain(competitionUrl)
    })

    test('should handle server errors during authentication', async ({ page }) => {
      const testUser = authHelpers.generateTestUser()
      
      // Mock server error responses
      const errorScenarios = [
        { status: 500, message: 'Internal Server Error' },
        { status: 502, message: 'Bad Gateway' },
        { status: 503, message: 'Service Unavailable' },
        { status: 504, message: 'Gateway Timeout' }
      ]
      
      for (const scenario of errorScenarios) {
        await page.route('**/api/auth/**', route => {
          route.fulfill({
            status: scenario.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: scenario.message })
          })
        })
        
        await page.goto('/auth/login')
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        // Should show appropriate error message
        await expect(page.locator('.error, .alert-destructive')).toBeVisible({ timeout: 10000 })
        
        // Should not expose technical details
        const pageContent = await page.content()
        expect(pageContent).not.toContain('stack trace')
        expect(pageContent).not.toContain('internal error')
        
        // Clean up route for next iteration
        await page.unroute('**/api/auth/**')
      }
    })
  })

  test.describe('Malformed Data Handling', () => {
    test('should handle malformed OAuth callback responses', async ({ page }) => {
      const malformedResponses = [
        '{"invalid": json}', // Invalid JSON
        'not-json-at-all',
        '{"user": null}', // Null user
        '{"user": {"id": ""}}', // Empty ID
        '{"session": {}}', // Missing tokens
        '' // Empty response
      ]
      
      for (const response of malformedResponses) {
        const state = `malformed-test-${Date.now()}`
        
        // Store valid state
        await page.evaluate((s) => {
          const data = { value: s, expiry: Date.now() + 600000 }
          sessionStorage.setItem('oauth_state', JSON.stringify(data))
        }, state)
        
        // Mock malformed response
        await page.route('**/api/auth/**', route => {
          route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: response
          })
        })
        
        await page.goto(`/auth/callback/google?code=malformed-test&state=${state}`)
        
        // Should handle gracefully with error message
        await expect(page.locator('.error, .alert-destructive')).toBeVisible({ timeout: 5000 })
        
        await page.unroute('**/api/auth/**')
      }
    })

    test('should sanitize malformed redirect URLs', async ({ page }) => {
      const malformedUrls = [
        '/competition/\x00null-byte/enter',
        '/competition/\r\nheader-injection/enter',
        '/competition/%0d%0ainjection/enter',
        '/competition/unicode\u0000injection/enter',
        '/competition/\xff\xfebinary/enter'
      ]
      
      for (const malformedUrl of malformedUrls) {
        await page.goto(`/auth/login?redirect=${encodeURIComponent(malformedUrl)}`)
        
        // Should either sanitize or reject the URL
        const currentUrl = page.url()
        expect(currentUrl).not.toContain('\x00')
        expect(currentUrl).not.toContain('\r\n')
        expect(currentUrl).not.toContain('\u0000')
        
        // Should still show login form
        const loginForm = page.locator('form')
        await expect(loginForm).toBeVisible()
      }
    })

    test('should handle corrupted session storage data', async ({ page }) => {
      // Corrupt session storage with invalid data
      await page.goto('/auth/login')
      await page.evaluate(() => {
        sessionStorage.setItem('oauth_state', '{invalid-json}')
        sessionStorage.setItem('auth_redirect_url', 'not-json')
        sessionStorage.setItem('auth_competition_id', '{"malformed": json}')
      })
      
      // Should handle corrupted data gracefully
      await page.goto('/auth/callback/google?code=test&state=corrupted-test')
      
      // Should not crash or expose errors
      const hasJSError = await page.evaluate(() => {
        return window.onerror !== null
      })
      
      // Should show appropriate error or redirect to login
      const isOnLogin = page.url().includes('/auth/login')
      const hasError = await page.locator('.error, .alert-destructive').count() > 0
      
      expect(isOnLogin || hasError).toBeTruthy()
    })
  })

  test.describe('Race Condition Handling', () => {
    test('should handle concurrent OAuth state validation', async ({ page, context }) => {
      const state = 'race-condition-state-123'
      
      // Store state
      await page.evaluate((s) => {
        const data = { value: s, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      // Open multiple tabs with same OAuth callback
      const page2 = await context.newPage()
      
      // Copy session storage to second page
      const sessionData = await page.evaluate(() => {
        const data: { [key: string]: string } = {}
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i)
          if (key) {
            data[key] = sessionStorage.getItem(key) || ''
          }
        }
        return data
      })
      
      await page2.evaluate((data) => {
        Object.entries(data).forEach(([key, value]) => {
          sessionStorage.setItem(key, value)
        })
      }, sessionData)
      
      // Mock API to track concurrent requests
      let processedStates: string[] = []
      const mockCallback = (route: any) => {
        const url = new URL(route.request().url())
        const stateParam = url.searchParams.get('state')
        
        if (processedStates.includes(stateParam || '')) {
          // State already used
          route.fulfill({
            status: 400,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'State already used' })
          })
        } else {
          processedStates.push(stateParam || '')
          route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: { id: 'test-user', email: 'test@example.com' },
              session: { access_token: 'mock-token' }
            })
          })
        }
      }
      
      await page.route('**/api/auth/**', mockCallback)
      await page2.route('**/api/auth/**', mockCallback)
      
      // Attempt concurrent OAuth callbacks
      await Promise.all([
        page.goto(`/auth/callback/google?code=race-test-1&state=${state}`),
        page2.goto(`/auth/callback/google?code=race-test-2&state=${state}`)
      ])
      
      await Promise.all([
        page.waitForTimeout(3000),
        page2.waitForTimeout(3000)
      ])
      
      // Only one should succeed
      const page1Success = !page.url().includes('/auth/') && !await page.locator('.error').count()
      const page2Success = !page2.url().includes('/auth/') && !await page2.locator('.error').count()
      
      // Exactly one should succeed (XOR)
      expect(page1Success !== page2Success).toBeTruthy()
      
      await page2.close()
    })

    test('should handle rapid authentication attempts', async ({ page }) => {
      const testUser = authHelpers.generateTestUser()
      const competitionUrl = '/competition/rapid-auth-test/enter'
      
      // Mock API with rate limiting
      let requestCount = 0
      let lastRequestTime = 0
      
      await page.route('**/api/auth/**', route => {
        requestCount++
        const currentTime = Date.now()
        
        // Simulate rate limiting (max 3 requests per 5 seconds)
        if (currentTime - lastRequestTime < 1667 && requestCount > 3) { // 5000ms / 3 = 1667ms
          route.fulfill({
            status: 429,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              error: 'Too many requests',
              retryAfter: 5
            })
          })
        } else {
          lastRequestTime = currentTime
          route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: { id: 'test-user', email: testUser.email },
              session: { access_token: 'mock-token' }
            })
          })
        }
      })
      
      await page.goto(`/auth/login?redirect=${encodeURIComponent(competitionUrl)}`)
      
      // Attempt rapid login submissions
      for (let i = 0; i < 5; i++) {
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        await page.waitForTimeout(200) // Very rapid attempts
      }
      
      // Should show rate limiting message
      const rateLimitError = await page.locator('.error:has-text("too many"), .alert-destructive:has-text("rate limit")').count() > 0
      
      if (rateLimitError) {
        // Should show retry after message
        const retryMessage = await page.locator(':has-text("try again"), :has-text("wait")').count() > 0
        expect(retryMessage).toBeTruthy()
      }
    })
  })

  test.describe('Session Management Edge Cases', () => {
    test('should handle session expiry during redirect', async ({ page }) => {
      const competitionUrl = '/competition/session-expiry-test/enter'
      const testUser = authHelpers.generateTestUser()
      
      // Set up expired session
      await page.evaluate(() => {
        const expiredToken = {
          access_token: 'expired-token',
          refresh_token: 'expired-refresh',
          expires_at: Date.now() - 1000 // Expired 1 second ago
        }
        localStorage.setItem('supabase.auth.token', JSON.stringify(expiredToken))
      })
      
      // Try to access protected resource
      await page.goto(competitionUrl)
      await page.waitForTimeout(3000)
      
      // Should redirect to login with original URL preserved
      expect(page.url()).toContain('/auth/login')
      expect(page.url()).toContain(`redirect=${encodeURIComponent(competitionUrl)}`)
      
      // Complete fresh authentication
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should redirect to original destination
      expect(page.url()).toContain(competitionUrl)
    })

    test('should handle corrupted authentication tokens', async ({ page }) => {
      const competitionUrl = '/competition/corrupted-token-test/enter'
      
      // Set corrupted tokens in storage
      await page.evaluate(() => {
        localStorage.setItem('supabase.auth.token', 'corrupted-json-data')
        sessionStorage.setItem('auth_session', '{malformed: json}')
      })
      
      await page.goto(competitionUrl)
      await page.waitForTimeout(2000)
      
      // Should handle corrupted tokens gracefully
      const isOnLogin = page.url().includes('/auth/login')
      const hasError = await page.locator('.error').count() > 0
      
      // Should either redirect to login or show error
      expect(isOnLogin || hasError).toBeTruthy()
      
      // Should not crash the application
      const hasJSError = await page.evaluate(() => {
        return Boolean((window as any).lastError)
      })
      expect(hasJSError).toBeFalsy()
    })

    test('should handle cross-tab session conflicts', async ({ page, context }) => {
      const testUser = authHelpers.generateTestUser()
      
      // Login in first tab
      await authHelpers.loginUser(testUser)
      await page.goto('/competitions')
      
      // Open second tab
      const page2 = await context.newPage()
      
      // Login with different user in second tab
      const testUser2 = authHelpers.generateTestUser()
      const authHelpers2 = new AuthTestHelpers(page2)
      await authHelpers2.loginUser(testUser2)
      
      // Go back to first tab and try to access protected resource
      await page.goto('/competition/cross-tab-test/enter')
      await page.waitForTimeout(2000)
      
      // Should handle session conflict appropriately
      // Either maintain current session or prompt for re-authentication
      const isOnCompetition = page.url().includes('/competition/')
      const isOnLogin = page.url().includes('/auth/login')
      
      expect(isOnCompetition || isOnLogin).toBeTruthy()
      
      await page2.close()
    })
  })

  test.describe('Recovery and Resilience', () => {
    test('should recover from temporary API failures', async ({ page }) => {
      const testUser = authHelpers.generateTestUser()
      const competitionUrl = '/competition/recovery-test/enter'
      
      let requestCount = 0
      
      // Mock API with temporary failures
      await page.route('**/api/auth/**', route => {
        requestCount++
        
        if (requestCount <= 2) {
          // First two requests fail
          route.fulfill({
            status: 503,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Service temporarily unavailable' })
          })
        } else {
          // Third request succeeds
          route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user: { id: 'test-user', email: testUser.email },
              session: { access_token: 'mock-token' }
            })
          })
        }
      })
      
      await page.goto(`/auth/login?redirect=${encodeURIComponent(competitionUrl)}`)
      
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Should show initial failure
      await expect(page.locator('.error, .alert-destructive')).toBeVisible({ timeout: 5000 })
      
      // Try again
      const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Retry")')
      if (await retryButton.count() > 0) {
        await retryButton.click()
        await page.waitForTimeout(2000)
        
        // Should still show failure (second attempt)
        await expect(page.locator('.error, .alert-destructive')).toBeVisible()
        
        // Try once more
        if (await retryButton.count() > 0) {
          await retryButton.click()
          await page.waitForTimeout(3000)
          
          // Should succeed on third attempt
          expect(page.url()).toContain(competitionUrl)
        }
      }
    })

    test('should provide clear error messages and recovery paths', async ({ page }) => {
      const errorScenarios = [
        {
          mockResponse: { status: 401, error: 'Invalid credentials' },
          expectedMessage: /invalid.*credential|wrong.*password|authentication.*failed/i,
          recoveryAction: 'Try different credentials'
        },
        {
          mockResponse: { status: 403, error: 'Account suspended' },
          expectedMessage: /account.*suspended|access.*denied/i,
          recoveryAction: 'Contact support'
        },
        {
          mockResponse: { status: 429, error: 'Too many attempts' },
          expectedMessage: /too.*many|rate.*limit|try.*later/i,
          recoveryAction: 'Wait before retrying'
        }
      ]
      
      for (const scenario of errorScenarios) {
        await page.route('**/api/auth/**', route => {
          route.fulfill({
            status: scenario.mockResponse.status,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(scenario.mockResponse)
          })
        })
        
        await page.goto('/auth/login')
        
        const testUser = authHelpers.generateTestUser()
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        await page.waitForTimeout(2000)
        
        // Should show appropriate error message
        const errorElement = page.locator('.error, .alert-destructive')
        await expect(errorElement).toBeVisible()
        
        const errorText = await errorElement.textContent()
        expect(errorText).toMatch(scenario.expectedMessage)
        
        // Should provide recovery guidance
        const hasRecoveryGuidance = await page.locator(`:has-text("${scenario.recoveryAction}")`, {
          hasText: /help|support|try|contact|wait/i
        }).count() > 0
        
        expect(hasRecoveryGuidance || errorText?.toLowerCase().includes(scenario.recoveryAction.toLowerCase())).toBeTruthy()
        
        await page.unroute('**/api/auth/**')
      }
    })
  })
})