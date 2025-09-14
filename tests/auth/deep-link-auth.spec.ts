import { test, expect } from '@playwright/test'
import { AuthTestHelpers } from '../utils/auth-test-helpers'

/**
 * Deep Link Authentication Test Suite
 * 
 * Comprehensive testing for deep link URL validation, security,
 * and authentication flow preservation through OAuth callbacks
 */

test.describe('Deep Link Authentication Flow', () => {
  let authHelpers: AuthTestHelpers
  
  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthTestHelpers(page)
  })

  test.describe('Deep Link URL Validation', () => {
    test('should accept valid internal redirect URLs', async ({ page }) => {
      const validUrls = [
        '/competitions',
        '/competition/test-competition',
        '/competition/abc123/enter',
        '/profile',
        '/dashboard',
        '/settings'
      ]

      for (const url of validUrls) {
        await page.goto(`/auth/login?redirect=${encodeURIComponent(url)}`)
        
        // Should not show security warning
        await expect(page.locator('[data-testid="security-warning"]')).not.toBeVisible()
        
        // URL should be preserved in form state
        const redirectInput = page.locator('input[name="redirect"]')
        if (await redirectInput.count() > 0) {
          await expect(redirectInput).toHaveValue(url)
        }
      }
    })

    test('should reject malicious redirect URLs', async ({ page }) => {
      const maliciousUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'https://evil.com/steal-tokens',
        '//evil.com/phishing',
        'http://localhost@evil.com',
        '//../evil.com',
        'vbscript:msgbox(1)'
      ]

      for (const url of maliciousUrls) {
        await page.goto(`/auth/login?redirect=${encodeURIComponent(url)}`)
        
        // Should show security warning or redirect to safe default
        const hasWarning = await page.locator('[data-testid="security-warning"]').count() > 0
        const isOnLoginPage = page.url().includes('/auth/login')
        
        expect(hasWarning || isOnLoginPage).toBeTruthy()
        
        // Should not preserve malicious URL
        const redirectInput = page.locator('input[name="redirect"]')
        if (await redirectInput.count() > 0) {
          const inputValue = await redirectInput.inputValue()
          expect(inputValue).not.toBe(url)
        }
      }
    })

    test('should handle encoded malicious URLs', async ({ page }) => {
      const encodedMalicious = [
        encodeURIComponent('javascript:alert(1)'),
        encodeURIComponent('//evil.com'),
        '%2F%2Fevil.com',
        '%6A%61%76%61%73%63%72%69%70%74%3Aalert%281%29' // double-encoded javascript:alert(1)
      ]

      for (const url of encodedMalicious) {
        await page.goto(`/auth/login?redirect=${url}`)
        
        // Should sanitize or reject
        await expect(page.locator('[data-testid="security-warning"]')).toBeVisible()
      }
    })

    test('should validate competition IDs in redirect URLs', async ({ page }) => {
      // Valid UUID format
      const validCompId = '123e4567-e89b-12d3-a456-426614174000'
      await page.goto(`/auth/login?redirect=/competition/${validCompId}/enter`)
      
      await expect(page.locator('[data-testid="security-warning"]')).not.toBeVisible()

      // Invalid format
      const invalidIds = ['abc123', 'not-uuid', '../../../admin']
      for (const id of invalidIds) {
        await page.goto(`/auth/login?redirect=/competition/${id}/enter`)
        // Should either reject or sanitize
        const currentUrl = page.url()
        expect(currentUrl).not.toContain(`/competition/${id}/enter`)
      }
    })
  })

  test.describe('Authentication Flow with Redirect Preservation', () => {
    test('should preserve redirect URL through login flow', async ({ page }) => {
      const targetUrl = '/competition/test-comp-123/enter'
      const testUser = authHelpers.generateTestUser()

      // Start login with redirect
      await page.goto(`/auth/login?redirect=${encodeURIComponent(targetUrl)}`)
      
      // Complete login
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Wait for redirect
      await page.waitForTimeout(3000)
      
      // Should redirect to original target
      const finalUrl = page.url()
      expect(finalUrl).toContain(targetUrl)
    })

    test('should preserve redirect URL through signup flow', async ({ page }) => {
      const targetUrl = '/competitions'
      const testUser = authHelpers.generateTestUser()

      // Start signup with redirect
      await page.goto(`/auth/signup?redirect=${encodeURIComponent(targetUrl)}`)
      
      // Complete signup form
      await authHelpers.fillSignupForm(testUser)
      await page.click('button[type="submit"]')
      
      // Wait for processing
      await page.waitForTimeout(3000)
      
      // After email confirmation (mocked), should redirect to target
      // In real flow, this would require email confirmation
      const currentUrl = page.url()
      const hasRedirectParam = currentUrl.includes('redirect=') || currentUrl.includes(targetUrl)
      expect(hasRedirectParam).toBeTruthy()
    })

    test('should handle redirect URL session storage', async ({ page }) => {
      const targetUrl = '/competition/test-123/enter'
      
      // Visit login page with redirect
      await page.goto(`/auth/login?redirect=${encodeURIComponent(targetUrl)}`)
      
      // Check if redirect URL is stored in session storage
      const storedRedirect = await page.evaluate(() => {
        const stored = sessionStorage.getItem('auth_redirect_url')
        return stored ? JSON.parse(stored) : null
      })
      
      expect(storedRedirect?.value).toBe(targetUrl)
    })

    test('should clear redirect URL after successful authentication', async ({ page }) => {
      const targetUrl = '/competitions'
      const testUser = authHelpers.generateTestUser()
      
      // Login with redirect
      await page.goto(`/auth/login?redirect=${encodeURIComponent(targetUrl)}`)
      await authHelpers.login(testUser.email, testUser.password)
      
      // Wait for redirect completion
      await page.waitForTimeout(3000)
      
      // Session storage should be cleared
      const storedRedirect = await page.evaluate(() => {
        return sessionStorage.getItem('auth_redirect_url')
      })
      
      expect(storedRedirect).toBeNull()
    })
  })

  test.describe('OAuth Callback Handling with State Validation', () => {
    test('should validate OAuth state parameter', async ({ page }) => {
      const validState = 'valid-oauth-state-12345'
      const targetUrl = '/competitions'
      
      // Simulate storing OAuth state
      await page.goto('/auth/login')
      await page.evaluate(({ state, url }) => {
        const data = { value: state, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
        sessionStorage.setItem('auth_redirect_url', JSON.stringify({ value: url, expiry: Date.now() + 600000 }))
      }, { state: validState, url: targetUrl })
      
      // Simulate OAuth callback with matching state
      await page.goto(`/auth/callback/google?code=test-auth-code&state=${validState}`)
      
      // Should not show security warning
      await expect(page.locator('[data-testid="invalid-state-error"]')).not.toBeVisible()
    })

    test('should reject invalid OAuth state', async ({ page }) => {
      const storedState = 'stored-state-12345'
      const invalidState = 'different-state-67890'
      
      // Store OAuth state
      await page.goto('/auth/login')
      await page.evaluate((state) => {
        const data = { value: state, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, storedState)
      
      // Simulate callback with different state
      await page.goto(`/auth/callback/google?code=test-code&state=${invalidState}`)
      
      // Should show security error
      await expect(page.locator('[data-testid="invalid-state-error"], .alert-destructive')).toBeVisible()
    })

    test('should handle missing OAuth state', async ({ page }) => {
      // Clear session storage
      await page.goto('/auth/login')
      await page.evaluate(() => sessionStorage.clear())
      
      // Simulate callback without stored state
      await page.goto('/auth/callback/google?code=test-code&state=some-state')
      
      // Should handle gracefully (warn or redirect to login)
      const hasError = await page.locator('[data-testid="invalid-state-error"], .alert-destructive').count() > 0
      const isOnLogin = page.url().includes('/auth/login')
      
      expect(hasError || isOnLogin).toBeTruthy()
    })

    test('should preserve redirect URL through OAuth flow', async ({ page }) => {
      const targetUrl = '/competition/oauth-test/enter'
      const state = 'oauth-flow-state-123'
      
      // Set up OAuth flow context
      await page.goto('/auth/login')
      await page.evaluate(({ s, url }) => {
        const stateData = { value: s, expiry: Date.now() + 600000 }
        const redirectData = { value: url, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(stateData))
        sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
      }, { s: state, url: targetUrl })
      
      // Simulate successful OAuth callback
      await page.goto(`/auth/callback/google?code=success-code&state=${state}`)
      
      // Wait for processing
      await page.waitForTimeout(5000)
      
      // Should redirect to target URL
      const finalUrl = page.url()
      expect(finalUrl).toContain(targetUrl)
    })
  })

  test.describe('Competition Entry Flow Authentication', () => {
    test('should require authentication for competition entry', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Try to access competition entry directly
      await page.goto(`/competition/${competitionId}/enter`)
      
      // Should redirect to login with preserved URL
      await page.waitForTimeout(2000)
      const currentUrl = page.url()
      
      expect(currentUrl).toContain('/auth/login')
      expect(currentUrl).toContain(`redirect=${encodeURIComponent(`/competition/${competitionId}/enter`)}`)
    })

    test('should authenticate and redirect to competition entry', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Access competition entry (should redirect to login)
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(1000)
      
      // Should be on login page
      expect(page.url()).toContain('/auth/login')
      
      // Complete login
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Wait for authentication and redirect
      await page.waitForTimeout(3000)
      
      // Should be back on competition entry page
      const finalUrl = page.url()
      expect(finalUrl).toContain(`/competition/${competitionId}/enter`)
    })

    test('should handle competition entry with invite tokens', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const inviteToken = 'valid-invite-token-123'
      const testUser = authHelpers.generateTestUser()
      
      // Access competition with invite token
      await page.goto(`/competition/${competitionId}/enter?invite=${inviteToken}`)
      
      // Should redirect to login preserving invite context
      await page.waitForTimeout(1000)
      const loginUrl = page.url()
      expect(loginUrl).toContain('/auth/login')
      expect(loginUrl).toContain(`competition=${competitionId}`)
      
      // Complete login
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Should redirect back with invite token
      await page.waitForTimeout(3000)
      const finalUrl = page.url()
      expect(finalUrl).toContain(`/competition/${competitionId}/enter`)
      expect(finalUrl).toContain(`invite=${inviteToken}`)
    })
  })

  test.describe('Mobile PWA Deep Link Handling', () => {
    test('should handle PWA deep links from mobile browsers', async ({ page }) => {
      // Simulate mobile user agent
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1')
      await page.setViewportSize({ width: 375, height: 667 })
      
      const competitionUrl = '/competition/mobile-test-123/enter'
      const testUser = authHelpers.generateTestUser()
      
      // Access deep link
      await page.goto(competitionUrl)
      
      // Should redirect to mobile-optimized login
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/auth/login')
      
      // Login form should be mobile-optimized
      const mobileForm = page.locator('form[data-mobile-optimized="true"], .mobile-auth-form')
      if (await mobileForm.count() > 0) {
        await expect(mobileForm).toBeVisible()
      }
      
      // Complete login
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      expect(page.url()).toContain(competitionUrl)
    })

    test('should handle PWA installation prompts during auth flow', async ({ page, context }) => {
      // Set viewport to mobile
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Navigate to competition entry
      await page.goto('/competition/pwa-test-123/enter')
      
      // Should redirect to login
      await page.waitForTimeout(1000)
      expect(page.url()).toContain('/auth/login')
      
      // Check if PWA install prompt is handled gracefully
      await page.evaluate(() => {
        // Simulate beforeinstallprompt event
        const event = new Event('beforeinstallprompt')
        window.dispatchEvent(event)
      })
      
      // Auth flow should continue normally
      const loginForm = page.locator('form')
      await expect(loginForm).toBeVisible()
    })

    test('should preserve deep link through PWA standalone mode', async ({ page }) => {
      // Simulate PWA standalone mode
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', {
          value: true,
          writable: false
        })
      })
      
      const targetUrl = '/competition/standalone-test/enter'
      const testUser = authHelpers.generateTestUser()
      
      await page.goto(targetUrl)
      
      // Should handle auth in standalone mode
      await page.waitForTimeout(1000)
      
      if (page.url().includes('/auth/login')) {
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        await page.waitForTimeout(3000)
        
        expect(page.url()).toContain(targetUrl)
      }
    })
  })

  test.describe('Error Scenarios and Edge Cases', () => {
    test('should handle expired OAuth state', async ({ page }) => {
      const expiredState = 'expired-state-123'
      
      // Store expired state
      await page.goto('/auth/login')
      await page.evaluate((state) => {
        const expiredData = { value: state, expiry: Date.now() - 1000 } // Expired 1 second ago
        sessionStorage.setItem('oauth_state', JSON.stringify(expiredData))
      }, expiredState)
      
      // Simulate callback with expired state
      await page.goto(`/auth/callback/google?code=test-code&state=${expiredState}`)
      
      // Should handle as invalid state
      await expect(page.locator('[data-testid="invalid-state-error"], .alert-destructive')).toBeVisible()
    })

    test('should handle malformed OAuth callback URLs', async ({ page }) => {
      const malformedCallbacks = [
        '/auth/callback/google?error=access_denied',
        '/auth/callback/google?error=invalid_request&error_description=Bad%20Request',
        '/auth/callback/google', // No parameters
        '/auth/callback/google?code=', // Empty code
      ]

      for (const callbackUrl of malformedCallbacks) {
        await page.goto(callbackUrl)
        
        // Should handle gracefully with error message or redirect
        const hasError = await page.locator('.alert-destructive, [data-testid="oauth-error"]').count() > 0
        const isOnLogin = page.url().includes('/auth/login')
        
        expect(hasError || isOnLogin).toBeTruthy()
      }
    })

    test('should handle network failures during OAuth exchange', async ({ page }) => {
      // Simulate network failure
      await page.route('**/auth/callback/**', route => {
        route.fulfill({
          status: 500,
          body: 'Internal Server Error'
        })
      })
      
      await page.goto('/auth/callback/google?code=test-code&state=valid-state')
      
      // Should show appropriate error message
      await expect(page.locator('.alert-destructive, [data-testid="network-error"]')).toBeVisible()
    })

    test('should handle concurrent authentication attempts', async ({ page, context }) => {
      const testUser = authHelpers.generateTestUser()
      
      // Open multiple tabs trying to authenticate
      const page2 = await context.newPage()
      
      // Start login in both tabs
      await page.goto('/auth/login?redirect=/competition/concurrent-test/enter')
      await page2.goto('/auth/login?redirect=/competition/concurrent-test2/enter')
      
      // Fill forms simultaneously
      await Promise.all([
        authHelpers.fillLoginForm(testUser.email, testUser.password),
        new AuthTestHelpers(page2).fillLoginForm(testUser.email, testUser.password)
      ])
      
      // Submit forms
      await Promise.all([
        page.click('button[type="submit"]'),
        page2.click('button[type="submit"]')
      ])
      
      // Wait for processing
      await page.waitForTimeout(5000)
      await page2.waitForTimeout(5000)
      
      // Both should handle gracefully
      const page1Success = page.url().includes('/competition/concurrent-test/enter')
      const page2Success = page2.url().includes('/competition/concurrent-test2/enter')
      
      // At least one should succeed
      expect(page1Success || page2Success).toBeTruthy()
      
      await page2.close()
    })

    test('should handle deep link with special characters', async ({ page }) => {
      const specialUrls = [
        '/competition/test with spaces/enter',
        '/competition/test%20encoded/enter',
        '/competition/test-with-émojis-🚀/enter',
        '/competition/test&special=chars/enter'
      ]

      for (const url of specialUrls) {
        await page.goto(`/auth/login?redirect=${encodeURIComponent(url)}`)
        
        // Should either sanitize or handle gracefully
        await expect(page.locator('[data-testid="security-warning"]')).not.toBeVisible()
        
        // Should not crash the application
        const hasError = await page.locator('.error, .alert-destructive').count() > 0
        expect(hasError).toBeFalsy()
      }
    })

    test('should handle session storage quota exceeded', async ({ page }) => {
      // Fill session storage to near capacity
      await page.evaluate(() => {
        try {
          const data = 'x'.repeat(1000000) // 1MB of data
          for (let i = 0; i < 10; i++) {
            sessionStorage.setItem(`large_data_${i}`, data)
          }
        } catch (e) {
          // Storage quota exceeded
        }
      })
      
      const targetUrl = '/competition/storage-test/enter'
      
      // Try to store auth context
      await page.goto(`/auth/login?redirect=${encodeURIComponent(targetUrl)}`)
      
      // Should handle gracefully even if storage fails
      const loginForm = page.locator('form')
      await expect(loginForm).toBeVisible()
      
      // Should still function without session storage
      const testUser = authHelpers.generateTestUser()
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Should not crash
      await page.waitForTimeout(3000)
      const hasError = await page.locator('.error, .alert-destructive').count() > 0
      expect(hasError).toBeFalsy()
    })
  })
})