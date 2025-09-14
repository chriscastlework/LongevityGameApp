/**
 * URL validation utilities for security and deep linking
 */

export interface ValidationResult {
  isValid: boolean
  reason?: string
}

/**
 * Validate redirect URLs for security
 */
export function validateRedirectUrl(url: string): ValidationResult {
  if (!url || typeof url !== 'string') {
    return { isValid: false, reason: 'Empty or invalid URL' }
  }
  
  // Trim and decode URL
  const trimmedUrl = decodeURIComponent(url.trim())
  
  // Must be a relative URL starting with /
  if (!trimmedUrl.startsWith('/')) {
    return { isValid: false, reason: 'Must be a relative URL starting with /' }
  }
  
  // Must not start with // (protocol-relative URLs)
  if (trimmedUrl.startsWith('//')) {
    return { isValid: false, reason: 'Protocol-relative URLs not allowed' }
  }
  
  // Check for malicious patterns
  const maliciousPatterns = [
    /javascript:/i,
    /data:/i,
    /vbscript:/i,
    /blob:/i,
    /<script/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /\.\.\//g,  // Path traversal
    /\/\.\./g,  // Path traversal variants
    /%2e%2e/i,  // Encoded path traversal
    /%2f%2e%2e/i,
    /\\x[0-9a-f]{2}/i, // Hex encoded characters
    /\\u[0-9a-f]{4}/i, // Unicode encoded characters
  ]
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(trimmedUrl)) {
      return { isValid: false, reason: 'Potentially malicious URL detected' }
    }
  }
  
  // Check length (prevent extremely long URLs)
  if (trimmedUrl.length > 2000) {
    return { isValid: false, reason: 'URL too long' }
  }
  
  // Validate path segments
  const pathSegments = trimmedUrl.split('/').filter(Boolean)
  for (const segment of pathSegments) {
    if (segment === '..' || segment === '.') {
      return { isValid: false, reason: 'Invalid path segment' }
    }
  }
  
  return { isValid: true }
}

/**
 * Validate competition slugs
 */
export function validateCompetitionSlug(slug: string): ValidationResult {
  if (!slug || typeof slug !== 'string') {
    return { isValid: false, reason: 'Empty or invalid slug' }
  }
  
  const trimmedSlug = slug.trim()
  
  // Basic format validation
  if (!/^[a-z0-9-]+$/.test(trimmedSlug)) {
    return { isValid: false, reason: 'Slug can only contain lowercase letters, numbers, and hyphens' }
  }
  
  // Length validation
  if (trimmedSlug.length < 3 || trimmedSlug.length > 50) {
    return { isValid: false, reason: 'Slug must be between 3 and 50 characters' }
  }
  
  // Must not start or end with hyphen
  if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
    return { isValid: false, reason: 'Slug cannot start or end with a hyphen' }
  }
  
  // Must not contain consecutive hyphens
  if (trimmedSlug.includes('--')) {
    return { isValid: false, reason: 'Slug cannot contain consecutive hyphens' }
  }
  
  return { isValid: true }
}

/**
 * Validate auth flow types
 */
export function validateAuthFlow(flow: string): ValidationResult {
  const validFlows = ['login', 'signup', 'reset', 'forgot-password']
  
  if (!flow || typeof flow !== 'string') {
    return { isValid: false, reason: 'Empty or invalid flow' }
  }
  
  if (!validFlows.includes(flow.toLowerCase())) {
    return { isValid: false, reason: `Invalid auth flow. Must be one of: ${validFlows.join(', ')}` }
  }
  
  return { isValid: true }
}

/**
 * Validate email addresses
 */
export function validateEmail(email: string): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { isValid: false, reason: 'Empty or invalid email' }
  }
  
  const trimmedEmail = email.trim().toLowerCase()
  
  // Basic email regex (more permissive than RFC 5322 but good for validation)
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  
  if (!emailRegex.test(trimmedEmail)) {
    return { isValid: false, reason: 'Invalid email format' }
  }
  
  // Length validation
  if (trimmedEmail.length > 254) {
    return { isValid: false, reason: 'Email too long' }
  }
  
  return { isValid: true }
}

/**
 * Validate UTM parameters
 */
export function validateUtmParam(param: string, value: string): ValidationResult {
  const validParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
  
  if (!validParams.includes(param)) {
    return { isValid: false, reason: `Invalid UTM parameter: ${param}` }
  }
  
  if (!value || typeof value !== 'string') {
    return { isValid: false, reason: 'Empty or invalid UTM value' }
  }
  
  const trimmedValue = value.trim()
  
  // Length validation
  if (trimmedValue.length > 100) {
    return { isValid: false, reason: 'UTM parameter value too long' }
  }
  
  // Check for malicious patterns
  const maliciousPatterns = [
    /<script/i,
    /javascript:/i,
    /data:/i,
    /<iframe/i
  ]
  
  for (const pattern of maliciousPatterns) {
    if (pattern.test(trimmedValue)) {
      return { isValid: false, reason: 'Potentially malicious UTM value' }
    }
  }
  
  return { isValid: true }
}

/**
 * Sanitize URL parameters
 */
export function sanitizeUrlParam(value: string): string {
  if (!value || typeof value !== 'string') {
    return ''
  }
  
  return value
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, '') // Remove data: protocol
    .substring(0, 100) // Limit length
}

/**
 * Build safe redirect URL
 */
export function buildSafeRedirectUrl(basePath: string, params: Record<string, string>): string {
  const validation = validateRedirectUrl(basePath)
  if (!validation.isValid) {
    throw new Error(`Invalid base path: ${validation.reason}`)
  }
  
  const url = new URL(basePath, 'http://localhost') // Use dummy base for URL construction
  
  Object.entries(params).forEach(([key, value]) => {
    if (value && typeof value === 'string') {
      url.searchParams.set(key, sanitizeUrlParam(value))
    }
  })
  
  return url.pathname + url.search
}

/**
 * Check if URL is safe for client-side navigation
 */
export function isSafeForNavigation(url: string): boolean {
  const validation = validateRedirectUrl(url)
  return validation.isValid
}