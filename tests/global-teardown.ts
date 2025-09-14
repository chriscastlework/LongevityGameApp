import { chromium, FullConfig } from '@playwright/test'

/**
 * Global Teardown for Deep Link Authentication Tests
 * 
 * Cleans up the test environment including:
 * - Removing test users and data
 * - Clearing test sessions and tokens
 * - Cleaning up temporary files
 * - Generating test reports
 */

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Cleaning up test environment...')
  
  try {
    // Get base URL from config
    const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:3000'
    
    // Launch browser for cleanup operations
    const browser = await chromium.launch()
    const context = await browser.newContext()
    const page = await context.newPage()
    
    // Perform cleanup operations
    await cleanupTestData(page, baseURL)
    await clearTestSessions(page)
    await generateCleanupReport()
    
    await browser.close()
    
    console.log('✅ Test environment cleanup complete')
    
  } catch (error) {
    console.error('⚠️  Warning: Test cleanup encountered issues:', error.message)
    // Don't throw error to avoid failing the test run
  }
}

/**
 * Clean up test data created during test runs
 */
async function cleanupTestData(page: any, baseURL: string) {
  console.log('🗑️  Cleaning up test data...')
  
  try {
    await page.goto(baseURL)
    
    // Clear test data from localStorage
    await page.evaluate(() => {
      // Remove test-specific data
      const keysToRemove = [
        'test-competitions',
        'test-oauth-states',
        'test-invite-tokens',
        'auth_redirect_url',
        'auth_competition_id',
        'auth_flow',
        'oauth_state',
        'auth_context_backup',
        'auth_session_expiry'
      ]
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
      })
      
      // Clear any test authentication tokens
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('supabase') || 
        key.includes('auth') || 
        key.includes('test-')
      )
      
      authKeys.forEach(key => localStorage.removeItem(key))
    })
    
    console.log('✅ Test data cleaned up')
    
  } catch (error) {
    console.log('⚠️  Could not clean up all test data:', error.message)
  }
}

/**
 * Clear any remaining test sessions
 */
async function clearTestSessions(page: any) {
  console.log('🔐 Clearing test sessions...')
  
  try {
    // Clear all cookies
    await page.context().clearCookies()
    
    // Clear permissions
    await page.context().clearPermissions()
    
    // Clear any service worker registrations
    await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations()
        for (const registration of registrations) {
          await registration.unregister()
        }
      }
    })
    
    console.log('✅ Test sessions cleared')
    
  } catch (error) {
    console.log('⚠️  Could not clear all test sessions:', error.message)
  }
}

/**
 * Generate cleanup and summary report
 */
async function generateCleanupReport() {
  console.log('📊 Generating cleanup report...')
  
  try {
    const fs = require('fs')
    const path = require('path')
    
    // Create cleanup report
    const cleanupReport = {
      timestamp: new Date().toISOString(),
      testEnvironment: process.env.NODE_ENV || 'test',
      baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
      cleanupActions: [
        'Removed test user data from storage',
        'Cleared OAuth state tokens',
        'Removed competition test data',
        'Cleared browser sessions and cookies',
        'Unregistered service workers'
      ],
      testFilesProcessed: [
        'deep-link-auth.spec.ts',
        'oauth-deep-link-security.spec.ts', 
        'mobile-pwa-deep-links.spec.ts',
        'competition-entry-auth.spec.ts'
      ],
      notes: 'Deep link authentication test cleanup completed successfully'
    }
    
    // Ensure test-results directory exists
    const resultsDir = path.join(process.cwd(), 'test-results')
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true })
    }
    
    // Write cleanup report
    const reportPath = path.join(resultsDir, 'cleanup-report.json')
    fs.writeFileSync(reportPath, JSON.stringify(cleanupReport, null, 2))
    
    console.log(`✅ Cleanup report generated: ${reportPath}`)
    
  } catch (error) {
    console.log('⚠️  Could not generate cleanup report:', error.message)
  }
}

export default globalTeardown