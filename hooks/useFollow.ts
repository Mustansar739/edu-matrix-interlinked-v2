/**
 * =============================================================================
 * FOLLOW HOOK - useFollow
 * =============================================================================
 * 
 * PURPOSE:
 * Custom React hook for following/unfollowing users with optimistic updates.
 * Provides complete state management for follow functionality.
 * 
 * FEATURES:
 * - Follow/unfollow users with optimistic updates
 * - Real-time follower count updates
 * - Error handling with rollback on failure
 * - Loading states for smooth UX
 * - Permission validation
 * - Mutual follow detection
 * 
 * USAGE:
 * const { following, followersCount, toggleFollow, isLoading } = useFollow(userId)
 * 
 * API INTEGRATION:
 * - POST /api/follow/[userId] - Follow user
 * - DELETE /api/follow/[userId] - Unfollow user
 * - GET /api/follow/[userId]/status - Get follow status
 * 
 * OPTIMISTIC UPDATES:
 * - Immediately updates UI state
 * - Rollback on API failure
 * - Smooth user experience
 * 
 * ERROR HANDLING:
 * - Network errors
 * - Permission errors
 * - Self-follow prevention
 * - User feedback via toast
 * 
 * LAST UPDATED: 2025-01-04
 * =============================================================================
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface UseFollowProps {
  userId: string
  initialFollowing?: boolean
  initialFollowersCount?: number
}

interface UseFollowReturn {
  following: boolean
  followersCount: number
  mutualFollow: boolean
  toggleFollow: () => Promise<void>
  isLoading: boolean
  canFollow: boolean
  error: string | null
}

export function useFollow({
  userId,
  initialFollowing = false,
  initialFollowersCount = 0
}: UseFollowProps): UseFollowReturn {
  const { data: session } = useSession()
  const [following, setFollowing] = useState(initialFollowing)
  const [followersCount, setFollowersCount] = useState(initialFollowersCount)
  const [mutualFollow, setMutualFollow] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user can follow (authenticated and not self)
  const canFollow = Boolean(session?.user?.id && session.user.id !== userId)

  // PRODUCTION FIX: Cache the initial fetch to prevent repeated calls
  const hasInitializedRef = useRef(false);

  // Fetch current follow status - ONLY ONCE on mount
  const fetchFollowStatus = useCallback(async () => {
    if (!userId || hasInitializedRef.current) return

    try {
      const response = await fetch(`/api/follow/${userId}/status`)
      if (response.ok) {
        const data = await response.json()
        setFollowing(data.following)
        setFollowersCount(data.followersCount)
        setMutualFollow(data.mutualFollow)
        hasInitializedRef.current = true // Mark as initialized
      }
    } catch (err) {
      console.error('Error fetching follow status:', err)
    }
  }, [userId])

  // Load initial follow status ONLY ONCE
  useEffect(() => {
    if (!hasInitializedRef.current) {
      fetchFollowStatus()
    }
  }, [fetchFollowStatus])

  // Toggle follow/unfollow
  const toggleFollow = useCallback(async () => {
    if (!canFollow) {
      if (!session?.user?.id) {
        logFollowError('toggle', new Error('No authentication'), { reason: 'unauthenticated' })
        toast.error('Please sign in to follow users')
      } else if (session.user.id === userId) {
        logFollowError('toggle', new Error('Self-follow attempt'), { reason: 'self_follow' })
        toast.error('You cannot follow yourself')
      }
      return
    }

    logFollowOperation('toggle_start', { following, followersCount })
    setIsLoading(true)
    setError(null)

    // Optimistic update
    const previousFollowing = following
    const previousFollowersCount = followersCount
    
    setFollowing(!following)
    setFollowersCount(prev => following ? prev - 1 : prev + 1)

    try {
      const url = `/api/follow/${userId}`
      const method = following ? 'DELETE' : 'POST'
      
      logFollowOperation('api_call', { method, url, following })
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: method === 'POST' ? JSON.stringify({
          userId,
          notifyUser: true
        }) : undefined
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      
      // Update with server response
      setFollowing(result.following)
      setFollowersCount(result.followersCount)

      // Show success message
      const successMessage = result.message || (result.following ? 'Following!' : 'Unfollowed')
      toast.success(successMessage)
      
      logFollowOperation('toggle_success', { 
        newFollowing: result.following, 
        newFollowersCount: result.followersCount,
        message: successMessage 
      })

      // PRODUCTION FIX: Don't automatically refresh after success
      // The API response already contains the updated data we need
      // This eliminates the extra API call that was happening 500ms later
      
    } catch (err) {
      // Rollback optimistic update on error
      setFollowing(previousFollowing)
      setFollowersCount(previousFollowersCount)
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      
      // Enhanced error handling with categorization
      if (errorMessage.includes('404')) {
        toast.error('User not found')
        logFollowError('toggle', err, { type: 'user_not_found' })
      } else if (errorMessage.includes('403')) {
        toast.error('Permission denied')
        logFollowError('toggle', err, { type: 'permission_denied' })
      } else if (errorMessage.includes('429')) {
        toast.error('Too many requests. Please wait a moment.')
        logFollowError('toggle', err, { type: 'rate_limited' })
      } else {
        toast.error('Unable to complete follow action. Please try again.')
        logFollowError('toggle', err, { type: 'unknown' })
      }
      
    } finally {
      setIsLoading(false)
      logFollowOperation('toggle_end', { isLoading: false })
    }
  }, [following, followersCount, userId, canFollow, session, fetchFollowStatus])

  /**
 * =============================================================================
 * PRODUCTION-READY ERROR HANDLING AND LOGGING ENHANCEMENTS
 * =============================================================================
 * 
 * This section implements comprehensive error handling and logging for the
 * follow functionality to ensure production-ready reliability.
 * 
 * ERROR HANDLING STRATEGY:
 * - Detailed error logging with context
 * - Graceful degradation on API failures
 * - User-friendly error messages
 * - Proper rollback mechanisms
 * 
 * LOGGING STRATEGY:
 * - Operation tracking with timestamps
 * - Error categorization and debugging info
 * - Success/failure state monitoring
 * - Performance metrics collection
 * 
 * =============================================================================
 */

  // Enhanced logging for follow operations
  const logFollowOperation = (operation: string, data?: any) => {
    console.log(`✅ useFollow ${operation}:`, {
      operation,
      userId,
      timestamp: new Date().toISOString(),
      sessionUserId: session?.user?.id,
      data
    })
  }

  // Enhanced error logging for follow operations
  const logFollowError = (operation: string, error: any, context?: any) => {
    console.error(`❌ useFollow ${operation} error:`, {
      operation,
      userId,
      timestamp: new Date().toISOString(),
      sessionUserId: session?.user?.id,
      error: error?.message || String(error),
      stack: error?.stack,
      context
    })
  }

  return {
    following,
    followersCount,
    mutualFollow,
    toggleFollow,
    isLoading,
    canFollow,
    error
  }
}
