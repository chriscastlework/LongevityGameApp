/**
 * Deep link utilities for authentication flows
 */

/**
 * Validates a redirect URL to prevent open redirect attacks
 */
export function isValidRedirectUrl(url: string | null): boolean {
  if (!url || typeof url !== 'string') {
    return false
  }
  
  // Must start with / but not //
  return url.startsWith('/') && !url.startsWith('//')
}

/**
 * Safely encode a URL parameter
 */
export function safeEncodeURIComponent(value: string): string {
  try {
    return encodeURIComponent(value)
  } catch {
    return ''
  }
}

/**
 * Safely decode a URL parameter
 */
export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

/**
 * Generate a secure random state for OAuth
 */
export function generateOAuthState(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Parse query parameters from a URL string
 */
export function parseQueryParams(url: string): Record<string, string> {
  try {
    const urlObj = new URL(url, window.location.origin)
    const params: Record<string, string> = {}
    
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value
    })
    
    return params
  } catch {
    return {}
  }
}

/**
 * Build a URL with query parameters
 */
export function buildUrl(baseUrl: string, params: Record<string, string | undefined>): string {
  const url = new URL(baseUrl, window.location.origin)
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value)
    }
  })
  
  return url.pathname + url.search
}

/**
 * Extract authentication context from current URL
 */
export interface AuthUrlContext {
  redirectUrl?: string
  competitionId?: string
  authFlow?: 'login' | 'signup' | 'reset'
  oauthState?: string
  error?: string
  errorDescription?: string
}

export function extractAuthContext(searchParams: URLSearchParams): AuthUrlContext {
  const context: AuthUrlContext = {}
  
  const redirect = searchParams.get('redirect')
  if (redirect && isValidRedirectUrl(redirect)) {
    context.redirectUrl = redirect
  }
  
  const competition = searchParams.get('competition')
  if (competition && /^[a-f0-9-]{36}$/.test(competition)) { // UUID format
    context.competitionId = competition
  }
  
  const flow = searchParams.get('flow')
  if (flow && ['login', 'signup', 'reset'].includes(flow)) {
    context.authFlow = flow as 'login' | 'signup' | 'reset'
  }
  
  const state = searchParams.get('state')
  if (state) {
    context.oauthState = state
  }
  
  const error = searchParams.get('error')
  if (error) {
    context.error = error
  }
  
  const errorDescription = searchParams.get('error_description')
  if (errorDescription) {
    context.errorDescription = errorDescription
  }
  
  return context
}

/**
 * Validate competition ID format
 */
export function isValidCompetitionId(id: string | null): boolean {
  if (!id || typeof id !== 'string') {
    return false
  }
  
  // UUID format validation
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}

/**
 * Session storage keys for auth context
 */
export const AUTH_STORAGE_KEYS = {
  REDIRECT_URL: 'auth_redirect_url',
  COMPETITION_ID: 'auth_competition_id',
  AUTH_FLOW: 'auth_flow',
  OAUTH_STATE: 'oauth_state',
  CONTEXT_BACKUP: 'auth_context_backup',
  SESSION_EXPIRY: 'auth_session_expiry',
} as const

/**
 * Store auth context in session storage with expiry
 */
