"use client"

/**
 * Custom React hooks for authentication and deep link handling
 */

import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useAuthContext } from "@/components/providers/auth-provider"
import { useLoginMutation, useSignupMutation } from "./useAuth"
import { createBrowserClient } from "@/lib/supabase/client"
import { useQueryClient } from "@tanstack/react-query"
import {
  isValidRedirectUrl,
  isValidCompetitionId,
  buildAuthFlowUrl,
  extractAuthContext,
  getAuthErrorMessage,
  type AuthUrlContext
} from "./deep-link-utils"

/**
 * Hook for managing authentication deep links
 */
export function useAuthDeepLink() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [context, setContext] = useState<AuthUrlContext>({})

  useEffect(() => {
    const newContext = extractAuthContext(searchParams)
    setContext(newContext)
  }, [searchParams])

  const navigateWithContext = useCallback((
    path: string, 
    additionalParams: Record<string, string> = {}
  ) => {
    const params = new URLSearchParams()
    
    // Preserve current context
    if (context.redirectUrl) params.set('redirect', context.redirectUrl)
    if (context.competitionId) params.set('competition', context.competitionId)
    
    // Add additional params
    Object.entries(additionalParams).forEach(([key, value]) => {
      params.set(key, value)
    })
    
    const queryString = params.toString()
    const fullPath = queryString ? `${path}?${queryString}` : path
    
    router.push(fullPath)
  }, [router, context])

  const getRedirectDestination = useCallback(() => {
    if (context.redirectUrl && isValidRedirectUrl(context.redirectUrl)) {
      return context.redirectUrl
    }
    if (context.competitionId && isValidCompetitionId(context.competitionId)) {
      return `/competitions/${context.competitionId}`
    }
    return '/competitions'
  }, [context])

  return {
    context,
    navigateWithContext,
    getRedirectDestination,
    hasRedirect: !!(context.redirectUrl || context.competitionId),
    hasCompetition: !!context.competitionId,
    hasError: !!(context.error || context.errorDescription)
  }
}

/**
 * Hook for enhanced login functionality
 */
export function useEnhancedLogin() {
  const { isAuthenticated } = useAuthContext()
  const loginMutation = useLoginMutation()
  const { getRedirectDestination } = useAuthDeepLink()
  const router = useRouter()

  const [isSubmitting, setIsSubmitting] = useState(false)

  const login = useCallback(async (email: string, password: string) => {
    setIsSubmitting(true)
    
    try {
      await loginMutation.mutateAsync({ 
        email: email.toLowerCase().trim(), 
        password 
      })
      
      return { success: true }
    } catch (error: any) {
      return { 
        success: false, 
        error: getAuthErrorMessage(error) 
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [loginMutation])

  const handleLoginSuccess = useCallback(() => {
    const destination = getRedirectDestination()
    router.replace(destination)
  }, [getRedirectDestination, router])

  useEffect(() => {
    if (isAuthenticated && !isSubmitting) {
      handleLoginSuccess()
    }
  }, [isAuthenticated, isSubmitting, handleLoginSuccess])

  return {
    login,
    isLoading: loginMutation.isPending || isSubmitting,
    error: loginMutation.error ? getAuthErrorMessage(loginMutation.error) : null,
    isAuthenticated
  }
}

/**
 * Hook for enhanced signup functionality
 */
export function useEnhancedSignup() {
  const signupMutation = useSignupMutation()
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const signup = useCallback(async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string
  ) => {
    setIsSubmitting(true)
    
    try {
      await signupMutation.mutateAsync({
        email: email.toLowerCase().trim(),
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim()
      })
      
      setIsSuccess(true)
      return { success: true }
    } catch (error: any) {
      return { 
        success: false, 
        error: getAuthErrorMessage(error) 
      }
    } finally {
      setIsSubmitting(false)
    }
  }, [signupMutation])

  return {
    signup,
    isLoading: signupMutation.isPending || isSubmitting,
    error: signupMutation.error ? getAuthErrorMessage(signupMutation.error) : null,
    isSuccess
  }
}

/**
 * Hook for password reset functionality
 */
export function usePasswordReset() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmailSent, setIsEmailSent] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const sendResetEmail = useCallback(async (email: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const supabase = createBrowserClient()
      const redirectUrl = `${window.location.origin}/auth/reset`
      
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim(), {
        redirectTo: redirectUrl,
      })

      if (error) {
        throw error
      }

      setIsEmailSent(true)
      return { success: true }
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.message)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  const resetPassword = useCallback(async (newPassword: string) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const supabase = createBrowserClient()
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (error) {
        throw error
      }

      setIsSuccess(true)
      return { success: true }
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.message)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [])

  return {
    sendResetEmail,
    resetPassword,
    isLoading,
    error,
    isEmailSent,
    isSuccess
  }
}

