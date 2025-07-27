import { useQuery } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'

// Types for user dashboard data
interface UserStats {
  studyHours: number
  sessionsThisWeek: number
  postsThisWeek: number
  likesReceived: number
  friendsCount: number
  profileViews: number
}

interface ActiveGroup {
  id: string
  name: string
  description?: string
  status: 'live' | 'scheduled' | 'upcoming'
  memberCount: number
  topic?: string
  lastActivity: string
  groupType: string
}

// Hook to fetch user dashboard statistics
export function useUserDashboardStats(userId: string) {
  return useQuery({
    queryKey: ['user-dashboard-stats', userId],
    queryFn: async (): Promise<UserStats> => {
      const response = await fetch(`/api/students-interlinked/users/${userId}/stats`)
      if (!response.ok) throw new Error('Failed to fetch user stats')
      return await response.json()
    },
    enabled: !!userId
  })
}

// Hook to fetch user's active study groups/sessions
export function useUserActiveGroups(userId: string) {
  return useQuery({
    queryKey: ['user-active-groups', userId],
    queryFn: async (): Promise<ActiveGroup[]> => {
      const response = await fetch(`/api/students-interlinked/users/${userId}/active-groups`)
      if (!response.ok) throw new Error('Failed to fetch active groups')
      return await response.json()
    },
    enabled: !!userId
  })
}
