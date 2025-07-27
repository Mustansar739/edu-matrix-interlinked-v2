import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

// Types
export interface UserProfile {
  id: string
  name: string
  username: string
  email: string
  avatar?: string
  profilePictureUrl?: string
  coverPhotoUrl?: string
  bio?: string
  headline?: string
  location?: string
  website?: string
  profession?: string
  isVerified?: boolean
  
  // Academic Info
  institutionId?: string
  departmentId?: string
  major?: string
  academicYear?: string
  
  // Contact Info
  phoneNumber?: string
  
  // Professional Info
  currentPosition?: string
  currentCompany?: string
  totalExperience?: number
  
  // Privacy Settings
  profileVisibility?: 'PUBLIC' | 'PRIVATE' | 'CONNECTIONS_ONLY'
  
  createdAt: string
  updatedAt: string
}

export interface UserStats {
  followersCount: number // UPDATED: Changed from connectionsCount to followersCount
  profileViewsCount: number
  totalLikesReceived: number
  recentViews: number
  recentLikes: number
  recentFollowers: number // UPDATED: Changed from recentConnections to recentFollowers
  postsCount: number
  commentsCount: number
  sharesCount: number
}

export interface ProfileView {
  id: string
  viewerId: string
  profileOwnerId: string
  viewedAt: string
  viewer: {
    id: string
    name: string
    username: string
    avatar?: string
  }
}

// API Functions
const profileAPI = {
  // Get user profile
  getUserProfile: async (userId: string): Promise<UserProfile> => {
    const response = await fetch(`/api/profile/${userId}`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }
    
    return response.json()
  },

  // Update user profile
  updateUserProfile: async ({ userId, data }: { userId: string, data: Partial<UserProfile> }): Promise<UserProfile> => {
    const response = await fetch(`/api/profile/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error('Failed to update profile')
    }
    
    return response.json()
  },

  // Get user stats
  getUserStats: async (userId: string): Promise<UserStats> => {
    const response = await fetch(`/api/profile/${userId}/stats`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch user stats')
    }
    
    return response.json()
  },

  // Record profile view
  recordProfileView: async ({ viewerId, profileOwnerId }: { viewerId: string, profileOwnerId: string }): Promise<void> => {
    // Don't record if viewing own profile
    if (viewerId === profileOwnerId) return

    const response = await fetch('/api/profile/views', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewerId, profileOwnerId })
    })
    
    if (!response.ok) {
      throw new Error('Failed to record profile view')
    }
  },

  // Get profile views
  getProfileViews: async (userId: string): Promise<ProfileView[]> => {
    const response = await fetch(`/api/profile/${userId}/views`)
    
    if (!response.ok) {
      throw new Error('Failed to fetch profile views')
    }
    
    return response.json()
  },

  // Search users
  searchUsers: async (query: string): Promise<UserProfile[]> => {
    const response = await fetch(`/api/profile/search?q=${encodeURIComponent(query)}`)
    
    if (!response.ok) {
      throw new Error('Failed to search users')
    }
    
    return response.json()
  }
}

// Custom Hooks
export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: ['userProfile', userId],
    queryFn: () => profileAPI.getUserProfile(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: profileAPI.updateUserProfile,
    onSuccess: (data) => {
      // Update the cache with new data
      queryClient.setQueryData(['userProfile', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['userProfile', data.id] })
      
      toast({
        title: "Profile updated!",
        description: "Your profile has been updated successfully.",
      })
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive"
      })
    }
  })
}

export function useUserStats(userId: string) {
  return useQuery({
    queryKey: ['userStats', userId],
    queryFn: () => profileAPI.getUserStats(userId),
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useRecordProfileView() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: profileAPI.recordProfileView,
    onSuccess: (_, variables) => {
      // Update stats cache
      queryClient.invalidateQueries({ queryKey: ['userStats', variables.profileOwnerId] })
      queryClient.invalidateQueries({ queryKey: ['profileViews', variables.profileOwnerId] })
    },
    // Don't show error toasts for view recording failures
    onError: () => {
      // Silently handle errors for view recording
    }
  })
}

export function useProfileViews(userId: string) {
  return useQuery({
    queryKey: ['profileViews', userId],
    queryFn: () => profileAPI.getProfileViews(userId),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ['searchUsers', query],
    queryFn: () => profileAPI.searchUsers(query),
    enabled: !!query && query.length >= 2, // Only search if query is at least 2 characters
    staleTime: 30 * 1000, // 30 seconds
  })
}

// Helper hook to get current user profile
export function useCurrentUserProfile(currentUserId?: string) {
  return useUserProfile(currentUserId || '')
}

// Helper hook to check if profile belongs to current user
export function useIsOwnProfile(profileUserId: string, currentUserId?: string) {
  return currentUserId === profileUserId
}