/**
 * Hook for OAuth authentication
 */
export function useOAuthAuth() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { context } = useAuthDeepLink()

  const signInWithOAuth = useCallback(async (
    provider: 'google' | 'github' | 'discord'
  ) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const supabase = createBrowserClient()
      
      // Build redirect URL with context
      const params = new URLSearchParams()
      if (context.redirectUrl) params.set('redirect', context.redirectUrl)
      if (context.competitionId) params.set('competition', context.competitionId)
      
      const redirectTo = `${window.location.origin}/auth/callback/${provider}${
        params.toString() ? `?${params.toString()}` : ''
      }`

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo
        }
      })

      if (error) {
        throw error
      }

      return { success: true }
    } catch (error: any) {
      const errorMessage = getAuthErrorMessage(error.message)
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [context])

  return {
    signInWithOAuth,
    isLoading,
    error
  }
}

/**
 * Hook for competition-specific authentication
 */
export function useCompetitionAuth(competitionId?: string) {
  const { isAuthenticated, user } = useAuthContext()
  const [hasEntry, setHasEntry] = useState<boolean | null>(null)
  const [isCheckingEntry, setIsCheckingEntry] = useState(false)

  const checkCompetitionEntry = useCallback(async () => {
    if (!competitionId || !user?.id) {
      setHasEntry(null)
      return
    }

    setIsCheckingEntry(true)
    
    try {
      const supabase = createBrowserClient()
      
      const { data, error } = await supabase
        .from('competition_entries')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error
      }

      setHasEntry(!!data)
    } catch (error) {
      console.error('Failed to check competition entry:', error)
      setHasEntry(null)
    } finally {
      setIsCheckingEntry(false)
    }
  }, [competitionId, user?.id])

  useEffect(() => {
    checkCompetitionEntry()
  }, [checkCompetitionEntry])

  const getAuthRequiredMessage = useCallback(() => {
    if (!competitionId) {
      return "Authentication required to access this feature."
    }
    return "You need to sign in to join this competition."
  }, [competitionId])

  const buildAuthUrl = useCallback((flow: 'login' | 'signup' = 'login') => {
    const currentPath = window.location.pathname
    return buildAuthFlowUrl(flow, currentPath, competitionId)
  }, [competitionId])

  return {
    isAuthenticated,
    user,
    hasEntry,
    isCheckingEntry,
    canEnter: isAuthenticated && hasEntry === false,
    alreadyEntered: isAuthenticated && hasEntry === true,
    getAuthRequiredMessage,
    buildAuthUrl,
    refreshEntry: checkCompetitionEntry
  }
}

/**
 * Hook for logout functionality with cleanup
 */
export function useLogout() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)

  const logout = useCallback(async (redirectTo = '/auth/login') => {
    console.log("Logout function called with redirect:", redirectTo)
    setIsLoading(true)

    try {
      console.log("Starting logout process...")
      const supabase = createBrowserClient()
      const result = await supabase.auth.signOut()
      console.log("Supabase signOut result:", result)

      // Clear React Query cache
      console.log("Clearing React Query cache...")
      queryClient.clear()

      // Specifically invalidate auth queries
      queryClient.invalidateQueries({ queryKey: ["auth"] })

      // Clear any stored auth context
      console.log("Clearing stored auth context...")
      Object.values(['auth_redirect_url', 'auth_competition_id', 'auth_flow', 'oauth_state', 'auth_context_backup']).forEach(key => {
        try {
          localStorage.removeItem(key)
          sessionStorage.removeItem(key)
        } catch (error) {
          console.warn(`Failed to clear ${key}:`, error)
        }
      })

      console.log("Redirecting to:", redirectTo)

      // Force a hard redirect to ensure complete logout
      if (typeof window !== 'undefined') {
        window.location.href = redirectTo
      } else {
        router.push(redirectTo)
      }
    } catch (error) {
      console.error('Logout failed:', error)
    } finally {
      setIsLoading(false)
      console.log("Logout process completed")
    }
  }, [router, queryClient])

  return {
    logout,
    isLoading
  }
}