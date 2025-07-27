/**
 * ==========================================
 * STORIES SLICE - REDUX TOOLKIT
 * ==========================================
 * Official Redux Toolkit patterns for stories management
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit'

// Types
export interface Story {
  id: string
  authorId: string
  author: {
    id: string
    name: string
    username: string
    image?: string
  }
  content?: string
  imageUrl?: string
  videoUrl?: string
  backgroundColor?: string
  createdAt: string
  expiresAt: string
  viewsCount: number
  reactionsCount: number
  repliesCount: number
  isViewed: boolean
  privacy: 'PUBLIC' | 'PRIVATE' | 'FRIENDS'
}

export interface StoryGroup {
  userId: string
  user: {
    id: string
    name: string
    username: string
    image?: string
  }
  stories: Story[]
  hasNewStories: boolean
  lastStoryTime: string
}

export interface StoryReaction {
  id: string
  type: 'LIKE' | 'LOVE' | 'LAUGH' | 'WOW' | 'SAD' | 'ANGRY'
  userId: string
  storyId: string
  createdAt: string
}

export interface StoryReply {
  id: string
  content: string
  authorId: string
  author: {
    id: string
    name: string
    username: string
    image?: string
  }
  storyId: string
  createdAt: string
}

export interface StoriesState {
  storyGroups: StoryGroup[]
  currentStory: Story | null
  currentStoryGroup: StoryGroup | null
  currentStoryIndex: number
  reactions: Record<string, StoryReaction[]> // storyId -> reactions
  replies: Record<string, StoryReply[]> // storyId -> replies
  loading: boolean
  creating: boolean
  error: string | null
  viewingStory: boolean
}

const initialState: StoriesState = {
  storyGroups: [],
  currentStory: null,
  currentStoryGroup: null,
  currentStoryIndex: 0,
  reactions: {},
  replies: {},
  loading: false,
  creating: false,
  error: null,
  viewingStory: false
}

// Async Thunks
export const fetchStories = createAsyncThunk(
  'stories/fetchStories',
  async () => {
    const response = await fetch('/api/students-interlinked/stories', {
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to fetch stories')
    }
    return response.json()
  }
)

export const createStory = createAsyncThunk(
  'stories/createStory',
  async (storyData: {
    content?: string
    imageUrl?: string
    videoUrl?: string
    backgroundColor?: string
    privacy?: 'PUBLIC' | 'PRIVATE' | 'FRIENDS'
  }) => {
    const response = await fetch('/api/students-interlinked/stories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(storyData)
    })
    if (!response.ok) {
      throw new Error('Failed to create story')
    }
    return response.json()
  }
)

export const viewStory = createAsyncThunk(
  'stories/viewStory',
  async ({ storyId, authorId }: { storyId: string; authorId: string }) => {
    const response = await fetch(`/api/students-interlinked/stories/${storyId}/view`, {
      method: 'POST',
      credentials: 'include'
    })
    if (!response.ok) {
      throw new Error('Failed to view story')
    }
    return { storyId, authorId, data: await response.json() }
  }
)

export const reactToStory = createAsyncThunk(
  'stories/reactToStory',
  async ({ storyId, reactionType }: { storyId: string; reactionType: string }) => {
    const response = await fetch(`/api/students-interlinked/stories/${storyId}/react`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reactionType })
    })
    if (!response.ok) {
      throw new Error('Failed to react to story')
    }
    return { storyId, data: await response.json() }
  }
)

export const replyToStory = createAsyncThunk(
  'stories/replyToStory',
  async ({ storyId, content }: { storyId: string; content: string }) => {
    const response = await fetch(`/api/students-interlinked/stories/${storyId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ content })
    })
    if (!response.ok) {
      throw new Error('Failed to reply to story')
    }
    return { storyId, data: await response.json() }
  }
)

// Slice
const storiesSlice = createSlice({
  name: 'stories',
  initialState,
  reducers: {
    // Real-time updates from Socket.IO
    addStory: (state, action: PayloadAction<{ story: Story; author: any }>) => {
      const { story, author } = action.payload
      
      // Find existing story group for this user
      let storyGroup = state.storyGroups.find(group => group.userId === story.authorId)
      
      if (storyGroup) {
        // Add story to existing group
        storyGroup.stories.unshift(story)
        storyGroup.hasNewStories = true
        storyGroup.lastStoryTime = story.createdAt
      } else {
        // Create new story group
        const newStoryGroup: StoryGroup = {
          userId: story.authorId,
          user: author,
          stories: [story],
          hasNewStories: true,
          lastStoryTime: story.createdAt
        }
        state.storyGroups.unshift(newStoryGroup)
      }
    },
    
    updateStory: (state, action: PayloadAction<Story>) => {
      const story = action.payload
      const storyGroup = state.storyGroups.find(group => group.userId === story.authorId)
      if (storyGroup) {
        const storyIndex = storyGroup.stories.findIndex(s => s.id === story.id)
        if (storyIndex !== -1) {
          storyGroup.stories[storyIndex] = story
        }
      }
    },
    
    removeStory: (state, action: PayloadAction<string>) => {
      const storyId = action.payload
      state.storyGroups.forEach(group => {
        group.stories = group.stories.filter(s => s.id !== storyId)
      })
      // Remove empty groups
      state.storyGroups = state.storyGroups.filter(group => group.stories.length > 0)
    },
    
    // Story viewing
    setCurrentStoryGroup: (state, action: PayloadAction<StoryGroup | null>) => {
      state.currentStoryGroup = action.payload
      state.currentStoryIndex = 0
      state.currentStory = action.payload?.stories[0] || null
      state.viewingStory = !!action.payload
    },
    
    setCurrentStoryIndex: (state, action: PayloadAction<number>) => {
      if (state.currentStoryGroup) {
        const newIndex = Math.max(0, Math.min(action.payload, state.currentStoryGroup.stories.length - 1))
        state.currentStoryIndex = newIndex
        state.currentStory = state.currentStoryGroup.stories[newIndex]
      }
    },
    
    nextStory: (state) => {
      if (state.currentStoryGroup && state.currentStoryIndex < state.currentStoryGroup.stories.length - 1) {
        state.currentStoryIndex += 1
        state.currentStory = state.currentStoryGroup.stories[state.currentStoryIndex]
      }
    },
    
    previousStory: (state) => {
      if (state.currentStoryGroup && state.currentStoryIndex > 0) {
        state.currentStoryIndex -= 1
        state.currentStory = state.currentStoryGroup.stories[state.currentStoryIndex]
      }
    },
    
    closeStoryViewer: (state) => {
      state.currentStory = null
      state.currentStoryGroup = null
      state.currentStoryIndex = 0
      state.viewingStory = false
    },
    
    // Mark stories as viewed
    markStoriesAsViewed: (state, action: PayloadAction<string>) => {
      const userId = action.payload
      const storyGroup = state.storyGroups.find(group => group.userId === userId)
      if (storyGroup) {
        storyGroup.hasNewStories = false
        storyGroup.stories.forEach(story => {
          story.isViewed = true
        })
      }
    },
    
    // Reactions and replies
    addReaction: (state, action: PayloadAction<{ storyId: string; reaction: StoryReaction }>) => {
      if (!state.reactions[action.payload.storyId]) {
        state.reactions[action.payload.storyId] = []
      }
      state.reactions[action.payload.storyId].push(action.payload.reaction)
      
      // Update story reaction count
      const storyGroup = state.storyGroups.find(group => 
        group.stories.some(s => s.id === action.payload.storyId)
      )
      if (storyGroup) {
        const story = storyGroup.stories.find(s => s.id === action.payload.storyId)
        if (story) {
          story.reactionsCount += 1
        }
      }
    },
    
    addReply: (state, action: PayloadAction<{ storyId: string; reply: StoryReply }>) => {
      if (!state.replies[action.payload.storyId]) {
        state.replies[action.payload.storyId] = []
      }
      state.replies[action.payload.storyId].push(action.payload.reply)
      
      // Update story reply count
      const storyGroup = state.storyGroups.find(group => 
        group.stories.some(s => s.id === action.payload.storyId)
      )
      if (storyGroup) {
        const story = storyGroup.stories.find(s => s.id === action.payload.storyId)
        if (story) {
          story.repliesCount += 1
        }
      }
    },
    
    // UI state
    clearError: (state) => {
      state.error = null
    }
  },
  
  extraReducers: (builder) => {
    // Fetch stories
    builder
      .addCase(fetchStories.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchStories.fulfilled, (state, action) => {
        state.loading = false
        state.storyGroups = action.payload.storyGroups || []
      })
      .addCase(fetchStories.rejected, (state, action) => {
        state.loading = false
        state.error = action.error.message || 'Failed to fetch stories'
      })
    
    // Create story
    builder
      .addCase(createStory.pending, (state) => {
        state.creating = true
        state.error = null
      })
      .addCase(createStory.fulfilled, (state, action) => {
        state.creating = false
        // Story will be added via real-time Socket.IO event
      })
      .addCase(createStory.rejected, (state, action) => {
        state.creating = false
        state.error = action.error.message || 'Failed to create story'
      })
    
    // View story
    builder
      .addCase(viewStory.fulfilled, (state, action) => {
        const { storyId } = action.payload
        // Mark story as viewed
        const storyGroup = state.storyGroups.find(group => 
          group.stories.some(s => s.id === storyId)
        )
        if (storyGroup) {
          const story = storyGroup.stories.find(s => s.id === storyId)
          if (story) {
            story.isViewed = true
            story.viewsCount += 1
          }
        }
      })
  }
})

// Export actions
export const {
  addStory,
  updateStory,
  removeStory,
  setCurrentStoryGroup,
  setCurrentStoryIndex,
  nextStory,
  previousStory,
  closeStoryViewer,
  markStoriesAsViewed,
  addReaction,
  addReply,
  clearError
} = storiesSlice.actions

// Selectors
export const selectStoryGroups = (state: { stories: StoriesState }) => state.stories.storyGroups
export const selectCurrentStory = (state: { stories: StoriesState }) => state.stories.currentStory
export const selectCurrentStoryGroup = (state: { stories: StoriesState }) => state.stories.currentStoryGroup
export const selectCurrentStoryIndex = (state: { stories: StoriesState }) => state.stories.currentStoryIndex
export const selectStoriesLoading = (state: { stories: StoriesState }) => state.stories.loading
export const selectCreatingStory = (state: { stories: StoriesState }) => state.stories.creating
export const selectStoriesError = (state: { stories: StoriesState }) => state.stories.error
export const selectViewingStory = (state: { stories: StoriesState }) => state.stories.viewingStory
export const selectStoryReactions = (storyId: string) => (state: { stories: StoriesState }) => 
  state.stories.reactions[storyId] || []
export const selectStoryReplies = (storyId: string) => (state: { stories: StoriesState }) => 
  state.stories.replies[storyId] || []

// Export reducer
export default storiesSlice.reducer
