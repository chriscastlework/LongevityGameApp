"use client"

import React, { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createBrowserClient } from "@/lib/supabase/client"
import { useDeepLink } from "./deep-link-provider"
import { useAuthContext } from "@/components/providers/auth-provider"
import { Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type CallbackState = 'loading' | 'success' | 'error' | 'invalid_state' | 'access_denied'

interface OAuthCallbackHandlerProps {
  provider?: 'google' | 'github' | 'discord' // Add more as needed
  className?: string
}

export function OAuthCallbackHandler({ 
  provider = 'google',
  className 
}: OAuthCallbackHandlerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { refreshUser } = useAuthContext()
  const {
    getRedirectUrl,
    getCompetitionId,
    validateOAuthState,
    clearRedirectUrl,
    clearCompetitionId,
    restoreContext
  } = useDeepLink()

  const [state, setState] = useState<CallbackState>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isRedirecting, setIsRedirecting] = useState(false)

  const handleSuccessRedirect = useCallback(() => {
    setIsRedirecting(true)
    
    // Try to restore context first
    restoreContext()
    
    const redirectUrl = getRedirectUrl()
    const competitionId = getCompetitionId()
    
    // Clear stored context
    clearRedirectUrl()
    clearCompetitionId()
    
    // Determine redirect destination
    let destination = "/competitions"
    
    if (redirectUrl && redirectUrl.startsWith('/')) {
      destination = redirectUrl
    } else if (competitionId) {
      destination = `/competitions/${competitionId}`
    }
    
    console.log('OAuth success, redirecting to:', destination)
    router.replace(destination)
  }, [router, restoreContext, getRedirectUrl, getCompetitionId, clearRedirectUrl, clearCompetitionId])

  const handleOAuthCallback = useCallback(async () => {
    try {
      const supabase = createBrowserClient()
      
      // Get URL parameters
      const code = searchParams.get('code')
      const error = searchParams.get('error')
      const errorDescription = searchParams.get('error_description')
      const state = searchParams.get('state')

      console.log('OAuth callback params:', { 
        code: !!code, 
        error, 
        errorDescription, 
        state: !!state,
        provider 
      })

      // Handle access denied
      if (error === 'access_denied') {
        setState('access_denied')
        setErrorMessage('Access was denied. You chose not to authorize the application.')
        return
      }

      // Handle other OAuth errors
      if (error) {
        setState('error')
        setErrorMessage(errorDescription || error || 'OAuth authentication failed')
        return
      }

      // Validate OAuth state parameter for CSRF protection
      if (state && !validateOAuthState(state)) {
        console.error('OAuth state validation failed')
        setState('invalid_state')
        setErrorMessage('Invalid authentication state. This may be a security issue.')
        return
      }

      // Handle the OAuth code exchange
      if (code) {
        const { data, error: authError } = await supabase.auth.exchangeCodeForSession(code)
        
        if (authError) {
          console.error('Code exchange failed:', authError)
          setState('error')
          setErrorMessage(authError.message || 'Failed to complete authentication')
          return
        }

        if (data.user) {
          console.log('OAuth authentication successful:', { 
            userId: data.user.id, 
            email: data.user.email,
            provider 
          })

          // Try to get user profile
          try {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single()
            
            // Update Redux store
            await refreshUser()
            
            setState('success')
            
            // Redirect after a short delay
            setTimeout(() => handleSuccessRedirect(), 1500)
            
          } catch (profileError) {
            console.error('Failed to fetch user profile:', profileError)
            // Still set user even if profile fetch fails
            await refreshUser()
            setState('success')
            setTimeout(() => handleSuccessRedirect(), 1500)
          }
        } else {
          setState('error')
          setErrorMessage('Authentication succeeded but no user was returned')
        }
      } else {
        setState('error')
        setErrorMessage('No authorization code received from OAuth provider')
      }
    } catch (error) {
      console.error('OAuth callback handling failed:', error)
      setState('error')
      setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred')
    }
  }, [searchParams, provider, validateOAuthState, refreshUser, handleSuccessRedirect])

  useEffect(() => {
    handleOAuthCallback()
  }, [handleOAuthCallback])


  const handleRetry = () => {
    // Redirect to login page with current context
    const redirectUrl = getRedirectUrl()
    const competitionId = getCompetitionId()
    
    const params = new URLSearchParams()
    if (redirectUrl) params.set('redirect', redirectUrl)
    if (competitionId) params.set('competition', competitionId)
    
    const loginUrl = params.toString() ? `/auth/login?${params.toString()}` : '/auth/login'
    router.push(loginUrl)
  }

  const getStateIcon = () => {
    switch (state) {
      case 'loading':
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
      case 'invalid_state':
      case 'access_denied':
        return <AlertCircle className="h-8 w-8 text-destructive" />
      default:
        return <Loader2 className="h-8 w-8 animate-spin text-primary" />
    }
  }

  const getStateTitle = () => {
    switch (state) {
      case 'loading':
        return 'Completing sign in...'
      case 'success':
        return 'Sign in successful!'
      case 'access_denied':
        return 'Access denied'
      case 'invalid_state':
        return 'Security error'
      case 'error':
        return 'Sign in failed'
      default:
        return 'Processing...'
    }
  }

  const getStateDescription = () => {
    switch (state) {
      case 'loading':
        return 'Please wait while we complete your authentication...'
      case 'success':
        return isRedirecting 
          ? 'Redirecting you to your destination...'
          : 'You have been successfully signed in.'
      case 'access_denied':
        return 'You chose not to authorize the application. You can try signing in again or use a different method.'
      case 'invalid_state':
        return 'The authentication request appears to be invalid. This could be a security issue.'
      case 'error':
        return errorMessage || 'An error occurred during authentication.'
      default:
        return 'Processing your authentication request...'
    }
  }

  return (
    <div className={className}>
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Icon and Status */}
          <div className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 flex items-center justify-center rounded-full bg-muted">
              {getStateIcon()}
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">
                {getStateTitle()}
              </h1>
              <p className="text-muted-foreground">
                {getStateDescription()}
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {(state === 'error' || state === 'invalid_state') && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errorMessage || 'An error occurred during authentication'}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {state === 'access_denied' && (
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/competitions')}
                className="w-full"
              >
                Continue as Guest
              </Button>
            </div>
          )}

          {(state === 'error' || state === 'invalid_state') && (
            <div className="space-y-2">
              <Button onClick={handleRetry} className="w-full">
                Back to Sign In
              </Button>
              <Button 
                variant="outline" 
                onClick={() => router.push('/competitions')}
                className="w-full"
              >
                Continue as Guest
              </Button>
            </div>
          )}

          {/* Loading indicator for redirecting */}
          {(state === 'success' && isRedirecting) && (
            <div className="text-center">
              <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                Redirecting...
              </p>
            </div>
          )}

          {/* Provider info */}
          <div className="text-center text-xs text-muted-foreground">
            Authentication via {provider.charAt(0).toUpperCase() + provider.slice(1)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Specific provider components for convenience
export function GoogleCallbackHandler(props: Omit<OAuthCallbackHandlerProps, 'provider'>) {
  return <OAuthCallbackHandler {...props} provider="google" />
}

export function GitHubCallbackHandler(props: Omit<OAuthCallbackHandlerProps, 'provider'>) {
  return <OAuthCallbackHandler {...props} provider="github" />
}

export function DiscordCallbackHandler(props: Omit<OAuthCallbackHandlerProps, 'provider'>) {
  return <OAuthCallbackHandler {...props} provider="discord" />
}