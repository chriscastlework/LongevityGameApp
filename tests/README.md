# Deep Link Authentication Test Suite

Comprehensive Playwright test suite for deep linking authentication system in the Competition PWA application.

## 🎯 Test Coverage Overview

This test suite provides comprehensive coverage for:

### 1. **Deep Link URL Validation (`deep-link-auth.spec.ts`)**
- ✅ Valid internal redirect URL acceptance
- ✅ Malicious URL rejection and sanitization  
- ✅ Encoded malicious URL handling
- ✅ Competition ID format validation
- ✅ Redirect URL session storage management
- ✅ Context preservation through authentication flows

### 2. **OAuth Security (`oauth-deep-link-security.spec.ts`)**
- ✅ Cryptographically secure state parameter generation
- ✅ State parameter tampering detection
- ✅ CSRF protection in OAuth flows
- ✅ OAuth state replay attack prevention
- ✅ Redirect URL security in OAuth context
- ✅ Session hijacking prevention
- ✅ Token security and leakage prevention

### 3. **Mobile PWA Deep Links (`mobile-pwa-deep-links.spec.ts`)**
- ✅ iOS Safari deep link handling
- ✅ Android Chrome deep link processing
- ✅ Tablet interface adaptations
- ✅ PWA standalone mode authentication
- ✅ PWA installation flow integration
- ✅ Mobile OAuth flow handling
- ✅ Touch interface optimization
- ✅ Mobile-specific deep link features

### 4. **Competition Entry Authentication (`competition-entry-auth.spec.ts`)**
- ✅ Protected competition entry flows
- ✅ Invite token validation and security
- ✅ Competition state handling (closed, full, etc.)
- ✅ Campaign tracking preservation
- ✅ Concurrent entry attempt handling
- ✅ Social sharing integration

### 5. **Error Scenarios and Recovery (`error-scenarios.spec.ts`)**
- ✅ Network failure handling
- ✅ Malformed data processing
- ✅ Race condition management
- ✅ Session management edge cases
- ✅ Recovery and resilience testing

## 🚀 Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install
```

### Environment Setup

Create a `.env.test` file with test configuration:

```env
# Test Environment
PLAYWRIGHT_BASE_URL=http://localhost:3000
NODE_ENV=test

# Test User Credentials
TEST_USER_EMAIL=deeplink-test@example.com
TEST_USER_PASSWORD=DeepLinkTest123!
TEST_ADMIN_EMAIL=admin-test@example.com
TEST_ADMIN_PASSWORD=AdminTest123!

# Database (if using real database for testing)
DATABASE_URL=postgresql://user:pass@localhost:5432/test_db
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

## 🧪 Running Tests

### Full Test Suite

```bash
# Run all deep link authentication tests
npm run test

# Run with UI mode for debugging
npm run test:ui

# Run in headed mode to see browser
npm run test:headed
```

### Specific Test Categories

```bash
# Deep link validation tests
npx playwright test tests/auth/deep-link-auth.spec.ts

# OAuth security tests
npx playwright test tests/auth/oauth-deep-link-security.spec.ts

# Mobile PWA tests
npx playwright test tests/auth/mobile-pwa-deep-links.spec.ts

# Competition entry tests
npx playwright test tests/auth/competition-entry-auth.spec.ts

# Error handling tests
npx playwright test tests/auth/error-scenarios.spec.ts
```

### Browser-Specific Testing

```bash
# Test on specific browsers
npx playwright test --project=chromium-desktop
npx playwright test --project=firefox-desktop  
npx playwright test --project=webkit-desktop

# Mobile device testing
npx playwright test --project=mobile-chrome-android
npx playwright test --project=mobile-safari-ios
npx playwright test --project=tablet-ipad
```

### Specialized Test Runs

```bash
# Security-focused testing
npx playwright test --project=security-testing

# Performance testing
npx playwright test --project=performance-testing

# Accessibility testing  
npx playwright test --project=accessibility-testing

# Slow network simulation
npx playwright test --project=slow-network
```

## 🛠️ Test Configuration

The test suite uses a sophisticated configuration in `playwright.config.ts`:

### Browser Matrix
- **Desktop**: Chrome, Firefox, Safari
- **Mobile**: Android Chrome, iOS Safari
- **Tablet**: iPad Pro
- **Specialized**: Security, Performance, Accessibility testing

