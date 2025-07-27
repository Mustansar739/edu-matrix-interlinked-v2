'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'
import { SocialPostVisibility } from '@prisma/client'

// Types for shares functionality
interface Share {
  postId: string
  userId: string
  content?: string // Optional share message
  privacy: SocialPostVisibility
  createdAt: string
  // User info (fetched separately due to cross-schema)
  user: {
    id: string
    name: string
    username?: string
    image?: string
    verified?: boolean
  }
}

interface CreateShareData {
  content?: string // Optional share message
  privacy?: SocialPostVisibility
}

interface SharesResponse {
  shares: Share[]
  pagination: {
    page: number
    limit: number
    totalShares: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

interface ShareResponse {
  success: boolean
  shared: boolean
  totalShares: number
  message: string
}

interface ShareError {
  error: string
  details?: any
}

interface UseSharesOptions {
  postId: string
  limit?: number
  enabled?: boolean
  enableRealtime?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

interface UseSharesReturn {
  // State
  shares: Share[]
  isLoading: boolean
  isLoadingMore: boolean
  hasNextPage: boolean
  error: string | null
  totalShares: number
  isShared: boolean
  isSharing: boolean
  
  // Actions
  sharePost: (data: CreateShareData) => Promise<void>
  unsharePost: () => Promise<void>
  toggleShare: (data: CreateShareData) => Promise<void>
  
  // Pagination
  loadMore: () => void
  refresh: () => void
  
  // Utilities
  clearError: () => void
}

/**
 * Comprehensive hook for managing shares functionality
 * Features: Share/unshare posts, fetch shares list, real-time updates
 */
export function useShares({
  postId,
  limit = 10,
  enabled = true,
  enableRealtime = true,
  onSuccess,
  onError
}: UseSharesOptions): UseSharesReturn {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Query keys
  const sharesQueryKey = ['shares', postId]
  const shareStatusQueryKey = ['share-status', postId]

  // Fetch share status for current user
  const { data: shareStatusData } = useQuery({
    queryKey: shareStatusQueryKey,
    queryFn: async () => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/share/status`)
      if (!response.ok && response.status !== 404) {
        throw new Error('Failed to fetch share status')
      }
      if (response.status === 404) {
        return { isShared: false }
      }
      return response.json()
    },
    enabled,
    staleTime: 1000 * 30, // 30 seconds
    refetchOnWindowFocus: false
  })

  // Fetch shares list with pagination
  const { data: sharesData, isLoading } = useQuery({
    queryKey: sharesQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: '1',
        limit: limit.toString(),
      })

      const response = await fetch(`/api/students-interlinked/posts/${postId}/shares?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch shares')
      }
      
      const data: SharesResponse = await response.json()
      return data
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false
  })

  // Share post mutation
  const sharePostMutation = useMutation({
    mutationFn: async (shareData: CreateShareData): Promise<ShareResponse> => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      })

      if (!response.ok) {
        const errorData: ShareError = await response.json()
        throw new Error(errorData.error || 'Failed to share post')
      }

      return response.json()
    },
    onMutate: async (shareData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: shareStatusQueryKey })
      await queryClient.cancelQueries({ queryKey: sharesQueryKey })

      // Snapshot previous values
      const previousShareStatus = queryClient.getQueryData(shareStatusQueryKey)
      const previousShares = queryClient.getQueryData(sharesQueryKey)

      // Optimistically update share status
      queryClient.setQueryData(shareStatusQueryKey, {
        isShared: true
      })

