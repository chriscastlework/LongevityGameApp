import { defineConfig, devices } from '@playwright/test'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

/**
 * Playwright Configuration for Deep Link Authentication Testing
 * 
 * Optimized for comprehensive authentication testing including:
 * - Deep link URL validation and security
 * - OAuth callback handling with state validation
 * - Mobile PWA deep link authentication
 * - Competition entry authentication flows
 * - Cross-browser and mobile device testing
 */

export default defineConfig({
  testDir: './tests',
  
  // Test timeouts optimized for auth flows
  timeout: 60 * 1000, // 60 seconds for complex auth flows
  expect: {
    timeout: 15 * 1000, // 15 seconds for assertions
  },
  
  // Parallel execution for faster testing
  fullyParallel: true,
  
  // Retries for auth flow stability
  retries: process.env.CI ? 3 : 1,
  
  // Workers configuration
  workers: process.env.CI ? 4 : undefined,
  
  // Comprehensive reporting for auth test analysis
  reporter: [
    ['html', { 
      outputFolder: 'playwright-report',
      open: process.env.CI ? 'never' : 'on-failure'
    }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['line'],
    ...(process.env.CI ? [['github']] : [])
  ],
  
  // Output directory for test artifacts
  outputDir: 'test-results/',
  
  // Shared settings for all auth tests
  use: {
    // Base URL for testing
    baseURL: process.env.PLAYWRIGHT_BASE_URL || process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser context options
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
    
    // Tracing for debugging auth flows
    trace: 'retain-on-failure',
    
    // Screenshots for auth test failures
    screenshot: {
      mode: 'only-on-failure',
      fullPage: true,
    },
    
    // Video recording for complex auth flows
    video: {
      mode: 'retain-on-failure',
      size: { width: 1280, height: 720 },
    },
    
    // Network settings for auth API calls
    extraHTTPHeaders: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    
    // Locale for testing
    locale: 'en-US',
    
    // Service worker support for PWA testing
    serviceWorkers: 'allow',
    
    // Permissions for comprehensive testing
    permissions: ['geolocation', 'notifications'],
  },
  
  // Test projects for comprehensive coverage
  projects: [
    // Desktop Browser Testing
    {
      name: 'chromium-desktop',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
      testMatch: [
        'tests/auth/deep-link-auth.spec.ts',
        'tests/auth/oauth-deep-link-security.spec.ts',
        'tests/auth/competition-entry-auth.spec.ts'
      ],
    },
    
    {
      name: 'firefox-desktop',
      use: {
        ...devices['Desktop Firefox'],
      },
      testMatch: [
        'tests/auth/deep-link-auth.spec.ts',
        'tests/auth/oauth-deep-link-security.spec.ts'
      ],
    },
    
    {
      name: 'webkit-desktop',
      use: {
        ...devices['Desktop Safari'],
      },
      testMatch: [
        'tests/auth/deep-link-auth.spec.ts',
        'tests/auth/oauth-deep-link-security.spec.ts'
      ],
    },
    
    // Mobile Device Testing
    {
      name: 'mobile-chrome-android',
      use: {
        ...devices['Pixel 5'],
      },
      testMatch: [
        'tests/auth/mobile-pwa-deep-links.spec.ts',
        'tests/auth/deep-link-auth.spec.ts'
      ],
    },
    
    {
      name: 'mobile-safari-ios',
      use: {
        ...devices['iPhone 12'],
      },
      testMatch: [
        'tests/auth/mobile-pwa-deep-links.spec.ts',
        'tests/auth/deep-link-auth.spec.ts'
      ],
    },
    
    // Tablet Testing
    {
      name: 'tablet-ipad',
      use: {
        ...devices['iPad Pro'],
      },
      testMatch: [
        'tests/auth/mobile-pwa-deep-links.spec.ts',
        'tests/auth/competition-entry-auth.spec.ts'
      ],
    },
    
    // Security-Focused Testing
    {
      name: 'security-testing',
      use: {
        ...devices['Desktop Chrome'],
        // Security testing specific configuration
        launchOptions: {
          args: [
            '--disable-web-security', // For testing security measures
            '--ignore-certificate-errors',
            '--disable-features=VizDisplayCompositor',
          ],
        },
      },
      testMatch: [
        'tests/auth/oauth-deep-link-security.spec.ts'
      ],
    },
    
    // Performance Testing
    {
      name: 'performance-testing',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-experimental-web-platform-features',
            '--enable-precise-memory-info',
          ],
        },
      },
      testMatch: [
        'tests/auth/deep-link-auth.spec.ts',
        'tests/auth/mobile-pwa-deep-links.spec.ts'
      ],
    },
    
    // Accessibility Testing
    {
      name: 'accessibility-testing',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: [
            '--enable-experimental-web-platform-features',
            '--enable-accessibility-live-regions',
            '--force-prefers-reduced-motion',
          ],
        },
      },
      testMatch: [
        'tests/auth/deep-link-auth.spec.ts',
        'tests/auth/mobile-pwa-deep-links.spec.ts'
      ],
    },
    
    // Network Simulation Testing
    {
      name: 'slow-network',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-experimental-web-platform-features'],
        },
      },
      testMatch: [
        'tests/auth/mobile-pwa-deep-links.spec.ts'
      ],
    },
  ],
  
  // Web server for local development testing
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/global-setup.ts'),
  globalTeardown: require.resolve('./tests/global-teardown.ts'),
})

// Export configuration helpers for test files
export const testConfig = {
  // Test environment URLs
  urls: {
    base: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    auth: {
      login: '/auth/login',
      signup: '/auth/signup',
      forgotPassword: '/auth/forgot-password',
      resetPassword: '/auth/reset-password',
      callback: '/auth/callback',
    },
    competitions: {
      list: '/competitions',
      entry: (id: string) => `/competition/${id}/enter`,
      view: (id: string) => `/competition/${id}`,
    }
  },
  
  // Test user credentials
  testUsers: {
    valid: {
      email: process.env.TEST_USER_EMAIL || 'test@example.com',
      password: process.env.TEST_USER_PASSWORD || 'TestPassword123!',
    },
    admin: {
      email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'AdminPassword123!',
    },
  },
  
  // Test timeouts for different scenarios
  timeouts: {
    short: 5 * 1000,     // Form interactions
    medium: 15 * 1000,   // API calls
    long: 30 * 1000,     // Authentication flows
    oauth: 45 * 1000,    // OAuth flows
    mobile: 60 * 1000,   // Mobile/slow network
  },
  
  // Viewport configurations
  viewports: {
    mobile: { width: 375, height: 667 },
    tablet: { width: 768, height: 1024 },
    desktop: { width: 1280, height: 720 },
    wide: { width: 1920, height: 1080 },
  },
  
  // Test data patterns
  patterns: {
    uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    strongPassword: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    oauthState: /^[a-fA-F0-9]{32,}$/,
  },
  
  // Security test vectors
  security: {
    xssPayloads: [
      '<script>alert("xss")</script>',
      'javascript:alert(1)',
      '"><script>evil()</script>',
      '<img src=x onerror=alert(1)>',
    ],
    sqlInjection: [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "'; UNION SELECT * FROM users --",
    ],
    pathTraversal: [
      '../../../etc/passwd',
      '..\\..\\..\\windows\\system32\\config\\sam',
      '....//....//....//etc//passwd',
    ],
    openRedirect: [
      '//evil.com',
      'https://evil.com',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
    ],
  },
}