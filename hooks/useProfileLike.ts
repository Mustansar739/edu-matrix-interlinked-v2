/**
 * =============================================================================
 * PROFILE LIKE HOOK - useProfileLike (UPDATED FOR UNIFIED SYSTEM)
 * =============================================================================
 * 
 * PURPOSE:
 * Custom hook for liking/unliking user profiles using the Unified Like System.
 * Provides optimistic updates and error handling for profile interactions.
 * 
 * UNIFIED INTEGRATION:
 * ✅ Now uses unified like API: /api/unified-likes/profile/[profileId]
 * ✅ Consistent response format with other content types
 * ✅ Automatic profile sync via ProfileLikesSyncService
 * ✅ Compatible with Universal Like System
 * 
 * FEATURES:
 * - Like/unlike profiles with optimistic updates
 * - Real-time like count updates
 * - Error handling with rollback on failure
 * - Integration with Unified Like API
 * - Prevents self-liking
 * 
 * USAGE:
 * const { liked, totalLikes, toggleLike, isLoading } = useProfileLike(profileId, profileOwnerId)
 * 
 * API INTEGRATION:
 * - POST /api/unified-likes/profile/[profileId] - Like/unlike profile
 * - GET /api/unified-likes/profile/[profileId] - Get like status
 * 
 * OPTIMISTIC UPDATES:
 * - Immediately updates UI state
 * - Rollback on API failure
 * - Smooth user experience
 * 
 * ERROR HANDLING:
 * - Network errors
 * - Permission errors
 * - Self-like prevention
 * 
 * LAST UPDATED: 2025-01-07 - Updated for unified like system
 * =============================================================================
 */

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'

interface UseProfileLikeProps {
  profileId: string
  profileOwnerId: string
  initialLiked?: boolean
  initialTotalLikes?: number
}

interface UseProfileLikeReturn {
  liked: boolean
  totalLikes: number
  toggleLike: () => Promise<void>
  isLoading: boolean
  error: string | null
}

export function useProfileLike({
  profileId,
  profileOwnerId,
  initialLiked = false,
  initialTotalLikes = 0
}: UseProfileLikeProps): UseProfileLikeReturn {
  const { data: session } = useSession()
  const [liked, setLiked] = useState(initialLiked)
  const [totalLikes, setTotalLikes] = useState(initialTotalLikes)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if user can like this profile
  const canLike = session?.user?.id && session.user.id !== profileOwnerId

  // Toggle like/unlike
  const toggleLike = useCallback(async () => {
    // Guard against empty profileId or when user cannot like
    if (!canLike || !profileId || !profileOwnerId) {
      if (session?.user?.id === profileOwnerId) {
        toast.error('You cannot like your own profile')
      } else if (!profileId || !profileOwnerId) {
        toast.error('Invalid profile')
      } else {
        toast.error('Please sign in to like profiles')
      }
      return
    }

    setIsLoading(true)
    setError(null)

    // Optimistic update
    const previousLiked = liked
    const previousTotalLikes = totalLikes
    
    setLiked(!liked)
    setTotalLikes(prev => liked ? prev - 1 : prev + 1)

    try {
      // UPDATED: Use unified like API for consistency
      const url = `/api/unified-likes/profile/${profileId}`
      const method = 'POST'
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: liked ? 'unlike' : 'like',
          reaction: 'like',
          recipientId: profileOwnerId,
          schemaName: 'auth_schema',
          metadata: {
            profileId,
            timestamp: new Date().toISOString(),
            source: 'profile_like_hook'
          }
        })
      })

      if (!response.ok) {
        throw new Error(`Failed to ${liked ? 'unlike' : 'like'} profile`)
      }

      const result = await response.json()
      
      // Update with server response (unified API format)
      setLiked(result.isLiked)
      setTotalLikes(result.totalLikes)

      // Show success message
      toast.success(result.isLiked ? 'Profile liked!' : 'Profile unliked!')

    } catch (err) {
      // Rollback optimistic update on error
      setLiked(previousLiked)
      setTotalLikes(previousTotalLikes)
      
      const errorMessage = err instanceof Error ? err.message : 'An error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
      
      console.error('Profile like error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [liked, totalLikes, profileId, profileOwnerId, canLike, session])

  // Fetch current like status when profile changes
  useEffect(() => {
    // Guard against empty profileId or when user cannot like
    if (!canLike || !profileId || !profileOwnerId) return

    const fetchLikeStatus = async () => {
      try {
        // UPDATED: Use unified like API for consistency
        const response = await fetch(`/api/unified-likes/profile/${profileId}`)
        if (response.ok) {
          const data = await response.json()
          setLiked(data.isLiked)
          setTotalLikes(data.totalLikes)
        }
      } catch (err) {
        console.error('Error fetching like status:', err)
      }
    }

    fetchLikeStatus()
  }, [profileId, profileOwnerId, canLike])

  return {
    liked,
    totalLikes,
    toggleLike,
    isLoading,
    error
  }
}
