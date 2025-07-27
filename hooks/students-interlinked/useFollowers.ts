import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

// Types
export interface FollowUser {
  id: string
  name: string
  username: string
  profilePictureUrl?: string
  headline?: string
  isVerified: boolean
  followedAt?: string
}

export interface FollowSuggestion {
  id: string
  name: string
  username: string
  profilePictureUrl?: string
  headline?: string
  isVerified: boolean
  profession?: string
  institutionId?: string
}

export interface FollowStatus {
  isFollowing: boolean
  followsYou: boolean
}

// Follow a user
export const useFollowUser = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (followingId: string) => {
      const response = await fetch('/api/social/follow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followingId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to follow user')
      }

      return response.json()
    },
    onSuccess: (data, followingId) => {
      toast({
        title: 'Success',
        description: 'User followed successfully',
      })
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['followStatus', followingId] })
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
      queryClient.invalidateQueries({ queryKey: ['followSuggestions'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Unfollow a user
export const useUnfollowUser = () => {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (followingId: string) => {
      const response = await fetch('/api/social/follow', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ followingId }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to unfollow user')
      }

      return response.json()
    },
    onSuccess: (data, followingId) => {
      toast({
        title: 'Success',
        description: 'User unfollowed successfully',
      })
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['followStatus', followingId] })
      queryClient.invalidateQueries({ queryKey: ['followers'] })
      queryClient.invalidateQueries({ queryKey: ['following'] })
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      })
    },
  })
}

// Get follow status for a specific user
export const useFollowStatus = (userId: string | undefined) => {
  return useQuery<FollowStatus>({
    queryKey: ['followStatus', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')
      
      const response = await fetch(`/api/social/follow/status/${userId}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch follow status')
      }
      
      return response.json()
    },
    enabled: !!userId,
  })
}

// Get followers list
export const useFollowers = (userId: string | undefined, page = 1, limit = 20) => {
  return useQuery<{
    users: FollowUser[]
    total: number
    page: number
    hasMore: boolean
  }>({
    queryKey: ['followers', userId, page, limit],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')
      
      const response = await fetch(
        `/api/social/follow/list/${userId}?type=followers&page=${page}&limit=${limit}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch followers')
      }
      
      return response.json()
    },
    enabled: !!userId,
  })
}

// Get following list
export const useFollowing = (userId: string | undefined, page = 1, limit = 20) => {
  return useQuery<{
    users: FollowUser[]
    total: number
    page: number
    hasMore: boolean
  }>({
    queryKey: ['following', userId, page, limit],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')
      
      const response = await fetch(
        `/api/social/follow/list/${userId}?type=following&page=${page}&limit=${limit}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch following')
      }
      
      return response.json()
    },
    enabled: !!userId,
  })
}

// Get follow suggestions
export const useFollowSuggestions = (userId: string | undefined, limit = 10) => {
  return useQuery<{
    suggestions: FollowSuggestion[]
    total: number
  }>({
    queryKey: ['followSuggestions', userId, limit],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required')
      
      const response = await fetch(
        `/api/social/follow/suggestions/${userId}?limit=${limit}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch follow suggestions')
      }
      
      return response.json()
    },
    enabled: !!userId,
  })
}

// Combined hook for easier usage
export const useFollowActions = (userId: string | undefined) => {
  const followUser = useFollowUser()
  const unfollowUser = useUnfollowUser()
  const followStatus = useFollowStatus(userId)

  const handleFollow = () => {
    if (userId) {
      followUser.mutate(userId)
    }
  }

  const handleUnfollow = () => {
    if (userId) {
      unfollowUser.mutate(userId)
    }
  }

  return {
    ...followStatus,
    isLoading: followStatus.isLoading || followUser.isPending || unfollowUser.isPending,
    handleFollow,
    handleUnfollow,
  }
}
