'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/use-toast'

// Types
interface Group {
  id: string
  name: string
  description: string
  about?: string
  coverPhotoUrl?: string
  profilePhotoUrl?: string
  groupType: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  privacy: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  visibility: 'VISIBLE' | 'HIDDEN'
  category: string
  subcategory?: string
  tags: string[]
  memberCount: number
  postCount: number
  activeMembers: number
  isJoined: boolean
  userRole?: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt?: string
  createdAt: string
  updatedAt: string
  _count: {
    members: number
    posts: number
  }
}

interface GroupMember {
  id: string
  userId: string
  role: 'ADMIN' | 'MODERATOR' | 'MEMBER'
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    image?: string
    profilePicture?: string
    academicInfo?: {
      university?: string
      major?: string
      year?: string
    }
  }
}

interface GroupPost {
  id: string
  content: string
  imageUrls?: string[]
  videoUrls?: string[]
  documentUrls?: string[]
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK'
  visibility: 'PUBLIC' | 'PRIVATE' | 'FRIENDS' | 'GROUPS'
  isPinned: boolean
  createdAt: string
  updatedAt: string
  groupId: string
  authorId: string
  author: {
    id: string
    name: string
    email: string
    image?: string
    profilePicture?: string
  }
  _count: {
    likes: number
    comments: number
    shares: number
  }
  userLiked: boolean
  userShared: boolean
}

interface CreateGroupData {
  name: string
  description: string
  about?: string
  coverPhotoUrl?: string
  profilePhotoUrl?: string
  groupType?: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  privacy?: 'PUBLIC' | 'PRIVATE' | 'SECRET'
  visibility?: 'VISIBLE' | 'HIDDEN'
  category?: string
  subcategory?: string
  tags?: string[]
  rules?: string[]
  guidelines?: string
  location?: string
  website?: string
  email?: string
  requirePostApproval?: boolean
  allowMemberPosts?: boolean
  allowMemberInvites?: boolean
}

interface GroupsQueryParams {
  page?: number
  limit?: number
  category?: string
  privacy?: string
  search?: string
  userGroups?: boolean
  featured?: boolean
}

// Custom hooks for groups

// Get all groups with filtering and pagination
export function useGroups(params: GroupsQueryParams = {}) {
  return useQuery({
    queryKey: ['groups', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString())
        }
      })

      const response = await fetch(`/api/students-interlinked/groups?${searchParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch groups')
      }
      
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Get single group details
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId],
    queryFn: async () => {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch group')
      }
      return response.json()
    },
    enabled: !!groupId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

// Get group members
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'members'],
    queryFn: async () => {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}/members`)
      if (!response.ok) {
        throw new Error('Failed to fetch group members')
      }
      return response.json()
    },
    enabled: !!groupId,
    staleTime: 3 * 60 * 1000, // 3 minutes
  })
}

// Get group posts
export function useGroupPosts(groupId: string, page: number = 1, limit: number = 20) {
  return useQuery({
    queryKey: ['groups', groupId, 'posts', page, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/students-interlinked/groups/${groupId}/posts?page=${page}&limit=${limit}`
      )
      if (!response.ok) {
        throw new Error('Failed to fetch group posts')
      }
      return response.json()
    },
    enabled: !!groupId,
    staleTime: 1 * 60 * 1000, // 1 minute for fresh posts
  })
}

// Create new group
export function useCreateGroup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: CreateGroupData) => {
      const response = await fetch('/api/students-interlinked/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create group')
      }
      
      return response.json()
    },
    onSuccess: (newGroup) => {
      // Invalidate and refetch groups list
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      
      toast({
        title: "Group created!",
        description: `Successfully created ${newGroup.name}`,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Join/Leave group
export function useJoinLeaveGroup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async ({ groupId, action }: { groupId: string; action: 'join' | 'leave' }) => {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}/join`, {
        method: action === 'join' ? 'POST' : 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `Failed to ${action} group`)
      }
      
      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups', variables.groupId, 'members'] })
      
      toast({
        title: variables.action === 'join' ? "Joined group!" : "Left group",
        description: data.message,
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Create group post
export function useCreateGroupPost(groupId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: {
      content: string
      mediaUrls?: string[]
      educationalContext?: any
      type?: string
      pinned?: boolean
    }) => {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create post')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate group posts and group info
      queryClient.invalidateQueries({ queryKey: ['groups', groupId, 'posts'] })
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
      
      toast({
        title: "Post created!",
        description: "Your post has been shared with the group",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Update group (admin only)
export function useUpdateGroup(groupId: string) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (data: Partial<CreateGroupData>) => {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update group')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate group data
      queryClient.invalidateQueries({ queryKey: ['groups', groupId] })
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      
      toast({
        title: "Group updated!",
        description: "Group information has been updated successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Delete group (admin only)
export function useDeleteGroup() {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  return useMutation({
    mutationFn: async (groupId: string) => {
      const response = await fetch(`/api/students-interlinked/groups/${groupId}`, {
        method: 'DELETE',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete group')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate all group queries
      queryClient.invalidateQueries({ queryKey: ['groups'] })
      
      toast({
        title: "Group deleted",
        description: "The group has been permanently deleted",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })
}

// Export types for use in components
export type {
  Group,
  GroupMember,
  GroupPost,
  CreateGroupData,
  GroupsQueryParams
}
