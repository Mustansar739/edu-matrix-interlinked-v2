/**
 * =============================================================================
 * CURRENT USER PROFILE HOOK - useCurrentUserProfile
 * =============================================================================
 * 
 * PURPOSE:
 * Production-ready hook for fetching current authenticated user's profile data.
 * Provides a seamless integration between NextAuth session and profile APIs.
 * 
 * AUTHENTICATION FLOW:
 * 1. Checks NextAuth session for user authentication
 * 2. Fetches basic user data from /api/users/me (includes username generation)
 * 3. Uses username to fetch complete profile from /api/profile/[username]
 * 4. Combines and returns normalized profile data
 * 
 * FEATURES:
 * ✅ Automatic username generation if missing
 * ✅ Session-based authentication with proper credentials
 * ✅ React Query integration for caching and refetching
 * ✅ Comprehensive error handling with user-friendly messages
 * ✅ TypeScript types for type safety
 * ✅ Optimized caching strategy (5min stale, 10min garbage collection)
 * ✅ Analytics data normalization
 * ✅ Fallback data handling
 * 
 * USAGE:
 * ```tsx
 * const { data: profile, isLoading, error } = useCurrentUserProfile()
 * 
 * if (isLoading) return <LoadingSkeleton />
 * if (error) return <ErrorDisplay error={error} />
 * if (!profile) return <NoProfileMessage />
 * 
 * return <ProfileDisplay profile={profile} />
 * ```
 * 
 * RETURN DATA STRUCTURE:
 * {
 *   // Basic user data
 *   id: string,
 *   username: string, // Always present after auto-generation
 *   name: string,
 *   email: string,
 *   
 *   // Profile data
 *   headline: string,
 *   bio: string,
 *   location: string,
 *   profilePictureUrl: string,
 *   
 *   // Analytics (normalized)
 *   analytics: {
 *     followersCount: number,
 *     profileViews: number,
 *     totalLikes: number
 *   },
 *   
 *   // Additional profile sections
 *   skills: Array,
 *   workExperience: Array,
 *   projects: Array,
 *   education: Array
 * }
 * 
 * ERROR HANDLING:
 * - Returns null when no session exists (not an error state)
 * - Throws meaningful errors for API failures
 * - Includes retry logic for transient failures
 * - User-friendly error messages for debugging
 * 
 * PERFORMANCE:
 * - 5-minute stale time for optimal UX
 * - 10-minute garbage collection time
 * - Query disabled when no session exists
 * - Automatic refetch on session change
 * 
 * DEPENDENCIES:
 * - @tanstack/react-query (for data fetching and caching)
 * - next-auth/react (for session management)
 * 
 * LAST UPDATED: 2025-01-05
 * =============================================================================
 */

import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

// Type definitions for better TypeScript support
interface UserProfileData {
  // Basic user data from /api/users/me
  id: string
  username: string
  name: string
  email: string
  avatar?: string
  profilePictureUrl?: string
  firstName?: string
  lastName?: string
  isVerified?: boolean
  createdAt?: string
  updatedAt?: string

  // Extended profile data from /api/profile/[username]
  headline?: string
  bio?: string
  location?: string
  website?: string
  linkedinUrl?: string
  githubUrl?: string
  twitterUrl?: string
  currentRole?: string // ADDED: Current job/role title
  openToWork?: boolean // ADDED: Open to work status
  
  // Analytics data (normalized structure)
  analytics?: {
    followersCount: number
    profileViews: number
    totalLikes: number
    connectionsCount?: number // Legacy field for backward compatibility
    totalLikesReceived?: number // Legacy field for backward compatibility
  }
  
  // Legacy analytics fields (for backward compatibility)
  followersCount?: number
  profileViewsCount?: number
  totalLikesReceived?: number
  
  // Profile sections
  skills?: Array<any>
  workExperience?: Array<any>
  projects?: Array<any>
  education?: Array<any>
}

