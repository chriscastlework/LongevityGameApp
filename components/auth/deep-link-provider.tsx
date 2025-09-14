"use client"

import React, { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

interface DeepLinkContextType {
  // URL parameter management
  getRedirectUrl: () => string | null
  setRedirectUrl: (url: string) => void
  clearRedirectUrl: () => void
  
  // Competition entry context
  getCompetitionId: () => string | null
  setCompetitionId: (id: string) => void
  clearCompetitionId: () => void
  
  // Auth flow state
  getAuthFlow: () => 'login' | 'signup' | 'reset' | null
  setAuthFlow: (flow: 'login' | 'signup' | 'reset') => void
  clearAuthFlow: () => void
  
  // OAuth state management
  getOAuthState: () => string | null
  setOAuthState: (state: string) => void
  validateOAuthState: (state: string) => boolean
  
  // Deep link construction
  buildAuthUrl: (flow: 'login' | 'signup' | 'reset', params?: Record<string, string>) => string
  buildCompetitionEntryUrl: (competitionId: string, requireAuth?: boolean) => string
  
  // Session management
  preserveContext: () => void
  restoreContext: () => void
}

const DeepLinkContext = createContext<DeepLinkContextType | undefined>(undefined)

interface DeepLinkProviderProps {
  children: React.ReactNode
}

const STORAGE_KEYS = {
  REDIRECT_URL: 'auth_redirect_url',
  COMPETITION_ID: 'auth_competition_id', 
  AUTH_FLOW: 'auth_flow',
  OAUTH_STATE: 'oauth_state',
  CONTEXT_BACKUP: 'auth_context_backup'
} as const

export function DeepLinkProvider({ children }: DeepLinkProviderProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  
  const [redirectUrl, setRedirectUrlState] = useState<string | null>(null)
  const [competitionId, setCompetitionIdState] = useState<string | null>(null)
  const [authFlow, setAuthFlowState] = useState<'login' | 'signup' | 'reset' | null>(null)
  const [oauthState, setOAuthStateState] = useState<string | null>(null)

  // Initialize context from URL parameters and localStorage
  useEffect(() => {
    // Extract parameters from current URL
    const urlRedirect = searchParams.get('redirect')
    const urlCompetition = searchParams.get('competition')
    const urlFlow = searchParams.get('flow') as 'login' | 'signup' | 'reset' | null
    const urlOAuthState = searchParams.get('state')
    
    // Restore from localStorage if not in URL
    const storedRedirect = urlRedirect || localStorage.getItem(STORAGE_KEYS.REDIRECT_URL)
    const storedCompetition = urlCompetition || localStorage.getItem(STORAGE_KEYS.COMPETITION_ID)
    const storedFlow = urlFlow || localStorage.getItem(STORAGE_KEYS.AUTH_FLOW) as typeof authFlow
    const storedOAuthState = urlOAuthState || localStorage.getItem(STORAGE_KEYS.OAUTH_STATE)
    
    if (storedRedirect && storedRedirect.startsWith('/')) {
      setRedirectUrlState(storedRedirect)
      localStorage.setItem(STORAGE_KEYS.REDIRECT_URL, storedRedirect)
    }
    
    if (storedCompetition) {
      setCompetitionIdState(storedCompetition)
      localStorage.setItem(STORAGE_KEYS.COMPETITION_ID, storedCompetition)
    }
    
    if (storedFlow && ['login', 'signup', 'reset'].includes(storedFlow)) {
      setAuthFlowState(storedFlow)
      localStorage.setItem(STORAGE_KEYS.AUTH_FLOW, storedFlow)
    }
    
    if (storedOAuthState) {
      setOAuthStateState(storedOAuthState)
      localStorage.setItem(STORAGE_KEYS.OAUTH_STATE, storedOAuthState)
    }
  }, [searchParams])

  const getRedirectUrl = useCallback(() => redirectUrl, [redirectUrl])
  
  const setRedirectUrl = useCallback((url: string) => {
    if (url.startsWith('/') && !url.startsWith('//')) {
      setRedirectUrlState(url)
      localStorage.setItem(STORAGE_KEYS.REDIRECT_URL, url)
    }
  }, [])
  
  const clearRedirectUrl = useCallback(() => {
    setRedirectUrlState(null)
    localStorage.removeItem(STORAGE_KEYS.REDIRECT_URL)
  }, [])

  const getCompetitionId = useCallback(() => competitionId, [competitionId])
  
  const setCompetitionId = useCallback((id: string) => {
    setCompetitionIdState(id)
    localStorage.setItem(STORAGE_KEYS.COMPETITION_ID, id)
  }, [])
  
  const clearCompetitionId = useCallback(() => {
    setCompetitionIdState(null)
    localStorage.removeItem(STORAGE_KEYS.COMPETITION_ID)
  }, [])

  const getAuthFlow = useCallback(() => authFlow, [authFlow])
  
  const setAuthFlow = useCallback((flow: 'login' | 'signup' | 'reset') => {
    setAuthFlowState(flow)
    localStorage.setItem(STORAGE_KEYS.AUTH_FLOW, flow)
  }, [])
  
  const clearAuthFlow = useCallback(() => {
    setAuthFlowState(null)
    localStorage.removeItem(STORAGE_KEYS.AUTH_FLOW)
  }, [])

  const getOAuthState = useCallback(() => oauthState, [oauthState])
  
  const setOAuthState = useCallback((state: string) => {
    setOAuthStateState(state)
    localStorage.setItem(STORAGE_KEYS.OAUTH_STATE, state)
  }, [])
  
  const validateOAuthState = useCallback((state: string) => {
    const storedState = localStorage.getItem(STORAGE_KEYS.OAUTH_STATE)
    return storedState === state
  }, [])

  const buildAuthUrl = useCallback((
    flow: 'login' | 'signup' | 'reset', 
    params: Record<string, string> = {}
  ) => {
    const baseUrl = `/auth/${flow}`
    const urlParams = new URLSearchParams()
    
    // Add current context
    if (redirectUrl) urlParams.set('redirect', redirectUrl)
    if (competitionId) urlParams.set('competition', competitionId)
    
    // Add additional params
    Object.entries(params).forEach(([key, value]) => {
      urlParams.set(key, value)
    })
    
    const queryString = urlParams.toString()
    return queryString ? `${baseUrl}?${queryString}` : baseUrl
  }, [redirectUrl, competitionId])
  
  const buildCompetitionEntryUrl = useCallback((
    competitionId: string, 
    requireAuth = true
  ) => {
    const baseUrl = `/competitions/${competitionId}/enter`
    
    if (!requireAuth) {
      return baseUrl
    }
    
    // If auth required, build login URL with competition context
    const urlParams = new URLSearchParams()
    urlParams.set('redirect', baseUrl)
    urlParams.set('competition', competitionId)
    urlParams.set('flow', 'login')
    
    return `/auth/login?${urlParams.toString()}`
  }, [])

  const preserveContext = useCallback(() => {
    const context = {
      redirectUrl,
      competitionId,
      authFlow,
      oauthState,
      pathname,
      timestamp: Date.now()
    }
    localStorage.setItem(STORAGE_KEYS.CONTEXT_BACKUP, JSON.stringify(context))
  }, [redirectUrl, competitionId, authFlow, oauthState, pathname])
  
  const restoreContext = useCallback(() => {
    try {
      const backup = localStorage.getItem(STORAGE_KEYS.CONTEXT_BACKUP)
      if (!backup) return
      
      const context = JSON.parse(backup)
      const isRecent = Date.now() - context.timestamp < 30 * 60 * 1000 // 30 minutes
      
      if (isRecent) {
        if (context.redirectUrl) setRedirectUrl(context.redirectUrl)
        if (context.competitionId) setCompetitionId(context.competitionId)
        if (context.authFlow) setAuthFlow(context.authFlow)
        if (context.oauthState) setOAuthState(context.oauthState)
      }
      
      localStorage.removeItem(STORAGE_KEYS.CONTEXT_BACKUP)
    } catch (error) {
      console.warn('Failed to restore auth context:', error)
    }
  }, [setRedirectUrl, setCompetitionId, setAuthFlow, setOAuthState])

  const value: DeepLinkContextType = {
    getRedirectUrl,
    setRedirectUrl,
    clearRedirectUrl,
    getCompetitionId,
    setCompetitionId,
    clearCompetitionId,
    getAuthFlow,
    setAuthFlow,
    clearAuthFlow,
    getOAuthState,
    setOAuthState,
    validateOAuthState,
    buildAuthUrl,
    buildCompetitionEntryUrl,
    preserveContext,
    restoreContext
  }

  return (
    <DeepLinkContext.Provider value={value}>
      {children}
    </DeepLinkContext.Provider>
  )
}

export function useDeepLink() {
  const context = useContext(DeepLinkContext)
  if (context === undefined) {
    throw new Error('useDeepLink must be used within a DeepLinkProvider')
  }
  return context
}