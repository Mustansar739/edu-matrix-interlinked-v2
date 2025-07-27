'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStudentsInterlinkedRealTime } from './useStudentsInterlinkedRealTime'

interface Post {
  id: string
  content: string
  mediaUrls: string[]
  educationalContext?: {
    courseId?: string
    subject?: string
    academicLevel?: string
    tags?: string[]
  }
  visibility: 'PUBLIC' | 'FRIENDS' | 'GROUPS'
  allowComments: boolean
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'POLL'
  authorId: string
  author: {
    id: string
    name: string
    username?: string
    email: string
    image: string
    verified?: boolean
    profile?: {
      major?: string
      academicLevel?: string
      institution?: string
    }
  }
  // Poll data if post type is POLL
  poll?: {
    id: string
    question: string
    allowMultiple: boolean
    expiresAt?: string
    isAnonymous: boolean
    isEducational: boolean
    correctAnswer?: string[]
    explanation?: string
    totalVotes: number
    options: Array<{
      id: string
      text: string
      imageUrl?: string
      voteCount: number
      hasVoted: boolean
    }>
    hasVoted: boolean
    userVotes: string[]
  }
  likes: Array<{
    id: string
    type: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY'
    user: {
      id: string
      name: string
      image: string
    }
  }>
  comments: Array<{
    id: string
    content: string
    author: {
      id: string
      name: string
      image: string
    }
    likes: any[]
    createdAt: string
  }>
  _count: {
    likes: number
    comments: number
    shares: number
  }
  createdAt: string
  updatedAt: string
}

interface PostsResponse {
  posts: Post[]
  pagination: {
    page: number
    limit: number
    totalPosts: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}

interface CreatePostData {
  content: string
  mediaUrls?: string[]
  groupId?: string // Add group support
  educationalContext?: {
    courseId?: string
    subject?: string
    academicLevel?: 'UNDERGRADUATE' | 'GRADUATE' | 'POSTGRADUATE' | 'PROFESSIONAL'
    tags?: string[]
  }
  visibility?: 'PUBLIC' | 'FRIENDS' | 'GROUPS' // Update to match backend
  allowComments?: boolean
  type?: 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'LINK' | 'POLL'
  // Poll data (only required if type is POLL)
  poll?: {
    question: string
    options: { text: string; imageUrl?: string }[]
    allowMultiple?: boolean
    expiresAt?: string
    isAnonymous?: boolean
    isEducational?: boolean
    correctAnswer?: string[]
    explanation?: string
  }
}

interface LikePostData {
  type?: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY'
}

interface CreateCommentData {
  content: string
  parentId?: string
  mediaUrls?: string[]
}

// Custom hook for posts data with real-time updates
export function useStudentsInterlinkedPosts({
  page = 1,
  limit = 10,
  courseId,
  subject,
  type,
  authorId,
  userId,
  groupId,
  enabled = true
}: {
  page?: number
  limit?: number
  courseId?: string
  subject?: string
  type?: string
  authorId?: string
  userId?: string
  groupId?: string
  enabled?: boolean
} = {}) {
  const queryClient = useQueryClient()

  // Setup real-time updates
  useStudentsInterlinkedRealTime({
    userId,
    enabled,
    onNewPost: (newPost) => {
      // Add new post to the beginning of the list
      queryClient.setQueryData(['students-interlinked', 'posts', { page: 1, limit, courseId, subject, type, authorId, groupId }], (oldData: PostsResponse | undefined) => {
        if (!oldData) return oldData
        return {
          ...oldData,
          posts: [newPost as Post, ...oldData.posts]
        }
      })
    },
    onPostUpdate: (postId, update) => {
      // Update specific post in all cached queries
      queryClient.setQueriesData(
        { queryKey: ['students-interlinked', 'posts'] },
        (oldData: PostsResponse | undefined) => {
          if (!oldData) return oldData
          return {
            ...oldData,
            posts: oldData.posts.map(post => 
              post.id === postId ? { ...post, ...update } : post
            )
          }
        }
      )
    }
  })

  const query = useQuery({
    queryKey: ['students-interlinked', 'posts', { page, limit, courseId, subject, type, authorId, groupId }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })
      
      if (courseId) params.append('courseId', courseId)
      if (subject) params.append('subject', subject)
      if (type) params.append('type', type)
      if (authorId) params.append('authorId', authorId)
      if (groupId) params.append('groupId', groupId)

      const response = await fetch(`/api/students-interlinked/posts?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch posts')
      }
      return response.json() as Promise<PostsResponse>
    },
    enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: false,
  })

  return query
}

// Create post mutation
export function useCreatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePostData) => {
      console.log('Sending post data:', JSON.stringify(data, null, 2))
      
      const response = await fetch('/api/students-interlinked/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      
      if (!response.ok) {
        let errorData = {}
        let rawResponse = ''
        
        try {
          // Try to get the raw response text first
          rawResponse = await response.text()
          console.log('Raw API Response:', rawResponse)
          
          // Try to parse as JSON
          if (rawResponse) {
            errorData = JSON.parse(rawResponse)
          }
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError)
          errorData = { rawResponse }
        }
        
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          errorData,
          rawResponse: rawResponse.substring(0, 500) // First 500 chars
        })
        
        throw new Error(`Failed to create post: ${(errorData as any).error || (errorData as any).message || response.statusText}`)
      }
      return response.json()
    },
    onSuccess: () => {
      // Invalidate and refetch posts
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts'] })
    },
  })
}

// Update post mutation
export function useUpdatePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string, data: Partial<CreatePostData> }) => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to update post')
      }
      return response.json()
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts'] })
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts', postId] })
    },
  })
}

// Delete post mutation
export function useDeletePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}`, {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error('Failed to delete post')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts'] })
    },
  })
}

// Like/Unlike post mutation
export function useLikePost() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string, data: LikePostData }) => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/like`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to process like')
      }
      return response.json()
    },
    onSuccess: (_, { postId }) => {
      // Update specific post in cache
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts'] })
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts', postId] })
    },
  })
}

// Get post comments
export function usePostComments({
  postId,
  page = 1,
  limit = 10,
  sortBy = 'newest',
  enabled = true
}: {
  postId: string
  page?: number
  limit?: number
  sortBy?: 'newest' | 'oldest' | 'popular'
  enabled?: boolean
}) {
  return useQuery({
    queryKey: ['students-interlinked', 'posts', postId, 'comments', { page, limit, sortBy }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy,
      })

      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments?${params}`)
      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }
      return response.json()
    },
    enabled: enabled && !!postId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  })
}

// Create comment mutation
export function useCreateComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string, data: CreateCommentData }) => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error('Failed to create comment')
      }
      return response.json()
    },
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts', postId, 'comments'] })
      queryClient.invalidateQueries({ queryKey: ['students-interlinked', 'posts'] })
    },
  })
}

// Get single post with full details
export function usePost(postId: string, enabled = true) {
  return useQuery({
    queryKey: ['students-interlinked', 'posts', postId],
    queryFn: async () => {
      const response = await fetch(`/api/students-interlinked/posts/${postId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch post')
      }
      return response.json()
    },
    enabled: enabled && !!postId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