      // Optimistically update shares count
      queryClient.setQueryData(sharesQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          pagination: {
            ...old.pagination,
            totalShares: old.pagination.totalShares + 1
          }
        }
      })

      setError(null)
      return { previousShareStatus, previousShares }
    },
    onSuccess: (data) => {
      // Update cache with real data
      queryClient.setQueryData(shareStatusQueryKey, {
        isShared: data.shared
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['posts', 'students-interlinked'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: sharesQueryKey 
      })

      onSuccess?.(data)
      
      toast({
        title: "Shared!",
        description: "Post has been shared to your profile"
      })
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousShareStatus) {
        queryClient.setQueryData(shareStatusQueryKey, context.previousShareStatus)
      }
      if (context?.previousShares) {
        queryClient.setQueryData(sharesQueryKey, context.previousShares)
      }

      const errorMessage = error.message || 'Failed to share post'
      setError(errorMessage)
      onError?.(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // Unshare post mutation
  const unsharePostMutation = useMutation({
    mutationFn: async (): Promise<ShareResponse> => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/share`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData: ShareError = await response.json()
        throw new Error(errorData.error || 'Failed to unshare post')
      }

      return response.json()
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: shareStatusQueryKey })
      await queryClient.cancelQueries({ queryKey: sharesQueryKey })

      // Snapshot previous values
      const previousShareStatus = queryClient.getQueryData(shareStatusQueryKey)
      const previousShares = queryClient.getQueryData(sharesQueryKey)

      // Optimistically update share status
      queryClient.setQueryData(shareStatusQueryKey, {
        isShared: false
      })

      // Optimistically update shares count
      queryClient.setQueryData(sharesQueryKey, (old: any) => {
        if (!old) return old
        return {
          ...old,
          pagination: {
            ...old.pagination,
            totalShares: Math.max(old.pagination.totalShares - 1, 0)
          }
        }
      })

      setError(null)
      return { previousShareStatus, previousShares }
    },
    onSuccess: (data) => {
      // Update cache with real data
      queryClient.setQueryData(shareStatusQueryKey, {
        isShared: data.shared
      })

      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['posts', 'students-interlinked'] 
      })
      queryClient.invalidateQueries({ 
        queryKey: sharesQueryKey 
      })

      onSuccess?.(data)
      
      toast({
        title: "Unshared",
        description: "Post has been removed from your shares"
      })
    },
    onError: (error, variables, context) => {
      // Rollback optimistic updates
      if (context?.previousShareStatus) {
        queryClient.setQueryData(shareStatusQueryKey, context.previousShareStatus)
      }
      if (context?.previousShares) {
        queryClient.setQueryData(sharesQueryKey, context.previousShares)
      }

      const errorMessage = error.message || 'Failed to unshare post'
      setError(errorMessage)
      onError?.(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // Action handlers
  const sharePost = useCallback(async (data: CreateShareData): Promise<void> => {
    if (shareStatusData?.isShared) return // Already shared
    await sharePostMutation.mutateAsync(data)
  }, [shareStatusData?.isShared, sharePostMutation])

  const unsharePost = useCallback(async (): Promise<void> => {
    if (!shareStatusData?.isShared) return // Not shared
    await unsharePostMutation.mutateAsync()
  }, [shareStatusData?.isShared, unsharePostMutation])

  const toggleShare = useCallback(async (data: CreateShareData): Promise<void> => {
    if (shareStatusData?.isShared) {
      await unsharePost()
    } else {
      await sharePost(data)
    }
  }, [shareStatusData?.isShared, sharePost, unsharePost])

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: sharesQueryKey })
    queryClient.invalidateQueries({ queryKey: shareStatusQueryKey })
  }, [queryClient, sharesQueryKey, shareStatusQueryKey])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // For now, we'll implement a simple loadMore that refetches
  // In a full implementation, this would use infinite queries
  const loadMore = useCallback(() => {
    // TODO: Implement infinite pagination like in useComments
    refresh()
  }, [refresh])

  return {
    // State
    shares: sharesData?.shares || [],
    isLoading,
    isLoadingMore: false, // TODO: Implement with infinite query
    hasNextPage: sharesData?.pagination?.hasNextPage || false,
    error,
    totalShares: sharesData?.pagination?.totalShares || 0,
    isShared: shareStatusData?.isShared || false,
    isSharing: sharePostMutation.isPending || unsharePostMutation.isPending,
    
    // Actions
    sharePost,
    unsharePost,
    toggleShare,
    
    // Pagination
    loadMore,
    refresh,
    
    // Utilities
    clearError
  }
}

// Convenience hook for simple share operations
export function useSimpleShare(postId: string) {
  return useShares({
    postId,
    limit: 20
  })
}

// Export types for external use
export type { 
  Share, 
  CreateShareData, 
  SharesResponse, 
  ShareResponse,
  UseSharesOptions, 
  UseSharesReturn 
}
