# Authentication Components with Deep Link Support

This directory contains React authentication components with comprehensive deep link support for competition entry flows. All components are built using Radix UI primitives, TypeScript, and follow modern React patterns.

## 🚀 Features

- **Deep Link Support**: Preserve redirect URLs and competition context across authentication flows
- **Competition Integration**: Seamless authentication for competition entry
- **OAuth Support**: Google, GitHub, Discord authentication with state validation
- **Password Reset Flow**: Secure token-based password reset with email verification
- **TypeScript**: Full type safety with comprehensive interfaces
- **Accessibility**: WCAG 2.1 AA compliant components
- **Security**: CSRF protection, open redirect prevention, secure state management

## 📁 Components

### Core Components

- **`DeepLinkProvider`** - React context provider for deep link state management
- **`EnhancedLoginForm`** - Login form with redirect parameter preservation
- **`EnhancedSignupForm`** - Signup form with password strength validation
- **`PasswordResetFlow`** - Complete password reset flow with email verification
- **`CompetitionEntryGuard`** - Authentication guard for competition entry

### OAuth Components

- **`OAuthCallbackHandler`** - Generic OAuth callback handler with state validation
- **`GoogleCallbackHandler`** - Google-specific OAuth callback
- **`GitHubCallbackHandler`** - GitHub-specific OAuth callback
- **`DiscordCallbackHandler`** - Discord-specific OAuth callback

### Existing Components (Enhanced)

- **`AuthRedirect`** - Enhanced with deep link context support
- **`RouteGuard`** - Existing route protection component

## 🛠 Utilities & Hooks

### Custom Hooks (`lib/auth/auth-hooks.ts`)

- **`useAuthDeepLink()`** - Manage authentication deep links
- **`useEnhancedLogin()`** - Enhanced login functionality
- **`useEnhancedSignup()`** - Enhanced signup functionality
- **`usePasswordReset()`** - Password reset functionality
- **`useOAuthAuth()`** - OAuth authentication
- **`useCompetitionAuth()`** - Competition-specific authentication
- **`useLogout()`** - Logout with cleanup

### Utilities (`lib/auth/deep-link-utils.ts`)

- URL validation and sanitization
- OAuth state generation and validation
- Query parameter parsing and building
- Session storage with expiration
- Error message mapping

### Types (`lib/types/auth.ts`)

- Comprehensive TypeScript interfaces
- Authentication state types
- Deep link context types
- Component prop types

## 🎯 Usage Examples

### Basic Setup

```tsx
import { EnhancedAuthProvider } from '@/components/auth'

function App() {
  return (
    <EnhancedAuthProvider>
      <YourApp />
    </EnhancedAuthProvider>
  )
}
```

### Login Page

```tsx
import { EnhancedLoginForm } from '@/components/auth'

function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <EnhancedLoginForm 
          onSuccess={() => console.log('Login successful')}
          showSignupLink={true}
          showForgotPasswordLink={true}
        />
      </div>
    </div>
  )
}
```

### Competition Entry Protection

```tsx
import { CompetitionEntryGuard } from '@/components/auth'

function CompetitionEntryPage({ competitionId }: { competitionId: string }) {
  return (
    <CompetitionEntryGuard 
      competitionId={competitionId}
      requireAuth={true}
      showCompetitionInfo={true}
    >
      <CompetitionEntryForm />
    </CompetitionEntryGuard>
  )
}
```

### Using Deep Link Context

```tsx
import { useDeepLink } from '@/components/auth'

function CustomAuthComponent() {
  const {
    getRedirectUrl,
    getCompetitionId,
    setRedirectUrl,
    buildAuthUrl
  } = useDeepLink()

  const handleSignIn = () => {
    const loginUrl = buildAuthUrl('login')
    router.push(loginUrl)
  }

  return (
    <div>
      <p>Redirect URL: {getRedirectUrl() || 'None'}</p>
      <p>Competition: {getCompetitionId() || 'None'}</p>
      <button onClick={handleSignIn}>Sign In</button>
    </div>
  )
}
```

### OAuth Authentication

```tsx
import { useOAuthAuth } from '@/components/auth'

function OAuthButtons() {
  const { signInWithOAuth, isLoading } = useOAuthAuth()

  return (
    <div className="space-y-2">
      <Button 
        onClick={() => signInWithOAuth('google')}
        disabled={isLoading}
      >
        Sign in with Google
      </Button>
      <Button 
        onClick={() => signInWithOAuth('github')}
        disabled={isLoading}
      >
        Sign in with GitHub
      </Button>
    </div>
  )
}
```

## 🔗 Deep Link Flow Examples

### Competition Entry Flow

1. User clicks competition link: `/competitions/123/enter`
2. `CompetitionEntryGuard` checks authentication
3. If not authenticated, redirects to: `/auth/login?redirect=%2Fcompetitions%2F123%2Fenter&competition=123`
4. After successful login, redirects back to: `/competitions/123/enter`

### OAuth with Context Preservation

1. User starts OAuth flow from competition page
2. OAuth state includes competition context
3. After OAuth callback, user is redirected to original competition
4. Context is preserved across the entire flow

## 🔐 Security Features

- **Open Redirect Prevention**: Validates redirect URLs to prevent attacks
- **CSRF Protection**: OAuth state validation prevents cross-site request forgery
- **Secure Session Storage**: Encrypted storage with automatic expiration
- **URL Sanitization**: All URLs are validated and sanitized
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 📱 Accessibility

- Full keyboard navigation support
- Screen reader compatible
- ARIA labels and descriptions
- Focus management
- High contrast support
- Motion preferences respected

## 🎨 Styling

All components use Tailwind CSS classes and follow the existing design system:
- Consistent spacing and typography
- Dark mode support
- Responsive design
- Animation and transitions
- Proper color contrast ratios

## 🧪 Testing

Components are designed to be easily testable:
- Pure functions for utilities
- Isolated hooks for state management
- Predictable component behavior
- Mock-friendly design

## 📝 Configuration

The authentication system can be configured through environment variables and the `AuthConfig` interface:

```typescript
const authConfig: AuthConfig = {
  loginUrl: '/auth/login',
  signupUrl: '/auth/signup',
  resetUrl: '/auth/reset',
  enabledProviders: ['google', 'github'],
  enableSignup: true,
  enablePasswordReset: true,
  passwordMinLength: 8,
  requirePasswordComplexity: true,
  sessionTimeoutMinutes: 60,
  preserveRedirectParams: true
}
```

## 🔄 Migration from Existing Components

To upgrade existing authentication flows:

1. Wrap your app with `EnhancedAuthProvider`
2. Replace existing forms with enhanced versions
3. Update OAuth handlers to use new callback components
4. Add competition guards where needed
5. Test deep link flows thoroughly

## 🐛 Troubleshooting

### Common Issues

1. **Redirect loops**: Check for infinite redirects in auth flows
2. **Lost context**: Ensure `DeepLinkProvider` is properly configured
3. **OAuth failures**: Verify OAuth provider configurations
4. **TypeScript errors**: Import types from `@/lib/types/auth`

### Debug Mode

Set `NODE_ENV=development` to enable debug information in forms and components.

## 📚 Further Reading

- [Next.js Authentication Guide](https://nextjs.org/docs/authentication)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [OAuth 2.0 Security Best Practices](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-security-topics)