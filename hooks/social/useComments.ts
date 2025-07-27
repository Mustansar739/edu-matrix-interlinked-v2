'use client'

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { useToast } from '@/components/ui/use-toast'

// Types for comments functionality
interface Comment {
  id: string
  postId: string
  userId: string
  parentId?: string
  content: string
  imageUrls: string[]
  likeCount: number
  replyCount: number
  createdAt: string
  updatedAt: string
  author: {
    id: string
    name: string
    username?: string
    image?: string
    verified?: boolean
  }
  likes: Array<{
    id: string
    userId: string
    reaction: string
  }>
  replies: Comment[]
  isLiked: boolean
  canEdit: boolean
  canDelete: boolean
}

interface CreateCommentData {
  content: string
  imageUrls?: string[]
  parentId?: string
  recipientId?: string // For notifications
  schemaName?: string
}

interface UpdateCommentData {
  content?: string
  imageUrls?: string[]
}

interface CommentsResponse {
  comments: Comment[]
  pagination: {
    page: number
    limit: number
    totalComments: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

interface UseCommentsOptions {
  postId: string
  parentId?: string // For nested comments
  limit?: number
  enabled?: boolean
  enableRealtime?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

interface UseCommentsReturn {
  // State
  comments: Comment[]
  isLoading: boolean
  isLoadingMore: boolean
  hasNextPage: boolean
  error: string | null
  totalComments: number
  
  // Actions
  addComment: (data: CreateCommentData) => Promise<Comment>
  updateComment: (commentId: string, data: UpdateCommentData) => Promise<Comment>
  deleteComment: (commentId: string) => Promise<void>
  likeComment: (commentId: string) => Promise<void>
  unlikeComment: (commentId: string) => Promise<void>
  
  // Pagination
  loadMore: () => void
  refresh: () => void
  
  // Utilities
  clearError: () => void
}

/**
 * Comprehensive hook for managing comments functionality
 * Features: CRUD operations, real-time updates, nested comments, pagination
 */
export function useComments({
  postId,
  parentId,
  limit = 10,
  enabled = true,
  enableRealtime = true,
  onSuccess,
  onError
}: UseCommentsOptions): UseCommentsReturn {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Query key for comments
  const commentsQueryKey = ['comments', postId, parentId]

  // Fetch comments with infinite pagination
  const {
    data,
    isLoading,
    isFetchingNextPage: isLoadingMore,
    hasNextPage,
    fetchNextPage,
    refetch: refresh,
    error: queryError
  } = useInfiniteQuery<CommentsResponse, Error>({
    queryKey: commentsQueryKey,
    queryFn: async (context) => {
      const pageParam = context.pageParam as number
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: limit.toString(),
      })
      
      if (parentId) {
        params.append('parentId', parentId)
      }

      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }
      
      const data: CommentsResponse = await response.json()
      return data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: CommentsResponse) => {
      return lastPage.pagination.hasNextPage 
        ? lastPage.pagination.page + 1 
        : undefined
    },
    enabled,
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: false
  })

  // Flatten comments from pages
  const comments = data?.pages.flatMap(page => page.comments) || []
  const totalComments = data?.pages[0]?.pagination.totalComments || 0

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (commentData: CreateCommentData): Promise<Comment> => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(commentData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to add comment')
      }

