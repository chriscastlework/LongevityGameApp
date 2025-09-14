import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit"
import type { DeepLinkData } from "@/lib/services/DeepLinkHandler"

interface DeepLinkState {
  isActive: boolean
  data: DeepLinkData | null
  pendingRedirect: string | null
  redirectAfterAuth: string | null
  campaignData: {
    source?: string
    medium?: string
    campaign?: string
    content?: string
    term?: string
  } | null
  competitionContext: {
    slug?: string
    action?: 'enter' | 'view' | 'results' | 'invite' | 'share'
    inviteToken?: string
  } | null
  socialContext: {
    platform?: string
    shareId?: string
    referrer?: string
  } | null
  isLoading: boolean
  error: string | null
  history: DeepLinkData[]
}

const initialState: DeepLinkState = {
  isActive: false,
  data: null,
  pendingRedirect: null,
  redirectAfterAuth: null,
  campaignData: null,
  competitionContext: null,
  socialContext: null,
  isLoading: false,
  error: null,
  history: []
}

// Async thunk for processing deep link data
export const processDeepLink = createAsyncThunk(
  "deepLink/processDeepLink",
  async (data: DeepLinkData, { rejectWithValue }) => {
    try {
      // Extract campaign information
      const campaignData = {
        source: data.params.utm_source,
        medium: data.params.utm_medium,
        campaign: data.params.utm_campaign,
        content: data.params.utm_content,
        term: data.params.utm_term
      }

      // Extract competition context
      const competitionContext = {
        slug: data.competitionSlug,
        action: data.action,
        inviteToken: data.params.invite || data.params.token
      }

      // Extract social context
      const socialContext = data.source === 'social' ? {
        platform: determineSocialPlatform(data.params, data.originalUrl),
        shareId: data.params.share,
        referrer: data.params.ref
      } : null

      return {
        data,
        campaignData,
        competitionContext,
        socialContext
      }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Async thunk for handling post-authentication redirect
export const handlePostAuthRedirect = createAsyncThunk(
  "deepLink/handlePostAuthRedirect",
  async (userId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { deepLink: DeepLinkState }
      const { redirectAfterAuth, competitionContext } = state.deepLink

      if (redirectAfterAuth) {
        return { redirectUrl: redirectAfterAuth }
      }

      // Generate redirect based on context
      if (competitionContext?.slug && competitionContext.action) {
        const baseUrl = `/competition/${competitionContext.slug}`
        
        switch (competitionContext.action) {
          case 'enter':
            return { redirectUrl: `${baseUrl}/enter` }
          case 'results':
            return { redirectUrl: `${baseUrl}/results` }
          case 'invite':
            return { redirectUrl: `${baseUrl}?invite=${competitionContext.inviteToken}` }
          default:
            return { redirectUrl: baseUrl }
        }
      }

      // Default redirect
      return { redirectUrl: '/competitions' }
    } catch (error: any) {
      return rejectWithValue(error.message)
    }
  }
)

// Helper function to determine social platform
function determineSocialPlatform(params: Record<string, string>, originalUrl: string): string | undefined {
  // Check UTM source first
  if (params.utm_source) {
    const source = params.utm_source.toLowerCase()
    if (['facebook', 'twitter', 'linkedin', 'instagram'].includes(source)) {
      return source
    }
  }

  // Check referrer patterns
  if (originalUrl.includes('facebook.com') || originalUrl.includes('fb.me')) return 'facebook'
  if (originalUrl.includes('twitter.com') || originalUrl.includes('t.co')) return 'twitter'
  if (originalUrl.includes('linkedin.com')) return 'linkedin'
  if (originalUrl.includes('instagram.com')) return 'instagram'

  return undefined
}

const deepLinkSlice = createSlice({
  name: "deepLink",
  initialState,
  reducers: {
    // Set deep link data manually
    setDeepLinkData: (state, action: PayloadAction<DeepLinkData>) => {
      state.isActive = true
      state.data = action.payload
      state.history.unshift(action.payload)
      
      // Keep only last 10 entries
      if (state.history.length > 10) {
        state.history = state.history.slice(0, 10)
      }
    },

    // Set pending redirect URL
    setPendingRedirect: (state, action: PayloadAction<string>) => {
      state.pendingRedirect = action.payload
    },

    // Set post-auth redirect URL
    setRedirectAfterAuth: (state, action: PayloadAction<string>) => {
      state.redirectAfterAuth = action.payload
    },

    // Clear pending redirect
    clearPendingRedirect: (state) => {
      state.pendingRedirect = null
    },

    // Clear post-auth redirect
    clearRedirectAfterAuth: (state) => {
      state.redirectAfterAuth = null
    },

    // Update campaign data
    setCampaignData: (state, action: PayloadAction<DeepLinkState['campaignData']>) => {
      state.campaignData = action.payload
    },

    // Update competition context
    setCompetitionContext: (state, action: PayloadAction<DeepLinkState['competitionContext']>) => {
      state.competitionContext = action.payload
    },

    // Update social context
    setSocialContext: (state, action: PayloadAction<DeepLinkState['socialContext']>) => {
      state.socialContext = action.payload
    },

    // Clear all deep link data
    clearDeepLinkData: (state) => {
      state.isActive = false
      state.data = null
      state.pendingRedirect = null
      state.campaignData = null
      state.competitionContext = null
      state.socialContext = null
      state.error = null
    },

    // Clear error
    clearError: (state) => {
      state.error = null
    },

    // Mark deep link as processed
    markAsProcessed: (state) => {
      state.isActive = false
      state.pendingRedirect = null
    }
  },
  extraReducers: (builder) => {
    builder
      // Process deep link
      .addCase(processDeepLink.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(processDeepLink.fulfilled, (state, action) => {
        state.isLoading = false
        state.isActive = true
        state.data = action.payload.data
        state.campaignData = action.payload.campaignData
        state.competitionContext = action.payload.competitionContext
        state.socialContext = action.payload.socialContext
        state.error = null
        
        // Add to history
        state.history.unshift(action.payload.data)
        if (state.history.length > 10) {
          state.history = state.history.slice(0, 10)
        }
      })
      .addCase(processDeepLink.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
      // Handle post-auth redirect
      .addCase(handlePostAuthRedirect.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(handlePostAuthRedirect.fulfilled, (state, action) => {
        state.isLoading = false
        state.pendingRedirect = action.payload.redirectUrl
        state.error = null
      })
      .addCase(handlePostAuthRedirect.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  }
})

export const {
  setDeepLinkData,
  setPendingRedirect,
  setRedirectAfterAuth,
  clearPendingRedirect,
  clearRedirectAfterAuth,
  setCampaignData,
  setCompetitionContext,
  setSocialContext,
  clearDeepLinkData,
  clearError,
  markAsProcessed
} = deepLinkSlice.actions

export default deepLinkSlice.reducer

// Selectors
export const selectDeepLinkState = (state: { deepLink: DeepLinkState }) => state.deepLink
export const selectIsDeepLinkActive = (state: { deepLink: DeepLinkState }) => state.deepLink.isActive
export const selectDeepLinkData = (state: { deepLink: DeepLinkState }) => state.deepLink.data
export const selectPendingRedirect = (state: { deepLink: DeepLinkState }) => state.deepLink.pendingRedirect
export const selectRedirectAfterAuth = (state: { deepLink: DeepLinkState }) => state.deepLink.redirectAfterAuth
export const selectCampaignData = (state: { deepLink: DeepLinkState }) => state.deepLink.campaignData
export const selectCompetitionContext = (state: { deepLink: DeepLinkState }) => state.deepLink.competitionContext
export const selectSocialContext = (state: { deepLink: DeepLinkState }) => state.deepLink.socialContext
export const selectDeepLinkHistory = (state: { deepLink: DeepLinkState }) => state.deepLink.history