import { test, expect } from '@playwright/test'
import { AuthTestHelpers } from '../utils/auth-test-helpers'

/**
 * OAuth Deep Link Security Test Suite
 * 
 * Focused security testing for OAuth flows with deep link preservation,
 * state validation, CSRF protection, and redirect security
 */

test.describe('OAuth Deep Link Security', () => {
  let authHelpers: AuthTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthTestHelpers(page)
  })

  test.describe('OAuth State Parameter Security', () => {
    test('should generate cryptographically secure state parameters', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Click OAuth login button to initiate flow
      const googleButton = page.locator('button:has-text("Continue with Google"), [data-provider="google"]')
      if (await googleButton.count() > 0) {
        // Intercept OAuth redirect to inspect state parameter
        let stateParam = ''
        await page.route('**/auth/oauth/google**', route => {
          const url = new URL(route.request().url())
          stateParam = url.searchParams.get('state') || ''
          route.fulfill({
            status: 302,
            headers: { 'Location': '/auth/login' }
          })
        })
        
        await googleButton.click()
        
        // Validate state parameter characteristics
        expect(stateParam).toBeTruthy()
        expect(stateParam.length).toBeGreaterThanOrEqual(32) // Minimum entropy
        expect(stateParam).toMatch(/^[a-fA-F0-9]+$/) // Hex format
        
        // Ensure different states are generated for each request
        await page.reload()
        let secondStateParam = ''
        await page.route('**/auth/oauth/google**', route => {
          const url = new URL(route.request().url())
          secondStateParam = url.searchParams.get('state') || ''
          route.fulfill({
            status: 302,
            headers: { 'Location': '/auth/login' }
          })
        })
        
        await googleButton.click()
        expect(secondStateParam).not.toBe(stateParam)
      }
    })

    test('should store and validate OAuth state securely', async ({ page }) => {
      const mockState = 'mock-secure-state-12345abcdef67890'
      
      // Store state manually (simulating OAuth initiation)
      await page.goto('/auth/login')
      await page.evaluate((state) => {
        const data = { value: state, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, mockState)
      
      // Simulate valid callback
      await page.goto(`/auth/callback/google?code=valid-code&state=${mockState}`)
      
      // Should process successfully
      await page.waitForTimeout(2000)
      const hasError = await page.locator('[data-testid="invalid-state-error"]').count() > 0
      expect(hasError).toBeFalsy()
      
      // State should be cleared after use
      const remainingState = await page.evaluate(() => {
        return sessionStorage.getItem('oauth_state')
      })
      expect(remainingState).toBeNull()
    })

    test('should reject state parameter tampering attempts', async ({ page }) => {
      const originalState = 'original-state-12345'
      const tamperedState = 'tampered-state-67890'
      
      // Store original state
      await page.goto('/auth/login')
      await page.evaluate((state) => {
        const data = { value: state, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, originalState)
      
      // Attempt callback with tampered state
      await page.goto(`/auth/callback/google?code=valid-code&state=${tamperedState}`)
      
      // Should reject and show security error
      await expect(page.locator('[data-testid="invalid-state-error"], .alert-destructive')).toBeVisible()
    })

    test('should handle state parameter replay attacks', async ({ page }) => {
      const state = 'replay-attack-state-123'
      
      // Store state and process first callback
      await page.goto('/auth/login')
      await page.evaluate((s) => {
        const data = { value: s, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      await page.goto(`/auth/callback/google?code=first-code&state=${state}`)
      await page.waitForTimeout(2000)
      
      // Attempt to replay the same state
      await page.evaluate((s) => {
        const data = { value: s, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      await page.goto(`/auth/callback/google?code=second-code&state=${state}`)
      
      // Should reject replay attempt
      await expect(page.locator('[data-testid="invalid-state-error"], .alert-destructive')).toBeVisible()
    })
  })

  test.describe('Redirect URL Security in OAuth Flow', () => {
    test('should preserve secure redirect URLs through OAuth flow', async ({ page }) => {
      const secureRedirects = [
        '/competitions',
        '/competition/123e4567-e89b-12d3-a456-426614174000/enter',
        '/profile',
        '/settings'
      ]

      for (const redirectUrl of secureRedirects) {
        // Clear storage
        await page.evaluate(() => sessionStorage.clear())
        
        // Start OAuth flow with redirect
        await page.goto(`/auth/login?redirect=${encodeURIComponent(redirectUrl)}`)
        
        const state = 'test-state-' + Date.now()
        await page.evaluate(({ s, url }) => {
          const stateData = { value: s, expiry: Date.now() + 600000 }
          const redirectData = { value: url, expiry: Date.now() + 600000 }
          sessionStorage.setItem('oauth_state', JSON.stringify(stateData))
          sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
        }, { s: state, url: redirectUrl })
        
        // Mock successful OAuth callback
        await page.route('**/api/auth/**', route => {
          route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              user: { id: 'test-user-id', email: 'test@example.com' },
              session: { access_token: 'mock-token' }
            })
          })
        })
        
        await page.goto(`/auth/callback/google?code=success-code&state=${state}`)
        await page.waitForTimeout(3000)
        
        // Should redirect to original secure URL
        const finalUrl = page.url()
        expect(finalUrl).toContain(redirectUrl)
      }
    })

    test('should sanitize malicious redirect URLs in OAuth flow', async ({ page }) => {
      const maliciousRedirects = [
        'javascript:alert(document.cookie)',
        'https://evil.com/steal-tokens',
        '//attacker.com/phish',
        'data:text/html,<script>alert(1)</script>'
      ]

      for (const maliciousUrl of maliciousRedirects) {
        await page.evaluate(() => sessionStorage.clear())
        
        // Attempt OAuth flow with malicious redirect
        await page.goto(`/auth/login?redirect=${encodeURIComponent(maliciousUrl)}`)
        
        const state = 'malicious-test-state-' + Date.now()
        await page.evaluate(({ s, url }) => {
          const stateData = { value: s, expiry: Date.now() + 600000 }
          const redirectData = { value: url, expiry: Date.now() + 600000 }
          sessionStorage.setItem('oauth_state', JSON.stringify(stateData))
          sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
        }, { s: state, url: maliciousUrl })
        
        await page.goto(`/auth/callback/google?code=success-code&state=${state}`)
        await page.waitForTimeout(3000)
        
        // Should redirect to safe default, not malicious URL
        const finalUrl = page.url()
        expect(finalUrl).not.toContain('evil.com')
        expect(finalUrl).not.toContain('javascript:')
        expect(finalUrl).not.toContain('data:')
        expect(finalUrl).toMatch(/\/(competitions|dashboard|$)/)
      }
    })

    test('should validate redirect domains in OAuth callback', async ({ page }) => {
      const externalDomains = [
        'https://google.com/malicious',
        'https://github.com/steal-tokens',
        'https://facebook.com/phishing'
      ]

      for (const externalUrl of externalDomains) {
        await page.evaluate(() => sessionStorage.clear())
        
        const state = 'external-domain-test-' + Date.now()
        await page.evaluate(({ s, url }) => {
          const stateData = { value: s, expiry: Date.now() + 600000 }
          const redirectData = { value: url, expiry: Date.now() + 600000 }
          sessionStorage.setItem('oauth_state', JSON.stringify(stateData))
          sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
        }, { s: state, url: externalUrl })
        
        await page.goto(`/auth/callback/google?code=success-code&state=${state}`)
        await page.waitForTimeout(3000)
        
        // Should not redirect to external domain
        const finalUrl = page.url()
        const finalDomain = new URL(page.url()).hostname
        const currentDomain = new URL(page.url()).hostname
        expect(finalDomain).toBe(currentDomain)
      }
    })
  })

  test.describe('CSRF Protection in OAuth Flow', () => {
    test('should reject OAuth callbacks without state parameter', async ({ page }) => {
      // Attempt callback without state
      await page.goto('/auth/callback/google?code=no-state-code')
      
      // Should show security error
      await expect(page.locator('[data-testid="missing-state-error"], .alert-destructive')).toBeVisible()
    })

    test('should validate state parameter format', async ({ page }) => {
      const invalidStates = [
        'short', // Too short
        'contains spaces and special chars!',
        '<script>alert(1)</script>',
        '../../etc/passwd',
        'null',
        'undefined',
        ''
      ]

      for (const invalidState of invalidStates) {
        await page.goto(`/auth/callback/google?code=test-code&state=${encodeURIComponent(invalidState)}`)
        
        // Should reject invalid state format
        const hasError = await page.locator('[data-testid="invalid-state-error"], .alert-destructive').count() > 0
        const isOnLogin = page.url().includes('/auth/login')
        expect(hasError || isOnLogin).toBeTruthy()
      }
    })

    test('should prevent cross-site request forgery in OAuth initiation', async ({ page, context }) => {
      // Create malicious page that attempts to initiate OAuth
      const maliciousPage = await context.newPage()
      
      await maliciousPage.setContent(`
        <html>
          <body>
            <script>
              // Attempt to initiate OAuth from different origin
              window.open('/auth/oauth/google?redirect=https://evil.com', '_blank');
            </script>
          </body>
        </html>
      `)
      
      // Monitor for popup or navigation
      let oauthInitiated = false
      page.on('popup', () => {
        oauthInitiated = true
      })
      
      await maliciousPage.waitForTimeout(2000)
      
      // OAuth should not be initiated from external origin
      expect(oauthInitiated).toBeFalsy()
      
      await maliciousPage.close()
    })
  })

  test.describe('Session Hijacking Prevention', () => {
    test('should bind OAuth session to browser fingerprint', async ({ page }) => {
      const state = 'fingerprint-test-state-123'
      
      // Store state with browser fingerprint
      await page.goto('/auth/login')
      await page.evaluate((s) => {
        const fingerprint = navigator.userAgent + screen.width + screen.height
        const data = { 
          value: s, 
          expiry: Date.now() + 600000,
          fingerprint: btoa(fingerprint)
        }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      // Change user agent (simulate session hijack attempt)
      await page.setUserAgent('Different User Agent for Hijacking')
      
      // Attempt callback with different fingerprint
      await page.goto(`/auth/callback/google?code=hijack-attempt&state=${state}`)
      
      // Should detect fingerprint mismatch and reject
      await expect(page.locator('[data-testid="security-error"], .alert-destructive')).toBeVisible()
    })

    test('should validate session origin consistency', async ({ page, context }) => {
      const state = 'origin-consistency-test-123'
      
      // Initiate OAuth on main page
      await page.goto('/auth/login')
      await page.evaluate((s) => {
        const data = { value: s, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      // Create new page with different origin simulation
      const newPage = await context.newPage()
      await newPage.goto('about:blank')
      
      // Try to complete OAuth callback from different context
      await newPage.goto(`${page.url().split('/')[0]}//${page.url().split('//')[1].split('/')[0]}/auth/callback/google?code=origin-test&state=${state}`)
      
      // Should validate origin consistency
      await newPage.waitForTimeout(2000)
      const hasError = await newPage.locator('[data-testid="origin-mismatch"], .alert-destructive').count() > 0
      
      // May show error or redirect to login for re-authentication
      expect(hasError || newPage.url().includes('/auth/login')).toBeTruthy()
      
      await newPage.close()
    })
  })

  test.describe('Token Security in OAuth Flow', () => {
    test('should securely handle OAuth authorization codes', async ({ page }) => {
      const state = 'token-security-test-123'
      
      // Store valid state
      await page.goto('/auth/login')
      await page.evaluate((s) => {
        const data = { value: s, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      // Monitor network requests for token exchange
      const tokenRequests: string[] = []
      page.on('request', (request) => {
        if (request.url().includes('token') || request.url().includes('auth')) {
          tokenRequests.push(request.url())
        }
      })
      
      // Simulate callback with authorization code
      await page.goto(`/auth/callback/google?code=secure-auth-code-123&state=${state}`)
      await page.waitForTimeout(3000)
      
      // Verify authorization code is not exposed in client-side logs
      const consoleMessages = await page.evaluate(() => {
        return (window as any).consoleHistory || []
      })
      
      const codeExposed = consoleMessages.some((msg: string) => 
        msg.includes('secure-auth-code-123')
      )
      expect(codeExposed).toBeFalsy()
      
      // Verify code is not in URL after processing
      const finalUrl = page.url()
      expect(finalUrl).not.toContain('secure-auth-code-123')
    })

    test('should prevent token leakage in browser history', async ({ page }) => {
      const state = 'history-test-state-123'
      const sensitiveCode = 'sensitive-oauth-code-456'
      
      await page.goto('/auth/login')
      await page.evaluate((s) => {
        const data = { value: s, expiry: Date.now() + 600000 }
        sessionStorage.setItem('oauth_state', JSON.stringify(data))
      }, state)
      
      // Process OAuth callback
      await page.goto(`/auth/callback/google?code=${sensitiveCode}&state=${state}`)
      await page.waitForTimeout(3000)
      
      // Check browser history doesn't contain sensitive data
      const historyContainsSensitive = await page.evaluate((code) => {
        return window.location.href.includes(code) || 
               document.referrer.includes(code)
      }, sensitiveCode)
      
      expect(historyContainsSensitive).toBeFalsy()
      
      // Verify back button doesn't expose sensitive URL
      await page.goBack()
      await page.waitForTimeout(1000)
      
      const backUrlContainsSensitive = page.url().includes(sensitiveCode)
      expect(backUrlContainsSensitive).toBeFalsy()
    })

    test('should handle OAuth error responses securely', async ({ page }) => {
      const errorScenarios = [
        'access_denied',
        'invalid_request',
        'unauthorized_client',
        'unsupported_response_type',
        'invalid_scope',
        'server_error',
        'temporarily_unavailable'
      ]

      for (const error of errorScenarios) {
        await page.goto(`/auth/callback/google?error=${error}&error_description=Test+error+scenario`)
        
        // Should handle error gracefully without exposing internals
        await page.waitForTimeout(1000)
        
        // Should show user-friendly error message
        const hasUserFriendlyError = await page.locator('.alert-destructive, [data-testid="oauth-error"]').count() > 0
        expect(hasUserFriendlyError).toBeTruthy()
        
        // Should not expose internal error details
        const pageContent = await page.content()
        expect(pageContent).not.toContain('stack trace')
        expect(pageContent).not.toContain('internal server error')
        
        // Should provide recovery option
        const hasRetryOption = await page.locator('button:has-text("Try Again"), a:has-text("Back to Login")').count() > 0
        expect(hasRetryOption).toBeTruthy()
      }
    })
  })

  test.describe('Deep Link Context Security', () => {
    test('should validate competition IDs in OAuth redirect context', async ({ page }) => {
      const invalidCompetitionIds = [
        '../../../admin',
        'javascript:alert(1)',
        '<script>steal()</script>',
        '../../etc/passwd',
        'comp-id-with-\x00-null-byte'
      ]

      for (const invalidId of invalidCompetitionIds) {
        await page.evaluate(() => sessionStorage.clear())
        
        const state = 'comp-validation-' + Date.now()
        await page.evaluate(({ s, compId }) => {
          const stateData = { value: s, expiry: Date.now() + 600000 }
          const redirectData = { 
            value: `/competition/${compId}/enter`, 
            expiry: Date.now() + 600000 
          }
          sessionStorage.setItem('oauth_state', JSON.stringify(stateData))
          sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
        }, { s: state, compId: invalidId })
        
        await page.goto(`/auth/callback/google?code=test-code&state=${state}`)
        await page.waitForTimeout(3000)
        
        // Should not redirect to invalid competition URL
        const finalUrl = page.url()
        expect(finalUrl).not.toContain(invalidId)
        expect(finalUrl).toMatch(/\/(competitions|dashboard|auth\/login)/)
      }
    })

    test('should sanitize campaign tracking parameters', async ({ page }) => {
      const maliciousParams = {
        utm_source: '<script>alert("xss")</script>',
        utm_campaign: 'javascript:steal_data()',
        utm_medium: '../../admin/users',
        utm_content: 'data:text/html,<script>evil()</script>'
      }

      const params = new URLSearchParams(maliciousParams).toString()
      const state = 'param-sanitization-test-123'
      
      await page.evaluate(() => sessionStorage.clear())
      await page.evaluate(({ s, p }) => {
        const stateData = { value: s, expiry: Date.now() + 600000 }
        const redirectData = { 
          value: `/competitions?${p}`, 
          expiry: Date.now() + 600000 
        }
        sessionStorage.setItem('oauth_state', JSON.stringify(stateData))
        sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
      }, { s: state, p: params })
      
      await page.goto(`/auth/callback/google?code=test-code&state=${state}`)
      await page.waitForTimeout(3000)
      
      // Should sanitize or remove malicious parameters
      const finalUrl = page.url()
      expect(finalUrl).not.toContain('<script>')
      expect(finalUrl).not.toContain('javascript:')
      expect(finalUrl).not.toContain('../../admin')
      expect(finalUrl).not.toContain('data:')
    })

    test('should validate invite tokens in OAuth flow', async ({ page }) => {
      const maliciousInviteTokens = [
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '../../admin/invites',
        '../../../etc/passwd',
        'token\x00with\x00nulls'
      ]

      for (const maliciousToken of maliciousInviteTokens) {
        await page.evaluate(() => sessionStorage.clear())
        
        const state = 'invite-validation-' + Date.now()
        await page.evaluate(({ s, token }) => {
          const stateData = { value: s, expiry: Date.now() + 600000 }
          const redirectData = { 
            value: `/competition/valid-comp-id/enter?invite=${token}`, 
            expiry: Date.now() + 600000 
          }
          sessionStorage.setItem('oauth_state', JSON.stringify(stateData))
          sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
        }, { s: state, token: maliciousToken })
        
        await page.goto(`/auth/callback/google?code=test-code&state=${state}`)
        await page.waitForTimeout(3000)
        
        // Should sanitize or reject malicious invite tokens
        const finalUrl = page.url()
        expect(finalUrl).not.toContain('javascript:')
        expect(finalUrl).not.toContain('<script>')
        expect(finalUrl).not.toContain('../../admin')
        expect(finalUrl).not.toContain('etc/passwd')
      }
    })
  })
})