### Test Environments
- **Development**: `http://localhost:3000`
- **Staging**: Configured via `PLAYWRIGHT_BASE_URL`
- **CI/CD**: Optimized for continuous integration

### Timeout Configuration
- **Short operations**: 5 seconds (form interactions)
- **Medium operations**: 15 seconds (API calls)
- **Long operations**: 30 seconds (authentication flows)
- **OAuth flows**: 45 seconds (external redirects)
- **Mobile/slow network**: 60 seconds

## 📊 Test Reports and Debugging

### HTML Reports

```bash
# Generate and view HTML report
npm run test:report

# Reports are automatically generated at:
# - playwright-report/index.html
# - test-results/results.json
# - test-results/junit.xml
```

### Debug Mode

```bash
# Debug specific test with breakpoints
npm run test:debug tests/auth/deep-link-auth.spec.ts

# Debug with headed browser
npm run test:headed --debug

# Trace viewer for failed tests
npx playwright show-trace test-results/trace.zip
```

### Screenshots and Videos

Test artifacts are automatically captured on failures:
- **Screenshots**: Full page captures
- **Videos**: Complete test execution recording
- **Traces**: Detailed execution traces with DOM snapshots

## 🔧 Test Utilities

### AuthTestHelpers Class

Comprehensive helper class for authentication testing:

```typescript
import { AuthTestHelpers } from '../utils/auth-test-helpers'

const authHelpers = new AuthTestHelpers(page)

// Generate test user data
const user = authHelpers.generateTestUser({
  passwordStrength: 'strong',
  includeOptionalFields: true
})

// Perform authentication flows
await authHelpers.login(user.email, user.password)
await authHelpers.signup(user)
await authHelpers.mockSuccessfulOAuth('google')

// Validate accessibility
await authHelpers.validateFormAccessibility()
```

### Test Data Generators

```typescript
import { TestDataGenerator } from '../utils/auth-test-helpers'

// Generate valid test data
const competitionId = TestDataGenerator.generateCompetitionId()
const inviteToken = TestDataGenerator.generateInviteToken()
const oauthState = TestDataGenerator.generateOAuthState()
const campaignParams = TestDataGenerator.generateCampaignParams()
```

## 🎭 Mock and Test Scenarios

### OAuth Flow Mocking

```typescript
// Mock successful OAuth flow
await authHelpers.mockSuccessfulOAuth('google')

// Mock OAuth errors
await authHelpers.mockOAuthFlow({
  provider: 'google',
  code: 'test-code',
  state: 'test-state',
  error: 'access_denied'
})
```

### Network Condition Simulation

```typescript
// Simulate slow network
await page.route('**/api/auth/**', route => {
  setTimeout(() => {
    route.fulfill({ status: 200, body: '{"success": true}' })
  }, 5000)
})

// Simulate network failures
await page.route('**/api/auth/**', route => {
  route.fulfill({ status: 500, body: '{"error": "Server error"}' })
})
```

## 🔍 Test Scenarios Covered

### Security Test Vectors

The test suite includes comprehensive security testing:

```typescript
// XSS Prevention
const xssPayloads = [
  '<script>alert("xss")</script>',
  'javascript:alert(1)',
  '"><script>evil()</script>'
]

// SQL Injection
const sqlPayloads = [
  "'; DROP TABLE users; --",
  "' OR '1'='1",
  "'; UNION SELECT * FROM users --"
]

// Path Traversal
const pathTraversalPayloads = [
  '../../../etc/passwd',
  '....//....//....//etc//passwd'
]

// Open Redirect
const openRedirectPayloads = [
  '//evil.com',
  'https://evil.com',
  'javascript:alert(1)'
]
```

### Edge Cases Testing

- **Unicode and Special Characters**: Various character encodings
- **Boundary Conditions**: Maximum length inputs, empty values
- **Race Conditions**: Concurrent authentication attempts
- **Session Management**: Expiry, corruption, cross-tab conflicts
- **Network Resilience**: Timeouts, intermittent failures, recovery

## 📱 Mobile Testing Features