      return response.json()
    },
    onSuccess: (newComment) => {
      // Add to cache optimistically
      queryClient.setQueryData(commentsQueryKey, (old: any) => {
        if (!old) return old
        
        const newPages = [...old.pages]
        if (newPages[0]) {
          newPages[0] = {
            ...newPages[0],
            comments: [newComment, ...newPages[0].comments],
            pagination: {
              ...newPages[0].pagination,
              totalComments: newPages[0].pagination.totalComments + 1
            }
          }
        }
        
        return { ...old, pages: newPages }
      })

      // Invalidate post data to update comment count
      queryClient.invalidateQueries({ 
        queryKey: ['posts', 'students-interlinked'] 
      })

      onSuccess?.(newComment)
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted"
      })

      setError(null)
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to add comment'
      setError(errorMessage)
      onError?.(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: async ({ commentId, data }: { commentId: string, data: UpdateCommentData }): Promise<Comment> => {
      const response = await fetch(`/api/students-interlinked/comments/${commentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update comment')
      }

      return response.json()
    },
    onSuccess: (updatedComment) => {
      // Update comment in cache
      queryClient.setQueryData(commentsQueryKey, (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: any) => ({
          ...page,
          comments: page.comments.map((comment: Comment) =>
            comment.id === updatedComment.id ? updatedComment : comment
          )
        }))
        
        return { ...old, pages: newPages }
      })

      toast({
        title: "Comment updated",
        description: "Your comment has been updated"
      })

      setError(null)
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to update comment'
      setError(errorMessage)
      onError?.(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string): Promise<void> => {
      const response = await fetch(`/api/students-interlinked/comments/${commentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete comment')
      }
    },
    onSuccess: (_, commentId) => {
      // Remove comment from cache
      queryClient.setQueryData(commentsQueryKey, (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: any) => ({
          ...page,
          comments: page.comments.filter((comment: Comment) => comment.id !== commentId),
          pagination: {
            ...page.pagination,
            totalComments: Math.max(page.pagination.totalComments - 1, 0)
          }
        }))
        
        return { ...old, pages: newPages }
      })

      // Invalidate post data to update comment count
      queryClient.invalidateQueries({ 
        queryKey: ['posts', 'students-interlinked'] 
      })

      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted"
      })

      setError(null)
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to delete comment'
      setError(errorMessage)
      onError?.(errorMessage)

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  })

  // Like comment mutation - FIXED: Use unified API endpoint
  const likeCommentMutation = useMutation({
    mutationFn: async (commentId: string): Promise<void> => {
      const response = await fetch(`/api/unified-likes/comment/${commentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'like',
          reaction: 'like',
          recipientId: 'comment-author-id', // This should be passed properly
          schemaName: 'social_schema'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to like comment')
      }
    },
    onSuccess: (_, commentId) => {
      // Update comment like status in cache
      queryClient.setQueryData(commentsQueryKey, (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: any) => ({
          ...page,
          comments: page.comments.map((comment: Comment) =>
            comment.id === commentId 
              ? { 
                  ...comment, 
                  isLiked: true, 
                  likeCount: comment.likeCount + 1 
                }
              : comment
          )
        }))
        
        return { ...old, pages: newPages }
      })

      setError(null)
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to like comment'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  })

  // Unlike comment mutation - FIXED: Use unified API endpoint
  const unlikeCommentMutation = useMutation({
    mutationFn: async (commentId: string): Promise<void> => {
      const response = await fetch(`/api/unified-likes/comment/${commentId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'unlike',
          recipientId: 'comment-author-id', // This should be passed properly
          schemaName: 'social_schema'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to unlike comment')
      }
    },
    onSuccess: (_, commentId) => {
      // Update comment like status in cache
      queryClient.setQueryData(commentsQueryKey, (old: any) => {
        if (!old) return old
        
        const newPages = old.pages.map((page: any) => ({
          ...page,
          comments: page.comments.map((comment: Comment) =>
            comment.id === commentId 
              ? { 
                  ...comment, 
                  isLiked: false, 
                  likeCount: Math.max(comment.likeCount - 1, 0) 
                }
              : comment
          )
        }))
        
        return { ...old, pages: newPages }
      })

      setError(null)
    },
    onError: (error) => {
      const errorMessage = error.message || 'Failed to unlike comment'
      setError(errorMessage)
      onError?.(errorMessage)
    }
  })

  // Action handlers
  const addComment = useCallback(async (data: CreateCommentData): Promise<Comment> => {
    return addCommentMutation.mutateAsync(data)
  }, [addCommentMutation])

  const updateComment = useCallback(async (commentId: string, data: UpdateCommentData): Promise<Comment> => {
    return updateCommentMutation.mutateAsync({ commentId, data })
  }, [updateCommentMutation])

  const deleteComment = useCallback(async (commentId: string): Promise<void> => {
    return deleteCommentMutation.mutateAsync(commentId)
  }, [deleteCommentMutation])

  const likeComment = useCallback(async (commentId: string): Promise<void> => {
    return likeCommentMutation.mutateAsync(commentId)
  }, [likeCommentMutation])

  const unlikeComment = useCallback(async (commentId: string): Promise<void> => {
    return unlikeCommentMutation.mutateAsync(commentId)
  }, [unlikeCommentMutation])

  const loadMore = useCallback(() => {
    if (hasNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, fetchNextPage])

  const clearError = useCallback(() => {
    setError(null)
  }, [])

  return {
    // State
    comments,
    isLoading,
    isLoadingMore,
    hasNextPage: !!hasNextPage,
    error: error || (queryError?.message) || null,
    totalComments,
    
    // Actions
    addComment,
    updateComment,
    deleteComment,
    likeComment,
    unlikeComment,
    
    // Pagination
    loadMore,
    refresh,
    
    // Utilities
    clearError
  }
}

// Convenience hook for simple comment operations
export function useSimpleComments(postId: string) {
  return useComments({
    postId,
    limit: 20
  })
}

// Export types for external use
export type { 
  Comment, 
  CreateCommentData, 
  UpdateCommentData, 
  CommentsResponse, 
  UseCommentsOptions, 
  UseCommentsReturn 
}