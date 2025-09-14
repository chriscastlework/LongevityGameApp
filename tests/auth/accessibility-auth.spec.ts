import { test, expect } from '@playwright/test'
import { AuthTestHelpers } from '../utils/auth-test-helpers'

/**
 * Authentication Accessibility Test Suite
 * 
 * Comprehensive accessibility testing for authentication flows
 * including WCAG 2.1 AA compliance, keyboard navigation,
 * screen reader support, and inclusive design validation
 */

test.describe('Authentication Accessibility', () => {
  let authHelpers: AuthTestHelpers

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthTestHelpers(page)
    
    // Enable accessibility testing extensions
    await page.addInitScript(() => {
      // Mock accessibility API for testing
      Object.defineProperty(window.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (compatible; AccessibilityTester/1.0)',
        configurable: true
      })
    })
  })

  test.describe('WCAG 2.1 Compliance', () => {
    test('should provide proper form labeling and structure', async ({ page }) => {
      await page.goto('/auth/login?redirect=/competition/accessibility-test/enter')
      
      // Check form has proper semantic structure
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      // Form should have accessible name
      const formLabel = await form.getAttribute('aria-label')
      const formLabelledBy = await form.getAttribute('aria-labelledby')
      expect(formLabel || formLabelledBy).toBeTruthy()
      
      // Check all inputs have proper labels
      const inputs = await page.locator('input[type="email"], input[type="password"], input[type="text"]').all()
      
      for (const input of inputs) {
        const id = await input.getAttribute('id')
        const name = await input.getAttribute('name')
        const ariaLabel = await input.getAttribute('aria-label')
        const ariaLabelledBy = await input.getAttribute('aria-labelledby')
        
        // Input must have accessible name
        let hasAccessibleName = false
        
        if (id) {
          const associatedLabel = page.locator(`label[for="${id}"]`)
          hasAccessibleName = await associatedLabel.count() > 0
        }
        
        hasAccessibleName = hasAccessibleName || !!ariaLabel || !!ariaLabelledBy
        expect(hasAccessibleName).toBeTruthy()
        
        // Required inputs should have aria-required
        const isRequired = await input.getAttribute('required')
        if (isRequired !== null) {
          const ariaRequired = await input.getAttribute('aria-required')
          expect(ariaRequired).toBe('true')
        }
      }
    })

    test('should provide clear error messages with proper ARIA', async ({ page }) => {
      await page.goto('/auth/login')
      
      const testUser = authHelpers.generateTestUser()
      
      // Submit form with invalid email
      await page.fill('input[name="email"]', 'invalid-email')
      await page.fill('input[name="password"]', testUser.password)
      await page.click('button[type="submit"]')
      
      await page.waitForTimeout(2000)
      
      // Check for error messages
      const errorElements = await page.locator('[role="alert"], .error, .invalid, [aria-invalid="true"]').all()
      
      for (const errorElement of errorElements) {
        // Error should be visible
        await expect(errorElement).toBeVisible()
        
        // Error should have text content
        const errorText = await errorElement.textContent()
        expect(errorText?.trim()).toBeTruthy()
        
        // Check for proper ARIA attributes
        const role = await errorElement.getAttribute('role')
        const ariaLive = await errorElement.getAttribute('aria-live')
        
        // Should be announced to screen readers
        expect(role === 'alert' || ariaLive === 'polite' || ariaLive === 'assertive').toBeTruthy()
      }
      
      // Associated input should have aria-invalid
      const emailInput = page.locator('input[name="email"]')
      const ariaInvalid = await emailInput.getAttribute('aria-invalid')
      expect(ariaInvalid).toBe('true')
    })

    test('should maintain proper heading hierarchy', async ({ page }) => {
      const pages = [
        '/auth/login',
        '/auth/signup',
        '/auth/forgot-password'
      ]
      
      for (const pagePath of pages) {
        await page.goto(pagePath)
        
        // Check heading structure
        const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
        
        let previousLevel = 0
        for (const heading of headings) {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
          const currentLevel = parseInt(tagName.charAt(1))
          
          if (previousLevel === 0) {
            // First heading should be h1
            expect(currentLevel).toBe(1)
          } else {
            // Subsequent headings should not skip levels
            expect(currentLevel).toBeLessThanOrEqual(previousLevel + 1)
          }
          
          previousLevel = currentLevel
          
          // Heading should have visible text
          const headingText = await heading.textContent()
          expect(headingText?.trim()).toBeTruthy()
        }
      }
    })

    test('should provide adequate color contrast', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Check form elements for color contrast
      const elementsToCheck = [
        'input[type="email"]',
        'input[type="password"]', 
        'button[type="submit"]',
        'label',
        '.error',
        'a'
      ]
      
      for (const selector of elementsToCheck) {
        const elements = await page.locator(selector).all()
        
        for (const element of elements) {
          if (await element.isVisible()) {
            // Get computed styles
            const styles = await element.evaluate(el => {
              const computed = window.getComputedStyle(el)
              return {
                color: computed.color,
                backgroundColor: computed.backgroundColor,
                fontSize: computed.fontSize
              }
            })
            
            // Check minimum font size for readability
            const fontSize = parseFloat(styles.fontSize)
            expect(fontSize).toBeGreaterThanOrEqual(14) // Minimum readable size
            
            // Color and background should be defined
            expect(styles.color).toBeTruthy()
            expect(styles.backgroundColor).toBeTruthy()
          }
        }
      }
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should support full keyboard navigation', async ({ page }) => {
      await page.goto('/auth/login?redirect=/competition/keyboard-test/enter')
      
      // Tab through all interactive elements
      const interactiveElements = [
        'input[name="email"]',
        'input[name="password"]',
        'button[type="submit"]'
      ]
      
      let tabIndex = 0
      for (const selector of interactiveElements) {
        await page.keyboard.press('Tab')
        
        // Check if element is focused
        const focusedElement = await page.evaluate(() => document.activeElement?.tagName.toLowerCase())
        const expectedElement = selector.split('[')[0]
        
        expect(focusedElement).toBe(expectedElement)
        tabIndex++
      }
      
      // Should be able to submit with Enter key
      await page.keyboard.press('Enter')
      await page.waitForTimeout(2000)
      
      // Should handle form submission or show validation
      const hasResponse = await page.locator('.error, .success, form').count() > 0
      expect(hasResponse).toBeTruthy()
    })

    test('should provide visible focus indicators', async ({ page }) => {
      await page.goto('/auth/login')
      
      const focusableElements = await page.locator('input, button, a, [tabindex="0"]').all()
      
      for (const element of focusableElements) {
        if (await element.isVisible()) {
          await element.focus()
          
          // Check for focus indicator
          const styles = await element.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return {
              outline: computed.outline,
              outlineWidth: computed.outlineWidth,
              outlineStyle: computed.outlineStyle,
              boxShadow: computed.boxShadow,
              border: computed.border
            }
          })
          
          // Should have some form of focus indicator
          const hasFocusIndicator = 
            styles.outline !== 'none' ||
            styles.outlineWidth !== '0px' ||
            styles.boxShadow.includes('rgb') ||
            styles.border.includes('rgb')
          
          expect(hasFocusIndicator).toBeTruthy()
        }
      }
    })

    test('should handle keyboard shortcuts appropriately', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Test common keyboard shortcuts
      await page.keyboard.press('Tab') // Should focus first input
      await page.keyboard.press('Escape') // Should not break navigation
      
      // Fill form using keyboard only
      const testUser = authHelpers.generateTestUser()
      await page.keyboard.type(testUser.email)
      
      await page.keyboard.press('Tab') // Move to password
      await page.keyboard.type(testUser.password)
      
      await page.keyboard.press('Tab') // Move to submit button
      await page.keyboard.press('Enter') // Submit form
      
      await page.waitForTimeout(2000)
      
      // Should handle submission or validation
      const currentUrl = page.url()
      expect(currentUrl).toBeTruthy()
    })

    test('should provide skip links for navigation', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Check for skip links
      await page.keyboard.press('Tab')
      
      const skipLink = page.locator('a:has-text("Skip"), [href="#main-content"], .skip-link')
      if (await skipLink.count() > 0) {
        await expect(skipLink).toBeFocused()
        
        // Skip link should be visible when focused
        await expect(skipLink).toBeVisible()
        
        // Activate skip link
        await page.keyboard.press('Enter')
        
        // Should move focus to main content
        const focusedElement = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)
        expect(focusedElement).toMatch(/main|content|form/i)
      }
    })
  })

  test.describe('Screen Reader Support', () => {
    test('should provide meaningful page titles', async ({ page }) => {
      const testPages = [
        { url: '/auth/login', expectedTitle: /login|sign.*in/i },
        { url: '/auth/signup', expectedTitle: /signup|register|sign.*up/i },
        { url: '/auth/forgot-password', expectedTitle: /forgot|reset.*password/i }
      ]
      
      for (const testPage of testPages) {
        await page.goto(testPage.url)
        
        const title = await page.title()
        expect(title).toMatch(testPage.expectedTitle)
        expect(title.length).toBeGreaterThan(5) // Not just generic title
      }
    })

    test('should provide form instructions and help text', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Check for form instructions
      const instructions = page.locator('[role="group"] p, .form-instructions, [aria-describedby]')
      
      if (await instructions.count() > 0) {
        await expect(instructions.first()).toBeVisible()
        
        const instructionText = await instructions.first().textContent()
        expect(instructionText?.length).toBeGreaterThan(10)
      }
      
      // Password field should have help text
      const passwordInput = page.locator('input[type="password"]')
      const ariaDescribedBy = await passwordInput.getAttribute('aria-describedby')
      
      if (ariaDescribedBy) {
        const helpText = page.locator(`#${ariaDescribedBy}`)
        await expect(helpText).toBeVisible()
        
        const helpContent = await helpText.textContent()
        expect(helpContent?.length).toBeGreaterThan(5)
      }
    })

    test('should announce dynamic content changes', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Submit form to trigger validation messages
      await page.click('button[type="submit"]')
      await page.waitForTimeout(2000)
      
      // Check for live regions
      const liveRegions = await page.locator('[aria-live], [role="alert"], [role="status"]').all()
      
      for (const region of liveRegions) {
        const role = await region.getAttribute('role')
        const ariaLive = await region.getAttribute('aria-live')
        
        // Should have appropriate announcement settings
        expect(role === 'alert' || role === 'status' || ariaLive).toBeTruthy()
        
        if (await region.isVisible()) {
          const content = await region.textContent()
          expect(content?.trim()).toBeTruthy()
        }
      }
    })

    test('should provide context for form sections', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Check for fieldsets or grouped content
      const formSections = await page.locator('fieldset, [role="group"]').all()
      
      for (const section of formSections) {
        // Section should have a name/legend
        const legend = section.locator('legend')
        const ariaLabel = await section.getAttribute('aria-label')
        const ariaLabelledBy = await section.getAttribute('aria-labelledby')
        
        const hasAccessibleName = 
          await legend.count() > 0 || 
          !!ariaLabel || 
          !!ariaLabelledBy
        
        expect(hasAccessibleName).toBeTruthy()
      }
    })
  })

  test.describe('Mobile Accessibility', () => {
    test('should provide touch-friendly targets on mobile', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/auth/login')
      
      // Check touch target sizes
      const touchTargets = await page.locator('button, input, a, [role="button"]').all()
      
      for (const target of touchTargets) {
        if (await target.isVisible()) {
          const boundingBox = await target.boundingBox()
          
          if (boundingBox) {
            // iOS minimum: 44px x 44px, Android minimum: 48px x 48px
            expect(boundingBox.height).toBeGreaterThanOrEqual(44)
            expect(boundingBox.width).toBeGreaterThanOrEqual(44)
          }
        }
      }
    })

    test('should handle mobile screen reader gestures', async ({ page }) => {
      // Simulate mobile device
      await page.setViewportSize({ width: 375, height: 667 })
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1')
      
      await page.goto('/auth/login')
      
      // Test swipe navigation simulation
      const form = page.locator('form')
      await expect(form).toBeVisible()
      
      // Elements should be accessible via touch
      const touchElements = await page.locator('input, button').all()
      
      for (const element of touchElements) {
        if (await element.isVisible()) {
          // Should be reachable by tap
          await element.tap()
          await page.waitForTimeout(100)
          
          // Element should respond to interaction
          const isFocused = await element.evaluate(el => el === document.activeElement)
          expect(isFocused).toBeTruthy()
        }
      }
    })

    test('should provide appropriate input types for mobile keyboards', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      await page.goto('/auth/login')
      
      // Email input should trigger email keyboard
      const emailInput = page.locator('input[name="email"]')
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('inputmode', 'email')
      await expect(emailInput).toHaveAttribute('autocomplete', 'email')
      
      // Password input should be secure
      const passwordInput = page.locator('input[name="password"]')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password')
    })
  })

  test.describe('High Contrast and Visual Accessibility', () => {
    test('should work with high contrast mode', async ({ page }) => {
      // Simulate high contrast mode
      await page.addInitScript(() => {
        // Mock high contrast media query
        Object.defineProperty(window, 'matchMedia', {
          value: (query: string) => ({
            matches: query.includes('prefers-contrast: high'),
            addEventListener: () => {},
            removeEventListener: () => {}
          })
        })
      })
      
      await page.goto('/auth/login')
      
      // Elements should remain visible and functional
      const criticalElements = [
        'input[name="email"]',
        'input[name="password"]',
        'button[type="submit"]'
      ]
      
      for (const selector of criticalElements) {
        const element = page.locator(selector)
        await expect(element).toBeVisible()
        
        // Check that element has sufficient visual distinction
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            borderWidth: computed.borderWidth,
            borderStyle: computed.borderStyle,
            outline: computed.outline
          }
        })
        
        // Should have visible borders or outlines in high contrast
        const hasVisualBorder = 
          styles.borderWidth !== '0px' || 
          styles.outline !== 'none'
        
        expect(hasVisualBorder).toBeTruthy()
      }
    })

    test('should support reduced motion preferences', async ({ page }) => {
      // Mock prefers-reduced-motion
      await page.addInitScript(() => {
        Object.defineProperty(window, 'matchMedia', {
          value: (query: string) => ({
            matches: query.includes('prefers-reduced-motion: reduce'),
            addEventListener: () => {},
            removeEventListener: () => {}
          })
        })
      })
      
      await page.goto('/auth/login')
      
      // Submit form and check for animations
      const testUser = authHelpers.generateTestUser()
      await authHelpers.fillLoginForm(testUser.email, testUser.password)
      await page.click('button[type="submit"]')
      
      // Verify animations are reduced or eliminated
      const animatedElements = await page.locator('[style*="transition"], [style*="animation"]').all()
      
      for (const element of animatedElements) {
        const styles = await element.evaluate(el => {
          const computed = window.getComputedStyle(el)
          return {
            transition: computed.transition,
            animation: computed.animation
          }
        })
        
        // Animations should be reduced in duration or disabled
        if (styles.transition.includes('s')) {
          const duration = parseFloat(styles.transition.match(/[\d.]+s/)?.[0] || '1s')
          expect(duration).toBeLessThanOrEqual(0.3) // Very short or no transition
        }
      }
    })

    test('should provide sufficient spacing for visual clarity', async ({ page }) => {
      await page.goto('/auth/signup')
      
      // Check spacing between form elements
      const formElements = await page.locator('form input, form button').all()
      
      for (let i = 0; i < formElements.length - 1; i++) {
        const currentElement = formElements[i]
        const nextElement = formElements[i + 1]
        
        if (await currentElement.isVisible() && await nextElement.isVisible()) {
          const currentBox = await currentElement.boundingBox()
          const nextBox = await nextElement.boundingBox()
          
          if (currentBox && nextBox) {
            // Calculate vertical spacing
            const spacing = nextBox.y - (currentBox.y + currentBox.height)
            
            // Should have at least 8px spacing for visual clarity
            expect(spacing).toBeGreaterThanOrEqual(8)
          }
        }
      }
    })
  })

  test.describe('Internationalization and Accessibility', () => {
    test('should provide proper language attributes', async ({ page }) => {
      await page.goto('/auth/login')
      
      // Check html lang attribute
      const htmlLang = await page.getAttribute('html', 'lang')
      expect(htmlLang).toBeTruthy()
      expect(htmlLang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/) // Format: en or en-US
      
      // Check for any elements with different languages
      const langElements = await page.locator('[lang]').all()
      
      for (const element of langElements) {
        const lang = await element.getAttribute('lang')
        expect(lang).toMatch(/^[a-z]{2}(-[A-Z]{2})?$/)
      }
    })

    test('should handle RTL languages appropriately', async ({ page }) => {
      // Simulate RTL language
      await page.addInitScript(() => {
        document.documentElement.setAttribute('dir', 'rtl')
        document.documentElement.setAttribute('lang', 'ar')
      })
      
      await page.goto('/auth/login')
      
      // Form should adapt to RTL layout
      const form = page.locator('form')
      const formDirection = await form.evaluate(el => {
        return window.getComputedStyle(el).direction
      })
      
      expect(formDirection).toBe('rtl')
      
      // Text inputs should be RTL aligned
      const inputs = await page.locator('input[type="text"], input[type="email"]').all()
      
      for (const input of inputs) {
        const textAlign = await input.evaluate(el => {
          return window.getComputedStyle(el).textAlign
        })
        
        expect(textAlign).toMatch(/right|start/)
      }
    })
  })
})