### Device-Specific Testing
- **Touch Interface**: Minimum touch target sizes (44px iOS, 48px Android)
- **Viewport Adaptation**: Responsive design validation
- **PWA Features**: Standalone mode, app installation, service workers
- **Mobile Keyboards**: Appropriate input types and autocomplete
- **Network Conditions**: Slow 3G, offline scenarios

### Mobile OAuth Flows
- **App Switching**: OAuth app-to-web transitions
- **Deep Link Handling**: Custom URL schemes and universal links
- **Share Sheet Integration**: Social sharing with tracking
- **Push Notification Links**: Deep links from notifications

## 🚨 Troubleshooting

### Common Issues

1. **Application Not Starting**
   ```bash
   # Ensure development server is running
   npm run dev
   
   # Check port availability
   lsof -i :3000
   ```

2. **Test Timeouts**
   ```bash
   # Increase timeout for slow operations
   npx playwright test --timeout=90000
   ```

3. **Browser Installation Issues**
   ```bash
   # Reinstall browsers
   npx playwright install --force
   ```

### Debug Tips

1. **Use Debug Mode**: Add `await page.pause()` in tests for step-by-step debugging
2. **Console Logs**: Check browser console for JavaScript errors
3. **Network Tab**: Monitor API calls and responses
4. **Storage Inspection**: Verify localStorage and sessionStorage state

### CI/CD Considerations

```yaml
# Example GitHub Actions integration
- name: Install Playwright
  run: npx playwright install --with-deps

- name: Run Authentication Tests  
  run: npm run test
  env:
    PLAYWRIGHT_BASE_URL: https://staging.example.com
    TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}

- name: Upload Test Results
  uses: actions/upload-artifact@v3
  if: failure()
  with:
    name: test-results
    path: test-results/
```

## 📈 Performance Considerations

### Test Execution Optimization
- **Parallel Execution**: Tests run in parallel for faster feedback
- **Browser Reuse**: Shared browser contexts where possible
- **Selective Running**: Target specific test categories
- **Resource Management**: Automatic cleanup after tests

### Memory and Storage
- **Session Storage**: Automatic cleanup between tests
- **Browser Cache**: Isolated contexts prevent interference
- **File System**: Temporary artifacts cleaned up automatically

## 🤝 Contributing to Tests

### Adding New Test Cases

1. **Follow Existing Patterns**: Use established helper functions and conventions
2. **Comprehensive Coverage**: Include happy path, edge cases, and error scenarios
3. **Mobile Considerations**: Test responsive design and touch interfaces
4. **Security Focus**: Include security-specific test vectors
5. **Documentation**: Update README when adding new test categories

### Test Organization

```
tests/
├── auth/                           # Authentication test files
│   ├── deep-link-auth.spec.ts      # Core deep link testing
│   ├── oauth-deep-link-security.spec.ts  # OAuth security focus
│   ├── mobile-pwa-deep-links.spec.ts     # Mobile PWA features
│   ├── competition-entry-auth.spec.ts    # Competition flows
│   └── error-scenarios.spec.ts           # Error handling
├── utils/                          # Test utilities
│   └── auth-test-helpers.ts        # Helper functions
├── global-setup.ts                 # Test environment setup
├── global-teardown.ts             # Test environment cleanup
└── README.md                      # This documentation
```

## 📚 Additional Resources

- [Playwright Documentation](https://playwright.dev/)
- [Deep Link Security Best Practices](https://owasp.org/www-project-mobile-top-10/)
- [PWA Testing Guidelines](https://web.dev/testing-web-apps/)
- [OAuth 2.0 Security](https://tools.ietf.org/html/rfc6819)
- [Mobile App Security](https://owasp.org/www-project-mobile-security-testing-guide/)

---

## 🎯 Test Execution Summary

**Total Test Scenarios**: 150+ comprehensive test cases  
**Security Coverage**: XSS, CSRF, Open Redirect, Injection attacks  
**Browser Support**: Chrome, Firefox, Safari, Mobile browsers  
**Device Coverage**: Desktop, Mobile (iOS/Android), Tablet  
**Network Scenarios**: Fast, Slow, Intermittent, Offline  
**Authentication Flows**: Login, Signup, OAuth, Password Reset  
**Deep Link Features**: Competition entry, Invites, Campaign tracking  

This test suite ensures robust, secure, and user-friendly deep link authentication across all supported platforms and scenarios.