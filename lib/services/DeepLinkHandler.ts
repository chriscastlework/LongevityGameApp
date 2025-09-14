import { NextRequest } from 'next/server'

export interface DeepLinkData {
  isDeepLink: boolean
  source: 'web' | 'mobile' | 'email' | 'social' | 'direct'
  originalUrl: string
  params: Record<string, string>
  competitionSlug?: string
  action?: 'enter' | 'view' | 'results' | 'invite' | 'share'
  timestamp: number
  userAgent?: string
  referrer?: string
}

export interface DeepLinkRouteResult {
  shouldRedirect: boolean
  path: string
  searchParams?: URLSearchParams
}

export class DeepLinkHandler {
  private static readonly COMPETITION_URL_PATTERNS = [
    /^\/competition\/([^\/]+)$/,           // /competition/slug
    /^\/competition\/([^\/]+)\/enter$/,    // /competition/slug/enter  
    /^\/competition\/([^\/]+)\/results$/,  // /competition/slug/results
    /^\/competitions\/([^\/]+)$/,          // /competitions/slug
    /^\/competitions\/([^\/]+)\/enter$/,   // /competitions/slug/enter
    /^\/competitions\/([^\/]+)\/results$/, // /competitions/slug/results
    /^\/c\/([^\/]+)$/                      // /c/slug (short URL)
  ]

  private static readonly AUTH_URL_PATTERNS = [
    /^\/auth\/login/,
    /^\/auth\/signup/,
    /^\/auth\/reset-password/,
    /^\/auth\/forgot-password/
  ]

  /**
   * Extract deep link data from NextRequest
   */
  extractDeepLinkData(request: NextRequest): DeepLinkData {
    const url = request.nextUrl
    const pathname = url.pathname
    const searchParams = Object.fromEntries(url.searchParams.entries())
    const originalUrl = url.toString()
    
    // Determine if this is a deep link
    const isDeepLink = this.isDeepLinkUrl(pathname, searchParams)
    
    // Extract competition context
    const competitionContext = this.extractCompetitionContext(pathname)
    
    // Determine source
    const source = this.determineSource(request, searchParams)
    
    return {
      isDeepLink,
      source,
      originalUrl,
      params: searchParams,
      competitionSlug: competitionContext?.slug,
      action: competitionContext?.action,
      timestamp: Date.now(),
      userAgent: request.headers.get('user-agent') || undefined,
      referrer: request.headers.get('referer') || undefined
    }
  }

  /**
   * Handle deep link routing logic
   */
  handleDeepLinkRouting(data: DeepLinkData, request: NextRequest): DeepLinkRouteResult {
    const url = request.nextUrl
    const pathname = url.pathname
    
    // Don't redirect if already on an auth page
    if (DeepLinkHandler.AUTH_URL_PATTERNS.some(pattern => pattern.test(pathname))) {
      return { shouldRedirect: false, path: pathname }
    }
    
    // Handle competition URLs
    if (data.competitionSlug) {
      return this.handleCompetitionRouting(data, pathname)
    }
    
    // Handle social/campaign links that need auth
    if (data.source === 'social' || data.source === 'email') {
      return this.handleSocialCampaignRouting(data, pathname)
    }
    
    // No special routing needed
    return { shouldRedirect: false, path: pathname }
  }

  /**
   * Check if URL represents a deep link
   */
  private isDeepLinkUrl(pathname: string, searchParams: Record<string, string>): boolean {
    // Competition URLs are deep links
    if (DeepLinkHandler.COMPETITION_URL_PATTERNS.some(pattern => pattern.test(pathname))) {
      return true
    }
    
    // URLs with campaign parameters are deep links
    if (this.hasCampaignParams(searchParams)) {
      return true
    }
    
    // URLs with invite/share tokens are deep links
    if (searchParams.invite || searchParams.share || searchParams.token) {
      return true
    }
    
    // URLs with redirect parameters are deep links
    if (searchParams.redirect) {
      return true
    }
    
    return false
  }

  /**
   * Extract competition context from pathname
   */
  private extractCompetitionContext(pathname: string): { slug: string; action?: 'enter' | 'view' | 'results' } | null {
    for (const pattern of DeepLinkHandler.COMPETITION_URL_PATTERNS) {
      const match = pathname.match(pattern)
      if (match) {
        const slug = match[1]
        
        // Determine action based on path
        if (pathname.includes('/enter')) {
          return { slug, action: 'enter' }
        } else if (pathname.includes('/results')) {
          return { slug, action: 'results' }
        } else {
          return { slug, action: 'view' }
        }
      }
    }
    
    return null
  }