export function storeAuthContext(key: string, value: string, expiryMinutes = 30): void {
  try {
    const expiry = Date.now() + (expiryMinutes * 60 * 1000)
    const data = { value, expiry }
    sessionStorage.setItem(key, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to store auth context:', error)
  }
}

/**
 * Retrieve auth context from session storage with expiry check
 */
export function retrieveAuthContext(key: string): string | null {
  try {
    const stored = sessionStorage.getItem(key)
    if (!stored) return null
    
    const data = JSON.parse(stored)
    if (!data.expiry || Date.now() > data.expiry) {
      sessionStorage.removeItem(key)
      return null
    }
    
    return data.value
  } catch (error) {
    console.warn('Failed to retrieve auth context:', error)
    return null
  }
}

/**
 * Clear expired auth context items
 */
export function clearExpiredAuthContext(): void {
  try {
    Object.values(AUTH_STORAGE_KEYS).forEach(key => {
      const stored = sessionStorage.getItem(key)
      if (!stored) return
      
      try {
        const data = JSON.parse(stored)
        if (data.expiry && Date.now() > data.expiry) {
          sessionStorage.removeItem(key)
        }
      } catch {
        sessionStorage.removeItem(key) // Remove invalid entries
      }
    })
  } catch (error) {
    console.warn('Failed to clear expired auth context:', error)
  }
}

/**
 * Competition entry URL helpers
 */
export function buildCompetitionEntryUrl(
  competitionId: string, 
  requireAuth = true,
  baseUrl = '/competitions'
): string {
  if (!isValidCompetitionId(competitionId)) {
    throw new Error('Invalid competition ID')
  }
  
  const entryUrl = `${baseUrl}/${competitionId}/enter`
  
  if (!requireAuth) {
    return entryUrl
  }
  
  // Build login URL with competition context
  return buildUrl('/auth/login', {
    redirect: entryUrl,
    competition: competitionId,
    flow: 'login'
  })
}

/**
 * Auth flow URL helpers
 */
export function buildAuthFlowUrl(
  flow: 'login' | 'signup' | 'reset',
  redirectUrl?: string,
  competitionId?: string,
  additionalParams: Record<string, string> = {}
): string {
  const params: Record<string, string | undefined> = {
    ...additionalParams
  }
  
  if (redirectUrl && isValidRedirectUrl(redirectUrl)) {
    params.redirect = redirectUrl
  }
  
  if (competitionId && isValidCompetitionId(competitionId)) {
    params.competition = competitionId
  }
  
  return buildUrl(`/auth/${flow}`, params)
}

/**
 * OAuth URL helpers
 */
export function buildOAuthUrl(
  provider: 'google' | 'github' | 'discord',
  redirectUrl?: string,
  competitionId?: string
): { url: string; state: string } {
  const state = generateOAuthState()
  
  const params: Record<string, string | undefined> = {
    state
  }
  
  if (redirectUrl && isValidRedirectUrl(redirectUrl)) {
    params.redirect = redirectUrl
  }
  
  if (competitionId && isValidCompetitionId(competitionId)) {
    params.competition = competitionId
  }
  
  // Store state for validation
  storeAuthContext(AUTH_STORAGE_KEYS.OAUTH_STATE, state, 10) // 10 minutes
  
  return {
    url: buildUrl(`/auth/oauth/${provider}`, params),
    state
  }
}

/**
 * Error handling for auth flows
 */
export function getAuthErrorMessage(error: string | Error): string {
  const errorString = typeof error === 'string' ? error : error.message;
  const errorMessages: Record<string, string> = {
    'invalid_credentials': 'Invalid email or password. Please check your credentials and try again.',
    'email_not_confirmed': 'Please check your email and confirm your account before signing in.',
    'user_already_registered': 'An account with this email already exists. Please sign in instead.',
    'invalid_email': 'Please enter a valid email address.',
    'weak_password': 'Password must be at least 8 characters with uppercase, lowercase, and numbers.',
    'access_denied': 'Access was denied. You chose not to authorize the application.',
    'invalid_request': 'The authentication request was invalid. Please try again.',
    'server_error': 'A server error occurred. Please try again later.',
    'temporarily_unavailable': 'The service is temporarily unavailable. Please try again later.',
    'timeout': 'Request timed out. Please check your connection and try again.',
  }
  
  // Check for exact matches first
  if (errorMessages[errorString]) {
    return errorMessages[errorString]
  }
  
  // Check for partial matches
  const lowerError = errorString.toLowerCase()
  for (const [key, message] of Object.entries(errorMessages)) {
    if (lowerError.includes(key.replace('_', ' '))) {
      return message
    }
  }
  
  // Default message
  return errorString || 'An unexpected error occurred. Please try again.'
}