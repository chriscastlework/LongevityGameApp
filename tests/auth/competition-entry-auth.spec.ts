import { test, expect } from '@playwright/test'
import { AuthTestHelpers } from '../utils/auth-test-helpers'

/**
 * Competition Entry Authentication Test Suite
 * 
 * Tests the complete flow of competition entry requiring authentication,
 * including invite tokens, deep linking, and various entry scenarios
 */

test.describe('Competition Entry Authentication Flow', () => {
  let authHelpers: AuthTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthTestHelpers(page)
  })

  test.describe('Protected Competition Entry', () => {
    test('should require authentication for competition entry', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Try to access competition entry page directly
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Should redirect to login with preserved competition context
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/login')
      expect(currentUrl).toContain(`redirect=${encodeURIComponent(`/competition/${competitionId}/enter`)}`)
      expect(currentUrl).toContain(`competition=${competitionId}`)
    })

    test('should authenticate and redirect to competition entry', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Access protected competition entry
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Verify redirect to login
      expect(page.url()).toContain('/auth/login')
      
      // Complete authentication
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Wait for authentication and redirect
      await page.waitForTimeout(3000)
      
      // Should redirect back to competition entry
      const finalUrl = page.url()
      expect(finalUrl).toContain(`/competition/${competitionId}/enter`)
      expect(finalUrl).not.toContain('/auth/login')
    })

    test('should handle invalid competition IDs securely', async ({ page }) => {
      const invalidCompetitionIds = [
        'invalid-uuid',
        '../../../admin',
        'javascript:alert(1)',
        '<script>evil()</script>',
        '../../etc/passwd'
      ]

      for (const invalidId of invalidCompetitionIds) {
        await page.goto(`/competition/${invalidId}/enter`)
        await page.waitForTimeout(2000)
        
        // Should either show 404 or redirect to safe default
        const currentUrl = page.url()
        const isOn404 = page.url().includes('/404') || await page.locator('h1:has-text("404"), h1:has-text("Not Found")').count() > 0
        const isOnSafePage = currentUrl.includes('/competitions') || currentUrl === '/'
        
        expect(isOn404 || isOnSafePage).toBeTruthy()
        expect(currentUrl).not.toContain(invalidId)
      }
    })

    test('should validate competition exists before authentication', async ({ page }) => {
      const nonExistentId = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
      
      // Mock API to return 404 for non-existent competition
      await page.route(`**/api/competitions/${nonExistentId}`, route => {
        route.fulfill({
          status: 404,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Competition not found' })
        })
      })
      
      await page.goto(`/competition/${nonExistentId}/enter`)
      await page.waitForTimeout(2000)
      
      // Should show competition not found, not redirect to login
      const has404Error = await page.locator('h1:has-text("404"), h1:has-text("Not Found"), .error:has-text("not found")').count() > 0
      expect(has404Error).toBeTruthy()
    })
  })

  test.describe('Competition Entry with Invites', () => {
    test('should handle competition entry with valid invite token', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const inviteToken = 'valid-invite-token-abc123'
      const testUser = authHelpers.generateTestUser()
      
      // Access competition with invite token
      await page.goto(`/competition/${competitionId}/enter?invite=${inviteToken}`)
      await page.waitForTimeout(2000)
      
      // Should redirect to login preserving invite context
      const loginUrl = page.url()
      expect(loginUrl).toContain('/auth/login')
      expect(loginUrl).toContain(`competition=${competitionId}`)
      expect(loginUrl).toContain(`invite=${inviteToken}`)
      
      // Complete authentication
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Should redirect back to competition with invite token
      const finalUrl = page.url()
      expect(finalUrl).toContain(`/competition/${competitionId}/enter`)
      expect(finalUrl).toContain(`invite=${inviteToken}`)
    })

    test('should validate invite tokens securely', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const maliciousTokens = [
        'javascript:alert(1)',
        '<script>steal()</script>',
        '../../admin/users',
        '../../../etc/passwd',
        'token\x00with\x00nulls'
      ]

      for (const maliciousToken of maliciousTokens) {
        await page.goto(`/competition/${competitionId}/enter?invite=${encodeURIComponent(maliciousToken)}`)
        await page.waitForTimeout(2000)
        
        // Should sanitize or reject malicious tokens
        const currentUrl = page.url()
        expect(currentUrl).not.toContain('javascript:')
        expect(currentUrl).not.toContain('<script>')
        expect(currentUrl).not.toContain('../../admin')
        expect(currentUrl).not.toContain('etc/passwd')
        
        // Should either show error or redirect safely
        const hasError = await page.locator('.error, .alert-destructive').count() > 0
        const isOnSafePage = currentUrl.includes('/competitions') || currentUrl.includes('/auth/login')
        expect(hasError || isOnSafePage).toBeTruthy()
      }
    })

    test('should handle expired invite tokens', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const expiredToken = 'expired-invite-token'
      
      // Mock API to return expired token error
      await page.route('**/api/competitions/*/validate-invite', route => {
        route.fulfill({
          status: 410, // Gone - expired
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Invite token has expired' })
        })
      })
      
      await page.goto(`/competition/${competitionId}/enter?invite=${expiredToken}`)
      await page.waitForTimeout(2000)
      
      // Should show expired invite message
      const hasExpiredMessage = await page.locator('.error:has-text("expired"), .alert-destructive:has-text("expired")').count() > 0
      expect(hasExpiredMessage).toBeTruthy()
    })

    test('should handle invite-only competitions', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Mock competition as invite-only
      await page.route(`**/api/competitions/${competitionId}`, route => {
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: competitionId,
            title: 'Invite Only Competition',
            isPublic: false,
            requiresInvite: true
          })
        })
      })
      
      // Try to access without invite
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Should show invite required message, not login form
      const needsInvite = await page.locator('.error:has-text("invite"), .alert-destructive:has-text("invite")').count() > 0
      expect(needsInvite).toBeTruthy()
    })
  })

  test.describe('Competition Entry States and Permissions', () => {
    test('should handle closed competition entry', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Mock competition as closed
      await page.route(`**/api/competitions/${competitionId}`, route => {
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: competitionId,
            title: 'Closed Competition',
            status: 'closed',
            registrationDeadline: new Date(Date.now() - 86400000).toISOString() // Yesterday
          })
        })
      })
      
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Should show closed message, not redirect to login
      const isClosedMessage = await page.locator('.error:has-text("closed"), .alert-destructive:has-text("closed")').count() > 0
      const isOnLoginPage = page.url().includes('/auth/login')
      
      expect(isClosedMessage).toBeTruthy()
      expect(isOnLoginPage).toBeFalsy()
    })

    test('should handle full competition entry', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Mock competition as full
      await page.route(`**/api/competitions/${competitionId}`, route => {
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: competitionId,
            title: 'Full Competition',
            status: 'open',
            maxParticipants: 100,
            currentParticipants: 100
          })
        })
      })
      
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Should show full message
      const isFullMessage = await page.locator('.error:has-text("full"), .alert-destructive:has-text("full")').count() > 0
      expect(isFullMessage).toBeTruthy()
    })

    test('should handle already entered competition', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Start authenticated
      await authHelpers.loginUser(testUser)
      
      // Mock user already entered
      await page.route(`**/api/competitions/${competitionId}/entry-status`, route => {
        route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isEntered: true,
            entryDate: new Date().toISOString()
          })
        })
      })
      
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Should show already entered message or redirect to competition view
      const alreadyEnteredMessage = await page.locator('.info:has-text("already"), .alert:has-text("already")').count() > 0
      const isOnCompetitionView = page.url().includes(`/competition/${competitionId}`) && !page.url().includes('/enter')
      
      expect(alreadyEnteredMessage || isOnCompetitionView).toBeTruthy()
    })
  })

  test.describe('Deep Link Context Preservation', () => {
    test('should preserve campaign tracking through entry flow', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Access with campaign tracking
      const campaignUrl = `/competition/${competitionId}/enter?utm_source=social&utm_campaign=summer_challenge&utm_medium=instagram`
      
      await page.goto(campaignUrl)
      await page.waitForTimeout(2000)
      
      // Should preserve tracking through auth
      const loginUrl = page.url()
      expect(loginUrl).toContain('utm_source=social')
      expect(loginUrl).toContain('utm_campaign=summer_challenge')
      expect(loginUrl).toContain('utm_medium=instagram')
      
      // Complete auth and verify tracking preserved
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      const finalUrl = page.url()
      expect(finalUrl).toContain('utm_source=social')
      expect(finalUrl).toContain('utm_campaign=summer_challenge')
      expect(finalUrl).toContain('utm_medium=instagram')
    })

    test('should preserve referrer context in entry flow', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Simulate coming from external referrer
      await page.goto('https://example.com/competition-link')
      await page.goto(`/competition/${competitionId}/enter?ref=external_link`)
      
      await page.waitForTimeout(2000)
      
      // Should preserve referrer context
      const loginUrl = page.url()
      expect(loginUrl).toContain('ref=external_link')
      
      // Complete auth flow
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      const finalUrl = page.url()
      expect(finalUrl).toContain('ref=external_link')
    })

    test('should handle multiple query parameters in entry URL', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Complex URL with multiple parameters
      const complexUrl = `/competition/${competitionId}/enter?invite=test-invite&utm_source=email&utm_campaign=newsletter&ref=friend&team=alpha`
      
      await page.goto(complexUrl)
      await page.waitForTimeout(2000)
      
      // All parameters should be preserved through auth
      const loginUrl = page.url()
      expect(loginUrl).toContain('invite=test-invite')
      expect(loginUrl).toContain('utm_source=email')
      expect(loginUrl).toContain('utm_campaign=newsletter')
      expect(loginUrl).toContain('ref=friend')
      expect(loginUrl).toContain('team=alpha')
      
      // Complete auth and verify all preserved
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      const finalUrl = page.url()
      expect(finalUrl).toContain('invite=test-invite')
      expect(finalUrl).toContain('utm_source=email')
      expect(finalUrl).toContain('utm_campaign=newsletter')
      expect(finalUrl).toContain('ref=friend')
      expect(finalUrl).toContain('team=alpha')
    })
  })

  test.describe('Entry Flow Error Recovery', () => {
    test('should handle network errors during entry', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Start authenticated
      await authHelpers.loginUser(testUser)
      
      // Mock network error during entry
      await page.route(`**/api/competitions/${competitionId}/enter`, route => {
        route.fulfill({
          status: 500,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Internal server error' })
        })
      })
      
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Should show error message with retry option
      const hasError = await page.locator('.error, .alert-destructive').count() > 0
      expect(hasError).toBeTruthy()
      
      const hasRetry = await page.locator('button:has-text("Try Again"), button:has-text("Retry")').count() > 0
      expect(hasRetry).toBeTruthy()
    })

    test('should handle session expiry during entry flow', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      
      // Start with expired session
      await page.evaluate(() => {
        // Mock expired session
        localStorage.setItem('supabase.auth.token', JSON.stringify({
          access_token: 'expired-token',
          expires_at: Date.now() - 1000,
          refresh_token: 'expired-refresh'
        }))
      })
      
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(3000)
      
      // Should detect expired session and redirect to login
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/login')
      expect(currentUrl).toContain(`competition=${competitionId}`)
      
      // Should preserve entry context for re-authentication
      const testUser = authHelpers.generateTestUser()
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      expect(page.url()).toContain(`/competition/${competitionId}/enter`)
    })

    test('should handle concurrent entry attempts', async ({ page, context }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Start authenticated
      await authHelpers.loginUser(testUser)
      
      // Open two tabs attempting to enter same competition
      const page2 = await context.newPage()
      const authHelpers2 = new AuthTestHelpers(page2)
      await authHelpers2.loginUser(testUser)
      
      // Mock API to handle concurrent entry attempts
      let entryAttempts = 0
      await Promise.all([
        page.route(`**/api/competitions/${competitionId}/enter`, route => {
          entryAttempts++
          if (entryAttempts === 1) {
            route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ success: true, message: 'Entry successful' })
            })
          } else {
            route.fulfill({
              status: 409, // Conflict
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Already entered in another session' })
            })
          }
        }),
        page2.route(`**/api/competitions/${competitionId}/enter`, route => {
          entryAttempts++
          if (entryAttempts === 1) {
            route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ success: true, message: 'Entry successful' })
            })
          } else {
            route.fulfill({
              status: 409, // Conflict
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ error: 'Already entered in another session' })
            })
          }
        })
      ])
      
      // Attempt entry in both tabs simultaneously
      await Promise.all([
        page.goto(`/competition/${competitionId}/enter`),
        page2.goto(`/competition/${competitionId}/enter`)
      ])
      
      await Promise.all([
        page.waitForTimeout(3000),
        page2.waitForTimeout(3000)
      ])
      
      // One should succeed, one should show already entered
      const page1Success = await page.locator('.success, .alert-success').count() > 0
      const page1AlreadyEntered = await page.locator('.info:has-text("already"), .alert:has-text("already")').count() > 0
      
      const page2Success = await page2.locator('.success, .alert-success').count() > 0
      const page2AlreadyEntered = await page2.locator('.info:has-text("already"), .alert:has-text("already")').count() > 0
      
      // Exactly one should succeed
      expect((page1Success ? 1 : 0) + (page2Success ? 1 : 0)).toBe(1)
      // The other should show already entered
      expect(page1AlreadyEntered || page2AlreadyEntered).toBeTruthy()
      
      await page2.close()
    })
  })

  test.describe('Social Sharing and Viral Features', () => {
    test('should handle shared competition entry links', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Simulate shared link with social context
      const sharedUrl = `/competition/${competitionId}/enter?utm_source=facebook&utm_medium=social&utm_campaign=viral_share&shared_by=user123`
      
      await page.goto(sharedUrl)
      await page.waitForTimeout(2000)
      
      // Should preserve social context through auth
      const loginUrl = page.url()
      expect(loginUrl).toContain('utm_source=facebook')
      expect(loginUrl).toContain('shared_by=user123')
      
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      
      // Social context should be preserved for analytics
      const finalUrl = page.url()
      expect(finalUrl).toContain('utm_source=facebook')
      expect(finalUrl).toContain('shared_by=user123')
    })

    test('should generate trackable share links from entry page', async ({ page }) => {
      const competitionId = '123e4567-e89b-12d3-a456-426614174000'
      const testUser = authHelpers.generateTestUser()
      
      // Start authenticated and on entry page
      await authHelpers.loginUser(testUser)
      await page.goto(`/competition/${competitionId}/enter`)
      await page.waitForTimeout(2000)
      
      // Look for share functionality
      const shareButton = page.locator('button:has-text("Share"), [data-testid="share-button"]')
      if (await shareButton.count() > 0) {
        await shareButton.click()
        
        // Should generate trackable URLs
        const shareLinks = await page.locator('[data-share-url]').all()
        
        for (const link of shareLinks) {
          const shareUrl = await link.getAttribute('data-share-url')
          if (shareUrl) {
            expect(shareUrl).toContain(competitionId)
            expect(shareUrl).toContain('utm_source')
            expect(shareUrl).toMatch(/utm_campaign|utm_medium/)
          }
        }
      }
    })
  })
})