  /**
   * Determine the source of the deep link
   */
  private determineSource(request: NextRequest, searchParams: Record<string, string>): DeepLinkData['source'] {
    const userAgent = request.headers.get('user-agent') || ''
    const referrer = request.headers.get('referer') || ''
    
    // Check UTM source first
    if (searchParams.utm_source) {
      const source = searchParams.utm_source.toLowerCase()
      if (['facebook', 'twitter', 'linkedin', 'instagram', 'tiktok'].includes(source)) {
        return 'social'
      }
      if (source === 'email' || source === 'newsletter') {
        return 'email'
      }
    }
    
    // Check referrer patterns
    if (referrer.includes('facebook.com') || referrer.includes('fb.me')) return 'social'
    if (referrer.includes('twitter.com') || referrer.includes('t.co')) return 'social'
    if (referrer.includes('linkedin.com')) return 'social'
    if (referrer.includes('instagram.com')) return 'social'
    if (referrer.includes('tiktok.com')) return 'social'
    if (referrer.includes('youtube.com')) return 'social'
    
    // Check for mobile app
    if (userAgent.includes('Mobile') && !referrer) {
      return 'mobile'
    }
    
    // Default to web
    return 'web'
  }

  /**
   * Check if URL has campaign tracking parameters
   */
  private hasCampaignParams(searchParams: Record<string, string>): boolean {
    const campaignParams = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'gclid', 'msclkid', 'twclid'
    ]
    
    return campaignParams.some(param => searchParams[param])
  }

  /**
   * Handle routing for competition deep links
   */
  private handleCompetitionRouting(data: DeepLinkData, currentPath: string): DeepLinkRouteResult {
    if (!data.competitionSlug) {
      return { shouldRedirect: false, path: currentPath }
    }

    const targetPath = `/competition/${data.competitionSlug}`
    const searchParams = new URLSearchParams()
    
    // Add action-specific routing
    let finalPath = targetPath
    if (data.action === 'enter') {
      finalPath = `${targetPath}/enter`
    } else if (data.action === 'results') {
      finalPath = `${targetPath}/results`
    }
    
    // Preserve important parameters
    if (data.params.invite) {
      searchParams.set('invite', data.params.invite)
    }
    if (data.params.share) {
      searchParams.set('share', data.params.share)
    }
    if (data.params.ref) {
      searchParams.set('ref', data.params.ref)
    }
    
    // Add campaign tracking
    const campaignParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    campaignParams.forEach(param => {
      if (data.params[param]) {
        searchParams.set(param, data.params[param])
      }
    })
    
    return {
      shouldRedirect: currentPath !== finalPath,
      path: finalPath,
      searchParams: searchParams.toString() ? searchParams : undefined
    }
  }

  /**
   * Handle routing for social/campaign deep links
   */
  private handleSocialCampaignRouting(data: DeepLinkData, currentPath: string): DeepLinkRouteResult {
    // For social links, we might want to redirect to a landing page
    // or preserve the campaign context for analytics
    
    // If already on a good path, just preserve context
    if (currentPath.startsWith('/competitions') || currentPath.startsWith('/auth')) {
      return { shouldRedirect: false, path: currentPath }
    }
    
    // Redirect to competitions list with campaign context
    const searchParams = new URLSearchParams()
    
    // Preserve campaign parameters
    const campaignParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
    campaignParams.forEach(param => {
      if (data.params[param]) {
        searchParams.set(param, data.params[param])
      }
    })
    
    return {
      shouldRedirect: currentPath !== '/competitions',
      path: '/competitions',
      searchParams: searchParams.toString() ? searchParams : undefined
    }
  }

  /**
   * Generate auth URL with deep link context preserved
   */
  generateAuthUrl(
    flow: 'login' | 'signup' | 'reset',
    competitionSlug?: string,
    redirectUrl?: string,
    additionalParams?: Record<string, string>
  ): string {
    const baseUrl = `/auth/${flow}`
    const searchParams = new URLSearchParams()
    
    if (redirectUrl) {
      searchParams.set('redirect', redirectUrl)
    }
    
    if (competitionSlug) {
      searchParams.set('competition', competitionSlug)
    }
    
    // Add any additional parameters
    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        searchParams.set(key, value)
      })
    }
    
    const queryString = searchParams.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }

  /**
   * Validate redirect URL for security
   */
  validateRedirectUrl(url: string): { isValid: boolean; reason?: string } {
    if (!url) {
      return { isValid: false, reason: 'Empty URL' }
    }
    
    // Must start with / and not with //
    if (!url.startsWith('/') || url.startsWith('//')) {
      return { isValid: false, reason: 'Invalid URL format' }
    }
    
    // Check for common malicious patterns
    const maliciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /\.\.\//g
    ]
    
    for (const pattern of maliciousPatterns) {
      if (pattern.test(url)) {
        return { isValid: false, reason: 'Potentially malicious URL' }
      }
    }
    
    return { isValid: true }
  }
}