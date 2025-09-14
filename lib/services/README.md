# Services

This directory contains business logic services for the competition PWA.

## DeepLinkHandler

The `DeepLinkHandler` service provides comprehensive deep linking infrastructure with security validation and routing logic.

### Features

- **URL Pattern Matching**: Detects deep links from various sources (mobile, email, social media)
- **Security Validation**: Implements allowlist-based URL validation to prevent open redirect attacks
- **Competition Context**: Handles competition-specific deep links with actions (enter, view, results, invite, share)
- **Campaign Tracking**: Preserves UTM parameters and referrer information for analytics
- **Session Management**: Generates unique session IDs for deep link tracking

### Usage

```typescript
import { DeepLinkHandler } from '@/lib/services/DeepLinkHandler'

const handler = new DeepLinkHandler()
const deepLinkData = handler.extractDeepLinkData(request)

if (deepLinkData.isDeepLink) {
  const routeResult = handler.handleDeepLinkRouting(deepLinkData, request)
  // Handle routing based on result
}
```

### Security Considerations

- All redirect URLs are validated against an allowlist
- Dangerous URL patterns are blocked (javascript:, data:, etc.)
- Path traversal attempts are prevented
- Domain validation for absolute URLs
- Timestamp-based expiration for deep link sessions