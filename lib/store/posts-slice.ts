/**
 * ==========================================
 * POSTS SLICE - REDUX TOOLKIT
 * ==========================================
 * Official Redux Toolkit patterns for posts management
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'

// Types - Updated to match API response format
export interface Post {
  id: string
  content: string
  authorId: string
  author: {
    id: string
    name: string
    username: string
    image?: string
    verified?: boolean
  }
  imageUrls: string[]
  videoUrls: string[]
  documentUrls: string[]
  postType: 'GENERAL' | 'STUDY_HELP' | 'PROJECT_SHARE' | 'ACHIEVEMENT' | 'EVENT_SHARE' | 'RESOURCE_SHARE' | 'GROUP_DISCUSSION' | 'CAREER_ADVICE' | 'TIPS_TRICKS' | 'MOTIVATION'
  visibility: 'PUBLIC' | 'PRIVATE' | 'FRIENDS'
  tags: string[]
  educationalContext?: string
  courseId?: string
  studyGroupId?: string
  createdAt: string
  updatedAt: string
  status: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'
  _count: {
    likes: number
    comments: number
    shares: number
  }
  viewCount: number
  isLiked: boolean
  isBookmarked: boolean
  userReaction?: string
  reactions?: Record<string, number>
  topReactions?: string[]
}

export interface Comment {
  id: string
  content: string
  userId: string
  user: {
    id: string
    name: string
    username: string
    image?: string
  } | null
  postId: string
  parentId?: string
  imageUrls?: string[]
  createdAt: string
  updatedAt: string
  likesCount: number
  repliesCount: number
  isLiked: boolean
  replies?: Comment[]
}

export interface PostsState {
  posts: Post[]
  currentPost: Post | null
  comments: Record<string, Comment[]> // postId -> comments
  loading: boolean
  error: string | null
  hasMore: boolean
  page: number
  creating: boolean
  updating: Record<string, boolean> // postId -> updating state
}

const initialState: PostsState = {
  posts: [],
  currentPost: null,
  comments: {},
  loading: false,
  error: null,
  hasMore: true,
  page: 1,
  creating: false,
  updating: {}
}

// Async Thunks
export const fetchPosts = createAsyncThunk(
  'posts/fetchPosts',
  async ({ page = 1, limit = 10 }: { page?: number; limit?: number }) => {
    const response = await fetch(`/api/students-interlinked/posts?page=${page}&limit=${limit}`, {
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch posts')
    }
    return response.json()
  }
)

export const createPost = createAsyncThunk(
  'posts/createPost',
  async (postData: {
    content: string
    imageUrls?: string[]
    videoUrls?: string[]
    documentUrls?: string[]
    postType?: string
    visibility?: string
    tags?: string[]
    educationalContext?: string
    courseId?: string
    studyGroupId?: string
  }) => {
    const response = await fetch('/api/students-interlinked/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(postData)
    })
    if (!response.ok) {
      throw new Error('Failed to create post')
    }
    return response.json()
  }
)

export const likePost = createAsyncThunk(
  'posts/likePost',
  async ({ postId, recipientId }: { postId: string; recipientId: string }) => {
    const response = await fetch(`/api/likes/post/${postId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        recipientId,
        schemaName: 'social_schema',
        metadata: {
          timestamp: new Date().toISOString(),
          source: 'posts_feed'
        }
      })
    })
    if (!response.ok) {
      throw new Error('Failed to like post')
    }
    return { postId, data: await response.json() }
  }
)

export const unlikePost = createAsyncThunk(
  'posts/unlikePost',
  async ({ postId }: { postId: string }) => {
    const response = await fetch(`/api/likes/post/${postId}`, {
      method: 'DELETE',
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to unlike post')
    }
    return { postId, data: await response.json() }
  }
)

export const bookmarkPost = createAsyncThunk(
  'posts/bookmarkPost',
  async ({ postId }: { postId: string }) => {
    const response = await fetch(`/api/students-interlinked/posts/${postId}/bookmark`, {
      method: 'POST',
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to bookmark post')
    }
    return { postId, data: await response.json() }
  }
)

export const fetchComments = createAsyncThunk(
  'posts/fetchComments',
  async (postId: string) => {
    const response = await fetch(`/api/students-interlinked/posts/${postId}/comments`, {
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch comments')
    }
    return { postId, comments: await response.json() }
  }
)

// Slice
const postsSlice = createSlice({
  name: 'posts',
  initialState,
  reducers: {
    // Real-time updates from Socket.IO
    addPost: (state, action: PayloadAction<Post>) => {
      state.posts.unshift(action.payload)
    },
    
    updatePost: (state, action: PayloadAction<Post>) => {
      const index = state.posts.findIndex(p => p.id === action.payload.id)
      if (index !== -1) {
        state.posts[index] = action.payload
      }
    },
    
    removePost: (state, action: PayloadAction<string>) => {
      state.posts = state.posts.filter(p => p.id !== action.payload)
    },
    
    // Optimistic updates
    optimisticLike: (state, action: PayloadAction<{ postId: string; liked: boolean }>) => {
      const post = state.posts.find(p => p.id === action.payload.postId)
      if (post) {
        post.isLiked = action.payload.liked
        post._count.likes += action.payload.liked ? 1 : -1
      }
    },
    
    optimisticBookmark: (state, action: PayloadAction<{ postId: string; bookmarked: boolean }>) => {
      const post = state.posts.find(p => p.id === action.payload.postId)
      if (post) {
        post.isBookmarked = action.payload.bookmarked
      }
    },
    
    // Comments management
    addComment: (state, action: PayloadAction<{ postId: string; comment: Comment }>) => {
      if (!state.comments[action.payload.postId]) {
        state.comments[action.payload.postId] = []
      }
      state.comments[action.payload.postId].unshift(action.payload.comment)
      
      // Update post comment count
      const post = state.posts.find(p => p.id === action.payload.postId)
      if (post) {
        post._count.comments += 1
      }
    },
    
    setComments: (state, action: PayloadAction<{ postId: string; comments: Comment[] }>) => {
      state.comments[action.payload.postId] = action.payload.comments
    },
    
    // UI state management
    setCurrentPost: (state, action: PayloadAction<Post | null>) => {
      state.currentPost = action.payload
    },
    
    clearError: (state) => {
      state.error = null
    },
    
    setUpdating: (state, action: PayloadAction<{ postId: string; updating: boolean }>) => {
      state.updating[action.payload.postId] = action.payload.updating
    }
  },
  
  extraReducers: (builder) => {
    // Fetch posts
    builder
      .addCase(fetchPosts.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchPosts.fulfilled, (state, action) => {
        state.loading = false
        if (action.meta.arg.page === 1) {
          state.posts = action.payload.posts
        } else {
          state.posts.push(...action.payload.posts)
        }
        state.hasMore = action.payload.hasMore
        state.page = action.meta.arg.page || 1
      })
      .addCase(fetchPosts.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch posts'
      })
    
    // Create post
    builder
      .addCase(createPost.pending, (state) => {
        state.creating = true
        state.error = null
      })
      .addCase(createPost.fulfilled, (state, action) => {
        state.creating = false
        state.posts.unshift(action.payload.post)
      })
      .addCase(createPost.rejected, (state, action) => {
        state.creating = false
        state.error = action.error.message || 'Failed to create post'
      })
      // Like post
    builder
      .addCase(likePost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.payload.postId)
        if (post) {
          post.isLiked = action.payload.data.isLiked
          post._count.likes = action.payload.data.likesCount
        }
      })
      // Unlike post
    builder
      .addCase(unlikePost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.payload.postId)
        if (post) {
          post.isLiked = action.payload.data.isLiked
          post._count.likes = action.payload.data.likesCount
        }
      })
    
    // Bookmark post
    builder
      .addCase(bookmarkPost.fulfilled, (state, action) => {
        const post = state.posts.find(p => p.id === action.payload.postId)
        if (post) {
          post.isBookmarked = action.payload.data.isBookmarked
        }
      })
    
    // Fetch comments
    builder
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.comments[action.payload.postId] = action.payload.comments
      })
  }
})

// Export actions
export const {
  addPost,
  updatePost,
  removePost,
  optimisticLike,
  optimisticBookmark,
  addComment,
  setComments,
  setCurrentPost,
  clearError,
  setUpdating
} = postsSlice.actions

// Selectors
export const selectPosts = (state: { posts: PostsState }) => state.posts.posts
export const selectCurrentPost = (state: { posts: PostsState }) => state.posts.currentPost
export const selectPostsLoading = (state: { posts: PostsState }) => state.posts.loading
export const selectPostsError = (state: { posts: PostsState }) => state.posts.error
export const selectHasMorePosts = (state: { posts: PostsState }) => state.posts.hasMore
export const selectCreatingPost = (state: { posts: PostsState }) => state.posts.creating
export const selectComments = (postId: string) => (state: { posts: PostsState }) => 
  state.posts.comments[postId] || []

// Export reducer
export default postsSlice.reducer
