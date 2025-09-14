import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks'
import {
  processDeepLink,
  handlePostAuthRedirect,
  setRedirectAfterAuth,
  clearPendingRedirect,
  markAsProcessed,
  selectDeepLinkState,
  selectIsDeepLinkActive,
  selectPendingRedirect,
  selectRedirectAfterAuth
} from '@/lib/store/slices/deepLinkSlice'
import { DeepLinkHandler, type DeepLinkData } from '@/lib/services/DeepLinkHandler'
import { validateRedirectUrl } from '@/lib/utils/url-validation'

export function useDeepLink() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const deepLinkState = useAppSelector(selectDeepLinkState)
  const isActive = useAppSelector(selectIsDeepLinkActive)
  const pendingRedirect = useAppSelector(selectPendingRedirect)
  const redirectAfterAuth = useAppSelector(selectRedirectAfterAuth)

  // Initialize deep link from browser context
  const initializeDeepLink = useCallback(() => {
    if (typeof window === 'undefined') return

    // Check for deep link context in headers (set by middleware)
    const deepLinkHeader = document.querySelector('meta[name="deep-link-context"]')?.getAttribute('content')
    if (deepLinkHeader) {
      try {
        const contextData = JSON.parse(deepLinkHeader)
        const mockRequest = {
          url: window.location.href,
          headers: new Map(),
          nextUrl: new URL(window.location.href)
        }
        
        const deepLinkHandler = new DeepLinkHandler()
        const deepLinkData = deepLinkHandler.extractDeepLinkData(mockRequest as any)
        
        if (deepLinkData.isDeepLink) {
          dispatch(processDeepLink(deepLinkData))
        }
      } catch (error) {
        console.error('Failed to parse deep link context:', error)
      }
    }

    // Check URL parameters for deep link data
    const urlParams = new URLSearchParams(window.location.search)
    const hasDeepLinkParams = ['utm_source', 'utm_campaign', 'invite', 'share', 'competition', 'ref'].some(param => 
      urlParams.has(param)
    )

    if (hasDeepLinkParams) {
      const mockRequest = {
        url: window.location.href,
        headers: new Map([
          ['referer', document.referrer],
          ['user-agent', navigator.userAgent]
        ]),
        nextUrl: new URL(window.location.href)
      }

      const deepLinkHandler = new DeepLinkHandler()
      const deepLinkData = deepLinkHandler.extractDeepLinkData(mockRequest as any)
      
      if (deepLinkData.isDeepLink) {
        dispatch(processDeepLink(deepLinkData))
      }
    }
  }, [dispatch])

  // Handle pending redirect
  const executePendingRedirect = useCallback(() => {
    if (pendingRedirect) {
      const validation = validateRedirectUrl(pendingRedirect)
      if (validation.isValid) {
        router.push(pendingRedirect)
        dispatch(clearPendingRedirect())
        dispatch(markAsProcessed())
      } else {
        console.warn('Invalid pending redirect URL:', pendingRedirect, validation.reason)
        dispatch(clearPendingRedirect())
      }
    }
  }, [pendingRedirect, router, dispatch])

  // Handle post-authentication redirect
  const handleAuthSuccess = useCallback((userId: string) => {
    if (isActive && deepLinkState.data) {
      dispatch(handlePostAuthRedirect(userId))
    }
  }, [isActive, deepLinkState.data, dispatch])

  // Set redirect after authentication
  const setPostAuthRedirect = useCallback((url: string) => {
    const validation = validateRedirectUrl(url)
    if (validation.isValid) {
      dispatch(setRedirectAfterAuth(url))
    } else {
      console.warn('Invalid post-auth redirect URL:', url, validation.reason)
    }
  }, [dispatch])

  // Generate tracking URL with campaign parameters
  const generateTrackingUrl = useCallback((baseUrl: string, source: string, campaign?: string) => {
    const url = new URL(baseUrl, window.location.origin)
    url.searchParams.set('utm_source', source)
    if (campaign) {
      url.searchParams.set('utm_campaign', campaign)
    }
    url.searchParams.set('utm_medium', 'web')
    return url.toString()
  }, [])

  // Share competition with deep link tracking
  const shareCompetition = useCallback((competitionSlug: string, platform: string) => {
    const shareUrl = generateTrackingUrl(
      `/competition/${competitionSlug}`,
      platform,
      'share_competition'
    )
    
    if (navigator.share) {
      return navigator.share({
        title: 'Check out this competition!',
        url: shareUrl
      })
    } else {
      // Fallback to clipboard
      return navigator.clipboard.writeText(shareUrl)
    }
  }, [generateTrackingUrl])

  // Generate invite link
  const generateInviteLink = useCallback((competitionSlug: string, inviteToken: string) => {
    const inviteUrl = new URL(`/competition/${competitionSlug}`, window.location.origin)
    inviteUrl.searchParams.set('invite', inviteToken)
    inviteUrl.searchParams.set('utm_source', 'invite')
    inviteUrl.searchParams.set('utm_campaign', 'competition_invite')
    return inviteUrl.toString()
  }, [])

  return {
    // State
    deepLinkState,
    isActive,
    pendingRedirect,
    redirectAfterAuth,

    // Actions
    initializeDeepLink,
    executePendingRedirect,
    handleAuthSuccess,
    setPostAuthRedirect,
    
    // Utilities
    generateTrackingUrl,
    shareCompetition,
    generateInviteLink
  }
}

// Hook for auth components to handle deep link redirects
export function useAuthRedirect() {
  const { pendingRedirect, redirectAfterAuth, executePendingRedirect } = useDeepLink()
  const router = useRouter()

  const redirectAfterLogin = useCallback((fallback: string = '/competitions') => {
    if (redirectAfterAuth) {
      const validation = validateRedirectUrl(redirectAfterAuth)
      if (validation.isValid) {
        router.push(redirectAfterAuth)
        return
      }
    }
    
    if (pendingRedirect) {
      executePendingRedirect()
      return
    }
    
    router.push(fallback)
  }, [redirectAfterAuth, pendingRedirect, executePendingRedirect, router])

  return {
    redirectAfterLogin,
    hasPendingRedirect: Boolean(pendingRedirect || redirectAfterAuth)
  }
}