interface UseCurrentUserProfileReturn {
  data: UserProfileData | null
  isLoading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Custom hook to fetch current authenticated user's complete profile data
 * 
 * This hook combines data from two API endpoints:
 * 1. /api/users/me - Basic user data with automatic username generation
 * 2. /api/profile/[username] - Complete profile data including analytics
 * 
 * @returns {UseCurrentUserProfileReturn} Profile data, loading state, and error handling
 */
export function useCurrentUserProfile(): UseCurrentUserProfileReturn {
  const { data: session } = useSession()
  
  const queryResult = useQuery({
    queryKey: ['current-user-profile', session?.user?.id],
    queryFn: async (): Promise<UserProfileData> => {
      // Early return if no session - this is not an error state
      if (!session?.user?.id) {
        throw new Error('No user session available')
      }
      
      try {
        console.log('🔍 Fetching current user profile data...')
        
        // STEP 1: Get basic user data including auto-generated username
        const userResponse = await fetch('/api/users/me', {
          method: 'GET',
          credentials: 'include', // CRITICAL: Include cookies for NextAuth session
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache', // Ensure fresh data
          },
        })
        
        if (!userResponse.ok) {
          const errorText = await userResponse.text()
          console.error('❌ User API error:', {
            status: userResponse.status,
            statusText: userResponse.statusText,
            body: errorText
          })
          throw new Error(`Failed to fetch user data: ${userResponse.status} ${userResponse.statusText}`)
        }
        
        const userData = await userResponse.json()
        console.log('✅ User data fetched successfully:', {
          id: userData.id,
          username: userData.username,
          hasUsername: !!userData.username
        })
        
        // STEP 2: Validate username exists (should be auto-generated by API if missing)
        if (!userData.username) {
          console.error('❌ No username available after user data fetch')
          throw new Error('User profile incomplete: missing username')
        }
        
        // STEP 3: Fetch complete profile data using username
        const profileResponse = await fetch(`/api/profile/${userData.username}`, {
          method: 'GET',
          credentials: 'include', // CRITICAL: Include cookies for NextAuth session
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache', // Ensure fresh data
          },
        })
        
        if (!profileResponse.ok) {
          const errorText = await profileResponse.text()
          console.error('❌ Profile API error:', {
            status: profileResponse.status,
            statusText: profileResponse.statusText,
            username: userData.username,
            body: errorText
          })
          
          // Handle 404 differently - might be a new user without profile setup
          if (profileResponse.status === 404) {
            console.warn('⚠️ Profile not found, returning basic user data only')
            // Return basic user data with empty analytics
            return {
              ...userData,
              analytics: {
                followersCount: 0,
                profileViews: 0,
                totalLikes: 0
              }
            }
          }
          
          throw new Error(`Failed to fetch profile: ${profileResponse.status} ${profileResponse.statusText}`)
        }
        
        const profileData = await profileResponse.json()
        console.log('✅ Profile data fetched successfully:', {
          username: userData.username,
          hasAnalytics: !!profileData.analytics,
          hasSkills: !!profileData.skills?.length,
          hasWorkExperience: !!profileData.workExperience?.length
        })
        
        // STEP 4: Combine and normalize data
        const combinedProfile: UserProfileData = {
          // Basic user data (from /api/users/me)
          ...userData,
          
          // Extended profile data (from /api/profile/[username])
          ...profileData,
          
          // FIXED: Normalize analytics structure for consistency
          analytics: {
            followersCount: profileData.analytics?.followersCount || 
                          profileData.analytics?.connectionsCount || 
                          profileData.followersCount || 0,
            profileViews: profileData.analytics?.profileViews || 
                         profileData.profileViews || 
                         profileData.profileViewsCount || 0,
            totalLikes: profileData.analytics?.totalLikes || 
                       profileData.analytics?.totalLikesReceived || 
                       profileData.totalLikesReceived || 0
          },
          
          // FIXED: Keep legacy fields for backward compatibility
          followersCount: profileData.analytics?.followersCount || 
                         profileData.analytics?.connectionsCount || 
                         profileData.followersCount || 0,
          profileViewsCount: profileData.analytics?.profileViews || 
                            profileData.profileViews || 
                            profileData.profileViewsCount || 0,
          totalLikesReceived: profileData.analytics?.totalLikes || 
                             profileData.analytics?.totalLikesReceived || 
                             profileData.totalLikesReceived || 0,
          
          // Ensure profile picture consistency
          profilePictureUrl: profileData.profilePictureUrl || userData.profilePictureUrl,
          avatar: profileData.profilePictureUrl || userData.profilePictureUrl,
          
          // Ensure name consistency
          name: profileData.name || userData.name || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || userData.username,
          
          // Additional profile fields
          currentRole: profileData.currentRole || profileData.headline,
          openToWork: profileData.openToWork || false
        }
        
        console.log('✅ Profile data normalized successfully')
        return combinedProfile
        
      } catch (error) {
        console.error('❌ Profile fetch error details:', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: session?.user?.id,
          userEmail: session?.user?.email,
          timestamp: new Date().toISOString(),
          stack: error instanceof Error ? error.stack : undefined
        })
        
        // Re-throw with context for better debugging
        throw error instanceof Error 
          ? new Error(`Profile fetch failed: ${error.message}`)
          : new Error('Profile fetch failed: Unknown error')
      }
    },
    
    // Query configuration for optimal performance and UX
    enabled: !!session?.user?.id, // Only run when user is authenticated
    retry: (failureCount, error) => {
      // Don't retry on authentication errors (401/403)
      if (error instanceof Error && error.message.includes('401')) {
        return false
      }
      if (error instanceof Error && error.message.includes('403')) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    staleTime: 1000 * 60 * 5, // 5 minutes - data considered fresh
    gcTime: 1000 * 60 * 10, // 10 minutes - garbage collection time
    refetchOnWindowFocus: false, // Don't refetch on window focus (too aggressive for profile data)
    refetchOnMount: true, // Always fetch on component mount
  })

  return {
    data: queryResult.data || null,
    isLoading: queryResult.isLoading,
    error: queryResult.error,
    refetch: queryResult.refetch
  }
}

export default useCurrentUserProfile
