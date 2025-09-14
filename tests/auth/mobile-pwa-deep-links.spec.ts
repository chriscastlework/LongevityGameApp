import { test, expect, devices } from '@playwright/test'
import { AuthTestHelpers } from '../utils/auth-test-helpers'

/**
 * Mobile PWA Deep Link Test Suite
 * 
 * Testing deep link handling in mobile PWA contexts including:
 * - Mobile browser deep link authentication
 * - PWA installation and standalone mode
 * - App-to-web deep link transitions
 * - Mobile-specific OAuth flows
 * - Touch interface authentication
 */

// Mobile device configurations for testing
const mobileDevices = {
  ios: devices['iPhone 12'],
  android: devices['Pixel 5'],
  tablet: devices['iPad Pro']
}

test.describe('Mobile PWA Deep Link Authentication', () => {
  let authHelpers: AuthTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthTestHelpers(page)
  })

  test.describe('Mobile Browser Deep Link Handling', () => {
    test('should handle deep links on iOS Safari', async ({ page }) => {
      // Configure iOS Safari
      await page.setUserAgent(mobileDevices.ios.userAgent)
      await page.setViewportSize(mobileDevices.ios.viewport)
      
      const competitionUrl = '/competition/mobile-ios-test/enter'
      const testUser = authHelpers.generateTestUser()
      
      // Simulate deep link from iOS app or message
      await page.goto(competitionUrl)
      await page.waitForTimeout(2000)
      
      // Should redirect to mobile-optimized login
      expect(page.url()).toContain('/auth/login')
      expect(page.url()).toContain(`redirect=${encodeURIComponent(competitionUrl)}`)
      
      // Verify mobile-optimized UI
      const mobileForm = page.locator('form')
      await expect(mobileForm).toBeVisible()
      
      // Check for mobile-specific optimizations
      const viewportTag = await page.locator('meta[name="viewport"]').getAttribute('content')
      expect(viewportTag).toContain('width=device-width')
      
      // Complete mobile login
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      
      // Verify touch-friendly submit button
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toBeVisible()
      
      const buttonHeight = await submitButton.evaluate(el => el.getBoundingClientRect().height)
      expect(buttonHeight).toBeGreaterThanOrEqual(44) // iOS touch target minimum
      
      await submitButton.click()
      await page.waitForTimeout(3000)
      
      // Should redirect back to competition
      expect(page.url()).toContain(competitionUrl)
    })

    test('should handle deep links on Android Chrome', async ({ page }) => {
      // Configure Android Chrome
      await page.setUserAgent(mobileDevices.android.userAgent)
      await page.setViewportSize(mobileDevices.android.viewport)
      
      const competitionUrl = '/competition/android-test-123/enter'
      const testUser = authHelpers.generateTestUser()
      
      // Simulate Android deep link
      await page.goto(competitionUrl)
      await page.waitForTimeout(2000)
      
      // Should handle Android-specific behaviors
      expect(page.url()).toContain('/auth/login')
      
      // Check for Android Chrome optimizations
      const themeColor = await page.locator('meta[name="theme-color"]').getAttribute('content')
      expect(themeColor).toBeTruthy()
      
      // Complete authentication
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      expect(page.url()).toContain(competitionUrl)
    })

    test('should handle deep links on tablet interfaces', async ({ page }) => {
      // Configure tablet view
      await page.setUserAgent(mobileDevices.tablet.userAgent)
      await page.setViewportSize(mobileDevices.tablet.viewport)
      
      const competitionUrl = '/competition/tablet-test/enter'
      const testUser = authHelpers.generateTestUser()
      
      await page.goto(competitionUrl)
      await page.waitForTimeout(2000)
      
      // Should adapt to tablet layout
      expect(page.url()).toContain('/auth/login')
      
      // Verify responsive design on tablet
      const formContainer = page.locator('form').locator('..')
      const containerWidth = await formContainer.evaluate(el => el.getBoundingClientRect().width)
      
      // Should not be full width on tablet (expect some padding/centering)
      expect(containerWidth).toBeLessThan(mobileDevices.tablet.viewport.width)
      
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(3000)
      expect(page.url()).toContain(competitionUrl)
    })
  })

  test.describe('PWA Installation and Standalone Mode', () => {
    test('should handle deep links in PWA standalone mode', async ({ page }) => {
      // Simulate PWA standalone mode
      await page.addInitScript(() => {
        // Mock standalone mode
        Object.defineProperty(window.navigator, 'standalone', {
          value: true,
          writable: false
        })
        
        // Mock display-mode: standalone
        Object.defineProperty(window, 'matchMedia', {
          value: (query: string) => ({
            matches: query.includes('display-mode: standalone'),
            addListener: () => {},
            removeListener: () => {}
          })
        })
      })
      
      await page.setViewportSize({ width: 375, height: 667 })
      
      const competitionUrl = '/competition/pwa-standalone-test/enter'
      const testUser = authHelpers.generateTestUser()
      
      // Access deep link in standalone PWA
      await page.goto(competitionUrl)
      await page.waitForTimeout(2000)
      
      // Should handle auth flow in standalone mode
      if (page.url().includes('/auth/login')) {
        // Verify standalone-specific UI adaptations
        const standaloneIndicator = await page.evaluate(() => {
          return window.matchMedia('(display-mode: standalone)').matches ||
                 (window.navigator as any).standalone
        })
        expect(standaloneIndicator).toBeTruthy()
        
        // Complete login in standalone mode
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        await page.waitForTimeout(3000)
        expect(page.url()).toContain(competitionUrl)
      }
    })

    test('should preserve deep link through PWA install process', async ({ page, context }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const competitionUrl = '/competition/pwa-install-test/enter'
      
      // Access deep link that triggers PWA install prompt
      await page.goto(competitionUrl)
      
      // Mock beforeinstallprompt event
      await page.evaluate(() => {
        const event = new Event('beforeinstallprompt') as any
        event.preventDefault = () => {}
        event.prompt = () => Promise.resolve({ outcome: 'dismissed' })
        window.dispatchEvent(event)
      })
      
      // Should redirect to auth but preserve context
      await page.waitForTimeout(2000)
      
      if (page.url().includes('/auth/login')) {
        // Install prompt should not interfere with auth flow
        const loginForm = page.locator('form')
        await expect(loginForm).toBeVisible()
        
        // Complete auth flow
        const testUser = authHelpers.generateTestUser()
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        await page.waitForTimeout(3000)
        
        // Should still redirect to original deep link
        expect(page.url()).toContain(competitionUrl)
      }
    })

    test('should handle PWA app shortcuts with deep links', async ({ page }) => {
      // Simulate launching PWA from app shortcut with deep link
      await page.addInitScript(() => {
        Object.defineProperty(window.navigator, 'standalone', {
          value: true,
          writable: false
        })
      })
      
      const shortcutUrl = '/competition/shortcut-test/enter?utm_source=pwa_shortcut'
      
      // Launch from shortcut
      await page.goto(shortcutUrl)
      await page.waitForTimeout(2000)
      
      // Should preserve shortcut context through auth
      if (page.url().includes('/auth/login')) {
        expect(page.url()).toContain('utm_source=pwa_shortcut')
        
        const testUser = authHelpers.generateTestUser()
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        await page.waitForTimeout(3000)
        expect(page.url()).toContain('utm_source=pwa_shortcut')
      }
    })
  })

  test.describe('Mobile OAuth Flow Integration', () => {
    test('should handle OAuth redirects in mobile Safari', async ({ page }) => {
      await page.setUserAgent(mobileDevices.ios.userAgent)
      await page.setViewportSize(mobileDevices.ios.viewport)
      
      const competitionUrl = '/competition/mobile-oauth-test/enter'
      
      // Start OAuth flow from mobile
      await page.goto(`/auth/login?redirect=${encodeURIComponent(competitionUrl)}`)
      
      const googleButton = page.locator('button:has-text("Continue with Google"), [data-provider="google"]')
      if (await googleButton.count() > 0) {
        // Mock mobile OAuth redirect
        let oauthRedirectUrl = ''
        await page.route('**/auth/oauth/google**', route => {
          oauthRedirectUrl = route.request().url()
          // Simulate successful mobile OAuth
          route.fulfill({
            status: 302,
            headers: { 
              'Location': '/auth/callback/google?code=mobile-success&state=mobile-test-state'
            }
          })
        })
        
        // Store state for callback validation
        await page.evaluate(() => {
          const data = { value: 'mobile-test-state', expiry: Date.now() + 600000 }
          sessionStorage.setItem('oauth_state', JSON.stringify(data))
        })
        
        await googleButton.click()
        
        // Verify mobile-appropriate OAuth parameters
        expect(oauthRedirectUrl).toContain('mobile')
      }
    })

    test('should handle OAuth app switching on mobile', async ({ page, context }) => {
      await page.setUserAgent(mobileDevices.android.userAgent)
      await page.setViewportSize(mobileDevices.android.viewport)
      
      const competitionUrl = '/competition/app-switch-test/enter'
      
      // Start OAuth flow
      await page.goto(`/auth/login?redirect=${encodeURIComponent(competitionUrl)}`)
      
      // Store auth context
      await page.evaluate((url) => {
        const redirectData = { value: url, expiry: Date.now() + 600000 }
        sessionStorage.setItem('auth_redirect_url', JSON.stringify(redirectData))
      }, competitionUrl)
      
      // Simulate returning from OAuth app
      const newPage = await context.newPage()
      await newPage.setUserAgent(mobileDevices.android.userAgent)
      await newPage.setViewportSize(mobileDevices.android.viewport)
      
      // Copy session storage to simulate same session
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
      
      await newPage.evaluate((data) => {
        Object.entries(data).forEach(([key, value]) => {
          sessionStorage.setItem(key, value)
        })
      }, sessionData)
      
      // Return from OAuth app
      await newPage.goto('/auth/callback/google?code=app-switch-success&state=mobile-test-state')
      
      await newPage.waitForTimeout(3000)
      
      // Should redirect to original deep link
      expect(newPage.url()).toContain(competitionUrl)
      
      await newPage.close()
    })

    test('should handle mobile OAuth errors gracefully', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const errorScenarios = [
        { error: 'access_denied', description: 'User cancelled OAuth' },
        { error: 'invalid_request', description: 'Invalid OAuth request' },
        { error: 'temporarily_unavailable', description: 'OAuth provider unavailable' }
      ]
      
      for (const scenario of errorScenarios) {
        // Simulate OAuth error return
        await page.goto(`/auth/callback/google?error=${scenario.error}&error_description=${encodeURIComponent(scenario.description)}`)
        
        // Should show mobile-friendly error message
        await expect(page.locator('.alert-destructive, [data-testid="oauth-error"]')).toBeVisible()
        
        // Error message should be readable on mobile
        const errorElement = page.locator('.alert-destructive, [data-testid="oauth-error"]').first()
        const fontSize = await errorElement.evaluate(el => {
          return window.getComputedStyle(el).fontSize
        })
        
        const fontSizeNumber = parseFloat(fontSize)
        expect(fontSizeNumber).toBeGreaterThanOrEqual(14) // Minimum readable size
        
        // Should provide mobile-friendly retry options
        const retryButton = page.locator('button:has-text("Try Again"), button:has-text("Back to Login")')
        if (await retryButton.count() > 0) {
          const buttonHeight = await retryButton.first().evaluate(el => el.getBoundingClientRect().height)
          expect(buttonHeight).toBeGreaterThanOrEqual(44) // Touch target size
        }
      }
    })
  })

  test.describe('Touch Interface Authentication', () => {
    test('should provide touch-friendly login interface', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const competitionUrl = '/competition/touch-test/enter'
      await page.goto(`/auth/login?redirect=${encodeURIComponent(competitionUrl)}`)
      
      // Verify touch-friendly form elements
      const emailInput = page.locator('input[name="email"]')
      const passwordInput = page.locator('input[name="password"]')
      const submitButton = page.locator('button[type="submit"]')
      
      // Check minimum touch target sizes (44px iOS, 48px Android)
      const emailHeight = await emailInput.evaluate(el => el.getBoundingClientRect().height)
      const passwordHeight = await passwordInput.evaluate(el => el.getBoundingClientRect().height)
      const buttonHeight = await submitButton.evaluate(el => el.getBoundingClientRect().height)
      
      expect(emailHeight).toBeGreaterThanOrEqual(44)
      expect(passwordHeight).toBeGreaterThanOrEqual(44)
      expect(buttonHeight).toBeGreaterThanOrEqual(44)
      
      // Check touch-friendly spacing
      const formElements = await page.locator('form input, form button').all()
      if (formElements.length > 1) {
        const firstElement = formElements[0]
        const secondElement = formElements[1]
        
        const firstRect = await firstElement.evaluate(el => el.getBoundingClientRect())
        const secondRect = await secondElement.evaluate(el => el.getBoundingClientRect())
        
        const spacing = secondRect.top - (firstRect.top + firstRect.height)
        expect(spacing).toBeGreaterThanOrEqual(8) // Minimum spacing
      }
    })

    test('should handle touch gestures during authentication', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/auth/login')
      
      const testUser = authHelpers.generateTestUser()
      
      // Test touch input
      await page.locator('input[name="email"]').tap()
      await page.fill('input[name="email"]', testUser.email)
      
      await page.locator('input[name="password"]').tap()
      await page.fill('input[name="password"]', testUser.password)
      
      // Test touch submit
      await page.locator('button[type="submit"]').tap()
      
      await page.waitForTimeout(2000)
      
      // Should handle touch interactions properly
      const hasError = await page.locator('.error, .alert-destructive').count() > 0
      expect(hasError).toBeFalsy()
    })

    test('should show mobile keyboard appropriately', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/auth/login')
      
      // Email input should trigger email keyboard
      const emailInput = page.locator('input[name="email"]')
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('inputmode', 'email')
      
      // Password input should be secure
      const passwordInput = page.locator('input[name="password"]')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      
      // Should have proper autocomplete attributes
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })
  })

  test.describe('Mobile-Specific Deep Link Features', () => {
    test('should handle share sheet deep links', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Simulate deep link from share sheet
      const sharedUrl = '/competition/shared-comp-123/enter?utm_source=share_sheet&utm_medium=mobile'
      
      await page.goto(sharedUrl)
      await page.waitForTimeout(2000)
      
      // Should preserve share tracking through auth
      if (page.url().includes('/auth/login')) {
        expect(page.url()).toContain('utm_source=share_sheet')
        
        const testUser = authHelpers.generateTestUser()
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        await page.waitForTimeout(3000)
        
        const finalUrl = page.url()
        expect(finalUrl).toContain('utm_source=share_sheet')
        expect(finalUrl).toContain('utm_medium=mobile')
      }
    })

    test('should handle camera/QR code deep links', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Simulate QR code scan deep link
      const qrUrl = '/competition/qr-comp-456/enter?utm_source=qr_scan&ref=camera'
      
      await page.goto(qrUrl)
      await page.waitForTimeout(2000)
      
      // Should preserve QR scan context
      if (page.url().includes('/auth/login')) {
        expect(page.url()).toContain('utm_source=qr_scan')
        expect(page.url()).toContain('ref=camera')
        
        // May show QR-specific messaging
        const qrMessage = page.locator('[data-testid="qr-scan-message"]')
        if (await qrMessage.count() > 0) {
          await expect(qrMessage).toBeVisible()
        }
      }
    })

    test('should handle push notification deep links', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Simulate push notification deep link
      const pushUrl = '/competition/push-comp-789/enter?utm_source=push_notification&campaign=reminder'
      
      // Mock notification context
      await page.addInitScript(() => {
        // Mock notification API
        Object.defineProperty(window, 'Notification', {
          value: {
            permission: 'granted',
            requestPermission: () => Promise.resolve('granted')
          }
        })
      })
      
      await page.goto(pushUrl)
      await page.waitForTimeout(2000)
      
      // Should preserve notification context through auth
      if (page.url().includes('/auth/login')) {
        expect(page.url()).toContain('utm_source=push_notification')
        expect(page.url()).toContain('campaign=reminder')
      }
    })

    test('should handle app banner interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const competitionUrl = '/competition/app-banner-test/enter'
      
      // Simulate smart app banner interaction
      await page.addInitScript(() => {
        // Mock iOS smart app banner
        const meta = document.createElement('meta')
        meta.name = 'apple-itunes-app'
        meta.content = 'app-id=123456789, app-argument=hiitx://competition/app-banner-test/enter'
        document.head.appendChild(meta)
      })
      
      await page.goto(competitionUrl)
      await page.waitForTimeout(2000)
      
      // Should handle app banner without breaking auth flow
      if (page.url().includes('/auth/login')) {
        const loginForm = page.locator('form')
        await expect(loginForm).toBeVisible()
        
        // App banner should not interfere with form
        const testUser = authHelpers.generateTestUser()
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        await page.waitForTimeout(3000)
        expect(page.url()).toContain(competitionUrl)
      }
    })
  })

  test.describe('Network Handling on Mobile', () => {
    test('should handle poor mobile connectivity during auth', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Simulate slow mobile connection
      const client = await page.context().newCDPSession(page)
      await client.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: 2000, // 2s latency
        downloadThroughput: 50000, // 50kb/s
        uploadThroughput: 20000   // 20kb/s
      })
      
      const competitionUrl = '/competition/slow-connection-test/enter'
      
      await page.goto(competitionUrl)
      await page.waitForTimeout(3000) // Wait for slow redirect
      
      if (page.url().includes('/auth/login')) {
        // Should show loading states appropriately
        const testUser = authHelpers.generateTestUser()
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        
        // Submit and verify loading state
        const submitButton = page.locator('button[type="submit"]')
        await submitButton.click()
        
        // Should show loading state
        await expect(submitButton).toBeDisabled()
        
        // Wait for slow auth response
        await page.waitForTimeout(5000)
        
        // Should eventually complete
        const finalUrl = page.url()
        expect(finalUrl).toContain(competitionUrl)
      }
    })

    test('should handle offline scenarios gracefully', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      const competitionUrl = '/competition/offline-test/enter'
      
      // Go online first
      await page.goto(competitionUrl)
      await page.waitForTimeout(1000)
      
      // Go offline
      const client = await page.context().newCDPSession(page)
      await client.send('Network.emulateNetworkConditions', {
        offline: true,
        latency: 0,
        downloadThroughput: 0,
        uploadThroughput: 0
      })
      
      // Try to submit login form
      if (page.url().includes('/auth/login')) {
        const testUser = authHelpers.generateTestUser()
        await authHelpers.fillLoginForm(testUser.email, testUser.password)
        await page.click('button[type="submit"]')
        
        // Should show offline message
        await page.waitForTimeout(2000)
        const offlineMessage = await page.locator('[data-testid="offline-error"], .network-error').count() > 0
        expect(offlineMessage).toBeTruthy()
      }
    })
  })
})